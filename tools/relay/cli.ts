// The model relay's command line (docs/MODEL_RELAY.md). Run it through the launcher, from anywhere:
//   node tools/relay/relay.mjs init                      one-time: the relay's home, its config file and its own node_modules
//   node tools/relay/relay.mjs doctor [--live]           settings, keys present or absent, and with --live one real call per role
//   node tools/relay/relay.mjs start --slug <name> [--base <commit>]
//   node tools/relay/relay.mjs order --run <id> --file <order.json> [--amend]
//   node tools/relay/relay.mjs advance --run <id> [--max-seconds 540]     repeat until it asks for a judgement or says finished
//   node tools/relay/relay.mjs adopt --run <id> -m <what> | --nothing     commit the orchestrator's own edits in the clone
//   node tools/relay/relay.mjs screen --run <id> --sha <sha> --ok|--reject --by <who> --note-file <file>
//   node tools/relay/relay.mjs probe --run <id> --finding <id> --file <probe.test.ts> [--allow a,b]
//   node tools/relay/relay.mjs verdicts --run <id> --review <n> --file <verdicts.json> [--unprobed id,id]
//   node tools/relay/relay.mjs export|import --run <id> --review <n> [--file <answer.json>]   a review done by hand
//   node tools/relay/relay.mjs skip-review --run <id> --review <n> --note <why>
//   node tools/relay/relay.mjs retry --run <id>          clear a stuck run after its cause was dealt with
//   node tools/relay/relay.mjs finish --run <id> [--failed <why>] [--keep]
//   node tools/relay/relay.mjs status --run <id> | runs
// Every command ends with one line "RELAY_RESULT <json>": that line, not the prose above it, is what a driver reads.
// Wherever a command takes free text (--note, -m, --failed), <name>-file <path> reads it from a file instead. Text that quotes
// code a model wrote belongs in a file: on a command line the shell would run whatever it holds between backticks.
//
// The relay never merges, never pushes and never writes the working tree of the checkout it runs from. `finish` adds the run's
// branch to that checkout as a new ref and stops there.
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, PROVIDERS, ROLES, loadConfig, staleRoles } from './config';
import { buildReviewPack, decide, gateUnjudged, loadFindings, loadOrder, loadVerdicts, probeName, readClone, recordReview, recoverDeadStep, repairAfterThrow, runStep, settle, stepArgs, stepFromArgs, strays, stuckAt, type Ctx, type Step } from './driver';
import { buildPolicy, parseEdits, planEdits } from './edits';
import { parseFindings, parseVerdicts } from './findings';
import { runGate } from './gate';
import { Busy, Ledger, listRuns, lockHeld, machinePaths, newRunId, oneLine, pidAlive, relayHome, runPaths, sha256, withLock } from './ledger';
import { orderProblems, parseOrder, reviewerPack, stripLeadingComment, writerPack } from './pack';
import { resolveInside } from './paths';
import { chat, listModels, ProviderError, tlsCheckingDisabled } from './provider';
import { makeRedactor, secretsFrom } from './redact';
import { cloneSparse, commitPaths, diffText, fetchBranchInto, git, gitFolderMark, headSha, isIgnored, removeRunDir, resolveCommit, trackedFiles } from './repo';
import { scanSource } from './scan';
import type { Advance, RelayConfig, RunState, TestOutcome, WorkOrder } from './types';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
/** the checkout this code lives in; its node_modules run the relay itself */
const CODE_ROOT = resolve(TOOL_DIR, '..', '..');
/**
 * The checkout runs are started from: the relay reads it, clones its commits, and never writes its working tree. It is the
 * checkout that holds this code. RELAY_SHARED points it elsewhere for the relay's own end-to-end test, which must not start
 * runs from the real repository.
 */
const SHARED = process.env.RELAY_SHARED?.trim() ? resolve(process.env.RELAY_SHARED) : CODE_ROOT;

export interface Io {
  out(line: string): void;
  env: Record<string, string | undefined>;
  sleep(ms: number): Promise<void>;
  now(): number;
}

const realIo: Io = { out: (l) => process.stdout.write(`${l}\n`), env: process.env, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() };

class Refusal extends Error {}

interface Args {
  cmd: string;
  rest: string[];
  opt(name: string): string | undefined;
  need(name: string): string;
  flag(name: string): boolean;
}

function parseArgs(argv: string[]): Args {
  const args = argv.filter((a) => a !== '--');
  const [cmd = 'help', ...rest] = args;
  const opt = (name: string): string | undefined => {
    const i = rest.indexOf(name.length === 1 ? `-${name}` : `--${name}`);
    return i >= 0 && i + 1 < rest.length ? rest[i + 1] : undefined;
  };
  return {
    cmd,
    rest,
    opt,
    need: (name) => {
      const v = opt(name);
      if (v === undefined || v.startsWith('--')) throw new Refusal(`--${name} is required`);
      return v;
    },
    flag: (name) => rest.includes(`--${name}`),
  };
}

const homeOf = (a: Args, io: Io): string => (a.opt('home') ? resolve(a.opt('home') as string) : relayHome(io.env, SHARED));

function config(home: string): RelayConfig {
  const loaded = loadConfig(home);
  if (loaded.problems.length) throw new Refusal(`the relay's settings are not usable:\n${loaded.problems.map((p) => `  - ${p}`).join('\n')}`);
  return loaded.config;
}

function open(a: Args, io: Io): { ctx: Ctx; state: RunState } {
  const home = homeOf(a, io);
  const paths = runPaths(home, a.need('run'));
  if (!existsSync(join(paths.ledger, 'state.json'))) throw new Refusal(`no such run under ${home}: ${a.need('run')}`);
  const cfg = config(home);
  const redact = makeRedactor(secretsFrom(cfg, io.env), machinePaths(paths, SHARED));
  const ledger = new Ledger(paths, redact);
  return { ctx: { cfg, shared: SHARED, ledger, env: io.env, toolDir: TOOL_DIR }, state: ledger.loadState() };
}

const idle = (state: RunState): void => {
  if (state.finished) throw new Refusal(`this run is finished (${state.finished.outcome})`);
  if (state.step) throw new Refusal(`a step is running (${state.step.key}); run advance to wait for it`);
};

/** Free text for a command: `--name <text>`, or `--name-file <path>` for text that must not pass through a shell. */
function textOpt(a: Args, name: string): string | undefined {
  const file = a.opt(`${name}-file`);
  if (file !== undefined) return readFileSync(resolve(file), 'utf8').trim();
  const v = a.opt(name);
  return v !== undefined && v.startsWith('--') ? undefined : v;
}

/**
 * The relay made every commit it knows of. A commit made in the clone by hand has not been in front of the reader, would be run
 * by the gate under another commit's name, and would be what `finish` hands to the owner.
 */
function sameHead(ctx: Ctx, state: RunState): void {
  const c = ctx.ledger.paths.clone;
  if (!existsSync(c)) return;
  if (state.gitMark !== undefined && gitFolderMark(c) !== state.gitMark) throw new Refusal(`the clone's .git config or hooks changed since the clone was made, and git runs what they name: nothing more is done in this clone. Look at ${join(c, '.git')}; then finish the run as failed`);
  const head = headSha(c);
  if (head !== state.head) {
    throw new Refusal(`the clone's HEAD is ${head}, but the last commit this run made is ${state.head}: a commit was made in the clone outside the relay. To keep orchestrator edits, undo that commit keeping its files (git -C "${c}" reset --soft ${state.head}) and run adopt; to drop it, git -C "${c}" reset --hard ${state.head}`);
  }
}

/** one command at a time may run code in a run's clone or change it */
const cloneLock = (ctx: Ctx): string => ctx.ledger.file('clone.lock');
const samePath = (x: string, y: string): boolean => {
  const fold = (p: string): string => {
    const r = existsSync(p) ? realpathSync(p) : resolve(p);
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  return fold(x) === fold(y);
};

const lockHash = (text: string): string => sha256(text.replace(/\r\n/g, '\n'));

// ---- commands ----

function findNpmCli(): string | null {
  const dir = dirname(process.execPath);
  for (const p of [join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(dir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')]) if (existsSync(p)) return p;
  return null;
}

function init(a: Args, io: Io): unknown {
  const home = homeOf(a, io);
  mkdirSync(join(home, 'runs'), { recursive: true });
  const cfgFile = join(home, 'relay.config.json');
  if (!existsSync(cfgFile)) {
    const roles = Object.fromEntries(ROLES.map((r) => [r, { model: DEFAULT_CONFIG.roles[r].model }]));
    writeFileSync(cfgFile, `${JSON.stringify({ roles }, null, 2)}\n`, 'utf8');
    io.out(`wrote ${cfgFile}: the model names are a starting guess; correct them after "doctor --live"`);
  }
  const lock = git(SHARED, ['show', 'HEAD:package-lock.json']).stdout;
  writeFileSync(join(home, 'package.json'), git(SHARED, ['show', 'HEAD:package.json']).stdout, 'utf8');
  writeFileSync(join(home, 'package-lock.json'), lock, 'utf8');
  const manual = `in ${home} run: npm ci --no-audit --no-fund`;
  if (!a.flag('installed')) {
    const npm = findNpmCli();
    if (!npm) throw new Refusal(`npm was not found beside ${process.execPath}; ${manual}, then run init again with --installed`);
    io.out(`installing the relay's own node_modules in ${home} (the gate runs tsc and vitest from there, so no run needs a link into your checkout)`);
    const r = spawnSync(process.execPath, [npm, 'ci', '--no-audit', '--no-fund'], { cwd: home, stdio: 'inherit', shell: false, windowsHide: true });
    if (r.status !== 0) throw new Refusal(`npm ci failed (exit ${r.status}); ${manual}, then run init again with --installed`);
  }
  for (const tool of [join('typescript', 'bin', 'tsc'), join('vitest', 'vitest.mjs')]) {
    if (!existsSync(join(home, 'node_modules', tool))) throw new Refusal(`${join(home, 'node_modules', tool)} is missing; ${manual}`);
  }
  writeFileSync(join(home, '.lockhash'), lockHash(lock), 'utf8');
  io.out(`the relay's home is ready: ${home}`);
  return { home };
}

async function doctor(a: Args, io: Io): Promise<unknown> {
  const home = homeOf(a, io);
  const loaded = loadConfig(home);
  const cfg = loaded.config;
  const report: Record<string, unknown> = { home, configFile: loaded.file, problems: loaded.problems, warnings: staleRoles(cfg) };
  io.out(`home: ${home}${existsSync(join(home, '.lockhash')) ? '' : '  (not initialised: run init)'}`);
  io.out(`config: ${loaded.file ?? 'defaults only'}`);
  for (const p of loaded.problems) io.out(`  PROBLEM ${p}`);
  for (const w of staleRoles(cfg)) io.out(`  WARNING ${w}`);
  const tlsOff = tlsCheckingDisabled(io.env);
  report.tlsCheckingDisabledInEnvironment = tlsOff;
  if (tlsOff) io.out('  WARNING NODE_TLS_REJECT_UNAUTHORIZED=0 is set in this shell. The relay checks certificates regardless, so a network that needs that setting will fail here; put its certificate in NODE_EXTRA_CA_CERTS instead.');
  io.out(`node ${process.version}; ${git(SHARED, ['--version']).stdout.trim()}`);
  const keys: Record<string, boolean> = {};
  for (const p of PROVIDERS) {
    keys[p] = Boolean(io.env[cfg.providers[p].keyEnv]?.trim());
    io.out(`  ${cfg.providers[p].keyEnv}: ${keys[p] ? 'present' : 'ABSENT'}`);
  }
  report.keys = keys;
  for (const r of ROLES) io.out(`  ${r}: ${cfg.roles[r].provider} / ${cfg.roles[r].model}`);
  if (loaded.problems.length || !a.flag('live')) {
    if (!a.flag('live')) io.out('add --live to list each vendor\'s models and make one real call per role (a few cents)');
    return { ...report, ok: loaded.problems.length === 0 };
  }
  const redact = makeRedactor(secretsFrom(cfg, io.env), []);
  const live: Record<string, unknown> = {};
  let ok = true;
  const say = (e: unknown): string => redact(e instanceof ProviderError ? `${e.kind}${e.status ? ` ${e.status}` : ''}: ${e.message}` : e instanceof Error ? e.message : String(e));
  for (const p of PROVIDERS) {
    if (!keys[p]) continue;
    try {
      const models = await listModels(cfg, p, { env: io.env });
      live[`${p}.models`] = models;
      io.out(`${p}: ${models.length} models listed: ${models.slice(0, 40).join(', ')}${models.length > 40 ? ', ...' : ''}`);
      for (const r of ROLES) {
        if (cfg.roles[r].provider !== p) continue;
        if (!models.includes(cfg.roles[r].model)) {
          ok = false;
          io.out(`  STOP ${r}: "${cfg.roles[r].model}" is not in that list; put a listed name under roles.${r}.model in ${join(home, 'relay.config.json')}`);
        }
      }
    } catch (e) {
      ok = false;
      io.out(`${p}: listing models failed: ${say(e)}`);
    }
  }
  // one real call per role, built and read by the same code a run uses
  const toy: WorkOrder = { title: 'doctor', slug: 'doctor', spec: 'In src/toy.ts the function add subtracts. Make add(2, 3) return 5. Change nothing else.', edit: ['src/toy.ts'], create: [], context: [], orchestrator: [], tests: [], typecheck: false, unlockGuarded: [], allowImports: {} };
  const before = 'export function add(a: number, b: number): number {\n  return a - b;\n}\n';
  const tracked = new Map([['src/toy.ts', 'src/toy.ts']]);
  const rules = (name: string): string => stripLeadingComment(readFileSync(join(TOOL_DIR, 'prompts', name), 'utf8'));
  for (const r of ROLES) {
    const p = cfg.roles[r].provider;
    if (!keys[p]) {
      io.out(`${r}: skipped, ${cfg.providers[p].keyEnv} is absent`);
      continue;
    }
    try {
      if (r === 'writer') {
        const pack = writerPack({ cfg, order: toy, tracked, read: () => before, rules: rules('writer_rules.md') }, null);
        const reply = await chat(cfg, { role: r, system: pack.system, user: pack.user, json: false }, { env: io.env });
        const parsed = parseEdits(reply.text);
        const plan = parsed.ok && parsed.blocked === null ? planEdits(parsed.blocks, buildPolicy(toy, [], []), { read: () => before }) : null;
        const good = plan !== null && plan.ok && plan.files[0]?.after.includes('a + b');
        if (!good) ok = false;
        live[r] = { echoedModel: reply.model, usage: reply.usage ?? null, ms: reply.ms, applied: good };
        io.out(`${r}: answered as "${reply.model}" in ${reply.ms} ms; its edit ${good ? 'parsed and applied' : `did NOT apply: ${!parsed.ok ? parsed.error : plan && !plan.ok ? plan.repairMessage.split('\n')[0] : 'unexpected answer'}`}`);
      } else {
        const after = 'export function add(a: number, b: number): number {\n  return a + b + 1;\n}\n';
        const diff = '--- a/src/toy.ts\n+++ b/src/toy.ts\n@@ -1,3 +1,3 @@\n export function add(a: number, b: number): number {\n-  return a - b;\n+  return a + b + 1;\n }\n';
        const pack = reviewerPack({ cfg, order: toy, tracked, read: () => after, rules: rules('reviewer_rules.md'), role: r, diff, gateSummary: 'typecheck: pass; no tests were run' });
        const reply = await chat(cfg, { role: r, system: pack.system, user: pack.user, json: true }, { env: io.env });
        const parsed = parseFindings(reply.text, { idPrefix: 'D', max: cfg.limits.maxFindings });
        if (!parsed.ok) ok = false;
        live[r] = { echoedModel: reply.model, usage: reply.usage ?? null, ms: reply.ms, findings: parsed.ok ? parsed.review.findings.length : null };
        io.out(`${r}: answered as "${reply.model}" in ${reply.ms} ms; ${parsed.ok ? `${parsed.review.findings.length} finding(s) on a planted bug` : `its answer did NOT parse: ${parsed.error}`}`);
      }
      const echoed = (live[r] as { echoedModel: string }).echoedModel;
      if (echoed !== cfg.roles[r].model && !echoed.startsWith(cfg.roles[r].model)) io.out(`  NOTE ${r}: asked for "${cfg.roles[r].model}", the vendor ran "${echoed}". Vendors reroute retired names without an error; check this is the model you meant.`);
    } catch (e) {
      ok = false;
      io.out(`${r}: the call failed: ${say(e)}`);
    }
  }
  return { ...report, live, ok };
}

function start(a: Args, io: Io): unknown {
  const home = homeOf(a, io);
  const cfg = config(home);
  const slug = a.need('slug');
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) throw new Refusal('--slug: lower-case letters, digits and hyphens, at most 40');
  const base = resolveCommit(SHARED, a.opt('base') ?? 'HEAD');
  const lock = git(SHARED, ['show', `${base}:package-lock.json`]).stdout;
  const have = existsSync(join(home, '.lockhash')) ? readFileSync(join(home, '.lockhash'), 'utf8').trim() : '';
  if (have !== lockHash(lock)) throw new Refusal(`the relay's node_modules in ${home} ${have ? 'were installed from a different package-lock.json' : 'are not installed'}: run "init" first`);
  const id = newRunId(slug, new Date(io.now()));
  const paths = runPaths(home, id);
  if (existsSync(paths.dir)) throw new Refusal(`${paths.dir} already exists`);
  mkdirSync(paths.ledger, { recursive: true });
  const branch = `relay/${id}`;
  const head = cloneSparse(SHARED, paths.clone, base, branch, cfg.sparse);
  const ledger = new Ledger(paths, makeRedactor(secretsFrom(cfg, io.env), machinePaths(paths, SHARED)));
  const state: RunState = { id, slug, shared: SHARED, base, branch, createdAt: new Date(io.now()).toISOString(), amendments: 0, baselineDone: false, head, gitMark: gitFolderMark(paths.clone), writes: 0, orchestratorDone: false, gateFixRounds: 0, lockedTests: {}, reviews: [], unlocked: [], steps: 0 };
  ledger.saveState(state);
  ledger.log('start', { base, branch });
  const dirty = git(SHARED, ['status', '--porcelain', '--untracked-files=no']).stdout.split('\n').filter(Boolean).length;
  io.out(`run ${id}`);
  io.out(`  clone:  ${paths.clone}   (commit ${base.slice(0, 8)}; read and plan from here, not from the shared checkout)`);
  io.out(`  ledger: ${paths.ledger}`);
  if (dirty) io.out(`  note: the shared checkout has ${dirty} uncommitted tracked change(s); they are not part of this run`);
  return { run: id, clone: paths.clone, ledger: paths.ledger, base, branch };
}

function order(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const source = resolve(a.need('file'));
  // The relay keeps the registered order under these names and checks it against a hash. An order edited there would be compared
  // with itself, and would steer the next step whether or not it was ever accepted.
  for (const own of ['order.json', 'order.registered.json']) {
    if (samePath(source, ctx.ledger.file(own))) throw new Refusal(`${own} in the ledger is the relay's own copy of the registered order; write the order to another file (order-draft.json) and register that`);
  }
  const parsed = parseOrder(readFileSync(source, 'utf8'));
  if (!parsed.ok) throw new Refusal(`the work order is not usable:\n${parsed.problems.map((p) => `  - ${p}`).join('\n')}`);
  const o = parsed.order;
  if (state.orderHash && !a.flag('amend')) throw new Refusal('this run already has a work order; pass --amend to replace it on purpose');
  const tracked = trackedFiles(ctx.ledger.paths.clone, state.base);
  const problems = orderProblems(ctx.cfg, o, tracked);
  if (o.slug !== state.slug) problems.push(`slug: this run is "${state.slug}"`);
  // a path git ignores would be written and run, and then left out of the commit, the reader's diff and the branch
  for (const p of [...o.create, ...o.orchestrator]) if (!problems.length && !tracked.has(p.toLowerCase()) && isIgnored(ctx.ledger.paths.clone, p)) problems.push(`${p}: git ignores this name here (.gitignore), so it could not be committed`);
  let was: WorkOrder | null = null;
  if (state.orderHash) {
    was = loadOrder(ctx, state);
    const still = new Set([...o.edit, ...o.create].map((p) => p.toLowerCase()));
    if (state.writes > 0) for (const p of [...was.edit, ...was.create]) if (!still.has(p.toLowerCase())) problems.push(`amend: ${p} was open to the writer and may have been written; it cannot be dropped`);
    // a file the writer created earlier is tracked in the clone now but was not at base: that is still a "create" path
  }
  if (o.rulesVersion !== undefined) {
    const abs = resolveInside(ctx.ledger.paths.clone, 'src/sim/rulesversion.ts');
    const m = existsSync(abs) ? /CURRENT_RULES_VERSION\s*=\s*(\d+)/.exec(git(ctx.ledger.paths.clone, ['show', `${state.base}:src/sim/rulesversion.ts`]).stdout) : null;
    if (m && o.rulesVersion <= Number(m[1])) problems.push(`rulesVersion: ${o.rulesVersion} is not above the current ${m[1]} at the base commit`);
  }
  let estimate = 0;
  if (!problems.length) {
    try {
      const read = readClone(ctx);
      estimate = writerPack({ cfg: ctx.cfg, order: o, tracked: trackedFiles(ctx.ledger.paths.clone), read, rules: '' }, null).tokens;
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (problems.length) throw new Refusal(`the work order is not usable:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  const text = `${JSON.stringify(o, null, 2)}\n`;
  let retake = false;
  if (was) {
    state.amendments += 1;
    copyFileSync(ctx.ledger.file('order.json'), ctx.ledger.file(`order-before-amendment-${state.amendments}.json`));
    state.stuck = undefined;
    // An amended order is a new instruction: the gate is run afresh under it and the writer's correction rounds start again.
    state.gate = undefined;
    state.gateFixRounds = 0;
    // The baseline holds only the tests the order named when it was taken. A test added now that exists at the base commit has
    // no record there, and every old failure in it would be charged to the change: the baseline is taken again.
    const had = new Set(was.tests);
    retake = was.typecheck !== o.typecheck || o.tests.some((t) => !had.has(t) && tracked.has(t.toLowerCase()));
    if (retake) state.baselineDone = false;
  }
  ctx.ledger.writeText('order.json', text);
  ctx.ledger.writeText('order.registered.json', text);
  // hashed as it stands on disk (the ledger redacts what it writes), since that is the text every later step reads back
  state.orderHash = sha256(ctx.ledger.readText('order.json'));
  ctx.ledger.saveState(state);
  ctx.ledger.log(state.amendments ? 'order amended' : 'order', { hash: state.orderHash, edit: o.edit, create: o.create, orchestrator: o.orchestrator, tests: o.tests });
  io.out(`work order registered (${state.amendments ? `amendment ${state.amendments}` : 'first'}): ${o.edit.length} to edit, ${o.create.length} to create, ${o.context.length} context; the writer's pack is about ${estimate} tokens`);
  if (retake) io.out('the tests or the typecheck changed: the baseline will be taken again at the base commit');
  return { orderHash: state.orderHash, amendments: state.amendments, writerTokens: estimate };
}

function spawnStep(ctx: Ctx, state: RunState, step: Step, home: string): void {
  state.steps += 1;
  const key = `${step.kind}-${state.steps}`;
  mkdirSync(ctx.ledger.file('steps'), { recursive: true });
  const log = openSync(ctx.ledger.file('steps', `${key}.log`), 'a');
  const viteNode = join(CODE_ROOT, 'node_modules', 'vite-node', 'dist', 'cli.mjs');
  const env = { ...ctx.env, RELAY_CLI: '1', RELAY_SHARED: SHARED } as NodeJS.ProcessEnv;
  // rooted at this folder, which has no vite config, so that the step watches no files (see relay.mjs)
  const child = spawn(process.execPath, [viteNode, '--root', TOOL_DIR, join(TOOL_DIR, 'cli.ts'), '--', 'run-step', '--run', state.id, '--home', home, '--key', key, ...stepArgs(step)], { cwd: CODE_ROOT, detached: true, stdio: ['ignore', log, log], windowsHide: true, shell: false, env });
  closeSync(log);
  child.unref();
  if (child.pid === undefined) throw new Error('the step process could not be started');
  state.step = { key, kind: step.kind, pid: child.pid, startedAt: new Date().toISOString() };
  ctx.ledger.saveState(state);
  ctx.ledger.log('step started', { key });
}

/** a step touches this file every few seconds; a recorded process id alone cannot say a step is alive, since ids are reused */
const beatFile = (ctx: Ctx, key: string): string => ctx.ledger.file('steps', `${key}.beat`);
const BEAT_MS = 5_000;
const BEAT_STALE_MS = 5 * 60_000;

async function advance(a: Args, io: Io): Promise<Advance> {
  const home = homeOf(a, io);
  const seconds = Number(a.opt('max-seconds') ?? '540');
  if (!Number.isFinite(seconds) || seconds < 0) throw new Refusal('--max-seconds: a number of seconds');
  const deadline = io.now() + seconds * 1000;
  for (;;) {
    const { ctx, state } = open(a, io);
    if (state.step) {
      const step = state.step;
      const result = join('steps', `${step.key}.json`);
      const done = (): boolean => ctx.ledger.exists(result);
      const beatAge = (): number => {
        try {
          return Date.now() - statSync(beatFile(ctx, step.key)).mtimeMs;
        } catch {
          return Date.now() - Date.parse(step.startedAt);
        }
      };
      if (!done() && pidAlive(step.pid) && beatAge() < BEAT_STALE_MS) {
        if (io.now() >= deadline) return { status: 'running', step: step.key };
        await io.sleep(1000);
        continue;
      }
      if (!done() && pidAlive(step.pid)) {
        // The heartbeat stopped while a process with that id exists: the id now belongs to something else, or the machine slept
        // and the step is only now waking. Give a waking step two beats before it is given up.
        await io.sleep(2 * BEAT_MS + 2000);
        if (done() || beatAge() < BEAT_STALE_MS) continue;
      }
      if (!done()) await io.sleep(500);
      const fresh = ctx.ledger.loadState();
      if (fresh.step?.key !== step.key) continue;
      if (done()) {
        io.out(`${step.key}: ${oneLine(ctx.ledger.readJson<{ line: string }>(result).line)}`);
        fresh.step = undefined;
        ctx.ledger.saveState(fresh);
        // the step's log is its raw output and may name this machine's paths; it is closed now
        ctx.ledger.scrub(ctx.ledger.file('steps'));
      } else recoverDeadStep(ctx, fresh);
      continue;
    }
    if (state.finished) return { status: 'finished', outcome: state.finished.outcome };
    if (lockHeld(cloneLock(ctx))) {
      // a probe is running code in the clone; no step may start beside it
      if (io.now() >= deadline) return { status: 'running', step: 'a probe' };
      await io.sleep(1000);
      continue;
    }
    // two drivers calling at the same moment must not both start the step
    const asked = await withLock(ctx.ledger.file('advance.lock'), { waitMs: 15_000, staleMs: 60_000, sleep: io.sleep }, async (): Promise<Advance | null> => {
      const now = ctx.ledger.loadState();
      if (now.step || now.finished) return null;
      sameHead(ctx, now);
      if (settle(ctx, now)) ctx.ledger.saveState(now);
      const d = decide(ctx, now);
      if ('ask' in d) {
        if (d.ask.status === 'needs' && d.ask.needs === 'screen') ctx.ledger.writeText(join('screen', `${now.head}.diff`), diffText(ctx.ledger.paths.clone, now.screenedSha ?? now.base, now.head));
        return d.ask;
      }
      spawnStep(ctx, now, d.do, home);
      return null;
    });
    if (asked) return asked;
  }
}

async function runStepCommand(a: Args, io: Io): Promise<unknown> {
  const { ctx, state } = open(a, io);
  const key = a.need('key');
  if (state.step?.key !== key) throw new Refusal(`step ${key} is not the run's active step`);
  const i = a.rest.indexOf('--key');
  const step = stepFromArgs(a.rest.slice(i + 2).filter((x) => x !== '--'));
  ctx.ledger.owner = key;
  const touch = (): void => {
    try {
      writeFileSync(beatFile(ctx, key), String(Date.now()), 'utf8');
    } catch {
      // a missed beat is made up by the next
    }
  };
  touch();
  const beat = setInterval(touch, BEAT_MS);
  beat.unref();
  let result: { ok: boolean; line: string };
  try {
    result = await runStep(ctx, step);
  } catch (e) {
    const s = ctx.ledger.loadState();
    let repaired = '';
    try {
      repairAfterThrow(ctx, s);
    } catch (e2) {
      repaired = `; the clone could not be put back (${e2 instanceof Error ? e2.message : String(e2)})`;
    }
    s.stuck = stuckAt(ctx, `the ${key} step failed: ${e instanceof Error ? e.message : String(e)}${repaired}`, join('steps', `${key}.log`));
    ctx.ledger.saveState(s);
    // this goes to the step's log inside the ledger, so it is redacted like everything else there
    process.stderr.write(`${ctx.ledger.redact(e instanceof Error ? (e.stack ?? e.message) : String(e))}\n`);
    result = { ok: false, line: s.stuck.why };
  } finally {
    clearInterval(beat);
  }
  ctx.ledger.writeJson(join('steps', `${key}.json`), result);
  return result;
}

function adopt(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  sameHead(ctx, state);
  const o = loadOrder(ctx, state);
  if (!o.orchestrator.length) throw new Refusal('this work order names no orchestrator files; amend it to add them');
  const old = state.head;
  const what = a.flag('nothing') ? 'no edits' : oneLine(textOpt(a, 'm') ?? a.need('m'), 200);
  const commit = commitPaths(ctx.ledger.paths.clone, o.orchestrator, `relay: orchestrator, ${what}`);
  if (!commit.committed && !a.flag('nothing')) throw new Refusal(`none of the orchestrator files changed (${o.orchestrator.join(', ')}); edit them in ${ctx.ledger.paths.clone}, or pass --nothing`);
  state.head = commit.sha;
  state.orchestratorDone = true;
  if (state.screenedSha === old) state.screenedSha = commit.sha;
  ctx.ledger.saveState(state);
  ctx.ledger.log('adopt', { sha: commit.sha, committed: commit.committed });
  io.out(commit.committed ? `orchestrator edits committed at ${commit.sha.slice(0, 8)}` : 'recorded: no orchestrator edits');
  return { sha: commit.sha, committed: commit.committed };
}

function screen(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  sameHead(ctx, state);
  const sha = a.need('sha');
  if (sha !== state.head) throw new Refusal(`--sha ${sha} is not the commit awaiting a reader (${state.head}); read the current diff first`);
  const ok = a.flag('ok');
  if (ok === a.flag('reject')) throw new Refusal('pass exactly one of --ok and --reject');
  const note = textOpt(a, 'note') ?? '';
  if (!ok && !note.trim()) throw new Refusal('--reject needs --note-file: the note is sent to the writer as the reason');
  if (ok && state.screenReject?.sha === sha) throw new Refusal(`commit ${sha.slice(0, 8)} was refused by a reader and the writer has not answered yet; run advance`);
  ctx.ledger.writeJson(join('screen', `${sha}.json`), { sha, ok, by: a.need('by'), note });
  if (ok) state.screenedSha = sha;
  else state.screenReject = { sha, note };
  ctx.ledger.saveState(state);
  ctx.ledger.log('screen', { sha, ok });
  io.out(ok ? `commit ${sha.slice(0, 8)} passed the reader; the gate may run it` : `commit ${sha.slice(0, 8)} refused; the note goes back to the writer`);
  // "ok" in the result line means the command did what was asked; whether the reader passed the commit is "passed"
  return { sha, passed: ok };
}

function allFindingIds(ctx: Ctx, state: RunState): Set<string> {
  const ids = new Set<string>();
  for (const r of state.reviews) if (r.status === 'done') for (const f of loadFindings(ctx, r.n)) ids.add(f.id);
  return ids;
}

/** the relay's own outcomes (a file that did not load, a run with no report) are named in brackets; a real test is not */
const syntheticOutcome = (t: TestOutcome): boolean => t.file.startsWith('(') || t.id.slice(t.file.length + 3).startsWith('(');

async function probe(a: Args, io: Io): Promise<unknown> {
  const { ctx, state } = open(a, io);
  idle(state);
  const id = a.need('finding');
  if (!allFindingIds(ctx, state).has(id)) throw new Refusal(`no finding ${id} in this run`);
  // a probe executes the code at head exactly as the gate does, so it needs the same reader's pass
  if (state.screenedSha !== state.head) throw new Refusal('the code at the head of this run has not passed the reader, and a probe would execute it: run advance and screen it first');
  const text = readFileSync(resolve(a.need('file')), 'utf8');
  if (ctx.ledger.redact(text) !== text) throw new Refusal("the probe names one of this machine's own paths; it is run as a file in the clone's tests folder, so import the way a test there does ('../src/sim/x', './helpers/kit')");
  const name = probeName(id);
  const allow = (a.opt('allow') ?? '').split(',').filter(Boolean);
  const issues = scanSource(name, text, allow);
  if (issues.length) throw new Refusal(`the probe does things a probe should not need:\n${issues.map((i) => `  - line ${i.line}: ${i.what}`).join('\n')}\nRewrite it, or grant a name on purpose with --allow.`);
  const c = ctx.ledger.paths.clone;
  const limits = ctx.cfg.limits;
  // Probes of one run use the one clone, so they queue here whatever the driver starts at once.
  try {
    return await withLock(cloneLock(ctx), { waitMs: 8 * 60_000, staleMs: limits.probeTimeoutMs + limits.gateTimeoutMs, sleep: io.sleep }, async () => {
      const now = ctx.ledger.loadState();
      idle(now);
      if (now.screenedSha !== now.head) throw new Refusal('the head of this run changed while this probe waited; run advance');
      const before = strays(ctx, now);
      if (before.length) throw new Refusal(`the clone is not as the relay left it, so nothing was run: ${before.join('; ')}`);
      const dir = join('probes', id);
      ctx.ledger.writeText(join(dir, 'probe.test.ts'), text);
      const abs = resolveInside(c, name);
      const outDir = ctx.ledger.file(dir, `run-${readdirSync(ctx.ledger.file(dir)).length}`);
      const typecheck = loadOrder(ctx, now).typecheck;
      let result;
      try {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, text, 'utf8');
        // typechecked as it will be when it rides in a gate: a probe that runs but does not typecheck would fail that gate later
        result = await runGate({ clone: c, toolsRoot: ctx.ledger.paths.home, tests: [name], typecheck, timeoutMs: limits.probeTimeoutMs, maxWorkers: 1, outDir, env: io.env });
      } finally {
        rmSync(abs, { force: true });
      }
      const left = strays(ctx, now);
      const base = name.slice(name.lastIndexOf('/') + 1);
      const typeErrors = result.typecheckOutput.split(/\r?\n/).filter((l) => l.includes(base) && / error TS\d+/.test(l));
      const real = result.tests.filter((t) => t.file === name && !syntheticOutcome(t));
      const failed = real.filter((t) => t.state === 'fail');
      // a file that did not load, a run with no report: the probe itself is broken, which reproduces nothing
      const broken = result.tests.filter((t) => t.state === 'fail' && !real.includes(t));
      const timedOut = result.timedOut || result.typecheck === 'timeout' || result.tests.some((t) => t.state === 'timeout');
      let outcome: 'fails' | 'passes' | 'timeout' | 'error';
      let words: string;
      if (left.length) [outcome, words] = ['error', `changed the clone (${left.join('; ')}). Nothing was removed: read what it left, a probe should write nothing`];
      else if (timedOut) [outcome, words] = ['timeout', 'timed out: neither a reproduction nor a refutation'];
      else if (typeErrors.length) [outcome, words] = ['error', `does not typecheck, so it proves nothing yet; correct it and run it again:\n${typeErrors.slice(0, 10).join('\n')}`];
      else if (broken.length) [outcome, words] = ['error', `did not run, so it proves nothing yet (it is run as ${name} inside the clone; write its imports from there):\n${broken.map((t) => `${t.id}: ${t.message}`).join('\n').slice(0, 1500)}`];
      else if (failed.length) [outcome, words] = ['fails', 'FAILS on the current code: the finding is reproduced'];
      else if (real.some((t) => t.state === 'pass')) [outcome, words] = ['passes', 'passes on the current code: the finding is not reproduced by this probe'];
      else [outcome, words] = ['error', 'ran no test'];
      ctx.ledger.writeJson(join(dir, 'result.json'), { id, sha: now.head, outcome, tests: result.tests, left, typeErrors });
      ctx.ledger.scrub(outDir);
      ctx.ledger.writeText(join(dir, 'output.txt'), failed.map((t) => `${t.id}\n${t.message}`).join('\n\n'));
      ctx.ledger.log('probe', { id, outcome });
      io.out(`probe for ${id} ${words}`);
      return { id, outcome };
    });
  } catch (e) {
    if (e instanceof Busy) throw new Refusal(e.message);
    throw e;
  }
}

function verdicts(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const n = Number(a.need('review'));
  const rec = state.reviews.find((r) => r.n === n);
  if (!rec || rec.status !== 'done') throw new Refusal(`review ${n} has no findings on record`);
  if (rec.fixRounds > 0) throw new Refusal(`review ${n}'s fixes were already sent to the writer`);
  // once a review is closed nothing reads its verdicts again: a "fix" registered now would be printed and never sent
  if (rec.settled) throw new Refusal(`review ${n} is settled; its verdicts can no longer be changed`);
  const findings = loadFindings(ctx, n);
  const parsed = parseVerdicts(readFileSync(resolve(a.need('file')), 'utf8'), findings);
  if (!parsed.ok) throw new Refusal(`the verdicts are not usable: ${parsed.error}`);
  const unprobed = new Set((a.opt('unprobed') ?? '').split(',').filter(Boolean));
  const problems: string[] = [];
  for (const v of parsed.verdicts) {
    if (v.action === 'fix' && !unprobed.has(v.id)) {
      const file = join('probes', v.id, 'result.json');
      const outcome = ctx.ledger.exists(file) ? ctx.ledger.readJson<{ outcome: string }>(file).outcome : null;
      if (outcome !== 'fails') problems.push(`${v.id}: "fix" needs a probe on record that fails on the current code (it ${outcome === null ? 'has none' : `has one that ${outcome}`}). Run probe first, or name the id under --unprobed if it was confirmed by reading alone.`);
    }
    for (const t of v.unlockTests ?? []) if (!(t in state.lockedTests)) problems.push(`${v.id}: unlockTests names ${t}, which is not a locked test file of this run`);
  }
  if (problems.length) throw new Refusal(`the verdicts are not usable:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  ctx.ledger.writeJson(join('reviews', String(n), 'verdicts.json'), { review: n, unprobed: [...unprobed], verdicts: parsed.verdicts });
  rec.adjudicated = true;
  ctx.ledger.saveState(state);
  const count = (k: string): number => parsed.verdicts.filter((v) => v.verdict === k).length;
  ctx.ledger.log('verdicts', { review: n, confirmed: count('confirmed'), refuted: count('refuted'), notReproduced: count('not_reproduced'), toFix: parsed.verdicts.filter((v) => v.action === 'fix').length });
  io.out(`review ${n}: ${count('confirmed')} confirmed, ${count('refuted')} refuted, ${count('not_reproduced')} not reproduced; ${parsed.verdicts.filter((v) => v.action === 'fix').length} go back to the writer`);
  return { review: n, verdicts: parsed.verdicts.length };
}

function reviewable(ctx: Ctx, state: RunState, n: number): void {
  if (!(n >= 1 && n <= ctx.cfg.reviewers.length)) throw new Refusal(`--review: 1 to ${ctx.cfg.reviewers.length}`);
  if (!state.gate || state.gate.sha !== state.head || !state.gate.ok) throw new Refusal('a review is taken of a commit that passed the gate; run advance first');
  const rec = state.reviews.find((r) => r.n === n);
  if (rec && rec.status === 'done') throw new Refusal(`review ${n} is already on record`);
  for (const r of state.reviews) if (r.n < n && !r.settled) throw new Refusal(`review ${r.n} is not settled yet`);
}

function exportReview(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const n = Number(a.need('review'));
  reviewable(ctx, state, n);
  const pack = buildReviewPack(ctx, state, n);
  const dir = join('reviews', String(n));
  const system = ctx.ledger.writeText(join(dir, 'export-system.txt'), pack.system);
  const user = ctx.ledger.writeText(join(dir, 'export-user.txt'), pack.user);
  io.out(`the review pack for reviewer ${n} (about ${pack.tokens} tokens):\n  ${system}\n  ${user}\nGive both to the reviewer, save its JSON answer to a file, then: import --run ${state.id} --review ${n} --file <answer>`);
  return { system, user, tokens: pack.tokens, sha: state.head };
}

function importReview(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const n = Number(a.need('review'));
  reviewable(ctx, state, n);
  const done = recordReview(ctx, state, n, readFileSync(resolve(a.need('file')), 'utf8'), { role: ctx.cfg.reviewers[n - 1], via: 'import' });
  if (!done.ok) throw new Refusal(`the answer is not in the required format: ${done.error}`);
  const s = ctx.ledger.loadState();
  s.stuck = undefined;
  ctx.ledger.saveState(s);
  io.out(`review ${n} imported: ${done.rec.findings} finding(s), ${done.rec.dropped} dropped`);
  return { review: n, findings: done.rec.findings };
}

function skipReview(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const n = Number(a.need('review'));
  reviewable(ctx, state, n);
  const why = oneLine(textOpt(a, 'note') ?? a.need('note'), 300);
  state.reviews = [...state.reviews.filter((r) => r.n !== n), { n, role: ctx.cfg.reviewers[n - 1], status: 'skipped' as const, reason: why, findings: 0, dropped: 0, adjudicated: true, fixRounds: 0, settled: true }].sort((x, y) => x.n - y.n);
  state.stuck = undefined;
  ctx.ledger.saveState(state);
  ctx.ledger.log('review skipped', { n, reason: why });
  io.out(`review ${n} skipped: ${why}`);
  return { review: n, skipped: true };
}

function retry(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  if (state.stuck) {
    ctx.ledger.log('retry', { was: state.stuck.why });
    state.stuck = undefined;
    ctx.ledger.saveState(state);
    io.out('cleared; run advance');
    return { cleared: true };
  }
  // Some stuck states are read off the gate's record at every call and are not stored. A gate that could not be judged
  // (timeouts) is run again; a gate the writer failed twice is not something another look can change.
  if (gateUnjudged(ctx, state)) {
    ctx.ledger.log('retry', { was: 'the gate could not be judged' });
    state.gate = undefined;
    ctx.ledger.saveState(state);
    io.out('the gate will run again; run advance');
    return { cleared: true };
  }
  const d = decide(ctx, state);
  if ('ask' in d && d.ask.status === 'needs' && d.ask.needs === 'stuck') {
    throw new Refusal('retry cannot help here: the correction rounds are spent. An amended work order (order --amend) gives the writer new rounds under the corrected order; otherwise finish the run as failed');
  }
  throw new Refusal('this run is not stuck');
}

function summarise(ctx: Ctx, state: RunState, outcome: 'done' | 'failed', note: string, cloneUsable = true): string {
  const L: string[] = [];
  const cloneDir = ctx.ledger.paths.clone;
  let o: WorkOrder | null = null;
  let orderNote = '(none registered)';
  try {
    if (state.orderHash) o = loadOrder(ctx, state);
  } catch (e) {
    orderNote = `(unreadable: ${oneLine(e instanceof Error ? e.message : String(e), 200)})`;
  }
  // every piece of text below that a vendor, a model or a tool supplied is held to one line: this file is quoted to the owner
  L.push(`# Model relay run ${state.id}`, '');
  L.push(`Outcome: ${outcome}${note ? `: ${oneLine(note, 400)}` : ''}`, `Work order: ${o ? oneLine(o.title, 200) : orderNote}`, `Base ${state.base}, branch ${state.branch}, head ${state.head}`, '');
  L.push('## Models and tokens (as the vendors reported them)', '');
  const callsDir = ctx.ledger.file('calls');
  const totals = new Map<string, { calls: number; input: number; output: number; failed: number }>();
  for (const d of existsSync(callsDir) ? readdirSync(callsDir).sort() : []) {
    const file = join(callsDir, d, 'meta.json');
    if (!existsSync(file)) continue;
    const m = JSON.parse(readFileSync(file, 'utf8')) as { role: string; requestedModel: string; echoedModel?: string; usage?: { input: number; output: number } | null; error?: unknown };
    const key = `${m.role}: asked for ${m.requestedModel}, ran ${m.echoedModel ? oneLine(m.echoedModel, 100) : '(call failed)'}`;
    const t = totals.get(key) ?? { calls: 0, input: 0, output: 0, failed: 0 };
    t.calls += 1;
    t.input += m.usage?.input ?? 0;
    t.output += m.usage?.output ?? 0;
    if (m.error) t.failed += 1;
    totals.set(key, t);
  }
  for (const [k, t] of totals) L.push(`- ${k}: ${t.calls} call(s), ${t.input} tokens in, ${t.output} out${t.failed ? `, ${t.failed} failed` : ''}`);
  if (!totals.size) L.push('- no vendor call was made');
  L.push('', '## Writing', '');
  for (let n = 1; n <= state.writes; n++) {
    const file = join('writes', String(n), 'apply.json');
    if (!ctx.ledger.exists(file)) continue;
    const ap = ctx.ledger.readJson<{ turn: number; sha: string; files: Array<{ path: string; created: boolean; tiers: number[] }> }>(file);
    const loose = ap.files.flatMap((f) => f.tiers).filter((t) => t > 0).length;
    L.push(`- write ${n} at ${ap.sha.slice(0, 8)}: ${ap.files.map((f) => `${f.path}${f.created ? ' (new)' : ''}`).join(', ')}; ${ap.turn} repair turn(s)${loose ? `; ${loose} block(s) matched only after re-indenting` : ''}`);
  }
  if (!state.writes) L.push('- nothing was written');
  L.push('', '## Gate', '');
  if (state.gate) {
    const g = ctx.ledger.readJson<{ summary: string }>(state.gate.file);
    L.push(`At ${state.gate.sha.slice(0, 8)}: ${state.gate.ok ? 'passed' : 'FAILED'}`, '', g.summary);
  } else L.push('The gate did not run.');
  L.push('', `Not run by the relay: the full test suite, the lab, and any test the work order did not name${o ? ` (it named: ${o.tests.join(', ') || 'none'})` : ''}.`);
  L.push('', '## Reviews', '');
  if (!state.reviews.length) L.push('No review was taken.');
  for (const r of state.reviews) {
    if (r.status === 'skipped') {
      L.push(`### Review ${r.n} (${r.role}): skipped, ${oneLine(r.reason ?? '', 300)}`, '');
      continue;
    }
    L.push(`### Review ${r.n} (${r.role}) of ${r.sha?.slice(0, 8)}`, '');
    if (r.findings === 0) L.push(`No findings reported${r.dropped ? ` (${r.dropped} dropped by the cap or as P3)` : ''}. That is the reviewer's silence, not a proof of correctness.`, '');
    const vs = new Map(loadVerdicts(ctx, r.n).map((v) => [v.id, v]));
    for (const f of loadFindings(ctx, r.n)) {
      const v = vs.get(f.id);
      L.push(`- ${f.id} ${f.severity} ${oneLine(f.file, 120)}:${f.startLine} "${oneLine(f.title, 200)}": ${v ? `${v.verdict}${v.severity ? ` (regraded ${v.severity})` : ''}, ${v.action}` : 'NOT ADJUDICATED'}`);
      if (v?.evidence) L.push(`  evidence: ${oneLine(v.evidence, 300)}`);
    }
    if (r.dropped && r.findings) L.push(`- ${r.dropped} further finding(s) were dropped by the cap of ${ctx.cfg.limits.maxFindings} or as P3`);
    L.push('');
  }
  const open2 = state.reviews.flatMap((r) => (r.status === 'done' ? loadVerdicts(ctx, r.n).filter((v) => v.action === 'owner').map((v) => v.id) : []));
  if (open2.length) L.push(`For the owner to decide: ${open2.join(', ')}`, '');
  L.push('## Tests the writer wrote', '');
  const locked = Object.keys(state.lockedTests);
  if (!locked.length) L.push(state.firstGreenSha ? 'The gate passed, and the work order has the writer write no test file: nothing was frozen.' : 'None were frozen: the gate never passed.');
  for (const t of locked) {
    const now = existsSync(resolveInside(cloneDir, t)) ? readFileSync(resolveInside(cloneDir, t), 'utf8') : '';
    if (sha256(now) === state.lockedTests[t]) {
      L.push(`- ${t}: unchanged since the gate first passed with it`);
      continue;
    }
    const then = cloneUsable ? git(cloneDir, ['show', `${state.lockedAt?.[t] ?? state.firstGreenSha}:${t}`], { allowFail: true }).stdout : '';
    const pick = (s: string): string[] => s.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l.includes('expect('));
    const a1 = pick(then);
    const b1 = pick(now);
    L.push(`- ${t}: CHANGED after the gate first passed with it. Assertions removed:`, ...a1.filter((l) => !b1.includes(l)).map((l) => `    - ${l}`), '  Assertions added:', ...b1.filter((l) => !a1.includes(l)).map((l) => `    + ${l}`));
  }
  L.push('');
  return L.join('\n');
}

function finish(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  idle(state);
  const failed = a.flag('failed') || a.opt('failed-file') !== undefined ? (textOpt(a, 'failed') ?? '') : undefined;
  const c = ctx.ledger.paths.clone;
  // git runs what a clone's config and hooks name; if those changed, no git command is run in the clone, not even to finish
  const tampered = existsSync(c) && state.gitMark !== undefined && gitFolderMark(c) !== state.gitMark;
  // what is handed to the owner must be the commit this run made, screened and gated under that name
  const atHead = !tampered && existsSync(c) && headSha(c) === state.head && git(c, ['rev-parse', '--verify', '-q', `refs/heads/${state.branch}`], { allowFail: true }).stdout.trim() === state.head;
  if (failed === undefined) {
    sameHead(ctx, state);
    if (!atHead) throw new Refusal(`the clone's branch ${state.branch} is not at the run's last commit ${state.head}`);
    if (settle(ctx, state)) ctx.ledger.saveState(state);
    const d = decide(ctx, state);
    if (!('ask' in d) || d.ask.status !== 'needs' || d.ask.needs !== 'finish') throw new Refusal('the run is not at its end; run advance, or finish it as failed with --failed <why>');
  }
  const outcome = failed === undefined ? 'done' : 'failed';
  const summary = summarise(ctx, state, outcome, failed ?? '', !tampered);
  const file = ctx.ledger.writeText('summary.md', summary);
  let branch: string | null = null;
  // a clone something else wrote into is evidence: it stays for a person to look at
  let keep = a.flag('keep') || tampered;
  if (state.head !== state.base) {
    if (atHead) {
      fetchBranchInto(SHARED, c, state.branch);
      branch = state.branch;
    } else {
      // only a failed run gets here: its clone holds something the relay did not commit, so nothing is handed over and it stays
      keep = true;
      io.out(`${tampered ? "The clone's git folder was changed by something other than the relay" : "The clone is not at the run's last commit"}, so no branch was added to the checkout. It is kept for inspection: ${c}`);
    }
  }
  state.finished = { at: new Date(io.now()).toISOString(), outcome, note: oneLine(failed ?? '', 400) };
  ctx.ledger.saveState(state);
  ctx.ledger.log('finish', { outcome, branch });
  let cloneLeft: string | null = keep ? c : null;
  if (!keep) {
    try {
      removeRunDir(ctx.ledger.paths.home, c);
    } catch (e) {
      // on Windows a folder some shell or editor has open cannot be removed; the run is finished all the same
      cloneLeft = c;
      io.out(`The clone could not be removed (${oneLine(e instanceof Error ? e.message : String(e), 200)}); delete it by hand: ${c}`);
    }
  }
  io.out(ctx.ledger.readText('summary.md'));
  io.out(branch ? `The change is on branch ${branch} of this checkout (commit ${state.head}). Nothing was merged or pushed: that is the owner's word.` : 'No branch was added to the checkout.');
  io.out(`Summary: ${file}`);
  return { outcome, branch, head: state.head, summary: file, cloneLeft };
}

function status(a: Args, io: Io): unknown {
  const { ctx, state } = open(a, io);
  const copy = structuredClone(state);
  if (!copy.step) settle(ctx, copy);
  const next = copy.step ? { status: 'running', step: copy.step.key } : decide(ctx, copy);
  io.out(JSON.stringify({ id: state.id, head: state.head, writes: state.writes, gate: state.gate ?? null, reviews: state.reviews, stuck: state.stuck ?? null }, null, 2));
  return { next: 'ask' in next ? next.ask : next };
}

const HELP = readFileSync(fileURLToPath(import.meta.url), 'utf8')
  .split('\n')
  .slice(0, 18)
  .map((l) => l.replace(/^\/\/ ?/, ''))
  .join('\n');

/** Runs one command. Returns the process exit code: 0 done, 1 refused or failed, 2 the run needs a judgement or is still working. */
export async function main(argv: string[], io: Io = realIo): Promise<number> {
  const a = parseArgs(argv);
  const result = (value: unknown): void => io.out(`RELAY_RESULT ${JSON.stringify(value)}`);
  try {
    switch (a.cmd) {
      case 'init':
        result({ ok: true, ...(init(a, io) as object) });
        return 0;
      case 'doctor': {
        const r = (await doctor(a, io)) as { ok: boolean };
        result(r);
        return r.ok ? 0 : 1;
      }
      case 'start':
        result({ ok: true, ...(start(a, io) as object) });
        return 0;
      case 'order':
        result({ ok: true, ...(order(a, io) as object) });
        return 0;
      case 'advance': {
        const r = await advance(a, io);
        result(r);
        return r.status === 'finished' ? 0 : r.status === 'error' ? 1 : 2;
      }
      case 'run-step':
        result(await runStepCommand(a, io));
        return 0;
      case 'adopt':
        result({ ok: true, ...(adopt(a, io) as object) });
        return 0;
      case 'screen':
        result({ ok: true, ...(screen(a, io) as object) });
        return 0;
      case 'probe':
        result({ ok: true, ...((await probe(a, io)) as object) });
        return 0;
      case 'verdicts':
        result({ ok: true, ...(verdicts(a, io) as object) });
        return 0;
      case 'export':
        result({ ok: true, ...(exportReview(a, io) as object) });
        return 0;
      case 'import':
        result({ ok: true, ...(importReview(a, io) as object) });
        return 0;
      case 'skip-review':
        result({ ok: true, ...(skipReview(a, io) as object) });
        return 0;
      case 'retry':
        result({ ok: true, ...(retry(a, io) as object) });
        return 0;
      case 'finish':
        result({ ok: true, ...(finish(a, io) as object) });
        return 0;
      case 'status':
        result({ ok: true, ...(status(a, io) as object) });
        return 0;
      case 'runs': {
        const runs = listRuns(homeOf(a, io));
        for (const r of runs) io.out(r);
        result({ ok: true, runs });
        return 0;
      }
      default:
        io.out(HELP);
        result({ ok: a.cmd === 'help', error: a.cmd === 'help' ? undefined : `unknown command: ${a.cmd}` });
        return a.cmd === 'help' ? 0 : 1;
    }
  } catch (e) {
    const refused = e instanceof Refusal;
    io.out(refused ? `refused: ${e.message}` : `failed: ${e instanceof Error ? e.message : String(e)}`);
    result({ ok: false, error: e instanceof Error ? e.message : String(e) });
    return 1;
  }
}

// Run only when started as a program, not when a test imports main. The launcher sets RELAY_CLI, and a detached step inherits
// it; under vite-node the script's own path is not a reliable sign of being the entry point.
if (process.env.RELAY_CLI === '1') {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
