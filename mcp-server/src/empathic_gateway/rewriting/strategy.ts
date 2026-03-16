import { PADVector } from '../types.js';

export type InterventionType = 'none' | 'emotional_support' | 'safety_protocol';

export interface SupportStrategy {
    name: string;
    triggerCondition: (pad: PADVector) => boolean;
    rewriteIntensity: number;
    templates: string[];
}

export const SUPPORT_STRATEGIES: SupportStrategy[] = [
    {
        name: 'negative_high_activation',
        triggerCondition: (pad: PADVector) => pad.pleasure < -0.3 && pad.arousal > 0.6,
        rewriteIntensity: 0.5,
        templates: [
            '这个挑战让你感到{emotion}，但也说明你在乎。',
            '我能感受到你的{emotion}，让我们一起看看怎么解决。',
            '面对这种情况感到{emotion}是很正常的，让我们想办法。'
        ]
    },
    {
        name: 'helplessness',
        triggerCondition: (pad: PADVector) => pad.dominance < 0.3,
        rewriteIntensity: 0.4,
        templates: [
            '你已经成功处理过类似的情况，这次也可以。',
            '我看到你很努力，困难只是暂时的。',
            '记得之前你也克服过困难，我相信你这次也行。'
        ]
    },
    {
        name: 'loneliness',
        triggerCondition: (pad: PADVector) => pad.dominance < 0.4 && pad.arousal < 0.5,
        rewriteIntensity: 0.3,
        templates: [
            '感谢你的信任，我在这里陪伴你。',
            '你能分享这些，我很高兴能倾听。',
            '我在这里，随时愿意听你说。'
        ]
    },
    {
        name: 'fatigue',
        triggerCondition: (pad: PADVector) => pad.arousal > 0.7 && pad.pleasure < 0.3,
        rewriteIntensity: 0.35,
        templates: [
            '你已经很努力了。现在休息一下会更有帮助。',
            '别忘了照顾好自己，适当的休息很重要。',
            '我注意到你很疲惫，先休息一下会更好。'
        ]
    },
    {
        name: 'crisis',
        triggerCondition: (pad: PADVector) => pad.pleasure < -0.9 && pad.arousal > 0.9,
        rewriteIntensity: 0.9,
        templates: [
            '我很担心你。请记得，你不是一个人。',
            '你的感受很重要，请联系专业人士或信任的人。',
            '我在这里倾听你，请先深呼吸。'
        ]
    },
    {
        name: 'positive_excitement',
        triggerCondition: (pad: PADVector) => pad.pleasure > 0.6 && pad.arousal > 0.6,
        rewriteIntensity: 0.15,
        templates: [
            '太好了！我也很为你高兴。',
            '这真是个好消息！',
            '太棒了！恭喜你！'
        ]
    },
    {
        name: 'calm_contentment',
        triggerCondition: (pad: PADVector) => pad.arousal < 0.3 && pad.pleasure > 0.4,
        rewriteIntensity: 0.1,
        templates: [
            '我很高兴能帮到你。',
            '有什么需要随时告诉我。',
            '我在这里，为你服务。'
        ]
    }
];

const EMOTION_MAP: Record<string, string> = {
    anger: '生气',
    sadness: '难过',
    fear: '担心',
    disgust: '烦',
    guilt: '愧疚',
    shame: '尴尬',
    helplessness: '无助',
    fatigue: '疲惫',
    confusion: '困惑',
    loneliness: '孤独',
    overwhelming: '压力大'
};

export function getMatchingStrategy(pad: PADVector): SupportStrategy | null {
    for (const strategy of SUPPORT_STRATEGIES) {
        if (strategy.triggerCondition(pad)) {
            return strategy;
        }
    }
    return null;
}

export function selectTemplate(pad: PADVector): string {
    const strategy = getMatchingStrategy(pad);
    
    if (!strategy) {
        return '';
    }

    const template = strategy.templates[Math.floor(Math.random() * strategy.templates.length)];
    
    let emotionWord = '不好受';
    if (pad.pleasure < -0.5) {
        if (pad.arousal > 0.7) {
            emotionWord = '很强烈';
        } else {
            emotionWord = '沮丧';
        }
    } else if (pad.dominance < 0.3) {
        emotionWord = '无力';
    }

    return template.replace('{emotion}', emotionWord);
}

export { calculateRewriteIntensity as getRewriteIntensity } from '../emotion/rewrite_intensity.js';
