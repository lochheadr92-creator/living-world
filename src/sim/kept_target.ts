// A running journey must be scored against the same eligible alternatives even when its
// destination falls beyond a generator's short list. This adds at most one candidate;
// normal scoring, interruption rules and execution checks still decide what happens.
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import type { Ctx } from './optutil';
import type { World } from './types';

export const KEPT_TARGET_FROM_VERSION = 65;
let enabled = true;
export const keptTargetOn = (): boolean => enabled;
export function setKeptTarget(on: boolean): void { enabled = on; }
export const hasKeptTarget = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, KEPT_TARGET_FROM_VERSION);

/** Call only with candidates that have passed the generator's ordinary eligibility filters. */
export function keepCurrent<T>(ctx: Ctx, candidates: readonly T[], limit: number, keyOf: (candidate: T) => string): T[] {
  const picked = candidates.slice(0, limit);
  if (!hasKeptTarget(ctx.world)) return picked;
  const key = ctx.p.activity?.data.optKey;
  if (typeof key !== 'string') return picked;
  for (let i = limit; i < candidates.length; i++) {
    if (keyOf(candidates[i]) === key) { picked.push(candidates[i]); break; }
  }
  return picked;
}
