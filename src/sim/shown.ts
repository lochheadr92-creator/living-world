// Rules 210: being shown. Phase 1 of the childhood plan (docs/CHILDHOOD_AND_PLAY_PLAN.md), three separately switched parts after the
// rules-162 pattern. The owner approved the plan's order and its default decisions on 11 November 2026 ("Do 1 then 2").
//
// What stood before (childhood.ts, rules 120): a child may ask a grown person they are kin to, or know a little, for foraging practice,
// once a day. The grown person agrees only if they forage better than the child, and otherwise says "I cannot teach you more about
// foraging yet". Nobody remembers that answer, so the child asks the same person again. Measured in ordinary worlds (the child's-day
// probe, twelve seeds, 25 days): about 118 lessons asked a settlement, 28 to 30 percent refused that way; a child of seven to eleven
// forages as well as an adult (1.08 against 1.10) but fishes and farms at half the adult level; and in one lived life a nine-year-old
// was refused twelve times and taught twice.
//
// remember  A child told "I cannot teach you more" remembers who said it for NO_TEACH_DAYS days and does not ask that person for
//           practice again meanwhile (a deadline in the child's own cooldowns; nothing is read from the other person).
// older     A child of SHOWER_AGE or more, at least OLDER_BY years older than the one asking, may be asked for practice and may give
//           it, on the same terms as a grown person: kin or known a little, and only if they really know more. Age is what the asker
//           can see; whether the older child knows more is found out by asking, as it is with a grown person.
// more      A teacher who cannot teach more foraging shows what else they know better than the child: fishing first, then farming.
//           The practice is the same paid time with the same gain (0.025, never past the teacher's own level); what it was about is
//           kept on the session and said in the words. A child may not farm before twelve (decision.ts CHILD_FORBIDDEN): the lesson is
//           how they arrive at twelve able to. Where foraging can still be taught, nothing changes.
//
// Rules 208 and earlier, authored worlds and a part switched off keep the old behaviour.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

const on = { remember: true, older: true, more: true };
export type ShownPart = keyof typeof on;
export const SHOWN_PARTS = Object.keys(on) as ShownPart[];
/** Lab switches (never saved or hashed): one part, or with no part all three. */
export const shownPartOn = (part: ShownPart): boolean => on[part];
export function setShown(enabled: boolean, part?: ShownPart): void {
  if (part) on[part] = enabled;
  else for (const k of SHOWN_PARTS) on[k] = enabled;
}
const rich210 = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, 210);
export const remembersNoTeach = (w: World): boolean => on.remember && rich210(w);
export const olderChildrenShow = (w: World): boolean => on.older && rich210(w);
export const showsMore = (w: World): boolean => on.more && rich210(w);

/** The refusal a teacher gives when they know nothing more than the child (the words of rules 120, kept). */
export const CANNOT_TEACH = 'I cannot teach you more about foraging yet';
/** Days a child remembers who told them that. */
export const NO_TEACH_DAYS = 3;
/** The youngest child who may show a younger one, and how much older they must be, in years. */
export const SHOWER_AGE = 7;
export const OLDER_BY = 1;

/** May this child be asked for practice by that younger one? Only what the asker can see: the two ages. */
export function olderChildMayShow(w: World, askerAge: number, otherAge: number): boolean {
  return olderChildrenShow(w) && otherAge >= SHOWER_AGE && otherAge >= askerAge + OLDER_BY;
}

export type LessonSkill = 'forage' | 'fish' | 'farm';
type Known = Record<LessonSkill, number>;
/** What the teacher can still show this pupil: foraging if they forage better, else (from 210) fishing, then farming; null if nothing. */
export function lessonSkill(w: World, pupil: Known, teacher: Known): LessonSkill | null {
  if (teacher.forage > pupil.forage + 0.001) return 'forage';
  if (!showsMore(w)) return null;
  if (teacher.fish > pupil.fish + 0.001) return 'fish';
  if (teacher.farm > pupil.farm + 0.001) return 'farm';
  return null;
}
export const lessonName = (k: LessonSkill): string => (k === 'fish' ? 'Fishing practice' : k === 'farm' ? 'Farming practice' : 'Foraging practice');
export const lessonSkillWord = (k: LessonSkill): string => (k === 'fish' ? 'fishing' : k === 'farm' ? 'farming' : 'foraging');
