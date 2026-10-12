"""Install the built Soul plugin without changing Hermes authentication or restarting it."""
import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile


def write_file(path, text):
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix='.soul-')
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def install(home, units, node):
    source = Path(__file__).resolve().parents[1]
    dist = source / 'mcp-server/dist'
    required = ['emotion/pad_calculator.js', 'emotion/emotion_classifier.js',
                'emotion/cognitive_distortion.js', 'processing/intent_classifier.js',
                'processing/rule_engine.js']
    if not all((dist / 'empathic_gateway' / name).is_file() for name in required):
        raise RuntimeError('Build the engine first: cd mcp-server && npm ci && npm run build')
    if not node or not Path(node).is_file() or not os.access(node, os.X_OK):
        raise RuntimeError('Node.js executable not found')
    home = home.expanduser().resolve()
    units = units.expanduser().resolve()
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S-%f')
    runtime = home / 'runtime/xiaonuan-soul' / stamp
    plugin = home / 'plugins/xiaonuan-soul'
    targets = [plugin, units / 'xiaonuan-soul-decay.service',
               units / 'xiaonuan-soul-decay.timer', units / 'xiaonuan-soul-reflection.service',
               units / 'xiaonuan-soul-reflection.timer']
    existing = [p for p in targets if p.exists()]
    if existing:
        backup = home / 'backups' / f'soul-{stamp}'
        backup.mkdir(parents=True, mode=0o700)
        for i, target in enumerate(existing):
            dest = backup / f'{i}-{target.name}'
            if target.is_dir():
                shutil.copytree(target, dest)
            else:
                shutil.copy2(target, dest)
        print('Backup:', backup)
    integration = runtime / 'hermes-integration'
    integration.mkdir(parents=True, exist_ok=True, mode=0o700)
    for name in ['__init__.py', 'analyze.mjs', 'maintenance.py']:
        shutil.copy2(source / 'hermes-integration' / name, integration / name)
    shutil.copytree(dist, runtime / 'mcp-server/dist', dirs_exist_ok=True)
    (runtime / 'mcp-server/package.json').write_text('{"type":"module"}\n')
    plugin.mkdir(parents=True, exist_ok=True, mode=0o700)
    loader = (
        'import importlib.util\nfrom pathlib import Path\n'
        f'_spec = importlib.util.spec_from_file_location("xiaonuan_soul_runtime", {str(integration / "__init__.py")!r})\n'
        '_runtime = importlib.util.module_from_spec(_spec)\n_spec.loader.exec_module(_runtime)\n'
        f'_runtime.ROOT = Path({str(runtime)!r})\n_runtime.STATE = Path({str(home / "state/xiaonuan-soul")!r})\n'
        f'_runtime.NODE = {str(node)!r}\n'
        'register = _runtime.register\ndecay_all = _runtime.decay_all\ndaily_reflect_all = _runtime.daily_reflect_all\n'
    )
    write_file(plugin / '__init__.py', loader)
    write_file(plugin / 'plugin.yaml', (source / 'hermes-integration/plugin.yaml').read_text())
    units.mkdir(parents=True, exist_ok=True)
    for kind, argument, calendar in [('decay', '', 'hourly'),
                                     ('reflection', ' daily', '*-*-* 02:00:00 Asia/Shanghai')]:
        name = f'xiaonuan-soul-{kind}'
        write_file(units / f'{name}.service',
            '[Unit]\nDescription=XiaoNuan Soul maintenance\n\n[Service]\nType=oneshot\nUMask=0077\n'
            f'Environment={json.dumps("HERMES_HOME=" + str(home))}\n'
            f'ExecStart={json.dumps(sys.executable)} {json.dumps(str(integration / "maintenance.py"))}{argument}\n')
        write_file(units / f'{name}.timer',
            f'[Unit]\nDescription=XiaoNuan Soul {kind}\n\n[Timer]\nOnCalendar={calendar}\n'
            f'Persistent=true\nUnit={name}.service\n\n[Install]\nWantedBy=timers.target\n')
    print('Installed:', plugin)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--home', type=Path, default=Path(os.environ.get('HERMES_HOME', '~/.hermes')))
    parser.add_argument('--units', type=Path, default=Path('~/.config/systemd/user'))
    args = parser.parse_args()
    install(args.home, args.units, shutil.which('node'))
