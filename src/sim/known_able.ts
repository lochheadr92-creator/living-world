// Rules 180: a laid-up person counts an able adult at home only if they can see one.
//
// `childrenNeedingWatch` decides whether the children need a neighbour's watch "when nobody else at home can" see to them. It
// read every housemate's live injury, illness and health, so an able adult anywhere in the world suppressed the need, whether or not
// the laid-up person could see them or know their state. Here a housemate counts as able only when the laid-up person currently
// sees them (an adult or elder by age) and the sight shows neither `hurt` (health under 60) nor `feverish` (rules 165). A housemate out
// of sight is not counted. The list of children is unchanged. This can make a laid-up person list the children as needing a watch when
// the other adult is simply out of sight; a housemate seen with health 50 to 59 now reads as not able. No benefit is claimed.
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-able` restores the live housemate read inside a rules-180 rich world. */
export const knownAbleOn = (): boolean => enabled;
export function setKnownAble(on: boolean): void { enabled = on; }
export const hasKnownAble = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 180);

/** Whether this person currently sees an adult housemate who shows no sign of being hurt or feverish. */
export function seesAbleAdultAtHome(world: World, p: Person, members: Person[]): boolean {
  for (const m of members) {
    if (m === p) continue;
    const stage = stageOf(world, m);
    if (stage === 'child' || stage === 'youth') continue;
    const sight = p.seen.find((s) => s.ent === 'person' && s.id === m.id);
    if (sight && !sight.hurt && !sight.feverish) return true;
  }
  return false;
}
