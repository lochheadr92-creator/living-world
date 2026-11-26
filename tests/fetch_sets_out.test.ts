// Rules 278 (src/sim/fetch_home.ts joinParty and setsOutScore, the switch `fetchSetsOutOn`, lab arm `rich-no-fetch-sets-out`): once somebody has promised to come and look for a
// missing household member after dark, the worrier's own walk to look is offered at the companion's level (FETCH_JOIN_SCORE less the walk) instead of the ordinary visit's worth, so a
// tired worrier sets out instead of going to bed. Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour.
//
// The scene is the one of tests/fetch_home.test.ts with two changes: Mira is worn down and past her bedtime, with a hut of her household's own to sleep in, so that sleep is on offer
// for her at a worth over the ordinary walk to look (the defect measured in nine ordinary worlds: the walk at 26 to 29, sleep at 35 to 51), and she takes the real decision.
import { afterEach, describe, expect, it } from 'vitest';
import { startActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { dayFraction, updateEnvironment } from '../src/sim/environment';
import { FETCH_JOIN_SCORE, FETCH_SETS_OUT_FROM, companionsFor, fetchSetsOutOn, hasFetchSetsOut, setFetchSetsOut } from '../src/sim/fetch_home';
import { perceive } from '../src/sim/perception';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { setTogetherScenes } from '../src/sim/together_scenes';
import type { Person, Request, World } from '../src/sim/types';
import { stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, building, done, learn, pin, stage } from './helpers/kit';

afterEach(() => { setTogetherScenes(true); setFetchSetsOut(true); });

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const DUSK = at(0.8);

interface Opts { tag: string; version?: number; energy?: number; thirst?: number; /** how far east of the camp Mira last saw Cora (and Cora is) */ far?: number; }

/**
 * Mira (30) and her daughter Cora (6), of one household. The camp is at (40,40) and so is their hut. It is dark and past Mira's bedtime and she is worn down (energy 60 unless said).
 * Mira last saw Cora, by her own record, 14 tiles east (`far`) more than 1,100 ticks ago, and holds the worry that she is missing. Cora is there, standing still. Dov (35) is a neighbour
 * who stands by the camp and thinks well of her. Everybody carries food, wood, stone and water. Only Mira decides anything, when a test says so.
 */
function scene(o: Opts) {
  const s = stage(`fetch-sets-out-${o.version ?? CURRENT_RULES_VERSION}-${o.tag}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 278;
  w.tick = DUSK;
  updateEnvironment(w);
  w.camp = { x: 40, y: 40 };
  const base = { hunger: 95, thirst: o.thirst ?? 95, energy: o.energy ?? 60, inv: { berries: 6, wood: 4, stone: 3, water: 2 } };
  const mira = addPerson(s, 'Mira', 40, 40, { age: 30, sex: 'f', ...base, traits: { generosity: 0.7, sociability: 0.6, caution: 0.3 } });
  const far = o.far ?? 14;
  const cora = addPerson(s, 'Cora', 40 + far, 41, { age: 6, sex: 'f', ...base, energy: 100, thirst: 95, hh: mira.hhId });
  const dov = addPerson(s, 'Dov', 42, 41.5, { age: 35, sex: 'm', ...base, energy: 90, thirst: 95, traits: { generosity: 0.9, diligence: 0.8, sociability: 0.7, caution: 0.3 } });
  const hut = building(s, 'hut', 38, 38, mira.hhId);
  done(s);
  learn(w, mira, hut);
  Object.assign(relOf(mira, cora.id), { kin: 'child', affinity: 90, trust: 80, familiarity: 60 });
  Object.assign(relOf(cora, mira.id), { kin: 'parent', affinity: 90, trust: 80, familiarity: 60 });
  for (const [a, b, aff] of [[mira, dov, 20], [dov, mira, 20]] as [Person, Person, number][]) Object.assign(relOf(a, b.id), { affinity: aff, trust: 40, familiarity: 40 });
  for (const p of [mira, cora, dov]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; p.nextThink = w.tick + 100000; }
  mira.chrono = -0.12; // her bedtime is a little before the dusk it is (0.68 of the day), so that she is past it
  pin(cora);
  mira.whereabouts[cora.id] = { x: 40 + far, y: 41, tick: w.tick - 1150 };
  mira.concerns.push({ about: cora.id, kind: 'missing', seen: w.tick - 600, src: 'seen', from: mira.id, checked: -99999 });
  rebuildMobileGrid(w);
  for (const p of [mira, cora, dov]) perceive(w, p);
  return { s, w, mira, cora, dov, hut };
}
type Fx = ReturnType<typeof scene>;

const options = (w: World, p: Person) => generateOptions(w, p, true, true).options;
const askOpt = (w: World, p: Person, q: Person) => options(w, p).find((o) => o.key === `socialize:${q.id}:request:fetch`);
const visitOpt = (w: World, p: Person, about: Person) => options(w, p).find((o) => o.key === `visit:${about.id}`);
const sleepOpt = (w: World, p: Person) => options(w, p).find((o) => o.kind === 'sleep');
const fetchReqs = (w: World): Request[] => w.requests.filter((r) => r.kind === 'fetch');
const searching = (p: Person): boolean => p.activity?.data.fetch !== undefined;
const searchLines = (w: World) => w.events.filter((e) => / went out after dark /.test(e.text));
const rankedKeys = (w: World, p: Person): string[] => rankOptions(generateOptions(w, p, true, true)).map((o) => o.key);

/** Mira takes the ask to Dov and the talk is held; Dov promises (his own answer); she is left standing when it is over */
function takeAsk(f: Fx): void {
  const o = askOpt(f.w, f.mira, f.dov);
  expect(o, 'the ask is offered').toBeTruthy();
  startActivity(f.w, f.mira, o!.make!()!);
  for (let i = 0; i < 600; i++) {
    stepWorld(f.w);
    const r = fetchReqs(f.w).find((x) => x.to === f.dov.id && x.status !== 'pending');
    if (r && !f.mira.convId && !f.mira.activity) return;
  }
  throw new Error('the ask was never answered');
}
/** Mira takes the real decision, now: what the world makes her do next */
function decide(f: Fx): void {
  f.mira.nextThink = f.w.tick;
  stepWorld(f.w);
}
const doing = (p: Person): string => `${p.activity?.kind ?? 'nothing'}: ${p.activity?.label ?? ''}`;

describe('rules 278 is registered, with its own switch', () => {
  it('is supported, and hasFetchSetsOut follows the version, the fetch part and its own switch', () => {
    expect(FETCH_SETS_OUT_FROM).toBe(278);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(278);
    const now = scene({ tag: 'reg-now' }).w, old = scene({ tag: 'reg-old', version: 277 }).w, older = scene({ tag: 'reg-older', version: 263 }).w;
    expect([hasFetchSetsOut(now), hasFetchSetsOut(old), hasFetchSetsOut(older)]).toEqual([true, false, false]);
    setFetchSetsOut(false);
    expect([fetchSetsOutOn(), hasFetchSetsOut(now)]).toEqual([false, false]);
    setFetchSetsOut(true);
    setTogetherScenes(false, 'fetch');
    expect(hasFetchSetsOut(now), 'the fetch part off takes it with it').toBe(false);
    setTogetherScenes(true);
    const au = scene({ tag: 'reg-au' }).w;
    au.settings.dynamics = 'authored';
    expect(hasFetchSetsOut(au), 'authored worlds are not touched').toBe(false);
  });
});

describe('with a promise made, the worrier sets out instead of going to bed', () => {
  it('before the ask, nothing is raised: the walk to look is the ordinary visit, under sleep, and the ask is on offer', () => {
    const f = scene({ tag: 'before' });
    const v = visitOpt(f.w, f.mira, f.cora)!, sl = sleepOpt(f.w, f.mira)!;
    expect(v && sl && askOpt(f.w, f.mira, f.dov), 'visit, sleep and the ask are all on offer').toBeTruthy();
    expect(companionsFor(f.w, f.mira, f.cora.id).length).toBe(0);
    expect(v.util, `the ordinary walk (${v.util.toFixed(1)}) is under sleep (${sl.util.toFixed(1)})`).toBeLessThan(sl.util);
    expect(v.util).toBeLessThan(FETCH_JOIN_SCORE - 20);
    expect(v.parts.map(([n]) => n)).not.toContain('Dov has promised to come and look for Cora with me');
  });

  it('(a) at 278, with Dov promised and a tired body, Mira takes the walk at the companion\'s level, over sleep, and sets out with him', () => {
    const f = scene({ tag: 'a' });
    takeAsk(f);
    expect(companionsFor(f.w, f.mira, f.cora.id).map((q) => q.name)).toEqual(['Dov']);
    const v = visitOpt(f.w, f.mira, f.cora)!, sl = sleepOpt(f.w, f.mira)!;
    expect(sl, 'sleep is still on offer, as before').toBeTruthy();
    expect(v.parts.map(([n]) => n)).toEqual(['Dov has promised to come and look for Cora with me', 'walking']);
    expect(v.parts[0][1]).toBe(FETCH_JOIN_SCORE);
    expect(v.parts[1][1]).toBeLessThan(0);
    expect(Math.abs(v.util - (FETCH_JOIN_SCORE + v.parts[1][1]))).toBeLessThan(0.1);
    expect(v.util, `the walk (${v.util.toFixed(1)}) is over sleep (${sl.util.toFixed(1)})`).toBeGreaterThan(sl.util);
    expect(rankedKeys(f.w, f.mira)[0]).toBe(`visit:${f.cora.id}`);
    // the real decision
    decide(f);
    expect(searching(f.mira), doing(f.mira)).toBe(true);
    expect(f.mira.activity!.data.fetch).toMatchObject({ for: f.cora.id, party: [f.dov.id], phase: 'out' });
    expect(f.mira.activity!.label).toBe('Going out after dark with Dov to look for Cora');
    expect(f.mira.activity!.utility, 'the activity carries the worth it was chosen at').toBeCloseTo(v.util, 5);
    expect(f.mira.activity!.kind).not.toBe('sleep');
  });

  it('(a) and the whole of it comes to something: Dov goes with her, they find Cora and bring her home, and the feed says so', () => {
    const f = scene({ tag: 'a-whole' });
    takeAsk(f);
    decide(f);
    expect(searching(f.mira), doing(f.mira)).toBe(true);
    let dovWith = false;
    for (let i = 0; i < 1800 && searchLines(f.w).length === 0; i++) {
      stepWorld(f.w);
      const d = f.mira.activity?.data.fetch;
      if (d?.found !== undefined) f.cora.cooldowns.pause = 0; // Cora, who stood where she was until she is found, is free once she is
      if (f.dov.activity?.data.fetchWith) dovWith = true;
    }
    expect(dovWith, 'Dov set out on the search').toBe(true);
    expect(searchLines(f.w).map((e) => e.text), JSON.stringify({ mira: [f.mira.x, doing(f.mira)], dov: [f.dov.x, doing(f.dov)], cora: [f.cora.x, doing(f.cora)] })).toEqual(['Mira and Dov went out after dark and brought Cora home.']);
    expect(f.dov.commitments.find((c) => c.milestone === 'fetched')!.status).toBe('done');
    expect(fetchReqs(f.w)[0].status).toBe('fulfilled');
  }, 120_000);

  it('(b) the same scene with the world held at rules 277 behaves as before: the ordinary walk stays under sleep, and she goes to bed', () => {
    const f = scene({ tag: 'b', version: 277 });
    takeAsk(f);
    expect(companionsFor(f.w, f.mira, f.cora.id).length, 'the promise is made at 277 too').toBe(1);
    const v = visitOpt(f.w, f.mira, f.cora)!, sl = sleepOpt(f.w, f.mira)!;
    expect(v.parts[0][0]).toBe('has not seen Cora for a while');
    expect(v.parts.some(([n]) => /promised to come/.test(n))).toBe(false);
    expect(v.util).toBeLessThan(sl.util);
    expect(rankedKeys(f.w, f.mira)[0]).toBe(sl.key);
    decide(f);
    expect(searching(f.mira), doing(f.mira)).toBe(false);
    expect(f.mira.activity?.kind, doing(f.mira)).toBe('sleep');
  });

  it('(c) the same scene at 278 with the switch off behaves as before: the walk stays at its ordinary worth, and she goes to bed', () => {
    const f = scene({ tag: 'c' });
    setFetchSetsOut(false);
    takeAsk(f);
    const v = visitOpt(f.w, f.mira, f.cora)!, sl = sleepOpt(f.w, f.mira)!;
    expect(v.parts.some(([n]) => /promised to come/.test(n))).toBe(false);
    expect(v.util).toBeLessThan(sl.util);
    decide(f);
    expect(searching(f.mira), doing(f.mira)).toBe(false);
    expect(f.mira.activity?.kind, doing(f.mira)).toBe('sleep');
  });

  it('the arm rich-no-fetch-sets-out takes the switch off, and puts it back', () => {
    const arm = parseIntervention('rich-no-fetch-sets-out');
    expect(arm.summary).toMatch(/no effect below rules 278/);
    expect(fetchSetsOutOn()).toBe(true);
    const restore = arm.install!() as () => void;
    expect(fetchSetsOutOn()).toBe(false);
    restore();
    expect(fetchSetsOutOn()).toBe(true);
  });

  it('(b, c) with the version held at 277 or the switch off, the option and the activity are the same bytes as at 278 with no promise at all', () => {
    // nothing is promised: the worth, its reasons and the activity made are the ordinary ones at every version and with the switch either way
    const shape = (version: number, on: boolean) => {
      setFetchSetsOut(on);
      const f = scene({ tag: 'none', version });
      const v = visitOpt(f.w, f.mira, f.cora)!, a = v.make!()!;
      setFetchSetsOut(true);
      return JSON.stringify([v.util, v.parts, v.eta, v.label, a.kind, a.label, a.goal, a.utility, a.minCommit - f.w.tick, a.expire - f.w.tick, a.data]);
    };
    const ref = shape(277, true);
    expect(shape(278, true)).toBe(ref);
    expect(shape(278, false)).toBe(ref);
  });

  it('(d) with a critical need Mira does not go: no walk to look is offered at all, whatever is promised, and she drinks first; at 277 the same', () => {
    for (const version of [278, 277]) {
      const f = scene({ tag: `d-${version}`, version });
      takeAsk(f);
      f.mira.needs.thirst = 5;
      f.mira.inv.water = 0;
      rebuildMobileGrid(f.w);
      perceive(f.w, f.mira);
      expect(companionsFor(f.w, f.mira, f.cora.id).length, 'the promise stands').toBe(1);
      expect(visitOpt(f.w, f.mira, f.cora), `no walk to look is on offer (${version})`).toBeUndefined();
      decide(f);
      expect(searching(f.mira), `${version}: ${doing(f.mira)}`).toBe(false);
      expect(f.mira.activity?.kind, `${version}: ${doing(f.mira)}`).not.toBe('sleep');
    }
  });

  it('(d) with a danger believed about, Mira does not go either, and the companion\'s own walk is blocked for the same reason', () => {
    const f = scene({ tag: 'd-danger' });
    takeAsk(f);
    f.mira.beliefs[777777] = { id: 777777, kind: 'danger', x: 45, y: 36, amount: 1, seen: f.w.tick, hh: 0 } as never;
    f.mira.bykind.danger = [777777];
    expect(visitOpt(f.w, f.mira, f.cora)?.parts.some(([n]) => /promised to come/.test(n)) ?? false).toBe(false);
    decide(f);
    expect(searching(f.mira), doing(f.mira)).toBe(false);
  });

  it('a promise that has gone (Dov is out of reach, or his promise is let go) is no promise: the walk is the ordinary one again', () => {
    const f = scene({ tag: 'gone' });
    takeAsk(f);
    expect(visitOpt(f.w, f.mira, f.cora)!.parts[0][0]).toMatch(/promised to come/);
    f.dov.x = 60; f.dov.y = 60; // more than FETCH_JOIN_NEAR away
    rebuildMobileGrid(f.w);
    for (const p of [f.mira, f.dov]) perceive(f.w, p);
    expect(companionsFor(f.w, f.mira, f.cora.id).length).toBe(0);
    expect(visitOpt(f.w, f.mira, f.cora)!.parts.some(([n]) => /promised to come/.test(n))).toBe(false);
  });
});
