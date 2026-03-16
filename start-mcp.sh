#!/bin/bash

# 李小暖 MCP 服务启动脚本
# 在后台常驻运行，关闭终端时自动结束

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER="$PROJECT_ROOT/mcp-server/dist/index.js"

# 检查 MCP 服务是否已编译
if [ ! -f "$MCP_SERVER" ]; then
    echo "❌ MCP 服务未编译，请先运行: python3 install.py --mcp"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ 启动 MCP 服务..."
echo "📍 服务路径: $MCP_SERVER"
echo "🔌 本机所有支持 MCP 的软件都可以调用此服务"
echo "⏹️  关闭此终端窗口即可停止服务"
echo ""

# 在后台运行，但保持与终端会话关联
node "$MCP_SERVER"
