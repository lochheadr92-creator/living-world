// A run's record on disk. Each run has one folder under <home>/runs/<id>/, outside the repository: `wt` is the run's own clone
// and `ledger` holds everything else: the work order, the run's state, every request and answer, what was applied and with which
// match tier, gate output, findings, probes and verdicts. The state file is the single owner of "where is this run"; no agent's
// retelling of a command's output is ever relied on, and a command that finds the state not ready for it refuses.
//
// Everything written here passes through one redactor first: API key values, and the machine's own paths (which carry the
// Windows account name), are replaced before the text can reach a file that might later be shown to a vendor or committed.
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { RunState } from './types';

export interface RunPaths {
  home: string;
  /** <home>/runs/<id> */
  dir: string;
  /** the run's clone */
  clone: string;
  ledger: string;
}

const RUN_ID = /^[a-z0-9-]{1,60}$/;

/** RELAY_HOME, or a folder beside the checkout. Never under the user profile by default: paths there carry the account name. */
export function relayHome(env: Record<string, string | undefined>, sharedRepo: string): string {
  const set = env.RELAY_HOME?.trim();
  return set ? resolve(set) : resolve(sharedRepo, '..', '_relay');
}

export function runPaths(home: string, id: string): RunPaths {
  if (!RUN_ID.test(id)) throw new Error(`not a run id: ${JSON.stringify(id)}`);
  const dir = join(home, 'runs', id);
  return { home, dir, clone: join(dir, 'wt'), ledger: join(dir, 'ledger') };
}

const two = (n: number): string => String(n).padStart(2, '0');

/** yyyymmdd-hhmmss-slug, from the local clock; made by the relay, never from task text */
export function newRunId(slug: string, now: Date): string {
  const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  return `${stamp}-${slug}`;
}

export const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

export type Redactor = (text: string) => string;

/** The places on this machine whose names must not travel: the run's clone, its home, the shared checkout, the user's profile. */
export function machinePaths(paths: RunPaths, shared: string): Array<{ from: string; to: string }> {
  return [
    { from: paths.clone, to: '<clone>' },
    { from: paths.ledger, to: '<ledger>' },
    { from: paths.home, to: '<home>' },
    { from: shared, to: '<shared>' },
    { from: homedir(), to: '<userhome>' },
  ];
}

/**
 * Text that came from a vendor, a model or a tool, made safe to print on one line and to keep in a state field: line breaks and
 * control characters become spaces and the length is bounded. A driver acts on the last line a command prints, so text of
 * unknown origin must never be able to start a line of its own.
 */
export function oneLine(text: string, max = 600): string {
  // eslint-disable-next-line no-control-regex
  const flat = text.replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)} ...` : flat;
}

export class Ledger {
  /**
   * Set in a step's own process to that step's key. A step that was given up for dead (its heartbeat stopped) and then wakes
   * must not write the state over whoever took the run on: with an owner set, saving is refused once the state on disk no longer
   * names this step.
   */
  owner: string | null = null;

  constructor(
    readonly paths: RunPaths,
    /** applied to everything written here, and by the driver to everything sent to a vendor */
    readonly redact: Redactor,
  ) {}

  /**
   * Files a tool wrote into the ledger by itself (vitest's report, compiler output) carry this machine's paths. Rewrite every
   * file under the folder through the redactor, so the rule "nothing in the ledger names the machine" has no exception.
   */
  scrub(dir: string): void {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        this.scrub(p);
        continue;
      }
      try {
        const text = readFileSync(p, 'utf8');
        const clean = this.redact(text);
        if (clean !== text) writeFileSync(p, clean, 'utf8');
      } catch {
        // a file another process still holds is scrubbed by the next call
      }
    }
  }

  file(...parts: string[]): string {
    return join(this.paths.ledger, ...parts);
  }

  exists(...parts: string[]): boolean {
    return existsSync(this.file(...parts));
  }

  /** text, redacted, written whole through a temporary file so a reader never sees half of it */
  writeText(rel: string, text: string): string {
    const target = this.file(rel);
    mkdirSync(dirname(target), { recursive: true });
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, this.redact(text), 'utf8');
    renameSync(tmp, target);
    return target;
  }

  writeJson(rel: string, value: unknown): string {
    return this.writeText(rel, `${JSON.stringify(value, null, 2)}\n`);
  }

  readText(rel: string): string {
    return readFileSync(this.file(rel), 'utf8');
  }

  readJson<T>(rel: string): T {
    return JSON.parse(this.readText(rel)) as T;
  }

  /** one line per event; the plain history of the run */
  log(event: string, detail?: unknown): void {
    mkdirSync(this.paths.ledger, { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), event, ...(detail === undefined ? {} : { detail }) });
    appendFileSync(this.file('log.jsonl'), `${this.redact(line)}\n`, 'utf8');
  }

  /** a fresh numbered folder for one vendor call: calls/003-writer-write */
  callDir(label: string): string {
    const root = this.file('calls');
    mkdirSync(root, { recursive: true });
    const n = readdirSync(root).length + 1;
    const rel = join('calls', `${String(n).padStart(3, '0')}-${label}`);
    mkdirSync(this.file(rel), { recursive: true });
    return rel;
  }

  loadState(): RunState {
    return this.readJson<RunState>('state.json');
  }

  saveState(state: RunState): void {
    if (this.owner !== null) {
      const onDisk = this.loadState();
      if (onDisk.step?.key !== this.owner) throw new Error(`step ${this.owner} no longer owns this run (it was given up as dead); nothing was saved`);
    }
    this.writeJson('state.json', state);
  }
}

export class Busy extends Error {}

/**
 * Runs `fn` while holding a lock file, so two commands that use a run's clone never overlap. The file holds the holder's process
 * id: a lock whose holder is gone, or that is older than `staleMs`, is taken over. Waits up to `waitMs`, then throws Busy.
 */
export async function withLock<T>(file: string, o: { waitMs: number; staleMs: number; sleep: (ms: number) => Promise<void> }, fn: () => Promise<T>): Promise<T> {
  mkdirSync(dirname(file), { recursive: true });
  const until = Date.now() + o.waitMs;
  for (;;) {
    try {
      const fd = openSync(file, 'wx');
      writeSync(fd, String(process.pid));
      closeSync(fd);
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
      let holder = NaN;
      let age = 0;
      try {
        holder = Number(readFileSync(file, 'utf8').trim());
        age = Date.now() - statSync(file).mtimeMs;
      } catch {
        continue; // released between the two calls
      }
      if (!Number.isInteger(holder) || !pidAlive(holder) || age > o.staleMs) {
        rmSync(file, { force: true });
        continue;
      }
      if (Date.now() >= until) throw new Busy(`another command is using this run's clone (process ${holder}); run this one again when it has ended`);
      await o.sleep(500);
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(file, { force: true });
  }
}

/** true while the lock file names a live process */
export function lockHeld(file: string): boolean {
  try {
    const holder = Number(readFileSync(file, 'utf8').trim());
    return Number.isInteger(holder) && pidAlive(holder);
  } catch {
    return false;
  }
}

/** true while a process with this id exists (signal 0 only asks) */
export function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function listRuns(home: string): string[] {
  const root = join(home, 'runs');
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((d) => RUN_ID.test(d) && existsSync(join(root, d, 'ledger', 'state.json')))
    .sort();
}
