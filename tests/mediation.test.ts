// Mediation after conflict (src/sim/mediation.ts): a friend of both sides may step in; it may make peace, soften, be told to
// stay out of it, or be turned away; the option exists only in a rich world.
import { describe, expect, it } from 'vitest';
import { createWorld } from '../src/sim/factory';
import { generateOptions } from '../src/sim/decision';
import { openGrievance } from '../src/sim/grievance';
import { hears, mediate, quarrelsFor } from '../src/sim/mediation';
import { stageOf } from '../src/sim/people';
import { settingsForProfile } from '../src/sim/profiles';
import { noteDeed } from '../src/sim/reputation';
import { stepWorld } from '../src/sim/world';
import type { Person, World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const blank = { affinity: 0, trust: 0, familiarity: 0, lastMet: 0, kin: '' as const, avoidUntil: 0, debt: 0, history: [], grievance: null, settledAt: 0 };
const like = (a: Person, b: Person, aff: number, trust = 20): void => {
  a.relations[b.id] = { ...(a.relations[b.id] ?? blank), affinity: aff, trust };
};

function setup(dyn: 'rich' | 'authored') {
  const w = world(dyn);
  for (let i = 0; i < 100; i++) stepWorld(w);
  const [c, a, b] = w.persons.filter((p) => p.alive && stageOf(w, p) === 'adult');
  like(c, a, 40);
  like(c, b, 40);
  like(a, c, 40, 40);
  like(b, c, 30);
  openGrievance(w, a, b, 'refusal', `${b.name} would not help`, 40);
  w.tick += 500;
  noteDeed(w, c, a, 'quarrelsome', `${a.name} picked a quarrel with ${b.name}`);
  return { w, c, a, b };
}

describe('stepping into a quarrel', () => {
  it('is open to a friend of both who knows of it, in a rich world only', () => {
    const r = setup('rich');
    expect(quarrelsFor(r.w, r.c).map((q) => [q.a.id, q.b.id])).toEqual([[r.a.id, r.b.id]]);
    r.a.x = r.c.x + 2;
    r.a.y = r.c.y;
    r.c.seen = [{ id: r.a.id, ent: 'person', x: r.a.x, y: r.a.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '', busyTalking: false }];
    r.c.needs.hunger = r.c.needs.thirst = r.c.needs.energy = 90;
    const ctx = generateOptions(r.w, r.c, true);
    expect(ctx.options.some((o) => o.kind === 'socialize' && o.label.startsWith('Talk ') && o.targetId === r.a.id)).toBe(true);
    const au = setup('authored');
    expect(quarrelsFor(au.w, au.c)).toEqual([]);
  });

  it('comes to peace, a softening, a rebuff or a turning away, each with its mark; and the unliked are not heard', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 40 && seen.size < 3; seed++) {
      const { w, c, a, b } = setup('rich');
      w.tick += seed * 16;
      const weight = a.relations[b.id].grievance!.weight;
      const affBefore = a.relations[c.id].affinity;
      const out = mediate(w, c, a, b);
      seen.add(out);
      if (out === 'peace') {
        expect(a.relations[b.id].grievance).toBeNull();
        expect(w.events.some((e) => e.text.includes('make peace'))).toBe(true);
      } else if (out === 'eased') expect(a.relations[b.id].grievance!.weight).toBeLessThan(weight);
      else if (out === 'worse') {
        expect(a.relations[b.id].grievance!.weight).toBeGreaterThan(weight);
        expect(a.relations[c.id].affinity).toBeLessThan(affBefore);
      }
      expect(c.cooldowns['mediate' + a.id]).toBeGreaterThan(w.tick);
      expect(quarrelsFor(w, c)).toEqual([]); // not again for a while
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
    const { c, a } = setup('rich');
    like(a, c, -10);
    expect(hears(c, a)).toBe(false);
  });
});
