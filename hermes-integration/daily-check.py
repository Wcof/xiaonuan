"""Daily reflection regression checks; all trajectories and states are synthetic."""
from datetime import datetime, timedelta
import importlib.util
import json
from pathlib import Path
import tempfile
from zoneinfo import ZoneInfo

spec = importlib.util.spec_from_file_location('daily_check', Path(__file__).with_name('__init__.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
now = datetime(2026, 10, 10, 2, tzinfo=ZoneInfo('Asia/Shanghai'))
end = now.replace(hour=0)
scratch = Path(__file__).resolve().parents[1] / '.tmp/soul-regression'
scratch.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='soul-daily-check-', dir=scratch) as temp:
    m.STATE = Path(temp)
    config = m.STATE / 'soul_configuration'; config.mkdir()
    baseline = config / 'traits_ocean.json'
    baseline.write_text(json.dumps(m.TRAITS)); original = baseline.read_bytes()
    for owner in ['alice', 'bob']:
        with m._locked(owner) as path:
            m._write(path, {'pad_vector': m.BASELINE, 'timestamp': now.timestamp(), 'turn_count': 0})
    assert m.daily_reflect_all(now.timestamp())[0]['status'] == 'insufficient_history'
    alice = m.STATE / 'soul_variable/alice.json'
    assert all(v == 0 for v in m._read(alice)['personality_drift']['delta'].values())
    assert (m.STATE / 'soul_logs/reflections/2026-10-09/alice.md').is_file()
    before = alice.read_bytes()
    assert all(r['status'] == 'already_reviewed' for r in m.daily_reflect_all(now.timestamp()))
    assert alice.read_bytes() == before, 'Same date must not accumulate drift'
    log = m.STATE / 'soul_logs/alice.jsonl'
    rows = []
    for day in range(1, 4):
        for turn in range(4):
            rows.append({'timestamp': (end - timedelta(days=day) + timedelta(hours=12)).timestamp(),
                         'turn_count': day * 10 + turn, 'intent': 'emotion',
                         'user_affect_estimate': {'pleasure': -0.8, 'arousal': 0.8, 'dominance': 0.2}})
    # Future/current-day inputs, duplicates, legacy records and corrupt rows must not bias the daily sample.
    log.write_text('\n'.join(json.dumps(r) for r in rows + [rows[0], dict(rows[0], timestamp=(end + timedelta(days=2)).timestamp()),
        {'timestamp': end.timestamp() - 1, 'turn_count': 900, 'intent': 'emotion', 'pad_vector': m.BASELINE}]) + '\n{broken\n')
    tomorrow = now + timedelta(days=1)
    m.daily_reflect_all(tomorrow.timestamp())
    state = m._read(alice); drift = state['personality_drift']
    assert drift['delta']['agreeableness'] == -0.01 and drift['delta']['neuroticism'] == 0.01
    assert drift['reflection']['evidence']['samples'] == 12
    assert drift['reflection']['evidence']['active_days'] == 3
    assert m._effective_traits(state)['neuroticism'] == 0.31
    analysis = {'intent_type': 'emotion', 'intervention': 'none', 'cognitive_hints': [],
                'pad_vector': {'pleasure': -0.8, 'arousal': 0.8, 'dominance': 0.2}}
    assert m._next(m.BASELINE, analysis, state)['pleasure'] < m._next(m.BASELINE, analysis)['pleasure']
    m._pending[('verify', 'persist-drift')] = ('alice', analysis, now.timestamp())
    m.post_llm_call(session_id='verify', turn_id='persist-drift')
    assert m._read(alice)['personality_drift'] == drift, 'Normal turns must retain the daily drift'
    assert m._effective_traits(m._read(m.STATE / 'soul_variable/bob.json')) == m.TRAITS
    # A report write interrupted after state commit is repairable without another parameter update.
    report = m.STATE / 'soul_logs/reflections/2026-10-10/alice.md'
    report.unlink(); saved = alice.read_bytes()
    m.daily_reflect_all(tomorrow.timestamp())
    assert report.is_file() and alice.read_bytes() == saved
    m.decay_all()
    assert m._read(alice)['personality_drift']['delta'] == drift['delta']
    # Two simultaneous schedulers share the same lock and apply only one daily step.
    import concurrent.futures
    next_day = tomorrow + timedelta(days=1)
    with concurrent.futures.ThreadPoolExecutor(2) as pool:
        list(pool.map(m.daily_reflect_all, [next_day.timestamp()] * 2))
    assert m._read(alice)['personality_drift']['delta']['neuroticism'] == 0.02
    for k in drift['delta']: drift['delta'][k] = 0.15 if k == 'neuroticism' else -0.15
    state['personality_drift'] = drift; m._write(alice, state)
    later = now + timedelta(days=40)
    m.daily_reflect_all(later.timestamp())
    assert m._read(alice)['personality_drift']['delta']['neuroticism'] == 0.14
    assert all(abs(v) <= 0.15 for v in m._drift(m._read(alice)).values())
    assert baseline.read_bytes() == original, 'ROM must never be modified'
    assert report.stat().st_mode & 0o777 == 0o600
    invalid = m._read(alice); invalid['personality_drift'] = {'last_review_date': '2026-10-10'}
    m._write(alice, invalid); unchanged = alice.read_bytes()
    try:
        m.daily_reflect_all((later + timedelta(days=1)).timestamp())
        raise AssertionError('Missing drift delta must not reset to zero')
    except RuntimeError:
        assert alice.read_bytes() == unchanged
    alice.write_text('{broken'); unchanged = alice.read_bytes()
    try:
        m.daily_reflect_all((later + timedelta(days=1)).timestamp())
        raise AssertionError('Corrupt state must fail')
    except RuntimeError:
        assert alice.read_bytes() == unchanged
print('PASS: evidence threshold, closed calendar days, replay, user isolation, effective traits, recovery, concurrency, ROM, bounds, corruption')
