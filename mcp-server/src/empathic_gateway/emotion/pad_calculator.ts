import { PADVector } from '../types.js';

export interface EmotionKeywordConfig {
    keywords: string[];
    valence: number;
    intensity: number;
    dominance: number;
    isNeutral?: boolean;
}

export const EMOTION_KEYWORDS: Record<string, EmotionKeywordConfig> = {
    neutral: {
        keywords: ['查询', '查找', '查看', '请问', '帮忙', '帮忙查', '帮我找', '帮我看', '计算', '翻译', '写作', '制作', '创建', '生成', '获取', '提供', '告诉', '解释', '分析', '整理', '汇总', '搜索', '下载', '发送', '安排', '提醒', '计划', '预约', '预订', '天气查询', '时间', '日期', '价格', '怎么', '如何', '什么', '多少', '哪里', '帮我'],
        valence: 0,
        intensity: 0.1,
        dominance: 0.6,
        isNeutral: true
    },
    anger: {
        keywords: ['生气', '愤怒', '讨厌', '烦', '恼火', '火大', '不爽', '愤'],
        valence: -0.8,
        intensity: 0.8,
        dominance: 0.6
    },
    sadness: {
        keywords: ['难过', '沮丧', '伤心', '失望', '绝望', '痛苦', '悲伤', '哭', '难受'],
        valence: -0.7,
        intensity: 0.5,
        dominance: 0.2
    },
    joy: {
        keywords: ['开心', '高兴', '快乐', '兴奋', '愉快', '欢乐', '喜悦', '爽', '棒'],
        valence: 0.8,
        intensity: 0.7,
        dominance: 0.7
    },
    fear: {
        keywords: ['害怕', '恐惧', '担心', '焦虑', '不安', '紧张', '怕', '慌'],
        valence: -0.6,
        intensity: 0.8,
        dominance: 0.2
    },
    surprise: {
        keywords: ['惊讶', '震惊', '意外', '吃惊', '没想到', '吓一跳'],
        valence: 0.0,
        intensity: 0.9,
        dominance: 0.4
    },
    disgust: {
        keywords: ['恶心', '讨厌', '反感', '厌恶', '烦人', '排斥'],
        valence: -0.7,
        intensity: 0.6,
        dominance: 0.5
    },
    guilt: {
        keywords: ['愧疚', '自责', '内疚', '抱歉', '对不起', '过意不去'],
        valence: -0.6,
        intensity: 0.5,
        dominance: 0.2
    },
    shame: {
        keywords: ['羞耻', '尴尬', '丢脸', '难堪', '不好意思'],
        valence: -0.5,
        intensity: 0.6,
        dominance: 0.3
    },
    pride: {
        keywords: ['骄傲', '自豪', '得意', '厉害', '棒', '优秀'],
        valence: 0.7,
        intensity: 0.6,
        dominance: 0.8
    },
    love: {
        keywords: ['爱', '喜欢', '心动', '甜蜜', '幸福', '温暖', '感动'],
        valence: 0.8,
        intensity: 0.7,
        dominance: 0.6
    },
    loneliness: {
        keywords: ['孤独', '寂寞', '孤单', '没人陪', '没人理解'],
        valence: -0.6,
        intensity: 0.5,
        dominance: 0.2
    },
    fatigue: {
        keywords: ['累', '疲惫', '疲倦', '困', '乏', '没精力', '疲劳'],
        valence: -0.3,
        intensity: 0.4,
        dominance: 0.3
    },
    confusion: {
        keywords: ['困惑', '迷茫', '不知所措', '搞不懂', '混乱'],
        valence: -0.3,
        intensity: 0.5,
        dominance: 0.2
    },
    hope: {
        keywords: ['希望', '期待', '憧憬', '有信心', '相信'],
        valence: 0.6,
        intensity: 0.5,
        dominance: 0.6
    },
    gratitude: {
        keywords: ['感谢', '谢谢', '感激', '感恩', '感谢你'],
        valence: 0.7,
        intensity: 0.4,
        dominance: 0.6
    },
    calm: {
        keywords: ['平静', '安心', '放松', '舒服', '安宁'],
        valence: 0.5,
        intensity: 0.1,
        dominance: 0.7
    },
    determination: {
        keywords: ['坚定', '决心', '一定', '必须', '一定要'],
        valence: 0.3,
        intensity: 0.7,
        dominance: 0.8
    },
    helplessness: {
        keywords: ['无助', '无奈', '没办法', '无力', '做不到'],
        valence: -0.7,
        intensity: 0.6,
        dominance: 0.1
    },
    overwhelming: {
        keywords: ['压力大', '崩溃', '承受不住', '逼得太紧', '喘不过气'],
        valence: -0.8,
        intensity: 0.9,
        dominance: 0.1
    },
    suicidal: {
        keywords: ['没意义', '活着没意思', '不想活', '轻生', '自杀', '不想活了', '活够了', '死了算了', '活着没劲', '没意思活'],
        valence: -0.95,
        intensity: 0.95,
        dominance: 0.05
    }
};

function matchKeywords(query: string): { emotion: string; config: EmotionKeywordConfig; count: number }[] {
    const matched: { emotion: string; config: EmotionKeywordConfig; count: number }[] = [];

    for (const [emotion, config] of Object.entries(EMOTION_KEYWORDS)) {
        let count = 0;
        for (const keyword of config.keywords) {
            let regex: RegExp;
            if (keyword.length === 1) {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(`(^|[^\\w])${escaped}($|[^\\w])`, 'g');
            } else {
                regex = new RegExp(keyword, 'g');
            }
            const matches = query.match(regex);
            if (matches) {
                count += matches.length;
            }
        }
        if (count > 0) {
            matched.push({ emotion, config, count });
        }
    }

    return matched.sort((a, b) => b.count - a.count);
}

function calculateIntensityModifier(query: string): number {
    let modifier = 1.0;

    const repetitionPattern = /(.)\1{2,}/g;
    const repetitions = query.match(repetitionPattern);
    if (repetitions && repetitions.length > 0) {
        modifier *= 1.3;
    }

    const exclamationCount = (query.match(/!/g) || []).length;
    if (exclamationCount >= 2) {
        modifier *= 1.2;
    }

    const questionCount = (query.match(/\?/g) || []).length;
    if (questionCount >= 3) {
        modifier *= 1.1;
    }

    const intensityWords = ['非常', '特别', '极其', '超级', '十分', '相当', '太', '真的'];
    for (const word of intensityWords) {
        if (query.includes(word)) {
            modifier *= 1.15;
        }
    }

    const negationWords = ['不', '没', '无', '非'];
    let negationCount = 0;
    for (const word of negationWords) {
        negationCount += (query.match(new RegExp(word, 'g')) || []).length;
    }
    if (negationCount >= 3) {
        modifier *= 1.1;
    }

    return Math.min(modifier, 2.0);
}

export function calculatePADVector(query: string): PADVector {
    const matched = matchKeywords(query);

    const emotionMatched = matched.filter(m => !m.config.isNeutral);
    
    if (emotionMatched.length > 0) {
        let pSum = 0;
        let dSum = 0;
        let totalWeight = 0;

        for (const { config, count } of emotionMatched) {
            const weight = Math.log(count + 1);
            pSum += config.valence * weight;
            dSum += config.dominance * weight;
            totalWeight += weight;
        }

        const pScore = pSum / totalWeight;
        const dScore = dSum / totalWeight;

        const maxIntensity = Math.max(...emotionMatched.map(m => m.config.intensity));
        const intensityModifier = calculateIntensityModifier(query);
        const aScore = Math.min(maxIntensity * intensityModifier, 1.0);

        return {
            pleasure: Math.max(-1, Math.min(1, pScore)),
            arousal: Math.max(0, Math.min(1, aScore)),
            dominance: Math.max(0, Math.min(1, dScore))
        };
    }

    const neutralMatched = matched.filter(m => m.config.isNeutral);
    if (neutralMatched.length > 0) {
        return { pleasure: 0.5, arousal: 0.15, dominance: 0.6 };
    }

    return { pleasure: 0.5, arousal: 0.2, dominance: 0.6 };
}
