import { StorageAdapter, StorageConfig } from './base.js';
import { SQLiteAdapter } from './sqlite.js';
import { JsonlAdapter } from './jsonl.js';

export type StorageType = 'sqlite' | 'jsonl';

export class StorageFactory {
    static create(type: StorageType, config?: StorageConfig): StorageAdapter {
        switch (type) {
            case 'sqlite':
                return new SQLiteAdapter(config);
            case 'jsonl':
            default:
                return new JsonlAdapter(config);
        }
    }

    static async createAndInitialize(type: StorageType, config?: StorageConfig): Promise<StorageAdapter> {
        const adapter = StorageFactory.create(type, config);
        await adapter.initialize();
        return adapter;
    }
}
