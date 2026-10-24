import { hasLocalDeath, withinHearing } from './death_knowledge';
// Life changes with social consequences (rich worlds only). Losing a partner, becoming a parent, moving households and taking
// in an orphan each change who a person relies on and spends time with, for a while: the bereaved lean on kin and close
// friends (who come to look in, and are readier to help), new parents are helped and seek their partner's company, someone
// who moved is a little more a stranger to the home they left and a little less to the one they joined, and taking in a
// child is remembered by the neighbours as what it is. Each change is one `p.lifeEvent` for its while; a newer one replaces it.
//
// An authored world never creates `p.lifeEvent` and never raises a bereaved concern.
import { DAY } from './constants';
import { addLog } from './events';
import { householdById, membersOf } from './households';
import { isRich, think } from './mood';
import { adjustRel } from './relations';
import { noteDeedNear } from './reputation';
import type { Household, LifeEvent, Person, World } from './types';
import { hyp } from './util';

/** how long each change colours things */
const LASTS: Record<LifeEvent['kind'], number> = { bereaved: 10 * DAY, new_parent: 5 * DAY, moved: 4 * DAY, took_in: 6 * DAY };

function set(world: World, p: Person, kind: LifeEvent['kind'], about: number): void {
  p.lifeEvent = { kind, about, since: world.tick, until: world.tick + LASTS[kind] };
}

/**
 * The change a person is living through now, or null, WITHOUT letting an expired one lapse. For readers that must not write: the
 * inspector reads through this (`describeLifeEvent`), so that opening a card leaves saved state exactly as it was.
 */
export function peekLifeEvent(world: World, p: Person): LifeEvent | null {
  const e = p.lifeEvent;
  return e && e.until > world.tick ? e : null;
}

/**
 * Greater than zero while an observer is reading (the inspector's audit of what someone could do runs the real option planner,
 * which asks about life changes through functions that carry no observer flag). Module state like the lab switches: never
 * saved, never hashed, and only ever raised around a read.
 */
let observing = 0;
export function whileObserving<T>(read: () => T): T {
  observing++;
  try {
    return read();
  } finally {
    observing--;
  }
}

/**
 * The change a person is living through now, or null. Asking lets an expired one lapse, which is the simulation's own tidying
 * and happens exactly when it always did; while an observer is reading it does not, so that looking never changes saved state.
 */
export function lifeEventOf(world: World, p: Person): LifeEvent | null {
  const e = peekLifeEvent(world, p);
  if (!e && p.lifeEvent && observing === 0) delete p.lifeEvent;
  return e;
}

/** A partner has died: the widow or widower leans on kin and close friends, who come to look in. */
export function onPartnerLost(world: World, bereaved: Person, dead: Pick<Person, 'id' | 'name'>): void {
  if (!isRich(world) || !bereaved.alive) return;
  set(world, bereaved, 'bereaved', dead.id);
  addLog(world, bereaved, 'life', `Lost ${dead.name}. I will lean on those I have left.`);
  for (const q of world.persons) {
    if (q === bereaved || !q.alive) continue;
    if (hasLocalDeath(world) && (q.pose === 'sleep' || !withinHearing(q, bereaved, 8))) continue;
    const r = q.relations[bereaved.id];
    const close = !!r?.kin || (r?.affinity ?? 0) >= 30;
    if (!close) continue;
    if (!q.concerns.some((c) => c.about === bereaved.id && c.kind === 'bereaved')) {
      q.concerns.push({ about: bereaved.id, kind: 'bereaved', seen: world.tick, src: 'seen', from: q.id, checked: -99999 });
      if (q.concerns.length > 6) q.concerns.shift();
    }
  }
}

/** A child was born to them: the parents are lifted, drawn to each other, and helped a little more readily. */
export function onBecameParent(world: World, parent: Person, baby: Person, other: Person | null): void {
  if (!isRich(world) || !parent.alive) return;
  set(world, parent, 'new_parent', baby.id);
  think(world, parent, 'parent', 10, 3 * DAY, `${baby.name} was born`);
  if (other && other.alive) adjustRel(parent, other.id, world.tick, { aff: 6, trust: 3, fam: 1, note: `${baby.name}, our child` });
}

/** Someone moved from one household to another: the old home is a little further off, the new one nearer. */
export function onMovedHousehold(world: World, mover: Person, from: Household | undefined, to: Household): void {
  if (!isRich(world) || !mover.alive) return;
  set(world, mover, 'moved', to.id);
  for (const m of membersOf(world, from)) {
    if (m === mover) continue;
    adjustRel(m, mover.id, world.tick, { aff: -2, note: `${mover.name} moved out` });
    adjustRel(mover, m.id, world.tick, { aff: -1 });
  }
  for (const m of membersOf(world, to)) {
    if (m === mover) continue;
    adjustRel(m, mover.id, world.tick, { aff: 2, fam: 3, note: `${mover.name} moved in with us` });
    adjustRel(mover, m.id, world.tick, { aff: 2, fam: 3, note: `moved in with ${m.name}` });
  }
}

/** Someone took in a child who had no one: the household makes room, and the neighbours remember it. */
export function onOrphanTaken(world: World, carer: Person, child: Person): void {
  if (!isRich(world) || !carer.alive) return;
  set(world, carer, 'took_in', child.id);
  think(world, carer, 'took_in', 6, 3 * DAY, `took ${child.name} in`);
  const hh = householdById(world, carer.hhId);
  for (const m of membersOf(world, hh)) {
    if (m === carer || m === child) continue;
    adjustRel(m, child.id, world.tick, { aff: 4, fam: 4, note: `${child.name} came to live with us` });
    adjustRel(child, m.id, world.tick, { aff: 4, fam: 4, note: `${m.name} is family now` });
  }
  noteDeedNear(world, carer, 'generous', `${carer.name} took in ${child.name}, who had no one`, carer.x, carer.y, 14, [child.id]);
}

/** what B's willingness to grant A gains from the change A is living through (0 otherwise, and always in an authored world) */
export function leanOn(world: World, B: Person, A: Person): number {
  const e = lifeEventOf(world, A);
  if (!e) return 0;
  const r = B.relations[A.id];
  const close = !!r?.kin || (r?.affinity ?? 0) >= 30 || B.hhId === A.hhId;
  if (e.kind === 'bereaved') return close ? 0.25 : 0.08;
  if (e.kind === 'new_parent') return close ? 0.15 : 0.05;
  return 0;
}

/** the pull a change gives to seeking this person's company (the chat option): the partner for a new parent, kin and friends for the bereaved */
export function companyPull(world: World, p: Person, q: Person): number {
  const e = lifeEventOf(world, p);
  if (!e) return 0;
  const r = p.relations[q.id];
  if (e.kind === 'new_parent') return q.id === p.partnerId ? 5 : 0;
  if (e.kind === 'bereaved') return r?.kin || (r?.affinity ?? 0) >= 30 ? 4 : 0;
  if (e.kind === 'moved') return q.hhId === p.hhId ? 3 : 0;
  return 0;
}

/** for the inspector */
export function describeLifeEvent(world: World, p: Person): string | null {
  const e = peekLifeEvent(world, p);
  if (!e) return null;
  const name = (() => {
    const x = world.byId.get(e.about);
    if (x && x.ent === 'person') return x.name;
    const d = world.deceased.find((d) => d.id === e.about);
    return d ? d.name : '';
  })();
  const days = Math.max(1, Math.ceil((e.until - world.tick) / DAY));
  switch (e.kind) {
    case 'bereaved':
      return `has lost ${name || 'their partner'} and leans on those close to them (${days} more days)`;
    case 'new_parent':
      return `new parent of ${name}`;
    case 'moved':
      return 'has just moved households';
    case 'took_in':
      return `has taken in ${name}`;
  }
}

/** the visit of someone who came to look in on the bereaved: both are the better for it */
export function onLookedInOnBereaved(world: World, visitor: Person, bereaved: Person): void {
  think(world, bereaved, 'looked_in', 6, DAY, `${visitor.name} came to see how I was`);
  think(world, visitor, 'looked_in', 2, DAY / 2, `looked in on ${bereaved.name}`);
  adjustRel(bereaved, visitor.id, world.tick, { aff: 3, trust: 2, fam: 1, note: `${visitor.name} came to me after ${(() => { const d = world.deceased.find((x) => x.id === bereaved.lifeEvent?.about); return d ? d.name : 'my loss'; })()}` });
  adjustRel(visitor, bereaved.id, world.tick, { aff: 1, fam: 1 });
  addLog(world, visitor, 'social', `Looked in on ${bereaved.name} after their loss.`);
  addLog(world, bereaved, 'social', `${visitor.name} came to see how I was.`);
}

export const near = (a: Person, b: Person, d: number): boolean => hyp(a.x - b.x, a.y - b.y) <= d;
