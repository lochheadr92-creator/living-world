// Rules 232 (the growth stream, `docs/GROWTH_PLAN.md` step 6): a builder who runs out goes for materials.
//
// Rules 227 held people to a job begun, and building was dropped as often after it as before. Measured why (rules 231,
// `scripts/job_drops.ts`, four settlements over eight days, `review_evidence/growth-20261113/builder-fetches/`): a builder may
// work only as far as the materials delivered allow (act_build.ts: six parts in a hundred, plus the share delivered). Of 425
// spells of building that reached the site, 291 ended with the builder standing there waiting for materials, after 60 to 68
// ticks of standing each; 85 did no work at all; 85 ended with the work done. Of the 124 spells counted as dropped, 118 were
// dropped while waiting. Nobody walks away from building they can do: the building runs out of things to build with, and the
// builder stands for most of the 80 ticks the handler allows, then leaves with nothing in mind about it.
//
// Two separately switched parts:
//
//   * LEAVE. A builder with nothing left to build with stands WAIT_FOR_MATERIALS ticks, not 80, and then stops, with the
//     reason as before ("no materials to work with (4 stone)"). They take a fresh look at the site as they go, so they know
//     what it lacks and do not turn straight back to it.
//   * FETCH. Having stopped for want of materials, for RAN_OUT_MEMORY ticks what that site lacks counts for RAN_OUT_WORTH more
//     to them than it otherwise would (options_work.ts materialNeeds, and the delivery of what they then carry): the one who
//     was just building there is the one who knows what it stopped for. One site is remembered, the last; the note is two
//     numbers in the person's cooldowns (`ranoutSite`, `ranoutUntil`), saved with them.
//
// Rich worlds at rules 232 and later only; rules 231 and earlier, authored worlds and a switch thrown keep the 80 ticks and
// the weights as they were.
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

/** how long a builder stands at a site with nothing to build with before stopping (80 before rules 232) */
export const WAIT_FOR_MATERIALS = 10;
export const WAIT_FOR_MATERIALS_BEFORE = 80;
/** how long the builder remembers which site stopped for want of materials */
export const RAN_OUT_MEMORY = 600;
/** what that site's missing materials count for more, to them, meanwhile */
export const RAN_OUT_WORTH = 10;

const on = { leave: true, fetch: true };
export type BuilderFetchesPart = keyof typeof on;
export const BUILDER_FETCHES_PARTS = Object.keys(on) as BuilderFetchesPart[];
/** Lab switches (never saved or hashed). */
export const builderFetchesPartOn = (part: BuilderFetchesPart): boolean => on[part];
export function setBuilderFetches(enabled: boolean, part?: BuilderFetchesPart): void {
  if (part) on[part] = enabled;
  else for (const k of BUILDER_FETCHES_PARTS) on[k] = enabled;
}
const runs = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, 232);
/** Whether any of this applies (the fresh look at the site on stopping rides on either part). */
export const hasBuilderFetches = (world: World): boolean => runs(world) && (on.leave || on.fetch);

/** LEAVE: the ticks a builder stands with nothing to build with before stopping. */
export function waitForMaterials(world: World): number {
  return on.leave && runs(world) ? WAIT_FOR_MATERIALS : WAIT_FOR_MATERIALS_BEFORE;
}

/** FETCH: the builder stopped at this site for want of materials; remember which, for a while. */
export function noteRanOut(world: World, p: Person, siteId: number): void {
  if (!on.fetch || !runs(world)) return;
  p.cooldowns.ranoutSite = siteId;
  p.cooldowns.ranoutUntil = world.tick + RAN_OUT_MEMORY;
}

/** FETCH: what this site's missing materials count for more to somebody who lately stopped building there for want of them. */
export function ranOutWorth(world: World, p: Person, siteId: number): number {
  if (!on.fetch || !runs(world)) return 0;
  return p.cooldowns.ranoutSite === siteId && (p.cooldowns.ranoutUntil ?? 0) > world.tick ? RAN_OUT_WORTH : 0;
}
