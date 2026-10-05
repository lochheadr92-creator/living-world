// Grief and remembrance. Staged scenes check a rule; the last test is the natural (harsh) world, where deaths actually happen.
import { describe, expect, it } from 'vitest';
import { conservationReport } from '../src/sim/economy';
import { GRIEF_KEEP, NEAR_DEATH, bondTo, decayGrief, discoverGraves, easeGrief, onRemembranceMeal, remembering, shareDeath } from '../src/sim/grief';
import { killPerson } from '../src/sim/lifecycle';
import { inviteAsk } from '../src/sim/meals';
import { traitMods } from '../src/sim/optutil';
import { stageOf } from '../src/sim/people';
import { relOf } from '../src/sim/relations';
import type { Person, World } from '../src/sim/types';
import { hashWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { natural, run } from './helpers/util';

function stage() {
  const w = natural('grief-stage');
  const adults = w.persons.filter((p) => p.alive).slice(0, 8);
  const [dead, partner, near, far, friend, stranger, teller, other] = adults;
  for (const p of adults) {
    p.x = dead.x + 1;
    p.y = dead.y + 1;
    p.pose = 'stand';
    p.convId = 0;
    p.activity = null;
    for (const k in p.relations) delete p.relations[k as unknown as number];
  }
  // the village is elsewhere, so only these eight are around
  for (const p of w.persons) if (!adults.includes(p)) p.x = dead.x + 80;
  relOf(partner, dead.id).kin = 'partner';
  relOf(near, dead.id).kin = 'sibling';
  relOf(far, dead.id).kin = 'child';
  relOf(friend, dead.id).affinity = 60;
  relOf(stranger, dead.id).affinity = 5;
  relOf(teller, dead.id).affinity = 70;
  relOf(other, dead.id).affinity = 70;
  far.x = dead.x + 60; // far away when it happens
  teller.x = dead.x + 61;
  other.x = dead.x + 61;
  return { w, dead, partner, near, far, friend, stranger, teller, other };
}

describe('learning of a death', () => {
  it('those close to them who are near it learn at once, weighted by how close; those far away or not close do not', () => {
    const { w, dead, partner, near, far, friend, stranger } = stage();
    killPerson(w, dead, 'old age');
    const g = (p: Person) => p.grief.find((x) => x.about === dead.id);
    expect(g(partner)?.weight).toBe(90);
    expect(g(near)?.weight).toBe(65);
    expect(g(friend)?.weight).toBeGreaterThanOrEqual(25);
    expect(g(partner)?.src).toBe('saw');
    expect(g(stranger)).toBeUndefined();
    // a child far away does not know yet, and nothing was done to their needs
    expect(g(far)).toBeUndefined();
    expect(far.log.some((l) => /died/.test(l.text))).toBe(false);
    expect(partner.log.some((l) => new RegExp(`${dead.name} died`).test(l.text))).toBe(true);
    // the grave is where the mourners think it is
    expect(w.graves.some((gr) => gr.x === g(partner)!.gx && gr.y === g(partner)!.gy)).toBe(true);
  });

  it('a death nobody saw is found out by someone close who comes upon the grave, and not by someone who is far away or not close', () => {
    const { w, dead, partner, far, stranger } = stage();
    for (const p of [partner]) p.x = dead.x + 40; // nobody close is near when it happens
    killPerson(w, dead, 'old age');
    expect(partner.grief).toHaveLength(0);
    const grave = w.deceased[w.deceased.length - 1];
    discoverGraves(w, far); // far away
    expect(far.grief).toHaveLength(0);
    stranger.x = grave.gx!;
    stranger.y = grave.gy!;
    discoverGraves(w, stranger); // here, but not close to them
    expect(stranger.grief).toHaveLength(0);
    partner.x = grave.gx! + 3;
    partner.y = grave.gy!;
    discoverGraves(w, partner);
    expect(partner.grief).toHaveLength(1);
    expect(partner.grief[0].src).toBe('found');
    expect(partner.log.some((l) => /Came upon .* grave/.test(l.text))).toBe(true);
  });

  it('word reaches those who were not there, only if they were close, once, from someone who knows', () => {
    const { w, dead, partner, far, teller, stranger } = stage();
    killPerson(w, dead, 'old age');
    expect(far.grief).toHaveLength(0);
    // someone who does not know cannot tell it
    shareDeath(w, teller, far);
    expect(far.grief).toHaveLength(0);
    shareDeath(w, partner, far);
    expect(far.grief).toHaveLength(1);
    expect(far.grief[0].src).toBe('told');
    expect(far.grief[0].from).toBe(partner.id);
    expect(far.grief[0].weight).toBe(80);
    expect(far.log.some((l) => new RegExp(`${partner.name} told me ${dead.name} had died`).test(l.text))).toBe(true);
    // not close enough to grieve: not told, and not told twice
    shareDeath(w, partner, stranger);
    expect(stranger.grief).toHaveLength(0);
    const before = far.needs.social;
    shareDeath(w, partner, far);
    expect(far.grief).toHaveLength(1);
    expect(far.needs.social).toBeGreaterThanOrEqual(before);
    // and it travels on: the one who was told can tell the next
    shareDeath(w, far, w.persons.find((p) => p.id === teller.id)!);
    expect(teller.grief).toHaveLength(1);
    expect(teller.grief[0].from).toBe(far.id);
  });

  it('two people who mourn the same person ease each other a little when they talk, once a day', () => {
    const { w, dead, partner, near } = stage();
    killPerson(w, dead, 'old age');
    const a = partner.grief[0].weight;
    const b = near.grief[0].weight;
    shareDeath(w, partner, near);
    expect(partner.grief[0].weight).toBe(a - 4);
    expect(near.grief[0].weight).toBe(b - 4);
    shareDeath(w, partner, near);
    expect(partner.grief[0].weight).toBe(a - 4); // not again today
    expect(NEAR_DEATH).toBeGreaterThan(0);
  });
});

describe('what grief does', () => {
  it('eases with time, and is forgotten after a while; while it weighs, work and wandering are less appealing', () => {
    const { w, dead, partner } = stage();
    const before = traitMods(partner);
    killPerson(w, dead, 'old age');
    const grieving = traitMods(partner);
    expect(grieving.work).toBeLessThan(before.work);
    expect(grieving.explore).toBeLessThan(before.explore);
    expect(grieving.give).toBe(before.give); // kindness is not dulled
    const g0 = partner.grief[0].weight;
    decayGrief(w, partner);
    expect(partner.grief[0].weight).toBeLessThan(g0);
    easeGrief(w, partner, dead.id, 1000);
    expect(partner.grief[0].weight).toBe(0);
    expect(traitMods(partner).work).toBeCloseTo(before.work, 6);
    w.tick += GRIEF_KEEP + 1;
    decayGrief(w, partner);
    expect(partner.grief).toHaveLength(0);
  });

  it('bond is read from kinship, household and warmth, and nothing else', () => {
    const { w, dead, partner, stranger, friend } = stage();
    const rec = { id: dead.id, name: dead.name, tick: w.tick };
    expect(bondTo(partner, rec)).toBe(90);
    expect(bondTo(stranger, rec)).toBe(0);
    expect(bondTo(friend, rec)).toBeGreaterThanOrEqual(25);
    expect(bondTo(friend, { ...rec, hh: friend.hhId })).toBe(50);
  });
});

describe('remembrance', () => {
  it('a meal called by someone still mourning is held in their memory, and eases whoever mourns the same person', () => {
    const { w, dead, partner, near, stranger } = stage();
    killPerson(w, dead, 'old age');
    expect(remembering(partner, w.tick)?.about).toBe(dead.id);
    expect(remembering(stranger, w.tick)).toBeNull();
    const m = (() => {
      inviteAsk(w, partner, near, { mealPlan: { placeId: 1, placeName: 'the fire', x: partner.x, y: partner.y } });
      return w.meals[w.meals.length - 1];
    })();
    expect(m.remembers).toBe(dead.name);
    expect(m.remembersId).toBe(dead.id);
    const wp = partner.grief[0].weight;
    const wn = near.grief[0].weight;
    onRemembranceMeal(w, dead.name, dead.id, [partner, near, stranger], partner);
    expect(partner.grief[0].weight).toBe(wp - 15);
    expect(near.grief[0].weight).toBe(wn - 15);
    expect(stranger.grief).toHaveLength(0);
    expect(w.events.some((e) => /held a meal in memory of/.test(e.text))).toBe(true);
    // once the loss is old, a meal is just a meal
    w.tick += DAY * 4;
    expect(remembering(partner, w.tick)).toBeNull();
  });
});

describe('going to the grave', () => {
  it('someone who is grieving, with nothing pressing, walks to the grave and stands there; it eases them and is on their record', () => {
    const { w, dead, partner } = stage();
    killPerson(w, dead, 'old age');
    const g = partner.grief[0];
    expect(g.weight).toBe(90);
    // a calm midday with nothing pressing
    w.tick = Math.floor(w.tick / DAY) * DAY + Math.floor(DAY * 0.4);
    for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety', 'social'] as const) partner.needs[n] = 95;
    let went = false;
    // (given as long as it takes: how long the walk is depends on how old the mourner is)
    for (let chunk = 0; chunk < 30 && g.visited < 0; chunk++) {
      run(w, 100, () => {
        for (const n of ['hunger', 'thirst', 'energy', 'warmth', 'safety'] as const) partner.needs[n] = Math.max(partner.needs[n], 90);
        if (partner.activity?.kind === 'mourn') went = true;
      });
    }
    expect(went).toBe(true);
    expect(g.visited).toBeGreaterThan(0);
    expect(g.weight).toBeLessThan(90 - 10);
    expect(partner.log.some((l) => /grave for a while/.test(l.text))).toBe(true);
  });
});

describe('in a living village', () => {
  // Nobody dies of natural causes in the first months of an ordinary world (see docs/BASELINE.md), so a death is brought about here
  // and everything after it is the village's own doing. People are sampled as it goes: logs and grief both fade.
  const village = () => {
    const w = natural('grief-village');
    run(w, 2400 * 2);
    const alive = w.persons.filter((p) => p.alive && stageOf(w, p) !== 'child');
    const kinCount = (p: Person) => Object.values(p.relations).filter((r) => r.kin).length + w.persons.filter((q) => q.hhId === p.hhId).length;
    const victim = [...alive].sort((a, b) => kinCount(b) - kinCount(a) || a.id - b.id)[0];
    killPerson(w, victim, 'old age');
    const grieved = new Map<number, { src: string; peak: number; visited: boolean }>();
    for (let step = 0; step < 40; step++) {
      for (const p of w.persons) {
        const g = p.grief.find((x) => x.about === victim.id);
        if (!g) continue;
        const cur = grieved.get(p.id) ?? { src: g.src, peak: 0, visited: false };
        cur.peak = Math.max(cur.peak, g.weight);
        cur.visited ||= g.visited > 0;
        grieved.set(p.id, cur);
      }
      run(w, 240);
    }
    return { w, victim, grieved };
  };

  it('grief follows a real death, is learned locally or by word, stays bounded, shows up in what people do, and is deterministic', () => {
    const { w, victim, grieved } = village();
    expect(conservationReport(w).ok).toBe(true);
    const dead = new Map(w.deceased.map((d) => [d.id, d]));
    for (const p of w.persons) {
      for (const g of p.grief) {
        expect(dead.has(g.about), `${p.name} grieves for someone who did not die`).toBe(true);
        expect(g.weight).toBeGreaterThanOrEqual(0);
        expect(g.weight).toBeLessThanOrEqual(100);
        if (g.src === 'told') expect(g.from).not.toBe(p.id);
      }
    }
    const srcs = [...grieved.values()].map((x) => x.src);
    const visited = [...grieved.values()].filter((x) => x.visited).length;
    const meals = w.events.filter((e) => /in memory of/.test(e.text)).length;
    console.log(`[grief] village, 10 days (death on day 2): ${grieved.size} mourned ${victim.name} (${srcs.filter((s) => s === 'saw').length} saw it, ${srcs.filter((s) => s === 'told').length} told, ${srcs.filter((s) => s === 'found').length} found the grave), ${visited} went to the grave, ${meals} remembrance meals`);
    expect(grieved.size).toBeGreaterThanOrEqual(1);
    for (const x of grieved.values()) expect(x.peak).toBeGreaterThanOrEqual(25);
    const again = village();
    expect(hashWorld(again.w)).toBe(hashWorld(w));
    expect(again.grieved.size).toBe(grieved.size);
  }, 400_000);
});

void ({} as World);
