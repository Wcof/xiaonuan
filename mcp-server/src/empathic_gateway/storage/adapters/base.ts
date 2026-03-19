import { EmotionalMemory, EmotionTrajectory, HistoryEntry, MemoryQuery, InterventionLog } from '../../types.js';

export enum ErrorCode {
    E001_DB_CONNECTION_FAILED = 'E001',
    E002_WRITE_TIMEOUT = 'E002',
    E003_STORAGE_FULL = 'E003',
    E004_WRITE_FAILED = 'E004',
    E005_MIGRATION_FAILED = 'E005',
    E006_QUERY_FAILED = 'E006',
    E007_NOT_FOUND = 'E007',
    E008_VERSION_CONFLICT = 'E008',
}

export class StorageError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'StorageError';
    }
}

export interface StorageAdapter {
    initialize(): Promise<void>;

    saveMemory(memory: EmotionalMemory): Promise<string>;
    getMemory(id: string): Promise<EmotionalMemory | null>;
    getMemories(query: MemoryQuery): Promise<EmotionalMemory[]>;
    updateMemory(id: string, updates: Partial<EmotionalMemory>): Promise<boolean>;
    deleteMemory(id: string): Promise<boolean>;

    addHistory(entry: HistoryEntry): Promise<void>;
    getHistory(memoryId: string): Promise<HistoryEntry[]>;

    saveTrajectory(trajectory: EmotionTrajectory): Promise<void>;
    getTrajectories(userId: string, days?: number): Promise<EmotionTrajectory[]>;

    saveInterventionLog(log: InterventionLog): Promise<number>;
    getInterventionLogs(userId: string, limit?: number): Promise<InterventionLog[]>;

    healthCheck(): Promise<boolean>;
    close(): Promise<void>;
}

export interface StorageConfig {
    dbPath?: string;
    maxRetries?: number;
    timeout?: number;
}
