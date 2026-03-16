import { 
    GatewayInput, 
    GatewayOutput, 
    DownstreamOutput, 
    UserFacingOutput,
    PADVector 
} from '../types.js';
import { 
    calculatePADVector, 
    detectCognitiveDistortions,
    getEmotionLevel,
    calculateRewriteIntensity 
} from '../emotion/index.js';
import { classifyIntent, IntentType } from './intent_classifier.js';
import { checkTriggerRules, TriggerResult } from './rule_engine.js';
import { generateMeta } from './meta_generator.js';

export interface ProcessOptions {
    saveMemory?: boolean;
    currentPADState?: PADVector;
}

export function processGateway(
    rawQuery: string,
    contextMeta?: GatewayInput['context_meta'],
    options?: ProcessOptions
): GatewayOutput {
    const padVector = calculatePADVector(rawQuery);
    const intentType = classifyIntent(rawQuery);
    const cognitiveDistortions = detectCognitiveDistortions(rawQuery);
    const emotionLevel = getEmotionLevel(padVector.arousal);
    
    const triggerResult = checkTriggerRules(padVector, cognitiveDistortions, emotionLevel);
    const meta = generateMeta(rawQuery, padVector, intentType, triggerResult);

    const downstream: DownstreamOutput = {
        raw_query: rawQuery,
        meta
    };

    const userFacing: UserFacingOutput = {
        final_response: '',
        intervention_type: triggerResult.intervention_type,
        memory_saved: false
    };

    return {
        downstream,
        user_facing: userFacing
    };
}

export function getInterventionPrompt(
    triggerResult: TriggerResult,
    padVector: PADVector,
    originalResponse?: string
): string {
    const { intervention_type, trigger_reason } = triggerResult;

    if (intervention_type === 'none') {
        return '';
    }

    if (intervention_type === 'safety_protocol') {
        return generateSafetyProtocol(padVector);
    }

    return generateEmotionalSupport(padVector, trigger_reason);
}

function generateSafetyProtocol(padVector: PADVector): string {
    if (padVector.pleasure < -0.8 && padVector.dominance < 0.2) {
        return `\n\n[情感陪护] 我很担心你。现在深呼吸一下，好吗？你的感受很重要，如果你有伤害自己的想法，请立即联系专业心理帮助热线或身边信任的人。你不是一个人，我在这里倾听你。`;
    }

    return `\n\n[情感陪护] 我感受到你现在的情绪很强烈。无论是怎样的困扰，请记住你并不孤单。如果需要专业帮助，请考虑联系心理咨询师或信任的人。你愿意和我聊聊具体发生了什么吗？`;
}

function generateEmotionalSupport(padVector: PADVector, triggerReason: string): string {
    if (padVector.dominance < 0.3) {
        return `\n\n[情感陪护] 我听到你感到很无力。记住，你之前也面对过困难，并且走了过来。这次也不例外，我相信你有面对它的力量。`;
    }

    if (padVector.pleasure < -0.5 && padVector.arousal > 0.6) {
        return `\n\n[情感陪护] ${triggerReason}。我能感受到你的不易。让我们一起看看有什么可以做的，好吗？`;
    }

    return `\n\n[情感陪护] 感谢你分享你的感受。我在这里陪伴你。`;
}

export { classifyIntent } from './intent_classifier.js';
export { checkTriggerRules } from './rule_engine.js';
export { generateMeta } from './meta_generator.js';
