// Shared responsibilities (rich worlds only). Somebody laid up (a fever at its worst, an injury) with a child to see to and no
// other able grown-up at home may ask a neighbour to keep an eye on the child for the day; somebody laid up by a low fire with
// no wood may ask a neighbour to keep it going. The neighbour weighs it as any request (social.ts evaluateRequest: their own
// dependants, their own needs, their promises, their liking) and may decline; a yes is an ordinary promise (Commitment, kind
// 'work', milestone 'watched' or 'fire kept') kept by the ordinary machinery: a visit that stays with the child (welfare.ts),
// wood on the fire (act_build.ts). Declined, the asker is left to decide what to do next: ask another, or manage.
//
// An authored world never raises the ask.
import { DAY } from './constants';
import { transfer } from './economy';
import { addEvent, addLog } from './events';
import { householdById, membersOf } from './households';
import { isRich, think } from './mood';
import { carryCap, stageOf } from './people';
import { fulfillCommitment, onGift } from './social';
import type { Activity, Commitment, Items, ItemKind, Person, World } from './types';
import { hyp } from './util';

/** how long a watch lasts, and how often the watcher looks at the child's needs */
export const WATCH_TICKS = 300;
const LOOK_EVERY = 50;

/** laid up: in no state to see to anyone (rich only; never in an authored world) */
export function laidUp(world: World, p: Person): boolean {
  if (!isRich(world)) return false;
  return !!p.injury || (!!p.illness && p.illness.severity >= 0.4);
}

/** the children this person has to see to, when nobody else at home can */
export function childrenNeedingWatch(world: World, p: Person): Person[] {
  if (!laidUp(world, p) || stageOf(world, p) === 'child') return [];
  const hh = householdById(world, p.hhId);
  const members = membersOf(world, hh);
  const ableAdult = members.some((m) => m !== p && m.alive && stageOf(world, m) !== 'child' && stageOf(world, m) !== 'youth' && !laidUp(world, m) && m.health >= 50);
  if (ableAdult) return [];
  return members.filter((m) => m !== p && m.alive && stageOf(world, m) === 'child');
}

/** the watch commitment this person holds, if any */
export function watchCommitment(p: Person): Commitment | undefined {
  return p.commitments.find((c) => c.status === 'active' && c.kind === 'work' && c.milestone === 'watched');
}
export function fireCommitment(p: Person, fireId: number): Commitment | undefined {
  return p.commitments.find((c) => c.status === 'active' && c.kind === 'work' && c.milestone === 'fire kept' && c.destId === fireId);
}

/** The watch itself (called from the visit handler while `a.data.watch` is set): stay by the child, see to what they need, keep the promise at the end. */
export function watchTick(world: World, p: Person, a: Activity, child: Person): 'continue' | 'done' | `fail:${string}` {
  const d = hyp(child.x - p.x, child.y - p.y);
  if (d > 7) {
    // the child wandered: follow
    a.tx = child.x;
    a.ty = child.y;
    a.spotX = child.x;
    a.spotY = child.y;
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    return 'continue';
  }
  a.progress++;
  if (a.progress % LOOK_EVERY === 0) {
    const give: Items = {};
    if (child.needs.hunger < 60) for (const k of ['bread', 'meat', 'fish', 'fruit', 'grain', 'berries'] as ItemKind[]) if ((p.inv[k] ?? 0) > 0) { give[k] = 1; break; }
    if (child.needs.thirst < 55 && (p.inv.water ?? 0) > 0) give.water = 1;
    const got: Items = {};
    let moved = 0;
    for (const k of Object.keys(give) as ItemKind[]) {
      const m = transfer(world, p.inv, child.inv, carryCap(world, child), k, give[k] ?? 0, 'person:' + p.id, 'person:' + child.id, 'watched over');
      if (m > 0) got[k] = m;
      moved += m;
    }
    if (moved > 0) onGift(world, p, child, got, 'care');
  }
  if (a.progress < WATCH_TICKS) return 'continue';
  const c = p.commitments.find((x) => x.id === a.data.commitmentId);
  if (c && c.status === 'active') {
    c.contrib = (c.contrib ?? 0) + 40;
    fulfillCommitment(world, p, c.id);
  }
  addLog(world, p, 'social', `Kept an eye on ${child.name} for the day, as promised.`);
  think(world, p, 'watched', 3, DAY / 2, `looked after ${child.name}`);
  return 'done';
}

/** wood went on a fire since the promise was made (act_build.ts notes the tick): the promise is kept. Called where promises are checked. */
export function settleFirePromise(world: World, p: Person, c: Commitment): boolean {
  if (c.kind !== 'work' || c.milestone !== 'fire kept' || c.status !== 'active') return false;
  if ((p.cooldowns['fedfire' + (c.destId ?? 0)] ?? -1) < c.made) return false;
  c.contrib = (c.contrib ?? 0) + 40;
  fulfillCommitment(world, p, c.id);
  addLog(world, p, 'social', 'Kept the fire going, as promised.');
  return true;
}

/** the asker was turned down: left to decide what to do next */
export function onDutyDeclined(world: World, A: Person, B: Person, kind: 'watch' | 'fire'): void {
  think(world, A, 'no_help', -3, DAY / 2, kind === 'watch' ? `${B.name} could not watch the children` : `${B.name} could not see to the fire`);
  addLog(world, A, 'social', `${B.name} could not ${kind === 'watch' ? 'keep an eye on the children' : 'keep the fire going'}. I will have to ask someone else, or manage.`);
  addEvent(world, 'social', `${B.name} could not ${kind === 'watch' ? 'watch the children for' : 'keep the fire for'} ${A.name}, who is laid up.`, [A.id, B.id], A.x, A.y);
}
