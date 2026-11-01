import {worldDuration} from '../sim/time_text';
export {worldDuration} from '../sim/time_text';
import { legacyAgeText as agoText, secondsText } from '../sim/inspect';
import type { World } from '../sim/types';

export function observedDuration(ticks: number, version: number): string {
  return version >= 6 ? worldDuration(ticks) : secondsText(ticks);
}

export function observedAge(world: World, version: number, tick: number): string {
  if (version < 6) return agoText(world, tick);
  const elapsed = world.tick - tick;
  if (elapsed === 0) return 'just now';
  return elapsed < 0 ? `in ${worldDuration(-elapsed)}` : `${worldDuration(elapsed)} ago`;
}
