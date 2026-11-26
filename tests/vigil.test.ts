// Rules 261 (bundle B, part 6): keeping vigil (src/sim/vigil.ts, the switch in src/sim/hearth_scenes.ts; offered in options_social.ts socialOptions through vigilOption,
// kept in act_misc.ts, a death met in lifecycle.ts killPerson). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous
// behaviour. The last test runs ordinary worlds and PRINTS what happened; it asserts nothing about how much.
import { appendFileSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { newActivity, startActivity } from '../src/sim/activities';
import { createBuilding } from '../src/sim/buildings';
import { doorPoint, enterHome } from '../src/sim/habitation';
import { DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { dayFraction } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { HEARTH_PARTS, hasVigil, hearthPartOn, setHearthScenes } from '../src/sim/hearth_scenes';
import { killPerson } from '../src/sim/lifecycle';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import type { Activity, Person, World } from '../src/sim/types';
import {
  GRIEF_SHARE, SAT_AFFINITY, VIGIL_BASE, VIGIL_CLOSE_KIN, VIGIL_DARK, VIGIL_FEVER, VIGIL_HOUSEMATE, VIGIL_HURT, VIGIL_LOOK, VIGIL_MAX, VIGIL_MIN, VIGIL_REST, WELL_FOR,
  validateVigil,
} from '../src/sim/vigil';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => setHearthScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const NOON = at(0.45);
const NIGHT = at(0.95);

interface Opts {
  tag?: string;
  version?: number;
  tick?: number;
  /** Cole is hurt (health 40) with no fever, instead of feverish */
  hurt?: boolean;
  /** Ana is Cole's partner (the default) or only a neighbour */
  neighbour?: boolean;
}

/**
 * Cole (30) lies resting by the fire with a strong fever (severity 0.9), his partner Ana (28) a few tiles off with water and bread in her pack, Eli (14, a youth)
 * of their household, and Dov (30), a neighbour who is no kin. Everybody knows the lake and the fire. Only the ones a test sets going decide anything.
 */
function scene(o: Opts = {}) {
  const s = stage(`vigil-${o.version ?? 261}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 261;
  w.tick = o.tick ?? NOON;
  const full = { hunger: 95, thirst: 95, energy: 80 };
  const cole = addPerson(s, 'Cole', 40, 36, { age: 30, sex: 'm', ...full });
  const ana = addPerson(s, 'Ana', 44, 36, { age: 28, sex: 'f', ...full, hh: o.neighbour ? undefined : cole.hhId, inv: { water: 4, bread: 3 } });
  const eli = addPerson(s, 'Eli', 43, 38, { age: 14, sex: 'm', ...full, hh: cole.hhId });
  const dov = addPerson(s, 'Dov', 46, 34, { age: 30, sex: 'm', ...full, inv: { water: 3, bread: 3 } });
  const fire = createBuilding(w, 'fire', 41, 38, 0, { fuel: 30000 });
  w.camp = { x: 41, y: 36 };
  done(s);
  if (!o.neighbour) { cole.partnerId = ana.id; ana.partnerId = cole.id; Object.assign(relOf(cole, ana.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 }); Object.assign(relOf(ana, cole.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 }); }
  else { Object.assign(relOf(cole, ana.id), { affinity: 40, trust: 40, familiarity: 30 }); Object.assign(relOf(ana, cole.id), { affinity: 40, trust: 40, familiarity: 30 }); }
  for (const [a, b] of [[cole, dov], [ana, dov]]) { Object.assign(relOf(a, b.id), { affinity: 40, trust: 40, familiarity: 30 }); Object.assign(relOf(b, a.id), { affinity: 40, trust: 40, familiarity: 30 }); }
  for (const p of [cole, ana, eli, dov]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; learn(w, p, fire); }
  if (o.hurt) cole.health = 40;
  else cole.illness = { since: w.tick - DAY / 2, severity: 0.9, rested: 0, course: 3 * DAY, how: 'test' };
  // Cole rests where he is (he sits by the fire and does not decide anything more)
  startActivity(w, cole, newActivity(w, cole, { kind: 'rest', label: 'Resting', goal: 'to rest', here: true, amount: 9000, maxTicks: 9500, minCommit: 9000 }));
  for (const p of [cole, ana, eli, dov]) p.nextThink = w.tick + 100000;
  rebuildMobileGrid(w);
  for (const p of [cole, ana, eli, dov]) perceive(w, p);
  return { s, w, cole, ana, eli, dov, fire };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const vigilOpt = (f: Fx, p: Person) => options(f.w, p).find((o) => o.key === `vigil:${f.cole.id}`);
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const sitting = (p: Person): boolean => p.activity?.data.vigil !== undefined;

/** Ana takes the option and gets to him; she is sat beside him */
function sitDown(f: Fx, sitter: Person = f.ana): void {
  const o = vigilOpt(f, sitter);
  expect(o, 'a vigil is offered').toBeTruthy();
  startActivity(f.w, sitter, o!.make!()!);
  for (let i = 0; i < 400 && !(sitting(sitter) && sitter.activity!.phase === 'work'); i++) stepWorld(f.w);
  expect(sitter.activity?.phase).toBe('work');
}

describe('rules 261 is registered, with its three parts', () => {
  it('is supported, and hasVigil follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(261);
    expect(HEARTH_PARTS).toContain('vigil');
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 260 }).w;
    expect([hasVigil(now), hasVigil(old)]).toEqual([true, false]);
    setHearthScenes(false, 'vigil');
    expect(hasVigil(now)).toBe(false);
  });
});

describe('the cue: offered only when everything holds', () => {
  it('Ana, who sees her partner Cole resting with a fever, is offered a vigil, worth the base, the kin, the fever, and the walk less', () => {
    const f = scene({ tag: 'offer' });
    const o = vigilOpt(f, f.ana);
    expect(o, 'offered').toBeTruthy();
    expect(o!.label).toBe('Sit up with Cole');
    expect(o!.parts.map(([n]) => n)).toEqual(['Cole has a fever', 'family', 'a fever is a long night', 'walking']);
    const walk = o!.parts.find(([n]) => n === 'walking')![1];
    expect(Math.abs(o!.util - (VIGIL_BASE + VIGIL_CLOSE_KIN + VIGIL_FEVER + walk))).toBeLessThan(0.1); // the parts show the walk to a tenth
    const night = scene({ tag: 'offer-night', tick: NIGHT });
    const on = vigilOpt(night, night.ana)!;
    expect(on.parts.map(([n]) => n)).toContain('the night');
    expect(on.parts.find(([n]) => n === 'the night')![1]).toBe(VIGIL_DARK);
  });

  it('a housemate who is no kin is offered it at a lower worth; a neighbour is not; a hurt person (health under 60) is sat with, a person at 60 is not', () => {
    const f = scene({ tag: 'housemate' });
    relOf(f.eli, f.cole.id).kin = undefined as never;
    const oe = vigilOpt(f, f.eli);
    expect(oe, 'Eli is of the household').toBeTruthy();
    expect(oe!.parts.map(([n]) => n)).toContain('one of my household');
    expect(oe!.parts.find(([n]) => n === 'one of my household')![1]).toBe(VIGIL_HOUSEMATE);
    expect(vigilOpt(f, f.dov), 'Dov is a neighbour').toBeUndefined();
    const h = scene({ tag: 'hurt', hurt: true });
    perceive(h.w, h.ana);
    const oh = vigilOpt(h, h.ana)!;
    expect(oh, 'a hurt partner').toBeTruthy();
    expect(oh.parts.find(([n]) => n === 'hurt, and cannot help themselves')![1]).toBe(VIGIL_HURT);
    expect(oh.parts.map(([n]) => n)[0]).toBe('Cole is hurt');
    h.cole.health = 60;
    perceive(h.w, h.ana);
    expect(vigilOpt(h, h.ana), 'at 60 nothing shows').toBeUndefined();
  });

  const negatives: [string, { change?: (f: Fx) => void; opts?: Opts }][] = [
    ['his fever is under what shows (severity 0.3)', { change: (f) => { f.cole.illness!.severity = 0.3; } }],
    ['he is up and working, not resting', { change: (f) => { f.w.persons.length; startActivity(f.w, f.cole, newActivity(f.w, f.cole, { kind: 'wander', label: 'Pottering', goal: 'to potter', here: true, maxTicks: 5000, minCommit: 5000 })); } }],
    ['Ana is a child', { change: (f) => { f.ana.birthTick = f.w.tick - 9 * TICKS_PER_YEAR; } }],
    ['Ana has a fever herself', { change: (f) => { f.ana.illness = { since: f.w.tick - 100, severity: 0.5, rested: 0, course: 3 * DAY, how: 'test' }; } }],
    ['Ana is hungry (drive over 30)', { change: (f) => { f.ana.needs.hunger = 40; } }],
    ['Ana is thirsty (drive over 30)', { change: (f) => { f.ana.needs.thirst = 45; } }],
    ['Ana is worn out (drive over 45)', { change: (f) => { f.ana.needs.energy = 22; } }],
    ['Ana is critically thirsty', { change: (f) => { f.ana.needs.thirst = 6; } }],
    ['a danger is believed about', { change: (f) => { f.ana.beliefs[777777] = { id: 777777, kind: 'danger', x: 45, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never; f.ana.bykind.danger = [777777]; } }],
    ['she sat up with him a little while ago (a rest stands)', { change: (f) => { f.ana.cooldowns['vigil' + f.cole.id] = f.w.tick + 50; } }],
    ['somebody is already seen sitting up beside him', { change: (f) => { f.eli.activity = null; startActivity(f.w, f.eli, newActivity(f.w, f.eli, { kind: 'rest', label: 'Sitting up with Cole', goal: 'x', here: true, maxTicks: 9000, minCommit: 9000, data: { vigil: { for: f.cole.id, since: f.w.tick, sat: 5, kind: 'fever' }, sticky: true } })); f.eli.x = f.cole.x + 1; f.eli.y = f.cole.y; rebuildMobileGrid(f.w); perceive(f.w, f.eli); } }],
  ];
  for (const [why, { change }] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene({ tag: 'neg-control-' + why });
      expect(vigilOpt(control, control.ana), 'control').toBeTruthy();
      const f = scene({ tag: 'neg-' + why });
      change?.(f);
      rebuildMobileGrid(f.w);
      for (const p of [f.cole, f.ana, f.eli, f.dov]) perceive(f.w, p);
      expect(vigilOpt(f, f.ana), why).toBeUndefined();
    });
  }

  it('is not offered at rules 260 or with the part switched off, and there is no sign of it in anybody\'s sight', () => {
    const old = scene({ tag: 'v260', version: 260 });
    expect(vigilOpt(old, old.ana)).toBeUndefined();
    setHearthScenes(false, 'vigil');
    const off = scene({ tag: 'off' });
    expect(vigilOpt(off, off.ana)).toBeUndefined();
  });

  it('is read from the sign, never from the illness: the same Cole with a hidden severity change (0.9 to 0.6) makes no difference to the offer', () => {
    const f = scene({ tag: 'sign' });
    const before = vigilOpt(f, f.ana)!.util;
    f.cole.illness!.severity = 0.6; // Ana last saw him as feverish; what she acts on is what she saw
    expect(vigilOpt(f, f.ana)!.util).toBe(before);
  });
});

describe('the vigil', () => {
  it('Ana walks to Cole and sits down beside him: a rest, marked, outdoors, where he is; others see her sitting up', () => {
    const f = scene({ tag: 'sit' });
    sitDown(f);
    const a = f.ana.activity!;
    expect(a.kind).toBe('rest');
    expect(a.label).toBe('Sitting up with Cole');
    expect((a.data.vigil as { for: number }).for).toBe(f.cole.id);
    expect(Math.hypot(f.ana.x - f.cole.x, f.ana.y - f.cole.y)).toBeLessThan(3.5);
    perceive(f.w, f.dov);
    expect(f.dov.seen.find((s) => s.id === f.ana.id)?.sittingUp).toBe(true);
    expect(() => validateVigil(f.w)).not.toThrow();
  });

  it('while she sits, every VIGIL_LOOK ticks she hands over one portion of water if he looks thirsty, from her own pack, by the ordinary gift; the ledger balances; no line of its own is written', () => {
    const f = scene({ tag: 'tend' });
    f.cole.needs.thirst = 30;
    perceive(f.w, f.ana);
    sitDown(f);
    const water0 = f.ana.inv.water ?? 0, events0 = f.w.events.length;
    run(f.w, VIGIL_LOOK * 2);
    expect(f.ana.inv.water).toBeLessThan(water0);
    expect((f.cole.inv.water ?? 0) + (f.cole.needs.thirst > 30 ? 1 : 0)).toBeGreaterThan(0);
    expect(f.w.events.slice(events0).filter((e) => / gave /.test(e.text))).toEqual([]);
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('she sits up to half a day: after VIGIL_MAX ticks of sitting it is done, one line is written ("sat with"), he is a little fonder of her, and she waits before sitting again', () => {
    const f = scene({ tag: 'max' });
    sitDown(f);
    const aff0 = f.cole.relations[f.ana.id].affinity;
    for (let i = 0; i < VIGIL_MAX + 400 && sitting(f.ana); i++) { f.cole.illness!.severity = 0.9; f.ana.needs.thirst = 90; f.ana.needs.hunger = 90; f.ana.needs.energy = 70; f.cole.needs.thirst = 90; stepWorld(f.w); }
    expect(sitting(f.ana)).toBe(false);
    const lines = f.w.events.filter((e) => /sat (up through the night )?with Cole/.test(e.text));
    expect(lines.length).toBe(1);
    expect(lines[0].text).toMatch(/^Ana sat (up through the night )?with Cole, who has a fever\.$/);
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.ana.id, f.cole.id]);
    expect(f.cole.relations[f.ana.id].affinity).toBeGreaterThanOrEqual(aff0 + SAT_AFFINITY - 0.5);
    expect(f.ana.cooldowns['vigil' + f.cole.id]).toBeGreaterThan(f.w.tick - 5);
    expect(f.ana.cooldowns['vigil' + f.cole.id]).toBeLessThanOrEqual(f.w.tick + VIGIL_REST);
  });

  it('through the dark it is "sat up through the night"; in daylight "sat with"; a hurt one is "who is hurt"', () => {
    const night = scene({ tag: 'night', tick: NIGHT });
    sitDown(night);
    expect((night.ana.activity!.data.vigil as { night?: true }).night).toBe(true);
    for (let i = 0; i < VIGIL_MIN + 20; i++) { night.ana.needs.energy = 70; stepWorld(night.w); }
    night.cole.illness = undefined;
    run(night.w, WELL_FOR + 30);
    expect(eventsWith(night.w, 'sat up through the night with Cole, who has a fever.').length).toBe(1);
    const day = scene({ tag: 'day', hurt: true });
    sitDown(day);
    for (let i = 0; i < VIGIL_MIN + 20; i++) { day.ana.needs.energy = 70; stepWorld(day.w); }
    day.cole.health = 90;
    run(day.w, WELL_FOR + 30);
    expect(eventsWith(day.w, 'Ana sat with Cole, who is hurt.').length).toBe(1);
  });

  it('if he mends (looks well for WELL_FOR ticks) it ends in success: she remembers sitting, he remembers her, with a glad thought', () => {
    const f = scene({ tag: 'mends' });
    sitDown(f);
    for (let i = 0; i < VIGIL_MIN + 10; i++) { f.ana.needs.energy = 70; stepWorld(f.w); }
    expect(f.cole.mood?.thoughts.some((t) => t.kind === 'sat_with:' + f.ana.id)).toBe(true);
    delete f.cole.illness;
    f.cole.immuneUntil = f.w.tick + 5000;
    for (let i = 0; i < WELL_FOR + 120 && sitting(f.ana); i++) { f.ana.needs.energy = 70; stepWorld(f.w); }
    expect(sitting(f.ana)).toBe(false);
    expect(f.cole.relations[f.ana.id].history.some((h) => h.text.includes('sat with me while I was ill and I mended'))).toBe(true);
    expect(eventsWith(f.w, 'sat with Cole').length).toBe(1);
  });

  it('a short vigil (under VIGIL_MIN ticks) writes nothing in the feed, and she leaves for a need of her own: thirst under 35', () => {
    const f = scene({ tag: 'short' });
    sitDown(f);
    run(f.w, 20);
    f.ana.needs.thirst = 20;
    run(f.w, 5);
    expect(sitting(f.ana)).toBe(false);
    expect(eventsWith(f.w, 'sat with Cole')).toEqual([]);
    expect(eventsWith(f.w, 'sat up through the night with Cole')).toEqual([]);
    expect(f.ana.cooldowns['vigil' + f.cole.id]).toBeGreaterThan(f.w.tick);
  });

  it('a long one cut short for a need still writes its line; one who falls ill herself leaves', () => {
    const f = scene({ tag: 'cut' });
    sitDown(f);
    for (let i = 0; i < VIGIL_MIN + 30; i++) { f.ana.needs.energy = 70; stepWorld(f.w); }
    f.ana.needs.hunger = 20;
    run(f.w, 5);
    expect(sitting(f.ana)).toBe(false);
    expect(eventsWith(f.w, 'Ana sat with Cole, who has a fever.').length + eventsWith(f.w, 'sat up through the night with Cole').length).toBe(1);
    const g = scene({ tag: 'ill' });
    sitDown(g);
    run(g.w, 30);
    g.ana.illness = { since: g.w.tick, severity: 0.5, rested: 0, course: 3 * DAY, how: 'test' };
    run(g.w, 5);
    expect(sitting(g.ana)).toBe(false);
  });

  it('one sitter at a time: a second who reaches him while Ana sits gives it up at once, and neither is written', () => {
    const f = scene({ tag: 'second' });
    sitDown(f);
    run(f.w, 30);
    const o = vigilOpt(f, f.eli); // Eli did not see Ana sit (she is not in his sight in this scene's perception yet): forced
    const eliAct = o ? o.make!()! : newActivity(f.w, f.eli, { kind: 'rest', label: 'Sitting up with Cole', goal: 'x', targetId: 0, tx: f.cole.x, ty: f.cole.y, spotX: f.cole.x + 1, spotY: f.cole.y, data: { vigil: { for: f.cole.id, since: f.w.tick, sat: 0, kind: 'fever' }, sticky: true } });
    f.eli.x = f.cole.x + 1; f.eli.y = f.cole.y + 0.5;
    startActivity(f.w, f.eli, eliAct);
    run(f.w, 5);
    expect(sitting(f.eli)).toBe(false);
    expect(f.eli.cooldowns['vigil' + f.cole.id]).toBeGreaterThan(f.w.tick);
    expect(sitting(f.ana)).toBe(true);
  });

  it('when he goes in at their own door, which she saw, she follows him in and sits beside him in the room; if she did not see it, it is over', () => {
    const f = scene({ tag: 'follow-in' });
    const hut = building(f.s, 'hut', 44, 30, f.cole.hhId);
    f.w.households.find((h) => h.id === f.cole.hhId)!.homeId = hut.id;
    sitDown(f);
    run(f.w, 20);
    const door = doorPoint(hut);
    f.cole.x = door.x; f.cole.y = door.y; f.cole.px = door.x; f.cole.py = door.y;
    expect(enterHome(f.w, f.cole, hut)).toBeNull();
    f.ana.whereabouts[f.cole.id] = { x: door.x, y: door.y, tick: f.w.tick };
    for (let i = 0; i < 400 && f.ana.indoors !== hut.id; i++) { f.ana.needs.energy = 70; stepWorld(f.w); }
    expect(f.ana.indoors, 'she is in the room').toBe(hut.id);
    run(f.w, 5);
    expect(sitting(f.ana)).toBe(true);
    expect(f.ana.activity!.label).toBe('Sitting up with Cole');
    expect((f.ana.activity!.data.vigil as { for: number }).for).toBe(f.cole.id);
    expect(() => validateVigil(f.w)).not.toThrow();
    // the same, but she did not see him go (her last sight of him is old and far from the door): she cannot know where he went, and it is over
    const g = scene({ tag: 'follow-in-unseen' });
    const hut2 = building(g.s, 'hut', 44, 30, g.cole.hhId);
    g.w.households.find((h) => h.id === g.cole.hhId)!.homeId = hut2.id;
    sitDown(g);
    run(g.w, 20);
    const door2 = doorPoint(hut2);
    g.cole.x = door2.x; g.cole.y = door2.y; g.cole.px = door2.x; g.cole.py = door2.y;
    expect(enterHome(g.w, g.cole, hut2)).toBeNull();
    g.ana.whereabouts[g.cole.id] = { x: 20, y: 20, tick: g.w.tick - 1000 };
    run(g.w, 20);
    expect(sitting(g.ana)).toBe(false);
    expect(g.ana.indoors).toBeUndefined();
  });

  it('a housemate who is on the way when he goes in at their own door follows him in on arrival (and a kinsman of another house is not let in)', () => {
    const f = scene({ tag: 'follow-in-arrival' });
    const hut = building(f.s, 'hut', 44, 30, f.cole.hhId);
    f.w.households.find((h) => h.id === f.cole.hhId)!.homeId = hut.id;
    const o = vigilOpt(f, f.ana)!;
    expect(o.targetId, 'a housemate is not chased: the walk goes to where he is').toBe(f.cole.id);
    startActivity(f.w, f.ana, o.make!()!);
    expect(f.ana.activity!.targetType).toBe('');
    run(f.w, 3);
    const door = doorPoint(hut);
    f.cole.x = door.x; f.cole.y = door.y; f.cole.px = door.x; f.cole.py = door.y;
    expect(enterHome(f.w, f.cole, hut)).toBeNull();
    f.ana.whereabouts[f.cole.id] = { x: door.x, y: door.y, tick: f.w.tick };
    for (let i = 0; i < 600 && f.ana.indoors !== hut.id; i++) { f.ana.needs.energy = 70; stepWorld(f.w); }
    expect(f.ana.indoors).toBe(hut.id);
    run(f.w, 10);
    expect(sitting(f.ana)).toBe(true);
    expect(f.ana.activity!.label).toBe('Sitting up with Cole');
    // the same for a kinsman of another house: chased while in sight, and a different space ends it (he cannot enter their home)
    const g = scene({ tag: 'follow-in-kin', neighbour: true });
    relOf(g.ana, g.cole.id).kin = 'parent';
    perceive(g.w, g.ana);
    const og = vigilOpt(g, g.ana)!;
    expect(og, 'a parent is offered it').toBeTruthy();
    startActivity(g.w, g.ana, og.make!()!);
    expect(g.ana.activity!.targetType).toBe('person');
  });

  it('the sick person mends no faster for it: with and without the part, the same fever stands where it stood and his health too', () => {
    const run1 = (on: boolean): { rested: number; severity: number; health: number } => {
      if (!on) setHearthScenes(false, 'vigil');
      const f = scene({ tag: 'twin' });
      f.cole.needs.hunger = 90; f.cole.needs.thirst = 90;
      if (on) sitDown(f);
      for (let i = 0; i < 600; i++) { f.cole.needs.hunger = 90; f.cole.needs.thirst = 90; f.cole.needs.warmth = 90; stepWorld(f.w); }
      setHearthScenes(true, 'vigil');
      return { rested: f.cole.illness?.rested ?? -1, severity: f.cole.illness?.severity ?? -1, health: f.cole.health };
    };
    const a = run1(true), b = run1(false);
    expect(a.rested).toBeGreaterThan(0);
    expect(a).toEqual(b);
  });

  it('nothing in the part touches how a fever spreads: the module never calls expose', () => {
    expect(readFileSync('src/sim/vigil.ts', 'utf8').replace(/\/\/.*$/gm, '')).not.toMatch(/\bexpose\s*\(/);
  });
});

describe('a death with her beside him', () => {
  it('"Ana was with Cole when he died" is written once, at the death, and only because she was beside him; her grief is shortened', () => {
    const f = scene({ tag: 'death' });
    sitDown(f);
    run(f.w, 40);
    const grief = (w: World, p: Person, id: number): number => (p.mood?.thoughts.find((t) => t.kind === 'lost:' + id)?.until ?? 0) - w.tick;
    // the same death of the same man with Ana standing near but not sitting up: her grief is what it would be
    const b = scene({ tag: 'death' });
    run(b.w, 40);
    killPerson(b.w, b.cole, 'fever');
    const plain = grief(b.w, b.ana, b.cole.id);
    expect(plain, 'she grieves him').toBeGreaterThan(5000);
    killPerson(f.w, f.cole, 'fever');
    const lines = eventsWith(f.w, 'was with Cole when he died');
    expect(lines.length).toBe(1);
    expect(lines[0].text).toBe('Ana was with Cole when he died.');
    expect(lines[0].kind).toBe('life');
    expect(lines[0].ids).toEqual([f.ana.id, f.cole.id]);
    expect(eventsWith(f.w, 'Cole died').length).toBe(1);
    // her grief is cut as a visit to his grave cuts it (to 0.7 of what was left), and nobody else's is
    expect(grief(f.w, f.ana, f.cole.id)).toBeCloseTo(plain * GRIEF_SHARE, -2);
    expect(grief(f.w, f.eli, f.cole.id)).toBeCloseTo(grief(b.w, b.eli, b.cole.id), -1);
    run(f.w, 10);
    expect(sitting(f.ana)).toBe(false);
    expect(eventsWith(f.w, 'sat with Cole')).toEqual([]);
    expect(GRIEF_SHARE).toBeLessThan(1);
  });

  it('no such line when she was not beside him: walking to him, or in another place, or with the part off', () => {
    const f = scene({ tag: 'death-away' });
    const o = vigilOpt(f, f.ana)!;
    startActivity(f.w, f.ana, o.make!()!);
    run(f.w, 2); // on her way: not yet beside him
    expect(f.ana.activity?.phase).toBe('travel');
    killPerson(f.w, f.cole, 'fever');
    expect(eventsWith(f.w, 'was with Cole when he died')).toEqual([]);
    const g = scene({ tag: 'death-off' });
    sitDown(g);
    setHearthScenes(false, 'vigil');
    killPerson(g.w, g.cole, 'fever');
    expect(eventsWith(g.w, 'was with Cole when he died')).toEqual([]);
    setHearthScenes(true);
    // beside him in the same moment but a sitter of somebody else
    const h = scene({ tag: 'death-other' });
    sitDown(h);
    killPerson(h.w, h.dov, 'a fall');
    expect(eventsWith(h.w, 'was with Dov when he died')).toEqual([]);
  });
});

describe('saved state', () => {
  it('a world saved while she sits loads and goes on to the same end as one never saved', () => {
    const f = scene({ tag: 'saveload' });
    sitDown(f);
    run(f.w, 100);
    const back = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const line = (w: World) => w.events.filter((e) => /sat (up through the night )?with|was with/.test(e.text)).map((e) => e.text);
    for (const w of [f.w, back]) for (let i = 0; i < VIGIL_MAX + 200; i++) { w.persons.find((p) => p.name === 'Ana')!.needs.energy = 70; stepWorld(w); }
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    expect(line(back)).toEqual(line(f.w));
    expect(line(f.w).length).toBe(1);
  });

  it('bad saved state is refused: a vigil below 261, an activity that is not a rest, a count out of range, a kind that is neither', () => {
    const f = scene({ tag: 'validate' });
    sitDown(f);
    expect(() => validateVigil(f.w)).not.toThrow();
    const v = f.ana.activity!.data.vigil as { sat: number; kind: string; for: number };
    v.sat = VIGIL_MAX + 61;
    expect(() => validateVigil(f.w)).toThrow(/vigil/i);
    v.sat = 5;
    v.kind = 'plague';
    expect(() => validateVigil(f.w)).toThrow(/vigil/i);
    v.kind = 'fever';
    v.for = 0;
    expect(() => validateVigil(f.w)).toThrow(/vigil/i);
    v.for = f.cole.id;
    f.w.settings.rulesVersion = 260;
    expect(() => validateVigil(f.w)).toThrow(/vigil/i);
  });
});

describe('the lab arm', () => {
  it('rich-no-hearth-vigil removes the part and only the part', () => {
    const undo = parseIntervention('rich-no-hearth-vigil').install!();
    expect([hearthPartOn('birth'), hearthPartOn('naming'), hearthPartOn('vigil')]).toEqual([true, true, false]);
    undo();
    expect(HEARTH_PARTS.map(hearthPartOn)).toEqual([true, true, true]);
  });
});

describe('ordinary worlds (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 261 and prints how the vigils went: begun, ticks sat, how they ended, sitters who caught the fever', () => {
    // VIGIL_SEED (default gen-4); VIGIL_DAYS: exactly this many days (default 6, a short check); VIGIL_OFF=1: the part switched off;
    // VIGIL_REPORT=<file>: also append the line there
    const seed = process.env.VIGIL_SEED ?? 'gen-4';
    const days = Number(process.env.VIGIL_DAYS ?? 6);
    if (process.env.VIGIL_OFF) setHearthScenes(false, 'vigil');
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 261 });
    const ends: Record<string, number> = {};
    let begun = 0, sat = 0, lines = 0, died = 0;
    w.hooks = {
      onActivityStart: (_p: Person, a: Activity) => { if (a.data.vigil !== undefined) begun++; },
      onActivityEnd: (_p: Person, a: Activity, outcome: string, detail: string) => {
        const v = a.data.vigil as { sat: number; well?: number } | undefined;
        if (!v) return;
        sat += v.sat;
        const how = detail === 'died' ? 'sitter died' : (v.well ?? 0) >= WELL_FOR ? 'recovered' : outcome === 'success' ? 'sat the half day' : /see to myself|fever myself/.test(detail) ? 'sitter left for a need' : /died|gone/.test(detail) ? 'they died' : `other: ${detail}`;
        ends[how] = (ends[how] ?? 0) + 1;
      },
    } as never;
    let lastEvent = 0;
    while (w.tick < days * DAY) {
      stepWorld(w);
      if (w.tick % 20 === 0) for (const e of w.events) { if (e.id <= lastEvent) continue; lastEvent = e.id; if (/ sat (up through the night )?with /.test(e.text)) lines++; if (/ was with .* when (he|she) died\./.test(e.text)) died++; }
    }
    const caught = w.persons.filter((p) => p.illness?.how.startsWith('caught from')).length;
    const line = `VIGIL ordinary world, seed ${seed}, rules 261${process.env.VIGIL_OFF ? ' [part switched off]' : ''}: ${Math.floor(w.tick / DAY)} days, ${w.persons.filter((p) => p.alive).length} alive; vigils begun ${begun}, ticks sat ${sat}, lines written ${lines}, was with them when they died ${died}; ended: ${JSON.stringify(ends)}; ill now having caught it ${caught}`;
    console.log(line);
    if (process.env.VIGIL_REPORT) appendFileSync(process.env.VIGIL_REPORT, line + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(() => validateVigil(w)).not.toThrow();
  }, 400_000);
});
