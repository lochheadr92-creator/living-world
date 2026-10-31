// A flood writes everything in a wet pile off as spoiled (hardship.ts floodTick), tools included. The tool COUNT is spoiled and
// ledgered; the Tool RECORD must go with it, or the registry keeps records whose holder pile no longer exists (review A2).
// Staged: a real minted axe left on a wet tile, the storm pinned at full strength so the flood gate is met.
import { describe, expect, it } from 'vitest';
import { dropNear } from '../src/sim/buildings';
import { conservationReport } from '../src/sim/economy';
import { nearbyWaterFraction } from '../src/sim/hydrology';
import { isWalkable } from '../src/sim/registry';
import { mintTool } from '../src/sim/tools';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { run } from './helpers/util';

describe('flood write-off and tool records', () => {
  it('a flooded pile loses its axe count and its axe record together', () => {
    const w = createWorld(currentWorldSettings('normal', 'flood-tool-records', { immigration: false }));
    expect(w.settings.dynamics).toBe('rich');
    const p = w.persons[0];
    let spot: { x: number; y: number } | null = null;
    for (let y = 2; y < w.H - 2 && !spot; y++) for (let x = 2; x < w.W - 2 && !spot; x++) if (isWalkable(w, x, y) && (nearbyWaterFraction(w, x, y, 2) ?? 0) >= 0.6) spot = { x, y };
    expect(spot).not.toBeNull();
    const axe = mintTool(w, 'axe', 0, p.hhId, p.id, p.inv, p.id, 'staged: axe');
    const pile = dropNear(w, spot!.x + 0.5, spot!.y + 0.5, { axe: 1 }, 'staged belongings', p.id)!;
    p.inv.axe = (p.inv.axe ?? 0) - 1;
    if (p.inv.axe <= 0) delete p.inv.axe;
    expect(axe.holder).toBe(pile.id);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    w.weather.kind = 'storm';
    w.weather.storm = 1;
    w.weather.rain = 1;
    w.weather.nextChange = w.tick + 100000;
    const before = w.ledger.spoiled.axe ?? 0;
    run(w, 400, (ww) => { ww.weather.storm = 1; ww.weather.nextChange = ww.tick + 100000; });
    expect(w.lastFlood).toBeDefined();
    expect((w.ledger.spoiled.axe ?? 0) - before).toBe(1);
    expect(pile.items.axe ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
    // the contract: no record outlives its spoiled count
    expect(w.tools.includes(axe)).toBe(false);
    expect(toolsHeldBy(w, pile.id).length).toBe(0);
    expect(toolReport(w).ok).toBe(true);
    // and once the empty pile is swept, nothing points at it
    run(w, 130);
    expect(w.piles.includes(pile)).toBe(false);
    expect(toolReport(w).ok).toBe(true);
  });
});
