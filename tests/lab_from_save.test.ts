// Stage 1c step 3 of the plan of 17 November 2026: the lab starts from a saved settlement (scripts/lab_seed.ts --load, scripts/lab.mjs --saves).
// In process: a control (and a nudge) run from a save by the lab's own branch runner ends in the same state as the same save continued by
// the measuring scripts' own steps (scripts/world_args.ts worldFromArgs, then N draws for a nudge, then the steps, as generation_trace.ts
// does), and as the world that wrote the save continuing without a save at all. Out of process: the runners refuse a fresh-world option
// beside --load or --saves rather than quietly ignoring it. The end to end check on a real day 48 save is in
// review_evidence/stage1c-20261118/RESULT_from_save.txt.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention, runBranch, runLab } from '../scripts/lab/lab';
import { worldFromArgs } from '../scripts/world_args';

const DAYS = 0.25; // 600 ticks: enough for a nudge to part from the control, short enough for a test

function savedWorld() {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  while (w.tick < DAY) stepWorld(w); // a whole day, as the lab forks on a whole day
  const dir = mkdtempSync(join(tmpdir(), 'lab-from-save-'));
  const path = join(dir, 'river-day1.save.json');
  writeFileSync(path, serializeWorld(w));
  return { w, path };
}
const optOf = (o: Record<string, string>) => (name: string, dflt: string) => o[name] ?? dflt;

/** what scripts/generation_trace.ts does with a save: load it, draw `nudge` numbers, step the days */
function traceHash(path: string, days: number, nudge: number): string {
  const { w } = worldFromArgs(optOf({ load: path }));
  for (let k = 0; k < nudge; k++) w.rng.next();
  const end = w.tick + days * DAY;
  while (w.tick < end) stepWorld(w);
  return hashWorld(w);
}

describe('the lab from a saved settlement', () => {
  it('a control and a nudge from a save end where the measuring scripts and the unsaved world end', () => {
    const { w, path } = savedWorld();
    const { w: loaded, startDay } = worldFromArgs(optOf({ load: path }));
    expect(startDay).toBe(1);
    expect(loaded.tick).toBe(DAY);
    const saved = serializeWorld(loaded);
    const control = runBranch(saved, parseIntervention('control'), DAYS, 120);
    const nudge1 = runBranch(saved, parseIntervention('nudge:1'), DAYS, 120, control.hashes);
    const nudge2 = runBranch(saved, parseIntervention('nudge:2'), DAYS, 120, control.hashes);
    // the same save, continued by the measuring scripts' own steps
    expect(control.finalHash).toBe(traceHash(path, DAYS, 0));
    expect(nudge1.finalHash).toBe(traceHash(path, DAYS, 1));
    expect(nudge2.finalHash).toBe(traceHash(path, DAYS, 2));
    // the world that wrote the save, never saved, simply carrying on
    for (let n = 0; n < DAYS * DAY; n++) stepWorld(w);
    expect(control.finalHash).toBe(hashWorld(w));
    // and a nudge is a different world from the control (the noise floor has something to measure)
    expect(nudge1.finalHash).not.toBe(control.finalHash);
    expect(nudge1.finalHash).not.toBe(nudge2.finalHash);
    expect(nudge1.divergedAfterTicks).not.toBeNull();
  }, 240000);

  it('runLab from a save does not step the world before the fork: every arm starts from the save, and days are days to continue', () => {
    const { path } = savedWorld();
    const { w, startDay } = worldFromArgs(optOf({ load: path }));
    const rows = runLab(w, startDay, DAYS, ['nudge:1'], 120);
    expect(w.tick).toBe(DAY); // runLab leaves the loaded world where the save was
    expect(rows.map((r) => r.spec)).toEqual(['control', 'nudge:1']);
    for (const r of rows) expect(r.popByDay.length).toBe(0); // 0.25 days: no whole day was run, and none was run before the fork
    expect(rows[0].finalHash).toBe(traceHash(path, DAYS, 0));
  }, 240000);

  it('the runners refuse a fresh-world option beside a save, and --rules-up without one', () => {
    const run = (script: string[], ...rest: string[]) => spawnSync(process.execPath, [...script, ...rest], { encoding: 'utf8', cwd: process.cwd() });
    const { path } = savedWorld();
    const values: Record<string, string> = { '--seeds': '3', '--fork': '0', '--profile': 'large', '--dynamics': 'rich', '--arrivals': 'on', '--rules': '250' };
    for (const [o, v] of Object.entries(values)) {
      const r = run(['scripts/lab.mjs'], '--saves', path, o, v);
      expect(r.status, `${o}: ${r.stderr}`).not.toBe(0);
      expect(r.stderr).toContain(`${o} cannot be combined with --saves`);
    }
    const noSave = run(['scripts/lab.mjs'], '--rules-up', '255');
    expect(noSave.status).not.toBe(0);
    expect(noSave.stderr).toContain('--rules-up only goes with --saves');
    const missing = run(['scripts/lab.mjs'], '--saves', join(tmpdir(), 'no-such-save.json'));
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain('no such save');
  }, 60000);
});
