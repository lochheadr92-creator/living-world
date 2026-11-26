import type { Ctx, Option } from './optutil';
import { runsRulesVersion } from './rulesversion';
import type { Activity } from './types';

let enabled = true;
export const gatherReviewOn = () => enabled;
export const setGatherReview = (on: boolean) => { enabled = on; };

/** Several jobs can gather the same patch. Look up the current job before comparing scores. */
export function reviewedOffer(ctx: Ctx, a: Activity, key: string): Option | undefined {
  const first = ctx.options.find(o => o.key === key);
  if (!first || !enabled || a.kind !== 'gather' || a.phase !== 'travel' ||
      ctx.world.settings.dynamics !== 'rich' || !runsRulesVersion(ctx.world, 274)) return first;
  // Journey and care offers already carry their own keys. Hunger and stocking share the
  // ordinary food key, but only the former is a hunger activity. Materials carry their goal.
  if (!key.startsWith('gather:')) return first;
  return ctx.options.find(o => o.key === key && o.need === a.need &&
    (o.tag === 'food' || (o.tag === a.data.purpose && o.goal === a.goal)));
}
