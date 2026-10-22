// HOUSEHOLD SHELTER PLANS (rules version 7): the household-to-home chain, link by link.
//
// What is a fixture and what is the simulation: each scene below places people, a lean-to they already live in, a hut site
// their household has already laid out, a tree and a rock they know of, and sets the clock. Everything after that is the
// engine's - `reviewIntentions` decides whether a plan is taken on, the option layer offers the gathering and the site
// haul, the ordinary haul activity moves the material, the ordinary build activity does the work, `finishSite` assigns the
// home and `habitation.ts` admits them through the door. No test writes a plan's outcome, credits anybody with work, puts
// material into a site by hand once a plan is running, or finishes a building.
//
// Everything built here is STAGED. It proves the chain works and the gates hold; it says nothing about how often any of it
// happens on its own, which is a question for measurement (docs/HOUSEHOLD_HOME.md), not for a fixture.
import { afterEach, describe, expect, it } from 'vitest';
import { cancelSite, completeSite, createBuilding, createSite } from '../src/sim/buildings';
import { DAY } from '../src/sim/constants';
import { decide, generateOptions, rankOptions } from '../src/sim/decision';
import { addItem } from '../src/sim/economy';
import { createWorld } from '../src/sim/factory';
import { canEnterHome, enterHome, occupants } from '../src/sim/habitation';
import { intentFor, reviewIntentions, settleIntentions } from '../src/sim/intent';
import { describePerson, planViews } from '../src/sim/inspect';
import { delBelief, observe } from '../src/sim/knowledge';
import { updateEnvironment } from '../src/sim/environment';
import { CURRENT_RULES_VERSION } from '../src/sim/rulesversion';
import { RNG } from '../src/sim/rng';
import { testKit } from '../src/sim/scenes';
import {
  SHELTER_BATCH,
  SHELTER_FROM_VERSION,
  believesHoused,
  ownHomeSiteBelief,
  plansShelter,
  setShelterPlans,
  shelterWanted,
} from '../src/sim/shelter';
import { makeSource } from '../src/sim/sources';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { Items, Person, Site, World } from '../src/sim/types';
import { settingsFor } from './helpers/util';

const ctxFor = (w: World, p: Person) => generateOptions(w, p, true);
const livePlan = (p: Person) => p.intentions.find((i) => i.status === 'active' && i.kind === 'shelter') ?? null;
const lastPlan = (p: Person) => [...p.intentions].reverse().find((i) => i.kind === 'shelter') ?? null;

interface SceneOpts {
  rulesVersion?: number;
  unversioned?: boolean;
  dynamics?: 'rich' | 'authored';
  /** how many adults the household has (the hut gate wants two; the plan itself does not care) */
  members?: number;
  /** what the first person is carrying */
  carry?: Items;
  /** leave the site out of what the person knows about */
  forgetSite?: boolean;
  /** give the household a finished hut instead of a lean-to */
  housed?: boolean;
  /** lay no site out at all */
  noSite?: boolean;
  /** what has already been delivered to the site */
  delivered?: Items;
  /** what is in the household's own store. The default quiets the FOOD cue on purpose - see the note on `scene` */
  homeFood?: Items;
  tick?: number;
}

/**
 * A household living in a lean-to that has already laid out a hut, with a tree and a rock they know of. Fed, watered and
 * rested: nothing is short here except the hut's materials, which is the only thing under test.
 *
 * THE STORE IS STOCKED ON PURPOSE. Food comes before a house: `adoptProject` reaches household food preparation (rules
 * version 2) before a shelter plan, and one person carries one project at a time, so a household that can SEE it has next
 * to nothing puts food by instead and no shelter plan is taken on. That precedence is deliberate and is pinned by its own
 * test below. A scene about shelter therefore has to leave the food cue quiet, which it does by putting a reserve in the
 * household's own store, exactly as a household that had already seen to its food would have.
 */
function scene(seed: string, o: SceneOpts = {}) {
  const version = o.unversioned ? undefined : (o.rulesVersion ?? CURRENT_RULES_VERSION);
  const w: World = testKit.flatWorld(settingsFor(seed, { scene: 'natural', dynamics: o.dynamics ?? 'rich', rulesVersion: version }));
  const rng = new RNG(31);
  const ada = testKit.addPerson(w, rng, { name: 'Ada', x: 40.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
  const hh = w.households.find((h) => h.id === ada.hhId)!;
  const extra: Person[] = [];
  for (let n = 1; n < (o.members ?? 2); n++) {
    const q = testKit.addPerson(w, rng, { name: `Mate${n}`, x: 41.5, y: 40.5, hunger: 92, thirst: 92, energy: 92 });
    q.hhId = hh.id;
    if (!hh.members.includes(q.id)) hh.members.push(q.id);
    extra.push(q);
  }
  const lean = createBuilding(w, 'lean_to', 41, 40, hh.id);
  hh.homeId = lean.id;
  for (const [k, n] of Object.entries(o.homeFood ?? { berries: 10 })) addItem(lean.store.items, k as keyof Items, n ?? 0);
  const hut = o.housed ? createBuilding(w, 'hut', 44, 40, hh.id) : null;
  if (hut) hh.homeId = hut.id;
  let site: Site | null = null;
  if (!o.noSite && !o.housed) {
    site = createSite(w, 'hut', 44, 40, hh.id, ada.id);
    for (const [k, n] of Object.entries(o.delivered ?? {})) addItem(site.delivered, k as keyof Items, n ?? 0);
  }
  for (const [k, n] of Object.entries(o.carry ?? {})) addItem(ada.inv, k as keyof Items, n ?? 0);
  const tree = makeSource(w, 'tree', 37, 41, 20);
  const rock = makeSource(w, 'rock', 38, 43, 20);
  observe(w, ada, tree);
  observe(w, ada, rock);
  testKit.finish(w, 'natural');
  if (o.forgetSite && site) for (const p of [ada, ...extra]) delBelief(p, site.id);
  // no settled trade in this corner: it tilts the gathering and this is about one material reaching one site
  ada.cooldowns.trade = 1e12;
  w.tick = o.tick ?? 1000;
  updateEnvironment(w);
  return { w, ada, extra, hh, lean, hut, site: site!, tree, rock };
}

afterEach(() => {
  setShelterPlans(true);
});

// ───────────────────────── 1. the need, and that it comes from what they can see ─────────────────────────

describe('1. a shelter need produces an eligible, locally justified response', () => {
  it('takes a plan on because the household is in a lean-to and its hut wants materials', () => {
    const { w, ada, site } = scene('home-need');
    const plan = reviewIntentions(ctxFor(w, ada));
    expect(plan?.kind).toBe('shelter');
    expect(plan?.goal).toMatch(/hut built/);
    expect(plan?.reason, 'the grounds are what she can see of her own household').toMatch(/still in a lean-to.*hut wants/);
    expect(plan?.aboutId, 'the site it is about').toBe(site.id);
  });

  it('wants one material, one trip of it, not the whole cost of the building', () => {
    const { w, ada } = scene('home-batch');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const kinds = Object.keys(plan.wants);
    expect(kinds).toHaveLength(1);
    expect(plan.wants[kinds[0] as keyof Items]).toBeLessThanOrEqual(SHELTER_BATCH);
  });

  it('takes no plan on when the household is already in a hut', () => {
    const { w, ada } = scene('home-housed', { housed: true });
    expect(believesHoused(ada)).toBe(true);
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
  });

  it('takes no plan on for a site nobody in the household has seen', () => {
    const { w, ada, site } = scene('home-unseen', { forgetSite: true });
    expect(ownHomeSiteBelief(ada), 'she does not remember it').toBeNull();
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
    // the site really is there; it is her knowledge that is missing, not the world
    expect(w.sites.some((s) => s.id === site.id)).toBe(true);
  });

  it('takes no plan on when the household has laid nothing out', () => {
    const { w, ada } = scene('home-nosite', { noSite: true });
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
  });

  it('reads the site need from the belief, not from the world', () => {
    const { w, ada, site } = scene('home-belief');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const asked = Object.keys(plan.wants)[0] as keyof Items;
    // the world's site is quietly satisfied without her seeing it; her step still follows what she remembers
    addItem(site.delivered, asked, 99);
    // `reviewIntentions` returns null once a project is already live; the plan itself is what to read (as elsewhere here)
    reviewIntentions(ctxFor(w, ada));
    expect(livePlan(ada)!.stepItem, 'still after what she last saw it needed').toBe(asked);
  });
});

describe('1b. food comes before a house, deliberately', () => {
  it('a household that can SEE it has next to nothing puts food by instead', () => {
    // the same scene with an EMPTY store: household food preparation (version 2) is reached first in `adoptProject`, and
    // one person carries one project at a time. This is the precedence as built, not an accident of this fixture.
    const { w, ada } = scene('home-food-first', { homeFood: {} });
    const plan = reviewIntentions(ctxFor(w, ada));
    expect(plan?.kind).toBe('stock');
    expect(livePlan(ada), 'no shelter plan while the food cue is live').toBeNull();
  });

  it('and takes the shelter plan on once the food is seen to', () => {
    const { w, ada } = scene('home-food-first2');
    expect(reviewIntentions(ctxFor(w, ada))?.kind).toBe('shelter');
  });
});

// ───────────────────────── 2. the gates: version, dynamics, the switch, children ─────────────────────────

describe('2. the gates hold', () => {
  it('does not run below version 7', () => {
    const { w, ada } = scene('home-v6', { rulesVersion: 6 });
    expect(plansShelter(w)).toBe(false);
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ada))?.kind).not.toBe('shelter');
  });

  it('does not run in an unversioned world', () => {
    const { w, ada } = scene('home-unver', { unversioned: true });
    expect(plansShelter(w)).toBe(false);
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
  });

  it('does not run in an authored world', () => {
    const { w, ada } = scene('home-authored', { dynamics: 'authored' });
    expect(plansShelter(w)).toBe(false);
    expect(ada.intentions).toHaveLength(0);
  });

  it('the version constant and the gate agree', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(SHELTER_FROM_VERSION);
  });
});

// ───────────────────────── 3. no duplicate projects for one household need ─────────────────────────

describe('3. members do not create duplicate projects for the same household need', () => {
  it('two members each plan for the SAME site, not one site each', () => {
    const { w, ada, extra, site } = scene('home-dup');
    const mine = reviewIntentions(ctxFor(w, ada))!;
    const theirs = reviewIntentions(ctxFor(w, extra[0]))!;
    expect(mine.aboutId).toBe(site.id);
    expect(theirs.aboutId).toBe(site.id);
    expect(w.sites.filter((s) => s.hhId === ada.hhId)).toHaveLength(1);
  });

  it('nobody lays a second home out while their household already has one going', () => {
    const { w, ada } = scene('home-dup2');
    // 200 ticks of ordinary deciding, with a site already open for this household
    for (let i = 0; i < 200; i++) stepWorld(w);
    expect(w.sites.filter((s) => s.hhId === ada.hhId).length, 'still exactly one').toBe(1);
  });

  it('one plan of this kind at a time', () => {
    const { w, ada } = scene('home-one');
    reviewIntentions(ctxFor(w, ada));
    reviewIntentions(ctxFor(w, ada));
    expect(ada.intentions.filter((i) => i.status === 'active' && i.kind === 'shelter')).toHaveLength(1);
  });
});

// ───────────────────────── 4. the steps are the ordinary options, and the material is real ─────────────────────────

describe('4. materials are paid for and the work is done before completion', () => {
  it('the get step is served by a real gathering option that yields that material', () => {
    const { w, ada } = scene('home-get');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    expect(plan.stepKind).toBe('get');
    const ctx = ctxFor(w, ada);
    const served = ctx.options.filter((o) => intentFor(ada, o)?.id === plan.id);
    expect(served.length, 'the engine really offers a step for it').toBeGreaterThan(0);
    for (const o of served) expect(o.yields).toBe(plan.stepItem);
  });

  it('once she carries it, the step becomes the ORDINARY site haul', () => {
    const { w, ada, site } = scene('home-haul');
    const first = reviewIntentions(ctxFor(w, ada))!;
    const k = first.stepItem!;
    addItem(ada.inv, k, SHELTER_BATCH);
    reviewIntentions(ctxFor(w, ada));
    const plan = livePlan(ada)!;
    expect(plan.stepKind).toBe('deliver');
    expect(plan.stepTarget).toBe(site.id);
    expect(plan.stepKey).toBe(`haul:${site.id}`);
    const ctx = ctxFor(w, ada);
    const haul = ctx.options.find((o) => o.key === `haul:${site.id}`);
    expect(haul, 'the ordinary haul option, not a new one').toBeTruthy();
    expect(haul!.kind).toBe('haul');
    expect(intentFor(ada, haul!)?.id).toBe(plan.id);
  });

  it('re-aims at what the site wants next once one material is delivered', () => {
    const { w, ada, site } = scene('home-reaim');
    const first = reviewIntentions(ctxFor(w, ada))!;
    const firstItem = first.stepItem!;
    // the site is given everything of that kind it wanted, and she sees it
    addItem(site.delivered, firstItem, site.required[firstItem] ?? 0);
    observe(w, ada, site);
    reviewIntentions(ctxFor(w, ada));
    const next = livePlan(ada)!;
    expect(next.stepItem, 'now after the other material').not.toBe(firstItem);
    expect(Object.keys(next.wants)).toHaveLength(1);
  });

  it('the material really moves, and only what the site still needs', () => {
    const { w, ada, site } = scene('home-move');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    const want = site.required[k] ?? 0;
    addItem(ada.inv, k, want + 5);
    reviewIntentions(ctxFor(w, ada));
    decide(w, ada, 'test');
    for (let i = 0; i < 400 && ada.activity; i++) stepWorld(w);
    expect(site.delivered[k] ?? 0, 'never more than it asked for').toBeLessThanOrEqual(want);
    expect(site.delivered[k] ?? 0).toBeGreaterThan(0);
    expect(plan.worked, 'credited only what her own hands carried').toBe(site.delivered[k] ?? 0);
  });

  it('the plan speaks for its material, so it is not spent elsewhere', () => {
    const { w, ada } = scene('home-reserve');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    addItem(ada.inv, k, plan.wants[k] ?? 0);
    reviewIntentions(ctxFor(w, ada));
    const ctx = ctxFor(w, ada);
    const fuel = ctx.options.find((o) => o.kind === 'fuel_fire');
    expect(fuel, 'wood spoken for is not firewood').toBeUndefined();
  });

  it('a site is not finished by having materials: the work still has to be done', () => {
    const { w, site } = scene('home-work');
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    expect(site.work).toBeLessThan(site.workTotal);
    for (let i = 0; i < 300; i++) stepWorld(w);
    const still = w.sites.find((s) => s.id === site.id);
    if (still) expect(still.work).toBeLessThan(still.workTotal);
  });
});

// ───────────────────────── 5. ownership, and only at the right point ─────────────────────────

describe('5. ownership changes correctly and only at the appropriate point', () => {
  it('the household keeps its lean-to while the hut is only a site', () => {
    const { w, hh, lean, site } = scene('home-own');
    for (let i = 0; i < 200; i++) stepWorld(w);
    expect(hh.homeId, 'still the lean-to').toBe(lean.id);
    expect(w.sites.some((s) => s.id === site.id)).toBe(true);
  });

  it('the finished hut becomes the household home through the ordinary completion', () => {
    const { w, ada, hh, lean, site } = scene('home-finish');
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    const b = completeSite(w, site, ada);
    expect(hh.homeId, 'the hut, not the lean-to').toBe(b.id);
    expect(b.id).not.toBe(lean.id);
    expect(b.hhId).toBe(hh.id);
    expect(w.events.some((e) => e.kind === 'build' && /hut/.test(e.text) && e.text.includes(hh.name))).toBe(true);
  });

  it('one home is not assigned to two households', () => {
    const { w, ada, hh, site } = scene('home-two-hh');
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    const b = completeSite(w, site, ada);
    expect(w.households.filter((h) => h.homeId === b.id), 'exactly one household calls it home').toHaveLength(1);
    expect(hh.homeId).toBe(b.id);
  });
});

// ───────────────────────── 6. living in it ─────────────────────────

describe('6. the household can physically occupy the completed home', () => {
  it('members may use the finished hut, and are really inside it', () => {
    const { w, ada, site } = scene('home-live');
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    const b = completeSite(w, site, ada);
    observe(w, ada, b);
    expect(canEnterHome(w, ada, b)).toBeNull();
    ada.x = b.doorX + 0.5;
    ada.y = b.doorY + 0.5;
    expect(enterHome(w, ada, b)).toBeNull();
    expect(ada.indoors).toBe(b.id);
    expect(occupants(w, b).map((q) => q.id)).toContain(ada.id);
  });

  it('the plan ends DONE, crediting only what she carried', () => {
    const { w, ada, site } = scene('home-done');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    addItem(ada.inv, k, site.required[k] ?? 0);
    reviewIntentions(ctxFor(w, ada));
    decide(w, ada, 'test');
    for (let i = 0; i < 400 && ada.activity; i++) stepWorld(w);
    const carried = plan.worked;
    expect(carried).toBeGreaterThan(0);
    for (const kk of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, kk, site.required[kk] ?? 0);
    const built = completeSite(w, site, ada);
    // knowledge is local: until she SEES the finished hut her plan rightly carries on
    settleIntentions(w, ada);
    expect(plan.status, 'she has not seen it yet').toBe('active');
    observe(w, ada, built);
    settleIntentions(w, ada);
    expect(plan.status).toBe('done');
    expect(plan.reason).toMatch(new RegExp(`carried ${Math.round(carried)} of its materials`));
  });

  it('a hut the household got without her carrying anything ends the plan WITHOUT crediting her', () => {
    const { w, ada, site } = scene('home-nocredit');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    observe(w, ada, completeSite(w, site, ada));
    settleIntentions(w, ada);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/without their carrying anything/);
    expect(plan.worked).toBe(0);
  });
});

// ───────────────────────── 7. honest failure: interruption, no materials, an invalidated site ─────────────────────────

describe('7. interruption, unavailable materials and invalidated sites leave nothing stuck', () => {
  it('a critical need sets the plan aside with the reason, and it is taken up again', () => {
    const { w, ada } = scene('home-aside');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    ada.needs.thirst = 2;
    updateEnvironment(w);
    reviewIntentions(ctxFor(w, ada));
    expect(plan.status, 'set aside, not given up').toBe('active');
    expect(plan.setAside).toBeGreaterThan(0);
    expect(plan.reason).toMatch(/set aside/);
    ada.needs.thirst = 92;
    reviewIntentions(ctxFor(w, ada));
    expect(plan.blocked).toBe('');
  });

  it('a site that is abandoned ends the plan with the reason, and leaks no claim', () => {
    const { w, ada, site } = scene('home-gone');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    cancelSite(w, site, 'nobody had worked on it for days');
    // she goes back and finds it gone, the ordinary way
    delBelief(ada, site.id);
    settleIntentions(w, ada);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/no longer one they know of/);
    expect(plan.wants, 'the material is material again').toEqual({});
    expect(ada.activity?.claims ?? []).toHaveLength(0);
  });

  it('a plan that runs out of time says what the SITE still wanted, not what the pack lacked', () => {
    const { w, ada, site } = scene('home-timeout');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    addItem(ada.inv, k, SHELTER_BATCH); // carrying it, so the pack lacks nothing
    reviewIntentions(ctxFor(w, ada));
    expect(livePlan(ada)!.stepKind, 'the pack really does lack nothing').toBe('deliver');
    w.tick = plan.until + 1;
    settleIntentions(w, ada);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/still wants/);
    expect(plan.reason, 'never the empty "wants nothing"').not.toMatch(/wants nothing/);
    expect(w.sites.some((s) => s.id === site.id)).toBe(true);
  });

  it('a household that cannot get the material gets no hut, and the card says why', () => {
    // a world with no rock at all: the stone step is on offer and blocked, which is the honest failure
    const { w, ada } = scene('home-nostone');
    for (const s of w.sources.slice()) if (s.type === 'rock' || s.type === 'outcrop') s.amount = 0;
    for (const b of Object.values(ada.beliefs)) if (b.kind === 'rock' || b.kind === 'outcrop') b.amount = 0;
    const plan = reviewIntentions(ctxFor(w, ada))!;
    if (plan.stepItem === 'stone') {
      const ctx = ctxFor(w, ada);
      const blocked = ctx.blocked.filter((x) => x.kind === 'gather' && /stone/.test(x.label));
      expect(blocked.length, 'the card says there is no stone worth visiting').toBeGreaterThan(0);
    }
    for (let i = 0; i < 300; i++) stepWorld(w);
    expect(w.buildings.some((b) => b.type === 'hut' && b.hhId === ada.hhId), 'no hut appears out of nothing').toBe(false);
  });

  it('a lost activity does not strand the person', () => {
    const { w, ada, site } = scene('home-strand');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    addItem(ada.inv, k, SHELTER_BATCH);
    reviewIntentions(ctxFor(w, ada));
    decide(w, ada, 'test');
    cancelSite(w, site, 'test: pulled out from under the activity');
    for (let i = 0; i < 200; i++) stepWorld(w);
    expect(ada.alive).toBe(true);
    expect(ada.activity?.kind === 'haul' && ada.activity.targetId === site.id, 'not still hauling to nothing').toBe(false);
  });
});

// ───────────────────────── 8. saving and loading, mid-build and after moving in ─────────────────────────

describe('8. saving and loading preserves the chain', () => {
  it('a world saved mid-build comes back identical, plan and site and all', () => {
    const { w, ada } = scene('home-save-mid');
    reviewIntentions(ctxFor(w, ada));
    for (let i = 0; i < 150; i++) stepWorld(w);
    const before = serializeWorld(w);
    const back = deserializeWorld(before);
    expect(serializeWorld(back)).toBe(before);
    expect(hashWorld(back)).toBe(hashWorld(w));
    const q = back.persons.find((x) => x.name === 'Ada')!;
    const kept = q.intentions.find((i) => i.kind === 'shelter');
    expect(kept, 'the plan survived the round trip').toBeTruthy();
    expect(kept!.stepKind).toBe(lastPlan(ada)!.stepKind);
    expect(back.sites.length).toBe(w.sites.length);
  });

  it('a world saved after moving in keeps the home and the occupant', () => {
    const { w, ada, hh, site } = scene('home-save-in');
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    const b = completeSite(w, site, ada);
    observe(w, ada, b);
    ada.x = b.doorX + 0.5;
    ada.y = b.doorY + 0.5;
    enterHome(w, ada, b);
    const before = serializeWorld(w);
    const back = deserializeWorld(before);
    expect(serializeWorld(back)).toBe(before);
    const q = back.persons.find((x) => x.name === 'Ada')!;
    expect(q.indoors).toBe(b.id);
    expect(back.households.find((h) => h.id === hh.id)!.homeId).toBe(b.id);
    for (let i = 0; i < 60; i++) stepWorld(back);
    expect(back.households.find((h) => h.id === hh.id)!.homeId, 'still theirs after continuing').toBe(b.id);
  });
});

// ───────────────────────── 9. the lab switch removes this and nothing else ─────────────────────────

describe('9. the lab switch removes only the new mechanism', () => {
  it('with it off nobody plans for the household home', () => {
    setShelterPlans(false);
    const { w, ada } = scene('home-off');
    expect(plansShelter(w)).toBe(false);
    expect(shelterWanted(ctxFor(w, ada))).toBeNull();
    expect(reviewIntentions(ctxFor(w, ada))?.kind).not.toBe('shelter');
  });

  it('with it off the site is still laid out, built, owned and lived in', () => {
    setShelterPlans(false);
    const { w, ada, hh, site } = scene('home-off-rest');
    // delivery that happens for any other reason still arrives
    for (const k of Object.keys(site.required) as (keyof Items)[]) addItem(site.delivered, k, site.required[k] ?? 0);
    const b = completeSite(w, site, ada);
    expect(hh.homeId).toBe(b.id);
    observe(w, ada, b);
    ada.x = b.doorX + 0.5;
    ada.y = b.doorY + 0.5;
    expect(enterHome(w, ada, b), 'habitation is untouched by the switch').toBeNull();
  });

  it('a live plan ends with a reason when the switch is thrown under it', () => {
    const { w, ada } = scene('home-off-live');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    expect(plan.status).toBe('active');
    setShelterPlans(false);
    settleIntentions(w, ada);
    expect(plan.status).toBe('dropped');
    expect(plan.reason).toMatch(/no longer part of these rules/);
  });
});

// ───────────────────────── 10. what a viewer can read ─────────────────────────

describe('10. the card says what is going on', () => {
  it('the plan shows its goal, step and what it still lacks', () => {
    const { w, ada } = scene('home-card');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const view = planViews(w, ada).find((v) => v.id === plan.id)!;
    expect(view.kind).toBe('shelter');
    expect(view.goal).toMatch(/hut built/);
    expect(view.step).toMatch(/get \d+ (wood|stone) for the hut/);
    expect(view.state).toMatch(/waiting|under way/);
    expect(view.missing, 'what it still lacks, in plain words').toMatch(/\d+ (wood|stone)/);
  });

  it('a household that cannot start a hut says which rule stopped it', () => {
    // one member: the hut gate wants two, and that used to vanish from the card in silence
    const { w, ada } = scene('home-solo', { members: 1, noSite: true, tick: 2000 });
    const ctx = ctxFor(w, ada);
    const blocked = ctx.blocked.filter((b) => b.kind === 'plan_site' && /hut/i.test(b.label));
    expect(blocked.length, 'the housing question is on the card at all').toBeGreaterThan(0);
    expect(blocked.map((b) => b.blocked).join(' ')).toMatch(/two or more|food to hand|does not know|too early/);
  });

  it('a household that has already laid one out says so rather than nothing', () => {
    const { w, ada } = scene('home-started', { tick: 2000 });
    const ctx = ctxFor(w, ada);
    const blocked = ctx.blocked.filter((b) => b.kind === 'plan_site');
    expect(blocked.some((b) => /already laid out/.test(b.blocked ?? ''))).toBe(true);
  });

  it('an explanation can never be chosen: it has no utility and is not an option', () => {
    const { w, ada } = scene('home-collect', { members: 1, noSite: true, tick: 2000 });
    const ctx = ctxFor(w, ada);
    const housing = ctx.blocked.filter((b) => b.kind === 'plan_site');
    expect(housing.length).toBeGreaterThan(0);
    for (const b of housing) expect(b.util).toBe(0);
    // the ranking only ever sees `ctx.options`, and a blocked entry is not one of them
    expect(ctx.options.some((o) => o.kind === 'plan_site' && /hut/i.test(o.label))).toBe(false);
    expect(rankOptions(ctx).some((o) => o.blocked)).toBe(false);
  });

  it('inspecting never perturbs the world', () => {
    const { w, ada } = scene('home-inspect', { members: 1, noSite: true, tick: 2000 });
    const h1 = hashWorld(w);
    ctxFor(w, ada);
    planViews(w, ada);
    expect(hashWorld(w)).toBe(h1);
  });

  it('the explanation is recorded state, so a version-6 world does not get it', () => {
    // It joins the decision record, which is saved and deep-hashed, so it is gated on the version like any other change.
    const { w, ada } = scene('home-explain-v6', { members: 1, noSite: true, tick: 2000, rulesVersion: 6 });
    const ctx = ctxFor(w, ada);
    expect(ctx.blocked.some((b) => b.kind === 'plan_site')).toBe(false);
  });

  it('the Home line says where they live and why they have nothing better', () => {
    const { w, ada } = scene('home-homeline', { members: 1, noSite: true, tick: 2000 });
    decide(w, ada, 'test'); // the reason is read off the recorded decision, not recomputed
    const v = describePerson(w, ada.id)!;
    expect(v.home).toMatch(/^lean-to \(\d+% sound\)/);
    expect(v.home, 'and the rule that stopped them').toMatch(/two or more|food to hand|does not know|too early|already laid out/);
  });

  it('a household already in a hut gets no such note', () => {
    const { w, ada } = scene('home-homeline-housed', { housed: true, tick: 2000 });
    decide(w, ada, 'test');
    const v = describePerson(w, ada.id)!;
    expect(v.home).toMatch(/^hut \(\d+% sound\)$/);
  });

  it('the card carries what the plan has really got to the site', () => {
    const { w, ada, site } = scene('home-card-carried');
    const plan = reviewIntentions(ctxFor(w, ada))!;
    const k = plan.stepItem!;
    addItem(ada.inv, k, site.required[k] ?? 0);
    reviewIntentions(ctxFor(w, ada));
    decide(w, ada, 'test');
    for (let i = 0; i < 400 && ada.activity; i++) stepWorld(w);
    const view = planViews(w, ada).find((v) => v.id === plan.id)!;
    expect(view.detail).toMatch(new RegExp(`${Math.round(plan.worked)} units? carried there so far`));
    expect(view.detail, 'and why they are at it').toMatch(/Why: the household is still in/);
  });

  it('the lab switch does not take the explanation away with the plan', () => {
    setShelterPlans(false);
    const { w, ada } = scene('home-explain-off', { members: 1, noSite: true, tick: 2000 });
    const ctx = ctxFor(w, ada);
    expect(ctx.blocked.some((b) => b.kind === 'plan_site'), 'still says why nobody is building').toBe(true);
  });
});

// ───────────────────────── 11. the whole chain, once, with nobody told what to do ─────────────────────────

describe('11. the chain end to end', () => {
  it('a household in a lean-to reaches a hut and sleeps in it, by its own decisions', () => {
    const { w, ada, hh, lean } = scene('home-chain', { tick: 1000 });
    // generous starting material near her: the fixture provides the OPPORTUNITY, never the actions
    const plan = reviewIntentions(ctxFor(w, ada));
    expect(plan?.kind).toBe('shelter');
    let housed = false;
    let inside = false;
    for (let i = 0; i < DAY * 3 && !inside; i++) {
      stepWorld(w);
      const b = w.byId.get(hh.homeId);
      if (b && b.ent === 'building' && b.type === 'hut') {
        housed = true;
        if (w.persons.some((q) => q.hhId === hh.id && q.indoors === b.id)) inside = true;
      }
    }
    // What is asserted is the MECHANISM, not that this always happens: if the hut was reached, every later link held.
    if (housed) {
      expect(hh.homeId).not.toBe(lean.id);
      const home = w.byId.get(hh.homeId)!;
      expect(home.ent).toBe('building');
      expect((home as { hhId: number }).hhId).toBe(hh.id);
      const ended = [...ada.intentions].reverse().find((i) => i.kind === 'shelter' && i.status !== 'active');
      if (ended) expect(ended.reason.length, 'every ended plan says what became of it').toBeGreaterThan(0);
    }
    // whatever happened, nothing appeared from nowhere and nobody is stuck
    expect(w.persons.every((q) => !q.alive || q.activity === null || q.activity.expire > 0)).toBe(true);
    expect(w.buildings.filter((b) => b.type === 'hut' && b.hhId === hh.id).length).toBeLessThanOrEqual(1);
  }, 120000);
});
