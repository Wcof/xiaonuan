import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../utils.js';

const MEMORY_TYPES = new Set(['week', 'month', 'topic']);

function isSafeSegment(value: string): boolean {
    return !value.includes('..') && !value.includes('/') && !value.includes('\\') && value.trim().length > 0;
}

export function registerMemoryTool(registerTool: (def: any, handler: any) => void) {
    registerTool(
        {
            name: 'get_memory',
            description: '获取记忆数据',
            inputSchema: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['week', 'month', 'topic'],
                        description: '记忆类型，对应：memory_week, memory_month, memory_topic（不暴露 memory_day）'
                    },
                    date: {
                        type: 'string',
                        description: '具体日期或主题名称（如 2026-03-09 或 AI_Plan）。可选，不填则列出近期相关记忆。'
                    }
                },
                required: ['type']
            }
        },
        async (params: any) => {
            const { type, date } = params ?? {};
            if (typeof type !== 'string' || !MEMORY_TYPES.has(type)) {
                throw new Error('参数 type 无效，必须是 week/month/topic。');
            }
            const dirName = `memory_${type}`;
            const targetDir = path.join(PATHS.memory, dirName);

            try {
                const stats = await fs.stat(targetDir).catch(() => null);
                if (!stats || !stats.isDirectory()) {
                    return `没有找到名为 ${dirName} 的记忆库。`;
                }

                if (date) {
                    if (typeof date !== 'string' || !isSafeSegment(date)) {
                        throw new Error('参数 date 无效，不能包含路径分隔符或空值。');
                    }
                    const targetFile = path.join(targetDir, `${date}.md`);
                    const fileStats = await fs.stat(targetFile).catch(() => null);
                    if (!fileStats || !fileStats.isFile()) {
                        return `没有在 ${dirName} 下找到关于 "${date}" 的记忆记录。`;
                    }
                    const content = await fs.readFile(targetFile, 'utf-8');
                    return content;
                } else {
                    const files = await fs.readdir(targetDir);
                    const markdownFiles = files.filter(f => f.endsWith('.md'))
                        .sort((a, b) => b.localeCompare(a)); // sort descending

                    if (markdownFiles.length === 0) {
                        return `${dirName} 记忆库中暂时没有记录。`;
                    }

                    let overview = `${dirName} 记忆库中最近的记录有：\n`;
                    for (const file of markdownFiles.slice(0, 10)) {
                        overview += `- ${file.replace('.md', '')}\n`;
                    }
                    if (markdownFiles.length > 10) {
                        overview += `\n...还有更多。可以使用具体 date 参数读取。`;
                    }
                    return overview;
                }
            } catch (error: any) {
                throw new Error(`读取记忆数据时发生错误: ${error.message}`);
            }
        }
    );
}
