// Rules 200: room for company. Four separately switched parts, after the rules-162 pattern (shared_stone.ts), from the mechanism
// census of 11 November 2026 (docs/MECHANISM_CENSUS_20261111.md) and the plan drafted from it (docs/LIFE_PLAN_20261111.md).
// Every part is a gate, never a score: what happens more often must happen on its own once the gate allows it.
//
// approach  A third of approaches for company failed before any talk (twelve seeds, 25 days, rules 196): half on the stop-and-talk
//           roll of social.ts acceptsTalk ("was too busy to stop"), a fifth dropped by the asker's own review on the walk
//           ("something better came up"). The roll adds 0.12 for a request, an offer or an invitation and nothing for a child's ask
//           for practice, play or family time, or for a learner's ask for coaching. At 200 those asks carry the request's 0.12, and
//           an approach made through mkSocial (options_social.ts) is committed for its walk: the walk's estimate plus 20 ticks, at
//           least the old 40 and at most 240, so only danger or a critical need ends it before the answer.
// learning  The coaching ask (options_social.ts socialOptions) wanted hunger, thirst and energy all above 65, a window people were in
//           13 to 18 percent of their waking time. At 200 it is also open when none of the three drives is pressing at all (hunger at
//           or above 62, thirst 66, energy 46: DRIVE_BANDS), so the old window is kept and widened, never narrowed.
// meal      The invitation to eat together (meals.ts mealOptions) was made only between 0.50 and 0.68 of the day. At 200 the window
//           opens at 0.35. The table is still laid from food in the host's pack, so nothing else about the meal moves.
// market    The market (occasions.ts occasionsTick) was called only where a sound hall stood, and no hall stood in any of 36 measured
//           arms. At 200, with no hall, it is called at the fire, as every other occasion already is, once four households live here
//           and the day is the sixth or later.
//
// Rules 199 and earlier (in practice 196: 197 to 199 are unused), authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { ConvPurpose, World } from './types';

const on = { approach: true, learning: true, meal: true, market: true };
export type CompanyPart = keyof typeof on;
export const COMPANY_PARTS = Object.keys(on) as CompanyPart[];
/** Lab switches (never saved or hashed): one part, or with no part every one of the four. */
export const companyPartOn = (part: CompanyPart): boolean => on[part];
export function setCompany(enabled: boolean, part?: CompanyPart): void {
  if (part) on[part] = enabled;
  else for (const k of COMPANY_PARTS) on[k] = enabled;
}
const rich200 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 200);
export const hasApproachRules = (w: World): boolean => on.approach && rich200(w);
export const hasLearningGate = (w: World): boolean => on.learning && rich200(w);
export const hasMealWindow = (w: World): boolean => on.meal && rich200(w);
export const hasMarketFire = (w: World): boolean => on.market && rich200(w);

/** The asks that, at 200, are as hard to put off as a request for goods. */
const COMPANY_PURPOSES: readonly ConvPurpose[] = ['family_time', 'play_together', 'learn_foraging', 'learn_skill', 'learn_technique'];
/** What a request, an offer or an invitation has always added to the stop-and-talk roll. */
export const REQUEST_URGENCY = 0.12;
/** The extra a childhood or learning ask adds to the stop-and-talk roll: nothing before 200, the request's 0.12 at 200. */
export function companyUrgency(w: World, purpose: ConvPurpose): number {
  return hasApproachRules(w) && COMPANY_PURPOSES.includes(purpose) ? REQUEST_URGENCY : 0;
}

/** The commitment every approach had before 200, in ticks. */
export const APPROACH_COMMIT_BEFORE = 40;
export const APPROACH_COMMIT_MAX = 240;
/** How long an approach is committed for: 40 ticks before 200; at 200 the walk's estimate plus 20, between 40 and 240. */
export function approachCommit(w: World, walkTicks: number): number {
  if (!hasApproachRules(w)) return APPROACH_COMMIT_BEFORE;
  return Math.max(APPROACH_COMMIT_BEFORE, Math.min(APPROACH_COMMIT_MAX, Math.round(walkTicks) + 20));
}

/** The flat level the coaching ask wanted of hunger, thirst and energy before 200. */
export const LEARNING_GATE_BEFORE = 65;
/** Is the learner fed and rested enough to ask for coaching? `drives` are the person's own (0 = nothing pressing). */
export function learningGateOpen(w: World, needs: { hunger: number; thirst: number; energy: number }, drives: { hunger: number; thirst: number; energy: number }): boolean {
  if (Math.min(needs.hunger, needs.thirst, needs.energy) > LEARNING_GATE_BEFORE) return true;
  return hasLearningGate(w) && drives.hunger === 0 && drives.thirst === 0 && drives.energy === 0;
}

/** When in the day an invitation to eat together may be made: from 0.50 before 200, from 0.35 at 200, until 0.68 either way. */
export const MEAL_WINDOW_BEFORE = 0.5;
export const MEAL_WINDOW_200 = 0.35;
export const MEAL_WINDOW_END = 0.68;
export function mealWindowOpen(w: World, dayFraction: number): boolean {
  return dayFraction > (hasMealWindow(w) ? MEAL_WINDOW_200 : MEAL_WINDOW_BEFORE) && dayFraction < MEAL_WINDOW_END;
}

/** Households and day a hall-less settlement needs before its market is called at the fire. */
export const MARKET_FIRE_HOUSEHOLDS = 4;
export const MARKET_FIRE_FROM_DAY = 6;
/** May the market be called on its day? With a sound hall, always (as before); without one, at 200, once the settlement is big and old enough. */
export function marketMayBeCalled(w: World, soundHall: boolean, day: number): boolean {
  if (soundHall) return true;
  return hasMarketFire(w) && w.households.length >= MARKET_FIRE_HOUSEHOLDS && day >= MARKET_FIRE_FROM_DAY;
}
