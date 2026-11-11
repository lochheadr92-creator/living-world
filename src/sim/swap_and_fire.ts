// Rules 202: a swap that feeds, and a fire kept for the gathering. Two separately switched parts, after the rules-162 pattern, from
// the mechanism census of 11 November 2026 (docs/MECHANISM_CENSUS_20261111.md) and its plan (docs/LIFE_PLAN_20261111.md).
//
// swap  optTrade (options_social.ts) scores "a swap could give me what I lack" at 14 plus a little for affinity, below any gathering
//       trip, even when the lack is food and the nearest food the person knows of is a long walk away: about a thousand swap options
//       per settlement were on the table in 25 days and about twenty were chosen. At 202, when what is lacked is food and the person's
//       hunger drive is pressing, the swap's score adds the walk it saves: the walking cost of reaching the nearest food they believe
//       in (relief.ts foodRelief), at most SWAP_RELIEF_CAP. A swap for wood or stone is scored as before. Recorded caution: rules 51
//       (docs/CUSTOMERS.md, the comment in optTrade) measured that swaps proposed were refused at the answer ("nothing to spare", "no
//       room to carry the swap"); this part changes only the proposer's ranking, and its removal arm is how the lab reads it.
// fire  The communal fire went out 23 times per settlement in 25 days, and every occasion and shared meal is held at it. Refuelling
//       (options_work.ts) is offered in daylight only once the fire is believed below 150 fuel. At 202, when an occasion is open or
//       due within GATHERING_LEAD ticks at that fire (and, for a funeral, the person knows the death), or the person's own called
//       meal is to be there, refuelling is offered from GATHERING_FUEL believed and the reason says so, with a fixed weight. Wood in
//       hand is still required. And a host whose own called meal is to be at such a fire, with no wood on them, may ask a neighbour
//       to keep it going: the request, the answer and the promise of responsibilities.ts, which until now only the laid up could make
//       (optRequest, options_social.ts).
//
// Rules 201 and earlier, authored worlds and a part switched off keep the old behaviour. The third thing the plan put in this batch,
// the remembered-emptiness question, is a measurement, not a rule: scripts/emptiness_probe.ts.
import { retiresYardAndSwap } from './home_first';
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

const on = { swap: true, fire: true };
export type SwapFirePart = keyof typeof on;
export const SWAP_FIRE_PARTS = Object.keys(on) as SwapFirePart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const swapFirePartOn = (part: SwapFirePart): boolean => on[part];
export function setSwapAndFire(enabled: boolean, part?: SwapFirePart): void {
  if (part) on[part] = enabled;
  else for (const k of SWAP_FIRE_PARTS) on[k] = enabled;
}
const rich202 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 202);
/** Rules 202 only: retired from 203 (home_first.ts), where the lab's verdict on this part is recorded. */
export const hasSwapWorth = (w: World): boolean => on.swap && rich202(w) && !retiresYardAndSwap(w);
export const hasGatheringFire = (w: World): boolean => on.fire && rich202(w);

/** The most a food swap's score may gain from the walk it saves. */
export const SWAP_RELIEF_CAP = 18;
/** What a food swap adds for the walk it saves: 0 before 202 or when hunger is not pressing; else the walking cost to known food, capped. */
export function swapReliefWorth(w: World, wantIsFood: boolean, hungerDrive: number, walkCostToFood: number): number {
  if (!hasSwapWorth(w) || !wantIsFood || hungerDrive <= 0) return 0;
  return Math.max(0, Math.min(SWAP_RELIEF_CAP, walkCostToFood));
}

/** Believed fuel below which a fire with a gathering called at it is worth feeding in daylight (150 without one, as before). */
export const GATHERING_FUEL = 400;
/** How long before an occasion opens its fire is fed for it, in ticks. */
export const GATHERING_LEAD = 600;
/** The fixed weight a gathering adds to feeding its fire. */
export const GATHERING_WEIGHT = 8;
/** The weight of a host's ask to have the fire kept for their meal (the laid-up ask is 18 and more). */
export const HOST_FIRE_ASK_WEIGHT = 16;
