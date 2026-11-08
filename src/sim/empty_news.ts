// Rules 174: a strictly newer empty sighting of a food place can correct a positive belief without the
// ordinary 200-tick gap. An older or equal-time empty report cannot. A received report stays hearsay.
// Direct regrowth still replaces a stale empty memory through observe/learn, which already accepts an
// equal or newer personal sighting.
import { runsRulesVersion } from './rulesversion';
import type { Belief, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed). Off restores the 200-tick gap inside a rules-174 rich world. */
export const emptyCorrectionOn = (): boolean => enabled;
export function setEmptyCorrection(on: boolean): void { enabled = on; }
export const hasEmptyCorrection = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 174);

export function isFoodKind(kind: Belief['kind']): boolean {
  return kind === 'berry_bush' || kind === 'fruit_tree' || kind === 'wild_grain' || kind === 'fish_spot';
}

export function isEmptyFood(b: Belief): boolean {
  return isFoodKind(b.kind) && b.amount <= 0;
}

/** Whether a report should replace an existing belief. The comparison is the original observation time, not when it was received. */
export function acceptsToldReport(world: World, incoming: Belief, old: Belief): boolean {
  if (hasEmptyCorrection(world) && isEmptyFood(incoming) && old.amount > 0 && incoming.seen > old.seen) return true;
  return incoming.seen > old.seen + 200;
}
