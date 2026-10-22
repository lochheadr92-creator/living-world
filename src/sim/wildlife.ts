import { addEvent, addFx, addLog } from './events';
import { isRich, think } from './mood';
import { wolfNerve } from './hardship';
import { nearestHub } from './settlements';
import { isSolidHome } from './constants';
import { nearLitFire } from './perception';
import { isWalkable, newId, personById, registerGeneric, solidEpoch } from './registry';
import { findPath } from './pathfinding';
import { stageOf } from './people';
import type { Animal, Person, World } from './types';
import { T } from './types';
import { hyp, turnToward } from './util';
import { hashString, hashUnit } from './rng';

/**
 * Whether a wolf is keeping clear of one particular person, because they drove it off (defence.ts, rules version 3).
 * It registers itself here rather than being imported: this module is loaded very early, and importing the defence
 * module would pull its activity handler in before `activities.ts` had its table. Null until something registers, so a
 * build without that module behaves exactly as this one always did.
 */
let waryCheck: ((world: World, a: Animal, p: Person) => boolean) | null = null;
export function setWaryCheck(fn: (world: World, a: Animal, p: Person) => boolean): void {
  waryCheck = fn;
}

/**
 * Whether this person is, at this instant, squared up to THIS wolf with a spear in their hands (defence.ts, rules
 * version 3). A wolf does not take its free bite on somebody who is facing it: it hesitates while the exchange is
 * settled, which takes at most the length of one attempt (ATTEMPT_TICKS, about ten ticks), and then either it has been
 * driven off or the defence has failed and the next tick it bites after all. That is a standoff with an outcome, not
 * protection: without it the wolf closes faster than anybody can set themselves, bites first, and breaks off by its
 * own rule, so no defence could ever be resolved at all - which is what forty staged encounters showed.
 *
 * Registered rather than imported, for the same reason as `waryCheck`. Null until something registers it.
 */
let facingCheck: ((world: World, a: Animal, p: Person) => boolean) | null = null;
export function setFacingCheck(fn: (world: World, a: Animal, p: Person) => boolean): void {
  facingCheck = fn;
}

export function makeWolf(world: World, x: number, y: number, type: Animal['type'] = 'wolf'): Animal {
  const a: Animal = {
    ent: 'animal',
    id: newId(world),
    type,
    x,
    y,
    px: x,
    py: y,
    heading: 0,
    pheading: 0,
    state: 'roam',
    targetId: 0,
    denX: x,
    denY: y,
    cooldown: 0,
    until: 0,
    wanderX: x,
    wanderY: y,
    health: 100,
    stuck: 0,
    lastX: x,
    lastY: y,
    path: [],
    pi: 0,
    pathAt: -999,
    pathGoalX: x,
    pathGoalY: y,
  };
  registerGeneric(world, a);
  return a;
}

function wolfWalkable(world: World, x: number, y: number): boolean {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!isWalkable(world, tx, ty)) return false;
  return world.terrain[ty * world.W + tx] !== T.SHALLOW;
}

/**
 * What a wolf's last search found nothing for: from which tile to which, and the state of the world's solid tiles at the time.
 * A failed search leaves the wolf with no path, so it asks again on the next tick, and on a large map a goal it cannot reach floods
 * thousands of tiles each time (docs/SCALING.md). Asking again from the same tile for the same tile in a world whose solid tiles have
 * not changed can only give the same answer, so it is not asked. Kept beside the world, not in it: not saved, not hashed.
 */
interface FailedSearch {
  sx: number;
  sy: number;
  gx: number;
  gy: number;
  epoch: number;
}
const failedSearches = new WeakMap<World, Map<number, FailedSearch>>();
let rememberFailures = true;

/** switches the memory off, to check in tests that it changes nothing */
export function setWolfSearchMemory(on: boolean): void {
  rememberFailures = on;
}

function wolfPath(world: World, a: Animal, tx: number, ty: number): number[] | null {
  const tile = (v: number, max: number): number => Math.min(max - 1, Math.max(0, Math.floor(v)));
  const sx = tile(a.x, world.W);
  const sy = tile(a.y, world.H);
  const gx = tile(tx, world.W);
  const gy = tile(ty, world.H);
  const epoch = solidEpoch(world);
  let mine = failedSearches.get(world);
  const last = mine?.get(a.id);
  if (rememberFailures && last && last.sx === sx && last.sy === sy && last.gx === gx && last.gy === gy && last.epoch === epoch) return null;
  const path = findPath(world, a.x, a.y, tx, ty, { maxNodes: 2600, caller: 'wolf' });
  if (!rememberFailures) return path;
  if (path) mine?.delete(a.id);
  else {
    if (!mine) failedSearches.set(world, (mine = new Map()));
    mine.set(a.id, { sx, sy, gx, gy, epoch });
  }
  return path;
}

/** Walk toward a point along an A* route (wolves must get through woodland like anyone else). */
function moveWolf(world: World, a: Animal, tx: number, ty: number, speed: number): void {
  const far = hyp(tx - a.x, ty - a.y);
  if (far < 1.2) {
    steer(world, a, tx, ty, speed);
    return;
  }
  const goalMoved = hyp(a.pathGoalX - tx, a.pathGoalY - ty) > 2.2;
  if (a.pi >= a.path.length || goalMoved || world.tick - a.pathAt > 90) {
    a.pathAt = world.tick;
    a.pathGoalX = tx;
    a.pathGoalY = ty;
    const path = wolfPath(world, a, tx, ty);
    a.path = path ?? [];
    a.pi = 0;
    if (!path) {
      steer(world, a, tx, ty, speed);
      return;
    }
  }
  let remaining = speed;
  while (remaining > 1e-6 && a.pi < a.path.length) {
    const wx = a.path[a.pi];
    const wy = a.path[a.pi + 1];
    const dx = wx - a.x;
    const dy = wy - a.y;
    const d = hyp(dx, dy);
    if (d > 1e-6) a.heading = turnToward(a.heading, Math.atan2(dy, dx), 0.3);
    if (d <= remaining) {
      a.x = wx;
      a.y = wy;
      remaining -= d;
      a.pi += 2;
    } else {
      a.x += (dx / d) * remaining;
      a.y += (dy / d) * remaining;
      remaining = 0;
    }
  }
}

function steer(world: World, a: Animal, tx: number, ty: number, speed: number): void {
  const want = Math.atan2(ty - a.y, tx - a.x);
  const offs = [0, 0.55, -0.55, 1.1, -1.1, 1.75, -1.75];
  for (const o of offs) {
    const h = want + o;
    const nx = a.x + Math.cos(h) * speed;
    const ny = a.y + Math.sin(h) * speed;
    if (wolfWalkable(world, nx, ny)) {
      a.heading = turnToward(a.heading, h, 0.3);
      a.x = nx;
      a.y = ny;
      return;
    }
  }
}

export function safeFromWolf(world: World, t: Person): boolean {
  let others = 0;
  for (const q of world.persons) {
    if (q !== t && q.alive && hyp(q.x - t.x, q.y - t.y) < 5) others++;
  }
  if (others >= 2) return true;
  if (nearLitFire(world, t.x, t.y, wolfNerve(world).fire)) return true;
  for (const b of world.buildings) {
    if (isSolidHome(b.type) && hyp(t.x - (b.x + b.w / 2), t.y - (b.y + b.h / 2)) < 2.8) return true;
  }
  return false;
}

function pickPrey(world: World, a: Animal, night: boolean): Person | null {
  const nerve = wolfNerve(world);
  const range = night ? nerve.rangeNight : nerve.rangeDay;
  const chance = night ? nerve.chanceNight : nerve.chanceDay;
  if (world.rng.next() > chance) return null;
  let best: Person | null = null;
  let bd = range;
  for (const p of world.persons) {
    if (!p.alive) continue;
    const d = hyp(p.x - a.x, p.y - a.y);
    if (d >= bd) continue;
    if (safeFromWolf(world, p)) continue;
    // somebody who drove this wolf off with a spear is left alone for a while (defence.ts, rules version 3); no wolf in
    // an older world carries that memory, so this never fires there
    if (waryCheck && waryCheck(world, a, p)) continue;
    bd = d;
    best = p;
  }
  return best;
}

function scared(world: World, a: Animal): boolean {
  let n = 0;
  for (const p of world.persons) if (p.alive && hyp(p.x - a.x, p.y - a.y) < 4.5) n++;
  return n >= 2;
}

export function newWander(world: World, a: Animal): void {
  // after dark wolves range farther, toward the edge of the settlement (never into the firelight)
  const night = world.light < 0.3;
  const nerve = wolfNerve(world);
  const prowl = night && world.rng.next() < nerve.prowl;
  for (let i = 0; i < 8; i++) {
    let x: number;
    let y: number;
    if (prowl) {
      const hub = nearestHub(world, a.denX, a.denY);
      const dx = hub.x - a.denX;
      const dy = hub.y - a.denY;
      const d = hyp(dx, dy) || 1;
      const reach = Math.max(0, d - nerve.prowlCloser - world.rng.next() * 5);
      const k = reach / d;
      x = a.denX + dx * k + (world.rng.next() - 0.5) * 8;
      y = a.denY + dy * k + (world.rng.next() - 0.5) * 8;
    } else {
      const ang = world.rng.next() * Math.PI * 2;
      const r = 2 + world.rng.next() * 8;
      x = a.denX + Math.cos(ang) * r;
      y = a.denY + Math.sin(ang) * r;
    }
    if (wolfWalkable(world, x, y)) {
      a.wanderX = x;
      a.wanderY = y;
      break;
    }
  }
  a.until = world.tick + 100 + world.rng.int(180);
}

function bite(world: World, a: Animal, t: Person): void {
  let dmg = 7 + world.rng.int(8);
  if (stageOf(world, t) === 'child') dmg *= 1.4;
  if (t.pose === 'sleep') dmg *= 1.2;
  t.health = Math.max(0, t.health - dmg);
  t.needs.safety = Math.max(0, t.needs.safety - 50);
  t.cooldowns.hurt = world.tick;
  t.nextThink = world.tick;
  a.cooldown = 32;
  addFx(world, 'bite', t.x, t.y, 0);
  addEvent(world, 'danger', `A wolf bit ${t.name}${t.health <= 0 ? ' fatally' : ''}.`, [t.id], t.x, t.y);
  addLog(world, t, 'danger', `A wolf attacked me near (${Math.round(t.x)}, ${Math.round(t.y)}).`);
  think(world, t, 'bitten', -30, 3600, 'was bitten by a wolf');
  if (t.health <= 0) {
    t.deathCause = 'wolf attack';
  }
}

/** is this seen animal a threat? Deer (rich worlds only) are not; everything else is. */
export function isThreat(world: World, s: { id: number; ent: string }): boolean {
  if (s.ent !== 'animal') return false;
  const a = world.byId.get(s.id);
  return !a || a.ent !== 'animal' || a.type !== 'deer';
}

/** an animal leaves the world (a deer brought down) */
export function removeAnimal(world: World, a: Animal): void {
  const i = world.animals.indexOf(a);
  if (i >= 0) world.animals.splice(i, 1);
  world.byId.delete(a.id);
  a.health = 0;
}

/** how many deer the ground holds: two, and one more for every twenty-five people (rich only) */
function deerTarget(world: World): number {
  let n = 0;
  for (const p of world.persons) if (p.alive) n++;
  return 2 + Math.floor(n / 25);
}

/** a deer comes to the forest's edge now and then, while the herd is below what the ground holds (rich only; a hashed choice of ground) */
function deerTick(world: World): void {
  if (!isRich(world) || world.tick % 600 !== 300) return;
  let deer = 0;
  for (const a of world.animals) if (a.type === 'deer') deer++;
  if (deer >= deerTarget(world)) return;
  const W = world.W;
  const H = world.H;
  const start = Math.floor(hashUnit(hashString(world.seed), world.tick, 0xdee1) * W * H);
  for (let k = 0; k < W * H; k += 7) {
    const i = (start + k) % (W * H);
    const x = i % W;
    const y = (i / W) | 0;
    if (world.terrain[i] !== T.FOREST || world.solid[i] !== 0) continue;
    const hub = nearestHub(world, x, y);
    if (hyp(hub.x - x, hub.y - y) < 16) continue;
    let near = false;
    for (const p of world.persons) if (p.alive && hyp(p.x - x, p.y - y) < 10) near = true;
    if (near || !wolfWalkable(world, x + 0.5, y + 0.5)) continue;
    const a = makeWolf(world, x + 0.5, y + 0.5, 'deer');
    a.until = world.tick;
    return;
  }
}

/** a deer: grazes near where it came in, bolts from anyone close, and settles again */
function updateDeer(world: World, a: Animal): void {
  const night = world.light < 0.3;
  if ((world.tick + a.id) % 6 === 0 && a.state !== 'retreat') {
    // it notices people: a hunter stalking it is noticed later (within 4 tiles) than someone walking up (7)
    for (const p of world.persons) {
      if (!p.alive || p.pose === 'sleep') continue;
      const d = hyp(p.x - a.x, p.y - a.y);
      const notice = p.activity?.kind === 'hunt' && p.activity.targetId === a.id ? 4 : 7;
      if (d < notice && hashUnit(a.id, p.id, world.tick >> 3) < 0.6) {
        a.state = 'retreat';
        a.targetId = p.id;
        a.until = world.tick + 240;
        break;
      }
    }
  }
  if (a.state === 'retreat') {
    const p = personById(world, a.targetId);
    const dx = p ? a.x - p.x : 1;
    const dy = p ? a.y - p.y : 0;
    const d = hyp(dx, dy) || 1;
    let tx = a.x + (dx / d) * 10;
    let ty = a.y + (dy / d) * 10;
    if (!wolfWalkable(world, tx, ty)) {
      tx = a.denX;
      ty = a.denY;
    }
    moveWolf(world, a, tx, ty, 0.2);
    if (world.tick >= a.until) {
      a.state = 'roam';
      a.denX = a.x;
      a.denY = a.y;
      newWanderNear(world, a, 6);
    }
    return;
  }
  if (world.tick >= a.until || hyp(a.wanderX - a.x, a.wanderY - a.y) < 0.6) newWanderNear(world, a, night ? 3 : 7);
  moveWolf(world, a, a.wanderX, a.wanderY, 0.03);
}

function newWanderNear(world: World, a: Animal, r: number): void {
  for (let i = 0; i < 6; i++) {
    const ang = hashUnit(a.id, world.tick, i) * Math.PI * 2;
    const rr = 1 + hashUnit(a.id, world.tick, i + 9) * r;
    const x = a.denX + Math.cos(ang) * rr;
    const y = a.denY + Math.sin(ang) * rr;
    if (wolfWalkable(world, x, y)) {
      a.wanderX = x;
      a.wanderY = y;
      break;
    }
  }
  a.until = world.tick + 150 + Math.floor(hashUnit(a.id, world.tick, 77) * 250);
}

export function updateWildlife(world: World): void {
  deerTick(world);
  const night = world.light < 0.3;
  for (const a of world.animals) {
    if (a.type === 'deer') {
      updateDeer(world, a);
      continue;
    }
    if (a.cooldown > 0) a.cooldown--;
    // stuck detection
    if ((world.tick + a.id) % 20 === 0) {
      if (hyp(a.x - a.lastX, a.y - a.lastY) < 0.25) a.stuck++;
      else a.stuck = 0;
      a.lastX = a.x;
      a.lastY = a.y;
      const homeAlready = a.state === 'retreat' && hyp(a.denX - a.x, a.denY - a.y) < 3;
      if (homeAlready) a.stuck = 0;
      if (a.stuck >= 3) {
        a.stuck = 0;
        a.path = [];
        a.pi = 0;
        if (a.state === 'roam') newWander(world, a); // blocked: choose somewhere else to go
        else if (a.state === 'stalk') {
          a.state = 'retreat';
          a.until = world.tick + 80;
        }
      }
    }
    switch (a.state) {
      case 'roam': {
        if (world.tick >= a.until || hyp(a.wanderX - a.x, a.wanderY - a.y) < 0.6) newWander(world, a);
        moveWolf(world, a, a.wanderX, a.wanderY, 0.045);
        if ((world.tick + a.id) % 8 === 0) {
          const prey = pickPrey(world, a, night);
          if (prey) {
            a.state = 'stalk';
            a.targetId = prey.id;
            a.until = world.tick + 520;
          }
        }
        break;
      }
      case 'stalk': {
        const t = personById(world, a.targetId);
        if (!t || !t.alive) {
          a.state = 'retreat';
          a.until = world.tick + 150;
          break;
        }
        const d = hyp(t.x - a.x, t.y - a.y);
        if ((world.tick + a.id) % 8 === 0 && (scared(world, a) || safeFromWolf(world, t))) {
          a.state = 'retreat';
          a.until = world.tick + 240;
          break;
        }
        if (d > 19 || world.tick > a.until) {
          a.state = 'retreat';
          a.until = world.tick + 200;
          break;
        }
        moveWolf(world, a, t.x, t.y, d < 6 ? 0.15 : 0.1);
        if (d <= 1.2 && a.cooldown === 0 && facingCheck && facingCheck(world, a, t)) break; // squared up to it: it hesitates
        if (d <= 1.2 && a.cooldown === 0) {
          bite(world, a, t);
          if (t.health > 0 && t.health < 40 && !safeFromWolf(world, t) && t.pose !== 'run') {
            a.cooldown = 30; // keep at it while the target is helpless
          } else {
            a.state = 'retreat';
            a.until = world.tick + 160 + world.rng.int(120);
          }
        }
        break;
      }
      case 'retreat': {
        moveWolf(world, a, a.denX, a.denY, 0.12);
        if (world.tick >= a.until && hyp(a.denX - a.x, a.denY - a.y) < 3) {
          a.state = 'roam';
          newWander(world, a);
        }
        if (world.tick >= a.until + 400) {
          a.state = 'roam';
          newWander(world, a);
        }
        break;
      }
      default:
        a.state = 'roam';
    }
  }
}
