#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { XiaoNuanServer } from './server.js';

async function main() {
    const server = new XiaoNuanServer();
    const transport = new StdioServerTransport();
    process.stdin.on('data', (chunk) => {
        const text = chunk.toString().trim();
        if (text.length > 0) {
            console.error('[xiaonuan] stdin:', text);
        }
    });
    await server.connect(transport);
    console.error('[xiaonuan] MCP server connected (stdio). Press Ctrl+C to stop.');
    if (process.env.XIAONUAN_HEARTBEAT === '1') {
        setInterval(() => {
            console.error('[xiaonuan] heartbeat: server running');
        }, 10000);
    }
    process.stdin.resume();
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
