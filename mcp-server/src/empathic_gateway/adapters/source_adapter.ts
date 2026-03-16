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
    week_threshold_days?: number;
    month_threshold_weeks?: number;
    year_threshold_months?: number;
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
    // 支持多路径搜索，用于兼容不同安装方式
    // 方式A: Claude官方加载 SKILL.md（项目根目录）
    // 方式B: MCP模式使用 src/ 目录
}

// 备用默认值 - 仅在源文件不存在或解析失败时使用
// 所有配置应优先从 src/ 目录下的源文件提取
const FALLBACK_TRAITS = {
    openness: 0.6,
    conscientiousness: 0.7,
    extraversion: 0.5,
    agreeableness: 0.8,
    neuroticism: 0.3
};

const FALLBACK_TONE_TEMPLATES = {
    default: '好的呢，{response}',
    sweet: '哎呀，{response}～爱你哦',
    playful: '嘿嘿，{response} 才好玩呢',
    depressed: '嗯...{response}',
    strict: '{response}，请严格执行。'
};

const FALLBACK_MASTER: MasterProfile = {
    name: '李燈辉',
    nicknames: ['辉辉', '宝宝'],
    timezone: 'Asia/Shanghai',
    labels: [],
    summary: ''
};

const FALLBACK_SECURITY: SecurityPolicy = {
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
        // 支持双路径：优先使用 srcPath，否则默认 ./src
        // 这样可以兼容：
        // - MCP模式: 从 src/ 目录读取
        // - 直接装载模式: 从根目录读取（Claude官方方式）
        this.srcPath = config.srcPath || './src';
    }

    // 尝试多个可能存在的路径，返回第一个可用的
    private async tryReadFile(possiblePaths: string[]): Promise<{ content: string; path: string } | null> {
        for (const filePath of possiblePaths) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                return { content, path: filePath };
            } catch {
                // 文件不存在，继续尝试下一个路径
            }
        }
        return null;
    }

    async initialize(): Promise<void> {
        this.config = await this.loadSourceConfig();
    }

    private async loadSourceConfig(): Promise<SourceConfig> {
        const config: SourceConfig = {
            persona: await this.loadPersonaConfig(),
            master: await this.loadMasterProfile(),
            memory: await this.loadMemoryPolicy(),
            security: await this.loadSecurityPolicy()
        };

        return config;
    }

    private async loadPersonaConfig(): Promise<PersonaConfig> {
        // 从源文件 soul_base.md 提取人格配置
        try {
            const soulBasePath = path.join(this.srcPath, 'soul_base.md');
            const content = await fs.readFile(soulBasePath, 'utf-8');
            
            const traits: Record<string, number> = { ...FALLBACK_TRAITS };
            const toneTemplates: Record<string, string> = { ...FALLBACK_TONE_TEMPLATES };
            const behaviorPatterns: Record<string, any> = {};
            
            // 提取大五人格基准值 - 查找 JSON 块
            const traitsMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
            if (traitsMatch) {
                try {
                    const parsed = JSON.parse(traitsMatch[1].trim());
                    for (const [key, value] of Object.entries(parsed)) {
                        if (typeof value === 'number' && value >= 0 && value <= 1) {
                            traits[key] = value;
                        }
                    }
                } catch (e) {
                    console.warn('[SourceAdapter] 解析 traits 失败，使用默认值');
                }
            }
            
            // 提取行为模板中的 tone_templates
            const templatesMatch = content.match(/behavior_templates[\s\S]*?```json\s*([\s\S]*?)```/);
            if (templatesMatch) {
                try {
                    const parsed = JSON.parse(templatesMatch[1].trim());
                    if (parsed.tone_templates) {
                        Object.assign(toneTemplates, parsed.tone_templates);
                    }
                    Object.assign(behaviorPatterns, parsed);
                } catch (e) {
                    console.warn('[SourceAdapter] 解析 behavior_templates 失败');
                }
            }

            return {
                traits,
                tone_templates: toneTemplates,
                behavior_patterns: behaviorPatterns
            };
        } catch (error) {
            console.warn('[SourceAdapter] 加载 persona 配置失败，使用默认值:', error);
            return {
                traits: FALLBACK_TRAITS,
                tone_templates: FALLBACK_TONE_TEMPLATES,
                behavior_patterns: {}
            };
        }
    }

    private async loadMasterProfile(): Promise<MasterProfile> {
        // 从源文件 master_base.md 提取主人信息
        try {
            const masterBasePath = path.join(this.srcPath, 'master_base.md');
            const content = await fs.readFile(masterBasePath, 'utf-8');
            
            const profile: MasterProfile = { ...FALLBACK_MASTER };
            
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
            console.warn('[SourceAdapter] 加载 master 配置失败，使用默认值');
            return FALLBACK_MASTER;
        }
    }

    private buildDefaultMemoryPolicy(): MemoryPolicy {
        return {
            time_decay_half_life: 7 * 24 * 3600,
            event_threshold: 0.3,
            storage_type: 'jsonl',
            week_threshold_days: 7,
            month_threshold_weeks: 4,
            year_threshold_months: 12
        };
    }

    private mapXiaonuanPathToRelative(rawPath: string): string {
        const normalized = rawPath.trim().replace(/\/+$/, '');
        const mappings: Array<[string, string]> = [
            ['/xiaonuan/memory_bank/', 'memory/'],
            ['/xiaonuan/memory/', 'memory/'],
            ['/xiaonuan/master/', 'master/'],
            ['/xiaonuan/soul/', 'soul/'],
            ['/xiaonuan/task/', 'task/'],
            ['/xiaonuan/skills/', 'skills/'],
            ['/xiaonuan/secure_bank/', 'secure_bank/']
        ];
        for (const [prefix, target] of mappings) {
            if (normalized.startsWith(prefix)) {
                return (target + normalized.slice(prefix.length)).replace(/\/+$/, '');
            }
        }
        if (normalized.startsWith('/xiaonuan/')) {
            return normalized.slice('/xiaonuan/'.length).replace(/\/+$/, '');
        }
        return normalized;
    }

    private extractSectionContent(markdown: string, heading: string): string | null {
        const lines = markdown.split(/\r?\n/);
        const startIndex = lines.findIndex(line => line.trim() === heading);
        if (startIndex === -1) return null;
        const body: string[] = [];
        for (let i = startIndex + 1; i < lines.length; i += 1) {
            const trimmed = lines[i].trim();
            if (trimmed.startsWith('#')) break;
            body.push(lines[i]);
        }
        const result = body.join('\n').trim();
        return result.length > 0 ? result : null;
    }

    private parseSecurityPaths(section: string): string[] {
        const paths: string[] = [];
        for (const line of section.split(/\r?\n/)) {
            if (!line.includes('|')) continue;
            const match = line.match(/\|\s*(\/xiaonuan\/[^|]+)\s*\|/);
            if (match) {
                paths.push(this.mapXiaonuanPathToRelative(match[1]));
            }
        }
        return paths.filter(p => p.length > 0);
    }

    private async loadSecurityPolicy(): Promise<SecurityPolicy> {
        // 从源文件 SKILL.md 提取安全层级配置
        try {
            const skillPath = path.join(this.srcPath, 'SKILL.md');
            const content = await fs.readFile(skillPath, 'utf-8');
            const publicSection =
                this.extractSectionContent(content, '### Level 1 — PUBLIC（公开层）') ??
                this.extractSectionContent(content, '### Level 1 - PUBLIC（公开层）') ??
                this.extractSectionContent(content, '### Level 1 — PUBLIC');
            const protectedSection =
                this.extractSectionContent(content, '### Level 2 — PROTECTED（保护层）') ??
                this.extractSectionContent(content, '### Level 2 - PROTECTED（保护层）') ??
                this.extractSectionContent(content, '### Level 2 — PROTECTED');
            const sealedSection =
                this.extractSectionContent(content, '### Level 3 — SEALED（封印层）') ??
                this.extractSectionContent(content, '### Level 3 - SEALED（封印层）') ??
                this.extractSectionContent(content, '### Level 3 — SEALED');

            const publicPaths = publicSection ? this.parseSecurityPaths(publicSection) : [];
            const protectedPaths = protectedSection ? this.parseSecurityPaths(protectedSection) : [];
            const sealedPaths = sealedSection ? this.parseSecurityPaths(sealedSection) : [];

            if (publicPaths.length === 0 && protectedPaths.length === 0 && sealedPaths.length === 0) {
                return FALLBACK_SECURITY;
            }

            return {
                public_paths: publicPaths.length > 0 ? publicPaths : FALLBACK_SECURITY.public_paths,
                protected_paths: protectedPaths.length > 0 ? protectedPaths : FALLBACK_SECURITY.protected_paths,
                sealed_paths: sealedPaths.length > 0 ? sealedPaths : FALLBACK_SECURITY.sealed_paths,
                enforce_sealed: true
            };
        } catch (error) {
            console.warn('[SourceAdapter] 加载 security 配置失败，使用默认值');
            return FALLBACK_SECURITY;
        }
    }

    private async loadMemoryPolicy(): Promise<MemoryPolicy> {
        // 从源文件 memory_base.md 提取记忆策略配置
        const defaults = this.buildDefaultMemoryPolicy();
        try {
            const memoryPath = path.join(this.srcPath, 'memory_base.md');
            const content = await fs.readFile(memoryPath, 'utf-8');

            const weekMatch = content.match(/周记忆[\s\S]*?≥\s*(\d+)\s*条天记忆/);
            const monthMatch = content.match(/月记忆[\s\S]*?≥\s*(\d+)\s*条周记忆/);
            const yearMatch = content.match(/年记忆[\s\S]*?≥\s*(\d+)\s*条月记忆/);

            return {
                time_decay_half_life: defaults.time_decay_half_life,
                event_threshold: defaults.event_threshold,
                storage_type: defaults.storage_type,
                week_threshold_days: weekMatch ? Number(weekMatch[1]) : defaults.week_threshold_days,
                month_threshold_weeks: monthMatch ? Number(monthMatch[1]) : defaults.month_threshold_weeks,
                year_threshold_months: yearMatch ? Number(yearMatch[1]) : defaults.year_threshold_months
            };
        } catch (error) {
            console.warn('[SourceAdapter] 加载 memory 配置失败，使用默认值');
            return defaults;
        }
    }

    getConfig(): SourceConfig {
        if (!this.config) {
            return {
                persona: {
                    traits: FALLBACK_TRAITS,
                    tone_templates: FALLBACK_TONE_TEMPLATES,
                    behavior_patterns: {}
                },
                master: FALLBACK_MASTER,
                memory: this.buildDefaultMemoryPolicy(),
                security: FALLBACK_SECURITY
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

    isPathAccessible(filePath: string, operation: 'read' | 'write'): boolean {
        const security = this.getSecurityPolicy();
        
        if (security.enforce_sealed && security.sealed_paths.some((p: string) => filePath.includes(p))) {
            return false;
        }
        
        return true;
    }
}

export const defaultSourceAdapter = new SourceAdapter();
