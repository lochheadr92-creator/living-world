// Rules 215: toys (src/sim/toys.ts; the craft step in act_build.ts, the hand-over in social.ts, the play in act_misc.ts and
// options_work.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The ordinary-world
// origin is phase 4 of docs/CHILDHOOD_AND_PLAY_PLAN.md. Each check has the rules-214 contrast.
import { afterEach, describe, expect, it } from 'vitest';
import { newActivity, startActivity } from '../src/sim/activities';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { perceive } from '../src/sim/perception';
import { newRelation } from '../src/sim/relations';
import { TICKS_PER_YEAR } from '../src/sim/constants';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { toolsHeldBy } from '../src/sim/toolreg';
import { TOY_LIFT, TOY_PARTS, setToys, toyInterest, toyLift } from '../src/sim/toys';
import type { Person, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { addPerson, building, done, give, learn, stage } from './helpers/kit';

afterEach(() => setToys(true));

const kidStill = (w: World, k: Person) => {
  // staged: the child has had their time with the grown-ups today and sits where they are, so they do not walk off mid-scene
  for (const c of ['child:family_time', 'child:play_together', 'child:learn_foraging']) k.cooldowns[c] = 1e9;
  k.needs.social = 100;
  startActivity(w, k, newActivity(w, k, { kind: 'rest', label: 'Sit for a while', goal: 'rest', minCommit: 5000, duration: 5000, maxTicks: 6000 }));
};

/** Ada, thirty, at home with her son Pip, three; Bo, her partner; a hut with a little wood in its store. */
function home(version: number, o: { adaWood?: number; storeWood?: number; pipAge?: number; tag?: string; toyWith?: 'ada' | 'pip' } = {}) {
  const s = stage(`toys-${version}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 900;
  const ada = addPerson(s, 'Ada', 40, 30, { age: 30, inv: o.adaWood ? { wood: o.adaWood } : {} });
  const pip = addPerson(s, 'Pip', 42, 30, { age: o.pipAge ?? 3, hh: ada.hhId });
  const bo = addPerson(s, 'Bo', 41, 31, { age: 31, hh: ada.hhId });
  const hut = building(s, 'hut', 38, 27, ada.hhId, { wood: o.storeWood ?? 0 });
  const hh = w.households.find((h) => h.id === ada.hhId)!;
  hh.homeId = hut.id;
  // staged: a toy already in somebody's hands is part of the starting stock
  if (o.toyWith) give(w, o.toyWith === 'ada' ? ada : pip, 'toy').maker = ada.id;
  done(s);
  for (const p of [ada, bo]) {
    p.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 100 };
    p.relations[pip.id] = { ...newRelation(), affinity: 70, trust: 60, familiarity: 20, kin: 'child' };
    pip.relations[p.id] = { ...newRelation(), affinity: 70, trust: 60, familiarity: 20, kin: 'parent' };
    learn(w, p, hut);
  }
  pip.needs = { hunger: 95, thirst: 95, energy: 95, warmth: 95, safety: 95, social: 100 };
  learn(w, pip, hut);
  kidStill(w, pip);
  for (const p of [ada, bo]) perceive(w, p);
  const opts = (p: Person) => generateOptions(w, p, true, true).options;
  return { w, ada, pip, bo, hut, opts };
}

const run = (w: World, p: Person, kind: string, n = 600) => { for (let i = 0; i < n && p.activity?.kind === kind; i++) stepWorld(w); };

describe('rules 215 is registered', () => {
  it('is registered and supported (the current version may be later), with three parts', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(215);
    expect(SUPPORTED_RULES_VERSIONS).toContain(215);
    expect(TOY_PARTS).toEqual(['make', 'give', 'play']);
  });
});

describe('make: a grown person carves a toy for a child of the household', () => {
  it('at 214 nobody is offered it; at 215 Ada carves one from her own wood, a real owned thing she made; a second is not carved for the same child', () => {
    expect(home(214, { adaWood: 2 }).opts(home(214, { adaWood: 2, tag: 'b' }).ada).some((o) => o.key === 'craft:toy')).toBe(false);
    const f = home(215, { adaWood: 2, tag: 'make' });
    const o = f.opts(f.ada).find((x) => x.key === 'craft:toy');
    expect(o, 'a toy is offered').toBeTruthy();
    expect(o!.label).toBe('Carve a toy for Pip');
    startActivity(f.w, f.ada, o!.make!()!);
    run(f.w, f.ada, 'craft');
    const toys = toolsHeldBy(f.w, f.ada.id, 'toy');
    expect(toys).toHaveLength(1);
    expect(toys[0].maker).toBe(f.ada.id);
    expect(f.ada.inv.toy).toBe(1);
    expect(f.ada.inv.wood).toBe(1);
    expect(conservationReport(f.w).ok).toBe(true);
    // she holds it, and Bo does not carve another for Pip while it waits
    expect(f.opts(f.ada).some((x) => x.key === 'craft:toy')).toBe(false);
    perceive(f.w, f.bo);
    f.bo.inv.wood = 1;
    expect(f.opts(f.bo).some((x) => x.key === 'craft:toy')).toBe(false);
  });

  it('with no wood in hand the piece comes from their own home store; with the switch thrown nothing is offered', () => {
    const f = home(215, { storeWood: 2, tag: 'store' });
    const o = f.opts(f.ada).find((x) => x.key === 'craft:toy');
    expect(o).toBeTruthy();
    startActivity(f.w, f.ada, o!.make!()!);
    run(f.w, f.ada, 'craft');
    expect(f.ada.inv.toy).toBe(1);
    expect(f.hut.store.items.wood).toBe(1);
    expect(conservationReport(f.w).ok).toBe(true);
    setToys(false, 'make');
    const g = home(215, { adaWood: 2, tag: 'off' });
    expect(g.opts(g.ada).some((x) => x.key === 'craft:toy')).toBe(false);
  });
});

describe('give: the toy is handed to the child, and the child remembers who gave it', () => {
  it('at 215 Ada hands Pip the toy; it is his, the record with it; he is fond of her for it', () => {
    const f = home(215, { tag: 'give', toyWith: 'ada' });
    const toy = toolsHeldBy(f.w, f.ada.id, 'toy')[0];
    const o = f.opts(f.ada).find((x) => x.key === `give:toy:${f.pip.id}`);
    expect(o, 'the hand-over is offered').toBeTruthy();
    const before = f.pip.relations[f.ada.id].affinity;
    startActivity(f.w, f.ada, o!.make!()!);
    run(f.w, f.ada, 'give', 300);
    expect(f.pip.inv.toy).toBe(1);
    expect(f.ada.inv.toy ?? 0).toBe(0);
    expect(toy.holder).toBe(f.pip.id);
    expect(f.pip.relations[f.ada.id].affinity).toBeGreaterThan(before);
    expect(f.w.events.some((e) => e.text.startsWith('Ada gave Pip '))).toBe(true);
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('at 214, or with the switch thrown, a toy in hand is not handed over', () => {
    const old = home(214, { tag: 'give-old', toyWith: 'ada' });
    expect(old.opts(old.ada).some((x) => x.key.startsWith('give:toy:'))).toBe(false);
    setToys(false, 'give');
    const off = home(215, { tag: 'give-off', toyWith: 'ada' });
    expect(off.opts(off.ada).some((x) => x.key.startsWith('give:toy:'))).toBe(false);
  });
});

describe('play: a child with a toy plays with it, and the younger the child the more it means', () => {
  it('toy interest is full to two and falls to a fifth at eleven; none from twelve', () => {
    const f = home(215, { tag: 'interest' });
    const at = (age: number) => { f.pip.birthTick = f.w.tick - Math.round(age * TICKS_PER_YEAR); return toyInterest(f.w, f.pip); };
    expect(at(1)).toBe(1);
    expect(at(2)).toBe(1);
    expect(at(7)).toBeCloseTo(0.5, 5);
    expect(at(11)).toBeCloseTo(0.2, 5);
    expect(at(12)).toBe(0);
    at(2);
    expect(toyLift(f.w, f.pip)).toBe(TOY_LIFT);
  });

  it('at 214 a child holding a toy is offered nothing for it; at 215 he plays with it, a three-year-old more readily than a ten-year-old', () => {
    const old = home(214, { tag: 'play-old', toyWith: 'pip' });
    old.pip.activity = null;
    perceive(old.w, old.pip);
    expect(old.opts(old.pip).some((x) => x.key === 'play:toy')).toBe(false);
    const score = (age: number) => {
      const f = home(215, { pipAge: age, tag: `play-${age}`, toyWith: 'pip' });
      f.pip.activity = null;
      perceive(f.w, f.pip);
      return { f, o: f.opts(f.pip).find((x) => x.key === 'play:toy') };
    };
    const small = score(3), big = score(10);
    expect(small.o, 'offered to a three-year-old').toBeTruthy();
    expect(big.o, 'offered to a ten-year-old').toBeTruthy();
    expect(small.o!.util).toBeGreaterThan(big.o!.util);
    // he plays it out: had for today, and glad of it (staged: the grown-ups rest out of his sight, so nobody draws him into talk)
    const { f } = small;
    for (const g of [f.ada, f.bo]) { g.x += 40; startActivity(f.w, g, newActivity(f.w, g, { kind: 'rest', label: 'Sit for a while', goal: 'rest', minCommit: 5000, duration: 5000, maxTicks: 6000 })); }
    startActivity(f.w, f.pip, small.o!.make!()!);
    for (let i = 0; i < 600 && f.pip.activity?.kind === 'wander'; i++) stepWorld(f.w);
    expect(f.pip.cooldowns['play:toy']).toBeGreaterThan(f.w.tick);
    setToys(false, 'play');
    expect(f.opts(f.pip).some((x) => x.key === 'play:toy')).toBe(false);
  });
});

describe('a toy through a save and load', () => {
  it('a world with a toy being handed over continues exactly', () => {
    const f = home(215, { tag: 'save', toyWith: 'ada' });
    startActivity(f.w, f.ada, f.opts(f.ada).find((x) => x.key === `give:toy:${f.pip.id}`)!.make!()!);
    for (let i = 0; i < 6; i++) stepWorld(f.w);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 200; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
  });
});
