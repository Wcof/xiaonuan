"""Hermes lifecycle adapter for XiaoNuan's existing local emotion engine."""
from __future__ import annotations

import contextlib
from datetime import datetime, timedelta
import fcntl
import hashlib
import json
import logging
import math
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import threading
import time
from zoneinfo import ZoneInfo

HOME = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
ROOT = HOME / "runtime" / "xiaonuan-soul"
NODE = shutil.which("node")
STATE = HOME / "state" / "xiaonuan-soul"
BASELINE = {"pleasure": 0.5, "arousal": 0.2, "dominance": 0.6}
TRAITS = {"openness": 0.6, "conscientiousness": 0.7, "extraversion": 0.5,
          "agreeableness": 0.8, "neuroticism": 0.3}
LOG = logging.getLogger(__name__)
_pending: dict[tuple[str, str], tuple[str, dict, float]] = {}
_pending_lock = threading.Lock()
GUIDANCE = """你可以用“小暖”作为人格称呼，以温暖、坦诚、自然的中文提供陪伴与任务协作。
每轮附带的 xiaonuan_soul_context 是本地关键词算法的估计，只用于调整表达，不是心理诊断。
用户有情绪时先简短回应感受，再完成请求；纯技术任务直接处理，保持代码、命令和事实准确。
保持真实判断，不无条件顺从；不以冷落、拒绝互动、攻击或强制打卡表现人格。
不要宣称具有真实情感、意识或医学判断，不因模拟心情拒绝正常请求。
状态只在本机保存；不要为了情感分析读取密钥、私人档案或整段聊天历史。
每日反思生成的有界人格漂移只是模拟参数，不是治疗结果；不得改变真实判断和帮助用户的边界。
"""


def _vector(value):
    if not isinstance(value, dict):
        raise ValueError("Invalid PAD vector")
    for key in BASELINE:
        x = value.get(key)
        low = -1 if key == "pleasure" else 0
        if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not low <= x <= 1:
            raise ValueError("Invalid PAD component")
    return {k: float(value[k]) for k in BASELINE}


def _traits():
    p = STATE / "soul_configuration" / "traits_ocean.json"
    values = json.loads(p.read_text()) if p.exists() else TRAITS
    if set(values) != set(TRAITS) or any(isinstance(v, bool) or not isinstance(v, (int, float)) or
                                       not math.isfinite(v) or not 0 <= v <= 1 for v in values.values()):
        raise ValueError("Invalid Big Five configuration")
    return values


def _decayed(state, now):
    pad = _vector(state["pad_vector"])
    stamp = state["timestamp"]
    if isinstance(stamp, bool) or not isinstance(stamp, (int, float)) or not math.isfinite(stamp):
        raise ValueError("Invalid state timestamp")
    factor = 0.95 ** (max(0, now - stamp) / 3600)
    return {k: BASELINE[k] + (pad[k] - BASELINE[k]) * factor for k in BASELINE}


def _drift(state):
    if "personality_drift" not in state:
        return {k: 0.0 for k in TRAITS}
    profile = state["personality_drift"]
    if not isinstance(profile, dict) or "delta" not in profile:
        raise ValueError("Invalid personality drift")
    delta = profile["delta"]
    if not isinstance(delta, dict) or set(delta) != set(TRAITS) or any(
        isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or abs(v) > 0.15
        for v in delta.values()
    ):
        raise ValueError("Invalid personality drift")
    return delta


def _effective_traits(state):
    base, delta = _traits(), _drift(state)
    return {k: max(0, min(1, base[k] + delta[k])) for k in base}


def _next(pad, analysis, state=None):
    if analysis["intent_type"] == "task":
        return pad
    event = _vector(analysis["pad_vector"])
    traits = _effective_traits(state or {})
    weight = 0.25 * (1 + 0.5 * (traits["neuroticism"] if event["pleasure"] < 0 else traits["agreeableness"]))
    return {k: max(-1 if k == "pleasure" else 0, min(1, pad[k] + weight * (event[k] - pad[k]))) for k in BASELINE}


def _tone(pad, analysis):
    if analysis["intent_type"] == "task":
        return "direct", "简洁直接，完成任务。"
    if analysis["pad_vector"]["pleasure"] < 0 or analysis["intervention"] != "none":
        return "supportive", "温和接住感受，保持交流并提供实际帮助，不模仿低落或冷落用户。"
    if pad["pleasure"] > 0.6 and pad["arousal"] > 0.4:
        return "playful", "轻松活泼，可有少量自然的玩笑，不攻击、不黏人施压。"
    return "warm", "温暖自然，保持真实判断和用户边界。"


def _identity(kwargs):
    platform = str(kwargs.get("platform") or "cli")
    sender = kwargs.get("sender_id")
    # Messaging users remain separate; local CLI sessions share this owner's state.
    owner = str(sender or ("local-owner" if platform in {"cli", "terminal"} else kwargs.get("session_id") or "unknown"))
    return hashlib.sha256(f"{platform}:{owner}".encode()).hexdigest()[:24]


@contextlib.contextmanager
def _locked(owner):
    folder = STATE / "soul_variable"
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    lockfile = folder / f"{owner}.lock"
    with lockfile.open("a") as lock:
        os.chmod(lockfile, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield folder / f"{owner}.json"


def _read(path):
    if not path.exists():
        return {"pad_vector": BASELINE.copy(), "timestamp": time.time(), "turn_count": 0, "completed_turns": []}
    state = json.loads(path.read_text())
    _decayed(state, time.time())  # Corrupt state is reported, never silently replaced.
    _drift(state)
    return state


def _write(path, value):
    _write_text(path, json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False))


def _write_text(path, text):
    fd, name = tempfile.mkstemp(prefix=".state-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def pre_llm_call(**kwargs):
    if kwargs.get("parent_session_id"):
        return None
    text = kwargs.get("user_message", "")
    if not isinstance(text, str) or not text.strip():
        return None
    if len(text) > 200000:
        raise ValueError("User message exceeds 200000 characters")
    if not NODE:
        raise RuntimeError("Node.js is required for XiaoNuan analysis")
    result = subprocess.run([NODE, str(ROOT / "hermes-integration" / "analyze.mjs")],
                            input=json.dumps({"text": text}), text=True, capture_output=True, timeout=8, check=True)
    analysis = json.loads(result.stdout)
    _vector(analysis["pad_vector"])
    owner = _identity(kwargs)
    key = (str(kwargs.get("session_id") or ""), str(kwargs.get("turn_id") or ""))
    now = time.time()
    with _locked(owner) as path:
        state = _read(path)
        current = _next(_decayed(state, now), analysis, state)
        effective_traits = _effective_traits(state)
    tone, style = _tone(current, analysis)
    with _pending_lock:
        for old in list(_pending):
            if now - _pending[old][2] > 86400:
                _pending.pop(old)
        if len(_pending) >= 512:
            _pending.pop(next(iter(_pending)))
        _pending[key] = (owner, analysis, now)
    context = {"agent_pad": {k: round(v, 3) for k, v in current.items()}, "tone": tone,
               "intent": analysis["intent_type"], "user_affect_estimate": analysis["pad_vector"],
               "risk_hint": analysis["risk_level"], "style": style,
               "effective_personality_parameters": effective_traits}
    LOG.info("xiaonuan-soul pre turn: context ready, intent=%s tone=%s", analysis["intent_type"], tone)
    return {"context": "xiaonuan_soul_context（本地估计，可由用户表达纠正）：\n" + json.dumps(context, ensure_ascii=False)}


def post_llm_call(**kwargs):
    key = (str(kwargs.get("session_id") or ""), str(kwargs.get("turn_id") or ""))
    with _pending_lock:
        pending = _pending.pop(key, None)
    if pending is None:
        return
    owner, analysis, _ = pending
    turn = hashlib.sha256((key[0] + "\0" + key[1]).encode()).hexdigest() if key[1] else None
    now = time.time()
    with _locked(owner) as path:
        state = _read(path)
        done = state.get("completed_turns", [])
        if turn and turn in done:
            return
        current = _next(_decayed(state, now), analysis, state)
        tone, _ = _tone(current, analysis)
        count = state.get("turn_count", 0) + 1
        saved = {**state, "version": 1, "pad_vector": current, "timestamp": now, "turn_count": count,
                 "tone": tone, "intent_type": analysis["intent_type"], "user_affect_estimate": analysis["pad_vector"],
                 "completed_turns": (done + ([turn] if turn else []))[-64:]}
        _write(path, saved)
        # Numeric trajectory only: raw messages, responses, credentials and sender IDs are never logged.
        history = STATE / "soul_logs"
        history.mkdir(parents=True, exist_ok=True, mode=0o700)
        logpath = history / f"{owner}.jsonl"
        with logpath.open("a") as log:
            os.chmod(logpath, 0o600)
            log.write(json.dumps({"timestamp": now, "pad_vector": current, "tone": tone,
                                  "intent": analysis["intent_type"], "turn_count": count,
                                  "user_affect_estimate": analysis["pad_vector"],
                                  "cognitive_hints": analysis.get("cognitive_hints", [])}) + "\n")
    LOG.info("xiaonuan-soul post turn: persisted, turns=%s", count)


def decay_all():
    for path in (STATE / "soul_variable").glob("*.json"):
        with _locked(path.stem) as locked:
            state = _read(locked)
            now = time.time()
            state["pad_vector"] = _decayed(state, now)
            state["timestamp"] = now
            _write(locked, state)


def _review_history(owner, end):
    start = end - timedelta(days=14)
    per_day, seen = {}, set()
    skipped = 0
    path = STATE / "soul_logs" / f"{owner}.jsonl"
    if not path.exists():
        return {"samples": 0, "active_days": 0, "mean_pleasure": None, "skipped_rows": 0}
    with path.open() as f:
        for line in f:
            try:
                row = json.loads(line)
                stamp, count = row["timestamp"], row["turn_count"]
                if isinstance(stamp, bool) or not isinstance(stamp, (float, int)) or not math.isfinite(stamp):
                    raise ValueError("Invalid trajectory timestamp")
                if isinstance(count, bool) or not isinstance(count, int) or count <= 0:
                    raise ValueError("Invalid trajectory turn count")
                when = datetime.fromtimestamp(stamp, end.tzinfo)
                if not start <= when < end or row.get("intent") not in {"emotion", "mixed"} or count in seen:
                    continue
                # Legacy trajectories record only the simulated agent PAD; do not treat it as user affect.
                pad = _vector(row["user_affect_estimate"])
                seen.add(count)
                per_day.setdefault(when.date().isoformat(), []).append(pad["pleasure"])
            except (ValueError, KeyError, TypeError, OverflowError):
                skipped += 1
    means = [sum(samples) / len(samples) for samples in per_day.values()]
    return {"samples": len(seen), "active_days": len(means),
            "mean_pleasure": sum(means) / len(means) if means else None, "skipped_rows": skipped}


def _write_reflection(owner, report):
    folder = STATE / "soul_logs" / "reflections" / report["review_date"]
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    _write(folder / f"{owner}.json", report)
    text = (f"# 小暖每日反思：{report['review_date']}\n\n"
            f"- 观察：过去 14 个完整自然日，有效情绪样本 {report['evidence']['samples']} 条，"
            f"覆盖 {report['evidence']['active_days']} 天。\n"
            f"- 自动推断：{report['reason']}\n"
            "- 复核：关键词估计可能有误，用户暂时的心情不能证明任何人的真实人格。\n"
            "- 替代解释：负面表达可能是在请求支持，不应被当成对助手的攻击。\n"
            "- 行动：保留温暖、真实和任务能力；参数每日变化不超过 0.01，累计不超过 ±0.15。\n"
            f"- 模拟漂移：{json.dumps(report['delta'], ensure_ascii=False)}\n\n"
            "这是确定性的模拟人格反思，不是心理治疗或医学评价。\n")
    _write_text(folder / f"{owner}.md", text)


def daily_reflect_all(now=None):
    now = time.time() if now is None else now
    end = datetime.fromtimestamp(now, ZoneInfo("Asia/Shanghai")).replace(hour=0, minute=0, second=0, microsecond=0)
    review_date = (end - timedelta(days=1)).date().isoformat()
    results, failures = [], []
    for path in (STATE / "soul_variable").glob("*.json"):
        owner = path.stem
        try:
            with _locked(owner) as locked:
                state = _read(locked)
                previous = state.get("personality_drift", {})
                last_date = previous.get("last_review_date")
                if last_date:
                    datetime.strptime(last_date, "%Y-%m-%d")
                if last_date and last_date >= review_date:
                    report = previous["reflection"]
                    _write_reflection(owner, report)  # Repair a report interrupted after the atomic state commit.
                    results.append({"status": "already_reviewed", "owner": owner})
                    continue
                evidence = _review_history(owner, end)
                enough = evidence["samples"] >= 12 and evidence["active_days"] >= 3
                target = {k: 0.0 for k in TRAITS}
                if enough:
                    signal = evidence["mean_pleasure"]
                    target["agreeableness"] = signal * 0.05
                    target["neuroticism"] = -signal * 0.10
                old = _drift(state)
                delta = {k: round(max(-0.15, min(0.15, old[k] + max(-0.01, min(0.01, target[k] - old[k])))), 6)
                         for k in TRAITS}
                report = {"version": 1, "review_date": review_date, "timestamp": now,
                          "evidence": evidence, "delta": delta,
                          "reason": "依据跨日情绪数值趋势缓慢调整模拟敏感度和配合度。" if enough else
                                    "跨日样本不足，不推断人格；已有漂移缓慢回归基准。"}
                state["personality_drift"] = {"delta": delta, "last_review_date": review_date,
                                              "reflection": report}
                _write(locked, state)
                _write_reflection(owner, report)
                results.append({"status": "updated" if enough else "insufficient_history", "owner": owner})
        except Exception as exc:
            LOG.error("xiaonuan-soul daily review failed for %s: %s", owner, type(exc).__name__)
            failures.append(owner)
    if failures:
        raise RuntimeError(f"Daily review failed for {len(failures)} user(s); no state reset performed")
    return results


def register(ctx):
    if not NODE:
        raise RuntimeError("Node.js is required for XiaoNuan analysis")
    if not (ROOT / "hermes-integration" / "analyze.mjs").is_file():
        raise RuntimeError("XiaoNuan engine not installed")
    _traits()
    ctx.register_system_prompt_section("xiaonuan-soul.behavior", GUIDANCE, max_chars=2000)
    ctx.register_hook("pre_llm_call", pre_llm_call)
    ctx.register_hook("post_llm_call", post_llm_call)
    LOG.info("xiaonuan-soul loaded: local PAD engine and persistence enabled")
