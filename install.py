#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          李小暖 · 人格插件安装脚本 v5.1                         ║
╠══════════════════════════════════════════════════════════════════╣
║  用法：                                                          ║
║    pip3 install -r requirements.txt             # 安装依赖       ║
║    python3 install.py                           # 交互式安装     ║
║    python3 install.py --persona                 # 仅生成人格包   ║
║    python3 install.py --mcp                     # 安装并启动 MCP  ║
║    python3 install.py --mcp --no-run            # 仅安装 MCP     ║
║    python3 install.py --mcp --log <path>        # 启动并记录日志 ║
║    python3 install.py --trae-config             # 自动修复 Trae 配置 ║
║    python3 install.py --openclaw               # 安装 OpenClaw 人格插件 ║
║    python3 install.py --openclaw --scope global # 全局 Session 模式 ║
╚══════════════════════════════════════════════════════════════════╝
"""

import sys
import argparse
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).parent

from common import log

def show_menu():
    """显示交互式菜单"""
    print("\n╔══════════════════════════════════════════════════════════════════╗")
    print("║          李小暖 · 人格插件安装向导                                ║")
    print("╚══════════════════════════════════════════════════════════════════╝\n")
    print("请选择安装方式：\n")
    print("1. 生成人格包（通用，支持所有工具）")
    print("2. MCP 服务（安装并启动）")
    print("3. OpenClaw 人格插件（深度集成）")
    print("0. 退出\n")

    while True:
        choice = input("请输入选项 [0-3]: ").strip()
        if choice in ["0", "1", "2", "3"]:
            return choice
        print("❌ 无效选项，请重新输入")

def ask_session_scope() -> str:
    """询问装载范围"""
    print("\n请选择装载范围：\n")
    print("1. 当前 Session（仅本次会话，重启后需重新装载）")
    print("2. 全局 Session（永久生效，但切换新 Session 时需要身份唤醒）\n")

    while True:
        choice = input("请输入选项 [1-2]: ").strip()
        if choice in ["1", "2"]:
            return "current_session" if choice == "1" else "global_session"
        print("❌ 无效选项，请重新输入")

def confirm_install(scope: str) -> bool:
    """二次确认安装"""
    scope_desc = "当前 Session" if scope == "current_session" else "全局 Session"
    print(f"\n⚠️  确认安装信息：")
    print(f"   - 装载范围：{scope_desc}")
    if scope == "global_session":
        print(f"   - 注意：切换新 Session 后需要身份唤醒流程")
        print(f"   - 建议：配合身份档案自动加载机制使用\n")
    else:
        print(f"   - 注意：重启后需要重新装载\n")

    while True:
        confirm = input("确认安装？[y/N]: ").strip().lower()
        if confirm in ["y", "yes"]:
            return True
        elif confirm in ["n", "no", ""]:
            return False
        print("❌ 无效选项，请输入 y 或 n")

def get_openclaw_workspace() -> Optional[Path]:
    """获取 OpenClaw workspace 路径"""
    default_paths = [
        Path.home() / ".openclaw" / "workspace",
        Path.home() / "openclaw" / "workspace",
    ]

    for path in default_paths:
        marker = path / "_xiaonuan_installed"
        if marker.exists():
            return path

    if default_paths[0].exists():
        return default_paths[0]

    while True:
        custom_path = input("\n请输入 OpenClaw workspace 路径（直接回车使用默认路径）: ").strip()
        if not custom_path:
            path = default_paths[0]
        else:
            path = Path(custom_path).expanduser()

        if path.exists() or input(f"路径 {path} 不存在，是否创建？[y/N]: ").strip().lower() in ["y", "yes"]:
            return path
        print("❌ 请重新输入有效路径")

def generate_persona_package():
    """生成人格包文件"""
    from common import load_config, icons

    log("生成人格包文件...", "STEP")

    config = load_config(PROJECT_ROOT)

    persona = config.get('persona', {})
    behavior = config.get('behavior', {})

    ai = persona.get('ai', {})
    master = persona.get('master', {})

    content = f"""# 李小暖 · 人格配置

> 生成时间：{__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}

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

    persona_file = PROJECT_ROOT / "xiaonuan-persona.md"
    persona_file.write_text(content, encoding='utf-8')
    log(f"已生成：{persona_file}", "OK")

    cursorrules = PROJECT_ROOT / ".cursorrules"
    cursorrules.write_text(content, encoding='utf-8')
    log(f"已生成：{cursorrules}", "OK")

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
    from common import icons, log

    log("安装 MCP 服务...", "STEP")

    mcp_dir = PROJECT_ROOT / "mcp-server"
    if not mcp_dir.exists():
        log("MCP 服务目录不存在", "ERROR")
        return False

    import subprocess
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        log(f"检测到 Node.js {result.stdout.strip()}", "OK")
    except FileNotFoundError:
        log("未找到 Node.js，请先安装 Node.js 18+", "ERROR")
        return False

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

    if needs_rebuild():
        log("检测到源码变更，编译 TypeScript...", "STEP")
        result = subprocess.run(["npm", "run", "build"], cwd=mcp_dir, capture_output=True, text=True)
        if result.returncode != 0:
            log(f"编译失败: {result.stderr}", "ERROR")
            return False
        log("编译完成", "OK")
    else:
        log("未检测到源码变更，跳过编译", "OK")

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

    log("启动 MCP 服务（Ctrl+C 退出）...", "STEP")
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
    from common import log

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

def install_openclaw(scope: str):
    """安装 OpenClaw 人格插件（委托给 openclaw 模块）"""
    from openclaw import OpenClawInstaller

    workspace = get_openclaw_workspace()
    if not workspace:
        return

    installer = OpenClawInstaller(PROJECT_ROOT, workspace)
    if installer.is_installed():
        if not confirm_install(scope):
            log("已取消安装", "INFO")
            return
    installer.install(scope)

def main():
    parser = argparse.ArgumentParser(description='李小暖人格插件安装脚本')
    parser.add_argument('--persona', action='store_true', help='仅生成人格包')
    parser.add_argument('--mcp', action='store_true', help='安装并启动 MCP 服务')
    parser.add_argument('--no-run', action='store_true', help='仅安装，不启动 MCP')
    parser.add_argument('--log', type=str, help='MCP 日志输出路径（默认 logs/mcp.log）')
    parser.add_argument('--trae-config', action='store_true', help='自动修复 Trae MCP 配置路径')
    parser.add_argument('--openclaw', action='store_true', help='安装 OpenClaw 人格插件')
    parser.add_argument('--scope', type=str, choices=['current', 'global'], help='OpenClaw 装载范围')

    args = parser.parse_args()

    if args.persona:
        generate_persona_package()
        return

    if args.mcp:
        install_mcp(run_after=not args.no_run, log_path=args.log)
        return

    if args.trae_config:
        update_trae_config()
        return

    if args.openclaw:
        scope = 'global_session' if args.scope == 'global' else 'current_session'
        install_openclaw(scope)
        return

    choice = show_menu()

    if choice == "0":
        log("已取消安装", "INFO")
        return

    if choice == "1":
        generate_persona_package()
    elif choice == "2":
        install_mcp()
    elif choice == "3":
        scope = ask_session_scope()
        if not confirm_install(scope):
            return
        install_openclaw(scope)

if __name__ == "__main__":
    main()