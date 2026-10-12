"""Verify deployment in a synthetic Hermes home; never enable or restart services."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

root = Path(__file__).resolve().parents[1]
scratch = root / '.tmp/soul-regression'
scratch.mkdir(parents=True, exist_ok=True)
installer = load('soul_installer', Path(__file__).with_name('install.py'))
with tempfile.TemporaryDirectory(dir=scratch) as temp:
    home = Path(temp) / 'hermes home'
    units = Path(temp) / 'systemd units'
    try:
        installer.install(home, units, None)
        raise AssertionError('Missing Node must fail before installation')
    except RuntimeError:
        assert not home.exists()
    installer.install(home, units, shutil.which('node'))
    plugin = home / 'plugins/xiaonuan-soul/__init__.py'
    runtime = load('installed_soul', plugin)._runtime
    hooks = {}
    class Context:
        def register_system_prompt_section(self, *args, **kwargs): pass
        def register_hook(self, name, callback): hooks[name] = callback
    runtime.register(Context())
    args = dict(session_id='installed', turn_id='t1', user_message='我今天超级开心！！！')
    assert 'risk_hint' in hooks['pre_llm_call'](**args)['context']
    hooks['post_llm_call'](**args)
    state = runtime.STATE / 'soul_variable' / (runtime._identity(args) + '.json')
    before = state.read_bytes()
    installer.install(home, units, shutil.which('node'))
    assert state.read_bytes() == before, 'Reinstall must preserve user state'
    assert list((home / 'backups').iterdir())
    timer = (units / 'xiaonuan-soul-reflection.timer').read_text()
    assert '02:00:00 Asia/Shanghai' in timer and 'Persistent=true' in timer
    service = (units / 'xiaonuan-soul-reflection.service').read_text()
    assert json.dumps(sys.executable) in service and ' daily\n' in service
    # Exercise the actual installed maintenance entry point.
    import os
    env = dict(os.environ, HERMES_HOME=str(home))
    subprocess.run([sys.executable, str(runtime.ROOT / 'hermes-integration/maintenance.py'), 'daily'],
                   env=env, check=True, capture_output=True)
    assert not (home / 'config.yaml').exists() and not (home / 'SOUL.md').exists()
print('PASS: installer preflight, installed hooks, Node path, repeat install, state preservation, backups, timer, maintenance')
