export interface CognitiveDistortionConfig {
    patterns: RegExp[];
    intervention: string;
    description: string;
}

export const COGNITIVE_DISTORTION_PATTERNS: Record<string, CognitiveDistortionConfig> = {
    catastrophizing: {
        patterns: [
            /(?:\一定|肯定|完全|永远|绝对).*(?:失败|完蛋|毁了|糟糕|不行|没救)/,
            /(?:\最坏|最差|最糟).*(?:\情况|结果|局面|下场)/,
            /(?:\彻底|完全|彻底地).*(?:失败|完蛋|没戏)/,
            /(?:\永远|这辈子|这一生).*(?:不会|不可能|无法)/
        ],
        intervention: 'cognitive_reappraisal',
        description: '灾难化思维：将负面事件视为无法挽回的灾难'
    },
    overgeneralization: {
        patterns: [
            /(?:\总是|从不|每次|所有人|所有人|没人|谁都).*(?:\都|不|会|能)/,
            /(?:\从来没有|从未).*(?:\成功|顺利|好事)/,
            /(?:\一(?:次|切|切).*失败|一(?:次|切).*错)/
        ],
        intervention: 'evidence_gathering',
        description: '过度泛化：从单一事件得出普遍性负面结论'
    },
    black_white_thinking: {
        patterns: [
            /(?:\要么|不是...就是|非此即彼)/,
            /(?:\全部|一点|根本|完全).*(?:\好|坏|对|错|成功|失败)/,
            /(?:\不是|就不|休想).*/
        ],
        intervention: 'nuance_exploration',
        description: '黑白思维：极端化地看待事物，非黑即白'
    },
    personalization: {
        patterns: [
            /(?:\都是?我的错|我导致|因为我|我使得)/,
            /(?:\我应该|我必须|我得|我需要).*(?:才能|否则|要不然|否则)/,
            /(?:\都怪|责任在于)我/
        ],
        intervention: 'responsibility_reframing',
        description: '个人化：将负面事件的责任过度归咎于自己'
    },
    mind_reading: {
        patterns: [
            /(?:\他?|她?|他们?|大家|别人).*(?:\一定|肯定|觉得|认为|会|以为).*(?:\我|我的)/,
            /(?:\我|我).*(?:\知道|觉得|认为).*(?:\他?|她?|他们?|别人|大家).*(?:\想法|意思|会)/,
            /(?:\肯定|一定|绝对).*(?:\觉得|认为|讨厌|恨|烦)/
        ],
        intervention: 'perspective_clarification',
        description: '读心术：假设知道他人对自己的看法'
    },
    emotional_reasoning: {
        patterns: [
            /(?:\我感到|我感觉|我觉得).*(?:\就是|一定是|说明).*/,
            /(?:\因为|所以).*(?:\我|我).*(?:\感觉|感到|觉得)/
        ],
        intervention: 'reality_checking',
        description: '情感推理：用情绪感受代替客观事实'
    },
    should_statements: {
        patterns: [
            /(?:\应该|必须|不得不|一定要).*/,
            /(?:\我|他?|她?|他们?).*(?:\应该|必须|应该要)/
        ],
        intervention: 'self_compassion',
        description: '"应该"陈述：用绝对的标准要求自己或他人'
    },
    labeling: {
        patterns: [
            /(?:\我|他?|她?|他们?).*(?:是|就是|简直).*(?:\笨蛋|傻瓜|废物|失败者|loser|蠢|笨)/,
            /(?:\就是|简直是).*(?:\没用|没救|无可救药)/
        ],
        intervention: 'identity_dispute',
        description: '贴标签：用负面词汇给自己或他人贴上固定标签'
    },
    filtering: {
        patterns: [
            /(?:\只|只是|仅仅).*(?:\负面|不好|缺点|问题|失败)/,
            /(?:\只|只是|仅仅).*(?:\记得|看到|注意到)/
        ],
        intervention: 'balanced_thinking',
        description: '过滤：只关注负面细节而忽略积极方面'
    },
    discounting_positives: {
        patterns: [
            /(?:\不算|不算什么|没什么|不算成功|不算什么)/,
            /(?:\只是|不过是).*(?:\运气|碰巧|侥幸)/
        ],
        intervention: 'credit_acknowledgment',
        description: '正面折扣：不认可自己的积极成就'
    }
};

export function detectCognitiveDistortions(query: string): string[] {
    const detected: string[] = [];
    const lowerQuery = query.toLowerCase();

    for (const [distortionType, config] of Object.entries(COGNITIVE_DISTORTION_PATTERNS)) {
        for (const pattern of config.patterns) {
            if (pattern.test(lowerQuery) || pattern.test(query)) {
                detected.push(distortionType);
                break;
            }
        }
    }

    return detected;
}

export function getDistortionIntervention(distortionType: string): string {
    return COGNITIVE_DISTORTION_PATTERNS[distortionType]?.intervention || 'supportive_listening';
}

export function getDistortionDescription(distortionType: string): string {
    return COGNITIVE_DISTORTION_PATTERNS[distortionType]?.description || '';
}
