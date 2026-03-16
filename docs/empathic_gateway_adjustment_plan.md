# Empathic Gateway 改造问题整理与修改方案（参考 install.py）

## 目标
- 为其他 Agent 提供结构化问题清单与可执行的修改方案。
- 参考当前安装脚本 `install.py` 的人格/主人配置来源，确保 Gateway 能与现有配置体系兼容。
- 不改变“本地 MCP only、不读取业务数据”的底线。

---

## 一、现状问题清单（按优先级）

### P0 必修问题
1. **`processInput` 不产出可用的 `final_response`**
   - 现状：`final_response` 为空，需要上层再调用 `processOutput`。
   - 风险：集成时容易漏掉调用链，导致用户端无输出。

2. **记忆持久化缺失**
   - 现状：`storage_manager.ts` 仅内存存储，进程重启后数据丢失。
   - 与“关键事件记忆”目标不一致。

3. **隐私边界可能被破坏**
   - 现状：`MemoryCandidate` 中保存了 `raw_query`（截断版本）。
   - 风险：若输入包含业务信息，等于把业务内容写入记忆。

### P1 高风险问题
4. **极端情绪关键词误触发**
   - 现状：`suicidal` 关键词包含单字“死”。
   - 风险：大量无关语句误判（如“死机”“死循环”）。

5. **改写强度逻辑重复**
   - 现状：`emotion/rewrite_intensity.ts` 与 `rewriting/strategy.ts` 同时存在类似逻辑。
   - 风险：未来参数不一致，导致策略冲突。

### P2 结构协作问题
6. **Soul 体系无法直接挂载**
   - 现状：Soul 仍为 `.md` 规则文本，未结构化。
   - 结果：Gateway 不能基于灵魂状态进行动态润色。

---

## 二、与现有安装脚本的关系（install.py）

`install.py` 当前生成与分发的内容：
- 从 `config/persona.yaml` 和 `config/behavior.yaml` 生成 `xiaonuan-persona.md`。
- 同步写入 `.cursorrules` / `.windsurfrules`。
- 包含 **AI 身份、主人身份、行为规则与优先级**。

这意味着 Gateway 的人格与情感策略需要对齐：
- **人格基线**：来自 `config/persona.yaml`。
- **行为规则**：来自 `config/behavior.yaml`。
- **主人认知**：来自 `config/persona.yaml` 中 master 段。

当前 Gateway 仅依赖内部策略，不读取上述配置，导致与“核心人格/主人认知”脱节。

---

## 三、修改方案（建议）

### 方案 A（MVP 必做）
1. **补齐完整链路输出**
   - 在 Gateway 对外接口中统一暴露 `process(raw_query, response)` 一步式调用。
   - 内部串联 `processInput` + 下游响应 + `processOutput`。

2. **持久化存储升级**
   - 存储层新增 SQLite（或 JSONL）实现。
   - 记忆与干预日志可持久化。

3. **隐私保护改造**
   - 记忆写入不保存 `raw_query` 原文，改为摘要或脱敏。
   - 明确“关键事件摘要”格式，避免业务细节进入记忆。

4. **修正自伤关键词**
   - 将单字“死”从关键词中移除。
   - 改为多词组合（如“想死”“不想活”）。

5. **统一改写强度逻辑**
   - 将 `getRewriteIntensity` 的计算逻辑统一到单一模块（建议 `emotion/rewrite_intensity.ts`）。
   - `rewriting/strategy.ts` 仅引用该模块。

### 方案 B（对齐人格体系，推荐）
1. **引入 SoulAdapter（结构化桥接）**
   - 读取 `config/persona.yaml` 与 `config/behavior.yaml`，生成结构化配置：
     - `tone_templates`
     - `emotion_baseline`
     - `intervention_policies`
     - `persona_constraints`
   - Gateway 在润色时调用该配置。

2. **与 install.py 生成内容一致性**
   - 确保 `xiaonuan-persona.md` 的关键信息在 Gateway 策略中可见。
   - 行为优先级可直接映射为干预策略权重。

3. **记忆与人格耦合**
   - 记忆写入只记录“事件摘要 + 情感轨迹”。
   - 可选地更新 `soul` 的情感状态基线，但必须可控。

---

## 四、测试 SOP（验证修改方案）

1. **链路完整性**
- 输入 raw_query + 下游 response → 输出 final_response 不为空。

2. **记忆持久化**
- 重启服务后记忆仍存在。

3. **隐私边界**
- raw_query 不进入持久化记忆（只留摘要）。

4. **情感触发准确性**
- “死机/死循环”不触发危机；
- “不想活/想死”触发安全协议。

5. **人格一致性**
- `config/persona.yaml` 修改后，润色风格随之改变。

---

## 五、建议落地顺序

1. 方案 A（MVP 必做）全部完成。
2. 方案 B（人格对齐）优先引入 SoulAdapter。
3. 再考虑外部适配器扩展（MCP/HTTP/插件）。

---

## 附：参考路径
- 安装脚本：`/Users/ldh/Downloads/project/xiaonuan/install.py`
- 人格配置：`/Users/ldh/Downloads/project/xiaonuan/config/persona.yaml`
- 行为配置：`/Users/ldh/Downloads/project/xiaonuan/config/behavior.yaml`
- Empathic Gateway：`/Users/ldh/Downloads/project/xiaonuan/mcp-server/src/empathic_gateway/`

