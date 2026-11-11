// Rules 212 (the childhood stream, `docs/CHILDHOOD_AND_PLAY_PLAN.md`): a little one walks at a little one's pace.
//
// Before 212 everyone under twelve walked at 0.88 of a grown person's pace, a toddler as fast as an eleven-year-old. From 212 a
// little one (under seven, the plan's first age band) walks at 0.72 of it; a child of seven to eleven keeps 0.88. Everything
// else that slows a walker (a load, ill health, an injury, the ground, the dark, a storm, tiredness, running) applies on top, as
// it does for anyone. The renderer draws the two bands with their own figures (characters.ts); that part is presentation and
// needs no rules version.
//
// Rich worlds at rules 212 and later only; rules 211 and earlier, authored worlds and the switch thrown keep 0.88.
import { ageYears } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

/** under this age a child is a little one (the plan's first band; shown.ts's SHOWER_AGE is the same seven) */
export const LITTLE_AGE = 7;
/** a little one's pace, as a share of a grown person's */
export const LITTLE_PACE = 0.72;
/** everyone under twelve, as before 212 */
export const CHILD_PACE = 0.88;

const on = { little: true };
export type ChildPacePart = keyof typeof on;
export const CHILD_PACE_PARTS = Object.keys(on) as ChildPacePart[];
/** Lab switches (never saved or hashed). */
export const childPacePartOn = (part: ChildPacePart): boolean => on[part];
export function setChildPace(enabled: boolean, part?: ChildPacePart): void {
  if (part) on[part] = enabled;
  else for (const k of CHILD_PACE_PARTS) on[k] = enabled;
}

/** A child's pace (the person is under twelve): a little one's from rules 212, otherwise as before. */
export function childPace(world: World, p: Person): number {
  if (!on.little || world.settings.dynamics !== 'rich' || !runsRulesVersion(world, 212)) return CHILD_PACE;
  return ageYears(world, p) < LITTLE_AGE ? LITTLE_PACE : CHILD_PACE;
}
