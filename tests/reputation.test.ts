// Reputation and news by word of mouth (src/sim/reputation.ts): a deed seen is a story held with its source and age; it passes
// from one person to another in conversation, weighed by trust, and moves what the hearer makes of someone; it fades; an
// authored world holds none.
import { describe, expect, it } from 'vitest';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { HEARD_MAX, RUMOUR_LIFE, heardBy, noteDeed, reputationOf, shareRumour } from '../src/sim/reputation';
import { settingsForProfile } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import type { World } from '../src/sim/types';

const world = (dynamics: 'authored' | 'rich'): World => createWorld(settingsForProfile('normal', 'meadow', { immigration: false, dynamics }));

describe('a story held and passed on', () => {
  const w = world('rich');
  const [a, b, c] = w.persons;

  it('is kept first-hand by whoever saw it, and counts for the person it is about', () => {
    noteDeed(w, a, c, 'generous', `${c.name} gave ${a.name} berries`);
    expect(heardBy(a)).toHaveLength(1);
    expect(heardBy(a)[0]).toMatchObject({ about: c.id, kind: 'generous', from: 0, origin: a.id, hops: 0, weight: 1 });
    expect(reputationOf(w, a, c.id)).toBeGreaterThan(0);
    expect(reputationOf(w, b, c.id)).toBe(0);
  });

  it('passes to a listener as hearsay with the teller named, and the listener thinks a little better of the subject', () => {
    const before = b.relations[c.id]?.affinity ?? 0;
    expect(shareRumour(w, a, b)).toBe(true);
    const got = heardBy(b)[0];
    expect(got).toMatchObject({ about: c.id, kind: 'generous', from: a.id, origin: a.id, hops: 1 });
    expect(got.weight).toBeLessThanOrEqual(1);
    expect(reputationOf(w, b, c.id)).toBeGreaterThan(0);
    expect(b.relations[c.id].affinity).toBeGreaterThan(before);
    expect(b.log.some((l) => l.text.includes('told me'))).toBe(true);
    // the same story is not told twice, and is never told to the person it is about
    expect(shareRumour(w, a, b)).toBe(false);
    expect(shareRumour(w, a, c)).toBe(false);
  });

  it('fades: after its life it counts for nothing and is not passed on', () => {
    w.tick += RUMOUR_LIFE + 1;
    expect(reputationOf(w, a, c.id)).toBe(0);
    const d = w.persons[3];
    expect(shareRumour(w, a, d)).toBe(false);
  });

  it('keeps at most HEARD_MAX stories', () => {
    for (let i = 0; i < HEARD_MAX + 10; i++) noteDeed(w, a, c, i % 2 ? 'generous' : 'quarrelsome', `story ${i}`), (w.tick += DAY);
    expect(heardBy(a).length).toBeLessThanOrEqual(HEARD_MAX);
  });
});

describe('in a running world', () => {
  it('stories arise from what people do and spread beyond those who saw it (rich); an authored world holds none', () => {
    const r = world('rich');
    for (let i = 0; i < 4 * DAY; i++) stepWorld(r);
    const holders = r.persons.filter((p) => heardBy(p).length > 0);
    expect(holders.length).toBeGreaterThan(3);
    const hearsay = r.persons.filter((p) => heardBy(p).some((x) => x.hops > 0));
    expect(hearsay.length).toBeGreaterThan(0);
    const a = world('authored');
    for (let i = 0; i < 2 * DAY; i++) stepWorld(a);
    expect(a.persons.every((p) => p.heard === undefined)).toBe(true);
  });
});
