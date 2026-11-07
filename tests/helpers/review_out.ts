// Where the review-only measurements (tests/zz_review_*) write what they measured: a folder under the system temp directory, made on
// demand. They used to write into one finished session's scratchpad, which existed only on the reviewer's machine, so elsewhere the
// suite failed on a missing folder rather than on anything it tests.
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function reviewOut(...parts: string[]): string {
  const dir = join(tmpdir(), 'living-world-review', ...parts);
  mkdirSync(dir, { recursive: true });
  return dir.replaceAll('\\', '/');
}
