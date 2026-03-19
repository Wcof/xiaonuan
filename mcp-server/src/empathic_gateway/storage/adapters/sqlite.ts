import Database from 'better-sqlite3';
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
    InterventionLog,
    MemoryType
} from '../../types.js';

export interface SQLiteAdapterConfig extends StorageConfig {
    dbPath?: string;
}

export class SQLiteAdapter implements StorageAdapter {
    private db: Database.Database | null = null;
    private dbPath: string;
    private initialized: boolean = false;

    constructor(config: SQLiteAdapterConfig = {}) {
        this.dbPath = config.dbPath || './gateway_data/xiaonuan.db';
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            const dbDir = this.dbPath.substring(0, this.dbPath.lastIndexOf('/'));
            if (dbDir) {
                await import('fs').then(fs => fs.mkdirSync(dbDir, { recursive: true }));
            }

            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('busy_timeout = 5000');
            this.createTables();
            this.initialized = true;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E001_DB_CONNECTION_FAILED,
                `Failed to initialize SQLite: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    private createTables(): void {
        if (!this.db) throw new StorageError(ErrorCode.E001_DB_CONNECTION_FAILED, 'Database not initialized');

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                pad_vector TEXT,
                emotion_tags TEXT,
                cognitive_distortions TEXT,
                weight REAL DEFAULT 0.5,
                trigger_importance INTEGER DEFAULT 0,
                related_memories TEXT,
                topic_id TEXT,
                device_id TEXT,
                version INTEGER DEFAULT 1,
                timestamp INTEGER,
                created_at TEXT,
                updated_at TEXT,
                is_archived INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                old_memory TEXT,
                new_memory TEXT,
                event TEXT NOT NULL,
                created_at TEXT,
                actor_id TEXT,
                role TEXT
            );

            CREATE TABLE IF NOT EXISTS emotion_trajectories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                pad_vector TEXT NOT NULL,
                context TEXT,
                created_at TEXT
            );

            CREATE TABLE IF NOT EXISTS intervention_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                timestamp INTEGER NOT NULL,
                trigger_reason TEXT,
                intervention_type TEXT,
                rewrite_intensity REAL,
                original_response TEXT,
                rewritten_response TEXT,
                created_at TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
            CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
            CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
            CREATE INDEX IF NOT EXISTS idx_memories_archived ON memories(is_archived);
            CREATE INDEX IF NOT EXISTS idx_history_memory_id ON history(memory_id);
            CREATE INDEX IF NOT EXISTS idx_trajectories_user_id ON emotion_trajectories(user_id);
            CREATE INDEX IF NOT EXISTS idx_trajectories_timestamp ON emotion_trajectories(timestamp);
            CREATE INDEX IF NOT EXISTS idx_intervention_user ON intervention_logs(user_id);
        `);
    }

    async saveMemory(memory: EmotionalMemory): Promise<string> {
        await this.ensureInitialized();

        const id = memory.id || uuidv4();
        const now = new Date().toISOString();

        try {
            const stmt = this.db!.prepare(`
                INSERT INTO memories (
                    id, user_id, content, type, pad_vector, emotion_tags,
                    cognitive_distortions, weight, trigger_importance,
                    related_memories, topic_id, device_id, version,
                    timestamp, created_at, updated_at, is_archived, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
            `);

            stmt.run(
                id,
                memory.user_id,
                memory.content,
                memory.type,
                JSON.stringify(memory.pad_vector),
                JSON.stringify(memory.emotion_tags),
                JSON.stringify(memory.cognitive_distortions),
                memory.weight,
                memory.trigger_importance ? 1 : 0,
                JSON.stringify(memory.related_memories),
                memory.topic_id || null,
                memory.device_id,
                memory.version,
                memory.timestamp,
                memory.created_at || now,
                memory.updated_at || now
            );

            return id;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to save memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async getMemory(id: string): Promise<EmotionalMemory | null> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                SELECT * FROM memories WHERE id = ? AND is_deleted = 0
            `);
            const row = stmt.get(id) as any;

            if (!row) return null;

            return this.rowToEmotionalMemory(row);
        } catch (error) {
            throw new StorageError(
                ErrorCode.E006_QUERY_FAILED,
                `Failed to get memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async getMemories(query: MemoryQuery): Promise<EmotionalMemory[]> {
        await this.ensureInitialized();

        try {
            let sql = 'SELECT * FROM memories WHERE is_deleted = 0 AND is_archived = 0';
            const params: any[] = [];

            if (query.user_id) {
                sql += ' AND user_id = ?';
                params.push(query.user_id);
            }
            if (query.type) {
                sql += ' AND type = ?';
                params.push(query.type);
            }
            if (query.start_time) {
                sql += ' AND timestamp >= ?';
                params.push(query.start_time);
            }
            if (query.end_time) {
                sql += ' AND timestamp <= ?';
                params.push(query.end_time);
            }
            if (query.topic_id) {
                sql += ' AND topic_id = ?';
                params.push(query.topic_id);
            }
            if (query.before_timestamp) {
                sql += ' AND timestamp < ?';
                params.push(query.before_timestamp);
            }

            sql += ' ORDER BY timestamp DESC';

            if (query.limit) {
                sql += ' LIMIT ?';
                params.push(query.limit);
            }
            if (query.offset) {
                sql += ' OFFSET ?';
                params.push(query.offset);
            }

            const stmt = this.db!.prepare(sql);
            const rows = stmt.all(...params) as any[];

            return rows.map(row => this.rowToEmotionalMemory(row));
        } catch (error) {
            throw new StorageError(
                ErrorCode.E006_QUERY_FAILED,
                `Failed to get memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async updateMemory(id: string, updates: Partial<EmotionalMemory>): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const existing = await this.getMemory(id);
            if (!existing) return false;

            const now = new Date().toISOString();
            const updated = {
                ...existing,
                ...updates,
                updated_at: now,
                version: existing.version + 1
            };

            const stmt = this.db!.prepare(`
                UPDATE memories SET
                    content = ?, type = ?, pad_vector = ?, emotion_tags = ?,
                    cognitive_distortions = ?, weight = ?, trigger_importance = ?,
                    related_memories = ?, topic_id = ?, version = ?, updated_at = ?
                WHERE id = ?
            `);

            const result = stmt.run(
                updated.content,
                updated.type,
                JSON.stringify(updated.pad_vector),
                JSON.stringify(updated.emotion_tags),
                JSON.stringify(updated.cognitive_distortions),
                updated.weight,
                updated.trigger_importance ? 1 : 0,
                JSON.stringify(updated.related_memories),
                updated.topic_id || null,
                updated.version,
                updated.updated_at,
                id
            );

            return result.changes > 0;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async deleteMemory(id: string): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                UPDATE memories SET is_deleted = 1, updated_at = ? WHERE id = ?
            `);
            const result = stmt.run(new Date().toISOString(), id);
            return result.changes > 0;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async addHistory(entry: HistoryEntry): Promise<void> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                INSERT INTO history (id, memory_id, old_memory, new_memory, event, created_at, actor_id, role)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                entry.id || uuidv4(),
                entry.memory_id,
                entry.old_memory || null,
                entry.new_memory || null,
                entry.event,
                entry.created_at || new Date().toISOString(),
                entry.actor_id || null,
                entry.role || null
            );
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to add history: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async getHistory(memoryId: string): Promise<HistoryEntry[]> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                SELECT * FROM history WHERE memory_id = ? ORDER BY created_at DESC
            `);
            const rows = stmt.all(memoryId) as any[];

            return rows.map(row => ({
                id: row.id,
                memory_id: row.memory_id,
                old_memory: row.old_memory,
                new_memory: row.new_memory,
                event: row.event,
                created_at: row.created_at,
                actor_id: row.actor_id,
                role: row.role
            }));
        } catch (error) {
            throw new StorageError(
                ErrorCode.E006_QUERY_FAILED,
                `Failed to get history: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async saveTrajectory(trajectory: EmotionTrajectory): Promise<void> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                INSERT INTO emotion_trajectories (user_id, timestamp, pad_vector, context, created_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            stmt.run(
                trajectory.user_id || 'default',
                trajectory.timestamp,
                JSON.stringify(trajectory.pad_vector),
                trajectory.context || null,
                new Date().toISOString()
            );
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to save trajectory: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async getTrajectories(userId: string, days: number = 7): Promise<EmotionTrajectory[]> {
        await this.ensureInitialized();

        try {
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            const stmt = this.db!.prepare(`
                SELECT * FROM emotion_trajectories
                WHERE user_id = ? AND timestamp >= ?
                ORDER BY timestamp DESC
            `);

            const rows = stmt.all(userId, cutoff) as any[];

            return rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                timestamp: row.timestamp,
                pad_vector: JSON.parse(row.pad_vector),
                context: row.context
            }));
        } catch (error) {
            throw new StorageError(
                ErrorCode.E006_QUERY_FAILED,
                `Failed to get trajectories: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async saveInterventionLog(log: InterventionLog): Promise<number> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                INSERT INTO intervention_logs (user_id, timestamp, trigger_reason, intervention_type, rewrite_intensity, original_response, rewritten_response, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                log.user_id || 'default',
                log.timestamp,
                log.trigger_reason,
                log.intervention_type,
                log.rewrite_intensity,
                log.original_response || null,
                log.rewritten_response || null,
                new Date().toISOString()
            );

            return result.lastInsertRowid as number;
        } catch (error) {
            throw new StorageError(
                ErrorCode.E004_WRITE_FAILED,
                `Failed to save intervention log: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async getInterventionLogs(userId: string, limit: number = 50): Promise<InterventionLog[]> {
        await this.ensureInitialized();

        try {
            const stmt = this.db!.prepare(`
                SELECT * FROM intervention_logs
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            `);

            const rows = stmt.all(userId, limit) as any[];

            return rows.map(row => ({
                id: row.id,
                user_id: row.user_id,
                timestamp: row.timestamp,
                trigger_reason: row.trigger_reason,
                intervention_type: row.intervention_type,
                rewrite_intensity: row.rewrite_intensity,
                original_response: row.original_response,
                rewritten_response: row.rewritten_response
            }));
        } catch (error) {
            throw new StorageError(
                ErrorCode.E006_QUERY_FAILED,
                `Failed to get intervention logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.ensureInitialized();
            this.db!.prepare('SELECT 1').get();
            return true;
        } catch {
            return false;
        }
    }

    async close(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    private rowToEmotionalMemory(row: any): EmotionalMemory {
        return {
            id: row.id,
            content: row.content,
            type: row.type as MemoryType,
            pad_vector: JSON.parse(row.pad_vector || '{"pleasure":0,"arousal":0,"dominance":0}'),
            emotion_tags: JSON.parse(row.emotion_tags || '[]'),
            cognitive_distortions: JSON.parse(row.cognitive_distortions || '[]'),
            weight: row.weight,
            trigger_importance: row.trigger_importance === 1,
            related_memories: JSON.parse(row.related_memories || '[]'),
            topic_id: row.topic_id,
            user_id: row.user_id,
            device_id: row.device_id,
            version: row.version,
            timestamp: row.timestamp,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}
