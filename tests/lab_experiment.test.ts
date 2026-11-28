import { afterEach, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
