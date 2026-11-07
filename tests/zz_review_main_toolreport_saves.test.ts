// REVIEW-ONLY probe (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Does the tool count/record divergence (agent A finding A1) occur naturally? Run toolReport + conservationReport on
// retained ordinary saves (read-only) and on fresh current-rules worlds run for five days.
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { deserializeWorld } from '../src/app/save';
import { toolReport } from '../src/sim/toolreg';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { reviewOut } from './helpers/review_out';

const SAVES: Record<string, string> = {
  mature109_large_meadow_day45: 'C:/dev/Claude Experiment/living-world-completion/autonomy_evidence/mature109-large-meadow-45/final-save.json',
  forest107_day18_first_invalid: 'C:/dev/Claude Experiment/living-world-integrate/autonomy_evidence/helper-receipt107-first-invalid/final.json',
  forest_batch_rejected_43326: 'C:/dev/Claude Experiment/living-world-integrate/verification_evidence/forest-save-20261031/rejected.json',
  current113_river_45: 'C:/dev/Claude Experiment/living-world-continuation/autonomy_evidence/current113-river-45/final.json',
  current113_meadow_45: 'C:/dev/Claude Experiment/living-world-continuation/autonomy_evidence/current113-meadow-45/final.json',
  current113_forest_45: 'C:/dev/Claude Experiment/living-world-continuation/autonomy_evidence/current113-forest-45/final.json',
};

describe('REVIEW: tool registry consistency in retained and fresh worlds', () => {
  it('retained saves', () => {
    const out: Record<string, unknown> = {};
    for (const [name, path] of Object.entries(SAVES)) {
      if (!existsSync(path)) { out[name] = 'absent'; continue; }
      try {
        const w = deserializeWorld(readFileSync(path, 'utf8'));
        const tr = toolReport(w); const cr = conservationReport(w);
        out[name] = { rules: w.settings.rulesVersion, tick: w.tick, alive: w.persons.filter((p) => p.alive).length, tools: w.tools.length, toolReportOk: tr.ok, problems: tr.problems.slice(0, 8), conservationOk: cr.ok, diffs: cr.diffs };
      } catch (e) { out[name] = 'load error: ' + (e as Error).message; }
    }
    writeFileSync(reviewOut() + '/toolreport-saves.json', JSON.stringify(out, null, 1));
    expect(Object.keys(out).length).toBeGreaterThan(0);
  });
  it('fresh current-rules worlds, 12,000 ticks, checked every 600 ticks', () => {
    const out: Record<string, unknown> = {};
    for (const seed of ['forest', 'river', 'meadow']) {
      const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
      let first: unknown = null;
      for (let t = 1; t <= 12_000; t++) { stepWorld(w); if (t % 600 === 0) { const tr = toolReport(w); const cr = conservationReport(w); if ((!tr.ok || !cr.ok) && !first) first = { tick: t, problems: tr.problems.slice(0, 6), diffs: cr.diffs }; } }
      out[seed] = { tools: w.tools.length, firstProblem: first };
    }
    writeFileSync(reviewOut() + '/toolreport-fresh.json', JSON.stringify(out, null, 1));
    expect(Object.keys(out).length).toBe(3);
  });
});
