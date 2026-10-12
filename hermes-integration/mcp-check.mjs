import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = path.join(root, '.tmp/soul-regression');
await mkdir(scratch, { recursive: true });
const sandbox = await mkdtemp(path.join(scratch, 'mcp-'));
try {
    await cp(path.join(root, 'mcp-server/dist'), path.join(sandbox, 'mcp-server/dist'), { recursive: true });
    await cp(path.join(root, 'mcp-server/package.json'), path.join(sandbox, 'mcp-server/package.json'));
    await cp(path.join(root, 'src'), path.join(sandbox, 'src'), { recursive: true });
    const load = (name) => import(pathToFileURL(path.join(sandbox, 'mcp-server/dist', name)).href);
    const { projectRoot } = await load('utils.js');
    assert.equal(projectRoot, sandbox);
    const { SourceAdapter } = await load('empathic_gateway/adapters/source_adapter.js');
    const adapter = new SourceAdapter();
    await adapter.initialize();
    assert(adapter.getSecurityPolicy().sealed_paths.length > 0);
    await mkdir(path.join(sandbox, 'fixture'));
    await writeFile(path.join(sandbox, 'fixture/soul_base.md'),
        '```json\n{"agreeableness_delta": +0.02}\n```\n' +
        '```json\n{"agreeableness":0.9,"neuroticism":2,"unknown":0.1}\n```\n' +
        '```json\n{"tone_templates":{"default":"温暖，{response}","bad":3}}\n```');
    const fixture = new SourceAdapter({ srcPath: path.join(sandbox, 'fixture') });
    // Keep other source readers on their actual paths.
    for (const name of ['master_base.md', 'memory_base.md', 'SKILL.md']) {
        await cp(path.join(sandbox, 'src', name), path.join(sandbox, 'fixture', name));
    }
    await fixture.initialize();
    assert.equal(fixture.getPersona().traits.agreeableness, 0.9);
    assert.equal(fixture.getPersona().traits.neuroticism, 0.3);
    assert(!('unknown' in fixture.getPersona().traits));
    assert.equal(fixture.getPersona().tone_templates.default, '温暖，{response}');
    assert(!('bad' in fixture.getPersona().tone_templates));
    const { EmpathicGateway } = await load('empathic_gateway/gateway.js');
    const gateway = new EmpathicGateway();
    const privateText = '我难过，私人标记_DO_NOT_LOG';
    await gateway.processInput({ raw_query: privateText });
    const folder = path.join(sandbox, 'mcp-server/gateway_data');
    for (const file of await readdir(folder)) {
        assert(!(await readFile(path.join(folder, file), 'utf8')).includes('DO_NOT_LOG'));
    }
    let handler;
    const { registerXiaonuanTool } = await load('tools/xiaonuan.js');
    registerXiaonuanTool((_, fn) => { handler = fn; });
    const code = '```js\nconsole.log("code stays intact");\n```';
    const result = await handler({ raw_query: '帮我查看时间_PRIVATE_INPUT', downstream_response: code });
    assert.equal(result.intent_type, 'task');
    assert(result.final_response.includes(code));
    const logs = await readFile(path.join(sandbox, 'logs/mcp_tool.log'), 'utf8');
    assert(!logs.includes('PRIVATE_INPUT') && !logs.includes('code stays intact'));
    assert(!(await readdir(path.join(sandbox, 'mcp-server'))).includes('data'));
    console.log('PASS: cwd-independent paths, source loading, default redaction, MCP diagnostic privacy, code preservation');
} finally {
    await rm(sandbox, { recursive: true, force: true });
}
