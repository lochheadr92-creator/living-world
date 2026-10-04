import { describe, expect, it } from 'vitest';
import { abortActivity, newActivity, startActivity } from '../src/sim/activities';
import { claimPlot, claimSlot, claimUnits, conservationReport, releaseClaim, snapshotInitial } from '../src/sim/economy';
import { createPlot } from '../src/sim/farming';
import { killPerson } from '../src/sim/lifecycle';
import { natural, person, run, scene } from './helpers/util';

describe('contested resources', () => {
  it('two people reaching the last berry: one gets it, the other gets a recorded failure, nothing is duplicated', () => {
    const w = scene('contest');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const bush = w.sources.find((s) => s.type === 'berry_bush')!;
    const totalBefore = (ana.inv.berries ?? 0) + (ben.inv.berries ?? 0) + bush.amount;
    expect(totalBefore).toBe(1);
    const eatenBefore = w.ledger.consumed.berries ?? 0;
    run(w, 120);
    const got = [ana, ben].filter((p) => (p.inv.berries ?? 0) > 0 || p.lastAteTick > 0);
    // exactly one berry left the bush; eaten or carried, it exists once
    const held = (ana.inv.berries ?? 0) + (ben.inv.berries ?? 0);
    const eaten = (w.ledger.consumed.berries ?? 0) - eatenBefore;
    expect(held + eaten).toBe(1);
    expect(bush.amount).toBe(0);
    // the loser has a recorded failure against the bush
    const losers = [ana, ben].filter((p) => p.failures[bush.id]);
    expect(losers.length).toBe(1);
    expect(losers[0].failures[bush.id].reason).toMatch(/someone else|nothing left/);
    expect(losers[0].log.some((l) => /last|empty|already|someone/i.test(l.text))).toBe(true);
    expect(conservationReport(w).ok).toBe(true);
    void got;
  });

  it('a claim on the last unit is exclusive until released', () => {
    const w = scene('contest');
    const ana = person(w, 'Ana');
    const ben = person(w, 'Ben');
    const bush = w.sources.find((s) => s.type === 'berry_bush')!;
    const a = claimUnits(w, ana.id, bush, 1, 50);
    const b = claimUnits(w, ben.id, bush, 1, 50);
    expect(a).toBeGreaterThan(0);
    expect(b).toBe(0);
    expect(bush.reserved).toBe(1);
    releaseClaim(w, a);
    expect(bush.reserved).toBe(0);
    expect(claimUnits(w, ben.id, bush, 1, 50)).toBeGreaterThan(0);
  });

  it('who wins does not depend on which person is listed first', () => {
    // the winner is decided by the claim, not by array order: both orderings leave exactly one berry gone
    for (const flip of [false, true]) {
      const w = scene('contest');
      if (flip) w.persons.reverse();
      run(w, 120);
      const bush = w.sources.find((s) => s.type === 'berry_bush')!;
      expect(bush.amount).toBe(0);
      expect(conservationReport(w).ok).toBe(true);
    }
  });

  it('worker slots and plots are exclusive too', () => {
    const w = scene('cooperate');
    const mira = person(w, 'Mira');
    const tomas = person(w, 'Tomas');
    const site = w.sites[0];
    site.maxWorkers = 1;
    expect(claimSlot(w, mira.id, site, 100)).toBeGreaterThan(0);
    expect(claimSlot(w, tomas.id, site, 100)).toBe(0);
    const plot = createPlot(w, 30, 50, mira.hhId);
    expect(claimPlot(w, mira.id, plot, 100)).toBeGreaterThan(0);
    expect(claimPlot(w, tomas.id, plot, 100)).toBe(0);
  });
});

describe('reservations are released', () => {
  function gatheringContest() {
    const w = scene('contest');
    const bush = w.sources.find((s) => s.type === 'berry_bush')!;
    bush.amount = 4;
    snapshotInitial(w); // staged a fuller bush: re-baseline the ledger
    const ana = person(w, 'Ana');
    let guard = 0;
    while (!(ana.activity && ana.activity.kind === 'gather' && ana.activity.phase === 'work' && ana.activity.claims.length > 0) && guard++ < 400) run(w, 1);
    return { w, bush, ana };
  }

  it('an interrupted gather gives its claim back and takes nothing', () => {
    const { w, bush, ana } = gatheringContest();
    expect(bush.reserved).toBeGreaterThanOrEqual(1);
    const before = bush.amount;
    abortActivity(w, ana, 'test interruption');
    expect(ana.activity).toBeNull();
    expect([...w.reservations.values()].filter((r) => r.owner === ana.id)).toHaveLength(0);
    expect(bush.amount).toBe(before);
    expect(bush.reserved).toBeLessThanOrEqual(1); // only the other person's claim may remain
    expect(conservationReport(w).ok).toBe(true);
  });

  it('switching to a different activity releases the old claims', () => {
    const { w, ana } = gatheringContest();
    const other = newActivity(w, ana, { kind: 'wander', label: 'Wander', goal: 'test', here: true, maxTicks: 50 });
    startActivity(w, ana, other);
    expect([...w.reservations.values()].filter((r) => r.owner === ana.id)).toHaveLength(0);
  });

  it('dying while holding a claim releases it', () => {
    const { w, bush, ana } = gatheringContest();
    killPerson(w, ana, 'test');
    expect([...w.reservations.values()].filter((r) => r.owner === ana.id)).toHaveLength(0);
    // no claim leaks onto the source from the dead person
    let sum = 0;
    for (const r of w.reservations.values()) if (r.kind === 'unit' && r.target === bush.id) sum += r.amount;
    expect(bush.reserved).toBe(sum);
  });

  it('in a long natural run every reservation belongs to a living person with a matching activity, and source counters add up', () => {
    const w = natural('reservation-audit');
    for (let step = 0; step < 24; step++) {
      run(w, 150);
      const bySource = new Map<number, number>();
      for (const r of w.reservations.values()) {
        const owner = w.byId.get(r.owner);
        expect(owner && owner.ent === 'person' && owner.alive, `owner of reservation ${r.id}`).toBe(true);
        if (r.kind === 'unit') bySource.set(r.target, (bySource.get(r.target) ?? 0) + r.amount);
        const p = person(w, (owner as { name: string }).name);
        const held = [...(p.activity?.claims ?? []), ...(p.suspended?.claims ?? [])];
        expect(held.includes(r.id), `${p.name} should hold claim ${r.id} (${r.kind})`).toBe(true);
        expect(r.expires).toBeGreaterThanOrEqual(w.tick - 1);
      }
      for (const s of w.sources) expect(s.reserved, `source ${s.id}`).toBe(bySource.get(s.id) ?? 0);
    }
  });
});
