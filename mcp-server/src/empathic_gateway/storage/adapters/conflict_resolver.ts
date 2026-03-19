import { EmotionalMemory, PADVector } from '../../types.js';
import { v4 as uuidv4 } from 'uuid';

export interface MergeResult {
    merged: EmotionalMemory;
    hasConflict: boolean;
    conflictResolved: boolean;
    strategy: MergeStrategy;
}

export type MergeStrategy =
    | 'full_merge'      // 完全合并
    | 'partial_merge'   // 部分合并（有冲突标记）
    | 'lww';           // Last-Write-Wins

export interface MergeOptions {
    enableTagUnion?: boolean;       // 标签是否取并集
    enablePadAverage?: boolean;      // PAD 向量是否时间加权平均
    enableWeightRecalc?: boolean;    // 权重是否重新计算
    conflictThreshold?: number;       // 冲突阈值
}

const DEFAULT_OPTIONS: MergeOptions = {
    enableTagUnion: true,
    enablePadAverage: true,
    enableWeightRecalc: true,
    conflictThreshold: 0.5,
};

export class ConflictResolver {
    private options: MergeOptions;

    constructor(options: MergeOptions = DEFAULT_OPTIONS) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    merge(local: EmotionalMemory, remote: EmotionalMemory): MergeResult {
        if (this.isSameContent(local, remote)) {
            return {
                merged: this.mergeWithoutConflict(local, remote),
                hasConflict: false,
                conflictResolved: true,
                strategy: 'full_merge'
            };
        }

        const hasContentConflict = local.content !== remote.content;
        const hasVectorConflict = !this.isPadVectorEqual(local.pad_vector, remote.pad_vector);

        if (!hasContentConflict) {
            return {
                merged: this.mergeWithVectorConflict(local, remote),
                hasConflict: false,
                conflictResolved: true,
                strategy: 'full_merge'
            };
        }

        if (hasContentConflict && hasVectorConflict) {
            return {
                merged: this.mergeWithAllConflicts(local, remote),
                hasConflict: true,
                conflictResolved: false,
                strategy: 'partial_merge'
            };
        }

        return this.fallbackToLWW(local, remote);
    }

    private isSameContent(local: EmotionalMemory, remote: EmotionalMemory): boolean {
        return local.content === remote.content &&
               local.type === remote.type &&
               local.topic_id === remote.topic_id;
    }

    private isPadVectorEqual(a: PADVector, b: PADVector): boolean {
        const threshold = 0.01;
        return Math.abs(a.pleasure - b.pleasure) < threshold &&
               Math.abs(a.arousal - b.arousal) < threshold &&
               Math.abs(a.dominance - b.dominance) < threshold;
    }

    private mergeWithoutConflict(local: EmotionalMemory, remote: EmotionalMemory): EmotionalMemory {
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();

        const merged: EmotionalMemory = {
            ...local,
            id: local.id,
            version: Math.max(local.version, remote.version) + 1,
            updated_at: new Date().toISOString(),
        };

        if (this.options.enableTagUnion) {
            const localTags = new Set(local.emotion_tags);
            const remoteTags = new Set(remote.emotion_tags);
            const mergedTags = new Set([...localTags, ...remoteTags]);
            merged.emotion_tags = Array.from(mergedTags);
        }

        if (this.options.enablePadAverage) {
            merged.pad_vector = this.weightedAveragePad(local.pad_vector, remote.pad_vector, localTime, remoteTime);
        }

        const localDistortions = new Set(local.cognitive_distortions);
        const remoteDistortions = new Set(remote.cognitive_distortions);
        const mergedDistortions = new Set([...localDistortions, ...remoteDistortions]);
        merged.cognitive_distortions = Array.from(mergedDistortions);

        if (this.options.enableWeightRecalc) {
            merged.weight = this.calculateMergedWeight(merged);
        }

        const localRelated = new Set(local.related_memories);
        const remoteRelated = new Set(remote.related_memories);
        const mergedRelated = new Set([...localRelated, ...remoteRelated]);
        merged.related_memories = Array.from(mergedRelated);

        return merged;
    }

    private mergeWithVectorConflict(local: EmotionalMemory, remote: EmotionalMemory): EmotionalMemory {
        const result = this.mergeWithoutConflict(local, remote);
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();

        result.pad_vector = this.weightedAveragePad(local.pad_vector, remote.pad_vector, localTime, remoteTime);

        return result;
    }

    private mergeWithAllConflicts(local: EmotionalMemory, remote: EmotionalMemory): EmotionalMemory {
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();
        const isRemoteNewer = remoteTime > localTime;

        const base = isRemoteNewer ? remote : local;
        const older = isRemoteNewer ? local : remote;

        const mergedRelated = new Set([
            ...base.related_memories,
            ...older.related_memories,
            older.id
        ]);

        const merged: EmotionalMemory = {
            ...base,
            version: Math.max(local.version, remote.version) + 1,
            updated_at: new Date().toISOString(),
            related_memories: Array.from(mergedRelated),
        };

        if (this.options.enableTagUnion) {
            const mergedTags = new Set([...local.emotion_tags, ...remote.emotion_tags]);
            merged.emotion_tags = Array.from(mergedTags);
        }

        if (this.options.enablePadAverage) {
            merged.pad_vector = this.weightedAveragePad(local.pad_vector, remote.pad_vector, localTime, remoteTime);
        }

        const mergedDistortions = new Set([...local.cognitive_distortions, ...remote.cognitive_distortions]);
        merged.cognitive_distortions = Array.from(mergedDistortions);

        if (this.options.enableWeightRecalc) {
            merged.weight = this.calculateMergedWeight(merged);
        }

        return merged;
    }

    private fallbackToLWW(local: EmotionalMemory, remote: EmotionalMemory): MergeResult {
        const localTime = new Date(local.updated_at).getTime();
        const remoteTime = new Date(remote.updated_at).getTime();
        const isRemoteNewer = remoteTime > localTime;

        return {
            merged: {
                ...(isRemoteNewer ? remote : local),
                version: Math.max(local.version, remote.version) + 1,
                updated_at: new Date().toISOString(),
            },
            hasConflict: true,
            conflictResolved: true,
            strategy: 'lww'
        };
    }

    private weightedAveragePad(
        local: PADVector,
        remote: PADVector,
        localTime: number,
        remoteTime: number
    ): PADVector {
        const totalWeight = localTime + remoteTime;
        if (totalWeight === 0) {
            return local;
        }

        const localWeight = localTime / totalWeight;
        const remoteWeight = remoteTime / totalWeight;

        return {
            pleasure: local.pleasure * localWeight + remote.pleasure * remoteWeight,
            arousal: local.arousal * localWeight + remote.arousal * remoteWeight,
            dominance: local.dominance * localWeight + remote.dominance * remoteWeight,
        };
    }

    private calculateMergedWeight(memory: EmotionalMemory): number {
        const baseIntensity = Math.abs(memory.pad_vector.pleasure) * memory.pad_vector.arousal;
        const tagBonus = memory.emotion_tags.length * 0.05;
        const distortionMalus = memory.cognitive_distortions.length * 0.03;

        return Math.max(0, Math.min(1, baseIntensity + tagBonus - distortionMalus));
    }
}

export const conflictResolver = new ConflictResolver();
