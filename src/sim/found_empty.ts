// Rules 161: a gatherer who turns away because the place now looks empty says so, instead of "something better came up".
// Ordinary origin (review_evidence/interrupted-work-20261105): in four 25-day Normal worlds (rules 160) hungry gatherers ended
// 2,074 hunger gathers with "something better came up" after the review; for 1,270 of them (61%) the cause was not a better
// option but the person's own gathering target dropping out of their options because they now believed it empty (they had
// walked into sight of a patch that others had picked clean). The reason text only; the outcome stays "interrupted", so
// failure memory, cooldowns and pay learning behave exactly as before.
import {sourceUsable} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Ctx} from './optutil';
import type {Activity,World} from './types';

let enabled=true;
export const foundEmptyOn=():boolean=>enabled;
export const setFoundEmpty=(on:boolean):void=>{enabled=on;};
export const hasFoundEmpty=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,161);

export const FOUND_EMPTY_REASON='the place looked empty';

/** Is this gather being left because its own target is no longer offered, the person now believing it empty? Pure. */
export function foundEmpty(w:World,a:Activity,ctx:Ctx):boolean{
 if(!hasFoundEmpty(w)||a.kind!=='gather'||a.targetType!=='source')return false;
 const key=a.data.optKey;if(typeof key!=='string'||ctx.options.some(o=>o.key===key))return false;
 const belief=ctx.p.beliefs[a.targetId];if(!belief)return false;
 const usable=sourceUsable(ctx,belief,1);
 return !usable.ok&&usable.est<1;
}
