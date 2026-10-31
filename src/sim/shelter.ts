// HOUSEHOLD SHELTER PLANS (rules version 7, rich worlds only).
//
// One bounded behaviour, and it closes one named gap: a household that has laid out a home for itself will now FETCH THE
// MATERIALS for it on purpose.
//
// WHAT WAS MISSING. Laying out a home already worked (options_work.ts optPlanBuild: a household with no shelter lays out a
// lean-to, a household in a lean-to lays out a hut), and so did building one, owning it and living in it (buildings.ts
// finishSite assigns `hh.homeId`; habitation.ts admits the household through the door). What was missing was the middle:
// DELIVERY WAS ONLY EVER OPPORTUNISTIC. `optSites` offers to carry material to a site only when the person ALREADY HAPPENS
// TO BE CARRYING what it needs; nothing made anybody go and get it. Measured on seed `river`, Normal, 8 days, before this
// module existed: of 8 hut sites laid out, 6 were finished, 1 sat untouched for five days and was abandoned under the
// stale-site rule (world.ts clearStaleSites) so its household had to start again, and 2 more stood "waiting for materials"
// at the end of the window. The chain existed; it leaked in one place.
//
// WHAT THIS ADDS. An ordinary private plan (intent.ts), of the same shape as mending a roof or putting food by:
//
//   our household has no proper home -> our home site is short 4 wood and 4 stone ->
//   go and gather stone -> carry it to the site -> (the ordinary build option finishes it)
//
// Nothing new is built underneath. The gathering is the ordinary gather option, the carrying is the ordinary site haul
// (`haul:<siteId>`, options_work.ts optSites), the building is the ordinary build option, the ownership is the ordinary
// `hh.homeId` on completion, and living in it is the ordinary habitation. The plan contributes exactly what a plan
// contributes: it keeps its step a candidate and nudges it by at most intent.ts NUDGE, and it speaks for the material
// (`wants`) so a wanted plank is not burned on the fire. Hunger, thirst, cold, a wolf and a promise all still outrank it.
//
// WHAT IT READS, AND WHAT IT REFUSES TO READ. Only this person's own beliefs: the home their household has, as they
// remember it, and the site their household has, as they remember it, including what they last saw it still needed. It
// never reads `world.sites`, never learns of a site nobody in the household has seen, and never consults the true
// remaining cost. A member who has not seen the site cannot plan for it; they may still be told of it by the ordinary
// conversation, which is how a site belief gets about.
//
// WHAT IT IS NOT. It does not lay out sites (that decision is unchanged), does not choose where to build, does not assign
// anybody to anything, does not promise anything to anybody, does not create or move material, and does not make a site
// finish. It plans one step ahead of the engine, like every other plan here. A household that cannot get stone still does
// not get a hut, and says so.
import { BUILD_DEF, DAY, isHomeType, isSolidHome } from './constants';
import { isRich } from './mood';
import { beliefsByKind } from './optutil';
import type { Ctx } from './optutil';
import { runsRulesVersion } from './rulesversion';
import { complementaryKind } from './household_supply';
import { promisedSupply } from './promised_supply';
import type { Belief, BuildingType, ItemKind, Items, Person, World } from './types';

/** the rules version at which household shelter plans start; nothing here applies to a world below it */
export const SHELTER_FROM_VERSION = 7;

/**
 * The lab switch, beside the world like the mood, stakes, plans, ask, learning, trade, preparation and defence switches:
 * module-level, never saved, never hashed, on unless the lab turns it off. With it off a version-7 world is a version-7
 * world in every other respect and simply nobody fetches materials for their household's home on purpose, which is what
 * `rich-no-shelter` is for. It does NOT touch laying out a site, building, ownership or habitation: those are older
 * behaviour, and an ablation that removed them would isolate nothing.
 */
let shelterPlans = true;
export function setShelterPlans(on: boolean): void {
  shelterPlans = on;
}
export const shelterPlansOn = (): boolean => shelterPlans;

/** Does this world run household shelter plans at all? Rich, at least version 7, and not switched off by the lab. */
export const plansShelter = (world: World): boolean => shelterPlans && isRich(world) && runsRulesVersion(world, SHELTER_FROM_VERSION);

/**
 * Does this world RECORD why a household is not laying a home out?
 *
 * Separate from `plansShelter` on purpose, and it is not the lab switch's business: the explanation is not the mechanism,
 * so `rich-no-shelter` keeps it (a viewer of that arm can still see why nobody is building) and removes only the plan.
 *
 * It is gated on the VERSION because the explanation is not free. The list of opportunities not taken is part of the
 * person's decision record, which is serialized and included in the deep state fingerprint - so adding an entry to it
 * changes saved state, even though it changes nothing anybody does. That makes it a versioned change like any other, not
 * a presentation detail: a version-6 world must come back exactly as it was recorded.
 */
export const explainsHousing = (world: World): boolean => isRich(world) && runsRulesVersion(world, SHELTER_FROM_VERSION);

/** how long a shelter plan is given before it lapses on its own; a home is days of work, not an afternoon */
export const SHELTER_PATIENCE = DAY * 3;

/** at most this much of one material is spoken for at a time: one trip's worth, not the whole cost of the building */
export const SHELTER_BATCH = 4;

/**
 * The home this household has, as this person remembers it - the solid one if they know of more than one. Identical in
 * spirit to provision.ts `homeStoreBelief`, but asked about shelter rather than storage, so it ranks by whether the place
 * is a solid home and not by how much it holds.
 */
export function ownHomeBeliefFor(p: Person): Belief | null {
  let best: Belief | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.hh !== p.hhId || !isHomeType(b.btype)) continue;
    if (!best || (isSolidHome(b.btype as BuildingType) && !isSolidHome(best.btype as BuildingType))) best = b;
  }
  return best;
}

/** Does this person believe their household already has a proper home? A lean-to is shelter, not a home you can live in. */
export function believesHoused(p: Person): boolean {
  const b = ownHomeBeliefFor(p);
  return !!b && isSolidHome(b.btype as BuildingType);
}

/**
 * The home site this household has, as this person remembers it: their own household's, of a home type, and the most
 * advanced one if somehow they remember two. A site they have never seen or been told of is not one they can plan for.
 */
export function ownHomeSiteBelief(p: Person): Belief | null {
  let best: Belief | null = null;
  for (const b of beliefsByKind(p, ['site'])) {
    if (b.hh !== p.hhId || !isHomeType(b.btype)) continue;
    if (!best || (b.progress ?? 0) > (best.progress ?? 0)) best = b;
  }
  return best;
}

/** What the site still wanted when this person last saw it, as they remember it. Never the world's true figure. */
export function remembersNeed(b: Belief): Partial<Items> {
  const out: Partial<Items> = {};
  for (const k of Object.keys(b.need ?? {}) as ItemKind[]) {
    const n = b.need?.[k] ?? 0;
    if (n > 0) out[k] = n;
  }
  return out;
}

export interface ShelterWant {
  /** the site the materials are for */
  aboutId: number;
  /** what this plan speaks for now: one material, one trip's worth */
  wants: Partial<Items>;
  /** everything the site was short of when last seen, for the words on the card */
  short: Partial<Items>;
  /** the kind of home being built, for the goal text */
  what: BuildingType;
  /** why, in the person's own terms */
  why: string;
  /** the tick by which it stops mattering */
  until: number;
}

/** "4 wood and 2 stone", from what the site was last seen to need */
export function shortText(short: Partial<Items>): string {
  const parts = (Object.keys(short) as ItemKind[]).map((k) => `${Math.ceil(short[k] ?? 0)} ${k}`);
  if (parts.length <= 1) return parts[0] ?? 'nothing';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** the label a person would use for the place their household lives now */
function homeWord(b: Belief | null): string {
  if (!b) return 'no shelter of its own';
  return `a ${BUILD_DEF[(b.btype ?? 'lean_to') as BuildingType].label}`;
}

/**
 * Would this person take on fetching material for their household's home, and on what grounds?
 *
 * Returns null in any world that does not run version 7, with the switch off, for a child, for somebody whose household
 * they believe is already properly housed, when they remember no home site of their own household's, and when the site
 * they remember wanted nothing. Everything it reads is a belief of this person's.
 *
 * It deliberately does NOT check whether the material can be got. Whether there is wood within reach is the gathering
 * option's business, and a plan that is short says so on the card - which is the honest failure this is meant to make
 * visible, rather than a reason never to try.
 */
export function shelterWanted(ctx: Ctx): ShelterWant | null {
  const { world, p } = ctx;
  if (!plansShelter(world)) return null;
  if (ctx.stage === 'child') return null;
  if (believesHoused(p)) return null;
  const site = ownHomeSiteBelief(p);
  if (!site) return null;
  const what = (site.btype ?? 'hut') as BuildingType;
  const short = remembersNeed(site);
  // rules 101 (promised_supply.ts): what somebody promised to bring for this site is not planned for again meanwhile
  for (const k of Object.keys(short) as ItemKind[]) { const promised = promisedSupply(world, p, k, site.id); if (promised) { const left = (short[k] ?? 0) - promised.amount; if (left > 0) short[k] = left; else delete short[k]; } }
  const kinds = Object.keys(short) as ItemKind[];
  if (!kinds.length) return null;
  // One material at a time, and at most one trip's worth of it: a plan that spoke for the whole cost of a hut would hide
  // eight wood from the fire and from everybody else's roof for days. The order is the site's own, which is the recipe's.
  // rules 100 (household_supply.ts): a material a household member said they are fetching for this site is left to them
  const k = complementaryKind(world, p, site.id, kinds);
  const take = Math.min(SHELTER_BATCH, Math.ceil(short[k] ?? 0));
  if (take <= 0) return null;
  const home = ownHomeBeliefFor(p);
  const why = `the household is still in ${homeWord(home)}, and their ${BUILD_DEF[what].label} wants ${shortText(short)}`;
  return { aboutId: site.id, wants: { [k]: take } as Partial<Items>, short, what, why, until: world.tick + SHELTER_PATIENCE };
}
