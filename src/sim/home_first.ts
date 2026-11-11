// Rules 203: a household's first roof does not wait for the settlement's site cap, and two parts of the life stream are retired.
//
// THE CAP. A settlement allows four open ordinary sites at once (`rules.ts` maxOpenSites and maxBasicSites: huts, lean-tos, wells and
// cellars together, whatever the number of households), checked when a layout is offered (`optPlanBuild`, options_work.ts: "too much
// already being built here at once") and again when it is marked out (`siteConflict`, act_build.ts: "too many projects under way
// already"). It exists because stone is production-limited and half-built sites starve one another, and it has no queue: whoever asks
// first holds a slot. In three lives lived at rules 202 in ordinary meadow (11 November 2026) Felix, an elder alone in a lean-to, was
// refused a hut three times in two days by it, while twelve households shared the four slots. The owner's instruction in chat the same
// day: the cap "needs adjusting if it is blocking the old man from getting a home built".
//
// At 203 a home layout that gives a household its first roof of that kind passes both checks: a hut for a household with no solid home
// (none at all, or a lean-to), and a lean-to for a household with no home at all. Everything else about the layout stands: one home
// layout per household and the footprint claims (layout_claims.ts), the hut's own knowledge gate (three trees and a rock), the person's
// own hunger and thirst, materials, work, and the abandonment of a site nobody works on. A second home, a cellar, a well and every
// workshop are capped as before, and a home layout past the cap is the only thing the capped household is offered there.
//
// THE RETIREMENT. The attribution lab of rules 202 (docs/LIFE_STREAM.md: twelve seeds, 25 days, one removal arm per part) put two
// parts on the wrong side, systematic inside their noise floors: the shared first timber yard of rules 201 (the first yard stood on day
// 14.3 against 9.3 without it, and 14 jobs were done at a yard against 20) and the walk a food swap saves of rules 202 (tools in hand 46
// against 53, projects done 58 against 65, people 31.3 against 32.8). By the plan's own rule a part that does not clear its floor in the
// right direction is switched off. Rules 201 and 202 are pinned, so the parts are not edited: from 203 they no longer apply
// (shared_yard.ts hasSharedYard, swap_and_fire.ts hasSwapWorth), and a world at 201 or 202 keeps them.
//
// Rules 202 and earlier, authored worlds and a switch thrown keep the old behaviour.
import { isSolidHome } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { BuildingType, World } from './types';

const on = { cap: true, retire: true };
export type HomeFirstPart = keyof typeof on;
export const HOME_FIRST_PARTS = Object.keys(on) as HomeFirstPart[];
/** Lab switches (never saved or hashed): `cap` off, a first home waits for the site cap again; `retire` off, the two retired parts apply at 203 as at 202. */
export const homeFirstPartOn = (part: HomeFirstPart): boolean => on[part];
export function setHomeFirst(enabled: boolean, part?: HomeFirstPart): void {
  if (part) on[part] = enabled;
  else for (const k of HOME_FIRST_PARTS) on[k] = enabled;
}
const rich203 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 203);
export const hasHomeFirst = (w: World): boolean => on.cap && rich203(w);
/** Are the shared first yard (rules 201) and the swap's saved walk (rules 202) retired in this world? From 203. */
export const retiresYardAndSwap = (w: World): boolean => on.retire && rich203(w);

/**
 * Does this layout give the household its first roof of that kind, so that the settlement's site cap does not hold it? `homeType` is
 * the type of the home the household has now (undefined for none). Only at 203; only a lean-to for the homeless or a hut for a
 * household without a solid home.
 */
export function firstHomePassesCap(w: World, layout: BuildingType, homeType: BuildingType | undefined): boolean {
  if (!hasHomeFirst(w)) return false;
  if (layout === 'lean_to') return homeType === undefined;
  if (layout === 'hut') return homeType === undefined || !isSolidHome(homeType);
  return false;
}

/** The same question asked where a layout is marked out, from the household's own record of its home. */
export function householdFirstHomePassesCap(w: World, layout: BuildingType, hhId: number): boolean {
  if (!hasHomeFirst(w) || !hhId) return false;
  const hh = w.households.find((h) => h.id === hhId);
  if (!hh) return false;
  const home = hh.homeId ? w.byId.get(hh.homeId) : undefined;
  return firstHomePassesCap(w, layout, home && home.ent === 'building' ? home.type : undefined);
}
