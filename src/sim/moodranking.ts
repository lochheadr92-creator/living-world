import type { Ctx, Option } from './optutil';
import { runsRulesVersion } from './rulesversion';

export const MOOD_SURVIVAL_FROM_VERSION = 5;
let enabled = true;
/** Lab-only ablation. Never saved; ordinary product runs keep this on. */
export function setMoodSurvivalGuard(on: boolean): void { enabled = on; }

const idle = (o: Option): boolean => o.kind === 'wander' || (o.kind === 'rest' && o.need !== 'warmth' && o.need !== 'safety');
const physical = (o: Option): boolean => !idle(o) && o.need !== null && ['hunger', 'thirst', 'warmth', 'safety', 'energy'].includes(o.need);
interface Scored { o: Option; neutral: number; s: number }

/**
 * Mood may reorder ordinary choices. It may not put idling ahead of physical relief that
 * ranked higher with mood disabled. Neutral includes ALL other nudges and the same jitter.
 * Move only offending idle alternatives down; keep the mood-ranked order of everything else.
 * Rest used to shelter from cold is physical relief, not idling. No option is removed.
 */
export function protectMoodSurvival(ctx: Ctx, ranked: Scored[]): void {
  if (!enabled || ctx.world.settings.dynamics !== 'rich' || !runsRulesVersion(ctx.world, MOOD_SURVIVAL_FROM_VERSION)) return;
  for (const entry of [...ranked].reverse()) {
    if (!idle(entry.o)) continue;
    const at = ranked.indexOf(entry);
    let after = at;
    for (let i = at + 1; i < ranked.length; i++) {
      const other = ranked[i];
      if (physical(other.o) && other.neutral > entry.neutral) {
        after = i;
        (ctx.moodProtected ??= new Set()).add(other.o);
      }
    }
    if (after > at) {
      ranked.splice(at, 1);
      ranked.splice(after, 0, entry);
    }
  }
}
