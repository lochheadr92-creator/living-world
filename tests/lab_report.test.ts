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
    'scripts/lab_report.ts', '--', dir, ...args], { encoding: 'utf8', timeout: 120000 });
}

it('pairs only matching seeds, preserves contrast direction, and skips unrecorded historical metrics', () => {
  const out = report(fixture(), '--vs', 'A:B,B:A');
  expect(out).toContain('A − B: direct contrast, paired by seed  [6 seeds]');
  expect(out).toMatch(/people\s+15\.0\s+10\.0\s+\+5\.0/);
  expect(out).toMatch(/people\s+10\.0\s+15\.0\s+-5\.0/);
  expect(out).toContain('not recorded by this run');
  // a run from before births, pairings and conceptions were counted has no value for them: they are named as unrecorded, not shown as zero
  const unrecorded = out.split('\n').find((line) => line.includes('not recorded by this run'))!;
  expect(unrecorded).toMatch(/\bbirths, pairings, conceptions\b/);
  expect(out).not.toMatch(/^\s+births\s/m);
  // Source provenance can contain filenames such as undefined_keyorder.test.ts.
  // Check reported results separately from that explicitly labelled metadata.
  const reportBody = out.split('\n')
    .filter((line) => !line.startsWith('Report-generation provenance (not measurement source): '))
    .join('\n');
  expect(reportBody).not.toMatch(/NaN|undefined/);
}, 300000);

it('shows births, pairings and conceptions in the table beside deaths and people, as counts, for a run that recorded them', () => {
  const dir = mkdtempSync(join(tmpdir(), 'living-world-report-'));
  dirs.push(dir);
  const rows = [];
  for (let seed = 0; seed < 4; seed++) {
    for (const [spec, births, pairings] of [['control', 2, 1], ['nudge:1', 2, 3], ['A', 4, 5]] as const) {
      rows.push({ seed: String(seed), spec, profile: 'normal', fork: 0, days: 12,
        outcome: { people: 100, deaths: 1, births, pairings, conceptions: births + 1 }, finalHash: spec, divergedAfterTicks: 1, summary: spec,
        milestones: {}, popByDay: [100] });
    }
  }
  writeFileSync(join(dir, 'lab_fixture.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n'));
  const out = report(dir);
  // reference = mean of the control and the nudge (2 and 2 births; 1 and 3 pairings); the branch has 4 and 5
  expect(out).toMatch(/^\s+births\s+2\.0\s+4\.0\s+\+2\.0\s/m);
  expect(out).toMatch(/^\s+pairings\s+2\.0\s+5\.0\s+\+3\.0\s/m);
  expect(out).toMatch(/^\s+conceptions\s+3\.0\s+5\.0\s+\+2\.0\s/m);
  expect(out.split('\n').find((line) => line.includes('not recorded by this run'))!).not.toMatch(/\b(births|pairings|conceptions)\b/);
}, 300000);

it('reports an unavailable contrast without inventing a result and keeps story output', () => {
  const out = report(fixture(), '--vs', 'A:absent', '--story', '0');
  expect(out).toContain('not a contrast of two branches');
  expect(out).toContain('Story of seed 0:');
  expect(out).not.toContain('direct contrast, paired by seed');
}, 300000);

function verdictFixture(seeds: number) {
  const dir = mkdtempSync(join(tmpdir(), 'lw-verdict-'));
  dirs.push(dir);
  const rows = Array.from({ length: seeds }, (_, seed) =>
    [['control', 2], ['nudge:1', 10], ['A', 2], ['B', 10]].map(([spec, births]) =>
      JSON.stringify({ seed: String(seed), spec, summary: spec, profile: 'normal', fork: 0, days: 1,
        finalHash: spec === 'nudge:1' ? 'other' : 'same', outcome: { births }, divergedAfterTicks: null })));
  writeFileSync(join(dir, 'lab_fixture.jsonl'), rows.flat().join('\n'));
  return dir;
}

it('judges each metric against its paired reference even when final hashes match', () => {
  const out = report(verdictFixture(1), '--vs', 'A:B');
  expect(out).toMatch(/births\s+6\.0\s+2\.0\s+-4\.0[^\n]*too few seeds to say/);
  expect(out).toMatch(/births\s+2\.0\s+10\.0\s+-8\.0[^\n]*too few seeds to say/);
}, 120000);

it.each([[1, 'too few seeds to say'], [6, 'no noise floor to judge against']] as const)(
  'preserves uncertainty with %i seeds in branch and direct-contrast summaries', (seeds, reason) => {
    const out = report(verdictFixture(seeds), '--vs', 'A:B');
    for (const heading of ['── A:', '── A − B:']) {
      const section = out.split(heading)[1].split('──')[0];
      expect(section).toContain('In words: 1 metric: ' + reason);
    }
  }, 120000);
