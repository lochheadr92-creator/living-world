// Rules 213: the three ages of childhood (src/sim/three_ages.ts; the option filter in decision.ts, the gather handler in
// act_resource.ts, the practice in childhood.ts). Every situation here is STAGED: it checks a rule, it is not an example of
// spontaneous behaviour. The ordinary-world origin is the child's-day probe (under-twelves gathered food about four hours a day and
// took a quarter of all food). Each check has the rules-212 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { CRITICAL, DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { perceive } from '../src/sim/perception';
import { newRelation } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import { CHILD_REST, HELPED_ENOUGH, LITTLE_REASON, THREE_AGES_PARTS, notShownReason, practiceScale, setThreeAges, validateShown } from '../src/sim/three_ages';
import { hashWorld, stepWorld } from '../src/sim/world';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setThreeAges(true));

/** A child of the given age by her home, fed, with a berry bush she knows a few steps away. */
function child(version: number, o: { age?: number; hunger?: number; shown?: ('forage' | 'fish' | 'farm')[]; tag?: string } = {}) {
  const s = stage(`three-ages-${version}-${o.age ?? 9}-${o.hunger ?? 70}-${(o.shown ?? []).join('+')}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  const p = addPerson(s, 'Mona', 40.5, 27.5, { age: o.age ?? 9, hunger: o.hunger ?? 70, thirst: 95, energy: 95 });
  const home = building(s, 'hut', 40, 24, p.hhId);
  w.households.find((h) => h.id === p.hhId)!.homeId = home.id;
  const bush = makeSource(w, 'berry_bush', 44, 28, 8);
  done(s);
  w.tick = 600;
  learn(w, p, home, bush);
  if (o.shown) p.shown = [...o.shown];
  const gather = () => generateOptions(w, p, true, true).options.find((x) => x.kind === 'gather' && x.targetId === bush.id);
  /** offered at all, and what the ranking (the hard filters) keeps */
  const kept = () => {
    const ctx = generateOptions(w, p, true, true);
    return { offered: ctx.options.some((x) => x.kind === 'gather' && x.targetId === bush.id), blocked: ctx.blocked.find((b) => b.targetId === bush.id)?.blocked };
  };
  return { w, p, bush, home, gather, kept };
}

describe('rules 213 is registered', () => {
  it('is registered and supported (the current version may be later), with four parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(213);
    expect(SUPPORTED_RULES_VERSIONS).toContain(213);
    expect(THREE_AGES_PARTS).toEqual(['little', 'shown', 'bounded', 'practice']);
  });
});

describe('little: under seven', () => {
  it('at 212 a four-year-old may pick berries; at 213 not, with the reason; a youth and a grown person are unchanged', async () => {
    const { rankOptions } = await import('../src/sim/decision');
    const ranks = (f: ReturnType<typeof child>) => rankOptions(generateOptions(f.w, f.p, true, true)).some((x) => x.kind === 'gather' && x.targetId === f.bush.id);
    expect(ranks(child(212, { age: 4 }))).toBe(true);
    const now = child(213, { age: 4 });
    expect(ranks(now)).toBe(false);
    const ctx = generateOptions(now.w, now.p, true, true);
    rankOptions(ctx);
    expect(ctx.blocked.some((b) => b.blocked === LITTLE_REASON)).toBe(true);
    expect(ranks(child(213, { age: 14 }))).toBe(true);
    expect(ranks(child(213, { age: 30 }))).toBe(true);
    setThreeAges(false, 'little');
    expect(ranks(child(213, { age: 4, tag: 'off' }))).toBe(true);
  });

  it('a starving little one still feeds herself', async () => {
    const { rankOptions } = await import('../src/sim/decision');
    const f = child(213, { age: 4, hunger: CRITICAL.hunger - 2 });
    expect(rankOptions(generateOptions(f.w, f.p, true, true)).some((x) => x.kind === 'gather' && x.targetId === f.bush.id)).toBe(true);
  });

  it('a gather already under way is refused on arrival with the same reason', () => {
    const f = child(213, { age: 4, tag: 'arrive' });
    setThreeAges(false, 'little');
    const o = f.gather()!;
    const a = o.make!()!;
    setThreeAges(true);
    startActivity(f.w, f.p, a);
    for (let i = 0; i < 200 && f.p.activity?.kind === 'gather'; i++) stepWorld(f.w);
    expect(f.p.lastResult?.detail ?? '').toContain(LITTLE_REASON);
    expect(f.p.inv.berries ?? 0).toBe(0);
  });
});

describe('shown and bounded: seven to eleven', () => {
  it('at 212 a nine-year-old may forage; at 213 only once shown, and then a bounded amount', async () => {
    const { rankOptions } = await import('../src/sim/decision');
    const ranks = (f: ReturnType<typeof child>) => rankOptions(generateOptions(f.w, f.p, true, true)).some((x) => x.kind === 'gather' && x.targetId === f.bush.id);
    expect(ranks(child(212))).toBe(true);
    const unshown = child(213);
    expect(ranks(unshown)).toBe(false);
    const ctx = generateOptions(unshown.w, unshown.p, true, true);
    rankOptions(ctx);
    expect(ctx.blocked.some((b) => b.blocked === notShownReason('forage'))).toBe(true);
    // shown fishing is not shown foraging
    expect(ranks(child(213, { shown: ['fish'] }))).toBe(false);
    const shown = child(213, { shown: ['forage'] });
    expect(ranks(shown)).toBe(true);
    setThreeAges(false, 'shown');
    expect(ranks(child(213, { tag: 'shown-off' }))).toBe(true);
  });

  it('through to the ground: she gathers, then rests from it six times as long, and a starving child is not held', async () => {
    const { rankOptions } = await import('../src/sim/decision');
    const f = child(213, { shown: ['forage'], tag: 'ground' });
    const a = f.gather()!.make!()!;
    const start = f.w.tick;
    startActivity(f.w, f.p, a);
    for (let i = 0; i < 800 && f.p.activity?.kind === 'gather'; i++) stepWorld(f.w);
    expect(f.p.inv.berries ?? 0).toBeGreaterThan(0);
    const spent = f.w.tick - start;
    expect(f.p.cooldowns.childwork).toBeGreaterThanOrEqual(f.w.tick + (CHILD_REST - 0.5) * spent - 2);
    // staged: she has put the berries down at home, so gathering would be on offer again
    f.home.store.items.berries = (f.home.store.items.berries ?? 0) + (f.p.inv.berries ?? 0);
    f.p.inv.berries = 0;
    const ctx = generateOptions(f.w, f.p, true, true);
    expect(rankOptions(ctx).some((x) => x.kind === 'gather' && x.targetId === f.bush.id)).toBe(false);
    expect(ctx.blocked.some((b) => b.blocked === HELPED_ENOUGH)).toBe(true);
    f.p.needs.hunger = CRITICAL.hunger - 2;
    expect(rankOptions(generateOptions(f.w, f.p, true, true)).some((x) => x.kind === 'gather' && x.targetId === f.bush.id)).toBe(true);
    // at 212 the same gathering leaves no rest
    const old = child(212, { shown: ['forage'], tag: 'ground' });
    startActivity(old.w, old.p, old.gather()!.make!()!);
    for (let i = 0; i < 800 && old.p.activity?.kind === 'gather'; i++) stepWorld(old.w);
    expect(old.p.cooldowns.childwork).toBeUndefined();
    expect(conservationReport(f.w).ok).toBe(true);
  });
});

describe('practice: what gathering teaches, by age', () => {
  it('a seven-year-old learns at half a grown person\'s rate, rising to the full rate at twelve; nothing changes at 212', () => {
    expect(practiceScale(child(213, { age: 7.0 }).w, child(213, { age: 7.0 }).p)).toBeCloseTo(0.5, 1);
    const nine = child(213, { age: 9.5 });
    expect(practiceScale(nine.w, nine.p)).toBeCloseTo(0.75, 1);
    const little = child(213, { age: 4 });
    expect(practiceScale(little.w, little.p)).toBe(0.4);
    const old = child(212, { age: 4 });
    expect(practiceScale(old.w, old.p)).toBe(1);
    const grown = child(213, { age: 30 });
    expect(practiceScale(grown.w, grown.p)).toBe(1);
  });

  it('through to the ground: a shown nine-year-old gains less skill from a gather at 213 than at 212', () => {
    const run = (version: number) => {
      const f = child(version, { age: 9, shown: ['forage'], tag: 'skill' });
      const before = f.p.skills.forage;
      startActivity(f.w, f.p, f.gather()!.make!()!);
      for (let i = 0; i < 800 && f.p.activity?.kind === 'gather'; i++) stepWorld(f.w);
      return { gain: f.p.skills.forage - before, cycles: f.p.inv.berries ?? 0 };
    };
    const old = run(212), now = run(213);
    expect(old.gain).toBeGreaterThan(0);
    expect(now.gain / Math.max(1, now.cycles)).toBeLessThan(old.gain / Math.max(1, old.cycles));
  });
});

describe('being shown is recorded from a completed practice', () => {
  /** Talia, eight, asks Yara, her mother, for foraging practice */
  function lesson(version: number) {
    const s = stage(`three-ages-lesson-${version}`), w = s.w;
    w.settings.dynamics = 'rich'; w.settings.rulesVersion = version; w.tick = DAY;
    const p = addPerson(s, 'Talia', 40, 40, { age: 8, traits: { sociability: 0.9, curiosity: 0.9 } });
    const q = addPerson(s, 'Yara', 41.5, 40, { age: 35, traits: { sociability: 0.9 } });
    done(s);
    for (const x of [p, q]) x.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 90 };
    Object.assign(p.skills, { forage: 0.6, fish: 0.4, farm: 0.4 });
    Object.assign(q.skills, { forage: 1.2, fish: 1.0, farm: 1.0 });
    p.relations[q.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5, kin: 'parent' };
    q.relations[p.id] = { ...newRelation(), affinity: 60, trust: 40, familiarity: 5, kin: 'child' };
    pin(q); perceive(w, p);
    const o = generateOptions(w, p, true, true).options.find((x) => x.key === `socialize:${q.id}:learn_foraging`);
    expect(o, 'the practice is on offer').toBeTruthy();
    startActivity(w, p, o!.make!()!);
    for (let i = 0; i < 600 && !(w.conversations[0]?.childhood?.outcome === 'completed') && (p.convId || !w.conversations[0]); i++) stepWorld(w);
    for (let n = 0; n < 300 && p.convId; n++) stepWorld(w);
    return { w, p };
  }

  it('at 212 nothing is recorded; at 213 she has been shown foraging, and it survives a save and load and is in the fingerprint', () => {
    expect(lesson(212).p.shown).toBeUndefined();
    const now = lesson(213);
    expect(now.p.shown).toEqual(['forage']);
    const copy = deserializeWorld(serializeWorld(now.w));
    expect(copy.persons.find((x) => x.id === now.p.id)!.shown).toEqual(['forage']);
    expect(hashWorld(copy)).toBe(hashWorld(now.w));
    const h = hashWorld(now.w);
    now.p.shown = ['forage', 'fish'];
    expect(hashWorld(now.w)).not.toBe(h);
    for (let i = 0; i < 60; i++) { stepWorld(now.w); stepWorld(copy); }
    copy.persons.find((x) => x.id === now.p.id)!.shown = ['forage', 'fish'];
    expect(conservationReport(now.w).ok).toBe(true);
  });

  it('a load refuses a shown list where it cannot be', () => {
    const f = child(212, { tag: 'bad' });
    f.p.shown = ['forage'];
    expect(() => validateShown(f.w)).toThrow('Invalid shown tasks');
    const g = child(213, { tag: 'bad' });
    g.p.shown = ['forage', 'forage'];
    expect(() => validateShown(g.w)).toThrow('Invalid shown tasks');
  });
});
