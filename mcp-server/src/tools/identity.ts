import fs from 'fs/promises';
import path from 'path';
import { PATHS, projectRoot } from '../utils.js';

const IDENTITY_TYPES = new Set(['self', 'master', 'others']);
const DEFAULT_SELF_NAMES = new Set(['李小暖', '小暖', 'xiaonuan', 'XiaoNuan']);

function isSafeNameSegment(value: string): boolean {
    // Keep names readable while blocking path traversal and path separators.
    return !value.includes('..') && !value.includes('/') && !value.includes('\\') && value.trim().length > 0;
}

function extractSection(markdown: string, heading: string): string | null {
    const lines = markdown.split(/\r?\n/);
    const startIndex = lines.findIndex(line => line.trim() === heading);
    if (startIndex === -1) return null;

    const body: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i += 1) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) break;
        if (trimmed.startsWith('## ') && trimmed !== heading) break;
        body.push(line);
    }
    const result = body.join('\n').trim();
    return result.length > 0 ? result : null;
}

function stripFrontmatter(markdown: string): string {
    if (!markdown.startsWith('---')) return markdown;
    const endIndex = markdown.indexOf('\n---', 3);
    if (endIndex === -1) return markdown;
    return markdown.slice(endIndex + 4).trim();
}

function extractIntro(markdown: string, maxLines: number): string {
    const content = stripFrontmatter(markdown);
    const lines = content.split(/\r?\n/).map(line => line.trim());
    const kept: string[] = [];
    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('# ')) continue;
        kept.push(line);
        if (kept.length >= maxLines) break;
    }
    return kept.join('\n').trim();
}

async function buildSelfIdentityFromSrc(): Promise<string | null> {
    const skillPath = path.join(projectRoot, 'src', 'SKILL.md');
    const soulPath = path.join(projectRoot, 'src', 'soul_base.md');

    const skillContent = await fs.readFile(skillPath, 'utf-8').catch(() => '');
    const soulContent = await fs.readFile(soulPath, 'utf-8').catch(() => '');
    if (!skillContent && !soulContent) return null;

    const skillOverview =
        extractSection(skillContent, '## 概述') ??
        extractSection(skillContent, '## Overview') ??
        extractIntro(skillContent, 12);
    const soulOverview =
        extractSection(soulContent, '## 1. 文件系统映射 (File System Mapping)') ??
        extractSection(soulContent, '## 1. 文件系统映射') ??
        extractIntro(soulContent, 12);

    const segments = [
        '# 李小暖 · 自身身份档案（自动生成）',
        '',
        '> 来源：src/SKILL.md、src/soul_base.md（自动汇总）',
        '',
        '## 人格概述',
        skillOverview || '（未提取到概述内容）',
        '',
        '## 灵魂系统定位',
        soulOverview || '（未提取到灵魂系统内容）'
    ];

    return segments.join('\n').trim();
}

export function registerIdentityTool(registerTool: (def: any, handler: any) => void) {
    registerTool(
        {
            name: 'get_identity',
            description: '获取身份数据档案',
            inputSchema: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['self', 'master', 'others'],
                        description: '身份类型 (self: AI自身, master: 主人, others: 其他人)'
                    },
                    name: {
                        type: 'string',
                        description: '具体人员名称（可选，如不提供则返回该类型下所有人的概览或列表）'
                    }
                },
                required: ['type']
            }
        },
        async (params: any) => {
            const { type, name } = params ?? {};
            if (typeof type !== 'string' || !IDENTITY_TYPES.has(type)) {
                throw new Error('参数 type 无效，必须是 self/master/others。');
            }
            const targetDir = path.join(PATHS.identity, type);

            try {
                const stats = await fs.stat(targetDir).catch(() => null);
                if (!stats || !stats.isDirectory()) {
                    return `没有找到关于 ${type} 的身份信息文档区。`;
                }

                if (name) {
                    if (typeof name !== 'string' || !isSafeNameSegment(name)) {
                        throw new Error('参数 name 无效，不能包含路径分隔符或空值。');
                    }
                    // Read specific person
                    const targetFile = path.join(targetDir, `${name}.md`);
                    const fileStats = await fs.stat(targetFile).catch(() => null);
                    if (!fileStats || !fileStats.isFile()) {
                        if (type === 'self' && DEFAULT_SELF_NAMES.has(name)) {
                            const generated = await buildSelfIdentityFromSrc();
                            if (generated) {
                                await fs.mkdir(targetDir, { recursive: true });
                                const defaultFile = path.join(targetDir, '李小暖.md');
                                await fs.writeFile(defaultFile, generated, 'utf-8');
                                return generated;
                            }
                        }
                        return `没有找到关于人物 "${name}" 的身份数据。`;
                    }
                    const content = await fs.readFile(targetFile, 'utf-8');
                    return content;
                } else {
                    // List all people in the type directory
                    const files = await fs.readdir(targetDir);
                    const markdownFiles = files.filter(f => f.endsWith('.md'));
                    if (markdownFiles.length === 0) {
                        if (type === 'self') {
                            const generated = await buildSelfIdentityFromSrc();
                            if (generated) {
                                await fs.mkdir(targetDir, { recursive: true });
                                const defaultFile = path.join(targetDir, '李小暖.md');
                                await fs.writeFile(defaultFile, generated, 'utf-8');
                                return generated;
                            }
                        }
                        return `身份类型 ${type} 下没有任何档案。`;
                    }

                    let overview = `身份类型 ${type} 下有以下档案：\n`;
                    for (const file of markdownFiles) {
                        overview += `- ${file.replace('.md', '')}\n`;
                    }
                    return overview;
                }
            } catch (error: any) {
                throw new Error(`读取身份数据时发生错误: ${error.message}`);
            }
        }
    );
}
