// REVIEW REPRODUCTION (agent A). A flood writes every unit in a wet pile off as spoiled (hardship.ts floodTick), tools
// included, but the Tool records of those tools stay in world.tools with the pile as holder; when the empty pile is swept
// away (world.ts spoilGoods) the records point at nothing. Counts and ledger stay balanced; the tool registry does not.
import { describe, expect, it } from 'vitest';
import { dropNear } from '../src/sim/buildings';
import { conservationReport } from '../src/sim/economy';
import { nearbyWaterFraction } from '../src/sim/hydrology';
import { isWalkable } from '../src/sim/registry';
import { mintTool } from '../src/sim/tools';
import { toolReport } from '../src/sim/toolreg';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { run } from './helpers/util';

describe('review A: flood and tool records', () => {
  it('a flooded pile loses its axe count but keeps the axe record', () => {
    // a product world: rich dynamics at the current rules version
    const w = createWorld(currentWorldSettings('normal', 'review-a-flood', { immigration: false }));
    expect(w.settings.dynamics).toBe('rich');
    const p = w.persons[0];
    // STAGING: a wet, walkable tile (the flood footprint is every land tile with half or more water within two tiles)
    let spot: { x: number; y: number } | null = null;
    for (let y = 2; y < w.H - 2 && !spot; y++) for (let x = 2; x < w.W - 2 && !spot; x++) if (isWalkable(w, x, y) && (nearbyWaterFraction(w, x, y, 2) ?? 0) >= 0.6) spot = { x, y };
    expect(spot).not.toBeNull();
    // STAGING: an axe minted into a pack through the real path, then left on the ground as a death drop would leave it
    const axe = mintTool(w, 'axe', 0, p.hhId, p.id, p.inv, p.id, 'staged: axe');
    const pile = dropNear(w, spot!.x + 0.5, spot!.y + 0.5, { axe: 1 }, 'staged belongings', p.id)!;
    p.inv.axe = (p.inv.axe ?? 0) - 1;
    if (p.inv.axe <= 0) delete p.inv.axe;
    expect(axe.holder).toBe(pile.id);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    // STAGING: the storm is pinned at full strength so floodTick's gate (storm >= 0.92 at tick % 30 === 7) is met
    w.weather.kind = 'storm';
    w.weather.storm = 1;
    w.weather.rain = 1;
    w.weather.nextChange = w.tick + 100000;
    const before = w.ledger.spoiled.axe ?? 0;
    run(w, 400, (ww) => { ww.weather.storm = 1; ww.weather.nextChange = ww.tick + 100000; });
    expect(w.lastFlood).toBeDefined();
    console.log('flood at tick', w.lastFlood, 'pile axe now', pile.items.axe ?? 0, 'ledger spoiled axe +', (w.ledger.spoiled.axe ?? 0) - before);
    expect((w.ledger.spoiled.axe ?? 0) - before).toBe(1);
    expect(pile.items.axe ?? 0).toBe(0);
    // the books balance (the loss was ledgered)...
    expect(conservationReport(w).ok).toBe(true);
    // ...but the registry still carries a record nobody holds
    expect(w.tools.includes(axe)).toBe(true);
    const rep = toolReport(w);
    console.log('toolReport after flood:', rep.problems);
    expect(rep.ok).toBe(false);
    // once spoilGoods sweeps the empty pile away, the holder id points at nothing at all
    run(w, 130);
    expect(w.piles.includes(pile)).toBe(false);
    expect(w.byId.has(pile.id)).toBe(false);
    expect(axe.holder).toBe(pile.id);
    const rep2 = toolReport(w);
    console.log('toolReport after the pile is swept:', rep2.problems);
    expect(rep2.problems.some((s) => s.includes('holds nothing'))).toBe(true);
  });
});
