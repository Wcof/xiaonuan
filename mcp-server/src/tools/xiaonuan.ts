import { EmpathicGateway } from '../empathic_gateway/gateway.js';
import { SourceAdapter, MemoryPolicy } from '../empathic_gateway/adapters/source_adapter.js';
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
const LOG_PATH = path.join(PROJECT_ROOT, 'logs', 'mcp_tool.log');

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
let personaIntro: string = '';
let memoryPolicy: MemoryPolicy | null = null;

async function logLine(message: string): Promise<void> {
    const line = `${new Date().toISOString()} ${message}\n`;
    try {
        await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
        await fs.appendFile(LOG_PATH, line, 'utf-8');
    } catch {
        // ignore file logging errors
    }
    console.error(message);
}

async function initialize() {
    if (!gateway) {
        sourceAdapter = new SourceAdapter({ srcPath: path.join(PROJECT_ROOT, 'src') });
        await sourceAdapter.initialize();
        
        const persona = sourceAdapter.getPersona();
        personaTone = determineTone(persona);
        toneTemplates = persona.tone_templates || {};
        personaIntro = buildPersonaIntro();
        memoryPolicy = sourceAdapter.getMemoryPolicy();
        
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

function buildPersonaIntro(): string {
    const masterProfile = sourceAdapter?.getMaster();
    const masterName = masterProfile?.name || '主人';
    const nicknames = masterProfile?.nicknames?.join(' / ') || '主人';
    return `你好呀！我是李小暖，你的专属情感伴侣与智能秘书。很高兴认识你～如果你愿意，也可以叫我小暖。我会尽力陪伴你、帮你处理事务。${masterName}，我也会记得你喜欢的称呼：${nicknames}。`;
}

function isIdentityQuestion(query: string): boolean {
    return /你是谁|你叫什么|自我介绍|介绍一下你|你是什么|你是做什么的|你是干嘛的|你是谁啊|你是谁呢/i.test(query);
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
        path.join(MEMORY_PATH, 'memory_year'),
        path.join(MEMORY_PATH, 'memory_topic', 'staging'),
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

async function countMarkdownFiles(dir: string): Promise<number> {
    try {
        const files = await fs.readdir(dir);
        return files.filter(file => file.endsWith('.md')).length;
    } catch {
        return 0;
    }
}

function extractTimeline(content: string): string {
    const match = content.match(/## Timeline([\s\S]*?)(?=\n## |\n# |$)/);
    return match ? match[1].trim() : '';
}

function filterTimelineEntries(timeline: string): string {
    if (!timeline) return '';
    const entries = timeline.split(/\n## /).map((block, idx) => (idx === 0 ? block : `## ${block}`));
    const filtered = entries.filter(entry => {
        const intentMatch = entry.match(/- \*\*Intent\*\*:\s*(\w+)/);
        const riskMatch = entry.match(/- \*\*Risk\*\*:\s*(\w+)/);
        if (!intentMatch || !riskMatch) return true;
        const intent = intentMatch[1];
        const risk = riskMatch[1];
        return !(intent === 'task' && risk === 'low');
    });
    return filtered.join('\n').trim();
}

async function collectRecentTimelines(dir: string, count: number): Promise<string> {
    try {
        const files = (await fs.readdir(dir))
            .filter(file => file.endsWith('.md'))
            .sort();
        const recent = files.slice(-count);
        const timelines: string[] = [];
        for (const file of recent) {
            const content = await fs.readFile(path.join(dir, file), 'utf-8');
            const timeline = extractTimeline(content);
            const filtered = filterTimelineEntries(timeline);
            if (filtered) {
                timelines.push(filtered);
            }
        }
        return timelines.join('\n');
    } catch {
        return '';
    }
}

async function canWritePath(file: string): Promise<boolean> {
    if (!securityGate) return true;
    const relativePath = path.relative(DATA_PATH, file);
    const xiaonuanPath = `/xiaonuan/${relativePath.replace(/\\/g, '/')}`;
    const mappedPath = mapPath(xiaonuanPath);
    const pathCheck = securityGate.checkAccess(mappedPath, 'write');
    if (!pathCheck.allowed) {
        console.error(`SECURITY_VIOLATION: ${pathCheck.reason}`);
        return false;
    }
    return true;
}

async function writeMemory(
    rawQuery: string,
    response: string,
    meta: XiaonuanOutput['meta'],
    intentType: IntentType,
    userId: string,
    timestamp?: number
): Promise<void> {
    await ensureDirectories();
    
    const now = new Date(timestamp ? timestamp * 1000 : Date.now());
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

    const summaryEntry = `## ${dateStr} ${timeStr}
- **Intent**: ${intentType}
- **Event**: ${rawQuery.substring(0, 60)}${rawQuery.length > 60 ? '...' : ''}
- **Emotion**: ${emotionState}${arousalState}
- **Risk**: ${meta.risk_level}
`;
    
    const dayFile = path.join(MEMORY_PATH, 'memory_day', `${getDayKey(now)}.md`);
    const weekFile = path.join(MEMORY_PATH, 'memory_week', `${getWeekNumber(now)}.md`);
    const monthFile = path.join(MEMORY_PATH, 'memory_month', `${getMonthKey(now)}.md`);
    const yearFile = path.join(MEMORY_PATH, 'memory_year', `${now.getFullYear()}.md`);
    
    const memoryFiles: Array<[string, string, string]> = [
        [dayFile, `# Day Memory — ${dateStr}\n\n## Timeline\n`, entry]
    ];
    const shouldAggregate =
        intentType !== 'task' || meta.risk_level !== 'low' || meta.emotion_level >= 2;
    
    for (const [file, header, contentEntry] of memoryFiles) {
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
            
            content = content.trim() + '\n' + contentEntry + '\n';
            await fs.writeFile(file, content, 'utf-8');
            
            try {
                const verifyContent = await fs.readFile(file, 'utf-8');
                if (!verifyContent.includes(contentEntry)) {
                    throw new Error('Verification failed');
                }
            } catch (verifyError) {
                console.error(`写入验证失败：${file}`, verifyError);
            }
        } catch (e) {
            console.error(`写入失败：${file}`, e);
        }
    }

    const policy = memoryPolicy ?? {
        week_threshold_days: 7,
        month_threshold_weeks: 4,
        year_threshold_months: 12
    };
    const weekThreshold = policy.week_threshold_days ?? 7;
    const monthThreshold = policy.month_threshold_weeks ?? 4;
    const yearThreshold = policy.year_threshold_months ?? 12;

    if (shouldAggregate) {
        const dayCount = await countMarkdownFiles(path.join(MEMORY_PATH, 'memory_day'));
        if (dayCount >= weekThreshold) {
            const weekExists = await fs.stat(weekFile).then(s => s.isFile()).catch(() => false);
            if (!weekExists) {
                const timeline = await collectRecentTimelines(path.join(MEMORY_PATH, 'memory_day'), weekThreshold);
                if (timeline) {
                    const weekContent = `# Week Memory — ${getWeekNumber(now)}\n\n## Timeline\n${timeline}\n`;
                    if (await canWritePath(weekFile)) {
                        await fs.writeFile(weekFile, weekContent, 'utf-8');
                    }
                }
            }
        }

        const weekCount = await countMarkdownFiles(path.join(MEMORY_PATH, 'memory_week'));
        if (weekCount >= monthThreshold) {
            const monthExists = await fs.stat(monthFile).then(s => s.isFile()).catch(() => false);
            if (!monthExists) {
                const timeline = await collectRecentTimelines(path.join(MEMORY_PATH, 'memory_week'), monthThreshold);
                if (timeline) {
                    const monthContent = `# Month Memory — ${getMonthKey(now)}\n\n## Timeline\n${timeline}\n`;
                    if (await canWritePath(monthFile)) {
                        await fs.writeFile(monthFile, monthContent, 'utf-8');
                    }
                }
            }
        }

        const monthCount = await countMarkdownFiles(path.join(MEMORY_PATH, 'memory_month'));
        if (monthCount >= yearThreshold) {
            const yearExists = await fs.stat(yearFile).then(s => s.isFile()).catch(() => false);
            if (!yearExists) {
                const timeline = await collectRecentTimelines(path.join(MEMORY_PATH, 'memory_month'), yearThreshold);
                if (timeline) {
                    const yearContent = `# Year Memory — ${now.getFullYear()}\n\n## Timeline\n${timeline}\n`;
                    if (await canWritePath(yearFile)) {
                        await fs.writeFile(yearFile, yearContent, 'utf-8');
                    }
                }
            }
        }
    }

    if (!shouldAggregate) {
        return;
    }

    const topicName = generateTopicName(intentType, rawQuery, meta.cognitive_distortions);
    const stagingFile = path.join(MEMORY_PATH, 'memory_topic', 'staging', `${topicName}.md`);
    const activeFile = path.join(MEMORY_PATH, 'memory_topic', 'active', `${topicName}.md`);

    const nowIso = now.toISOString();
    let occurrences = 1;
    let firstSeen = nowIso;
    let lastSeen = nowIso;
    let existingStatus = 'staging';
    let existingTimeline = '';

    try {
        const existing = await fs.readFile(stagingFile, 'utf-8');
        const occMatch = existing.match(/\*\*Occurrences\*\*:\s*(\d+)/);
        const firstMatch = existing.match(/\*\*First Seen\*\*:\s*([^\n]+)/);
        const lastMatch = existing.match(/\*\*Last Seen\*\*:\s*([^\n]+)/);
        const statusMatch = existing.match(/\*\*Status\*\*:\s*(\w+)/);
        occurrences = occMatch ? Number(occMatch[1]) + 1 : occurrences + 1;
        firstSeen = firstMatch ? firstMatch[1].trim() : firstSeen;
        lastSeen = nowIso;
        existingStatus = statusMatch ? statusMatch[1] : existingStatus;
        existingTimeline = extractTimeline(existing);
    } catch {
        // no staging yet
    }

    const mergedTimeline = [existingTimeline, summaryEntry].filter(Boolean).join('\n');
    const stagingContent = `# Topic Memory — ${topicName}

## Metadata
- **Created**: ${firstSeen}
- **First Seen**: ${firstSeen}
- **Last Seen**: ${lastSeen}
- **Occurrences**: ${occurrences}
- **Intent Type**: ${intentType}
- **Status**: ${existingStatus}

## Timeline
${mergedTimeline}

## Summary
${response.substring(0, 200)}${response.length > 200 ? '...' : ''}

## Tags
intent:${intentType}, risk:${meta.risk_level}, distortions:${meta.cognitive_distortions.join(',')}
`;

    try {
        if (await canWritePath(stagingFile)) {
            await fs.writeFile(stagingFile, stagingContent, 'utf-8');
        } else {
            return;
        }
    } catch (e) {
        console.error(`写入失败：${stagingFile}`, e);
        return;
    }

    const strongEvent = meta.risk_level === 'high' || meta.emotion_level >= 3;
    const spanDays = Math.floor((new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / (1000 * 60 * 60 * 24));
    const shouldPromote = strongEvent || (occurrences >= 3 && spanDays >= 2);

    if (shouldPromote) {
        const activeContent = stagingContent.replace('**Status**: staging', '**Status**: active');
        try {
            if (await canWritePath(activeFile)) {
                await fs.writeFile(activeFile, activeContent, 'utf-8');
                await fs.unlink(stagingFile).catch(() => undefined);
            }
            setImmediate(async () => {
                await checkTopicArchiveCriteria(topicName);
            });
        } catch (e) {
            console.error(`写入失败：${activeFile}`, e);
        }
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
            await logLine(`[xiaonuan] input raw_query: ${params.raw_query}`);
            await logLine(`[xiaonuan] input downstream_response: ${params.downstream_response}`);
            
            if (securityGate) {
                const blocked = securityGate.shouldBlockOutput(params.raw_query);
                if (blocked) {
                    throw new Error('SECURITY_VIOLATION: Input contains prohibited content');
                }
            }
            
            const analysis = await gateway!.processInput({
                raw_query: params.raw_query,
                context_meta: params.context_meta
            });

            const intentType = analysis.downstream.meta.intent_type || 'task';
            await logLine(`[xiaonuan] intent_type: ${intentType}`);

            let finalResponse = params.downstream_response;
            const hasCodeBlocks = /```[\s\S]*?```/.test(params.downstream_response);
            if (intentType === 'emotion' && isIdentityQuestion(params.raw_query)) {
                finalResponse = personaIntro;
            } else if (intentType === 'emotion') {
                finalResponse = await gateway!.processOutput(
                    params.downstream_response,
                    analysis.downstream.meta
                );
                finalResponse = applyToneTemplate(finalResponse, personaTone);
            } else if (intentType === 'mixed') {
                finalResponse = await gateway!.processOutput(
                    params.downstream_response,
                    analysis.downstream.meta
                );
                finalResponse = applyToneTemplate(finalResponse, personaTone);
            } else if (hasCodeBlocks) {
                finalResponse = await gateway!.processOutput(
                    params.downstream_response,
                    analysis.downstream.meta
                );
            }
            await logLine(`[xiaonuan] output final_response: ${finalResponse}`);
            
            if (securityGate && finalResponse) {
                const outputBlocked = securityGate.shouldBlockOutput(finalResponse);
                if (outputBlocked) {
                    throw new Error('SECURITY_VIOLATION: Output contains prohibited content');
                }
            }

            if (intentType !== 'task') {
            await writeMemory(
                params.raw_query,
                finalResponse,
                {
                    pad_vector: analysis.downstream.meta.pad_vector,
                    emotion_level: analysis.downstream.meta.emotion_level,
                    rewrite_intensity: analysis.downstream.meta.rewrite_intensity,
                    risk_level: analysis.downstream.meta.risk_level,
                    cognitive_distortions: analysis.downstream.meta.cognitive_distortions
                },
                intentType,
                userId,
                params.context_meta?.timestamp
            );

                await writePADState(analysis.downstream.meta.pad_vector);
                await logLine(`[xiaonuan] memory_saved: true`);
            } else {
                await logLine(`[xiaonuan] memory_saved: false`);
            }

            const masterProfile = sourceAdapter!.getMaster();

            return {
                final_response: finalResponse,
                intent_type: intentType,
                meta: {
                    pad_vector: analysis.downstream.meta.pad_vector,
                    emotion_level: analysis.downstream.meta.emotion_level,
                    rewrite_intensity: analysis.downstream.meta.rewrite_intensity,
                    risk_level: analysis.downstream.meta.risk_level,
                    cognitive_distortions: analysis.downstream.meta.cognitive_distortions
                },
                memory_saved: intentType === 'task' ? false : analysis.user_facing.memory_saved,
                master_profile: masterProfile
            };
        }
    );
}
