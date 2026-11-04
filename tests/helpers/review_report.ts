// Diagnostic reports belong to a fresh local temporary directory, not an old reviewer's scratchpad.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function reviewReportPath(filename: string): string {
  return join(mkdtempSync(join(tmpdir(), 'living-world-review-')), filename);
}
