// Enclosed homes have an abstract interior reached through their existing door.
// Person.indoors is authoritative. Building.inside is a legacy unused field;
// occupant lists are derived from people, never another saved source of truth.
import {isStoredDrink} from './stored_water_access';
import { isSolidHome } from './constants';
import { isWalkable } from './registry';
import { runsRulesVersion } from './rulesversion';
import { hasLocalGiving } from './local_giving';
import type { Activity, Building, Person, World } from './types';

export const HABITATION_FROM_VERSION = 3;
export const hasHabitation = (w: World): boolean => w.settings.dynamics === 'rich' && runsRulesVersion(w, HABITATION_FROM_VERSION);
let admissions = true;
/** Lab control: stop new admissions; existing occupants retain physical state and may leave normally. */
export function setHabitationAdmissions(on: boolean): void { admissions = on; }

export function indoorHome(w: World, p: Person): Building | null {
  if (!hasHabitation(w) || !p.indoors) return null;
  const b = w.byId.get(p.indoors);
  return b?.ent === 'building' && isSolidHome(b.type) && b.condition > 0 ? b : null;
}
export const occupants = (w: World, b: Building): Person[] =>
  hasHabitation(w) ? w.persons.filter(p => p.alive && p.indoors === b.id) : [];

/** All resident household members fit; nominal room is not a food-store capacity.
 * No guests in this slice. A growing family is crowded, never excluded from its own home. */
export function homeCapacity(w: World, b: Building): number {
  return Math.max(b.type === 'house' ? 8 : 4, w.persons.filter(p => p.alive && p.hhId === b.hhId).length);
}
export const doorPoint = (b: Building) => ({ x: b.doorX + 0.5, y: b.doorY + 0.5 });
export function canEnterHome(w: World, p: Person, b: Building): string | null {
  if (!hasHabitation(w) || !admissions) return 'indoor admission is disabled';
  if (!p.alive || !isSolidHome(b.type) || b.condition <= 0 || w.byId.get(b.id) !== b) return 'home is no longer usable';
  if (!p.hhId || p.hhId !== b.hhId) return 'not a home of this household';
  if (p.cartId) return 'leave the handcart outside first';
  if (!isWalkable(w, b.doorX, b.doorY)) return 'home entrance is blocked';
  if (p.indoors && p.indoors !== b.id) return 'must leave the other home first';
  if (!p.indoors && occupants(w, b).length >= homeCapacity(w, b)) return 'home is full';
  return null;
}
export function enterHome(w: World, p: Person, b: Building): string | null {
  if (p.indoors === b.id && indoorHome(w, p)) return null;
  const refused = canEnterHome(w, p, b);
  if (refused) return refused;
  const d = doorPoint(b);
  if (Math.hypot(p.x - d.x, p.y - d.y) > 0.35) return 'must reach the home entrance';
  p.indoors = b.id;
  // Map coordinates remain the entrance anchor of this abstract interior.
  // They are not outdoor presence; every physical interaction checks location.
  p.x = d.x; p.y = d.y;
  p.seen = [];
  p.nextThink = w.tick + 30;
  return null;
}
export function leaveHome(w: World, p: Person): string | null {
  if (!hasHabitation(w) || !p.indoors) return null;
  const b = indoorHome(w, p);
  if (!b) { delete p.indoors; return null; }
  if (!isWalkable(w, b.doorX, b.doorY)) return 'home exit is blocked';
  const d = doorPoint(b);
  delete p.indoors;
  p.x = d.x; p.y = d.y;
  p.seen = [];
  return null;
}
/** Only these ordinary activities may execute without leaving the interior. */
export function staysIndoors(w: World, p: Person, a: Activity): boolean {
  if(isStoredDrink(w,a)&&a.targetId===p.indoors)return true;
  if (hasLocalGiving(w) && a.kind === 'give' && indoorHome(w, p)) {
    const q = w.byId.get(a.targetId);
    if (q?.ent === 'person' && q.alive && q.indoors === p.indoors) return true;
  }
  return (a.kind === 'sleep' || a.kind === 'rest') && (!a.targetId || a.targetId === p.indoors)
    || a.kind === 'flee' && a.data.homeRefuge === true && a.targetId === p.indoors
    || a.kind === 'eat' && !a.targetId
    || a.kind === 'eat_store' && a.targetId === p.indoors;
}
/** The lifecycle calls this before movement/work, so even direct/controller actions cannot act through walls. */
export function prepareIndoorActivity(w: World, p: Person, a: Activity): string | null {
  if (!hasHabitation(w)) return null;
  if (p.indoors && !staysIndoors(w, p, a)) return leaveHome(w, p);
  return null;
}
/** Reset travelling activity after a valid exit; its route must start at the door. */
export function interiorTarget(w: World, a: Activity): Building | null {
  if (!hasHabitation(w) || (a.kind !== 'sleep' && a.kind !== 'rest' && !(a.kind === 'flee' && a.data.homeRefuge === true) && !isStoredDrink(w,a))) return null;
  const b = w.byId.get(a.targetId);
  return b?.ent === 'building' && isSolidHome(b.type) ? b : null;
}
/** Same-room contact only. Outdoors is location 0. No social contact through walls. */
export function sameSpace(w: World, a: Person, b: Person): boolean {
  return !hasHabitation(w) || (a.indoors ?? 0) === (b.indoors ?? 0);
}
/** The building footprint has already been removed, so the nearest floor tile is now open rubble. */
export function evacuateHome(w: World, b: Building): void {
  if (!hasHabitation(w)) return;
  for (const p of w.persons) {
    if (p.indoors !== b.id) continue;
    delete p.indoors;
    if (!isWalkable(w, Math.floor(p.x), Math.floor(p.y))) {
      const floor = { x: b.x + 0.5, y: b.y + b.h - 0.5 };
      if (isWalkable(w, Math.floor(floor.x), Math.floor(floor.y))) {
        p.x = floor.x; p.y = floor.y; p.px = p.x; p.py = p.y;
      }
    }
    p.nextThink = w.tick;
    p.seen = [];
  }
}
