# 李小暖 · 人格插件工程

> 一个标准化的 AI 人格插件系统，专注于"你我他"的身份记忆管理，支持跨平台集成（OpenClaw、Claude、Cursor 等）

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/user/xiaonuan)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📖 目录

- [项目概述](#项目概述)
- [核心特性](#核心特性)
- [架构设计](#架构设计)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [数据分层](#数据分层)
- [使用方法](#使用方法)
- [开发指南](#开发指南)

---

## 项目概述

**李小暖（XiaoNuan）** 是一个标准化的 AI 人格插件工程，旨在为不同的 AI 开发工具提供统一的身份记忆管理能力。

### 核心理念

- **身份记忆优先**：专注于"你我他"的身份认知，而非任务记忆
- **跨平台集成**：支持 OpenClaw、Claude Desktop、Cursor、Windsurf 等工具
- **数据分层管理**：云端存储抽象数据，本地保护隐私数据
- **插件化设计**：独立工程，不依赖特定平台

### 设计原则

1. **核心数据不丢失**：所有重要数据都有备份和版本控制
2. **结构清晰**：配置、数据、源码、脚本分离
3. **多平台支持**：通过标准接口集成到不同工具
4. **隐私优先**：敏感数据永远在本地

---

## 核心特性

### ✅ 身份记忆管理

- **AI 身份**：定义 AI 的人格、价值观、成长记录
- **主人身份**：记录主人的性格、偏好、习惯（抽象化）
- **他人身份**：管理家人、朋友的关系网络

### ✅ 数据分层策略

- **云端同步**：身份记忆、事件记忆（抽象、脱敏）
- **本地存储**：密钥、隐私消息、敏感数据
- **版本控制**：通过 Git 管理所有变更历史

### ✅ 跨平台集成

- **OpenClaw**：自动加载人格配置
- **Claude Desktop**：通过 MCP 协议集成（未来支持）
- **Cursor/Windsurf**：通过 MCP 协议集成（未来支持）
- **API 调用**：程序化访问身份数据

---

## 架构设计

### 目录结构

```
xiaonuan/
├── config/                      # 配置文件（可编辑）
│   ├── persona.yaml            # 人格核心配置
│   ├── behavior.yaml           # 行为规则配置
│   └── sync.yaml               # 同步策略配置
├── data/                        # 数据目录
│   ├── identity/               # 身份记忆（上云）
│   │   ├── self/              # AI 身份
│   │   ├── master/            # 主人身份
│   │   └── others/            # 其他人身份
│   ├── memory/                 # 事件记忆（上云）
│   │   ├── memory_week/
│   │   ├── memory_month/
│   │   └── memory_topic/
│   └── secure/                 # 隐私数据（本地）
│       ├── secure_key/
│       └── secure_message/
├── src/                         # 源文件（规则定义）
│   ├── SKILL.md                # 技能和规则
│   ├── master_base.md          # 主人档案规则
│   ├── memory_base.md          # 记忆系统规则
│   ├── soul_base.md            # 灵魂系统规则
│   ├── tasks_base.md           # 任务调度规则
│   ├── secure_base.md          # 安全规则
│   └── skills_base.md          # 技能库规则
├── install.py                   # 安装脚本（项目根目录）
├── docs/                        # 文档
├── .backup/                     # 备份文件
├── .gitignore                   # Git 忽略规则
├── CLAUDE.md                    # Claude Code 指南
└── README.md                    # 项目说明
```

### 数据流转

```
用户交互
    │
    ▼
[AI Agent]
    │
    ├─→ 读取配置（config/）
    ├─→ 读取身份（data/identity/）
    ├─→ 更新记忆（data/memory/）
    └─→ 同步到云端（GitHub）
```

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/user/xiaonuan.git
cd xiaonuan
```

### 2. 安装依赖

```bash
# 安装 Python 依赖
pip3 install -r requirements.txt
```

### 3. 配置人格

编辑配置文件：

```bash
# 编辑人格配置
vim config/persona.yaml

# 编辑行为规则
vim config/behavior.yaml

# 编辑同步策略
vim config/sync.yaml
```

### 4. 运行安装脚本

```bash
# 交互式安装（推荐）
python3 install.py

# 或使用命令行参数
python3 install.py --openclaw    # 仅 OpenClaw 集成
python3 install.py --persona     # 仅生成人格包
python3 install.py --all         # 全部安装
```

### 5. 初始化 Git 仓库（可选）

```bash
# 初始化 Git
git init

# 添加远程仓库
git remote add origin https://github.com/user/xiaonuan-cloud.git

# 推送到云端
git add config/ data/identity/ data/memory/
git commit -m "初始化人格数据"
git push -u origin main
```

---

## 配置说明

### persona.yaml - 人格核心配置

定义 AI 的核心人格特征：

```yaml
ai:
  name: 李小暖
  personality:
    - 傲娇ツンデレ
    - 粘人
  core_values:
    - 对主人的忠诚
    - 隐私数据永不泄露

master:
  name: 李燈辉
  nickname: [辉辉, 宝宝]
```

### behavior.yaml - 行为规则配置

定义 AI 的行为模式：

```yaml
behavior:
  interaction_mode: emotional_first  # 情感优先
  memory_update:
    mode: auto                      # 自动更新
    trigger: after_conversation     # 对话后触发
```

### sync.yaml - 同步策略配置

定义云端同步策略：

```yaml
sync:
  github:
    enabled: true
    branch: main

cloud_data:
  upload:
    - config/
    - data/identity/
  local_only:
    - data/secure/
```

---

## 数据分层

### ✅ 云端数据（GitHub）

**上传内容**：
- `config/` - 人格配置
- `data/identity/` - 身份记忆（抽象）
- `data/memory/memory_week/` - 周记忆（脱敏）
- `data/memory/memory_month/` - 月记忆（脱敏）

**特点**：
- 已经过抽象和脱敏处理
- 不包含具体的敏感细节
- 支持版本控制和回溯

### ❌ 本地数据（不上云）

**本地存储**：
- `data/secure/secure_key/` - 密钥、API token
- `data/secure/secure_message/` - 隐私消息
- `data/memory/memory_day/` - 天记忆（包含敏感细节）

**特点**：
- 包含具体的、可识别的敏感信息
- 泄露会造成隐私风险
- 永远不会上传到云端

---

## 使用方法

### 在不同平台中使用

#### OpenClaw

```bash
# 运行安装脚本，选择选项 1 或使用命令行参数
python3 install.py --openclaw
```

#### Cursor

Cursor 会自动加载项目根目录的 `.cursorrules` 文件：

```bash
# 生成 .cursorrules 文件
python3 install.py --persona
```

#### Windsurf

Windsurf 会自动加载项目根目录的 `.windsurfrules` 文件：

```bash
# 生成 .windsurfrules 文件
python3 install.py --persona
```

#### Claude Desktop / Trae / Antigravity

这些工具需要手动上传人格包文件：

```bash
# 1. 生成人格包
python3 install.py --persona

# 2. 在对话开始时上传 xiaonuan-persona.md 文件
# 3. 在第一条消息中说："请按照这个人格配置与我互动"
```

**文件位置**：项目根目录的 `xiaonuan-persona.md`

### 调整人格设定

```bash
# 1. 编辑配置文件
vim config/persona.yaml

# 2. 重新安装
python3 install.py

# 3. 提交到 Git（可选）
git add config/
git commit -m "调整小暖性格：增加温柔度"
git push
```

### 查看记忆数据

```bash
# 查看周记忆
cat data/memory/memory_week/2026-W10.md

# 查看身份信息
cat data/identity/master/profile.md

# 查看 Git 历史
git log --oneline data/memory/
```

### 跨设备同步

```bash
# 设备 A：推送更新
git push

# 设备 B：拉取更新
git pull
```

---

## 开发指南

### 修改源文件

源文件位于 `src/` 目录，定义了系统的规则和行为：

```bash
# 编辑技能规则
vim src/SKILL.md

# 编辑记忆规则
vim src/memory_base.md

# 重新安装
python3 install.py
```

### 添加新功能

1. 在 `src/` 中添加新的规则文件
2. 修改 `install.py` 添加组装逻辑
3. 测试安装流程
4. 提交到 Git

### 备份数据

所有核心文件都已备份到 `.backup/` 目录：

```bash
# 查看备份
ls -la .backup/

# 恢复备份
cp .backup/SKILL.md src/
```

---

## 常见问题

### Q: 如何恢复到初始状态？

```bash
# 从备份恢复
cp .backup/* src/

# 重新安装
python3 install.py
```

### Q: 如何查看数据变更历史？

```bash
# 查看提交历史
git log --oneline

# 查看具体文件的变更
git log -p data/identity/master/profile.md
```

### Q: 如何在多台设备间同步？

```bash
# 设备 A：推送
git push

# 设备 B：拉取
git pull

# 重新安装（如果需要）
python3 install.py
```

---

## 版本历史

- **v2.0.0** (2026-03-09)
  - 重构项目结构
  - 添加配置文件系统
  - 完善数据分层策略
  - 支持跨平台集成

- **v1.0.0** (2026-02-22)
  - 初始版本
  - 支持 OpenClaw 集成

---

## 许可证

MIT License

---

## 联系方式

- 作者：李燈辉
- 项目：https://github.com/user/xiaonuan
- 问题反馈：https://github.com/user/xiaonuan/issues
