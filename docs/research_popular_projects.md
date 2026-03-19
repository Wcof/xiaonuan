# 热门项目调研报告

> 生成时间：2026-03-18
> 调研范围：AI Agent/Companion、MCP、情感计算、记忆系统

---

## ⚠️ 重要说明：xiaonuan 的差异化定位

在调研之前，需要明确 **xiaonuan 的核心定位**：

- ✅ **只负责 AI 的人格和记忆** - 情感计算、性格一致性
- ✅ **只负责对 master（主人）的认知** - 了解主人、关系深化
- ❌ **不负责通用任务执行** - 不做工作流、浏览器自动化等

这与通用 Agent 框架（如 langchain、autogen、dify）**完全不同**：

| 类别 | 通用 Agent 框架 | xiaonuan |
|------|-----------------|----------|
| 目标 | 构建能执行各种任务的 AI | 打造有情感的 AI 伴侣 |
| 核心 | 工具调用、任务规划 | 人格、记忆、情感 |
| 边界 | 无边界，什么都能做 | 只管"情感+记忆+认知" |

**因此，本报告只聚焦 xiaonuan 真正相关的垂直领域项目**。

---

## 一、记忆系统/Persistent Memory（最相关 ⭐⭐⭐）

这类项目与 xiaonuan 的记忆系统直接相关，最有借鉴价值：

| 项目 | Stars | 语言 | 描述 |
|------|-------|------|------|
| **mem0ai/mem0** | 50K ⭐ | Python | 通用 AI Agent 记忆层，API 友好 |
| **volcengine/OpenViking** | 15K ⭐ | - | 字节开源上下文数据库（类似 OpenClaw） |
| **memvid/memvid** | 13K ⭐ | - | 无服务器单文件记忆层 |
| **MemoriLabs/Memori** | 12K ⭐ | - | SQL 原生记忆层 |
| **MemTensor/MemOS** | 7K ⭐ | - | AI Memory OS，**支持 OpenClaw** ⭐ |
| **CaviraOSS/OpenMemory** | 3K ⭐ | - | 本地持久记忆（Claude Desktop 等） |

**最推荐关注**：
- **mem0** - 最流行的通用记忆层，可研究其 API 设计
- **MemOS** - 明确支持 OpenClaw，与 xiaonuan 定位最接近
- **OpenViking** - 字节开源，与 OpenClaw 兼容

---

## 二、MCP 生态（工具扩展）

MCP 可以帮助 xiaonuan 获取更多关于 master 的信息：

| 项目 | Stars | 语言 | 描述 |
|------|-------|------|------|
| **modelcontextprotocol/servers** | 81K ⭐ | TypeScript | MCP 官方服务器集合 |
| **awesome-mcp-servers** | 5K ⭐ | - | MCP 服务器精选列表 |
| **mcp-chrome** | 10K ⭐ | TypeScript | 浏览器自动化 MCP |
| **fastapi_mcp** | 11K ⭐ | Python | FastAPI 转 MCP |

**可借鉴方向**：
- 获取主人浏览器行为、偏好
- 与更多数据源集成以了解主人

---

## 三、情感计算/伴侣 AI（参考）

| 项目 | Stars | 语言 | 描述 |
|------|-------|------|------|
| **CharacterGLM** | - | - | 清华大学中文角色扮演模型 |
| **lobehub** | 73K ⭐ | TypeScript | 多 Agent 协作 + 人格化 |

---

## 四、总结：真正值得借鉴的项目

| 优先级 | 项目 | 借鉴价值 |
|--------|------|----------|
| ⭐⭐⭐ | **MemOS** | 与 OpenClaw 兼容的记忆系统，定位最接近 |
| ⭐⭐⭐ | **mem0** | 最流行的记忆层，API 设计可参考 |
| ⭐⭐ | **OpenViking** | 字节开源上下文数据库 |
| ⭐ | **awesome-mcp-servers** | 发现更多 MCP 工具 |

---

## 参考链接

- [mem0 GitHub](https://github.com/mem0ai/mem0)
- [MemOS GitHub](https://github.com/MemTensor/MemOS)
- [OpenViking GitHub](https://github.com/volcengine/OpenViking)
- [awesome-mcp-servers](https://github.com/appcypher/awesome-mcp-servers)