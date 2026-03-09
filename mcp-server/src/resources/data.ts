import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../utils.js';

async function listMarkdownNames(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir).catch(() => []);
    return files.filter((f) => f.endsWith('.md')).sort((a, b) => b.localeCompare(a));
}

export function registerDataResources(registerResource: (def: any, handler: any) => void) {
    registerResource(
        {
            uri: 'data://identity/self',
            name: 'AI Identity Data',
            mimeType: 'application/json',
            description: '李小暖自身认知档案（仅返回摘要）'
        },
        async () => {
            const dir = path.join(PATHS.identity, 'self');
            const files = await listMarkdownNames(dir);
            return {
                scope: 'self',
                files: files.map((f) => f.replace(/\.md$/, '')),
            };
        }
    );

    registerResource(
        {
            uri: 'data://identity/master',
            name: 'Master Identity Data',
            mimeType: 'application/json',
            description: '关于主人的认知档案（仅返回摘要）'
        },
        async () => {
            const dir = path.join(PATHS.identity, 'master');
            const files = await listMarkdownNames(dir);
            return {
                scope: 'master',
                files: files.map((f) => f.replace(/\.md$/, '')),
            };
        }
    );

    registerResource(
        {
            uri: 'data://memory/recent',
            name: 'Recent Memory',
            mimeType: 'application/json',
            description: '近期脱敏记忆索引（不暴露 memory_day）'
        },
        async () => {
            const memoryKinds = ['memory_week', 'memory_month', 'memory_topic'];
            const recent = await Promise.all(memoryKinds.map(async (kind) => {
                const dir = path.join(PATHS.memory, kind);
                const files = await listMarkdownNames(dir);
                return {
                    type: kind.replace('memory_', ''),
                    recent: files.slice(0, 5).map((f) => f.replace(/\.md$/, '')),
                };
            }));

            return {
                security: 'memory_day is intentionally excluded',
                items: recent,
            };
        }
    );
}
