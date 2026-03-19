import { StorageError, ErrorCode } from './adapters/base.js';
import { EmotionalMemory } from '../types.js';

export interface ErrorLogEntry {
    code: ErrorCode;
    message: string;
    context: string;
    stack?: string;
    timestamp: number;
}

export interface OperationContext {
    operation: string;
    memory_id?: string;
    user_id?: string;
    device_id?: string;
}

class ErrorHandler {
    private logs: ErrorLogEntry[] = [];
    private buffer: Map<string, EmotionalMemory[]> = new Map();
    private isBufferMode: boolean = false;
    private maxLogEntries: number = 1000;

    handle(error: Error | StorageError, context: OperationContext): void {
        const entry: ErrorLogEntry = {
            code: error instanceof StorageError ? error.code : ErrorCode.E004_WRITE_FAILED,
            message: error.message,
            context: JSON.stringify(context),
            stack: error.stack,
            timestamp: Date.now()
        };

        this.logs.push(entry);

        if (this.logs.length > this.maxLogEntries) {
            this.logs = this.logs.slice(-this.maxLogEntries);
        }

        console.error(`[StorageError] ${entry.code}: ${entry.message}`, {
            context: entry.context,
            timestamp: new Date(entry.timestamp).toISOString()
        });
    }

    async retryWithBackoff<T>(
        operation: () => Promise<T>,
        context: OperationContext,
        maxRetries: number = 3
    ): Promise<T> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) {
                    this.handle(
                        error instanceof Error ? error : new Error(String(error)),
                        context
                    );
                    throw error;
                }

                const delay = Math.pow(2, i) * 100;
                await this.sleep(delay);

                this.handle(
                    error instanceof Error ? error : new Error(String(error)),
                    { ...context, operation: `${context.operation} (retry ${i + 1})` }
                );
            }
        }

        throw new Error('Retry failed');
    }

    async enableBufferMode(): Promise<void> {
        this.isBufferMode = true;
        console.warn('[StorageError] Buffer mode enabled - writes will be queued');
    }

    async disableBufferMode(): Promise<void> {
        this.isBufferMode = false;
        console.warn('[StorageError] Buffer mode disabled');
    }

    async flushBuffer(flushFn: (memories: EmotionalMemory[]) => Promise<void>): Promise<void> {
        if (this.buffer.size === 0) return;

        const allMemories: EmotionalMemory[] = [];
        for (const memories of this.buffer.values()) {
            allMemories.push(...memories);
        }

        try {
            await flushFn(allMemories);
            this.buffer.clear();
            await this.disableBufferMode();
        } catch (error) {
            this.handle(
                error instanceof Error ? error : new Error('Buffer flush failed'),
                { operation: 'flushBuffer' }
            );
        }
    }

    addToBuffer(userId: string, memory: EmotionalMemory): void {
        if (!this.buffer.has(userId)) {
            this.buffer.set(userId, []);
        }
        this.buffer.get(userId)!.push(memory);
    }

    getBufferedCount(): number {
        let count = 0;
        for (const memories of this.buffer.values()) {
            count += memories.length;
        }
        return count;
    }

    isInBufferMode(): boolean {
        return this.isBufferMode;
    }

    getRecentLogs(count: number = 50): ErrorLogEntry[] {
        return this.logs.slice(-count);
    }

    getErrorStats(): { total: number; byCode: Record<string, number> } {
        const byCode: Record<string, number> = {};

        for (const log of this.logs) {
            byCode[log.code] = (byCode[log.code] || 0) + 1;
        }

        return {
            total: this.logs.length,
            byCode
        };
    }

    getUserFriendlyMessage(error: StorageError): string {
        switch (error.code) {
            case ErrorCode.E001_DB_CONNECTION_FAILED:
                return '数据库连接失败，已启用缓冲模式';
            case ErrorCode.E002_WRITE_TIMEOUT:
                return '写入超时，数据已暂存，稍后自动同步';
            case ErrorCode.E003_STORAGE_FULL:
                return '存储空间不足，请清理历史记录';
            case ErrorCode.E004_WRITE_FAILED:
                return '写入失败，请稍后重试';
            case ErrorCode.E005_MIGRATION_FAILED:
                return '数据迁移失败，请联系支持';
            case ErrorCode.E006_QUERY_FAILED:
                return '查询失败，请稍后重试';
            case ErrorCode.E007_NOT_FOUND:
                return '数据未找到';
            case ErrorCode.E008_VERSION_CONFLICT:
                return '数据版本冲突，已自动合并';
            default:
                return '发生未知错误，请稍后重试';
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const errorHandler = new ErrorHandler();
export { ErrorHandler };
