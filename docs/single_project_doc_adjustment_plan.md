# 单项目叙事修正方案（README / 文档结构）

## 目标
- 对外只呈现一个项目：**xiaonuan**。
- `mcp-server` 明确为子模块/实现层，不再被误解为第二个项目。

---

## 核心问题
- 根目录 `README.md` 与 `mcp-server/README.md` 同时扮演“项目入口”，造成“双项目”感。
- `mcp-server/README.md` 的语气与内容过于完整项目化。

---

## 修改方案

### 1. 根 README 作为唯一入口
- 强调这是**完整项目**，包含多个子模块。
- 所有“安装/运行/使用”入口统一放在根 README。
- 将 `mcp-server` 的内容压缩为“模块概览+跳转链接”。

### 2. mcp-server README 降级为模块说明
- 标题改为“XiaoNuan MCP 子模块说明 / Empathic Gateway 模块说明”。
- 去掉“项目入口式”描述。
- 强调依赖根项目的 `src/*.md` 与 `config/`。
- 内容聚焦：模块用途、接口、运行前置条件。

### 3. 文档导航统一
- `docs/SUMMARY.md` 中区分“主项目入口文档”和“模块文档”。
- `mcp-server/README.md` 作为模块文档挂载。

---

## 实施清单

1. 更新 `README.md`
   - 增加“项目是单一系统”的明确声明
   - 将 `mcp-server` 描述改为子模块概览
   - 移除或合并重复的“快速开始”段落

2. 更新 `mcp-server/README.md`
   - 标题与语气降级
   - 仅保留模块功能与接口说明

3. 更新 `docs/SUMMARY.md`
   - 新增“模块文档”栏目
   - 挂载 `mcp-server/README.md`

---

## 预期效果
- 用户只看到一个项目入口（根 README）。
- `mcp-server` 成为明确的子模块，不再被误解为第二项目。

---

## 文件路径
- `README.md`
- `mcp-server/README.md`
- `docs/SUMMARY.md`

