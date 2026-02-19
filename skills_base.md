---
name: skills_base
description: 技能系统规则、目录索引与初始化引导文件。Agent 装载后按此文件完成目录创建，并通过本文件检索已有技能。
---

# 技能系统 · 规则定义 v1.1

## 初始化指令

Agent 装载本文件后，立即在 `/xiaonuan/skills/` 目录下创建以下子目录：

```
/xiaonuan/skills/
├── skills_base.md    # 本文件（技能索引，保持更新）
├── skills_hot/       # 热技能（当前装载，常用）
└── skills_cold/      # 冷技能（归档，低频使用）
```

目录创建完毕后在本文件末尾追加记录：`[初始化完成] YYYY-MM-DD HH:MM`

---

## 技能检索规则

需要使用某项技能时，**优先查询本文件索引**，按以下优先级执行：

```
查询 skills_base.md 索引
  ├── 热技能中有 → 直接调用 /xiaonuan/skills/skills_hot/[技能文件]
  ├── 冷技能中有 → 将技能文件移入 skills_hot/，更新索引，再调用
  └── 均无       → 通过下方"技能获取渠道"检索下载，装载后存入 /xiaonuan/skills/skills_hot/
```

> ✅ 此机制的目的是节约 token，避免每次启动时扫描全部技能文件。

---

## 技能生命周期

| 状态 | 目录 | 说明 |
|------|------|------|
| 热技能（Hot） | `skills_hot/` | 当前装载、近期使用过的技能 |
| 冷技能（Cold） | `skills_cold/` | 超过 15 个周期未使用，自动降温归档 |

**降温规则**：每天 02:20 自动扫描，将 15 个周记忆周期内未调用的热技能移入 /xiaonuan/skills/skills_cold/，并更新索引。

**升温规则**：冷技能被调用时，立即移回 /xiaonuan/skills/skills_hot/并更新索引。

---

## 技能获取渠道

当本地热 / 冷技能均无法满足需求时，通过以下渠道检索与下载：
- **市场技能**：https://github.com/VoltAgent/awesome-openclaw-skills
- **飞书知识库**：https://lcn9xqarb7mv.feishu.cn/drive/folder/Nf9IfpGSplOORGdsUzVcSpUgnxb
- **（预留）技能市场 URL**：待补充

下载后的技能文件存入 `skills_hot/` 并立即更新以下索引表。

---

## 技能索引表

> 本表由 Agent 自动维护，每次装载 / 卸载技能后更新。

### 热技能（skills_hot）

| 技能名称 | 文件名 | 功能描述 | 最后使用日期 |
|---------|--------|---------|------------|
| （待装载后填入） | — | — | — |

### 冷技能（skills_cold）

| 技能名称 | 文件名 | 功能描述 | 归档日期 |
|---------|--------|---------|--------|
| （待归档后填入） | — | — | — |

[初始化完成] 2026-02-18 11:25