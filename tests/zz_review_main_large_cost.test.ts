// REVIEW-ONLY measurement (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// Current-rules (115) Large profile, fresh world, one day: tick time distribution, inspector cost, serialized size.
// A fresh day-1 world is NOT mature-world evidence; this only anchors current-rules cost against the retained
// rules-63 fresh-Large and rules-109 mature-Large figures in docs/AUTONOMY_VALIDATION.md and docs/MATURE_LARGE_109.md.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson } from '../src/sim/inspect';

const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };

describe('REVIEW: current-rules Large cost sample', () => {
  it('large meadow, 2,400 ticks', () => {
    const w = createWorld(currentWorldSettings('large', 'meadow', { immigration: false }));
    const ticks: number[] = [];
    const t0 = performance.now();
    for (let t = 0; t < 2400; t++) { const a = performance.now(); stepWorld(w); ticks.push(performance.now() - a); }
    const total = performance.now() - t0;
    const insp: number[] = [];
    for (const p of w.persons) { if (!p.alive) continue; const a = performance.now(); describePerson(w, p.id, { opportunities: true }); insp.push(performance.now() - a); }
    const s0 = performance.now(); const json = serializeWorld(w); const saveMs = performance.now() - s0;
    const l0 = performance.now(); const w2 = deserializeWorld(json); const loadMs = performance.now() - l0;
    const out = { rules: w.settings.rulesVersion, profile: w.settings.profile, W: w.W, H: w.H, alive: w.persons.filter((p) => p.alive).length, buildings: w.buildings.length, sources: w.sources.length,
      tickMs: { p50: q(ticks, 0.5), p95: q(ticks, 0.95), max: Math.max(...ticks), mean: total / 2400, totalSec: total / 1000 },
      inspectMs: { p50: q(insp, 0.5), p95: q(insp, 0.95), max: Math.max(...insp), n: insp.length },
      serializedBytes: json.length, saveMs, loadMs, reloadSame: serializeWorld(w2) === json };
    writeFileSync('C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/large-cost.json', JSON.stringify(out, null, 1));
    expect(out.alive).toBeGreaterThan(50);
  });
});
