// Rules 282 (`docs/REVIEW_REPAIRS_20261128.md`): five repairs from the review of 28 November 2026 (pasted by Ryan; main 185c3ea0, rules 281).
// Findings 1 and 6 of that review were outside the simulation and were repaired without a rules number (commit 0fa737bf).
//
// Five separately switched parts (`rich-no-review-repairs`, `rich-no-review-repairs-<part>`):
//
//   chat   (finding 5) bedtime.ts part home kept anybody from starting a talk with a little one after dark by the option kinds 'converse' and 'argue',
//          but a chat is offered as 'socialize' (options_social.ts mkSocial) and becomes a converse only once the talk opens, so real chats passed.
//          From 282 a 'socialize' option aimed at a child under eight after dark is dropped unless its purpose is urgent (CHAT_URGENT).
//   route  (finding 2) a walker kept to a route planned before a building site was laid across it and walked through the site's solid tiles. From 282
//          the next step is checked: when it enters a tile that cannot be stood on from one that can, and is not the walk's own end, the route is
//          planned again (at most ROUTE_REPLANS times a walk; then as before).
//   jar    (finding 3) a jar carries its first JAR_WATER_UNITS of water without weight (economy.ts weightOf), but the room for water was reckoned at
//          full weight (roomFor), so a full pack with an empty jar could take none. From 282 the room for water counts the jar's free allowance.
//   loan   (finding 4) when a lender died the loan passed to the oldest living member of their household (tools.ts toolsOnDeath) but the borrower's
//          promise to return it still named the dead lender and lapsed. From 282 the promise is made over to the heir with the loan.
//   wolf   (finding 7) a wolf's failed route search was remembered as "unreachable" until the solid ground changed, but a search can fail by running
//          out of budget while costs (path wear) change. From 282 only a search that ran out of tiles is remembered, not one that ran out of budget.
//
// No draw, no saved field. Rich worlds at rules 282 and later only.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

export const REVIEW_FROM = 282;
/** socialize purposes that may still be aimed at a little one after dark (part chat) */
export const CHAT_URGENT: readonly string[] = ['request', 'info', 'warn', 'ask_info', 'check_in', 'offer', 'return_care', 'report', 'cancel_request', 'delay_request', 'cancel_meeting'];
/** how many times a walk may be planned again because a new solid tile lies ahead (part route) */
export const ROUTE_REPLANS = 3;

const on = { chat: true, route: true, jar: true, loan: true, wolf: true };
export type ReviewPart = keyof typeof on;
export const REVIEW_PARTS = Object.keys(on) as ReviewPart[];
export const reviewPartOn = (part: ReviewPart): boolean => on[part];
export function setReviewRepairs(enabled: boolean, part?: ReviewPart): void {
  if (part) on[part] = enabled;
  else for (const k of REVIEW_PARTS) on[k] = enabled;
}
export const hasReviewRepair = (w: World, part: ReviewPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, REVIEW_FROM);
