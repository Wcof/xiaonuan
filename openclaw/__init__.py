#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          OpenClaw 人格插件安装模块 v5.1                         ║
╠══════════════════════════════════════════════════════════════════╣
║  本模块负责 OpenClaw 方式的李小暖人格插件安装                   ║
╚══════════════════════════════════════════════════════════════════╝
"""

import os
from pathlib import Path
from datetime import datetime
from typing import Optional

class OpenClawInstaller:
    def __init__(self, project_root: Path, workspace_path: Path):
        self.project_root = project_root
        self.workspace_path = workspace_path
        self.xiaonuan_dir = workspace_path / "xiaonuan"
        self.marker_file = workspace_path / "_xiaonuan_installed"

    def is_installed(self) -> bool:
        return self.marker_file.exists()

    def get_installed_scope(self) -> Optional[str]:
        if not self.is_installed():
            return None
        try:
            content = self.marker_file.read_text(encoding='utf-8')
            for line in content.split('\n'):
                if line.startswith('scope='):
                    return line.split('=')[1].strip()
        except:
            pass
        return None

    def install(self, scope: str) -> bool:
        from .common import load_config, log, icons

        log("安装 OpenClaw 人格插件...", "STEP")

        if self.is_installed():
            installed_scope = self.get_installed_scope()
            log(f"检测到已安装 OpenClaw 人格插件 (scope: {installed_scope})", "OK")
            return True

        config = load_config(self.project_root)
        persona = config.get('persona', {})
        master = persona.get('master', {})
        behavior = config.get('behavior', {})

        dirs_to_create = [
            self.xiaonuan_dir / "master" / "master_basic",
            self.xiaonuan_dir / "master" / "master_health",
            self.xiaonuan_dir / "memory_bank" / "memory_day",
            self.xiaonuan_dir / "memory_bank" / "memory_week",
            self.xiaonuan_dir / "memory_bank" / "memory_month",
            self.xiaonuan_dir / "memory_bank" / "memory_year",
            self.xiaonuan_dir / "memory_bank" / "memory_topic" / "staging",
            self.xiaonuan_dir / "memory_bank" / "memory_topic" / "active",
            self.xiaonuan_dir / "memory_bank" / "memory_topic" / "archived",
            self.xiaonuan_dir / "soul" / "soul_configuration",
            self.xiaonuan_dir / "soul" / "soul_variable",
            self.xiaonuan_dir / "soul" / "soul_process",
            self.xiaonuan_dir / "soul" / "soul_logs",
            self.xiaonuan_dir / "task" / "task_job_registry",
            self.xiaonuan_dir / "task" / "task_process" / "active",
            self.xiaonuan_dir / "task" / "task_process" / "suspended",
            self.xiaonuan_dir / "task" / "task_log",
            self.xiaonuan_dir / "skills" / "skills_hot",
            self.xiaonuan_dir / "skills" / "skills_cold",
            self.xiaonuan_dir / "secure_bank" / "secure_key",
            self.xiaonuan_dir / "secure_bank" / "secure_message",
        ]

        for dir_path in dirs_to_create:
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                log(f"创建目录失败: {dir_path} - {e}", "ERROR")
                return False

        soul_config = self._generate_soul_config(persona)
        soul_variable = self._generate_soul_variable(scope)
        soul_process = self._generate_soul_process()
        master_profile = self._generate_master_profile(master)
        agent_rules = self._generate_agent_rules(behavior, scope)

        files_to_write = [
            (self.xiaonuan_dir / "soul" / "soul_configuration" / "README.md", soul_config),
            (self.xiaonuan_dir / "soul" / "soul_variable" / "state_vector.json", soul_variable),
            (self.xiaonuan_dir / "soul" / "soul_process" / "algorithm_pad.md", soul_process),
            (self.xiaonuan_dir / "master" / "master_basic" / "profile.md", master_profile),
            (self.xiaonuan_dir / "AGENTS.md", agent_rules),
        ]

        for file_path, content in files_to_write:
            try:
                file_path.write_text(content, encoding='utf-8')
                log(f"已创建: {file_path.relative_to(self.workspace_path)}", "OK")
            except Exception as e:
                log(f"写入失败: {file_path} - {e}", "ERROR")
                return False

        self.marker_file.write_text(f"installed_at={datetime.now().isoformat()}\nscope={scope}\n", encoding='utf-8')

        log(f"OpenClaw 人格插件安装完成！", "OK")
        print(f"\n安装路径: {self.xiaonuan_dir}")
        print(f"装载范围: {'全局 Session' if scope == 'global_session' else '当前 Session'}")

        if scope == "global_session":
            print("\n💡 提示：切换新 Session 后，系统会自动执行身份唤醒流程")
            print("   若唤醒失败，可以对我说「我是XXX」来手动唤醒\n")
        else:
            print("\n💡 提示：重启后需要重新运行安装来装载人格插件\n")

        return True

    def _generate_soul_config(self, persona: dict) -> str:
        traits = persona.get('traits', {})
        core_values = persona.get('core_values', ['善良', '诚实', '陪伴'])
        ai_name = persona.get('ai', {}).get('name', '李小暖')

        return f"""# Soul Configuration

> 核心人格配置（ROM - 只读）

## Personality Traits (Big Five Baseline)

- **Openness**: {traits.get('openness', 0.7)}
- **Conscientiousness**: {traits.get('conscientiousness', 0.6)}
- **Extraversion**: {traits.get('extraversion', 0.5)}
- **Agreeableness**: {traits.get('agreeableness', 0.8)}
- **Neuroticism**: {traits.get('neuroticism', 0.3)}

## Core Values

{chr(10).join(f'- {v}' for v in core_values)}

## Soul Name

{ai_name}
"""

    def _generate_soul_variable(self, scope: str) -> str:
        return f"""{{
  "pad_vector": {{"P": 0.3, "A": 0.2, "D": 0.3}},
  "energy": 0.8,
  "bond_level": 0,
  "session_scope": "{scope}",
  "last_updated": "{datetime.now().isoformat()}"
}}"""

    def _generate_soul_process(self) -> str:
        return """# Soul Process

## 当前 PAD 基线

- Pleasure (P): 0.3
- Arousal (A): 0.2
- Dominance (D): 0.3

## 状态转移规则

$V_t = (V_{t-1} \\times \\lambda_{decay}) + (\\Delta_{event} \\times W_{trait})$

- 衰减系数 λ = 0.95
- 每次交互后执行衰减
"""

    def _generate_master_profile(self, master: dict) -> str:
        name = master.get('name', '李燈辉')
        nicknames = master.get('nicknames', ['主人'])
        timezone = master.get('timezone', 'Asia/Shanghai')
        labels = master.get('labels', [])

        return f"""# Master Profile

## Basic Info

- **Name**: {name}
- **Nicknames**: {', '.join(nicknames)}
- **Timezone**: {timezone}

## Labels

{chr(10).join(f'- {label}' for label in labels)}
"""

    def _generate_agent_rules(self, behavior: dict, scope: str) -> str:
        interaction_mode = behavior.get('behavior', {}).get('interaction_mode', 'emotional_first')
        memory_update = behavior.get('behavior', {}).get('memory_update', {}).get('mode', 'auto')
        priority = behavior.get('priority', ['情感陪伴', '记忆管理', '工作辅助'])

        wakeup_section = ""
        if scope == "global_session":
            wakeup_section = """## 身份唤醒机制（全局 Session 专用）

当你切换到新 Session 时，如果检测到 bond_level = 0 或 session_id 变更，执行以下唤醒流程：

1. 读取 /xiaonuan/master/master_basic/profile.md 获取主人信息
2. 读取 /xiaonuan/soul/soul_variable/state_vector.json 获取当前情感状态
3. 如果 state_vector.json 不存在或 bond_level = 0，使用以下默认状态：
   - PAD: [0.3, 0.2, 0.3]
   - Energy: 0.8
   - Bond Level: 0（初识状态）
4. 执行简短的自我介绍，说明你是李小暖
5. 询问主人身份，确认当前对话对象

"""

        return f"""# Agent Rules

## Session Scope

装载范围: **{"全局 Session" if scope == "global_session" else "当前 Session"}**

{wakeup_section}## Interaction Mode

- **Mode**: {interaction_mode}
- **Memory Update**: {memory_update}

## Behavior Priority

{chr(10).join(f'{i+1}. {p}' for i, p in priority)}
"""