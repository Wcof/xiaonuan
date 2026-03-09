import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../utils.js';

const IDENTITY_TYPES = new Set(['self', 'master', 'others']);

function isSafeNameSegment(value: string): boolean {
    // Keep names readable while blocking path traversal and path separators.
    return !value.includes('..') && !value.includes('/') && !value.includes('\\') && value.trim().length > 0;
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
                        return `没有找到关于人物 "${name}" 的身份数据。`;
                    }
                    const content = await fs.readFile(targetFile, 'utf-8');
                    return content;
                } else {
                    // List all people in the type directory
                    const files = await fs.readdir(targetDir);
                    const markdownFiles = files.filter(f => f.endsWith('.md'));
                    if (markdownFiles.length === 0) {
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
