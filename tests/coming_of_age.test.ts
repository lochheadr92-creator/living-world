// Rules 263 (bundle D, part 11): coming of age (src/sim/coming_of_age.ts, the switch in src/sim/kin_scenes.ts; the feast called in occasions.ts noteComingOfAge from
// lifecycle.ts lifeTick, the words said in occasions.ts occasionsTick, the hope taken up in life.ts takeUpHope). Every situation here is STAGED: it checks a rule, it is
// not an example of spontaneous behaviour. About eight people turned sixteen in six settlements over 25 days: this is rare, and proven by staged tests.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { AGE_ADULT, DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { COMING_OF_AGE_ELDER, COMING_OF_AGE_PARENT } from '../src/sim/dialogue';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { KIN_SCENE_PARTS, hasComingOfAge, kinScenePartOn, setKinScenes } from '../src/sim/kin_scenes';
import { GOAL_TEXT } from '../src/sim/life';
import { hasNaming } from '../src/sim/hearth_scenes';
import { COMING_MAX, comingOf, isComingOfAgeFeast, validateComingOfAge } from '../src/sim/coming_of_age';
import { callOccasion, occasionsOf } from '../src/sim/occasions';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import type { Occasion, Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, stage } from './helpers/kit';

afterEach(() => setKinScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const MORNING = at(0.3);

interface Opts {
  tag?: string;
  version?: number;
  /** how many ticks until Dara turns sixteen (40 by default; a tick of the schedule that notices it is at 17 mod 60) */
  until?: number;
}

/**
 * Dara (15, a few ticks short of sixteen), her mother Mira (40) and father Finn (42), her brother Bo (10), Ada (30) and Eli (60), neighbours, all within a few tiles of the camp
 * fire, which everybody knows, in the morning. Everybody is pinned: only what a test sets going decides anything.
 */
function scene(o: Opts = {}) {
  const s = stage(`age-${o.version ?? 263}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 263;
  w.tick = MORNING;
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const mira = addPerson(s, 'Mira', 38, 35, { age: 40, sex: 'f', ...full });
  const finn = addPerson(s, 'Finn', 39, 35, { age: 42, sex: 'm', ...full, hh: mira.hhId });
  const dara = addPerson(s, 'Dara', 40, 36, { age: 15, sex: 'f', ...full, hh: mira.hhId });
  const bo = addPerson(s, 'Bo', 41, 36, { age: 10, sex: 'm', ...full, hh: mira.hhId });
  const ada = addPerson(s, 'Ada', 43, 37, { age: 30, sex: 'f', ...full });
  const eli = addPerson(s, 'Eli', 44, 37, { age: 60, sex: 'm', ...full });
  const fire = createBuilding(w, 'fire', 41, 38, 0, { fuel: 30000 });
  w.camp = { x: 41, y: 36 };
  done(s);
  dara.parents = [mira.id, finn.id];
  bo.parents = [mira.id, finn.id];
  for (const kid of [dara, bo]) for (const par of [mira, finn]) {
    par.children.push(kid.id);
    Object.assign(relOf(par, kid.id), { kin: 'child', affinity: 90, trust: 80, familiarity: 60 });
    Object.assign(relOf(kid, par.id), { kin: 'parent', affinity: 85, trust: 85, familiarity: 60 });
  }
  for (const q of [ada, eli]) for (const p of [mira, finn, dara]) { Object.assign(relOf(p, q.id), { familiarity: 20, affinity: 30, trust: 25 }); Object.assign(relOf(q, p.id), { familiarity: 20, affinity: 30, trust: 25 }); }
  dara.birthTick = w.tick - AGE_ADULT * TICKS_PER_YEAR + (o.until ?? 40);
  dara.cooldowns.stageCode = 1; // she has been a youth since a while: the change to an adult is noticed
  for (const p of [mira, finn, dara, bo, ada, eli]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; learn(w, p, fire); p.nextThink = w.tick + 100000; }
  rebuildMobileGrid(w);
  for (const p of [mira, finn, dara, bo, ada, eli]) perceive(w, p);
  return { s, w, mira, finn, dara, bo, ada, eli, fire };
}
type Fx = ReturnType<typeof scene>;

const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const feasts = (w: World): Occasion[] => occasionsOf(w).filter((o) => o.kind === 'feast');
/** Dara turns sixteen: the world is stepped until the schedule notices, and the one feast it called is returned */
function turnSixteen(f: Fx): Occasion {
  for (let i = 0; i < 200 && !eventsWith(f.w, 'has come of age and joins the work').length; i++) stepWorld(f.w);
  expect(eventsWith(f.w, 'has come of age and joins the work.').length, 'the existing line').toBe(1);
  return feasts(f.w).pop()!;
}
/** somebody has come for the feast and stands at it (their attend activity is for this occasion) */
function come(f: Fx, o: Occasion, ...ps: Person[]): void {
  for (const p of ps) {
    startActivity(f.w, p, newActivity(f.w, p, { kind: 'attend', label: 'At the feast', goal: 'to celebrate', need: 'social', targetId: o.id, targetType: 'occasion', tx: o.x, ty: o.y, here: true, maxTicks: 9000, minCommit: 9000, data: { occasion: o.id } }));
    p.nextThink = f.w.tick + 100000;
  }
}
/** the feast opens: the world is stepped to its first tick of gathering */
function untilOpen(w: World, o: Occasion): void { for (let i = 0; i < 4000 && o.status === 'called'; i++) stepWorld(w); }
const said = (f: Fx) => eventsWith(f.w, ' came of age before ');

describe('rules 263 is registered, with its three parts', () => {
  it('is supported, and hasComingOfAge follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(263);
    expect(KIN_SCENE_PARTS).toContain('age');
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 262 }).w;
    expect([hasComingOfAge(now), hasComingOfAge(old)]).toEqual([true, false]);
    setKinScenes(false, 'age');
    expect([hasComingOfAge(now), kinScenePartOn('grief'), kinScenePartOn('settle')]).toEqual([false, true, true]);
  });
});

describe('the call', () => {
  it('when Dara turns sixteen a feast is called for her through the engine\'s own call, flagged, and labelled; the line at sixteen is still written', () => {
    const f = scene({ tag: 'call' });
    expect(feasts(f.w)).toEqual([]);
    const o = turnSixteen(f);
    expect(o.comingOfAge).toEqual([f.dara.id]);
    expect(o.about).toEqual([f.dara.id]);
    expect(isComingOfAgeFeast(o)).toBe(true);
    expect(o.naming).toBeUndefined();
    expect(eventsWith(f.w, 'is called at').map((e) => e.text)).toEqual(['A coming-of-age feast for Dara is called at the fire today.']);
    expect(eventsWith(f.w, 'has come of age and joins the work.')[0].kind).toBe('life');
    expect(() => validateComingOfAge(f.w)).not.toThrow();
  });

  it('with the part off, or at rules 262, nothing is called: a person turning sixteen is a line in the feed and a half-day wait for a hope, as before', () => {
    for (const mode of ['off', 'old'] as const) {
      if (mode === 'off') setKinScenes(false, 'age');
      const f = scene({ tag: 'old-' + mode, version: mode === 'off' ? 263 : 262 });
      for (let i = 0; i < 200 && !eventsWith(f.w, 'has come of age and joins the work').length; i++) stepWorld(f.w);
      expect(eventsWith(f.w, 'has come of age and joins the work.').length, mode).toBe(1);
      expect(feasts(f.w), mode).toEqual([]);
      expect(occasionsOf(f.w).some((o) => o.comingOfAge), mode).toBe(false);
      setKinScenes(true);
    }
  });

  it('somebody who was already grown when the world began, and a person who is not turning sixteen, call nothing', () => {
    const f = scene({ tag: 'already' });
    delete f.dara.cooldowns.stageCode; // never seen as a youth: the first look only records the stage
    f.dara.birthTick = f.w.tick - 17 * TICKS_PER_YEAR;
    run(f.w, 200);
    expect(eventsWith(f.w, 'has come of age')).toEqual([]);
    expect(feasts(f.w)).toEqual([]);
  });

  it('the young person is offered her own feast; her mother and a neighbour too; her brother of ten is not', () => {
    const f = scene({ tag: 'offer' });
    const o = turnSixteen(f);
    f.w.tick = o.at - 100;
    for (const p of [f.dara, f.mira, f.ada, f.bo]) perceive(f.w, p);
    const offer = (p: Person) => generateOptions(f.w, p, true, true).options.find((x) => x.key === `attend:${o.id}`);
    const od = offer(f.dara);
    expect(od, 'the young person').toBeTruthy();
    expect(od!.label).toBe('Go to the coming-of-age feast at the fire');
    expect(od!.parts.map(([n]) => n)).toContain('a coming-of-age feast for someone of mine');
    expect(offer(f.mira), 'her mother').toBeTruthy();
    expect(offer(f.ada), 'a neighbour').toBeTruthy();
    expect(offer(f.bo), 'children under twelve cannot attend: that rule is not relaxed').toBeUndefined();
  });

  it('with the part off the person a feast is about is not offered it, as before', () => {
    // a feast is called for Dara by hand with no flag: she is in its about and gets no option (the old rule)
    const f = scene({ tag: 'rule' });
    const o = callOccasion(f.w, 'feast', [f.dara.id], 0.58)!;
    f.w.tick = o.at - 100;
    perceive(f.w, f.dara);
    expect(generateOptions(f.w, f.dara, true, true).options.some((x) => x.key === `attend:${o.id}`)).toBe(false);
  });
});

describe('the words at the opening', () => {
  it('with Dara there and her mother and a neighbour: the mother speaks, Dara says what she hopes for, one line in the feed, the hope taken up then, those there know her better, she is glad', () => {
    const f = scene({ tag: 'said' });
    const o = turnSixteen(f);
    expect(f.dara.goal, 'no hope yet').toBeUndefined();
    come(f, o, f.dara, f.mira, f.ada);
    const fam0 = f.ada.relations[f.dara.id].familiarity;
    untilOpen(f.w, o);
    expect(o.status).toBe('gathering');
    const lines = said(f);
    expect(lines.length).toBe(1);
    const hope = f.dara.goal!;
    expect(hope, 'the hope is taken up at the feast').toBeTruthy();
    expect(lines[0].text).toBe(`Dara came of age before 2 people and hopes for ${GOAL_TEXT[hope.kind]}.`);
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.dara.id, f.mira.id, f.ada.id]);
    expect(COMING_OF_AGE_PARENT.map((l) => l.replace('{n}', 'Dara'))).toContain(f.mira.speech?.text);
    expect(f.dara.speech?.text).toMatch(/^I hope for /);
    expect(f.ada.relations[f.dara.id].familiarity).toBeGreaterThan(fam0);
    expect(f.dara.mood?.thoughts.some((t) => t.kind === 'came_of_age')).toBe(true);
    expect(f.dara.log.some((l) => l.text === 'Came of age before 2 people and said what I hope for.')).toBe(true);
    expect(f.dara.log.some((l) => l.text.startsWith('What I hope for: '))).toBe(true);
    // however long it goes on, the line is written once
    run(f.w, 300);
    expect(said(f).length).toBe(1);
  });

  it('the hope is the one life.ts would have picked: the same Dara in a world with the part off picks the same hope, up to half a day on, and the old line in her log', () => {
    const on = scene({ tag: 'same' });
    const o = turnSixteen(on);
    come(on, o, on.dara, on.mira, on.ada);
    untilOpen(on.w, o);
    setKinScenes(false, 'age');
    const off = scene({ tag: 'same' });
    for (let i = 0; i < DAY && !off.dara.goal; i++) stepWorld(off.w);
    setKinScenes(true);
    expect(off.dara.goal, 'life.ts picks it up to half a day later').toBeTruthy();
    expect(off.dara.goal!.kind).toBe(on.dara.goal!.kind);
    expect(off.dara.log.some((l) => l.text === `What I hope for: ${GOAL_TEXT[off.dara.goal!.kind]}.`)).toBe(true);
    expect(on.dara.log.some((l) => l.text === `What I hope for: ${GOAL_TEXT[on.dara.goal!.kind]}.`)).toBe(true);
  });

  it('every person who comes of age gets the hope the old rule gave: across twelve different people the part changes none of them', () => {
    // the rule reads the traits and the id and nothing else, so it can be asked by the one function at any time
    const kinds = new Set<string>();
    for (let i = 0; i < 12; i++) {
      setKinScenes(false, 'age');
      const off = scene({ tag: 'twelve-' + i });
      off.dara.traits = { ...off.dara.traits, sociability: (i % 4) / 4 + 0.1, caution: ((i * 3) % 5) / 5 + 0.05, diligence: ((i * 7) % 6) / 6 + 0.05, generosity: (i % 3) / 3 + 0.1 };
      for (let t = 0; t < DAY && !off.dara.goal; t++) stepWorld(off.w);
      setKinScenes(true);
      const on = scene({ tag: 'twelve-' + i });
      on.dara.traits = { ...off.dara.traits };
      const o = turnSixteen(on);
      come(on, o, on.dara, on.mira, on.ada);
      untilOpen(on.w, o);
      expect(on.dara.goal?.kind, `person ${i}`).toBe(off.dara.goal?.kind);
      kinds.add(off.dara.goal!.kind);
    }
    expect(kinds.size, 'the twelve are not all alike').toBeGreaterThan(1);
  });

  it('no parent there: the eldest of those there speaks instead', () => {
    const f = scene({ tag: 'elder' });
    const o = turnSixteen(f);
    come(f, o, f.dara, f.ada, f.eli);
    untilOpen(f.w, o);
    expect(said(f).length).toBe(1);
    expect(COMING_OF_AGE_ELDER.map((l) => l.replace('{n}', 'Dara'))).toContain(f.eli.speech?.text);
    expect(f.ada.speech?.text).not.toBe(f.eli.speech?.text);
  });
});

describe('failure: nothing is said and nothing is written', () => {
  it('nobody came: the existing "nobody came" line, no speech, and the hope is taken up as before, half a day after', () => {
    const f = scene({ tag: 'nobody' });
    const o = turnSixteen(f);
    for (let i = 0; i < 4000 && o.status !== 'done'; i++) stepWorld(f.w);
    expect(o.end).toBe('nobody came');
    expect(eventsWith(f.w, 'is over: nobody came').length).toBe(1);
    expect(said(f)).toEqual([]);
    expect(f.dara.speech?.text ?? '').not.toMatch(/^I hope for/);
    for (let i = 0; i < DAY && !f.dara.goal; i++) stepWorld(f.w);
    expect(f.dara.goal, 'the hope as before').toBeTruthy();
    expect(said(f)).toEqual([]);
  });

  it('she is there but nobody else (only her little brother, who cannot be there for a feast): no words, the hope is left to the half-day check', () => {
    const f = scene({ tag: 'alone' });
    const o = turnSixteen(f);
    come(f, o, f.dara, f.bo);
    untilOpen(f.w, o);
    expect(said(f)).toEqual([]);
    expect(f.dara.goal).toBeUndefined();
    expect(f.mira.speech?.text ?? '').not.toMatch(/proud|grown|small once/);
  });

  it('others came but she did not: no words, no hope taken up at the feast', () => {
    const f = scene({ tag: 'absent' });
    const o = turnSixteen(f);
    come(f, o, f.mira, f.ada);
    untilOpen(f.w, o);
    expect(said(f)).toEqual([]);
    expect(f.dara.goal).toBeUndefined();
  });
});

describe('a feast already open that day: the two purposes share it', () => {
  it('a naming feast open before she turns sixteen takes her purpose too: one feast, both flags, the label names both, and both are spoken at the opening', () => {
    const f = scene({ tag: 'share-naming' });
    const baby = addPerson(f.s, 'Tia', 36, 36, { age: 0, sex: 'f' });
    baby.parents = [f.mira.id, f.finn.id];
    f.mira.children.push(baby.id);
    expect(hasNaming(f.w)).toBe(true);
    const named = callOccasion(f.w, 'feast', [baby.id, f.mira.id], 0.58, baby.id)!;
    expect(named.naming).toEqual([baby.id]);
    const o = turnSixteen(f);
    expect(feasts(f.w).length, 'one feast, not two').toBe(1);
    expect(o).toBe(named);
    expect(o.naming).toEqual([baby.id]);
    expect(o.comingOfAge).toEqual([f.dara.id]);
    expect(o.about).toEqual([baby.id, f.mira.id, f.dara.id]);
    expect(eventsWith(f.w, 'is called at').length, 'the call of the first is the only one written').toBe(1);
    expect(() => validateComingOfAge(f.w)).not.toThrow();
    f.w.tick = o.at - 100;
    perceive(f.w, f.dara);
    const od = generateOptions(f.w, f.dara, true, true).options.find((x) => x.key === `attend:${o.id}`);
    expect(od?.label).toBe('Go to the naming and coming-of-age feast at the fire');
    come(f, o, f.dara, f.mira, f.finn, f.ada);
    untilOpen(f.w, o);
    expect(eventsWith(f.w, 'The naming and coming-of-age feast at the fire begins.').length).toBe(1);
    expect(eventsWith(f.w, ' named ').length, 'the naming is said').toBe(1);
    expect(said(f).length, 'and the coming of age').toBe(1);
  });

  it('the other way round: a coming-of-age feast open, then a birth the same day, is the naming of the child too', () => {
    const f = scene({ tag: 'share-age' });
    const o = turnSixteen(f);
    const baby = addPerson(f.s, 'Tia', 36, 36, { age: 0, sex: 'f' });
    const again = callOccasion(f.w, 'feast', [baby.id, f.mira.id], 0.58, baby.id)!;
    expect(again).toBe(o);
    expect(o.naming).toEqual([baby.id]);
    expect(o.comingOfAge).toEqual([f.dara.id]);
    expect(feasts(f.w).length).toBe(1);
  });

  it('a second young person the same day shares it, up to four; a fifth is not flagged', () => {
    const f = scene({ tag: 'share-many' });
    const o = turnSixteen(f);
    for (let i = 0; i < COMING_MAX + 1; i++) {
      const x = addPerson(f.s, 'Yo' + i, 30, 30 + i, { age: 16, sex: 'f' });
      callOccasion(f.w, 'feast', [x.id], 0.58, undefined, x.id);
    }
    expect(comingOf(o).length).toBe(COMING_MAX);
    expect(comingOf(o)[0]).toBe(f.dara.id);
    expect(() => validateComingOfAge(f.w)).not.toThrow();
  });
});

describe('the part off and the old rules', () => {
  it('makes no draw from the shared stream: the module never touches it', () => {
    expect(readFileSync('src/sim/coming_of_age.ts', 'utf8')).not.toMatch(/\.rng\b|rng\.next|keyedRng/);
  });
});

describe('save and load, the fingerprint and the checks on loading', () => {
  it('saved while the feast is called and loaded, it opens, speaks and writes exactly as the original does', () => {
    const f = scene({ tag: 'save' });
    const o = turnSixteen(f);
    come(f, o, f.dara, f.mira, f.ada);
    run(f.w, 20);
    const copy = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    const o2 = occasionsOf(copy).find((x) => x.id === o.id)!;
    expect(o2.comingOfAge).toEqual([f.dara.id]);
    for (const p of copy.persons) p.nextThink = copy.tick + 100000;
    untilOpen(f.w, o);
    untilOpen(copy, o2);
    run(f.w, 50);
    run(copy, 50);
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(eventsWith(copy, ' came of age before ').map((e) => e.text)).toEqual(eventsWith(f.w, ' came of age before ').map((e) => e.text));
    expect(eventsWith(copy, ' came of age before ').length).toBe(1);
  });

  it('the flag is in the fingerprint', () => {
    const f = scene({ tag: 'hash' });
    const o = turnSixteen(f);
    const h0 = hashWorld(f.w);
    o.comingOfAge = [f.dara.id, f.bo.id];
    expect(hashWorld(f.w)).not.toBe(h0);
  });

  it('a save holding something this part could not have made is refused', () => {
    const f = scene({ tag: 'refuse' });
    const o = turnSixteen(f);
    expect(() => validateComingOfAge(f.w)).not.toThrow();
    const good = o.comingOfAge!;
    for (const bad of [[], [0], [f.dara.id, f.dara.id], [1, 2, 3, 4, 5], ['x' as never]]) {
      o.comingOfAge = bad as number[];
      expect(() => validateComingOfAge(f.w), JSON.stringify(bad)).toThrow(/coming-of-age/i);
    }
    o.comingOfAge = good;
    o.kind = 'wedding';
    expect(() => validateComingOfAge(f.w), 'on a wedding').toThrow(/coming-of-age/i);
    o.kind = 'feast';
    f.w.settings.rulesVersion = 262;
    expect(() => validateComingOfAge(f.w), 'in a world of rules 262').toThrow(/coming-of-age/i);
  });
});

describe('the lab arms', () => {
  it('rich-no-kin-age removes the part alone, and puts it back', () => {
    const one = parseIntervention('rich-no-kin-age');
    expect(one.summary).toMatch(/no effect below rules 263/);
    const restore = one.install!() as () => void;
    expect([kinScenePartOn('grief'), kinScenePartOn('age'), kinScenePartOn('settle')]).toEqual([true, false, true]);
    restore();
    expect(KIN_SCENE_PARTS.map((q) => kinScenePartOn(q))).toEqual([true, true, true]);
  });
});
