// Rules 168: a laid-up adult asks a neighbour to watch a child only when that neighbour has seen
// the child or been told where they are. Before 168 any nearby adult was asked, so a stranger
// who had never heard of the child was still handed the watch. Kin on the relation is not knowledge.
// The knowledge test is the same one adoption uses (known_adoption.ts knownPlace).
import { knownPlace } from './known_adoption';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off restores the rules-167 ask inside a rules-168 rich world. */
export const knownHandoverOn = (): boolean => enabled;
export function setKnownHandover(on: boolean): void { enabled = on; }
export const hasKnownHandover = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 168);

/** True when this neighbour already knows the child. The ask itself is not that knowledge. */
export function neighbourKnowsChild(q: Person, child: Person): boolean {
  return knownPlace(q, child) !== null;
}
