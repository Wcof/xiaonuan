# XiaoNuan MCP Server

本目录是李小暖人格服务的标准 MCP (Model Context Protocol) 实现。通过启动本服务，Claude Desktop、Cursor 或 Windsurf 可以直接访问并结合李小暖的“人格”及“记忆”数据进行回复。

## 目录结构

- `src/index.ts`：服务入口，采用 STDIO 传输
- `src/server.ts`：核心 MCP 注册逻辑
- `src/tools/`：注册为 MCP Tools 的能力（获取身份、获取/修改记忆、获取大语言模型设定规则）
- `src/resources/`：注册为 MCP Resources 的配置文件和缓存等机制

## 安装与编译

```bash
npm install
npm run build
```

## 客户端集成配置文档

### 1. Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`，添加如下内容：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/绝对路径/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Cursor

编辑项目根目录（或全局）的 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/绝对路径/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
```
或通过 Settings -> MCP 直接添加新的 Node.js Server。

### 3. Windsurf

编辑项目配置的 `.windsurf/mcp.json` 或者在 Windsurf MCP 管理界面中配置：

```json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/绝对路径/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
```

## 测试命令

可以通过以下命令在本地快速测试是否能够调用 Tool：

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```
