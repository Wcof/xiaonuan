import { MemoryCandidate, InterventionLog, EmotionTrajectory, PADVector } from '../types.js';
import fs from 'fs/promises';
import path from 'path';

export interface StorageConfig {
    dbPath?: string;
    storageType?: 'memory' | 'jsonl';
}

export class StorageManager {
    private dbPath: string;
    private storageType: 'memory' | 'jsonl';
    private memories: Map<string, MemoryCandidate[]> = new Map();
    private interventionLogs: InterventionLog[] = [];
    private emotionTrajectories: Map<string, EmotionTrajectory[]> = new Map();
    private memoryIdCounter: Map<string, number> = new Map();
    private logIdCounter: number = 0;
    private trajectoryIdCounter: Map<string, number> = new Map();
    private initialized: boolean = false;

    constructor(config: StorageConfig = {}) {
        this.dbPath = config.dbPath || './gateway_data';
        this.storageType = config.storageType || 'jsonl';
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        
        if (this.storageType === 'jsonl') {
            await this.ensureDirectory();
            await this.loadFromDisk();
        }
        this.initialized = true;
    }

    private async ensureDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.dbPath, { recursive: true });
        } catch (error) {
            // Directory may already exist
        }
    }

    private getFilePath(type: 'memories' | 'interventions' | 'trajectories'): string {
        return path.join(this.dbPath, `${type}.jsonl`);
    }

    private async loadFromDisk(): Promise<void> {
        try {
            const memoriesPath = this.getFilePath('memories');
            const memoriesData = await fs.readFile(memoriesPath, 'utf-8');
            const memoriesLines = memoriesData.split('\n').filter(line => line.trim());
            
            for (const line of memoriesLines) {
                try {
                    const data = JSON.parse(line);
                    const userId = data.user_id || 'default';
                    if (!this.memories.has(userId)) {
                        this.memories.set(userId, []);
                    }
                    this.memories.get(userId)!.push(data);
                    const id = data.id || 0;
                    const currentMax = this.memoryIdCounter.get(userId) || 0;
                    this.memoryIdCounter.set(userId, Math.max(currentMax, id));
                } catch (e) {
                    // Skip invalid lines
                }
            }

            const interventionsPath = this.getFilePath('interventions');
            const interventionsData = await fs.readFile(interventionsPath, 'utf-8');
            const interventionsLines = interventionsData.split('\n').filter(line => line.trim());
            
            for (const line of interventionsLines) {
                try {
                    const data = JSON.parse(line);
                    this.interventionLogs.push(data);
                    const id = data.id || 0;
                    this.logIdCounter = Math.max(this.logIdCounter, id);
                } catch (e) {
                    // Skip invalid lines
                }
            }

            const trajectoriesPath = this.getFilePath('trajectories');
            const trajectoriesData = await fs.readFile(trajectoriesPath, 'utf-8');
            const trajectoriesLines = trajectoriesData.split('\n').filter(line => line.trim());
            
            for (const line of trajectoriesLines) {
                try {
                    const data = JSON.parse(line);
                    const userId = data.user_id || 'default';
                    if (!this.emotionTrajectories.has(userId)) {
                        this.emotionTrajectories.set(userId, []);
                    }
                    this.emotionTrajectories.get(userId)!.push(data);
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

    private async appendToFile(type: 'memories' | 'interventions' | 'trajectories', data: object): Promise<void> {
        if (this.storageType !== 'jsonl') return;
        
        const filePath = this.getFilePath(type);
        const line = JSON.stringify(data) + '\n';
        await fs.appendFile(filePath, line, 'utf-8');
    }

    async saveMemory(memory: MemoryCandidate, userId: string = 'default'): Promise<number> {
        await this.initialize();
        
        const currentMax = this.memoryIdCounter.get(userId) || 0;
        const id = currentMax + 1;
        this.memoryIdCounter.set(userId, id);
        
        const savedMemory = {
            ...memory,
            id,
            user_id: userId,
            created_at: Date.now()
        };

        if (this.storageType === 'jsonl') {
            await this.appendToFile('memories', savedMemory);
        }
        
        if (!this.memories.has(userId)) {
            this.memories.set(userId, []);
        }
        this.memories.get(userId)!.push(savedMemory);
        
        return id;
    }

    async getMemories(
        userId: string = 'default',
        startTime?: number,
        endTime?: number,
        emotionLevel?: number
    ): Promise<MemoryCandidate[]> {
        await this.initialize();
        
        let memories = this.memories.get(userId) || [];

        if (startTime) {
            memories = memories.filter(m => m.timestamp >= startTime);
        }
        if (endTime) {
            memories = memories.filter(m => m.timestamp <= endTime);
        }

        return memories;
    }

    async getMemory(id: number, userId: string = 'default'): Promise<MemoryCandidate | null> {
        await this.initialize();
        const memories = this.memories.get(userId) || [];
        return memories.find(m => m.id === id) || null;
    }

    async updateMemory(id: number, updates: Partial<MemoryCandidate>, userId: string = 'default'): Promise<boolean> {
        await this.initialize();
        const memories = this.memories.get(userId) || [];
        const index = memories.findIndex(m => m.id === id);
        
        if (index === -1) {
            return false;
        }

        memories[index] = { ...memories[index], ...updates, updated_at: Date.now() };
        return true;
    }

    async deleteMemory(id: number, userId: string = 'default'): Promise<boolean> {
        await this.initialize();
        const memories = this.memories.get(userId) || [];
        const index = memories.findIndex(m => m.id === id);
        
        if (index === -1) {
            return false;
        }

        memories.splice(index, 1);
        return true;
    }

    async saveInterventionLog(log: Omit<InterventionLog, 'id'>): Promise<number> {
        await this.initialize();
        
        this.logIdCounter++;
        const id = this.logIdCounter;
        
        const savedLog = {
            ...log,
            id,
            created_at: Date.now()
        };

        if (this.storageType === 'jsonl') {
            await this.appendToFile('interventions', savedLog);
        }
        
        this.interventionLogs.push(savedLog);
        return id;
    }

    async getInterventionLogs(
        userId: string = 'default',
        limit: number = 50
    ): Promise<InterventionLog[]> {
        await this.initialize();
        return this.interventionLogs
            .filter(log => log.user_id === userId)
            .slice(-limit);
    }

    async saveEmotionTrajectory(trajectory: Omit<EmotionTrajectory, 'id'>, userId: string = 'default'): Promise<number> {
        await this.initialize();
        
        const currentMax = this.trajectoryIdCounter.get(userId) || 0;
        const id = currentMax + 1;
        this.trajectoryIdCounter.set(userId, id);
        
        const savedTrajectory: EmotionTrajectory = {
            ...trajectory,
            id,
            user_id: userId,
            created_at: new Date().toISOString()
        };

        if (this.storageType === 'jsonl') {
            await this.appendToFile('trajectories', savedTrajectory);
        }
        
        if (!this.emotionTrajectories.has(userId)) {
            this.emotionTrajectories.set(userId, []);
        }
        this.emotionTrajectories.get(userId)!.push(savedTrajectory);
        
        return id;
    }

    async getEmotionTrajectory(
        userId: string = 'default',
        days: number = 7
    ): Promise<EmotionTrajectory[]> {
        await this.initialize();
        const trajectories = this.emotionTrajectories.get(userId) || [];
        const now = Date.now();
        const cutoff = now - (days * 24 * 60 * 60 * 1000);

        return trajectories.filter(t => t.timestamp >= cutoff);
    }

    async getRecentPADState(userId: string = 'default'): Promise<PADVector | null> {
        const trajectories = await this.getEmotionTrajectory(userId, 1);
        if (trajectories.length === 0) {
            return null;
        }
        return trajectories[trajectories.length - 1].pad_vector;
    }

    async clearUserData(userId: string = 'default'): Promise<void> {
        await this.initialize();
        this.memories.delete(userId);
        this.emotionTrajectories.delete(userId);
        this.interventionLogs = this.interventionLogs.filter(log => log.user_id !== userId);
    }
}

export const storageManager = new StorageManager();
