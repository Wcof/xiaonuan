"""Integration regression checks use an isolated temporary state directory."""
import concurrent.futures
import importlib.util
import json
from pathlib import Path
import tempfile
import time
import shutil

def load():
    spec = importlib.util.spec_from_file_location('soul_check', Path(__file__).with_name('__init__.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.ROOT = Path(__file__).resolve().parents[1]
    mod.NODE = shutil.which('node')
    return mod

m = load()
scratch = Path(__file__).resolve().parents[1] / '.tmp/soul-regression'
scratch.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='xiaonuan-check-', dir=scratch) as temp:
    m.STATE = Path(temp)
    args = {'session_id':'s1', 'turn_id':'t1', 'sender_id':'alice', 'platform':'weixin',
            'user_message':'我今天难过，帮我整理明天的计划'}
    assert m.pre_llm_call(**dict(args, parent_session_id='root')) is None
    try:
        m.pre_llm_call(**dict(args, user_message='x' * 200001))
        raise AssertionError('Oversized input must fail before state writes')
    except ValueError:
        assert not list(m.STATE.iterdir())
    context = m.pre_llm_call(**args)
    assert 'supportive' in context['context'] and 'mixed' in context['context']
    assert not list((m.STATE / 'soul_variable').glob('*.json')), 'No state commit before turn completion'
    m.post_llm_call(**args)
    path = m.STATE / 'soul_variable' / (m._identity(args) + '.json')
    first = json.loads(path.read_text())
    assert first['turn_count'] == 1 and first['pad_vector']['pleasure'] < 0.5
    m.pre_llm_call(**args); m.post_llm_call(**args)
    assert json.loads(path.read_text())['turn_count'] == 1, 'Retries must not double-commit'
    restored = load(); restored.STATE = m.STATE
    assert restored._read(path)['pad_vector'] == first['pad_vector'], 'Restart must restore state'
    other = dict(args, sender_id='bob', session_id='s2', turn_id='t2', user_message='我很开心')
    m.pre_llm_call(**other); m.post_llm_call(**other)
    assert m._identity(args) != m._identity(other)
    assert len(list((m.STATE / 'soul_variable').glob('*.json'))) == 2
    def turn(i):
        a = dict(args, session_id=f'concurrent-{i}', turn_id=f'ct-{i}', user_message='请查看时间')
        m.pre_llm_call(**a); m.post_llm_call(**a)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(turn, range(8)))
    assert json.loads(path.read_text())['turn_count'] == 9, 'Concurrent turns must not lose commits'
    current = json.loads(path.read_text()); current['timestamp'] = time.time() - 86400
    current['pad_vector']['pleasure'] = -0.5
    m._write(path, current); m.decay_all()
    assert -0.5 < m._read(path)['pad_vector']['pleasure'] < 0.5
    assert path.stat().st_mode & 0o777 == 0o600
    for p in m.STATE.rglob('*.json*'):
        assert '难过' not in p.read_text() and 'alice' not in p.read_text(), 'Raw messages/identifiers must not be persisted'
    path.write_text('{broken')
    try:
        m.pre_llm_call(**dict(args, turn_id='corrupt'))
        raise AssertionError('Corrupt state was silently ignored')
    except json.JSONDecodeError:
        assert path.read_text() == '{broken'
print('PASS: hook context, completed-turn writes, replay, restart, user isolation, concurrency, decay, privacy, corruption')
