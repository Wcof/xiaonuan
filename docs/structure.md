# 项目结构说明

本文档详细说明了李小暖人格插件工程的目录结构和文件组织方式。

## 目录结构

```
xiaonuan/
├── .backup/                     # 备份目录（自动生成）
│   └── *.md, *.py              # 所有核心文件的备份
├── .git/                        # Git 版本控制
├── config/                      # 配置文件（用户可编辑）
│   ├── persona.yaml            # 人格核心配置
│   ├── behavior.yaml           # 行为规则配置
│   └── sync.yaml               # 同步策略配置
├── data/                        # 数据目录
│   ├── identity/               # 身份记忆（上云）
│   │   ├── self/              # AI 身份
│   │   │   ├── profile.md     # 基础信息
│   │   │   ├── values.md      # 核心价值观
│   │   │   └── growth.md      # 成长记录
│   │   ├── master/            # 主人身份（抽象）
│   │   │   ├── profile.md     # 基础信息
│   │   │   ├── personality.md # 性格特征
│   │   │   └── preferences.md # 偏好习惯
│   │   └── others/            # 其他人身份
│   │       ├── family/        # 家人
│   │       └── friends/       # 朋友
│   ├── memory/                 # 事件记忆
│   │   ├── memory_day/        # 天记忆（本地，不上云）
│   │   ├── memory_week/       # 周记忆（上云）
│   │   ├── memory_month/      # 月记忆（上云）
│   │   └── memory_topic/      # Topic 记忆（上云）
│   │       ├── staging/       # 候选池
│   │       ├── active/        # 激活中
│   │       └── archived/      # 已归档
│   └── secure/                 # 隐私数据（本地，不上云）
│       ├── secure_key/        # 密钥凭据
│       └── secure_message/    # 隐私消息
├── src/                         # 源文件（规则定义）
│   ├── SKILL.md                # 技能和规则定义
│   ├── master_base.md          # 主人档案规则
│   ├── memory_base.md          # 记忆系统规则
│   ├── soul_base.md            # 灵魂系统规则
│   ├── tasks_base.md           # 任务调度规则
│   ├── secure_base.md          # 安全规则
│   └── skills_base.md          # 技能库规则
├── scripts/                     # 脚本工具
│   └── install.py              # 安装脚本（原 Xiaonuan.py）
├── docs/                        # 文档目录
│   └── structure.md            # 本文件
├── .gitignore                   # Git 忽略规则
├── CLAUDE.md                    # Claude Code 开发指南
└── README.md                    # 项目说明文档
```

## 目录说明

### config/ - 配置文件

**用途**：存放用户可编辑的配置文件，定义人格、行为和同步策略。

**文件**：
- `persona.yaml` - 定义 AI 的核心人格特征、价值观、主人信息
- `behavior.yaml` - 定义交互模式、记忆更新规则、安全层级
- `sync.yaml` - 定义云端同步策略、数据分层规则

**特点**：
- ✅ 上传到 Git（云端同步）
- ✅ 用户可以直接编辑
- ✅ 修改后需要重新运行安装脚本

### data/ - 数据目录

**用途**：存放运行时数据，包括身份记忆、事件记忆和隐私数据。

#### data/identity/ - 身份记忆（上云）

**用途**：存储"你我他"的身份信息（抽象、脱敏）。

**子目录**：
- `self/` - AI 自己的身份（名字、性格、成长记录）
- `master/` - 主人的身份（基础信息、性格、偏好）
- `others/` - 其他人的身份（家人、朋友）

**特点**：
- ✅ 上传到 Git（云端同步）
- ✅ 已经过抽象和脱敏处理
- ✅ 跨设备一致

#### data/memory/ - 事件记忆

**用途**：存储事件记忆（发生了什么）。

**子目录**：
- `memory_day/` - 天记忆（本地，包含敏感细节）
- `memory_week/` - 周记忆（上云，已压缩）
- `memory_month/` - 月记忆（上云，已抽象）
- `memory_topic/` - Topic 记忆（上云，已归纳）

**特点**：
- ⚠️ 天记忆本地存储（不上云）
- ✅ 周/月/Topic 记忆上云（已脱敏）

#### data/secure/ - 隐私数据（本地）

**用途**：存储敏感数据，永远不上云。

**子目录**：
- `secure_key/` - 密钥、API token、凭据
- `secure_message/` - 隐私消息、私密日记

**特点**：
- ❌ 永远不上传到 Git
- ❌ 在 .gitignore 中排除
- ✅ 完全本地存储

### src/ - 源文件

**用途**：存放系统规则定义文件（原始 markdown 文件）。

**文件**：
- `SKILL.md` - 技能、安全规则、启动流程、定时任务
- `master_base.md` - 主人档案规则与初始化
- `memory_base.md` - 记忆系统规则
- `soul_base.md` - 灵魂系统（情感计算引擎）
- `tasks_base.md` - 任务调度系统规则
- `secure_base.md` - 安全规则
- `skills_base.md` - 技能库规则

**特点**：
- ✅ 这些是"源码"，永远不修改
- ✅ 安装脚本读取这些文件并组装
- ✅ 上传到 Git（版本控制）

### scripts/ - 脚本工具

**用途**：存放安装、同步等工具脚本。

**文件**：
- `install.py` - 安装脚本（原 Xiaonuan.py）

**特点**：
- ✅ 上传到 Git
- ✅ 可执行脚本

### .backup/ - 备份目录

**用途**：自动备份所有核心文件。

**特点**：
- ❌ 不上传到 Git（在 .gitignore 中排除）
- ✅ 本地保留，用于恢复

## 数据流转

```
用户编辑配置
    │
    ▼
config/*.yaml
    │
    ▼
运行 scripts/install.py
    │
    ├─→ 读取 src/*.md（源文件）
    ├─→ 读取 config/*.yaml（配置）
    ├─→ 组装生成 OpenClaw 文件
    └─→ 写入 OpenClaw workspace
    │
    ▼
OpenClaw 运行
    │
    ├─→ 读取 data/identity/（身份）
    ├─→ 更新 data/memory/（记忆）
    └─→ 写入 data/secure/（隐私）
    │
    ▼
同步到 Git
    │
    ├─→ 上传 config/（配置）
    ├─→ 上传 data/identity/（身份）
    ├─→ 上传 data/memory/memory_week/（周记忆）
    └─→ 排除 data/secure/（隐私）
```

## 文件权限

### 可编辑文件

用户可以直接编辑：
- `config/*.yaml` - 配置文件
- `data/identity/**/*.md` - 身份信息
- `data/memory/**/*.md` - 记忆数据

### 只读文件

不建议直接编辑：
- `src/*.md` - 源文件（通过安装脚本使用）
- `.backup/*` - 备份文件（只读）

### 自动生成文件

由系统自动生成：
- `data/memory/memory_day/*.md` - 天记忆
- `data/memory/memory_week/*.md` - 周记忆
- `data/memory/memory_month/*.md` - 月记忆

## Git 管理

### 上传到 Git

```
config/
data/identity/
data/memory/memory_week/
data/memory/memory_month/
data/memory/memory_topic/
src/
scripts/
docs/
.gitignore
CLAUDE.md
README.md
```

### 不上传到 Git

```
.backup/
data/secure/
data/memory/memory_day/
*.log
.DS_Store
```

## 维护建议

### 定期备份

```bash
# 手动备份
cp -r data/ .backup/data-$(date +%Y%m%d)/

# 提交到 Git
git add config/ data/identity/ data/memory/
git commit -m "备份数据"
git push
```

### 清理旧数据

```bash
# 清理 30 天前的天记忆
find data/memory/memory_day/ -name "*.md" -mtime +30 -delete

# 清理日志文件
rm -f *.log
```

### 恢复数据

```bash
# 从备份恢复
cp .backup/SKILL.md src/

# 从 Git 恢复
git checkout HEAD -- config/persona.yaml
```
