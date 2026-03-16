# Empathic Gateway 模块说明

> 本文档是 `mcp-server/` 子模块的功能说明，依赖根项目的 `src/*.md` 与 `config/` 配置。

**注意**：这不是独立项目，是 xiaonuan 主系统的实现子模块。

---

## 模块概述

`mcp-server/` 是李小暖系统的 MCP (Model Context Protocol) 服务实现，提供情感网关能力。

### 核心功能

| 功能 | 说明 |
|------|------|
| 情感分析 | PAD 向量计算、情绪分级 |
| 认知偏差检测 | 10 种认知扭曲模式识别 |
| 意图分类 | 情感/任务/混合类型 |
| 输出润色 | 情感陪护策略、响应改写 |
| 安全机制 | 三层安全层级 |

### 依赖

- 根目录 `src/*.md` - 系统规则源码
- 根目录 `config/` - 配置文件
- Node.js 18+
- TypeScript 5+

---

## 快速开始

```bash
# 编译
cd mcp-server
npm install
npm run build
```

### 客户端配置

在对应的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/absolute/path/to/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
```

---

## 模块架构

```
empathic_gateway/
├── emotion/       # 情感计算引擎
├── processing/    # 处理流程
├── rewriting/     # 输出润色
├── storage/       # 存储管理
├── hooks/        # 生命周期钩子
├── adapters/     # 适配器
└── security/     # 安全模块
```

详细 API 说明请参考根目录文档。

---

## 相关文档

- [主项目 README](../README.md)
- [Empathic Gateway 实现计划](../docs/IMPLEMENTATION_PLAN.md)
