# 李小暖 MCP Server 实现方案

> 版本：v1.0
> 日期：2026-03-09
> 目标：将李小暖人格插件改造为 MCP Server，支持跨平台集成

---

## 一、方案概述

### 1.1 目标

将李小暖项目改造为标准的 MCP Server，使其能够：

- ✅ 作为独立服务运行
- ✅ 通过 MCP 协议提供人格数据访问
- ✅ 支持 Claude Desktop、Cursor、Windsurf 等工具集成
- ✅ 可以随时启动/关闭服务

### 1.2 技术栈

- **语言**：Node.js / TypeScript
- **协议**：MCP (Model Context Protocol)
- **传输**：stdio（标准输入输出）
- **数据格式**：JSON

---

## 二、架构设计

### 2.1 目录结构

```
xiaonuan/
├── mcp-server/                  # MCP Server 实现
│   ├── src/
│   │   ├── index.ts            # 服务入口
│   │   ├── server.ts           # MCP Server 核心
│   │   ├── tools/              # MCP Tools 定义
│   │   │   ├── identity.ts    # 身份查询工具
│   │   │   ├── memory.ts      # 记忆查询工具
│   │   │   └── persona.ts     # 人格配置工具
│   │   └── resources/          # MCP Resources 定义
│   │       ├── config.ts      # 配置资源
│   │       └── data.ts        # 数据资源
│   ├── dist/                   # 编译输出
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── config/                      # 配置文件（现有）
├── data/                        # 数据目录（现有）
├── src/                         # 源文件（现有）
└── install.py                   # 安装脚本（现有）
```

### 2.2 MCP Server 核心功能

#### Tools（工具）

MCP Server 提供以下工具供 AI 调用：

1. **get_identity** - 获取身份信息
   - 参数：`type` (self/master/others), `name` (可选)
   - 返回：身份档案数据

2. **get_memory** - 获取记忆数据
   - 参数：`type` (day/week/month/topic), `date` (可选)
   - 返回：记忆内容

3. **get_persona** - 获取人格配置
   - 参数：无
   - 返回：完整的人格配置

4. **update_memory** - 更新记忆（可选）
   - 参数：`type`, `content`
   - 返回：更新状态

#### Resources（资源）

MCP Server 提供以下资源：

1. **config://persona** - 人格配置
2. **config://behavior** - 行为规则
3. **data://identity/self** - AI 身份
4. **data://identity/master** - 主人身份
5. **data://memory/recent** - 最近记忆

---

## 三、实现步骤

### 3.1 Phase 1：基础框架（1-2天）

**任务**：
1. 创建 `mcp-server/` 目录
2. 初始化 Node.js 项目
3. 安装依赖：`@modelcontextprotocol/sdk`
4. 实现基础 MCP Server 框架
5. 实现 stdio 传输层

**产出**：
- 可运行的 MCP Server（空壳）
- 能够响应 `initialize` 请求

**验证**：
```bash
node mcp-server/dist/index.js
# 应该能够启动并等待输入
```

### 3.2 Phase 2：Tools 实现（2-3天）

**任务**：
1. 实现 `get_identity` 工具
   - 读取 `data/identity/` 目录
   - 解析 markdown 文件
   - 返回 JSON 格式数据

2. 实现 `get_memory` 工具
   - 读取 `data/memory/` 目录
   - 支持日期过滤
   - 返回记忆内容

3. 实现 `get_persona` 工具
   - 读取 `config/persona.yaml`
   - 读取 `config/behavior.yaml`
   - 合并返回完整配置

**产出**：
- 3个可用的 MCP Tools
- 单元测试

**验证**：
```bash
# 测试工具调用
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_persona"},"id":1}' | node mcp-server/dist/index.js
```

### 3.3 Phase 3：Resources 实现（1-2天）

**任务**：
1. 实现配置资源（config://）
2. 实现数据资源（data://）
3. 支持资源列表和读取

**产出**：
- 5个可用的 MCP Resources
- 资源访问测试

### 3.4 Phase 4：客户端集成（2-3天）

**任务**：
1. 编写 Claude Desktop 配置示例
2. 编写 Cursor 配置示例
3. 编写 Windsurf 配置示例
4. 测试各平台集成

**产出**：
- 配置文档
- 集成测试报告

---

## 四、配置方式

### 4.1 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/Users/ldh/Downloads/project/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
```

### 4.2 Cursor

编辑项目根目录 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"]
    }
  }
}
```

### 4.3 Windsurf

编辑项目根目录 `.windsurf/mcp.json`：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"]
    }
  }
}
```

---

## 五、使用方式

### 5.1 启动服务

MCP Server 由客户端（Claude Desktop/Cursor/Windsurf）自动启动，无需手动启动。

### 5.2 关闭服务

**方法 1：关闭客户端**
- 关闭 Claude Desktop/Cursor/Windsurf，服务自动停止

**方法 2：禁用配置**
- 从配置文件中移除或注释掉 `xiaonuan` 配置
- 重启客户端

**方法 3：临时禁用**
- 在配置中添加 `"disabled": true`：
```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "disabled": true
    }
  }
}
```

### 5.3 查看日志

MCP Server 日志输出到 stderr：

```bash
# 查看 Claude Desktop 日志
tail -f ~/Library/Logs/Claude/mcp-server-xiaonuan.log

# 查看 Cursor 日志
tail -f ~/.cursor/logs/mcp-xiaonuan.log
```

---

## 六、开发指南

### 6.1 本地开发

```bash
cd mcp-server

# 安装依赖
npm install

# 开发模式（自动重启）
npm run dev

# 编译
npm run build

# 测试
npm test
```

### 6.2 调试

使用 MCP Inspector 调试：

```bash
# 安装 MCP Inspector
npm install -g @modelcontextprotocol/inspector

# 启动调试
mcp-inspector node mcp-server/dist/index.js
```

### 6.3 代码结构

**src/index.ts**：
```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { XiaoNuanServer } from './server.js';

const server = new XiaoNuanServer();
const transport = new StdioServerTransport();
await server.connect(transport);
```

**src/server.ts**：
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export class XiaoNuanServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'xiaonuan',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      }
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // 注册 tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_identity',
          description: '获取身份信息',
          inputSchema: { /* ... */ }
        },
        // ...
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // 处理工具调用
    });
  }

  async connect(transport: any) {
    await this.server.connect(transport);
  }
}
```

---

## 七、数据安全

### 7.1 隐私保护

- ❌ `data/secure/` 目录**永远不暴露**给 MCP
- ❌ `data/memory/memory_day/` **不暴露**（包含敏感细节）
- ✅ 只暴露抽象的、脱敏的数据

### 7.2 访问控制

MCP Server 只读取以下数据：
- `config/` - 配置文件
- `data/identity/` - 身份记忆（抽象）
- `data/memory/memory_week/` - 周记忆（脱敏）
- `data/memory/memory_month/` - 月记忆（脱敏）
- `data/memory/memory_topic/` - Topic 记忆（归纳）

---

## 八、测试计划

### 8.1 单元测试

- Tools 功能测试
- Resources 读取测试
- 数据解析测试

### 8.2 集成测试

- Claude Desktop 集成测试
- Cursor 集成测试
- Windsurf 集成测试

### 8.3 性能测试

- 启动时间 < 1秒
- 工具调用响应 < 100ms
- 内存占用 < 50MB

---

## 九、发布计划

### 9.1 版本规划

- **v1.0.0** - 基础 MCP Server（只读）
- **v1.1.0** - 支持记忆更新（写入）
- **v1.2.0** - 支持配置修改
- **v2.0.0** - 支持云端同步

### 9.2 文档

- README.md - 使用说明
- API.md - API 文档
- DEVELOPMENT.md - 开发指南

---

## 十、FAQ

### Q1: MCP Server 会一直运行吗？

不会。MCP Server 由客户端按需启动，关闭客户端后自动停止。

### Q2: 如何更新人格配置？

修改 `config/persona.yaml` 后，重启客户端即可生效。

### Q3: 多个客户端可以同时使用吗？

可以。每个客户端会启动独立的 MCP Server 实例。

### Q4: 数据会被上传到云端吗？

不会。MCP Server 只在本地运行，不会上传任何数据。

### Q5: 如何备份数据？

使用 Git 推送到远程仓库，或手动复制 `data/` 目录。

---

## 十一、时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Phase 1 | 基础框架 | 1-2天 |
| Phase 2 | Tools 实现 | 2-3天 |
| Phase 3 | Resources 实现 | 1-2天 |
| Phase 4 | 客户端集成 | 2-3天 |
| 测试 | 单元测试 + 集成测试 | 2天 |
| 文档 | 编写文档 | 1天 |
| **总计** | | **9-13天** |

---

## 十二、下一步行动

1. ✅ 阅读本方案文档
2. ✅ 创建 `mcp-server/` 目录
3. ✅ 初始化 Node.js 项目
4. ✅ 实现 Phase 1：基础框架
5. ✅ 实现 Phase 2：Tools
6. ✅ 实现 Phase 3：Resources
7. ✅ 实现 Phase 4：客户端集成
8. ✅ 测试和文档

---

## 附录

### A. MCP 协议参考

- 官方文档：https://modelcontextprotocol.io
- SDK 文档：https://github.com/modelcontextprotocol/typescript-sdk
- 示例项目：https://github.com/modelcontextprotocol/servers

### B. 相关资源

- Node.js：https://nodejs.org
- TypeScript：https://www.typescriptlang.org
- YAML 解析：https://github.com/eemeli/yaml

---

**方案制定**：Claude Opus 4.6
**最后更新**：2026-03-09
