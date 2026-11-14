// Tests for the model relay's git helpers (tools/relay/repo.ts) and its gate (tools/relay/gate.ts): the sparse clone, what counts as
// a change, committing only what was named, the diff text, undoing a half-written apply, fetching the finished branch back, the
// guarded delete of a run directory, the stripped environment, the reading of vitest's JSON report, the judgement against a
// baseline, and a small process runner. Everything runs in temporary directories that each test removes; nothing touches the
// network. The tests that start real tsc and vitest processes take tens of seconds and run only with RELAY_E2E=1.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { GateOptions, gateSummary, judge, readVitestReport, runGate, runTool, safeEnv } from '../tools/relay/gate';
import { RELAY_IDENT, changed, cloneSparse, commitPaths, diffText, fetchBranchInto, git, headSha, removeRunDir, repoRoot, resolveCommit, restore, trackedFiles } from '../tools/relay/repo';
import type { GateResult, TestOutcome } from '../tools/relay/types';

const REPO = fileURLToPath(new URL('..', import.meta.url));
const temps: string[] = [];

function tmp(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `relay-gate-${label}-`));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  while (temps.length > 0) rmSync(temps.pop() as string, { recursive: true, force: true, maxRetries: 5 });
});

function put(root: string, rel: string, text: string): void {
  const abs = join(root, ...rel.split('/'));
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

/** a shared checkout with a directory (evidence) that the sparse clone must not check out */
function makeShared(): { dir: string; base: string } {
  const dir = tmp('shared');
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Owner Name']);
  git(dir, ['config', 'user.email', 'owner@example.com']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'core.autocrlf', 'false']);
  put(dir, 'src/a.ts', 'export const a = 1;\n');
  put(dir, 'src/b.ts', 'export const b = 2;\n');
  put(dir, 'tests/b.ts', 'export const t = 3;\n');
  put(dir, 'evidence/e.txt', 'evidence\n');
  put(dir, 'root.txt', 'root\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'first']);
  return { dir, base: headSha(dir) };
}

function makeClone(autocrlf?: 'true' | 'false'): { shared: string; clone: string; base: string } {
  const { dir, base } = makeShared();
  const clone = join(tmp('clone'), 'wt');
  cloneSparse(dir, clone, base, 'relay-test', ['src', 'tests']);
  if (autocrlf) git(clone, ['config', 'core.autocrlf', autocrlf]);
  return { shared: dir, clone, base };
}

describe('cloneSparse', () => {
  it('makes a clone on the new branch at the base commit', () => {
    const { dir, base } = makeShared();
    const dest = join(tmp('clone'), 'wt');
    const head = cloneSparse(dir, dest, base, 'relay-test', ['src', 'tests']);
    expect(head).toBe(base);
    expect(headSha(dest)).toBe(base);
    expect(git(dest, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()).toBe('relay-test');
  });

  it('leaves no remote, so nothing in the clone can reach the shared checkout', () => {
    const { dir, base } = makeShared();
    const dest = join(tmp('clone'), 'wt');
    cloneSparse(dir, dest, base, 'relay-test', ['src']);
    expect(git(dest, ['remote']).stdout.trim()).toBe('');
    expect(readFileSync(join(dest, '.git', 'config'), 'utf8')).not.toContain(dir);
  });

  it('checks out the cone and the root files only, while the full tree is still listed', () => {
    const { dir, base } = makeShared();
    const dest = join(tmp('clone'), 'wt');
    cloneSparse(dir, dest, base, 'relay-test', ['src', 'tests']);
    expect(existsSync(join(dest, 'src', 'a.ts'))).toBe(true);
    expect(existsSync(join(dest, 'tests', 'b.ts'))).toBe(true);
    expect(existsSync(join(dest, 'root.txt'))).toBe(true);
    expect(existsSync(join(dest, 'evidence'))).toBe(false);
    const all = trackedFiles(dest);
    expect(all.get('evidence/e.txt')).toBe('evidence/e.txt');
    expect(all.size).toBe(5);
    expect(changed(dest)).toEqual([]);
  });

  it('lists tracked files under their real spelling, keyed without case, and at an older revision', () => {
    const { clone, base } = makeClone();
    put(clone, 'src/MixedCase.ts', 'x\n');
    commitPaths(clone, ['src/MixedCase.ts'], 'add');
    expect(trackedFiles(clone).get('src/mixedcase.ts')).toBe('src/MixedCase.ts');
    expect(trackedFiles(clone, base).has('src/mixedcase.ts')).toBe(false);
  });

  it('refuses a destination that exists', () => {
    const { dir, base } = makeShared();
    const dest = tmp('exists');
    expect(() => cloneSparse(dir, dest, base, 'relay-test', ['src'])).toThrow(/already exists/);
    expect(existsSync(dest)).toBe(true);
  });

  it('refuses a base that does not exist and leaves no destination behind', () => {
    const { dir } = makeShared();
    const dest = join(tmp('clone'), 'wt');
    expect(() => cloneSparse(dir, dest, 'f'.repeat(40), 'relay-test', ['src'])).toThrow('the base commit is not reachable from any branch of the shared checkout');
    expect(existsSync(dest)).toBe(false);
  });

  it('refuses a base that is on no branch of the shared checkout', () => {
    const { dir, base } = makeShared();
    const tree = git(dir, ['rev-parse', `${base}^{tree}`]).stdout.trim();
    const orphan = git(dir, [...RELAY_IDENT, 'commit-tree', tree, '-m', 'orphan']).stdout.trim();
    const dest = join(tmp('clone'), 'wt');
    expect(() => cloneSparse(dir, dest, orphan, 'relay-test', ['src'])).toThrow(/not reachable from any branch/);
    expect(existsSync(dest)).toBe(false);
  });

  it('refuses a branch or base that git would read as an option', () => {
    const { dir, base } = makeShared();
    expect(() => cloneSparse(dir, join(tmp('clone'), 'wt'), base, '--orphan', ['src'])).toThrow(/not usable/);
    expect(() => cloneSparse(dir, join(tmp('clone'), 'wt'), '-x', 'relay-test', ['src'])).toThrow(/not usable/);
  });
});

describe('repoRoot and resolveCommit', () => {
  it('finds the top of the working tree from a subdirectory as a native path', () => {
    const { clone } = makeClone();
    const root = repoRoot(join(clone, 'src'));
    expect(root).toBe(clone);
  });

  it('gives the full sha of a revision and a plain message for one that is missing', () => {
    const { dir, base } = makeShared();
    expect(resolveCommit(dir, 'main')).toBe(base);
    expect(resolveCommit(dir, base.slice(0, 10))).toBe(base);
    expect(() => resolveCommit(dir, 'no-such-branch')).toThrow('there is no commit "no-such-branch"');
    expect(() => resolveCommit(dir, '--all')).toThrow(/not usable/);
  });

  it('names the subcommand, the status and the end of stderr when a git call fails', () => {
    const { dir } = makeShared();
    expect(() => git(dir, ['checkout', 'no-such-branch'])).toThrow(/git checkout failed with status \d+/);
    expect(git(dir, ['checkout', 'no-such-branch'], { allowFail: true }).status).not.toBe(0);
  });
});

describe('changed', () => {
  it('reports a modified file, an untracked file and a name with a space', () => {
    const { clone } = makeClone();
    put(clone, 'src/a.ts', 'export const a = 2;\n');
    put(clone, 'src/new.ts', 'x\n');
    put(clone, 'tests/with space.test.ts', 'x\n');
    expect(changed(clone)).toEqual(['src/a.ts', 'src/new.ts', 'tests/with space.test.ts']);
  });

  it('lists untracked files one by one, not as a directory', () => {
    const { clone } = makeClone();
    put(clone, 'src/deep/er/x.ts', 'x\n');
    put(clone, 'src/deep/er/y.ts', 'y\n');
    expect(changed(clone)).toEqual(['src/deep/er/x.ts', 'src/deep/er/y.ts']);
  });

  it('names both paths of a staged rename', () => {
    const { clone } = makeClone();
    git(clone, ['mv', 'src/a.ts', 'src/renamed file.ts']);
    expect(changed(clone)).toEqual(['src/a.ts', 'src/renamed file.ts']);
  });

  it('names both paths of a rename done on disk only', () => {
    const { clone } = makeClone();
    rmSync(join(clone, 'src', 'b.ts'));
    put(clone, 'src/c.ts', 'export const b = 2;\n');
    expect(changed(clone)).toEqual(['src/b.ts', 'src/c.ts']);
  });

  it('names both paths of a copy in the index', () => {
    const { clone } = makeClone();
    // a copy has to be staged and similar enough; status finds it only with copy detection on
    git(clone, ['-c', 'status.renames=copies', 'status', '--porcelain=v1']);
    put(clone, 'src/a-copy.ts', 'export const a = 1;\n');
    git(clone, ['add', 'src/a-copy.ts']);
    const got = changed(clone);
    expect(got).toContain('src/a-copy.ts');
    expect(got.every((p) => p === 'src/a-copy.ts' || p === 'src/a.ts')).toBe(true);
  });

  it('does not report a file outside the cone as missing', () => {
    const { clone } = makeClone();
    expect(existsSync(join(clone, 'evidence'))).toBe(false);
    expect(changed(clone)).toEqual([]);
  });
});

describe.each(['true', 'false'] as const)('commitPaths and diffText with core.autocrlf %s', (autocrlf) => {
  const text = (s: string): string => (autocrlf === 'true' ? s.replace(/\n/g, '\r\n') : s);

  it('refuses when a file that was not listed changed, and names it', () => {
    const { clone } = makeClone(autocrlf);
    const before = headSha(clone);
    put(clone, 'src/a.ts', text('export const a = 2;\n'));
    put(clone, 'src/stray.ts', 'x\n');
    put(clone, 'src/Other File.ts', 'x\n');
    expect(() => commitPaths(clone, ['src/a.ts'], 'message')).toThrow(/^unexpected changes in the clone: src\/Other File\.ts, src\/stray\.ts$/);
    expect(headSha(clone)).toBe(before);
    expect(git(clone, ['diff', '--cached', '--quiet'], { allowFail: true }).status).toBe(0);
  });

  it('commits only the listed paths that changed, comparing names without case', () => {
    const { clone, base } = makeClone(autocrlf);
    put(clone, 'src/a.ts', text('export const a = 2;\n'));
    put(clone, 'src/new file.ts', text('export const n = 1;\n'));
    const r = commitPaths(clone, ['SRC/A.ts', 'src/new file.ts', 'tests/b.ts'], 'add things');
    expect(r.committed).toBe(true);
    expect(r.sha).toBe(headSha(clone));
    expect(r.sha).not.toBe(base);
    const files = git(clone, ['show', '--name-only', '--format=', 'HEAD']).stdout.trim().split('\n').sort();
    expect(files).toEqual(['src/a.ts', 'src/new file.ts']);
    expect(changed(clone)).toEqual([]);
  });

  it('commits as the relay and not as the owner, whatever the environment says', () => {
    const { clone } = makeClone(autocrlf);
    put(clone, 'src/a.ts', text('export const a = 3;\n'));
    const saved = { name: process.env.GIT_AUTHOR_NAME, email: process.env.GIT_COMMITTER_EMAIL };
    process.env.GIT_AUTHOR_NAME = 'Intruder';
    process.env.GIT_COMMITTER_EMAIL = 'intruder@example.com';
    try {
      commitPaths(clone, ['src/a.ts'], 'who');
    } finally {
      if (saved.name === undefined) delete process.env.GIT_AUTHOR_NAME;
      else process.env.GIT_AUTHOR_NAME = saved.name;
      if (saved.email === undefined) delete process.env.GIT_COMMITTER_EMAIL;
      else process.env.GIT_COMMITTER_EMAIL = saved.email;
    }
    expect(git(clone, ['log', '-1', '--format=%an <%ae>|%cn <%ce>']).stdout.trim()).toBe('model-relay <relay@localhost>|model-relay <relay@localhost>');
    expect(git(clone, ['log', '-1', '--format=%s']).stdout.trim()).toBe('who');
  });

  it('makes no commit when nothing in the list changed', () => {
    const { clone, base } = makeClone(autocrlf);
    const r = commitPaths(clone, ['src/a.ts', 'src/nothing.ts'], 'empty');
    expect(r).toEqual({ sha: base, committed: false });
    expect(headSha(clone)).toBe(base);
  });

  it('gives a diff with LF line endings and no author lines', () => {
    const { clone, base } = makeClone(autocrlf);
    put(clone, 'src/a.ts', text('export const a = 2;\nexport const more = 3;\n'));
    put(clone, 'src/new.ts', text('export const n = 1;\n'));
    commitPaths(clone, ['src/a.ts', 'src/new.ts'], 'change');
    const diff = diffText(clone, base);
    expect(diff.startsWith('diff --git a/src/a.ts b/src/a.ts\n')).toBe(true);
    expect(diff).toContain('+export const more = 3;\n');
    expect(diff).toContain('diff --git a/src/new.ts b/src/new.ts\nnew file mode');
    expect(diff).not.toContain('\r');
    expect(diff).not.toMatch(/^(Author|Date|From|commit) /m);
    expect(diff).not.toContain('model-relay');
    expect(diffText(clone, base, 'HEAD', ['src/new.ts'])).not.toContain('src/a.ts');
    expect(diffText(clone, base, base)).toBe('');
  });
});

describe('restore', () => {
  it('puts a tracked file back and deletes a created one with the directories it leaves empty', () => {
    const { clone } = makeClone();
    put(clone, 'src/a.ts', 'changed\n');
    put(clone, 'src/brand/new/x.ts', 'x\n');
    put(clone, 'src/keep.ts', 'k\n');
    restore(clone, ['src/a.ts'], ['src/brand/new/x.ts']);
    expect(readFileSync(join(clone, 'src', 'a.ts'), 'utf8')).toBe('export const a = 1;\n');
    expect(existsSync(join(clone, 'src', 'brand'))).toBe(false);
    expect(existsSync(join(clone, 'src'))).toBe(true);
    expect(changed(clone)).toEqual(['src/keep.ts']);
  });

  it('also undoes a staged edit and accepts a created file that is already gone', () => {
    const { clone } = makeClone();
    put(clone, 'src/a.ts', 'changed\n');
    git(clone, ['add', 'src/a.ts']);
    restore(clone, ['src/a.ts'], ['src/never-written.ts']);
    expect(changed(clone)).toEqual([]);
  });

  it('refuses to delete a path that is not one the relay writes', () => {
    const { clone } = makeClone();
    expect(() => restore(clone, [], ['../outside.txt'])).toThrow(/not a path the relay handles/);
  });
});

describe('fetchBranchInto', () => {
  it('creates the branch in the shared checkout without touching its working tree', () => {
    const { shared, clone, base } = makeClone();
    put(clone, 'src/a.ts', 'export const a = 9;\n');
    const { sha } = commitPaths(clone, ['src/a.ts'], 'run work');
    put(shared, 'src/a.ts', 'owner is editing this\n');
    const sharedHead = headSha(shared);
    fetchBranchInto(shared, clone, 'relay-test');
    expect(git(shared, ['rev-parse', 'refs/heads/relay-test']).stdout.trim()).toBe(sha);
    expect(headSha(shared)).toBe(sharedHead);
    expect(git(shared, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()).toBe('main');
    expect(readFileSync(join(shared, 'src', 'a.ts'), 'utf8')).toBe('owner is editing this\n');
    expect(changed(shared)).toEqual(['src/a.ts']);
    expect(git(shared, ['rev-parse', 'refs/heads/main']).stdout.trim()).toBe(base);
  });

  it('refuses a branch name the shared checkout already has', () => {
    const { shared, clone } = makeClone();
    put(clone, 'src/a.ts', 'export const a = 9;\n');
    commitPaths(clone, ['src/a.ts'], 'run work');
    git(shared, ['branch', 'relay-test']);
    const before = git(shared, ['rev-parse', 'refs/heads/relay-test']).stdout.trim();
    expect(() => fetchBranchInto(shared, clone, 'relay-test')).toThrow(/already has a branch named "relay-test"/);
    expect(git(shared, ['rev-parse', 'refs/heads/relay-test']).stdout.trim()).toBe(before);
    git(clone, ['branch', 'relay-test-2']);
    fetchBranchInto(shared, clone, 'relay-test-2');
    expect(git(shared, ['rev-parse', '--verify', '--quiet', 'refs/heads/relay-test-2'], { allowFail: true }).status).toBe(0);
  });

  it('refuses a name that is not a branch name', () => {
    const { shared, clone } = makeClone();
    expect(() => fetchBranchInto(shared, clone, 'bad name')).toThrow(/not a usable branch name/);
    expect(() => fetchBranchInto(shared, clone, '-f')).toThrow(/not usable/);
  });
});

describe('removeRunDir', () => {
  function homeWithRun(): { home: string; run: string } {
    const home = tmp('home');
    const run = join(home, 'runs', 'r1');
    put(run, 'wt/file.txt', 'x\n');
    return { home, run };
  }

  it('deletes a directory inside the runs directory', () => {
    const { home, run } = homeWithRun();
    removeRunDir(home, run);
    expect(existsSync(run)).toBe(false);
    expect(existsSync(join(home, 'runs'))).toBe(true);
  });

  it('does nothing for a directory that is already gone', () => {
    const { home } = homeWithRun();
    expect(() => removeRunDir(home, join(home, 'runs', 'never-existed'))).not.toThrow();
  });

  it('refuses the runs directory itself and a path outside it, and deletes nothing', () => {
    const { home, run } = homeWithRun();
    const outside = join(home, 'elsewhere');
    put(outside, 'keep.txt', 'k\n');
    expect(() => removeRunDir(home, join(home, 'runs'))).toThrow(/not inside/);
    expect(() => removeRunDir(home, outside)).toThrow(/not inside/);
    expect(() => removeRunDir(home, join(run, '..', '..', 'elsewhere'))).toThrow(/not inside/);
    expect(existsSync(join(outside, 'keep.txt'))).toBe(true);
    expect(existsSync(join(run, 'wt', 'file.txt'))).toBe(true);
  });

  it('refuses a link inside the runs directory that leads outside, and does not follow it', () => {
    const { home } = homeWithRun();
    const outside = join(home, 'elsewhere');
    put(outside, 'keep.txt', 'k\n');
    const link = join(home, 'runs', 'sneaky');
    symlinkSync(outside, link, 'junction');
    expect(() => removeRunDir(home, link)).toThrow(/link/);
    expect(existsSync(join(outside, 'keep.txt'))).toBe(true);
  });

  it('refuses when there is no runs directory at all', () => {
    const home = tmp('home');
    const dir = join(home, 'x');
    mkdirSync(dir);
    expect(() => removeRunDir(home, dir)).toThrow(/no runs directory/);
    expect(existsSync(dir)).toBe(true);
  });
});

describe('safeEnv', () => {
  it('keeps only the listed names, matched without case, and drops every secret', () => {
    const out = safeEnv({
      PATH: '/bin',
      Path: 'C:\\bin',
      path: '/lower',
      SystemRoot: 'C:\\Windows',
      TEMP: '/t',
      HOME: '/home/u',
      LANG: 'C.UTF-8',
      TZ: 'UTC',
      XAI_API_KEY: 'secret',
      OPENAI_API_KEY: 'secret',
      DEEPSEEK_API_KEY: 'secret',
      NODE_OPTIONS: '--require x',
      npm_config_x: 'y',
      npm_lifecycle_event: 'test',
      VITEST: 'true',
      VITEST_POOL_ID: '1',
      GITHUB_TOKEN: 'secret',
      SSH_AUTH_SOCK: '/s',
      UNDEFINED_ONE: undefined,
    });
    expect(Object.keys(out).sort()).toEqual(['CI', 'FORCE_COLOR', 'HOME', 'LANG', 'NO_COLOR', 'PATH', 'Path', 'SystemRoot', 'TEMP', 'TZ', 'path']);
    expect(out.Path).toBe('C:\\bin');
    expect(out.CI).toBe('1');
    expect(out.NO_COLOR).toBe('1');
    expect(out.FORCE_COLOR).toBe('0');
  });

  it('adds the fixed names even to an empty environment, and overrides a value given for them', () => {
    expect(safeEnv({})).toEqual({ CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' });
    expect(safeEnv({ ci: 'false' })).toEqual({ CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' });
  });
});

const outcome = (id: string, state: TestOutcome['state'], message = ''): TestOutcome => ({ id, file: id.split(' > ')[0], state, message });
const result = (tests: TestOutcome[], over: Partial<GateResult> = {}): GateResult => ({ typecheck: 'pass', typecheckOutput: '', tests, timedOut: false, ms: 1, ...over });

describe('judge', () => {
  const base = result([outcome('t/a.test.ts > one', 'pass'), outcome('t/a.test.ts > two', 'fail'), outcome('t/a.test.ts > three', 'timeout')]);

  it('passes a change that breaks nothing', () => {
    const v = judge(base, result([outcome('t/a.test.ts > one', 'pass'), outcome('t/a.test.ts > two', 'pass'), outcome('t/a.test.ts > three', 'pass')]));
    expect(v).toEqual({ ok: true, typecheckBroken: false, newFailures: [], inconclusive: [], alreadyFailing: [] });
  });

  it('counts a test that passed at the base and fails now as a new failure', () => {
    const v = judge(base, result([outcome('t/a.test.ts > one', 'fail', 'boom')]));
    expect(v.ok).toBe(false);
    expect(v.newFailures.map((t) => t.id)).toEqual(['t/a.test.ts > one']);
  });

  it('does not hold a test against the change when it failed or timed out at the base too', () => {
    const v = judge(base, result([outcome('t/a.test.ts > one', 'pass'), outcome('t/a.test.ts > two', 'fail'), outcome('t/a.test.ts > three', 'fail')]));
    expect(v.ok).toBe(true);
    expect(v.alreadyFailing).toEqual(['t/a.test.ts > two', 't/a.test.ts > three']);
    expect(v.newFailures).toEqual([]);
  });

  it('also counts a test that timed out now and failed at the base as already failing', () => {
    const v = judge(base, result([outcome('t/a.test.ts > two', 'timeout')]));
    expect(v.alreadyFailing).toEqual(['t/a.test.ts > two']);
    expect(v.inconclusive).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('calls a test that timed out now, and was not failing at the base, inconclusive and not ok', () => {
    const v = judge(base, result([outcome('t/a.test.ts > one', 'timeout')]));
    expect(v.inconclusive.map((t) => t.id)).toEqual(['t/a.test.ts > one']);
    expect(v.newFailures).toEqual([]);
    expect(v.ok).toBe(false);
  });

  it('counts a new test that fails as a new failure and a new test that passes as nothing', () => {
    const v = judge(base, result([outcome('t/new.test.ts > fresh', 'fail'), outcome('t/new.test.ts > fine', 'pass'), outcome('t/new.test.ts > later', 'skipped')]));
    expect(v.newFailures.map((t) => t.id)).toEqual(['t/new.test.ts > fresh']);
    expect(v.ok).toBe(false);
  });

  it('reports a typecheck the change broke, from pass or from skipped, and not one that was already broken', () => {
    expect(judge(result([]), result([], { typecheck: 'fail' }))).toMatchObject({ ok: false, typecheckBroken: true });
    expect(judge(result([], { typecheck: 'skipped' }), result([], { typecheck: 'timeout' }))).toMatchObject({ ok: false, typecheckBroken: true });
    expect(judge(result([], { typecheck: 'fail' }), result([], { typecheck: 'fail' }))).toMatchObject({ ok: true, typecheckBroken: false });
    expect(judge(result([]), result([], { typecheck: 'skipped' }))).toMatchObject({ ok: true, typecheckBroken: false });
  });

  it('is not ok when the whole gate ran out of time, even with nothing else wrong', () => {
    const v = judge(base, result([outcome('t/a.test.ts > one', 'pass')], { timedOut: true }));
    expect(v.ok).toBe(false);
    expect(v.newFailures).toEqual([]);
    expect(v.inconclusive).toEqual([]);
  });
});

describe('gateSummary', () => {
  it('gives counts and names and never a message or output', () => {
    const now = result(
      [outcome('t/a.test.ts > one', 'pass'), outcome('t/a.test.ts > two', 'fail', 'SECRET FAILURE TEXT'), outcome('t/b.test.ts > slow', 'timeout', 'SLOW TEXT'), outcome('t/b.test.ts > old', 'fail'), outcome('t/b.test.ts > off', 'skipped')],
      { typecheckOutput: 'SECRET TSC OUTPUT' },
    );
    const base = result([outcome('t/b.test.ts > old', 'fail')]);
    const text = gateSummary(now, judge(base, now));
    expect(text).toContain('gate: not ok');
    expect(text).toContain('typecheck: pass');
    expect(text).toContain('tests: 1 passed, 1 new failures, 1 inconclusive, 1 already failing, 1 skipped');
    expect(text).toContain('new failures: t/a.test.ts > two');
    expect(text).toContain('inconclusive: t/b.test.ts > slow');
    expect(text).toContain('already failing: t/b.test.ts > old');
    expect(text).toContain('files run: t/a.test.ts; t/b.test.ts');
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('SLOW TEXT');
  });

  it('says so when the time limit ended the gate and when nothing was run', () => {
    const now = result([], { typecheck: 'timeout', timedOut: true });
    const text = gateSummary(now, judge(result([]), now));
    expect(text).toContain('gate: not ok (the time limit ended it)');
    expect(text).toContain('typecheck: timeout (the change broke it)');
    expect(text).toContain('files run: none');
  });
});

describe('readVitestReport', () => {
  const clone = join(tmpdir(), 'some-clone');
  const at = (rel: string): string => join(clone, ...rel.split('/'));
  const assertion = (fullName: string, status: string, failureMessages: string[] = []) => ({ fullName, title: fullName, ancestorTitles: [], status, failureMessages });

  it('turns each assertion into an outcome named by file and full name, with the states of the brief', () => {
    const out = readVitestReport(
      {
        testResults: [
          {
            name: at('tests/a.test.ts'),
            status: 'failed',
            message: '',
            assertionResults: [
              assertion('suite passes', 'passed'),
              assertion('suite fails', 'failed', ['AssertionError: expected 1 to be 2']),
              assertion('suite pending', 'pending'),
              assertion('suite skipped', 'skipped'),
              assertion('suite todo', 'todo'),
              assertion('suite slow', 'failed', ['Error: Test timed out in 5000ms.\nIf this is a long-running test, pass a timeout value']),
              assertion('suite slow and wrong', 'failed', ['Error: Test timed out in 5000ms.', 'AssertionError: also wrong']),
              assertion('suite no message', 'failed', []),
            ],
          },
        ],
      },
      clone,
    );
    expect(out.map((t) => [t.id, t.state])).toEqual([
      ['tests/a.test.ts > suite passes', 'pass'],
      ['tests/a.test.ts > suite fails', 'fail'],
      ['tests/a.test.ts > suite pending', 'skipped'],
      ['tests/a.test.ts > suite skipped', 'skipped'],
      ['tests/a.test.ts > suite todo', 'skipped'],
      ['tests/a.test.ts > suite slow', 'timeout'],
      ['tests/a.test.ts > suite slow and wrong', 'fail'],
      ['tests/a.test.ts > suite no message', 'fail'],
    ]);
    expect(out[1].message).toBe('AssertionError: expected 1 to be 2');
    expect(out[1].file).toBe('tests/a.test.ts');
    expect(out[6].message).toBe('Error: Test timed out in 5000ms.\nAssertionError: also wrong');
  });

  it('keeps only the first 4,000 characters of a failure message', () => {
    const out = readVitestReport({ testResults: [{ name: at('tests/a.test.ts'), status: 'failed', assertionResults: [assertion('big', 'failed', ['x'.repeat(10_000)])] }] }, clone);
    expect(out[0].message).toHaveLength(4000);
  });

  it('builds the name from the ancestors and title when there is no full name', () => {
    const out = readVitestReport({ testResults: [{ name: at('tests/a.test.ts'), status: 'passed', assertionResults: [{ title: 'does it', ancestorTitles: ['outer', 'inner'], status: 'passed', failureMessages: [] }] }] }, clone);
    expect(out[0].id).toBe('tests/a.test.ts > outer inner does it');
  });

  it('reports a file that failed without any test results as one that did not load', () => {
    const out = readVitestReport(
      {
        testResults: [
          { name: at('tests/broken.test.ts'), status: 'failed', message: "Error: Failed to resolve import './nope'", assertionResults: [] },
          { name: at('tests/empty.test.ts'), status: 'passed', message: '', assertionResults: [] },
        ],
      },
      clone,
    );
    expect(out).toEqual([{ id: 'tests/broken.test.ts > (file did not load)', file: 'tests/broken.test.ts', state: 'fail', message: "Error: Failed to resolve import './nope'" }]);
  });

  it('reports a file that failed although all its tests passed, so a broken hook cannot hide', () => {
    const out = readVitestReport({ testResults: [{ name: at('tests/hook.test.ts'), status: 'failed', message: 'Error: afterAll blew up', assertionResults: [assertion('ok', 'passed')] }] }, clone);
    expect(out.map((t) => [t.id, t.state])).toEqual([
      ['tests/hook.test.ts > ok', 'pass'],
      ['tests/hook.test.ts > (file-level failure)', 'fail'],
    ]);
  });

  it('refuses what is not a report', () => {
    expect(() => readVitestReport(null, clone)).toThrow('not a vitest JSON report');
    expect(() => readVitestReport({ testResults: 'no' }, clone)).toThrow('not a vitest JSON report');
    expect(() => readVitestReport([], clone)).toThrow('not a vitest JSON report');
    expect(readVitestReport({ testResults: [] }, clone)).toEqual([]);
  });
});

/** true while the process exists and is not a zombie (a killed orphan that nobody has reaped yet is gone for every purpose here) */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'));
  } catch {
    return true;
  }
}

async function goneWithin(pid: number, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (!alive(pid)) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return !alive(pid);
}

describe('runTool', () => {
  const env = safeEnv(process.env);

  it('returns the exit status and both output streams', async () => {
    const run = await runTool(['-e', 'console.log("out"); console.error("err"); process.exit(3)'], { cwd: tmpdir(), timeoutMs: 20_000, env });
    expect(run.status).toBe(3);
    expect(run.timedOut).toBe(false);
    expect(run.output).toContain('out');
    expect(run.output).toContain('err');
  });

  it('runs with exactly the environment it is given and in the directory it is given', async () => {
    const dir = tmp('cwd');
    const run = await runTool(['-e', 'console.log(JSON.stringify([process.env.ONLY_THIS, process.env.HOME_SECRET ?? null, process.cwd()]))'], {
      cwd: dir,
      timeoutMs: 20_000,
      env: { ...env, ONLY_THIS: 'yes' },
    });
    const [only, secret, cwd] = JSON.parse(run.output.trim());
    expect(only).toBe('yes');
    expect(secret).toBeNull();
    expect(readdirSync(cwd)).toEqual(readdirSync(dir));
  });

  it('keeps only the last two megabytes of a very long output', async () => {
    const run = await runTool(['-e', 'process.stdout.write("a".repeat(5_000_000) + "END")'], { cwd: tmpdir(), timeoutMs: 30_000, env });
    expect(run.output.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(run.output.endsWith('END')).toBe(true);
  });

  it('reports a tool that cannot start as a failure and not as an exception', async () => {
    const run = await runTool(['-e', '1'], { cwd: join(tmpdir(), 'relay-gate-no-such-dir'), timeoutMs: 5_000, env });
    expect(run.status).toBeNull();
    expect(run.timedOut).toBe(false);
  });

  it('uses the clock it is given for the elapsed time', async () => {
    let t = 1_000;
    const run = await runTool(['-e', '1'], { cwd: tmpdir(), timeoutMs: 20_000, env, now: () => (t += 500) });
    expect(run.ms).toBe(500);
  });

  it('ends the whole process tree when the time limit passes', async () => {
    const dir = tmp('tree');
    const pidFile = join(dir, 'grandchild.pid');
    const script = [
      'const { spawn } = require("node:child_process");',
      'const c = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });',
      `require("node:fs").writeFileSync(${JSON.stringify(pidFile)}, String(c.pid));`,
      'setInterval(() => {}, 1000);',
    ].join('\n');
    const run = await runTool(['-e', script], { cwd: dir, timeoutMs: 1_500, env });
    expect(run.timedOut).toBe(true);
    expect(run.status).toBeNull();
    const pid = Number(readFileSync(pidFile, 'utf8'));
    expect(pid).toBeGreaterThan(0);
    expect(await goneWithin(pid, 3_000)).toBe(true);
  });
});

// ---- behind a switch: real tsc and vitest processes ----

describe.skipIf(!process.env.RELAY_E2E)('runGate with real tsc and vitest', () => {
  function makeProject(): { home: string; wt: string } {
    const home = join(tmp('e2e'), 'home');
    const wt = join(home, 'runs', 't', 'wt');
    mkdirSync(wt, { recursive: true });
    symlinkSync(join(REPO, 'node_modules'), join(home, 'node_modules'), 'junction');
    put(wt, 'tsconfig.json', JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', skipLibCheck: true, types: ['node'] }, include: ['src', 'tests'] }, null, 2));
    put(wt, 'vite.config.ts', "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { include: ['tests/**/*.test.ts'], environment: 'node' } });\n");
    put(wt, 'src/add.ts', 'export const add = (a: number, b: number): number => a + b;\n');
    put(wt, 'tests/ok.test.ts', "import { expect, it } from 'vitest';\nimport { add } from '../src/add';\nit('adds', () => { expect(add(1, 2)).toBe(3); });\n");
    put(wt, 'tests/bad.test.ts', "import { describe, expect, it } from 'vitest';\nimport { add } from '../src/add';\ndescribe('maths', () => {\n  it('adds wrongly', () => { expect(add(1, 1)).toBe(3); });\n  it('adds rightly', () => { expect(add(1, 1)).toBe(2); });\n});\n");
    put(wt, 'tests/env.test.ts', "import { expect, it } from 'vitest';\nit('sees no key', () => { expect(process.env.XAI_API_KEY).toBeUndefined(); expect(process.env.CI).toBe('1'); });\n");
    return { home, wt };
  }

  const options = (home: string, wt: string, over: Partial<GateOptions> = {}): GateOptions => ({
    clone: wt,
    toolsRoot: home,
    tests: ['tests/ok.test.ts', 'tests/bad.test.ts', 'tests/env.test.ts'],
    typecheck: true,
    timeoutMs: 120_000,
    maxWorkers: 2,
    outDir: join(home, 'runs', 't', 'out'),
    ...over,
  });

  it('typechecks, runs the tests, names the outcomes, and notices a type error', async () => {
    const { home, wt } = makeProject();
    const first = await runGate(options(home, wt));
    expect(first.typecheck).toBe('pass');
    expect(first.timedOut).toBe(false);
    const states = Object.fromEntries(first.tests.map((t) => [t.id, t.state]));
    expect(states).toEqual({
      'tests/ok.test.ts > adds': 'pass',
      'tests/bad.test.ts > maths adds wrongly': 'fail',
      'tests/bad.test.ts > maths adds rightly': 'pass',
      'tests/env.test.ts > sees no key': 'pass',
    });
    expect(first.tests.find((t) => t.state === 'fail')?.message).toContain('expected 2 to be 3');
    expect(existsSync(join(home, 'runs', 't', 'out', 'typecheck.txt'))).toBe(true);
    expect(existsSync(join(home, 'runs', 't', 'out', 'vitest-1.json'))).toBe(true);
    expect(existsSync(join(home, 'runs', 't', 'out', 'vitest-1.txt'))).toBe(true);

    put(wt, 'src/broken.ts', "export const n: number = 'not a number';\n");
    const second = await runGate(options(home, wt, { tests: [] }));
    expect(second.typecheck).toBe('fail');
    expect(second.typecheckOutput).toContain('broken.ts');
    expect(second.tests).toEqual([]);
    const v = judge(first, second);
    expect(v.typecheckBroken).toBe(true);
    expect(v.ok).toBe(false);
  }, 180_000);

  it('runs the tests without the keys that the caller holds', async () => {
    const { home, wt } = makeProject();
    const r = await runGate(options(home, wt, { typecheck: false, tests: ['tests/env.test.ts'], env: { ...process.env, XAI_API_KEY: 'would-be-a-secret', OPENAI_API_KEY: 'x', NODE_OPTIONS: '--max-old-space-size=64' } }));
    expect(r.typecheck).toBe('skipped');
    expect(r.tests.map((t) => [t.id, t.state])).toEqual([['tests/env.test.ts > sees no key', 'pass']]);
  }, 120_000);

  it('gives a timed-out test a second look alone, and keeps one that times out again as a timeout', async () => {
    const { home, wt } = makeProject();
    put(
      wt,
      'tests/slow.test.ts',
      [
        "import { existsSync, writeFileSync } from 'node:fs';",
        "import { expect, it } from 'vitest';",
        `const marker = ${JSON.stringify(join(home, 'first-run-done'))};`,
        "it('slow once', async () => {",
        '  const first = !existsSync(marker);',
        "  writeFileSync(marker, 'x');",
        '  if (first) await new Promise((r) => setTimeout(r, 600));',
        '  expect(true).toBe(true);',
        '}, 200);',
        "it('always slow', async () => { await new Promise((r) => setTimeout(r, 600)); }, 200);",
        '',
      ].join('\n'),
    );
    const r = await runGate(options(home, wt, { typecheck: false, tests: ['tests/slow.test.ts'] }));
    const states = Object.fromEntries(r.tests.map((t) => [t.id, t.state]));
    expect(states).toEqual({ 'tests/slow.test.ts > slow once': 'pass', 'tests/slow.test.ts > always slow': 'timeout' });
    expect(existsSync(join(home, 'runs', 't', 'out', 'vitest-2.json'))).toBe(true);
    const v = judge(result([]), r);
    expect(v.inconclusive.map((t) => t.id)).toEqual(['tests/slow.test.ts > always slow']);
    expect(v.ok).toBe(false);
  }, 120_000);

  it('ends an endless synchronous loop at the time limit and leaves no process running', async () => {
    const { home, wt } = makeProject();
    const pidFile = join(home, 'loop.pid');
    put(wt, 'tests/loop.test.ts', ["import { writeFileSync } from 'node:fs';", "import { it } from 'vitest';", `writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));`, 'for (;;) { /* never yields */ }', "it('never reached', () => {});", ''].join('\n'));
    const started = Date.now();
    const r = await runGate(options(home, wt, { typecheck: false, tests: ['tests/loop.test.ts'], timeoutMs: 15_000 }));
    expect(Date.now() - started).toBeLessThan(40_000);
    expect(r.timedOut).toBe(true);
    expect(r.tests.map((t) => [t.id, t.state])).toEqual([['(vitest) > (no report)', 'timeout']]);
    expect(judge(result([]), r).ok).toBe(false);
    const pid = Number(readFileSync(pidFile, 'utf8'));
    expect(pid).toBeGreaterThan(0);
    expect(await goneWithin(pid, 5_000)).toBe(true);
  }, 90_000);
});
