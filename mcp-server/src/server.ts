import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { registerIdentityTool } from './tools/identity.js';
import { registerMemoryTool } from './tools/memory.js';
import { registerPersonaTool, registerUpdateMemoryTool } from './tools/persona.js';
import { registerConfigResources } from './resources/config.js';
import { registerDataResources } from './resources/data.js';

interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

interface ResourceDefinition {
    uri: string;
    name: string;
    mimeType?: string;
    description?: string;
}

export class XiaoNuanServer {
    private server: Server;

    private tools: ToolDefinition[] = [];
    private toolHandlers: Map<string, (params: any) => Promise<any>> = new Map();

    private resources: ResourceDefinition[] = [];
    private resourceHandlers: Map<string, (uri: string) => Promise<any>> = new Map();
    private resourceMimeTypes: Map<string, string> = new Map();

    constructor() {
        this.server = new Server({
            name: 'xiaonuan',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
                resources: {},
            }
        });

        this.setupHandlers();
        this.registerModules();
    }

    private registerModules() {
        const registerTool = (definition: ToolDefinition, handler: (params: any) => Promise<any>) => {
            this.tools.push(definition);
            this.toolHandlers.set(definition.name, handler);
        };

        const registerResource = (definition: ResourceDefinition, handler: (uri: string) => Promise<any>) => {
            this.resources.push(definition);
            this.resourceHandlers.set(definition.uri, handler);
            if (definition.mimeType) {
                this.resourceMimeTypes.set(definition.uri, definition.mimeType);
            }
        };

        // Tools
        registerIdentityTool(registerTool);
        registerMemoryTool(registerTool);
        registerPersonaTool(registerTool);
        registerUpdateMemoryTool(registerTool);

        // Resources
        registerConfigResources(registerResource);
        registerDataResources(registerResource);
    }

    private setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: this.tools,
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
            const { name, arguments: args } = request.params;
            const handler = this.toolHandlers.get(name);

            if (!handler) {
                throw new Error(`Tool not found: ${name}`);
            }

            try {
                const result = await handler(args ?? {});
                return {
                    content: [
                        {
                            type: 'text',
                            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text',
                            text: `Error executing tool ${name}: ${error.message}`
                        }
                    ]
                };
            }
        });

        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return {
                resources: this.resources,
            };
        });

        this.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
            const { uri } = request.params;
            const handler = this.resourceHandlers.get(uri);

            if (!handler) {
                throw new Error(`Resource not found: ${uri}`);
            }

            try {
                const result = await handler(uri);
                return {
                    contents: [
                        {
                            uri,
                            mimeType: this.resourceMimeTypes.get(uri) ?? 'application/json',
                            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                throw new Error(`Error reading resource ${uri}: ${error.message}`);
            }
        });
    }

    async connect(transport: any) {
        await this.server.connect(transport);
    }
}
