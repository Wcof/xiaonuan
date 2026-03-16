# Empathic Gateway 调整方案 v2（结合 src/SKILL.md）

> 目的：整理当前问题并给出可执行调整方案，供其他 Agent 实施。
> 约束：所有“人格/认知/记忆/安全设定”以 `src/*.md` 为唯一来源（源码）。
> 新增依据：`src/SKILL.md` 的安全层级与对话收尾写入规则必须工程化落地。

---

## 一、问题清单（基于现状）

### 1. 人格可见但未挂载
- 现状：Gateway 未读取任何 `src/*.md`。
- 影响：人格设定无法驱动润色风格，用户修改 Markdown 也不会生效。

### 2. 主人认知/标签体系缺失
- 现状：没有“认知标签/关键信息摘要”的输出结构。
- 影响：用户无法查看 Agent 对主人的认知标签。

### 3. 记忆链双存储未落地
- 现状：Gateway 仅本地 JSONL 存储，未落到 `data/memory/*` 分层结构。
- 影响：缺乏云端/本地双存储、时间线组织与同步策略。

### 4. 安全存储与防御机制缺失
- 现状：未对 `secure_base.md` 定义的安全层级进行工程化落地。
- 影响：无法保证 Key/Vault 仅本地、不可外传的安全策略。

### 5. End-of-Turn 写入规则未落地
- 现状：未执行 `src/SKILL.md` 中的对话收尾写入协议（事实捕获/天记忆/任务同步/PAD 持久化）。
- 影响：记忆断裂、PAD 状态无法连续追踪、任务状态漂移。

---

## 二、调整目标（必须满足）

1. **人格可见且可改**：用户通过 `src/*.md` 修改人格，Gateway 自动生效。
2. **认知标签可见**：用户可查看 Agent 对自己的标签与摘要。
3. **记忆双存储**：本地 + 云端分层，包含时间节点与连续性。
4. **安全机制健全**：Key/Vault 永不上云，本地存储可控。
5. **收尾写入必执行**：每次回复后都执行 PAD 与记忆的收尾持久化。

---

## 三、调整方案（执行清单）

### A. 引入 `SourceAdapter`（读取 src/ 设定）
- 新增适配器层：只读取 `src/*.md` 并结构化输出。
- 输出结构包含：
  - `persona_profile`（人格特征、语气模板）
  - `master_profile`（主人标签、关键信息摘要）
  - `memory_policy`（记忆规则）
  - `security_policy`（安全分级）

### B. 人格挂载到 Gateway
- Gateway 在润色前读取 `persona_profile`。
- `rewriteResponse()` 必须接收 persona 风格参数。
- 用户修改 `src/soul_base.md` 后，润色风格动态生效。

### C. 认知标签体系
- 从 `src/master_base.md` 解析出 `master_profile` 标签与摘要。
- 在 `GatewayMeta` 中新增：
  - `cognition_labels`（标签列表）
  - `master_summary`（摘要）
- 对外接口增加可见查询。

### D. 记忆双存储与时间线
- 本地：维持 JSONL/SQLite。
- 云端：写入 `data/memory/memory_week|month|topic`（摘要脱敏）。
- 每条记录必须包含：
  - `timestamp`
  - `time_bucket`（周/月/主题）
  - `summary`

### E. 安全机制落地
- 从 `src/secure_base.md` 解析安全层级（Level 1/2/3）。
- 对 `secure_key` 与 `secure_message`：
  - 明确只写本地，不进入云端路径。
  - 对外接口一律禁止输出。
- 强制执行 `src/SKILL.md` 的封印层附加规则（拒绝输出并记录告警）。

### F. End-of-Turn 写入协议落地
- 每次向用户输出后，必须执行收尾写入流程：
  - 事实捕获（写入 master_basic/master_health）
  - 天记忆更新（memory_day）
  - 任务状态同步（task_process/task_log）
  - PAD 持久化（soul_variable/state_vector.json）
- 关键写入需读回验证（state_vector.json、天记忆、任务 PCB、健康数据）。

---

## 四、建议实施顺序

1. SourceAdapter
2. 人格挂载与认知标签输出
3. 记忆双存储与时间线
4. 安全机制落实
5. End-of-Turn 写入协议落地

---

## 五、参考路径
- 设定源码（唯一来源）：
  - `src/soul_base.md`
  - `src/master_base.md`
  - `src/memory_base.md`
  - `src/secure_base.md`
  - `src/SKILL.md`
- Gateway 模块：
  - `mcp-server/src/empathic_gateway/`
