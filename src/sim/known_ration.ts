// Rules 177: the granary's emergency ration for a hungry housemate is decided from what the person knows of that housemate.
//
// `withdrawAllowance` lets anyone starving, or with a starving dependant in the house, take a little beyond their share. The
// housemate test read every housemate's live hunger and live health from anywhere in the world, so a parent at the granary was
// granted the extra ration the moment a child at home grew hungry, which nobody could know. Here a housemate counts only when the
// person knows of them: a child by age (age is no secret) or somebody in sight and visibly hurt, and what the person knows of their
// hunger (`knownNeeds`: the signs on a current sight, else the note from the last sight) is under 30. In practice that is a
// housemate in sight and visibly starving; a remembered "hungry" note reads 41 and does not qualify, and no note means unknown.
// The person's own hunger is first-hand and is not touched. This can withhold the extra ration from a starving child out of sight.
// No benefit is claimed.
import { stageOf } from './people';
import { knownNeeds } from './remembered_need';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): `rich-no-known-ration` restores the live housemate read inside a rules-177 rich world. */
export const knownRationOn = (): boolean => enabled;
export function setKnownRation(on: boolean): void { enabled = on; }
export const hasKnownRation = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 177);

/** Hunger under which a housemate is taken to be starving, on the scale `knownNeeds` returns (a starving sign reads 19, hungry 41). */
export const KNOWN_STARVING_BELOW = 30;

/** Whether this person knows of a hungry dependant in their own household. Reads sights and notes only. */
export function knownHungryDependant(world: World, p: Person): boolean {
  for (const q of world.persons) {
    if (q.id === p.id || q.hhId !== p.hhId) continue;
    const sight = p.seen.find((s) => s.ent === 'person' && s.id === q.id);
    if (stageOf(world, q) !== 'child' && !sight?.hurt) continue;
    const known = knownNeeds(world, p, q, sight !== undefined);
    if (known && known.hunger < KNOWN_STARVING_BELOW) return true;
  }
  return false;
}
