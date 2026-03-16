import { 
    PADVector, 
    GatewayMeta,
    IntentType 
} from '../types.js';
import { 
    getEmotionLevel, 
    getRiskLevel,
    detectCognitiveDistortions,
    calculateRewriteIntensity
} from '../emotion/index.js';
import { checkTriggerRules, TriggerResult } from './rule_engine.js';

export function generateMeta(
    rawQuery: string,
    padVector: PADVector,
    intentType: IntentType,
    triggerResult?: TriggerResult
): GatewayMeta {
    const emotionLevel = getEmotionLevel(padVector.arousal);
    const riskLevel = getRiskLevel(padVector, emotionLevel);
    const cognitiveDistortions = detectCognitiveDistortions(rawQuery);

    if (!triggerResult) {
        triggerResult = checkTriggerRules(padVector, cognitiveDistortions, emotionLevel);
    }

    const rewriteIntensity = calculateRewriteIntensity(emotionLevel, triggerResult.intervention_type);

    const confidence = calculateConfidence(padVector, cognitiveDistortions, intentType);

    return {
        emotion_level: emotionLevel,
        pad_vector: padVector,
        trigger_reason: triggerResult.trigger_reason,
        rewrite_intensity: rewriteIntensity,
        confidence,
        cognitive_distortions: cognitiveDistortions,
        risk_level: riskLevel,
        intent_type: intentType,
        cognition_labels: [],
        master_summary: '',
        persona_tone: ''
    };
}

function calculateConfidence(
    padVector: PADVector,
    distortions: string[],
    intentType: IntentType
): number {
    let confidence = 0.5;

    const arousalConfidence = Math.min(padVector.arousal / 0.8, 1.0) * 0.3;
    confidence += arousalConfidence;

    if (distortions.length > 0) {
        confidence += Math.min(distortions.length * 0.1, 0.2);
    }

    if (intentType === 'emotion') {
        confidence += 0.15;
    } else if (intentType === 'task') {
        confidence += 0.1;
    } else {
        confidence += 0.05;
    }

    if (Math.abs(padVector.pleasure) > 0.5) {
        confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
}
