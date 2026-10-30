// Shared responsibilities (rich worlds only). Somebody laid up (a fever at its worst, an injury) with a child to see to and no
// other able grown-up at home may ask a neighbour to keep an eye on the child for the day; somebody laid up by a low fire with
// no wood may ask a neighbour to keep it going. The neighbour weighs it as any request (social.ts evaluateRequest: their own
// dependants, their own needs, their promises, their liking) and may decline; a yes is an ordinary promise (Commitment, kind
// 'work', milestone 'watched' or 'fire kept') kept by the ordinary machinery: a visit that stays with the child (welfare.ts),
// wood on the fire (act_build.ts). Declined, the asker is left to decide what to do next: ask another, or manage.
//
// An authored world never raises the ask.
import { DAY } from './constants';
import { faceToward } from './activities';
import { transfer } from './economy';
import { addEvent, addLog } from './events';
import { householdById, membersOf } from './households';
import { isRich, think } from './mood';
import { carryCap, stageOf } from './people';
import { fulfillCommitment, onGift, surplusOf } from './social';
import { runsRulesVersion } from './rulesversion';
import { sameSpace } from './habitation';
import { senseRadius } from './perception';
import type { Activity, Commitment, Items, ItemKind, Person, World } from './types';
import { hyp } from './util';
import {hasWatchLearning} from './helper_learning';

/** how long a watch lasts, and how often the watcher looks at the child's needs */
export const WATCH_TICKS = 300;
const LOOK_EVERY = 50;
let practicalCare = true;
export const practicalCareOn = (): boolean => practicalCare;
export function setPracticalCare(on: boolean): void { practicalCare = on; }
export const hasPracticalCare = (w: World): boolean => practicalCare && isRich(w) && runsRulesVersion(w, 56);

/** Spoken when a watch is accepted. Copy the asker's actual observation, keeping its age;
 * never read the child's current location, and never overwrite a more recent observation. */
export function communicateWatchLocation(world: World, asker: Person, helper: Person, childId: number): void {
  if (!hasPracticalCare(world)) return;
  const seen = asker.seen.find(s => s.ent === 'person' && s.id === childId);
  const location = seen ? { x: seen.x, y: seen.y, tick: asker.lastPercept.tick } : asker.whereabouts[childId];
  if (!location || world.tick - location.tick > DAY || (helper.whereabouts[childId]?.tick ?? -1) >= location.tick) return;
  helper.whereabouts[childId] = { ...location };
  addLog(world, helper, 'social', `${asker.name} told me where they last saw the child I agreed to watch (tick ${location.tick}).`);
}

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
  const bounded = hasPracticalCare(world);
  if (bounded && (!child.alive || !sameSpace(world, p, child) || d > senseRadius(world, p))) {
    // A missing child is a contact failure, not permission to read their remote position.
    const why = 'lost sight of the child';
    const c = p.commitments.find(c => c.id === a.data.commitmentId && c.status === 'active');
    if (c) { c.blocked = why; c.blockedAt = world.tick; }
    p.cooldowns['check' + child.id] = world.tick + 240;
    return `fail:${why}`;
  }
  if (bounded) faceToward(p, child.x, child.y);
  if (d > (bounded ? 3.2 : 7)) {
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
    if (child.needs.hunger < 60) for (const k of ['bread', 'meat', 'fish', 'fruit', 'grain', 'berries'] as ItemKind[]) if ((p.inv[k] ?? 0) > 0 && (!bounded || surplusOf(world, p, k) >= 1)) { give[k] = 1; break; }
    if (child.needs.thirst < 55 && (p.inv.water ?? 0) > 0 && (!bounded || surplusOf(world, p, 'water') >= 1)) give.water = 1;
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
    if(hasWatchLearning(world)){
      const r=world.requests.find(r=>r.id===c.requestId&&r.kind==='watch'&&r.to===p.id&&r.destId===child.id);
      if(r){
        const asker=world.byId.get(r.from);
        const witnessed=asker?.ent==='person'&&asker.alive&&asker.pose!=='sleep'&&asker.activity?.kind!=='sleep'&&sameSpace(world,asker,p)&&sameSpace(world,asker,child)&&hyp(asker.x-p.x,asker.y-p.y)<=Math.min(3,senseRadius(world,asker))&&hyp(asker.x-child.x,asker.y-child.y)<=senseRadius(world,asker);
        r.helperWork={kind:'watch',target:child.id,eventId:a.id,tick:world.tick,witnessId:witnessed?r.from:0};
      }
    }
    c.contrib = (c.contrib ?? 0) + 40;
    fulfillCommitment(world, p, c.id);
  }
  addLog(world, p, 'social', `Kept an eye on ${child.name} for ${bounded ? 'the agreed time' : 'the day'}, as promised.`);
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
