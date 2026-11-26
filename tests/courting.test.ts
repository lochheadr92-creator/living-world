// Rules 260 (bundle A, part 1): courting (src/sim/courting.ts, the switch in src/sim/meeting.ts; offered in options_social.ts optCourt,
// answered in social.ts, the walk in act_misc.ts). Every situation here is STAGED: it checks a rule, it is not an example of
// spontaneous behaviour. The ordinary-world origin is docs/SOCIAL_SCENES_PLAN.md, "1. Courting". The last test runs an ordinary world
// and PRINTS what happened in it; it asserts nothing about how much.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { endActivity, newActivity, startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { dayFraction } from '../src/sim/environment';
import {
  ASK_AFFINITY, ASK_BASE, ASK_EVENING, ASK_PER_AFFINITY, ASK_SOCIABLE, CUT_SHORT_WAIT, GAIN_AFFINITY, GAIN_COMPANY, GAIN_FAMILIARITY, GAIN_TRUST,
  PROPOSE_AFFINITY, PROPOSE_AFFINITY_WALKED, PROPOSE_NOT_YET, PROPOSE_WALKED, REFUSALS_AFFINITY, REFUSALS_WAIT, REFUSED_WAIT, WALKED_ANY_WAIT,
  WALKED_PAIR_WAIT, WALK_TICKS, courtRefusal, courtedCount, mayAskToWalk, mayCourtNow, noteCourtRefusal, noteCourtYes, validateCourting,
} from '../src/sim/courting';
import { generateOptions } from '../src/sim/decision';
import { makeCtx } from '../src/sim/optutil';
import { conservationReport } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { MEETING_PARTS, hasCourting, hasPraise, hasWelcome, meetingPartOn, setMeeting } from '../src/sim/meeting';
import { perceive } from '../src/sim/perception';
import { stageOf } from '../src/sim/people';
import { currentWorldSettings } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf, spark } from '../src/sim/relations';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import type { Person, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { relationshipHistory } from '../src/sim/history';
import { chronicleWorthy } from '../src/sim/events';
import { interactionViews } from '../src/sim/inspect_work';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';

afterEach(() => setMeeting(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
/** midday, evening (0.66 of the day) and deep night */
const NOON = at(0.5);
const EVENING = at(0.66);
const NIGHT = at(0.92);

interface Opts {
  tag?: string;
  tick?: number;
  /** a pair with no spark */
  noSpark?: boolean;
  benAge?: number;
  adaAge?: number;
  benSociability?: number;
  benX?: number;
  /** where they stand north to south (the lake is along the north edge) */
  y?: number;
}

/**
 * Ada (30) and Ben (32) a few tiles apart on open ground, the lake a short walk north, every other possible partner parked out of the way.
 * Ada has her own feelings declared (familiarity 12, affinity 30, trust 20); Ben's toward her are the same unless a test says otherwise.
 */
function scene(version: number, o: Opts = {}) {
  const s = stage(`courting-${version}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = o.tick ?? NOON;
  const full = { hunger: 95, thirst: 95, energy: 95 };
  const y = o.y ?? 28;
  const ada = addPerson(s, 'Ada', 40, y, { age: o.adaAge ?? 30, sex: 'f', ...full, traits: { sociability: 0.8 } });
  let ben = addPerson(s, 'Ben', o.benX ?? 44, y, { age: o.benAge ?? 32, sex: 'm', ...full, traits: { sociability: o.benSociability ?? 1 } });
  const others: Person[] = [];
  for (let n = 0; n < 40 && spark(ada, ben) === !!o.noSpark; n++) {
    others.push(ben);
    ben = addPerson(s, 'Cand' + n, o.benX ?? 44, y, { age: o.benAge ?? 32, sex: 'm', ...full, traits: { sociability: o.benSociability ?? 1 } });
  }
  expect(spark(ada, ben), 'the pair is staged with or without a spark').toBe(!o.noSpark);
  ben.name = 'Ben';
  // the camp is nearer the lake than the stock scene puts it, so that the lake is among the places everyone knows (they know what lies within 30 of the camp)
  w.camp = { x: 43.5, y: 33 };
  done(s);
  for (const q of others) { q.x = 90; q.y = 70; }
  for (const p of [ada, ben, ...others]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; }
  for (const q of others) pin(q);
  Object.assign(relOf(ada, ben.id), { familiarity: 12, affinity: 30, trust: 20 });
  Object.assign(relOf(ben, ada.id), { familiarity: 12, affinity: 30, trust: 20 });
  // Ben does not decide anything of his own accord: he answers when asked and does what the walk makes him do
  ben.nextThink = w.tick + 100000;
  rebuildMobileGrid(w);
  perceive(w, ada);
  expect(ada.seen.some((x) => x.id === ben.id)).toBe(true);
  return { s, w, ada, ben, others };
}
type Fx = ReturnType<typeof scene>;

const KEY = (f: Fx) => `socialize:${f.ben.id}:court`;
const opts = (f: Fx) => generateOptions(f.w, f.ada, true, true).options;
const courtOption = (f: Fx) => opts(f).find((o) => o.key === KEY(f));

/** Ada asks, the real conversation engine runs it to its end (retrying a few times if Ben was too busy to stop), and the answer is in `c.data`. */
function ask(f: Fx): { asked: boolean; yes: boolean | undefined } {
  const { w, ada, ben } = f;
  for (let attempt = 0; attempt < 8; attempt++) {
    perceive(w, ada);
    const o = courtOption(f);
    if (!o) return { asked: false, yes: undefined };
    ada.nextThink = w.tick + 100000;
    startActivity(w, ada, o.make!()!);
    let yes: boolean | undefined;
    let opened = false;
    for (let i = 0; i < 400; i++) {
      stepWorld(w);
      const c = w.conversations.find((x) => x.purpose === 'court');
      if (c) { opened = true; yes = c.data.courtYes ?? yes; }
      if (opened && !c) return { asked: true, yes };
      if (!opened && ada.activity?.kind !== 'socialize') break;
    }
    delete ada.cooldowns['talk' + ben.id];
    delete ben.cooldowns['talk' + ada.id];
    w.tick += 17;
  }
  return { asked: false, yes: undefined };
}
const walking = (p: Person) => !!(p.activity?.data.walk ?? p.suspended?.data.walk);
function untilWalkEnds(f: Fx, max = 1500): void {
  for (let i = 0; i < max && (walking(f.ada) || walking(f.ben)); i++) stepWorld(f.w);
}
const eventsWith = (w: World, text: string) => w.events.filter((e) => e.text.includes(text));

describe('rules 260 is registered, with its three parts', () => {
  it('is supported (the current version may be later), 258 and 259 are not, and the switch has courting, welcome and praise', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(260);
    expect(SUPPORTED_RULES_VERSIONS).toContain(260);
    expect(SUPPORTED_RULES_VERSIONS).not.toContain(258);
    expect(SUPPORTED_RULES_VERSIONS).not.toContain(259);
    expect(MEETING_PARTS).toEqual(['courting', 'welcome', 'praise']);
  });
  it('hasWelcome and hasPraise exist and follow the version and their own switch', () => {
    const now = scene(260, { tag: 'parts' }).w, old = scene(257, { tag: 'parts-old' }).w;
    expect([hasCourting(now), hasWelcome(now), hasPraise(now)]).toEqual([true, true, true]);
    expect([hasCourting(old), hasWelcome(old), hasPraise(old)]).toEqual([false, false, false]);
    setMeeting(false, 'welcome');
    expect([hasCourting(now), hasWelcome(now), hasPraise(now)]).toEqual([true, false, true]);
  });
});

describe('the ask: offered only when everything holds', () => {
  it('Ada is offered it, worth ASK_BASE and a little more for her fondness and sociability, and 8 more of an evening', () => {
    const f = scene(260, { tag: 'offer' });
    const o = courtOption(f);
    expect(o, 'offered').toBeTruthy();
    expect(o!.label).toBe('Ask Ben to walk out together');
    const walkPen = 4 * 6 * 0.07;
    const noon = ASK_BASE + (30 - ASK_AFFINITY) * ASK_PER_AFFINITY + ASK_SOCIABLE * 0.8 - walkPen;
    expect(o!.util).toBeCloseTo(noon, 5);
    expect(o!.parts.map(([n]) => n)).toEqual(['wants to walk out together', 'fond of them', 'sociable', 'walking']);
    const e = scene(260, { tag: 'evening', tick: EVENING });
    expect(courtOption(e)!.util).toBeCloseTo(noon + ASK_EVENING, 5);
    expect(courtOption(e)!.parts.map(([n]) => n)).toContain('an evening for it');
  });

  it("it reads only Ada's own record: whatever Ben privately feels, or has no record of at all, she is still offered it", () => {
    for (const regard of [60, 0, -50]) {
      const f = scene(260, { tag: 'private-' + regard });
      relOf(f.ben, f.ada.id).affinity = regard;
      expect(courtOption(f), `Ben regards her at ${regard}`).toBeTruthy();
    }
    const g = scene(260, { tag: 'private-none' });
    delete g.ben.relations[g.ada.id];
    expect(courtOption(g)).toBeTruthy();
  });

  // each case: what is different, and the scene it is different from (the same scene without that one thing offers it)
  const negatives: [string, { change?: (f: Fx) => void; opts?: Opts }][] = [
    ['they are kin', { change: (f) => { relOf(f.ada, f.ben.id).kin = 'sibling'; } }],
    ['Ben is partnered', { change: (f) => { f.ben.partnerId = 99999; } }],
    ['Ada is partnered', { change: (f) => { f.ada.partnerId = 99999; } }],
    ['there is no spark between them', { opts: { noSpark: true } }],
    ['her affinity is just under 15', { change: (f) => { relOf(f.ada, f.ben.id).affinity = 14.9; } }],
    ['her familiarity is just under 10', { change: (f) => { relOf(f.ada, f.ben.id).familiarity = 9.9; } }],
    ['her trust is just under 12', { change: (f) => { relOf(f.ada, f.ben.id).trust = 11.9; } }],
    ['Ben is a child', { opts: { benAge: 8, adaAge: 24 } }],
    ['Ben is a youth', { opts: { benAge: 15 } }],
    ['a cooldown for Ben stands', { change: (f) => { f.ada.cooldowns['court' + f.ben.id] = f.w.tick + 5; } }],
    ['the general cooldown stands', { change: (f) => { f.ada.cooldowns.court = f.w.tick + 5; } }],
    ['Ada is hungry (drive over 25)', { change: (f) => { f.ada.needs.hunger = 40; } }],
    ['Ada is thirsty (drive over 25)', { change: (f) => { f.ada.needs.thirst = 40; } }],
    ['Ada is worn out', { change: (f) => { f.ada.needs.energy = 10; } }],
    ['it is night', { opts: { tick: NIGHT } }],
    ['a danger is believed about', { change: (f) => { f.ada.beliefs[777777] = { id: 777777, kind: 'danger', x: 36, y: 28, amount: 1, seen: f.w.tick, hh: 0 } as never; f.ada.bykind.danger = [777777]; } }],
  ];
  for (const [why, { change, opts: o }] of negatives) {
    it(`not offered when ${why}, and offered in the same scene without it`, () => {
      const control = scene(260, { tag: 'neg-control-' + why, ...(o?.adaAge ? { adaAge: o.adaAge } : {}) });
      expect(courtOption(control), 'control').toBeTruthy();
      const f = scene(260, { tag: 'neg-' + why, ...o });
      change?.(f);
      perceive(f.w, f.ada);
      expect(courtOption(f), why).toBeUndefined();
    });
  }

  it('not offered to somebody more than 10 tiles away (sight reaches 9, so this is read from the check itself)', () => {
    const f = scene(260, { tag: 'far' });
    const ctx = makeCtx(f.w, f.ada, true, true);
    expect(mayCourtNow(ctx)).toBe(true);
    expect(mayAskToWalk(ctx, f.ben, 10)).toBe(true);
    expect(mayAskToWalk(ctx, f.ben, 10.1)).toBe(false);
  });

});

describe('the answer, and the walk on a yes', () => {
  it('Ben says yes, both set out together, and a walk they kept up counts: the pair, the gains, the cooldowns, the words', () => {
    const f = scene(260, { tag: 'yes' });
    const { w, ada, ben } = f;
    const social = [ada.needs.social, ben.needs.social];
    const res = ask(f);
    expect(res).toEqual({ asked: true, yes: true });
    expect(ada.activity?.label).toBe('Walking out with Ben');
    expect(ben.activity?.label).toBe('Walking out with Ada');
    expect(ada.activity?.kind).toBe('wander');
    const before = [ada, ben].map((p, i) => { const r = p.relations[[ben, ada][i].id]; return { aff: r.affinity, trust: r.trust, fam: r.familiarity }; });
    const startedAt = w.tick;
    untilWalkEnds(f);
    expect(walking(ada) || walking(ben)).toBe(false);
    expect(w.tick - startedAt, 'the walk and the standing took at least the standing').toBeGreaterThanOrEqual(WALK_TICKS);
    for (const [i, [p, q]] of [[ada, ben], [ben, ada]].entries()) {
      const r = p.relations[q.id];
      expect(r.courted?.n, `${p.name}'s count`).toBe(1);
      expect(r.courted!.last).toBeGreaterThanOrEqual(startedAt);
      expect(r.affinity - before[i].aff).toBeGreaterThanOrEqual(GAIN_AFFINITY - 0.5);
      expect(r.trust - before[i].trust).toBeGreaterThanOrEqual(GAIN_TRUST - 0.1);
      expect(r.familiarity - before[i].fam).toBeGreaterThanOrEqual(GAIN_FAMILIARITY - 0.1);
      expect(r.courtRefused).toBeUndefined();
      expect(p.needs.social, `${p.name}'s want of company eased`).toBeGreaterThan([ada, ben][i] === ada ? social[0] + GAIN_COMPANY - 1 : social[1] + GAIN_COMPANY - 1);
      expect(p.mood?.thoughts.some((t) => t.kind === 'walked_out' && t.value > 0), `${p.name} is glad of it`).toBe(true);
      expect(p.log.some((l) => l.text === `Walked out with ${q.name}.`)).toBe(true);
      expect(p.cooldowns['court' + q.id]).toBeGreaterThan(w.tick + WALKED_PAIR_WAIT - 400);
    }
    expect(ada.cooldowns.court, 'half a day from asking anybody').toBeGreaterThan(w.tick + WALKED_ANY_WAIT - 400);
    expect(ben.cooldowns.court).toBeUndefined();
    const ev = eventsWith(w, 'walked out together');
    expect(ev.map((e) => e.text)).toEqual(['Ada and Ben walked out together for the first time.']);
    expect(ev[0].kind).toBe('social');
    expect(ev[0].ids).toEqual([ada.id, ben.id]);
    expect(w.chronicle?.some((e) => e.text === ev[0].text), 'the first walk is kept in the chronicle').toBe(true);
    expect(relationshipHistory(w, ada)).toContain(`Has walked out with Ben once, last at tick ${ada.relations[ben.id].courted!.last}.`);
    expect(conservationReport(w).ok).toBe(true);
    // the inspector's account of the talk, from each side
    expect(interactionViews(w, ada).previous?.outcome).toMatch(/agreed to walk out/);
    expect(interactionViews(w, ben).previous?.purpose).toMatch(/came to Ben to ask them to walk out together/);
  });

  it('a second walk is counted again (the pair has walked out twice), its line is not kept in the chronicle, and the history row counts', () => {
    const f = scene(260, { tag: 'twice' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    untilWalkEnds(f);
    expect(courtedCount(ada, ben.id)).toBe(1);
    // a day later, as the cooldowns allow
    w.tick += DAY + 10;
    for (const p of [ada, ben]) { p.needs.hunger = 95; p.needs.thirst = 95; p.needs.energy = 95; p.needs.warmth = 100; p.needs.safety = 100; }
    ben.nextThink = w.tick + 100000;
    perceive(w, ada);
    expect(courtOption(f), 'offered again after the day').toBeTruthy();
    expect(ask(f).yes).toBe(true);
    untilWalkEnds(f);
    expect(courtedCount(ada, ben.id)).toBe(2);
    expect(courtedCount(ben, ada.id)).toBe(2);
    expect(eventsWith(w, 'walked out together').map((e) => e.text)).toEqual(['Ada and Ben walked out together for the first time.', 'Ada and Ben walked out together.']);
    expect(w.chronicle?.filter((e) => e.text.includes('walked out together')).length, 'only the first is kept').toBe(1);
    expect(relationshipHistory(w, ben).some((r) => r === `Has walked out with Ada 2 times, last at tick ${ben.relations[ada.id].courted!.last}.`)).toBe(true);
  });

  it('chronicleWorthy names the first walk and no other line of courting', () => {
    expect(chronicleWorthy('social', 'Ada and Ben walked out together for the first time.')).toBe(true);
    expect(chronicleWorthy('social', 'Ada and Ben walked out together.')).toBe(false);
    expect(chronicleWorthy('social', 'Ada and Ben set out to walk together and turned back.')).toBe(false);
    expect(chronicleWorthy('social', 'Ada asked Ben to walk out; Ben said not today.')).toBe(false);
  });

  it('the place is chosen from what Ada knows: a haunt of hers, else the water, else a point near a fire; with none of them she is not offered it', () => {
    const place = (f: Fx) => courtOption(f)?.make!()!.data.conv.walk as { x: number; y: number; at: string } | undefined;
    // a hut of hers a fair way from the square: the square is one of her haunts
    const h = scene(260, { tag: 'where-haunt' });
    const hut = building(h.s, 'hut', 36, 44, h.ada.hhId);
    h.w.households.find((x) => x.id === h.ada.hhId)!.homeId = hut.id;
    expect(place(h)?.at).toBe('square');
    // no home and no haunt, the lake a short walk north: the water, on the shore
    const f = scene(260, { tag: 'where-water' });
    const wp = place(f)!;
    expect(wp.at).toBe('water');
    expect(wp.y, 'on the shore').toBeLessThan(20);
    // far from any water, with a fire she knows: a point about 6 tiles from the fire
    const g = scene(260, { tag: 'where-fire', y: 60 });
    expect(courtOption(g), 'nothing she knows to walk to').toBeUndefined();
    const fire = building(g.s, 'fire', 30, 62);
    fire.fuel = 50;
    learn(g.w, g.ada, fire);
    const fp = place(g)!;
    expect(fp.at).toBe('fire');
    expect(Math.hypot(fp.x - (fire.x + 0.5), fp.y - (fire.y + 0.5))).toBeGreaterThan(4.5);
    expect(Math.hypot(fp.x - (fire.x + 0.5), fp.y - (fire.y + 0.5))).toBeLessThan(7.5);
    // the walk really goes there: Ada's spot is that place, Ben's a step beside it
    expect(ask(g).yes).toBe(true);
    expect(g.ada.activity!.spotX).toBeCloseTo(fp.x, 5);
    expect(Math.hypot(g.ben.activity!.spotX - fp.x, g.ben.activity!.spotY - fp.y)).toBeLessThan(2);
  });
});

describe('a no: the cooldown, the count of refusals running, the third one, and a yes that clears it', () => {
  it('Ben not fond enough says not today: Ada waits a day, the count is one, the feed says so, and nobody walks', () => {
    const f = scene(260, { tag: 'no' });
    const { w, ada, ben } = f;
    relOf(ben, ada.id).affinity = 10;
    const r = ask(f);
    expect(r).toEqual({ asked: true, yes: false });
    expect(walking(ada) || walking(ben)).toBe(false);
    expect(ada.relations[ben.id].courtRefused).toBe(1);
    expect(ada.cooldowns['court' + ben.id]).toBeGreaterThan(w.tick + REFUSED_WAIT - 400);
    expect(ada.cooldowns['court' + ben.id]).toBeLessThanOrEqual(w.tick + REFUSED_WAIT);
    expect(eventsWith(w, 'walk out').map((e) => e.text)).toEqual(['Ada asked Ben to walk out; Ben said not today.']);
    expect(w.chronicle?.some((e) => e.text.includes('walk out')) ?? false).toBe(false);
    expect(interactionViews(w, ada).previous?.outcome).toMatch(/said not today/);
    expect(courtOption(f), 'not asked again during the day').toBeUndefined();
  });

  it('each reason Ben has is a no: partnered, hungry, thirsty, worn out, or no fondness (the roll aside)', () => {
    const reasons: [string, (f: Fx) => void][] = [
      ['hungry', (f) => { f.ben.needs.hunger = 40; }],
      ['thirsty', (f) => { f.ben.needs.thirst = 40; }],
      ['worn out', (f) => { f.ben.needs.energy = 10; }],
      ['not fond enough', (f) => { relOf(f.ben, f.ada.id).affinity = 12; }],
    ];
    for (const [why, change] of reasons) {
      const f = scene(260, { tag: 'why-' + why });
      change(f);
      // Ben's needs are what he has when he is asked, not what the staging set at the start
      expect(ask(f), why).toEqual({ asked: true, yes: false });
    }
    // somebody partnered is not asked (Ada can see it); if the ask is made all the same, the answer is no, for either of them
    const g = scene(260, { tag: 'why-partnered' });
    expect(courtRefusal(g.w, g.ada, g.ben)).toBe('');
    g.ben.partnerId = 99999;
    expect(courtRefusal(g.w, g.ada, g.ben)).not.toBe('');
    g.ben.partnerId = 0;
    g.ada.partnerId = 99999;
    expect(courtRefusal(g.w, g.ada, g.ben)).not.toBe('');
  });

  it('with a roll that comes up against him, a person who is otherwise willing still says not today, and with sociability 1 the roll cannot fail', () => {
    // sociability 0: yes only if the roll is under 0.7; over many times and pairs some fall each way
    // (the roll is taken at each 64 ticks of the clock, so each scene starts a bucket later, and all of them inside the daylight)
    let yes = 0, no = 0;
    for (let k = 0; k < 12; k++) {
      const f = scene(260, { tag: 'roll-' + k, benSociability: 0, tick: at(0.3) + k * 64 });
      const r = ask(f);
      expect(r.asked, 'asked in daylight').toBe(true);
      if (r.yes) yes++; else no++;
    }
    expect(yes).toBeGreaterThan(0);
    expect(no).toBeGreaterThan(0);
    expect(yes).toBeGreaterThan(no);
  });

  it('the third refusal running costs Ada 6 affinity and three days; the first two cost only a day; a yes clears the count', () => {
    const f = scene(260, { tag: 'third' });
    const { w, ada, ben } = f;
    const rel = ada.relations[ben.id];
    const aff0 = rel.affinity;
    noteCourtRefusal(w, ada, ben);
    expect([rel.courtRefused, rel.affinity, ada.cooldowns['court' + ben.id]]).toEqual([1, aff0, w.tick + REFUSED_WAIT]);
    noteCourtRefusal(w, ada, ben);
    expect([rel.courtRefused, rel.affinity, ada.cooldowns['court' + ben.id]]).toEqual([2, aff0, w.tick + REFUSED_WAIT]);
    noteCourtRefusal(w, ada, ben);
    expect([rel.courtRefused, rel.affinity, ada.cooldowns['court' + ben.id]]).toEqual([3, aff0 - REFUSALS_AFFINITY, w.tick + REFUSALS_WAIT]);
    expect(REFUSALS_WAIT).toBe(3 * DAY);
    noteCourtYes(ada, ben);
    expect(rel.courtRefused).toBeUndefined();
    noteCourtRefusal(w, ada, ben);
    expect([rel.courtRefused, rel.affinity]).toEqual([1, aff0 - REFUSALS_AFFINITY]);
  });

  it('through real conversations: two refusals, a yes (the count is gone), then a refusal is the first again', () => {
    const f = scene(260, { tag: 'real-third' });
    const { w, ada, ben } = f;
    relOf(ben, ada.id).affinity = 10;
    // each time a day or three later, everybody as fed and rested as at the start, and Ben as fond of her as the case wants (talking warms them a little)
    const again = (benRegard: number) => { w.tick += 3 * DAY + 5; for (const p of [ada, ben]) { p.needs.hunger = 95; p.needs.thirst = 95; p.needs.energy = 95; p.needs.warmth = 100; p.needs.safety = 100; } relOf(ben, ada.id).affinity = benRegard; ben.nextThink = w.tick + 100000; perceive(w, ada); };
    expect(ask(f).yes).toBe(false);
    again(10);
    expect(ask(f).yes).toBe(false);
    expect(ada.relations[ben.id].courtRefused).toBe(2);
    again(30);
    expect(ask(f).yes).toBe(true);
    expect(ada.relations[ben.id].courtRefused).toBeUndefined();
    untilWalkEnds(f);
    again(10);
    expect(ask(f).yes).toBe(false);
    expect(ada.relations[ben.id].courtRefused).toBe(1);
  });
});

describe('called away: no count, and the feed says they turned back', () => {
  it('Ben is called away to drink: both walks end, neither is counted, and the pair wait a little', () => {
    const f = scene(260, { tag: 'away-ben' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    for (let i = 0; i < 30; i++) stepWorld(w);
    expect(walking(ada) && walking(ben)).toBe(true);
    ben.needs.thirst = 1;
    for (let i = 0; i < 60 && (walking(ada) || walking(ben)); i++) stepWorld(w);
    expect(walking(ada) || walking(ben)).toBe(false);
    expect(courtedCount(ada, ben.id) + courtedCount(ben, ada.id)).toBe(0);
    expect(eventsWith(w, 'walk').map((e) => e.text)).toEqual(['Ada and Ben set out to walk together and turned back.']);
    expect(eventsWith(w, 'walked out together')).toEqual([]);
    expect(ada.cooldowns['court' + ben.id]).toBeGreaterThan(w.tick);
    expect(ada.cooldowns['court' + ben.id]).toBeLessThanOrEqual(w.tick + CUT_SHORT_WAIT);
    expect(ada.cooldowns.court, 'no half-day from asking anybody for a walk that did not count').toBeUndefined();
    expect(w.chronicle?.some((e) => e.text.includes('turned back')) ?? false).toBe(false);
  });

  it('Ada is called away, standing at the place: the same', () => {
    const f = scene(260, { tag: 'away-ada' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    for (let i = 0; i < 400 && ada.activity?.phase !== 'work'; i++) stepWorld(w);
    expect(ada.activity?.phase).toBe('work');
    ada.needs.thirst = 1;
    for (let i = 0; i < 80 && (walking(ada) || walking(ben)); i++) stepWorld(w);
    expect(walking(ada) || walking(ben)).toBe(false);
    expect(courtedCount(ada, ben.id) + courtedCount(ben, ada.id)).toBe(0);
    expect(eventsWith(w, 'turned back').map((e) => e.text)).toEqual(['Ada and Ben set out to walk together and turned back.']);
  });

  it('a walk where they were not together half the time is not counted either', () => {
    const f = scene(260, { tag: 'apart' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    // Ben, though still on the walk, is kept elsewhere (a staged straggler): he never gets within 3 tiles at the place
    ben.activity!.spotX = ada.activity!.spotX + 12;
    ben.activity!.spotY = ada.activity!.spotY;
    ben.activity!.path = [];
    ben.activity!.pi = 0;
    ben.activity!.pathTries = 0;
    untilWalkEnds(f, 2500);
    expect(courtedCount(ada, ben.id)).toBe(0);
    expect(eventsWith(w, 'turned back')).toHaveLength(1);
  });

  it('two people out walking are not sought out for a chat by a third (the quiet that leaves somebody at their work alone), and are again once the walk is over', () => {
    const f = scene(260, { tag: 'chat' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    for (let i = 0; i < 600 && !(ada.activity?.phase === 'work' && ben.activity?.phase === 'work'); i++) stepWorld(w);
    expect(ada.activity?.phase).toBe('work');
    const cy = addPerson(f.s, 'Cy', ben.x + 1.5, ben.y, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 95, traits: { sociability: 0.9 } });
    cy.needs.warmth = 100;
    cy.needs.safety = 100;
    cy.needs.social = 5;
    cy.nextThink = w.tick + 100000;
    const chatWith = (p: Person) => generateOptions(w, cy, true, true).options.some((o) => o.key === `socialize:${p.id}:chat`);
    perceive(w, cy);
    expect(cy.seen.find((s) => s.id === ben.id)?.walkingOut, 'seen to be out walking').toBe(true);
    expect(chatWith(ben) || chatWith(ada), 'a lonely third person is offered no chat with either of them').toBe(false);
    // a person is as visible without the part, but nobody is out walking then
    const ctrl = scene(260, { tag: 'chat-control' });
    const cy2 = addPerson(ctrl.s, 'Cy', ctrl.ben.x + 1.5, ctrl.ben.y, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 95, traits: { sociability: 0.9 } });
    cy2.needs.warmth = 100; cy2.needs.safety = 100; cy2.needs.social = 5;
    perceive(ctrl.w, cy2);
    expect(cy2.seen.find((s) => s.id === ctrl.ben.id)?.walkingOut).toBeUndefined();
    expect(generateOptions(ctrl.w, cy2, true, true).options.some((o) => o.key === `socialize:${ctrl.ben.id}:chat`), 'but the same lonely person is offered one with Ben when he is not walking').toBe(true);
    untilWalkEnds(f);
    perceive(w, cy);
    expect(cy.seen.find((s) => s.id === ben.id)?.walkingOut).toBeUndefined();
    expect(courtedCount(ada, ben.id), 'the walk was kept up').toBe(1);
  });

  it('somebody out walking takes no talk but a warning: a request is declined with the reason and the walk counts; a warning is heard', () => {
    const f = scene(260, { tag: 'busy' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    for (let i = 0; i < 600 && !(ada.activity?.phase === 'work' && ben.activity?.phase === 'work'); i++) stepWorld(w);
    expect(ada.activity?.phase).toBe('work');
    const cy = addPerson(f.s, 'Cy', ben.x + 1.5, ben.y, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 95 });
    cy.needs.warmth = 100;
    cy.needs.safety = 100;
    cy.nextThink = w.tick + 100000;
    const talkTo = (purpose: string, conv: object) => newActivity(w, cy, { kind: 'socialize', label: 'x', goal: 'y', targetId: ben.id, targetType: 'person', tx: ben.x, ty: ben.y, spotX: ben.x + 1.3, spotY: ben.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose, conv } });
    const request = talkTo('request', { reqKind: 'food', amount: 1 });
    startActivity(w, cy, request);
    for (let i = 0; i < 40 && cy.activity === request; i++) stepWorld(w);
    expect(w.conversations.some((c) => c.purpose === 'request'), 'no talk was begun').toBe(false);
    expect(cy.log.some((l) => /Wanted a word with Ben, who is walking out with Ada/.test(l.text)), 'the reason is plain').toBe(true);
    expect(walking(ada) && walking(ben), 'the walk goes on').toBe(true);
    untilWalkEnds(f);
    expect(courtedCount(ada, ben.id), 'and counts').toBe(1);
    // a warning is another matter: it gets through (the world's own rule: the walk ends, as any talk ends it)
    const g = scene(260, { tag: 'warned' });
    expect(ask(g).yes).toBe(true);
    for (let i = 0; i < 600 && !(g.ada.activity?.phase === 'work' && g.ben.activity?.phase === 'work'); i++) stepWorld(g.w);
    const dee = addPerson(g.s, 'Dee', g.ben.x + 1.5, g.ben.y, { age: 30, sex: 'f', hunger: 95, thirst: 95, energy: 95 });
    dee.needs.warmth = 100;
    dee.needs.safety = 100;
    dee.nextThink = g.w.tick + 100000;
    let heard = false;
    for (let attempt = 0; attempt < 8 && !heard; attempt++) {
      const warn = newActivity(g.w, dee, { kind: 'socialize', label: 'x', goal: 'y', targetId: g.ben.id, targetType: 'person', tx: g.ben.x, ty: g.ben.y, spotX: g.ben.x + 1.3, spotY: g.ben.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose: 'warn', conv: {} } });
      startActivity(g.w, dee, warn);
      for (let i = 0; i < 40 && dee.activity === warn; i++) { stepWorld(g.w); if (g.w.conversations.some((c) => c.purpose === 'warn')) heard = true; }
      delete dee.cooldowns['talk' + g.ben.id];
      g.w.tick += 17;
    }
    expect(heard, 'a warning is heard').toBe(true);
  });

  it('either of them dying, or the other going, leaves no line in the feed and nothing counted', () => {
    const f = scene(260, { tag: 'gone' });
    const { w, ada, ben } = f;
    expect(ask(f).yes).toBe(true);
    for (let i = 0; i < 20; i++) stepWorld(w);
    ben.alive = false;
    endActivity(w, ben, 'interrupted', 'staged: gone');
    for (let i = 0; i < 10 && walking(ada); i++) stepWorld(w);
    expect(walking(ada)).toBe(false);
    expect(courtedCount(ada, ben.id)).toBe(0);
    expect(eventsWith(w, 'walk together')).toEqual([]);
  });
});

describe('the proposal weighs the walks', () => {
  const proposeOption = (f: Fx) => generateOptions(f.w, f.ada, true, true).options.find((o) => o.key === `socialize:${f.ben.id}:propose`);
  const partnerScene = (version: number, tag: string, walks: number) => {
    const f = scene(version, { tag });
    Object.assign(relOf(f.ada, f.ben.id), { familiarity: 20, affinity: 40, trust: 30 });
    if (walks) relOf(f.ada, f.ben.id).courted = { n: walks, last: f.w.tick - 10 };
    return f;
  };

  it("Ada's own count shows in her proposal's score: -8 until two walks, +6 from two, as named lines", () => {
    const none = proposeOption(partnerScene(260, 'prop-0', 0))!, one = proposeOption(partnerScene(260, 'prop-1', 1))!, two = proposeOption(partnerScene(260, 'prop-2', 2))!;
    expect(none.parts.find(([n]) => n === 'has not walked out with them yet')?.[1]).toBe(PROPOSE_NOT_YET);
    expect(one.parts.find(([n]) => n === 'has not walked out with them yet')?.[1]).toBe(PROPOSE_NOT_YET);
    expect(two.parts.find(([n]) => n === 'they have walked out together')?.[1]).toBe(PROPOSE_WALKED);
    expect(two.parts.some(([n]) => n === 'has not walked out with them yet')).toBe(false);
    expect(none.util - PROPOSE_NOT_YET).toBeCloseTo(two.util - PROPOSE_WALKED, 5);
    expect(two.util - none.util).toBeCloseTo(PROPOSE_WALKED - PROPOSE_NOT_YET, 5);
  });

  it('and not at rules 257, nor with the part switched off: the score is the old one whatever the count', () => {
    const old = proposeOption(partnerScene(257, 'prop-old', 2))!;
    expect(old.parts.map(([n]) => n)).toEqual(['wants to share a life', 'walking']);
    const base = 26 + (40 - 30) * 0.4 - 4 * 6 * 0.07;
    expect(old.util).toBeCloseTo(base, 5);
    setMeeting(false, 'courting');
    const off = proposeOption(partnerScene(260, 'prop-off', 2))!;
    expect(off.util).toBeCloseTo(base, 5);
    expect(off.parts.map(([n]) => n)).toEqual(['wants to share a life', 'walking']);
    setMeeting(true, 'courting');
    expect(proposeOption(partnerScene(260, 'prop-on', 0))!.util).toBeCloseTo(base + PROPOSE_NOT_YET, 5);
  });

  it('courting is not required to propose: with no walk at all she is still offered the proposal', () => {
    expect(proposeOption(partnerScene(260, 'prop-none', 0))).toBeTruthy();
  });

  /** Ada proposes to Ben (staged conversation); Ben's affinity toward her is 25, between 24 and 28 */
  function proposeTo(version: number, tag: string, walks: number, off = false): { yes: boolean } {
    if (off) setMeeting(false, 'courting');
    const f = scene(version, { tag });
    const { w, ada, ben } = f;
    Object.assign(relOf(ada, ben.id), { familiarity: 20, affinity: 40, trust: 30 });
    Object.assign(relOf(ben, ada.id), { familiarity: 20, affinity: 25, trust: 30 });
    if (walks) relOf(ben, ada.id).courted = { n: walks, last: w.tick - 10 };
    for (let attempt = 0; attempt < 8; attempt++) {
      const act = newActivity(w, ada, { kind: 'socialize', label: 'x', goal: 'y', targetId: ben.id, targetType: 'person', tx: ben.x, ty: ben.y, spotX: ben.x - 1.3, spotY: ben.y, utility: 100, minCommit: 4000, maxTicks: 600, data: { purpose: 'propose', conv: { joinKind: 'partner' } } });
      ada.nextThink = w.tick + 100000;
      startActivity(w, ada, act);
      let opened = false;
      for (let i = 0; i < 400; i++) {
        stepWorld(w);
        const c = w.conversations.find((x) => x.purpose === 'propose');
        if (c) opened = true;
        if (opened && !c) return { yes: ada.partnerId === ben.id };
        if (!opened && ada.activity?.kind !== 'socialize') break;
      }
      delete ada.cooldowns['talk' + ben.id];
      w.tick += 17;
    }
    throw new Error('the proposal was never made');
  }
  it('the answerer needs 28 and has 25: refused with fewer than two walks, accepted from two (and at 257 or with the part off, refused)', () => {
    expect(PROPOSE_AFFINITY).toBe(28);
    expect(PROPOSE_AFFINITY_WALKED).toBe(24);
    expect(proposeTo(260, 'ans-0', 0).yes).toBe(false);
    expect(proposeTo(260, 'ans-1', 1).yes).toBe(false);
    expect(proposeTo(260, 'ans-2', 2).yes).toBe(true);
    expect(proposeTo(260, 'ans-off', 2, true).yes).toBe(false);
    expect(proposeTo(257, 'ans-old', 2).yes).toBe(false);
  });
});

describe('gates: nothing changes below 260 or with the part off', () => {
  it('a rules-257 world is never offered it, nor is it with the courting part switched off, and welcome and praise do nothing', () => {
    expect(courtOption(scene(257, { tag: 'gate-old' }))).toBeUndefined();
    expect(courtOption(scene(260, { tag: 'gate-on' }))).toBeTruthy();
    setMeeting(false, 'courting');
    expect(courtOption(scene(260, { tag: 'gate-off' }))).toBeUndefined();
    setMeeting(true, 'courting');
    setMeeting(false, 'welcome');
    setMeeting(false, 'praise');
    expect(courtOption(scene(260, { tag: 'gate-others-off' }))).toBeTruthy();
    expect([meetingPartOn('courting'), meetingPartOn('welcome'), meetingPartOn('praise')]).toEqual([true, false, false]);
  });

  it('an authored (not rich) world and a staged scene other than the natural one are never offered it', () => {
    const f = scene(260, { tag: 'gate-authored' });
    f.w.settings.dynamics = 'authored';
    expect(courtOption(f)).toBeUndefined();
    const g = scene(260, { tag: 'gate-scene' });
    g.w.settings.scene = 'help';
    expect(courtOption(g)).toBeUndefined();
  });

  it('the lab arms are registered, each switches its own part, and the older rich-no-meeting-knowledge arm is not taken over', () => {
    expect(parseIntervention('rich-no-meeting').spec).toBe('rich-no-meeting');
    for (const part of MEETING_PARTS) expect(parseIntervention(`rich-no-meeting-${part}`).spec).toBe(`rich-no-meeting-${part}`);
    expect(parseIntervention('rich-no-meeting-knowledge').summary).toMatch(/shared-status meal decisions/);
    const undo = parseIntervention('rich-no-meeting-courting').install!();
    expect([meetingPartOn('courting'), meetingPartOn('welcome'), meetingPartOn('praise')]).toEqual([false, true, true]);
    undo();
    expect(MEETING_PARTS.every((k) => meetingPartOn(k))).toBe(true);
    const undoAll = parseIntervention('rich-no-meeting').install!();
    expect(MEETING_PARTS.some((k) => meetingPartOn(k))).toBe(false);
    undoAll();
    expect(MEETING_PARTS.every((k) => meetingPartOn(k))).toBe(true);
    const f = scene(260, { tag: 'arm' });
    const undoArm = parseIntervention('rich-no-meeting-courting').install!();
    expect(courtOption(f)).toBeUndefined();
    undoArm();
    expect(courtOption(f)).toBeTruthy();
  });

  it('a save of rules 257 that holds a count of walks, or a walk, is refused on loading', () => {
    const f = scene(260, { tag: 'refuse' });
    relOf(f.ada, f.ben.id).courted = { n: 1, last: f.w.tick - 5 };
    expect(() => validateCourting(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 257;
    expect(() => validateCourting(f.w)).toThrow(/courting/i);
    f.w.settings.rulesVersion = 260;
    relOf(f.ada, f.ben.id).courted = { n: 0, last: 1 };
    expect(() => validateCourting(f.w)).toThrow(/courting/i);
    relOf(f.ada, f.ben.id).courted = { n: 1, last: f.w.tick + 1 };
    expect(() => validateCourting(f.w)).toThrow(/courting/i);
    delete relOf(f.ada, f.ben.id).courted;
    relOf(f.ada, f.ben.id).courtRefused = 4;
    expect(() => validateCourting(f.w)).toThrow(/courting/i);
  });
});

describe('save, load, continue', () => {
  it('a world with a walk in progress continues exactly, the count survives, and two identical runs give the same world', () => {
    const run = (tag: string) => {
      const f = scene(260, { tag });
      expect(ask(f).yes).toBe(true);
      for (let i = 0; i < 60; i++) stepWorld(f.w);
      return f;
    };
    const f = run('save');
    expect(walking(f.ada) && walking(f.ben)).toBe(true);
    const copy = deserializeWorld(serializeWorld(f.w));
    for (let i = 0; i < 700; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    expect(f.ada.relations[f.ben.id].courted?.n).toBe(1);
    const back = copy.persons.find((p) => p.id === f.ada.id)!;
    expect(back.relations[f.ben.id].courted?.n).toBe(1);
    expect(back.relations[f.ben.id].courted?.last).toBe(f.ada.relations[f.ben.id].courted!.last);
    expect(hashWorld(copy)).toBe(hashWorld(f.w));
    expect(conservationReport(f.w).ok).toBe(true);
    // a refused count survives a save too
    const g = scene(260, { tag: 'save-refused' });
    noteCourtRefusal(g.w, g.ada, g.ben);
    const h = deserializeWorld(serializeWorld(g.w));
    expect(h.persons.find((p) => p.id === g.ada.id)!.relations[g.ben.id].courtRefused).toBe(1);
    // two identical runs
    const a = run('same'), b = run('same');
    for (let i = 0; i < 400; i++) { stepWorld(a.w); stepWorld(b.w); }
    expect(hashWorld(a.w)).toBe(hashWorld(b.w));
    expect(a.ada.relations[a.ben.id].courted).toEqual(b.ada.relations[b.ben.id].courted);
  });

  it('the count is in the world fingerprint: the same world without it hashes differently', () => {
    const f = scene(260, { tag: 'hash' });
    const h0 = hashWorld(f.w);
    relOf(f.ada, f.ben.id).courted = { n: 1, last: f.w.tick };
    expect(hashWorld(f.w)).not.toBe(h0);
  });
});

describe('an ordinary world (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 260, and prints how many asks, yeses, walks and pairings there were', () => {
    // COURTING_BUDGET_MS: how long to run (default about 100 s, then to the end of the day); COURTING_OFF=1: the same world with the part switched off,
    // for a comparison; COURTING_REPORT=<file>: also append the line there (a test runner may swallow console output)
    const budgetMs = Number(process.env.COURTING_BUDGET_MS ?? 100_000);
    // COURTING_DAYS: run exactly this many days instead (so that two arms cover the same time)
    const fixedDays = Number(process.env.COURTING_DAYS ?? 0);
    if (process.env.COURTING_OFF) setMeeting(false, 'courting');
    // COURTING_SEED: another seed the repo already uses by name (gen-2, gen-6)
    const seed = process.env.COURTING_SEED ?? 'gen-4';
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 260 });
    const seen = new Map<number, { yes?: boolean }>();
    let lastEvent = 0, refused = 0, counted = 0, firsts = 0, cut = 0, couples = 0, moved = 0;
    const scanEvents = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        if (e.text.includes('walked out together for the first time')) { counted++; firsts++; }
        else if (e.text.includes('walked out together')) counted++;
        else if (e.text.includes('said not today')) refused++;
        else if (e.text.includes('set out to walk together')) cut++;
        else if (e.text.includes('became a couple')) couples++;
        else if (e.text.includes('moved in together')) moved++;
      }
    };
    const t0 = Date.now();
    while (fixedDays > 0 ? w.tick < fixedDays * DAY : Date.now() - t0 < budgetMs || w.tick % DAY !== 0) {
      stepWorld(w);
      for (const c of w.conversations) if (c.purpose === 'court') {
        const r = seen.get(c.id) ?? {};
        if (c.data.courtYes !== undefined) r.yes = c.data.courtYes;
        seen.set(c.id, r);
      }
      if (w.tick % 20 === 0) scanEvents();
      if (w.tick >= 60 * DAY) break;
    }
    scanEvents();
    const asks = seen.size, yeses = [...seen.values()].filter((r) => r.yes === true).length, noes = [...seen.values()].filter((r) => r.yes === false).length;
    const expecting = w.persons.filter((p) => p.alive && p.pregnantUntil > w.tick).length;
    const people = w.persons.filter((p) => p.alive).length;
    let walkedPairs = 0, courted2 = 0;
    for (const p of w.persons) for (const [id, r] of Object.entries(p.relations)) if (r.courted && p.id < Number(id)) { walkedPairs++; if (r.courted.n >= 2) courted2++; }
    // what stood in the way, at the end: unpartnered grown pairs with a spark, how many of them one side knows well enough to ask, and who is asked now
    let sparkPairs = 0, knowEnough = 0, fondEnough = 0, offeredNow = 0;
    const grown = w.persons.filter((p) => p.alive && p.partnerId === 0 && ['adult', 'elder'].includes(stageOf(w, p)));
    for (const a of grown) {
      for (const b of grown) {
        if (a.id >= b.id || !spark(a, b) || a.relations[b.id]?.kin) continue;
        sparkPairs++;
        const ra = a.relations[b.id], rb = b.relations[a.id];
        const ok = (r: typeof ra) => !!r && r.familiarity >= 10 && r.affinity >= 20 && r.trust >= 12;
        if (ok(ra) || ok(rb)) knowEnough++;
        if ((ra?.affinity ?? 0) >= 20 || (rb?.affinity ?? 0) >= 20) fondEnough++;
      }
      if (generateOptions(w, a, true, true).options.some((o) => o.key.endsWith(':court'))) offeredNow++;
    }
    const line = `COURTING ordinary world, seed ${seed}, rules 260: ${Math.floor(w.tick / DAY)} days, ${people} alive; asks ${asks}, yes ${yeses}, no ${noes}, not today ${refused} (events), walks counted ${counted} (first walks ${firsts}), walks cut short ${cut}, pairs who walked ${walkedPairs} (two or more: ${courted2}), became a couple ${couples}, moved in together ${moved}; births ${w.birthCount ?? 0}, expecting at the end ${expecting}; at the end, unpartnered grown ${grown.length}, of them pairs with a spark ${sparkPairs} (affinity 20 or more on a side ${fondEnough}, and also familiarity 10 and trust 12 ${knowEnough}), people offered the ask just then ${offeredNow}`;
    console.log(line);
    if (process.env.COURTING_REPORT) appendFileSync(process.env.COURTING_REPORT, line + (process.env.COURTING_OFF ? ' [part switched off]' : '') + '\n');
    expect(conservationReport(w).ok).toBe(true);
    expect(refused).toBeLessThanOrEqual(asks);
    // every state this left behind is one a save would accept
    expect(() => validateCourting(w)).not.toThrow();
  }, 400_000);
});
