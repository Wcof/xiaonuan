import path from 'path';
import { projectRoot } from '../utils.js';
import { SourceAdapter } from '../empathic_gateway/adapters/source_adapter.js';

export function registerConfigResources(registerResource: (def: any, handler: any) => void) {
    registerResource(
        {
            uri: 'config://persona',
            name: 'Persona Config',
            mimeType: 'application/json',
            description: '李小暖的人格层级设置'
        },
        async () => {
            const adapter = new SourceAdapter({ srcPath: path.join(projectRoot, 'src') });
            await adapter.initialize();
            return {
                persona: adapter.getPersona(),
                master: adapter.getMaster()
            };
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
            const adapter = new SourceAdapter({ srcPath: path.join(projectRoot, 'src') });
            await adapter.initialize();
            return {
                memory: adapter.getMemoryPolicy(),
                security: adapter.getSecurityPolicy()
            };
        }
    );
}
