# mem0 代码学习报告

> 学习时间：2026-03-18
> 项目路径：/Users/ldh/Downloads/project/mem0

---

## 一、项目整体结构

```
mem0/
├── mem0/                      # 核心代码
│   ├── client/                # 客户端
│   ├── configs/               # 配置（重点）
│   │   ├── base.py           # MemoryConfig, MemoryItem
│   │   ├── prompts.py        # 提示词模板（重点）
│   │   ├── enums.py          # 枚举
│   │   ├── embeddings/       # 向量嵌入配置
│   │   ├── llms/             # LLM 配置
│   │   ├── vector_stores/    # 向量存储配置
│   │   └── rerankers/        # 重排序配置
│   ├── memory/               # 核心记忆模块（重点）
│   │   ├── main.py           # Memory 类（1500+ 行）
│   │   ├── storage.py        # SQLiteManager 历史记录
│   │   ├── base.py           # 抽象基类
│   │   └── utils.py          # 工具函数
│   ├── embeddings/           # 向量嵌入实现
│   ├── llms/                 # LLM 实现
│   ├── vector_stores/        # 向量存储实现
│   └── graphs/               # 知识图谱
└── ...
```

---

## 二、核心设计模式

### 2.1 记忆类型

mem0 支持三种记忆类型：

| 类型 | 说明 | 用途 |
|------|------|------|
| **语义记忆** | 用户偏好、事实 | `add()` 默认创建 |
| **情景记忆** | 对话历史 | 通过 messages 传入 |
| **程序记忆** | Agent 执行步骤 | `memory_type="procedural_memory"` |

### 2.2 记忆操作（ADD/UPDATE/DELETE/NONE）

mem0 使用 LLM 判断如何处理新信息：

```
新输入 → LLM 提取事实 → 检索旧记忆 → LLM 对比 → 执行 ADD/UPDATE/DELETE/NONE
```

**关键提示词**：`DEFAULT_UPDATE_MEMORY_PROMPT`
- 定义了 4 种操作的判断逻辑
- 使用 few-shot 示例指导 LLM

---

## 三、核心 API

### 3.1 Memory 类

```python
from mem0 import Memory

# 初始化
m = Memory(config=MemoryConfig())

# 添加记忆
result = m.add(
    messages=[{"role": "user", "content": "我喜欢吃川菜"}],
    user_id="user_123"
)

# 搜索记忆
results = m.search(
    query="用户喜欢什么菜",
    user_id="user_123",
    limit=5
)

# 获取所有记忆
all_memories = m.get_all(user_id="user_123")

# 更新记忆
m.update(memory_id="mem_xxx", data="新内容")

# 删除记忆
m.delete(memory_id="mem_xxx")

# 获取历史
history = m.history(memory_id="mem_xxx")
```

### 3.2 异步版本

```python
from mem0 import AsyncMemory

m = AsyncMemory(config=MemoryConfig())
await m.add(messages=[...], user_id="user_123")
```

---

## 四、数据结构

### 4.1 MemoryItem

```python
class MemoryItem(BaseModel):
    id: str              # 唯一标识
    memory: str          # 记忆内容
    hash: Optional[str]  # 内容哈希
    metadata: Optional[Dict]  # 元数据
    score: Optional[float]    # 相似度分数
    created_at: Optional[str] # 创建时间
    updated_at: Optional[str] # 更新时间
```

### 4.2 存储结构

**向量存储**（存储记忆内容）：
- 支持：Chroma, Qdrant, Pinecone, Weaviate, FAISS 等
- 存储：memory text + embeddings + metadata

**SQLite**（存储历史记录）：
```python
# history 表结构
{
    "id": "uuid",
    "memory_id": "记忆ID",
    "old_memory": "旧内容",
    "new_memory": "新内容",
    "event": "ADD|UPDATE|DELETE",
    "created_at": "时间",
    "updated_at": "时间",
    "is_deleted": 0/1,
    "actor_id": "发言者ID",
    "role": "user/assistant"
}
```

---

## 五、元数据过滤

mem0 支持强大的元数据过滤：

### 5.1 基础过滤

```python
m.search(
    query="...",
    user_id="user_123",
    agent_id="agent_456",
    filters={"role": "user"}  # 额外过滤
)
```

### 5.2 高级过滤操作符

```python
filters = {
    "key": "value",              # 精确匹配
    "key": {"eq": "value"},      # 等于
    "key": {"ne": "value"},      # 不等于
    "key": {"in": ["a", "b"]},   # 在列表中
    "key": {"gt": 10},           # 大于
    "key": {"contains": "text"}, # 包含
    "key": {"icontains": "text"},# 不区分大小写包含
    "key": "*",                  # 任意值
    "AND": [filter1, filter2],   # 逻辑与
    "OR": [filter1, filter2],    # 逻辑或
    "NOT": [filter1]             # 逻辑非
}
```

---

## 六、关键代码片段

### 6.1 记忆提取逻辑

```python
def _should_use_agent_memory_extraction(self, messages, metadata):
    """判断使用用户记忆提取还是 Agent 记忆提取"""
    has_agent_id = metadata.get("agent_id") is not None
    has_assistant_messages = any(msg.get("role") == "assistant" for msg in messages)
    return has_agent_id and has_assistant_messages
```

### 6.2 并发处理

```python
# 同时向向量存储和图存储写入
with concurrent.futures.ThreadPoolExecutor() as executor:
    future1 = executor.submit(self._add_to_vector_store, ...)
    future2 = executor.submit(self._add_to_graph, ...)
    concurrent.futures.wait([future1, future2])
```

### 6.3 安全深拷贝配置

```python
def _safe_deepcopy_config(config):
    """解决配置对象无法深拷贝的问题"""
    try:
        return deepcopy(config)
    except Exception:
        # 回退到 JSON 序列化
        clone_dict = config.model_dump(mode="json")
        return config_class(**clone_dict)
```

---

## 七、对 xiaonuan 的借鉴价值

### 7.1 可直接借鉴

| 特性 | mem0 实现 | xiaonuan 现状 | 建议 |
|------|-----------|---------------|------|
| 记忆提取提示词 | `prompts.py` | 自己实现 | 可参考 few-shot 格式 |
| 元数据过滤 | 完整的操作符支持 | 简单实现 | 可增强过滤能力 |
| 历史记录 | SQLiteManager | 自己实现 | 可参考 schema 设计 |
| 异步支持 | AsyncMemory | 无 | 可考虑 |

### 7.2 差异化点

mem0 是**通用记忆系统**，而 xiaonuan 是**情感伴侣系统**：

| 方面 | mem0 | xiaonuan |
|------|------|----------|
| 核心目标 | 记住用户偏好 | 情感连接 |
| 记忆内容 | 事实 + 偏好 | 情感 + 记忆 + 认知 |
| 特殊处理 | user/agent 区分 | PAD 情感向量 |
| 输出 | 检索结果 | 情感化响应 |

### 7.3 可不借鉴

- 图存储（knowledge graph）- 与 xiaonuan 定位不符
- 程序记忆（procedural memory）- xiaonuan 不执行任务
- 重排序（reranker）- 当前规模不需要

---

## 八、总结

mem0 是一个设计精良的记忆系统，核心亮点：

1. **LLM 驱动的记忆处理** - 自动判断 ADD/UPDATE/DELETE
2. **灵活的元数据过滤** - 支持复杂查询条件
3. **完整的历史追踪** - 记录每一次变更
4. **多存储后端** - 可插拔的向量存储

对于 xiaonuan：
- 可借鉴提示词设计和过滤逻辑
- 情感维度需要自己扩展（PAD 模型）
- 记忆与情感的结合是差异化核心