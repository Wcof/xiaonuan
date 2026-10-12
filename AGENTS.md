# AGENTS.md

## 项目与目录

xiaonuan 是小暖人格与情绪交互工程。`mcp-server/` 是实现子模块，不是独立项目。

- `src/`：7 份原始 Markdown 规则，修复运行代码时保持只读；它们不是所有设计均已实现的证明。
- `config/`：人格包生成用的 YAML 配置。
- `mcp-server/src/`：MCP 工具、资源与共享情绪算法。
- `hermes-integration/`：Hermes 生命周期插件、安装器、维护程序与回归检查。
- `data/`、`mcp-server/gateway_data/`、`logs/`：运行数据，不能以测试替换或清空。
- `docs/`：历史设计资料。当前使用入口以 README.md 为准。

进入项目先读本文件和 ROADMAP.md；安装、使用与功能任务同时读 README.md。CLAUDE.md 仅引用本文件。

## 实现边界

- Hermes 复用 TypeScript 情绪算法，通过 pre_llm_call 与 post_llm_call 接入；不能把安装规则文档当作运行插件。
- 纯任务保持直接表达；情绪只影响外围语气，不得破坏事实、代码和命令，不能以冷落、拒绝互动、攻击或强制要求表现人格。
- PAD 坐标以代码为准：P 为 [-1, 1]，A、D 为 [0, 1]。关键词结果是估计，不是心理诊断。
- 固定人格基准保持只读；漂移写在每用户状态的 personality_drift 中。
- Hermes 状态使用散列身份隔离、文件锁和原子替换；损坏状态必须报错，不得静默重置。
- 诊断日志不写原始对话。Hermes 数值轨迹与 MCP 私有 Markdown 记忆是不同数据流，不得宣称后者已经脱敏。
- 共享路径来自 mcp-server/src/utils.ts；不能依赖 process.cwd() 定位项目数据。

## 修改与验证

先搜索调用方并复现具体错误，再做最小修复；不得覆盖用户运行数据。跨模块修复覆盖实际调用链与失败路径。

标准检查：在 mcp-server/ 运行 npm ci，然后 npm test；提交交付前运行 git diff --check。无独立 lint 配置，TypeScript 检查由构建完成。

回归数据仅放入 .tmp/soul-regression/；验证不操作真实 Hermes home、不启用系统服务，也不向微信发送消息。部署安装与服务启用是不同动作，除非任务授权部署，否则只交付本地修复。

完成开发后同步 ROADMAP.md；影响安装或使用事实时同步 README.md。7 份源规则不为文档维护而改写。
