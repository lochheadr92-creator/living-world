import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld, defaultSettings } from '../src/sim/factory';
import { conservationReport } from '../src/sim/economy';
import { toolReport } from '../src/sim/toolreg';
import { hashWorld, runTicks } from '../src/sim/world';

/**
 * The ordinary seeded world, with nothing staged. These tests check that the machinery keeps its books and its promises over
 * days of unscripted play; what is emergent is only asserted loosely (that something of each kind happened), never scripted.
 */
describe('the ordinary world over days of play', () => {
  it('is deterministic: the same seed and settings give the same world, tick for tick, however much was built, made, promised and eaten', () => {
    const a = createWorld({ ...defaultSettings('ordinary-determinism') });
    const b = createWorld({ ...defaultSettings('ordinary-determinism') });
    for (let i = 0; i < 4; i++) {
      runTicks(a, 1500);
      runTicks(b, 1500);
      expect(hashWorld(b)).toBe(hashWorld(a));
    }
  }, 120000);

  it('keeps honest books for two weeks: every item accounted for, every tool record matching a pack or shelf, nobody lost, and the settlement doing real work', () => {
    const w = createWorld({ ...defaultSettings('river') });
    for (let day = 1; day <= 14; day++) {
      runTicks(w, DAY);
      if (day % 4 === 0) {
        expect(conservationReport(w).ok, `ledger on day ${day}`).toBe(true);
        expect(toolReport(w).ok, `tools on day ${day}: ${toolReport(w).problems.slice(0, 3).join('; ')}`).toBe(true);
      }
    }
    expect(conservationReport(w).ok).toBe(true);
    expect(toolReport(w).ok).toBe(true);
    // nobody starved, froze or was eaten in an ordinary world over these two weeks
    expect(w.deceased.map((d) => `${d.name}:${d.cause}`)).toEqual([]);
    for (const p of w.persons) {
      for (const k of Object.keys(p.needs) as (keyof typeof p.needs)[]) expect(Number.isFinite(p.needs[k]), `${p.name} ${k}`).toBe(true);
      for (const c of p.commitments) expect(c.deadline, 'promises have deadlines').toBeGreaterThan(0);
    }
    // workshops appeared and worked; the batches really happened
    const shops = w.buildings.filter((b) => b.ops);
    expect(shops.length).toBeGreaterThan(0);
    expect(shops.reduce((n, b) => n + (b.ops?.batches ?? 0), 0)).toBeGreaterThan(5);
    // the ledger knows where planks and bricks came from
    const made = Object.keys(w.ledger.reasons).filter((k) => k.startsWith('+made '));
    expect(made.length).toBeGreaterThan(0);
    // at least one shared meal was eaten, and every meal that did not happen says why
    expect(w.meals.some((m) => m.status === 'done')).toBe(true);
    for (const m of w.meals) if (m.status === 'cancelled') expect(m.end.length).toBeGreaterThan(3);
    // every promise that has ended says how
    let ended = 0;
    for (const p of w.persons) for (const c of p.commitments) if (c.status !== 'active') ended++;
    expect(ended).toBeGreaterThan(0);
  }, 240000);
});
