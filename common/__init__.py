#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║          李小暖 · 公共模块 v5.1                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  本模块包含各安装方式共享的工具函数和配置加载                    ║
╚══════════════════════════════════════════════════════════════════╝
"""

import yaml
from pathlib import Path
from typing import Optional

icons = {"INFO": "   ", "OK": " ✅", "WARN": " ⚠️ ", "ERROR": " ❌", "STEP": " ▶"}

def log(msg: str, level: str = "INFO"):
    print(f"{icons.get(level, '   ')} {msg}")

def load_config(project_root: Optional[Path] = None) -> dict:
    """加载配置文件"""
    if project_root is None:
        project_root = Path(__file__).parent.parent

    config = {}
    config_dir = project_root / "config"

    for file in ["persona.yaml", "behavior.yaml", "sync.yaml"]:
        path = config_dir / file
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                config[file.replace('.yaml', '')] = yaml.safe_load(f)

    return config

__all__ = ['log', 'icons', 'load_config']