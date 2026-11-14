// Every git call the model relay makes, in one place. A relay run works in its own git clone of the owner's checkout, with only
// some directories checked out; this file makes that clone, reads what changed in it, commits exactly the files the relay means to
// commit, and at the very end fetches the run's branch back into the owner's checkout as a new ref. It is the only module that
// runs git.
//
// Rules it keeps. Git is started with an argument array and no shell, so a path or a message is never parsed by one. Success is
// judged by the exit status alone: on Windows git writes line-ending warnings to stderr even when it worked. Paths that arrive
// from callers are passed with --literal-pathspecs so a name such as `:(top)x` is a file name and not a pathspec. A commit carries
// the relay's own identity, never the owner's name or email, and never waits for a signing prompt. The owner's checkout is never
// written to, apart from the one ref that fetchBranchInto creates.
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync, rmdirSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { canonicalPath, resolveInside } from './paths';

/** a commit made by the relay names this identity and no one else */
export const RELAY_IDENT: string[] = ['-c', 'user.name=model-relay', '-c', 'user.email=relay@localhost', '-c', 'commit.gpgsign=false'];

const MAX_BUFFER = 256 * 1024 * 1024;
const SHA = /^[0-9a-f]{40}$/;

export interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Variables that would send git to another repository, or put somebody's name on a commit in place of the relay's: they are
 * dropped from the environment of every call. This matters when the relay is started from inside a git hook.
 */
function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|COMMON_DIR|NAMESPACE|PREFIX|AUTHOR_.*|COMMITTER_.*)$/i.test(name)) continue;
    env[name] = value;
  }
  env.GIT_TERMINAL_PROMPT = '0';
  return env;
}

/**
 * Runs git in `cwd`. Throws an Error naming the subcommand, the exit status and the last 2,000 characters of stderr unless
 * `allowFail`; an unstartable git counts as status -1.
 */
export function git(cwd: string, args: string[], opts: { allowFail?: boolean; input?: string } = {}): GitResult {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: MAX_BUFFER,
    shell: false,
    input: opts.input,
    env: gitEnv(),
  });
  const status = typeof r.status === 'number' ? r.status : -1;
  let stderr = r.stderr ?? '';
  if (r.error) stderr = `${r.error.message}\n${stderr}`;
  const out: GitResult = { status, stdout: r.stdout ?? '', stderr };
  if (status !== 0 && !opts.allowFail) {
    const sub = args.find((a, i) => !a.startsWith('-') && (i === 0 || args[i - 1] !== '-c')) ?? '(none)';
    throw new Error(`git ${sub} failed with status ${status}: ${stderr.slice(-2000).trim()}`);
  }
  return out;
}

/** a revision, ref or branch name that begins with a dash would be read by git as an option */
function noDash(what: string, value: string): void {
  if (typeof value !== 'string' || value === '' || value.startsWith('-')) throw new Error(`${what} is not usable: ${JSON.stringify(value)}`);
}

/** The top of the working tree that contains `cwd`, as a native absolute path (git prints forward slashes even on Windows). */
export function repoRoot(cwd: string): string {
  return resolve(git(cwd, ['rev-parse', '--show-toplevel']).stdout.trim());
}

/** The full 40-character sha of `rev`; a plain message when no such commit exists. */
export function resolveCommit(repo: string, rev: string): string {
  noDash('revision', rev);
  const r = git(repo, ['rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { allowFail: true });
  const sha = r.stdout.trim();
  if (r.status !== 0 || !SHA.test(sha)) throw new Error(`there is no commit "${rev}" in ${repo}`);
  return sha;
}

/**
 * Makes the run's clone. `dest` must not exist. The clone is made without a checkout, loses its remote (so nothing in it can push
 * back and the owner's path is not in its config), is set to cone-mode sparse checkout of `cone`, and then switches to a new
 * `branch` at `base`. Returns the head sha. A failure removes what it made, so the same destination can be tried again.
 */
export function cloneSparse(shared: string, dest: string, base: string, branch: string, cone: string[]): string {
  if (existsSync(dest)) throw new Error(`the clone destination already exists: ${dest}`);
  noDash('base', base);
  noDash('branch', branch);
  for (const c of cone) noDash('sparse directory', c);
  try {
    git(shared, ['clone', '--no-checkout', '--local', '--no-tags', '--', shared, dest]);
    const sha = git(dest, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { allowFail: true }).stdout.trim();
    // --local copies the whole object store, so a commit can be present without being on any branch; ask the branches.
    const onBranch = SHA.test(sha) && git(dest, ['for-each-ref', '--contains', sha, '--count=1', '--format=%(refname)', 'refs/remotes/origin'], { allowFail: true }).stdout.trim() !== '';
    if (!onBranch) throw new Error('the base commit is not reachable from any branch of the shared checkout');
    git(dest, ['remote', 'remove', 'origin']);
    git(dest, ['sparse-checkout', 'init', '--cone']);
    git(dest, ['sparse-checkout', 'set', '--stdin'], { input: `${cone.join('\n')}\n` });
    git(dest, ['checkout', '-b', branch, sha]);
    return headSha(dest);
  } catch (e) {
    rmSync(dest, { recursive: true, force: true, maxRetries: 5 });
    throw e;
  }
}

/**
 * Every path in the tree of `rev` (default HEAD), including those outside the sparse cone: lower-cased path to its real spelling.
 * When two paths differ only in case, the first in git's order is kept.
 */
export function trackedFiles(clone: string, rev = 'HEAD'): Map<string, string> {
  noDash('revision', rev);
  const out = git(clone, ['ls-tree', '-r', '--name-only', '-z', rev, '--']).stdout;
  const map = new Map<string, string>();
  for (const p of out.split('\0')) {
    if (p === '') continue;
    const key = p.toLowerCase();
    if (!map.has(key)) map.set(key, p);
  }
  return map;
}

/**
 * Paths that differ from HEAD or are untracked, forward slashes, sorted, with no repeats. A rename or copy names both its paths.
 * Ignored files are not listed.
 */
export function changed(clone: string): string[] {
  const parts = git(clone, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).stdout.split('\0');
  const found = new Set<string>();
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    found.add(entry.slice(3));
    // in the two-path form the second path follows as its own entry: "XY to" then "from"
    if (/[RC]/.test(entry.slice(0, 2)) && i + 1 < parts.length && parts[i + 1] !== '') found.add(parts[++i]);
  }
  return [...found].sort();
}

/**
 * Commits the given paths. Every path that `changed` reports must be among them (compared without case), otherwise nothing is
 * staged and an Error beginning "unexpected changes in the clone:" lists the strangers: that is what keeps a file written by
 * executed code from riding into the branch. When none of the paths changed there is no commit and the head is returned.
 */
export function commitPaths(clone: string, paths: string[], message: string): { sha: string; committed: boolean } {
  const allowed = new Set(paths.map((p) => p.replace(/\\/g, '/').toLowerCase()));
  const now = changed(clone);
  const strangers = now.filter((p) => !allowed.has(p.toLowerCase()));
  if (strangers.length > 0) throw new Error(`unexpected changes in the clone: ${strangers.join(', ')}`);
  if (now.length === 0) return { sha: headSha(clone), committed: false };
  git(clone, ['--literal-pathspecs', 'add', '--', ...now]);
  // a change that is only line endings can leave nothing staged
  if (git(clone, ['diff', '--cached', '--quiet'], { allowFail: true }).status === 0) return { sha: headSha(clone), committed: false };
  git(clone, [...RELAY_IDENT, 'commit', '--no-verify', '-m', message]);
  return { sha: headSha(clone), committed: true };
}

/**
 * A unified diff between two commits, `to` defaulting to HEAD. The settings that change git's output for a given user (prefixes,
 * quoting of unusual names, line-ending conversion, an external diff tool) are fixed here, so the text is the same on every
 * machine and its line endings are those of the stored blobs, which are LF.
 */
export function diffText(clone: string, from: string, to = 'HEAD', paths: string[] = []): string {
  noDash('revision', from);
  noDash('revision', to);
  return git(clone, [
    '--literal-pathspecs',
    '-c', 'core.autocrlf=false',
    '-c', 'core.quotePath=false',
    'diff', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', '--src-prefix=a/', '--dst-prefix=b/',
    from, to, '--', ...paths,
  ]).stdout;
}

/**
 * Undoes a half-written apply: the tracked paths go back to their state at HEAD (index and working file), and the files that
 * were created are deleted if present, together with any directory that deleting them leaves empty below the top level.
 * A created path must be one the relay would have written (resolveInside refuses anything else, links included).
 */
export function restore(clone: string, tracked: string[], created: string[]): void {
  if (tracked.length > 0) git(clone, ['--literal-pathspecs', 'checkout', 'HEAD', '--', ...tracked]);
  for (const rel of created) {
    const abs = resolveInside(clone, rel);
    rmSync(abs, { force: true });
    const parts = (canonicalPath(rel) as string).split('/');
    for (let depth = parts.length - 1; depth >= 2; depth--) {
      const dir = join(clone, ...parts.slice(0, depth));
      try {
        if (readdirSync(dir).length > 0) break;
        rmdirSync(dir);
      } catch {
        break;
      }
    }
  }
}

export function headSha(clone: string): string {
  return git(clone, ['rev-parse', 'HEAD']).stdout.trim();
}

/**
 * Brings the run's branch into the owner's checkout as a new ref and nothing else: no working-tree change, no tags. Refuses when
 * the checkout already has a branch of that name, so an earlier branch is never moved.
 */
export function fetchBranchInto(shared: string, clone: string, branch: string): void {
  noDash('branch', branch);
  if (git(shared, ['check-ref-format', `refs/heads/${branch}`], { allowFail: true }).status !== 0) throw new Error(`"${branch}" is not a usable branch name`);
  if (git(shared, ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { allowFail: true }).status === 0) {
    throw new Error(`the shared checkout already has a branch named "${branch}"; nothing was fetched`);
  }
  if (!existsSync(clone)) throw new Error(`the run's clone does not exist: ${clone}`);
  git(shared, ['fetch', '--no-tags', '--', clone, `refs/heads/${branch}:refs/heads/${branch}`]);
}

/**
 * Deletes a run's directory. Only a directory strictly inside <home>/runs, by real path, is deleted: anything else, the runs
 * directory itself and a link that leads elsewhere included, is an Error and nothing is removed. A missing directory is not an
 * error. Retries absorb the short locks Windows leaves after a process exits.
 */
export function removeRunDir(home: string, dir: string): void {
  const runsDir = join(home, 'runs');
  if (!existsSync(runsDir)) throw new Error(`there is no runs directory under ${home}`);
  const runs = realpathSync(runsDir);
  if (!existsSync(dir)) return;
  if (lstatSync(dir).isSymbolicLink()) throw new Error(`refusing to remove a link: ${dir}`);
  const real = realpathSync(dir);
  const rel = relative(runs, real);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`refusing to remove ${dir}: it is not inside ${runs}`);
  }
  rmSync(real, { recursive: true, force: true, maxRetries: 5 });
}
