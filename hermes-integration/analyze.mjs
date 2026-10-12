import { readFileSync } from 'node:fs';
import { calculatePADVector } from '../mcp-server/dist/empathic_gateway/emotion/pad_calculator.js';
import { getEmotionLevel, getRiskLevel } from '../mcp-server/dist/empathic_gateway/emotion/emotion_classifier.js';
import { detectCognitiveDistortions } from '../mcp-server/dist/empathic_gateway/emotion/cognitive_distortion.js';
import { classifyIntent } from '../mcp-server/dist/empathic_gateway/processing/intent_classifier.js';
import { checkTriggerRules } from '../mcp-server/dist/empathic_gateway/processing/rule_engine.js';

const { text } = JSON.parse(readFileSync(0, 'utf8'));
if (typeof text !== 'string' || text.length > 200000) throw new Error('Invalid input');
const pad = calculatePADVector(text);
const intent = classifyIntent(text);
// These are keyword hints, not diagnoses; ordinary tasks do not get clinical labels.
const hints = intent === 'task' ? [] : detectCognitiveDistortions(text);
const level = getEmotionLevel(pad.arousal);
const trigger = checkTriggerRules(pad, hints, level);
console.log(JSON.stringify({ pad_vector: pad, intent_type: intent, emotion_level: level,
    risk_level: getRiskLevel(pad, level), cognitive_hints: hints,
    intervention: trigger.intervention_type }));
