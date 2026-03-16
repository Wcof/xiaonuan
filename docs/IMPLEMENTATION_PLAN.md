# Empathic Gateway 改造方案 - 开发材料

> 本文档为其他 Agent 提供完整的开发指导，包括架构设计、模块划分、API 规范、算法实现和集成策略。

---

## 一、项目概览

### 1.1 目标
在 xiaonuan 系统中实现一个**前置情感网关（Empathic Gateway）**，负责：
- 用户输入的情感分析与拦截
- 系统输出的情感润色与陪护
- 关键事件的记忆抽取与存储
- 与 Soul/Memory/Task 系统的协作

### 1.2 核心约束
- ✅ MCP 仅本地运行，永不上云
- ✅ 不读取业务数据，仅处理文本与授权元信息
- ✅ 原始 query 必须完整保留并传递给下游
- ✅ 所有处理必须离线可运行

### 1.3 交付形态
- **MVP 形态**：本地进程 Gateway（CLI/daemon 或本地 HTTP）
- **存储方案**：SQLite（便于时间线检索与未来扩展）
- **配置管理**：本地配置文件 + 后续 CLI 控制面板

---

## 二、架构设计

### 2.1 双通道输出规范

```
用户输入
    │
    ▼
[INPUT INTERCEPTOR] ← Empathic Gateway
    │
    ├─ raw_query（原始，不修改）
    └─ meta（情感等级、触发原因、改写强度）
    │
    ▼
[DOWNSTREAM WORKER]
    │
    ▼
[OUTPUT REWRITER] ← Empathic Gateway
    │
    ├─ 读取当前 PAD 状态
    ├─ 应用情感陪护策略
    └─ 注入符合情感状态的语气
    │
    ▼
final_response（给用户）
```

### 2.2 核心模块划分

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| **PAD Calculator** | 情感向量计算 | raw_query | PADVector(p, a, d) |
| **Intent Classifier** | 意图分类 | raw_query | intent_type (emotion/task/mixed) |
| **Cognitive Distortion Detector** | 认知偏差检测 | raw_query | List[distortion_type] |
| **Rule Engine** | 规则触发判定 | PADVector + distortions | trigger_result |
| **Meta Generator** | 元信息生成 | 上述所有结果 | meta_object |
| **Response Rewriter** | 输出润色 | downstream_response + PADVector | final_response |
| **Memory Extractor** | 记忆抽取 | raw_query + response + PADVector | memory_candidate |
| **Storage Manager** | 存储管理 | memory_candidate | stored_record |

---

## 三、API 规范

### 3.1 输入接口

```python
class GatewayInput:
    raw_query: str              # 用户原始输入（必传）
    context_meta: Optional[Dict]  # 可选元信息
    # 示例：
    # {
    #   "user_id": "user_123",
    #   "timestamp": 1234567890,
    #   "session_id": "sess_456"
    # }
```

### 3.2 输出接口（双通道）

```python
class GatewayOutput:
    # 给下游的输出
    downstream: {
        "raw_query": str,
        "meta": {
            "emotion_level": int,        # 0-4 (L0-L4)
            "pad_vector": {
                "pleasure": float,       # 0-1
                "arousal": float,        # 0-1
                "dominance": float       # 0-1
            },
            "trigger_reason": str,
            "rewrite_intensity": float,  # 0-1
            "confidence": float,         # 0-1
            "cognitive_distortions": List[str],
            "risk_level": str            # "low" / "medium" / "high"
        }
    }

    # 给用户的输出
    user_facing: {
        "final_response": str,
        "intervention_type": str,  # "none" / "emotional_support" / "safety_protocol"
        "memory_saved": bool
    }
```

### 3.3 核心函数签名

```python
# 主入口
def process_gateway(
    raw_query: str,
    context_meta: Optional[Dict] = None
) -> GatewayOutput:
    """完整的网关处理流程"""
    pass

# 情感分析
def analyze_emotion(query: str) -> PADVector:
    """计算 PAD 三维向量"""
    pass

# 意图分类
def classify_intent(query: str) -> str:
    """分类：emotion / task / mixed"""
    pass

# 认知偏差检测
def detect_cognitive_distortions(query: str) -> List[str]:
    """检测认知扭曲模式"""
    pass

# 规则触发
def check_trigger_rules(
    pad_vector: PADVector,
    distortions: List[str]
) -> Dict:
    """判定是否触发干预规则"""
    pass

# 输出润色
def rewrite_response(
    original_response: str,
    pad_vector: PADVector,
    intervention_type: str
) -> str:
    """根据情感状态润色输出"""
    pass

# 记忆抽取
def extract_memory(
    raw_query: str,
    response: str,
    pad_vector: PADVector,
    emotion_level: int
) -> Optional[MemoryCandidate]:
    """抽取关键事件用于记忆"""
    pass
```

---

## 四、情感算法实现

### 4.1 PAD 向量计算

**关键词库结构**：
```python
EMOTION_KEYWORDS = {
    "anger": {
        "keywords": ["生气", "愤怒", "讨厌", "烦"],
        "valence": -0.8,      # 负面
        "intensity": 0.8,     # 高激活
        "dominance": 0.6      # 中等支配感
    },
    "sadness": {
        "keywords": ["难过", "沮丧", "伤心", "失望"],
        "valence": -0.7,
        "intensity": 0.5,
        "dominance": 0.2      # 低支配感
    },
    "joy": {
        "keywords": ["开心", "高兴", "快乐", "兴奋"],
        "valence": 0.8,       # 正面
        "intensity": 0.7,
        "dominance": 0.7
    },
    # ... 更多情绪类型
}
```

**计算流程**：
```python
def calculate_pad_vector(query: str) -> PADVector:
    # 1. 关键词匹配与权重计算
    matched_emotions = match_keywords(query)

    # 2. 加权平均
    p_score = weighted_average([e["valence"] for e in matched_emotions])
    a_score = max([e["intensity"] for e in matched_emotions])
    d_score = weighted_average([e["dominance"] for e in matched_emotions])

    # 3. 强度修正（基于句子结构、重复词等）
    intensity_modifier = calculate_intensity_modifier(query)
    a_score *= intensity_modifier

    return PADVector(p=p_score, a=a_score, d=d_score)
```

### 4.2 情绪强度分级

```python
def get_emotion_level(arousal: float) -> int:
    """
    L0: A < 0.3   → 平静（轻度润色）
    L1: 0.3 ≤ A < 0.6   → 激活（情感确认）
    L2: 0.6 ≤ A < 0.8   → 高激活（共情 + 认知重评）
    L3: 0.8 ≤ A < 0.95  → 极端（安全协议）
    L4: A ≥ 0.95        → 危机（立即转接）
    """
    if arousal < 0.3:
        return 0
    elif arousal < 0.6:
        return 1
    elif arousal < 0.8:
        return 2
    elif arousal < 0.95:
        return 3
    else:
        return 4
```

### 4.3 认知偏差检测

```python
COGNITIVE_DISTORTION_PATTERNS = {
    "catastrophizing": {
        "patterns": [
            r"(一定|肯定|完全|永远).*(失败|完蛋|毁了|糟糕)",
            r"(最坏|最差|最糟).*(情况|结果|局面)"
        ],
        "intervention": "cognitive_reappraisal"
    },
    "overgeneralization": {
        "patterns": [
            r"(总是|从不|每次|所有人).*(都|不)",
            r"(没有人|没人|谁都).*(能|会)"
        ],
        "intervention": "evidence_gathering"
    },
    "black_white_thinking": {
        "patterns": [
            r"(要么.*要么|非此即彼|完全)",
            r"(全部|一点|根本).*(好|坏)"
        ],
        "intervention": "nuance_exploration"
    },
    "personalization": {
        "patterns": [
            r"(都是我的错|我导致|因为我)",
            r"(我应该|我必须|我得).*(才能|否则)"
        ],
        "intervention": "responsibility_reframing"
    }
}

def detect_distortions(query: str) -> List[str]:
    detected = []
    for distortion_type, config in COGNITIVE_DISTORTION_PATTERNS.items():
        for pattern in config["patterns"]:
            if re.search(pattern, query):
                detected.append(distortion_type)
                break
    return detected
```

### 4.4 记忆权重计算

```python
def calculate_memory_weight(
    emotion_intensity: float,      # 0-1
    time_since_event: int,         # 秒
    user_engagement: float = 0.5   # 0-1
) -> float:
    """
    权重 = 情感强度 × 时间衰减 × 参与度

    时间衰减：7天半衰期
    参与度：用户是否主动分享（0.5-1.0）
    """
    import math

    # 7天 = 604800 秒
    time_decay = math.exp(-time_since_event / 604800)

    # 权重计算
    weight = emotion_intensity * time_decay * user_engagement

    return min(weight, 1.0)
```

---

## 五、情感陪护策略

### 5.1 策略映射表

| 情感状态 | 触发条件 | 干预策略 | 改写强度 | 示例 |
|---------|---------|---------|---------|------|
| 负面高激活 | P < 0.3, A > 0.6 | 认知重评 | 50% | "这个挑战让你感到沮丧，但也说明你在乎。让我们一起分解问题..." |
| 无力感 | D < 0.3 | 赋能 | 40% | "你已经成功处理过类似的情况，这次也可以。" |
| 孤独感 | 主动分享 | 连接 | 30% | "感谢你的信任。我在这里陪伴你。" |
| 过度疲劳 | A > 0.7, 持续 | 休息建议 | 35% | "你已经很努力了。现在休息一下会更有帮助。" |
| 危机边缘 | A ≥ 0.95 | 安全协议 | 90% | "我很担心你。请立即联系专业人士..." |

### 5.2 改写强度计算

```python
def calculate_rewrite_intensity(
    emotion_level: int,
    intervention_type: str
) -> float:
    """
    基于情感等级和干预类型计算改写强度
    """
    base_intensity = {
        0: 0.1,   # L0: 10%
        1: 0.25,  # L1: 25%
        2: 0.5,   # L2: 50%
        3: 0.75,  # L3: 75%
        4: 0.9    # L4: 90%
    }

    # 特殊干预类型的调整
    if intervention_type == "safety_protocol":
        return 0.9
    elif intervention_type == "emotional_support":
        return base_intensity[emotion_level] + 0.1

    return base_intensity[emotion_level]
```

---

## 六、存储设计

### 6.1 SQLite 数据库架构

```sql
-- 记忆表
CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    raw_query TEXT,
    response_summary TEXT,
    emotion_level INTEGER,
    pad_vector JSON,
    cognitive_distortions JSON,
    memory_weight REAL,
    memory_type TEXT,  -- "event" / "emotion_trajectory" / "insight"
    created_at INTEGER,
    updated_at INTEGER,
    deleted_at INTEGER
);

-- 情感轨迹表
CREATE TABLE emotion_trajectory (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    pad_vector JSON,
    context TEXT,
    created_at INTEGER
);

-- 干预记录表
CREATE TABLE intervention_logs (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    trigger_reason TEXT,
    intervention_type TEXT,
    rewrite_intensity REAL,
    original_response TEXT,
    rewritten_response TEXT,
    created_at INTEGER
);

-- 配置表
CREATE TABLE config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER
);
```

### 6.2 查询接口

```python
class StorageManager:
    def save_memory(self, memory: MemoryCandidate) -> int:
        """保存记忆，返回 ID"""
        pass

    def get_memories(
        self,
        user_id: str,
        start_time: int,
        end_time: int,
        emotion_level: Optional[int] = None
    ) -> List[Memory]:
        """查询记忆"""
        pass

    def update_memory(self, memory_id: int, updates: Dict) -> bool:
        """用户编辑记忆"""
        pass

    def delete_memory(self, memory_id: int) -> bool:
        """用户删除记忆"""
        pass

    def get_emotion_trajectory(
        self,
        user_id: str,
        days: int = 7
    ) -> List[PADVector]:
        """获取情感轨迹"""
        pass
```

---

## 七、与 xiaonuan 系统的集成

### 7.1 与 Soul 系统协作

```python
# 读取当前 PAD 状态
current_pad = soul_system.get_current_pad_state(user_id)

# 根据当前状态调整润色风格
if current_pad.pleasure < 0.3:
    # 用户处于低愉悦状态，加强共情
    rewrite_intensity *= 1.2

# 更新 bond_level
if interaction_quality > 0.8:
    soul_system.update_bond_level(user_id, delta=+1)

# 触发 soul_process 中的决策树
if emotion_level >= 3:
    soul_system.trigger_decision_tree(
        user_id,
        trigger_type="high_emotion",
        context=meta
    )
```

### 7.2 与 Memory 系统协作

```python
# 关键事件抽取遵循 memory_base.md 规范
memory_candidate = {
    "type": "event",
    "summary": extract_summary(raw_query, response),
    "emotion_trajectory": pad_vector,
    "timestamp": current_time,
    "weight": calculate_memory_weight(emotion_intensity, time_interval)
}

# 写入 soul_logs/daily_reflection
memory_system.write_to_daily_reflection(
    user_id,
    memory_candidate
)

# 支持多时间尺度组织
memory_system.organize_by_timescale(
    memory_candidate,
    scales=["day", "week", "month", "year"]
)
```

### 7.3 与 Task 系统协作

```python
# 任务类输入的情感剥离
if intent_type == "mixed":
    pure_task = extract_pure_task(raw_query)
    emotion_context = extract_emotion_context(raw_query)

    # 发送纯任务给 Task 系统
    task_system.process_task(pure_task)

    # 保存情感背景用于后续润色
    store_emotion_context(emotion_context)

# 任务完成后的情感反馈注入
task_result = task_system.get_result()
final_response = inject_emotion_feedback(
    task_result,
    current_pad_state
)
```

---

## 八、测试策略

### 8.1 单元测试

```python
# 测试 PAD 计算
def test_pad_calculation():
    # 低情感强度
    pad = analyze_emotion("帮我查一下明天的天气")
    assert pad.arousal < 0.3

    # 高情感强度
    pad = analyze_emotion("我今天很沮丧，什么都做不好")
    assert pad.pleasure < 0.3
    assert pad.arousal > 0.6

# 测试认知偏差检测
def test_cognitive_distortion_detection():
    distortions = detect_distortions("我总是失败，永远做不好")
    assert "overgeneralization" in distortions

# 测试记忆权重
def test_memory_weight():
    weight = calculate_memory_weight(
        emotion_intensity=0.8,
        time_since_event=0,
        user_engagement=1.0
    )
    assert weight == 0.8
```

### 8.2 集成测试

```python
# 场景 1：低情感强度任务
def test_low_emotion_task():
    output = process_gateway("帮我查一下明天的天气")
    assert output.downstream["meta"]["emotion_level"] == 0
    assert output.downstream["meta"]["rewrite_intensity"] < 0.15
    assert output.user_facing["intervention_type"] == "none"

# 场景 2：高情感强度负面
def test_high_emotion_negative():
    output = process_gateway("我今天很沮丧，什么都做不好")
    assert output.downstream["meta"]["emotion_level"] >= 2
    assert "overgeneralization" in output.downstream["meta"]["cognitive_distortions"]
    assert output.user_facing["intervention_type"] == "emotional_support"

# 场景 3：危机边缘
def test_crisis_detection():
    output = process_gateway("我真的受不了了，活着没意义")
    assert output.downstream["meta"]["emotion_level"] >= 3
    assert output.downstream["meta"]["risk_level"] == "high"
    assert output.user_facing["intervention_type"] == "safety_protocol"
```

### 8.3 验证清单

- [ ] 原始 query 完整传递给下游
- [ ] 情绪强度触发时改写力度正确
- [ ] 记忆写入可见可控
- [ ] 离线可运行（无外部依赖）
- [ ] 所有强介入都有可解释记录
- [ ] 不存在过度润色导致内容失真
- [ ] 所有存储均为本地可控

---

## 九、开发任务清单

### Phase 1：核心算法（优先级：高）
- [ ] 实现 PAD 向量计算引擎
- [ ] 实现情绪强度分级逻辑
- [ ] 实现认知偏差检测
- [ ] 实现记忆权重计算

### Phase 2：网关处理流程（优先级：高）
- [ ] 实现主入口 `process_gateway()`
- [ ] 实现意图分类器
- [ ] 实现规则引擎
- [ ] 实现元信息生成

### Phase 3：输出润色（优先级：中）
- [ ] 实现情感陪护策略映射
- [ ] 实现响应改写引擎
- [ ] 实现改写强度计算

### Phase 4：存储与持久化（优先级：中）
- [ ] 设计 SQLite 数据库架构
- [ ] 实现 StorageManager
- [ ] 实现记忆查询接口
- [ ] 实现用户可控的编辑/删除

### Phase 5：集成与测试（优先级：中）
- [ ] 与 Soul 系统集成
- [ ] 与 Memory 系统集成
- [ ] 与 Task 系统集成
- [ ] 完整的单元测试与集成测试

### Phase 6：部署与配置（优先级：低）
- [ ] 本地进程 Gateway 实现（CLI/daemon）
- [ ] 配置文件管理
- [ ] 日志与监控
- [ ] 文档与示例

---

## 十、配置示例

### 10.1 默认配置文件（config.yaml）

```yaml
# 情感阈值
emotion_thresholds:
  low: 0.3
  medium: 0.6
  high: 0.8
  crisis: 0.95

# 改写强度
rewrite_intensity:
  L0: 0.1
  L1: 0.25
  L2: 0.5
  L3: 0.75
  L4: 0.9

# 记忆配置
memory:
  enabled: true
  storage_type: "sqlite"
  db_path: "~/.xiaonuan/gateway.db"
  time_decay_half_life: 604800  # 7天

# 集成配置
integration:
  soul_system: true
  memory_system: true
  task_system: true

# 日志配置
logging:
  level: "INFO"
  file: "~/.xiaonuan/gateway.log"
```

---

## 十一、参考资源

- **Agent 规范**：docs/agent_empathic_gateway.md
- **项目规划**：docs/gateway_plan.md
- **xiaonuan 架构**：CLAUDE.md
- **心理学基础**：PAD 模型、认知行为疗法、情感调节理论

---

## 十二、联系与反馈

如有问题或需要澄清，请参考：
- Agent 规范中的"约束与边界"章节
- 测试场景中的具体验证标准
- 集成点说明中的 API 调用示例
