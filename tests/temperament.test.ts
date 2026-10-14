// Boundaries and alone time (src/sim/temperament.ts): a reserved person worn down by company feels crowded and goes off alone,
// and comes back restored; a reserved person declines a crowded table without slight; an authored world has none of it.
import { describe, expect, it } from 'vitest';
import { generateOptions } from '../src/sim/decision';
import { createWorld } from '../src/sim/factory';
import { startActivity } from '../src/sim/activities';
import { settingsForProfile } from '../src/sim/profiles';
import { stageOf } from '../src/sim/people';
import { CROWDED_AT, crowdTick } from '../src/sim/temperament';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));
const adult = (w: World) => w.persons.find((p) => p.alive && stageOf(w, p) === 'adult')!;

describe('company and the reserved', () => {
  it('counts up in a crowd and down alone, weighs on the reserved, and never exists in an authored world', () => {
    const r = world('rich');
    const p = adult(r);
    p.traits.sociability = 0.2;
    const others = r.persons.filter((q) => q !== p).slice(0, 3);
    for (const q of others) {
      q.x = p.x + 1;
      q.y = p.y;
    }
    for (let i = 0; i < 40 * 30; i++) {
      p.pose = 'stand';
      p.seen = others.map((q) => ({ id: q.id, ent: 'person' as const, x: q.x, y: q.y, hungry: false, thirsty: false, tired: false, cold: false, hurt: false, child: false, carrying: [], asleep: false, act: '' as const, busyTalking: false }));
      r.tick++;
      crowdTick(r, p);
    }
    expect(p.crowd ?? 0).toBeGreaterThanOrEqual(CROWDED_AT);
    expect((p.mood?.thoughts ?? []).some((t) => t.kind === 'crowded')).toBe(true);
    p.seen = [];
    for (let i = 0; i < 400 * 30; i++) {
      r.tick++;
      crowdTick(r, p);
    }
    expect(p.crowd).toBeUndefined();
    const a = world('authored');
    for (let i = 0; i < 600; i++) stepWorld(a);
    expect(a.persons.every((q) => q.crowd === undefined)).toBe(true);
  });

  it('offers the crowded reserved person time alone, which clears the count and leaves them the quiet', () => {
    const r = world('rich');
    for (let i = 0; i < 300; i++) stepWorld(r);
    const p = adult(r);
    p.traits.sociability = 0.15;
    p.crowd = 1500;
    p.needs.hunger = p.needs.thirst = p.needs.energy = 90;
    const ctx = generateOptions(r, p, true);
    const opt = ctx.options.find((o) => o.kind === 'alone');
    expect(opt).toBeTruthy();
    const sociable = r.persons.find((q) => q !== p && q.alive && stageOf(r, q) === 'adult')!;
    sociable.traits.sociability = 0.8;
    sociable.crowd = 1500;
    expect(generateOptions(r, sociable, true).options.some((o) => o.kind === 'alone')).toBe(false);
    const act = opt!.make!()!;
    startActivity(r, p, act);
    for (let i = 0; i < 1200 && p.activity === act; i++) stepWorld(r);
    if (p.lastResult?.outcome === 'success') {
      expect(p.crowd).toBeUndefined();
      expect((p.mood?.thoughts ?? []).some((t) => t.kind === 'quiet')).toBe(true);
    } else {
      expect(p.lastResult?.detail).toMatch(/company came|interrupted|something better/);
    }
  });
});
