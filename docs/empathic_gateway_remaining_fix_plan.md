# Empathic Gateway 剩余问题修复方案（给新 Agent）

## 目标
- 在已完成 MCP 接入的基础上，补齐缺口并完成与 `src/SKILL.md` 的一致性。

---

## 一、尚未完成的关键问题

### 1. Topic 记忆未写入
- 当前只写 `memory_day/week/month`，未写 `memory_topic/active|archived`。
- 影响：无法形成主题级知识沉淀。

### 2. 人格挂载不完整
- `SourceAdapter` 只用于 `traits`→`personaTone`，未应用 `tone_templates`。
- 主人认知（`master_profile` 标签与摘要）没有输出。

### 3. 安全路径映射不一致
- `SKILL.md` 使用 `/xiaonuan/...` 目录逻辑。
- 当前写入路径为 `data/...`。
- 缺少映射规则，导致安全层级判断可能错误。

### 4. End-of-Turn Hook 未接入
- `end_of_turn.ts` 存在但未在 `xiaonuan` Tool 中调用。
- 当前写入逻辑是临时拼接，未遵循 SKILL 定义流程。

---

## 二、修复方案（执行步骤）

### Step 1. 追加 Topic 记忆写入
- 在 `xiaonuan.ts` 的 `writeMemory()` 中新增：
  - `data/memory_bank/memory_topic/active/topic_<topic>.md`
- 主题名可取自：
  - `intent_type` + 关键词摘要
  - 或认知偏差分类

### Step 2. 完成人格挂载
- `SourceAdapter.getPersona().tone_templates` 应用于 `rewriteResponse()`。
- 增加 `master_profile` 输出（标签 + 摘要），返回给 MCP。

### Step 3. 安全路径映射
- 定义映射：
  - `/xiaonuan/...` → `data/...`
- 让 `SecurityGate.checkAccess()` 对映射后的路径生效。

### Step 4. End-of-Turn Hook 接入
- 替换当前手写写入逻辑，改为调用 `EndOfTurnHook.execute()`。
- 确保执行：
  - PAD 持久化
  - 天记忆写入
  - 任务同步（可选）

---

## 三、验收标准

- MCP Tool `xiaonuan` 返回 `final_response / intent_type / meta / master_profile`。
- 本地 `memory_topic` 文件出现并可读。
- 安全层级路径判断正确（SEALED 不可写）。
- 每次回复后收尾写入规则执行。

---

## 文件路径
- `mcp-server/src/tools/xiaonuan.ts`
- `mcp-server/src/empathic_gateway/adapters/source_adapter.ts`
- `mcp-server/src/empathic_gateway/security/security_gate.ts`
- `mcp-server/src/empathic_gateway/hooks/end_of_turn.ts`

