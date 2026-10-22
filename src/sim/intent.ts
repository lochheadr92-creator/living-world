// Private plans (rich worlds only). A person who can see the evening coming may decide to do something about it, carry that decision
// across several separate activities, set it aside when something more pressing happens, and then take it up again, change it, or give
// it up for a stated reason.
//
// What this is NOT: it is not a scheduler, and it never makes anyone do anything. The engine still generates every option and still
// ranks them. A plan does two things only:
//   - it keeps a step it needs from being thrown away merely for scoring low (decision.ts: a plan's step stays a candidate), and
//   - it adds a bounded nudge to that step's score, small enough that hunger, thirst, cold or a wolf still win.
// Everything it reads is this person's own: their needs, the places they remember, the daylight they can see. Nothing is looked up in
// the world behind their back.
//
// In an authored world every function here is a no-op and `p.intentions` stays empty, so authored behaviour is untouched.
import { BUILD_DEF, DAY, TOOL_RECIPE, homeNoun, isHomeType } from './constants';
import { dayFraction } from './environment';
import { addLog } from './events';
import { isRich } from './mood';
import { beliefsByKind } from './optutil';
import { recentFailure } from './knowledge';
import {
  SHELTER_BATCH,
  believesHoused,
  ownHomeBeliefFor,
  ownHomeSiteBelief,
  plansShelter,
  remembersNeed,
  shelterWanted,
  shortText,
} from './shelter';
import {
  CARRY_TO_STORE,
  foodInBelief,
  foodToStore,
  homeStoreBelief,
  notePrepAdopted,
  notePrepEnded,
  notePrepStored,
  preparationWanted,
  preparesFood,
} from './provision';
import type { Ctx, Option } from './optutil';
import { MAX_INTENTIONS } from './types';
import type { Activity, BuildingType, Intention, ItemKind, Items, Person, Request, ToolKind, World } from './types';
import { hyp } from './util';

/** how much a plan may tilt a choice. Deliberately small: a plan is a preference, never an override. */
const NUDGE = 14;
/** the same number, for the ranking code, which has already asked `intentFor` which plan an option serves */
export const NUDGE_FOR_PLAN = NUDGE;
/** the evening: late enough to see the night coming, early enough to do something about it */
const EVENING_FROM = 0.62;
const EVENING_TO = 0.86;

/**
 * A switch beside the world, like the mood and stakes switches: module-level, never saved, never hashed, on unless the lab turns it
 * off. It exists so a counterfactual run can hold everything else about a rich world steady and remove only this mechanism.
 */
let nightPlans = true;
export function setNightPlans(on: boolean): void {
  nightPlans = on;
}
export const nightPlansOn = (): boolean => nightPlans;

/**
 * The same kind of switch for Stage D1's ask alone: with it off a person with a project still carries the plan, still works at it
 * and still gives it up with a reason, but never asks a neighbour for the material it lacks. Ordinary requests (a tool to borrow,
 * materials for a site, food) are untouched. It exists so the lab can hold planning steady and remove only the cooperation.
 */
let projectAsks = true;
export function setProjectAsks(on: boolean): void {
  projectAsks = on;
}
export const projectAsksOn = (): boolean => projectAsks;

export const activeIntent = (p: Person): Intention | null => p.intentions.find((i) => i.status === 'active') ?? null;

/**
 * How much of a material this person's own plans have spoken for. It is counted the same way a promise is (social.ts reservedFor):
 * derived from the live records, never a separate ledger to keep in step. The moment a plan ends its claim is gone, because the
 * plan clears what it wanted.
 */
/**
 * Which tool this person would want is decided by the option layer (options_work.ts wantedTool), which knows about recipes, skills
 * and what they have been doing. It registers itself here rather than being imported, because the option layer already depends on
 * this one and the other direction would close a loop.
 */
let wantedTool: ((ctx: Ctx) => ToolKind | null) | null = null;
export function setToolWant(fn: (ctx: Ctx) => ToolKind | null): void {
  wantedTool = fn;
}

export function plannedFor(p: Person, item: ItemKind): number {
  let n = 0;
  for (const i of p.intentions) if (i.status === 'active') n += i.wants[item] ?? 0;
  return n;
}

/**
 * How much of a material is free for some OTHER purpose of this person's own: what they carry, less what their own plans have
 * spoken for. This is what keeps a plan's materials from being spent twice - the wood meant for a basket is not also wood for the
 * storehouse's roof or the camp fire - and it needs no ledger: the claim is derived from the live plan, and the moment the plan ends
 * (which clears `wants`) the material is simply free again.
 *
 * Three things it deliberately does NOT do. It never hides material from the plan's own step, because that step is matched through
 * `servesIntent` and reads the pack directly. It never hides material from a PROMISE: an obligation to someone else outranks a
 * private plan, and the plan then truthfully reports that it is short again. And in an authored world there are no plans, so it is
 * the carried amount unchanged.
 */
export function freeOf(p: Person, item: ItemKind): number {
  if (!p.intentions.length) return p.inv[item] ?? 0;
  return Math.max(0, (p.inv[item] ?? 0) - plannedFor(p, item));
}

/**
 * The pack as it looks to an option that would spend it on something else: for code that takes a whole inventory (repairMaterial).
 * Only a person with live plans pays for the copy.
 */
export function freeInv(p: Person): Items {
  if (!p.intentions.length) return p.inv;
  const out: Items = { ...p.inv };
  for (const i of p.intentions) {
    if (i.status !== 'active') continue;
    for (const k of Object.keys(i.wants) as ItemKind[]) out[k] = Math.max(0, (out[k] ?? 0) - (i.wants[k] ?? 0));
  }
  return out;
}

// ───────────────────────── help someone else promised for a plan (Stage D1) ─────────────────────────
//
// A plan may be waiting on material a neighbour agreed to bring. None of that is a second record of the need: the plan still owns
// what it wants, the request owns the asking, and the promiser's own commitment owns the obligation. These two functions only read
// those three and say what they add up to - and in particular they never count a promise as material in hand.

/**
 * How much of a material one particular plan of this person's still lacks, counting only the share of the pack that is its own
 * (`shareOf`, adoption order). It is the honest answer to "how much is still missing for that project?", and it is what an answer to
 * a request must be measured against: a shortage of three is not covered by two promises.
 */
export function planShortfall(p: Person, planId: number, item: ItemKind): number {
  const i = p.intentions.find((x) => x.id === planId && x.status === 'active');
  if (!i) return 0;
  return Math.max(0, (i.wants[item] ?? 0) - shareOf(p, i, item));
}

/**
 * How much of an item has been asked for, or promised and not yet handed over, for one particular plan. What has arrived is in the
 * pack already and is not counted here twice.
 */
export function outstandingForPlan(world: World, from: number, item: ItemKind, planId: number): number {
  let n = 0;
  for (const r of world.requests) {
    if (r.from !== from || r.item !== item || r.planId !== planId) continue;
    if (r.status === 'pending') n += r.amount;
    else if (r.status === 'promised') {
      const owner = world.byId.get(r.to);
      const c = owner && owner.ent === 'person' ? owner.commitments.find((x) => x.id === r.commitmentId && x.status === 'active') : undefined;
      n += c ? Math.max(0, c.amount - (c.delivered ?? 0)) : 0;
    }
  }
  return n;
}

export interface PlanHelp {
  who: string;
  item: ItemKind;
  asked: number;
  /** still owed under a live promise (0 when there is none) */
  owed: number;
  delivered: number;
  status: Request['status'];
  note: string;
}

/** What asking for help came to, for this plan: one entry per request, newest last. Read off the requests and the promiser's own commitment. */
export function planHelp(world: World, p: Person, i: Intention): PlanHelp[] {
  const out: PlanHelp[] = [];
  for (const r of world.requests) {
    if (r.from !== p.id || r.planId !== i.id || !r.item) continue;
    const owner = world.byId.get(r.to);
    const c = owner && owner.ent === 'person' ? owner.commitments.find((x) => x.id === r.commitmentId) : undefined;
    out.push({
      who: owner && owner.ent === 'person' ? owner.name : 'someone',
      item: r.item,
      asked: r.amount,
      owed: c && c.status === 'active' ? Math.max(0, c.amount - (c.delivered ?? 0)) : 0,
      // what arrived is recorded on the request, because it may have been handed over on the spot with no promise in between;
      // the promiser's own commitment is the fallback for anything recorded only there
      delivered: r.delivered ?? c?.delivered ?? 0,
      status: r.status,
      note: r.note,
    });
  }
  return out;
}

/** the fraction of a day still to run before the light comes back, as this person can judge it from the sky */
export function untilDaylight(world: World): number {
  const frac = dayFraction(world.tick);
  return frac < 0.25 ? 0.25 - frac : 1 - frac + 0.25;
}

/** a home or a burning fire this person remembers, nearest first, with what they believe about it */
export function shelters(ctx: Ctx): { id: number; x: number; y: number; what: string; home: boolean; d: number }[] {
  const { world, p } = ctx;
  const out: { id: number; x: number; y: number; what: string; home: boolean; d: number }[] = [];
  for (const b of beliefsByKind(p, ['building'])) {
    const home = b.hh === p.hhId && isHomeType(b.btype);
    const lit = b.btype === 'fire' && (b.fuel ?? 0) - (world.tick - b.seen) * 0.85 > 100;
    if (!home && !lit) continue;
    out.push({ id: b.id, x: b.x, y: b.y, what: home ? `my ${homeNoun(b.btype)}` : 'the fire', home, d: hyp(b.x - p.x, b.y - p.y) });
  }
  return out.sort((a, b) => a.d - b.d);
}

/** Is this person about to have an uncomfortable night, as far as they can tell? Their own needs, their own remembered places. */
function nightLooksHard(ctx: Ctx): string {
  const { p } = ctx;
  const hours = untilDaylight(ctx.world) * DAY;
  // a rough drain they could expect from any night they have lived through
  const thirst = p.needs.thirst - hours * 0.018;
  const hunger = p.needs.hunger - hours * 0.012;
  const near = shelters(ctx)[0];
  if (!near || near.d > 14) return 'nowhere to shelter nearby for the night';
  if (thirst < 25) return 'thirsty enough that the night would be hard';
  if (hunger < 25) return 'hungry enough that the night would be hard';
  if (p.needs.warmth < 45) return 'too cold to face the night as things stand';
  return '';
}

/** needs this plan set out to have seen to by morning */
const FED = 42;
/**
 * First light, and the end of the morning: the one boundary a night plan is judged on, as a fraction of the day. A night plan's own
 * deadline (`until`) is set to first light PLUS this grace, so the deadline always falls INSIDE the morning window - the plan can
 * never run out of time before the night it was for has had its verdict. What used to go wrong was the order in which the two were
 * looked at, not where either boundary sat.
 */
const DAWN = 0.25;
const MORNING_ENDS = 0.6;
/** how long after first light a night plan may still be concluded before it simply runs out (also used to set `until`) */
const DAWN_GRACE = 240;
/** Is it the morning, the part of the day in which a night is judged on how it went? */
const inMorning = (world: World): boolean => {
  const frac = dayFraction(world.tick);
  return frac >= DAWN && frac <= MORNING_ENDS;
};
/**
 * The least time under shelter before the plan counts as having come to something. It is a floor on time actually spent, not a
 * proof of an unbroken night: a person may have sheltered in two stretches with an errand between them, and this cannot tell.
 */
const SHELTERED_ENOUGH = 240;

type Step = { kind: Intention['stepKind']; target: number; item: ItemKind | null; step: string; key: string | null; blocked: string };

/**
 * The step that would serve this plan now. The shelter is looked up afresh each time, so one that has stopped being a shelter (the
 * belief dropped on finding it gone) simply stops being the target and the step moves on.
 */
function stepFor(ctx: Ctx, i: Intention): Step {
  if (i.kind === 'tool') return toolStep(ctx, i);
  if (i.kind === 'repair') return repairStep(ctx, i);
  if (i.kind === 'stock') return stockStep(ctx, i);
  if (i.kind === 'shelter') return shelterStep(ctx, i);
  return nextStep(ctx);
}

function nextStep(ctx: Ctx): Step {
  const { p } = ctx;
  const near = shelters(ctx)[0];
  if (p.needs.thirst < FED) return { kind: 'drink', target: 0, item: null, step: 'drink before the night', key: null, blocked: '' };
  if (p.needs.hunger < FED) return { kind: 'eat', target: 0, item: null, step: 'eat before the night', key: null, blocked: '' };
  if (!near) return { kind: 'none', target: 0, item: null, step: 'find somewhere to shelter', key: null, blocked: 'no shelter remembered nearby' };
  if (near.d > 2.5) return { kind: 'goto', target: near.id, item: null, step: `get to ${near.what}`, key: null, blocked: '' };
  return { kind: 'stay', target: near.id, item: null, step: `stay at ${near.what} until it is light`, key: `shelter:${near.id}`, blocked: '' };
}


/**
 * Has a project come to something? Judged on the thing itself: a tool really in the pack, a roof the person has since seen to be
 * sound. Nothing here reads the world behind their back - the condition comes from their own belief, which is refreshed by being
 * there and working on it.
 */
function projectOutcome(world: World, p: Person, i: Intention): { status: 'done' | 'dropped'; reason: string } | null {
  if (i.kind === 'tool') {
    const have = (p.inv[i.makes as ItemKind] ?? 0) > 0;
    // finished only if their own hands made it (credited by the craft handler). A tool of that kind can be in the pack without
    // having been made: borrowed from a neighbour, taken off a workshop rack, or handed over by whoever was given it. That ends the
    // plan too - there is nothing left to want - but it is not an achievement, and it does not say they made anything.
    // Their own hands made it. If a neighbour brought some of the material, that is said as a separate clause: two different
    // people did two different things, and neither is given the other's credit.
    if (have && i.worked > 0) return { status: 'done', reason: `made the ${i.makes}${broughtText(world, p, i)}` };
    if (have) return { status: 'dropped', reason: `came by a ${i.makes} without making it` };
    if (world.tick > i.until) {
      // what was actually still missing when the time ran out, so the reason is diagnostic and not merely a shrug
      const short = stillNeededFor(p, i);
      const what = (Object.keys(short) as ItemKind[]).map((k) => `${short[k]} ${k}`).join(' and ');
      // and whether they were still waiting on help that never came: the promise is named, not blamed
      const waiting = planHelp(world, p, i).filter((h) => h.owed > 0);
      const owed = waiting.length ? `; still waiting on ${waiting.map((h) => `${h.owed} ${h.item} from ${h.who}`).join(' and ')}` : '';
      return { status: 'dropped', reason: what ? `never got round to the ${i.makes} (still short ${what}${owed})` : `had the makings for the ${i.makes} but never sat down to it` };
    }
    return null;
  }
  if (i.kind === 'stock') return stockOutcome(world, p, i);
  if (i.kind === 'shelter') return shelterOutcome(world, p, i);
  if (i.kind === 'repair') {
    const b = ownHomeBelief(p);
    if (!b) return { status: 'dropped', reason: 'there is no home of theirs left to mend' };
    const sound = (b.cond ?? 0) >= 70;
    // finished only if their own hands did it: a roof that became sound some other way is a reason to stop, not an achievement
    if (sound && i.worked > 0) return { status: 'done', reason: `mended it themselves (put back ${Math.round(i.worked)} of its condition)` };
    if (sound) return { status: 'dropped', reason: 'someone else saw to the roof first' };
    if (world.tick > i.until) {
      if (i.worked > 0) return { status: 'dropped', reason: `worked on it but it is still not sound (put back ${Math.round(i.worked)}, it is at ${Math.round(b.cond ?? 0)})` };
      const short = stillNeededFor(p, i);
      const what = (Object.keys(short) as ItemKind[]).map((k) => `${short[k]} ${k}`).join(' and ');
      return { status: 'dropped', reason: what ? `never got to the roof (still short ${what})` : 'had what it needed but never got to the roof' };
    }
    return null;
  }
  return null;
}

/**
 * Who brought material for this project, and how much actually arrived. Only deliveries that really happened are named: a promise
 * that was never kept says nothing here. The wording keeps the acts apart - someone else brought it, this person made the thing.
 */
function broughtText(world: World, p: Person, i: Intention): string {
  const got = planHelp(world, p, i).filter((h) => h.delivered > 0);
  if (!got.length) return '';
  return ` (${got.map((h) => `${h.who} brought ${h.delivered} of the ${h.item}`).join(', ')})`;
}

/**
 * At first light, what actually became of the plan? Only what the simulation recorded counts: time really spent in the shelter
 * activity (credited by that activity as it ended) and the needs the person actually has. Standing near a remembered shelter at
 * dawn proves nothing on its own - they may have arrived after sunrise, or gone hungry all night.
 */
function nightOutcome(world: World, p: Person, i: Intention): { status: 'done' | 'dropped'; reason: string } | null {
  if (i.kind !== 'night') return null; // only a night plan is judged by how the night went
  if (!inMorning(world)) return null; // not morning yet (or no longer): nothing to conclude
  if (i.sheltered < SHELTERED_ENOUGH) {
    return { status: 'dropped', reason: i.sheltered > 0 ? `only ${i.sheltered} ticks under shelter; the night mostly passed without it` : 'the night passed without shelter' };
  }
  const hungry = p.needs.hunger < FED;
  const thirsty = p.needs.thirst < FED;
  if (hungry || thirsty) {
    // what is known at dawn is how they are at dawn; it says nothing about how they were at three in the morning
    return { status: 'dropped', reason: `sheltered, but still ${hungry && thirsty ? 'hungry and thirsty' : hungry ? 'hungry' : 'thirsty'} at dawn` };
  }
  return { status: 'done', reason: `under shelter for ${i.sheltered} ticks of the night, fed and watered by morning` };
}

/**
 * Credit time really spent sheltering to the plan it served. Attribution is to the shelter the plan is ABOUT (shelterId), not to
 * whatever step it happens to be on, so a night spent asleep at the right place still counts while the plan is busy with thirst.
 * A no-op for anyone without a matching plan, so authored worlds and ordinary resting are untouched.
 */
export function creditShelter(p: Person, targetId: number, ticks: number): void {
  if (ticks <= 0 || !targetId || !p.intentions.length) return;
  // Only a plan for the night is about sheltering. A plan to mend the roof is about the same building, and resting under it is not
  // progress on mending it: crediting both would put one afternoon's sitting into two plans' records (kind-gated like creditRepair
  // and creditMade).
  for (const i of p.intentions) if (i.status === 'active' && i.kind === 'night' && i.aboutId === targetId) i.sheltered += ticks;
}

/**
 * Credit the time an activity really spent under shelter, at the two moments that time stops being counted: when the activity ends,
 * and when it is set aside (suspendActivity zeroes progress, so a stretch not credited there would simply be lost). Each tick of
 * progress therefore passes through here exactly once - never twice - and travel never does, because progress only starts counting
 * when the work phase begins.
 */
/**
 * Credit repair really done to the plan it served, at the point the condition actually rises (act_build.ts). Without this a plan
 * could call itself finished because the roof happens to be sound - when a neighbour mended it, or the belief was simply stale.
 */
export function creditRepair(p: Person, buildingId: number, gain: number): void {
  if (gain <= 0 || !buildingId || !p.intentions.length) return;
  for (const i of p.intentions) if (i.status === 'active' && i.kind === 'repair' && i.aboutId === buildingId) i.worked += gain;
}

/**
 * Credit a tool to the plan that meant to make it, at the one place a person's own hands produce one (act_build.ts, the craft
 * handler, right after the tool is minted). Without this the plan could only see that a tool of that kind is in the pack, which is
 * also true of one borrowed from a neighbour or taken off a workshop rack.
 */
export function creditMade(p: Person, kind: ToolKind): void {
  if (!p.intentions.length) return;
  for (const i of p.intentions) if (i.status === 'active' && i.kind === 'tool' && i.makes === kind) i.worked += 1;
}

/**
 * Time this person is spending under shelter for this plan right now and that has not been credited yet. Credit happens when an
 * activity ends or is set aside (`creditShelterFrom`), so a stay still running at first light holds its hours in `a.progress`.
 * The conditions are the same ones `creditShelterFrom` uses, so nothing can be counted by both.
 */
export function shelterInFlight(p: Person, i: Intention): number {
  const a = p.activity;
  if (!a || (a.kind !== 'rest' && a.kind !== 'sleep')) return 0;
  if (a.phase !== 'work' || a.progress <= 0) return 0;
  return a.targetId && a.targetId === i.aboutId ? a.progress : 0;
}

export function creditShelterFrom(p: Person, a: Activity): void {
  if (a.kind !== 'rest' && a.kind !== 'sleep') return;
  if (a.phase !== 'work' || a.progress <= 0) return;
  creditShelter(p, a.targetId, a.progress);
}


// ───────────────────────── making a tool, mending a home ─────────────────────────
//
// Both are projects: the thing someone means to end up with is several activities away, and the engine will not offer the last step
// (craft, repair) until the materials are already in the pack. The plan is what carries the want across the gap - it keeps the
// fetching steps in the running and says, truthfully, what is still missing.

/** how much of each material the plan still lacks, from what is actually in the pack */
function stillNeeded(p: Person, wants: Partial<Items>): Partial<Items> {
  const out: Partial<Items> = {};
  for (const k of Object.keys(wants) as ItemKind[]) {
    const short = (wants[k] ?? 0) - (p.inv[k] ?? 0);
    if (short > 0) out[k] = short;
  }
  return out;
}

/**
 * How much of one material a plan may count as its own, when the person is carrying more than one plan. The pack is shared out in
 * ADOPTION ORDER - the order the plans sit in the list - so an older plan's claim is settled before a younger one sees anything.
 * That order is bookkeeping, not precedence: it decides whose stone this is, never which plan the person works on next (that stays
 * with the ordinary ranking).
 *
 * Three things it guarantees, for any number of plans: nobody is allotted more than they want; the allotments of all the plans
 * together never exceed what is actually carried (so no claim invents stock, and none can go negative); and the answer depends only
 * on the list and the pack, so it is the same on a replay and after a save.
 */
function shareOf(p: Person, i: Intention, item: ItemKind): number {
  let pool = p.inv[item] ?? 0;
  for (const other of p.intentions) {
    if (other === i) break; // plans adopted before this one, and only those, have first call
    if (other.status !== 'active') continue;
    pool -= Math.min(other.wants[item] ?? 0, Math.max(0, pool));
  }
  return Math.min(i.wants[item] ?? 0, Math.max(0, pool));
}

/**
 * What this plan still lacks, counting only the share of the pack that is actually its own (`shareOf`). With one plan this is
 * exactly what it always was: the whole pack is its share.
 */
function stillNeededFor(p: Person, i: Intention): Partial<Items> {
  const out: Partial<Items> = {};
  for (const k of Object.keys(i.wants) as ItemKind[]) {
    const short = (i.wants[k] ?? 0) - shareOf(p, i, k);
    if (short > 0) out[k] = short;
  }
  return out;
}

/** the home this person would mend, as they remember it (never read from the world behind their back) */
function ownHomeBelief(p: Person) {
  return beliefsByKind(p, ['building']).find((b) => b.hh === p.hhId && isHomeType(b.btype)) ?? null;
}

function toolStep(ctx: Ctx, i: Intention): Step {
  const { p, world } = ctx;
  const short = stillNeededFor(p, i);
  const k = (Object.keys(short) as ItemKind[])[0];
  if (k) {
    // Someone may have promised to bring this. That changes nothing about the step - the material is not here, and they may still
    // fetch it themselves - but the step says so, because it is the truth about what they are waiting on.
    const owed = outstandingForPlan(world, p.id, k, i.id);
    const from = owed > 0 ? planHelp(world, p, i).filter((h) => h.item === k && h.owed > 0).map((h) => h.who) : [];
    const also = owed > 0 ? ` (${from.length ? from.join(' and ') : 'someone'} promised ${owed}, not yet delivered)` : '';
    return { kind: 'get', target: 0, item: k, step: `get ${short[k]} more ${k} for the ${i.makes}${also}`, key: null, blocked: '' };
  }
  return { kind: 'make', target: 0, item: null, step: `make the ${i.makes}`, key: `craft:${i.makes}`, blocked: '' };
}

function repairStep(ctx: Ctx, i: Intention): Step {
  const { p } = ctx;
  const short = stillNeededFor(p, i);
  const k = (Object.keys(short) as ItemKind[])[0];
  const b = ownHomeBelief(p);
  const what = b ? BUILD_DEF[(b.btype ?? 'hut') as BuildingType].label : 'home';
  if (k) return { kind: 'get', target: 0, item: k, step: `get ${short[k]} ${k} to mend the ${what}`, key: null, blocked: '' };
  if (!b) return { kind: 'none', target: 0, item: null, step: 'find the way home', key: null, blocked: 'no home remembered' };
  return { kind: 'mend', target: b.id, item: null, step: `mend the ${what}`, key: `repair:${b.id}`, blocked: '' };
}

/**
 * A food reserve has two steps and no third: gather food, or take what is carried home. Which one it is depends only on what
 * the person is carrying, because the deposit option needs a surplus over what they keep back for themselves
 * (options_work.ts optDepositFood keeps 2 or 3) and offering a trip home with two berries in the pack would be a waste of an
 * afternoon.
 *
 * Unlike a tool or a repair, this plan speaks for NO material: `wants` stays empty. Food in the pack is also what keeps the
 * person and their children alive, and `freeOf` would hide a reserve-bound apple from somebody about to faint. The reserve is
 * claimed only once it is in the store.
 */
function stockStep(ctx: Ctx, i: Intention): Step {
  const { p } = ctx;
  const home = homeStoreBelief(p);
  if (!home) return { kind: 'none', target: 0, item: null, step: 'find somewhere of their own to put food by', key: null, blocked: 'no home of their own that they know of' };
  const want = i.reserve ?? 0;
  const short = Math.max(0, want - foodInBelief(home));
  if (short <= 0) return { kind: 'none', target: home.id, item: null, step: 'the store has what it needs', key: null, blocked: '' };
  if (foodToStore(p) >= CARRY_TO_STORE) {
    return { kind: 'store', target: home.id, item: null, step: `take the food home (${short} more to put by)`, key: `deposit:${home.id}:food`, blocked: '' };
  }
  return { kind: 'forage', target: 0, item: null, step: `gather food to put by (${short} more)`, key: null, blocked: '' };
}

/**
 * Has a food reserve come to something? Judged on the store as the person believes it - refreshed every time they are there,
 * which depositing guarantees - and on what their own hands put in. A store that reached the target some other way (a
 * neighbour's gift, somebody else of the household bringing food home) ends the plan, because there is nothing left to want,
 * but it is not called an achievement and it is not credited to them.
 */
/** "1 unit", "3 units": the card and the record say how much was really put by, and one is not "1 units" */
const units = (n: number): string => `${Math.round(n)} unit${Math.round(n) === 1 ? '' : 's'}`;

function stockOutcome(world: World, p: Person, i: Intention): { status: 'done' | 'dropped'; reason: string } | null {
  // The rules stopped running this behaviour under the plan's feet: the lab switched it off at a fork, in a world that already
  // had preparations under way. The plan ends rather than carrying on invisibly, so an ablation really is an ablation.
  if (!preparesFood(world)) return { status: 'dropped', reason: 'putting food by is no longer part of these rules' };
  const home = homeStoreBelief(p);
  if (!home) return { status: 'dropped', reason: 'there is no home of theirs left to put anything by in' };
  const want = i.reserve ?? 0;
  const inStore = foodInBelief(home);
  if (inStore >= want && i.worked > 0) return { status: 'done', reason: `put ${units(i.worked)} of food by; the store holds ${inStore}` };
  if (inStore >= want) return { status: 'dropped', reason: `the store came to hold ${inStore} without their doing` };
  if (world.tick > i.until) {
    return i.worked > 0
      ? { status: 'dropped', reason: `put ${units(i.worked)} by, but the store is at ${inStore} of ${want} and the time is up` }
      : { status: 'dropped', reason: `never got any food put by (the store is at ${inStore} of ${want})` };
  }
  return null;
}

/**
 * Credit food really put into a home store to the reserve it served, at the one place food actually moves into a building
 * (act_resource.ts, the deposit handler, as each kind transfers). Without this a plan could call itself finished because the
 * store happens to be full - which is also true when somebody else filled it.
 */
export function creditStocked(p: Person, buildingId: number, units: number): void {
  if (units <= 0 || !buildingId || !p.intentions.length) return;
  for (const i of p.intentions) {
    if (i.status !== 'active' || i.kind !== 'stock' || i.aboutId !== buildingId) continue;
    i.worked += units;
    notePrepStored(units);
  }
}

/** Is this person carrying a live food reserve? The one question options_work.ts asks, so the forage option stays on offer for it. */
export function preparingReserve(p: Person): boolean {
  return p.intentions.some((i) => i.status === 'active' && i.kind === 'stock');
}

/** Would a tool be worth making, and is the only thing in the way the materials? */
function toolWanted(ctx: Ctx): { tool: ToolKind; wants: Partial<Items> } | null {
  const t = wantedTool ? wantedTool(ctx) : null;
  if (!t) return null;
  const r = TOOL_RECIPE[t];
  // a plan that does not exist yet may count only what no live plan of theirs has already spoken for
  const spare: Partial<Items> = { wood: freeOf(ctx.p, 'wood'), stone: freeOf(ctx.p, 'stone') };
  const short: Partial<Items> = {};
  for (const k of ['wood', 'stone'] as ItemKind[]) {
    const need = (k === 'wood' ? r.wood : r.stone) - (spare[k] ?? 0);
    if (need > 0) short[k] = need;
  }
  // nothing missing: the ordinary craft option already covers it, and no plan is needed
  if (!Object.keys(short).length) return null;
  return { tool: t, wants: { wood: r.wood, stone: r.stone } };
}

/** Does their own home need mending, as far as they know, with the material not yet to hand? */
/**
 * A household's home has three states and no fourth, and which one it is in depends only on what this person remembers of
 * the site and what they are carrying:
 *
 *   the site (as remembered) still wants something they are not carrying   ->  `get` it
 *   they are carrying what it wants                                        ->  `deliver` it, by the ORDINARY site haul
 *   the site (as remembered) wants nothing                                 ->  nothing for the plan to fetch; the ordinary
 *                                                                              build option is what finishes it
 *
 * The plan RE-AIMS every time this runs: `wants` is set from what the site was last seen to need, so a plan that has just
 * delivered its wood goes after the stone instead of hoarding wood the site no longer wants. That is also what keeps the
 * material reservation (`freeOf`) honest - a plan speaks for one trip's worth of one thing it is actually going to fetch.
 *
 * The site is looked up afresh from this person's beliefs each time, so one that has been finished or abandoned simply stops
 * being the target and `shelterOutcome` ends the plan with the reason.
 */
function shelterStep(ctx: Ctx, i: Intention): Step {
  const { p, world } = ctx;
  const site = ownHomeSiteBelief(p);
  if (!site) return { kind: 'none', target: 0, item: null, step: 'find the site again', key: null, blocked: 'no home site of their own that they know of' };
  const what = BUILD_DEF[(site.btype ?? 'hut') as BuildingType].label;
  const need = remembersNeed(site);
  const kinds = Object.keys(need) as ItemKind[];
  if (!kinds.length) {
    // Nothing left to fetch, as they last saw it. The plan does not finish here - the hut is not built - and it does not
    // pretend to be doing something: it says so, and the ordinary build option is what gets on with it.
    i.wants = {};
    return { kind: 'none', target: site.id, item: null, step: `the ${what} has its materials; it wants building`, key: null, blocked: '' };
  }
  // Re-aim at the first thing it wants, one trip's worth. The order is the site's own, which is the recipe's.
  const k = kinds[0];
  const take = Math.min(SHELTER_BATCH, Math.ceil(need[k] ?? 0));
  if ((i.wants[k] ?? 0) !== take || Object.keys(i.wants).length !== 1) i.wants = { [k]: take } as Partial<Items>;
  const short = stillNeededFor(p, i);
  const lack = short[k] ?? 0;
  if (lack > 0) {
    // Somebody may have promised to bring it. That changes nothing about the step - the material is not here, and they may
    // still fetch it themselves - but the step says so, because it is the truth about what they are waiting on.
    const owed = outstandingForPlan(world, p.id, k, i.id);
    const from = owed > 0 ? planHelp(world, p, i).filter((h) => h.item === k && h.owed > 0).map((h) => h.who) : [];
    const also = owed > 0 ? ` (${from.length ? from.join(' and ') : 'someone'} promised ${owed}, not yet delivered)` : '';
    return { kind: 'get', target: 0, item: k, step: `get ${lack} ${k} for the ${what} (it wants ${shortText(need)})${also}`, key: null, blocked: '' };
  }
  return { kind: 'deliver', target: site.id, item: k, step: `take ${take} ${k} to the ${what}`, key: `haul:${site.id}`, blocked: '' };
}

/**
 * Has a household's home come to something? Judged on what this person believes, and never on the world behind their back.
 *
 *  * done - they believe their household now has a solid home, AND their own hands carried some of its materials. Someone
 *    else's work finishing the hut is not their achievement, so it ends the plan without being credited to them.
 *  * dropped - the rules stopped running this behaviour under the plan's feet (the lab switched it off at a fork, so an
 *    ablation really is an ablation); the site is gone from their beliefs; or the time ran out, in which case the reason
 *    says what the SITE still wanted when they last saw it, which is the fact a viewer wants, not what the pack lacks.
 */
function shelterOutcome(world: World, p: Person, i: Intention): { status: 'done' | 'dropped'; reason: string } | null {
  if (!plansShelter(world)) return { status: 'dropped', reason: 'fetching for the household home is no longer part of these rules' };
  if (believesHoused(p)) {
    const what = BUILD_DEF[(ownHomeBeliefFor(p)?.btype ?? 'hut') as BuildingType].label;
    return i.worked > 0
      ? { status: 'done', reason: `the household has a ${what}, and they carried ${Math.round(i.worked)} of its materials` }
      : { status: 'dropped', reason: `the household got a ${what} without their carrying anything to it` };
  }
  const site = ownHomeSiteBelief(p);
  if (!site) return { status: 'dropped', reason: 'the site they were fetching for is no longer one they know of' };
  if (world.tick > i.until) {
    const need = remembersNeed(site);
    const what = BUILD_DEF[(site.btype ?? 'hut') as BuildingType].label;
    const left = Object.keys(need).length ? `it still wants ${shortText(need)}` : 'it still wants building';
    return i.worked > 0
      ? { status: 'dropped', reason: `carried ${Math.round(i.worked)} to the ${what}, but ${left} and the time is up` }
      : { status: 'dropped', reason: `never got anything to the ${what} (${left})` };
  }
  return null;
}

/**
 * Is this person's own live plan asking them to carry material to THIS site right now?
 *
 * It exists for one exception, and it is the same exception a promise already has (options_work.ts optSites): material a
 * plan has spoken for is not spare - that is the whole point of `wants`, and it is what keeps a wanted plank out of the
 * fire - but it must not be hidden from THE PLAN'S OWN delivery. Without this the plan reserves four wood and then cannot
 * see them when the time comes to carry them, which is a deadlock of its own making.
 */
export function planDeliveringTo(p: Person, siteId: number): Intention | null {
  if (!siteId) return null;
  for (const i of p.intentions) {
    if (i.status !== 'active' || i.stepKind !== 'deliver' || i.stepTarget !== siteId) continue;
    return i;
  }
  return null;
}

/**
 * Credit material really put into a home site to the shelter plan it served, at the one place material actually moves into
 * a site (act_resource.ts, the haul handler). Without this a plan could call itself finished because the household happens
 * to have a hut - which is also true when a neighbour built it.
 */
export function creditHauled(p: Person, siteId: number, units: number): void {
  if (units <= 0 || !siteId || !p.intentions.length) return;
  for (const i of p.intentions) {
    if (i.status !== 'active' || i.kind !== 'shelter' || i.aboutId !== siteId) continue;
    i.worked += units;
  }
}

function repairWanted(ctx: Ctx): { wants: Partial<Items>; aboutId: number } | null {
  const b = ownHomeBelief(ctx.p);
  if (!b || (b.cond ?? 100) >= 55) return null;
  if (freeOf(ctx.p, 'wood') > 0) return null; // they can start now with wood nothing else has spoken for; no plan needed
  return { wants: { wood: 1 }, aboutId: b.id };
}

/**
 * They died: whatever they still meant to do ends here. It is recorded as given up, because that is what the schema can say - there
 * is no "interrupted" for a private plan, and inventing one would change the save for one word (documented in docs/AUTONOMY.md).
 * Nothing is credited and nothing is finished: what their hands really did was credited while they were alive (the activity is
 * ended first, by `killPerson`), and `wants` is cleared so the material they were saving is material again.
 */
export function intentionsOnDeath(world: World, p: Person): void {
  for (const i of p.intentions) {
    if (i.status !== 'active') continue;
    i.status = 'dropped';
    i.ended = world.tick;
    i.reason = 'they died';
    i.step = '';
    i.stepKind = 'none';
    i.stepKey = null;
    i.blocked = '';
    i.wants = {};
  }
}

/**
 * Settle whatever has become due, for one person, on the tick it becomes due. This is the world's judgement of what happened, so it
 * must not wait for the person to wonder about it: `reviewIntentions` runs only when somebody decides (decision.ts), and when they
 * next decide depends on `p.nextThink`, on whether an activity is running, and on a jitter drawn from their own id - so two people
 * who had physically identical nights could be judged differently, or not at all. It is called from the world's person phase
 * (world.ts stepPerson), after the death check and before perception and deciding, for every living person in the same deterministic
 * order as everything else in the tick.
 *
 * The order inside is the contract, running from what happened, through what it means, to what merely ran out:
 *   1. account for the physical thing the person is doing NOW - a stay still under way has not been credited yet (credit lands when
 *      the activity ends or is set aside), and a night must be judged on the whole of it;
 *   2. conclude any plan whose moment of judgement has come - the morning for a night plan, the thing itself for a project;
 *   3. only then let a deadline end a plan that has no verdict of its own.
 *
 * It needs no option context and allocates nothing: a person with no plans costs one length check, and an authored world has none.
 */
export function settleIntentions(world: World, p: Person): void {
  if (!isRich(world) || !nightPlans || !p.alive || !p.intentions.length) return;
  for (const i of p.intentions) {
    if (i.status !== 'active') continue;
    if (i.kind === 'night' && inMorning(world)) creditShelter(p, i.aboutId, shelterInFlight(p, i));
    const made = projectOutcome(world, p, i);
    if (made) {
      i.status = made.status;
      i.ended = world.tick;
      i.reason = made.reason;
      i.step = '';
      i.stepKind = 'none';
      i.stepKey = null;
      i.wants = {}; // what it had spoken for is spare again the moment it ends
      if (i.kind === 'stock') notePrepEnded(made.status === 'done');
      addLog(world, p, 'work', `${made.status === 'done' ? 'Finished' : 'Gave up on'}: ${i.goal} - ${made.reason}.`);
      continue;
    }
    const out = nightOutcome(world, p, i);
    if (out) {
      i.status = out.status;
      i.ended = world.tick;
      i.reason = out.reason;
      i.step = '';
      i.stepKind = 'none';
      i.stepKey = null;
      addLog(world, p, 'need', out.status === 'done' ? `Got through the night under shelter (${i.sheltered} ticks of it).` : `Getting ready for the night came to little: ${out.reason}.`);
      continue;
    }
    if (world.tick > i.until) {
      i.status = 'dropped';
      i.ended = world.tick;
      i.reason = 'the night it was for has passed';
      i.step = '';
      i.stepKey = null;
      addLog(world, p, 'need', `Gave up on getting ready for the night: ${i.reason}.`);
    }
  }
}

/**
 * Called once per decision, before the options are ranked. Adopts a plan when the evening warrants one, keeps the current step up to
 * date, and finishes or gives up a plan with a reason. Returns the active plan, if any.
 */
export function reviewIntentions(ctx: Ctx): Intention | null {
  const { world, p } = ctx;
  if (!isRich(world) || !nightPlans) return null;
  const frac = dayFraction(world.tick);

  // Whatever had become due is settled on the tick it became due, by the world's own person phase. Settling again here costs
  // nothing (a plan with a verdict is skipped) and keeps this entry point honest for anyone who calls it directly: the outcome of a
  // plan never depends on whether this call happened.
  settleIntentions(world, p);
  for (const i of p.intentions) {
    if (i.status !== 'active') continue;
    // a critical need or a wolf is not a change of mind: the plan stands and says it was set aside
    if (ctx.criticals.length || ctx.dangers.length) {
      i.setAside++;
      i.blocked = ctx.dangers.length ? 'a wolf about' : `${ctx.criticals[0]} comes first`;
      i.reason = `set aside: ${i.blocked}`;
      continue;
    }
    const n = stepFor(ctx, i);
    if (i.blocked && !n.blocked) i.reason = 'taken up again';
    if (i.aboutId && n.target && i.aboutId !== n.target) {
      // two quite different things: the old one stopped being a shelter they know of, or a better one turned up
      const stillKnown = shelters(ctx).some((s) => s.id === i.aboutId);
      i.reason = stillKnown ? 'settled on a different shelter' : 'the shelter it was aiming for is no longer one they know of';
    }
    if (n.target) i.aboutId = n.target;
    i.step = n.step;
    i.stepKind = n.kind;
    i.stepTarget = n.target;
    i.stepItem = n.item;
    i.stepKey = n.key;
    i.blocked = n.blocked;
    // a step that keeps failing is worth giving up on, with the reason on the record rather than quietly retrying for ever
    if (n.target && recentFailure(world, p, n.target, 600)) {
      const f = recentFailure(world, p, n.target, 600)!;
      i.blocked = f.reason;
      if (f.count >= 3) {
        i.status = 'dropped';
        i.ended = world.tick;
        i.reason = `gave it up after ${f.count} tries: ${f.reason}`;
        addLog(world, p, 'work', `Gave up on ${i.goal}: ${f.reason}.`);
      }
    }
  }

  // Trim the record of plans that have ENDED, oldest first; a live plan is never thrown away by housekeeping.
  if (p.intentions.length >= MAX_INTENTIONS * 4) {
    const keep = MAX_INTENTIONS * 2;
    let over = p.intentions.length - keep;
    for (let n = 0; n < p.intentions.length && over > 0; ) {
      if (p.intentions[n].status === 'active') n++;
      else {
        p.intentions.splice(n, 1);
        over--;
      }
    }
  }
  // What somebody may be carrying at once: MAX_INTENTIONS plans, and at most one of each kind - in practice one plan for the night
  // and one project. Nothing here says which of them they work on next: that is the ordinary ranking's business, and a plan is only
  // ever a bounded preference in it.
  const live = p.intentions.filter((i) => i.status === 'active');
  if (live.length >= MAX_INTENTIONS) return live[0];
  // Children do not make plans of their own. They still seek shelter at night - that option is open to everyone (options_survival.ts
  // optShelter) - but looking a night ahead, weighing needs against daylight and carrying a goal across activities is adult work, and
  // the same `stage` the engine already uses to keep children off adult tasks decides it here.
  if (ctx.stage === 'child') return null;
  // Getting ready for the night belongs to the evening; making a tool or mending a roof is daytime work and is taken on whenever
  // the want and the shortage line up. Only the first is gated by the hour.
  const evening = frac >= EVENING_FROM && frac <= EVENING_TO;
  // one night plan at a time, and not a second one the same night
  const nightAlready = live.some((i) => i.kind === 'night');
  const nightAgain = p.intentions.some((i) => i.kind === 'night' && world.tick - i.since < DAY * 0.6);
  const why = evening && !nightAlready && !nightAgain ? nightLooksHard(ctx) : '';
  if (!why) return adoptProject(ctx);
  const n = nextStep(ctx);
  const made: Intention = {
    id: world.nextId++,
    kind: 'night',
    goal: 'be fed, watered and under shelter before dark',
    since: world.tick,
    until: world.tick + Math.round(untilDaylight(world) * DAY) + DAWN_GRACE,
    status: 'active',
    step: n.step,
    stepKind: n.kind,
    stepTarget: n.target,
    stepItem: n.item,
    stepKey: n.key,
    blocked: n.blocked,
    reason: why,
    setAside: 0,
    aboutId: n.target,
    wants: {},
    makes: '',
    sheltered: 0,
    worked: 0,
    ended: 0,
  };
  p.intentions.push(made);
  addLog(world, p, 'need', `Means to be ready for the night: ${why}.`);
  return made;
}


/**
 * A project worth taking on today: a tool that would make the work easier, or a roof that is going. Both are adopted only when the
 * materials are what stands in the way - when they are already to hand the ordinary option covers it and no plan is needed.
 */
function adoptProject(ctx: Ctx): Intention | null {
  const { world, p } = ctx;
  if (ctx.stage === 'child') return null;
  if (ctx.criticals.length || ctx.dangers.length) return null; // not while something is actually wrong
  // One project at a time. A plan for the night is a different kind of thing and does not stand in the way of one: somebody can
  // mean to make an axe and also mean to get through the night. The cap on how many plans in all is checked by the caller, and
  // again here because this is also reached directly.
  const live = p.intentions.filter((i) => i.status === 'active');
  if (live.length >= MAX_INTENTIONS) return null;
  if (live.some((i) => i.kind !== 'night')) return null;

  // How long since the last plan of a kind ended, used below: the same rule for every kind, counted from the END, because
  // "gave up on it, still short three" followed at once by "means to do it" is the same decision made again with nothing new
  // to go on.
  const onCooldown = (kind: Intention['kind']): boolean => {
    const last = [...p.intentions].reverse().find((i) => i.kind === kind);
    return !!last && world.tick - (last.status === 'active' ? last.since : last.ended || last.since) < DAY;
  };

  // Putting food by comes before a roof or an axe when its cue is live (rules version 2; `preparationWanted` returns null in
  // any world below it, so everything after this point is version 1's path, unchanged). The precedence is deliberate and
  // narrow: it applies only on the days the cue is open, and when the reserve is on its cooldown the older projects are
  // reached exactly as they always were.
  const stock = onCooldown('stock') ? null : preparationWanted(ctx);
  if (stock) {
    const made: Intention = {
      id: world.nextId++,
      kind: 'stock',
      goal: `put ${stock.target} units of food by for the household`,
      since: world.tick,
      until: stock.until,
      status: 'active',
      reason: stock.why,
      setAside: 0,
      aboutId: stock.aboutId,
      wants: {},
      makes: '',
      sheltered: 0,
      worked: 0,
      ended: 0,
      reserve: stock.target,
      cue: stock.cue,
      step: '',
      stepKind: 'none',
      stepTarget: 0,
      stepItem: null,
      stepKey: null,
      blocked: '',
    };
    const st = stepFor(ctx, made);
    made.step = st.step;
    made.stepKind = st.kind;
    made.stepTarget = st.target;
    made.stepItem = st.item;
    made.stepKey = st.key;
    made.blocked = st.blocked;
    p.intentions.push(made);
    notePrepAdopted(stock.cue);
    addLog(world, p, 'work', `Means to ${made.goal}: ${made.reason}.`);
    return made;
  }

  // A HOME COMES BEFORE A ROOF OR AN AXE (rules version 7; `shelterWanted` returns null in any world below it, so
  // everything after this point is the older path, unchanged). The precedence is deliberate and narrow: it applies only to a
  // household that this person believes has no proper home AND has already laid a site out for one, and when the plan is on
  // its cooldown the older projects are reached exactly as they always were. Mending the roof of a lean-to while the hut
  // that would replace it stands waiting for its stone is the wrong way round.
  const shelter = onCooldown('shelter') ? null : shelterWanted(ctx);
  if (shelter) {
    const made: Intention = {
      id: world.nextId++,
      kind: 'shelter',
      goal: `get the household's ${BUILD_DEF[shelter.what].label} built`,
      since: world.tick,
      until: shelter.until,
      status: 'active',
      reason: shelter.why,
      setAside: 0,
      aboutId: shelter.aboutId,
      wants: shelter.wants,
      makes: '',
      sheltered: 0,
      worked: 0,
      ended: 0,
      step: '',
      stepKind: 'none',
      stepTarget: 0,
      stepItem: null,
      stepKey: null,
      blocked: '',
    };
    const st = stepFor(ctx, made);
    made.step = st.step;
    made.stepKind = st.kind;
    made.stepTarget = st.target;
    made.stepItem = st.item;
    made.stepKey = st.key;
    made.blocked = st.blocked;
    p.intentions.push(made);
    addLog(world, p, 'work', `Means to ${made.goal}: ${made.reason}.`);
    return made;
  }

  const roof = repairWanted(ctx);
  const tool = roof ? null : toolWanted(ctx);
  if (!roof && !tool) return null;
  const kind: Intention['kind'] = roof ? 'repair' : 'tool';
  // One of a kind at a time, and not straight after the last one of that kind ended.
  if (onCooldown(kind)) return null;

  const base: Omit<Intention, 'step' | 'stepKind' | 'stepTarget' | 'stepItem' | 'stepKey' | 'blocked'> = {
    id: world.nextId++,
    kind,
    goal: roof ? 'get the roof sound again' : `make ${/^[aeiou]/.test(tool!.tool) ? 'an' : 'a'} ${tool!.tool}`,
    since: world.tick,
    until: world.tick + DAY * 2,
    status: 'active',
    reason: roof ? 'the roof is going and there is nothing to mend it with' : `it would make the work easier, and the makings are short`,
    setAside: 0,
    aboutId: roof ? roof.aboutId : 0,
    wants: roof ? roof.wants : tool!.wants,
    makes: roof ? '' : tool!.tool,
    sheltered: 0,
    worked: 0,
    ended: 0,
  };
  const made = base as Intention;
  const n = stepFor(ctx, made);
  made.step = n.step;
  made.stepKind = n.kind;
  made.stepTarget = n.target;
  made.stepItem = n.item;
  made.stepKey = n.key;
  made.blocked = n.blocked;
  p.intentions.push(made);
  addLog(world, p, 'work', `Means to ${made.goal}: ${made.reason}.`);
  return made;
}

/**
 * Does this option serve the plan's current step? Matched on what the step IS - its kind and the place it names - never on how the
 * step happens to be worded. An unrelated rest, or a sleep at some other bed, is not this plan's business and gets nothing from it.
 */
export function servesIntent(i: Intention | null, o: Option): boolean {
  if (!i || i.status !== 'active') return false;
  if (i.stepKey && o.key === i.stepKey) return true;
  switch (i.stepKind) {
    case 'drink':
      return o.need === 'thirst';
    case 'eat':
      return o.need === 'hunger';
    case 'goto':
    case 'stay':
      // the place matters: resting just anywhere, or sleeping at a different bed, is not this step
      return (o.kind === 'rest' || o.kind === 'sleep') && o.targetId !== 0 && o.targetId === i.stepTarget;
    case 'get':
      // only something that really puts that material in the pack; the option says so itself
      return o.yields !== undefined && o.yields === i.stepItem;
    case 'make':
      // THE tool this plan is about, not just any crafting. The option names what it would make in its key (options_work.ts
      // craftOption), and someone may well have a second craft on offer - making a pick is not a step toward making an axe.
      return o.kind === 'craft' && o.key === `craft:${i.makes}`;
    case 'mend':
      return o.kind === 'repair' && o.targetId === i.stepTarget;
    case 'forage':
      // Anything that really brings food in: foraging, fishing (a fish spot is gathered), harvesting a plot, hunting. Matched
      // on the ACTIVITY, not on `o.yields`, because the food options do not declare one - and making them declare one would
      // change what version-1 worlds do, since the ask weighs `yields` when it decides whether to ask for food at all
      // (options_social.ts). Eating is deliberately not here: filling yourself is not filling the store.
      return (o.kind === 'gather' && o.tag === 'food') || o.kind === 'harvest' || o.kind === 'hunt';
    case 'store':
      // putting goods down at THIS store, not at the storehouse or at a site
      return o.kind === 'deposit' && o.targetId !== 0 && o.targetId === i.stepTarget;
    case 'deliver':
      // carrying material to THIS site, not to any site that happens to want the same thing. The step also names the
      // option by key (`haul:<siteId>`), which is matched before this switch is reached; this is the belt to that brace.
      return o.kind === 'haul' && o.targetId !== 0 && o.targetId === i.stepTarget;
    default:
      return false;
  }
}

/**
 * The plan, if any, that this option would be a step of. Someone may be carrying more than one (MAX_INTENTIONS) - typically a
 * project and, come the evening, getting ready for the night - and each of them is entitled to have its own step recognised, so
 * this asks every live plan rather than only the first.
 */
export function intentFor(p: Person, o: Option): Intention | null {
  for (const i of p.intentions) if (i.status === 'active' && servesIntent(i, o)) return i;
  return null;
}

/**
 * The plan, if any, whose step the activity someone is running was chosen to be. The decision marks it where the choice is made
 * (decision.ts), and that mark is the whole of it: an activity chosen for the hut is not this plan's step merely because it will
 * bring back the same material. It is what lets the inspector tell a step UNDER WAY from one only settled on, and a mark left by a
 * plan that has since ended counts for nothing.
 */
export function planOfActivity(p: Person, a: Activity): Intention | null {
  for (const i of p.intentions) if (i.status === 'active' && a.data.forPlan === i.id) return i;
  return null;
}

/** the bounded tilt a plan gives its own step */
export function intentBonus(i: Intention | null, o: Option): number {
  return servesIntent(i, o) ? NUDGE : 0;
}

/**
 * Why a choice is a step of a plan, in words, for the record a decision leaves behind (decision.ts `because`). This is about
 * CHOOSING the step and nothing else: it is written when the option is picked, says which plan and which step, and makes no claim
 * that the step has got anywhere. Doing it is the activity's own business (and the plan view says whether it is under way), and
 * finishing the project is a third thing again, reported with its own reason when the plan ends.
 */
export function planReason(i: Intention | null, o: Option): string {
  return servesIntent(i, o) ? `a step toward “${i!.goal}”: ${i!.step || 'this'}` : '';
}
