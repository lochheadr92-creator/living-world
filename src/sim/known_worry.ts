// Rules 170: a worry about someone is kept, and can still be walked, after that person is gone from the
// register, until the worrier has learned the death or the worry itself is too old. Before 170 a missing
// person, or one with alive set false, dropped the visit. Being in the deceased list is not news.
// Starting the visit still finds them gone. That arrival does not teach the death.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-worry` restores the rules-169 drop inside a rules-170 rich world. */
export const knownWorryOn = (): boolean => enabled;
export function setKnownWorry(on: boolean): void { enabled = on; }
export const hasKnownWorry = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 170);
