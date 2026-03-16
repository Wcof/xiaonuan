export function calculateRewriteIntensity(
    emotionLevel: number,
    interventionType: 'none' | 'emotional_support' | 'safety_protocol'
): number {
    const baseIntensity: Record<number, number> = {
        0: 0.1,
        1: 0.25,
        2: 0.5,
        3: 0.75,
        4: 0.9
    };

    if (interventionType === 'safety_protocol') {
        return 0.9;
    }

    if (interventionType === 'emotional_support') {
        return (baseIntensity[emotionLevel] || 0.1) + 0.1;
    }

    return baseIntensity[emotionLevel] || 0.1;
}
