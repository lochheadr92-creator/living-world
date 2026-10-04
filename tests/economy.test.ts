import { describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { NUTRITION } from '../src/sim/constants';
import { conservationReport, consume, gatherFromSource, harvestPlot, produce, snapshotInitial, transfer } from '../src/sim/economy';
import { createPlot } from '../src/sim/farming';
import { carryCap } from '../src/sim/people';
import { stageOf } from '../src/sim/people';
import { updatePlots } from '../src/sim/farming';
import type { Source } from '../src/sim/types';
import { natural, person, run, scene } from './helpers/util';

describe('resource accounting', () => {
  it('conserves every item over long natural runs: initial + created - consumed - spoiled = what exists', () => {
    for (const seed of ['acct-a', 'acct-b', 'acct-c']) {
      const w = natural(seed);
      for (let i = 0; i < 10; i++) {
        run(w, 500);
        const r = conservationReport(w);
        expect(r.diffs, `${seed} @${w.tick}`).toEqual([]);
      }
      // a rich run really exercises the processes being accounted for
      const reasons = Object.keys(w.ledger.reasons);
      expect(reasons.some((k) => k.startsWith('+regrowth'))).toBe(true);
      expect(reasons.some((k) => k === '-eaten')).toBe(true);
    }
  });

  it('gathering moves units out of the source into the pack, exactly once', () => {
    const w = scene('contest');
    const ana = person(w, 'Ana');
    const bush = w.sources.find((s) => s.type === 'berry_bush')!;
    expect(bush.amount).toBe(1);
    const before = (ana.inv.berries ?? 0) + bush.amount;
    expect(gatherFromSource(w, bush, ana, 1)).toBe(1);
    expect(bush.amount).toBe(0);
    expect(ana.inv.berries).toBe(1);
    // the source is empty: a second attempt yields nothing and changes nothing
    expect(gatherFromSource(w, bush, ana, 1)).toBe(0);
    expect(ana.inv.berries).toBe(1);
    expect((ana.inv.berries ?? 0) + bush.amount).toBe(before);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('transfers between people respect what exists and how much the receiver can carry', () => {
    const w = scene('help');
    const ben = person(w, 'Ben');
    const ana = person(w, 'Ana');
    const start = (ben.inv.berries ?? 0) + (ana.inv.berries ?? 0);
    expect(transfer(w, ben.inv, ana.inv, carryCap(w, ana), 'berries', 99, 'a', 'b', 'test')).toBe(6); // only 6 exist
    expect(ben.inv.berries ?? 0).toBe(0);
    expect(ana.inv.berries).toBe(6);
    // a full pack takes nothing more
    ana.inv.stone = 4; // 12 weight units: the pack is full (cap 12 + 6 berries... fill it properly)
    const room = carryCap(w, ana);
    ana.inv.wood = 99;
    expect(transfer(w, { berries: 5 }, ana.inv, room, 'berries', 5, 'a', 'b', 'test')).toBe(0);
    expect((ben.inv.berries ?? 0) + 6).toBe(start);
  });

  it('eating consumes the food, adds nutrition and is recorded', () => {
    const w = scene('contest');
    const ben = person(w, 'Ben');
    // isolate Ben so nobody else eats during the test, then re-baseline the ledger after staging
    for (const q of [...w.persons]) {
      if (q === ben) continue;
      w.persons.splice(w.persons.indexOf(q), 1);
      w.byId.delete(q.id);
    }
    w.sources.find((s) => s.type === 'berry_bush')!.amount = 0;
    ben.inv = { berries: 3 };
    ben.needs.hunger = 30;
    snapshotInitial(w);
    const before = w.ledger.consumed.berries ?? 0;
    const act = newActivity(w, ben, { kind: 'eat', label: 'Eating', goal: 'test', here: true, maxTicks: 400 });
    startActivity(w, ben, act);
    run(w, 80);
    const eaten = 3 - (ben.inv.berries ?? 0);
    expect(eaten).toBeGreaterThanOrEqual(2);
    expect((w.ledger.consumed.berries ?? 0) - before).toBe(eaten);
    expect(ben.needs.hunger).toBeGreaterThan(30 + eaten * NUTRITION.berries - 6);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('renewal is an explicit, recorded process: an emptied bush slowly refills', () => {
    const w = scene('contest');
    const bush = w.sources.find((s) => s.type === 'berry_bush')!;
    bush.amount = 0;
    bush.regrowTimer = 0;
    snapshotInitial(w); // staging changed the stock directly; re-baseline before measuring
    const created = w.ledger.created.berries ?? 0;
    run(w, Math.ceil(bush.regrowEvery) + 5);
    expect(bush.amount).toBeGreaterThanOrEqual(1);
    expect((w.ledger.created.berries ?? 0) - created).toBe(bush.amount);
    expect(w.ledger.reasons['+regrowth: berry bush']).toBeGreaterThanOrEqual(bush.amount);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('crops are explicit growth: seeds are consumed when sown, grain is created when it ripens, harvest moves it to a pack', () => {
    const w = scene('cooperate');
    const mira = person(w, 'Mira');
    const plot = createPlot(w, 36, 50, mira.hhId);
    plot.state = 'growing';
    plot.progress = 0.9999;
    plot.care = 1;
    plot.careAcc = 1;
    const grainBefore = w.ledger.created.grain ?? 0;
    for (let i = 0; i < 5; i++) updatePlots(w);
    expect(plot.state).toBe('ripe');
    expect(plot.stock).toBeGreaterThanOrEqual(3);
    expect((w.ledger.created.grain ?? 0) - grainBefore).toBe(plot.stock);
    const got = harvestPlot(w, plot, mira);
    expect(got.grain).toBeGreaterThan(0);
    expect(mira.inv.grain).toBe(got.grain);
    expect(plot.stock + got.grain).toBe(w.ledger.created.grain! - grainBefore);
    expect(conservationReport(w).ok).toBe(true);
  });

  it('produce and consume go through the ledger and respect capacity', () => {
    const w = scene('contest');
    const ana = person(w, 'Ana');
    const cap = carryCap(w, ana);
    const made = produce(w, ana.inv, cap, 'water', 99, 'test spring');
    expect(made).toBe(Math.floor(cap / 1.5));
    expect(w.ledger.created.water).toBe(made);
    expect(consume(w, ana.inv, 'water', 2, 'test drink')).toBe(2);
    expect(w.ledger.consumed.water).toBe(2);
    expect(stageOf(w, ana)).toBe('adult');
  });

  it('a building is paid for out of delivered materials, nothing more or less', () => {
    const w = scene('cooperate');
    run(w, 900);
    expect(w.buildings.some((b) => b.type === 'hut')).toBe(true);
    expect(w.sites.length).toBe(0);
    expect(w.ledger.reasons['-construction: hut']).toBe(8 + 4); // wood 8 + stone 4, exactly the recipe
    expect(conservationReport(w).ok).toBe(true);
    void (null as unknown as Source);
  });
});
