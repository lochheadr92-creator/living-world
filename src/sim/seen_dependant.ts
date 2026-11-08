// Rules 173: a dependant in sight is judged from the signs a bystander can see, not from their live hunger, thirst and warmth.
// The signs are the ones rules 166 already stores on a sight (starving, hungry, parched, thirsty, cold). Out of sight stays
// rules 106. This can blunt urgency: starving is read as 19, not the live figure. No benefit is claimed.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-seen-dependant` restores the live in-sight needs inside a rules-173 rich world. */
export const seenDependantOn = (): boolean => enabled;
export function setSeenDependant(on: boolean): void { enabled = on; }
export const hasSeenDependant = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 173);
