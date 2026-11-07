// Rules 165: a fever that has reached the point the cautious keep their distance from is a sign others can SEE.
// Before 165 (options_social.ts candidates) a cautious person skipped a stranger because the stranger's live illness record said
// severity 0.5 or more, a figure that is in nobody's sight, memory or hearing: change only that record after the last glance and the
// options changed. Under 165 perception adds `feverish` to the record of a person in view (describeSeenPerson, the same place as hungry,
// cold and hurt), and the avoidance reads that sign. The threshold is unchanged, so whoever is avoided is who was avoided before, except
// that the decision now rests on how they looked at the last glance.
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-fever-sign` restores the rules-164 read inside a rules-165 world. */
export const feverSignOn = (): boolean => enabled;
export function setFeverSign(on: boolean): void { enabled = on; }
export const hasFeverSign = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 165);

/** How far a fever has gone before it shows: the severity the cautious already avoided at. */
export const FEVER_VISIBLE = 0.5;
export const looksFeverish = (p: Person): boolean => !!p.illness && p.illness.severity >= FEVER_VISIBLE;
