import { 
    GatewayInput, 
    GatewayOutput, 
    GatewayMeta,
    PADVector,
    MemoryCandidate,
    EmotionTrajectory
} from './types.js';
import { 
    calculatePADVector, 
    detectCognitiveDistortions,
    getEmotionLevel,
    getEmotionState,
    calculateRewriteIntensity,
    extractMemoryCandidate
} from './emotion/index.js';
import { classifyIntent, extractPureTask, extractEmotionContext } from './processing/intent_classifier.js';
import { checkTriggerRules, TriggerResult } from './processing/rule_engine.js';
import { generateMeta } from './processing/meta_generator.js';
import { rewriteResponse } from './rewriting/index.js';
import { storageManager } from './storage/index.js';

export interface EmpathicGatewayConfig {
    saveMemory?: boolean;
    rewriteOutput?: boolean;
    userId?: string;
    redactRawQuery?: boolean;
    personaTone?: string;
}

export class EmpathicGateway {
    private config: EmpathicGatewayConfig;

    constructor(config: EmpathicGatewayConfig = {}) {
        this.config = {
            saveMemory: true,
            rewriteOutput: true,
            userId: 'default',
            redactRawQuery: true,
            ...config
        };
    }

    async process(
        rawQuery: string,
        downstreamResponse: string,
        contextMeta?: GatewayInput['context_meta']
    ): Promise<GatewayOutput> {
        const input: GatewayInput = {
            raw_query: rawQuery,
            context_meta: contextMeta
        };

        const output = await this.processInput(input);
        
        const finalResponse = await this.processOutput(
            downstreamResponse,
            output.downstream.meta
        );

        return {
            ...output,
            user_facing: {
                ...output.user_facing,
                final_response: finalResponse
            }
        };
    }

    async processInput(input: GatewayInput): Promise<GatewayOutput> {
        const { raw_query, context_meta } = input;
        const userId = context_meta?.user_id || this.config.userId || 'default';

        const padVector = calculatePADVector(raw_query);
        const intentType = classifyIntent(raw_query);
        const cognitiveDistortions = detectCognitiveDistortions(raw_query);
        const emotionLevel = getEmotionLevel(padVector.arousal);
        
        const triggerResult = checkTriggerRules(padVector, cognitiveDistortions, emotionLevel);
        const meta = generateMeta(raw_query, padVector, intentType, triggerResult);
        meta.persona_tone = this.config.personaTone;

        const downstream = {
            raw_query,
            meta
        };

        let finalResponse = '';
        let memorySaved = false;

        if (this.config.saveMemory) {
            const memoryCandidate = extractMemoryCandidate(
                raw_query,
                '',
                padVector,
                emotionLevel,
                intentType === 'emotion' ? 0.8 : 0.5
            );

            if (memoryCandidate) {
                const legacyMemory = {
                    type: memoryCandidate.type,
                    summary: memoryCandidate.content,
                    emotion_trajectory: memoryCandidate.pad_vector,
                    timestamp: memoryCandidate.timestamp,
                    weight: memoryCandidate.weight,
                    user_id: userId,
                    created_at: Date.now()
                };
                await storageManager.saveMemory(legacyMemory, userId);
                memorySaved = true;

                await storageManager.saveEmotionTrajectory({
                    user_id: userId,
                    timestamp: Date.now(),
                    pad_vector: padVector,
                    context: raw_query
                }, userId);
            }
        }

        if (triggerResult.triggered && triggerResult.intervention_type !== 'none') {
            await storageManager.saveInterventionLog({
                user_id: userId,
                timestamp: Date.now(),
                trigger_reason: triggerResult.trigger_reason,
                intervention_type: triggerResult.intervention_type,
                rewrite_intensity: meta.rewrite_intensity
            });
        }

        const userFacing = {
            final_response: finalResponse,
            intervention_type: triggerResult.intervention_type,
            memory_saved: memorySaved
        };

        return {
            downstream,
            user_facing: userFacing
        };
    }

    async processOutput(
        originalResponse: string,
        meta: GatewayMeta,
        currentPADState?: PADVector
    ): Promise<string> {
        if (!this.config.rewriteOutput) {
            return originalResponse;
        }

        const padVector = currentPADState || meta.pad_vector;
        
        const rewritten = rewriteResponse(
            originalResponse,
            padVector,
            meta.risk_level === 'high' ? 'safety_protocol' : 
                (meta.rewrite_intensity > 0.3 ? 'emotional_support' : 'none'),
            meta,
            { personaTone: this.config.personaTone }
        );

        return rewritten;
    }

    async getEmotionTrajectory(userId?: string): Promise<PADVector[]> {
        const trajectories = await storageManager.getEmotionTrajectory(userId || this.config.userId || 'default');
        return trajectories.map((t: EmotionTrajectory) => t.pad_vector);
    }

    async getMemories(userId?: string, days?: number) {
        return storageManager.getMemories(userId || this.config.userId || 'default');
    }

    async getInterventionLogs(userId?: string) {
        return storageManager.getInterventionLogs(userId || this.config.userId || 'default');
    }
}

export const defaultGateway = new EmpathicGateway();

export function createGateway(config?: EmpathicGatewayConfig): EmpathicGateway {
    return new EmpathicGateway(config);
}
