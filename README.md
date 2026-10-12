# 李小暖（XiaoNuan）

小暖人格与情绪交互工程，包含规则文档、MCP 服务和 Hermes 原生 Soul 插件。`mcp-server/` 是本项目的实现子模块。

## 当前入口

| 入口 | 用途 |
| --- | --- |
| `src/` | 7 份原始规则文档，运行代码读取，不在修复中改写 |
| `config/` | 人格包生成所用的 YAML 配置 |
| `install.py --persona` | 生成人格 Markdown 包及 Cursor、Windsurf 规则文件 |
| `install.py --mcp --no-run` | 安装并构建 MCP 服务 |
| `mcp-server/dist/index.js` | 客户端通过标准输入／输出启动的 MCP 服务 |
| `hermes-integration/` | 自动注入 PAD 上下文、回复后保存状态、衰减和每日模拟人格反思 |

规则文档是设计输入；实际启用的能力以调用入口为准。Hermes 通过原生插件接入情绪引擎，仅安装 Markdown 记忆技能不能自动启用这套流程。

## 构建与验证

需要 Node.js 18+、npm；Hermes 插件及完整回归检查需要 Python 3.9+ 和系统时区数据库。插件部署面向 Linux 的 systemd 用户服务。

```bash
cd mcp-server
npm ci
npm test
```

`npm test` 包括 TypeScript 构建、情绪案例、MCP 路径与隐私、生命周期、每日漂移、安装与维护入口检查。测试数据统一隔离在 `.tmp/soul-regression/`。

## Hermes 安装与更新

在运行 Hermes 的 Linux 主机上克隆本项目，执行上述构建与验证后，从项目根目录运行：

```bash
python3 hermes-integration/install.py
hermes plugins enable xiaonuan-soul
systemctl --user daemon-reload
systemctl --user enable --now xiaonuan-soul-decay.timer xiaonuan-soul-reflection.timer
systemctl --user start xiaonuan-soul-decay.service xiaonuan-soul-reflection.service
systemctl --user restart hermes-gateway.service
```

安装器默认使用 `HERMES_HOME`，未设置时使用 `~/.hermes`。可通过 `--home` 和 `--units` 指定安装目录和 systemd 用户单元目录。它记录实际 Node 与 Python 路径，每次创建独立运行副本，更新前备份已有插件和同名单元；不修改模型、认证、`config.yaml`、`SOUL.md` 或用户状态。安装命令本身不会启用插件、启动定时器或重启服务，后面的命令才执行这些动作。

已有 NAS 上的临时部署不会随本仓库改动自动更新。重复安装后需重新加载单元并重启 Hermes。systemd 用户会话退出后的运行时长由主机的用户服务配置决定。

检查状态：

```bash
hermes plugins list
systemctl --user status hermes-gateway.service xiaonuan-soul-decay.timer xiaonuan-soul-reflection.timer
systemctl --user list-timers xiaonuan-soul-reflection.timer
```

运行机制见 `hermes-integration/README.md`。接入接口依据 [Hermes 官方生命周期文档](https://github.com/NousResearch/hermes-agent/blob/38880bd2f1e90dbc9a1aeec03af62539ee64719a/website/docs/user-guide/features/hooks.md)。

## MCP 与人格包

MCP 客户端使用 `node` 启动本项目的 `mcp-server/dist/index.js` 绝对路径；不要把它当作网络监听服务。规则、数据和日志路径相对于项目根目录解析，不依赖客户端工作目录。

```bash
pip3 install -r requirements.txt
python3 install.py --persona
python3 install.py --mcp --no-run
```

MCP 的诊断日志不记录原始输入、下游回复或最终回复；网关默认将 JSONL 记忆摘要和轨迹中的原文移除。MCP 的 Markdown 记忆功能仍保存对话摘录，必须作为私有数据管理，不能据此认定已完成云端脱敏。Hermes Soul 运行链仅保存数值、模式与散列身份，不写原始对话。

## 文档与数据

- `AGENTS.md`：项目工程规则与验证入口。
- `ROADMAP.md`：当前进度、待办与验证记录。
- `hermes-integration/README.md`：Soul 参数、状态路径、定时器与停用方法。
- `docs/`：历史设计和实现计划，不能作为当前功能已启用的证据。

状态、日志、日记忆、密钥与运行数据应保留在本机；`.gitignore` 不会撤销已经被 Git 跟踪的数据。项目没有自动云端同步入口。
