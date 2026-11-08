// Rules 171: looking for someone at a home uses what the searcher was told or already knows about their own
// household, not the target's live household id. Before 171 whereIs matched any believed home whose household
// stamp equalled the target's current hhId.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-home` restores the live household match inside a rules-171 rich world. */
export const knownHomeOn = (): boolean => enabled;
export function setKnownHome(on: boolean): void { enabled = on; }
export const hasKnownHome = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 171);
