import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'living-world-report-'));
  dirs.push(dir);
  const rows = [];
  for (let seed = 0; seed < 7; seed++) {
    for (const [spec, people] of [['control', 100], ['nudge:1', 100], ['A', seed === 6 ? 1000 : 15], ['B', 10]] as const) {
      if (seed === 6 && spec === 'B') continue;
      rows.push({ seed: String(seed), spec, profile: 'normal', fork: 0, days: 1,
        outcome: { people }, finalHash: spec, divergedAfterTicks: 1, summary: spec,
        milestones: {}, popByDay: [people] });
    }
  }
  writeFileSync(join(dir, 'lab_fixture.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n'));
  return dir;
}

function report(dir: string, ...args: string[]) {
  return execFileSync(process.execPath, [resolve('node_modules/vite-node/dist/cli.mjs'),
    'scripts/lab_report.ts', '--', dir, ...args], { encoding: 'utf8', timeout: 20000 });
}

it('pairs only matching seeds, preserves contrast direction, and skips unrecorded historical metrics', () => {
  const out = report(fixture(), '--vs', 'A:B,B:A');
  expect(out).toContain('A − B: direct contrast, paired by seed  [6 seeds]');
  expect(out).toMatch(/people\s+15\.0\s+10\.0\s+\+5\.0/);
  expect(out).toMatch(/people\s+10\.0\s+15\.0\s+-5\.0/);
  expect(out).toContain('not recorded by this run');
  expect(out).not.toMatch(/NaN|undefined/);
}, 30000);

it('reports an unavailable contrast without inventing a result and keeps story output', () => {
  const out = report(fixture(), '--vs', 'A:absent', '--story', '0');
  expect(out).toContain('not a contrast of two branches');
  expect(out).toContain('Story of seed 0:');
  expect(out).not.toContain('direct contrast, paired by seed');
}, 30000);
