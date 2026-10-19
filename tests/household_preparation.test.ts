// HOUSEHOLD FOOD PREPARATION (rules version 2). The nine acceptance criteria of the task brief, each as a contract test.
//
// What is a fixture and what is the simulation: the scenes below place a person, a home, a bush and some needs, and set the
// clock. Everything after that is the engine's - `reviewIntentions` decides whether a plan is taken on, the option layer
// offers the gathering and the depositing, the ordinary deposit activity moves the food, and `settleIntentions` judges the
// plan. No test writes a plan's outcome, credits anybody with work, or puts food into a store by hand once a plan is running.
//
// Everything built here is STAGED. It proves the chain works and the gates hold; it says nothing about how often any of this
// happens on its own, which is a question for measurement, not for a fixture.
import { afterEach, describe, expect, it } from 'vitest';
import { createBuilding } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { decide, generateOptions } from '../src/sim/decision';
import { addItem } from '../src/sim/economy';
import { setExternalController } from '../src/sim/external';
import type { ExternalChoice } from '../src/sim/external';
import { createWorld } from '../src/sim/factory';
import { intentFor, reviewIntentions, settleIntentions } from '../src/sim/intent';
import { planViews } from '../src/sim/inspect';
import { delBelief, observe } from '../src/sim/knowledge';
import { updateEnvironment } from '../src/sim/environment';
import { currentWorldSettings, freshRunSettings, settingsForProfile } from '../src/sim/profiles';
import {
  CARRY_TO_STORE,
  DAY_FOOD,
  RESERVE_CAP,
  RESERVE_DAYS,
  foodInBelief,
  homeStoreBelief,
  inPreWinter,
  prepProbe,
  prepReset,
  prepSnapshot,
  preparationWanted,
  setFoodPreparation,
  ticksUntilWinter,
} from '../src/sim/provision';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import { makeSource } from '../src/sim/sources';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Items, Person, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const livePlan = (p: Person) => p.intentions.find((i) => i.status === 'active' && i.kind === 'stock') ?? null;

/** winter sets in on day 8 of a twelve-day year; this is a tick safely inside the two-day window before it */
const PRE_WINTER_TICK = 15000;

interface SceneOpts {
  /** the rules the scene runs; the default is the current version, because that is what the behaviour under test belongs to */
  rulesVersion?: number;
  /** a world from before rules versions existed */
  unversioned?: boolean;
  dynamics?: 'rich' | 'authored';
  /** what is already in the home store */
  homeFood?: Items;
  /** what the person is carrying */
  carry?: Items;
  tick?: number;
  age?: number;
  /** leave the home out of what the person knows about */
  forgetHome?: boolean;
  home?: 'hut' | 'lean_to';
}

/**
 * One adult, one home of her own with whatever is already in it, a berry bush she knows of, fed, watered and rested. Nothing
 * here is short of anything except food in the store, which is the only thing under test.
 */
function scene(seed: string, o: SceneOpts = {}) {
  const version = o.unversioned ? undefined : (o.rulesVersion ?? CURRENT_RULES_VERSION);
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: o.dynamics ?? 'rich', rulesVersion: version }));
  const rng = new RNG(29);
  const ann = testKit.addPerson(w, rng, { name: 'Ann', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92, age: o.age });
  const home = createBuilding(w, o.home ?? 'hut', 41, 40, ann.hhId);
  const hh = w.households.find((h) => h.id === ann.hhId);
  if (hh) hh.homeId = home.id;
  for (const [k, n] of Object.entries(o.homeFood ?? {})) addItem(home.store.items, k as keyof Items, n ?? 0);
  for (const [k, n] of Object.entries(o.carry ?? {})) addItem(ann.inv, k as keyof Items, n ?? 0);
  const bush = makeSource(w, 'berry_bush', 38, 41, 30);
  observe(w, ann, bush);
  testKit.finish(w, 'natural');
  // `finish` lets everyone see what is around them, so a scene about somebody with no home of their own has to take it away
  // again afterwards rather than simply not granting it
  if (o.forgetHome) delBelief(ann, home.id);
  // no trade preference in this corner: it is about food going into a store, and a settled trade would reshuffle the pack
  ann.cooldowns.trade = 1e12;
  // Mid-morning by default. Tick 0 is the small hours, when the option layer rightly offers almost nothing (nightMult), and a
  // scene about choosing between daytime options must not be set in the dark.
  w.tick = o.tick ?? 1000;
  updateEnvironment(w);
  return { w, ann, home, bush };
}

/** a controller that takes one option the engine offered, matched on its key, and otherwise leaves every choice alone */
function takes(who: Person, keyPart: string) {
  const taken: string[] = [];
  const restore = setExternalController({
    controls: (_w, p) => p.id === who.id,
    choose: (_w, _p, _ctx, ranked): ExternalChoice => {
      const o = ranked.find((x) => x.key.includes(keyPart));
      if (o) {
        taken.push(o.key);
        return { kind: 'pick', key: o.key };
      }
      return { kind: 'fallback', reason: 'nothing of that kind on offer' };
    },
  });
  return { taken, restore };
}

let undoController: (() => void) | null = null;
afterEach(() => {
  undoController?.();
  undoController = null;
  setFoodPreparation(true);
  prepProbe.on = false;
  prepReset();
});

// ───────────────────────── 1. eligible people form preparations from permitted evidence ─────────────────────────

describe('1. an eligible person forms a preparation, from evidence they actually have', () => {
  it('takes one on because the household can SEE it has next to nothing', () => {
    const { w, ann } = scene('prep-hardship');
    const plan = reviewIntentions(ctxFor(w, ann));
    expect(plan?.kind).toBe('stock');
    expect(plan?.cue).toBe('hardship');
    expect(plan?.reason).toMatch(/next to nothing at home/);
    expect(plan?.reserve, 'one day of eating for one member').toBe(DAY_FOOD * RESERVE_DAYS);
    expect(plan?.aboutId, 'the home it is about').toBe(homeStoreBelief(ann)!.id);
  });

  it('takes one on because WINTER is close, when nothing is visibly wrong', () => {
    // two units in the store: above the "visibly short" line (half a day for one member) and still 2 short of the target
    const { w, ann } = scene('prep-season', { homeFood: { berries: 2 }, tick: PRE_WINTER_TICK });
    expect(inPreWinter(w), 'the fixture really is in the window').toBe(true);
    const plan = reviewIntentions(ctxFor(w, ann));
    expect(plan?.kind).toBe('stock');
    expect(plan?.cue).toBe('season');
    expect(plan?.reason).toMatch(/winter is close/);
    // the deadline is winter itself, not an arbitrary span
    expect(plan!.until - w.tick).toBe(ticksUntilWinter(w));
  });

  it('takes one on because they themselves went hungry lately', () => {
    const { w, ann } = scene('prep-hungry', { homeFood: { berries: 2 } });
    expect(preparationWanted(ctxFor(w, ann)), 'nothing visibly wrong and not winter: no cue').toBeNull();
    ann.mood = { level: 0, thoughts: [{ kind: 'hungry', value: -20, since: w.tick, until: w.tick + DAY, why: 'has gone hungry' }] };
    const want = preparationWanted(ctxFor(w, ann));
    expect(want?.cue).toBe('hardship');
    expect(want?.why).toMatch(/went hungry lately/);
  });

  it('records which of the two cues it was, and never reads the lean season', () => {
    const { w, ann } = scene('prep-cue-separate', { homeFood: { berries: 2 }, tick: PRE_WINTER_TICK });
    // a lean season is under way; it must change nothing about WHY the plan is taken on
    w.hardship = { kind: 'lean', since: w.tick - 10, until: w.tick + DAY };
    expect(preparationWanted(ctxFor(w, ann))?.cue, 'the season, not the lean roll').toBe('season');
    delete w.hardship;
    expect(preparationWanted(ctxFor(w, ann))?.cue).toBe('season');
  });

  it('is the household that is counted, not the person: more members, a bigger target, up to the cap', () => {
    const { w, ann } = scene('prep-members');
    const rng = new RNG(31);
    for (const [i, name] of ['Bea', 'Cal', 'Dot'].entries()) testKit.addPerson(w, rng, { name, x: 40.5 + i * 0.4, y: 41.5, hh: ann.hhId, hunger: 92, thirst: 92, energy: 92 });
    const want = preparationWanted(ctxFor(w, ann))!;
    expect(want.target).toBe(Math.min(DAY_FOOD * RESERVE_DAYS * 4, RESERVE_CAP));
    expect(want.target).toBe(RESERVE_CAP);
  });
});

// ───────────────────────── 2. ineligible situations do not trigger it ─────────────────────────

describe('2. ineligible situations form no preparation', () => {
  it('a child does not', () => {
    const { w, ann } = scene('prep-child', { age: 7 });
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ann))?.kind).not.toBe('stock');
  });

  it('somebody with no home of their own that they know of does not', () => {
    const { w, ann } = scene('prep-nohome', { forgetHome: true });
    expect(homeStoreBelief(ann)).toBeNull();
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
  });

  it('a household already at its target does not, in or out of the window', () => {
    const { w, ann } = scene('prep-stocked', { homeFood: { grain: 9 } });
    expect(preparationWanted(ctxFor(w, ann)), 'nothing to make up').toBeNull();
    w.tick = PRE_WINTER_TICK;
    expect(preparationWanted(ctxFor(w, ann)), 'and winter does not create a want that is not there').toBeNull();
  });

  it('a store that is nearly full enough does not: a shortfall of one is the ordinary stockpile option', () => {
    const { w, ann } = scene('prep-nearly', { homeFood: { grain: 3 } });
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
  });

  it('a home with no room left does not, however empty of food it is', () => {
    // a lean-to holds 12 weight units; fill it with wood (2 each) and there is nowhere for food to go
    const { w, ann, home } = scene('prep-full', { home: 'lean_to' });
    addItem(home.store.items, 'wood', 6);
    observe(w, ann, home);
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
  });

  it('an authored world does not, at any version', () => {
    const { w, ann } = scene('prep-authored', { dynamics: 'authored', rulesVersion: CURRENT_RULES_VERSION });
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ann))).toBeNull();
  });

  it('outside the window, with the store merely below target and nothing visibly wrong, nobody prepares', () => {
    const { w, ann } = scene('prep-quiet', { homeFood: { berries: 2 }, tick: 3000 });
    expect(inPreWinter(w)).toBe(false);
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
  });
});

// ───────────────────────── 3. the action is an ordinary one and really moves food ─────────────────────────

describe('3. the chosen action goes through ordinary validation and changes the food that is there', () => {
  it('the reserve is for their OWN household, even with a fuller store next door', () => {
    // Food ownership: `homeStoreBelief` only ever looks at a home of this person's own household. A neighbour's full store
    // is neither the target nor a reason to think the want is already met.
    const { w, ann, home } = scene('prep-ownership');
    const rng = new RNG(41);
    const neighbour = testKit.addPerson(w, rng, { name: 'Nye', x: 44.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    // a BIGGER home than hers, so that a rule picking "the largest store I know of" would wrongly choose this one
    const theirs = createBuilding(w, 'house', 45, 40, neighbour.hhId);
    const theirHh = w.households.find((h) => h.id === neighbour.hhId);
    if (theirHh) theirHh.homeId = theirs.id;
    addItem(theirs.store.items, 'grain', 30);
    observe(w, ann, theirs); // she can see it is full; it is still not hers
    expect(homeStoreBelief(ann)!.id, 'the plan is about her own home').toBe(home.id);
    const plan = reviewIntentions(ctxFor(w, ann))!;
    expect(plan.kind, 'a full store next door is not her household having food').toBe('stock');
    expect(plan.aboutId).toBe(home.id);
    expect(plan.stepKind).toBe('forage');
  });

  it('gathering is the step while the pack is light, and the engine offers it', () => {
    const { w, ann } = scene('prep-step-gather');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    expect(plan.stepKind).toBe('forage');
    expect(plan.step).toMatch(/gather food to put by/);
    const ctx = ctxFor(w, ann);
    const serving = ctx.options.filter((o) => intentFor(ann, o)?.id === plan.id);
    expect(serving.length, 'at least one option the engine generated serves the step').toBeGreaterThan(0);
    // and every one of them really brings food in, rather than merely feeding her where she stands
    for (const o of serving) expect([o.kind, o.tag]).toSatisfy(([k, t]: [string, string | undefined]) => (k === 'gather' && t === 'food') || k === 'harvest' || k === 'hunt');
    expect(ctx.options.some((o) => o.kind === 'eat' && intentFor(ann, o)), 'eating is never a step of putting food by').toBeFalsy();
  });

  it('once the pack is worth a trip the step is the ordinary deposit at their own home', () => {
    // the plan is taken on with an empty pack - carrying food is itself a reason not to feel short - and the food arrives after
    const { w, ann, home } = scene('prep-step-store');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'berries', CARRY_TO_STORE);
    reviewIntentions(ctxFor(w, ann));
    expect(plan.stepKind).toBe('store');
    expect(plan.stepKey).toBe(`deposit:${home.id}:food`);
    const ctx = ctxFor(w, ann);
    const dep = ctx.options.find((o) => o.key === plan.stepKey);
    expect(dep, 'the deposit is an ordinary option the engine offered, not something this plan invented').toBeTruthy();
    expect(intentFor(ann, dep!)?.id).toBe(plan.id);
  });

  it('a pack full of what no store will take is not a reason to walk home', () => {
    // `optDepositFood` offers to store grain, fish, fruit and berries and nothing else. Settling on "take the food home" on
    // the strength of five units of meat would be settling on a step the engine never offers.
    const { w, ann } = scene('prep-meat');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'meat', 6);
    reviewIntentions(ctxFor(w, ann));
    expect(plan.stepKind, 'meat cannot be put down, so there is still food to gather').toBe('forage');
    addItem(ann.inv, 'berries', CARRY_TO_STORE);
    reviewIntentions(ctxFor(w, ann));
    expect(plan.stepKind, 'and berries can').toBe('store');
    const ctx = ctxFor(w, ann);
    expect(ctx.options.some((o) => o.key === plan.stepKey), 'the engine really offers that step').toBe(true);
  });

  it('carrying it out moves real food out of the pack and into the real store, and credits only what moved', () => {
    const { w, ann, home } = scene('prep-deliver');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'berries', 6);
    const c = takes(ann, `deposit:${home.id}`);
    undoController = c.restore;
    const beforeStore = home.store.items.berries ?? 0;
    const beforePack = ann.inv.berries ?? 0;
    for (let n = 0; n < 900 && (home.store.items.berries ?? 0) === beforeStore; n++) stepWorld(w);
    const moved = (home.store.items.berries ?? 0) - beforeStore;
    expect(moved, 'food really arrived in the store').toBeGreaterThan(0);
    expect((ann.inv.berries ?? 0), 'and left the pack').toBe(beforePack - moved);
    expect(plan.worked, 'credited with exactly what moved, not with having meant to').toBe(moved);
    expect(c.taken.length).toBeGreaterThan(0);
  });

  it('the inspector shows the reason, the step and what has actually been put by', () => {
    const { w, ann } = scene('prep-inspect');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'berries', 6);
    reviewIntentions(ctxFor(w, ann));
    const [view] = planViews(w, ann).filter((v) => v.id === plan.id);
    expect(view.kind).toBe('stock');
    expect(view.goal).toMatch(/put \d+ units of food by for the household/);
    expect(view.step).toMatch(/take the food home/);
    expect(view.progress).toMatch(/0 of \d+ units put by \(the household was short\)/);
    // one unit is "1 unit", not "1 units": the card is read by people
    expect(plan.worked).toBe(0);
    plan.worked = 1;
    expect(planViews(w, ann).find((v) => v.id === plan.id)!.detail).toContain(`1 of ${plan.reserve} units put by so far`);
    plan.reserve = 1;
    expect(planViews(w, ann).find((v) => v.id === plan.id)!.detail).toContain('1 of 1 unit put by so far');
    expect(view.detail).toMatch(/Step: take the food home/);
  });
});

// ───────────────────────── 4. completion is about the food, not the label ─────────────────────────

describe('4. a preparation is finished by food, not by a plan saying so', () => {
  it('a store that reached the target by somebody else is not an achievement', () => {
    const { w, ann, home } = scene('prep-notmine');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    expect(plan.worked).toBe(0);
    addItem(home.store.items, 'grain', 9); // somebody else of the household brought it home
    observe(w, ann, home); // and she has since seen it
    settleIntentions(w, ann);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/without their doing/);
  });

  it('a store that filled behind their back ends nothing until they have SEEN it', () => {
    // The plan is judged on what this person believes, never on the world read behind their back. Without that, a
    // preparation would end the instant somebody else put food in, whether or not its owner could know.
    const { w, ann, home } = scene('prep-unseen');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(home.store.items, 'grain', 20);
    settleIntentions(w, ann);
    expect(plan.status, 'she has not been home since; as far as she knows the store is still empty').toBe('active');
    expect(foodInBelief(homeStoreBelief(ann)!)).toBe(0);
    observe(w, ann, home); // now she has seen it
    settleIntentions(w, ann);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/without their doing/);
  });

  it('a target reached by their own hands is', () => {
    const { w, ann, home } = scene('prep-mine');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'grain', 8);
    const c = takes(ann, `deposit:${home.id}`);
    undoController = c.restore;
    for (let n = 0; n < 1200 && plan.status === 'active'; n++) stepWorld(w);
    expect(plan.status, plan.reason).toBe('done');
    expect(plan.reason).toMatch(/put \d+ units? of food by/);
    expect(plan.worked).toBeGreaterThan(0);
    expect(foodInBelief(homeStoreBelief(ann)!), 'and the store really holds it').toBeGreaterThanOrEqual(plan.reserve!);
  });

  it('having put some by is not having finished: the plan says how far it got', () => {
    const { w, ann, home } = scene('prep-partial');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    addItem(ann.inv, 'berries', 5);
    const c = takes(ann, `deposit:${home.id}`);
    undoController = c.restore;
    for (let n = 0; n < 900 && plan.worked === 0; n++) stepWorld(w);
    expect(plan.worked).toBeGreaterThan(0);
    expect(plan.status, 'still short of the target, so still going').toBe('active');
    w.tick = plan.until + 1;
    settleIntentions(w, ann);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/put \d+ units? by, but the store is at \d+ of \d+/);
  });
});

// ───────────────────────── 5. urgency, absence and staleness end it safely ─────────────────────────

describe('5. a preparation is interrupted or ended safely, never stuck', () => {
  it('a critical need sets it aside, with the reason on the record, and does not end it', () => {
    const { w, ann } = scene('prep-urgent');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    ann.needs.hunger = 5;
    reviewIntentions(ctxFor(w, ann));
    expect(plan.status, 'set aside, not given up').toBe('active');
    expect(plan.setAside).toBeGreaterThan(0);
    expect(plan.reason).toMatch(/set aside: hunger comes first/);
    ann.needs.hunger = 92;
    reviewIntentions(ctxFor(w, ann));
    expect(plan.blocked).toBe('');
  });

  it('the home going ends it, rather than leaving a plan pointing at nothing', () => {
    const { w, ann, home } = scene('prep-homegone');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    delBelief(ann, home.id);
    settleIntentions(w, ann);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/no home of theirs left/);
  });

  it('a stale plan runs out and is not taken straight up again', () => {
    const { w, ann } = scene('prep-stale');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    w.tick = plan.until + 1;
    settleIntentions(w, ann);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/never got any food put by/);
    // the same decision, made again at once, with nothing new to go on: the cooldown refuses it
    expect(reviewIntentions(ctxFor(w, ann))?.kind).not.toBe('stock');
    w.tick += DAY;
    expect(reviewIntentions(ctxFor(w, ann))?.kind, 'and a day later it may be taken up afresh').toBe('stock');
  });

  it('one preparation at a time, and it never counts the same store twice', () => {
    const { w, ann } = scene('prep-single');
    reviewIntentions(ctxFor(w, ann));
    for (let n = 0; n < 5; n++) reviewIntentions(ctxFor(w, ann));
    expect(ann.intentions.filter((i) => i.status === 'active' && i.kind === 'stock').length).toBe(1);
  });

  it('two members of a household converge on one store rather than each demanding a reserve of their own', () => {
    const { w, ann, home } = scene('prep-two');
    const bea = testKit.addPerson(w, new RNG(37), { name: 'Bea', x: 41.5, y: 41.5, hh: ann.hhId, hunger: 92, thirst: 92, energy: 92 });
    observe(w, bea, home);
    const a = reviewIntentions(ctxFor(w, ann))!;
    const b = reviewIntentions(ctxFor(w, bea))!;
    expect(a.kind).toBe('stock');
    expect(b.kind).toBe('stock');
    // the target is a LEVEL the store should reach, not a quota each of them owes
    expect(a.reserve).toBe(b.reserve);
    expect(a.aboutId).toBe(b.aboutId);
    addItem(home.store.items, 'grain', a.reserve!);
    observe(w, ann, home);
    observe(w, bea, home);
    settleIntentions(w, ann);
    settleIntentions(w, bea);
    expect(a.status, 'both end at the same level; neither asks for a second storeful').toBe('dropped');
    expect(b.status).toBe('dropped');
  });
});

// ───────────────────────── 6. determinism, save and load ─────────────────────────

describe('6. the new state is deterministic and survives a save', () => {
  const v2 = (seed: string) => createWorld(currentWorldSettings('normal', seed, { immigration: false }));

  it('two runs of the same world are the same run', () => {
    const a = v2('det-a');
    const b = v2('det-a');
    for (let n = 0; n < 2500; n++) {
      stepWorld(a);
      stepWorld(b);
    }
    expect(hashWorld(a)).toBe(hashWorld(b));
  });

  it('a save in the middle of a preparation reads back and carries on identically', () => {
    const w = v2('det-save');
    for (let n = 0; n < 4000; n++) stepWorld(w);
    const live = w.persons.filter((p) => p.alive).flatMap((p) => p.intentions.filter((i) => i.status === 'active' && i.kind === 'stock'));
    expect(live.length, 'the fixture really has preparations under way').toBeGreaterThan(0);
    const text = serializeWorld(w);
    const back = deserializeWorld(text);
    expect(back.settings.rulesVersion).toBe(CURRENT_RULES_VERSION);
    const liveBack = back.persons.filter((p) => p.alive).flatMap((p) => p.intentions.filter((i) => i.status === 'active' && i.kind === 'stock'));
    expect(liveBack.length).toBe(live.length);
    expect(liveBack.map((i) => [i.id, i.reserve, i.cue, i.worked, i.aboutId])).toEqual(live.map((i) => [i.id, i.reserve, i.cue, i.worked, i.aboutId]));
    for (let n = 0; n < 600; n++) {
      stepWorld(w);
      stepWorld(back);
    }
    expect(hashWorld(back)).toBe(hashWorld(w));
  });

  it('a live preparation is part of what the state hash says the world is', () => {
    const { w, ann } = scene('prep-hash');
    const before = hashWorld(w);
    reviewIntentions(ctxFor(w, ann));
    expect(livePlan(ann)).toBeTruthy();
    expect(hashWorld(w), 'a plan that changes what happens next is part of the fingerprint').not.toBe(before);
  });

  it('the observation counters change nothing: a run with them on is the same run', () => {
    prepReset();
    prepProbe.on = false;
    const off = v2('det-probe');
    for (let n = 0; n < 6000; n++) stepWorld(off);
    const quiet = { hash: hashWorld(off), text: serializeWorld(off) };
    prepProbe.on = true;
    const on = v2('det-probe');
    for (let n = 0; n < 6000; n++) stepWorld(on);
    expect(hashWorld(on)).toBe(quiet.hash);
    expect(serializeWorld(on)).toBe(quiet.text);
    const seen = prepSnapshot();
    expect(seen.adoptedHardship + seen.adoptedSeason, 'and they did see something, so the comparison is not vacuous').toBeGreaterThan(0);
  });
});

// ───────────────────────── 7. older worlds do not acquire it ─────────────────────────

describe('7. version-1 and unversioned worlds do not acquire this behaviour', () => {
  it('a version-1 world forms no preparation, however short the household is', () => {
    const { w, ann } = scene('prep-v1', { rulesVersion: 1 });
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ann))?.kind).not.toBe('stock');
    w.tick = PRE_WINTER_TICK;
    expect(preparationWanted(ctxFor(w, ann)), 'and winter does not let it in either').toBeNull();
  });

  it('an unversioned rich world forms none', () => {
    const { w, ann } = scene('prep-unversioned', { unversioned: true });
    expect(w.settings.rulesVersion).toBeUndefined();
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
  });

  it('a whole version-1 run carries no preparation at all', () => {
    const w = createWorld({ ...settingsForProfile('normal', 'v1-run', { dynamics: 'rich', immigration: false }), rulesVersion: 1 });
    for (let n = 0; n < 6000; n++) stepWorld(w);
    const any = w.persons.some((p) => p.intentions.some((i) => i.kind === 'stock'));
    expect(any).toBe(false);
  });

  it('a version-1 save keeps its version through a round trip and stays version 1', () => {
    const w = createWorld({ ...settingsForProfile('normal', 'v1-save', { dynamics: 'rich', immigration: false }), rulesVersion: 1 });
    for (let n = 0; n < 1200; n++) stepWorld(w);
    const back = deserializeWorld(serializeWorld(w));
    expect(back.settings.rulesVersion, 'nothing substitutes the latest version').toBe(1);
    for (let n = 0; n < 1200; n++) stepWorld(back);
    expect(back.persons.some((p) => p.intentions.some((i) => i.kind === 'stock'))).toBe(false);
  });
});

// ───────────────────────── 8. the lab switch ─────────────────────────

describe('8. the lab off-switch removes this and only this', () => {
  it('with it off, no preparation is taken on', () => {
    setFoodPreparation(false);
    const { w, ann } = scene('prep-off');
    expect(preparationWanted(ctxFor(w, ann))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ann))?.kind).not.toBe('stock');
  });

  it('with it off, ordinary food work carries on: food is still gathered and still put into stores', () => {
    setFoodPreparation(false);
    const w = createWorld(currentWorldSettings('normal', 'off-ordinary', { immigration: false }));
    for (let n = 0; n < 6000; n++) stepWorld(w);
    expect(w.persons.some((p) => p.intentions.some((i) => i.kind === 'stock')), 'no preparations').toBe(false);
    let stored = 0;
    for (const b of w.buildings) if (b.store) for (const k of ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'] as const) stored += b.store.items[k] ?? 0;
    expect(stored, 'food still reaches the stores by the ordinary route').toBeGreaterThan(0);
    expect(w.persons.some((p) => p.intentions.some((i) => i.kind === 'tool' || i.kind === 'night')), 'and the other plans are untouched').toBe(true);
  });

  it('it ends a preparation that was already under way at a fork, rather than letting it run on invisibly', () => {
    const { w, ann } = scene('prep-fork');
    const plan = reviewIntentions(ctxFor(w, ann))!;
    expect(plan.status).toBe('active');
    // the fork: the same world, the switch now off
    const forked = deserializeWorld(serializeWorld(w));
    setFoodPreparation(false);
    const annBack = forked.persons.find((p) => p.name === 'Ann')!;
    settleIntentions(forked, annBack);
    const back = annBack.intentions.find((i) => i.kind === 'stock')!;
    expect(back.status).toBe('dropped');
    expect(back.reason).toMatch(/no longer part of these rules/);
  });

  it('it is reset between runs: switching it back on restores the behaviour', () => {
    setFoodPreparation(false);
    const a = scene('prep-reset-a');
    expect(preparationWanted(ctxFor(a.w, a.ann))).toBeNull();
    setFoodPreparation(true);
    const b = scene('prep-reset-b');
    expect(preparationWanted(ctxFor(b.w, b.ann))).toBeTruthy();
  });
});

// ───────────────────────── 9. the app and the command line agree ─────────────────────────

describe('9. a fresh world is the same generation of rules wherever it is made', () => {
  it('the app path and the command-line path stamp the same current version', () => {
    expect(CURRENT_RULES_VERSION).toBe(2);
    const app = currentWorldSettings('normal', 'agree', { immigration: false });
    const cli = freshRunSettings('rich', 'normal', 'agree', { immigration: false });
    expect(app.rulesVersion).toBe(CURRENT_RULES_VERSION);
    expect(cli.rulesVersion).toBe(CURRENT_RULES_VERSION);
    expect(createWorld(app).settings.rulesVersion).toBe(createWorld(cli).settings.rulesVersion);
  });

  it('and both of them really run the new behaviour', () => {
    for (const s of [currentWorldSettings('normal', 'agree-run', { immigration: false }), freshRunSettings('rich', 'normal', 'agree-run', { immigration: false })]) {
      const w = createWorld(s);
      for (let n = 0; n < 6000; n++) stepWorld(w);
      expect(w.persons.some((p) => p.intentions.some((i) => i.kind === 'stock')), JSON.stringify(s.rulesVersion)).toBe(true);
    }
  });
});

// ───────────────────────── the arithmetic the target rests on ─────────────────────────

describe('the reserve target is the documented arithmetic and nothing else', () => {
  it('one day of eating per member, capped, and never more than the home can hold', () => {
    expect(DAY_FOOD, 'hunger falls 72 a day; the foods people eat average about 18').toBe(4);
    expect(RESERVE_DAYS).toBe(1);
    expect(RESERVE_CAP, "three members' worth, and a lean-to's whole capacity").toBe(12);
    // a lean-to (cap 12) with 4 wood in it (2 each) has room for 4 more units of food, so the target is clipped to that
    const { w, ann, home } = scene('prep-room', { home: 'lean_to' });
    addItem(home.store.items, 'wood', 4);
    observe(w, ann, home);
    const want = preparationWanted(ctxFor(w, ann))!;
    expect(want.target).toBe(4);
  });

  it('urgency is never the plan: the nudge is bounded and a critical need outranks it', () => {
    const { w, ann } = scene('prep-bounded');
    reviewIntentions(ctxFor(w, ann));
    addItem(ann.inv, 'berries', 6);
    ann.needs.hunger = 4;
    const ctx = ctxFor(w, ann);
    decide(w, ann, 'test');
    expect(ann.activity?.kind, 'she eats; the reserve waits').not.toBe('deposit');
    expect(ctx.criticals).toContain('hunger');
  });
});
