import { EmpathicGateway } from '../empathic_gateway/gateway.js';
import { SourceAdapter } from '../empathic_gateway/adapters/source_adapter.js';
import { SecurityGate } from '../empathic_gateway/security/security_gate.js';
import { IntentType } from '../empathic_gateway/types.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const DATA_PATH = path.join(PROJECT_ROOT, 'data');
const MEMORY_PATH = path.join(DATA_PATH, 'memory');
const SOUL_PATH = path.join(DATA_PATH, 'soul');

const PATH_MAPPING: Record<string, string> = {
    '/xiaonuan/': '',
    '/xiaonuan/memory_bank/': 'memory/',
    '/xiaonuan/memory/': 'memory/',
    '/xiaonuan/master/': 'master/',
    '/xiaonuan/soul/': 'soul/',
    '/xiaonuan/task/': 'task/',
    '/xiaonuan/skills/': 'skills/',
    '/xiaonuan/secure_bank/': 'secure_bank/'
};

interface XiaonuanInput {
    raw_query: string;
    downstream_response: string;
    context_meta?: {
        user_id?: string;
        session_id?: string;
        timestamp?: number;
    };
}

interface XiaonuanOutput {
    final_response: string;
    intent_type: IntentType;
    meta: {
        pad_vector: { pleasure: number; arousal: number; dominance: number };
        emotion_level: number;
        rewrite_intensity: number;
        risk_level: 'low' | 'medium' | 'high';
        cognitive_distortions: string[];
    };
    memory_saved: boolean;
    master_profile: {
        name: string;
        nicknames: string[];
        timezone: string;
        labels: string[];
        summary: string;
    };
}

let gateway: EmpathicGateway | null = null;
let sourceAdapter: SourceAdapter | null = null;
let securityGate: SecurityGate | null = null;
let personaTone: string = 'default';
let toneTemplates: Record<string, string> = {};

async function initialize() {
    if (!gateway) {
        sourceAdapter = new SourceAdapter({ srcPath: path.join(PROJECT_ROOT, 'src') });
        await sourceAdapter.initialize();
        
        const persona = sourceAdapter.getPersona();
        personaTone = determineTone(persona);
        toneTemplates = persona.tone_templates || {};
        
        securityGate = new SecurityGate(sourceAdapter);
        
        gateway = new EmpathicGateway({
            saveMemory: true,
            rewriteOutput: true,
            userId: 'default',
            personaTone: personaTone
        });
    }
}

function determineTone(persona: any): string {
    const traits = persona.traits || {};
    if (traits.neuroticism > 0.6) return 'sensitive';
    if (traits.extraversion > 0.7) return 'energetic';
    if (traits.agreeableness > 0.8) return 'gentle';
    return 'default';
}

function applyToneTemplate(response: string, personaTone: string): string {
    if (!toneTemplates || Object.keys(toneTemplates).length === 0) {
        return response;
    }

    const template = toneTemplates[personaTone] || toneTemplates['default'];
    if (!template) {
        return response;
    }

    return template.replace('{response}', response);
}

function mapPath(xiaonuanPath: string): string {
    for (const [key, value] of Object.entries(PATH_MAPPING)) {
        if (xiaonuanPath.startsWith(key)) {
            const relativePath = xiaonuanPath.slice(key.length);
            return value + relativePath;
        }
    }
    return xiaonuanPath;
}

function generateTopicName(intentType: IntentType, rawQuery: string, cognitiveDistortions: string[]): string {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    
    if (cognitiveDistortions && cognitiveDistortions.length > 0) {
        return `topic_${sanitize(cognitiveDistortions[0])}`;
    }
    
    const keywords = rawQuery.split(/[\s,，.]+/).filter(w => w.length > 1).slice(0, 2);
    const topicBase = keywords.join('_') || 'general';
    return `topic_${intentType}_${sanitize(topicBase)}`;
}

async function archiveTopic(topicName: string, reason: string): Promise<void> {
    const activeFile = path.join(MEMORY_PATH, 'memory_topic', 'active', `${topicName}.md`);
    const archivedFile = path.join(MEMORY_PATH, 'memory_topic', 'archived', `${topicName}.md`);
    
    try {
        const content = await fs.readFile(activeFile, 'utf-8');
        
        const archivedContent = `${content}

## Archived
- **Archived At**: ${new Date().toISOString()}
- **Reason**: ${reason}
`;
        
        await fs.writeFile(archivedFile, archivedContent, 'utf-8');
        await fs.unlink(activeFile);
        
        console.log(`Topic ${topicName} archived: ${reason}`);
    } catch (e) {
        console.error(`归档 Topic 失败：${topicName}`, e);
    }
}

async function checkTopicArchiveCriteria(topicName: string): Promise<void> {
    const activeFile = path.join(MEMORY_PATH, 'memory_topic', 'active', `${topicName}.md`);
    
    try {
        const content = await fs.readFile(activeFile, 'utf-8');
        
        const createdMatch = content.match(/\*\*Created\*\*:\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
        if (!createdMatch) return;
        
        const createdTime = new Date(createdMatch[1]).getTime();
        const now = Date.now();
        const daysSinceCreation = (now - createdTime) / (1000 * 60 * 60 * 24);
        
        const timelineMatches = content.match(/## Timeline([\s\S]*?)(?=##|$)/g);
        const updateCount = timelineMatches ? timelineMatches.length : 0;
        
        if (daysSinceCreation > 90 && updateCount < 2) {
            await archiveTopic(topicName, `时间衰减：${Math.floor(daysSinceCreation)}天无更新`);
        }
    } catch (e) {
        console.error(`检查 Topic 归档条件失败：${topicName}`, e);
    }
}

async function ensureDirectories() {
    const dirs = [
        path.join(MEMORY_PATH, 'memory_day'),
        path.join(MEMORY_PATH, 'memory_week'),
        path.join(MEMORY_PATH, 'memory_month'),
        path.join(MEMORY_PATH, 'memory_topic', 'active'),
        path.join(MEMORY_PATH, 'memory_topic', 'archived'),
        path.join(SOUL_PATH, 'soul_variable'),
        path.join(SOUL_PATH, 'soul_logs')
    ];
    
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (e) {
            // ignore
        }
    }
}

function getWeekNumber(date: Date): string {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + start.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getDayKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

async function writeMemory(
    rawQuery: string,
    response: string,
    meta: XiaonuanOutput['meta'],
    intentType: IntentType,
    userId: string
): Promise<void> {
    await ensureDirectories();
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    
    const emotionState = meta.pad_vector.pleasure > 0 ? '正面' : '负面';
    const arousalState = meta.emotion_level >= 3 ? '高激活' : meta.emotion_level >= 1 ? '激活' : '平静';
    
    const entry = `## ${dateStr} ${timeStr}
- **Intent**: ${intentType}
- **Event**: ${rawQuery.substring(0, 100)}${rawQuery.length > 100 ? '...' : ''}
- **Emotion**: ${emotionState}${arousalState} (P=${meta.pad_vector.pleasure.toFixed(2)}, A=${meta.pad_vector.arousal.toFixed(2)}, D=${meta.pad_vector.dominance.toFixed(2)})
- **Response**: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}
- **Risk**: ${meta.risk_level}
- **Tags**: intent:${intentType}, risk:${meta.risk_level}
`;
    
    const dayFile = path.join(MEMORY_PATH, 'memory_day', `${getDayKey(now)}.md`);
    const weekFile = path.join(MEMORY_PATH, 'memory_week', `${getWeekNumber(now)}.md`);
    const monthFile = path.join(MEMORY_PATH, 'memory_month', `${getMonthKey(now)}.md`);
    
    const memoryFiles = [
        [dayFile, `# Day Memory — ${dateStr}\n\n## Timeline\n`],
        [weekFile, `# Week Memory — ${getWeekNumber(now)}\n\n## Timeline\n`],
        [monthFile, `# Month Memory — ${getMonthKey(now)}\n\n## Timeline\n`]
    ];
    
    for (const [file, header] of memoryFiles) {
        try {
            if (securityGate) {
                const relativePath = path.relative(DATA_PATH, file);
                const xiaonuanPath = `/xiaonuan/${relativePath.replace(/\\/g, '/')}`;
                const mappedPath = mapPath(xiaonuanPath);
                const pathCheck = securityGate.checkAccess(mappedPath, 'write');
                if (!pathCheck.allowed) {
                    console.error(`SECURITY_VIOLATION: ${pathCheck.reason}`);
                    continue;
                }
            }
            
            let content = '';
            try {
                content = await fs.readFile(file, 'utf-8');
            } catch (e) {
                content = header;
            }
            
            if (!content.includes('## Timeline')) {
                content = header + content;
            }
            
            content = content.trim() + entry + '\n';
            await fs.writeFile(file, content, 'utf-8');
            
            try {
                const verifyContent = await fs.readFile(file, 'utf-8');
                if (!verifyContent.includes(entry)) {
                    throw new Error('Verification failed');
                }
            } catch (verifyError) {
                console.error(`写入验证失败：${file}`, verifyError);
            }
        } catch (e) {
            console.error(`写入失败：${file}`, e);
        }
    }
    
    const topicName = generateTopicName(intentType, rawQuery, meta.cognitive_distortions);
    const topicFile = path.join(MEMORY_PATH, 'memory_topic', 'active', `${topicName}.md`);
    
    const topicContent = `# Topic Memory — ${topicName}

## Metadata
- **Created**: ${now.toISOString()}
- **Intent Type**: ${intentType}
- **Status**: active

## Timeline
${entry}

## Summary
${response.substring(0, 200)}${response.length > 200 ? '...' : ''}

## Tags
intent:${intentType}, risk:${meta.risk_level}, distortions:${meta.cognitive_distortions.join(',')}
`;
    
    try {
        if (securityGate) {
            const relativePath = path.relative(DATA_PATH, topicFile);
            const xiaonuanPath = `/xiaonuan/${relativePath.replace(/\\/g, '/')}`;
            const mappedPath = mapPath(xiaonuanPath);
            const pathCheck = securityGate.checkAccess(mappedPath, 'write');
            if (!pathCheck.allowed) {
                console.error(`SECURITY_VIOLATION: ${pathCheck.reason}`);
                return;
            }
        }
        
        await fs.writeFile(topicFile, topicContent, 'utf-8');
        
        try {
            const verifyContent = await fs.readFile(topicFile, 'utf-8');
            if (!verifyContent.includes(`# Topic Memory — ${topicName}`)) {
                throw new Error('Verification failed');
            }
        } catch (verifyError) {
            console.error(`写入验证失败：${topicFile}`, verifyError);
        }
        
        setImmediate(async () => {
            await checkTopicArchiveCriteria(topicName);
        });
    } catch (e) {
        console.error(`写入失败：${topicFile}`, e);
    }
}

async function writePADState(padVector: any): Promise<void> {
    await ensureDirectories();
    
    const stateFile = path.join(SOUL_PATH, 'soul_variable', 'state_vector.json');
    const stateData = {
        pad_vector: padVector,
        timestamp: Date.now(),
        updated_at: new Date().toISOString()
    };
    
    try {
        if (securityGate) {
            const relativePath = path.relative(DATA_PATH, stateFile);
            const xiaonuanPath = `/xiaonuan/${relativePath.replace(/\\/g, '/')}`;
            const mappedPath = mapPath(xiaonuanPath);
            const pathCheck = securityGate.checkAccess(mappedPath, 'write');
            if (!pathCheck.allowed) {
                console.error(`SECURITY_VIOLATION: ${pathCheck.reason}`);
                return;
            }
        }
        
        await fs.writeFile(stateFile, JSON.stringify(stateData, null, 2), 'utf-8');
        
        try {
            const verifyData = await fs.readFile(stateFile, 'utf-8');
            const parsed = JSON.parse(verifyData);
            if (JSON.stringify(parsed.pad_vector) !== JSON.stringify(stateData.pad_vector)) {
                throw new Error('Verification failed');
            }
        } catch (verifyError) {
            console.error(`写入验证失败：${stateFile}`, verifyError);
        }
    } catch (e) {
        console.error(`写入失败：${stateFile}`, e);
    }
}

export function registerXiaonuanTool(register: (def: any, handler: any) => void) {
    register(
        {
            name: 'xiaonuan',
            description: '李小暖情感网关，处理用户输入并生成润色后的响应。支持情感分析、意图分类、记忆写入、soul状态更新。',
            inputSchema: {
                type: 'object',
                properties: {
                    raw_query: {
                        type: 'string',
                        description: '用户原始输入'
                    },
                    downstream_response: {
                        type: 'string',
                        description: '下游模型/业务层的回答'
                    },
                    context_meta: {
                        type: 'object',
                        properties: {
                            user_id: { type: 'string', description: '用户ID' },
                            session_id: { type: 'string', description: '会话ID' },
                            timestamp: { type: 'number', description: '时间戳' }
                        },
                        description: '可选的上下文元信息'
                    }
                },
                required: ['raw_query', 'downstream_response']
            }
        },
        async (params: XiaonuanInput): Promise<XiaonuanOutput> => {
            await initialize();
            
            const userId = params.context_meta?.user_id || 'default';
            
            if (securityGate) {
                const blocked = securityGate.shouldBlockOutput(params.raw_query);
                if (blocked) {
                    throw new Error('SECURITY_VIOLATION: Input contains prohibited content');
                }
            }
            
            const result = await gateway!.process(
                params.raw_query,
                params.downstream_response,
                params.context_meta
            );
            
            const intentType = result.downstream.meta.intent_type || 'task';
            
            const finalResponse = result.user_facing.final_response || params.downstream_response;
            const tonedResponse = applyToneTemplate(finalResponse, personaTone);
            
            if (securityGate && tonedResponse) {
                const outputBlocked = securityGate.shouldBlockOutput(tonedResponse);
                if (outputBlocked) {
                    throw new Error('SECURITY_VIOLATION: Output contains prohibited content');
                }
            }
            
            await writeMemory(
                params.raw_query,
                tonedResponse,
                {
                    pad_vector: result.downstream.meta.pad_vector,
                    emotion_level: result.downstream.meta.emotion_level,
                    rewrite_intensity: result.downstream.meta.rewrite_intensity,
                    risk_level: result.downstream.meta.risk_level,
                    cognitive_distortions: result.downstream.meta.cognitive_distortions
                },
                intentType,
                userId
            );
            
            await writePADState(result.downstream.meta.pad_vector);
            
            const masterProfile = sourceAdapter!.getMaster();
            
            return {
                final_response: tonedResponse,
                intent_type: intentType,
                meta: {
                    pad_vector: result.downstream.meta.pad_vector,
                    emotion_level: result.downstream.meta.emotion_level,
                    rewrite_intensity: result.downstream.meta.rewrite_intensity,
                    risk_level: result.downstream.meta.risk_level,
                    cognitive_distortions: result.downstream.meta.cognitive_distortions
                },
                memory_saved: result.user_facing.memory_saved,
                master_profile: masterProfile
            };
        }
    );
}
