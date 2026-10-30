// THE TARGET ALREADY BEING ACTED ON STAYS ON THE TABLE (rules version 60, rich worlds only).
//
// Measured first (scripts/time_budget.ts, docs/KEPT_TARGET.md): in three ordinary 30-day worlds about a third of every living
// person's ticks sat in activities later ended failed or interrupted, and "something better came up" interrupted 4,400 times
// a world against ~250 for danger and ~200 for a deadlier need. The largest single class was a gather trip dropped mid-walk
// for another gather (614 in river): in 390 of them the person still believed the source stocked, and in only 41 was the
// option they were acting on still among the options offered. The cause is structural: the source, water and store generators
// offer only their top two or three candidates by score, the score includes the walk, and `decision.ts currentUtility` scores
// a running activity whose option is not offered as 0, so a target walked toward falls off the table as distances and crowds
// shift and any option at all then counts as "clearly better". The person turns round for the next-best source, walks, and
// may turn round again.
//
// From version 60 a top-k cut keeps the candidate the person is already acting on (matched by the running activity's own option
// key, nothing else), so the review scores it by the same scorer as everything else, with its walk now shorter. Nothing is
// held on by force: a source believed empty, a spot they were driven off, a full pack or a crowd still remove the candidate or
// its option before the cut, the switch margin is unchanged, and danger and a deadlier need interrupt exactly as before. Below
// version 60, and with the lab switch `rich-no-kept-target`, every cut is the plain top-k it was.
import type { World } from './types';
import type { Ctx } from './optutil';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';

export const KEPT_TARGET_FROM_VERSION = 60;
let enabled = true;
export const keptTargetOn = (): boolean => enabled;
/** Lab switch `rich-no-kept-target`: plain top-k cuts, as before rules 60; no effect below 60. */
export function setKeptTarget(on: boolean): void {
  enabled = on;
}
export const hasKeptTarget = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, KEPT_TARGET_FROM_VERSION);

/**
 * The first `k` of `cands` (already sorted best first) plus, under rules 60, the one the person's running activity is about,
 * when it is further down the list. `keyOf` gives the option key a candidate would be offered under; the match is on the
 * activity's recorded option key alone.
 */
export function keepCurrent<T>(ctx: Ctx, cands: readonly T[], k: number, keyOf: (c: T) => string): T[] {
  const out = cands.slice(0, k);
  if (!hasKeptTarget(ctx.world)) return out;
  const key = ctx.p.activity?.data.optKey;
  if (typeof key !== 'string') return out;
  for (let i = k; i < cands.length; i++) {
    if (keyOf(cands[i]) === key) {
      out.push(cands[i]);
      break;
    }
  }
  return out;
}
