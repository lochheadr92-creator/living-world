// Rules 263 (bundle D, part 12): settling a child for the night (src/sim/settle_child.ts, the switch in src/sim/kin_scenes.ts; offered in options_social.ts socialOptions
// through settleOption, kept in act_misc.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The last test runs an
// ordinary world for two days and PRINTS what happened (the three parts of the bundle); it asserts nothing about how much.
import { appendFileSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { BEDTIME_LINES } from '../src/sim/dialogue';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { ageYears } from '../src/sim/people';
import { dayFraction } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { describePerson } from '../src/sim/inspect';
import { KIN_SCENE_PARTS, hasSettling, kinScenePartOn, setKinScenes } from '../src/sim/kin_scenes';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import {
  SETTLE_AGE, SETTLE_ASLEEP_FOR, SETTLE_BASE, SETTLE_LINE_EVERY, SETTLE_MAX, SETTLE_MIN, SETTLE_PATIENCE, SETTLE_REST, settleEnd, validateSettling,
} from '../src/sim/settle_child';
import type { Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setKinScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const EVENING = at(0.72);
const NOON = at(0.45);

interface Opts {
  tag?: string;
  version?: number;
  tick?: number;
  /** Cora's age in years (5 by default) */
  age?: number;
  /** Cora is awake and not tired instead of asleep */
  awake?: boolean;
}

/**
 * Mira (28) and Finn (30), partners of one household; their daughter Cora (5) asleep on the ground two tiles from the camp fire, her sister Bea (3) of the household too,
 * awake and playing; Dov (30), a neighbour. Everybody knows the fire and the lake. Only the ones a test sets going decide anything.
 */
function scene(o: Opts = {}) {
  const s = stage(`settle-${o.version ?? 263}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 263;
  w.tick = o.tick ?? EVENING;
  const full = { hunger: 95, thirst: 95, energy: 80 };
  const mira = addPerson(s, 'Mira', 38, 36, { age: 28, sex: 'f', ...full });
  const finn = addPerson(s, 'Finn', 44, 34, { age: 30, sex: 'm', ...full, hh: mira.hhId });
  const cora = addPerson(s, 'Cora', 41, 37, { age: o.age ?? 5, sex: 'f', hunger: 95, thirst: 95, energy: o.awake ? 90 : 30, hh: mira.hhId });
  const bea = addPerson(s, 'Bea', 43, 40, { age: 3, sex: 'f', hunger: 95, thirst: 95, energy: 90, hh: mira.hhId });
  const dov = addPerson(s, 'Dov', 46, 34, { age: 30, sex: 'm', ...full });
  const fire = createBuilding(w, 'fire', 41, 38, 0, { fuel: 30000 });
  w.camp = { x: 41, y: 36 };
  done(s);
  mira.partnerId = finn.id; finn.partnerId = mira.id;
  Object.assign(relOf(mira, finn.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 });
  Object.assign(relOf(finn, mira.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 });
  for (const kid of [cora, bea]) {
    kid.parents = [mira.id, finn.id];
    for (const par of [mira, finn]) {
      par.children.push(kid.id);
      Object.assign(relOf(par, kid.id), { kin: 'child', affinity: 90, trust: 80, familiarity: 60 });
      Object.assign(relOf(kid, par.id), { kin: 'parent', affinity: 85, trust: 85, familiarity: 60 });
    }
  }
  for (const p of [mira, finn, cora, bea, dov]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; learn(w, p, fire); }
  // Cora sleeps where she is (or, awake, stands there doing nothing)
  startActivity(w, cora, o.awake
    ? newActivity(w, cora, { kind: 'wander', label: 'Playing', goal: 'to play', here: true, maxTicks: 9000, minCommit: 9000 })
    : newActivity(w, cora, { kind: 'sleep', label: 'Sleeping on the ground', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 9000 }));
  startActivity(w, bea, newActivity(w, bea, { kind: 'wander', label: 'Playing', goal: 'to play', here: true, maxTicks: 9000, minCommit: 9000 }));
  for (const p of [mira, finn, cora, bea, dov]) p.nextThink = w.tick + 100000;
  pin(dov);
  pin(bea); // a small child who chats would hold the parent's sit in a talk
  if (o.awake) pin(cora);
  rebuildMobileGrid(w);
  for (const p of [mira, finn, cora, bea, dov]) perceive(w, p);
  return { s, w, mira, finn, cora, bea, dov, fire };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const settleOpt = (f: Fx, p: Person, child: Person = f.cora) => options(f.w, p).find((o) => o.key === `settle:${child.id}`);
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const settling = (p: Person): boolean => p.activity?.data.settle !== undefined;
const sitData = (p: Person) => p.activity!.data.settle as { for: number; since: number; sat: number; asleep?: number; idle?: number; began?: true };
const refresh = (f: Fx): void => { rebuildMobileGrid(f.w); for (const p of [f.mira, f.finn, f.cora, f.bea, f.dov]) perceive(f.w, p); };

/** the parent takes the option and gets to the child; she is sat beside her */
function sitDown(f: Fx, parent: Person = f.mira, child: Person = f.cora): void {
  const o = settleOpt(f, parent, child);
  expect(o, 'a settling is offered').toBeTruthy();
  startActivity(f.w, parent, o!.make!()!);
  for (let i = 0; i < 400 && !(settling(parent) && parent.activity!.phase === 'work' && sitData(parent).began); i++) stepWorld(f.w);
  expect(sitData(parent).began).toBe(true);
}

describe('rules 263 is registered, with its three parts', () => {
  it('is supported, and hasSettling follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(263);
    expect(KIN_SCENE_PARTS).toEqual(['grief', 'age', 'settle']);
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 262 }).w;
    expect([hasSettling(now), hasSettling(old)]).toEqual([true, false]);
    setKinScenes(false, 'settle');
    expect([hasSettling(now), kinScenePartOn('grief'), kinScenePartOn('age')]).toEqual([false, true, true]);
  });
});

describe('the cue: offered only when everything holds', () => {
  it('Mira, who sees her daughter Cora asleep by the fire in the evening, is offered to settle her, worth the base less the walk', () => {
    const f = scene({ tag: 'offer' });
    const o = settleOpt(f, f.mira);
    expect(o, 'offered').toBeTruthy();
    expect(o!.label).toBe('Settle Cora for the night');
    expect(o!.parts.map(([n]) => n)).toEqual(['Cora is ready for bed', 'walking']);
    const walk = o!.parts.find(([n]) => n === 'walking')![1];
    expect(Math.abs(o!.util - (SETTLE_BASE + walk))).toBeLessThan(0.1);
    expect(settleOpt(f, f.finn), 'her father too').toBeTruthy();
    expect(settleOpt(f, f.mira, f.bea), 'Bea is awake and playing: nothing shows').toBeUndefined();
  });

  it('a child who is only tired (energy under 25, awake) shows it too, and is offered', () => {
    const f = scene({ tag: 'tired', awake: true });
    expect(settleOpt(f, f.mira), 'awake and rested').toBeUndefined();
    f.cora.needs.energy = 20;
    refresh(f);
    expect(settleOpt(f, f.mira), 'visibly tired').toBeTruthy();
  });

  const negatives: [string, (f: Fx) => void][] = [
    ['it is noon', () => undefined], // handled by the tick option below
    ['Cora is eight (not under eight)', (f) => { f.cora.birthTick = f.w.tick - SETTLE_AGE * TICKS_PER_YEAR - 5; }],
    ['Cora is not Mira\'s own child on Mira\'s own record', (f) => { f.mira.relations[f.cora.id].kin = ''; }],
    ["Cora is not of Mira's household", (f) => { const hh = f.w.households.find((h) => h.id === f.mira.hhId)!; hh.members = hh.members.filter((id) => id !== f.cora.id); }],
    ['Mira is critically thirsty', (f) => { f.mira.needs.thirst = 6; }],
    ['Mira is hungry (drive over 30)', (f) => { f.mira.needs.hunger = 40; }],
    ['Mira is worn out (energy drive over 60)', (f) => { f.mira.needs.energy = 15; }],
    ['a danger is believed about', (f) => { f.mira.beliefs[777777] = { id: 777777, kind: 'danger', x: 45, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never; f.mira.bykind.danger = [777777]; }],
    ['Cora was settled this evening already', (f) => { f.cora.cooldowns.settled = f.w.tick + 100; }],
    ['Mira turned back for Cora a little while ago', (f) => { f.mira.cooldowns['settle' + f.cora.id] = f.w.tick + 100; }],
    ['Cora is far from home (more than twelve tiles from the camp)', (f) => { f.cora.x = 41; f.cora.y = 60; }],
    ['somebody is already seen sitting beside her', (f) => { f.finn.activity = null; startActivity(f.w, f.finn, newActivity(f.w, f.finn, { kind: 'rest', label: 'Settling Cora', goal: 'x', here: true, maxTicks: 9000, minCommit: 9000, data: { settle: { for: f.cora.id, since: f.w.tick, sat: 5, began: true }, sticky: true } })); f.finn.x = f.cora.x + 1; f.finn.y = f.cora.y; }],
  ];
  for (const [why, change] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene({ tag: 'neg-control-' + why });
      expect(settleOpt(control, control.mira), 'control').toBeTruthy();
      const f = why === 'it is noon' ? scene({ tag: 'neg-noon', tick: NOON }) : scene({ tag: 'neg-' + why });
      change(f);
      refresh(f);
      expect(settleOpt(f, f.mira), why).toBeUndefined();
    });
  }

  it('is not offered at rules 262, with the part switched off, or to a neighbour who is no parent', () => {
    const old = scene({ tag: 'v262', version: 262 });
    expect(settleOpt(old, old.mira)).toBeUndefined();
    const off = scene({ tag: 'off' });
    setKinScenes(false, 'settle');
    expect(settleOpt(off, off.mira)).toBeUndefined();
    setKinScenes(true);
    const f = scene({ tag: 'dov' });
    Object.assign(relOf(f.dov, f.cora.id), { affinity: 60, trust: 60, familiarity: 40 });
    expect(settleOpt(f, f.dov)).toBeUndefined();
  });

  it('is read from what shows: the same Cora with her tiredness hidden from the sight Mira holds still draws the offer; once she is seen awake it goes', () => {
    const f = scene({ tag: 'sign' });
    expect(settleOpt(f, f.mira)).toBeTruthy();
    f.cora.needs.energy = 90;
    f.cora.pose = 'stand';
    f.cora.activity = null;
    refresh(f);
    expect(settleOpt(f, f.mira)).toBeUndefined();
  });
});

describe("the settling outranks the parent's own bedtime at a fire, and a worn-out parent still may", () => {
  it('at her own bedtime Mira, who sleeps at the fire (sleep is worth 0.74 of its drive there), is offered to settle Cora and it is her best option, at energy 50 and at energy 22', () => {
    const f = scene({ tag: 'bedtime', tick: at(0.86) });
    for (const energy of [50, 22]) {
      f.mira.needs.energy = energy;
      refresh(f);
      const ctx = generateOptions(f.w, f.mira, true, true);
      expect(ctx.options.some((o) => o.kind === 'sleep'), 'sleep is an option').toBe(true);
      expect(rankOptions(ctx)[0].key, `energy ${energy}`).toBe(`settle:${f.cora.id}`);
    }
  });
});

describe('the settling', () => {
  it('Mira walks to Cora and sits down beside her: a rest, marked, with a bedtime line spoken, and the inspector says what she is doing', () => {
    const f = scene({ tag: 'sit' });
    sitDown(f);
    const a = f.mira.activity!;
    expect(a.kind).toBe('rest');
    expect(a.label).toBe('Settling Cora for the night');
    expect(Math.hypot(f.mira.x - f.cora.x, f.mira.y - f.cora.y)).toBeLessThan(3.5);
    expect(BEDTIME_LINES).toContain(f.mira.speech?.text);
    expect(f.cora.cooldowns.settled).toBeGreaterThan(f.w.tick);
    expect(f.cora.cooldowns.settled).toBeLessThanOrEqual(f.w.tick + SETTLE_REST);
    expect(describePerson(f.w, f.mira.id)?.qa.doing).toMatch(/Settling Cora for the night/);
    perceive(f.w, f.dov);
    expect(f.dov.seen.find((s) => s.id === f.mira.id)?.sittingWith).toBe(true);
    expect(() => validateSettling(f.w)).not.toThrow();
  });

  it('she stays until Cora has been asleep SETTLE_ASLEEP_FOR ticks, then it is done: a line in the feed, a glad thought each, a little closer, a line in each log', () => {
    const f = scene({ tag: 'done' });
    sitDown(f);
    const aff0 = f.cora.relations[f.mira.id].affinity;
    run(f.w, SETTLE_ASLEEP_FOR + 20);
    expect(settling(f.mira)).toBe(false);
    const lines = eventsWith(f.w, 'settled little');
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe('Mira settled little Cora for the night.');
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.mira.id, f.cora.id]);
    expect(f.cora.mood?.thoughts.some((t) => t.kind === 'settled')).toBe(true);
    expect(f.mira.mood?.thoughts.some((t) => t.kind === 'settled_child')).toBe(true);
    expect(f.cora.relations[f.mira.id].affinity).toBeGreaterThan(aff0);
    expect(f.mira.log.some((l) => l.text === 'Settled Cora for the night.')).toBe(true);
    expect(f.cora.log.some((l) => l.text === 'Mira sat with me at bedtime.')).toBe(true);
    expect(f.w.households.find((h) => h.id === f.mira.hhId)!.settled).toBeLessThanOrEqual(f.w.tick);
  });

  it('it changes nothing about when or how well Cora sleeps: with the part off the same Cora has the same energy and the same sleep after the same ticks', () => {
    const on = scene({ tag: 'twin' });
    sitDown(on);
    run(on.w, 150);
    setKinScenes(false, 'settle');
    const off = scene({ tag: 'twin' });
    setKinScenes(true);
    run(off.w, on.w.tick - off.w.tick);
    expect(off.w.tick).toBe(on.w.tick);
    expect(on.cora.activity?.kind).toBe('sleep');
    expect(off.cora.activity?.kind).toBe('sleep');
    expect(on.cora.needs.energy).toBeCloseTo(off.cora.needs.energy, 6);
    expect(on.cora.pose).toBe(off.cora.pose);
    expect(eventsWith(off.w, 'settled little')).toEqual([]);
  });

  it('a child who is tired but does not fall asleep keeps her parent for SETTLE_MAX ticks at most, and it counts', () => {
    const f = scene({ tag: 'max', awake: true });
    f.cora.needs.energy = 20;
    refresh(f);
    sitDown(f);
    for (let i = 0; i < SETTLE_MAX + 60 && settling(f.mira); i++) { f.cora.needs.energy = 20; stepWorld(f.w); }
    expect(settling(f.mira)).toBe(false);
    expect(eventsWith(f.w, 'settled little Cora').length).toBe(1);
  });

  it('a child who is neither tired nor asleep for SETTLE_PATIENCE ticks is not ready for bed: the sit ends and nothing is written', () => {
    const f = scene({ tag: 'idle', awake: true });
    f.cora.needs.energy = 20;
    refresh(f);
    sitDown(f);
    for (let i = 0; i < SETTLE_PATIENCE + 30 && settling(f.mira); i++) { f.cora.needs.energy = 90; stepWorld(f.w); }
    expect(settling(f.mira)).toBe(false);
    expect(eventsWith(f.w, 'settled little')).toEqual([]);
    expect(f.mira.log.some((l) => /Settled Cora/.test(l.text))).toBe(false);
  });

  it('the cost and the care: a parent who has to see to a need of her own leaves; under SETTLE_MIN ticks nothing is written, after it the sit counts', () => {
    const early = scene({ tag: 'short' });
    sitDown(early);
    run(early.w, 10);
    early.mira.needs.thirst = 20;
    run(early.w, 5);
    expect(settling(early.mira)).toBe(false);
    expect(eventsWith(early.w, 'settled little')).toEqual([]);
    expect(early.cora.mood?.thoughts.some((t) => t.kind === 'settled')).toBeFalsy();
    const late = scene({ tag: 'late', awake: true });
    late.cora.needs.energy = 20;
    refresh(late);
    sitDown(late);
    for (let i = 0; i < SETTLE_MIN + 10; i++) { late.cora.needs.energy = 20; stepWorld(late.w); }
    late.mira.needs.thirst = 20;
    run(late.w, 5);
    expect(settling(late.mira)).toBe(false);
    expect(eventsWith(late.w, 'settled little Cora').length).toBe(1);
  });
});

describe('failure: nothing is written', () => {
  it('Cora got up before she got there: Mira turns back, no line, no thought, and she does not try again at once', () => {
    const f = scene({ tag: 'up' });
    const o = settleOpt(f, f.mira)!;
    startActivity(f.w, f.mira, o.make!()!);
    f.cora.activity = null;
    f.cora.pose = 'stand';
    f.cora.needs.energy = 90;
    startActivity(f.w, f.cora, newActivity(f.w, f.cora, { kind: 'wander', label: 'Playing', goal: 'to play', here: true, maxTicks: 9000, minCommit: 9000 }));
    pin(f.cora);
    const events0 = f.w.events.length;
    for (let i = 0; i < 300 && settling(f.mira); i++) stepWorld(f.w);
    expect(settling(f.mira)).toBe(false);
    expect(f.w.events.slice(events0).filter((e) => /settled/.test(e.text))).toEqual([]);
    expect(f.cora.mood?.thoughts.some((t) => t.kind === 'settled')).toBeFalsy();
    expect(f.cora.cooldowns.settled ?? 0).toBeLessThanOrEqual(f.w.tick);
    expect(f.mira.cooldowns['settle' + f.cora.id]).toBeGreaterThan(f.w.tick);
  });

  it('the other parent got there first: Finn, who set out too, finds Mira beside Cora and turns back; one sit, one line', () => {
    const f = scene({ tag: 'both' });
    const om = settleOpt(f, f.mira)!, of = settleOpt(f, f.finn)!;
    startActivity(f.w, f.mira, om.make!()!);
    startActivity(f.w, f.finn, of.make!()!);
    for (let i = 0; i < 400 && !(sitData(f.mira)?.began || sitData(f.finn)?.began); i++) stepWorld(f.w);
    run(f.w, 400); // the one who turned back goes to talk to his partner, and the talk holds her sit for a while: it goes on after
    expect(eventsWith(f.w, 'settled little Cora').length).toBe(1);
    const who = f.mira.log.some((l) => l.text === 'Settled Cora for the night.') ? f.mira : f.finn;
    const other = who === f.mira ? f.finn : f.mira;
    expect(other.log.some((l) => /Settled Cora/.test(l.text))).toBe(false);
  });

  it('a settled child is not settled again the same evening, and is again the next evening', () => {
    const f = scene({ tag: 'once' });
    sitDown(f);
    run(f.w, SETTLE_ASLEEP_FOR + 20);
    expect(settling(f.mira)).toBe(false);
    refresh(f);
    expect(settleOpt(f, f.mira), 'the same evening').toBeUndefined();
    expect(settleOpt(f, f.finn), 'the other parent too').toBeUndefined();
    f.w.tick += DAY;
    f.cora.cooldowns.settled = Math.min(f.cora.cooldowns.settled, f.w.tick - 1);
    f.mira.cooldowns['settle' + f.cora.id] = 0;
    refresh(f);
    expect(settleOpt(f, f.mira), 'the next evening').toBeTruthy();
  });
});

describe('the feed line: at most once for each household in two days', () => {
  it('two children settled the same evening write the two logs of each and ONE line in the feed', () => {
    const f = scene({ tag: 'two' });
    f.bea.activity = null;
    f.bea.needs.energy = 20;
    startActivity(f.w, f.bea, newActivity(f.w, f.bea, { kind: 'sleep', label: 'Sleeping on the ground', goal: 'to recover energy', need: 'energy', here: true, maxTicks: 9000, minCommit: 9000 }));
    f.bea.nextThink = f.w.tick + 100000;
    delete f.bea.cooldowns.pause; // she sleeps
    refresh(f);
    pin(f.finn);
    sitDown(f, f.mira, f.cora);
    for (let i = 0; i < 400 && settling(f.mira); i++) stepWorld(f.w);
    pin(f.mira);
    delete f.finn.cooldowns.pause;
    sitDown(f, f.finn, f.bea);
    run(f.w, SETTLE_ASLEEP_FOR + 20);
    expect(f.mira.log.some((l) => l.text === 'Settled Cora for the night.')).toBe(true);
    expect(f.finn.log.some((l) => l.text === 'Settled Bea for the night.')).toBe(true);
    expect(f.bea.log.some((l) => l.text === 'Finn sat with me at bedtime.')).toBe(true);
    expect(eventsWith(f.w, 'settled little').length).toBe(1);
  });

  it('the boundary: a line written less than two days ago stops the next; exactly two days ago lets it through', () => {
    const f = scene({ tag: 'edge' });
    sitDown(f);
    const a = f.mira.activity!;
    const hh = f.w.households.find((h) => h.id === f.mira.hhId)!;
    const sat = { ...(a.data.settle as object), sat: SETTLE_MIN + 5 };
    a.data.settle = sat;
    hh.settled = f.w.tick - (SETTLE_LINE_EVERY - 1);
    const n0 = eventsWith(f.w, 'settled little').length;
    settleEnd(f.w, f.mira, a);
    expect(eventsWith(f.w, 'settled little').length).toBe(n0);
    expect(hh.settled).toBe(f.w.tick - (SETTLE_LINE_EVERY - 1));
    hh.settled = f.w.tick - SETTLE_LINE_EVERY;
    settleEnd(f.w, f.mira, a);
    expect(eventsWith(f.w, 'settled little').length).toBe(n0 + 1);
    expect(hh.settled).toBe(f.w.tick);
  });
});

describe('the part off and the old rules', () => {
  it('with the part off, or at rules 262, nobody sits beside a sleeping child in an evening of 700 ticks and no household has a record', () => {
    for (const mode of ['off', 'old'] as const) {
      if (mode === 'off') setKinScenes(false, 'settle');
      const f = scene({ tag: 'quiet-' + mode, version: mode === 'old' ? 262 : 263 });
      f.mira.nextThink = f.w.tick;
      f.finn.nextThink = f.w.tick;
      run(f.w, 700);
      setKinScenes(true);
      expect(f.w.persons.some((p) => p.activity?.data.settle !== undefined), mode).toBe(false);
      expect(eventsWith(f.w, 'settled little'), mode).toEqual([]);
      expect(f.w.households.some((h) => h.settled !== undefined), mode).toBe(false);
    }
  });

  it('makes no draw from the shared stream: the module never touches it', () => {
    const src = readFileSync('src/sim/settle_child.ts', 'utf8');
    expect(src).not.toMatch(/\.rng\b|rng\.next|keyedRng/);
  });
});

describe('save and load, the fingerprint and the checks on loading', () => {
  it('saved in the middle of the sit and loaded, it goes on exactly as the original does, to the same line and the same fingerprint', () => {
    const f = scene({ tag: 'save' });
    sitDown(f);
    run(f.w, 30);
    expect(settling(f.mira)).toBe(true);
    const copy = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    run(f.w, SETTLE_ASLEEP_FOR + 20);
    run(copy, SETTLE_ASLEEP_FOR + 20);
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(eventsWith(copy, 'settled little Cora').map((e) => e.text)).toEqual(eventsWith(f.w, 'settled little Cora').map((e) => e.text));
    expect(eventsWith(copy, 'settled little Cora').length).toBe(1);
  });

  it('the household\'s record and the sit are in the fingerprint', () => {
    const f = scene({ tag: 'hash' });
    const h0 = hashWorld(f.w);
    f.w.households.find((h) => h.id === f.mira.hhId)!.settled = f.w.tick;
    const h1 = hashWorld(f.w);
    expect(h1).not.toBe(h0);
    sitDown(f);
    const h2 = hashWorld(f.w);
    sitData(f.mira).sat += 1;
    expect(hashWorld(f.w)).not.toBe(h2);
  });

  it('a save holding something this part could not have made is refused', () => {
    const f = scene({ tag: 'refuse' });
    const hh = f.w.households.find((h) => h.id === f.mira.hhId)!;
    hh.settled = f.w.tick + 5;
    expect(() => validateSettling(f.w)).toThrow(/settling/i);
    hh.settled = f.w.tick;
    expect(() => validateSettling(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 262;
    expect(() => validateSettling(f.w), 'in a world of rules 262').toThrow(/settling/i);
    f.w.settings.rulesVersion = 263;
    delete hh.settled;
    sitDown(f);
    expect(() => validateSettling(f.w)).not.toThrow();
    const v = sitData(f.mira);
    v.asleep = SETTLE_ASLEEP_FOR + 1;
    expect(() => validateSettling(f.w)).toThrow(/settling/i);
    v.asleep = 3;
    v.since = f.w.tick + 9;
    expect(() => validateSettling(f.w)).toThrow(/settling/i);
  });
});

describe('the lab arms', () => {
  it('rich-no-kin-scenes and rich-no-kin-settle remove the part, and put it back', () => {
    const all = parseIntervention('rich-no-kin-scenes'), one = parseIntervention('rich-no-kin-settle');
    expect(all.summary).toMatch(/no effect below rules 263/);
    expect(one.summary).toMatch(/small child at bedtime/);
    const restore = one.install!() as () => void;
    expect(kinScenePartOn('settle')).toBe(false);
    expect([kinScenePartOn('grief'), kinScenePartOn('age')]).toEqual([true, true]);
    restore();
    expect(kinScenePartOn('settle')).toBe(true);
    const restoreAll = all.install!() as () => void;
    expect(KIN_SCENE_PARTS.map((q) => kinScenePartOn(q))).toEqual([false, false, false]);
    restoreAll();
    expect(KIN_SCENE_PARTS.map((q) => kinScenePartOn(q))).toEqual([true, true, true]);
  });
});

// ───────────────────────── an ordinary world ─────────────────────────
describe('an ordinary world (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 263 for two days, the whole bundle on, and prints what happened', () => {
    // KIN_SEED (default gen-4); KIN_DAYS (default 2); KIN_OFF=1: the whole bundle off; KIN_REPORT=<file>: also append the line there
    const seed = process.env.KIN_SEED ?? 'gen-4';
    const days = Number(process.env.KIN_DAYS ?? 2);
    if (process.env.KIN_OFF) setKinScenes(false);
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 263 });
    let lastEvent = 0, settled = 0, sits = 0, cameOfAge = 0, feasts = 0;
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (/ settled little .+ for the night\.$/.test(e.text)) settled++;
        else if (/ sat with .+, who has lost /.test(e.text)) sits++;
        else if (/ came of age before /.test(e.text)) cameOfAge++;
        else if (/coming-of-age feast/.test(e.text)) feasts++;
      }
    };
    let sitTicks = 0, kids = 0;
    // where the cue gets to, sampled every 20 ticks of an evening for each grown person with a child under eight of the household: a child (true state) tired or asleep, whom the
    // parent sees so, and the settling offered (the real option planner, asked as an observer)
    let evening = 0, ready = 0, seen = 0, offered = 0;
    const t0 = Date.now();
    while (w.tick < days * DAY) {
      stepWorld(w);
      if (w.tick % 5 === 0) for (const p of w.persons) if (p.activity?.data.settle) sitTicks += 5;
      if (w.tick % 20 === 0) {
        scan();
        const f = dayFraction(w.tick);
        if (f >= 0.62 && f < 0.97) {
          for (const p of w.persons) {
            if (!p.alive || ageYears(w, p) < 16) continue;
            for (const id of p.children) {
              const c = w.byId.get(id);
              if (!c || c.ent !== 'person' || !c.alive || c.hhId !== p.hhId || ageYears(w, c) >= SETTLE_AGE) continue;
              evening++;
              if (c.pose !== 'sleep' && c.needs.energy >= 25) continue;
              ready++;
              if (!p.seen.some((x) => x.id === c.id && (x.asleep || x.tired))) continue;
              seen++;
              if (generateOptions(w, p, true, true).options.some((o) => o.key === 'settle:' + c.id)) offered++;
            }
          }
        }
      }
    }
    scan();
    for (const p of w.persons) if (p.alive && p.birthTick > w.tick - 8 * TICKS_PER_YEAR) kids++;
    const line = `kin smoke: seed ${seed}, ${days} days, ${w.persons.filter((p) => p.alive).length} people (${kids} under eight), ${((Date.now() - t0) / 1000).toFixed(0)} s, settled lines ${settled} (${sitTicks} person-ticks of parents sitting; of ${evening} evening samples of a parent and a child under eight of the household, the child tired or asleep in ${ready}, so seen by the parent in ${seen}, the settling offered in ${offered}), sat-with-the-grieving lines ${sits}, coming-of-age feasts called ${feasts}, came of age ${cameOfAge}${process.env.KIN_OFF ? ' [bundle off]' : ''}`;
    console.log(line);
    if (process.env.KIN_REPORT) appendFileSync(process.env.KIN_REPORT, line + '\n');
    expect(w.persons.length).toBeGreaterThan(0);
  }, 400_000);
});
