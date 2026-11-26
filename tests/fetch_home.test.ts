// Rules 264 (bundle E, part 13): fetching someone home after dark (src/sim/fetch_home.ts, the switch in src/sim/together_scenes.ts; the ask in options_social.ts optFetchAsk and
// social.ts, the promise kept from options_work.ts, the walk in welfare.ts's visit handler, the walk home offered in options_social.ts). Every situation here is STAGED: it checks a
// rule, it is not an example of spontaneous behaviour. The last test runs an ordinary world for two days and PRINTS what happened (the three parts of the bundle).
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity } from '../src/sim/activities';
import { DAY, TICKS_PER_YEAR } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { ageYears } from '../src/sim/people';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { dayFraction, updateEnvironment } from '../src/sim/environment';
import {
  FETCH_ASKS_MAX, FETCH_ASK_EDGE, FETCH_ASK_WINDOW, FETCH_DARK, FETCH_HOME_NEAR, FETCH_LOOK, FETCH_RANGE, FETCH_TICKS, FETCH_TOGETHER, FETCH_WAIT_FOR_THEM, FETCH_GREET,
  answerFetch, fetchTick, validateFetching,
} from '../src/sim/fetch_home';
import { describePerson } from '../src/sim/inspect';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { TOGETHER_SCENE_PARTS, hasFetching, setTogetherScenes, togetherScenePartOn } from '../src/sim/together_scenes';
import type { Person, Request, World } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, pin, stage } from './helpers/kit';

afterEach(() => setTogetherScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const DUSK = at(0.8);
const NOON = at(0.45);
const dist = (a: Person, b: Person): number => Math.hypot(a.x - b.x, a.y - b.y);

interface Opts {
  tag?: string;
  version?: number;
  dynamics?: 'rich' | 'authored';
  tick?: number;
  /** how far east of the camp Cora was last seen (and is) */
  far?: number;
  /** Cora is not where Mira last saw her: she is this far further east (out of sight of the place) */
  elsewhere?: number;
  /** Cora is free to decide from the start (not stood where she is until she is found) */
  free?: boolean;
}

/**
 * Mira (30) and her daughter Cora (6), of one household, with no home: the camp is at (40,40). It is dark. Mira last saw Cora, by her own record, `far` tiles east of the camp,
 * more than 1,100 ticks ago, and holds the worry that she is missing. Cora is there, standing still. Dov (35) is a neighbour who stands by the camp and thinks well of her; Eve (38)
 * is another who does not. Everybody carries food, wood, stone and water. Only the ones a test sets going decide anything.
 */
function scene(o: Opts = {}) {
  const s = stage(`fetch-${o.version ?? 264}-${o.dynamics ?? 'rich'}-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = o.dynamics ?? 'rich';
  w.settings.rulesVersion = o.version ?? 264;
  w.tick = o.tick ?? DUSK;
  updateEnvironment(w);
  w.camp = { x: 40, y: 40 };
  const far = o.far ?? 22;
  const base = { hunger: 95, thirst: 95, energy: 90, inv: { berries: 6, wood: 4, stone: 3, water: 2 } };
  const mira = addPerson(s, 'Mira', 40, 40, { age: 30, sex: 'f', ...base, traits: { generosity: 0.7, sociability: 0.6, caution: 0.3 } });
  const cora = addPerson(s, 'Cora', 40 + far + (o.elsewhere ?? 0), 41, { age: 6, sex: 'f', ...base, hh: mira.hhId });
  const dov = addPerson(s, 'Dov', 42, 41.5, { age: 35, sex: 'm', ...base, traits: { generosity: 0.9, diligence: 0.8, sociability: 0.7, caution: 0.3 } });
  const eve = addPerson(s, 'Eve', 38, 42, { age: 38, sex: 'f', ...base, traits: { generosity: 0.05, diligence: 0.2, sociability: 0.3, caution: 0.3 } });
  done(s);
  Object.assign(relOf(mira, cora.id), { kin: 'child', affinity: 90, trust: 80, familiarity: 60 });
  Object.assign(relOf(cora, mira.id), { kin: 'parent', affinity: 90, trust: 80, familiarity: 60 });
  for (const [a, b, aff] of [[mira, dov, 20], [dov, mira, 20], [mira, eve, 20], [eve, mira, -30]] as [Person, Person, number][]) Object.assign(relOf(a, b.id), { affinity: aff, trust: aff > 0 ? 40 : -10, familiarity: 40 });
  for (const p of [mira, cora, dov, eve]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; p.nextThink = w.tick + 100000; }
  if (!o.free) pin(cora);
  // what Mira holds: her own old sighting of Cora, and the worry that follows from not having seen her since
  mira.whereabouts[cora.id] = { x: 40 + far, y: 41, tick: w.tick - 1150 };
  mira.concerns.push({ about: cora.id, kind: 'missing', seen: w.tick - 600, src: 'seen', from: mira.id, checked: -99999 });
  rebuildMobileGrid(w);
  for (const p of [mira, cora, dov, eve]) perceive(w, p);
  return { s, w, mira, cora, dov, eve };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const askOpt = (w: World, p: Person, q: Person) => options(w, p).find((o) => o.key === `socialize:${q.id}:request:fetch`);
const visitOpt = (w: World, p: Person, about: Person) => options(w, p).find((o) => o.key === `visit:${about.id}`);
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
const refresh = (f: Fx): void => { rebuildMobileGrid(f.w); for (const p of [f.mira, f.cora, f.dov, f.eve]) perceive(f.w, p); };
const fetchReqs = (w: World): Request[] => w.requests.filter((r) => r.kind === 'fetch');
const searching = (p: Person): boolean => p.activity?.data.fetch !== undefined;
const searchLines = (w: World) => w.events.filter((e) => / went out after dark /.test(e.text));

/** Mira takes the ask to this person and the talk is held; she is left standing when it is over */
function takeAsk(f: Fx, who: Person = f.dov): void {
  const o = askOpt(f.w, f.mira, who);
  expect(o, 'the ask is offered').toBeTruthy();
  startActivity(f.w, f.mira, o!.make!()!);
  for (let i = 0; i < 600; i++) {
    stepWorld(f.w);
    const r = fetchReqs(f.w).find((x) => x.to === who.id && x.status !== 'pending');
    if (r && !f.mira.convId && !f.mira.activity) return;
  }
  throw new Error('the ask was never answered');
}
/** Mira takes the walk to look (the visit option, now carrying whoever promised to come) */
function goOut(f: Fx): void {
  const v = visitOpt(f.w, f.mira, f.cora);
  expect(v, 'the walk to look is offered').toBeTruthy();
  startActivity(f.w, f.mira, v!.make!()!);
}
/** step the world; Cora, who stood where she was until she is found, is free once she is */
function walk(f: Fx, ticks: number, stop: () => boolean = () => false) {
  const gaps = { dov: 0, cora: 0, ticks: 0 };
  for (let i = 0; i < ticks; i++) {
    stepWorld(f.w);
    const d = f.mira.activity?.data.fetch;
    if (d?.found !== undefined) f.cora.cooldowns.pause = 0;
    if (d && !d.done) {
      gaps.ticks++;
      if (f.dov.activity?.data.fetchWith) gaps.dov = Math.max(gaps.dov, dist(f.dov, f.mira));
      if (f.cora.activity?.data.fetchedBy) gaps.cora = Math.max(gaps.cora, dist(f.cora, f.mira));
    }
    if (stop()) break;
  }
  return gaps;
}
const finished = (f: Fx) => () => searchLines(f.w).length > 0;

describe('rules 264 is registered, with its three parts', () => {
  it('is supported, and hasFetching follows the version and its own switch', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(264);
    expect(TOGETHER_SCENE_PARTS).toEqual(['side', 'speech', 'fetch']);
    const now = scene({ tag: 'parts' }).w, old = scene({ tag: 'parts-old', version: 263 }).w, au = scene({ tag: 'parts-au', dynamics: 'authored' }).w;
    expect([hasFetching(now), hasFetching(old), hasFetching(au)]).toEqual([true, false, false]);
    setTogetherScenes(false, 'fetch');
    expect([hasFetching(now), togetherScenePartOn('side'), togetherScenePartOn('speech')]).toEqual([false, true, true]);
  });
});

describe('the cue and the ask: offered only when everything holds', () => {
  it('Mira, who holds the worry that Cora is missing, in the dark, is offered to ask Dov to come, first: worth the walk to look and FETCH_ASK_EDGE more less the walk to him', () => {
    const f = scene({ tag: 'offer' });
    const v = visitOpt(f.w, f.mira, f.cora)!, o = askOpt(f.w, f.mira, f.dov)!;
    expect(v, 'the ordinary walk to look').toBeTruthy();
    expect(o, 'the ask').toBeTruthy();
    expect(o.label).toBe('Ask Dov to come and look for Cora');
    expect(o.parts.map(([n]) => n)).toEqual(['Cora is not home and it is getting dark', 'walking']);
    const walkPen = o.parts.find(([n]) => n === 'walking')![1];
    expect(Math.abs(o.util - (v.util + FETCH_ASK_EDGE + walkPen))).toBeLessThan(0.1);
    expect(o.util).toBeGreaterThan(v.util);
    expect(options(f.w, f.mira).filter((x) => x.key.includes(':request:fetch')).length, 'one at a time: the one worth most').toBe(1);
    expect(options(f.w, f.dov).some((x) => x.key.includes(':request:fetch')), 'nobody else is asked to ask').toBe(false);
  });

  const negatives: [string, (f: Fx) => void][] = [
    ['it is noon (light over FETCH_DARK)', () => undefined], // handled by the tick option below
    ['Cora is not of Mira\'s household', (f) => { const hh = f.w.households.find((h) => h.id === f.cora.hhId)!; hh.members = hh.members.filter((id) => id !== f.cora.id); f.cora.hhId = f.eve.hhId; }],
    ['Mira holds no worry for her', (f) => { f.mira.concerns = []; }],
    ['Mira is a child', (f) => { f.mira.birthTick = f.w.tick - 9 * TICKS_PER_YEAR; }],
    ['Mira has a critical need (thirst)', (f) => { f.mira.needs.thirst = 5; }],
    ['a danger is believed about', (f) => { f.mira.beliefs[777777] = { id: 777777, kind: 'danger', x: 45, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never; f.mira.bykind.danger = [777777]; }],
    ['the place she last saw her is more than FETCH_RANGE tiles from the camp', (f) => { f.mira.whereabouts[f.cora.id] = { x: 40 + FETCH_RANGE + 6, y: 41, tick: f.w.tick - 1150 }; }],
    ['Cora is in sight', (f) => { f.cora.x = 44; f.cora.y = 41; }],
    ['two have been asked already', (f) => { for (let i = 0; i < FETCH_ASKS_MAX; i++) f.w.requests.push({ id: 9000 + i, kind: 'fetch', from: f.mira.id, to: f.eve.id, item: null, amount: 1, offer: null, offerAmount: 0, siteId: 0, infoKind: '', created: f.w.tick - 10, expires: f.w.tick + 900, status: 'declined', note: '', resolved: f.w.tick - 5, destKind: 'person', destId: f.cora.id, outcome: 'refused' } as Request); }],
    ['Mira is in a talk', (f) => { f.mira.convId = 77; }],
  ];
  for (const [why, change] of negatives) {
    it(`no ask when ${why}, and an ask in the same scene without it`, () => {
      const control = scene({ tag: 'neg-control-' + why });
      expect(askOpt(control.w, control.mira, control.dov), 'control').toBeTruthy();
      const f = why.startsWith('it is noon') ? scene({ tag: 'neg-noon', tick: NOON }) : scene({ tag: 'neg-' + why });
      change(f);
      refresh(f);
      expect(askOpt(f.w, f.mira, f.dov), why).toBeUndefined();
      expect(askOpt(f.w, f.mira, f.eve), why).toBeUndefined();
    });
  }

  it('from nothing: the real decision (not the inspector\'s look) raises the worry for a dependant unseen over 1,100 ticks and offers the ask in the same pass, first', () => {
    const f = scene({ tag: 'from-nothing' });
    f.mira.concerns = [];
    expect(f.mira.concerns.length).toBe(0);
    const ctx = generateOptions(f.w, f.mira, true, false); // observer false: the person's own decision, which is what writes the worry
    expect(f.mira.concerns.some((c) => c.kind === 'missing' && c.about === f.cora.id)).toBe(true);
    const keys = ctx.options.map((o) => o.key);
    expect(keys).toContain(`visit:${f.cora.id}`);
    expect(keys.some((k) => k.endsWith(':request:fetch'))).toBe(true);
    const ask = ctx.options.find((o) => o.key.endsWith(':request:fetch'))!, visit = ctx.options.find((o) => o.key === `visit:${f.cora.id}`)!;
    expect(ask.util).toBeGreaterThan(visit.util);
  });

  it('Dov is not asked if he is a child or a youth, is the one looked for, is already out on a search, or refused a little while ago; Eve is asked instead', () => {
    const f = scene({ tag: 'who' });
    f.dov.birthTick = f.w.tick - 9 * TICKS_PER_YEAR;
    refresh(f);
    expect(askOpt(f.w, f.mira, f.dov), 'a child').toBeUndefined();
    expect(askOpt(f.w, f.mira, f.eve), 'Eve instead').toBeTruthy();
    const g = scene({ tag: 'who-refused' });
    g.mira.cooldowns['fetchask' + g.dov.id] = g.w.tick + 100;
    expect(askOpt(g.w, g.mira, g.dov), 'refused a little while ago').toBeUndefined();
    expect(askOpt(g.w, g.mira, g.eve)).toBeTruthy();
    expect(options(g.w, g.mira).some((x) => x.key === `socialize:${g.cora.id}:request:fetch`), 'never the one looked for').toBe(false);
  });

  it('not before rules 264, with the part off, or in an authored world: the ordinary walk alone, as before', () => {
    const old = scene({ tag: 'v263', version: 263 });
    expect(askOpt(old.w, old.mira, old.dov)).toBeUndefined();
    expect(visitOpt(old.w, old.mira, old.cora)).toBeTruthy();
    const off = scene({ tag: 'off' });
    setTogetherScenes(false, 'fetch');
    expect(askOpt(off.w, off.mira, off.dov)).toBeUndefined();
    setTogetherScenes(true);
    const au = scene({ tag: 'authored', dynamics: 'authored' });
    expect(askOpt(au.w, au.mira, au.dov)).toBeUndefined();
    expect(FETCH_DARK).toBe(0.5);
    expect(off.w.light).toBeLessThan(FETCH_DARK);
  });
});

describe('the answer, as a watch is answered', () => {
  it('Dov, with nothing pressing and a good opinion of her, says yes: an ordinary request, an ordinary promise (a work commitment, milestone fetched) and a line each way', () => {
    const f = scene({ tag: 'yes' });
    takeAsk(f);
    const r = fetchReqs(f.w);
    expect(r.length).toBe(1);
    expect([r[0].kind, r[0].from, r[0].to, r[0].destKind, r[0].destId, r[0].status]).toEqual(['fetch', f.mira.id, f.dov.id, 'person', f.cora.id, 'promised']);
    expect(r[0].note).toBe('Dov will go with Mira to look for Cora');
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect([c.kind, c.status, c.to, c.destKind, c.destId, c.requestId]).toEqual(['work', 'active', f.mira.id, 'person', f.cora.id, r[0].id]);
    expect(f.dov.log.some((l) => l.text === 'Promised Mira to go with them to look for Cora after dark.')).toBe(true);
    expect(f.mira.log.some((l) => l.text === 'Dov promised to come with me to look for Cora.')).toBe(true);
    expect(f.mira.log.some((l) => l.text === 'Asked Dov to come with me to look for Cora after dark.')).toBe(true);
    // and the walk to look now carries him
    const v = visitOpt(f.w, f.mira, f.cora)!;
    const a = v.make!()!;
    expect(a.data.fetch).toMatchObject({ for: f.cora.id, party: [f.dov.id], phase: 'out' });
    expect(a.label).toBe('Going out after dark with Dov to look for Cora');
    expect(askOpt(f.w, f.mira, f.eve), 'one companion is enough: nobody more is asked').toBeUndefined();
  });

  const refusals: [string, (f: Fx) => void, string][] = [
    ['Dov is laid up himself (an injury)', (f) => { f.dov.injury = { kind: 'sprain', since: f.w.tick, until: f.w.tick + 3000, severity: 0.5 } as never; }, 'own need'],
    ['Dov is pressed by a need of his own', (f) => { f.dov.needs.hunger = 25; }, 'own need'],
    ['Dov believes in a danger', (f) => { f.dov.beliefs[777777] = { id: 777777, kind: 'danger', x: 45, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never; f.dov.bykind.danger = [777777]; }, 'own need'],
    ['Dov has two small children of his own to leave', (f) => { for (const n of ['K1', 'K2']) addPerson(f.s, n, 42, 44, { age: 3, hh: f.dov.hhId }); }, 'own need'],
    ['Dov carries as many promises as he can', (f) => { for (let i = 0; i < 3; i++) f.dov.commitments.push({ id: 8800 + i, requestId: 0, kind: 'deliver', to: f.eve.id, item: 'wood', amount: 1, siteId: 0, made: f.w.tick, deadline: f.w.tick + 5000, status: 'active', delivered: 0 } as never); }, 'committed'],
  ];
  for (const [why, change, reason] of refusals) {
    it(`no when ${why}`, () => {
      const f = scene({ tag: 'no-' + why });
      change(f);
      refresh(f);
      const req = { id: 1, kind: 'fetch', from: f.mira.id, to: f.dov.id, destId: f.cora.id } as Request;
      const answer = answerFetch(f.w, f.dov, f.mira, req);
      expect(answer.kind, why).toBe('decline');
      expect((answer as { reason: string }).reason.replace('_', ' ')).toBe(reason);
    });
  }

  it('a person who does not think well of her says no in the talk itself, and Mira is left to ask somebody else or go alone', () => {
    const f = scene({ tag: 'eve-no' });
    f.mira.cooldowns['fetchask' + f.dov.id] = f.w.tick + 100; // (so that she is the one asked)
    takeAsk(f, f.eve);
    const r = fetchReqs(f.w);
    expect(r[0].status).toBe('declined');
    expect(f.eve.commitments.some((x) => x.milestone === 'fetched')).toBe(false);
    expect(f.mira.cooldowns['fetchask' + f.eve.id]).toBeGreaterThan(f.w.tick);
    expect(f.mira.log.some((l) => /could not come and look for Cora\. I will ask someone else, or go alone\./.test(l.text))).toBe(true);
    // not asked again at once; Dov, when his own wait is over, is asked next
    expect(askOpt(f.w, f.mira, f.eve)).toBeUndefined();
    f.mira.cooldowns['fetchask' + f.dov.id] = 0;
    expect(askOpt(f.w, f.mira, f.dov)).toBeTruthy();
    // and the walk to look, with nobody promised, is the ordinary one, exactly
    const a = visitOpt(f.w, f.mira, f.cora)!.make!()!;
    expect(a.data.fetch).toBeUndefined();
    expect(a.data.concern).toBe('missing');
  });

  it('when nobody agrees the worrier goes alone exactly as before: the same activity, with the part on and with it off', () => {
    const shape = (on: boolean) => {
      if (!on) setTogetherScenes(false, 'fetch');
      const f = scene({ tag: 'alone' });
      const a = visitOpt(f.w, f.mira, f.cora)!.make!()!;
      setTogetherScenes(true);
      return JSON.stringify([a.kind, a.label, a.goal, a.targetId, a.targetType, a.tx, a.ty, a.minCommit - f.w.tick, a.expire - f.w.tick, a.data]);
    };
    expect(shape(true)).toBe(shape(false));
  });
});

describe('the search: out, found, and home', () => {
  it('Mira and Dov walk out together, find Cora, and bring her home: the group stays within a few tiles of each other the whole way, and one line says so', () => {
    const f = scene({ tag: 'whole' });
    takeAsk(f);
    goOut(f);
    expect(searching(f.mira)).toBe(true);
    const gaps = walk(f, 1600, finished(f));
    const lines = searchLines(f.w);
    expect(lines.map((e) => e.text), JSON.stringify({ mira: [f.mira.x, f.mira.activity?.label], dov: [f.dov.x, f.dov.activity?.label], cora: [f.cora.x, f.cora.activity?.label], log: f.mira.log.slice(-4) })).toEqual(['Mira and Dov went out after dark and brought Cora home.']);
    expect(lines[0].kind).toBe('social');
    expect(lines[0].ids).toEqual([f.mira.id, f.dov.id, f.cora.id]);
    // together: the group really stayed within reach (a wolf will not pick one with two others within five tiles)
    expect(gaps.ticks).toBeGreaterThan(300);
    expect(gaps.dov, 'Dov stayed with her').toBeLessThanOrEqual(5);
    expect(gaps.cora, 'Cora stayed with her').toBeLessThanOrEqual(5);
    // home: Mira is within FETCH_HOME_NEAR of the camp, Dov and Cora beside her
    expect(Math.hypot(f.mira.x - 40, f.mira.y - 40)).toBeLessThanOrEqual(FETCH_HOME_NEAR + 1);
    expect(dist(f.dov, f.mira)).toBeLessThanOrEqual(6);
    expect(dist(f.cora, f.mira)).toBeLessThanOrEqual(6);
    // everybody's walk is over, and every promise is settled as kept
    expect([f.mira, f.dov, f.cora].some((p) => p.activity?.data.fetch || p.activity?.data.fetchWith || p.activity?.data.fetchedBy)).toBe(false);
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect([c.status, c.reason]).toEqual(['done', 'went with them to look']);
    expect(fetchReqs(f.w)[0].status).toBe('fulfilled');
    // what it did
    expect(f.cora.mood?.thoughts.some((t) => t.kind === 'fetched_home' && t.value > 0)).toBe(true);
    expect(f.cora.relations[f.mira.id].history.some((h) => /brought me home/.test(h.text))).toBe(true);
    expect(f.cora.log.some((l) => l.text === 'Mira and Dov came out after dark and brought me home.')).toBe(true);
    expect(f.mira.concerns.some((c2) => c2.about === f.cora.id)).toBe(false);
  });

  it('the inspector says what each is doing on the way: the worrier is out looking, the companion is going with her, the found one is walking home', () => {
    const f = scene({ tag: 'doing' });
    takeAsk(f);
    goOut(f);
    run(f.w, 30);
    expect(describePerson(f.w, f.mira.id)?.qa.doing).toMatch(/Going out after dark with Dov to look for Cora/);
    expect(describePerson(f.w, f.dov.id)?.qa.doing).toMatch(/Going with Mira to look for Cora/);
    walk(f, 900, () => f.cora.activity?.data.fetchedBy !== undefined);
    expect(describePerson(f.w, f.cora.id)?.qa.doing).toMatch(/Walking home with Mira/);
    expect(describePerson(f.w, f.mira.id)?.qa.doing).toMatch(/Bringing Cora home/);
  });

  it('the party sets out only where Mira last saw her, and Cora, who stood where she was, is found there', () => {
    const f = scene({ tag: 'place' });
    takeAsk(f);
    goOut(f);
    const a = f.mira.activity!;
    expect([a.tx, a.ty]).toEqual([62, 41]);
    expect(f.cora.activity).toBeNull();
    walk(f, 900, () => searching(f.mira) && f.mira.activity!.data.fetch.found !== undefined);
    expect(f.mira.activity!.data.fetch.found).toBeDefined();
    expect(dist(f.mira, f.cora)).toBeLessThanOrEqual(5.5);
    expect(f.mira.speech?.text).toMatch(/Cora/);
  });
});

describe('what comes of a search that does not find them, or whom they will not come with', () => {
  it('Cora is not at the place and cannot be seen: Mira looks round FETCH_LOOK ticks, turns back, and the line says they came back without her', () => {
    const f = scene({ tag: 'not-there', elsewhere: 30 });
    takeAsk(f);
    goOut(f);
    walk(f, 1800, () => searchLines(f.w).length > 0);
    expect(searchLines(f.w).map((e) => e.text)).toEqual(['Mira and Dov went out after dark looking for Cora and came back without them.']);
    expect(f.mira.log.some((l) => /Turned back from looking for Cora: they were not there\./.test(l.text))).toBe(true);
    expect(fetchReqs(f.w)[0].status, 'the promise is kept by having gone').toBe('fulfilled');
    expect(f.dov.commitments.find((x) => x.milestone === 'fetched')!.status).toBe('done');
    expect(f.cora.mood?.thoughts.some((t) => t.kind === 'fetched_home')).toBeFalsy();
    expect(FETCH_LOOK).toBeGreaterThan(0);
  });

  it('Cora is found but will not come (she has a critical need of her own): the walk is not offered to her, and they wait for her FETCH_WAIT_FOR_THEM ticks and come back without her', () => {
    const f = scene({ tag: 'will-not' });
    f.cora.needs.thirst = 5;
    takeAsk(f);
    goOut(f);
    walk(f, 1800, () => searchLines(f.w).length > 0);
    expect(searchLines(f.w).map((e) => e.text)).toEqual(['Mira and Dov went out after dark looking for Cora and came back without them.']);
    expect(f.mira.log.some((l) => /Turned back from looking for Cora: Cora would not come\./.test(l.text))).toBe(true);
    expect(f.cora.activity?.data.fetchedBy).toBeUndefined();
    expect(FETCH_WAIT_FOR_THEM + FETCH_GREET).toBeGreaterThan(0);
  });

  it('Cora comes home by herself first: nothing is written, the promise is let go without blame, and everybody goes about their own business', () => {
    const f = scene({ tag: 'by-herself' });
    takeAsk(f);
    goOut(f);
    run(f.w, 40);
    f.cora.cooldowns.pause = 0;
    f.cora.x = 42; f.cora.y = 41; // she is at the camp, in plain sight of the door
    // Mira, out on the walk, sees her at home only when she is in sight: bring the two within sight of each other
    f.mira.x = 42; f.mira.y = 39; f.dov.x = 41; f.dov.y = 40;
    refresh(f);
    run(f.w, 12);
    expect(searchLines(f.w)).toEqual([]);
    expect(searching(f.mira)).toBe(false);
    expect(f.dov.activity?.data.fetchWith).toBeUndefined();
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect([c.status, c.reason]).toEqual(['moot', 'was home already']);
    expect(fetchReqs(f.w)[0].status).toBe('cancelled');
    expect(f.mira.log.some((l) => /Cora was home already\./.test(l.text))).toBe(true);
  });

  it('the search is bounded: out FETCH_TICKS ticks, or more than FETCH_RANGE tiles from home, and the party turns for home with whoever it has', () => {
    const f = scene({ tag: 'bounds', far: 28 });
    takeAsk(f);
    goOut(f);
    run(f.w, 150);
    const d = f.mira.activity!.data.fetch;
    expect(d.phase).toBe('out');
    d.since = f.w.tick - FETCH_TICKS + 1;
    run(f.w, 8);
    expect(f.mira.activity!.data.fetch.phase, 'the time was up').toBe('back');
    expect(f.mira.log.some((l) => /Turned back from looking for Cora: it had gone on long enough\./.test(l.text))).toBe(true);
    expect(f.mira.activity!.label).toBe('Going home from looking for Cora');
    // the way home ends within FETCH_HOME_NEAR of the camp, with Dov beside her
    walk(f, 1200, () => searchLines(f.w).length > 0);
    expect(searchLines(f.w).map((e) => e.text)).toEqual(['Mira and Dov went out after dark looking for Cora and came back without them.']);
  });

  it('with no companion left beside her at the door, nothing is written to the feed', () => {
    const f = scene({ tag: 'no-companion', elsewhere: 30 });
    takeAsk(f);
    goOut(f);
    run(f.w, 60);
    // Dov is called away by a need of his own: he breaks off
    f.dov.needs.thirst = 5;
    walk(f, 1800, () => !searching(f.mira));
    expect(f.dov.activity?.data.fetchWith).toBeUndefined();
    expect(searchLines(f.w)).toEqual([]);
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect(['interrupted', 'moot']).toContain(c.status);
    expect(f.dov.log.some((l) => /Went with Mira to look for Cora, but/.test(l.text))).toBe(true);
  });
});

describe('nobody with a need is sent, and anybody may break off', () => {
  it('a companion who comes to need water on the way breaks off: his promise is put by without blame, and Mira goes on', () => {
    const f = scene({ tag: 'breaks-off' });
    takeAsk(f);
    goOut(f);
    run(f.w, 50);
    expect(f.dov.activity?.data.fetchWith).toBeDefined();
    f.dov.needs.thirst = 4;
    run(f.w, 60);
    expect(f.dov.activity?.data.fetchWith).toBeUndefined();
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect(c.status).toBe('interrupted');
    expect(fetchReqs(f.w)[0].status).toBe('interrupted');
    expect(searching(f.mira), 'she goes on, now alone').toBe(true);
    expect(f.mira.activity!.data.fetch.party).toEqual([]);
  });

  it('a promise made and never taken up (the worrier never set out) lapses after FETCH_PROMISE_LIFE ticks, with nobody to blame', () => {
    const f = scene({ tag: 'stale' });
    takeAsk(f);
    f.dov.cooldowns.pause = 1e12; // he never gets to it
    f.dov.activity = null;
    f.mira.cooldowns.pause = 1e12; // and she never sets out
    f.mira.activity = null;
    run(f.w, 920);
    const c = f.dov.commitments.find((x) => x.milestone === 'fetched')!;
    expect([c.status, c.reason]).toEqual(['moot', 'the search never set out']);
    expect(fetchReqs(f.w)[0].status).toBe('cancelled');
  });

  it('the companion is offered the walk only when he has no critical need and sees no danger: otherwise it is blocked, and says why', () => {
    const f = scene({ tag: 'blocked' });
    takeAsk(f);
    f.dov.activity = null;
    f.dov.needs.thirst = 5;
    refresh(f);
    const ctx = generateOptions(f.w, f.dov, true, true);
    expect(ctx.options.some((o) => o.key === `fetchwith:${f.mira.id}`)).toBe(false);
    expect(ctx.blocked.some((o) => (o.label ?? '').startsWith('Go with Mira'))).toBe(true);
    f.dov.needs.thirst = 95;
    refresh(f);
    expect(generateOptions(f.w, f.dov, true, true).options.some((o) => o.key === `fetchwith:${f.mira.id}`)).toBe(true);
  });
});

describe('save and load in the middle of a search continue identically', () => {
  const twin = (stop: (f: Fx) => boolean) => {
    const f = scene({ tag: 'save' });
    takeAsk(f);
    goOut(f);
    for (let i = 0; i < 1500 && !stop(f); i++) { stepWorld(f.w); if (f.mira.activity?.data.fetch?.found !== undefined) f.cora.cooldowns.pause = 0; }
    expect(stop(f)).toBe(true);
    const g = deserializeWorld(serializeWorld(f.w));
    expect(hashWorld(g)).toBe(hashWorld(f.w));
    return { f, g };
  };
  const carryOn = (f: Fx, g: World) => {
    const freeCora = (w: World) => { const c = w.persons.find((p) => p.name === 'Cora')!; const m = w.persons.find((p) => p.name === 'Mira')!; if (m.activity?.data.fetch?.found !== undefined) c.cooldowns.pause = 0; };
    for (let i = 0; i < 1200; i++) { stepWorld(f.w); stepWorld(g); freeCora(f.w); freeCora(g); if (hashWorld(g) !== hashWorld(f.w)) throw new Error('the worlds part company at step ' + i); }
    expect(g.events.filter((e) => / went out after dark /.test(e.text)).map((e) => e.text)).toEqual(f.w.events.filter((e) => / went out after dark /.test(e.text)).map((e) => e.text));
  };

  it('on the way out', () => {
    const { f, g } = twin((x) => searching(x.mira) && x.mira.x > 50 && x.mira.activity!.data.fetch.phase === 'out');
    expect(f.dov.activity?.data.fetchWith).toBeDefined();
    carryOn(f, g);
    expect(searchLines(f.w).length).toBe(1);
  });

  it('on the way home with her', () => {
    const { f, g } = twin((x) => searching(x.mira) && x.mira.activity!.data.fetch.phase === 'back' && x.cora.activity?.data.fetchedBy !== undefined && x.mira.x < 52);
    carryOn(f, g);
    expect(searchLines(f.w).map((e) => e.text)).toEqual(['Mira and Dov went out after dark and brought Cora home.']);
  });
});

describe('what a save may hold', () => {
  it('refuses a search that is not allowed or is out of range', () => {
    const f = scene({ tag: 'validate' });
    takeAsk(f);
    goOut(f);
    run(f.w, 10);
    expect(() => validateFetching(f.w)).not.toThrow();
    const a = f.mira.activity!;
    const good = JSON.parse(JSON.stringify(a.data.fetch));
    for (const bad of [{ ...good, for: 0 }, { ...good, since: f.w.tick + 5 }, { ...good, phase: 'sideways' }, { ...good, party: [1, 2] }, { ...good, party: [0] }, { ...good, fetched: true }, { ...good, done: false }, { ...good, home: { x: NaN, y: 1 } }, null]) {
      a.data.fetch = bad;
      expect(() => validateFetching(f.w), JSON.stringify(bad)).toThrow(/Invalid fetching/);
    }
    a.data.fetch = good;
    const v = f.dov.activity!.data.fetchWith;
    expect(v).toBeDefined();
    f.dov.activity!.data.fetchWith = { ...v, leader: 0 };
    expect(() => validateFetching(f.w)).toThrow(/Invalid fetching companion/);
    f.dov.activity!.data.fetchWith = v;
    expect(() => validateFetching(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 263;
    expect(() => validateFetching(f.w)).toThrow(/Invalid fetching/);
  });

  it('refuses a request of this kind, a promise of this milestone or a talk about it where the part is not allowed', () => {
    const f = scene({ tag: 'validate-kinds' });
    takeAsk(f);
    expect(() => validateFetching(f.w)).not.toThrow();
    f.w.settings.rulesVersion = 263;
    expect(() => validateFetching(f.w)).toThrow(/Invalid fetching (request|promise)/);
  });
});

describe('the lab arms', () => {
  it('rich-no-together-fetch removes the part alone, and puts it back', () => {
    const one = parseIntervention('rich-no-together-fetch');
    expect(one.summary).toMatch(/no effect below rules 264/);
    const restore = one.install!() as () => void;
    expect([togetherScenePartOn('side'), togetherScenePartOn('speech'), togetherScenePartOn('fetch')]).toEqual([true, true, false]);
    restore();
    expect(TOGETHER_SCENE_PARTS.map((q) => togetherScenePartOn(q))).toEqual([true, true, true]);
  });

  it('fetchTick does nothing with the part off', () => {
    const f = scene({ tag: 'tick-off' });
    setTogetherScenes(false, 'fetch');
    expect(() => fetchTick(f.w, f.mira)).not.toThrow();
    expect(FETCH_TOGETHER).toBe(3);
    expect(FETCH_ASK_WINDOW).toBeGreaterThan(0);
  });
});

// ───────────────────────── an ordinary world ─────────────────────────
describe('an ordinary world (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 264 for two days, the whole bundle on, and prints what happened', () => {
    // TOGETHER_SEED (default gen-4); TOGETHER_DAYS (default 2); TOGETHER_OFF=1: the whole bundle off; TOGETHER_REPORT=<file>: also append the line there
    const seed = process.env.TOGETHER_SEED ?? 'gen-4';
    const days = Number(process.env.TOGETHER_DAYS ?? 2);
    if (process.env.TOGETHER_OFF) setTogetherScenes(false);
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 264 });
    let lastEvent = 0, stood = 0, spoke = 0, spokeYes = 0, spokeAsked = 0, brought = 0, without = 0, argued = 0;
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        const sp = / spoke for a new .+; (\d+) of (\d+) said they would help\.$/.exec(e.text);
        if (/ stood up for .+ against /.test(e.text)) stood++;
        else if (sp) { spoke++; spokeYes += Number(sp[1]); spokeAsked += Number(sp[2]); }
        else if (/ went out after dark and brought .+ home\.$/.test(e.text)) brought++;
        else if (/ went out after dark looking for .+ and came back without them\.$/.test(e.text)) without++;
        else if (/ argued over /.test(e.text)) argued++;
      }
    };
    let searchTicks = 0, askMade = 0, darkSamples = 0, missingDark = 0, withAdultInSight = 0;
    const t0 = Date.now();
    while (w.tick < days * DAY) {
      stepWorld(w);
      if (w.tick % 5 === 0) for (const p of w.persons) if (p.activity?.data.fetch) searchTicks += 5;
      if (w.tick % 20 === 0) {
        scan();
        // where the cue gets to: grown people, in the dark or nearly, holding the worry that one of their own household is missing, and one with a grown person in sight to ask
        if (w.light < FETCH_DARK) {
          for (const p of w.persons) {
            if (!p.alive || ageYears(w, p) < 16) continue;
            darkSamples++;
            if (!p.concerns.some((c) => c.kind === 'missing' && w.byId.get(c.about)?.ent === 'person' && (w.byId.get(c.about) as Person).hhId === p.hhId)) continue;
            missingDark++;
            if (p.seen.some((x) => !x.child && x.id !== p.id)) withAdultInSight++;
          }
        }
      }
    }
    scan();
    for (const r of w.requests) if (r.kind === 'fetch') askMade++;
    const line = `together smoke: seed ${seed}, ${days} days, ${w.persons.filter((p) => p.alive).length} people, ${((Date.now() - t0) / 1000).toFixed(0)} s, arguments ${argued}, stood up for ${stood}, speeches ${spoke} (${spokeYes} of ${spokeAsked} said they would help), fetch asks ${askMade}, cue held in the dark by ${missingDark} of ${darkSamples} grown-person samples (${withAdultInSight} with a grown person in sight), search person-ticks ${searchTicks}, brought home ${brought}, came back without ${without}${process.env.TOGETHER_OFF ? ' (the whole bundle off)' : ''}`;
    console.log(line);
    if (process.env.TOGETHER_REPORT) appendFileSync(process.env.TOGETHER_REPORT, line + '\n');
    expect(w.persons.length).toBeGreaterThan(0);
  }, 400_000);
});
