// Rules 261 (bundle B, part 4): helping at a birth (src/sim/birth_help.ts, the switch in src/sim/hearth_scenes.ts; offered in options_social.ts
// optBirthHelp and lieInOption, answered in social.ts, the lying in in act_misc.ts, the helper's wait in welfare.ts, the birth in lifecycle.ts
// giveBirth). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The last test runs ordinary
// worlds and PRINTS what happened; it asserts nothing about how much.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { endActivity, newActivity, startActivity, suspendActivity } from '../src/sim/activities';
import { DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { LIFE_CHECK_EVERY } from '../src/sim/lifecycle';
import {
  ASKS_MAX, ASK_BASE, ASK_EARLY, ASK_BORNE, ASK_KIN, ASK_WOMAN, ATTENDED_MAX, BIRTH_LAG, BORN_ALONE, BORN_MOTHER_AFFINITY, HELP_AFTER, HELP_WAIT_MAX, LYING_SCORE, LYING_WINDOW, validateBirthHelp,
} from '../src/sim/birth_help';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { HEARTH_PARTS, hasBirthHelp, hasNaming, hasVigil, hearthPartOn, setHearthScenes } from '../src/sim/hearth_scenes';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { isWalkable, rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setHearthScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const NOON = at(0.45);
const NIGHT = at(0.92);

interface Opts {
  tag?: string;
  tick?: number;
  /** ticks from now to her time */
  left?: number;
  /** a woman with no home */
  noHome?: boolean;
  /** nobody else in her household */
  alone?: boolean;
  /** Ada is already laid up with a fever (she will say no) */
  adaIll?: boolean;
  adaX?: number;
  noBo?: boolean;
}

/**
 * Mira (27), expecting, her partner Finn (30) in the same household with a hut for a home; Ada (32, kind) and Bo (30) of other households a
 * few tiles off; the lake is known to everybody. Only the ones a test sets going decide anything.
 */
function scene(version: number, o: Opts = {}) {
  const s = stage(`birth-${version}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = o.tick ?? NOON;
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const mira = addPerson(s, 'Mira', 38, 33, { age: 27, sex: 'f', ...full, traits: { sociability: 0.5 } });
  const finn = o.alone ? null : addPerson(s, 'Finn', 36, 34, { age: 30, sex: 'm', ...full, hh: mira.hhId, traits: { sociability: 0.6, generosity: 0.6 } });
  const hut = o.noHome ? null : building(s, 'hut', 34, 30, mira.hhId);
  const ada = addPerson(s, 'Ada', o.adaX ?? 44, 33, { age: 32, sex: 'f', ...full, traits: { generosity: 0.8, sociability: 0.7 } });
  const bo = o.noBo ? null : addPerson(s, 'Bo', 42, 36, { age: 30, sex: 'm', ...full, traits: { generosity: 0.7, sociability: 0.6 } });
  w.camp = { x: 41, y: 36 };
  done(s);
  if (hut) w.households.find((h) => h.id === mira.hhId)!.homeId = hut.id;
  for (const p of [mira, finn, ada, bo]) if (p) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; }
  if (finn) { mira.partnerId = finn.id; finn.partnerId = mira.id; Object.assign(relOf(mira, finn.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 }); Object.assign(relOf(finn, mira.id), { kin: 'partner', affinity: 80, trust: 80, familiarity: 60 }); }
  mira.pregnantUntil = w.tick + (o.left ?? 700);
  mira.pregnantBy = finn ? finn.id : 0;
  for (const [a, b] of [[finn, ada], [mira, ada], [finn, bo]] as [Person | null, Person | null][]) if (a && b) { Object.assign(relOf(a, b.id), { familiarity: 20, affinity: 30, trust: 25 }); Object.assign(relOf(b, a.id), { familiarity: 20, affinity: 30, trust: 25 }); }
  if (o.adaIll) ada.illness = { since: w.tick - DAY, severity: 0.8, rested: 0, course: 3 * DAY, how: 'test' };
  if (hut) for (const p of [mira, finn]) if (p) learn(w, p, hut);
  // nobody decides anything of their own accord: each does what is started for them, or what a promise sends them to do
  for (const p of [mira, finn, ada, bo]) if (p) p.nextThink = w.tick + 100000;
  rebuildMobileGrid(w);
  for (const p of [mira, finn, ada, bo]) if (p) perceive(w, p);
  return { s, w, mira, finn, ada, bo, hut };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const lieIn = (f: Fx) => options(f.w, f.mira).find((o) => o.key === 'lie_in');
const askKey = (q: Person) => `socialize:${q.id}:request:birth`;
const askOf = (f: Fx, asker: Person, q: Person) => options(f.w, asker).find((o) => o.key === askKey(q));
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));
const birthRequests = (w: World) => w.requests.filter((r) => r.kind === 'attend_birth');

/** Mira lies in: the real option, started and walked to her door */
function startLyingIn(f: Fx): void {
  const o = lieIn(f);
  expect(o, 'lying in is offered').toBeTruthy();
  startActivity(f.w, f.mira, o!.make!()!);
  for (let i = 0; i < 400 && f.mira.activity?.phase !== 'work'; i++) stepWorld(f.w);
  for (const p of [f.finn, f.ada, f.bo]) if (p) perceive(f.w, p);
}

/** the real conversation engine runs the ask to its end; true when it was asked and answered */
function ask(f: Fx, asker: Person, q: Person): boolean {
  const { w } = f;
  for (let attempt = 0; attempt < 8; attempt++) {
    perceive(w, asker);
    const o = askOf(f, asker, q);
    if (!o) return false;
    startActivity(w, asker, o.make!()!);
    let opened = false;
    for (let i = 0; i < 500; i++) {
      stepWorld(w);
      const c = w.conversations.find((x) => x.purpose === 'request' && x.data.reqKind === 'attend_birth');
      if (c) opened = true;
      if (opened && !c) return true;
      if (!opened && asker.activity?.kind !== 'socialize') break;
    }
    delete asker.cooldowns['talk' + q.id];
    delete q.cooldowns['talk' + asker.id];
    w.tick += 17;
  }
  return false;
}

describe('rules 261 is registered, with its three parts', () => {
  it('is supported, and the switch has birth, naming and vigil', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(261);
    expect(SUPPORTED_RULES_VERSIONS).toContain(261);
    expect(HEARTH_PARTS).toEqual(['birth', 'naming', 'vigil']);
  });
  it('hasBirthHelp follows the version and its own switch, and not the others', () => {
    const now = scene(261, { tag: 'parts' }).w, old = scene(260, { tag: 'parts-old' }).w;
    expect([hasBirthHelp(now), hasNaming(now), hasVigil(now)]).toEqual([true, true, true]);
    expect([hasBirthHelp(old), hasNaming(old), hasVigil(old)]).toEqual([false, false, false]);
    setHearthScenes(false, 'naming');
    expect([hasBirthHelp(now), hasNaming(now), hasVigil(now)]).toEqual([true, false, true]);
    setHearthScenes(false, 'birth');
    expect(hearthPartOn('birth')).toBe(false);
    expect(hasBirthHelp(now)).toBe(false);
  });
});

describe('lying in: offered only when everything holds', () => {
  it('Mira is offered it in the last third of a day before her time, worth LYING_SCORE', () => {
    const f = scene(261, { tag: 'offer' });
    const o = lieIn(f);
    expect(o, 'offered').toBeTruthy();
    expect(o!.util).toBe(LYING_SCORE);
    expect(o!.label).toBe('Lie in by the door until the child comes');
  });

  const negatives: [string, { change?: (f: Fx) => void; opts?: Opts }][] = [
    ['her time is more than a third of a day away', { opts: { left: LYING_WINDOW + 40 } }],
    ['her time has come', { change: (f) => { f.mira.pregnantUntil = f.w.tick; } }],
    ['she is not expecting', { change: (f) => { f.mira.pregnantUntil = 0; } }],
    ['she has no home', { opts: { noHome: true } }],
    ['she is indoors', { change: (f) => { f.mira.indoors = f.hut!.id; } }],
    ['it is night', { opts: { tick: NIGHT } }],
    ['a storm is blowing', { change: (f) => { f.w.weather.storm = 0.8; } }],
    ['she is thirsty (a critical need)', { change: (f) => { f.mira.needs.thirst = 8; } }],
    ['she is hungry (drive over 40)', { change: (f) => { f.mira.needs.hunger = 40; } }],
    ['she is cold (warmth drive over 20)', { change: (f) => { f.mira.needs.warmth = 35; } }],
    ['a danger is believed about', { change: (f) => { f.mira.beliefs[777777] = { id: 777777, kind: 'danger', x: 36, y: 33, amount: 1, seen: f.w.tick, hh: 0 } as never; f.mira.bykind.danger = [777777]; } }],
    ['she is a man', { change: (f) => { f.mira.sex = 'm'; } }],
  ];
  for (const [why, { change, opts: o }] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene(261, { tag: 'neg-control-' + why });
      expect(lieIn(control), 'control').toBeTruthy();
      const f = scene(261, { tag: 'neg-' + why, ...o });
      change?.(f);
      expect(lieIn(f), why).toBeUndefined();
    });
  }

  it('is not offered at rules 260 or with the part switched off', () => {
    expect(lieIn(scene(260, { tag: 'v260' }))).toBeUndefined();
    setHearthScenes(false, 'birth');
    expect(lieIn(scene(261, { tag: 'off' }))).toBeUndefined();
  });
});

describe('lying in itself', () => {
  it('Mira goes to her door and sits there outdoors, lying in; it is on her record and visible to those who see her', () => {
    const f = scene(261, { tag: 'lying' });
    startLyingIn(f);
    const a = f.mira.activity!;
    expect(a.kind).toBe('rest');
    expect(a.data.lyingIn).toBeLessThanOrEqual(f.mira.lyingIn!); // the tick it was decided, and the tick she sat down at her door
    expect(f.mira.indoors).toBeUndefined();
    expect(f.mira.lyingIn).toBeGreaterThanOrEqual(NOON);
    expect(a.label).toBe('Lying in by her door');
    run(f.w, 30);
    perceive(f.w, f.finn!);
    expect(f.finn!.seen.find((s) => s.id === f.mira.id)?.lyingIn).toBe(true);
    perceive(f.w, f.bo!);
    expect(f.bo!.seen.find((s) => s.id === f.mira.id)?.lyingIn, 'anybody who sees her sees that she is lying in').toBe(true);
    f.w.persons.forEach((p) => { if (p.activity?.data.lyingIn !== undefined) f.w.settings.rulesVersion = 260; });
    perceive(f.w, f.finn!);
    expect(f.finn!.seen.find((s) => s.id === f.mira.id)?.lyingIn, 'no flag below 261').toBeUndefined();
    f.w.settings.rulesVersion = 261;
    expect(() => validateBirthHelp(f.w)).not.toThrow();
  });

  it('the place she sits at is always a free tile beside the home, never inside it, from wherever she starts', () => {
    for (const [x, y] of [[38, 33], [33, 34], [36, 28], [29, 31], [40, 37], [35, 27], [34, 36], [31, 29]]) {
      const f = scene(261, { tag: `spot-${x}-${y}` });
      f.mira.x = x; f.mira.y = y; f.mira.px = x; f.mira.py = y;
      rebuildMobileGrid(f.w);
      const act = lieIn(f)!.make!()!;
      const tx = Math.floor(act.spotX), ty = Math.floor(act.spotY);
      expect(isWalkable(f.w, tx, ty), `from (${x}, ${y}) she is sent to tile (${tx}, ${ty})`).toBe(true);
      const h = f.hut!;
      expect(tx >= h.x && tx < h.x + h.w && ty >= h.y && ty < h.y + h.h, 'not on the hut itself').toBe(false);
      expect(Math.abs(act.spotX - (h.x + h.w / 2)) <= h.w / 2 + 1.7 && Math.abs(act.spotY - (h.y + h.h / 2)) <= h.h / 2 + 1.7, 'beside it').toBe(true);
    }
  });

  it('a critical need breaks it off (she is not held to it), and a flag appears only while she lies in', () => {
    const f = scene(261, { tag: 'breakoff' });
    startLyingIn(f);
    f.mira.needs.thirst = 5;
    f.mira.nextThink = f.w.tick;
    run(f.w, 60);
    expect(f.mira.activity?.data.lyingIn).toBeUndefined();
    perceive(f.w, f.finn!);
    expect(f.finn!.seen.find((s) => s.id === f.mira.id)?.lyingIn).toBeUndefined();
  });
});

describe('the ask', () => {
  it('Finn, who sees her lying in, is offered the ask to Ada; Mira is not offered to ask anybody; Bo (a stranger to the household) is not the asker', () => {
    const f = scene(261, { tag: 'ask-offer' });
    startLyingIn(f);
    const o = askOf(f, f.finn!, f.ada);
    expect(o, 'Finn may ask Ada').toBeTruthy();
    expect(o!.label).toBe('Ask Ada to be with Mira when the child comes');
    expect(askOf(f, f.mira, f.ada)).toBeUndefined();
    expect(askOf(f, f.bo!, f.ada)).toBeUndefined();
  });

  it('the better neighbour is asked: a woman who has borne a child, and kin, over a stranger; the score has its parts', () => {
    const f = scene(261, { tag: 'ask-choice' });
    f.ada.children.push(99999 + 1); // has borne a child
    startLyingIn(f);
    const ada = askOf(f, f.finn!, f.ada)!;
    expect(ada, 'Ada, who has borne a child, is the one asked').toBeTruthy();
    const names = ada.parts.map(([n]) => n);
    expect(names).toContain('has borne a child');
    expect(names).toContain('a woman');
    expect(ada.parts.find(([n]) => n === 'somebody should be with her')![1]).toBe(ASK_BASE);
    expect(ada.parts.find(([n]) => n === 'has borne a child')![1]).toBe(ASK_BORNE);
    expect(ada.parts.find(([n]) => n === 'a woman')![1]).toBe(ASK_WOMAN);
    // the same two without that: Ada has borne no child and Bo is the sibling of the asker; Bo is the better one to ask
    f.ada.children.length = 0;
    relOf(f.finn!, f.bo!.id).kin = 'sibling';
    relOf(f.finn!, f.ada.id).affinity = 10; // no friend now
    perceive(f.w, f.finn!);
    expect(askOf(f, f.finn!, f.ada)).toBeUndefined(); // one ask is offered at a time, the one worth most
    const kin = askOf(f, f.finn!, f.bo!)!;
    expect(kin, 'the sibling is asked').toBeTruthy();
    expect(kin.parts.find(([n]) => n === 'family')![1]).toBe(ASK_KIN);
  });

  it('is only the one worth most: the asker is offered one ask at a time, and none when nobody is in sight', () => {
    const f = scene(261, { tag: 'ask-one', adaX: 80 });
    startLyingIn(f);
    perceive(f.w, f.finn!);
    const asks = options(f.w, f.finn!).filter((o) => o.key.endsWith(':request:birth'));
    expect(asks.length).toBe(1);
    expect(asks[0].key).toBe(askKey(f.bo!)); // Ada is out of sight: only Bo is there to be asked
    const g = scene(261, { tag: 'ask-none', adaX: 80, noBo: true });
    startLyingIn(g);
    expect(options(g.w, g.finn!).filter((o) => o.key.endsWith(':request:birth'))).toEqual([]);
  });

  it('not offered to a child asker, to a neighbour who is a child or a youth, or in danger or need; and a house of one has nobody to send', () => {
    const f = scene(261, { tag: 'ask-neg' });
    startLyingIn(f);
    f.finn!.needs.thirst = 5;
    expect(askOf(f, f.finn!, f.ada)).toBeUndefined();
    f.finn!.needs.thirst = 95;
    expect(askOf(f, f.finn!, f.ada)).toBeTruthy();
    f.ada.birthTick = f.w.tick - 9 * TICKS_PER_YEAR; // a child
    perceive(f.w, f.finn!);
    expect(askOf(f, f.finn!, f.ada)).toBeUndefined();
    const g = scene(261, { tag: 'ask-alone', alone: true });
    startLyingIn(g);
    expect(options(g.w, g.ada).filter((o) => o.key.endsWith(':request:birth')), 'Ada is not of her household').toEqual([]);
  });

  it('the ask is a real request of kind attend_birth, answered like a watch: Ada says yes and the promise is a work commitment, milestone attended', () => {
    const f = scene(261, { tag: 'ask-yes' });
    startLyingIn(f);
    expect(ask(f, f.finn!, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    expect(r).toBeTruthy();
    expect(r.from).toBe(f.finn!.id);
    expect(r.to).toBe(f.ada.id);
    expect(r.destKind).toBe('person');
    expect(r.destId).toBe(f.mira.id);
    expect(['promised', 'fulfilled']).toContain(r.status);
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c).toBeTruthy();
    expect([c.kind, c.destKind, c.destId, c.to]).toEqual(['work', 'person', f.mira.id, f.finn!.id]);
    expect(f.ada.whereabouts[f.mira.id], 'she was told where Mira is').toBeTruthy();
    expect(f.w.events.filter((e) => /promised/.test(e.text) && e.ids.includes(f.ada.id)).length, 'the promise writes no feed line of its own').toBe(0);
    expect(() => validateBirthHelp(f.w)).not.toThrow();
  });

  it('a no is an ordinary refusal: Ada, laid up, declines; nothing is written in the feed; Finn waits before asking her again and may ask Bo', () => {
    const f = scene(261, { tag: 'ask-no', adaIll: true });
    startLyingIn(f);
    const before = f.w.events.length;
    expect(ask(f, f.finn!, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    expect(r.status).toBe('declined');
    expect(f.ada.commitments.some((c) => c.milestone === 'attended')).toBe(false);
    expect(f.w.events.slice(before).filter((e) => e.kind === 'social' && /could not|refused/.test(e.text))).toEqual([]);
    expect(f.finn!.cooldowns['birthask' + f.ada.id]).toBeGreaterThan(f.w.tick);
    perceive(f.w, f.finn!);
    expect(askOf(f, f.finn!, f.ada)).toBeUndefined();
    expect(askOf(f, f.finn!, f.bo!)).toBeTruthy();
  });

  it('at most three asks in a day, and none while one is open', () => {
    const f = scene(261, { tag: 'ask-max' });
    startLyingIn(f);
    for (let i = 0; i < ASKS_MAX; i++) f.w.requests.push({ id: 900000 + i, kind: 'attend_birth', from: f.finn!.id, to: f.bo!.id, item: null, amount: 1, offer: null, offerAmount: 0, siteId: 0, infoKind: '', created: f.w.tick - 10, expires: f.w.tick + 500, status: 'declined', note: '', resolved: f.w.tick, destKind: 'person', destId: f.mira.id, deadline: 0, milestone: '', toolKind: null, outcome: 'refused' } as never);
    perceive(f.w, f.finn!);
    expect(askOf(f, f.finn!, f.ada)).toBeUndefined();
    const g = scene(261, { tag: 'ask-open' });
    startLyingIn(g);
    g.w.requests.push({ id: 900100, kind: 'attend_birth', from: g.finn!.id, to: g.bo!.id, item: null, amount: 1, offer: null, offerAmount: 0, siteId: 0, infoKind: '', created: g.w.tick - 10, expires: g.w.tick + 500, status: 'pending', note: '', resolved: 0, destKind: 'person', destId: g.mira.id, deadline: 0, milestone: '', toolKind: null, outcome: '' } as never);
    perceive(g.w, g.finn!);
    expect(askOf(g, g.finn!, g.ada)).toBeUndefined();
  });
});

describe('the birth, with a helper and without', () => {
  /** the whole scene: she lies in, Finn asks Ada, Ada comes, the child is born; run to a little after */
  function helped(tag: string, version = 261) {
    const f = scene(version, { tag, left: 500 });
    startLyingIn(f);
    expect(ask(f, f.finn!, f.ada)).toBe(true);
    return f;
  }
  const untilBorn = (f: Fx, max = 2400): Person | null => {
    for (let i = 0; i < max && !f.mira.children.length; i++) stepWorld(f.w);
    return f.mira.children.length ? (f.w.byId.get(f.mira.children[0]) as Person) : null;
  };

  it('Ada walks to Mira and stays; the child is born with her beside Mira; the feed says so, once; the helper is counted and the two grow fonder', () => {
    const f = helped('scene');
    const aff0 = f.mira.relations[f.ada.id]?.affinity ?? 0;
    const baby = untilBorn(f)!;
    expect(baby, 'a child was born').toBeTruthy();
    const line = eventsWith(f.w, 'was born to');
    expect(line.length).toBe(1);
    expect(line[0].text).toBe(`${baby.name} was born to Mira and Finn, with Ada there to help.`);
    expect(line[0].kind).toBe('life');
    expect(line[0].ids).toEqual([baby.id, f.mira.id, f.ada.id]);
    expect(f.ada.attended).toBe(1);
    expect(f.mira.lyingIn).toBeUndefined();
    expect(f.mira.relations[f.ada.id].affinity).toBeGreaterThanOrEqual(aff0 + BORN_MOTHER_AFFINITY - 1);
    expect(f.mira.mood?.thoughts.some((t) => t.kind.startsWith('born_with:'))).toBe(true);
    // the promise is kept at the birth, with her beside Mira; she stays a little after
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.status).toBe('done');
    expect(birthRequests(f.w)[0].status).toBe('fulfilled');
    expect(f.ada.activity?.data.birth === true || f.ada.suspended?.data.birth === true, 'still beside her (or her wait held while she talks)').toBe(true);
    run(f.w, HELP_AFTER + 120);
    expect(c.status).toBe('done');
    expect(f.ada.activity?.data.birth).toBeUndefined();
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    expect(conservationReport(f.w).ok).toBe(true);
  });

  it('the birth comes at the very tick it comes without the part, and the shared random stream is untouched: the same child, the same state', () => {
    // the same scene twice (the same name makes the same world): with the part on she lies in, is asked for and is helped; with it off none of that
    const a = scene(261, { tag: 'twin', left: 500 });
    startLyingIn(a);
    expect(ask(a, a.finn!, a.ada)).toBe(true);
    for (let i = 0; i < 2400 && !a.mira.children.length; i++) stepWorld(a.w);
    const stateA = [a.w.rng.a, a.w.rng.b, a.w.rng.c, a.w.rng.d];
    const tickA = a.w.tick;
    expect(eventsWith(a.w, 'was born to')[0].text).toMatch(/with Ada there to help.$/);
    setHearthScenes(false, 'birth');
    const b = scene(261, { tag: 'twin', left: 500 });
    for (let i = 0; i < 2400 && !b.mira.children.length; i++) stepWorld(b.w);
    setHearthScenes(true, 'birth');
    expect(b.w.tick, 'the child comes on the same tick').toBe(tickA);
    expect([b.w.rng.a, b.w.rng.b, b.w.rng.c, b.w.rng.d], 'the shared stream stands at the same place right after the birth').toEqual(stateA);
    const ba = a.w.byId.get(a.mira.children[0]) as Person, bb = b.w.byId.get(b.mira.children[0]) as Person;
    expect([ba.sex, ba.name, ba.traits, ba.look]).toEqual([bb.sex, bb.name, bb.traits, bb.look]);
    expect(eventsWith(b.w, 'was born to').map((e) => e.text)).toEqual([`${bb.name} was born to Mira and Finn.`]);
  });

  it('nobody to send: a woman alone at home lies in, nobody is asked, and the child is born with the old plain line and a small lasting thought', () => {
    const f = scene(261, { tag: 'alone', alone: true, left: 500 });
    startLyingIn(f);
    expect(birthRequests(f.w)).toEqual([]);
    const baby = untilBorn(f)!;
    expect(baby).toBeTruthy();
    const line = eventsWith(f.w, 'was born to');
    expect(line.length).toBe(1);
    expect(line[0].text).toBe(`${baby.name} was born to Mira.`);
    expect(line[0].ids).toEqual([baby.id, f.mira.id]);
    const t = f.mira.mood?.thoughts.find((x) => x.kind === 'bore_alone');
    expect(t?.value).toBe(BORN_ALONE);
  });

  it('everybody asked refuses: she bears the child with the old plain line and the small lasting thought', () => {
    const f = scene(261, { tag: 'refused', left: 600, adaIll: true });
    startLyingIn(f);
    f.bo!.illness = { since: f.w.tick - DAY, severity: 0.8, rested: 0, course: 3 * DAY, how: 'test' };
    expect(ask(f, f.finn!, f.ada)).toBe(true);
    perceive(f.w, f.finn!);
    expect(ask(f, f.finn!, f.bo!)).toBe(true);
    expect(birthRequests(f.w).map((r) => r.status)).toEqual(['declined', 'declined']);
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn.`);
    expect(f.ada.attended).toBeUndefined();
  });

  it('a woman who had not lain in has the old line, word for word, with the part on', () => {
    const f = scene(261, { tag: 'old-line', left: 80 });
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to').map((e) => e.text)).toEqual([`${baby.name} was born to Mira and Finn.`]);
    expect(eventsWith(f.w, 'was born to')[0].ids).toEqual([baby.id, f.mira.id]);
    expect(f.mira.mood?.thoughts.some((t) => t.kind === 'bore_alone')).toBe(false);
  });

  it('a woman with no home bears the child where she is: no lying in, no ask, the old line', () => {
    const f = scene(261, { tag: 'no-home', noHome: true, left: 300 });
    expect(lieIn(f)).toBeUndefined();
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to').map((e) => e.text)).toEqual([`${baby.name} was born to Mira and Finn.`]);
    expect(birthRequests(f.w)).toEqual([]);
  });

  it('with the part switched off, or at rules 260, nothing of it happens and the line is the old one', () => {
    for (const mode of ['off', 'v260'] as const) {
      if (mode === 'off') setHearthScenes(false, 'birth');
      const f = scene(mode === 'off' ? 261 : 260, { tag: 'old-' + mode, left: 300 });
      expect(lieIn(f)).toBeUndefined();
      const baby = untilBorn(f)!;
      expect(eventsWith(f.w, 'was born to').map((e) => e.text)).toEqual([`${baby.name} was born to Mira and Finn.`]);
      expect(f.mira.lyingIn).toBeUndefined();
      setHearthScenes(true);
    }
  });

  it('a helper who was there is not later blamed or cancelled if something calls her away the moment after: the promise was kept at the birth', () => {
    const f = helped('called-away');
    untilBorn(f);
    endActivity(f.w, f.ada, 'interrupted', 'something more urgent');
    run(f.w, 1200);
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.status).toBe('done');
    expect(birthRequests(f.w)[0].status).toBe('fulfilled');
    expect(f.ada.attended).toBe(1);
  });

  it('a helper who has stopped to talk when the child comes is still beside her: her wait is held while she talks, and the line and the count are hers', () => {
    const f = helped('talking');
    for (let i = 0; i < 600 && f.ada.activity?.phase !== 'work'; i++) stepWorld(f.w);
    expect(f.ada.activity?.data.birth).toBe(true);
    suspendActivity(f.w, f.ada);
    f.ada.activity = newActivity(f.w, f.ada, { kind: 'wander', label: 'Talking', goal: 'to talk', here: true, maxTicks: 5000, minCommit: 5000 });
    f.ada.nextThink = f.w.tick + 100000;
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn, with Ada there to help.`);
    expect(f.ada.attended).toBe(1);
    expect(() => validateBirthHelp(f.w)).not.toThrow();
  });

  it('afterwards the helper is the first to look in, by the ordinary welfare visit: a worry that seeing her well does not settle; the visit is a look-in and nothing is handed over', () => {
    const f = helped('look-in');
    untilBorn(f);
    expect(f.ada.concerns.some((c) => c.about === f.mira.id && c.kind === 'newborn')).toBe(true);
    run(f.w, HELP_AFTER + 200);
    expect(f.ada.concerns.some((c) => c.about === f.mira.id && c.kind === 'newborn'), 'seeing her well does not settle it').toBe(true);
    // Ada goes about her day: out of sight, she looks in
    f.ada.x = f.mira.x + 11; f.ada.y = f.mira.y + 1; f.ada.px = f.ada.x; f.ada.py = f.ada.y;
    rebuildMobileGrid(f.w);
    f.ada.needs.hunger = 90; f.ada.needs.thirst = 90; f.ada.needs.energy = 90;
    f.ada.whereabouts[f.mira.id] = { x: f.mira.x, y: f.mira.y, tick: f.w.tick };
    perceive(f.w, f.ada);
    const look = options(f.w, f.ada).find((o) => o.key === `visit:${f.mira.id}`);
    expect(look, 'a look-in is offered').toBeTruthy();
    expect(look!.label).toBe('Look in on Mira');
    expect(look!.parts[0][0]).toBe('Mira has a new baby');
    startActivity(f.w, f.ada, look!.make!()!);
    for (let i = 0; i < 600 && f.ada.activity?.kind === 'visit'; i++) stepWorld(f.w);
    expect(f.ada.concerns.some((c) => c.about === f.mira.id && c.kind === 'newborn')).toBe(false);
    expect(f.mira.relations[f.ada.id].history.some((h) => h.text.includes('came to see how we were after the birth'))).toBe(true);
    expect(f.w.events.filter((e) => /looked in on Mira/.test(e.text))).toEqual([]);
  });

  it('a helper who reaches her after the child has come is released, not blamed; a promise nobody reached in time is released too', () => {
    const f = helped('late');
    // Ada is held where she is until the child has come
    f.ada.cooldowns.pause = f.w.tick + 5000;
    const baby = untilBorn(f)!;
    expect(baby).toBeTruthy();
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn.`);
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.status).toBe('moot');
    expect(c.reason).toBe('the child was born before I came');
    expect(birthRequests(f.w)[0].status).toBe('cancelled');
    expect(f.ada.attended).toBeUndefined();
  });

  it('a helper who waits a third of a day for a child that does not come gives up without blame', () => {
    const f = helped('long-wait');
    f.mira.pregnantUntil = f.w.tick + 6000; // the child is much later than the ask thought
    for (let i = 0; i < 600 && f.ada.activity?.data.waitFrom === undefined; i++) stepWorld(f.w);
    expect(f.ada.activity?.data.waitFrom, 'she has begun to wait beside her').toBeDefined();
    f.ada.activity!.data.waitFrom = f.w.tick - HELP_WAIT_MAX + 5; // she has waited a third of a day less five ticks
    run(f.w, 3);
    expect(f.ada.activity?.data.birth).toBe(true);
    run(f.w, 10);
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.status).toBe('moot');
    expect(c.reason).toBe('the child had not come');
    expect(birthRequests(f.w)[0].status).toBe('cancelled');
    expect(f.ada.activity?.data.birth).toBeUndefined();
    expect(f.ada.attended).toBeUndefined();
  });
});

describe('the woman asks for herself (from a day before her time until she lies in)', () => {
  const MORNING = at(0.25);
  const self = (f: Fx, q: Person) => askOf(f, f.mira, q);
  const anyAsk = (f: Fx, p: Person) => options(f.w, p).filter((o) => o.key.endsWith(':request:birth'));
  const untilBorn = (f: Fx, max = 2600): Person | null => {
    for (let i = 0; i < max && !f.mira.children.length; i++) { fed(f); stepWorld(f.w); }
    return f.mira.children.length ? (f.w.byId.get(f.mira.children[0]) as Person) : null;
  };
  /** nobody in these long waits is made to leave by hunger, thirst or tiredness: that is not what is being checked */
  const fed = (f: Fx): void => { for (const p of [f.ada, f.bo, f.finn]) if (p) { p.needs.hunger = 95; p.needs.thirst = 95; p.needs.energy = 95; } };
  const moveTo = (f: Fx, p: Person, x: number, y: number): void => { p.x = x; p.y = y; p.px = x; p.py = y; rebuildMobileGrid(f.w); };
  const req = (f: Fx, from: Person, status: 'declined' | 'promised' | 'pending', id: number) => ({ id, kind: 'attend_birth', from: from.id, to: f.bo!.id, item: null, amount: 1, offer: null, offerAmount: 0, siteId: 0, infoKind: '', created: f.w.tick - 10, expires: f.w.tick + 500, status, note: '', resolved: status === 'declined' ? f.w.tick : 0, destKind: 'person', destId: f.mira.id, deadline: status === 'declined' ? 0 : f.mira.pregnantUntil - LYING_WINDOW, milestone: '', toolKind: null, outcome: '' }) as never;

  it('Mira, a day or less from her time, with a home, is offered the ask to a neighbour in sight, worth the housemate\'s ask with its parts, and prefers who it prefers', () => {
    const f = scene(261, { tag: 'self-offer', left: 2000 });
    const o = self(f, f.ada)!;
    expect(o, 'offered').toBeTruthy();
    expect(o.label).toBe('Ask Ada to be with me when the child comes');
    expect(o.goal).toBe('to have somebody with me for the birth');
    expect(o.parts.find(([n]) => n === 'I should have somebody with me')![1]).toBe(ASK_BASE);
    expect(o.parts.map(([n]) => n)).toContain('a woman');
    f.ada.children.push(99999 + 1);
    expect(self(f, f.ada)!.parts.map(([n]) => n), 'a woman who has borne a child').toContain('has borne a child');
    expect(anyAsk(f, f.mira).length, 'one at a time, the one worth most').toBe(1);
    // a housemate who sees nothing of her lying in has nothing to ask yet: the ask is hers
    expect(anyAsk(f, f.finn!)).toEqual([]);
  });

  const negatives: [string, { change?: (f: Fx) => void; opts?: Opts }][] = [
    ['her time is more than a day away', { opts: { left: ASK_EARLY + 40 } }],
    ['her time has come', { change: (f) => { f.mira.pregnantUntil = f.w.tick; } }],
    ['she has no home', { opts: { noHome: true } }],
    ['she is lying in already', { change: (f) => { f.mira.lyingIn = f.w.tick; } }],
    ['she is hungry (drive over 40)', { change: (f) => { f.mira.needs.hunger = 40; } }],
    ['she is critically thirsty', { change: (f) => { f.mira.needs.thirst = 8; } }],
    ['a danger is believed about', { change: (f) => { f.mira.beliefs[777777] = { id: 777777, kind: 'danger', x: 36, y: 33, amount: 1, seen: f.w.tick, hh: 0 } as never; f.mira.bykind.danger = [777777]; } }],
    ['the neighbours in sight are at their work (rules 227)', { change: (f) => { for (const s of f.mira.seen) if (s.id === f.ada.id || s.id === f.bo!.id) { s.work = 'wood'; s.act = 'gather'; } } }],
    ['only her own household is in sight', { opts: { adaX: 80, noBo: true } }],
    ['the neighbours were asked and refused lately', { change: (f) => { f.mira.cooldowns['birthask' + f.ada.id] = f.w.tick + 50; f.mira.cooldowns['birthask' + f.bo!.id] = f.w.tick + 50; } }],
    ['somebody has already promised for this birth', { change: (f) => { f.w.requests.push(req(f, f.finn!, 'promised', 910001)); } }],
    ['three asks have been made for this birth in the day, hers and a housemate\'s', { change: (f) => { f.w.requests.push(req(f, f.mira, 'declined', 910002), req(f, f.mira, 'declined', 910003), req(f, f.finn!, 'declined', 910004)); } }],
  ];
  for (const [why, { change, opts: o }] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene(261, { tag: 'self-control-' + why, left: 2000 });
      expect(anyAsk(control, control.mira).length, 'control').toBe(1);
      const f = scene(261, { tag: 'self-neg-' + why, left: 2000, ...o });
      change?.(f);
      expect(anyAsk(f, f.mira), why).toEqual([]);
    });
  }

  it('not offered at rules 260 or with the part switched off', () => {
    const old = scene(260, { tag: 'self-v260', left: 2000 });
    expect(anyAsk(old, old.mira)).toEqual([]);
    setHearthScenes(false, 'birth');
    const f = scene(261, { tag: 'self-off', left: 2000 });
    expect(anyAsk(f, f.mira)).toEqual([]);
  });

  it('a housemate\'s ask is as it was: it carries no time, and is not held back by the neighbour being at work', () => {
    const f = scene(261, { tag: 'self-housemate', left: 700 });
    startLyingIn(f);
    for (const s of f.finn!.seen) if (s.id === f.ada.id) { s.work = 'wood'; s.act = 'gather'; }
    expect(askOf(f, f.finn!, f.ada), 'still offered').toBeTruthy();
    expect(anyAsk(f, f.mira), 'she has lain in: no ask of hers').toEqual([]);
  });

  it('she tells the helper when: the tick her lying-in window opens is on the request, Ada holds her door as a told place, and the promise is due from then', () => {
    const f = scene(261, { tag: 'self-told', left: 2000, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    expect([r.from, r.to, r.destKind, r.destId]).toEqual([f.mira.id, f.ada.id, 'person', f.mira.id]);
    expect(r.deadline).toBe(f.mira.pregnantUntil - LYING_WINDOW);
    expect(r.status).toBe('promised');
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.deadline).toBe(r.deadline! + DAY);
    expect(Object.values(f.ada.beliefs).some((b) => b.kind === 'building' && b.hh === f.mira.hhId), 'she was told where the door is').toBe(true);
    expect(f.mira.birthAsked).toBeDefined();
    expect(f.w.events.filter((e) => /promised|be with/.test(e.text) && e.ids.includes(f.ada.id)), 'the promise writes no feed line').toEqual([]);
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    // asked inside her window the time is now
    const g = scene(261, { tag: 'self-told-late', left: 600, tick: MORNING });
    const t0 = g.w.tick;
    expect(ask(g, g.mira, g.ada)).toBe(true);
    const [r2] = birthRequests(g.w);
    expect(r2.deadline).toBeGreaterThanOrEqual(t0);
    expect(r2.deadline).toBeLessThanOrEqual(r2.created);
  });

  it('before it is due she does nothing about it; when it is due she goes to the door whether or not she can see Mira, waits at the empty door, and when Mira comes and lies in she is beside her: the child is born with her there', () => {
    const f = scene(261, { tag: 'self-door', left: 1400, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    run(f.w, 150);
    expect(f.w.tick).toBeLessThan(r.deadline!);
    expect(f.ada.activity?.data.birth, 'nothing before it is due').toBeUndefined();
    // Mira is away at her work, out of sight of her own door (held there: she decides nothing for herself in this scene)
    moveTo(f, f.mira, 75, 60);
    pin(f.mira);
    for (let i = 0; i < 1500 && !f.ada.activity?.data.emptyDoor; i++) { fed(f); stepWorld(f.w); }
    expect(f.w.tick).toBeGreaterThanOrEqual(r.deadline!);
    const a = f.ada.activity!;
    expect(a.data.birth).toBe(true);
    expect(a.data.told).toBe(r.deadline);
    expect(a.data.emptyDoor).toBe(true);
    expect(Math.hypot(f.ada.x - f.hut!.x, f.ada.y - f.hut!.y), 'at her door').toBeLessThan(5);
    // the door itself, not the wall nearest to where she came from (that can be the far side of the home, out of sight of a woman lying in by the door)
    expect([a.spotX, a.spotY]).toEqual([f.hut!.doorX + 0.5, f.hut!.doorY + 0.5]);
    expect(f.mira.lyingIn).toBeUndefined();
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    // Mira comes home and lies in: Ada sees her and is beside her
    delete f.mira.cooldowns.pause;
    moveTo(f, f.mira, 38, 33);
    f.mira.nextThink = f.w.tick + 100000;
    startLyingIn(f);
    const baby = untilBorn(f)!;
    expect(baby).toBeTruthy();
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn, with Ada there to help.`);
    expect(f.ada.attended).toBe(1);
    expect(birthRequests(f.w)[0].status).toBe('fulfilled');
  });

  it('one promised helper at a time: once Ada has promised, neither Mira nor a housemate asks anybody else; when the promise ends they may', () => {
    const f = scene(261, { tag: 'self-one', left: 700, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    expect(r.status).toBe('promised');
    perceive(f.w, f.mira);
    expect(anyAsk(f, f.mira), 'not Mira').toEqual([]);
    startLyingIn(f);
    perceive(f.w, f.finn!);
    expect(anyAsk(f, f.finn!), 'not a housemate').toEqual([]);
    // the promise comes to nothing: they may ask again
    settleRequest(f, r.id);
    perceive(f.w, f.finn!);
    expect(anyAsk(f, f.finn!).length, 'a housemate may ask again').toBe(1);
  });

  it('the cap of three asks in a day is shared: two of hers and one of a housemate\'s leave nobody to ask, from either', () => {
    const f = scene(261, { tag: 'self-cap', left: 700, tick: MORNING });
    f.w.requests.push(req(f, f.mira, 'declined', 910010), req(f, f.mira, 'declined', 910011));
    perceive(f.w, f.mira);
    expect(anyAsk(f, f.mira).length, 'two made: one more').toBe(1);
    f.w.requests.push(req(f, f.finn!, 'declined', 910012));
    expect(anyAsk(f, f.mira)).toEqual([]);
    startLyingIn(f);
    perceive(f.w, f.finn!);
    expect(anyAsk(f, f.finn!)).toEqual([]);
  });

  it('if she never lies in (no lying in at all) the helper waits at the empty door, and the promise lapses with a line in her log and none in the feed; the child is then born with the old plain line', () => {
    const f = scene(261, { tag: 'self-lapse', left: 1400, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    moveTo(f, f.mira, 75, 60); // she is not at her door, and does not lie in
    pin(f.mira);
    f.mira.pregnantUntil = f.w.tick + 6000; // the child is a long way off: the wait is what ends
    const before = f.w.events.length;
    for (let i = 0; i < 2600 && f.ada.commitments.find((x) => x.milestone === 'attended')!.status === 'active'; i++) { fed(f); stepWorld(f.w); }
    const c = f.ada.commitments.find((x) => x.milestone === 'attended')!;
    expect(c.status).toBe('moot');
    expect(c.reason).toBe('she had not come to lie in');
    expect(birthRequests(f.w)[0].status).toBe('cancelled');
    expect(f.ada.log.some((l) => l.text.includes('she had not come to lie in'))).toBe(true);
    expect(f.w.events.slice(before).filter((e) => /lie in|be with|promis|help|door|child/.test(e.text)).map((e) => e.tick + ' ' + e.kind + ' ' + e.text), 'nothing in the feed').toEqual([]);
    expect(f.w.tick).toBeGreaterThanOrEqual(r.deadline! + HELP_WAIT_MAX);
    // and the birth, later, with nobody beside her
    f.mira.pregnantUntil = f.w.tick;
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn.`);
  });

  it('a woman who never lay in but is at her door with her helper beside her when the child comes has the helped line', () => {
    const f = scene(261, { tag: 'self-door-nolying', left: 1400, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    moveTo(f, f.mira, 33.8, 33.6); // by her door, not lying in
    pin(f.mira);
    const baby = untilBorn(f)!;
    expect(f.mira.lyingIn).toBeUndefined();
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn, with Ada there to help.`);
  });

  it('a helper told a time who is at the door from the start of the window still waits when the life check delivers the child up to a minute after the day', () => {
    // the child comes at the first life check on or after the day (once in LIFE_CHECK_EVERY ticks), so up to that long after it is due: the told helper's wait covers the window and that lag
    expect(BIRTH_LAG).toBe(LIFE_CHECK_EVERY);
    const f = scene(261, { tag: 'self-door-lag', left: 1400, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    moveTo(f, f.mira, 33.8, 33.6);
    pin(f.mira);
    const due = f.w.requests.find((x) => x.kind === 'attend_birth')!.deadline!;
    while (!f.ada.activity?.data.waitFrom && f.w.tick < due + 400) { fed(f); stepWorld(f.w); }
    const from = f.ada.activity!.data.waitFrom as number;
    expect(from).toBeGreaterThanOrEqual(due);
    // the child comes at the first life check after a third of a day since she came to the door: later than the wait of an untold helper would last
    let x = from + HELP_WAIT_MAX + 1;
    while (x % LIFE_CHECK_EVERY !== 17) x++;
    expect(x - from).toBeLessThan(HELP_WAIT_MAX + BIRTH_LAG);
    f.mira.pregnantUntil = x;
    const baby = untilBorn(f)!;
    expect(eventsWith(f.w, 'was born to')[0].text).toBe(`${baby.name} was born to Mira and Finn, with Ada there to help.`);
  });

  it('save and load in the middle of a promise that is not yet due: the same world, and it goes on to the same end', () => {
    const f = scene(261, { tag: 'self-save', left: 1400, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    run(f.w, 60);
    const [r] = birthRequests(f.w);
    expect(f.w.tick).toBeLessThan(r.deadline!);
    const back = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const r2 = back.requests.find((x) => x.id === r.id)!;
    expect([r2.deadline, r2.from, r2.destId, r2.status]).toEqual([r.deadline, f.mira.id, f.mira.id, 'promised']);
    expect(() => validateBirthHelp(back)).not.toThrow();
    for (const w of [f.w, back]) run(w, 1500);
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const line = (w: World) => w.events.filter((e) => e.text.includes('was born to')).map((e) => e.text);
    expect(line(back)).toEqual(line(f.w));
    expect(line(f.w).length).toBe(1);
  });

  it('bad saved state is refused: a time on a housemate\'s ask, a time out of range, a record of an ask with no pregnancy, a told time that is not a tick', () => {
    const f = scene(261, { tag: 'self-validate', left: 2000, tick: MORNING });
    expect(ask(f, f.mira, f.ada)).toBe(true);
    const [r] = birthRequests(f.w);
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    r.from = f.finn!.id;
    expect(() => validateBirthHelp(f.w)).toThrow(/request/i);
    r.from = f.mira.id;
    r.deadline = f.w.tick + ASK_EARLY + 5;
    expect(() => validateBirthHelp(f.w)).toThrow(/request/i);
    r.deadline = f.mira.pregnantUntil - LYING_WINDOW;
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    f.mira.pregnantUntil = 0;
    expect(() => validateBirthHelp(f.w)).toThrow(/ask record/i);
    f.mira.pregnantUntil = f.w.tick + 100;
    f.mira.birthAsked = f.w.tick + 3;
    expect(() => validateBirthHelp(f.w)).toThrow(/ask record/i);
  });

  /** the request is settled as cancelled (a promise that came to nothing) */
  function settleRequest(f: Fx, id: number): void {
    const r = f.w.requests.find((x) => x.id === id)!;
    r.status = 'cancelled';
    r.resolved = f.w.tick;
  }
});

describe('the birth line: when each of the three is written', () => {
  const untilBorn = (f: Fx, max = 2600): Person | null => {
    for (let i = 0; i < max && !f.mira.children.length; i++) stepWorld(f.w);
    return f.mira.children.length ? (f.w.byId.get(f.mira.children[0]) as Person) : null;
  };
  it('"with H there to help" when somebody was beside her; the old plain line in every other case (somebody asked and nobody came, nobody asked, lain in or not); the settling is the same', () => {
    // somebody asked, nobody beside her: a woman who lay in, whose housemate asked, and the one asked refused
    const asked = scene(261, { tag: 'line-asked', left: 600, adaIll: true });
    startLyingIn(asked);
    expect(ask(asked, asked.finn!, asked.ada)).toBe(true);
    expect(asked.mira.birthAsked).toBeDefined();
    pin(asked.finn!);
    const b1 = untilBorn(asked)!;
    expect(eventsWith(asked.w, 'was born to')[0].text).toBe(`${b1.name} was born to Mira and Finn.`);
    expect(eventsWith(asked.w, 'was born to').every((e) => !/had no helper/.test(e.text)), 'the feed does not say who was not there').toBe(true);
    expect(asked.mira.birthAsked, 'cleared at the birth').toBeUndefined();
    // she lay in and nobody was ever asked (nobody of her household could, none in sight): the old line, word for word, and the small lasting thought
    const alone = scene(261, { tag: 'line-alone', alone: true, left: 500 });
    startLyingIn(alone);
    expect(alone.mira.birthAsked).toBeUndefined();
    const b2 = untilBorn(alone)!;
    expect(eventsWith(alone.w, 'was born to').map((e) => e.text)).toEqual([`${b2.name} was born to Mira.`]);
    expect(eventsWith(alone.w, 'was born to')[0].ids).toEqual([b2.id, alone.mira.id]);
    expect(alone.mira.mood?.thoughts.some((t) => t.kind === 'bore_alone')).toBe(true);
    // she did not lie in and nobody was asked: the old line
    const plain = scene(261, { tag: 'line-plain', left: 80 });
    const b3 = untilBorn(plain)!;
    expect(eventsWith(plain.w, 'was born to').map((e) => e.text)).toEqual([`${b3.name} was born to Mira and Finn.`]);
    // somebody beside her
    const helped = scene(261, { tag: 'line-helped', left: 500 });
    startLyingIn(helped);
    expect(ask(helped, helped.finn!, helped.ada)).toBe(true);
    const b4 = untilBorn(helped)!;
    expect(eventsWith(helped.w, 'was born to')[0].text).toBe(`${b4.name} was born to Mira and Finn, with Ada there to help.`);
  });
});

describe('saved state', () => {
  it('a world saved while she lies in and Ada waits loads, and goes on to the same end as one that was never saved', () => {
    const f = scene(261, { tag: 'saveload', left: 500 });
    startLyingIn(f);
    expect(ask(f, f.finn!, f.ada)).toBe(true);
    run(f.w, 120);
    const text = serializeWorld(f.w);
    const back = deserializeWorld(text);
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const ticks = 700;
    run(f.w, ticks);
    run(back, ticks);
    expect(hashWorld(back)).toBe(hashWorld(f.w));
    const line = (w: World) => w.events.filter((e) => e.text.includes('was born to')).map((e) => e.text);
    expect(line(back)).toEqual(line(f.w));
    expect(line(f.w)[0]).toMatch(/with Ada there to help\.$/);
  });

  it('bad saved state is refused: lying in below 261 or without a pregnancy, a count out of range, a request kind below 261', () => {
    const f = scene(261, { tag: 'validate' });
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    f.mira.lyingIn = f.w.tick;
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    f.mira.lyingIn = f.w.tick + 5;
    expect(() => validateBirthHelp(f.w)).toThrow(/lying in/i);
    f.mira.lyingIn = f.w.tick;
    f.mira.pregnantUntil = 0;
    expect(() => validateBirthHelp(f.w)).toThrow(/lying in/i);
    f.mira.pregnantUntil = f.w.tick + 100;
    delete f.mira.lyingIn;
    f.ada.attended = 0;
    expect(() => validateBirthHelp(f.w)).toThrow(/attended/i);
    f.ada.attended = ATTENDED_MAX + 1;
    expect(() => validateBirthHelp(f.w)).toThrow(/attended/i);
    f.ada.attended = 3;
    expect(() => validateBirthHelp(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 260;
    expect(() => validateBirthHelp(f.w)).toThrow(/attended/i);
  });
});

describe('the lab arms', () => {
  it('rich-no-hearth-scenes removes all three parts, and each part has its own arm; the older rich-no-hearth is not touched', () => {
    const all = parseIntervention('rich-no-hearth-scenes');
    const restore = all.install!();
    expect([hearthPartOn('birth'), hearthPartOn('naming'), hearthPartOn('vigil')]).toEqual([false, false, false]);
    restore();
    expect([hearthPartOn('birth'), hearthPartOn('naming'), hearthPartOn('vigil')]).toEqual([true, true, true]);
    const one = parseIntervention('rich-no-hearth-birth');
    const undo = one.install!();
    expect([hearthPartOn('birth'), hearthPartOn('naming'), hearthPartOn('vigil')]).toEqual([false, true, true]);
    undo();
    expect(parseIntervention('rich-no-hearth').summary).toMatch(/hearth decisions/);
  });
});

describe('ordinary worlds (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 261 and prints how the births went: lying in, asks, helpers, and the lines', () => {
    // BIRTH_SEED (default gen-4); BIRTH_DAYS: exactly this many days (default 6, a short check); BIRTH_OFF=1: the part switched off;
    // BIRTH_REPORT=<file>: also append the line there
    const seed = process.env.BIRTH_SEED ?? 'gen-4';
    const days = Number(process.env.BIRTH_DAYS ?? 6);
    if (process.env.BIRTH_OFF) setHearthScenes(false, 'birth');
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 261 });
    let lastEvent = 0, births = 0, helped = 0, plain = 0;
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (e.kind !== 'life' || !/ was born to /.test(e.text)) continue;
        births++;
        if (/there to help\.$/.test(e.text)) helped++;
        else plain++;
      }
    };
    while (w.tick < days * DAY) { stepWorld(w); if (w.tick % 20 === 0) scan(); }
    scan();
    const reqs = birthRequests(w);
    const line = `BIRTH ordinary world, seed ${seed}, rules 261${process.env.BIRTH_OFF ? ' [part switched off]' : ''}: ${Math.floor(w.tick / DAY)} days, ${w.persons.filter((p) => p.alive).length} alive; births ${births} (helped ${helped}, the plain line ${plain}); asks ${reqs.length} (${reqs.map((r) => r.status).join(',')})`;
    console.log(line);
    if (process.env.BIRTH_REPORT) appendFileSync(process.env.BIRTH_REPORT, line + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(() => validateBirthHelp(w)).not.toThrow();
  }, 400_000);
});
