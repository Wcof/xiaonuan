import { PADVector, GatewayMeta, MemoryCandidate } from '../types.js';

export interface EndOfTurnConfig {
    dataPath?: string;
    enablePADPersistence?: boolean;
    enableMemorySync?: boolean;
    enableTaskSync?: boolean;
}

export interface EndOfTurnResult {
    pad_persisted: boolean;
    memory_synced: boolean;
    task_synced: boolean;
    errors: string[];
}

export class EndOfTurnHook {
    private config: EndOfTurnConfig;
    private initialized: boolean = false;

    constructor(config: EndOfTurnConfig = {}) {
        this.config = {
            dataPath: './data',
            enablePADPersistence: true,
            enableMemorySync: false,
            enableTaskSync: false,
            ...config
        };
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        try {
            const { mkdir } = await import('fs/promises');
            await mkdir(this.getMemoryDir('memory_day'), { recursive: true });
            await mkdir(this.getSoulVariableDir(), { recursive: true });
        } catch (error) {
            // Directory may already exist
        }
        
        this.initialized = true;
    }

    private getMemoryDir(kind: 'memory_day' | 'memory_week' | 'memory_month' | 'memory_topic'): string {
        return `${this.config.dataPath}/memory/${kind}`;
    }

    private getSoulVariableDir(): string {
        return `${this.config.dataPath}/soul/soul_variable`;
    }

    async execute(
        padVector: PADVector,
        meta: GatewayMeta,
        context?: {
            rawQuery?: string;
            response?: string;
            userId?: string;
        }
    ): Promise<EndOfTurnResult> {
        await this.initialize();
        
        const result: EndOfTurnResult = {
            pad_persisted: false,
            memory_synced: false,
            task_synced: false,
            errors: []
        };

        if (this.config.enablePADPersistence) {
            try {
                await this.persistPADState(padVector, context?.userId);
                result.pad_persisted = true;
            } catch (error) {
                result.errors.push(`PAD persistence failed: ${error}`);
            }
        }

        if (this.config.enableMemorySync && context?.rawQuery) {
            try {
                await this.syncMemory(context.rawQuery, meta, context.userId);
                result.memory_synced = true;
            } catch (error) {
                result.errors.push(`Memory sync failed: ${error}`);
            }
        }

        if (this.config.enableTaskSync && context?.response) {
            try {
                await this.syncTaskState(context.response, context.userId);
                result.task_synced = true;
            } catch (error) {
                result.errors.push(`Task sync failed: ${error}`);
            }
        }

        return result;
    }

    private async persistPADState(padVector: PADVector, userId?: string): Promise<void> {
        const { writeFile } = await import('fs/promises');
        const stateFile = `${this.getSoulVariableDir()}/state_vector.json`;
        
        const stateData = {
            user_id: userId || 'default',
            pad_vector: padVector,
            timestamp: Date.now(),
            updated_at: new Date().toISOString()
        };

        await writeFile(stateFile, JSON.stringify(stateData, null, 2), 'utf-8');
    }

    private async syncMemory(
        rawQuery: string,
        meta: GatewayMeta,
        userId?: string
    ): Promise<void> {
        const { readFile, writeFile } = await import('fs/promises');
        const dayFile = `${this.getMemoryDir('memory_day')}/${new Date().toISOString().split('T')[0]}.md`;
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        const emotionState = meta.pad_vector.pleasure > 0 ? '正面' : '负面';
        const entry = `## ${dateStr} ${timeStr}\n- **Event**: ${rawQuery.substring(0, 100)}${rawQuery.length > 100 ? '...' : ''}\n- **Emotion**: ${emotionState} (P=${meta.pad_vector.pleasure.toFixed(2)}, A=${meta.pad_vector.arousal.toFixed(2)}, D=${meta.pad_vector.dominance.toFixed(2)})\n- **Risk**: ${meta.risk_level}\n`;

        let content = '';
        try {
            content = await readFile(dayFile, 'utf-8');
        } catch {
            content = `# Day Memory — ${dateStr}\n\n## Timeline\n`;
        }

        if (!content.includes('## Timeline')) {
            content = `# Day Memory — ${dateStr}\n\n## Timeline\n` + content;
        }

        content = content.trim() + '\n' + entry + '\n';
        await writeFile(dayFile, content, 'utf-8');
    }

    private async syncTaskState(response: string, userId?: string): Promise<void> {
        const { appendFile } = await import('fs/promises');
        const taskFile = `${this.config.dataPath}/task_sync.log`;
        
        const taskEntry = {
            type: 'task_sync',
            response_preview: response.substring(0, 100),
            timestamp: Date.now(),
            user_id: userId || 'default'
        };

        await appendFile(taskFile, JSON.stringify(taskEntry) + '\n', 'utf-8');
    }

    async readCurrentPADState(userId?: string): Promise<PADVector | null> {
        try {
            const { readFile } = await import('fs/promises');
            const stateFile = `${this.getSoulVariableDir()}/state_vector.json`;
            const data = await readFile(stateFile, 'utf-8');
            const state = JSON.parse(data);
            
            if (userId && state.user_id !== userId) {
                return null;
            }
            
            return state.pad_vector;
        } catch (error) {
            return null;
        }
    }

    async readMemoryHistory(days: number = 7, userId?: string): Promise<any[]> {
        try {
            return [];
        } catch (error) {
            return [];
        }
    }
}

export const defaultEndOfTurnHook = new EndOfTurnHook();
