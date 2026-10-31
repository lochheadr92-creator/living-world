// scripts/lab.mjs runs one worker per seed and then the report. A failed worker is a measurement that does not exist, and a
// report of nothing is not a result: both must reach whoever reads only the exit code (review C1).
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';

it('lab.mjs exits non-zero when a seed worker fails', () => {
  const out = mkdtempSync(join(tmpdir(), 'living-world lab exit '));
  // an unknown profile makes the seed worker throw at once, before any simulation
  const r = spawnSync(process.execPath, [resolve('scripts/lab.mjs'), '--out', out, '--seeds', '1', '--profile', 'no-such-profile', '--days', '1', '--fork', '0', '--branches', 'none'], { encoding: 'utf8', timeout: 120000 });
  expect(r.stdout).toContain('FAILED');
  expect(r.status).not.toBe(0);
  expect(r.stderr).toContain('lab incomplete');
}, 130000);

it('lab_report.ts exits non-zero when there are no results', () => {
  const out = mkdtempSync(join(tmpdir(), 'living-world lab empty '));
  const r = spawnSync(process.execPath, [resolve('node_modules/vite-node/dist/cli.mjs'), resolve('scripts/lab_report.ts'), '--', out], { encoding: 'utf8', timeout: 120000 });
  expect(r.stdout).toContain('no lab results found');
  expect(r.status).not.toBe(0);
}, 130000);
