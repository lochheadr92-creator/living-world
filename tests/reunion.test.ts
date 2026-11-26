// Rules 262 (bundle C, part 8): a reunion (src/sim/reunion.ts, the switch in src/sim/company_scenes.ts; the cue is noted in perception.ts, offered in
// options_social.ts, played in act_misc.ts). Every situation here is STAGED: it checks a rule, it is not an example of spontaneous behaviour. The last test runs an
// ordinary world for two days and PRINTS what happened; it asserts nothing about how much.
import { appendFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity } from '../src/sim/activities';
import { COMPANY_FROM, COMPANY_SCENE_PARTS, companyScenePartOn, hasReunion, setCompanyScenes } from '../src/sim/company_scenes';
import { DAY } from '../src/sim/constants';
import { generateOptions } from '../src/sim/decision';
import { dayFraction } from '../src/sim/environment';
import { createWorld } from '../src/sim/factory';
import { perceive } from '../src/sim/perception';
import { currentWorldSettings } from '../src/sim/profiles';
import { stageOf } from '../src/sim/people';
import { rebuildMobileGrid } from '../src/sim/registry';
import { relOf } from '../src/sim/relations';
import { GREETINGS, REPLIES, REUNION_AFFINITY, REUNION_BASE, REUNION_GAP, REUNION_HOLD, REUNION_HOME, REUNION_PARTNER, REUNION_PENDING, REUNION_REST, REUNION_STAND, daysApart, isReunion, validateReunion } from '../src/sim/reunion';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { createBuilding } from '../src/sim/buildings';
import type { Person, World } from '../src/sim/types';
import { makeWolf } from '../src/sim/wildlife';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { addPerson, done, learn, stage } from './helpers/kit';

afterEach(() => setCompanyScenes(true));

/** a tick of the second day at this fraction of the day (the day does not begin at tick 0: environment.ts dayFraction) */
const at = (frac: number): number => DAY + Math.round((((frac - dayFraction(0)) % 1) + 1) % 1 * DAY);
const NOON = at(0.45) + 3 * DAY; // late enough that a gap of several days is a sighting that was made

interface Opts {
  tag?: string;
  version?: number;
  /** how long since Ana's own last first-hand sighting of Ben (default 4000: more than a day and a half) */
  gap?: number;
  /** Ben stands this far from Ana (default 6) */
  apart?: number;
  /** what Ben is to Ana on her record: 'partner' (default), 'child', 'parent' or none */
  kin?: 'partner' | 'child' | 'parent' | 'none';
  /** Ana's household has a home (a hut) beside the camp; else there is none and the camp is the centre */
  home?: boolean;
  /** the pair stand this far from the camp (default none: at the camp) */
  away?: number;
  /** Ana's age (default 28) */
  anaAge?: number;
}

/** Ana (28) at the camp and Ben (30) in sight, Ana's record of when she last saw him as old as `gap`. Nobody decides anything but what a test sets going. */
function scene(o: Opts = {}) {
  const s = stage(`reunion-${o.tag ?? ''}`), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = o.version ?? 262;
  w.tick = NOON;
  const full = { hunger: 95, thirst: 95, energy: 80 };
  const dx = o.away ?? 0;
  const ana = addPerson(s, 'Ana', 40 + dx, 36, { age: o.anaAge ?? 28, sex: 'f', ...full });
  const ben = addPerson(s, 'Ben', 40 + dx + (o.apart ?? 6), 36, { age: 30, sex: 'm', ...full, hh: ana.hhId });
  const dov = addPerson(s, 'Dov', 46, 44, { age: 30, sex: 'm', ...full });
  w.camp = { x: 41, y: 36 };
  done(s);
  const kin = o.kin ?? 'partner';
  if (kin === 'partner') { ana.partnerId = ben.id; ben.partnerId = ana.id; }
  for (const [a, b] of [[ana, ben], [ben, ana]]) {
    const k = kin === 'none' ? undefined : kin === 'partner' ? 'partner' : (a === ana ? kin : kin === 'child' ? 'parent' : 'child');
    Object.assign(relOf(a, b.id), { affinity: 50, trust: 50, familiarity: 40, ...(k ? { kin: k } : {}) });
  }
  for (const p of [ana, ben, dov]) { p.chrono = 0; p.needs.warmth = 100; p.needs.safety = 100; p.nextThink = w.tick + 100000; }
  if (o.home) {
    const hut = createBuilding(w, 'hut', 38, 33, ana.hhId, { condition: 100 });
    const hh = w.households.find((h) => h.id === ana.hhId)!;
    hh.homeId = hut.id;
  }
  ana.whereabouts[ben.id] = { x: 20, y: 20, tick: w.tick - (o.gap ?? 4000) };
  rebuildMobileGrid(w);
  for (const p of [ana, ben, dov]) perceive(w, p);
  return { s, w, ana, ben, dov };
}
type Fx = ReturnType<typeof scene>;

const opt = (f: Fx, p: Person = f.ana, who: Person = f.ben) => generateOptions(f.w, p, true, true).options.find((x) => x.key === `reunion:${who.id}`);
const events = (w: World) => w.events.filter((e) => / ran to meet /.test(e.text));
const run = (w: World, ticks: number): void => { for (let i = 0; i < ticks; i++) stepWorld(w); };
/** Ana sets out on the run, as the decision does when it chooses the option; returns the ticks until her activity is over */
function setOut(f: Fx, p: Person = f.ana, who: Person = f.ben): void {
  const o = opt(f, p, who);
  expect(o, 'the run is offered').toBeTruthy();
  startActivity(f.w, p, o!.make!()!);
}
function runToEnd(f: Fx, p: Person = f.ana, max = 400): number {
  const t0 = f.w.tick;
  for (let i = 0; i < max && p.activity; i++) stepWorld(f.w);
  expect(p.activity, 'it ends').toBeNull();
  return f.w.tick - t0;
}

describe('rules 262 part 8 is registered', () => {
  it('has its switch, a lab arm of its own, and is a supported version', () => {
    expect(SUPPORTED_RULES_VERSIONS).toContain(262);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(262);
    expect(COMPANY_FROM).toBe(262);
    expect(parseIntervention('rich-no-company-reunion').summary).toMatch(/runs to meet/);
    const f = scene({ tag: 'arm' });
    expect(hasReunion(f.w)).toBe(true);
    const undo = parseIntervention('rich-no-company-reunion').install!();
    expect(COMPANY_SCENE_PARTS.map((p) => companyScenePartOn(p))).toEqual([true, true, false]);
    expect(hasReunion(f.w)).toBe(false);
    undo();
    expect(hasReunion(f.w)).toBe(true);
    expect(hasReunion(scene({ tag: 'old', version: 261 }).w)).toBe(false);
  });
});

describe('the gap in plain words', () => {
  it('is floored to the half day: a day and a half, two days, two and a half days, and so on', () => {
    expect(daysApart(REUNION_GAP + 1)).toBe('a day and a half');
    expect(daysApart(4799)).toBe('a day and a half');
    expect(daysApart(4800)).toBe('two days');
    expect(daysApart(6000)).toBe('two and a half days');
    expect(daysApart(7200)).toBe('three days');
    expect(daysApart(11 * DAY)).toBe('11 days');
  });
});

describe('the cue: noted in the sighting, only when everything holds', () => {
  it('Ana, who sees her partner Ben after 4,000 ticks, holds a cue with the real gap; her record of seeing him is now this tick (the old one was read first)', () => {
    const f = scene({ tag: 'cue' });
    expect(f.ana.reunion).toEqual({ with: f.ben.id, gap: 4000, at: f.w.tick });
    expect(f.ana.whereabouts[f.ben.id].tick).toBe(f.w.tick);
    expect(f.ana.whereabouts[f.ben.id].from).toBeUndefined();
  });

  it('a child and a parent are the same; a neighbour, or somebody with no record of kin, is not', () => {
    for (const kin of ['child', 'parent'] as const) expect(scene({ tag: 'kin-' + kin, kin }).ana.reunion?.with, kin).toBeTruthy();
    expect(scene({ tag: 'kin-none', kin: 'none' }).ana.reunion).toBeUndefined();
  });

  it('exactly a day and a half, or less, is no cue; a sighting that came by hearsay, or none before, is none', () => {
    expect(scene({ tag: 'gap-edge', gap: REUNION_GAP }).ana.reunion).toBeUndefined();
    expect(scene({ tag: 'gap-edge+1', gap: REUNION_GAP + 1 }).ana.reunion?.gap).toBe(REUNION_GAP + 1);
    expect(scene({ tag: 'gap-day', gap: DAY }).ana.reunion).toBeUndefined();
    // told where he was, not seen: "when I last SAW him" is not known
    const h = scene({ tag: 'hearsay' });
    delete h.ana.reunion;
    h.ana.whereabouts[h.ben.id] = { x: 20, y: 20, tick: h.w.tick - 9000, from: h.dov.id };
    h.w.tick += 3;
    perceive(h.w, h.ana);
    expect(h.ana.reunion).toBeUndefined();
    // never seen before
    const n = scene({ tag: 'never' });
    delete n.ana.reunion;
    delete n.ana.whereabouts[n.ben.id];
    n.w.tick += 3;
    perceive(n.w, n.ana);
    expect(n.ana.reunion).toBeUndefined();
  });

  it('nothing if either is asleep, if the pair have had a reunion in the last two days, with the part off, at rules 261, or in an authored world', () => {
    const redo = (f: Fx, change: () => void): Person | undefined => {
      delete f.ana.reunion;
      f.ana.whereabouts[f.ben.id] = { x: 20, y: 20, tick: f.w.tick - 4000 };
      change();
      f.w.tick += 3;
      perceive(f.w, f.ana);
      return f.ana.reunion ? f.ben : undefined;
    };
    expect(redo(scene({ tag: 'control' }), () => {})).toBeTruthy();
    const a = scene({ tag: 'a-asleep' });
    expect(redo(a, () => { a.ana.pose = 'sleep'; })).toBeUndefined();
    const b = scene({ tag: 'b-asleep' });
    expect(redo(b, () => { b.ben.pose = 'sleep'; })).toBeUndefined();
    const c = scene({ tag: 'rested' });
    expect(redo(c, () => { c.ana.cooldowns['reunion' + c.ben.id] = c.w.tick + REUNION_REST; })).toBeUndefined();
    const d = scene({ tag: 'part-off' });
    expect(redo(d, () => setCompanyScenes(false, 'reunion'))).toBeUndefined();
    setCompanyScenes(true);
    expect(redo(scene({ tag: 'old-rules', version: 261 }), () => {})).toBeUndefined();
    const e = scene({ tag: 'authored' });
    expect(redo(e, () => { e.w.settings.dynamics = 'authored'; })).toBeUndefined();
  });

  it('a cue is kept 150 ticks and then let go in silence; a fresh one for somebody else is not replaced', () => {
    const f = scene({ tag: 'lapse' });
    f.w.tick += REUNION_PENDING + 3;
    perceive(f.w, f.ana);
    expect(f.ana.reunion).toBeUndefined();
    expect(events(f.w)).toEqual([]);
    const g = scene({ tag: 'one-at-a-time', kin: 'partner' });
    const cue = { ...g.ana.reunion! };
    Object.assign(relOf(g.ana, g.dov.id), { kin: 'child' });
    g.ana.whereabouts[g.dov.id] = { x: 20, y: 20, tick: g.w.tick - 4000 };
    g.dov.x = 41; g.dov.y = 40;
    rebuildMobileGrid(g.w);
    g.w.tick += 3;
    perceive(g.w, g.ana);
    expect(g.ana.reunion, 'Ben, seen first and not yet gone, stays the cue').toMatchObject({ with: g.ben.id, at: cue.at });
  });
});

describe('the offer: a run to meet them, worth what it is, only when she is free, near home and can see them', () => {
  it('Ana is offered the run at the base and the partner, less the walk, in words that say why', () => {
    const f = scene({ tag: 'offer' });
    const o = opt(f)!;
    expect(o.label).toBe('Run to meet Ben');
    expect(o.parts.map(([n]) => n)).toEqual(['Ben is back after a day and a half', 'my partner', 'walking']);
    const walk = o.parts[2][1];
    expect(Math.abs(o.util - (REUNION_BASE + REUNION_PARTNER + walk))).toBeLessThan(0.1);
    expect(o.kind).toBe('wander');
    // a child is not a partner: the same without the four
    const c = scene({ tag: 'offer-child', kin: 'child' });
    expect(opt(c)!.parts.map(([n]) => n)).toEqual(['Ben is back after a day and a half', 'walking']);
  });

  it('near the home door (12 tiles) or, with no home, the camp; farther than that no run is offered', () => {
    expect(opt(scene({ tag: 'camp' }))).toBeTruthy();
    expect(opt(scene({ tag: 'home-near', home: true })), 'with a home beside the camp').toBeTruthy();
    const far = scene({ tag: 'far', away: REUNION_HOME + 8 });
    expect(far.ana.reunion).toBeTruthy();
    expect(opt(far), 'the camp is far behind them').toBeUndefined();
    const farHome = scene({ tag: 'far-home', home: true, away: REUNION_HOME + 8 });
    expect(opt(farHome), 'their home is far behind them').toBeUndefined();
  });

  it('none with a critical need, with danger in sight, with the other asleep or busy talking or out of sight, with Ana indoors or in a talk, or once the cue has lapsed; no cue, no option', () => {
    const control = scene({ tag: 'neg-control' });
    expect(opt(control)).toBeTruthy();
    const need = scene({ tag: 'neg-need' });
    need.ana.needs.thirst = 5;
    expect(opt(need), 'a critical need').toBeUndefined();
    const wolf = scene({ tag: 'neg-wolf' });
    makeWolf(wolf.w, 36, 36);
    rebuildMobileGrid(wolf.w);
    perceive(wolf.w, wolf.ana);
    expect(opt(wolf), 'danger in sight').toBeUndefined();
    const asleep = scene({ tag: 'neg-asleep' });
    asleep.ben.pose = 'sleep';
    perceive(asleep.w, asleep.ana);
    expect(opt(asleep), 'asleep').toBeUndefined();
    const talk = scene({ tag: 'neg-talk' });
    talk.ben.convId = 99;
    perceive(talk.w, talk.ana);
    expect(opt(talk), 'busy talking').toBeUndefined();
    const gone = scene({ tag: 'neg-gone' });
    gone.ben.x = 70; gone.ben.y = 70;
    rebuildMobileGrid(gone.w);
    perceive(gone.w, gone.ana);
    expect(opt(gone), 'out of sight').toBeUndefined();
    const lapsed = scene({ tag: 'neg-lapsed' });
    lapsed.w.tick += REUNION_PENDING + 5;
    expect(opt(lapsed), 'a cue gone stale').toBeUndefined();
    const talking = scene({ tag: 'neg-convo' });
    talking.ana.convId = 5;
    expect(opt(talking), 'Ana is in a talk').toBeUndefined();
    const noCue = scene({ tag: 'neg-nocue', gap: 1000 });
    expect(noCue.ana.reunion).toBeUndefined();
    expect(opt(noCue)).toBeUndefined();
    const held = scene({ tag: 'neg-held' });
    held.ana.cooldowns['reunion' + held.ben.id] = held.w.tick + 100;
    expect(opt(held), 'the pair rest').toBeUndefined();
  });

  it('is not offered at rules 261 or with the part off', () => {
    const f = scene({ tag: 'off' });
    setCompanyScenes(false, 'reunion');
    expect(opt(f)).toBeUndefined();
  });
});

describe('the scene: a run, a meeting, a wave, a line each, one line in the feed', () => {
  it('Ana runs to Ben and they meet: the line with the real gap, the wave and the words of each, fonder both ways, glad, the pair rest, the cue used up', () => {
    const f = scene({ tag: 'scene' });
    const { w, ana, ben } = f;
    const aff = (x: Person, y: Person) => relOf(x, y.id).affinity;
    const before = { ab: aff(ana, ben), ba: aff(ben, ana) };
    setOut(f);
    expect(isReunion(ana.activity!)).toBe(true);
    expect(ana.activity!.data.run).toBe(true);
    expect(ana.activity!.label).toBe('Running to meet Ben');
    expect(ana.reunion, 'the cue is used').toBeUndefined();
    for (let i = 0; i < 20; i++) stepWorld(w);
    expect(ana.pose, 'running').toBe('run');
    const ticks = runToEnd(f);
    expect(events(w).map((e) => e.text)).toEqual(['Ana ran to meet Ben, back after a day and a half.']);
    expect(events(w)[0].kind).toBe('social');
    expect(events(w)[0].ids).toEqual([ana.id, ben.id]);
    expect(ana.wave).toBeGreaterThan(w.tick - 60);
    expect(GREETINGS).toContain(ana.speech?.text);
    expect(REPLIES).toContain(ben.speech?.text);
    // a passing greeting may add its few tenths to either side on the way; the reunion's own is at least this
    for (const [d, who] of [[aff(ana, ben) - before.ab, 'Ana'], [aff(ben, ana) - before.ba, 'Ben']] as [number, string][]) {
      expect(d, who).toBeGreaterThanOrEqual(REUNION_AFFINITY - 1e-9);
      expect(d, who).toBeLessThan(REUNION_AFFINITY + 0.7);
    }
    for (const x of [ana, ben]) expect(x.mood?.thoughts.some((t) => t.kind === 'reunion'), x.name).toBe(true);
    expect((ana.cooldowns['reunion' + ben.id] ?? 0) - w.tick).toBeGreaterThan(REUNION_REST - 200);
    expect((ben.cooldowns['reunion' + ana.id] ?? 0) - w.tick).toBeGreaterThan(REUNION_REST - 200);
    // about a hundred ticks in all, then both carry on
    expect(ticks).toBeGreaterThan(REUNION_STAND);
    expect(ticks).toBeLessThan(160);
    expect(ana.lastResult?.outcome).toBe('success');
    expect(ana.log.some((l) => /^Ran to meet Ben, back after a day and a half\.$/.test(l.text))).toBe(true);
    expect(ben.log.some((l) => /^Ana ran to meet me after a day and a half apart\.$/.test(l.text))).toBe(true);
  });

  it('a child runs to a parent: "C ran to meet A, back after two days"', () => {
    // Ana is seven and sees her father Ben, whom she has not seen for 5,000 ticks
    const g = scene({ tag: 'child', kin: 'parent', gap: 5000, anaAge: 7 });
    expect(stageOf(g.w, g.ana)).toBe('child');
    setOut(g);
    runToEnd(g);
    expect(events(g.w).map((e) => e.text)).toEqual(['Ana ran to meet Ben, back after two days.']);
  });

  it('the other is not stopped: Ben goes on with what he was doing', () => {
    const f = scene({ tag: 'carry-on' });
    setOut(f);
    f.ben.activity = null;
    runToEnd(f);
    expect(f.ben.activity).toBeNull();
    expect(f.ben.pose).not.toBe('sleep');
  });
});

describe('when it does not come to a meeting: nothing is written', () => {
  const nothing = (f: Fx): void => {
    expect(events(f.w)).toEqual([]);
    expect(f.ana.log.some((l) => /ran to meet/i.test(l.text))).toBe(false);
    expect(f.ben.log.some((l) => /ran to meet/i.test(l.text))).toBe(false);
    expect(f.ana.relations[f.ben.id].affinity).toBe(50);
    expect(f.ana.mood?.thoughts.some((t) => t.kind === 'reunion') ?? false).toBe(false);
  };

  it('he goes out of sight before she gets there', () => {
    const f = scene({ tag: 'leaves' });
    setOut(f);
    run(f.w, 4);
    f.ben.x = 75; f.ben.y = 72;
    rebuildMobileGrid(f.w);
    runToEnd(f, f.ana, 600);
    nothing(f);
    expect(f.ana.lastResult?.outcome).toBe('failed');
  });

  it('he is asleep when she gets there', () => {
    const f = scene({ tag: 'sleeps' });
    setOut(f);
    f.ben.pose = 'sleep';
    runToEnd(f);
    nothing(f);
  });

  it('he has gone indoors', () => {
    const f = scene({ tag: 'indoors', home: true });
    setOut(f);
    f.ben.indoors = f.w.buildings.find((b) => b.type === 'hut')!.id;
    runToEnd(f);
    nothing(f);
  });

  it('he is dead', () => {
    const f = scene({ tag: 'dead' });
    setOut(f);
    f.ben.alive = false;
    runToEnd(f);
    expect(events(f.w)).toEqual([]);
  });
});

describe('the caps: once for a pair every two days; and only one of two runs', () => {
  it('after a reunion the same pair have another cue only when two days have gone, however long since they were seen', () => {
    const f = scene({ tag: 'cap' });
    setOut(f);
    runToEnd(f);
    expect(events(f.w)).toHaveLength(1);
    // a day later, "seen" long ago again (her record was made old, as if they had been apart)
    f.w.tick += DAY;
    delete f.ana.reunion;
    f.ana.whereabouts[f.ben.id] = { x: 20, y: 20, tick: f.w.tick - 4000 };
    perceive(f.w, f.ana);
    expect(f.ana.reunion, 'a day is not two').toBeUndefined();
    f.w.tick += DAY + 5;
    f.ana.whereabouts[f.ben.id] = { x: 20, y: 20, tick: f.w.tick - 4000 };
    perceive(f.w, f.ana);
    expect(f.ana.reunion, 'two days have gone').toBeTruthy();
  });

  it('both have seen each other after a long time and both hold a cue; one sets out, the other does not, and there is one scene', () => {
    const f = scene({ tag: 'mirror' });
    f.ben.whereabouts[f.ana.id] = { x: 20, y: 20, tick: f.w.tick - 5000 };
    f.w.tick += 3;
    perceive(f.w, f.ben);
    expect(f.ben.reunion?.with).toBe(f.ana.id);
    expect(f.ana.reunion?.with).toBe(f.ben.id);
    setOut(f, f.ana, f.ben);
    expect(f.ben.reunion, 'his cue is gone').toBeUndefined();
    expect(opt(f, f.ben, f.ana), 'and he does not run to her too').toBeUndefined();
    expect((f.ben.cooldowns['reunion' + f.ana.id] ?? 0) - f.w.tick).toBeGreaterThan(REUNION_HOLD - 5);
    runToEnd(f);
    expect(events(f.w)).toHaveLength(1);
  });
});

describe('the part off: the world is as it was', () => {
  it('with the part off the same afternoon has no cue, no run, no line; the shared stream stands where it does with the run', () => {
    const go = (version: number, off: boolean) => {
      setCompanyScenes(!off, 'reunion');
      const f = scene({ tag: 'twin', version });
      if (!off && version === 262) setOut(f);
      run(f.w, 120);
      const out = { ev: events(f.w).length, cue: f.ana.reunion, rng: [f.w.rng.a, f.w.rng.b, f.w.rng.c, f.w.rng.d], rel: f.ana.relations[f.ben.id].affinity };
      setCompanyScenes(true);
      return out;
    };
    const on = go(262, false), off = go(262, true), old = go(261, false);
    expect(on.ev).toBe(1);
    expect([off.ev, old.ev]).toEqual([0, 0]);
    expect([off.cue, old.cue]).toEqual([undefined, undefined]);
    expect(off.rng, 'rules 261 and the part off draw the same').toEqual(old.rng);
    expect(on.rng, 'the run draws nothing from the shared stream').toEqual(off.rng);
    expect(off.rel).toBe(old.rel);
    expect(on.rel).toBeGreaterThan(off.rel);
  });
});

describe('save, load, continue, and the saved state', () => {
  it('a world saved while the cue is held, and one saved mid-run, each continue exactly', () => {
    const f = scene({ tag: 'save-cue' });
    const copy = deserializeWorld(serializeWorld(f.w));
    expect(copy.persons.find((p) => p.id === f.ana.id)!.reunion).toEqual(f.ana.reunion);
    for (let i = 0; i < 60; i++) { stepWorld(f.w); stepWorld(copy); }
    expect(serializeWorld(copy)).toBe(serializeWorld(f.w));
    const g = scene({ tag: 'save-run' });
    setOut(g);
    run(g.w, 15);
    const mid = deserializeWorld(serializeWorld(g.w));
    for (let i = 0; i < 300; i++) { stepWorld(g.w); stepWorld(mid); }
    expect(events(mid).map((e) => e.text)).toEqual(events(g.w).map((e) => e.text));
    expect(events(g.w)).toHaveLength(1);
    expect(serializeWorld(mid)).toBe(serializeWorld(g.w));
    expect(hashWorld(mid)).toBe(hashWorld(g.w));
  });

  it('the cue and the scene are in the world fingerprint', () => {
    const f = scene({ tag: 'hash' });
    const h0 = hashWorld(f.w);
    f.ana.reunion = { ...f.ana.reunion!, gap: f.ana.reunion!.gap + 1 };
    expect(hashWorld(f.w)).not.toBe(h0);
    const g = scene({ tag: 'hash2' });
    const h1 = hashWorld(g.w);
    setOut(g);
    expect(hashWorld(g.w)).not.toBe(h1);
  });

  it('a save with a cue or a scene that cannot be is refused on loading', () => {
    const f = scene({ tag: 'refuse' });
    expect(() => validateReunion(f.w)).not.toThrow();
    const good = { ...f.ana.reunion! };
    for (const bad of [{ ...good, gap: REUNION_GAP }, { ...good, gap: 4000.5 }, { ...good, at: f.w.tick + 1 }, { ...good, at: f.w.tick - 400 }, { ...good, with: 0 }]) {
      f.ana.reunion = bad;
      expect(() => validateReunion(f.w), JSON.stringify(bad)).toThrow(/reunion/i);
    }
    f.ana.reunion = good;
    f.w.settings.rulesVersion = 261;
    expect(() => validateReunion(f.w), 'a cue in a world of rules 261').toThrow(/reunion/i);
    f.w.settings.rulesVersion = 262;
    delete f.ana.reunion;
    setOut(scene({ tag: 'refuse-run' }));
    const g = scene({ tag: 'refuse-act' });
    setOut(g);
    const k = g.ana.activity!.data.reunion;
    expect(() => validateReunion(g.w)).not.toThrow();
    k.since = g.w.tick + 9;
    expect(() => validateReunion(g.w)).toThrow(/reunion/i);
    k.since = g.w.tick;
    k.gap = 10;
    expect(() => validateReunion(g.w)).toThrow(/reunion/i);
  });
});

// ───────────────────────── an ordinary world ─────────────────────────
describe('an ordinary world (reported, nothing asserted about how much)', () => {
  it('runs a Normal seed with arrivals on at rules 262 for two days, the whole bundle on, and prints what happened', () => {
    // COMPANY_SEED (default gen-4); COMPANY_DAYS (default 2); COMPANY_OFF=1: the whole bundle off; COMPANY_REPORT=<file>: also append the line there
    const seed = process.env.COMPANY_SEED ?? 'gen-4';
    const days = Number(process.env.COMPANY_DAYS ?? 2);
    if (process.env.COMPANY_OFF) setCompanyScenes(false);
    const w = createWorld({ ...currentWorldSettings('normal', seed, { immigration: true }), rulesVersion: 262 });
    let lastEvent = 0, songs = 0, joined = 0, dances = 0, reunions = 0;
    const gaps: string[] = [];
    const scan = () => {
      for (const e of w.events) {
        if (e.id <= lastEvent) continue;
        lastEvent = e.id;
        const s = /^\S+ started a song at the fire and (\d+) joined in\.$/.exec(e.text);
        if (s) { songs++; joined += Number(s[1]); }
        else if (/^People danced at the /.test(e.text)) dances++;
        else if (/ ran to meet .+, back after /.test(e.text)) { reunions++; gaps.push(e.text.replace(/^.* back after /, '').replace(/\.$/, '')); }
      }
    };
    let danceTicks = 0, danceMax = 0, cues = 0;
    const t0 = Date.now();
    while (w.tick < days * DAY) {
      stepWorld(w);
      if (w.tick % 5 === 0) {
        let now = 0;
        for (const p of w.persons) if (p.activity?.data.dance && !p.activity.data.dance.done) now++;
        if (now) { danceTicks += 5; danceMax = Math.max(danceMax, now); }
      }
      if (w.tick % 20 === 0) scan();
    }
    scan();
    for (const p of w.persons) if (p.reunion) cues++;
    const line = `company smoke: seed ${seed}, ${days} days, ${w.persons.filter((p) => p.alive).length} people, ${((Date.now() - t0) / 1000).toFixed(0)} s, songs ${songs} (joined ${joined}), dances ${dances} (most dancing at once ${danceMax}, ${danceTicks} ticks with somebody dancing), reunions ${reunions} (${gaps.join('; ')}), cues held at the end ${cues}${process.env.COMPANY_OFF ? ' [bundle off]' : ''}`;
    console.log(line);
    if (process.env.COMPANY_REPORT) appendFileSync(process.env.COMPANY_REPORT, line + '\n');
    expect(w.persons.length).toBeGreaterThan(0);
  }, 400_000);
});
