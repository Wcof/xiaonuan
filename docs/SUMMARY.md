# 项目文档导航

## 项目概述

**xiaonuan（李小暖）** 是一个单一的完整 AI 伴侣系统，包含多个子模块。

---

## 文档分类

### 主项目入口文档

| 文档 | 说明 |
|------|------|
| [README.md](../README.md) | 项目主入口，包含概述、快速开始、使用说明 |
| [CLAUDE.md](../CLAUDE.md) | Claude Code 开发指南 |
| [docs/CHANGELOG.md](./CHANGELOG.md) | 版本变更历史 |

### 开发文档

| 文档 | 说明 |
|------|------|
| [docs/IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Empathic Gateway 实现计划 |
| [docs/gateway_plan.md](./gateway_plan.md) | Gateway 规划文档 |
| [docs/agent_empathic_gateway.md](./agent_empathic_gateway.md) | Agent 规范 |
| [docs/empathic_gateway_adjustment_plan.md](./empathic_gateway_adjustment_plan.md) | 改造方案 v1 |
| [docs/empathic_gateway_adjustment_plan_src.md](./empathic_gateway_adjustment_plan_src.md) | 改造方案 v2 |

### 模块文档

| 文档 | 说明 |
|------|------|
| [mcp-server/README.md](../mcp-server/README.md) | Empathic Gateway 模块说明（子模块） |

---

## 快速导航

- **安装使用** → [README.md](../README.md#快速开始)
- **开发指南** → [CLAUDE.md](../CLAUDE.md)
- **情感网关** → [mcp-server/README.md](../mcp-server/README.md)
- **版本历史** → [docs/CHANGELOG.md](./CHANGELOG.md)

## 改造目标

根据用户需求，对李小暖人格插件工程进行重构，实现以下目标：

1. ✅ **核心数据不丢失** - 所有原始文件已备份到 `.backup/`
2. ✅ **结构清晰便于开发** - 配置、数据、源码、脚本分离
3. ✅ **支持多平台集成** - 为 OpenClaw、MCP 等平台做好准备
4. ✅ **完善文档** - README、使用指南、结构说明、变更日志

---

## 改造内容

### 1. 目录结构重构

**之前**：
```
xiaonuan/
├── SKILL.md
├── master_base.md
├── memory_base.md
├── soul_base.md
├── tasks_base.md
├── secure_base.md
├── skills_base.md
└── Xiaonuan.py
```

**现在**：
```
xiaonuan/
├── .backup/              # 备份目录（所有原始文件）
├── config/               # 配置文件（用户可编辑）
│   ├── persona.yaml     # 人格核心配置
│   ├── behavior.yaml    # 行为规则配置
│   └── sync.yaml        # 同步策略配置
├── data/                 # 数据目录
│   ├── identity/        # 身份记忆（上云）
│   │   ├── self/       # AI 身份
│   │   ├── master/     # 主人身份
│   │   └── others/     # 其他人身份
│   ├── memory/          # 事件记忆
│   │   ├── memory_day/
│   │   ├── memory_week/
│   │   ├── memory_month/
│   │   └── memory_topic/
│   └── secure/          # 隐私数据（本地）
│       ├── secure_key/
│       └── secure_message/
├── src/                  # 源文件（规则定义）
│   ├── SKILL.md
│   ├── master_base.md
│   ├── memory_base.md
│   ├── soul_base.md
│   ├── tasks_base.md
│   ├── secure_base.md
│   └── skills_base.md
├── scripts/              # 脚本工具
│   └── install.py       # 安装脚本（原 Xiaonuan.py）
├── docs/                 # 文档
│   ├── structure.md     # 项目结构说明
│   ├── usage.md         # 使用指南
│   ├── CHANGELOG.md     # 变更日志
│   └── SUMMARY.md       # 本文件
├── .gitignore            # Git 忽略规则
├── CLAUDE.md             # Claude Code 开发指南
└── README.md             # 项目说明（重写）
```

### 2. 配置文件系统

创建了 3 个 YAML 配置文件，用户可以直接编辑：

#### config/persona.yaml
- AI 的核心人格特征
- 主人的基础信息
- 交互风格定义

#### config/behavior.yaml
- 交互模式（情感优先）
- 记忆更新规则
- 同步策略
- 行为优先级
- 安全层级定义

#### config/sync.yaml
- GitHub 同步配置
- Notion 集成配置（可选）
- 数据分层规则
- Git 忽略规则

### 3. 数据分层策略

明确定义了哪些数据上云，哪些数据本地：

**上云数据（GitHub）**：
- `config/` - 配置文件
- `data/identity/` - 身份记忆（抽象）
- `data/memory/memory_week/` - 周记忆（脱敏）
- `data/memory/memory_month/` - 月记忆（脱敏）
- `data/memory/memory_topic/` - Topic 记忆（归纳）

**本地数据（不上云）**：
- `data/secure/` - 隐私数据
- `data/memory/memory_day/` - 天记忆（包含敏感细节）
- `.backup/` - 备份文件

### 4. 文档系统

创建了完整的文档系统：

#### README.md（重写）
- 项目概述
- 核心特性
- 架构设计
- 快速开始
- 配置说明
- 数据分层
- 使用方法
- 开发指南
- 常见问题

#### docs/structure.md
- 详细的目录结构说明
- 每个目录的用途
- 文件权限说明
- 数据流转机制
- Git 管理策略
- 维护建议

#### docs/usage.md
- 快速开始指南
- 配置人格方法
- 数据管理方法
- 云端同步方法
- 跨平台集成方法
- 常见问题解答
- 高级用法

#### docs/CHANGELOG.md
- 版本变更历史
- 升级指南
- 兼容性说明
- 未来计划

#### docs/gateway_plan.md
- 前置 Gateway / Master Gateway 规划
- 关键约束与策略
- 调整方案与测试 SOP

#### CLAUDE.md（保留）
- Claude Code 开发指南
- 常用命令
- 高级架构
- 关键代码位置
- 修改工作流

### 5. Git 管理

创建了 `.gitignore` 文件，排除敏感数据：
- `data/secure/` - 隐私数据
- `data/memory/memory_day/` - 天记忆
- `.backup/` - 备份文件
- `*.log` - 日志文件
- `.DS_Store` - 系统文件

### 6. 备份机制

所有原始文件已备份到 `.backup/` 目录：
- SKILL.md
- master_base.md
- memory_base.md
- soul_base.md
- tasks_base.md
- secure_base.md
- skills_base.md
- Xiaonuan.py
- README.md
- CLAUDE.md

---

## 改造亮点

### 1. 配置驱动
- 从硬编码 → YAML 配置文件
- 用户可以直接编辑配置
- 修改后重新运行安装脚本即可生效

### 2. 数据分层
- 明确定义云端数据和本地数据
- 隐私数据永远不上云
- 云端数据已经过抽象和脱敏

### 3. 多平台支持
- 当前支持 OpenClaw
- 为未来的 MCP 集成做好准备
- 标准化的配置格式

### 4. 完善的文档
- README 重写，内容完整
- 新增 3 个详细文档
- 覆盖所有使用场景

### 5. 安全保障
- 所有核心文件已备份
- Git 版本控制
- 敏感数据排除在外

---

## 使用方法

### 1. 查看项目结构
```bash
ls -la
```

### 2. 编辑配置
```bash
vim config/persona.yaml
vim config/behavior.yaml
vim config/sync.yaml
```

### 3. 安装到 OpenClaw
```bash
python3 scripts/install.py
```

### 4. 初始化 Git（可选）
```bash
git init
git remote add origin https://github.com/user/xiaonuan-cloud.git
git add config/ data/identity/ data/memory/
git commit -m "初始化人格数据"
git push -u origin main
```

---

## 下一步建议

### 短期（v2.1.0）
1. 实现 MCP Server
2. 支持 Claude Desktop 集成
3. 支持 Cursor/Windsurf 集成

### 中期（v2.2.0）
1. 开发 Web UI 配置界面
2. 实现记忆可视化
3. 创建自动同步脚本

### 长期（v3.0.0）
1. Notion 集成（可选）
2. 多语言支持
3. 插件市场

---

## 注意事项

### 1. 数据安全
- 敏感数据永远在本地
- 不要将 `data/secure/` 上传到 Git
- 定期备份本地数据

### 2. 配置管理
- 修改配置后需要重新安装
- 配置文件使用 YAML 格式
- 注意 YAML 的缩进规则

### 3. Git 同步
- 只同步抽象和脱敏的数据
- 检查 `.gitignore` 是否正确
- 定期推送到云端

### 4. 版本控制
- 使用 Git 管理所有变更
- 提交前检查是否包含敏感数据
- 编写清晰的提交信息

---

## 文件清单

### 配置文件
- [x] config/persona.yaml
- [x] config/behavior.yaml
- [x] config/sync.yaml

### 文档文件
- [x] README.md（重写）
- [x] docs/structure.md
- [x] docs/usage.md
- [x] docs/CHANGELOG.md
- [x] docs/SUMMARY.md
- [x] docs/gateway_plan.md
- [x] CLAUDE.md（保留）

### 源文件
- [x] src/SKILL.md
- [x] src/master_base.md
- [x] src/memory_base.md
- [x] src/soul_base.md
- [x] src/tasks_base.md
- [x] src/secure_base.md
- [x] src/skills_base.md

### 脚本文件
- [x] scripts/install.py

### 其他文件
- [x] .gitignore
- [x] .backup/（所有原始文件）

---

## 改造完成

✅ 所有改造任务已完成
✅ 核心数据已备份
✅ 结构清晰便于开发
✅ 支持多平台集成
✅ 文档完善

项目已准备好进行下一步开发（MCP Server 实现）。
