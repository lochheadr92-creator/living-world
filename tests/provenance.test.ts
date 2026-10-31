// An observer report's provenance (scripts/observers/provenance.ts): the content hash of a source file must not depend on the
// line endings git checked it out with, and the git facts must say which commit and whether the tree was clean (review C2).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { gitProvenance, lfHash, sourceManifest } from '../scripts/observers/provenance';

it('hashes the same content the same whether its lines end in LF or CRLF', () => {
  expect(lfHash('a\r\nb\r\n')).toBe(lfHash('a\nb\n'));
  expect(lfHash('a\nb\n')).not.toBe(lfHash('a\nc\n'));
  const dir = mkdtempSync(join(tmpdir(), 'living-world provenance '));
  writeFileSync(join(dir, 'lf.ts'), 'const x = 1;\nexport default x;\n');
  writeFileSync(join(dir, 'crlf.ts'), 'const x = 1;\r\nexport default x;\r\n');
  const m = sourceManifest([join(dir, 'lf.ts'), join(dir, 'crlf.ts')]);
  expect(m[join(dir, 'lf.ts')]).toBe(m[join(dir, 'crlf.ts')]);
});

it('records the checked-out commit and whether tracked files differ from it', () => {
  const g = gitProvenance();
  expect(g.head).toBe(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  expect(g.head).toMatch(/^[0-9a-f]{40}$/);
  expect(typeof g.dirty).toBe('boolean');
  expect(Array.isArray(g.modified)).toBe(true);
  expect(g.dirty).toBe(g.modified.length > 0);
});
