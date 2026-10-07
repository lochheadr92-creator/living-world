import { BASE_SPEED, MIN_COMMIT, REVIEW_EVERY, TURN_RATE } from './constants';
import { cartSpeedFactor } from './carts';
import { carryCap } from './people';
import { stageOf } from './people';
import { releaseClaims, weightOf } from './economy';
import { addLog, setResult } from './events';
import { findPath, terrainSpeed, tileCost } from './pathfinding';
import { hashUnit } from './rng';
import { rulesOf } from './rules';
import { distToFootprint, entityPos, isWalkable } from './registry';
import type { Activity, ActivityKind, Entity, NeedKey, Person, PoseKind, World } from './types';
import { clamp, hyp, turnToward } from './util';

// ───────────────────────── handler registry ─────────────────────────
export type WorkResult = 'continue' | 'done' | `fail:${string}` | `partial:${string}`;

export interface Handler {
  /** run once on arrival at the work spot; return a string to fail with that reason */
  begin?(world: World, p: Person, a: Activity): string | void;
  /** one tick of work */
  work(world: World, p: Person, a: Activity): WorkResult;
  pose(a: Activity): PoseKind;
  /** called whenever the activity ends for any reason (after claims are released) */
  onEnd?(world: World, p: Person, a: Activity, outcome: string, detail: string): void;
  /** 0..1: how willing the person is to stop for a chat while doing this */
  availability: number;
}

const handlers: Partial<Record<ActivityKind, Handler>> = {};

export function registerHandler(kind: ActivityKind, h: Handler): void {
  handlers[kind] = h;
}

export function handlerOf(kind: ActivityKind): Handler | undefined {
  return handlers[kind];
}

// ───────────────────────── construction ─────────────────────────
export interface NewActivityOpts {
  kind: ActivityKind;
  label: string;
  goal: string;
  need?: NeedKey | null;
  targetId?: number;
  targetType?: string;
  tx?: number;
  ty?: number;
  spotX?: number;
  spotY?: number;
  item?: Activity['item'];
  amount?: number;
  utility?: number;
  minCommit?: number;
  maxTicks?: number;
  duration?: number;
  data?: Record<string, any>;
  /** start directly in the work phase (no travel) */
  here?: boolean;
}

export function newActivity(world: World, p: Person, o: NewActivityOpts): Activity {
  return {
    id: world.nextId++,
    kind: o.kind,
    label: o.label,
    goal: o.goal,
    need: o.need ?? null,
    phase: o.here ? 'work' : 'travel',
    targetId: o.targetId ?? 0,
    targetType: o.targetType ?? '',
    tx: o.tx ?? p.x,
    ty: o.ty ?? p.y,
    spotX: o.spotX ?? p.x,
    spotY: o.spotY ?? p.y,
    item: o.item ?? null,
    amount: o.amount ?? 0,
    start: world.tick,
    minCommit: world.tick + (o.minCommit ?? MIN_COMMIT),
    expire: world.tick + (o.maxTicks ?? 900),
    progress: 0,
    pprogress: 0,
    duration: o.duration ?? 0,
    cycle: 0,
    path: [],
    pi: 0,
    pathTries: 0,
    stuck: 0,
    lastX: p.x,
    lastY: p.y,
    claims: [],
    utility: o.utility ?? 0,
    blocked: '',
    data: o.data ?? {},
  };
}

// ───────────────────────── geometry helpers ─────────────────────────
/** Pick a tile next to the target to stand on, spreading people around so they do not stack up. */
export function standSpotFor(world: World, p: Person, e: Entity): { x: number; y: number } | null {
  let fx: number, fy: number, fw: number, fh: number;
  if (e.ent === 'building' || e.ent === 'site') {
    fx = e.x;
    fy = e.y;
    fw = e.w;
    fh = e.h;
  } else {
    fx = Math.floor(entityPos(e).x);
    fy = Math.floor(entityPos(e).y);
    fw = 1;
    fh = 1;
  }
  let best: { x: number; y: number } | null = null;
  let bs = 1e9;
  for (let ty = fy - 1; ty <= fy + fh; ty++) {
    for (let tx = fx - 1; tx <= fx + fw; tx++) {
      if (tx >= fx && tx < fx + fw && ty >= fy && ty < fy + fh) continue;
      if (!isWalkable(world, tx, ty)) continue;
      const cx = tx + 0.5;
      const cy = ty + 0.5;
      let s = hyp(cx - p.x, cy - p.y);
      // crowding: other people already working this target from that tile
      for (const q of world.persons) {
        if (q === p || !q.alive || !q.activity) continue;
        if (q.activity.targetId === e.id && hyp(q.activity.spotX - cx, q.activity.spotY - cy) < 0.9) s += 3.2;
      }
      if (e.ent === 'building' && tx === e.doorX && ty === e.doorY) s -= 2.5;
      s += hashUnit(p.id, tx, ty) * 0.35;
      if (s < bs) {
        bs = s;
        best = { x: cx + (hashUnit(p.id, tx, ty + 7) - 0.5) * 0.3, y: cy + (hashUnit(p.id, tx + 5, ty) - 0.5) * 0.3 };
      }
    }
  }
  return best;
}

export function faceToward(p: Person, x: number, y: number, rate = TURN_RATE): void {
  const dx = x - p.x;
  const dy = y - p.y;
  if (dx * dx + dy * dy < 1e-6) return;
  p.heading = turnToward(p.heading, Math.atan2(dy, dx), rate);
}

// ───────────────────────── movement ─────────────────────────
export function moveSpeed(world: World, p: Person, run = false): number {
  let s = BASE_SPEED;
  const st = stageOf(world, p);
  s *= st === 'child' ? 0.88 : st === 'youth' ? 0.97 : st === 'elder' ? 0.8 : 1;
  const cap = carryCap(world, p);
  s *= 1 - 0.22 * Math.min(1, weightOf(p.inv) / cap);
  if (p.health < 70) s *= 0.55 + 0.45 * (p.health / 70);
  s *= terrainSpeed(world, p.x, p.y);
  if (p.cartId) s *= cartSpeedFactor(world, p);
  if (world.light < 0.3) s *= 0.93;
  s *= 1 - 0.16 * world.weather.storm;
  if (p.needs.energy < 15) s *= 0.82;
  if (run) s *= 1.42;
  return s;
}

function wearTile(world: World, x: number, y: number): void {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= world.W || ty >= world.H) return;
  const i = ty * world.W + tx;
  const w = world.wear[i] + 0.0028;
  world.wear[i] = w > 1 ? 1 : w;
}

type TravelResult = 'moving' | 'arrived' | 'blocked';

/** why a trip is given up when the path finder finds no way (endActivity treats these two as "unreachable") */
const NO_WAY = 'no way to get there';
const NO_WAY_TO_PERSON = 'cannot reach them';

/**
 * Open ground within talking distance of a person, nearest to the walker first. The usual place to stand beside someone is
 * sometimes built over or boxed in (asleep between three lean-tos); any open ground close by will do for a word or a visit.
 */
function groundBeside(world: World, p: Person, a: Activity): { x: number; y: number; path: number[] } | null {
  const cands: { x: number; y: number; d: number }[] = [];
  for (const r of [1.2, 1.7, 2.3]) {
    for (let k = 0; k < 12; k++) {
      const th = (k / 12) * Math.PI * 2;
      const x = a.tx + Math.cos(th) * r;
      const y = a.ty + Math.sin(th) * r;
      if (x < 0.5 || y < 0.5 || x >= world.W - 0.5 || y >= world.H - 0.5) continue;
      if (tileCost(world, Math.floor(y) * world.W + Math.floor(x)) === 0) continue;
      cands.push({ x, y, d: hyp(x - p.x, y - p.y) + r * 0.6 });
    }
  }
  cands.sort((m, n) => m.d - n.d);
  for (const c of cands.slice(0, 5)) {
    const path = findPath(world, p.x, p.y, c.x, c.y, { exact: { x: c.x, y: c.y }, cart: p.cartId !== 0, caller: a.kind + '/beside' });
    if (path) return { x: c.x, y: c.y, path };
  }
  return null;
}

function planPath(world: World, p: Person, a: Activity): boolean {
  const path = findPath(world, p.x, p.y, a.spotX, a.spotY, { exact: { x: a.spotX, y: a.spotY }, cart: p.cartId !== 0, caller: a.kind });
  if (path === null) {
    if (a.targetType !== 'person') return false;
    const alt = groundBeside(world, p, a);
    if (!alt) return false;
    a.spotX = alt.x;
    a.spotY = alt.y;
    a.path = alt.path;
    a.pi = 0;
    a.data.beside = true; // not the usual spot: do not keep re-planning towards it while they stay put
    return true;
  }
  a.path = path;
  a.pi = 0;
  return true;
}

function stepTravel(world: World, p: Person, a: Activity): TravelResult {
  if (a.path.length === 0 && a.pi === 0 && a.pathTries === 0) {
    a.pathTries = 1;
    if (!planPath(world, p, a)) {
      a.blocked = NO_WAY;
      return 'blocked';
    }
  }
  // chasing a person: the destination is refreshed only while the target is actually in sight,
  // otherwise the walker keeps heading for where they were last seen
  if (a.targetType === 'person' && (world.tick + p.id) % 10 === 0) {
    const sighted = p.seen.find((s) => s.id === a.targetId);
    if (sighted) {
      const dx = p.x - sighted.x;
      const dy = p.y - sighted.y;
      const d = hyp(dx, dy) || 1;
      const nx = sighted.x + (dx / d) * 1.2;
      const ny = sighted.y + (dy / d) * 1.2;
      const settled = a.data.beside === true && hyp(sighted.x - a.tx, sighted.y - a.ty) < 1.5;
      if (!settled && hyp(a.spotX - nx, a.spotY - ny) > 1.2) {
        a.data.beside = false;
        a.spotX = nx;
        a.spotY = ny;
        a.tx = sighted.x;
        a.ty = sighted.y;
        if (!planPath(world, p, a)) {
          a.blocked = NO_WAY_TO_PERSON;
          return 'blocked';
        }
      }
    }
  }
  if (a.pi >= a.path.length) return 'arrived';
  let remaining = moveSpeed(world, p, a.data.run === true);
  let moved = 0;
  while (remaining > 1e-7 && a.pi < a.path.length) {
    const wx = a.path[a.pi];
    const wy = a.path[a.pi + 1];
    const dx = wx - p.x;
    const dy = wy - p.y;
    const d = hyp(dx, dy);
    if (d > 1e-6) p.heading = turnToward(p.heading, Math.atan2(dy, dx), TURN_RATE * 1.3);
    if (d <= remaining) {
      p.x = wx;
      p.y = wy;
      remaining -= d;
      moved += d;
      a.pi += 2;
    } else {
      p.x += (dx / d) * remaining;
      p.y += (dy / d) * remaining;
      moved += remaining;
      remaining = 0;
    }
  }
  wearTile(world, p.x, p.y);
  // stuck detection
  if ((world.tick - a.start) % 24 === 23) {
    if (hyp(p.x - a.lastX, p.y - a.lastY) < 0.35) {
      a.stuck++;
      if (a.stuck >= 2) {
        a.stuck = 0;
        a.pathTries++;
        if (a.pathTries > 4 || !planPath(world, p, a)) {
          a.blocked = 'path blocked';
          return 'blocked';
        }
      }
    } else a.stuck = 0;
    a.lastX = p.x;
    a.lastY = p.y;
  }
  return a.pi >= a.path.length ? 'arrived' : 'moving';
}

// ───────────────────────── lifecycle of an activity ─────────────────────────
export function startActivity(world: World, p: Person, a: Activity): void {
  if (p.activity) endActivity(world, p, 'interrupted', 'switched to something else');
  p.activity = a;
  a.start = world.tick;
  a.lastX = p.x;
  a.lastY = p.y;
  p.nextThink = world.tick + REVIEW_EVERY + Math.floor(hashUnit(p.id, world.tick, 3) * 18);
  world.hooks?.onActivityStart?.(p, a);
  if (a.phase === 'work') beginWork(world, p, a);
  else {
    const dist = hyp(a.spotX - p.x, a.spotY - p.y);
    p.pose = a.data.run ? 'run' : dist < 0.2 ? 'stand' : 'walk';
  }
}

function beginWork(world: World, p: Person, a: Activity): void {
  a.phase = 'work';
  a.progress = 0;
  a.pprogress = 0;
  a.blocked = '';
  const h = handlers[a.kind];
  if (h?.begin) {
    const err = h.begin(world, p, a);
    if (typeof err === 'string') {
      endActivity(world, p, 'failed', err);
      return;
    }
  }
  if (p.activity === a && h) p.pose = h.pose(a);
}

/** Single place where activities end: every claim is released, the outcome is recorded. */
export function endActivity(world: World, p: Person, outcome: 'success' | 'failed' | 'interrupted' | 'partial', detail: string): void {
  const a = p.activity;
  if (!a) return;
  releaseClaims(world, a.claims);
  p.activity = null;
  const h = handlers[a.kind];
  if (h?.onEnd) h.onEnd(world, p, a, outcome, detail);
  // anti-thrash: an option that just failed outright (or achieved nothing) is not re-picked straight away
  const optKey = a.data.optKey as string | undefined;
  if (optKey && (outcome === 'failed' || (outcome === 'partial' && a.cycle === 0 && a.progress < 4))) {
    // one that failed for want of any way there is not worth another flood of the map straight away, in a world that asks for that
    const noWay = outcome === 'failed' && (detail === NO_WAY || detail === NO_WAY_TO_PERSON);
    p.cooldowns['opt:' + optKey] = world.tick + (noWay ? rulesOf(world).unreachableCooldown : 80);
  }
  if (a.kind !== 'converse' || outcome !== 'success') setResult(world, p, a.label, outcome, detail);
  if (outcome === 'failed' && !a.data.logged) addLog(world, p, 'work', `Gave up “${a.label}”: ${detail}.`);
  if (p.pose !== 'sleep' || outcome !== 'interrupted') p.pose = 'stand';
  p.nextThink = world.tick;
}

/** Drop whatever is going on (e.g., death, fleeing) and release everything. */
export function abortActivity(world: World, p: Person, detail: string): void {
  if (p.activity) endActivity(world, p, 'interrupted', detail);
  if (p.suspended) {
    releaseClaims(world, p.suspended.claims);
    p.suspended = null;
  }
}

export function stepActivity(world: World, p: Person): void {
  const a = p.activity;
  if (!a) return;
  if (world.tick > a.expire) {
    endActivity(world, p, a.cycle > 0 ? 'partial' : 'failed', 'took too long');
    return;
  }
  const h = handlers[a.kind];
  if (!h) {
    endActivity(world, p, 'failed', 'unknown activity');
    return;
  }
  if (a.phase === 'travel') {
    const r = stepTravel(world, p, a);
    if (r === 'blocked') {
      endActivity(world, p, 'failed', a.blocked || 'path blocked');
      return;
    }
    if (r === 'moving') {
      p.pose = a.data.run ? 'run' : 'walk';
      return;
    }
    p.pose = 'stand';
    beginWork(world, p, a);
    if (p.activity !== a) return;
    // a multi-leg handler (a cart going out to the load) may have sent it travelling again: nothing is done until it gets there
    if (a.phase === 'travel') {
      p.pose = a.data.run ? 'run' : 'walk';
      return;
    }
  }
  a.pprogress = a.progress;
  const res = h.work(world, p, a);
  if (p.activity !== a) return; // handler ended it itself
  if (res === 'continue') {
    p.pose = h.pose(a);
    return;
  }
  if (res === 'done') {
    endActivity(world, p, 'success', a.blocked || 'done');
    return;
  }
  if (res.startsWith('fail:')) {
    endActivity(world, p, 'failed', res.slice(5));
    return;
  }
  endActivity(world, p, 'partial', res.slice(8));
}

/**
 * Put the current activity on hold (someone started talking to this person).
 * Claims are released; on resume the activity re-arrives and re-claims what it needs.
 */
export function suspendActivity(world: World, p: Person): void {
  const a = p.activity;
  if (!a) return;
  releaseClaims(world, a.claims);
  if (a.phase === 'work') {
    a.phase = 'travel';
    a.path = [];
    a.pi = 0;
    a.pathTries = 0;
    a.progress = 0;
    a.pprogress = 0;
  }
  p.suspended = a;
  p.activity = null;
}

/** Pick up a suspended activity again if it is still valid. Returns true if resumed. */
export function resumeSuspended(world: World, p: Person): boolean {
  const a = p.suspended;
  if (!a) return false;
  p.suspended = null;
  if (p.activity) return false;
  if (world.tick > a.expire) return false;
  if (a.targetId && a.targetType !== 'person' && a.targetType !== 'tile' && !world.byId.has(a.targetId)) return false;
  p.activity = a;
  a.lastX = p.x;
  a.lastY = p.y;
  a.stuck = 0;
  p.pose = 'stand';
  p.nextThink = world.tick + 20;
  return true;
}

export function canInterruptForTalk(p: Person): number {
  if (p.pose === 'sleep' || p.pose === 'run' || p.pose === 'fear') return 0;
  const a = p.activity;
  if (!a) return 1;
  if (a.kind === 'converse' || a.kind === 'flee' || a.kind === 'argue') return 0;
  const h = handlers[a.kind];
  const base = h ? h.availability : 0.4;
  if (a.phase === 'travel') return Math.max(base, 0.55);
  return base;
}

export function minimumCommitLeft(world: World, a: Activity): number {
  return Math.max(0, a.minCommit - world.tick);
}

export function clampProgress(a: Activity): number {
  return a.duration > 0 ? clamp(a.progress / a.duration, 0, 1) : 0;
}

/** Distance from a person to the footprint of their activity target (for assertions and tests). */
export function distanceToTarget(world: World, p: Person, a: Activity): number {
  const e = world.byId.get(a.targetId);
  if (!e) return Infinity;
  return distToFootprint(e, p.x, p.y);
}
