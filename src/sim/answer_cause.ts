// Rules 187: an answer to "will you help build this?" keeps the term that decided it (end-to-end trace of 10 November 2026, links 6, 10, 28, 33, 34).
//
// The answer rule (social.ts, `case 'recruit'`) adds what the person has seen of this organiser's shared work, a base, their diligence and
// generosity, their fondness for the asker, a small draw, their own pressing needs and kinship, and says yes at 0.55. The request kept a
// label: "will help build", or, when no other reason applied, "not willing to commit to this proposal". None of the terms was kept, so a
// viewer could see that five people said no and not why any of them did. At 187 the request, the participation record and the council
// decision also keep `answerWhy`: the one term without which the answer would have gone the other way, tried in a fixed order, or a plain
// statement that it was in their nature when no single term decided it. The answer itself is computed exactly as before and nothing reads
// the new text, so no decision changes. It names what decided this answer, not everything that weighed on it.
import { runsRulesVersion } from './rulesversion';
import type { World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off, a rules-187 rich world keeps the label only. */
export const answerCauseOn = (): boolean => enabled;
export function setAnswerCause(on: boolean): void { enabled = on; }
export const hasAnswerCause = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 187);

export const ANSWER_LINE = 0.55;
/** A fondness that would be ordinary between people who have worked together: affinity 30, worth 0.4 * 30 / 100. */
const ORDINARY_BOND = 0.12;

export interface AnswerTerms {
  /** the whole sum the rule compared with the line */
  w: number;
  /** what they have seen of this organiser's shared work, -0.12 to 0.12 */
  experience: number;
  /** fondness for the asker, 0 to 0.4 */
  affinity: number;
  /** the draw, -0.075 to 0.075 */
  chance: number;
  /** their own pressing needs, 0 to 0.5, subtracted */
  drive: number;
  /** 0.2 for kin, else 0 */
  kin: number;
  asker: string;
}

/** The term that decided the answer, in words. Pure. */
export function answerCause(t: AnswerTerms): string {
  const yes = t.w >= ANSWER_LINE;
  if (yes) {
    if (t.kin > 0 && t.w - t.kin < ANSWER_LINE) return `${t.asker} is kin`;
    if (t.experience > 0 && t.w - t.experience < ANSWER_LINE) return `has seen ${t.asker}'s shared work come good`;
    if (t.affinity > 0 && t.w - t.affinity < ANSWER_LINE) return `is fond of ${t.asker}`;
    if (t.chance > 0 && t.w - t.chance < ANSWER_LINE) return 'it was close, and it was yes this time';
    return 'it is in their nature to take on shared work';
  }
  if (t.experience < 0 && t.w - t.experience >= ANSWER_LINE) return `has seen ${t.asker}'s shared work fail`;
  if (t.drive > 0 && t.w + t.drive >= ANSWER_LINE) return 'their own needs weighed too much just then';
  if (t.chance < 0 && t.w - t.chance >= ANSWER_LINE) return 'it was close, and it was no this time';
  if (t.affinity < ORDINARY_BOND && t.w - t.affinity + ORDINARY_BOND >= ANSWER_LINE) return `does not know ${t.asker} well enough to commit`;
  return 'it is not in their nature to take on shared work';
}
