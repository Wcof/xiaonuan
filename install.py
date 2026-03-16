#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          李小暖 · 人格插件安装脚本 v5.0                          ║
╠══════════════════════════════════════════════════════════════════╣
║  用法：                                                          ║
║    pip3 install -r requirements.txt             # 安装依赖       ║
║    python3 install.py                           # 交互式安装     ║
║    python3 install.py --persona                 # 仅生成人格包   ║
║    python3 install.py --mcp                     # 安装并启动 MCP  ║
║    python3 install.py --mcp --no-run            # 仅安装 MCP     ║
║    python3 install.py --mcp --log <path>        # 启动并记录日志 ║
║    python3 install.py --trae-config             # 自动修复 Trae 配置 ║
╚══════════════════════════════════════════════════════════════════╝
"""

import sys
import argparse
from typing import Optional
import os
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
    print("2. MCP 服务（安装并启动）")
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

def install_mcp(run_after: bool = True, log_path: Optional[str] = None):
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

    def needs_rebuild() -> bool:
        dist_index = mcp_dir / "dist" / "index.js"
        if not dist_index.exists():
            return True
        dist_mtime = dist_index.stat().st_mtime
        for path in (mcp_dir / "src").rglob("*.ts"):
            if path.stat().st_mtime > dist_mtime:
                return True
        return False

    # 编译（仅当有变更时）
    if needs_rebuild():
        log("检测到源码变更，编译 TypeScript...", "STEP")
        result = subprocess.run(["npm", "run", "build"], cwd=mcp_dir, capture_output=True, text=True)
        if result.returncode != 0:
            log(f"编译失败: {result.stderr}", "ERROR")
            return False
        log("编译完成", "OK")
    else:
        log("未检测到源码变更，跳过编译", "OK")

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
    if not run_after:
        return True

    # 启动 MCP 服务（前台阻塞）
    log("启动 MCP 服务（Ctrl+C 退出）...", "STEP")
    import subprocess
    logs_dir = PROJECT_ROOT / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)
    resolved_log = Path(log_path) if log_path else (logs_dir / "mcp.log")

    cmd = f'cd "{mcp_dir}" && node dist/index.js 2>&1 | tee -a "{resolved_log}"'
    try:
        subprocess.run(["/bin/zsh", "-lc", cmd], check=False)
    except KeyboardInterrupt:
        log("MCP 服务已停止", "INFO")
    return True

def update_trae_config():
    """更新 Trae MCP 配置中的项目路径"""
    trae_config = Path.home() / "Library/Application Support/Trae CN/User/mcp.json"
    if not trae_config.exists():
        log(f"未找到 Trae 配置文件：{trae_config}", "WARN")
        return False

    try:
        content = trae_config.read_text(encoding="utf-8")
    except Exception as e:
        log(f"读取 Trae 配置失败: {e}", "ERROR")
        return False

    old_path = "/absolute/path/to/xiaonuan"
    new_path = str(PROJECT_ROOT)

    if old_path not in content and new_path in content:
        log("Trae 配置已是正确路径，无需修改", "OK")
        return True

    if old_path not in content:
        log("Trae 配置未包含占位路径，无法自动替换，请手动检查", "WARN")
        return False

    updated = content.replace(old_path, new_path)
    try:
        trae_config.write_text(updated, encoding="utf-8")
        log(f"已更新 Trae 配置路径：{trae_config}", "OK")
        return True
    except Exception as e:
        log(f"写入 Trae 配置失败: {e}", "ERROR")
        return False

def main():
    parser = argparse.ArgumentParser(description='李小暖人格插件安装脚本')
    parser.add_argument('--persona', action='store_true', help='仅生成人格包')
    parser.add_argument('--mcp', action='store_true', help='安装并启动 MCP 服务')
    parser.add_argument('--no-run', action='store_true', help='仅安装，不启动 MCP')
    parser.add_argument('--log', type=str, help='MCP 日志输出路径（默认 logs/mcp.log）')
    parser.add_argument('--trae-config', action='store_true', help='自动修复 Trae MCP 配置路径')

    args = parser.parse_args()

    # 加载配置
    config = load_config()

    # 命令行参数模式
    if args.persona:
        generate_persona_package(config)
        return

    if args.mcp:
        install_mcp(run_after=not args.no_run, log_path=args.log)
        return
    if args.trae_config:
        update_trae_config()
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
