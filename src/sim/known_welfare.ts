// Rules 179: a worry about someone out of sight is kept or dropped on what the worrier knows, not on the subject's live state.
//
// After rules 170 `welfare.ts` still read a remote subject's live state in three places: a bereaved worry was dropped when the
// subject's live life event was no longer "bereaved"; a hungry, thirsty or cold worry about a grown person survived the self-fix window
// only if `isDependent` (which reads live health) said so; and the visit offer took "someone who cannot manage alone" from the same
// live read. Here a person counts as unable to manage alone when they are a child by age (age is no secret) or the worry itself says
// they looked hurt. A bereaved worry ends by age alone (the common limit already ends it at CONCERN_LIFE). Frailty is not guessed:
// a worry about an adult who has since been hurt out of sight is dropped at the window like any other. No benefit is claimed.
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Concern, Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-welfare` restores the live reads inside a rules-179 rich world. */
export const knownWelfareOn = (): boolean => enabled;
export function setKnownWelfare(on: boolean): void { enabled = on; }
export const hasKnownWelfare = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 179);

/** Whether the worrier takes this person to be unable to manage alone, from age and from what the worry says they saw. */
export function knownDependent(world: World, subject: Person, concern?: Concern): boolean {
  return stageOf(world, subject) === 'child' || concern?.kind === 'hurt';
}
