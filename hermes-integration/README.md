# Hermes Soul 运行机制

本目录复用项目的 TypeScript 情绪算法，通过 Hermes 原生生命周期接入。安装与启用命令见根目录 README.md；Python 实现采用标准库，不引入新依赖。

## 每轮行为

pre_llm_call 只分析当前用户输入，按时间衰减、情绪事件和有效人格参数生成短上下文。post_llm_call 在 Hermes 成功结束回复时保存状态；子 Agent 跳过人格层。

任务使用 direct 语气；情绪表达使用 warm、playful 或 supportive。人格层保持帮助能力与真实判断，不执行原始设计中的冷落、拒绝互动、攻击或强制打卡。

状态按平台和发送者的散列隔离；缺少发送者的远程会话按会话隔离，本地 CLI 会话共享本机使用者状态。回调按 session_id 和 turn_id 对应，保存最近 64 个已完成事件以防短期重复累计。

## 存储

默认位于 HERMES_HOME（未设置时 ~/.hermes）：

- `plugins/xiaonuan-soul/`：插件清单和指向运行副本的加载器。
- `runtime/xiaonuan-soul/<安装时间>/`：每次安装的独立引擎副本；旧副本保留，供旧加载器及恢复使用。
- `state/xiaonuan-soul/soul_configuration/traits_ocean.json`：可选的固定人格基准；未提供时使用代码默认值。
- `state/xiaonuan-soul/soul_variable/<用户散列>.json`：PAD、完成计数、去重记录和 personality_drift。
- `state/xiaonuan-soul/soul_logs/<用户散列>.jsonl`：数值轨迹。
- `state/xiaonuan-soul/soul_logs/reflections/YYYY-MM-DD/`：每用户反思的 JSON 和 Markdown。
- `backups/soul-<安装时间>/`：更新前的插件与 systemd 单元副本。

新状态和反思文件权限为 0600，目录为 0700。状态原子写入，锁串行化同一用户的写入；文件损坏时报告错误并保留原文件。轨迹不保存消息、回复、凭证或发送者原始标识。历史轨迹和反思由本机管理员管理，不自动清空用户数据。

## 衰减与每日漂移

P 范围为 [-1, 1]，A、D 为 [0, 1]。基线为 P=0.5、A=0.2、D=0.6。经过 h 小时后，`V = baseline + (V - baseline) * 0.95 ** h`；纯任务不额外改变心情。每小时定时器和状态读取均应用实际经过时间的衰减。

每日北京时间 02:00 的定时器统计过去 14 个完整自然日，排除当天、纯任务、重复事件和缺失用户情绪估计的旧轨迹；先计算每日均值，再对各天等权平均。

至少 3 天、12 条有效情绪样本才调整趋势参数：`agreeableness_target = mean_pleasure * 0.05`，`neuroticism_target = -mean_pleasure * 0.10`。其余维度保持原值。每日向目标移动最多 0.01，累计偏移不超过 ±0.15，有效人格参数限制为 [0, 1]。样本不足时已有漂移缓慢回归基准。

这是一套确定性的模拟参数反思，不是心理治疗。基准文件不修改，同一日期重跑不重复累计；状态提交后反思输出中断，重跑可以补齐报告。

## 检查与停用

根项目 `mcp-server/` 中的 npm test 使用隔离合成数据检查引擎、MCP、状态、漂移、安装和维护入口。每日检查中的 ValueError、JSONDecodeError 日志来自故意损坏的测试输入。

停用命令在部署主机执行：

```bash
hermes plugins disable xiaonuan-soul
systemctl --user disable --now xiaonuan-soul-decay.timer xiaonuan-soul-reflection.timer
systemctl --user restart hermes-gateway.service
```

停用保留状态。已安装版本不会自动从项目更新，需要重跑安装器及启用流程。Hermes 钩子接口核对版本为 38880bd2f1e90dbc9a1aeec03af62539ee64719a；其他版本应核对钩子兼容性。
