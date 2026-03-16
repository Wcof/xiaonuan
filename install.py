#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          李小暖 · 人格插件安装脚本 v5.0                          ║
╠══════════════════════════════════════════════════════════════════╣
║  用法：                                                          ║
║    pip3 install -r requirements.txt             # 安装依赖       ║
║    python3 install.py                           # 交互式安装     ║
║    python3 install.py --persona                 # 仅生成人格包   ║
║    python3 install.py --mcp                     # 仅安装 MCP     ║
╚══════════════════════════════════════════════════════════════════╝
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime

try:
    import yaml
except ImportError:
    print("❌ 缺少依赖：PyYAML")
    print("请运行：pip3 install -r requirements.txt")
    sys.exit(1)

# 项目根目录
PROJECT_ROOT = Path(__file__).parent

def log(msg, level="INFO"):
    icons = {"INFO": "   ", "OK": " ✅", "WARN": " ⚠️ ", "ERROR": " ❌", "STEP": " ▶"}
    print(f"{icons.get(level, '   ')} {msg}")

def show_menu():
    """显示交互式菜单"""
    print("\n╔══════════════════════════════════════════════════════════════════╗")
    print("║          李小暖 · 人格插件安装向导                                ║")
    print("╚══════════════════════════════════════════════════════════════════╝\n")
    print("请选择安装方式：\n")
    print("1. 生成人格包（通用，支持所有工具）")
    print("2. MCP 服务（推荐用于 Claude Desktop）")
    print("0. 退出\n")

    while True:
        choice = input("请输入选项 [0-2]: ").strip()
        if choice in ["0", "1", "2"]:
            return choice
        print("❌ 无效选项，请重新输入")

def load_config():
    """加载配置文件"""
    config = {}
    config_dir = PROJECT_ROOT / "config"

    for file in ["persona.yaml", "behavior.yaml", "sync.yaml"]:
        path = config_dir / file
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                config[file.replace('.yaml', '')] = yaml.safe_load(f)

    return config

def generate_persona_package(config):
    """生成人格包文件"""
    log("生成人格包文件...", "STEP")

    persona = config.get('persona', {})
    behavior = config.get('behavior', {})

    ai = persona.get('ai', {})
    master = persona.get('master', {})

    content = f"""# 李小暖 · 人格配置

> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M')}

## AI 身份

- **名字**：{ai.get('name', '李小暖')}
- **昵称**：{ai.get('nickname', '小暖')}
- **角色**：{ai.get('role', '赛博朋克情感伴侣与智能秘书')}

### 性格特征

{chr(10).join(f'- {p}' for p in ai.get('personality', []))}

### 核心价值观

{chr(10).join(f'- {v}' for v in ai.get('core_values', []))}

## 主人身份

- **名字**：{master.get('name', '李燈辉')}
- **昵称**：{', '.join(master.get('nickname', []))}
- **时区**：{master.get('timezone', 'Asia/Shanghai')}

## 行为规则

### 交互模式

- 交互模式：{behavior.get('behavior', {}).get('interaction_mode', 'emotional_first')}
- 记忆更新：{behavior.get('behavior', {}).get('memory_update', {}).get('mode', 'auto')}
- 同步频率：{behavior.get('behavior', {}).get('sync', {}).get('frequency', 'after_conversation')}

### 行为优先级

{chr(10).join(f'{i+1}. {p}' for i, p in enumerate(behavior.get('priority', [])))}

## 使用说明

### 在 Cursor 中使用

Cursor 会自动加载项目根目录的 `.cursorrules` 文件，无需手动操作。

### 在 Windsurf 中使用

Windsurf 会自动加载项目根目录的 `.windsurfrules` 文件，无需手动操作。

### 在其他工具中使用

**Claude Desktop / Trae / Antigravity 等工具**：

1. 找到项目根目录的 `xiaonuan-persona.md` 文件
2. 在对话开始时，上传这个文件
3. 在第一条消息中说："请按照这个人格配置与我互动"

**文件位置**：`{PROJECT_ROOT / 'xiaonuan-persona.md'}`
"""

    # 写入人格包
    persona_file = PROJECT_ROOT / "xiaonuan-persona.md"
    persona_file.write_text(content, encoding='utf-8')
    log(f"已生成：{persona_file}", "OK")

    # 写入 .cursorrules
    cursorrules = PROJECT_ROOT / ".cursorrules"
    cursorrules.write_text(content, encoding='utf-8')
    log(f"已生成：{cursorrules}", "OK")

    # 写入 .windsurfrules
    windsurfrules = PROJECT_ROOT / ".windsurfrules"
    windsurfrules.write_text(content, encoding='utf-8')
    log(f"已生成：{windsurfrules}", "OK")

    print("\n✅ 配置文件已生成！\n")
    print("使用方法：")
    print("- Cursor: 自动加载 .cursorrules")
    print("- Windsurf: 自动加载 .windsurfrules")
    print(f"- Claude/Trae/Antigravity: 上传 {persona_file.name}\n")

def install_mcp():
    """安装 MCP 服务"""
    log("安装 MCP 服务...", "STEP")

    mcp_dir = PROJECT_ROOT / "mcp-server"
    if not mcp_dir.exists():
        log("MCP 服务目录不存在", "ERROR")
        return False

    # 检查 Node.js
    import subprocess
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        log(f"检测到 Node.js {result.stdout.strip()}", "OK")
    except FileNotFoundError:
        log("未找到 Node.js，请先安装 Node.js 18+", "ERROR")
        return False

    # 安装依赖
    log("安装 npm 依赖...", "STEP")
    result = subprocess.run(["npm", "install"], cwd=mcp_dir, capture_output=True, text=True)
    if result.returncode != 0:
        log(f"npm install 失败: {result.stderr}", "ERROR")
        return False
    log("npm 依赖安装完成", "OK")

    # 编译
    log("编译 TypeScript...", "STEP")
    result = subprocess.run(["npm", "run", "build"], cwd=mcp_dir, capture_output=True, text=True)
    if result.returncode != 0:
        log(f"编译失败: {result.stderr}", "ERROR")
        return False
    log("编译完成", "OK")

    # 显示配置说明
    print("\n✅ MCP 服务安装完成！\n")
    print("配置说明：")
    print(f"MCP 服务路径：{mcp_dir / 'dist' / 'index.js'}\n")
    print("在 Claude Desktop 配置文件中添加：")
    print("""
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/absolute/path/to/xiaonuan/mcp-server/dist/index.js"]
    }
  }
}
""")
    return True

def main():
    parser = argparse.ArgumentParser(description='李小暖人格插件安装脚本')
    parser.add_argument('--persona', action='store_true', help='仅生成人格包')
    parser.add_argument('--mcp', action='store_true', help='仅安装 MCP 服务')

    args = parser.parse_args()

    # 加载配置
    config = load_config()

    # 命令行参数模式
    if args.persona:
        generate_persona_package(config)
        return

    if args.mcp:
        install_mcp()
        return

    # 交互式模式
    choice = show_menu()

    if choice == "0":
        log("已取消安装", "INFO")
        return

    if choice == "1":
        generate_persona_package(config)
    elif choice == "2":
        install_mcp()

if __name__ == "__main__":
    main()
