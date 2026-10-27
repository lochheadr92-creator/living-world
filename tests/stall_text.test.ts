import { expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { createSite } from '../src/sim/buildings';
import { generateOptions } from '../src/sim/decision';
import { putBelief } from '../src/sim/knowledge';
import { currentWorldSettings } from '../src/sim/profiles';

it('derives the building-site shortfall from the ledger, not the stale belief (rules 32)', () => {
  const w = createWorld(currentWorldSettings('normal', 'river', { immigration: false }));
  const p = w.persons[0];
  p.needs = { hunger: 100, thirst: 100, energy: 100, warmth: 100, safety: 100, social: 100 };
  const st = createSite(w, 'hut', 12, 12, p.hhId, p.id);
  st.delivered = { wood: 3 };
  // the person's belief is stale: it still thinks the full 8 wood + 4 stone are missing
  putBelief(p, { id: st.id, kind: 'site', x: st.x, y: st.y, btype: 'hut', hh: p.hhId, need: { wood: 8, stone: 4 }, progress: 0.2, amount: 0, max: 0, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
  const ctx = generateOptions(w, p, true, true);
  const blk = ctx.blocked.find((b) => b.targetId === st.id && b.kind === 'build');
  expect(blk).toBeDefined();
  expect(blk!.blocked).toContain('5 wood');   // 8 required minus 3 delivered
  expect(blk!.blocked).not.toContain('8 wood');
});
