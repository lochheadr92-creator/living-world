// The model relay end to end (tools/relay; docs/MODEL_RELAY.md), against a mock vendor on localhost and a small temporary
// repository: start, work order, baseline, a writer answer that is refused once and repaired, orchestrator edits, the reader's
// pass, the gate, a first review with one real finding, a probe that fails, verdicts, the fix, the gate with the probe, a second
// review that is blind to the first, finish. It starts tsc, vitest and several detached relay processes, so it runs only with
// RELAY_E2E=1. STAGED: the three "vendors" are one local server with scripted answers; everything else is the relay's own code.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO = resolve(__dirname, '..');
const KEYS = { XAI_API_KEY: 'xai-test-key-0123456789abcdef', DEEPSEEK_API_KEY: 'dsk-test-key-0123456789abcdef', OPENAI_API_KEY: 'oai-test-key-0123456789abcdef' };
const REVIEWER_TITLE = 'REVIEWER-TITLE-MARKER sum subtracts';
const REVIEWER_MECHANISM = 'REVIEWER-MECHANISM-MARKER the operator is a minus sign';
const FIX_INSTRUCTION = 'ADJUDICATOR-MARKER: sum must return a plus b; it returns a minus b.';

interface Seen {
  vendor: string;
  auth: string;
  body: { model: string; messages: Array<{ role: string; content: string }>; stream?: boolean };
}

const fence = '```';
const writerFirst = (withEnd: boolean): string =>
  [
    'src/sim/sum.ts',
    `${fence}ts`,
    '<<<<<<< SEARCH',
    '=======',
    'export function sum(a: number, b: number): number {',
    '  return a - b;',
    '}',
    '>>>>>>> REPLACE',
    fence,
    '',
    'tests/sum.test.ts',
    `${fence}ts`,
    '<<<<<<< SEARCH',
    '=======',
    "import { describe, expect, it } from 'vitest';",
    "import { sum } from '../src/sim/sum';",
    '',
    "describe('sum', () => {",
    "  it('adds nothing to nothing', () => {",
    '    expect(sum(0, 0)).toBe(0);',
    '  });',
    '});',
    '>>>>>>> REPLACE',
    fence,
    '',
    'src/sim/calc.ts',
    `${fence}ts`,
    '<<<<<<< SEARCH',
    '  return n * 2;',
    '=======',
    '  return n + n;',
    '>>>>>>> REPLACE',
    fence,
    '',
    'NOTES',
    '- added sum and its test; double now adds',
    ...(withEnd ? ['END-OF-EDITS blocks=3'] : []),
  ].join('\n');
const writerFix = ['src/sim/sum.ts', `${fence}ts`, '<<<<<<< SEARCH', '  return a - b;', '=======', '  return a + b;', '>>>>>>> REPLACE', fence, '', 'NOTES', '- sum adds now', 'END-OF-EDITS blocks=1'].join('\n');
const review1 = JSON.stringify({
  findings: [{ id: 'mine-1', severity: 'P1', file: 'src/sim/sum.ts', start_line: 2, end_line: 2, title: REVIEWER_TITLE, mechanism: REVIEWER_MECHANISM, trigger: 'sum(2, 3) returns -1', quote: '  return a - b;', direction: 'use plus' }],
  need_files: [],
  notes: '',
});
const review2 = JSON.stringify({ findings: [], notes: '' });

function answerFor(vendor: string, user: string): string {
  if (vendor === 'deepseek') return review1;
  if (vendor === 'openai') return review2;
  if (user.includes('WHAT IS WRONG WITH THE CODE AS IT STANDS')) return writerFix;
  return writerFirst(user.includes('YOUR PREVIOUS ANSWER WAS NOT APPLIED'));
}

const sh = (cwd: string, args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' });

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe.skipIf(!process.env.RELAY_E2E)('model relay, end to end against a mock vendor', () => {
  let root = '';
  let shared = '';
  let home = '';
  let server: Server;
  const seen: Seen[] = [];
  const savedShared = process.env.RELAY_SHARED;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'relay-e2e-'));
    shared = join(root, 'shared repo');
    home = join(root, 'home');
    const put = (rel: string, text: string): void => {
      mkdirSync(dirname(join(shared, rel)), { recursive: true });
      writeFileSync(join(shared, rel), text);
    };
    put('package.json', '{ "name": "relay-e2e", "private": true, "type": "module" }\n');
    put('package-lock.json', '{}\n');
    put('tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, noEmit: true, module: 'ESNext', moduleResolution: 'bundler', target: 'ES2022', skipLibCheck: true, types: [] }, include: ['src', 'tests'] }));
    put('vite.config.ts', "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { include: ['tests/**/*.test.ts'], environment: 'node' } });\n");
    put('src/sim/calc.ts', 'export function double(n: number): number {\n  return n * 2;\n}\n');
    put('tests/calc.test.ts', "import { expect, it } from 'vitest';\nimport { double } from '../src/sim/calc';\n\nit('doubles', () => {\n  expect(double(4)).toBe(8);\n});\n");
    put('docs/NOTES.md', '# Notes\n');
    put('evidence/big.txt', 'never checked out, never sent\n');
    sh(shared, ['init', '-q', '-b', 'main']);
    sh(shared, ['config', 'user.name', 'Owner Person']);
    sh(shared, ['config', 'user.email', 'owner@example.invalid']);
    sh(shared, ['config', 'commit.gpgsign', 'false']);
    sh(shared, ['add', '-A']);
    sh(shared, ['commit', '-q', '-m', 'base']);

    server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const vendor = (req.url ?? '').split('/')[1];
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Seen['body'];
        seen.push({ vendor, auth: String(req.headers.authorization ?? ''), body });
        const text = answerFor(vendor, body.messages[1].content);
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(`data: ${JSON.stringify({ model: `mock-${vendor}`, choices: [{ delta: { content: text }, finish_reason: null }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ model: `mock-${vendor}`, choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20 } })}\n\n`);
        res.end('data: [DONE]\n\n');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as AddressInfo).port;

    mkdirSync(join(home, 'runs'), { recursive: true });
    symlinkSync(join(REPO, 'node_modules'), join(home, 'node_modules'), 'junction');
    writeFileSync(join(home, '.lockhash'), createHash('sha256').update('{}\n', 'utf8').digest('hex'));
    const at = (vendor: string, tail: string): string => `http://127.0.0.1:${port}/${vendor}${tail}`;
    writeFileSync(
      join(home, 'relay.config.json'),
      JSON.stringify({ providers: { xai: { baseUrl: at('xai', '/v1') }, deepseek: { baseUrl: at('deepseek', '') }, openai: { baseUrl: at('openai', '/v1') } }, limits: { gateTimeoutMs: 240_000, probeTimeoutMs: 120_000, gateMaxWorkers: 2 } }),
    );
    process.env.RELAY_SHARED = shared;
  }, 120_000);

  afterAll(async () => {
    if (savedShared === undefined) delete process.env.RELAY_SHARED;
    else process.env.RELAY_SHARED = savedShared;
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
  });

  it('carries one change from work order to a reviewed branch, and leaves the shared checkout alone', async () => {
    const { main } = await import('../tools/relay/cli');
    const env = { ...process.env, ...KEYS, RELAY_HOME: home, RELAY_SHARED: shared };
    const lines: string[] = [];
    const relay = async (...argv: string[]): Promise<Record<string, unknown>> => {
      lines.length = 0;
      await main(argv, { out: (l) => lines.push(l), env, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() });
      const last = lines[lines.length - 1] ?? '';
      expect(last.startsWith('RELAY_RESULT '), lines.join('\n')).toBe(true);
      return JSON.parse(last.slice('RELAY_RESULT '.length)) as Record<string, unknown>;
    };
    const baseHead = sh(shared, ['rev-parse', 'HEAD']).trim();

    const started = await relay('start', '--slug', 'demo');
    const run = String(started.run);
    const clone = String(started.clone);
    const ledger = String(started.ledger);
    expect(existsSync(join(clone, 'src', 'sim', 'calc.ts'))).toBe(true);
    expect(existsSync(join(clone, 'evidence'))).toBe(false);

    const orderFile = join(ledger, 'order-draft.json');
    const order = { title: 'Add a sum function', slug: 'demo', spec: 'Create src/sim/sum.ts exporting sum(a, b) that returns a plus b, with a test, and make double add n to itself.', edit: ['src/sim/calc.ts'], create: ['src/sim/sum.ts', 'tests/sum.test.ts'], context: ['tests/calc.test.ts'], orchestrator: ['docs/NOTES.md'], tests: ['tests/sum.test.ts', 'tests/calc.test.ts'], typecheck: true };
    writeFileSync(orderFile, JSON.stringify({ ...order, edit: ['src/sim/calc.ts', 'evidence/big.txt'] }));
    const refused = await relay('order', '--run', run, '--file', orderFile);
    expect(refused.ok).toBe(false);
    expect(String(refused.error)).toContain('evidence/big.txt');
    writeFileSync(orderFile, JSON.stringify(order));
    expect((await relay('order', '--run', run, '--file', orderFile)).ok).toBe(true);

    const asked: string[] = [];
    let finished: Record<string, unknown> | null = null;
    for (let turn = 0; turn < 60 && !finished; turn++) {
      const r = await relay('advance', '--run', run, '--max-seconds', '120');
      if (r.status === 'running') continue;
      expect(r.status, JSON.stringify(r)).toBe('needs');
      asked.push(String(r.needs));
      if (r.needs === 'orchestrator-edits') {
        expect(r.paths).toEqual(['docs/NOTES.md']);
        appendFileSync(join(clone, 'docs', 'NOTES.md'), 'sum was added by the relay test\n');
        expect((await relay('adopt', '--run', run, '-m', 'a note')).ok).toBe(true);
      } else if (r.needs === 'screen') {
        expect(readFileSync(String(r.diffFile), 'utf8')).toContain('+++ b/src/sim/sum.ts');
        // a reader cannot pass a commit other than the one waiting
        expect((await relay('screen', '--run', run, '--sha', '0'.repeat(40), '--ok', '--by', 'test')).ok).toBe(false);
        expect((await relay('screen', '--run', run, '--sha', String(r.sha), '--ok', '--by', 'test', '--note', 'computes and asserts')).ok).toBe(true);
      } else if (r.needs === 'adjudicate') {
        expect(r.review).toBe(1);
        expect(r.ids).toEqual(['R1-F01']);
        const findings = JSON.parse(readFileSync(String(r.findingsFile), 'utf8')) as { findings: Array<{ id: string; flags: Record<string, boolean> }> };
        expect(findings.findings[0].flags).toEqual({ fileExists: true, quoteFound: true, inDiff: true });
        const verdictFile = join(ledger, 'verdicts-1.json');
        writeFileSync(verdictFile, JSON.stringify({ verdicts: [{ id: 'R1-F01', verdict: 'confirmed', severity: 'P1', action: 'fix', evidence: 'probe fails', fixInstruction: FIX_INSTRUCTION }] }));
        // "fix" is refused until a probe that fails is on record
        expect((await relay('verdicts', '--run', run, '--review', '1', '--file', verdictFile)).ok).toBe(false);
        const probeFile = join(ledger, 'probe-draft.test.ts');
        writeFileSync(probeFile, "import { expect, it } from 'vitest';\nimport { sum } from '../src/sim/sum';\n\nit('adds', () => {\n  expect(sum(2, 3)).toBe(5);\n});\n");
        expect((await relay('probe', '--run', run, '--finding', 'R1-F01', '--file', probeFile)).outcome).toBe('fails');
        expect((await relay('verdicts', '--run', run, '--review', '1', '--file', verdictFile)).ok).toBe(true);
      } else if (r.needs === 'finish') {
        finished = await relay('finish', '--run', run);
      } else {
        throw new Error(`the run asked for something this test does not expect: ${JSON.stringify(r)}\n${existsSync(join(ledger, 'log.jsonl')) ? readFileSync(join(ledger, 'log.jsonl'), 'utf8') : ''}`);
      }
    }
    expect(finished?.outcome).toBe('done');
    // the reader was asked once for the first code (after the orchestrator's edits) and once for the fix
    expect(asked).toEqual(['orchestrator-edits', 'screen', 'adjudicate', 'screen', 'finish']);

    // the change is on a new branch of the shared repository; its working tree and head are as they were
    const branch = `relay/${run}`;
    expect(String(finished?.branch)).toBe(branch);
    expect(sh(shared, ['show', `${branch}:src/sim/sum.ts`])).toContain('return a + b;');
    expect(sh(shared, ['show', `${branch}:src/sim/calc.ts`])).toContain('return n + n;');
    expect(sh(shared, ['show', `${branch}:docs/NOTES.md`])).toContain('sum was added by the relay test');
    expect(sh(shared, ['rev-parse', 'HEAD']).trim()).toBe(baseHead);
    expect(sh(shared, ['status', '--porcelain']).trim()).toBe('');
    expect(sh(shared, ['log', '--format=%an <%ae>', `${baseHead}..${branch}`]).trim().split('\n').every((l) => l === 'model-relay <relay@localhost>')).toBe(true);
    // the probe never became part of the branch, and the clone is gone
    expect(sh(shared, ['ls-tree', '-r', '--name-only', branch])).not.toContain('zz_relay');
    expect(existsSync(clone)).toBe(false);

    // what each vendor was sent
    const by = (vendor: string): Seen[] => seen.filter((s) => s.vendor === vendor);
    expect(by('xai').length).toBe(3); // refused once for its missing last line, then applied, then the fix
    expect(by('deepseek').length).toBe(1);
    expect(by('openai').length).toBe(1);
    expect(by('xai').every((s) => s.auth === `Bearer ${KEYS.XAI_API_KEY}`)).toBe(true);
    expect(by('deepseek')[0].auth).toBe(`Bearer ${KEYS.DEEPSEEK_API_KEY}`);
    expect(by('openai')[0].auth).toBe(`Bearer ${KEYS.OPENAI_API_KEY}`);
    const everything = JSON.stringify(seen.map((s) => s.body));
    for (const key of Object.values(KEYS)) expect(everything).not.toContain(key);
    expect(everything).not.toContain('never checked out, never sent');
    expect(everything).not.toContain('Owner Person');
    // the writer's fix request carries the adjudicator's words and none of the reviewer's
    const fixRequest = by('xai')[2].body.messages[1].content;
    expect(fixRequest).toContain(FIX_INSTRUCTION);
    expect(fixRequest).not.toContain('REVIEWER-TITLE-MARKER');
    expect(fixRequest).not.toContain('REVIEWER-MECHANISM-MARKER');
    // the second reviewer saw the corrected code and nothing of the first review
    const second = by('openai')[0].body.messages[1].content;
    expect(second).toContain('return a + b;');
    expect(second).not.toContain('REVIEWER-TITLE-MARKER');
    expect(second).not.toContain('R1-F01');
    expect(second).not.toContain(FIX_INSTRUCTION);

    // the ledger: a summary that says what happened, and no key anywhere
    const summary = readFileSync(join(ledger, 'summary.md'), 'utf8');
    expect(summary).toContain('R1-F01');
    expect(summary).toContain('confirmed');
    expect(summary).toContain('No findings reported');
    expect(summary).toContain('ran mock-xai');
    for (const file of walk(ledger)) {
      const text = readFileSync(file, 'utf8');
      for (const key of Object.values(KEYS)) expect(text.includes(key), file).toBe(false);
      expect(text.includes(root), `${file} holds a machine path`).toBe(false);
    }
  }, 900_000);
});
