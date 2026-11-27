import { DAY } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { Belief, World } from './types';

// Candidate: share only recent local signs, never an unseen water quantity.
export const WATER_WARNING_FROM = 261;
let enabled = true;
export const waterWarningOn = (): boolean => enabled;
export function setWaterWarning(value: boolean): void { enabled = value; }
export const hasWaterWarning = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, WATER_WARNING_FROM);
export function isWaterWarning(w: World, b: Belief): boolean {
  const age = w.tick - b.seen;
  return hasWaterWarning(w) && b.kind === 'water' && (b.waterSupply === 'low' || b.waterSupply === 'dry') && age >= 0 && age < DAY / 2;
}
