import { DAY } from '../sim/constants';
import { agoText, secondsText } from '../sim/inspect';
import type { World } from '../sim/types';

/** World-clock duration, independent of playback speed. Minute precision is an estimate. */
export function worldDuration(ticks: number): string {
  if (ticks <= 0) return '0 world min';
  const minutes = Math.round(ticks * 1440 / DAY);
  if (minutes < 1) return 'under 1 world min';
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60), mins = minutes % 60;
  if (days) return `${days} world ${days === 1 ? 'day' : 'days'}${hours ? ` ${hours} h` : ''}${mins ? ` ${mins} min` : ''}`;
  if (hours) return `${hours} world h${mins ? ` ${mins} min` : ''}`;
  return `${minutes} world min`;
}

export function observedDuration(ticks: number, version: number): string {
  return version >= 6 ? worldDuration(ticks) : secondsText(ticks);
}

export function observedAge(world: World, version: number, tick: number): string {
  if (version < 6) return agoText(world, tick);
  const elapsed = world.tick - tick;
  if (elapsed === 0) return 'just now';
  return elapsed < 0 ? `in ${worldDuration(-elapsed)}` : `${worldDuration(elapsed)} ago`;
}
