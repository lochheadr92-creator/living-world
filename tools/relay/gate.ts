// The relay's gate: it runs tsc and vitest on code an external model wrote, and judges the result against a baseline taken at the
// base commit, so that only what the change broke counts against it. The code runs as the owner, with no sandbox, so the gate does
// three things to limit the harm: it runs the tools with a stripped environment (no API key, no NODE_OPTIONS, nothing the owner's
// shell happens to hold), it puts one wall-clock limit on the whole gate and kills the entire process tree when it passes, and the
// orchestrator only calls it after other modules have scanned and read the code.
//
// A test that failed only by timing out is run once more alone, because parallel workers on a busy machine make slow tests miss
// their limit; one that still times out is "inconclusive" and is never counted as a reproduction of anything.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { relativeTo } from './paths';
import type { GateResult, GateVerdict, TestOutcome } from './types';

const KEEP_ENV = [
  'PATH', 'PATHEXT', 'SystemRoot', 'windir', 'ComSpec', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH',
  'APPDATA', 'LOCALAPPDATA', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE', 'OS', 'LANG', 'LC_ALL', 'TZ',
];
const KEEP_LOWER = new Set(KEEP_ENV.map((n) => n.toLowerCase()));

/** The only environment executed code gets: the names the tools need to find themselves and a temp directory, never a secret. */
export function safeEnv(env: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined && KEEP_LOWER.has(name.toLowerCase())) out[name] = value;
  }
  out.CI = '1';
  out.NO_COLOR = '1';
  out.FORCE_COLOR = '0';
  return out;
}

export interface ToolRun {
  /** the exit code; null when a signal ended it or it could not start */
  status: number | null;
  output: string;
  timedOut: boolean;
  ms: number;
}

const OUTPUT_KEEP = 2 * 1024 * 1024;
/** how long the pipes may stay open after the tool itself has gone, or after it was killed, before the run is closed regardless */
const CLOSE_GRACE_MS = 2_000;

/** Ends the process and everything it started. A process group on POSIX (the tool is started detached), taskkill /T on Windows. */
function killGroup(pid: number): void {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    /* the group is already empty */
  }
}

function killTree(child: ChildProcess): void {
  const pid = child.pid;
  if (pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/**
 * Runs `node <argv>` and collects stdout and stderr as one stream, keeping the last 2 MB. When `timeoutMs` passes, the whole
 * process tree is killed and the result says so. Never rejects: a tool that cannot start comes back with status null.
 */
export function runTool(argv: string[], opts: { cwd: string; timeoutMs: number; env: Record<string, string>; now?: () => number }): Promise<ToolRun> {
  const now = opts.now ?? Date.now;
  const started = now();
  return new Promise<ToolRun>((settle) => {
    let output = '';
    let timedOut = false;
    let done = false;
    let timer: NodeJS.Timeout | undefined;
    let grace: NodeJS.Timeout | undefined;
    let child: ChildProcess;

    const finish = (status: number | null): void => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      if (grace) clearTimeout(grace);
      settle({ status, output, timedOut, ms: now() - started });
    };
    const take = (chunk: string): void => {
      output += chunk;
      if (output.length > OUTPUT_KEEP * 2) output = output.slice(-OUTPUT_KEEP);
    };

    try {
      child = spawn(process.execPath, argv, {
        cwd: opts.cwd,
        env: opts.env,
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });
    } catch (e) {
      output = `could not start the tool: ${e instanceof Error ? e.message : String(e)}`;
      finish(null);
      return;
    }
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', take);
    child.stderr?.on('data', take);
    child.on('error', (e) => {
      take(`\ncould not run the tool: ${e.message}\n`);
      finish(null);
    });
    child.on('exit', (code) => {
      // a child the tool left behind with its stdio ignored holds no pipe, so only the group signal reaches it
      if (process.platform !== 'win32' && child.pid !== undefined) killGroup(child.pid);
      // a grandchild that kept the pipes open must not hold the gate: close the run after a short grace, and end the group
      grace = setTimeout(() => {
        killTree(child);
        finish(timedOut ? null : code);
      }, CLOSE_GRACE_MS);
    });
    child.on('close', (code) => {
      if (output.length > OUTPUT_KEEP) output = output.slice(-OUTPUT_KEEP);
      finish(timedOut ? null : code);
    });
    timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
      if (!grace) grace = setTimeout(() => finish(null), CLOSE_GRACE_MS);
    }, Math.max(0, opts.timeoutMs));
  });
}

export interface GateOptions {
  clone: string;
  /** the directory that holds node_modules */
  toolsRoot: string;
  /** vitest files to run */
  tests: string[];
  typecheck: boolean;
  /** one wall-clock limit for the whole gate */
  timeoutMs: number;
  maxWorkers: number;
  /** where every tool's full output and the vitest reports are written; made when missing */
  outDir: string;
  env?: Record<string, string | undefined>;
  /** a clock, for tests */
  now?: () => number;
}

const MESSAGE_KEEP = 4_000;
const TIMEOUT_MESSAGE = /Test timed out in \d+ms/;

function fail(file: string, name: string, message: string): TestOutcome {
  return { id: `${file} > ${name}`, file, state: 'fail', message: message.slice(0, MESSAGE_KEEP) };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

/** the file's path as the clone names it: relative, forward slashes; vitest writes absolute paths, sometimes through real links */
function fileInClone(clone: string, name: string): string {
  let rel = relativeTo(clone, name);
  if (rel.startsWith('..')) {
    try {
      const alt = relativeTo(realpathSync(clone), name);
      if (!alt.startsWith('..')) rel = alt;
    } catch {
      /* the clone is gone; keep the first spelling */
    }
  }
  return rel;
}

/**
 * Turns vitest's JSON report into outcomes. Throws when the object is not a report at all. A file that failed with no test
 * results did not load; a file that failed although every test in it passed (a hook or an unhandled error) is a failure of its
 * own, so that it cannot hide behind green tests.
 */
export function readVitestReport(json: unknown, clone: string): TestOutcome[] {
  return readVitestReportFull(json, clone).outcomes;
}

/** The same reading, and the report's own top-level success flag (undefined when the report does not carry one). */
export function readVitestReportFull(json: unknown, clone: string): { outcomes: TestOutcome[]; success: boolean | undefined } {
  if (!isRecord(json) || !Array.isArray(json.testResults)) throw new Error('not a vitest JSON report');
  const outcomes: TestOutcome[] = [];
  for (const entry of json.testResults) {
    if (!isRecord(entry) || typeof entry.name !== 'string') continue;
    const file = fileInClone(clone, entry.name);
    const fileMessage = typeof entry.message === 'string' ? entry.message : '';
    const results = Array.isArray(entry.assertionResults) ? entry.assertionResults : [];
    if (results.length === 0) {
      if (entry.status === 'failed') outcomes.push(fail(file, '(file did not load)', fileMessage));
      continue;
    }
    let anyFailed = false;
    for (const a of results) {
      if (!isRecord(a)) continue;
      const title = typeof a.title === 'string' ? a.title : '';
      const name = typeof a.fullName === 'string' && a.fullName !== '' ? a.fullName : [...strings(a.ancestorTitles), title].join(' ');
      const id = `${file} > ${name}`;
      switch (a.status) {
        case 'passed':
          outcomes.push({ id, file, state: 'pass', message: '' });
          break;
        case 'pending':
        case 'skipped':
        case 'todo':
          outcomes.push({ id, file, state: 'skipped', message: '' });
          break;
        case 'failed': {
          anyFailed = true;
          const messages = strings(a.failureMessages);
          const onlyTimeouts = messages.length > 0 && messages.every((m) => TIMEOUT_MESSAGE.test(m));
          outcomes.push({ id, file, state: onlyTimeouts ? 'timeout' : 'fail', message: messages.join('\n').slice(0, MESSAGE_KEEP) });
          break;
        }
        default:
          anyFailed = true;
          outcomes.push({ id, file, state: 'fail', message: `unknown test status: ${String(a.status)}` });
      }
    }
    // vitest leaves the message empty when the error sits on a suite (a describe-level hook), so the message cannot be the test
    if (entry.status === 'failed' && !anyFailed) {
      outcomes.push(fail(file, '(file-level failure)', fileMessage !== '' ? fileMessage : 'a hook or a suite in this file failed; see the vitest output'));
    }
  }
  return { outcomes, success: typeof json.success === 'boolean' ? json.success : undefined };
}

function noReport(run: ToolRun): TestOutcome {
  return {
    id: '(vitest) > (no report)',
    file: '(vitest)',
    state: run.timedOut ? 'timeout' : 'fail',
    message: run.output.slice(-MESSAGE_KEEP),
  };
}

function readReport(path: string, clone: string): { outcomes: TestOutcome[]; success: boolean | undefined } | null {
  try {
    return readVitestReportFull(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')), clone);
  } catch {
    return null;
  }
}

/** Runs the typecheck and the listed tests in the clone with the stripped environment, inside one time limit. */
export async function runGate(o: GateOptions): Promise<GateResult> {
  const now = o.now ?? Date.now;
  const started = now();
  const deadline = started + o.timeoutMs;
  const left = (): number => deadline - now();
  const outDir = resolve(o.outDir);
  mkdirSync(outDir, { recursive: true });
  const env = safeEnv(o.env ?? process.env);
  for (const t of o.tests) if (t.startsWith('-')) throw new Error(`a test path may not begin with a dash: ${JSON.stringify(t)}`);

  let timedOut = false;
  let typecheck: GateResult['typecheck'] = 'skipped';
  let typecheckOutput = '';
  let tests: TestOutcome[] = [];

  if (o.typecheck) {
    const tsc = join(o.toolsRoot, 'node_modules', 'typescript', 'bin', 'tsc');
    const run = await runTool([tsc, '--noEmit', '-p', o.clone], { cwd: o.clone, timeoutMs: left(), env, now });
    typecheckOutput = run.output;
    writeFileSync(join(outDir, 'typecheck.txt'), run.output);
    if (run.timedOut) {
      typecheck = 'timeout';
      timedOut = true;
    } else typecheck = run.status === 0 ? 'pass' : 'fail';
  }

  const vitest = join(o.toolsRoot, 'node_modules', 'vitest', 'vitest.mjs');
  const vitestRun = async (n: number, files: string[], workers: number): Promise<{ run: ToolRun; outcomes: TestOutcome[] | null; success: boolean | undefined }> => {
    const report = join(outDir, `vitest-${n}.json`);
    rmSync(report, { force: true });
    const argv = [vitest, 'run', ...files, '--reporter=json', `--outputFile=${report}`, `--maxWorkers=${workers}`];
    const run = await runTool(argv, { cwd: o.clone, timeoutMs: left(), env, now });
    writeFileSync(join(outDir, `vitest-${n}.txt`), run.output);
    if (run.timedOut) timedOut = true;
    const read = existsSync(report) ? readReport(report, o.clone) : null;
    return { run, outcomes: read === null ? null : read.outcomes, success: read === null ? undefined : read.success };
  };

  if (o.tests.length > 0) {
    if (timedOut || left() <= 0) {
      timedOut = true;
      tests = [{ id: '(vitest) > (not run)', file: '(vitest)', state: 'timeout', message: 'the time limit ended the gate before the tests started' }];
    } else {
      const first = await vitestRun(1, o.tests, o.maxWorkers);
      tests = first.outcomes === null ? [noReport(first.run)] : first.outcomes;
      if (first.outcomes !== null && first.outcomes.length === 0) {
        tests = [fail('(vitest)', '(no tests ran)', `no test results came back for: ${o.tests.join(', ')}`)];
      }

      // a test the order names that left no result was never run: misnamed for the include pattern, or excluded
      if (first.outcomes !== null && first.outcomes.length > 0) {
        const norm = (f: string): string => f.replace(/\\/g, '/').replace(/^\.\//, '');
        const ran = new Set(first.outcomes.map((t) => norm(t.file)));
        for (const entry of o.tests) {
          if (!ran.has(norm(entry))) {
            tests.push(fail(entry, '(did not run)', `vitest ran nothing from ${entry}: it is misnamed for the include pattern, or excluded`));
          }
        }
      }

      // vitest's own verdict: an unhandled error or a failed suite can leave every test green in the JSON
      const quiet = !tests.some((t) => t.state === 'fail' || t.state === 'timeout');
      if (!first.run.timedOut && quiet && (first.run.status !== 0 || first.success === false)) {
        tests.push(fail('(vitest)', '(run failed with no failing test)', first.run.output.slice(-MESSAGE_KEEP)));
      }

      // the second look: a test that only timed out gets one run alone, where nothing else competes for the machine
      const slow = [...new Set(tests.filter((t) => t.state === 'timeout' && !t.file.startsWith('(')).map((t) => t.file))];
      if (slow.length > 0 && !timedOut && left() > 0) {
        const second = await vitestRun(2, slow, 1);
        if (second.outcomes !== null) {
          const again = new Map(second.outcomes.map((t) => [t.id, t]));
          tests = tests.map((t) => {
            const redo = again.get(t.id);
            if (t.state !== 'timeout' || !redo || redo.state === 'skipped') return t;
            return redo;
          });
        }
      }
    }
  }

  return { typecheck, typecheckOutput, tests, timedOut, ms: now() - started };
}

const failing = (t: TestOutcome): boolean => t.state === 'fail' || t.state === 'timeout';

/** Compares a gate with the baseline: only a typecheck the change broke and tests it failed or could not settle count. */
export function judge(baseline: GateResult, now: GateResult): GateVerdict {
  // a typecheck that timed out now says nothing about the change: now.timedOut already makes the verdict not ok
  const typecheckBroken = (baseline.typecheck === 'pass' || baseline.typecheck === 'skipped') && now.typecheck === 'fail';
  const before = new Map(baseline.tests.map((t) => [t.id, t]));
  const alreadyFailing: string[] = [];
  const inconclusive: TestOutcome[] = [];
  const newFailures: TestOutcome[] = [];
  for (const t of now.tests) {
    const was = before.get(t.id);
    // only a base that really failed excuses a test (a base that timed out never judged it), and a synthetic outcome never is excused
    if (failing(t) && was?.state === 'fail' && !t.file.startsWith('(')) alreadyFailing.push(t.id);
    else if (t.state === 'timeout') inconclusive.push(t);
    else if (t.state === 'fail') newFailures.push(t);
  }
  return {
    ok: !typecheckBroken && newFailures.length === 0 && inconclusive.length === 0 && !now.timedOut,
    typecheckBroken,
    newFailures,
    inconclusive,
    alreadyFailing,
  };
}

const NAMES_SHOWN = 10;

function nameList(label: string, names: string[]): string {
  if (names.length === 0) return '';
  const shown = names.slice(0, NAMES_SHOWN).join('; ');
  return `${label}: ${shown}${names.length > NAMES_SHOWN ? `; and ${names.length - NAMES_SHOWN} more` : ''}\n`;
}

/** A few plain lines for the ledger and for reviewers. Names only: no test message, no output, no file contents. */
export function gateSummary(result: GateResult, verdict: GateVerdict): string {
  const count = (s: TestOutcome['state']): number => result.tests.filter((t) => t.state === s).length;
  const files = [...new Set(result.tests.map((t) => t.file))].filter((f) => !f.startsWith('('));
  let text = `gate: ${verdict.ok ? 'ok' : 'not ok'}${result.timedOut ? ' (the time limit ended it)' : ''}\n`;
  text += `typecheck: ${result.typecheck}${verdict.typecheckBroken ? ' (the change broke it)' : ''}\n`;
  text += `tests: ${count('pass')} passed, ${verdict.newFailures.length} new failures, ${verdict.inconclusive.length} inconclusive, ${verdict.alreadyFailing.length} already failing, ${count('skipped')} skipped\n`;
  text += nameList('new failures', verdict.newFailures.map((t) => t.id));
  text += nameList('inconclusive', verdict.inconclusive.map((t) => t.id));
  text += nameList('already failing', verdict.alreadyFailing);
  text += files.length > 0 ? nameList('files run', files) : 'files run: none\n';
  return text;
}
