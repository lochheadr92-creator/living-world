import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { serializeWorld } from '../src/app/save';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

function directory() {
  const dir = mkdtempSync(join(tmpdir(), 'lw-lab-experiment-'));
  dirs.push(dir);
  return dir;
}

function run(out: string, overrides: Record<string, string> = {}) {
  const options = { out, seeds: '1', profile: 'normal', fork: '0', days: '0.02',
    branches: 'nudge:1', sample: '4', ...overrides };
  return spawnSync(process.execPath, ['scripts/lab.mjs', ...Object.entries(options).flatMap(([k,v]) => ['--' + k, v])],
    { encoding: 'utf8', timeout: 240000 });
}

it('rejects a changed experiment before reusing completed seeds or scratch arms', () => {
  const out = directory();
  const first = run(out);
  expect(first.status, first.stderr).toBe(0);
  const seed = join(out, 'lab_meadow.jsonl');
  const original = readFileSync(seed, 'utf8');
  const changes: Record<string, string>[] = [{ days: '1' }, { profile: 'town' }, { fork: '1' }];
  for (const change of changes) {
    const refused = run(out, change);
    expect(refused.stderr).toContain('Lab experiment differs');
    expect(refused.status).toBe(1);
    expect(readFileSync(seed, 'utf8')).toBe(original);
  }
  mkdirSync(join(out, 'arms'));
  const arm = join(out, 'arms', 'lab_meadow__0.jsonl');
  renameSync(seed, arm);
  const refused = run(out, { branches: 'nudge:2' });
  expect(refused.status).toBe(1);
  expect(refused.stderr).toContain('Lab experiment differs');
  expect(readFileSync(arm, 'utf8')).toBe(original);
}, 900000);

it('samples both execution modes at the requested interval within a sub-120-tick run', () => {
  const divergence = ['serial', 'parallel'].map(arms => {
    const out = directory();
    const result = run(out, { arms });
    expect(result.status, result.stderr).toBe(0);
    const lines = readFileSync(join(out, 'lab_meadow.jsonl'), 'utf8').trim().split('\n');
    return JSON.parse(lines[1]).divergedAfterTicks;
  });
  expect(divergence).toEqual([4, 4]);
}, 900000);

it('refuses old measurements when the input save is replaced at the same path', () => {
  const saves = join(directory(), 'settlement.save.json');
  const out = directory();
  const save = (seed: string) => writeFileSync(saves, serializeWorld(createWorld(currentWorldSettings('normal', seed))));
  const measure = () => spawnSync(process.execPath, ['scripts/lab.mjs', '--saves', saves, '--out', out,
    '--days', '0.01', '--branches', 'none'], { encoding: 'utf8', timeout: 240000 });
  save('meadow');
  const first = measure();
  expect(first.status, first.stderr).toBe(0);
  const rows = join(out, 'lab_settlement.jsonl');
  const before = readFileSync(rows, 'utf8');
  save('river');
  const refused = measure();
  expect(refused.status).toBe(1);
  expect(refused.stderr).toContain('Lab experiment differs');
  expect(readFileSync(rows, 'utf8')).toBe(before);
}, 900000);
