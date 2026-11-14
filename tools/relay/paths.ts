// One spelling for every path the relay handles: relative to the repository root, forward slashes, plain characters. A path that
// arrives from a model, a work order or a reviewer is first reduced to that form or refused; lists are matched on its lower-cased
// form, because Windows opens `Tests/X.ts`, `tests/x.ts.` and `tests/x.ts::$DATA` as the same file. The filesystem is only ever
// touched with the work order's own spelling, never with a model's.
import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const PLAIN = /^[A-Za-z0-9_][A-Za-z0-9_./-]*$/;

/**
 * The canonical form of a repo-relative path, or null when it is not one the relay will handle: absolute, drive-lettered, with
 * `..`, `~`, `:` or other characters outside letters, digits, `_ . / -`, with an empty part, or with a part that starts with a
 * dot or ends with a dot (so `.git`, `.claude` and Windows' trailing-dot aliases never pass).
 */
export function canonicalPath(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let p = raw.trim().replace(/\\/g, '/');
  while (p.startsWith('./')) p = p.slice(2);
  if (!p || p.length > 240 || !PLAIN.test(p)) return null;
  for (const part of p.split('/')) {
    if (!part || part.startsWith('.') || part.endsWith('.')) return null;
  }
  return p;
}

/** A glob as a case-insensitive expression: `**` crosses directories, `*` stays inside one, everything else is literal. */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else re += /[.+?^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
  }
  return new RegExp(`^${re}$`, 'i');
}

export function matchesAny(path: string, globs: readonly string[]): boolean {
  const p = path.toLowerCase();
  return globs.some((g) => globToRegExp(g.toLowerCase()).test(p));
}

/** true when the path sits under one of the prefixes (each ends with `/`), compared without case */
export function underRoots(path: string, roots: readonly string[]): boolean {
  const p = path.toLowerCase();
  return roots.some((r) => p.startsWith(r.toLowerCase()));
}

function within(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * The absolute path of a canonical repo-relative path under `root`, after checking that the nearest directory that already
 * exists really lies inside `root` once links are followed. A symlink or junction that leads out of the root is refused.
 */
export function resolveInside(root: string, rel: string): string {
  const canon = canonicalPath(rel);
  if (canon === null) throw new Error(`not a path the relay handles: ${JSON.stringify(rel)}`);
  const realRoot = realpathSync(root);
  const abs = resolve(realRoot, ...canon.split('/'));
  if (!within(realRoot, abs)) throw new Error(`path leaves the run's clone: ${canon}`);
  let probe = existsSync(abs) ? abs : dirname(abs);
  while (!existsSync(probe)) {
    const up = dirname(probe);
    if (up === probe) break;
    probe = up;
  }
  const real = realpathSync(probe);
  if (!within(realRoot, real)) throw new Error(`path leads out of the run's clone through a link: ${canon}`);
  return abs;
}

/** a repo-relative, forward-slash path for an absolute path under root (for tool output that names files absolutely) */
export function relativeTo(root: string, abs: string): string {
  return relative(root, abs).split(sep).join('/');
}

export const joinPath = join;
