#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { XiaoNuanServer } from './server.js';

async function main() {
    const server = new XiaoNuanServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
