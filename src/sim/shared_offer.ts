// Rules 248 (the growth stream, from the audit of 14 November 2026, `review_evidence/audit-20261114/AUDIT.md` F2-03): a shared proposal is offered where a workshop is planned.
//
// Rules 143 (shared_projects.ts) gave a generous person near company a public alternative to the private layout of a workshop: "Propose
// a shared mill, kiln, smithy...", the same site marked out as everyone's. The offer was added to `tryPlan` in options_work.ts. Since
// then workshops have been planned by `optPlanFacilities` in production.ts, and `tryPlan` plans only a lean-to, a hut, a cellar, a well
// and a storehouse, none of which may be shared, so `addSharedProjectOption` has had no caller that can reach it: no shared proposal can
// be generated at any rules version from 143 (one test calls it directly; no saved run has the key; `shared_yard.ts` of rules 201 and
// 202 marked the first timber yard shared by another road and was retired at 203).
//
// From 248 the workshop planner offers it: where it adds "Lay out a kiln" it also adds "Propose a shared kiln" for the people
// `addSharedProjectOption` already admits (generosity of .55, company in sight, no civic project of their own under way), with the
// same site, the same spot and the same walk, and the whole of rules 143 behind it (the site is public, nobody works it until a
// support conversation, a refusal takes nothing). The private option stays beside it.
//
// One switched part. Nothing is saved. Rich worlds at rules 248 and later only.
import type { Ctx } from './optutil';
import { runsRulesVersion } from './rulesversion';
import { addSharedProjectOption } from './shared_projects';
import type { BuildingType, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-shared-offer` plans workshops without the shared alternative, as before rules 248. */
export const sharedOfferOn = (): boolean => enabled;
export function setSharedOffer(on: boolean): void { enabled = on; }
export const hasSharedOffer = (world: World): boolean => enabled && world.settings.dynamics === 'rich' && runsRulesVersion(world, 248);

/** Called by the workshop planner right after it adds `plan_site:<type>`: adds the shared alternative for the people rules 143 admits. */
export function offerShared(ctx: Ctx, type: BuildingType): void {
  if (hasSharedOffer(ctx.world)) addSharedProjectOption(ctx, type, ctx.options.at(-1));
}
