import { PADVector } from '../types.js';

export interface TriggerRule {
    name: string;
    condition: (pad: PADVector, distortions: string[], emotionLevel: number) => boolean;
    intervention_type: 'none' | 'emotional_support' | 'safety_protocol';
    trigger_reason: string;
    priority: number;
}

export const TRIGGER_RULES: TriggerRule[] = [
    {
        name: 'crisis_detection',
        condition: (pad, distortions, emotionLevel) => emotionLevel >= 4 || pad.pleasure < -0.9,
        intervention_type: 'safety_protocol',
        trigger_reason: '检测到危机信号，需要立即介入',
        priority: 100
    },
    {
        name: 'high_risk_emotion',
        condition: (pad, distortions, emotionLevel) => emotionLevel >= 3 && pad.pleasure < -0.5,
        intervention_type: 'safety_protocol',
        trigger_reason: '检测到高风险情绪状态',
        priority: 90
    },
    {
        name: 'catastrophizing_crisis',
        condition: (pad, distortions) => distortions.includes('catastrophizing') && pad.pleasure < -0.5,
        intervention_type: 'emotional_support',
        trigger_reason: '检测到灾难化思维模式',
        priority: 80
    },
    {
        name: 'suicidal_thoughts',
        condition: (pad, distortions) => distortions.some(d => ['catastrophizing', 'overgeneralization'].includes(d)) && pad.dominance < 0.2,
        intervention_type: 'safety_protocol',
        trigger_reason: '检测到自我否定倾向',
        priority: 95
    },
    {
        name: 'neutral_task',
        condition: (pad, distortions, emotionLevel) => emotionLevel === 0 && distortions.length === 0,
        intervention_type: 'none',
        trigger_reason: '任务/中性输入，无需介入',
        priority: 1
    },
    {
        name: 'calm_state',
        condition: (pad, distortions, emotionLevel) => emotionLevel === 0,
        intervention_type: 'none',
        trigger_reason: '平静状态',
        priority: 5
    },
    {
        name: 'helplessness',
        condition: (pad, distortions) => pad.dominance < 0.25 && pad.pleasure < -0.4,
        intervention_type: 'emotional_support',
        trigger_reason: '检测到无助感',
        priority: 60
    },
    {
        name: 'high_negative_activation',
        condition: (pad, distortions, emotionLevel) => pad.pleasure < -0.4 && pad.arousal > 0.5,
        intervention_type: 'emotional_support',
        trigger_reason: '检测到负面高激活情绪',
        priority: 50
    },
    {
        name: 'cognitive_distortions',
        condition: (pad, distortions) => distortions.length >= 2,
        intervention_type: 'emotional_support',
        trigger_reason: '检测到多个认知偏差模式',
        priority: 40
    },
    {
        name: 'high_positive_activation',
        condition: (pad, distortions, emotionLevel) => pad.pleasure > 0.6 && pad.arousal > 0.6,
        intervention_type: 'none',
        trigger_reason: '积极情绪，无需介入',
        priority: 10
    }
];

export interface TriggerResult {
    triggered: boolean;
    rule_name?: string;
    intervention_type: 'none' | 'emotional_support' | 'safety_protocol';
    trigger_reason: string;
    priority: number;
}

export function checkTriggerRules(
    padVector: PADVector,
    distortions: string[],
    emotionLevel: number
): TriggerResult {
    const triggeredRules = TRIGGER_RULES.filter(rule => 
        rule.condition(padVector, distortions, emotionLevel)
    );

    if (triggeredRules.length === 0) {
        return {
            triggered: false,
            intervention_type: 'none',
            trigger_reason: '无触发规则',
            priority: 0
        };
    }

    triggeredRules.sort((a, b) => b.priority - a.priority);
    const highestPriority = triggeredRules[0];

    return {
        triggered: true,
        rule_name: highestPriority.name,
        intervention_type: highestPriority.intervention_type,
        trigger_reason: highestPriority.trigger_reason,
        priority: highestPriority.priority
    };
}
