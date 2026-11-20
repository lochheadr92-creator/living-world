import { DRIVE_BANDS } from './constants';
import { servesIntent } from './intent';
import type { Ctx, Option } from './optutil';
import { runsRulesVersion } from './rulesversion';

let enabled = true;
export const batchPriorityOn = () => enabled;
export const setBatchPriority = (on: boolean) => { enabled = on; };

function canWait(ctx: Ctx, o: Option): boolean {
  if (o.key === 'rest:here') return ctx.p.needs.energy > DRIVE_BANDS.energy[1];
  return o.tag === 'social' && o.key.endsWith(':chat') && ctx.p.needs.social > DRIVE_BANDS.social[1];
}

/** A casual break can follow the next legal batch step. All other choices retain precedence. */
export function preferBatchStep(ctx: Ctx, ranked: Option[]): Option[] {
  if (!enabled || !ranked.length || ctx.world.settings.dynamics !== 'rich' ||
      !runsRulesVersion(ctx.world, 268) || !canWait(ctx, ranked[0])) return ranked;
  if (ctx.night || ctx.criticals.length || ctx.p.illness || ctx.p.health < 45 ||
      ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 45) return ranked;
  const batch = ctx.p.intentions.find(i => i.kind === 'batch' && i.status === 'active');
  if (!batch) return ranked;
  const next = ranked.findIndex(o => !canWait(ctx, o));
  if (next < 1 || !servesIntent(batch, ranked[next])) return ranked;
  return [ranked[next], ...ranked.slice(0, next), ...ranked.slice(next + 1)];
}
