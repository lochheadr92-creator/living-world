// Rules 167: a carerless child is taken in only by a living adult who has seen them or been told where they are.
// Before 167 (lifecycle.ts adoptOrphans) every living adult was scored from the child's true coordinates, kin or not,
// so a child nobody knew of was still rehomed. Under 167 the distance is to the place that adult remembers or
// currently sees, and a child nobody knows stays. Kin on the relation record is not itself knowledge of the child.
import { householdById, membersOf } from './households';
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Person, World } from './types';

let enabled = true;
/** Lab switch (never saved or hashed): off restores the rules-166 scan inside a rules-167 rich world. */
export const knownAdoptionOn = (): boolean => enabled;
export function setKnownAdoption(on: boolean): void { enabled = on; }
export const hasKnownAdoption = (w: World): boolean => enabled && w.settings.dynamics === 'rich' && runsRulesVersion(w, 167);

/** Where this adult last saw the child, or was told they were. Current sight wins over a stored note. Kin alone is nothing. */
export function knownPlace(q: Person, child: Person): { x: number; y: number } | null {
  const seen = q.seen.find((s) => s.ent === 'person' && s.id === child.id);
  if (seen) return { x: seen.x, y: seen.y };
  const note = q.whereabouts[child.id];
  if (note) return { x: note.x, y: note.y };
  return null;
}

/** Inspector sentence when the child is still waiting because no knowing adult can take them. Derived; nothing is stored. */
export function adoptionWaitLine(world: World, child: Person): string | null {
  if (!hasKnownAdoption(world)) return null;
  if (!child.alive || stageOf(world, child) !== 'child') return null;
  const hh = householdById(world, child.hhId);
  if (!hh) return null;
  const carers = membersOf(world, hh).filter((m) => m.id !== child.id && stageOf(world, m) !== 'child');
  if (carers.length > 0) return null;
  for (const q of world.persons) {
    if (!q.alive || q === child) continue;
    const st = stageOf(world, q);
    if (st === 'child' || st === 'youth') continue;
    if (knownPlace(q, child)) return null;
  }
  return `${child.name} has no adult in the household, and nobody who has seen them or been told where they are has taken them in.`;
}
