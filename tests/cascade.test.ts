// The cascade tracer (scripts/cascade): it watches without changing anything, and links what it should.
import { describe, expect, it } from 'vitest';
import { trace } from '../scripts/cascade/trace';
import { addEvent } from '../src/sim/events';
import { hashWorld } from '../src/sim/world';
import { natural, run } from './helpers/util';

describe('the cascade tracer', () => {
  it('leaves the world exactly where it would have been', () => {
    const a = natural('trace-a');
    run(a, 1200);
    const b = natural('trace-a');
    trace(b, 0.5);
    expect(hashWorld(b)).toBe(hashWorld(a));
  });

  it('links happenings that share a person within a day, across systems, and not otherwise', () => {
    const w = natural('trace-b');
    const [p, q, r] = w.persons.filter((x) => x.alive);
    const rep = trace(w, 0.5, (x) => {
      if (x.tick === 100) addEvent(x, 'danger', 'first', [p.id]);
      if (x.tick === 200) addEvent(x, 'conflict', 'second', [p.id, q.id]);
      if (x.tick === 300) addEvent(x, 'life', 'third', [q.id]);
      if (x.tick === 400) addEvent(x, 'nature', 'unrelated', [r.id]);
    });
    expect(rep.transitions['danger>conflict']).toBe(1);
    expect(rep.transitions['conflict>life']).toBe(1);
    expect(rep.transitions['danger>nature']).toBeUndefined();
    expect(rep.crossSystemLinks).toBeGreaterThanOrEqual(2);
    expect(rep.longestDepth).toBeGreaterThanOrEqual(3);
  });

  it('does not link across more than a day', () => {
    const w = natural('trace-c');
    const [p] = w.persons.filter((x) => x.alive);
    const rep = trace(w, 1.2, (x) => {
      if (x.tick === w.tick) return;
      if (x.tick % 2400 === 10 && x.tick < 2400) addEvent(x, 'danger', 'early', [p.id]);
      if (x.tick === 2400 + 1500) addEvent(x, 'life', 'late', [p.id]);
    });
    expect(rep.transitions['danger>life']).toBeUndefined();
  });
});
