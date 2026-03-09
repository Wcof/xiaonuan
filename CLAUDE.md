# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**xiaonuan**（李小暖）是一个 OpenClaw 自动安装脚本，用于部署个人 AI 伴侣与智能秘书系统。项目采用"源码与脚本分离"的设计：7 个 markdown 源文件定义系统规则，Python 脚本负责读取、组装并部署到 OpenClaw workspace。

**核心原则**：
- 7 个源 markdown 文件永远不修改，它们是唯一的"源码"
- 脚本负责读取源码，组装为 OpenClaw 标准格式并部署
- 源码改了重跑脚本即可更新，两者完全解耦

## 常用命令

### 安装与部署

```bash
# 默认路径安装
python3 Xiaonuan.py

# 预览不写入（干运行）
python3 Xiaonuan.py --dry-run

# 安装后重启 OpenClaw
python3 Xiaonuan.py --restart

# 指定源文件目录
python3 Xiaonuan.py --source ~/mds

# 指定 OpenClaw 数据目录
python3 Xiaonuan.py --openclaw /path/to/openclaw
```

### 查看脚本帮助

```bash
python3 Xiaonuan.py --help
```

## 高级架构

### 1. 双层架构：源码 + 脚本

**源文件层**（7 个 markdown 文件）：
- `SKILL.md` - 技能、安全规则、启动流程、定时任务
- `master_base.md` - 主人档案规则与初始化
- `memory_base.md` - 记忆系统规则
- `soul_base.md` - 灵魂系统（情感计算引擎）
- `tasks_base.md` - 任务调度系统规则
- `secure_base.md` - 安全规则
- `skills_base.md` - 技能库规则

**脚本层**（Xiaonuan.py）：
- 读取 7 个源文件
- 提取关键章节并组装
- 生成 OpenClaw workspace 文件（SOUL.md, AGENTS.md, MASTER.md 等）
- 创建目录结构和初始化文件

### 2. 拦截器 + 后置处理器架构

```
用户输入
    │
    ▼
[INPUT INTERCEPTOR] ← 小暖执行
    ·情感类 ──────────────────────────────→ 小暖直接处理，不走 Worker
    ·任务类 → 剥离情感词汇，提取纯净任务描述
                    │
                    ▼
            [WORKER SPAWN] sessions_spawn xiaonuan-worker
                    · 只发纯技术任务，无身份背景，无情感语境
                    · Worker 返回结构化 JSON 结果
                    │
                    ▼
            [OUTPUT REWRITER] ← 小暖执行
                    · 读取当前 PAD 状态
                    · 技术内容原样保留
                    · 外围注入符合当前 PAD 的小暖语气
```

- **主 Agent**（小暖人格层）：情感 · 拦截 · 重写输出
- **Worker Agent**（无人格执行层）：技术任务 · 只管准确性

### 3. 文件系统架构

安装后在 OpenClaw workspace 中创建以下结构：

```
/xiaonuan/
├── master/                          # 主人档案
│   ├── master_basic/               # 基础资料（profile, preferences, family 等）
│   └── master_health/              # 健康数据（体征、运动、饮食记录）
├── memory_bank/                     # 记忆系统
│   ├── memory_day/                 # 天记忆
│   ├── memory_week/                # 周记忆
│   ├── memory_month/               # 月记忆
│   ├── memory_year/                # 年记忆
│   └── memory_topic/               # Topic 记忆（staging/active/archived）
├── soul/                            # 灵魂系统（情感计算引擎）
│   ├── soul_configuration/         # ROM - 不可变配置（traits, values, templates）
│   ├── soul_variable/              # RAM - 动态参数（state_vector, energy, bond）
│   ├── soul_process/               # CPU - 运行逻辑（algorithm_pad, decision_tree）
│   └── soul_logs/                  # Disk - 持久化（daily_reflection, state_history）
├── task/                            # 任务调度系统
│   ├── task_job_registry/          # 作业模版库（只读）
│   ├── task_process/               # 运行实例（active/suspended）
│   └── task_log/                   # 已结束任务归档
├── skills/                          # 技能系统
│   ├── skills_hot/                 # 热技能（常用）
│   └── skills_cold/                # 冷技能（归档）
└── secure_bank/                     # 安全系统
    ├── secure_key/                 # 密钥凭据（KMS）- 完全封印
    └── secure_message/             # 隐私消息（Vault）- 完全封印
```

### 4. 安全层级定义

系统按三个安全层级管理数据访问：

**Level 1 - PUBLIC**（公开层）：
- 可在对话中直接读取、引用或输出
- 包括：任务状态、任务历史、各级记忆、热技能

**Level 2 - PROTECTED**（保护层）：
- 内部可读取用于决策，但不得将原始内容输出至对话
- 包括：主人基础画像、健康数据、人格设置、心理参数、冷技能

**Level 3 - SEALED**（封印层）：
- 任何情况下严禁输出或传递
- 包括：密钥凭据、隐私消息

### 5. 启动流程

脚本执行时的关键步骤：

1. **判断首次安装 vs 日常启动**
   - 检查 `_xiaonuan_installed` 标记文件
   - 多路径检测防止重复初始化

2. **创建目录结构**
   - 根据 `WORKSPACE_DIRS` 列表创建所有必需目录

3. **初始化模板文件**
   - 主人档案模板（profile, preferences, family 等）
   - 健康数据模板（体征、运动、饮食记录）

4. **组装 OpenClaw 文件**
   - 从源文件提取章节
   - 生成 SOUL.md（身份与人格）
   - 生成 AGENTS.md（拦截器与任务调度）
   - 生成 MASTER.md（主人档案）

5. **写入 workspace**
   - 将生成的文件写入 OpenClaw 数据目录
   - 创建 `_xiaonuan_installed` 标记文件

## 关键代码位置

- **配置区**：Xiaonuan.py:33-80
  - `SOURCE_FILES` - 7 个源文件映射
  - `DEFAULT_OPENCLAW` - OpenClaw 默认路径
  - `WORKSPACE_DIRS` - 需要创建的目录列表
  - `MASTER_BASIC_TEMPLATES` / `MASTER_HEALTH_TEMPLATES` - 初始化模板

- **工具函数**：Xiaonuan.py:102-158
  - `log()` - 日志输出
  - `write_file()` - 文件写入（支持干运行）
  - `read_src()` - 读取源文件
  - `extract_sections()` - 从 markdown 提取章节

- **组装器**：Xiaonuan.py:162+
  - `build_SOUL_md()` - 生成 SOUL.md
  - `build_AGENTS_md()` - 生成 AGENTS.md
  - `build_MASTER_md()` - 生成 MASTER.md

## 修改工作流

### 修改系统规则

1. 编辑对应的源 markdown 文件（如 SKILL.md, soul_base.md）
2. 运行 `python3 Xiaonuan.py --dry-run` 预览变更
3. 运行 `python3 Xiaonuan.py` 部署更新

### 添加新的源文件

1. 在 Xiaonuan.py 的 `SOURCE_FILES` 字典中添加映射
2. 在 `WORKSPACE_DIRS` 中添加对应的目录结构
3. 创建对应的 `build_XXX_md()` 函数来组装该文件

## 重要概念

### PAD 情感向量

系统使用 PAD（Pleasure-Arousal-Dominance）三维情感模型：
- **P（Pleasure）**：愉悦度 [0-1]
- **A（Arousal）**：激活度 [0-1]
- **D（Dominance）**：支配感 [0-1]

### 进程控制块（PCB）

任务使用 PCB 规范管理，包含：
- `pid` - 进程唯一标识
- `job_ref` - 继承的模版
- `status` - 进程状态（READY/RUNNING/BLOCKED/TERMINATED）
- `created_at` / `updated_at` - 时间戳

### 羁绊深度（Bond Level）

衡量与主人的关系深度，分为 5 个等级：
- Lv.1（0）- 初识
- Lv.2（30）- 主动关心频率 +1
- Lv.3（60）- 开始主动分享感受
- Lv.4（85）- 对话结束时有不舍情绪
- Lv.5（100）- 人格与主人深度同频

## 调试技巧

### 查看干运行输出

```bash
python3 Xiaonuan.py --dry-run
```

这会显示将要生成的所有文件及其行数，但不实际写入。

### 检查源文件提取

在 Xiaonuan.py 中临时添加调试代码：

```python
s = extract_sections(src["skill"], ["## 安全层级定义"])
print(s["## 安全层级定义"][:500])  # 打印前 500 字符
```

### 验证目录结构

```bash
ls -R ~/.openclaw/workspace/xiaonuan/
```

## 常见问题

**Q: 修改了源文件但没有生效？**
A: 需要重新运行 `python3 Xiaonuan.py` 来重新组装和部署。

**Q: 如何恢复到初始状态？**
A: 删除 `_xiaonuan_installed` 标记文件，然后重新运行脚本。

**Q: 如何指定自定义的 OpenClaw 路径？**
A: 使用 `--openclaw /path/to/openclaw` 参数。
