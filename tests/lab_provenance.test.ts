import { expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertLabSourceUnchanged, labProvenance, lfHash } from '../scripts/observers/provenance';

it('retains runner and measurement source, reports it, resumes only the same content, and refuses changed content', () => {
  const out = mkdtempSync(join(tmpdir(), 'lw-lab-provenance-'));
  const args = ['--no-experimental-strip-types', 'scripts/lab.mjs', '--out', out, '--seeds', '1', '--profile', 'normal', '--fork', '0', '--days', '0.01', '--branches', 'none'];
  const run = () => spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000 });
  const first = run();
  expect(first.status, first.stderr).toBe(0);
  const provenance = JSON.parse(readFileSync(join(out, 'provenance.json'), 'utf8'));
  expect(provenance.head).toMatch(/^[a-f0-9]{40}$/);
  expect(typeof provenance.dirty).toBe('boolean');
  expect(Array.isArray(provenance.modified)).toBe(true);
  expect(provenance.source['src/sim/world.ts']).toBe(lfHash(readFileSync('src/sim/world.ts', 'utf8')));
  const rows = readFileSync(join(out, 'lab_meadow.jsonl'), 'utf8').trim().split('\n').map(s => JSON.parse(s));
  expect(rows[0].provenance).toEqual(provenance);
  const report = readFileSync(join(out, 'report.txt'), 'utf8');
  expect(report).toContain('Measurement provenance (meadow): ' + JSON.stringify(provenance));
  expect(report).toContain('Report-generation provenance (not measurement source):');
  const again = run();
  expect(again.status, again.stderr).toBe(0);
  expect(again.stdout).toContain('already done');
  const retained = readFileSync(join(out, 'lab_meadow.jsonl'), 'utf8');
  provenance.source['src/sim/world.ts'] = 'different source';
  writeFileSync(join(out, 'provenance.json'), JSON.stringify(provenance));
  const changed = run();
  expect(changed.status).not.toBe(0);
  expect(changed.stderr).toContain('Lab source differs');
  expect(readFileSync(join(out, 'lab_meadow.jsonl'), 'utf8')).toBe(retained);
}, 120000);

it('rejects a source change against the start snapshot', () => {
  const start = labProvenance();
  expect(() => assertLabSourceUnchanged(start)).not.toThrow();
  start.source['src/sim/world.ts'] = 'changed';
  expect(() => assertLabSourceUnchanged(start)).toThrow('Source changed during lab run');
});
