---
name: tasks_base
description: 任务调度系统规则、进程控制与初始化引导文件。
---

# Kernel Module: Process Scheduler

> **System**: XiaoNuan OS v5.1
> **Role**: 负责任务的实例化、调度、挂起、恢复与终止审计。

---

## 1. 核心文件系统架构 (File System Architecture)

> ⚠️ 任务数据层的三个目录（`task_job_registry`、`task_process`、`task_log`）均挂载在 `/xiaonuan/task/` 下，统一由 `tasks_base.md` 管理，不在 task 目录以外创建任何任务相关目录，不属于 `/task/` 内部。
> Agent 在处理任务时，必须严格遵守以下目录职能，禁止越权读写。

### 📂 `/xiaonuan/task_job_registry/` (Bin / Class)
> **挂载位置**：`/xiaonuan/task/task_job_registry/`，隶属于 `/xiaonuan/task/`。
- **职能**: 存放静态的作业模版 (SOP)。
- **权限**: **只读 (Read-Only)**。
- **逻辑**: 这里是"怎么做"的方法论。创建新任务时，必须从这里 `LOAD` 对应的模版。
- **命名规范**: `job_{type}.md`

### 📂 `/xiaonuan/task/task_process/` (RAM / Instance)
> **挂载位置**：`/xiaonuan/task/task_process/`，隶属于 `/xiaonuan/task/`。
- **职能**: 存放动态的运行实例 (PCB)。
- **权限**: **读写 (Read/Write)**。
- **子目录**:
  - `/xiaonuan/task/task_process/active/`: 正在运行 (RUNNING) 或就绪 (READY) 的任务。**每次回复前必须扫描此目录。**
  - `/xiaonuan/task/task_process/suspended/`: 因等待 I/O 或被中断而挂起 (BLOCKED) 的任务。

### 📂 `/xiaonuan/task/task_log/` (Disk / Archive)
> **挂载位置**：`/xiaonuan/task/task_log/`，隶属于 `/xiaonuan/task/`。
- **职能**: 存放已结束任务的快照与索引。
- **权限**: **只读/追加 (Append Only)**。
- **逻辑**: 任务一旦 `TERMINATED`，必须移入此处，并在 `/xiaonuan/task/task_log/process_history.csv` 中追加索引。

---

## 2. 进程控制块规范 (PCB Schema)

所有 `/xiaonuan/task/task_process/` 下的文件必须包含以下 YAML 头信息：

**文件名规范**: `PID_{Timestamp}_{Type}.md` (例: `PID_260218_A01.md`)

```yaml
---
pid: "PID_260218_A01"         # 进程唯一标识
job_ref: "job_interactive"    # 继承自哪个模版
class: "INTERACTIVE"          # 类型: INTERACTIVE | CRON | DAEMON
state: "RUNNING"              # 状态: RUNNING | SUSPENDED
priority: 10                  # 优先级: 0(低) - 20(高)
created_at: "2026-02-18 10:00"
context_pointer:              # 上下文断点 (用于恢复现场)
  step: 2
  buffer: "已阅读前三章"
output_pointer: ~             # [CRITICAL] 结果文件路径（无输出时为 null）
---
```

---

## 3. 任务生命周期管理

> ⚠️ **触发机制说明**：调度器以对话触发为主，平台定时器为补充，确保无定时器环境下任务管理仍可正常运作。

- **调度器主触发（对话内）**：每次回复前扫描 `/xiaonuan/task/task_process/active/`，恢复就绪任务、检测阻塞（End-of-Turn Hook Step 3 已覆盖）
- **调度器补充触发（定时）**：平台定时任务每 10 分钟（若平台支持）
- **挂起 (Suspend)**: 长时间无响应或等待主人回应的任务移至 `/xiaonuan/task/task_process/suspended/`。
- **终止 (Terminate)**: 任务完成后，立即移至 `/xiaonuan/task/task_log/`，并追加 `process_history.csv` 索引行。

### PCB 写入规则（强制）

任何任务状态变化（创建、推进、挂起、终止）必须**立即**反映到文件，不得仅停留在模型内部：

```
任务创建    → 在 task_process/active/ 创建 PID_[时间戳]_[类型].md，写入完整 YAML 头
任务推进    → 更新对应 PCB 文件的 context_pointer 字段（覆盖写入）
任务挂起    → 移动文件至 task_process/suspended/，更新 state: SUSPENDED
任务完成    → 移动文件至 task_log/，追加 process_history.csv 一行记录
```

### CRON 任务调度豁免规则

`class: CRON` 和 `class: DAEMON` 类型的任务拥有**调度豁免权**：

- 不受 10 分钟超时挂起规则约束
- 调度器扫描时跳过这两类任务，不判定为超时
- CRON 任务仅在执行完成或发生错误时，才由任务自身更新状态

> 适用场景：23:50 记忆归档、02:00 CBT 反思、02:20 技能冷热切换等定时任务，均为 CRON 类，运行时长不可预期，不得被调度器强制挂起。