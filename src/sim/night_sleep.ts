// Rules 283 (`docs/NIGHT_SLEEP.md`; built as 282 and renumbered when the review repairs of 28 November took 282): a night's sleep. Ryan's "begin next step" of 28 November 2026, after the free-time split (docs/FREE_TIME.md).
//
// What stood before: a grown person lay down at 0.8 + chrono of the day (about 19 h), slept until rested (act_misc.ts sleep: energy 94), about
// 4.8 hours, and got up between 23 and 5 h. Then, nothing to do in the dark, they waited for the light (options_survival.ts optShelter, "Staying at
// my lean-to", relabelled "Resting inside the hut" indoors). A probe of meadow (20 days) at rules 281: 473 of 576 grown people's sleeps ended
// "rested", only 42 at "morning came"; between 0 and 5 h a third or more of those awake were waiting; resting awake took 11.1% of the waking time
// of people of 12 and over across the ten runs of docs/FREE_TIME.md, more than all their free time.
//
// Two separately switched parts (`rich-no-night-sleep`, `rich-no-night-sleep-through`, `rich-no-night-sleep-evening`):
//
//   through  Anybody asleep while the light is NIGHT_MORNING or less does not get up because they are rested: they sleep till the morning light
//            (the "morning came" line), as a child under eight has since rules 280. Parched, starving, frozen or in danger still wakes them.
//   evening  A grown person's bedtime is LATE_BEDTIME + chrono of the day (about 21 h) in place of 0.8 + chrono: the evening that the fire, the hall
//            and talk are offered in (evening_fire.ts isEveningFor, leisure.ts) runs to it, sleep is not drawn by the clock before it (options_survival.ts
//            optSleep: tiredness still draws it), and the wait for the light (optShelter) is not offered in the evening before it.
//
// Nothing read but the person's own clock and the light. No draw, nothing saved. Rich worlds at rules 283 and later only.
import { dayFraction } from './environment';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

export const NIGHT_FROM = 283;
/** a grown person's bedtime from 282 (fraction of the day, before chrono); it was 0.8 */
export const LATE_BEDTIME = 0.88;
export const OLD_BEDTIME = 0.8;
/** the light at which the night ends for a sleeper: act_misc.ts's "morning came" line */
export const NIGHT_MORNING = 0.55;
/** the evening before bedtime begins here (fraction of the day); before it, nothing here applies */
const EVENING_START = 0.5;

const on = { through: true, evening: true };
export type NightSleepPart = keyof typeof on;
export const NIGHT_SLEEP_PARTS = Object.keys(on) as NightSleepPart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const nightSleepPartOn = (part: NightSleepPart): boolean => on[part];
export function setNightSleep(enabled: boolean, part?: NightSleepPart): void {
  if (part) on[part] = enabled;
  else for (const k of NIGHT_SLEEP_PARTS) on[k] = enabled;
}
const partOn = (w: World, part: NightSleepPart): boolean => on[part] && w.settings.dynamics === 'rich' && runsRulesVersion(w, NIGHT_FROM);
export const hasSleepThrough = (w: World): boolean => partOn(w, 'through');
export const hasLongEvening = (w: World): boolean => partOn(w, 'evening');

/** part through: asleep in the night, however rested, a sleeper sleeps on */
export const sleepsThrough = (w: World): boolean => hasSleepThrough(w) && w.light <= NIGHT_MORNING;
/** this person's bedtime as a fraction of the day (part evening: later) */
export const bedtimeOf = (w: World, p: Person): number => (hasLongEvening(w) ? LATE_BEDTIME : OLD_BEDTIME) + p.chrono;
/** part evening: in the evening and not yet this person's bedtime */
export function beforeBedtime(w: World, p: Person): boolean {
  if (!hasLongEvening(w)) return false;
  const frac = dayFraction(w.tick);
  return frac >= EVENING_START && frac < bedtimeOf(w, p);
}
