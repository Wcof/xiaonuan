# MCP 交互与本地记忆方案（Tool: xiaonuan）

## 目标
- 本地启动 MCP Server，通过客户端配置接入。
- 所有“一问一答”都走 MCP Tool `xiaonuan`。
- 能区分“互动信息 vs 工作信息”。
- 记忆写回项目本地目录，格式既适合模型，又易于人读。

---

## 一、MCP Tool 规范（命名固定）

### Tool 名称
- `xiaonuan`

### 输入参数（推荐）
- `raw_query`（必填）：用户原始输入
- `downstream_response`（必填）：下游模型/业务层回答
- `context_meta`（可选）：
  - `user_id`
  - `session_id`
  - `timestamp`

### 输出字段（必须）
- `final_response`：润色后的用户可见回答
- `intent_type`：`emotion` / `task` / `mixed`
- `meta`：包含 `pad_vector` / `emotion_level` / `rewrite_intensity` / `risk_level`
- `memory_saved`：是否写入记忆

---

## 二、交互区分规则（互动 vs 工作）

- 由 `intent_classifier` 输出 `intent_type`。
- 规则：
  - `emotion` → 互动类
  - `task` → 工作类
  - `mixed` → 同时包含互动与工作
- MCP Tool 输出 `intent_type`，客户端可据此展示或路由。

---

## 三、本地记忆写入规范（人读友好 + 模型友好）

### 写入目录
- `data/memory/memory_week/`  （周记忆）
- `data/memory/memory_month/` （月记忆）
- `data/memory/memory_topic/` （主题记忆）

### 文件格式（Markdown）
- **结构清晰，便于模型提取**
- **人类可读**

**示例：`data/memory/memory_week/2026-W11.md`**

```markdown
# Week Memory — 2026-W11

## Summary
- 关键词：情感陪护 / 工作推进 / 记忆更新

## Timeline
- 2026-03-12 21:40
  - Intent: mixed
  - Event: 用户表达压力，同时提出项目需求
  - Emotion: 负面高激活 (P=-0.6, A=0.7, D=0.3)
  - Response: 已给出共情与分解建议

## Key Facts (User-Visible)
- 用户希望 MCP 本地运行，不上云
- 记忆需写入项目本地目录

## Tags
- intent:mixed
- risk:medium
- topic:empathic_gateway
```

**示例：`data/memory/memory_topic/active/topic_empathic_gateway.md`**

```markdown
# Topic Memory — empathic_gateway

## Overview
- 本主题记录关于情感网关/前置 MCP 的设计与实现

## Key Decisions
- MCP Tool 名称固定为 xiaonuan
- 记忆格式采用 Markdown 结构化模板

## Recent Updates
- 2026-03-12: 明确需要“互动 vs 工作”分类输出
```

---

## 四、落地执行步骤（给 Agent 用）

1. 新增 MCP Tool `xiaonuan`
   - 对接 `EmpathicGateway.process(raw_query, downstream_response, meta)`
   - 输出 `final_response` + `intent_type` + `meta` + `memory_saved`

2. 将 `intent_type` 注入 `GatewayMeta`
   - 作为 Tool 输出字段

3. 记忆写入逻辑扩展
   - 本地 JSONL 继续保留（可选）
   - 同步写入 `data/memory/` Markdown 结构化文件

4. 保证时间线
   - 每条记忆必须包含 `timestamp`
   - 按周/月/主题归档

---

## 五、验收标准

- MCP 客户端调用 `xiaonuan` 后能得到润色后的回答
- 输出中包含 `intent_type` 和 `meta`
- 本地 `data/memory/` 目录生成带时间线的 Markdown 记忆
- 断网环境可运行

