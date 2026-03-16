import { IntentType } from '../types.js';

interface TaskIndicators {
    verbs: string[];
    questionWords: string[];
    explicitTask: RegExp[];
}

const TASK_INDICATORS: TaskIndicators = {
    verbs: [
        '查', '找', '看', '请', '帮', '计算', '翻译', '写', '制作', '创建',
        '生成', '获取', '提供', '告诉', '解释', '分析', '整理', '汇总',
        '搜索', '下载', '发送', '安排', '提醒', '计划', '预约', '预订'
    ],
    questionWords: [
        '什么', '怎么', '如何', '为什么', '哪里', '多少', '几', '是不是',
        '有没有', '能否', '可以', '会不会', '是不是'
    ],
    explicitTask: [
        /^\s*(帮我|请|麻烦|能不能|可以|帮我一下)/,
        /[吗\?？]$/,
        /^(帮我|帮我查|帮我找|帮我看)/,
        /^(请|请问|麻烦)/
    ]
};

const EMOTION_INDICATORS = {
    pronouns: ['我', '我们'],
    emotionVerbs: [
        '觉得', '感到', '感觉', '认为', '心情', '情绪',
        '难过', '开心', '生气', '害怕', '担心', '郁闷',
        '压抑', '焦虑', '烦躁', '累', '疲惫', '无力'
    ],
    selfReference: [
        '我', '我的', '我们', '我们的', '我自己'
    ]
};

export function classifyIntent(query: string): IntentType {
    const taskScore = calculateTaskScore(query);
    const emotionScore = calculateEmotionScore(query);

    const hasExplicitTask = TASK_INDICATORS.explicitTask.some(pattern => pattern.test(query));
    if (hasExplicitTask && taskScore > 0.3) {
        return 'task';
    }

    const hasEmotionWords = EMOTION_INDICATORS.emotionVerbs.some(word => query.includes(word));
    const hasSelfRef = EMOTION_INDICATORS.selfReference.some(word => query.includes(word));
    const hasEmotionProunouns = query.includes('我') || query.includes('我们');

    if (hasEmotionWords && hasSelfRef) {
        if (taskScore > 0.4) {
            return 'mixed';
        }
        return 'emotion';
    }

    if (hasEmotionProunouns && emotionScore > taskScore + 0.2) {
        return 'mixed';
    }

    if (taskScore > emotionScore + 0.3) {
        return 'task';
    }

    if (emotionScore > 0.5) {
        return 'emotion';
    }

    return 'task';
}

function calculateTaskScore(query: string): number {
    let score = 0;

    for (const verb of TASK_INDICATORS.verbs) {
        if (query.includes(verb)) {
            score += 0.15;
        }
    }

    for (const word of TASK_INDICATORS.questionWords) {
        if (query.includes(word)) {
            score += 0.1;
        }
    }

    for (const pattern of TASK_INDICATORS.explicitTask) {
        if (pattern.test(query)) {
            score += 0.3;
        }
    }

    const actionWords = ['能不能', '可以帮我', '请帮我', '麻烦帮', '帮我查', '帮我找'];
    for (const word of actionWords) {
        if (query.includes(word)) {
            score += 0.2;
        }
    }

    return Math.min(score, 1.0);
}

function calculateEmotionScore(query: string): number {
    let score = 0;

    const emotionWords = [
        '难过', '伤心', '沮丧', '失望', '绝望', '痛苦', '悲伤',
        '开心', '高兴', '快乐', '兴奋', '愉快', '喜悦',
        '生气', '愤怒', '恼火', '火大', '不爽',
        '害怕', '恐惧', '担心', '焦虑', '紧张', '不安',
        '累', '疲惫', '疲倦', '困', '乏',
        '孤独', '寂寞', '孤单', '没人陪',
        '压抑', '烦躁', '郁闷', '烦', '无奈', '无力',
        '爱', '喜欢', '幸福', '温暖', '感动', '感激',
        '感动', '感慨', '感慨万千'
    ];

    for (const word of emotionWords) {
        if (query.includes(word)) {
            score += 0.2;
        }
    }

    const selfRefCount = (query.match(/我|我的|我们|我们的/g) || []).length;
    if (selfRefCount > 0) {
        score += Math.min(selfRefCount * 0.1, 0.3);
    }

    const firstPerson = /^我|^我们|^我的/;
    if (firstPerson.test(query.trim())) {
        score += 0.2;
    }

    const emotionalPhrases = [
        '真的很', '特别', '非常', '极其', '相当',
        '很', '好', '太', '真心'
    ];
    for (const phrase of emotionalPhrases) {
        if (query.includes(phrase)) {
            score += 0.1;
        }
    }

    return Math.min(score, 1.0);
}

export function extractPureTask(query: string): string {
    const emotionWords = [
        '难过', '伤心', '沮丧', '失望', '绝望', '痛苦', '悲伤',
        '开心', '高兴', '快乐', '兴奋', '愉快', '喜悦',
        '生气', '愤怒', '恼火', '火大', '不爽',
        '害怕', '恐惧', '担心', '焦虑', '紧张', '不安',
        '累', '疲惫', '疲倦', '困', '乏', '好累', '好烦',
        '孤独', '寂寞', '孤单', '压抑', '烦躁', '郁闷',
        '无奈', '无力', '烦', '压力大', '崩溃',
        '真的很', '特别', '非常', '极其', '相当'
    ];

    let task = query;
    for (const word of emotionWords) {
        const regex = new RegExp(word, 'g');
        task = task.replace(regex, '');
    }

    task = task.replace(/\s+/g, ' ').trim();
    
    if (!task || task.length < 3) {
        return query;
    }

    return task;
}

export function extractEmotionContext(query: string): string {
    const emotionWords = [
        '难过', '伤心', '沮丧', '失望', '绝望', '痛苦', '悲伤',
        '开心', '高兴', '快乐', '兴奋', '愉快', '喜悦',
        '生气', '愤怒', '恼火', '火大', '不爽',
        '害怕', '恐惧', '担心', '焦虑', '紧张', '不安',
        '累', '疲惫', '疲倦', '困', '乏', '好累', '好烦',
        '孤独', '寂寞', '孤单', '压抑', '烦躁', '郁闷',
        '无奈', '无力', '烦', '压力大', '崩溃'
    ];

    const foundEmotions = emotionWords.filter(word => query.includes(word));
    return foundEmotions.join(', ');
}

export type { IntentType } from '../types.js';
