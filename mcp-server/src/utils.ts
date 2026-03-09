import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist is in mcp-server/dist
// src is in mcp-server/src
// so project root is two levels up from mcp-server if we run from dist, and we are in mcp-server
export const projectRoot = path.resolve(__dirname, '../..');

export const PATHS = {
    config: path.join(projectRoot, 'config'),
    data: path.join(projectRoot, 'data'),
    identity: path.join(projectRoot, 'data', 'identity'),
    memory: path.join(projectRoot, 'data', 'memory'),
};
