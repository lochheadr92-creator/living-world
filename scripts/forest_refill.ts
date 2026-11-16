// A counterfactual for the rules-251 collapses (docs/GROWTH_PLAN.md "What the traces say caused it"): wood is made plentiful. Once a
// day, at the end of the day, every standing tree is brought back to full (the wood added goes through the goods ledger as an explicit
// experiment line) and new full-grown trees are planted on free land until the world holds as many as it was made with (`treeCap`
// is that count times 1.08). It draws no random number from the world's own state: the new tiles come from `hashUnit` of the day and
// a counter, so the only difference from the loaded world is the forest. Used only with `generation_trace.ts --forest-refill on`.
import { ledgerCreate } from '../src/sim/economy';
import { hashUnit } from '../src/sim/rng';
import { isFreeLand } from '../src/sim/registry';
import { hubWithin } from '../src/sim/settlements';
import { makeSource } from '../src/sim/sources';
import { DAY } from '../src/sim/constants';
import { T } from '../src/sim/types';
import type { World } from '../src/sim/types';

export function refillForest(w: World): { topped: number; planted: number } {
  let topped = 0;
  for (const s of w.sources) {
    if (s.type !== 'tree') continue;
    if (s.growth < 1) s.growth = 1;
    if (s.amount < s.max) {
      const add = s.max - s.amount;
      s.amount = s.max;
      ledgerCreate(w, 'wood', add, 'experiment: forest refilled');
      topped += add;
    }
  }
  const target = Math.round((w.stats.treeCap ?? 0) / 1.08);
  const day = Math.floor(w.tick / DAY);
  let planted = 0;
  for (let k = 0; k < 2000 && (w.stats.trees ?? 0) < target; k++) {
    const x = Math.floor(hashUnit(day, k, 71) * w.W);
    const y = Math.floor(hashUnit(day, k, 73) * w.H);
    if (!isFreeLand(w, x, y)) continue;
    const t = w.terrain[y * w.W + x];
    if (t !== T.GRASS && t !== T.FOREST) continue;
    if (hubWithin(w, x, y, 7) || w.waterDist[y * w.W + x] <= 1) continue;
    const s = makeSource(w, 'tree', x, y, undefined, 1);
    ledgerCreate(w, 'wood', s.amount, 'experiment: forest refilled');
    planted++;
  }
  return { topped, planted };
}
