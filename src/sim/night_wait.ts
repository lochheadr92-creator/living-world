// Night waiting is a calendar boundary, not repeatable work. Activity.data owns
// the saved boundary; this module owns eligibility and the lab-only ablation.
import { runsRulesVersion } from './rulesversion';
import { isRich } from './mood';
import type { Activity, World } from './types';
let enabled = true;
export const nightWaitBoundaryOn = (): boolean => enabled;
export function setNightWaitBoundary(on: boolean): void { enabled = on; }
export const hasNightWaitBoundary = (w: World): boolean => enabled && isRich(w) && runsRulesVersion(w, 27);
export function isBoundedNightWait(w: World, a: Activity): boolean {
 return hasNightWaitBoundary(w) && a.kind === 'rest' && typeof a.data.daylightAt === 'number';
}
