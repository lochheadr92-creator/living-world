// Places that matter: a person remembers where things happened to them, and it changes where they go.
//
// Only in worlds with `settings.dynamics === 'rich'`; every function here is a no-op in any other world, which therefore behaves, is saved
// and is hashed exactly as before.
//
// A place memory is a spot, a kind and a hold on the person that fades linearly to nothing (like a thought, see mood.ts):
//  * danger: where a wolf bit them (strong, about a week), where they saw a wolf attack someone, where someone close to them was killed.
//    It counts as danger wherever danger is weighed (dangerAt in optutil.ts), so a cautious person keeps away from it, and being near it
//    unsettles them (a thought, updatePlaces).
//  * grief: the grave of someone close. They go to pay their respects now and then (options_places.ts), which eases the loss.
// Deliberately few and legible; the inspector lists them.
import { DAY } from './constants';
import { isRich, think } from './mood';
import type { Person, PlaceMemory, World } from './types';
import { hyp } from './util';

const MAX_PLACES = 8;
/** two memories of the same kind closer than this are one place: the newer refreshes the older */
const SAME_PLACE = 4;

/** An experiment switch (kept beside the world, not in it: not saved, not hashed): with it off, places are remembered but change nothing. */
let effects = true;
export function setPlaceEffects(on: boolean): void {
  effects = on;
}
export const placeEffectsOn = (): boolean => effects;

/** How strongly the place holds them now: `strength` when fresh, fading to 0 at `until`. */
export function holdOf(world: World, m: PlaceMemory): number {
  const left = (m.until - world.tick) / Math.max(1, m.until - m.since);
  return left > 0 ? m.strength * Math.min(1, left) : 0;
}

/** Remember a place. The same kind (and, for grief, the same person) near an existing memory renews it rather than adding another. */
export function rememberPlace(world: World, p: Person, kind: PlaceMemory['kind'], x: number, y: number, strength: number, ticks: number, why: string, about = 0): void {
  if (!isRich(world) || !p.alive) return;
  const list = (p.places ??= []);
  const i = list.findIndex((m) => m.kind === kind && m.about === about && hyp(m.x - x, m.y - y) < SAME_PLACE);
  if (i >= 0) {
    const m = list[i];
    const s = Math.max(holdOf(world, m), strength);
    list[i] = { ...m, x, y, strength: s, since: world.tick, until: world.tick + ticks, why: s > holdOf(world, m) ? why : m.why };
    return;
  }
  list.push({ kind, x, y, strength, since: world.tick, until: world.tick + ticks, why, about, visited: 0 });
  if (list.length > MAX_PLACES) {
    // forget whichever holds them least
    let weakest = 0;
    for (let k = 1; k < list.length; k++) if (holdOf(world, list[k]) < holdOf(world, list[weakest])) weakest = k;
    list.splice(weakest, 1);
  }
}

/** The danger places that still hold this person, for weighing danger (empty outside rich worlds or with the effects off). */
export function dangerPlaces(world: World, p: Person): { x: number; y: number; s: number }[] {
  if (!effects || !p.places) return [];
  const out: { x: number; y: number; s: number }[] = [];
  for (const m of p.places) {
    if (m.kind !== 'danger') continue;
    const s = holdOf(world, m);
    if (s > 0.05) out.push({ x: m.x, y: m.y, s });
  }
  return out;
}

/** A wolf bit `victim` where they stand: they remember the spot, and so do the people near enough to see it. */
export function placesOnBite(world: World, victim: Person): void {
  if (!isRich(world)) return;
  const x = victim.x;
  const y = victim.y;
  rememberPlace(world, victim, 'danger', x, y, 1, DAY * 6, 'where a wolf bit them');
  for (const q of world.persons) {
    if (!q.alive || q === victim || q.pose === 'sleep') continue;
    if (hyp(q.x - x, q.y - y) > 9) continue;
    rememberPlace(world, q, 'danger', x, y, 0.5, DAY * 3, `where they saw a wolf attack ${victim.name}`);
  }
}

/** How close `q` was to `dead`, as the strength of the memory of their grave (0 = not close enough to grieve at it). */
function closeness(q: Person, dead: Person): number {
  const r = q.relations[dead.id];
  const kin = r?.kin ?? '';
  if (kin === 'partner' || kin === 'child') return 1;
  if (kin === 'parent') return 0.8;
  if (kin === 'sibling') return 0.6;
  if (q.hhId === dead.hhId) return 0.4;
  if (r && r.affinity > 50) return 0.3;
  return 0;
}

/** `dead` has been buried at (gx, gy) after dying at their own spot: the grave becomes a place of grief for those close to them, and a death
 * by a wolf makes the spot a place to fear for them too. */
export function placesOnBurial(world: World, dead: Person, gx: number, gy: number): void {
  if (!isRich(world)) return;
  const byWolf = dead.deathCause === 'wolf attack';
  for (const q of world.persons) {
    if (!q.alive || q === dead) continue;
    const c = closeness(q, dead);
    if (c <= 0) continue;
    rememberPlace(world, q, 'grief', gx + 0.5, gy + 0.5, c, Math.round(DAY * (4 + 8 * c)), `where ${dead.name} is buried`, dead.id);
    if (byWolf) rememberPlace(world, q, 'danger', dead.x, dead.y, 0.4 + 0.4 * c, DAY * 4, `where a wolf killed ${dead.name}`);
  }
}

/** Every MOOD_EVERY ticks (from updateMood): forget faded places, and let a place of danger nearby unsettle them. */
export function updatePlaces(world: World, p: Person): void {
  if (!p.places) return;
  p.places = p.places.filter((m) => m.until > world.tick);
  if (!effects) return;
  let worst: PlaceMemory | null = null;
  let ws = 0;
  for (const m of p.places) {
    if (m.kind !== 'danger') continue;
    const s = holdOf(world, m);
    if (s > 0.25 && s > ws && hyp(m.x - p.x, m.y - p.y) < 6) {
      worst = m;
      ws = s;
    }
  }
  if (worst) think(world, p, 'uneasy-place', -Math.round(4 + 8 * ws), DAY / 4, `feels uneasy ${worst.why.replace(/^where /, 'near where ')}`);
}

/** The places a person remembers, strongest first (for the inspector). */
export function placesOf(world: World, p: Person): { kind: PlaceMemory['kind']; why: string; x: number; y: number; hold: number }[] {
  return (p.places ?? [])
    .map((m) => ({ kind: m.kind, why: m.why, x: m.x, y: m.y, hold: Math.round(holdOf(world, m) * 100) / 100 }))
    .filter((m) => m.hold > 0)
    .sort((a, b) => b.hold - a.hold);
}
