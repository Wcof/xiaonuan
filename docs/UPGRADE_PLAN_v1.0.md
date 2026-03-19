# xiaonuan 项目升级优化方案 v1.0

> **方案版本**: 1.0
> **创建日期**: 2026-03-19
> **状态**: 待 QA 检查
> **参考项目**: mem0 (mem0ai/mem0)

---

## 一、现状分析

### 1.1 当前架构

```
xiaonuan/
├── mcp-server/                    # MCP Server (TypeScript)
│   └── src/empathic_gateway/
│       ├── gateway.ts            # 情感网关主入口
│       ├── processing/           # 意图分类、元数据生成
│       ├── emotion/              # PAD计算、认知偏差、情感分类
│       ├── rewriting/            # 响应重写
│       ├── storage/              # JSONL存储管理
│       └── types.ts             # 类型定义
├── src/                          # 源文件 (7个markdown)
│   ├── memory_base.md            # 记忆系统规则
│   ├── soul_base.md              # 灵魂系统规则
│   └── ...
└── data/                         # 运行数据
```

### 1.2 当前痛点

| 问题 | 描述 | 影响 |
|------|------|------|
| **存储简单** | JSONL 文件无法支持复杂查询 | 记忆检索效率低 |
| **无历史追踪** | 记忆更新/删除无版本记录 | 无法回溯变更 |
| **元数据贫乏** | 记忆只存储内容，无情感上下文 | 检索结果缺乏情感维度 |
| **无记忆决策** | 新记忆直接添加，无 ADD/UPDATE/DELETE 判断 | 记忆冗余/冲突 |
| **可扩展性差** | 存储后端硬编码 | 切换成本高 |

---

## 二、升级目标

### 2.1 核心目标

1. **增强情感记忆单元** - 将 PAD 向量、情感标签作为记忆的第一公民
2. **引入历史追踪** - 借鉴 mem0 的 SQLite 历史记录机制
3. **支持复杂查询** - 基于时间 + 情感的过滤检索
4. **保持轻量设计** - 不引入向量数据库，避免过度设计

### 2.2 非目标（明确不做的）

- ❌ 引入向量数据库（当前规模不需要）
- ❌ 完整复制 mem0（定位不同，xianuan 是情感伴侣）
- ❌ 云端服务（保持本地优先原则）

---

## 三、升级方案

### 3.1 架构设计

```
升级后架构：
┌─────────────────────────────────────────────────────────────┐
│                     Empathic Gateway                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 情感分析      │  │ 意图分类      │  │ 记忆提取     │    │
│  │ (PAD向量)     │  │ (emotion/    │  │ (候选生成)   │    │
│  │              │  │  task/mixed) │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Memory Manager                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │  │
│  │  │ 情感记忆    │  │ 历史追踪    │  │ 查询过滤    │   │  │
│  │  │ 存储层      │  │ (SQLite)   │  │ 引擎        │   │  │
│  │  └────────────┘  └────────────┘  └────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Storage Adapter (Factory)                │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │  │
│  │  │ JSONL   │  │ SQLite  │  │ Future  │             │  │
│  │  │ Adapter │  │ Adapter │  │ Adapter │             │  │
│  │  └─────────┘  └─────────┘  └─────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心模块升级

#### 3.2.1 情感记忆单元 (EmotionalMemory)

**当前**:
```typescript
interface MemoryCandidate {
    type: 'event' | 'emotion_trajectory' | 'insight';
    summary: string;
    emotion_trajectory: PADVector;
    timestamp: number;
    weight: number;
}
```

**升级后**:
```typescript
interface EmotionalMemory {
    // 核心内容
    id: string;                      // UUID
    content: string;                 // 记忆内容（脱敏后）
    type: MemoryType;                // event | emotion_trajectory | insight

    // 情感上下文（第一公民）
    pad_vector: PADVector;           // 当时的情感状态
    emotion_tags: string[];          // 情绪标签 [焦虑, 期待, ...]
    cognitive_distortions: string[]; // 认知偏差检测结果

    // 权重系统
    weight: number;                  // 记忆权重 = f(情感强度, 时间衰减, 参与度)
    trigger_importance: boolean;     // 是否触发关键事件

    // 关系链
    related_memories: string[];      // 关联记忆ID
    topic_id?: string;               // 所属Topic
    user_id: string;

    // 时间戳
    created_at: string;
    updated_at: string;
    version: number;                 // 版本号（用于历史追踪）
}
```

#### 3.2.2 历史追踪 (History Tracking)

**借鉴 mem0 的 SQLiteManager，设计如下**:

```sql
-- memories 表
CREATE TABLE memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    pad_vector TEXT,           -- JSON 存储
    emotion_tags TEXT,          -- JSON 数组
    cognitive_distortions TEXT, -- JSON 数组
    weight REAL DEFAULT 0.5,
    trigger_importance INTEGER DEFAULT 0,
    related_memories TEXT,      -- JSON 数组
    topic_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0
);

-- history 表（借鉴 mem0）
CREATE TABLE history (
    id TEXT PRIMARY KEY,
    memory_id TEXT NOT NULL,
    old_memory TEXT,
    new_memory TEXT,
    event TEXT NOT NULL,        -- ADD | UPDATE | DELETE
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    actor_id TEXT,
    role TEXT                   -- user | assistant
);

-- emotion_trajectories 表
CREATE TABLE emotion_trajectories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    pad_vector TEXT NOT NULL,  -- JSON
    context TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- indexes
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_created_at ON memories(created_at);
CREATE INDEX idx_history_memory_id ON history(memory_id);
CREATE INDEX idx_trajectories_user_id ON emotion_trajectories(user_id);
```

#### 3.2.3 存储适配器工厂 (Storage Adapter Factory)

**当前**: StorageManager 直接操作 JSONL

**升级后**: 工厂模式，支持多后端

```typescript
// storage/adapters/base.ts
interface StorageAdapter {
    initialize(): Promise<void>;

    // Memory operations
    saveMemory(memory: EmotionalMemory): Promise<string>;
    getMemory(id: string): Promise<EmotionalMemory | null>;
    getMemories(query: MemoryQuery): Promise<EmotionalMemory[]>;
    updateMemory(id: string, updates: Partial<EmotionalMemory>): Promise<boolean>;
    deleteMemory(id: string): Promise<boolean>;

    // History operations
    addHistory(entry: HistoryEntry): Promise<void>;
    getHistory(memoryId: string): Promise<HistoryEntry[]>;

    // Trajectory operations
    saveTrajectory(trajectory: EmotionTrajectory): Promise<void>;
    getTrajectories(userId: string, days?: number): Promise<EmotionTrajectory[]>;
}

// adapters
class JsonlAdapter implements StorageAdapter { ... }
class SQLiteAdapter implements StorageAdapter { ... }

// Factory
class StorageFactory {
    static create(type: 'jsonl' | 'sqlite', config?: any): StorageAdapter;
}
```

#### 3.2.4 记忆权重计算 (Weight Calculation)

**公式**:
```
weight = emotion_intensity × time_decay × engagement × topic_multiplier

其中:
- emotion_intensity = clamp(arousal * |pleasure|, 0, 1)
- time_decay = base ^ (days_since_creation / 30)  // 30天衰减一半
- engagement = 0.5 + (interaction_count * 0.1)  // 最高1.0
- topic_multiplier = 1.5 if topic_id else 1.0
```

### 3.3 升级后的数据流

```
用户输入
    │
    ▼
┌───────────────────────────────────────┐
│         Empathic Gateway               │
│  1. PAD 向量计算                       │
│  2. 意图分类 (emotion/task/mixed)     │
│  3. 认知偏差检测                       │
│  4. 记忆候选提取                       │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│         Memory Manager                 │
│  1. LLM 判断记忆操作 (ADD/UPDATE/      │
│     DELETE/NONE)                       │
│  2. 计算记忆权重                        │
│  3. 写入存储 + 历史记录                  │
└───────────────────────────────────────┘
    │
    ▼
┌───────────────────────────────────────┐
│         Storage Adapter                │
│  (SQLiteAdapter / JsonlAdapter)        │
│  · 记忆 CRUD                           │
│  · 历史记录                            │
│  · 情感轨迹                            │
└───────────────────────────────────────┘
```

---

## 四、升级步骤

### Phase 1: 基础设施 (第1-2周)

| 任务 | 描述 | 文件 |
|------|------|------|
| T1.1 | 创建 Storage Adapter 接口和工厂 | `storage/adapters/base.ts` |
| T1.2 | 实现 SQLiteAdapter | `storage/adapters/sqlite.ts` |
| T1.3 | 实现 JsonlAdapter (兼容旧数据) | `storage/adapters/jsonl.ts` |
| T1.4 | 创建数据库迁移脚本 | `scripts/migrate.ts` |

### Phase 2: 情感记忆增强 (第3-4周)

| 任务 | 描述 | 文件 |
|------|------|------|
| T2.1 | 升级 EmotionalMemory 类型定义 | `types.ts` |
| T2.2 | 实现记忆权重计算 | `emotion/memory_weight.ts` |
| T2.3 | 增强 PAD 计算（时间衰减因子） | `emotion/pad_calculator.ts` |
| T2.4 | 集成新的存储层到 Gateway | `gateway.ts` |

### Phase 3: 历史追踪 (第5-6周)

| 任务 | 描述 | 文件 |
|------|------|------|
| T3.1 | 实现 HistoryManager | `storage/history_manager.ts` |
| T3.2 | 添加记忆操作 LLM 判断 | `processing/memory_decision.ts` |
| T3.3 | 实现记忆查询过滤引擎 | `storage/query_engine.ts` |

### Phase 4: 迁移与测试 (第7-8周)

| 任务 | 描述 | 文件 |
|------|------|------|
| T4.1 | 数据迁移工具（JSONL → SQLite） | `scripts/migrate.ts` |
| T4.2 | 单元测试 | `__tests__/` |
| T4.3 | 集成测试 | `__tests__/integration/` |
| T4.4 | 文档更新 | `docs/` |

---

## 五、风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数据迁移丢失 | 中 | 迁移前备份，迁移后双向验证 |
| SQLite 性能瓶颈 | 低 | 当前规模(<10000条)完全足够 |
| 兼容性破坏 | 中 | 保留 JsonlAdapter，新旧数据共存 |
| LLM 判断不稳定 | 中 | 提供 fallback 策略（默认 ADD） |

---

## 六、验收标准

### 6.1 功能验收

- [ ] 记忆可以保存 PAD 向量和情感标签
- [ ] 记忆更新有历史记录可追溯
- [ ] 支持按时间范围、情感标签、用户ID 过滤查询
- [ ] 记忆权重计算正确
- [ ] JSONL 数据可迁移到 SQLite

### 6.2 性能验收

- 单次记忆写入 < 50ms
- 记忆查询（1000条规模）< 100ms
- 迁移10000条记忆 < 5分钟

### 6.3 兼容性验收

- 旧 JSONL 数据可正常读取
- 现有 MCP tools 不受影响
- 情感网关输出格式兼容

---

## 七、方案对比

| 维度 | 当前方案 | mem0 | 本升级方案 |
|------|----------|------|-----------|
| 存储后端 | JSONL | 多向量库 | SQLite（可扩展） |
| 记忆类型 | 简单 | 语义/情景/程序 | 情感增强型 |
| 情感维度 | PAD向量(独立) | 无 | PAD向量(记忆属性) |
| 历史追踪 | 无 | SQLite | SQLite |
| 查询能力 | 全文匹配 | 向量语义 | 时间+情感过滤 |
| 记忆决策 | 无 | LLM判断 | LLM判断(增强) |
| 工程复杂度 | 低 | 高 | 中 |

---

## 八、结论

本方案在借鉴 mem0 优秀设计的同时，保持了 xiaonuan 的轻量化和情感优先原则：

1. **不引入向量数据库** - 当前规模不需要，避免过度设计
2. **SQLite 替代 JSONL** - 支持复杂查询和历史追踪
3. **情感作为第一公民** - PAD 向量和情感标签成为记忆的核心属性
4. **渐进式升级** - 4个Phase，每个Phase可独立验证

---

**下一步**:
1. QA 检查方案
2. 与共情架构师确认细节
3. 开始 Phase 1 实施
