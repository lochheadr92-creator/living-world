// REVIEW REPRODUCTION (agent A). Tool records vs item counts: a tool on a workshop bench (loan.lender === 0) is skipped by
// retagTools when its COUNT leaves the building for anybody but the borrower, so the record is stranded on the building.
// The stranded record is then worn out by the bench worker: breakTool records a consumption no container paid for.
import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { conservationReport, transfer } from '../src/sim/economy';
import { carryCap, stageOf } from '../src/sim/people';
import { isFreeLand } from '../src/sim/registry';
import { benchTool, mintTool, wearTool } from '../src/sim/tools';
import { toolReport, toolsHeldBy } from '../src/sim/toolreg';
import type { Person, World } from '../src/sim/types';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { natural, run } from './helpers/util';

/** a product world: rich dynamics at the current rules version (profiles.ts currentWorldSettings) */
const rich = (seed: string): World => createWorld(currentWorldSettings('normal', seed, { immigration: false }));

function freeSpot(w: World, nx: number, ny: number, bw: number, bh: number): { x: number; y: number } {
  for (let r = 2; r < 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.floor(nx) + dx;
        const y = Math.floor(ny) + dy;
        let ok = x > 2 && y > 2 && x + bw < w.W - 2 && y + bh + 1 < w.H - 2;
        for (let yy = y - 1; ok && yy <= y + bh; yy++) for (let xx = x - 1; ok && xx <= x + bw; xx++) if (!isFreeLand(w, xx, yy)) ok = false;
        if (ok) return { x, y };
      }
    }
  }
  throw new Error('no free spot');
}

/** STAGING: a public timber yard with one saw on its rack, beside two adults of different households. */
function stage(seed: string, product = false) {
  const w = product ? rich(seed) : natural(seed);
  const adults = w.persons.filter((p) => stageOf(w, p) === 'adult');
  const worker = adults[0];
  const taker = adults.find((p) => p.hhId !== worker.hhId) ?? adults[1];
  const spot = freeSpot(w, worker.x, worker.y, 3, 2);
  const yard = createBuilding(w, 'timber_yard', spot.x, spot.y, 0);
  // the rack saw is created through the real minting path (ledgered as created, so the books stay balanced)
  const saw = mintTool(w, 'saw', 0, 0, yard.id, yard.store.items, 0, 'staged: saw left on the yard rack');
  // both people stand at the door, idle, and will not be re-decided during the staged activity
  for (const p of [worker, taker]) {
    p.x = yard.doorX + 0.5; p.y = yard.doorY + 0.5; p.px = p.x; p.py = p.y;
    p.activity = null; p.suspended = null; p.nextThink = w.tick + 5000; p.cooldowns.pause = 0;
    delete p.indoors;
  }
  // no re-snapshot: createWorld already took the initial snapshot, and mintTool(ledger=true) recorded the saw as created
  return { w, yard, saw, worker, taker };
}

function withdrawSaw(w: World, taker: Person, yardId: number) {
  const a = newActivity(w, taker, { kind: 'withdraw', label: 'Collect the saw', goal: 'review staging', targetId: yardId, targetType: 'building', here: true, utility: 100, minCommit: 100, maxTicks: 300, data: { items: { saw: 1 } } });
  startActivity(w, taker, a);
  return a;
}

describe('review A: tool records and counts', () => {
  it('control: taking the rack saw while nobody is at the bench keeps records and counts together', () => {
    const { w, yard, saw, taker } = stage('review-a-tools-control');
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    withdrawSaw(w, taker, yard.id);
    run(w, 30);
    expect(taker.inv.saw).toBe(1);
    expect(yard.store.items.saw ?? 0).toBe(0);
    expect(saw.holder).toBe(taker.id);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('defect: taking the rack saw while the yard worker has it on the bench strands the record on the building', () => {
    const { w, yard, saw, worker, taker } = stage('review-a-tools-bench');
    expect(toolReport(w).ok).toBe(true);
    // the worker is at the bench: facilities.workJob renews this every work tick (facilities.ts:326)
    expect(benchTool(w, worker, yard.id, 'saw')).toBe(saw);
    withdrawSaw(w, taker, yard.id);
    run(w, 30, () => { if (saw.holder === yard.id) benchTool(w, worker, yard.id, 'saw'); });
    // the count moved by the real withdraw handler (act_resource.ts withdraw -> economy.transfer)
    expect(taker.inv.saw).toBe(1);
    expect(yard.store.items.saw ?? 0).toBe(0);
    // ...but the record did not (toolreg.ts:50 skips a bench-loaned tool unless it goes to the borrower)
    expect(saw.holder).toBe(yard.id);
    expect(toolsHeldBy(w, taker.id, 'saw').length).toBe(0);
    const rep = toolReport(w);
    expect(rep.ok).toBe(false);
    console.log('toolReport after withdraw:', rep.problems);
    // counts are still conserved at this point
    expect(conservationReport(w).ok).toBe(true);
    // the worker keeps using the "bench saw" (bestOf finds it by holder) until it wears out: breakTool charges the ledger
    // for a unit no container held (tools.ts:143-145 ignores takeFrom's result)
    saw.wear = 99.99;
    expect(wearTool(w, saw, 1)).toBe(true);
    const cr = conservationReport(w);
    console.log('conservation after the stranded saw broke:', JSON.stringify(cr.diffs));
    expect(cr.ok).toBe(false);
    expect(cr.diffs.length).toBe(1);
    expect(cr.diffs[0].item).toBe('saw');
    expect(cr.diffs[0].actual).toBe(cr.diffs[0].expected + 1); // one more saw exists than the books allow
  });

  it('defect, product world (rich, current rules): the same withdraw strands the record and later breaks conservation', () => {
    const { w, yard, saw, worker, taker } = stage('review-a-tools-rich', true);
    expect(w.settings.dynamics).toBe('rich');
    console.log('rules version of the staged product world:', w.settings.rulesVersion);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    benchTool(w, worker, yard.id, 'saw');
    withdrawSaw(w, taker, yard.id);
    run(w, 30, () => { if (saw.holder === yard.id) benchTool(w, worker, yard.id, 'saw'); });
    expect(taker.inv.saw).toBe(1);
    expect(saw.holder).toBe(yard.id);
    expect(toolReport(w).ok).toBe(false);
    saw.wear = 99.99;
    expect(wearTool(w, saw, 1)).toBe(true);
    const cr = conservationReport(w);
    console.log('rich world, conservation after the stranded saw broke:', JSON.stringify(cr.diffs));
    expect(cr.ok).toBe(false);
    expect(cr.diffs.map((d) => d.item)).toEqual(['saw']);
  });

  it('the same strand happens through economy.transfer directly (the call the withdraw handler makes)', () => {
    const { w, yard, saw, worker, taker } = stage('review-a-tools-direct');
    benchTool(w, worker, yard.id, 'saw');
    const moved = transfer(w, yard.store.items, taker.inv, carryCap(w, taker), 'saw', 1, 'building:' + yard.id, 'person:' + taker.id, 'withdraw');
    expect(moved).toBe(1);
    expect(saw.holder).toBe(yard.id);
    expect(toolReport(w).ok).toBe(false);
  });
});
