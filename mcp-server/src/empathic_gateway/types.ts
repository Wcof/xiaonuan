export interface PADVector {
    pleasure: number;
    arousal: number;
    dominance: number;
}

export type IntentType = 'emotion' | 'task' | 'mixed';

export interface GatewayInput {
    raw_query: string;
    context_meta?: {
        user_id?: string;
        timestamp?: number;
        session_id?: string;
    };
}

export interface GatewayMeta {
    emotion_level: number;
    pad_vector: PADVector;
    trigger_reason: string;
    rewrite_intensity: number;
    confidence: number;
    cognitive_distortions: string[];
    risk_level: 'low' | 'medium' | 'high';
    cognition_labels?: string[];
    master_summary?: string;
    persona_tone?: string;
    intent_type?: IntentType;
}

export interface DownstreamOutput {
    raw_query: string;
    meta: GatewayMeta;
}

export interface UserFacingOutput {
    final_response: string;
    intervention_type: 'none' | 'emotional_support' | 'safety_protocol';
    memory_saved: boolean;
}

export interface GatewayOutput {
    downstream: DownstreamOutput;
    user_facing: UserFacingOutput;
}

export type MemoryType = 'event' | 'emotion_trajectory' | 'insight';

export interface EmotionalMemory {
    id: string;
    content: string;
    type: MemoryType;
    pad_vector: PADVector;
    emotion_tags: string[];
    cognitive_distortions: string[];
    weight: number;
    trigger_importance: boolean;
    related_memories: string[];
    topic_id?: string;
    user_id: string;
    device_id: string;
    version: number;
    timestamp: number;
    created_at: string;
    updated_at: string;
}

export interface MemoryCandidate {
    id?: number;
    type: 'event' | 'emotion_trajectory' | 'insight';
    summary: string;
    emotion_trajectory: PADVector;
    timestamp: number;
    weight: number;
    user_id?: string;
    created_at?: number;
    updated_at?: number;
}

export interface MemoryQuery {
    user_id?: string;
    type?: MemoryType;
    start_time?: number;
    end_time?: number;
    emotion_tags?: string[];
    topic_id?: string;
    limit?: number;
    offset?: number;
    before_timestamp?: number;
    is_archived?: boolean;
}

export interface HistoryEntry {
    id: string;
    memory_id: string;
    old_memory?: string;
    new_memory?: string;
    event: 'ADD' | 'UPDATE' | 'DELETE';
    created_at: string;
    actor_id?: string;
    role?: 'user' | 'assistant';
}

export interface InterventionLog {
    id?: number;
    user_id?: string;
    timestamp: number;
    trigger_reason: string;
    intervention_type: string;
    rewrite_intensity: number;
    original_response?: string;
    rewritten_response?: string;
}

export interface EmotionTrajectory {
    id?: number;
    user_id?: string;
    timestamp: number;
    pad_vector: PADVector;
    context?: string;
    created_at?: string;
}
