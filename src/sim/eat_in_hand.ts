// Rules 158: a person serving their hunger some other way (gathering, fishing, asking) stops to eat food already in their
// own pack when eating it now scores higher than the way they are going about it. Ordinary origin
// (review_evidence/hungry-gatherer-20261105): in four 10-day worlds, hungry people (hunger < 25) holding food were sampled
// gathering to ease hunger 209 times against 22 times eating from the pack (Eli, a child, caught a fish at hunger 8 and
// fished on to 0; Delia, offered "Eat what I am carrying" at 87 against a gather worth about 70, gathered on from 19 to 15).
// Eating and gathering serve the same need, so the deadlier-need interruption in reviewActivity never applied, and the
// gather's commitment and progress bonus outbid a better way of meeting the same need. Only the existing eat-from-pack
// option is used, so its household keep for dependants still applies; filters for a deadlier critical need (thirst) and
// danger, and meals already under way, keep their precedence. A first version that acted only below the critical hunger
// line (14) barely fired in ordinary worlds and is retained in the evidence.
import {runsRulesVersion} from './rulesversion';
import type {Ctx,Option} from './optutil';
import type {Activity,World} from './types';

let enabled=true;
export const eatInHandOn=():boolean=>enabled;
export const setEatInHand=(on:boolean):void=>{enabled=on;};
export const hasEatInHand=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,158);

export const EAT_IN_HAND_REASON='food in my pack would ease my hunger sooner';
const MEALS=new Set<Activity['kind']>(['eat','eat_store','attend_meal','host_meal']);

/** The eat-from-pack option that should replace this hunger-serving activity now, if any. Pure. */
export function eatInHand(w:World,a:Activity,ctx:Ctx,ranked:Option[]):Option|undefined{
 if(!hasEatInHand(w)||a.need!=='hunger'||MEALS.has(a.kind))return undefined;
 const eat=ranked.find(o=>o.kind==='eat');if(!eat)return undefined;
 // the current way's own score, without the commitment and progress bonus (decision.ts currentUtility)
 // (when that way is no longer offered at all, the ordinary review already decides; this rule stays out of it)
 const own=ctx.options.find(o=>o.key===a.data.optKey);
 return own&&eat.util>own.util?eat:undefined;
}
