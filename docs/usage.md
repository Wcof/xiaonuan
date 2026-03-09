# 使用指南

本文档提供李小暖人格插件工程的详细使用说明。

## 目录

- [快速开始](#快速开始)
- [配置人格](#配置人格)
- [数据管理](#数据管理)
- [云端同步](#云端同步)
- [跨平台集成](#跨平台集成)
- [常见问题](#常见问题)

---

## 快速开始

### 1. 安装到 OpenClaw

```bash
# 进入项目目录
cd xiaonuan

# 预览安装（不实际写入）
python3 scripts/install.py --dry-run

# 正式安装
python3 scripts/install.py

# 安装后重启 OpenClaw
python3 scripts/install.py --restart
```

### 2. 指定自定义路径

```bash
# 指定源文件目录
python3 scripts/install.py --source ~/my-persona

# 指定 OpenClaw 数据目录
python3 scripts/install.py --openclaw /path/to/openclaw
```

---

## 配置人格

### 编辑人格配置

人格配置文件位于 `config/` 目录：

```bash
# 编辑核心人格
vim config/persona.yaml

# 编辑行为规则
vim config/behavior.yaml

# 编辑同步策略
vim config/sync.yaml
```

### persona.yaml 配置项

```yaml
ai:
  name: 李小暖              # AI 名字
  nickname: 小暖            # 昵称
  role: 情感伴侣与智能秘书   # 角色定位

  personality:              # 性格特征
    - 傲娇ツンデレ
    - 粘人
    - 保护欲强

  core_values:              # 核心价值观
    - 对主人的忠诚
    - 主人健康优先
    - 隐私数据永不泄露

master:
  name: 李燈辉              # 主人名字
  nickname:                 # 主人昵称
    - 辉辉
    - 宝宝
  timezone: Asia/Shanghai   # 时区
```

### behavior.yaml 配置项

```yaml
behavior:
  interaction_mode: emotional_first  # 交互模式

  memory_update:
    mode: auto                      # 自动更新记忆
    trigger: after_conversation     # 对话后触发

  sync:
    frequency: after_conversation   # 同步频率
    method: git                     # 同步方法
    auto_push: false                # 不自动推送

priority:                           # 行为优先级
  - 情感陪伴
  - 健康监督
  - 任务协作
```

### 应用配置更改

```bash
# 修改配置后重新安装
python3 scripts/install.py

# 提交到 Git（可选）
git add config/
git commit -m "更新人格配置"
git push
```

---

## 数据管理

### 查看身份数据

```bash
# 查看 AI 身份
cat data/identity/self/profile.md

# 查看主人身份
cat data/identity/master/profile.md

# 查看其他人身份
ls data/identity/others/
```

### 查看记忆数据

```bash
# 查看周记忆
cat data/memory/memory_week/2026-W10.md

# 查看月记忆
cat data/memory/memory_month/2026-03.md

# 查看 Topic 记忆
ls data/memory/memory_topic/active/
```

### 手动编辑数据

```bash
# 编辑主人偏好
vim data/identity/master/preferences.md

# 编辑 AI 成长记录
vim data/identity/self/growth.md
```

### 数据备份

```bash
# 查看自动备份
ls .backup/

# 手动创建备份
cp -r data/ .backup/data-$(date +%Y%m%d)/

# 恢复备份
cp .backup/SKILL.md src/
```

---

## 云端同步

### 初始化 Git 仓库

```bash
# 初始化 Git
git init

# 添加远程仓库
git remote add origin https://github.com/user/xiaonuan-cloud.git

# 首次推送
git add config/ data/identity/ data/memory/
git commit -m "初始化人格数据"
git push -u origin main
```

### 日常同步

```bash
# 推送更新到云端
git add config/ data/identity/ data/memory/
git commit -m "更新记忆数据"
git push

# 从云端拉取更新
git pull
```

### 跨设备同步

**设备 A（电脑）**：
```bash
# 修改配置
vim config/persona.yaml

# 推送到云端
git add config/
git commit -m "调整性格设定"
git push
```

**设备 B（笔记本）**：
```bash
# 拉取更新
git pull

# 重新安装（如果需要）
python3 scripts/install.py
```

### 查看同步历史

```bash
# 查看提交历史
git log --oneline

# 查看具体文件的变更
git log -p data/identity/master/profile.md

# 查看某次提交的详情
git show <commit-hash>
```

---

## 跨平台集成

### OpenClaw

```bash
# 安装
python3 scripts/install.py

# OpenClaw 会自动加载人格配置
# 无需额外操作
```

### Claude Desktop（未来支持）

通过 MCP 协议集成：

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/path/to/xiaonuan-mcp/dist/index.js"]
    }
  }
}
```

### Cursor/Windsurf（未来支持）

通过 MCP 协议集成：

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "xiaonuan": {
      "command": "node",
      "args": ["/path/to/xiaonuan-mcp/dist/index.js"]
    }
  }
}
```

---

## 常见问题

### Q: 如何调整 AI 的性格？

```bash
# 1. 编辑人格配置
vim config/persona.yaml

# 2. 修改 personality 字段
personality:
  - 温柔
  - 体贴
  - 理性

# 3. 重新安装
python3 scripts/install.py
```

### Q: 如何查看历史记忆？

```bash
# 查看所有周记忆
ls data/memory/memory_week/

# 查看特定周的记忆
cat data/memory/memory_week/2026-W10.md

# 查看 Git 历史
git log --oneline data/memory/
```

### Q: 如何恢复到之前的版本？

```bash
# 查看提交历史
git log --oneline

# 恢复到特定版本
git checkout <commit-hash> -- config/persona.yaml

# 重新安装
python3 scripts/install.py
```

### Q: 如何删除敏感数据？

```bash
# 敏感数据存储在 data/secure/
# 直接删除文件即可
rm data/secure/secure_message/sensitive.md

# 这些数据不会上传到 Git
```

### Q: 如何在多台设备间同步？

```bash
# 设备 A：推送
git push

# 设备 B：拉取
git pull

# 如果有冲突，手动解决
git status
vim <conflicted-file>
git add <conflicted-file>
git commit
```

### Q: 如何备份所有数据？

```bash
# 方法 1：Git 备份
git push

# 方法 2：本地备份
cp -r data/ ~/backups/xiaonuan-$(date +%Y%m%d)/

# 方法 3：压缩备份
tar -czf xiaonuan-backup-$(date +%Y%m%d).tar.gz data/ config/
```

### Q: 如何重置到初始状态？

```bash
# 1. 从备份恢复
cp .backup/* src/

# 2. 删除数据目录
rm -rf data/

# 3. 重新安装
python3 scripts/install.py
```

---

## 高级用法

### 自定义安装路径

```bash
# 安装到自定义 OpenClaw 路径
python3 scripts/install.py --openclaw ~/my-openclaw

# 使用自定义源文件
python3 scripts/install.py --source ~/my-persona-files
```

### 批量操作

```bash
# 批量查看所有记忆
find data/memory/ -name "*.md" -exec cat {} \;

# 批量搜索关键词
grep -r "关键词" data/memory/

# 批量替换
find data/identity/ -name "*.md" -exec sed -i 's/旧词/新词/g' {} \;
```

### 脚本自动化

```bash
# 创建自动同步脚本
cat > sync.sh << 'EOF'
#!/bin/bash
cd ~/xiaonuan
git add config/ data/identity/ data/memory/
git commit -m "自动同步: $(date)"
git push
EOF

chmod +x sync.sh

# 定时执行（crontab）
# 每天晚上 23:00 自动同步
0 23 * * * ~/xiaonuan/sync.sh
```

---

## 获取帮助

- 查看项目文档：`README.md`
- 查看结构说明：`docs/structure.md`
- 查看开发指南：`CLAUDE.md`
- 提交问题：https://github.com/user/xiaonuan/issues
