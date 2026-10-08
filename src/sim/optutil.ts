import { isRich } from './mood';
import { wellEstimate } from './water';
import { moveSpeed, standSpotFor } from './activities';
import { findWaterAccessNear, isWalkable, isWaterAccess } from './registry';
import { drive } from './needs';
import { householdOf } from './buildings';
import { homeBuildingOf, membersOf } from './households';
import { estimatedAmount, isWaterBeliefId, recentFailure } from './knowledge';
import { isDependent, stageOf } from './people';
import { dayFraction } from './environment';
import type { Activity, Belief, Building, Household, ItemKind, NeedKey, Person, SeenEntity, Stage, ToolKind, World } from './types';
import { NEED_KEYS, CRITICAL, THIRST_RATE, isHomeType } from './constants';
import type { BeliefKind } from './types';

import { hyp } from './util';
export interface Option {
  kind: Activity['kind'];
  label: string;
  goal: string;
  need: NeedKey | null;
  util: number;
  parts: [string, number][];
  eta: number;
  key: string;
  targetId: number;
  blocked?: string;
  /** builds the activity; only invoked for the chosen option. null = could not be set up (e.g. no standing spot) */
  make?: () => Activity | null;
  /** for the inspector: what category of opportunity this serves */
  tag?: string;
}

export interface Ctx {
  world: World;
  p: Person;
  stage: Stage;
  hh: Household | undefined;
  home: Building | null;
  members: Person[];
  dependents: Person[];
  drives: Record<NeedKey, number>;
  critical: NeedKey | null;
  /** every need that is currently dangerously low */
  criticals: NeedKey[];
  dark: boolean;
  night: boolean;
  speed: number;
  food: number;
  water: number;
  wood: number;
  stone: number;
  seeds: number;
  dangers: Belief[];
  seenPersons: SeenEntity[];
  seenAnimals: SeenEntity[];
  collect: boolean;
  blocked: Option[];
  options: Option[];
  /** set by the production planner when a plan was stopped only by lacking a tool: the social planner may ask to borrow one */
  toolWanted?: { kind: ToolKind; for: string };
}

const FOOD_KEYS: ItemKind[] = ['berries', 'fruit', 'fish', 'grain', 'smoked'];

export function foodCount(inv: Person['inv']): number {
  let n = 0;
  for (const k of FOOD_KEYS) n += inv[k] ?? 0;
  return n;
}

export function makeCtx(world: World, p: Person, collect: boolean): Ctx {
  const hh = householdOf(world, p);
  const members = membersOf(world, hh);
  const drives = {} as Record<NeedKey, number>;
  let critical: NeedKey | null = null;
  const criticals: NeedKey[] = [];
  let worst = 1e9;
  const speed = moveSpeed(world, p);
  // planning ahead: when the nearest water they know of is a long walk away, thirst is pressing before it is dire
  let waterLead = 0;
  if (p.needs.thirst < CRITICAL.thirst + 34) {
    let nearest = 1e9;
    for (const id of p.bykind.water ?? []) {
      const b = p.beliefs[id];
      const d = hyp(b.x - p.x, b.y - p.y);
      if (d < nearest) nearest = d;
    }
    if (nearest < 1e8) waterLead = Math.min(34, THIRST_RATE * 1.3 * ((nearest * 1.18) / Math.max(0.03, speed)));
  }
  for (const k of NEED_KEYS) {
    drives[k] = drive(p.needs[k], k);
    const limit = CRITICAL[k] + (k === 'thirst' ? waterLead : 0);
    if (k !== 'social' && p.needs[k] < limit) {
      criticals.push(k);
      const margin = p.needs[k] - limit;
      if (margin < worst) {
        worst = margin;
        critical = k;
      }
    }
  }
  const frac = dayFraction(world.tick);
  const dark = world.light < 0.3;
  const night = dark || frac > 0.8 + p.chrono || frac < 0.2 + p.chrono;
  const dangers: Belief[] = [];
  for (const id of p.bykind.danger ?? []) {
    const b = p.beliefs[id];
    if (b.amount > 0 && world.tick - b.seen < 700) dangers.push(b);
  }
  return {
    world,
    p,
    stage: stageOf(world, p),
    hh,
    home: homeBuildingOf(world, p),
    members,
    dependents: members.filter((m) => m.id !== p.id && isDependent(world, m)),
    drives,
    critical,
    criticals,
    dark,
    night,
    speed,
    food: foodCount(p.inv),
    water: p.inv.water ?? 0,
    wood: p.inv.wood ?? 0,
    stone: p.inv.stone ?? 0,
    seeds: p.inv.seeds ?? 0,
    dangers,
    seenPersons: p.seen.filter((s) => s.ent === 'person'),
    seenAnimals: p.seen.filter((s) => s.ent === 'animal'),
    collect,
    blocked: [],
    options: [],
  };
}

/** Estimated ticks to walk to (x, y). */
export function eta(ctx: Ctx, x: number, y: number): number {
  return (hyp(x - ctx.p.x, y - ctx.p.y) * 1.18) / Math.max(0.03, ctx.speed);
}

/** time cost in utility points */
export function pen(etaTicks: number): number {
  return etaTicks * 0.07;
}

/** 0..1: how worrying is the area around (x, y) given what the person knows about dangers */
export function dangerAt(ctx: Ctx, x: number, y: number, r = 10): number {
  let s = 0;
  for (const b of ctx.dangers) {
    const d = hyp(b.x - x, b.y - y);
    if (d < r) s = Math.max(s, 1 - d / r);
  }
  for (const a of ctx.seenAnimals) {
    const d = hyp(a.x - x, a.y - y);
    if (d < r) s = Math.max(s, 1 - d / r);
  }
  return s;
}

/**
 * How close a wolf may come before this person runs. Someone dying of thirst or hunger puts up with more than
 * someone who is merely out for a walk — otherwise a wolf by the only pond would keep them from ever drinking.
 */
export function fleeRadius(p: Person): number {
  const worst = Math.min(p.needs.thirst, p.needs.hunger);
  const desperation = worst < 30 ? Math.min(1, (30 - worst) / 30) : 0;
  return Math.max(2.5, 12.5 - 10 * desperation);
}

export interface WaterSpot {
  b: Belief;
  e: number;
  dng: number;
  /** 0..1: recently driven off from around here */
  trouble: number;
  /** utility cost of choosing this spot (distance, wolves, recent trouble) */
  cost: number;
}

/**
 * Known water ranked by what it costs to go there: the walk, wolves seen around it, and recent trouble getting
 * to the water nearby (e.g. being chased off). The runner-up is always somewhere else along the shore.
 */
export function rankWaterSpots(ctx: Ctx, limit = 2): WaterSpot[] {
  const { world, p } = ctx;
  const trouble: { x: number; y: number; w: number }[] = [];
  for (const k in p.failures) {
    const id = Number(k);
    if (!isWaterBeliefId(id)) continue;
    const f = p.failures[id];
    const wb = p.beliefs[id];
    if (!wb || world.tick - f.tick > 700) continue;
    trouble.push({ x: wb.x, y: wb.y, w: f.count > 1 ? 1 : 0.7 });
  }
  const caution = traitMods(p).caution;
  const all: WaterSpot[] = [];
  for (const b of beliefsByKind(p, ['water'])) {
    const e = eta(ctx, b.x, b.y);
    const dng = dangerAt(ctx, b.x, b.y);
    let tr = 0;
    for (const t of trouble) if (hyp(t.x - b.x, t.y - b.y) < 8) tr = Math.max(tr, t.w);
    all.push({ b, e, dng, trouble: tr, cost: pen(e) + 30 * dng * caution + 16 * tr });
  }
  // a well they know of and reckon to hold water is another place to drink or fill a pack (rich worlds, where wells exist)
  if (isRich(world)) {
    for (const b of beliefsByKind(p, ['building'])) {
      if (b.btype !== 'well' || wellEstimate(world, b) < 1 || recentFailure(world, p, b.id, 600)) continue;
      const e = eta(ctx, b.x, b.y);
      const dng = dangerAt(ctx, b.x, b.y);
      all.push({ b, e, dng, trouble: 0, cost: pen(e) + 30 * dng * caution });
    }
  }
  all.sort((a, b) => a.cost - b.cost);
  const picked: WaterSpot[] = [];
  for (const c of all) {
    if (picked.every((q) => hyp(q.b.x - c.b.x, q.b.y - c.b.y) > 7)) picked.push(c);
    if (picked.length >= limit) break;
  }
  return picked;
}

export class Scorer {
  total = 0;
  parts: [string, number][] = [];
  add(name: string, v: number): this {
    if (v === 0 || !isFinite(v)) return this;
    this.total += v;
    if (Math.abs(v) >= 0.5) this.parts.push([name, Math.round(v * 10) / 10]);
    return this;
  }
}

export function addOption(ctx: Ctx, o: Option): void {
  ctx.options.push(o);
}

export function addBlocked(ctx: Ctx, kind: Activity['kind'], label: string, targetId: number, reason: string, tag = ''): void {
  if (!ctx.collect) return;
  ctx.blocked.push({ kind, label, goal: '', need: null, util: 0, parts: [], eta: 0, key: `${kind}:${targetId}`, targetId, blocked: reason, tag });
}

/** can the person consider this remembered source right now? (not just failed there, not in a danger zone) */
export function sourceUsable(ctx: Ctx, b: Belief, minEst = 1): { ok: boolean; est: number; why?: string } {
  const est = estimatedAmount(ctx.world, b);
  const f = recentFailure(ctx.world, ctx.p, b.id, 520);
  if (f && est < minEst + 1) return { ok: false, est, why: `failed there ${ctx.world.tick - f.tick} ticks ago (${f.reason})` };
  if (est < minEst) return { ok: false, est, why: est <= 0 ? 'believes it is empty' : 'not enough there' };
  return { ok: true, est };
}

export function beliefsByKind(p: Person, kinds: BeliefKind[]): Belief[] {
  const out: Belief[] = [];
  for (const kind of kinds) {
    const ids = p.bykind[kind];
    if (ids) for (let i = 0; i < ids.length; i++) out.push(p.beliefs[ids[i]]);
  }
  return out;
}

/** A tile next to the remembered thing to walk to. Works even if the thing has since vanished. */
export function spotNear(world: World, p: Person, b: Belief): { x: number; y: number } | null {
  if (b.kind === 'water') {
    // shorelines change (a hut, a tree): use the remembered tile if it still works, otherwise the nearest one that does
    if (isWaterAccess(world, Math.floor(b.x), Math.floor(b.y))) return { x: b.x, y: b.y };
    return findWaterAccessNear(world, b.x, b.y, 4);
  }
  const e = world.byId.get(b.id);
  if (e) return standSpotFor(world, p, e);
  const tx = Math.floor(b.x);
  const ty = Math.floor(b.y);
  for (let r = 0; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (isWalkable(world, tx + dx, ty + dy)) return { x: tx + dx + 0.5, y: ty + dy + 0.5 };
      }
    }
  }
  return null;
}

/**
 * Where would this person look for someone? Where they are in sight, where they were last seen,
 * or (failing that) the home of their household or the building site they are working on.
 * Only uses what the searcher has seen or been told.
 */
export function whereIs(ctx: Ctx, personId: number, siteId = 0): { x: number; y: number; how: string } | null {
  const { world, p } = ctx;
  const s = ctx.seenPersons.find((x) => x.id === personId);
  if (s) return { x: s.x, y: s.y, how: 'in sight' };
  const wh = p.whereabouts[personId];
  if (wh && world.tick - wh.tick < 900) return { x: wh.x, y: wh.y, how: 'last seen' };
  const q = world.byId.get(personId);
  if (q && q.ent === 'person') {
    if (siteId && p.beliefs[siteId]) return { x: p.beliefs[siteId].x, y: p.beliefs[siteId].y, how: 'at their building site' };
    for (const k in p.beliefs) {
      const b = p.beliefs[k as unknown as number];
      if (b.kind === 'building' && b.hh === q.hhId && isHomeType(b.btype)) return { x: b.x, y: b.y, how: 'at their home' };
    }
    if (wh) return { x: wh.x, y: wh.y, how: 'last seen long ago' };
  }
  return null;
}

export function countBeliefsOfKind(p: Person, kind: BeliefKind): number {
  return p.bykind[kind]?.length ?? 0;
}

export function traitMods(p: Person) {
  const t = p.traits;
  return {
    work: 0.8 + 0.4 * t.diligence,
    social: 0.55 + 0.9 * t.sociability,
    give: 0.5 + 1.0 * t.generosity,
    explore: 0.35 + 1.3 * t.curiosity,
    caution: 0.6 + 0.8 * t.caution,
  };
}
