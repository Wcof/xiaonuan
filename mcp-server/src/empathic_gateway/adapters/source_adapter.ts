import fs from 'fs/promises';
import path from 'path';

export interface PersonaConfig {
    traits: Record<string, number>;
    tone_templates: Record<string, string>;
    behavior_patterns: Record<string, any>;
}

export interface MasterProfile {
    name: string;
    nicknames: string[];
    timezone: string;
    labels: string[];
    summary: string;
}

export interface MemoryPolicy {
    time_decay_half_life: number;
    event_threshold: number;
    storage_type: 'jsonl' | 'sqlite';
}

export interface SecurityPolicy {
    public_paths: string[];
    protected_paths: string[];
    sealed_paths: string[];
    enforce_sealed: boolean;
}

export interface SourceConfig {
    persona: PersonaConfig;
    master: MasterProfile;
    memory: MemoryPolicy;
    security: SecurityPolicy;
}

export interface SourceAdapterConfig {
    srcPath?: string;
}

const DEFAULT_TRAITS = {
    openness: 0.6,
    conscientiousness: 0.7,
    extraversion: 0.5,
    agreeableness: 0.8,
    neuroticism: 0.3
};

const DEFAULT_TONE_TEMPLATES = {
    default: '好的呢，{response}',
    sweet: '哎呀，{response}～爱你哦',
    playful: '嘿嘿，{response} 才好玩呢',
    depressed: '嗯...{response}',
    strict: '{response}，请严格执行。'
};

const DEFAULT_MASTER: MasterProfile = {
    name: '李燈辉',
    nicknames: ['辉辉', '宝宝'],
    timezone: 'Asia/Shanghai',
    labels: [],
    summary: ''
};

const DEFAULT_SECURITY: SecurityPolicy = {
    public_paths: [
        'task/task_process',
        'task/task_log',
        'memory/memory_day',
        'memory/memory_week',
        'skills/skills_hot'
    ],
    protected_paths: [
        'master/master_basic',
        'master/master_health',
        'soul/soul_configuration',
        'soul/soul_variable'
    ],
    sealed_paths: [
        'secure_bank/secure_key',
        'secure_bank/secure_message'
    ],
    enforce_sealed: true
};

export class SourceAdapter {
    private srcPath: string;
    private config: SourceConfig | null = null;

    constructor(config: SourceAdapterConfig = {}) {
        this.srcPath = config.srcPath || './src';
    }

    async initialize(): Promise<void> {
        this.config = await this.loadSourceConfig();
    }

    private async loadSourceConfig(): Promise<SourceConfig> {
        const config: SourceConfig = {
            persona: await this.loadPersonaConfig(),
            master: await this.loadMasterProfile(),
            memory: this.loadMemoryPolicy(),
            security: DEFAULT_SECURITY
        };

        return config;
    }

    private async loadPersonaConfig(): Promise<PersonaConfig> {
        try {
            const soulBasePath = path.join(this.srcPath, 'soul_base.md');
            const content = await fs.readFile(soulBasePath, 'utf-8');
            
            const traits: Record<string, number> = { ...DEFAULT_TRAITS };
            const toneTemplates: Record<string, string> = { ...DEFAULT_TONE_TEMPLATES };
            const behaviorPatterns: Record<string, any> = {};
            
            const traitsMatch = content.match(/###\s*1\.1.*?```json\s*([\s\S]*?)```/);
            if (traitsMatch) {
                try {
                    const parsed = JSON.parse(traitsMatch[1]);
                    Object.assign(traits, parsed);
                } catch (e) {
                    // Use defaults
                }
            }
            
            const behaviorTemplatesMatch = content.match(/###\s*1\.3.*?behavior_templates\.json[\s\S]*?```json\s*([\s\S]*?)```/);
            if (behaviorTemplatesMatch) {
                try {
                    const parsed = JSON.parse(behaviorTemplatesMatch[1]);
                    Object.assign(behaviorPatterns, parsed);
                    Object.assign(toneTemplates, parsed);
                } catch (e) {
                    // Use defaults
                }
            }
            
            const decisionTreeMatch = content.match(/###\s*1\.3[\s\S]*?decision_tree[\s\S]*?(\|.*?High.*?High.*?Low.*?\|[\s\S]*?\|)/);
            if (decisionTreeMatch) {
                behaviorPatterns.decision_tree = decisionTreeMatch[1];
            }

            return {
                traits,
                tone_templates: toneTemplates,
                behavior_patterns: behaviorPatterns
            };
        } catch (error) {
            return {
                traits: DEFAULT_TRAITS,
                tone_templates: DEFAULT_TONE_TEMPLATES,
                behavior_patterns: {}
            };
        }
    }

    private async loadMasterProfile(): Promise<MasterProfile> {
        try {
            const masterBasePath = path.join(this.srcPath, 'master_base.md');
            const content = await fs.readFile(masterBasePath, 'utf-8');
            
            const profile: MasterProfile = { ...DEFAULT_MASTER };
            
            const nameMatch = content.match(/\*\*姓名\*\*[：:]\s*(\S+)/);
            if (nameMatch) {
                profile.name = nameMatch[1];
            }
            
            const nicknameMatch = content.match(/\*\*昵称\*\*[：:]\s*([^\n]+)/);
            if (nicknameMatch) {
                profile.nicknames = nicknameMatch[1].split(/[、,]/).map(s => s.trim());
            }
            
            const timezoneMatch = content.match(/\*\*时区\*\*[：:]\s*(\S+)/);
            if (timezoneMatch) {
                profile.timezone = timezoneMatch[1];
            }
            
            const labelsMatch = content.match(/\*\*标签\*\*[：:]\s*([^\n]+)/);
            if (labelsMatch) {
                profile.labels = labelsMatch[1].split(/[、,]/).map(s => s.trim());
            }
            
            const summaryMatch = content.match(/\*\*简介\*\*[：:]\s*([^\n]+)/);
            if (summaryMatch) {
                profile.summary = summaryMatch[1].trim();
            }
            
            if (profile.labels.length === 0) {
                profile.labels = ['AI 伴侣', '个人秘书', '赛博朋克'];
            }
            
            if (!profile.summary) {
                profile.summary = `${profile.name}的专属情感伴侣与智能秘书`;
            }

            return profile;
        } catch (error) {
            return DEFAULT_MASTER;
        }
    }

    private loadMemoryPolicy(): MemoryPolicy {
        return {
            time_decay_half_life: 7 * 24 * 3600,
            event_threshold: 0.3,
            storage_type: 'jsonl'
        };
    }

    getConfig(): SourceConfig {
        if (!this.config) {
            return {
                persona: {
                    traits: DEFAULT_TRAITS,
                    tone_templates: DEFAULT_TONE_TEMPLATES,
                    behavior_patterns: {}
                },
                master: DEFAULT_MASTER,
                memory: this.loadMemoryPolicy(),
                security: DEFAULT_SECURITY
            };
        }
        return this.config;
    }

    getPersona(): PersonaConfig {
        return this.getConfig().persona;
    }

    getMaster(): MasterProfile {
        return this.getConfig().master;
    }

    getMemoryPolicy(): MemoryPolicy {
        return this.getConfig().memory;
    }

    getSecurityPolicy(): SecurityPolicy {
        return this.getConfig().security;
    }

    isPathAccessible(path: string, operation: 'read' | 'write'): boolean {
        const security = this.getSecurityPolicy();
        
        if (security.enforce_sealed && security.sealed_paths.some((p: string) => path.includes(p))) {
            return false;
        }
        
        return true;
    }
}

export const defaultSourceAdapter = new SourceAdapter();
