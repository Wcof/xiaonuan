import { PADVector, MemoryCandidate } from '../types.js';

const TIME_DECAY_HALF_LIFE = 7 * 24 * 3600;

export function calculateMemoryWeight(
    emotionIntensity: number,
    timeSinceEvent: number,
    userEngagement: number = 0.5
): number {
    const timeDecay = Math.exp(-timeSinceEvent / TIME_DECAY_HALF_LIFE);
    const engagementFactor = 0.5 + 0.5 * userEngagement;
    const weight = emotionIntensity * timeDecay * engagementFactor;
    return Math.min(weight, 1.0);
}

export function extractMemoryCandidate(
    rawQuery: string,
    response: string,
    padVector: PADVector,
    emotionLevel: number,
    userEngagement: number = 0.7
): MemoryCandidate | null {
    const emotionIntensity = (Math.abs(padVector.pleasure) + padVector.arousal + padVector.dominance) / 3;
    
    if (emotionIntensity < 0.2 && emotionLevel < 2) {
        return null;
    }

    const summary = generateSummary(rawQuery, response, padVector);
    const timestamp = Date.now();
    const weight = calculateMemoryWeight(emotionIntensity, 0, userEngagement);

    const type = determineMemoryType(padVector, emotionLevel);

    return {
        type,
        summary,
        emotion_trajectory: padVector,
        timestamp,
        weight
    };
}

function generateSummary(query: string, response: string, padVector: PADVector): string {
    const emotionState = getEmotionStateDescription(padVector);
    const queryPreview = query.length > 50 ? query.substring(0, 50) + '...' : query;
    return `${emotionState} - ${queryPreview}`;
}

function getEmotionStateDescription(padVector: PADVector): string {
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

function determineMemoryType(
    padVector: PADVector,
    emotionLevel: number
): 'event' | 'emotion_trajectory' | 'insight' {
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
