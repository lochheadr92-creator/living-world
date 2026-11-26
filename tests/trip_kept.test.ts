// Rules 265 (src/sim/trip_kept.ts): a trip under way is not dropped by a start gate or a workshop swap. STAGED: one grown woman on a flat map
// with the lake along the north edge, the shore she knows, a hut site, and a far tree, store or second bakery. The starting choice is made
// through the outside-controller seam (as tests/kept_target.test.ts does); everything after it, the walking, her thirst falling or the
// nearest bakery changing, and the review, is the engine's own. The evidence for ordinary worlds is the diagnostic runs in docs/KEPT_TARGET.md.
import { afterEach, describe, expect, it } from 'vitest';
import { walkFor } from './helpers/kept_target';
import { addPerson, building, done, give, pin, site, stage } from './helpers/kit';
import { parseIntervention } from '../scripts/lab/lab';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity } from '../src/sim/activities';
import { generateOptions, keptRunningUtility, rankOptions, reviewActivity } from '../src/sim/decision';
import { conservationReport, consume, ledgerConsume } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { setExternalController } from '../src/sim/external';
import { FOUND_EMPTY_REASON } from '../src/sim/found_empty';
import { delBelief, observe, putBelief, waterBeliefId } from '../src/sim/knowledge';
import { makeCtx } from '../src/sim/optutil';
import { perceive } from '../src/sim/perception';
import { probe, probeReset } from '../src/sim/probe';
import { batchPlaceOf, facilitiesOf } from '../src/sim/production';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { rebuildMobileGrid } from '../src/sim/registry';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { makeSource } from '../src/sim/sources';
import {
  TRIP_KEPT_FROM_VERSION, keptBatchPlaceId, keptBatchPlaceOn, keptThroughNeedsOn, needsToHold, setKeptBatchPlace, setKeptThroughNeeds, withNeedsHeld,
} from '../src/sim/trip_kept';
import type { Person, World } from '../src/sim/types';
import { makeWolf } from '../src/sim/wildlife';
import { hashWorld, stepWorld } from '../src/sim/world';

/** The version the comparisons run "before the fix" at. Any supported version below 265 serves; it is the one the fix was rebased onto. */
const BEFORE = 263;

afterEach(() => {
  setKeptThroughNeeds(true);
  setKeptBatchPlace(true);
  setExternalController(null);
  probe.on = false;
  probeReset();
});

/** the shore tile nearest to her, as a belief fresh this tick (the stage knows only shore within 30 tiles of its camp, and none is) */
function knowShore(w: World, p: Person): void {
  let best = -1, bd = 1e9;
  for (let i = 0; i < w.accessCell.length; i++) {
    const t = w.accessCell[i];
    if (t < 0) continue;
    const d = Math.hypot((t % w.W) + 0.5 - p.x, Math.floor(t / w.W) + 0.5 - p.y);
    if (d < bd) { bd = d; best = i; }
  }
  const t = w.accessCell[best];
  putBelief(p, { id: waterBeliefId(w, best), kind: 'water', x: (t % w.W) + 0.5, y: Math.floor(t / w.W) + 0.5, amount: 0, max: 0, seen: w.tick, src: 'seen', from: 0, learned: w.tick });
}

type Kind = 'gather' | 'store' | 'haul';
/** Hana at (40.5, 22.5), well drunk (80), a hut site of her household, and the far thing she sets out for: a tree, a storehouse holding wood, or the site itself with wood in her pack */
function trip(version: number, kind: Kind) {
  const s = stage('trip-kept'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 22.5, { age: 30, hunger: 100, thirst: 80, energy: 100, traits: { diligence: 0.9 }, inv: kind === 'haul' ? { wood: 6 } : {} });
  const target = site(s, 'hut', 44, kind === 'haul' ? 36 : 20, p.hhId, p.id);
  target.required.wood = 12;
  const far = kind === 'gather' ? makeSource(w, 'tree', 40, 40, 8) : kind === 'store' ? building(s, 'storehouse', 40, 40, 0, { wood: 8 }) : target;
  done(s);
  knowShore(w, p);
  observe(w, p, target);
  if (far !== target) observe(w, p, far);
  pin(p);
  p.cooldowns.trade = 1e12;
  const key = kind === 'gather' ? `gather:${far.id}` : kind === 'store' ? `collect:${far.id}:wood` : `haul:${target.id}`;
  return { s, w, p, target, far, key, kind };
}
type Trip = ReturnType<typeof trip>;
const present = (f: { w: World; p: Person; key: string }): boolean => generateOptions(f.w, f.p, true, true).options.some((o) => o.key === f.key);
/** her thirst falls past the gates (gathering and fetching 53, building and hauling 51) between two looks, which is all a long walk does */
const crossGate = (f: { p: Person }): void => { f.p.needs.thirst = 50; };

/**
 * Two bakeries on a line south of her: the near one at y 25, the far one, holding flour, at y 42. Walking south makes the far one the nearer
 * after y 33.5. Grain in the pack is what makes bread wanted (rules 243); nothing else is carried, so what is missing is flour, water and fuel.
 */
function bakeries(version: number) {
  const s = stage('trip-place'), w = s.w;
  w.settings.dynamics = 'rich';
  w.settings.rulesVersion = version;
  w.tick = 1000;
  const p = addPerson(s, 'Hana', 40.5, 22.5, { age: 30, hunger: 100, thirst: 100, energy: 100, traits: { diligence: 0.9 }, inv: { grain: 4 } });
  const home = building(s, 'hut', 36, 20, 99, {});
  const near = building(s, 'bakery', 44, 25, 0, {});
  const far = building(s, 'bakery', 44, 42, 0, { flour: 6 });
  give(w, p, 'spear');
  done(s);
  for (const e of [home, near, far]) observe(w, p, e);
  pin(p);
  p.cooldowns.trade = 1e12;
  return { s, w, p, near, far, key: `collect:${far.id}:flour` };
}
type Bak = ReturnType<typeof bakeries>;
const nearest = (f: Bak): number => facilitiesOf(makeCtx(f.w, f.p, false, true), 'bakery')[0].b.id;

describe('rules 265: the version, the switches and the arms', () => {
  it('claims 265, is supported and current, has a supported earlier version to compare with, and has three lab arms that throw and restore the two switches', () => {
    expect(TRIP_KEPT_FROM_VERSION).toBe(265);
    expect(SUPPORTED_RULES_VERSIONS).toContain(265);
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(265);
    expect(BEFORE).toBeLessThan(TRIP_KEPT_FROM_VERSION);
    expect(SUPPORTED_RULES_VERSIONS).toContain(BEFORE);
    for (const [arm, needs, place] of [['rich-no-kept-needs', false, true], ['rich-no-kept-place', true, false], ['rich-no-trip-kept', false, false]] as const) {
      const iv = parseIntervention(arm);
      expect(iv.spec).toBe(arm);
      expect(keptThroughNeedsOn() && keptBatchPlaceOn()).toBe(true);
      const undo = iv.install!();
      expect([keptThroughNeedsOn(), keptBatchPlaceOn()], arm).toEqual([needs, place]);
      undo();
      expect([keptThroughNeedsOn(), keptBatchPlaceOn()], arm).toEqual([true, true]);
    }
  });
});

describe('rules 265, part 1: a trip is kept through a gate that closes on the way', () => {
  for (const kind of ['gather', 'store', 'haul'] as const) {
    it(`${kind}: thirst crossing the gate drops the trip at ${BEFORE} and with the switch off, and keeps it at 265`, () => {
      const verdict = (version: number, off: boolean): { kept: boolean; why: string | undefined; recorded: unknown } => {
        const f = trip(version, kind);
        setKeptThroughNeeds(!off);
        const act = walkFor(f.w, f.p, f.key);
        const recorded = act.data.needsAtStart;
        expect(f.p.activity!.phase).toBe('travel');
        crossGate(f);
        expect(present(f), 'the gate closed on the way, so the planner no longer offers it').toBe(false);
        reviewActivity(f.w, f.p);
        setKeptThroughNeeds(true);
        return { kept: f.p.activity?.id === act.id, why: f.p.lastResult?.detail, recorded };
      };
      const on = verdict(265, false);
      expect(on.kept).toBe(true);
      expect(on.recorded, 'the three levels she set out with').toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
      expect((on.recorded as number[])[1], 'thirst was 80 at the start, less the first tick').toBeGreaterThan(79);
      const off = verdict(265, true);
      expect(off.kept).toBe(false);
      expect(off.why).toBe('something better came up');
      expect(off.recorded).toBeUndefined();
      const old = verdict(BEFORE, false);
      expect(old.kept).toBe(false);
      expect(old.why).toBe('something better came up');
      expect(old.recorded).toBeUndefined();
    });
  }

  it('is a second look at one number: the candidates and the best option still come from the real, ungated options', () => {
    const f = trip(265, 'gather');
    walkFor(f.w, f.p, f.key);
    crossGate(f);
    const real = generateOptions(f.w, f.p, true, true);
    expect(real.options.some((o) => o.key === f.key)).toBe(false);
    expect(rankOptions(real)[0]?.key, 'her best real option is something the gate left her, not the trip').not.toBe(f.key);
    const hold = needsToHold(f.w, f.p, f.p.activity!)!;
    expect(hold[1], 'thirst is held at what it was, not at what it is').toBeGreaterThan(79);
    const held = withNeedsHeld(f.p, hold, () => generateOptions(f.w, f.p, false, true).options.some((o) => o.key === f.key));
    expect(held).toBe(true);
    expect(f.p.needs.thirst, 'put back exactly').toBe(50);
    // a closed gate is still closed for choosing something new: she would not start the same trip now
    expect(present(f)).toBe(false);
  });

  it('yields to a clearly better option: at thirst 25 a drink is worth more than the kept trip and she goes to drink', () => {
    const f = trip(265, 'store');
    const act = walkFor(f.w, f.p, f.key);
    f.p.needs.thirst = 25;
    expect(generateOptions(f.w, f.p, true, true).criticals).toEqual([]);
    reviewActivity(f.w, f.p);
    expect(f.p.activity?.id).not.toBe(act.id);
    expect(f.p.lastResult?.detail).toBe('something better came up');
    expect(f.p.activity?.kind).toBe('drink');
  });

  it('a critical need still interrupts at once', () => {
    for (const kind of ['gather', 'store', 'haul'] as const) {
      const f = trip(265, kind);
      const act = walkFor(f.w, f.p, f.key);
      f.p.needs.thirst = 8;
      reviewActivity(f.w, f.p);
      expect(f.p.activity?.id, kind).not.toBe(act.id);
      expect(f.p.lastResult?.detail, kind).toContain('more urgent need');
    }
  });

  it('a wolf in sight still interrupts at once', () => {
    const f = trip(265, 'gather');
    const act = walkFor(f.w, f.p, f.key);
    crossGate(f);
    const wolf = makeWolf(f.w, f.p.x + 2, f.p.y);
    rebuildMobileGrid(f.w);
    perceive(f.w, f.p);
    expect(f.p.seen.some((s) => s.id === wolf.id)).toBe(true);
    reviewActivity(f.w, f.p);
    expect(f.p.activity?.id).not.toBe(act.id);
    expect(f.p.lastResult?.detail).toBe('danger nearby');
  });

  it('a target that is truly ruled out in her own knowledge is still dropped; the second look was asked and said no', () => {
    const ruledOut: Record<Kind, (f: Trip) => void> = {
      gather: (f) => { const t = f.far as ReturnType<typeof makeSource>; ledgerConsume(f.w, t.item, t.amount, 'staged source loss'); t.amount = 0; observe(f.w, f.p, t); },
      store: (f) => { const b = f.far as ReturnType<typeof building>; consume(f.w, b.store.items, 'wood', 8, 'staged stock loss'); observe(f.w, f.p, b); },
      haul: (f) => { delBelief(f.p, f.target.id); },
    };
    for (const kind of ['gather', 'store', 'haul'] as const) {
      const f = trip(265, kind);
      const act = walkFor(f.w, f.p, f.key);
      ruledOut[kind](f);
      crossGate(f);
      probe.on = true;
      probeReset();
      reviewActivity(f.w, f.p);
      expect(probe.generations, `${kind}: the first look and the second`).toBe(2);
      expect(probe.keptNeedsReviews, kind).toBe(0);
      probe.on = false;
      expect(f.p.activity?.id, kind).not.toBe(act.id);
      expect([FOUND_EMPTY_REASON, 'something better came up'], kind).toContain(f.p.lastResult?.detail);
      expect(conservationReport(f.w).ok, kind).toBe(true);
    }
  });

  it('is not asked when nothing could change: the key present, no need worse, or an outside controller', () => {
    const looks = (setup: (f: Trip) => void): number => {
      const f = trip(265, 'haul');
      walkFor(f.w, f.p, f.key);
      setup(f);
      probe.on = true;
      probeReset();
      reviewActivity(f.w, f.p);
      const n = probe.generations;
      probe.on = false;
      return n;
    };
    expect(looks(() => {}), 'key present: one look').toBe(1);
    expect(looks((f) => { delBelief(f.p, f.target.id); f.p.needs.hunger = 100; f.p.needs.thirst = 100; f.p.needs.energy = 100; }), 'key gone, but no need is worse than at the start').toBe(1);
    expect(looks((f) => crossGate(f)), 'gate closed, a need worse, something beats 3').toBe(2);
    const f = trip(265, 'haul');
    walkFor(f.w, f.p, f.key);
    crossGate(f);
    const undo = setExternalController({ controls: (_w, q) => q.id === f.p.id, choose: () => ({ kind: 'defer' }) });
    probe.on = true;
    probeReset();
    reviewActivity(f.w, f.p);
    expect(probe.generations, 'an outside controller: one look').toBe(1);
    probe.on = false;
    undo();
  });
});

describe('rules 265, part 2: the batch place stays the one she set out for', () => {
  /** walk one tick at a time until the far bakery is the nearer one; what happened to her trip on the way is in the result */
  function walkPastMidpoint(f: Bak) {
    const act = walkFor(f.w, f.p, f.key, 30);
    let flipAt: number | null = null, endedAt: number | null = null, keyAtFlip: boolean | null = null;
    for (let i = 0; i < 400; i++) {
      stepWorld(f.w);
      if (flipAt === null && nearest(f) === f.far.id) { flipAt = f.w.tick; keyAtFlip = present(f); }
      if (f.p.activity?.id !== act.id) { endedAt = f.w.tick; break; }
    }
    return { act, flipAt, endedAt, keyAtFlip };
  }

  it('at 265 the far bakery stays a source after it becomes the nearest, and the flour is collected', () => {
    const f = bakeries(265);
    const { act, flipAt, endedAt, keyAtFlip } = walkPastMidpoint(f);
    expect(act.data.forPlace, 'the withdrawal records the bakery its batch is at').toBe(f.near.id);
    expect(flipAt, 'the far bakery did become the nearest on the way').not.toBeNull();
    expect(keyAtFlip, 'and the key was still offered then').toBe(true);
    expect(endedAt).not.toBeNull();
    expect(endedAt!).toBeGreaterThan(flipAt!);
    expect(f.p.lastResult?.outcome).toBe('success');
    expect(f.p.inv.flour ?? 0).toBeGreaterThan(0);
  });

  it(`with the place switch off, or at ${BEFORE}, the key vanishes at the flip and the walk is dropped before the flour`, () => {
    for (const [version, off] of [[265, true], [BEFORE, false]] as const) {
      const f = bakeries(version);
      setKeptBatchPlace(!off);
      const { act, flipAt, endedAt, keyAtFlip } = walkPastMidpoint(f);
      setKeptBatchPlace(true);
      const at = `${version}, switch ${off ? 'off' : 'on'}`;
      expect(act.data.forPlace, at).toBeUndefined();
      expect(flipAt, at).not.toBeNull();
      expect(keyAtFlip, `${at}: it is the nearest, so it is the batch place, so it is no source`).toBe(false);
      expect(endedAt, at).not.toBeNull();
      expect(endedAt!, `${at}: dropped only after the flip`).toBeGreaterThanOrEqual(flipAt!);
      expect(f.p.inv.flour ?? 0, at).toBe(0);
      expect(f.p.lastResult?.detail, at).toBe('something better came up');
    }
  });

  it('the place is the one set out for only while the withdrawal runs and is still known; facilitiesOf stays nearest-first', () => {
    const f = bakeries(265);
    const act = walkFor(f.w, f.p, f.key, 30);
    // put her where the far bakery is the nearer, by hand, to read the choice without a walk
    f.p.x = 44.5; f.p.y = 38.5;
    const ctx = makeCtx(f.w, f.p, false, true);
    expect(facilitiesOf(ctx, 'bakery')[0].b.id, 'nearest-first for everybody else').toBe(f.far.id);
    expect(keptBatchPlaceId(f.w, f.p)).toBe(f.near.id);
    expect(batchPlaceOf(ctx, 'bakery')!.b.id, 'the batch place is the one she set out for').toBe(f.near.id);
    expect(batchPlaceOf(ctx, 'timber_yard'), 'a type she knows no workshop of').toBeUndefined();
    // no longer known: nearest-first again
    delBelief(f.p, f.near.id);
    expect(batchPlaceOf(makeCtx(f.w, f.p, false, true), 'bakery')!.b.id).toBe(f.far.id);
    observe(f.w, f.p, f.near);
    // not running: nearest-first again
    const running = f.p.activity;
    f.p.activity = null;
    expect(keptBatchPlaceId(f.w, f.p)).toBeNull();
    expect(batchPlaceOf(makeCtx(f.w, f.p, false, true), 'bakery')!.b.id).toBe(f.far.id);
    f.p.activity = running;
    expect(batchPlaceOf(makeCtx(f.w, f.p, false, true), 'bakery')!.b.id).toBe(f.near.id);
    // a withdrawal not made for a batch names no place
    delete act.data.forPlace;
    expect(batchPlaceOf(makeCtx(f.w, f.p, false, true), 'bakery')!.b.id).toBe(f.far.id);
    // with the switch off nothing is named
    act.data.forPlace = f.near.id;
    setKeptBatchPlace(false);
    expect(keptBatchPlaceId(f.w, f.p)).toBeNull();
  });

  it('counts the plans where it chose another place than the nearest, only under the probe', () => {
    const f = bakeries(265);
    walkFor(f.w, f.p, f.key, 30);
    f.p.x = 44.5; f.p.y = 38.5;
    generateOptions(f.w, f.p, false, true);
    expect(probe.keptPlaceChoices, 'the probe is off').toBe(0);
    probe.on = true;
    probeReset();
    generateOptions(f.w, f.p, false, true);
    expect(probe.keptPlaceChoices).toBeGreaterThan(0);
    probe.on = false;
  });
});

describe('rules 265: what is written, what is saved, and that the second look changes nothing', () => {
  it('nothing new is written below 265, with a switch off, or for an activity with no option key', () => {
    const fields = (version: number, needsOff: boolean, placeOff: boolean) => {
      const f = bakeries(version);
      setKeptThroughNeeds(!needsOff);
      setKeptBatchPlace(!placeOff);
      const act = walkFor(f.w, f.p, f.key, 5);
      setKeptThroughNeeds(true);
      setKeptBatchPlace(true);
      return { needsAtStart: act.data.needsAtStart, forPlace: act.data.forPlace, keys: Object.keys(act.data).filter((k) => k !== 'needsAtStart' && k !== 'forPlace').sort() };
    };
    const old = fields(BEFORE, false, false);
    expect(old.needsAtStart).toBeUndefined();
    expect(old.forPlace).toBeUndefined();
    const both = fields(265, false, false);
    expect(both.needsAtStart).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
    expect(typeof both.forPlace).toBe('number');
    const needsOff = fields(265, true, false);
    expect(needsOff.needsAtStart).toBeUndefined();
    expect(typeof needsOff.forPlace).toBe('number');
    const placeOff = fields(265, false, true);
    expect(placeOff.needsAtStart).toEqual([expect.any(Number), expect.any(Number), expect.any(Number)]);
    expect(placeOff.forPlace).toBeUndefined();
    const neither = fields(265, true, true);
    expect(neither.needsAtStart).toBeUndefined();
    expect(neither.forPlace).toBeUndefined();
    // and nothing else about the activity differs
    for (const x of [needsOff, placeOff, neither, old]) expect(x.keys).toEqual(both.keys);

    // an activity that carries no option key is not recorded (the review has nothing to look up for it)
    const f = trip(265, 'gather');
    const o = rankOptions(generateOptions(f.w, f.p, true, true))[0];
    const keyless = o.make!()!;
    expect(keyless.data.optKey).toBeUndefined();
    startActivity(f.w, f.p, keyless);
    expect(keyless.data.needsAtStart).toBeUndefined();
  });

  it('saves and loads both fields, and the loaded twin keeps the same trip the same way', () => {
    const f = trip(265, 'haul');
    const act = walkFor(f.w, f.p, f.key);
    crossGate(f);
    const twin = deserializeWorld(serializeWorld(f.w));
    const tp = twin.persons.find((q) => q.id === f.p.id)!;
    expect(tp.activity!.data.needsAtStart).toEqual(act.data.needsAtStart);
    expect(serializeWorld(twin)).toBe(serializeWorld(f.w));
    reviewActivity(f.w, f.p);
    reviewActivity(twin, tp);
    expect(f.p.activity?.id).toBe(act.id);
    expect(tp.activity?.id).toBe(act.id);
    expect(serializeWorld(twin)).toBe(serializeWorld(f.w));
    for (let n = 0; n < 150; n++) { stepWorld(f.w); stepWorld(twin); }
    expect(serializeWorld(twin)).toBe(serializeWorld(f.w));
    expect(hashWorld(twin)).toBe(hashWorld(f.w));

    const b = bakeries(265);
    const bact = walkFor(b.w, b.p, b.key, 10);
    const loaded = deserializeWorld(serializeWorld(b.w));
    const lp = loaded.persons.find((q) => q.id === b.p.id)!;
    expect(lp.activity!.data.forPlace).toBe(b.near.id);
    expect(lp.activity!.data.needsAtStart).toEqual(bact.data.needsAtStart);
    expect(keptBatchPlaceId(loaded, lp)).toBe(b.near.id);
  });

  it('the second look writes nothing: world, random stream and needs are as they were; the review is the first look plus the next think', () => {
    const f = trip(265, 'gather');
    const act = walkFor(f.w, f.p, f.key);
    crossGate(f);
    const needsBefore = JSON.stringify(f.p.needs);
    const ser = serializeWorld(f.w), h = hashWorld(f.w);
    const v = keptRunningUtility(f.w, f.p, f.p.activity!, f.key);
    expect(v, 'the second look found the key and valued it').toBeGreaterThan(0);
    expect(serializeWorld(f.w), 'the whole serialised world, random stream included').toBe(ser);
    expect(hashWorld(f.w)).toBe(h);
    expect(JSON.stringify(f.p.needs)).toBe(needsBefore);

    // the whole review, against a twin given only the first look (the ordinary planner pass) and the next think the review sets
    const twin = deserializeWorld(ser);
    const tp = twin.persons.find((q) => q.id === f.p.id)!;
    reviewActivity(f.w, f.p);
    expect(f.p.activity?.id).toBe(act.id);
    generateOptions(twin, tp, false);
    tp.nextThink = f.p.nextThink;
    expect(serializeWorld(f.w), 'the second pass added nothing to the first').toBe(serializeWorld(twin));
    expect(JSON.stringify(f.p.needs)).toBe(needsBefore);
  });

  it('counts a kept review once, and the second look costs one more planner pass', () => {
    const f = trip(265, 'gather');
    walkFor(f.w, f.p, f.key);
    crossGate(f);
    probe.on = true;
    probeReset();
    reviewActivity(f.w, f.p);
    expect([probe.reviews, probe.generations, probe.keptNeedsReviews]).toEqual([1, 2, 1]);
    probe.on = false;
    probeReset();
    const g = trip(265, 'gather');
    walkFor(g.w, g.p, g.key);
    crossGate(g);
    setKeptThroughNeeds(false);
    probe.on = true;
    probeReset();
    reviewActivity(g.w, g.p);
    expect([probe.reviews, probe.generations, probe.keptNeedsReviews]).toEqual([1, 1, 0]);
  });

  it(`with both switches off a world at 265 is the same run as a world at ${BEFORE}, byte for byte but the version; with them on it writes the new fields`, () => {
    const run = (version: number): string => {
      const settings = freshRunSettings(parseRunRules('rich'), 'normal', 'trip-kept-twin', { immigration: true });
      settings.rulesVersion = version;
      const w = createWorld(settings);
      while (w.tick < 2400) stepWorld(w);
      return serializeWorld(w);
    };
    setKeptThroughNeeds(false);
    setKeptBatchPlace(false);
    const off = run(265);
    setKeptThroughNeeds(true);
    setKeptBatchPlace(true);
    const old = run(BEFORE);
    const on = run(265);
    expect(off.split('"rulesVersion":265').join(`"rulesVersion":${BEFORE}`)).toBe(old);
    expect(old).not.toContain('needsAtStart');
    expect(off).not.toContain('needsAtStart');
    expect(on, 'every keyed activity of a 265 world carries the levels it began with').toContain('needsAtStart');
  }, 240_000);

  it('the second look is write-free for everybody in an ordinary world, at three moments of its first day', () => {
    const w = createWorld(freshRunSettings(parseRunRules('rich'), 'normal', 'trip-kept-purity', { immigration: true }));
    expect(w.settings.rulesVersion).toBeGreaterThanOrEqual(265);
    let looked = 0, valued = 0;
    for (const until of [700, 1500, 2400]) {
      while (w.tick < until) stepWorld(w);
      const before = serializeWorld(w);
      const hash = hashWorld(w);
      for (const p of w.persons) {
        const a = p.activity;
        if (!a || typeof a.data.optKey !== 'string') continue;
        // everybody is made to look worse off than when they began, so the look is asked for every activity there is
        const had = Object.prototype.hasOwnProperty.call(a.data, 'needsAtStart'), was = a.data.needsAtStart;
        a.data.needsAtStart = [100.5, 100.5, 100.5];
        const needs = JSON.stringify(p.needs);
        const ph = hashWorld(w);
        const v = keptRunningUtility(w, p, a, a.data.optKey);
        looked++;
        if (v !== null) valued++;
        if (had) a.data.needsAtStart = was; else delete a.data.needsAtStart;
        expect(JSON.stringify(p.needs), `${p.name} ${a.kind}`).toBe(needs);
        expect(hashWorld(w), `${p.name} ${a.kind}`).toBe(ph);
      }
      expect(serializeWorld(w), `at ${until}`).toBe(before);
      expect(hashWorld(w)).toBe(hash);
    }
    expect(looked, 'a real day has many activities running').toBeGreaterThan(20);
    expect(valued, 'and for some of them the key is offered once the needs are held').toBeGreaterThan(0);
  }, 240_000);
});
