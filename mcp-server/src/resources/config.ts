import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { PATHS } from '../utils.js';

export function registerConfigResources(registerResource: (def: any, handler: any) => void) {
    registerResource(
        {
            uri: 'config://persona',
            name: 'Persona Config',
            mimeType: 'application/json',
            description: '李小暖的人格层级设置'
        },
        async () => {
            const file = path.join(PATHS.config, 'persona.yaml');
            const text = await fs.readFile(file, 'utf-8');
            return yaml.parse(text);
        }
    );

    registerResource(
        {
            uri: 'config://behavior',
            name: 'Behavior Rules',
            mimeType: 'application/json',
            description: '李小暖的行为与交互准则'
        },
        async () => {
            const file = path.join(PATHS.config, 'behavior.yaml');
            const text = await fs.readFile(file, 'utf-8');
            return yaml.parse(text);
        }
    );
}
