import { PADVector, GatewayMeta } from '../types.js';
import { getMatchingStrategy, selectTemplate } from './strategy.js';

export interface RewriteOptions {
    preserveTechnical?: boolean;
    addEmotionalWrapper?: boolean;
    maxWrapperLength?: number;
    personaTone?: string;
}

export function rewriteResponse(
    originalResponse: string,
    padVector: PADVector,
    interventionType: 'none' | 'emotional_support' | 'safety_protocol',
    meta: GatewayMeta,
    options: RewriteOptions = {}
): string {
    const {
        preserveTechnical = true,
        addEmotionalWrapper = true,
        maxWrapperLength = 200,
        personaTone = 'default'
    } = options;

    const hasCodeBlocks = /```[\s\S]*?```/.test(originalResponse);
    let intensity = meta.rewrite_intensity;

    if (meta.intent_type === 'mixed') {
        intensity = Math.min(intensity, 0.9);
    } else if (hasCodeBlocks) {
        intensity = Math.min(intensity, 0.1);
    }

    if (interventionType === 'none' && intensity < 0.15) {
        return originalResponse;
    }

    let wrapper = addEmotionalWrapper ? selectTemplate(padVector) : '';
    
    if (personaTone && personaTone !== 'default') {
        wrapper = applyPersonaTone(wrapper, personaTone);
    }

    if (interventionType === 'safety_protocol') {
        return wrapWithSafety(originalResponse, wrapper, meta);
    }

    if (intensity < 0.2) {
        return addWarmTone(originalResponse, personaTone);
    }

    if (preserveTechnical || hasCodeBlocks) {
        return insertEmotionalWrapperWithCodeGuard(originalResponse, wrapper, intensity);
    }

    return blendResponse(originalResponse, wrapper, intensity);
}

function applyPersonaTone(wrapper: string, personaTone: string): string {
    const tonePrefixes: Record<string, string> = {
        'sensitive': '嗯...',
        'energetic': '嘿嘿！',
        'gentle': '好的呢～',
        'strict': ''
    };
    
    const toneSuffixes: Record<string, string> = {
        'sensitive': '',
        'energetic': '！',
        'gentle': '～',
        'strict': '。'
    };
    
    const prefix = tonePrefixes[personaTone] || '';
    const suffix = toneSuffixes[personaTone] || '';
    
    if (wrapper && prefix) {
        return prefix + wrapper + suffix;
    }
    
    return wrapper;
}

function wrapWithSafety(originalResponse: string, wrapper: string, meta: GatewayMeta): string {
    const safetyPrefix = `[小暖 - 情感陪护] ${wrapper}\n\n`;
    
    return safetyPrefix + originalResponse;
}

function addWarmTone(response: string, personaTone: string = 'default'): string {
    const warmPhrases: Record<string, string[]> = {
        'sensitive': ['嗯...好的', '嗯...明白了', '嗯...我来看看'],
        'energetic': ['好呀！', '没问题！', '交给我吧！'],
        'gentle': ['好的呢～', '明白啦～', '我来帮你看看～'],
        'strict': ['好的', '明白', '收到'],
        'default': ['好的呢', '明白啦', '没问题', '我来帮你看看', '好的，让我帮你']
    };
    
    const phrases = warmPhrases[personaTone] || warmPhrases['default'];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    if (response.startsWith(randomPhrase) || response.startsWith('好的')) {
        return response;
    }

    return `${randomPhrase}，${response}`;
}

function insertEmotionalWrapper(
    originalResponse: string,
    wrapper: string,
    intensity: number
): string {
    if (!wrapper) {
        return originalResponse;
    }

    const emotionalSuffix = `\n\n[小暖] ${wrapper}`;

    if (intensity > 0.7) {
        const emotionalPrefix = `[小暖] ${wrapper}\n\n`;
        return emotionalPrefix + originalResponse + emotionalSuffix;
    }

    return originalResponse + emotionalSuffix;
}

function insertEmotionalWrapperWithCodeGuard(
    originalResponse: string,
    wrapper: string,
    intensity: number
): string {
    const { protectedText, codeBlocks } = protectCodeBlocks(originalResponse);
    const rewritten = insertEmotionalWrapper(protectedText, wrapper, intensity);
    return restoreCodeBlocks(rewritten, codeBlocks);
}

function protectCodeBlocks(text: string): { protectedText: string; codeBlocks: string[] } {
    const codeBlocks: string[] = [];
    const protectedText = text.replace(/```[\s\S]*?```/g, (match) => {
        const index = codeBlocks.length;
        codeBlocks.push(match);
        return `__CODE_BLOCK_${index}__`;
    });
    return { protectedText, codeBlocks };
}

function restoreCodeBlocks(text: string, codeBlocks: string[]): string {
    let restored = text;
    for (let i = 0; i < codeBlocks.length; i++) {
        restored = restored.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i]);
    }
    return restored;
}

function blendResponse(
    originalResponse: string,
    wrapper: string,
    intensity: number
): string {
    if (!wrapper) {
        return originalResponse;
    }

    const blendPoint = Math.floor(originalResponse.length * (1 - intensity));
    const technicalPart = originalResponse.slice(0, blendPoint);
    const restPart = originalResponse.slice(blendPoint);

    return `${technicalPart}\n\n[小暖] ${wrapper} ${restPart}`;
}

export function injectEmotionFeedback(
    taskResult: string,
    currentPADState: PADVector
): string {
    const hasPositiveEmotion = currentPADState.pleasure > 0.3;
    const hasHighArousal = currentPADState.arousal > 0.6;

    if (hasPositiveEmotion && hasHighArousal) {
        return taskResult + '\n\n太棒了！为你高兴！';
    }

    if (hasPositiveEmotion) {
        return taskResult + '\n\n很高兴能帮到你～';
    }

    if (currentPADState.dominance < 0.3) {
        return taskResult + '\n\n你已经很棒了，别给自己太大压力。';
    }

    return taskResult;
}
