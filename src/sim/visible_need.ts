// Rules 166: how hungry or thirsty a stranger is, as far as a bystander can tell, is what their face and frame show: hungry, and past that starving;
// thirsty, and past that parched. Before 166 (options_social.ts optOffer) the spontaneous offer of food or water chose the food, how much of it and
// how urgent it was from the other person's exact hunger and thirst, figures that no sign carries. Under 166 perception adds `starving` (hunger
// under 20) and `parched` (thirst under 20) beside hungry and thirsty (describeSeenPerson), and optOffer reads the need those signs imply, in the
// convention rules 106 (remembered_need.ts needsFromSigns) already uses: just past the visible threshold, never the live figure.
import { runsRulesVersion } from './rulesversion';
import type { SeenEntity, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-visible-need` restores the rules-165 reads inside a rules-166 world. */
export const visibleNeedOn = (): boolean => enabled;
export function setVisibleNeed(on: boolean): void { enabled = on; }
export const hasVisibleNeed = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 166);

/** The thresholds at which the signs show; hungry (42) and thirsty (40) are perception.ts's own. */
export const STARVING_BELOW = 20;
export const PARCHED_BELOW = 20;

/** Hunger as a bystander can honestly take it: just inside the sign they see (starving, hungry), or fine. Only meaningful for a person who shows a need. */
export function visibleHunger(s: SeenEntity): number {
  return s.starving ? STARVING_BELOW - 1 : s.hungry ? 41 : 100;
}
export function visibleThirst(s: SeenEntity): number {
  return s.parched ? PARCHED_BELOW - 1 : s.thirsty ? 39 : 100;
}
