import { describe, expect, it } from 'vitest';
import { describePerson, summarizeWorld } from '../src/sim/inspect';
import { hashWorld } from '../src/sim/world';
import { natural, run, scene } from './helpers/util';

describe('determinism', () => {
  it('the same seed and settings give the same world after the same number of ticks', () => {
    const a = natural('repeatable', {});
    const b = natural('repeatable', {});
    expect(hashWorld(a)).toBe(hashWorld(b));
    run(a, 2400);
    run(b, 2400);
    expect(a.tick).toBe(2400);
    expect(hashWorld(a)).toBe(hashWorld(b));
    // not just the hash: a few concrete facts agree too
    expect(a.persons.map((p) => [p.id, +p.x.toFixed(6), +p.y.toFixed(6)])).toEqual(b.persons.map((p) => [p.id, +p.x.toFixed(6), +p.y.toFixed(6)]));
    expect(a.events.map((e) => e.text)).toEqual(b.events.map((e) => e.text));
    expect(a.ledger).toEqual(b.ledger);
  });

  it('different seeds give different worlds, and harsh settings change the outcome', () => {
    const a = natural('seed-one');
    const b = natural('seed-two');
    const c = natural('seed-one', { harsh: true });
    expect(hashWorld(a)).not.toBe(hashWorld(b));
    expect(hashWorld(a)).not.toBe(hashWorld(c));
    run(a, 600);
    run(c, 600);
    expect(hashWorld(a)).not.toBe(hashWorld(c));
  });

  it('staged scenes are deterministic too', () => {
    for (const s of ['contest', 'help', 'cooperate'] as const) {
      const a = scene(s);
      const b = scene(s);
      run(a, 700);
      run(b, 700);
      expect(hashWorld(a)).toBe(hashWorld(b));
    }
  });

  it('inspecting people (view-models, opportunity audits) never changes what happens next', () => {
    const a = natural('inspect-purity');
    const b = natural('inspect-purity');
    for (let i = 0; i < 1500; i++) {
      run(a, 1);
      run(b, 1);
      if (i % 25 === 0) {
        for (const p of a.persons.slice(0, 8)) describePerson(a, p.id, { opportunities: true });
        summarizeWorld(a);
      }
    }
    expect(hashWorld(a)).toBe(hashWorld(b));
  });
});
