import { PADVector } from '../types.js';

export function getEmotionLevel(arousal: number): number {
    if (arousal < 0.3) {
        return 0;
    } else if (arousal < 0.6) {
        return 1;
    } else if (arousal < 0.8) {
        return 2;
    } else if (arousal < 0.95) {
        return 3;
    } else {
        return 4;
    }
}

export function getEmotionLevelLabel(level: number): string {
    const labels: Record<number, string> = {
        0: '平静',
        1: '激活',
        2: '高激活',
        3: '极端',
        4: '危机'
    };
    return labels[level] || '未知';
}

export function getEmotionState(pad: PADVector): string {
    if (pad.pleasure < 0.3 && pad.arousal > 0.6) {
        return '负面高激活';
    } else if (pad.dominance < 0.3) {
        return '无力感';
    } else if (pad.pleasure > 0.6 && pad.arousal > 0.6) {
        return '正面高激活';
    } else if (pad.pleasure > 0.6 && pad.arousal < 0.4) {
        return '平静愉悦';
    } else if (pad.arousal < 0.3) {
        return '冷静';
    } else if (pad.pleasure < 0.3 && pad.dominance < 0.3) {
        return '绝望';
    } else if (pad.arousal > 0.8) {
        return '激动';
    } else {
        return '中性';
    }
}

export function getRiskLevel(pad: PADVector, emotionLevel: number): 'low' | 'medium' | 'high' {
    if (emotionLevel >= 4) {
        return 'high';
    }

    if (emotionLevel >= 3) {
        return 'high';
    }

    if (pad.pleasure < -0.7 && pad.arousal > 0.8) {
        return 'high';
    }

    if (pad.pleasure < -0.5 && pad.arousal > 0.6) {
        return 'medium';
    }

    return 'low';
}
