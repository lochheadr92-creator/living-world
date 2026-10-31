// Equipment exists twice on purpose: as a count in the holder's items and as a Tool record (toolreg.ts). A transfer must keep
// the two together. A tool on a workshop bench (loan.lender === 0, lent to the bench worker) cannot be retagged to anyone else,
// so its COUNT must not leave the building either (review A1): otherwise the record is stranded, the bench worker keeps using a
// tool nobody holds, and breakTool later charges the ledger for a unit no container paid for.
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
import { run } from './helpers/util';

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

/** STAGED: a public timber yard with one saw on its rack, beside two adults of different households, both idle at the door. */
function stage(seed: string) {
  const w = createWorld(currentWorldSettings('normal', seed, { immigration: false }));
  const adults = w.persons.filter((p) => stageOf(w, p) === 'adult');
  const worker = adults[0];
  const taker = adults.find((p) => p.hhId !== worker.hhId) ?? adults[1];
  const spot = freeSpot(w, worker.x, worker.y, 3, 2);
  const yard = createBuilding(w, 'timber_yard', spot.x, spot.y, 0);
  const saw = mintTool(w, 'saw', 0, 0, yard.id, yard.store.items, 0, 'staged: saw left on the yard rack');
  for (const p of [worker, taker]) {
    p.x = yard.doorX + 0.5; p.y = yard.doorY + 0.5; p.px = p.x; p.py = p.y;
    p.activity = null; p.suspended = null; p.nextThink = w.tick + 5000; p.cooldowns.pause = 0;
    delete p.indoors;
  }
  return { w, yard, saw, worker, taker };
}

function withdrawSaw(w: World, taker: Person, yardId: number) {
  const a = newActivity(w, taker, { kind: 'withdraw', label: 'Collect the saw', goal: 'staged', targetId: yardId, targetType: 'building', here: true, utility: 100, minCommit: 100, maxTicks: 300, data: { items: { saw: 1 } } });
  startActivity(w, taker, a);
  return a;
}

describe('tool transfers keep counts and records together', () => {
  it('control: the rack saw leaves with its record when nobody is at the bench', () => {
    const { w, yard, saw, taker } = stage('tool-transfer-control');
    expect(toolReport(w).ok).toBe(true);
    withdrawSaw(w, taker, yard.id);
    run(w, 30);
    expect(taker.inv.saw).toBe(1);
    expect(yard.store.items.saw ?? 0).toBe(0);
    expect(saw.holder).toBe(taker.id);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('a saw on the bench stays with the building: count and record together, and a later break balances', () => {
    const { w, yard, saw, worker, taker } = stage('tool-transfer-bench');
    expect(toolReport(w).ok).toBe(true);
    expect(benchTool(w, worker, yard.id, 'saw')).toBe(saw);
    withdrawSaw(w, taker, yard.id);
    run(w, 30, () => { if (saw.holder === yard.id) benchTool(w, worker, yard.id, 'saw'); });
    expect(taker.inv.saw ?? 0).toBe(0);
    expect(yard.store.items.saw ?? 0).toBe(1);
    expect(saw.holder).toBe(yard.id);
    expect(toolsHeldBy(w, yard.id, 'saw').length).toBe(1);
    expect(toolReport(w).ok).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    saw.wear = 99.99;
    expect(wearTool(w, saw, 1)).toBe(true);
    expect(yard.store.items.saw ?? 0).toBe(0);
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
  });

  it('economy.transfer itself moves no more tools than it can retag', () => {
    const { w, yard, saw, worker, taker } = stage('tool-transfer-direct');
    benchTool(w, worker, yard.id, 'saw');
    const moved = transfer(w, yard.store.items, taker.inv, carryCap(w, taker), 'saw', 1, 'building:' + yard.id, 'person:' + taker.id, 'withdraw');
    expect(moved).toBe(0);
    expect(yard.store.items.saw ?? 0).toBe(1);
    expect(saw.holder).toBe(yard.id);
    expect(toolReport(w).ok).toBe(true);
    // the bench worker, the borrower, may still take it out
    const own = transfer(w, yard.store.items, worker.inv, carryCap(w, worker), 'saw', 1, 'building:' + yard.id, 'person:' + worker.id, 'withdraw');
    expect(own).toBe(1);
    expect(saw.holder).toBe(worker.id);
    expect(toolReport(w).ok).toBe(true);
  });
});
