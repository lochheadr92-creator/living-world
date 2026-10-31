// What an observer report says about where it came from. Three facts, each answering a question a reader of a retained report
// has asked: which commit was checked out (`head`), whether the tree had uncommitted tracked changes at the time (`dirty`, with
// the paths), and what the source files actually contained (`source`, one hash per file). The content hashes are taken over
// LF-normalised text, so the same file hashes the same whether git checked it out with CRLF or LF endings (review C2).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** sha256 of the text with every CRLF read as LF: the hash of the content, not of the checkout's line endings */
export const lfHash = (text: string): string => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

/** one LF-normalised content hash per file, keyed by the path given */
export function sourceManifest(files: string[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [f, lfHash(readFileSync(f, 'utf8'))]));
}

export interface GitProvenance {
  /** the commit checked out when the run began */
  head: string;
  /** whether any tracked file differed from that commit (untracked files, such as evidence folders, do not count) */
  dirty: boolean;
  /** the tracked paths that differed, as `git status --porcelain` lists them */
  modified: string[];
}

export function gitProvenance(): GitProvenance {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
  const modified = status.split(/\r?\n/).filter((l) => l.trim().length > 0).map((l) => l.slice(3).trim());
  return { head, dirty: modified.length > 0, modified };
}
