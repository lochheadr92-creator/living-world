// The relay's sequence, in one place. `decide` reads a run's state and says what comes next: either a mechanical step the relay
// does itself (take the baseline, ask the writer, run the gate, ask a reviewer) or a judgement only Claude can give (write the work
// order, make the orchestrator's own edits, read the code before it is executed, adjudicate findings, resolve a stuck run, finish).
// Whoever drives a run (a Workflow script, a session following the skill, the owner by hand) only loops on `advance` and answers
// what it asks for. Nobody has to remember the order of steps, and no step can be skipped by a driver that misread an output.
//
// The order of events is the owner's: the writer writes; the first reviewer reviews; Claude reproduces each finding before any is
// acted on; the writer fixes what was confirmed; the second reviewer then reviews the corrected change without being shown the
// first reviewer's findings. Rounds are capped and the run ends at a branch and a summary, never at a merge or a push.
//
// Mechanical steps run in a detached process, because a single vendor call can outlast any shell call an agent may make. While a
// step runs, only that process writes the state file; `advance` waits for the step's result file and then takes over again.
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { buildPolicy, diskStore, parseEdits, planEdits, writePlanned } from './edits';
import { diffRanges, parseFindings, renderFeedback, renderGateFeedback, triage } from './findings';
import { gateSummary, judge, runGate } from './gate';
import { Ledger, oneLine, sha256 } from './ledger';
import { reviewerPack, stripLeadingComment, writerPack, PackError, type Pack } from './pack';
import { resolveInside } from './paths';
import { chat, ProviderError } from './provider';
import { changed, commitPaths, diffText, git, gitFolderMark, headSha, ignoredFiles, restore, trackedFiles } from './repo';
import { scanSource } from './scan';
import type { Advance, Finding, GateResult, GateVerdict, RelayConfig, ReviewRecord, RoleName, RunState, TestOutcome, Verdict, WorkOrder } from './types';

export interface Ctx {
  cfg: RelayConfig;
  /** the checkout the relay's own code runs from; read, never written */
  shared: string;
  ledger: Ledger;
  env: Record<string, string | undefined>;
  /** tools/relay, for the prompt files */
  toolDir: string;
}

export type Feedback = 'none' | 'gate' | 'screen' | `verdicts:${number}`;

export type Step =
  | { kind: 'baseline' }
  | { kind: 'write'; feedback: Feedback }
  | { kind: 'gate' }
  | { kind: 'review'; n: number };

export type Decision = { do: Step } | { ask: Advance };

const clone = (ctx: Ctx): string => ctx.ledger.paths.clone;

/**
 * vitest and vite keep a cache under node_modules in the folder they run in. A clone has no node_modules of its own (the tools
 * come from the relay's home), so whatever is there after a run is that cache, or something executed code planted where the
 * next run would load it first. Either way it goes before anything else looks at the clone.
 */
export function clearToolCache(cloneDir: string): void {
  rmSync(join(cloneDir, 'node_modules'), { recursive: true, force: true, maxRetries: 3 });
}

/**
 * The registered work order. Its text is checked against the hash taken when it was registered: an order edited in place was
 * never validated (it could drop a file the writer already wrote, or open one no order may open) and must not steer a step.
 */
export function loadOrder(ctx: Ctx, state: RunState): WorkOrder {
  const text = ctx.ledger.readText('order.json');
  if (sha256(text) !== state.orderHash) {
    throw new Error('order.json in the ledger is not the work order that was registered: it was changed in place. Copy order.registered.json over it, then write any change to another file and register that with order --amend');
  }
  return JSON.parse(text) as WorkOrder;
}
const reviewDir = (n: number): string => join('reviews', String(n));
export const probeName = (id: string): string => `tests/zz_relay_${id.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.test.ts`;

export function loadFindings(ctx: Ctx, n: number): Finding[] {
  return ctx.ledger.readJson<{ findings: Finding[] }>(join(reviewDir(n), 'findings.json')).findings;
}

export function loadVerdicts(ctx: Ctx, n: number): Verdict[] {
  return ctx.ledger.exists(reviewDir(n), 'verdicts.json') ? ctx.ledger.readJson<{ verdicts: Verdict[] }>(join(reviewDir(n), 'verdicts.json')).verdicts : [];
}

/** probes of confirmed findings whose fix has been asked for: from then on they are part of every gate */
function standingProbes(ctx: Ctx, state: RunState): Array<{ id: string; file: string }> {
  const out: Array<{ id: string; file: string }> = [];
  for (const rec of state.reviews) {
    if (rec.status !== 'done' || !rec.adjudicated || rec.fixRounds === 0) continue;
    for (const v of loadVerdicts(ctx, rec.n)) {
      const file = ctx.ledger.file('probes', v.id, 'probe.test.ts');
      if (v.verdict === 'confirmed' && v.action === 'fix' && existsSync(file)) out.push({ id: v.id, file });
    }
  }
  return out;
}

/**
 * A review's confirmed findings go to the writer once. Whether the fix then holds is the gate's question (the confirmed probes
 * ride along from that point), and a failing gate has its own correction rounds; a second pass over the same findings would
 * only rewrite code that already passes. limits.reviewFixRounds of 0 means findings are recorded and never sent.
 */
function fixDue(ctx: Ctx, state: RunState, rec: ReviewRecord): boolean {
  if (ctx.cfg.limits.reviewFixRounds <= 0 || !loadVerdicts(ctx, rec.n).some((v) => v.action === 'fix')) return false;
  // a fix is in only when a commit followed the review: while the head is still the commit that was reviewed, nothing was fixed,
  // whatever any counter says
  return rec.fixRounds === 0 || state.head === rec.sha;
}

/** true when the gate at head failed for no reason that can be held against the change: timeouts, or the time limit */
export function gateUnjudged(ctx: Ctx, state: RunState): boolean {
  if (!state.gate || state.gate.sha !== state.head || state.gate.ok) return false;
  const verdict = ctx.ledger.readJson<{ verdict: GateVerdict }>(state.gate.file).verdict;
  return !verdict.typecheckBroken && verdict.newFailures.length === 0;
}

/** What comes next for this run. Pure apart from reading the ledger. */
export function decide(ctx: Ctx, state: RunState): Decision {
  const ask = (a: Advance): Decision => ({ ask: a });
  if (state.finished) return ask({ status: 'finished', outcome: state.finished.outcome });
  const stuck = (why: string, detailFile: string): Decision => ask({ status: 'needs', needs: 'stuck', why, detailFile, clone: clone(ctx) });
  if (state.stuck) return stuck(state.stuck.why, ctx.ledger.file(state.stuck.detailFile));
  if (!state.orderHash) return ask({ status: 'needs', needs: 'order', clone: clone(ctx) });
  // read before any step is started: an order changed in place must stop the run here, not inside a step
  const order = loadOrder(ctx, state);
  if (!state.baselineDone) return { do: { kind: 'baseline' } };
  if (state.writes === 0) return { do: { kind: 'write', feedback: 'none' } };
  if (order.orchestrator.length > 0 && !state.orchestratorDone) return ask({ status: 'needs', needs: 'orchestrator-edits', paths: order.orchestrator, clone: clone(ctx) });
  const limits = ctx.cfg.limits;
  if (state.screenReject?.sha === state.head) {
    if (state.gateFixRounds < limits.gateFixRounds) return { do: { kind: 'write', feedback: 'screen' } };
    return stuck(`the reader refused the code and ${limits.gateFixRounds} correction rounds are spent; an amended work order buys new rounds`, ctx.ledger.file('screen', `${state.head}.json`));
  }
  if (state.screenedSha !== state.head) return ask({ status: 'needs', needs: 'screen', sha: state.head, diffFile: ctx.ledger.file('screen', `${state.head}.diff`) });
  if (!state.gate || state.gate.sha !== state.head) return { do: { kind: 'gate' } };
  if (!state.gate.ok) {
    if (gateUnjudged(ctx, state)) return stuck('the gate could not be judged: tests timed out or the gate hit its time limit; when the machine is quiet, retry runs it again', ctx.ledger.file(state.gate.file));
    if (state.gateFixRounds < limits.gateFixRounds) return { do: { kind: 'write', feedback: 'gate' } };
    return stuck(`the gate still fails after ${limits.gateFixRounds} correction rounds; an amended work order buys new rounds`, ctx.ledger.file(state.gate.file));
  }
  // the gate is green at head: reviews, in the configured order
  for (let n = 1; n <= ctx.cfg.reviewers.length; n++) {
    const rec = state.reviews.find((r) => r.n === n);
    if (!rec) return { do: { kind: 'review', n } };
    if (rec.status === 'skipped' || rec.settled) continue;
    if (!rec.adjudicated) {
      const ids = loadFindings(ctx, n).map((f) => f.id);
      const prior = state.reviews.filter((r) => r.n < n && r.adjudicated && r.findings > 0).map((r) => ctx.ledger.file(reviewDir(r.n), 'verdicts.json'));
      return ask({ status: 'needs', needs: 'adjudicate', review: n, findingsFile: ctx.ledger.file(reviewDir(n), 'findings.json'), ids, priorVerdicts: prior, clone: clone(ctx) });
    }
    if (fixDue(ctx, state, rec)) return { do: { kind: 'write', feedback: `verdicts:${n}` } };
    // nothing to fix, or the fix is in and the gate (with the confirmed probes) is green at head: settle() closes it
    return ask({ status: 'error', error: `review ${n} is adjudicated and unsettled at a green gate; run advance again` });
  }
  return ask({ status: 'needs', needs: 'finish' });
}

/**
 * Bookkeeping that needs no step and no judgement, applied before every decision: a reviewer without a key is skipped, and a
 * review whose fixes are in (or that had none) is settled once the gate is green at head. Returns true when the state changed.
 */
export function settle(ctx: Ctx, state: RunState): boolean {
  if (state.finished || state.stuck || !state.gate || state.gate.sha !== state.head || !state.gate.ok || state.screenedSha !== state.head) return false;
  let touched = false;
  for (let n = 1; n <= ctx.cfg.reviewers.length; n++) {
    const role = ctx.cfg.reviewers[n - 1];
    let rec = state.reviews.find((r) => r.n === n);
    if (!rec) {
      const keyEnv = ctx.cfg.providers[ctx.cfg.roles[role].provider].keyEnv;
      if (ctx.env[keyEnv]?.trim()) return touched;
      rec = { n, role, status: 'skipped', reason: `${keyEnv} is not set`, findings: 0, dropped: 0, adjudicated: true, fixRounds: 0, settled: true };
      state.reviews.push(rec);
      ctx.ledger.log('review skipped', { n, role, reason: rec.reason });
      touched = true;
      continue;
    }
    if (rec.status === 'skipped' || rec.settled) continue;
    if (!rec.adjudicated || fixDue(ctx, state, rec)) return touched;
    rec.settled = true;
    state.unlocked = [];
    ctx.ledger.log('review settled', { n });
    touched = true;
  }
  return touched;
}

// ---- the steps ----

export interface StepResult {
  ok: boolean;
  /** one line for whoever reads the output */
  line: string;
}

const prompt = (ctx: Ctx, name: 'writer_rules.md' | 'reviewer_rules.md'): string => stripLeadingComment(readFileSync(join(ctx.toolDir, 'prompts', name), 'utf8'));

/**
 * A file of the clone by its repository path, or null when it is not there. A path that reaches its file through a link is
 * refused: the send rules judged the name that was asked for, and a link would read a file they never saw.
 */
export const readClone = (ctx: Ctx) => (path: string): string | null => {
  const root = clone(ctx);
  const abs = resolveInside(root, path);
  if (!existsSync(abs)) return null;
  const fold = (p: string): string => (process.platform === 'win32' ? p.toLowerCase() : p);
  if (lstatSync(abs).isSymbolicLink() || fold(realpathSync(abs)) !== fold(join(realpathSync(root), ...path.split('/')))) {
    throw new PackError(`${path} is reached through a link; the relay neither sends nor edits a file through one`);
  }
  return readFileSync(abs, 'utf8');
};

/**
 * A stuck record. The reason is kept to one bounded line: it may quote a vendor, a model or a tool, it is printed where a driver
 * reads its instructions, and it is handed to an agent. The file is kept relative to the ledger: the state file is redacted, and
 * an absolute path would not survive.
 */
export function stuckAt(ctx: Ctx, why: string, file: string): { why: string; detailFile: string } {
  return { why: oneLine(why), detailFile: isAbsolute(file) ? relative(ctx.ledger.paths.ledger, file) : file };
}

/**
 * What is in or around the clone that the relay did not put there. Code the gate ran can leave more than git status lists: a
 * commit of its own, a file under a name git ignores, or a package folder above the clone, which Node would load from before
 * the relay's own tools. Each is named; an empty list means the clone is as the relay left it. The tools' own cache is removed
 * first, since it is expected and is the one place a planted package could sit inside the clone.
 */
export function strays(ctx: Ctx, state: RunState): string[] {
  const c = clone(ctx);
  // Before any git command: git runs programs named in a clone's config and hooks, and the code the gate ran could have written
  // either. If they changed, nothing more is asked of git here.
  if (state.gitMark !== undefined && gitFolderMark(c) !== state.gitMark) return [`the clone's .git config or hooks changed since the clone was made; no git command was run in it. Look at ${join(c, '.git', 'config')} and ${join(c, '.git', 'hooks')}`];
  clearToolCache(c);
  const out: string[] = [];
  const head = headSha(c);
  if (head !== state.head) out.push(`the clone's HEAD is ${head} and the run's last commit is ${state.head}`);
  out.push(...changed(c));
  for (const p of ignoredFiles(c)) out.push(`${p} (a name git ignores)`);
  const run = ctx.ledger.paths.dir;
  for (const d of [join(run, 'node_modules'), join(dirname(run), 'node_modules')]) if (existsSync(d)) out.push(`${d} (a package folder above the clone)`);
  return out;
}

/** Puts the clone back on the run's branch at its last recorded commit, after a step that did not end as it should. */
function settleClone(ctx: Ctx, state: RunState, half?: { tracked: string[]; created: string[] }): void {
  const c = clone(ctx);
  // a baseline retaken after an amendment visits the base commit and leaves the clone detached if it dies there
  if (git(c, ['symbolic-ref', '-q', 'HEAD'], { allowFail: true }).status !== 0) git(c, ['checkout', '-q', '-f', state.branch]);
  // a write that died after its commit and before the state was saved: the commit was never recorded, so it goes
  if (headSha(c) !== state.head) git(c, ['reset', '-q', '--hard', state.head]);
  if (half) {
    restore(c, half.tracked, half.created);
    git(c, ['reset', '-q']);
  }
}

function stick(ctx: Ctx, state: RunState, why: string, detailFile: string): StepResult {
  state.stuck = stuckAt(ctx, why, detailFile);
  ctx.ledger.saveState(state);
  ctx.ledger.log('stuck', { why: state.stuck.why });
  return { ok: false, line: state.stuck.why };
}

/** One vendor call with its request, answer and meta kept in the ledger. The key is never part of what is written. */
async function call(ctx: Ctx, pack: Pack, label: string, json: boolean): Promise<{ text: string; dir: string }> {
  // the one place text leaves for a vendor: key values and this machine's paths are replaced here, whatever built the pack
  pack = { ...pack, system: ctx.ledger.redact(pack.system), user: ctx.ledger.redact(pack.user) };
  const dir = ctx.ledger.callDir(label);
  ctx.ledger.writeText(join(dir, 'system.txt'), pack.system);
  ctx.ledger.writeText(join(dir, 'user.txt'), pack.user);
  const role = ctx.cfg.roles[pack.role];
  const meta: Record<string, unknown> = { role: pack.role, provider: role.provider, requestedModel: role.model, estimatedTokens: pack.tokens, files: pack.files, warning: pack.warning, requestHash: sha256(pack.system + '\n' + pack.user) };
  try {
    const reply = await chat(ctx.cfg, { role: pack.role, system: pack.system, user: pack.user, json }, { env: ctx.env });
    ctx.ledger.writeText(join(dir, 'answer.txt'), reply.text);
    ctx.ledger.writeJson(join(dir, 'meta.json'), { ...meta, echoedModel: reply.model, finish: reply.finish, usage: reply.usage ?? null, attempts: reply.attempts, ms: reply.ms, status: reply.status });
    ctx.ledger.log('call', { dir, role: pack.role, echoedModel: reply.model, usage: reply.usage ?? null, ms: reply.ms });
    return { text: reply.text, dir };
  } catch (e) {
    const err = e instanceof ProviderError ? { kind: e.kind, status: e.status ?? null, message: e.message } : { kind: 'unexpected', message: e instanceof Error ? e.message : String(e) };
    ctx.ledger.writeJson(join(dir, 'meta.json'), { ...meta, error: err });
    ctx.ledger.log('call failed', { dir, ...err });
    throw e;
  }
}

const providerLine = (e: unknown): string => oneLine(e instanceof ProviderError ? `${e.provider} ${e.kind}${e.status ? ` (${e.status})` : ''}: ${e.message}` : e instanceof Error ? e.message : String(e), 400);

const isProbeFile = (file: string): boolean => file.startsWith('tests/zz_relay_');
/** the relay's own outcomes (a file that did not load, a run with no report) are named in brackets; a real test is not */
const synthetic = (t: TestOutcome): boolean => t.file.startsWith('(') || t.id.slice(t.file.length + 3).startsWith('(');

/**
 * A named file in which no test passed and none failed proves nothing: every test in it was skipped, or it holds none. That is
 * a failure of its own, so that a gate cannot be green on a file that asserted nothing.
 */
function markVacuous(result: GateResult, files: string[]): void {
  for (const f of files) {
    const mine = result.tests.filter((t) => t.file === f);
    if (mine.length === 0 || mine.some((t) => t.state !== 'skipped')) continue;
    result.tests.push({ id: `${f} > (no test in this file passed)`, file: f, state: 'fail', message: `Every test in ${f} was skipped, so the file proved nothing.` });
  }
}

/** Why a baseline cannot serve as one, or null. Whatever the baseline could not settle would be forgiven for the whole run. */
function baselineUnsettled(result: GateResult): string | null {
  if (result.timedOut || result.typecheck === 'timeout') return 'the time limit ended it';
  const slow = result.tests.filter((t) => t.state === 'timeout').map((t) => t.id);
  if (slow.length) return `these tests timed out at the base commit: ${slow.slice(0, 5).join('; ')}`;
  const tool = result.tests.filter((t) => t.file.startsWith('(')).map((t) => t.id);
  if (tool.length) return `vitest gave no usable result at the base commit (${tool.join('; ')}); read its output, and if it did not start at all, run init again`;
  const unrun = result.tests.filter((t) => t.id.endsWith('> (did not run)')).map((t) => t.file);
  if (unrun.length) return `vitest ran nothing from ${unrun.join(', ')} at the base commit`;
  return null;
}

/**
 * The gate at the base commit, which every later gate is judged against. After an amendment the clone is ahead of the base, so
 * the step visits the base commit and comes back; it is taken afresh then, because the amended order may name other tests.
 */
export async function baselineStep(ctx: Ctx): Promise<StepResult> {
  const state = ctx.ledger.loadState();
  const order = loadOrder(ctx, state);
  const c = clone(ctx);
  const before = strays(ctx, state);
  if (before.length) return stick(ctx, state, `the clone is not as the relay left it: ${before.join('; ')}`, 'log.jsonl');
  const outDir = ctx.ledger.file('gate', 'baseline');
  rmSync(outDir, { recursive: true, force: true });
  const away = state.head !== state.base;
  let result: GateResult;
  try {
    if (away) git(c, ['checkout', '-q', '--detach', state.base]);
    const read = readClone(ctx);
    const tests = order.tests.filter((t) => read(t) !== null);
    result = await runGate({ clone: c, toolsRoot: ctx.ledger.paths.home, tests, typecheck: order.typecheck, timeoutMs: ctx.cfg.limits.gateTimeoutMs, maxWorkers: ctx.cfg.limits.gateMaxWorkers, outDir, env: ctx.env });
    markVacuous(result, tests);
  } finally {
    if (away) git(c, ['checkout', '-q', '-f', state.branch]);
  }
  ctx.ledger.writeJson(join('gate', 'baseline', 'result.json'), result);
  ctx.ledger.scrub(outDir);
  const left = strays(ctx, state);
  if (left.length) return stick(ctx, state, `the baseline gate left the clone changed: ${left.join('; ')}`, join(outDir, 'result.json'));
  const unsettled = baselineUnsettled(result);
  if (unsettled) return stick(ctx, state, `the baseline could not be taken: ${unsettled}. Nothing can be judged against it; deal with the cause, then retry`, join(outDir, 'result.json'));
  const failing = result.tests.filter((t) => t.state === 'fail').length;
  state.baselineDone = true;
  ctx.ledger.saveState(state);
  ctx.ledger.log('baseline', { typecheck: result.typecheck, tests: result.tests.length, failing });
  const note = result.typecheck === 'fail' ? ' The base commit does not typecheck: type errors cannot be held against the change.' : '';
  return { ok: true, line: `baseline at ${state.base.slice(0, 8)}: typecheck ${result.typecheck}, ${result.tests.length} tests, ${failing} already failing.${note}` };
}

function feedbackText(ctx: Ctx, state: RunState, source: Feedback): { text: string | null; unlock: string[] } {
  if (source === 'none') return { text: null, unlock: [] };
  if (source === 'screen') return { text: `A reader refused the code before it was run:\n\n${state.screenReject?.note ?? ''}`, unlock: state.unlocked };
  if (source === 'gate') {
    const g = ctx.ledger.readJson<{ result: GateResult; verdict: GateVerdict }>(state.gate!.file);
    return { text: renderGateFeedback(g.verdict, g.result.typecheckOutput), unlock: state.unlocked };
  }
  const n = Number(source.slice('verdicts:'.length));
  const verdicts = loadVerdicts(ctx, n);
  const outputs: Record<string, string> = {};
  for (const v of verdicts) if (ctx.ledger.exists('probes', v.id, 'output.txt')) outputs[v.id] = ctx.ledger.readText(join('probes', v.id, 'output.txt'));
  const unlock = verdicts.filter((v) => v.action === 'fix').flatMap((v) => v.unlockTests ?? []);
  return { text: renderFeedback(loadFindings(ctx, n), verdicts, outputs), unlock };
}

/**
 * Ask the writer, parse, plan, scan, and only then write and commit. Nothing reaches the disk unless every block passed, and no
 * counter moves unless a commit was made: an answer that changes nothing is not a round.
 */
export async function writeStep(ctx: Ctx, source: Feedback): Promise<StepResult> {
  const state = ctx.ledger.loadState();
  const order = loadOrder(ctx, state);
  const round = state.writes + 1;
  const dir = join('writes', String(round));
  const c = clone(ctx);
  // a stray file would make the commit fail after the writer has been paid for; find it first
  const before = strays(ctx, state);
  if (before.length) return stick(ctx, state, `the clone is not as the relay left it, so the writer was not asked: ${before.join('; ')}`, 'log.jsonl');
  const tracked = trackedFiles(c);
  const fb = feedbackText(ctx, state, source);
  ctx.ledger.writeText(join(dir, 'feedback.md'), fb.text ?? '(first attempt: no feedback)');
  // a file the writer created in an earlier round exists now: from then on it is edited like any other, never created again
  const read = readClone(ctx);
  const made = order.create.filter((p) => read(p) !== null);
  // Everything sent to a vendor has this machine's paths and key values replaced. In a file the writer is to edit that would
  // show it text the file does not hold: its SEARCH could never match, and its REPLACE would write the placeholder.
  for (const p of [...order.edit, ...made]) {
    const body = read(p);
    if (body !== null && ctx.ledger.redact(body) !== body) {
      return stick(ctx, state, `${p} holds one of this machine's own paths (or a key value), which is replaced in whatever is sent to a vendor, so the writer cannot edit that file; take it out of the work order and edit it as the orchestrator`, join(dir, 'feedback.md'));
    }
  }
  const policy = buildPolicy({ edit: [...order.edit, ...made], create: order.create.filter((p) => !made.includes(p)) }, Object.keys(state.lockedTests), fb.unlock);
  const store = diskStore(c);
  const input = { cfg: ctx.cfg, order, tracked, read, rules: prompt(ctx, 'writer_rules.md') };
  let repair = '';
  for (let turn = 0; turn <= ctx.cfg.limits.repairTurns; turn++) {
    let pack: Pack;
    try {
      pack = writerPack(input, fb.text);
    } catch (e) {
      if (e instanceof PackError) return stick(ctx, state, `the writer's pack cannot be built: ${e.message}`, ctx.ledger.file(dir, 'feedback.md'));
      throw e;
    }
    if (repair) pack = { ...pack, user: `${pack.user}\n${repair}` };
    let answer: { text: string; dir: string };
    try {
      answer = await call(ctx, pack, `writer-w${round}t${turn}`, false);
    } catch (e) {
      return stick(ctx, state, `the writer call failed: ${providerLine(e)}`, ctx.ledger.file('log.jsonl'));
    }
    const again = (why: string): void => {
      repair = `# YOUR PREVIOUS ANSWER WAS NOT APPLIED\nNothing was written. Your previous answer is below, then what was wrong with it.\n\n===== BEGIN PREVIOUS ANSWER =====\n${answer.text}\n===== END PREVIOUS ANSWER =====\n\n${why}\n`;
      ctx.ledger.writeText(join(answer.dir, 'refused.txt'), why);
    };
    const parsed = parseEdits(answer.text);
    if (!parsed.ok) {
      again(`${parsed.error}\n\nSend ALL your blocks again in the format described, ending with END-OF-EDITS blocks=<number>.`);
      continue;
    }
    if (parsed.blocked !== null) {
      ctx.ledger.writeText(join(dir, 'blocked.txt'), parsed.blocked);
      return stick(ctx, state, 'the writer says it cannot do the work from what it was given (see the file); amend the work order or finish the run as failed', ctx.ledger.file(dir, 'blocked.txt'));
    }
    const plan = planEdits(parsed.blocks, policy, store);
    if (!plan.ok) {
      again(plan.repairMessage);
      continue;
    }
    const issues = plan.files.flatMap((f) => scanSource(f.path, f.after, order.allowImports[f.path] ?? []));
    if (issues.length) {
      ctx.ledger.writeJson(join(dir, `scan-t${turn}.json`), issues);
      again(`These are not allowed in this change (the code will be run on the owner's machine):\n${issues.map((i) => `- ${i.path}:${i.line}: ${i.what}`).join('\n')}\nWrite it without them. If the work truly needs one, send no blocks and say so after BLOCKED:.`);
      continue;
    }
    // every block passed: write, then commit, with a marker so a death in between can be undone
    const paths = plan.files.map((f) => f.path);
    const half = { tracked: plan.files.filter((f) => !f.created).map((f) => f.path), created: plan.files.filter((f) => f.created).map((f) => f.path) };
    ctx.ledger.writeJson('applying.json', half);
    ctx.ledger.writeText(join(dir, 'notes.txt'), parsed.notes);
    let commit: { sha: string; committed: boolean };
    try {
      writePlanned(c, plan.files);
      commit = commitPaths(c, paths, `relay: write ${round} (${order.slug})`);
    } catch (e) {
      // the files may be written and the commit not made (or made without a file git ignores): put the clone back, so that a
      // retry shows the writer the files it was shown this time
      settleClone(ctx, state, half);
      rmSync(ctx.ledger.file('applying.json'), { force: true });
      return stick(ctx, state, `the writer's edit could not be committed and was undone: ${e instanceof Error ? e.message : String(e)}`, join(dir, 'notes.txt'));
    }
    rmSync(ctx.ledger.file('applying.json'), { force: true });
    ctx.ledger.writeJson(join(dir, 'apply.json'), { turn, sha: commit.sha, committed: commit.committed, files: plan.files.map((f) => ({ path: f.path, created: f.created, tiers: f.tiers })) });
    if (!commit.committed) {
      // No counter has moved: the same request is still due, and a review's fix is not taken as made.
      return stick(ctx, state, 'the writer answered, but its blocks left every file unchanged, so nothing was written. Read its notes: retry asks it again as before, an amended work order tells it more', join(dir, 'notes.txt'));
    }
    state.head = commit.sha;
    state.writes = round;
    if (source === 'gate' || source === 'screen') state.gateFixRounds += 1;
    if (source.startsWith('verdicts:')) {
      const rec = state.reviews.find((r) => r.n === Number(source.slice('verdicts:'.length)));
      if (rec) rec.fixRounds += 1;
      state.unlocked = fb.unlock;
      state.gateFixRounds = 0;
    }
    state.screenReject = undefined;
    ctx.ledger.saveState(state);
    ctx.ledger.log('write', { round, sha: commit.sha, files: paths.length, turn, loose: plan.files.flatMap((f) => f.tiers).filter((t) => t > 0).length });
    return { ok: true, line: `write ${round}: ${paths.length} file(s) at ${commit.sha.slice(0, 8)} after ${turn} repair turn(s)` };
  }
  return stick(ctx, state, `the writer's answer could not be applied after ${ctx.cfg.limits.repairTurns} repair turns`, ctx.ledger.file('calls'));
}

/** the files tsc reports errors in, as it prints them: "path(line,col): error TS1234: ..." */
function typeErrorFiles(output: string): string[] {
  const files = new Set<string>();
  for (const m of output.matchAll(/^(.+?)\(\d+,\d+\): error TS\d+/gm)) files.add(m[1].replace(/\\/g, '/'));
  return [...files];
}

/** tsc and the named tests, judged against the baseline; confirmed probes ride along once their fix has been asked for. */
export async function gateStep(ctx: Ctx): Promise<StepResult> {
  const state = ctx.ledger.loadState();
  const order = loadOrder(ctx, state);
  const read = readClone(ctx);
  const c = clone(ctx);
  const before = strays(ctx, state);
  if (before.length) return stick(ctx, state, `the clone is not as the relay left it, so the gate did not run: ${before.join('; ')}`, 'log.jsonl');
  const label = `g${state.steps}`;
  const outDir = ctx.ledger.file('gate', label);
  const probes = standingProbes(ctx, state).map((p) => ({ ...p, name: probeName(p.id) }));
  const named = order.tests.filter((t) => read(t) !== null);
  const missing = order.tests.filter((t) => !named.includes(t));
  const placed: string[] = [];
  let result: GateResult;
  try {
    for (const p of probes) {
      const abs = resolveInside(c, p.name);
      mkdirSync(dirname(abs), { recursive: true });
      copyFileSync(p.file, abs);
      placed.push(abs);
    }
    result = await runGate({ clone: c, toolsRoot: ctx.ledger.paths.home, tests: [...named, ...probes.map((p) => p.name)], typecheck: order.typecheck, timeoutMs: ctx.cfg.limits.gateTimeoutMs, maxWorkers: ctx.cfg.limits.gateMaxWorkers, outDir, env: ctx.env });
  } finally {
    for (const abs of placed) rmSync(abs, { force: true });
  }
  // A test the order names and nobody wrote is a failure of the change, not a file to leave out: left out, a change whose
  // contract test was never written would pass the gate with no test at all.
  for (const t of missing) {
    result.tests.push({ id: `${t} > (named by the work order, not written)`, file: t, state: 'fail', message: `The work order names ${t} as a test the gate runs, and that file does not exist. Write it as the work order describes.` });
  }
  markVacuous(result, named);
  const baseline = ctx.ledger.readJson<GateResult>(join('gate', 'baseline', 'result.json'));
  const verdict = judge(baseline, result);
  const file = join('gate', label, 'verdict.json');
  ctx.ledger.writeJson(file, { sha: state.head, result, verdict, summary: gateSummary(result, verdict) });
  ctx.ledger.scrub(outDir);
  const left = strays(ctx, state);
  if (left.length) return stick(ctx, state, `running the gate left the clone changed in ways the writer's commit does not account for: ${left.join('; ')}. Read them before anything else is done.`, ctx.ledger.file(file));
  // A probe is the orchestrator's file. When the only type errors are in probes, the writer cannot see or repair them.
  if (verdict.typecheckBroken) {
    const files = typeErrorFiles(result.typecheckOutput);
    if (files.length > 0 && files.every(isProbeFile)) {
      return stick(ctx, state, `the typecheck fails only in a standing probe (${files.join(', ')}), which is the adjudicator's file, not the writer's: correct the probe and register it again with the probe command, then retry`, ctx.ledger.file(file));
    }
  }
  state.gate = { sha: state.head, ok: verdict.ok, file };
  if (verdict.ok) {
    // Freeze the writer's tests as the gate first passes with them, so that a later round cannot turn a failing gate green by
    // weakening one. A test first written in a later round is frozen at the first green gate that holds it.
    if (!state.firstGreenSha) state.firstGreenSha = state.head;
    const lockedAt = (state.lockedAt ??= {});
    for (const t of [...order.edit, ...order.create].filter((p) => p.toLowerCase().startsWith('tests/'))) {
      if (t in state.lockedTests) continue;
      const text = read(t);
      if (text === null) continue;
      state.lockedTests[t] = sha256(text);
      lockedAt[t] = state.head;
    }
  }
  ctx.ledger.saveState(state);
  ctx.ledger.log('gate', { sha: state.head, ok: verdict.ok, newFailures: verdict.newFailures.length, inconclusive: verdict.inconclusive.length, typecheckBroken: verdict.typecheckBroken });
  return { ok: verdict.ok, line: `gate at ${state.head.slice(0, 8)}: ${verdict.ok ? 'passed' : 'failed'} (${verdict.newFailures.length} new failures, ${verdict.inconclusive.length} inconclusive${verdict.typecheckBroken ? ', typecheck broken' : ''})` };
}

/**
 * The gate's summary as a reviewer is shown it: without the standing probes. A probe's file name says that an earlier review
 * had a confirmed finding, and the second reviewer is to judge the change without knowing what the first one found.
 */
function gateSummaryForReviewer(ctx: Ctx, state: RunState): string {
  if (!state.gate) return '(no gate recorded)';
  const g = ctx.ledger.readJson<{ result: GateResult; verdict: GateVerdict }>(state.gate.file);
  const own = (t: { file: string }): boolean => !isProbeFile(t.file);
  const verdict: GateVerdict = { ...g.verdict, newFailures: g.verdict.newFailures.filter(own), inconclusive: g.verdict.inconclusive.filter(own), alreadyFailing: g.verdict.alreadyFailing.filter((id) => !isProbeFile(id)) };
  return gateSummary({ ...g.result, tests: g.result.tests.filter(own) }, verdict);
}

export function buildReviewPack(ctx: Ctx, state: RunState, n: number): Pack {
  const role = ctx.cfg.reviewers[n - 1] as 'reviewer1' | 'reviewer2';
  return reviewerPack({ cfg: ctx.cfg, order: loadOrder(ctx, state), tracked: trackedFiles(clone(ctx)), read: readClone(ctx), rules: prompt(ctx, 'reviewer_rules.md'), role, diff: diffText(clone(ctx), state.base), gateSummary: gateSummaryForReviewer(ctx, state) });
}

/** Turn a reviewer's answer into findings on record. Shared by the vendor call and by an answer the owner imported. */
export function recordReview(ctx: Ctx, state: RunState, n: number, answer: string, source: { role: RoleName; via: string }): { ok: true; rec: ReviewRecord } | { ok: false; error: string } {
  const parsed = parseFindings(answer, { idPrefix: `R${n}`, max: ctx.cfg.limits.maxFindings });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const findings = triage(parsed.review, { read: readClone(ctx), ranges: diffRanges(diffText(clone(ctx), state.base)) });
  ctx.ledger.writeJson(join(reviewDir(n), 'findings.json'), { review: n, role: source.role, via: source.via, sha: state.head, findings, dropped: parsed.review.dropped, needFiles: parsed.review.needFiles, notes: parsed.review.notes });
  const none = findings.length === 0;
  const rec: ReviewRecord = { n, role: source.role, status: 'done', sha: state.head, findings: findings.length, dropped: parsed.review.dropped, adjudicated: none, fixRounds: 0, settled: none };
  state.reviews = [...state.reviews.filter((r) => r.n !== n), rec].sort((a, b) => a.n - b.n);
  ctx.ledger.saveState(state);
  ctx.ledger.log('review', { n, role: source.role, via: source.via, findings: findings.length, dropped: parsed.review.dropped });
  return { ok: true, rec };
}

export async function reviewStep(ctx: Ctx, n: number): Promise<StepResult> {
  const state = ctx.ledger.loadState();
  const role = ctx.cfg.reviewers[n - 1];
  let pack: Pack;
  try {
    pack = buildReviewPack(ctx, state, n);
  } catch (e) {
    if (e instanceof PackError) return stick(ctx, state, `reviewer ${n}'s pack cannot be built: ${e.message}`, ctx.ledger.file('log.jsonl'));
    throw e;
  }
  let extra = '';
  let lastError = '';
  for (let turn = 0; turn < 2; turn++) {
    let answer: { text: string; dir: string };
    try {
      answer = await call(ctx, extra ? { ...pack, user: `${pack.user}\n${extra}` } : pack, `${role}-r${n}t${turn}`, true);
    } catch (e) {
      return stick(ctx, state, `reviewer ${n} (${role}) could not be reached: ${providerLine(e)}. Retry, import an answer by hand, or skip this reviewer.`, ctx.ledger.file('log.jsonl'));
    }
    const done = recordReview(ctx, state, n, answer.text, { role, via: 'api' });
    if (done.ok) return { ok: true, line: `review ${n} (${role}): ${done.rec.findings} finding(s), ${done.rec.dropped} dropped` };
    lastError = done.error;
    extra = `YOUR PREVIOUS ANSWER WAS NOT VALID: ${done.error}\nAnswer again with the JSON object only, in the format described.`;
  }
  return stick(ctx, state, `reviewer ${n} (${role}) did not answer in the required format twice: ${lastError}`, ctx.ledger.file('calls'));
}

export async function runStep(ctx: Ctx, step: Step): Promise<StepResult> {
  if (step.kind === 'baseline') return baselineStep(ctx);
  if (step.kind === 'write') return writeStep(ctx, step.feedback);
  if (step.kind === 'gate') return gateStep(ctx);
  return reviewStep(ctx, step.n);
}

/** A step's process died without a result: undo a half-written apply and leave the run for the orchestrator to look at. */
export function recoverDeadStep(ctx: Ctx, state: RunState): void {
  const half = ctx.ledger.exists('applying.json') ? ctx.ledger.readJson<{ tracked: string[]; created: string[] }>('applying.json') : undefined;
  let put = 'the clone was put back to its last recorded commit';
  try {
    settleClone(ctx, state, half);
    rmSync(ctx.ledger.file('applying.json'), { force: true });
  } catch (e) {
    put = `the clone could NOT be put back (${e instanceof Error ? e.message : String(e)})`;
  }
  const key = state.step?.key ?? 'step';
  state.step = undefined;
  state.stuck = stuckAt(ctx, `the ${key} step ended without a result (killed, or the machine restarted); ${put}`, join('steps', `${key}.log`));
  ctx.ledger.saveState(state);
  ctx.ledger.scrub(ctx.ledger.file('steps'));
  ctx.ledger.log('step died', { key });
}

/** After a step threw: the clone may be detached at the base commit or hold a half-made write. */
export function repairAfterThrow(ctx: Ctx, state: RunState): void {
  const half = ctx.ledger.exists('applying.json') ? ctx.ledger.readJson<{ tracked: string[]; created: string[] }>('applying.json') : undefined;
  settleClone(ctx, state, half);
  rmSync(ctx.ledger.file('applying.json'), { force: true });
}

export const stepArgs = (step: Step): string[] => (step.kind === 'write' ? ['write', step.feedback] : step.kind === 'review' ? ['review', String(step.n)] : [step.kind]);

export function stepFromArgs(args: string[]): Step {
  const [kind, arg] = args;
  if (kind === 'baseline' || kind === 'gate') return { kind };
  if (kind === 'write' && (arg === 'none' || arg === 'gate' || arg === 'screen' || /^verdicts:\d+$/.test(arg ?? ''))) return { kind, feedback: arg as Feedback };
  if (kind === 'review' && /^\d+$/.test(arg ?? '')) return { kind, n: Number(arg) };
  throw new Error(`not a step: ${args.join(' ')}`);
}

