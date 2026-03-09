import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { PATHS } from '../utils.js';

const WRITABLE_MEMORY_TYPES = new Set(['week', 'month', 'topic']);

function isSafeSegment(value: string): boolean {
    return !value.includes('..') && !value.includes('/') && !value.includes('\\') && value.trim().length > 0;
}

export function registerPersonaTool(registerTool: (def: any, handler: any) => void) {
    registerTool(
        {
            name: 'get_persona',
            description: '获取李小暖的核心人格配置与行为准则。',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        },
        async () => {
            try {
                const personaPath = path.join(PATHS.config, 'persona.yaml');
                const behaviorPath = path.join(PATHS.config, 'behavior.yaml');

                let personaData = {};
                let behaviorData = {};

                try {
                    const content = await fs.readFile(personaPath, 'utf-8');
                    personaData = yaml.parse(content);
                } catch { }

                try {
                    const content = await fs.readFile(behaviorPath, 'utf-8');
                    behaviorData = yaml.parse(content);
                } catch { }

                return {
                    persona: personaData,
                    behavior: behaviorData
                };
            } catch (error: any) {
                throw new Error(`读取人格配置时发生错误: ${error.message}`);
            }
        }
    );
}

export function registerUpdateMemoryTool(registerTool: (def: any, handler: any) => void) {
    registerTool(
        {
            name: 'update_memory',
            description: '【慎用】向记忆库添加新记忆。',
            inputSchema: {
                type: 'object',
                properties: {
                    type: {
                        type: 'string',
                        enum: ['week', 'month', 'topic'],
                        description: '记忆类型'
                    },
                    date: {
                        type: 'string',
                        description: '具体日期或主题'
                    },
                    content: {
                        type: 'string',
                        description: '要添加或覆盖的记忆内容与标签等，Markdown格式。'
                    }
                },
                required: ['type', 'date', 'content']
            }
        },
        async (params: any) => {
            const { type, date, content } = params;
            if (typeof type !== 'string' || !WRITABLE_MEMORY_TYPES.has(type)) {
                throw new Error('参数 type 无效，必须是 week/month/topic。');
            }
            if (typeof date !== 'string' || !isSafeSegment(date)) {
                throw new Error('参数 date 无效，不能包含路径分隔符或空值。');
            }
            if (typeof content !== 'string' || content.trim().length === 0) {
                throw new Error('参数 content 无效，不能为空。');
            }
            const dirName = `memory_${type}`;
            const targetDir = path.join(PATHS.memory, dirName);

            try {
                await fs.mkdir(targetDir, { recursive: true });
                const targetFile = path.join(targetDir, `${date}.md`);
                await fs.writeFile(targetFile, content, 'utf-8');
                return `成功更新记忆文件: ${targetFile}`;
            } catch (error: any) {
                throw new Error(`写入记忆数据时发生错误: ${error.message}`);
            }
        }
    );
}
