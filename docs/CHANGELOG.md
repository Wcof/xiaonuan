# 变更日志

本文档记录李小暖人格插件工程的版本变更历史。

---

## [2.0.0] - 2026-03-09

### 重大变更

#### 🏗️ 项目结构重构

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
├── config/          # 配置文件（可编辑）
├── data/            # 数据目录（运行时）
├── src/             # 源文件（规则定义）
├── scripts/         # 脚本工具
├── docs/            # 文档
└── .backup/         # 备份文件
```

#### ✨ 新增功能

1. **配置文件系统**
   - `config/persona.yaml` - 人格核心配置
   - `config/behavior.yaml` - 行为规则配置
   - `config/sync.yaml` - 同步策略配置

2. **数据分层管理**
   - `data/identity/` - 身份记忆（上云）
   - `data/memory/` - 事件记忆（部分上云）
   - `data/secure/` - 隐私数据（本地）

3. **完善的文档系统**
   - `README.md` - 项目说明（重写）
   - `docs/structure.md` - 项目结构说明
   - `docs/usage.md` - 使用指南
   - `CLAUDE.md` - Claude Code 开发指南

4. **Git 管理**
   - `.gitignore` - 排除隐私数据
   - 自动备份到 `.backup/`

#### 🔄 变更

1. **文件移动**
   - `Xiaonuan.py` → `scripts/install.py`
   - `*.md` 源文件 → `src/`

2. **数据组织**
   - 身份记忆独立到 `data/identity/`
   - 隐私数据独立到 `data/secure/`
   - 记忆数据独立到 `data/memory/`

3. **配置方式**
   - 从硬编码 → YAML 配置文件
   - 支持用户直接编辑配置

#### 📝 文档改进

1. **README.md**
   - 添加完整的项目概述
   - 添加快速开始指南
   - 添加配置说明
   - 添加数据分层策略
   - 添加常见问题

2. **新增文档**
   - `docs/structure.md` - 详细的目录结构说明
   - `docs/usage.md` - 完整的使用指南
   - `docs/CHANGELOG.md` - 本文件

#### 🔒 安全改进

1. **数据分层**
   - 明确定义哪些数据上云
   - 明确定义哪些数据本地
   - `.gitignore` 排除敏感数据

2. **备份机制**
   - 自动备份所有核心文件到 `.backup/`
   - 备份不上传到 Git

#### 🎯 设计原则

1. **核心数据不丢失**
   - 所有核心文件都有备份
   - Git 版本控制

2. **结构清晰**
   - 配置、数据、源码、脚本分离
   - 目录结构清晰

3. **多平台支持**
   - 为未来的 MCP 集成做准备
   - 标准化的配置格式

4. **隐私优先**
   - 敏感数据永远在本地
   - 云端只存储抽象数据

---

## [1.0.0] - 2026-02-22

### 初始版本

- 基础的 OpenClaw 安装脚本
- 7 个源 markdown 文件
- 支持 OpenClaw 集成

---

## 升级指南

### 从 v1.0.0 升级到 v2.0.0

1. **备份数据**
   ```bash
   cp -r xiaonuan xiaonuan-v1-backup
   ```

2. **拉取最新代码**
   ```bash
   cd xiaonuan
   git pull
   ```

3. **查看新结构**
   ```bash
   ls -la
   # 你会看到新的目录结构
   ```

4. **配置人格**
   ```bash
   # 编辑配置文件
   vim config/persona.yaml
   vim config/behavior.yaml
   ```

5. **重新安装**
   ```bash
   python3 scripts/install.py
   ```

6. **初始化 Git（可选）**
   ```bash
   git remote add origin https://github.com/user/xiaonuan-cloud.git
   git push -u origin main
   ```

---

## 兼容性说明

### v2.0.0 兼容性

- ✅ 向后兼容 v1.0.0 的源文件
- ✅ 安装脚本保持相同的命令行参数
- ✅ OpenClaw 集成方式不变
- ⚠️ 目录结构变化，需要重新安装

### 破坏性变更

1. **目录结构**
   - 源文件从根目录移动到 `src/`
   - 安装脚本从 `Xiaonuan.py` 改名为 `scripts/install.py`

2. **配置方式**
   - 新增 YAML 配置文件
   - 需要手动配置 `config/*.yaml`

---

## 未来计划

### v2.1.0（计划中）

- [ ] MCP Server 实现
- [ ] Claude Desktop 集成
- [ ] Cursor/Windsurf 集成

### v2.2.0（计划中）

- [ ] Web UI 配置界面
- [ ] 记忆可视化
- [ ] 自动同步脚本

### v3.0.0（计划中）

- [ ] Notion 集成（可选）
- [ ] 多语言支持
- [ ] 插件市场

---

## 贡献指南

如果你想为本项目做出贡献：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 许可证

MIT License

---

## 联系方式

- 作者：李燈辉
- 项目：https://github.com/user/xiaonuan
- 问题反馈：https://github.com/user/xiaonuan/issues
