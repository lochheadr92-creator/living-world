// Rules 214 (the childhood stream): feeding the children who no longer feed themselves.
//
// Rules 213 took food gathering away from little ones and bounded it for children of seven to eleven. The lab then showed the
// settlement hungry for more of the day (0.6 to 0.7 of waking time), the children most of all (little ones 0.5 to 0.7, children
// 0.4 to 0.7), with grown people gathering only a tenth more. Two separately switched parts answer the two halves of that:
//
//   meals    a carer keeps a child under twelve on a meal rhythm. From the carer's own memory of when they last fed that child
//            (`fedby:<id>` in the carer's cooldowns, the tick of the last hand-over that moved food), once MEAL_GAP has passed the
//            child counts as due a meal for the care option, at most MEAL_DUE, whether or not they look hungry yet. What the carer
//            can see still wins when it is worse, and every other check of the care option stands (asleep, already holding food,
//            just fed, not knowing where they are). Before 214 a carer acted only on how the child looked (rules 173).
//   provide  the pull an adult with dependants feels to put food by for the household grows with the under-twelves in it, by
//            PROVIDE_PER_CHILD each, on top of the flat provider bonus that was there before.
//
// Rich worlds at rules 214 and later only; rules 213 and earlier, authored worlds and a switch thrown keep the old behaviour.
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

const on = { meals: true, provide: true };
export type ChildFeedingPart = keyof typeof on;
export const CHILD_FEEDING_PARTS = Object.keys(on) as ChildFeedingPart[];
/** Lab switches (never saved or hashed): one part, or with no part both. */
export const childFeedingPartOn = (part: ChildFeedingPart): boolean => on[part];
export function setChildFeeding(enabled: boolean, part?: ChildFeedingPart): void {
  if (part) on[part] = enabled;
  else for (const k of CHILD_FEEDING_PARTS) on[k] = enabled;
}
export const hasChildFeeding = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 214);

/** a child's meals come about three a day */
export const MEAL_GAP = 800;
/** a child due a meal counts as this hungry to the carer: just inside the care option's line for a child (66) */
export const MEAL_DUE = 60;
/** the extra pull, for each under-twelve in the household, to put food by */
export const PROVIDE_PER_CHILD = 4;

const fedKey = (id: number): string => 'fedby:' + id;

/** A hand-over from a carer moved food to this person: the carer remembers when. */
export function noteFed(w: World, carer: Person, child: Person, movedFood: boolean): void {
  if (!on.meals || !movedFood || !hasChildFeeding(w) || stageOf(w, child) !== 'child') return;
  carer.cooldowns[fedKey(child.id)] = w.tick;
}

/** By the carer's own memory, this child is due a meal: never fed by them, or fed a meal gap ago or more. */
export function mealDue(w: World, carer: Person, child: Person): boolean {
  if (!on.meals || !hasChildFeeding(w) || stageOf(w, child) !== 'child') return false;
  const last = carer.cooldowns[fedKey(child.id)];
  return last === undefined || w.tick - last >= MEAL_GAP;
}

/** The hunger the carer acts on: their read of the child, or MEAL_DUE when a meal is due and the child looks better than that. */
export function hungerToActOn(w: World, carer: Person, child: Person, read: number): number {
  return mealDue(w, carer, child) ? Math.min(read, MEAL_DUE) : read;
}

/** The extra pull to put food by for a household with under-twelves in it. */
export function providePull(w: World, p: Person, members: readonly Person[]): number {
  if (!on.provide || !hasChildFeeding(w)) return 0;
  let n = 0;
  for (const m of members) if (m !== p && m.alive && stageOf(w, m) === 'child') n++;
  return PROVIDE_PER_CHILD * n;
}
