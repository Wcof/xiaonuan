import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
    StorageAdapter,
    StorageConfig,
    StorageError,
    ErrorCode
} from './base.js';
import {
    EmotionalMemory,
    EmotionTrajectory,
    HistoryEntry,
    MemoryQuery,
    InterventionLog
} from '../../types.js';

export interface JsonlAdapterConfig extends StorageConfig {
    dbPath?: string;
}

interface JsonlMemory extends EmotionalMemory {
    _rawId?: number;
}

export class JsonlAdapter implements StorageAdapter {
    private dbPath: string;
    private memories: Map<string, JsonlMemory[]> = new Map();
    private histories: Map<string, HistoryEntry[]> = new Map();
    private trajectories: Map<string, EmotionTrajectory[]> = new Map();
    private interventions: InterventionLog[] = [];
    private memoryIdCounter: Map<string, number> = new Map();
    private historyIdCounter: Map<string, number> = new Map();
    private trajectoryIdCounter: Map<string, number> = new Map();
    private interventionIdCounter: number = 0;
    private initialized: boolean = false;
    private fsAccess: typeof import('fs/promises') | null = null;

    constructor(config: JsonlAdapterConfig = {}) {
        this.dbPath = config.dbPath || './gateway_data';
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            this.fsAccess = await import('fs/promises');
            await this.fsAccess.mkdir(this.dbPath, { recursive: true });
            await this.loadFromDisk();
            this.initialized = true;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E001_DB_CONNECTION_FAILED,
                `Failed to initialize JsonlAdapter: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    private getFilePath(type: 'memories' | 'interventions' | 'trajectories' | 'histories'): string {
        return path.join(this.dbPath, `${type}.jsonl`);
    }

    private async loadFromDisk(): Promise<void> {
        try {
            const memoriesPath = this.getFilePath('memories');
            const memoriesData = await this.fsAccess!.readFile(memoriesPath, 'utf-8');
            const memoriesLines = memoriesData.split('\n').filter(line => line.trim());

            for (const line of memoriesLines) {
                try {
                    const data: JsonlMemory = JSON.parse(line);
                    const userId = data.user_id || 'default';
                    if (!this.memories.has(userId)) {
                        this.memories.set(userId, []);
                    }
                    this.memories.get(userId)!.push(data);
                    const id = data._rawId || data.id || 0;
                    const currentMax = this.memoryIdCounter.get(userId) || 0;
                    this.memoryIdCounter.set(userId, Math.max(currentMax, typeof id === 'string' ? parseInt(id) || 0 : id));
                } catch (e) {
                    // Skip invalid lines
                }
            }

            const interventionsPath = this.getFilePath('interventions');
            const interventionsData = await this.fsAccess!.readFile(interventionsPath, 'utf-8');
            const interventionsLines = interventionsData.split('\n').filter(line => line.trim());

            for (const line of interventionsLines) {
                try {
                    const data = JSON.parse(line);
                    this.interventions.push(data);
                    const id = data.id || 0;
                    this.interventionIdCounter = Math.max(this.interventionIdCounter, id);
                } catch (e) {
                    // Skip invalid lines
                }
            }

            const trajectoriesPath = this.getFilePath('trajectories');
            const trajectoriesData = await this.fsAccess!.readFile(trajectoriesPath, 'utf-8');
            const trajectoriesLines = trajectoriesData.split('\n').filter(line => line.trim());

            for (const line of trajectoriesLines) {
                try {
                    const data = JSON.parse(line);
                    const userId = data.user_id || 'default';
                    if (!this.trajectories.has(userId)) {
                        this.trajectories.set(userId, []);
                    }
                    this.trajectories.get(userId)!.push(data);
                    const id = data.id || 0;
                    const currentMax = this.trajectoryIdCounter.get(userId) || 0;
                    this.trajectoryIdCounter.set(userId, Math.max(currentMax, id));
                } catch (e) {
                    // Skip invalid lines
                }
            }
        } catch (error) {
            // Files may not exist yet, that's ok
        }
    }

    private async appendToFile(type: 'memories' | 'interventions' | 'trajectories' | 'histories', data: object): Promise<void> {
        const filePath = this.getFilePath(type);
        const line = JSON.stringify(data) + '\n';
        await this.fsAccess!.appendFile(filePath, line, 'utf-8');
    }

    async saveMemory(memory: EmotionalMemory): Promise<string> {
        await this.ensureInitialized();

        const id = memory.id || uuidv4();
        const now = new Date().toISOString();
        const userId = memory.user_id || 'default';

        const currentMax = this.memoryIdCounter.get(userId) || 0;
        const rawId = currentMax + 1;
        this.memoryIdCounter.set(userId, rawId);

        const savedMemory: JsonlMemory = {
            ...memory,
            id,
            user_id: userId,
            _rawId: rawId,
            created_at: memory.created_at || now,
            updated_at: now
        };

        await this.appendToFile('memories', savedMemory);

        if (!this.memories.has(userId)) {
            this.memories.set(userId, []);
        }
        this.memories.get(userId)!.push(savedMemory);

        return id;
    }

    async getMemory(id: string): Promise<EmotionalMemory | null> {
        await this.ensureInitialized();

        for (const memories of this.memories.values()) {
            const found = memories.find(m => m.id === id);
            if (found) return found;
        }
        return null;
    }

    async getMemories(query: MemoryQuery): Promise<EmotionalMemory[]> {
        await this.ensureInitialized();

        let memories: EmotionalMemory[] = [];

        if (query.user_id) {
            memories = this.memories.get(query.user_id) || [];
        } else {
            for (const userMemories of this.memories.values()) {
                memories = memories.concat(userMemories);
            }
        }

        if (query.type) {
            memories = memories.filter(m => m.type === query.type);
        }
        if (query.start_time) {
            memories = memories.filter(m => m.timestamp >= query.start_time!);
        }
        if (query.end_time) {
            memories = memories.filter(m => m.timestamp <= query.end_time!);
        }
        if (query.topic_id) {
            memories = memories.filter(m => m.topic_id === query.topic_id);
        }
        if (query.before_timestamp) {
            memories = memories.filter(m => m.timestamp < query.before_timestamp!);
        }

        memories.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        if (query.offset) {
            memories = memories.slice(query.offset);
        }
        if (query.limit) {
            memories = memories.slice(0, query.limit);
        }

        return memories;
    }

    async updateMemory(id: string, updates: Partial<EmotionalMemory>): Promise<boolean> {
        await this.ensureInitialized();

        for (const [userId, memories] of this.memories.entries()) {
            const index = memories.findIndex(m => m.id === id);
            if (index !== -1) {
                memories[index] = {
                    ...memories[index],
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                return true;
            }
        }
        return false;
    }

    async deleteMemory(id: string): Promise<boolean> {
        await this.ensureInitialized();

        for (const [userId, memories] of this.memories.entries()) {
            const index = memories.findIndex(m => m.id === id);
            if (index !== -1) {
                memories.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    async addHistory(entry: HistoryEntry): Promise<void> {
        await this.ensureInitialized();

        const id = entry.id || uuidv4();
        const memoryId = entry.memory_id || 'default';

        const currentMax = this.historyIdCounter.get(memoryId) || 0;
        this.historyIdCounter.set(memoryId, currentMax + 1);

        const savedEntry = {
            ...entry,
            id,
            created_at: entry.created_at || new Date().toISOString()
        };

        await this.appendToFile('histories', savedEntry);

        if (!this.histories.has(memoryId)) {
            this.histories.set(memoryId, []);
        }
        this.histories.get(memoryId)!.push(savedEntry);
    }

    async getHistory(memoryId: string): Promise<HistoryEntry[]> {
        await this.ensureInitialized();
        return this.histories.get(memoryId) || [];
    }

    async saveTrajectory(trajectory: EmotionTrajectory): Promise<void> {
        await this.ensureInitialized();

        const userId = trajectory.user_id || 'default';

        const currentMax = this.trajectoryIdCounter.get(userId) || 0;
        const id = currentMax + 1;
        this.trajectoryIdCounter.set(userId, id);

        const savedTrajectory: EmotionTrajectory = {
            ...trajectory,
            id: id as any,
            user_id: userId,
            created_at: new Date().toISOString()
        };

        await this.appendToFile('trajectories', savedTrajectory);

        if (!this.trajectories.has(userId)) {
            this.trajectories.set(userId, []);
        }
        this.trajectories.get(userId)!.push(savedTrajectory);
    }

    async getTrajectories(userId: string, days: number = 7): Promise<EmotionTrajectory[]> {
        await this.ensureInitialized();

        const trajectories = this.trajectories.get(userId) || [];
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        return trajectories
            .filter(t => t.timestamp >= cutoff)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    async saveInterventionLog(log: InterventionLog): Promise<number> {
        await this.ensureInitialized();

        this.interventionIdCounter++;
        const id = this.interventionIdCounter;

        const savedLog = {
            ...log,
            id,
            created_at: new Date().toISOString()
        };

        await this.appendToFile('interventions', savedLog);
        this.interventions.push(savedLog);

        return id;
    }

    async getInterventionLogs(userId: string, limit: number = 50): Promise<InterventionLog[]> {
        await this.ensureInitialized();

        return this.interventions
            .filter(log => log.user_id === userId)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, limit);
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.ensureInitialized();
            return true;
        } catch {
            return false;
        }
    }

    async close(): Promise<void> {
        this.initialized = false;
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
