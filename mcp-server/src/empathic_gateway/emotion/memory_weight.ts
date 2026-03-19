import { PADVector, EmotionalMemory, MemoryType } from '../types.js';

const TIME_DECAY_HALF_LIFE_DAYS = 30;
const TIME_DECAY_BASE = 0.5;
const MAX_INTERACTION_COUNT = 5;
const TOPIC_MULTIPLIER = 1.5;

export interface MemoryWeightConfig {
    timeDecayHalfLifeDays?: number;
    timeDecayBase?: number;
    maxInteractionCount?: number;
    topicMultiplier?: number;
}

const DEFAULT_CONFIG: MemoryWeightConfig = {
    timeDecayHalfLifeDays: TIME_DECAY_HALF_LIFE_DAYS,
    timeDecayBase: TIME_DECAY_BASE,
    maxInteractionCount: MAX_INTERACTION_COUNT,
    topicMultiplier: TOPIC_MULTIPLIER,
};

export function calculateEmotionIntensity(padVector: PADVector): number {
    const intensity = padVector.arousal * Math.abs(padVector.pleasure);
    return Math.max(0, Math.min(1, intensity));
}

export function calculateTimeDecay(
    createdAt: string | number,
    now: number = Date.now(),
    config: MemoryWeightConfig = DEFAULT_CONFIG
): number {
    const createdTime = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt;
    if (isNaN(createdTime)) {
        return 1.0;
    }
    const daysSinceCreation = (now - createdTime) / (24 * 60 * 60 * 1000);
    const halfLifeDays = config.timeDecayHalfLifeDays || TIME_DECAY_HALF_LIFE_DAYS;
    const decayBase = config.timeDecayBase || TIME_DECAY_BASE;

    const decay = Math.pow(decayBase, daysSinceCreation / halfLifeDays);
    return Math.max(0.1, Math.min(1, decay));
}

export function calculateEngagementFactor(
    interactionCount: number,
    config: MemoryWeightConfig = DEFAULT_CONFIG
): number {
    const maxInteractions = config.maxInteractionCount || MAX_INTERACTION_COUNT;
    const count = Math.min(interactionCount, maxInteractions);
    return 0.5 + (count * 0.1);
}

export function calculateTopicMultiplier(hasTopic: boolean): number {
    return hasTopic ? TOPIC_MULTIPLIER : 1.0;
}

export function calculateMemoryWeight(
    padVector: PADVector,
    createdAt: string | number,
    interactionCount: number = 0,
    hasTopic: boolean = false,
    now: number = Date.now()
): number {
    const emotionIntensity = calculateEmotionIntensity(padVector);
    const timeDecay = calculateTimeDecay(createdAt, now);
    const engagement = calculateEngagementFactor(interactionCount);
    const topicMultiplier = calculateTopicMultiplier(hasTopic);

    const weight = emotionIntensity * timeDecay * engagement * topicMultiplier;
    return Math.max(0, Math.min(1, weight));
}

export function calculateEffectiveWeight(
    baseWeight: number,
    createdAt: string | number,
    interactionCount: number = 0,
    hasTopic: boolean = false,
    now: number = Date.now()
): number {
    const timeDecay = calculateTimeDecay(createdAt, now);
    const engagement = calculateEngagementFactor(interactionCount);
    const topicMultiplier = calculateTopicMultiplier(hasTopic);

    return baseWeight * timeDecay;
}

export interface MemoryCreationInput {
    content: string;
    type: MemoryType;
    padVector: PADVector;
    emotionTags: string[];
    cognitiveDistortions: string[];
    triggerImportance: boolean;
    relatedMemories: string[];
    topicId?: string;
    userId: string;
    deviceId: string;
}

export function createEmotionalMemory(
    input: MemoryCreationInput,
    now: number = Date.now()
): EmotionalMemory {
    const timestamp = now;
    const createdAt = new Date(timestamp).toISOString();
    const weight = calculateMemoryWeight(
        input.padVector,
        createdAt,
        0,
        !!input.topicId,
        now
    );

    return {
        id: generateId(),
        content: input.content,
        type: input.type,
        pad_vector: input.padVector,
        emotion_tags: input.emotionTags,
        cognitive_distortions: input.cognitiveDistortions,
        weight,
        trigger_importance: input.triggerImportance,
        related_memories: input.relatedMemories,
        topic_id: input.topicId,
        user_id: input.userId,
        device_id: input.deviceId,
        version: 1,
        timestamp,
        created_at: createdAt,
        updated_at: createdAt,
    };
}

export function recalculateMemoryWeight(memory: EmotionalMemory): number {
    return calculateEffectiveWeight(
        memory.weight,
        memory.created_at,
        0,
        !!memory.topic_id
    );
}

function generateId(): string {
    return 'mem_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export function determineMemoryType(
    padVector: PADVector,
    emotionLevel: number,
    cognitiveDistortions: string[] = []
): MemoryType {
    if (cognitiveDistortions.length > 0) {
        return 'event';
    }

    if (emotionLevel >= 3) {
        return 'event';
    }

    if (Math.abs(padVector.pleasure) > 0.6 || padVector.arousal > 0.7) {
        return 'event';
    }

    if (padVector.dominance < 0.3 && padVector.pleasure < 0) {
        return 'emotion_trajectory';
    }

    return 'insight';
}

export function getEmotionStateDescription(padVector: PADVector): string {
    if (padVector.pleasure < -0.5 && padVector.arousal > 0.6) {
        return '负面情绪';
    } else if (padVector.pleasure > 0.5 && padVector.arousal > 0.5) {
        return '积极情绪';
    } else if (padVector.dominance < 0.3) {
        return '低支配感';
    } else if (padVector.arousal < 0.3) {
        return '平静状态';
    } else {
        return '中性状态';
    }
}

export function extractMemoryCandidate(
    rawQuery: string,
    response: string,
    padVector: PADVector,
    emotionLevel: number,
    userEngagement: number = 0.7,
    userId: string = 'default'
): EmotionalMemory | null {
    const emotionIntensity = calculateEmotionIntensity(padVector);

    if (emotionIntensity < 0.2 && emotionLevel < 2) {
        return null;
    }

    const type = determineMemoryType(padVector, emotionLevel);
    const timestamp = Date.now();
    const createdAt = new Date(timestamp).toISOString();
    const weight = calculateMemoryWeight(padVector, createdAt, 0, false, timestamp);

    return {
        id: generateId(),
        content: getEmotionStateDescription(padVector) + ' - ' + (rawQuery.length > 50 ? rawQuery.substring(0, 50) + '...' : rawQuery),
        type,
        pad_vector: padVector,
        emotion_tags: [],
        cognitive_distortions: [],
        weight,
        trigger_importance: emotionLevel >= 3,
        related_memories: [],
        user_id: userId,
        device_id: 'gateway',
        version: 1,
        timestamp,
        created_at: createdAt,
        updated_at: createdAt,
    };
}
