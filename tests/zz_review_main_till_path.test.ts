// REVIEW-ONLY probe (adversarial review, 2026-11-01). Not a product test. Safe to delete.
// "Breaking new ground" ends "failed: no way to get there" far more often than it succeeds in ordinary forest/river
// worlds. This probe records, per failure, who, when, the chosen plot tile and whether the standing tile south of it
// (activities use spotY = y + 1.5) is walkable, to show whether the same person retries the same unreachable tile.
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { isWalkable } from '../src/sim/registry';
import { T } from '../src/sim/types';
import { reviewOut } from './helpers/review_out';

describe('REVIEW: new-field tilling that cannot be reached', () => {
  for (const seed of ['forest', 'river']) {
    it(`${seed}: who fails, which tile, is the standing tile walkable`, () => {
      const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
      const rows: { tick: number; who: string; px: number; py: number; southWalkable: boolean; southTerrain: number; outcome: string; detail: string }[] = [];
      const live = new Map<number, { px: number; py: number }>();
      const seen = new Map<number, unknown>();
      for (let t = 0; t < 12_000; t++) {
        stepWorld(w);
        for (const p of w.persons) {
          if (!p.alive) continue;
          const a = p.activity;
          if (a && a.kind === 'till' && a.label === 'Breaking new ground') live.set(p.id, { px: a.data.px, py: a.data.py });
          const r = p.lastResult;
          if (r && seen.get(p.id) !== r) {
            seen.set(p.id, r);
            if (r.label === 'Breaking new ground') {
              const at = live.get(p.id);
              if (at) {
                const sx = at.px, sy = at.py + 1;
                rows.push({ tick: w.tick, who: p.name, px: at.px, py: at.py, southWalkable: isWalkable(w, sx, sy), southTerrain: w.terrain[sy * w.W + sx], outcome: r.outcome, detail: r.detail });
              }
            }
          }
        }
      }
      const byWho: Record<string, number> = {};
      for (const r of rows) if (r.outcome === 'failed') byWho[`${r.who}@${r.px},${r.py}`] = (byWho[`${r.who}@${r.px},${r.py}`] ?? 0) + 1;
      const out = { seed, failures: rows.filter((r) => r.outcome === 'failed').length, successes: rows.filter((r) => r.outcome === 'success').length, failedWithUnwalkableSouth: rows.filter((r) => r.outcome === 'failed' && !r.southWalkable).length, repeatsSamePersonSameTile: Object.entries(byWho).filter(([, n]) => n > 1), rows: rows.slice(0, 60), T };
      writeFileSync(`${reviewOut()}/till-${seed}.json`, JSON.stringify(out, null, 1));
      expect(rows.length).toBeGreaterThan(0);
    });
  }
});
