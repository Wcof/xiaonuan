import importlib.util
from pathlib import Path
import os
import sys

home = Path(os.environ.get('HERMES_HOME', Path.home() / '.hermes'))
spec = importlib.util.spec_from_file_location('xiaonuan_soul_maintenance', home / 'plugins/xiaonuan-soul/__init__.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
if sys.argv[1:] == ['daily']:
    result = mod.daily_reflect_all()
    print('xiaonuan-soul: daily reflection completed:', result)
elif not sys.argv[1:]:
    mod.decay_all()
    print('xiaonuan-soul: hourly decay completed')
else:
    raise SystemExit('Usage: maintenance.py [daily]')
