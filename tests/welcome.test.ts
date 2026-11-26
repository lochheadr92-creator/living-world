// Rules 260 (bundle A, part 2): welcoming newcomers (src/sim/welcome.ts, the switch in src/sim/meeting.ts; offered in options_social.ts optWelcome,
// answered in social.ts, a household's arrival recorded in lifecycle.ts immigrationTick). Every situation here is STAGED: it checks a rule,
// it is not an example of spontaneous behaviour. The last test runs ordinary worlds and PRINTS what happened; it asserts nothing about how much.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { endActivity, startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { chronicleWorthy } from '../src/sim/events';
import { createWorld } from '../src/sim/factory';
import { dayFraction } from '../src/sim/environment';
import { delBelief } from '../src/sim/knowledge';
import { immigrationTick } from '../src/sim/lifecycle';
import { MEETING_PARTS, hasWelcome, meetingPartOn, setMeeting } from '../src/sim/meeting';
import { makeCtx } from '../src/sim/optutil';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import type { Household, Person, World } from '../src/sim/types';
import { WELCOMERS_MAX, WELCOME_BASE, WELCOME_GENEROUS, WELCOME_KEEP, WELCOME_REACH, WELCOME_SOCIABLE, WELCOME_WAIT, WELCOME_WINDOW, mayWelcome, mayWelcomeNow, validateWelcome, welcomeTick } from '../src/sim/welcome';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, stage } from './helpers/kit';

afterEach(() => setMeeting(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const NOON = at(0.5);
const NIGHT = at(0.92);

interface Opts {
  tag?: string;
  tick?: number;
  /** how long ago the newcomers' household arrived (default a little while) */
  arrivedAgo?: number;
  /** who came: Ben alone, Ben and Cara, or Ben, Cara and little Zed */
  group?: 'single' | 'couple' | 'family';
  /** how far Cara and Zed stand from Ben (they count as present within 5 tiles) */
  apart?: number;
  benAge?: number;
  /** the berries Ada carries (she keeps back one or two for herself: what is beyond is to spare) */
  adaBerries?: number;
  benX?: number;
}

/**
 * Ada (30, sociable) a few tiles from Ben, who has just come with whoever came with him; the lake is a known place to Ada; a berry bush is
 * a food place she holds; every newcomer holds neither (they know only what they brought: one berry).
 */
function scene(version: number, o: Opts = {}) {
  const s = stage(`welcome-${version}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = o.tick ?? NOON;
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const ada = addPerson(s, 'Ada', 40, 28, { age: 30, sex: 'f', ...full, inv: { berries: o.adaBerries ?? 4 }, traits: { sociability: 0.8, generosity: 0.4 } });
  const ben = addPerson(s, 'Ben', o.benX ?? 46, 28, { age: o.benAge ?? 28, sex: 'm', ...full, inv: { berries: 1 } });
  const group = o.group ?? 'single';
  const apart = o.apart ?? 1.5;
  const cara = group !== 'single' ? addPerson(s, 'Cara', 46 + apart, 28, { age: 27, sex: 'f', ...full, hh: ben.hhId, inv: { berries: 1 } }) : null;
  const zed = group === 'family' ? addPerson(s, 'Zed', 46, 28 + apart, { age: 5, sex: 'm', ...full, hh: ben.hhId }) : null;
  const bush = makeSource(w, 'berry_bush', 27, 30, 6);
  // the camp is nearer the lake than the stock scene puts it, so that the lake is among the places everyone knows
  w.camp = { x: 43.5, y: 33 };
  done(s);
  const newcomers = [ben, cara, zed].filter((p): p is Person => !!p);
  for (const p of [ada, ...newcomers]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; }
  learn(w, ada, bush);
  // they know nothing of the lake or of any food: only the fire they were walking toward (there is none here), and what they carry
  for (const p of newcomers) for (const k of Object.keys(p.beliefs)) delBelief(p, Number(k));
  const hh = w.households.find((h) => h.id === ben.hhId)!;
  if (o.arrivedAgo !== -1) hh.arrived = w.tick - (o.arrivedAgo ?? 200);
  for (const p of newcomers) p.nextThink = w.tick + 100000;
  rebuildMobileGrid(w);
  perceive(w, ada);
  expect(ada.seen.some((x) => x.id === ben.id)).toBe(true);
  return { s, w, ada, ben, cara, zed, hh, bush, newcomers };
}
type Fx = ReturnType<typeof scene>;

const KEY = (f: Fx) => `socialize:${f.ben.id}:welcome`;
const welcomeOption = (f: Fx, p: Person = f.ada) => generateOptions(f.w, p, true, true).options.find((o) => o.key === `socialize:${f.ben.id}:welcome`);
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));

/** `resident` goes to welcome Ben: the real conversation engine runs it to its end (retrying a few times if Ben was too busy to stop). */
function welcome(f: Fx, resident: Person = f.ada, stopAt?: (c: World['conversations'][number]) => boolean): { asked: boolean; cut: boolean } {
  const { w } = f;
  for (let attempt = 0; attempt < 8; attempt++) {
    perceive(w, resident);
    const o = welcomeOption(f, resident);
    if (!o) return { asked: false, cut: false };
    resident.nextThink = w.tick + 100000;
    startActivity(w, resident, o.make!()!);
    let opened = false;
    for (let i = 0; i < 400; i++) {
      stepWorld(w);
      const c = w.conversations.find((x) => x.purpose === 'welcome');
      if (c) {
        opened = true;
        if (stopAt?.(c)) { endActivity(w, resident, 'interrupted', 'staged: called away'); return { asked: true, cut: true }; }
      }
      if (opened && !c) return { asked: true, cut: false };
      if (!opened && resident.activity?.kind !== 'socialize') break;
    }
    delete resident.cooldowns['talk' + f.ben.id];
    for (const p of f.newcomers) delete p.cooldowns['talk' + resident.id];
    w.tick += 17;
  }
  return { asked: false, cut: false };
}

describe('rules 260 part 2 is registered', () => {
  it('has its switch, a lab arm of its own, and is a supported version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(260);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(260);
    expect(MEETING_PARTS).toContain('welcome');
    expect(parseIntervention('rich-no-meeting-welcome').summary).toMatch(/welcomes newcomers/);
    const f = scene(260, { tag: 'arm' });
    expect(welcomeOption(f)).toBeTruthy();
    const undo = parseIntervention('rich-no-meeting-welcome').install!();
    expect([meetingPartOn('courting'), meetingPartOn('welcome'), meetingPartOn('praise')]).toEqual([true, false, true]);
    expect(welcomeOption(f)).toBeUndefined();
    undo();
    expect(welcomeOption(f)).toBeTruthy();
  });
});

describe('the cue: offered only to a resident at ease who sees a stranger of a household that has just come', () => {
  it('Ada is offered it, worth WELCOME_BASE and 8 for her sociability less the walk, and 4 more if she were big-hearted', () => {
    const f = scene(260, { tag: 'offer' });
    const o = welcomeOption(f);
    expect(o, 'offered').toBeTruthy();
    expect(o!.label).toBe('Welcome Ben');
    expect(o!.util).toBeCloseTo(WELCOME_BASE + WELCOME_SOCIABLE * 0.8 - 6 * 6 * 0.07, 5);
    expect(o!.parts.map(([n]) => n)).toEqual(['somebody new has come', 'sociable', 'walking']);
    const g = scene(260, { tag: 'offer-generous' });
    g.ada.traits.generosity = 0.9;
    expect(welcomeOption(g)!.util).toBeCloseTo(WELCOME_BASE + WELCOME_SOCIABLE * 0.8 + WELCOME_GENEROUS - 6 * 6 * 0.07, 5);
    expect(welcomeOption(g)!.parts.map(([n]) => n)).toContain('big-hearted');
  });

  const negatives: [string, { change?: (f: Fx) => void; opts?: Opts }][] = [
    ['they have already met (familiarity 1)', { change: (f) => { relOf(f.ada, f.ben.id).familiarity = 1; } }],
    ['the newcomer is of her own household', { change: (f) => { f.ben.hhId = f.ada.hhId; } }],
    ['the newcomers already have two welcomers', { change: (f) => { f.hh.welcomed = [f.ada.id + 901, f.ada.id + 902]; } }],
    ['Ada is one of the welcomers already', { change: (f) => { f.hh.welcomed = [f.ada.id]; } }],
    ['they arrived more than a day ago', { opts: { arrivedAgo: WELCOME_WINDOW + 1 } }],
    ['their household has no record of arriving', { opts: { arrivedAgo: -1 } }],
    ['it is dark', { opts: { tick: NIGHT } }],
    ['Ada welcomed somebody a little while ago (a cooldown stands)', { change: (f) => { f.ada.cooldowns.welcome = f.w.tick + 5; } }],
    ['Ada is hungry (drive over 40)', { change: (f) => { f.ada.needs.hunger = 30; } }],
    ['Ada is thirsty (drive over 40)', { change: (f) => { f.ada.needs.thirst = 30; } }],
    ['the newcomer is a child', { opts: { benAge: 8 } }],
    ['Ada herself has just arrived', { change: (f) => { f.w.households.find((h) => h.id === f.ada.hhId)!.arrived = f.w.tick - 50; } }],
    ['a danger is believed about', { change: (f) => { f.ada.beliefs[777777] = { id: 777777, kind: 'danger', x: 36, y: 28, amount: 1, seen: f.w.tick, hh: 0 } as never; f.ada.bykind.danger = [777777]; } }],
    ['Ada has a critical need', { change: (f) => { f.ada.needs.energy = 3; } }],
  ];
  for (const [why, { change, opts: o }] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene(260, { tag: 'neg-control-' + why });
      expect(welcomeOption(control), 'control').toBeTruthy();
      const f = scene(260, { tag: 'neg-' + why, ...o });
      change?.(f);
      perceive(f.w, f.ada);
      expect(welcomeOption(f), why).toBeUndefined();
    });
  }

  it('not offered at rules 257, nor with the part switched off, nor outside the natural scene', () => {
    expect(welcomeOption(scene(257, { tag: 'gate-old' }))).toBeUndefined();
    setMeeting(false, 'welcome');
    expect(welcomeOption(scene(260, { tag: 'gate-off' }))).toBeUndefined();
    setMeeting(true, 'welcome');
    setMeeting(false, 'courting');
    expect(welcomeOption(scene(260, { tag: 'gate-courting-off' })), 'the other parts are separate switches').toBeTruthy();
    setMeeting(true, 'courting');
    const g = scene(260, { tag: 'gate-scene' });
    g.w.settings.scene = 'help';
    expect(welcomeOption(g)).toBeUndefined();
  });

  it('is not offered beyond 12 tiles, read from the check itself (sight reaches 9)', () => {
    const f = scene(260, { tag: 'far' });
    const ctx = makeCtx(f.w, f.ada, true, true);
    const s = f.ada.seen.find((x) => x.id === f.ben.id)!;
    expect(mayWelcomeNow(ctx)).toBe(true);
    expect(mayWelcome(ctx, f.ben, s, WELCOME_REACH)).toBe(true);
    expect(mayWelcome(ctx, f.ben, s, WELCOME_REACH + 0.1)).toBe(false);
  });

  it('what the newcomer privately needs changes nothing in the ask: it is made on a stranger in sight', () => {
    const f = scene(260, { tag: 'private' });
    f.ben.needs.hunger = 5;
    f.ben.needs.thirst = 5;
    perceive(f.w, f.ada);
    const before = welcomeOption(f)!.util;
    f.ben.needs.hunger = 95;
    f.ben.needs.thirst = 95;
    perceive(f.w, f.ada);
    expect(welcomeOption(f)!.util).toBe(before);
  });
});

describe('a completed welcome', () => {
  it('Ada goes over, tells Ben where the water and the food are, gives him a portion, and it is written once, as the first welcome', () => {
    const f = scene(260, { tag: 'done' });
    const { w, ada, ben, hh, bush } = f;
    expect(Object.values(ben.beliefs).filter((b) => b.kind === 'water' || b.kind === 'berry_bush')).toHaveLength(0);
    const berries = [ada.inv.berries ?? 0, ben.inv.berries ?? 0];
    const rel = [ada, ben].map((p, i) => { const r = relOf(p, [ben, ada][i].id); return { fam: r.familiarity, trust: r.trust, aff: r.affinity }; });
    expect(welcome(f)).toEqual({ asked: true, cut: false });
    // what was told: from Ada, recorded as told (the source and the teller are Ada)
    const water = Object.values(ben.beliefs).find((b) => b.kind === 'water');
    expect(water?.src).toBe('told');
    expect(water?.from).toBe(ada.id);
    const food = ben.beliefs[bush.id];
    expect(food?.src).toBe('told');
    expect(food?.from).toBe(ada.id);
    expect(ben.log.some((l) => /told me about a water/.test(l.text))).toBe(true);
    // what was given: one portion, the ledger balanced
    expect(ada.inv.berries).toBe(berries[0] - 1);
    expect(ben.inv.berries).toBe(berries[1] + 1);
    expect(conservationReport(w).ok).toBe(true);
    // each other, and the record
    const after = [ada, ben].map((p, i) => relOf(p, [ben, ada][i].id));
    expect(after[0].familiarity - rel[0].fam).toBeGreaterThanOrEqual(3 - 0.1);
    expect(after[1].familiarity - rel[1].fam).toBeGreaterThanOrEqual(3 - 0.1);
    expect(after[0].trust - rel[0].trust).toBeGreaterThanOrEqual(2 - 0.1);
    expect(after[0].affinity - rel[0].aff).toBeGreaterThanOrEqual(3 - 0.5);
    expect(after[1].affinity - rel[1].aff, 'the newcomer is the fonder, and the gift counts too').toBeGreaterThanOrEqual(5 - 0.5);
    expect(ben.mood?.thoughts.some((t) => t.kind === 'welcomed' && t.value > 0)).toBe(true);
    expect(ben.mood!.thoughts.find((t) => t.kind === 'welcomed')!.until - w.tick).toBeGreaterThan(DAY);
    expect(ada.log.some((l) => /^Welcomed Ben and told them where to find water and gave them food\.$/.test(l.text))).toBe(true);
    expect(ben.log.some((l) => /^Ada welcomed me and told me where to find water and gave me food\.$/.test(l.text))).toBe(true);
    expect(hh.welcomed).toEqual([ada.id]);
    expect(ada.cooldowns.welcome).toBeGreaterThan(w.tick + WELCOME_WAIT - 400);
    expect(ada.cooldowns.welcome).toBeLessThanOrEqual(w.tick + WELCOME_WAIT);
    // the feed: one line for the welcome, none of its own for the gift; kind social; the first is kept in the chronicle
    const ev = eventsWith(w, 'welcome');
    expect(ev.map((e) => e.text)).toEqual(['Ada was the first to welcome the newcomer Ben and told them where to find water and gave them food.']);
    expect(ev[0].kind).toBe('social');
    expect(ev[0].ids).toEqual([ada.id, ben.id]);
    expect(eventsWith(w, 'gave 1 berries')).toEqual([]);
    expect(w.chronicle?.some((e) => e.text === ev[0].text)).toBe(true);
    // Ada is not offered it again for a while
    perceive(w, ada);
    expect(welcomeOption(f)).toBeUndefined();
  });

  it('the gift is a generous deed: others who see it hold it (the ordinary giving path)', () => {
    const f = scene(260, { tag: 'witness' });
    const dee = addPerson(f.s, 'Dee', 43, 28, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 95 });
    dee.needs.warmth = 100;
    dee.needs.safety = 100;
    dee.nextThink = f.w.tick + 100000;
    rebuildMobileGrid(f.w);
    expect(welcome(f).asked).toBe(true);
    expect(f.ada.stats.given).toBeGreaterThanOrEqual(1);
    expect(f.ben.stats.received).toBeGreaterThanOrEqual(1);
    expect(relOf(dee, f.ada.id).affinity, 'Dee saw it and thinks the better of Ada').toBeGreaterThan(0);
  });

  it('the line reads as it should for one, for a couple, for a family, and only those near Ben are named', () => {
    const one = scene(260, { tag: 'text-one' });
    welcome(one);
    expect(eventsWith(one.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomer Ben and told them where to find water and gave them food.');
    const two = scene(260, { tag: 'text-two', group: 'couple' });
    welcome(two);
    expect(eventsWith(two.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomers Ben and Cara and told them where to find water and gave them food.');
    expect(eventsWith(two.w, 'welcome')[0].ids).toEqual([two.ada.id, two.ben.id, two.cara!.id]);
    const fam = scene(260, { tag: 'text-family', group: 'family' });
    welcome(fam);
    expect(eventsWith(fam.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomers Ben, Cara and little Zed and told them where to find water and gave them food.');
    const wide = scene(260, { tag: 'text-apart', group: 'family', apart: 8 });
    welcome(wide);
    expect(eventsWith(wide.w, 'welcome')[0].text, 'those more than 5 tiles off are not named').toBe('Ada was the first to welcome the newcomer Ben and told them where to find water and gave them food.');
  });

  it('only what the newcomer does not hold counts as told; food changes hands only when there is spare, and the totals balance', () => {
    // Ben already holds the water place Ada holds: it is not told again, and the line does not say so
    const f = scene(260, { tag: 'knows-water' });
    const lake = Object.values(f.ada.beliefs).find((b) => b.kind === 'water')!;
    f.ben.beliefs[lake.id] = { ...lake, src: 'seen', from: 0 };
    f.ben.bykind.water = [lake.id];
    for (const b of Object.values(f.ada.beliefs)) if (b.kind === 'water' && b.id !== lake.id) delBelief(f.ada, b.id);
    welcome(f);
    expect(eventsWith(f.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomer Ben and gave them food.');
    expect(f.ben.beliefs[lake.id].src, 'what he held he still holds as he held it').toBe('seen');
    expect(f.ben.beliefs[f.bush.id]?.src, 'the food place was new to him').toBe('told');
    // no spare food: Ada carries one berry, which she keeps
    const poor = scene(260, { tag: 'poor', adaBerries: 1 });
    const total = (poor.ada.inv.berries ?? 0) + (poor.ben.inv.berries ?? 0);
    welcome(poor);
    expect(eventsWith(poor.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomer Ben and told them where to find water.');
    expect(poor.ada.inv.berries).toBe(1);
    expect(poor.ben.inv.berries).toBe(1);
    expect((poor.ada.inv.berries ?? 0) + (poor.ben.inv.berries ?? 0)).toBe(total);
    expect(conservationReport(poor.w).ok).toBe(true);
    // nothing to tell and nothing to spare: still a welcome, in plain words
    const bare = scene(260, { tag: 'bare', adaBerries: 0 });
    delBelief(bare.ada, bare.bush.id);
    for (const b of Object.values(bare.ada.beliefs)) if (b.kind === 'water') delBelief(bare.ada, b.id);
    welcome(bare);
    expect(eventsWith(bare.w, 'welcome')[0].text).toBe('Ada was the first to welcome the newcomer Ben.');
  });

  it('a second welcomer is written without the first, is not kept in the chronicle, and there is no third', () => {
    const f = scene(260, { tag: 'second' });
    const cy = addPerson(f.s, 'Cy', 43, 28, { age: 40, sex: 'm', hunger: 95, thirst: 95, energy: 95, inv: { berries: 4 } });
    cy.needs.warmth = 100;
    cy.needs.safety = 100;
    learn(f.w, cy, f.bush);
    const dee = addPerson(f.s, 'Dee', 43, 29, { age: 35, sex: 'f', hunger: 95, thirst: 95, energy: 95, inv: { berries: 4 } });
    dee.needs.warmth = 100;
    dee.needs.safety = 100;
    for (const p of [cy, dee]) p.nextThink = f.w.tick + 100000;
    rebuildMobileGrid(f.w);
    expect(welcome(f).asked).toBe(true);
    f.w.tick += 5;
    expect(welcome(f, cy).asked).toBe(true);
    expect(f.hh.welcomed).toEqual([f.ada.id, cy.id]);
    const texts = eventsWith(f.w, 'welcome').map((e) => e.text);
    expect(texts[0]).toMatch(/^Ada was the first to welcome the newcomer Ben/);
    expect(texts[1]).toMatch(/^Cy welcomed the newcomer Ben/);
    expect(texts[1]).not.toMatch(/first/);
    expect(f.w.chronicle?.filter((e) => /welcome/.test(e.text))).toHaveLength(1);
    expect(chronicleWorthy('social', texts[1])).toBe(false);
    expect(chronicleWorthy('social', texts[0])).toBe(true);
    expect(WELCOMERS_MAX).toBe(2);
    perceive(f.w, dee);
    expect(welcomeOption(f, dee), 'a third is not offered it').toBeUndefined();
  });

  it('a talk cut short records nothing: no telling, no gift, no record, no line, no cooldown', () => {
    const f = scene(260, { tag: 'cut' });
    const { w, ada, ben, hh } = f;
    const berries = [ada.inv.berries, ben.inv.berries];
    const r = welcome(f, ada, (c) => c.phase >= 3);
    expect(r).toEqual({ asked: true, cut: true });
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(Object.values(ben.beliefs).some((b) => b.src === 'told')).toBe(false);
    expect([ada.inv.berries, ben.inv.berries]).toEqual(berries);
    expect(hh.welcomed).toBeUndefined();
    expect(eventsWith(w, 'welcome')).toEqual([]);
    expect(ada.cooldowns.welcome).toBeUndefined();
    expect(ben.mood?.thoughts.some((t) => t.kind === 'welcomed') ?? false).toBe(false);
    expect(ada.log.some((l) => /Welcomed/.test(l.text))).toBe(false);
  });
});

describe("a household's record of its arrival", () => {
  it('is cleared when the household has a home, and three days after it arrived, whichever is first', () => {
    const f = scene(260, { tag: 'clear-home' });
    f.hh.welcomed = [f.ada.id];
    welcomeTick(f.w);
    expect(f.hh.arrived).toBeDefined();
    const hut = building(f.s, 'hut', 60, 40, f.ben.hhId);
    f.hh.homeId = hut.id;
    welcomeTick(f.w);
    expect([f.hh.arrived, f.hh.welcomed]).toEqual([undefined, undefined]);
    const g = scene(260, { tag: 'clear-time', arrivedAgo: WELCOME_KEEP - 61 });
    g.hh.welcomed = [g.ada.id];
    g.w.tick += 60;
    welcomeTick(g.w);
    expect(g.hh.arrived, 'not yet').toBeDefined();
    g.w.tick += 2;
    welcomeTick(g.w);
    expect([g.hh.arrived, g.hh.welcomed]).toEqual([undefined, undefined]);
  });

  it('the world clears it on its own as time passes', () => {
    const f = scene(260, { tag: 'clear-world', arrivedAgo: WELCOME_KEEP - 100 });
    for (let i = 0; i < 200; i++) stepWorld(f.w);
    expect(f.hh.arrived).toBeUndefined();
  });

  it('is not cleared below 260 or by anybody else (a world below 260 never sets it)', () => {
    const f = scene(257, { tag: 'clear-old' });
    welcomeTick(f.w);
    expect(f.hh.arrived, 'untouched at 257: nothing here reads or clears it').toBeDefined();
  });

  it('an arriving group records its arrival at 260, and not at 257 or with the part off', () => {
    /** a staged settlement that is doing well enough for travellers to come, asked again and again until the one chance in three lands */
    const arrive = (version: number, tag: string): Household | undefined => {
      const s = stage(`welcome-arrive-${version}-${tag}`), w = s.w;
      w.settings.dynamics = 'rich';
      w.settings.rulesVersion = version;
      w.settings.immigration = true;
      for (let i = 0; i < 5; i++) addPerson(s, 'P' + i, 40 + i, 28, { age: 30, sex: i % 2 ? 'f' : 'm', inv: { berries: 6 } });
      building(s, 'hut', 50, 40);
      building(s, 'hut', 54, 40);
      building(s, 'fire', 44, 36);
      w.camp = { x: 43.5, y: 33 };
      done(s);
      const before = w.households.length;
      for (let k = 0; k < 120 && !(w.stats.arrivals ?? 0); k++) {
        w.tick = 5000 + k * 400 + 211;
        immigrationTick(w);
      }
      if (!(w.stats.arrivals ?? 0)) throw new Error('nobody arrived in the staged settlement');
      return w.households.length > before ? w.households[w.households.length - 1] : undefined;
    };
    const now = arrive(260, 'now');
    expect(now?.arrived, 'recorded at the tick they came').toBeGreaterThan(0);
    expect(arrive(257, 'old')?.arrived).toBeUndefined();
    setMeeting(false, 'welcome');
    expect(arrive(260, 'off')?.arrived).toBeUndefined();
  });
});

describe('save, load, continue, and the saved state', () => {
  it('a world with a welcome under way, and one with its record, continues exactly; two identical runs give the same world', () => {
    const run = (tag: string) => {
      const f = scene(260, { tag, group: 'couple' });
      welcome(f);
      for (let i = 0; i < 40; i++) stepWorld(f.w);
      return f;
    };
    const f = run('save');
    expect(f.hh.arrived).toBeDefined();
    expect(f.hh.welcomed).toEqual([f.ada.id]);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 300; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    const hh = copy.households.find((h) => h.id === f.hh.id)!;
    expect([hh.arrived, hh.welcomed]).toEqual([f.hh.arrived, f.hh.welcomed]);
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
    // mid-conversation
    const g = scene(260, { tag: 'save-mid' });
    perceive(g.w, g.ada);
    g.ada.nextThink = g.w.tick + 100000;
    startActivity(g.w, g.ada, welcomeOption(g)!.make!()!);
    for (let i = 0; i < 400 && !g.w.conversations.some((c) => c.purpose === 'welcome' && c.phase >= 1); i++) stepWorld(g.w);
    const mid = deserializeWorld(serializeWorld(g.w));
    for (let i = 0; i < 300; i++) { stepWorld(g.w); stepWorld(mid); }
    expect(serializeWorld(mid)).toBe(serializeWorld(g.w));
    // two identical runs
    const a = run('same'), b = run('same');
    for (let i = 0; i < 300; i++) { stepWorld(a.w); stepWorld(b.w); }
    expect(hashWorld(a.w)).toBe(hashWorld(b.w));
  });

  it('the record is in the world fingerprint', () => {
    const f = scene(260, { tag: 'hash' });
    const h0 = hashWorld(f.w);
    f.hh.welcomed = [f.ada.id];
    expect(hashWorld(f.w)).not.toBe(h0);
    delete f.hh.arrived;
    delete f.hh.welcomed;
    expect(hashWorld(f.w)).not.toBe(h0);
  });

  it('a save of rules 257, or one with a welcome that cannot be, is refused on loading', () => {
    const f = scene(260, { tag: 'refuse' });
    expect(() => validateWelcome(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 257;
    expect(() => validateWelcome(f.w)).toThrow(/arrival/i);
    f.w.settings.rulesVersion = 260;
    f.hh.arrived = f.w.tick + 1;
    expect(() => validateWelcome(f.w)).toThrow(/arrival/i);
    f.hh.arrived = f.w.tick - 10;
    f.hh.welcomed = [f.ada.id, f.ada.id];
    expect(() => validateWelcome(f.w)).toThrow(/welcomers/i);
    f.hh.welcomed = [1, 2, 3];
    expect(() => validateWelcome(f.w)).toThrow(/welcomers/i);
    f.hh.welcomed = [f.ada.id];
    expect(() => validateWelcome(f.w)).not.toThrow();
    delete f.hh.arrived;
    expect(() => validateWelcome(f.w)).toThrow(/arrival/i);
  });
});

describe('ordinary worlds (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 260 and prints how the newcomers fared: groups, welcomes, how soon, and their first day', () => {
    // WELCOME_SEED (default gen-4); WELCOME_DAYS: exactly this many days, else about WELCOME_BUDGET_MS (default 100 s) to the end of a day;
    // WELCOME_OFF=1: the same world with the part switched off; WELCOME_REPORT=<file>: also append the line there
    const seed = process.env.WELCOME_SEED ?? 'gen-4';
    const fixedDays = Number(process.env.WELCOME_DAYS ?? 0);
    const budgetMs = Number(process.env.WELCOME_BUDGET_MS ?? 100_000);
    if (process.env.WELCOME_OFF) setMeeting(false, 'welcome');
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 260 });
    interface Group { tick: number; ids: number[]; worstThirst: number; worstHunger: number; firstWelcome?: number; welcomes: number }
    const groups: Group[] = [];
    let lastEvent = 0, welcomeEvents = 0, asks = 0;
    const welcomeTexts: string[] = [];
    const seenConv = new Set<number>();
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (e.kind === 'life' && /arrives? at the settlement/.test(e.text)) groups.push({ tick: e.tick, ids: [...e.ids], worstThirst: 100, worstHunger: 100, welcomes: 0 });
        else if (/^\S+ (welcomed|was the first to welcome) the newcomers? /.test(e.text)) {
          welcomeEvents++;
          welcomeTexts.push('t' + e.tick + ' ' + e.text);
          const g = groups.find((x) => e.ids.slice(1).some((id) => x.ids.includes(id)));
          if (g) { g.welcomes++; g.firstWelcome ??= e.tick - g.tick; }
        }
      }
    };
    const t0 = Date.now();
    while (fixedDays > 0 ? w.tick < fixedDays * DAY : Date.now() - t0 < budgetMs || w.tick % DAY !== 0) {
      stepWorld(w);
      for (const c of w.conversations) if (c.purpose === 'welcome' && !seenConv.has(c.id)) { seenConv.add(c.id); asks++; }
      if (w.tick % 10 === 0) {
        scan();
        for (const g of groups) if (w.tick - g.tick <= DAY) for (const id of g.ids) {
          const p = w.byId.get(id);
          if (p && p.ent === 'person' && p.alive) { g.worstThirst = Math.min(g.worstThirst, p.needs.thirst); g.worstHunger = Math.min(g.worstHunger, p.needs.hunger); }
        }
      }
      if (w.tick >= 60 * DAY) break;
    }
    scan();
    const complete = groups.filter((g) => w.tick - g.tick >= DAY);
    const welcomed = groups.filter((g) => g.welcomes > 0);
    const times = welcomed.map((g) => g.firstWelcome!).sort((a, b) => a - b);
    const median = times.length ? times[Math.floor(times.length / 2)] : -1;
    const mean = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : 'n/a');
    const min = (xs: number[]) => (xs.length ? Math.min(...xs).toFixed(1) : 'n/a');
    const line = `WELCOME ordinary world, seed ${seed}, rules 260${process.env.WELCOME_OFF ? ' [part switched off]' : ''}: ${Math.floor(w.tick / DAY)} days, ${w.persons.filter((p) => p.alive).length} alive; groups arrived ${groups.length}, welcomed at least once ${welcomed.length}, welcome events ${welcomeEvents}, talks begun ${asks}, median ticks from arrival to first welcome ${median} (of ${times.length}); first day of ${complete.length} complete: worst thirst mean ${mean(complete.map((g) => g.worstThirst))} lowest ${min(complete.map((g) => g.worstThirst))}, worst hunger mean ${mean(complete.map((g) => g.worstHunger))} lowest ${min(complete.map((g) => g.worstHunger))}`;
    console.log(line);
    if (process.env.WELCOME_REPORT) appendFileSync(process.env.WELCOME_REPORT, line + (welcomeTexts.length ? '\n  ' + welcomeTexts.join('\n  ') : '') + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(() => validateWelcome(w)).not.toThrow();
    if (process.env.WELCOME_OFF) expect(welcomeEvents).toBe(0);
  }, 400_000);
});
