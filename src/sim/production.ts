import { buildable } from './expansion';
import { LOSS_THRESHOLD, foodLossOf } from './storage';
import { WELL_FAR, WELL_REACH } from './water';
import { FOREST_REACH, FOREST_THIN, edgeSpot, knownTreesNear, lodgeSpot, plantingSpot, standBeside } from './forestry';
import { isRich } from './mood';
import { winterDepth } from './hardship';
import { YARD_FAR, YARD_RESERVE, YARD_TARGET, woodDistance, yardRoom } from './stockyard';
import { newActivity } from './activities';
import { BUILD_DEF, CARRY_CAP, DAY, GRANARY_TEND_EVERY, ITEM_LABEL, RAW_MATERIALS, REPAIR_USES, TOOL_DEFS, WEIGHT, isHomeType, isSolidHome, workRules } from './constants';
import { findBuildSpot } from './buildings';
import { cartLoaded } from './carts';
import { invRoom, weightOf } from './economy';
import { delBelief, noteFailure, recentFailure } from './knowledge';
import { rankWaterSpots, Scorer, addBlocked, addOption, beliefsByKind, countBeliefsOfKind, dangerAt, eta, foodCount, pen, spotNear, traitMods } from './optutil';
import type { Ctx } from './optutil';
import { friendlyTo, gatherMaterial, hhState, isRawMaterial, materialNeeds, nightMult, settlementAnchor, wantedTools, weatherMult } from './options_work';
import { rulesOf, within } from './rules';
import { baseHub } from './settlements';
import { projectLimit, projectsUnderWay } from './act_build';
import { RECIPES, RECIPE_BY_ID, acceptedAt, isFacilityType, recipesAt, recipesMaking } from './recipes';
import type { Recipe } from './recipes';
import { toolsHeldBy } from './toolreg';
import { toolOf } from './tools';
import { stageOf } from './people';
import type { Belief, BuildingType, Items, ItemKind, Person, ToolKind } from './types';
import { hashUnit } from './rng';

import { hyp } from './util';
const unitsOf = (n: number | undefined): number => n ?? 0;

/** What somebody believes the settlement needs made or fetched, in the order they would care about it. */
export interface Demand {
  /** the building site this is for, if any (work and deliveries toward it count toward promises to help) */
  siteId?: number;
  item: ItemKind | 'cart';
  qty: number;
  /** how many of them this person already has in the right form (tools: of the right quality) */
  have: number;
  base: number;
  why: string;
  tag: string;
  /** tools: the quality asked for */
  tier?: 0 | 1;
}

// ───────────────────────── what a person knows about workplaces ─────────────────────────
interface Fac {
  b: Belief;
  type: BuildingType;
  e: number;
}

/** Could this person plausibly use that workplace? Judged from what they know of who it belongs to. */
function mayUseBelief(ctx: Ctx, b: Belief): boolean {
  if (b.hh === 0 || b.hh === ctx.p.hhId) return true;
  const real = ctx.world.byId.get(b.id);
  if (real && real.ent === 'building' && (real.ops?.builders[ctx.p.hhId] ?? 0) >= 0.2) return true;
  return friendlyTo(ctx, b.hh ?? -1) >= 12;
}

export function facilitiesOf(ctx: Ctx, type: BuildingType): Fac[] {
  const out: Fac[] = [];
  for (const b of beliefsByKind(ctx.p, ['building'])) {
    if (b.btype !== type) continue;
    if (!mayUseBelief(ctx, b)) continue;
    out.push({ b, type, e: eta(ctx, b.x, b.y) });
  }
  out.sort((a, c) => a.e - c.e);
  return out;
}

/**
 * a workplace of that kind that exists or is being built, as far as this person knows (anyone's). With scaled rules only one in their
 * own settlement counts: a workshop on the far side of the map is not a means they can plan around.
 */
export function knowsOfAny(ctx: Ctx, type: BuildingType): boolean {
  const radius = rulesOf(ctx.world).facilityRadius;
  if (radius === Infinity) return beliefsByKind(ctx.p, ['building', 'site']).some((b) => b.btype === type);
  const at = settlementAnchor(ctx);
  return beliefsByKind(ctx.p, ['building', 'site']).some((b) => b.btype === type && within(radius, at.x, at.y, b.x, b.y));
}

const stockAt = (b: Belief, item: ItemKind): number => unitsOf(b.items?.[item]);

function belief(ctx: Ctx, id: number): Belief | undefined {
  return ctx.p.beliefs[id];
}

// ───────────────────────── leaves: single things a person can go and do ─────────────────────────
function itemPhrase(items: Items): string {
  return Object.keys(items)
    .map((k) => `${items[k as ItemKind]} ${ITEM_LABEL[k as ItemKind]}`)
    .join(' and ');
}

function nameOf(b: Belief): string {
  return (b.btype ?? 'building').replace('_', ' ');
}

/** Go and take stock out of a store, a workplace's shelves or a heap. */
function collectLeaf(ctx: Ctx, b: Belief, items: Items, util0: number, why: string, tag: string, parts: [string, number][] = []): void {
  const { world, p } = ctx;
  if (recentFailure(world, p, b.id, 320)) {
    addBlocked(ctx, 'withdraw', `Collect ${itemPhrase(items)}`, b.id, `tried recently and found none to take`, tag);
    return;
  }
  const e = eta(ctx, b.x, b.y);
  const dng = dangerAt(ctx, b.x, b.y);
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  for (const [n, v] of parts) sc.add(n, v);
  if (dng > 0) sc.add('wolf nearby', -22 * dng * traitMods(p).caution);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  const place = b.kind === 'pile' ? 'the heap' : b.kind === 'cart' ? 'the parked cart' : `the ${nameOf(b)}`;
  addOption(ctx, {
    kind: 'withdraw',
    label: `Collect ${itemPhrase(items)} from ${place}`,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + 25,
    key: `collect:${b.id}:${Object.keys(items).join('+')}`,
    targetId: b.id,
    tag,
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'withdraw',
        label: `Collecting ${itemPhrase(items)}`,
        goal: why,
        targetId: b.id,
        targetType: b.kind === 'pile' ? 'pile' : 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 30,
        maxTicks: 700,
        data: { items },
      });
    },
  });
}

/** Carry goods to a workplace so that a batch can be started there. */
function depositLeaf(ctx: Ctx, b: Belief, items: Items, util0: number, why: string, tag: string, siteId = 0): void {
  const { world, p } = ctx;
  const accepted = acceptedAt((b.btype ?? 'hut') as BuildingType);
  const take: Items = {};
  for (const k of Object.keys(items) as ItemKind[]) if (accepted.includes(k) && unitsOf(p.inv[k]) > 0) take[k] = Math.min(unitsOf(items[k]), unitsOf(p.inv[k]));
  if (!Object.keys(take).length) return;
  const e = eta(ctx, b.x, b.y);
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'deposit',
    label: `Bring ${itemPhrase(take)} to the ${nameOf(b)}`,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + 20,
    key: `bring:${b.id}:${Object.keys(take).join('+')}`,
    targetId: b.id,
    tag,
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'deposit',
        label: `Bringing ${itemPhrase(take)} to the ${nameOf(b)}`,
        goal: why,
        targetId: b.id,
        targetType: 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 30,
        maxTicks: 700,
        data: { items: take, destSite: siteId },
      });
    },
  });
}

function waterLeaf(ctx: Ctx, n: number, util0: number, why: string, tag: string): void {
  const { world, p } = ctx;
  if ((p.inv.water ?? 0) >= n) return;
  const spot = rankWaterSpots(ctx, 1)[0];
  if (!spot) return;
  const b = spot.b;
  const sc = new Scorer().add(why, util0).add('walking', -pen(spot.e));
  if (spot.dng > 0) sc.add('wolf nearby', -30 * spot.dng * traitMods(p).caution);
  if (spot.trouble > 0) sc.add('was driven off near here', -16 * spot.trouble);
  const util = sc.total * nightMult(ctx);
  addOption(ctx, {
    kind: 'fetch_water',
    label: 'Fetch water',
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: spot.e + 50,
    key: 'fetch_water:production',
    targetId: b.id,
    tag,
    make: () => {
      const sp = spotNear(world, p, b);
      if (!sp) {
        delBelief(p, b.id);
        return null;
      }
      return newActivity(world, p, {
        kind: 'fetch_water',
        label: 'Fetching water',
        goal: why,
        targetId: b.id,
        targetType: b.kind === 'building' ? 'building' : 'tile',
        tx: sp.x,
        ty: sp.y,
        spotX: sp.x,
        spotY: sp.y,
        amount: Math.max(2, Math.min(4, n)),
        utility: util,
        minCommit: 40,
        maxTicks: 600,
      });
    },
  });
}

// ───────────────────────── planning a batch at a workplace ─────────────────────────
function skillBonus(p: Person, r: Recipe): number {
  return r.skill ? (p.skills[r.skill] - 1) * 9 : 0;
}

function toolAvailable(ctx: Ctx, f: Fac, r: Recipe): boolean {
  if (!r.tool?.required) return true;
  const kind = r.tool.kind;
  return unitsOf(ctx.p.inv[kind]) > 0 || (f.b.tools ?? []).includes(kind);
}

function perBatch(r: Recipe, item: ItemKind | 'cart' | 'tend'): number {
  if (item === 'cart') return 1;
  if (r.toolOut && r.toolOut.kind === item) return 1;
  if (r.fromDeposit && r.fromDeposit.item === item) return r.fromDeposit.n;
  return r.outputs[item as ItemKind] ?? 1;
}

/**
 * One batch of a recipe at a workplace: everything the batch needs is either there (so go and work), carried (so bring it),
 * or somewhere else (so that becomes the next thing to fetch). Nothing here is a guarantee: it is a plan from memory.
 */
function planRecipe(ctx: Ctx, f: Fac, r: Recipe, item: ItemKind | 'cart' | 'tend', unmet: number, base: number, why: string, tag: string, depth: number, siteId = 0): void {
  const { world, p } = ctx;
  const b = f.b;
  const snap = b.ops;
  const fresh = world.tick - b.seen < 500;
  const busy = fresh && snap?.job && snap.readyAt > world.tick;
  if (busy) {
    // somebody is working: join them if the recipe is the one that is wanted and has room for another pair of hands
    const running = RECIPE_BY_ID[snap!.job as string];
    if (running && running.id === r.id && running.workers > 1 && r.id !== 'quarry_stone' && r.id !== 'mine_ore') operateLeaf(ctx, f, r, base * 0.8, `${why} (lend a hand)`, tag, true, siteId);
    else addBlocked(ctx, 'operate', r.doing, b.id, `the ${nameOf(b)} is busy with ${running ? running.label : 'a batch'}`, tag);
    return;
  }
  if (recentFailure(world, p, b.id, 240)) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'tried recently and could not get on', tag);
    return;
  }
  if (!toolAvailable(ctx, f, r)) {
    addBlocked(ctx, 'operate', r.doing, b.id, `needs a ${r.tool!.kind === 'pick' ? 'pickaxe' : r.tool!.kind} and has none (and none is on the rack)`, tag);
    ctx.toolWanted ??= { kind: r.tool!.kind, for: r.doing.toLowerCase() };
    return;
  }
  if (r.fromDeposit && snap && snap.deposit >= 0 && snap.deposit < r.fromDeposit.n) {
    addBlocked(ctx, 'operate', r.doing, b.id, r.at === 'mine' ? 'the vein is worked out' : 'the outcrop is worked out', tag);
    return;
  }
  if (b.cond !== undefined && b.cond < 12) {
    addBlocked(ctx, 'operate', r.doing, b.id, 'too run down to use', tag);
    return;
  }
  // inputs
  const need: Items = {};
  for (const k of Object.keys(r.inputs) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.inputs[k]);
  for (const k of Object.keys(r.fuel) as ItemKind[]) need[k] = (need[k] ?? 0) + unitsOf(r.fuel[k]);
  const short: Items = {};
  // (rich worlds) piles seen to be someone else's are not there for this batch
  const heldByOthers = (k: ItemKind): number => (snap?.held ?? []).reduce((n, [item, m, owner]) => n + (item === k && owner !== p.id ? m : 0), 0);
  for (const k of Object.keys(need) as ItemKind[]) {
    const lack = unitsOf(need[k]) - Math.max(0, stockAt(b, k) - heldByOthers(k));
    if (lack > 0) short[k] = lack;
  }
  if (!Object.keys(short).length) {
    operateLeaf(ctx, f, r, base * 0.97, why, tag, false, siteId);
    return;
  }
  // bring what is carried
  const carryAll: Items = {};
  let anyCarried = false;
  let stillShort = false;
  for (const k of Object.keys(short) as ItemKind[]) {
    const have = unitsOf(p.inv[k]);
    if (have > 0) {
      carryAll[k] = Math.min(have, unitsOf(short[k]));
      anyCarried = true;
    }
    if (have < unitsOf(short[k])) stillShort = true;
  }
  if (anyCarried) depositLeaf(ctx, b, carryAll, base * 0.92, `${why} (${r.label})`, tag, siteId);
  if (depth >= 2) {
    // too deep to plan further stages, but raw materials are the end of any chain: wood for the charcoal, ore, clay and stone can always be gathered by hand
    for (const k of Object.keys(short) as ItemKind[]) {
      const missing = unitsOf(short[k]) - unitsOf(p.inv[k]);
      if (missing > 0 && isRawMaterial(k)) supply(ctx, k, missing, base * 0.93, `${why} (${r.label})`, tag, depth + 1, b, undefined, siteId);
    }
    return;
  }
  // what is still missing has to come from somewhere
  if (stillShort) {
    for (const k of Object.keys(short) as ItemKind[]) {
      const missing = unitsOf(short[k]) - unitsOf(p.inv[k]);
      if (missing > 0) supply(ctx, k, missing, base * 0.93, `${why} (${r.label})`, tag, depth + 1, b, undefined, siteId);
    }
  }
}

function operateLeaf(ctx: Ctx, f: Fac, r: Recipe, util0: number, why: string, tag: string, joining: boolean, siteId = 0): void {
  const { world, p } = ctx;
  const b = f.b;
  const e = f.e;
  const crowd = ctx.seenPersons.filter((s) => s.act === 'operate' && hyp(s.x - b.x, s.y - b.y) < 5).length;
  const sc = new Scorer().add(why, util0).add('walking', -pen(e));
  const sb = skillBonus(p, r);
  if (sb > 0.5) sc.add('practised at it', sb);
  if (crowd >= r.workers) sc.add('already crowded', -12);
  if (r.id === 'quarry_stone') sc.add('cuts stone far faster than breaking small rocks', 5);
  if (r.id === 'mine_ore') sc.add('digs ore by the load instead of chipping at the vein', 5);
  if (r.id === 'saw_planks') sc.add('a saw wastes far less wood', 4);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'operate',
    label: joining ? `Lend a hand at the ${nameOf(b)}` : r.doing,
    goal: why,
    need: null,
    util,
    parts: sc.parts,
    eta: e + r.work,
    key: `operate:${b.id}:${r.id}`,
    targetId: b.id,
    tag,
    make: () => {
      const spot = spotNear(world, p, b);
      if (!spot) return null;
      return newActivity(world, p, {
        kind: 'operate',
        label: joining ? `Heading to help at the ${nameOf(b)}` : r.doing,
        goal: why,
        targetId: b.id,
        targetType: 'building',
        tx: b.x,
        ty: b.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: util,
        minCommit: 80,
        maxTicks: Math.max(900, r.work * 3),
        data: { recipe: r.id, client: p.id, purpose: why, destSite: siteId },
      });
    },
  });
}

// ───────────────────────── supply: how to get hold of something ─────────────────────────
function collectOptions(ctx: Ctx, item: ItemKind | 'cart', unmet: number, base: number, why: string, tag: string, dest: Belief | null): number {
  if (item === 'cart') return 0;
  const { world, p } = ctx;
  const found: { b: Belief; n: number; e: number }[] = [];
  for (const b of beliefsByKind(p, ['building', 'pile', 'cart'])) {
    if (dest && b.id === dest.id) continue;
    let n = stockAt(b, item);
    if (b.kind === 'building') {
      if (b.btype === 'granary') {
        // only the household's own share may be drawn out for its own purposes
        const real = world.byId.get(b.id);
        const share = real && real.ent === 'building' ? (real.ops?.shares[p.hhId]?.[item] ?? 0) : 0;
        n = Math.min(n, share);
      } else if (b.btype && isFacilityType(b.btype as BuildingType)) {
        if (!mayUseBelief(ctx, b)) continue;
        // a batch of mine that will be ready by the time I arrive counts
        const snap = b.ops;
        if (snap && snap.job && snap.client === p.id && snap.readyAt <= world.tick + eta(ctx, b.x, b.y) + 60) n += unitsOf(snap.yields[item]);
      } else if (b.btype === 'storehouse' || b.btype === 'stockyard') {
        // everyone's
      } else if (b.hh !== p.hhId) continue;
      else if (item === 'grain' || item === 'bread' || item === 'flour' || item === 'fish' || item === 'fruit' || item === 'berries' || item === 'smoked') {
        // the household's own food is not to be spent making things unless there is plenty
        const hs = hhState(ctx);
        n = Math.max(0, Math.min(n, Math.floor(hs.foodStock - hs.foodTarget * 1.1)));
      }
    } else if (b.kind === 'cart') {
      if ((b.hh ?? -1) !== p.hhId && b.hh !== 0) continue;
    }
    if (n < 1) continue;
    found.push({ b, n, e: eta(ctx, b.x, b.y) });
  }
  found.sort((a, c) => a.e - c.e);
  let total = 0;
  for (const f of found) total += f.n;
  for (const f of found.slice(0, 2)) {
    const take = Math.min(f.n, Math.max(1, Math.ceil(unmet)), invRoom(ctx.world, p, item as ItemKind));
    if (take < 1) continue;
    collectLeaf(ctx, f.b, { [item]: take } as Items, base * 0.95, why, tag);
  }
  return total;
}

function supply(ctx: Ctx, item: ItemKind | 'cart' | 'tend', qty: number, base: number, why: string, tag: string, depth: number, dest: Belief | null, haveOverride?: number, siteId = 0): void {
  const { p } = ctx;
  const carried = item === 'cart' || item === 'tend' ? 0 : unitsOf(p.inv[item]);
  const have = haveOverride ?? (dest ? 0 : carried);
  const unmet = qty - have;
  if (unmet <= 0) return;
  let remaining = unmet;
  if (item !== 'tend') remaining = unmet - collectOptions(ctx, item, unmet, base, why, tag, dest);
  // what is already standing on somebody's shelves counts: no one makes more of what is already there
  if (remaining <= 0) return;
  if (item !== 'cart' && item !== 'tend') {
    if (isRawMaterial(item)) {
      gatherMaterial(ctx, item, remaining, base * 0.92 * traitMods(p).work, why, tag);
      if (item !== 'stone' && !(item === 'ore' && facilitiesOf(ctx, 'mine').length > 0)) return; // stone can also be cut at a quarry, ore dug at a mine
    }
    if (item === 'water') {
      waterLeaf(ctx, Math.ceil(remaining), base * 0.92, why, tag);
      return;
    }
  }
  if (depth >= 3) return;
  const recipes = item === 'tend' ? recipesAt('granary') : recipesMaking(item);
  const seen = new Set<string>();
  for (const r of recipes) {
    const fac = facilitiesOf(ctx, r.at)[0];
    if (!fac) {
      if (!seen.has(r.at)) {
        seen.add(r.at);
        addBlocked(ctx, 'operate', r.doing, 0, `does not know of a ${BUILD_DEF[r.at].label} they may use`, tag);
      }
      continue;
    }
    // charcoal is burnt in a clamp where one is known: the kiln is for bricks
    if (r.id === 'burn_charcoal' && facilitiesOf(ctx, 'clamp').length) continue;
    // flour is ground at a windmill where one is known: the bakery keeps its oven
    if (r.id === 'mill_flour' && facilitiesOf(ctx, 'mill').length) continue;
    // prefer the better way of making something when its tool is to hand: sawing beats hewing
    if (r.id === 'hew_planks' && (unitsOf(p.inv.saw) > 0 || (fac.b.tools ?? []).includes('saw'))) continue;
    if (r.id === 'saw_planks' && !(unitsOf(p.inv.saw) > 0 || (fac.b.tools ?? []).includes('saw')) && unitsOf(p.inv.axe) > 0) continue;
    planRecipe(ctx, fac, r, item, remaining, base, why, tag, depth, siteId);
  }
}

// ───────────────────────── what is wanted ─────────────────────────
const PROCESSED: ItemKind[] = ['planks', 'handles', 'bricks', 'charcoal', 'iron', 'flour', 'bread', 'beer', 'furniture'];
const quarryAware = (ctx: Ctx, item: ItemKind): boolean => (item === 'stone' && facilitiesOf(ctx, 'quarry').length > 0) || (item === 'ore' && facilitiesOf(ctx, 'mine').length > 0);

/** Demands this person is aware of: from building sites they know, repairs, their own tools, their household's table. */
export function demandsOf(ctx: Ctx): Demand[] {
  const { world, p } = ctx;
  const out: Demand[] = [];
  const grouped: Record<string, { n: number; base: number; why: string; tag: string; siteId?: number }> = {};
  for (const n of materialNeeds(ctx)) {
    if (!PROCESSED.includes(n.item) && !quarryAware(ctx, n.item)) continue;
    const cur = grouped[n.item];
    if (!cur) grouped[n.item] = { n: n.n, base: n.base, why: n.why, tag: n.tag, siteId: n.siteId };
    else {
      cur.n += n.n;
      if (n.base > cur.base) {
        cur.base = n.base;
        cur.why = n.why;
        cur.tag = n.tag;
        cur.siteId = n.siteId;
      }
    }
  }
  for (const k of Object.keys(grouped)) {
    const g = grouped[k];
    out.push({ item: k as ItemKind, qty: g.n, have: 0, base: g.base * traitMods(p).work, why: g.why, tag: g.tag, siteId: g.siteId });
  }
  // promises to bring materials to a site count as wants of their own, at the weight of the promise
  for (const c of p.commitments) {
    if (c.status !== 'active' || c.kind !== 'haul' || !c.item || !PROCESSED.includes(c.item)) continue;
    const left = c.amount - (c.delivered ?? 0);
    if (left > 0) out.push({ item: c.item, qty: left, have: 0, base: 50, why: 'to keep my promise to bring it', tag: 'promise', siteId: c.siteId });
  }
  const tm = traitMods(p);

  // (rich worlds) a bed for a solid home whose household woke cold lately or keeps a child or an elder, where a timber yard is known
  if (isRich(world) && ctx.home && ctx.hh && isSolidHome(ctx.home.type) && facilitiesOf(ctx, 'timber_yard').length) {
    const homeBelief = p.beliefs[ctx.home.id];
    const have = unitsOf(homeBelief?.items?.furniture) + unitsOf(p.inv.furniture);
    const members = ctx.hh.members.map((id) => world.byId.get(id)).filter((q): q is Person => !!q && q.ent === 'person' && q.alive);
    const cold = members.some((q) => world.tick - (q.cooldowns.coldNight ?? -1e9) < DAY * 3);
    const frail = members.some((q) => stageOf(world, q) === 'child' || stageOf(world, q) === 'elder');
    if (have < 1 && (cold || frail)) out.push({ item: 'furniture', qty: 1, have, base: (24 + (cold ? 10 : 0) + 4 * p.traits.diligence) * tm.work, why: cold ? 'we woke cold in the night: a bed off the ground would keep us warm' : 'the little ones and the old need a bed off the cold ground', tag: 'craft' });
  }

  // (rich worlds) fish beyond what the household will eat soon is smoked where a smokehouse is known, so it keeps
  if (isRich(world) && ctx.home && facilitiesOf(ctx, 'smokehouse').length) {
    const hs = hhState(ctx);
    const fish = unitsOf(p.inv.fish) + unitsOf(p.beliefs[ctx.home.id]?.items?.fish);
    const spare = Math.min(fish, Math.floor(hs.foodStock - hs.foodTarget * 1.1));
    const smoked = unitsOf(p.inv.smoked);
    if (spare >= 4 && smoked < 4) out.push({ item: 'smoked', qty: 4, have: smoked, base: (22 + 6 * p.traits.diligence) * tm.work, why: 'to smoke our spare fish before it goes off', tag: 'food' });
  }

  // (rich worlds) a tool wanted at all is wanted in iron when a smithy they may use has iron and a handle on its shelf
  if (isRich(world)) {
    const kind = wantedTools(ctx).find((k) => k !== 'basket'); // (the smithy forges every hand tool but a basket)
    if (kind) {
      // (a handle is fetched by the forge plan itself, from the yard or the shelf; the want outranks making a stone one by hand)
      const f = facilitiesOf(ctx, 'smithy').find((x) => stockAt(x.b, 'iron') >= 1);
      if (f && !toolsHeldBy(world, p.id, kind).some((t) => t.tier === 1)) out.push({ item: kind, qty: 1, have: 0, base: (20 + 8 * p.traits.diligence) * tm.work, why: `to have an iron ${TOOL_DEFS[kind].label}: it cuts faster and lasts twice as long`, tag: 'craft', tier: 1 });
    }
  }

  // a tool that is wearing out is worth replacing with an iron one, where a smithy can be used
  if (facilitiesOf(ctx, 'smithy').length) {
    let worst: { kind: ToolKind; wear: number } | null = null;
    for (const t of toolsHeldBy(world, p.id)) {
      if (t.kind === 'basket' || t.kind === 'jar' || t.tier === 1) continue;
      if (toolsHeldBy(world, p.id, t.kind).some((x) => x.tier === 1)) continue;
      if (t.wear >= 18 && (!worst || t.wear > worst.wear)) worst = { kind: t.kind, wear: t.wear };
    }
    if (worst) {
      out.push({ item: worst.kind, qty: 1, have: 0, base: (13 + (worst.wear - 18) * 0.3) * tm.work, why: `to replace my worn ${TOOL_DEFS[worst.kind].label} with an iron one`, tag: 'craft', tier: 1 });
    }
  }

  // water is heavy to carry for those who fetch it for others
  if (facilitiesOf(ctx, 'kiln').length && unitsOf(p.inv.jar) < 1 && (p.stats.farmed >= 6 || ctx.dependents.some((d) => stageOf(world, d) === 'child'))) {
    out.push({ item: 'jar', qty: 1, have: 0, base: 10 * tm.work, why: 'to carry more water at a time', tag: 'craft' });
  }

  // a handcart for the one who keeps hauling heavy loads over a long way
  if (facilitiesOf(ctx, 'timber_yard').length && wantsCart(ctx)) {
    out.push({ item: 'cart', qty: 1, have: 0, base: 14 * tm.work, why: 'to haul heavy loads', tag: 'craft' });
  }

  // bread for a household that has grain to spare
  if (facilitiesOf(ctx, 'bakery').length) {
    const hs = hhState(ctx);
    const members = Math.max(1, ctx.members.length);
    const target = Math.min(8, Math.ceil(1.2 * members));
    const granary = facilitiesOf(ctx, 'granary')[0];
    const realG = granary ? world.byId.get(granary.b.id) : undefined;
    const share = realG && realG.ent === 'building' ? (realG.ops?.shares[p.hhId] ?? {}) : {};
    const haveBread = unitsOf(p.inv.bread) + unitsOf(ctx.home ? p.beliefs[ctx.home.id]?.items?.bread : 0) + unitsOf(share.bread);
    const surplusGrain = unitsOf(p.inv.grain) + unitsOf(ctx.home ? p.beliefs[ctx.home.id]?.items?.grain : 0) + unitsOf(share.grain);
    if (hs.foodStock >= hs.foodTarget * 1.1 && surplusGrain >= 4 && haveBread < target) {
      out.push({ item: 'bread', qty: target - haveBread, have: haveBread, base: (22 + 6 * (ctx.dependents.length > 0 ? 1 : 0)) * tm.work, why: 'to turn spare grain into bread for the household', tag: 'food' });
    }
  }
  return out;
}

/** Someone who has just been carrying heavy materials a long way wants wheels. */
function wantsCart(ctx: Ctx): boolean {
  const { p, world } = ctx;
  if (world.carts.some((c) => c.ownerHh === p.hhId || c.ownerHh === 0)) return false;
  if (beliefsByKind(p, ['cart']).some((b) => b.hh === p.hhId || b.hh === 0)) return false;
  let heavy = 0;
  for (const s of beliefsByKind(p, ['site'])) {
    if (!(s.hh === p.hhId || s.hh === 0)) continue;
    for (const k of Object.keys(s.need ?? {}) as ItemKind[]) heavy += unitsOf(s.need?.[k]) * WEIGHT[k];
  }
  return heavy >= 40 && p.skills.build >= 0.9 && p.traits.diligence > 0.4;
}

// ───────────────────────── upkeep of tools, carts and the granary ─────────────────────────
function optToolMaintenance(ctx: Ctx): void {
  const { world, p } = ctx;
  for (const t of toolsHeldBy(world, p.id)) {
    if (t.kind === 'jar' || t.wear < 52) continue;
    const mat = unitsOf(p.inv.handles) > 0 ? 'handles' : unitsOf(p.inv.wood) > 0 ? 'wood' : null;
    if (!mat) continue;
    const sc = new Scorer().add(`my ${TOOL_DEFS[t.kind].label} is wearing out`, 9 + (t.wear - 52) * 0.55 + 6 * p.traits.diligence);
    const util = sc.total * nightMult(ctx);
    addOption(ctx, {
      kind: 'tool_work',
      label: `Mend my ${TOOL_DEFS[t.kind].label}`,
      goal: 'so it does not break at a bad moment',
      need: null,
      util,
      parts: sc.parts,
      eta: 70,
      key: `mend:${t.id}`,
      targetId: 0,
      tag: 'craft',
      make: () => newActivity(world, p, { kind: 'tool_work', label: `Mending my ${TOOL_DEFS[t.kind].label}`, goal: 'so it does not break at a bad moment', here: true, utility: util, minCommit: 40, maxTicks: 400, data: { toolId: t.id } }),
    });
    break;
  }
  // the household's cart, if it is standing here
  for (const b of beliefsByKind(p, ['cart'])) {
    const c = world.byId.get(b.id);
    if (!c || c.ent !== 'cart' || (c.ownerHh !== p.hhId && c.ownerHh !== 0) || c.wear < 50 || c.puller) continue;
    if (hyp(c.x - p.x, c.y - p.y) > 14) continue;
    if (!(unitsOf(p.inv.planks) > 0 || unitsOf(p.inv.handles) > 0 || unitsOf(p.inv.wood) > 0)) continue;
    const e = eta(ctx, c.x, c.y);
    const sc = new Scorer().add('the cart is wearing out', 8 + (c.wear - 50) * 0.4).add('walking', -pen(e));
    addOption(ctx, {
      kind: 'tool_work',
      label: 'Mend the handcart',
      goal: 'so the cart keeps rolling',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: e + 90,
      key: `mend:cart:${c.id}`,
      targetId: c.id,
      tag: 'craft',
      make: () => newActivity(world, p, { kind: 'tool_work', label: 'Mending the handcart', goal: 'so the cart keeps rolling', targetId: c.id, targetType: 'cart', tx: c.x, ty: c.y, spotX: c.x + 1, spotY: c.y, utility: sc.total, minCommit: 40, maxTicks: 500, data: { cartId: c.id } }),
    });
    break;
  }
}

/** Tending the grain bins is a chore for whoever has grain in them, and for the public-spirited. */
function optTendGranary(ctx: Ctx): void {
  const { world, p } = ctx;
  const g = facilitiesOf(ctx, 'granary')[0];
  if (!g) return;
  const snap = g.b.ops;
  const held = foodCount(g.b.items ?? {}) + unitsOf(g.b.items?.flour) + unitsOf(g.b.items?.bread);
  if (held < 3) return;
  const since = world.tick - (snap?.tended ?? g.b.seen - GRANARY_TEND_EVERY);
  if (since < GRANARY_TEND_EVERY * 0.55) return;
  const real = world.byId.get(g.b.id);
  const mine = real && real.ent === 'building' && (real.ops?.shares[p.hhId]?.grain ?? 0) + (real.ops?.shares[p.hhId]?.bread ?? 0) + (real.ops?.shares[p.hhId]?.flour ?? 0) > 0;
  const urgency = Math.min(1, (since - GRANARY_TEND_EVERY * 0.55) / (GRANARY_TEND_EVERY * 0.6));
  const base = (7 + 10 * urgency + (mine ? 9 : 0) + 6 * p.traits.generosity) * traitMods(p).work;
  const r = RECIPE_BY_ID.tend_granary;
  planRecipe(ctx, g, r, 'tend', 1, base, 'to keep the stored grain from spoiling', 'store', 0);
}

/** A household with spare grain, flour or bread puts it in the granary, where it keeps. */
function optGranaryStore(ctx: Ctx): void {
  const { p } = ctx;
  const g = facilitiesOf(ctx, 'granary')[0];
  if (!g) return;
  const keep = ctx.drives.hunger > 0 ? 4 : 3;
  const items: Items = {};
  let n = 0;
  for (const k of ['grain', 'flour', 'bread'] as ItemKind[]) {
    const have = unitsOf(p.inv[k]);
    const give = k === 'grain' ? Math.max(0, have - keep) : have;
    if (give >= 2) {
      items[k] = give;
      n += give;
    }
  }
  if (n < 3) return;
  depositLeaf(ctx, g.b, items, 11 + Math.min(10, n) + 5 * p.traits.diligence, 'to keep our grain from spoiling', 'store');
}

/**
 * A tool they no longer need (a second one of the same kind, or the old wooden one after getting an iron one) is left on the
 * rack of a workshop that uses it, where anyone who works there can pick it up and then bring it back.
 */
function optRackSpare(ctx: Ctx): void {
  const { world, p } = ctx;
  if (p.traits.generosity < 0.42) return;
  const held = toolsHeldBy(world, p.id);
  for (const t of held) {
    if (t.loan || t.kind === 'basket' || t.kind === 'jar') continue;
    const same = held.filter((x) => x.kind === t.kind && !x.loan);
    if (same.length < 2) continue;
    // the spare is the worse of the two
    const spare = same.sort((a, c) => (c.tier - a.tier) || a.wear - c.wear)[same.length - 1];
    if (spare.id !== t.id) continue;
    let target: Fac | null = null;
    for (const type of ['timber_yard', 'smithy', 'quarry', 'mine', 'kiln', 'bakery'] as BuildingType[]) {
      if (!recipesAt(type).some((r) => r.tool?.kind === t.kind)) continue;
      const f = facilitiesOf(ctx, type)[0];
      if (f && (f.b.hh === 0 || f.b.hh === p.hhId) && !(f.b.tools ?? []).includes(t.kind)) {
        target = f;
        break;
      }
    }
    if (!target) continue;
    const sc = new Scorer().add(`a spare ${t.kind} could stay at the ${nameOf(target.b)} for whoever works there`, 9 + 6 * p.traits.generosity).add('walking', -pen(target.e));
    const b = target.b;
    addOption(ctx, {
      kind: 'deposit',
      label: `Leave a spare ${t.kind} at the ${nameOf(b)}`,
      goal: 'so others can use it and bring it back',
      need: null,
      util: sc.total * nightMult(ctx),
      parts: sc.parts,
      eta: target.e + 20,
      key: `rack:${b.id}:${t.kind}`,
      targetId: b.id,
      tag: 'craft',
      make: () => {
        const spot = spotNear(world, p, b);
        if (!spot) return null;
        return newActivity(world, p, { kind: 'deposit', label: `Leaving a spare ${t.kind} at the ${nameOf(b)}`, goal: 'so others can use it', targetId: b.id, targetType: 'building', tx: b.x, ty: b.y, spotX: spot.x, spotY: spot.y, utility: sc.total, minCommit: 20, maxTicks: 600, data: { items: { [t.kind]: 1 } } });
      },
    });
    break;
  }
}

// ───────────────────────── hauling with a cart ─────────────────────────
function optCartHaul(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25) return;
  const carts = beliefsByKind(p, ['cart']).filter((b) => b.state === 'parked' && (b.hh === p.hhId || b.hh === 0) && world.byId.get(b.id)?.ent === 'cart');
  const mineCart = p.cartId ? world.byId.get(p.cartId) : null;
  if (!carts.length && !(mineCart && mineCart.ent === 'cart')) return;
  const cb = carts[0] ?? (mineCart ? ({ id: mineCart.id, x: p.x, y: p.y } as Belief) : null);
  if (!cb) return;
  const cartEnt = world.byId.get(cb.id);
  if (!cartEnt || cartEnt.ent !== 'cart' || cartLoaded(cartEnt)) return;
  for (const site of beliefsByKind(p, ['site'])) {
    const rel = p.beliefs[site.id];
    if (!rel || !(site.hh === p.hhId || site.hh === 0 || friendlyTo(ctx, site.hh ?? -1) >= 20 || (site.btype && isFacilityType(site.btype as BuildingType)))) continue;
    const need = site.need ?? {};
    const kinds = Object.keys(need) as ItemKind[];
    if (!kinds.length) continue;
    // where is the stuff? the one place that has the most of it
    let best: { src: Belief; load: Items; weight: number } | null = null;
    for (const src of beliefsByKind(p, ['building', 'pile'])) {
      if (src.id === site.id) continue;
      if (src.kind === 'building' && src.btype && isFacilityType(src.btype as BuildingType) && !mayUseBelief(ctx, src)) continue;
      if (src.kind === 'building' && !isFacilityType(src.btype as BuildingType) && src.btype !== 'storehouse' && src.btype !== 'stockyard') continue;
      const load: Items = {};
      let w = 0;
      for (const k of kinds) {
        const n = Math.min(unitsOf(need[k]), stockAt(src, k));
        if (n <= 0) continue;
        const room = Math.floor((cartEnt.cap - w) / WEIGHT[k]);
        const take = Math.min(n, room);
        if (take > 0) {
          load[k] = take;
          w += take * WEIGHT[k];
        }
      }
      if (w >= 14 && (!best || w > best.weight)) best = { src, load, weight: w };
    }
    if (!best) continue;
    const eCart = eta(ctx, cb.x, cb.y);
    const eSrc = hyp(best.src.x - cb.x, best.src.y - cb.y) * 1.3 / Math.max(0.03, ctx.speed * 0.85);
    const eSite = hyp(site.x - best.src.x, site.y - best.src.y) * 1.3 / Math.max(0.03, ctx.speed * 0.8);
    const total = eCart + eSrc + eSite;
    // the same load on foot would take several trips, each a there-and-back over the same ground: that is what the wheels save
    const footTrips = Math.max(1, Math.ceil(best.weight / Math.max(4, CARRY_CAP[ctx.stage as keyof typeof CARRY_CAP] ?? 12)));
    const legEta = (hyp(site.x - best.src.x, site.y - best.src.y) * 1.18) / Math.max(0.03, ctx.speed);
    const sc = new Scorer().add('a cart can move all of it in one go', 24 + Math.min(14, best.weight * 0.3));
    if (footTrips > 1) sc.add(`it would take ${footTrips} trips on foot`, Math.min(40, (footTrips - 1) * pen(2 * legEta)));
    sc.add('walking', -pen(total) * 0.7);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    const load = best.load;
    const src = best.src;
    addOption(ctx, {
      kind: 'cart_haul',
      label: `Cart ${itemPhrase(load)} to the ${(site.btype ?? 'building').replace('_', ' ')} site`,
      goal: 'to bring the materials in one trip',
      need: null,
      util,
      parts: sc.parts,
      eta: total + 60,
      key: `cart:${cb.id}:${site.id}`,
      targetId: cb.id,
      tag: 'site',
      make: () => {
        const ce = world.byId.get(cb.id);
        if (!ce || ce.ent !== 'cart') return null;
        return newActivity(world, p, {
          kind: 'cart_haul',
          label: 'Fetching the handcart',
          goal: 'to bring the materials in one trip',
          targetId: ce.id,
          targetType: 'cart',
          tx: ce.x,
          ty: ce.y,
          spotX: ce.x,
          spotY: ce.y,
          utility: util,
          minCommit: 60,
          maxTicks: 2600,
          data: { cartId: ce.id, fromId: src.id, toId: site.id, items: load, leg: 0, sticky: true },
        });
      },
    });
    break;
  }
}

// ───────────────────────── starting a workplace ─────────────────────────
export interface FacilityWant {
  type: BuildingType;
  signal: number;
  why: string;
}

function ownsHut(ctx: Ctx): boolean {
  return !!ctx.home && isSolidHome(ctx.home.type);
}

function planksWanted(ctx: Ctx): number {
  let n = 0;
  for (const s of beliefsByKind(ctx.p, ['site'])) n += unitsOf(s.need?.planks);
  return n;
}

function bricksWanted(ctx: Ctx): number {
  let n = 0;
  for (const s of beliefsByKind(ctx.p, ['site'])) n += unitsOf(s.need?.bricks);
  return n;
}

/** Is this household a candidate for rebuilding its hut as a house? Crowded, with children or elders, or with a roof wearing thin. */
export function upgradeWish(ctx: Ctx): number {
  const { home, members, dependents } = ctx;
  if (!home || home.type !== 'hut' || home.upgrading) return 0;
  let w = 0;
  if (members.length >= 4) w += 0.45;
  else if (members.length >= 3) w += 0.25;
  if (dependents.length > 0) w += 0.3;
  if (home.condition < 72) w += 0.3;
  return Math.min(1, w);
}

export function facilityWants(ctx: Ctx): FacilityWant[] {
  const { p, world } = ctx;
  const out: FacilityWant[] = [];
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  const knowRocks = countBeliefsOfKind(p, 'rock') + countBeliefsOfKind(p, 'outcrop') >= 1;
  if (!knowTrees || !knowRocks) return out;
  const hs = hhState(ctx);
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  const wish = upgradeWish(ctx);
  const haveYard = knowsOfAny(ctx, 'timber_yard');
  const haveKiln = knowsOfAny(ctx, 'kiln');
  const clayKnown = countBeliefsOfKind(p, 'clay_pit') > 0;
  const oreKnown = countBeliefsOfKind(p, 'ore_vein') > 0;
  const outcrops = beliefsByKind(p, ['outcrop']).filter((b) => b.amount >= 10);
  const stonePoor = countBeliefsOfKind(p, 'rock') < 4;
  const stoneNeeded = beliefsByKind(p, ['site']).reduce((n, s) => n + unitsOf(s.need?.stone), 0);
  const solidHomes = beliefsByKind(p, ['building']).filter((b) => isSolidHome(b.btype)).length;
  const grainKnown = unitsOf(p.inv.grain) + beliefsByKind(p, ['building']).filter((b) => b.hh === p.hhId).reduce((n, b) => n + unitsOf(b.items?.grain), 0);
  const plots = world.plots.filter((pl) => pl.hhId === p.hhId).length;

  if (!haveYard) {
    let s = 0;
    const planks = planksWanted(ctx);
    if (planks > 0) s += 0.9;
    if (wish > 0.5) s += 0.55;
    if ((p.skills.carpentry > 1.05 || p.traits.curiosity > 0.6) && init > 0.5) s += 0.15;
    if (s >= 0.5) out.push({ type: 'timber_yard', signal: Math.min(1, s), why: planks > 0 ? 'planks are wanted and there is no yard to saw them' : 'the old hut is too small and too poor a roof: a yard would give us planks' });
  }
  if (!knowsOfAny(ctx, 'quarry') && outcrops.length > 0) {
    let s = 0;
    if (stoneNeeded >= 6) s += 0.7;
    if (stonePoor) s += 0.35;
    if (haveYard || knowsOfAny(ctx, 'kiln')) s += 0.15;
    if (s >= 0.55) out.push({ type: 'quarry', signal: Math.min(1, s), why: 'stone is wanted and loose rocks are few — there is a big outcrop to cut' });
  }
  if (!haveKiln && clayKnown) {
    let s = 0;
    if (bricksWanted(ctx) > 0) s += 0.9;
    if (wish > 0.5 && haveYard) s += 0.5;
    if (knowsOfAny(ctx, 'smithy') || (oreKnown && haveYard && init > 0.55)) s += 0.45;
    if (s >= 0.55) out.push({ type: 'kiln', signal: Math.min(1, s), why: bricks_or_charcoal(ctx) });
  }
  if (!knowsOfAny(ctx, 'smithy') && oreKnown && haveKiln) {
    let s = 0;
    const worn = toolsHeldBy(world, p.id).some((t) => t.wear >= 25 && t.kind !== 'jar');
    if (worn) s += 0.5;
    if (!(unitsOf(p.inv.axe) > 0 && unitsOf(p.inv.pick) > 0)) s += 0.2;
    if (init > 0.5) s += 0.25;
    if (s >= 0.6 || (oreKnown && init > 0.5 && world.tick > DAY * 14)) out.push({ type: 'smithy', signal: Math.min(1, s), why: 'tools are wearing out and there is ore to be smelted' });
  }
  if (!knowsOfAny(ctx, 'granary') && haveYard && hs.shortage < 0.5) {
    let s = 0;
    if (grainKnown >= 6) s += 0.5;
    if (plots >= 2) s += 0.4;
    if (init > 0.45) s += 0.15;
    if (s >= 0.6) out.push({ type: 'granary', signal: Math.min(1, s), why: 'the grain keeps going off in the stores' });
  }
  if (!knowsOfAny(ctx, 'bakery') && haveKiln && hs.shortage < 0.4) {
    let s = 0;
    if (grainKnown >= 8) s += 0.45;
    if (plots >= 2) s += 0.3;
    if (knowsOfAny(ctx, 'granary')) s += 0.2;
    if (p.traits.generosity > 0.5) s += 0.1;
    if (s >= 0.6) out.push({ type: 'bakery', signal: Math.min(1, s), why: 'grain could be milled and baked into bread' });
  }
  // a well: the household's water is a long walk away, and no well they know of is near (rich worlds)
  if (buildable(world, 'well') && ctx.home && !(world.tick < DAY * 3)) {
    const hx = ctx.home.x + ctx.home.w / 2;
    const hy = ctx.home.y + ctx.home.h / 2;
    let shore = Infinity;
    for (const b of beliefsByKind(p, ['water'])) shore = Math.min(shore, hyp(b.x - hx, b.y - hy));
    // (a well is laid out up to 8 tiles from home and may not stand within WELL_REACH of another: a well that near is 'near enough')
    const wellNear = beliefsByKind(p, ['building', 'site']).some((b) => b.btype === 'well' && hyp(b.x - hx, b.y - hy) < WELL_REACH + 8);
    const neighbours = beliefsByKind(p, ['building']).filter((b) => isHomeType(b.btype) && b.id !== ctx.home!.id && hyp(b.x - hx, b.y - hy) < 10).length;
    if (!wellNear && shore > WELL_FAR && shore < Infinity && (ctx.members.length >= 2 || neighbours >= 2)) {
      const s = 0.55 + 0.03 * Math.min(15, shore - WELL_FAR) + 0.05 * Math.min(neighbours, 4);
      out.push({ type: 'well', signal: Math.min(1, s), why: `the nearest water I know is ${Math.round(shore)} tiles from home, and a well close to the houses would save the walk` });
    }
  }
  // a cellar: this household keeps finding food gone off in its own stores (rich worlds)
  if (buildable(world, 'cellar') && ctx.home && ctx.hh) {
    const lost = foodLossOf(world, ctx.hh);
    const own = beliefsByKind(p, ['building', 'site']).some((b) => b.btype === 'cellar' && b.hh === p.hhId);
    // (and there has to be food worth protecting in the home store: the household's own count, not a guess)
    if (!own && lost >= LOSS_THRESHOLD && hs.homeFood >= 5) out.push({ type: 'cellar', signal: Math.min(1, 0.55 + 0.06 * lost), why: `we keep finding food gone off (about ${Math.round(lost)} units lately): a cellar would keep it cool` });
  }
  // a forester's lodge: the wood near home is thin by what this person knows of it (rich worlds)
  if (buildable(world, 'forester') && ctx.home && !knowsOfAny(ctx, 'forester') && world.tick >= DAY * 4) {
    const trees = knownTreesNear(p, beliefsByKind(p, ['tree']), ctx.home.x + ctx.home.w / 2, ctx.home.y + ctx.home.h / 2);
    if (trees < FOREST_THIN) out.push({ type: 'forester', signal: Math.min(1, 0.5 + 0.04 * (FOREST_THIN - trees) + (haveYard ? 0.1 : 0)), why: `only ${trees} trees that I know of stand near home: someone should be planting` });
  }
  // a stockyard: the settlement builds, and the wood this person gets is a long walk from the camp (rich worlds)
  if (buildable(world, 'stockyard') && ctx.home && !knowsOfAny(ctx, 'stockyard') && world.tick >= DAY * 6 && (haveYard || solidHomes >= 3)) {
    // (the walk this person knows is the one from their own door; the yard itself goes by the camp, where the settlement builds)
    const far = woodDistance(beliefsByKind(p, ['tree']), ctx.home.x + ctx.home.w / 2, ctx.home.y + ctx.home.h / 2);
    const rawWanted = stoneNeeded + beliefsByKind(p, ['site']).reduce((n, s) => n + unitsOf(s.need?.wood), 0);
    if (far > YARD_FAR && far < Infinity && (rawWanted >= 6 || haveYard)) {
      const s = 0.5 + 0.02 * Math.min(20, far - YARD_FAR) + (rawWanted >= 6 ? 0.15 : 0) + 0.1 * init;
      out.push({ type: 'stockyard', signal: Math.min(1, s), why: `the wood I fetch is about ${Math.round(far)} tiles from home: a yard by the houses would save every builder the walk` });
    }
  }
  // a brewery: a hall is known for the shared meals, and the household has grain to spare that it has seen go off (rich worlds)
  if (buildable(world, 'brewery') && !knowsOfAny(ctx, 'brewery') && knowsOfAny(ctx, 'hall') && ctx.hh && ctx.home) {
    const grain = unitsOf(p.inv.grain) + unitsOf(p.beliefs[ctx.home.id]?.items?.grain);
    if (grain >= 10 && hs.foodStock >= hs.foodTarget * 1.1 && foodLossOf(world, ctx.hh) >= 2) out.push({ type: 'brewery', signal: Math.min(1, 0.55 + 0.3 * p.traits.sociability), why: 'we have grain going off and a hall to gather in: brewed, it would make the shared meals an evening' });
  }
  // a smokehouse: the household has more fish than it will eat before it goes off, and a cellar already stands or the hard season is here (rich worlds)
  if (buildable(world, 'smokehouse') && !knowsOfAny(ctx, 'smokehouse') && ctx.home) {
    const fish = unitsOf(p.inv.fish) + unitsOf(p.beliefs[ctx.home.id]?.items?.fish);
    const ownCellar = beliefsByKind(p, ['building']).some((b) => b.btype === 'cellar' && b.hh === p.hhId);
    if (fish >= 8 && (ownCellar || winterDepth(world) > 0 || !!world.hardship)) out.push({ type: 'smokehouse', signal: Math.min(1, 0.6 + 0.2 * init), why: `we have ${fish} fish, more than we can eat before it goes off: smoked, it would keep for the lean days` });
  }
  // a windmill: this person came to the bakery with grain and found its one job taken (rich worlds; the failure is noted in act_production)
  if (buildable(world, 'mill') && !knowsOfAny(ctx, 'mill') && grainKnown >= 6) {
    const bakery = beliefsByKind(p, ['building']).find((b) => b.btype === 'bakery');
    const turned = bakery ? recentFailure(world, p, bakery.id, DAY * 4) : null;
    if (bakery && turned && /busy/.test(turned.reason)) out.push({ type: 'mill', signal: Math.min(1, 0.6 + 0.2 * init), why: "the bakery was busy when I came with grain: a windmill would grind it without taking the oven" });
  }
  // a charcoal clamp: the smithy has no charcoal and the kiln is for bricks; a clamp by the trees burns it (rich worlds)
  if (buildable(world, 'clamp') && !knowsOfAny(ctx, 'clamp') && knowTrees && isSmith(ctx)) {
    const smithy = beliefsByKind(p, ['building']).find((b) => b.btype === 'smithy' && b.items !== undefined);
    if (smithy && stockAt(smithy, 'charcoal') < 2) out.push({ type: 'clamp', signal: Math.min(1, 0.6 + 0.3 * init), why: 'the smithy has no charcoal and the kiln is for bricks: a clamp by the trees would burn it' });
  }
  // a mine: a smithy is known, its ore is running short or tools are wearing out, and there is a vein with plenty in it (rich worlds)
  if (buildable(world, 'mine') && !knowsOfAny(ctx, 'mine') && knowsOfAny(ctx, 'smithy')) {
    const veins = beliefsByKind(p, ['ore_vein']).filter((b) => b.amount >= 12);
    const smithy = beliefsByKind(p, ['building']).find((b) => b.btype === 'smithy');
    if (veins.length > 0 && smithy) {
      // (an idle smithy with bare shelves is not a demand for ore: someone has to want iron, which today means a tool of theirs wearing out)
      const worn = toolsHeldBy(world, p.id).filter((t) => t.wear >= 25 && t.kind !== 'jar').length;
      if ((worn > 0 || isSmith(ctx)) && stockAt(smithy, 'ore') < 3) {
        const s = 0.5 + 0.1 * Math.min(worn, 2) + 0.2 * init + (isSmith(ctx) ? 0.1 : 0);
        if (s >= 0.6) out.push({ type: 'mine', signal: Math.min(1, s), why: 'my tools are wearing out, the smithy has no ore and a vein is known: a mine would bring it out by the load' });
      }
    }
  }
  if (!knowsOfAny(ctx, 'hall') && haveYard && solidHomes >= 3 && hs.shortage < 0.5) {
    let s = 0.55 * p.traits.sociability + 0.3 * p.traits.generosity;
    if (solidHomes >= 5) s += 0.2;
    if (s >= 0.6) out.push({ type: 'hall', signal: Math.min(1, s), why: 'we need somewhere to eat and talk together out of the weather' });
  }
  return out;
}

function bricks_or_charcoal(ctx: Ctx): string {
  if (bricksWanted(ctx) > 0) return 'bricks are wanted and there is clay but no kiln';
  return 'clay could be fired into bricks and jars, and wood burned to charcoal';
}

/** iron and handles kept on a smithy's shelf for whoever needs a tool */
const SMITHY_SHELF: Partial<Record<ItemKind, number>> = { iron: 2, handles: 2 };

/** the smith (rich worlds): whoever has practised at the smithy, or is diligent enough to take it up; skills start at 1.0, and smith skill grows fastest */
export function isSmith(ctx: Ctx): boolean {
  return isRich(ctx.world) && (ctx.p.skills.smith > 1.05 || ctx.p.traits.diligence > 0.6);
}

/**
 * The smith (rich worlds): someone who knows a smithy they may use, has the skill or the diligence, and in slack time keeps iron on its
 * shelf: smelting when ore and charcoal are there, otherwise fetching them (a vein or a mine for the ore; a kiln or a clamp for the
 * charcoal, through the ordinary supply planning). A batch for the shelf belongs to nobody, so anyone may forge with its iron.
 */
function optStockSmithy(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isSmith(ctx) || world.tick < DAY * 6) return;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25 || ctx.drives.energy > 40) return;
  const f = facilitiesOf(ctx, 'smithy')[0];
  if (!f) return;
  if (hashUnit(p.id, Math.floor(world.tick / 400), 83) > 0.45 + 0.45 * p.traits.diligence) return;
  const before = ctx.options.length;
  // (a trade, not an idle afternoon: it pays about what a site does, because its chain is four legs long and each must win in turn)
  const base = (22 + 6 * p.traits.diligence + 6 * Math.max(0, p.skills.smith - 1)) * traitMods(p).work;
  for (const k of ['iron', 'handles'] as const) {
    const short = (SMITHY_SHELF[k] ?? 0) - stockAt(f.b, k);
    if (short > 0) supply(ctx, k, short, k === 'iron' ? base : base * 0.8, `to keep ${k} on the smithy's shelf for whoever needs a tool`, 'craft', 0, f.b);
  }
  for (let i = before; i < ctx.options.length; i++) {
    const o = ctx.options[i];
    if (o.kind !== 'operate' || o.targetId !== f.b.id || !o.make) continue;
    const mk = o.make;
    o.make = () => {
      const a = mk();
      if (a && a.data.recipe === 'smelt_iron') {
        a.data.client = 0;
        a.data.purpose = 'for the shelf';
      }
      return a;
    };
  }
}

/** A bed carried home is set up in the home store (rich worlds): the one deposit that is neither food, a workshop input nor raw goods. */
function optBringBedHome(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!isRich(world) || !ctx.home || unitsOf(p.inv.furniture) < 1) return;
  const h = p.beliefs[ctx.home.id];
  if (!h) return;
  const e = eta(ctx, h.x, h.y);
  const sc = new Scorer().add('carrying a bed for our home', 30).add('walking', -pen(e));
  addOption(ctx, {
    kind: 'deposit',
    label: 'Take the bed home',
    goal: 'to sleep warm',
    need: null,
    util: sc.total * nightMult(ctx),
    parts: sc.parts,
    eta: e + 20,
    key: `deposit:${h.id}:furniture`,
    targetId: h.id,
    tag: 'craft',
    make: () => {
      const spot = spotNear(world, p, h);
      if (!spot) return null;
      return newActivity(world, p, { kind: 'deposit', label: 'Setting up the bed at home', goal: 'to sleep warm', targetId: h.id, targetType: 'building', tx: h.x, ty: h.y, spotX: spot.x, spotY: spot.y, utility: sc.total, minCommit: 40, maxTicks: 900, data: { items: { furniture: 1 }, sticky: true } });
    },
  });
}

/** crocks of beer a hall is kept stocked with, for the shared meals */
const HALL_BEER = 4;

/**
 * The brewer (rich worlds): someone sociable or practised at baking who knows a hall and a brewery keeps beer at the hall. Carrying beer,
 * they take it there; otherwise, in slack time, they brew (through the ordinary supply planning: grain, water, the brewery).
 */
function optStockHall(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!buildable(world, 'brewery') || world.tick < DAY * 6) return;
  if (!(p.traits.sociability > 0.55 || p.skills.bake > 1.05)) return;
  const hall = beliefsByKind(p, ['building']).find((b) => b.btype === 'hall');
  if (!hall || !facilitiesOf(ctx, 'brewery').length) return;
  const short = HALL_BEER - stockAt(hall, 'beer');
  const carried = unitsOf(p.inv.beer);
  if (carried > 0) {
    depositLeaf(ctx, hall, { beer: carried }, 18 + 6 * p.traits.sociability, 'to pour at the shared meals in the hall', 'social');
    return;
  }
  if (short <= 0) return;
  if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25 || ctx.drives.energy > 40) return;
  if (hashUnit(p.id, Math.floor(world.tick / 400), 89) > 0.35 + 0.5 * p.traits.sociability) return;
  supply(ctx, 'beer', short, (22 + 6 * p.traits.sociability) * traitMods(p).work, 'to have beer for the shared meals in the hall', 'social', 0, null);
}

/** The stockyard: stack the raw goods I carry beyond my own reserve; in slack time, fetch more when the yard I know is low (rich worlds). */
function optStockYard(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!buildable(world, 'stockyard') || world.tick < DAY * 5) return;
  const yard = beliefsByKind(p, ['building'])
    .filter((b) => b.btype === 'stockyard')
    .sort((a, c) => hyp(a.x - p.x, a.y - p.y) - hyp(c.x - p.x, c.y - p.y))[0];
  if (!yard) return;
  const room = yardRoom(yard);
  const e = eta(ctx, yard.x, yard.y);
  // what this person is carrying for a purpose of their own (a site, a repair, a tool, the fire) is not spare
  const needed: Partial<Record<ItemKind, number>> = {};
  for (const nd of materialNeeds(ctx)) needed[nd.item] = (needed[nd.item] ?? 0) + nd.n;
  const items: Items = {};
  let w = 0;
  let n = 0;
  for (const k of RAW_MATERIALS) {
    const spare = unitsOf(p.inv[k]) - (YARD_RESERVE[k] ?? 0) - (needed[k] ?? 0);
    const take = Math.min(spare, Math.floor((room - w) / WEIGHT[k]));
    if (take >= 1) {
      items[k] = take;
      w += take * WEIGHT[k];
      n += take;
    }
  }
  if (n > 0) {
    {
      const target = (YARD_TARGET.wood ?? 0) * WEIGHT.wood + (YARD_TARGET.stone ?? 0) * WEIGHT.stone;
      const empty = Math.max(0, Math.min(1, (room - (BUILD_DEF.stockyard.cap - target)) / target)); // 1 when the yard holds nothing of its target, 0 when it is stocked
      const sc = new Scorer().add('raw goods to stack for whoever builds next', 10 + Math.min(n, 10) * 1.2 + 3 * p.traits.generosity).add('the yard is low', 8 * empty).add('walking', -pen(e));
      if (sc.total >= 6) {
        const util = sc.total * nightMult(ctx) * weatherMult(ctx);
        addOption(ctx, {
          kind: 'deposit',
          label: `Stack ${itemPhrase(items)} at the stockyard`,
          goal: 'for whoever builds or works next',
          need: null,
          util,
          parts: sc.parts,
          eta: e + 20,
          key: `deposit:${yard.id}:raw`,
          targetId: yard.id,
          tag: 'store',
          make: () => {
            const spot = spotNear(world, p, yard);
            if (!spot) return null;
            return newActivity(world, p, {
              kind: 'deposit',
              label: `Stacking ${itemPhrase(items)} at the stockyard`,
              goal: 'for whoever builds or works next',
              targetId: yard.id,
              targetType: 'building',
              tx: yard.x,
              ty: yard.y,
              spotX: spot.x,
              spotY: spot.y,
              utility: util,
              minCommit: 40,
              maxTicks: 600,
              data: { items },
            });
          },
        });
      }
    }
  } else if (room >= 6) {
    // keeping it stocked is slack-time work for the diligent, never a chore for everyone on the same afternoon
    if (ctx.drives.hunger > 25 || ctx.drives.thirst > 25 || ctx.drives.energy > 40) return;
    if (hashUnit(p.id, Math.floor(world.tick / 400), 77) > 0.45 + 0.45 * p.traits.diligence) return;
    // the one good the yard is shortest of (a gather scan is not cheap: one per review, not one per kind)
    let pick: 'wood' | 'stone' | null = null;
    let pickMissing = 0;
    let pickShort = 0;
    for (const k of ['wood', 'stone'] as const) {
      const target = YARD_TARGET[k] ?? 0;
      const missing = Math.min(target - stockAt(yard, k), Math.floor(room / WEIGHT[k]));
      if (missing < 2 || missing / target <= pickShort) continue;
      pick = k;
      pickMissing = missing;
      pickShort = missing / target;
    }
    if (pick) {
      // (below what a site or a workshop pays, above an idle afternoon: the yard is filled in slack time, not instead of a roof)
      const base = (12 + 8 * pickShort + 4 * p.traits.diligence) * traitMods(p).work;
      gatherMaterial(ctx, pick, pickMissing, base, `to keep the stockyard stocked with ${ITEM_LABEL[pick]}`, 'store');
    }
  }
}

/** Planting: a person who knows a forester's lodge and knows the wood near home is thin goes and sets a young tree (rich worlds). */
function optPlantTrees(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!buildable(world, 'forester') || !ctx.home || world.tick < DAY * 4) return;
  const lodge = beliefsByKind(p, ['building']).filter((b) => b.btype === 'forester').sort((a, c) => hyp(a.x - p.x, a.y - p.y) - hyp(c.x - p.x, c.y - p.y))[0];
  if (!lodge) return;
  const treeBeliefs = beliefsByKind(p, ['tree']);
  const trees = knownTreesNear(p, treeBeliefs, ctx.home.x + ctx.home.w / 2, ctx.home.y + ctx.home.h / 2);
  if (trees >= FOREST_THIN + 4) return;
  if (hashUnit(p.id, Math.floor(world.tick / 500), 91) > 0.25 + 0.45 * p.traits.diligence) return;
  if (recentFailure(world, p, lodge.id, 700)) {
    addBlocked(ctx, 'plant_tree', 'Plant a tree', lodge.id, 'tried recently and could not', 'work');
    return;
  }
  // a young tree is raised from a grown one: there has to be one, as far as this person knows, within the lodge's reach
  if (!treeBeliefs.some((b) => b.amount >= 2 && hyp(b.x - lodge.x, b.y - lodge.y) <= FOREST_REACH)) {
    addBlocked(ctx, 'plant_tree', 'Plant a tree', lodge.id, 'knows of no grown tree near the lodge to raise one from', 'work');
    return;
  }
  // (the spot itself is chosen when the option is taken: the search is the world's ground, not something to run at every review)
  const e = eta(ctx, lodge.x, lodge.y) + FOREST_REACH * 4;
  const sc = new Scorer().add(`only ${trees} trees that I know of stand near home; the lodge can raise more`, 13 + 1.0 * (FOREST_THIN - Math.min(trees, FOREST_THIN)) + 4 * p.traits.diligence).add('walking', -pen(e));
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'plant_tree',
    label: 'Plant a young tree',
    goal: 'to thicken the wood near home',
    need: null,
    util,
    parts: sc.parts,
    eta: e + PLANT_ETA,
    key: 'plant_tree',
    targetId: lodge.id,
    tag: 'work',
    make: () => {
      const spot = plantingSpot(world, p, { x: lodge.x, y: lodge.y });
      if (!spot) {
        noteFailure(world, p, lodge.id, 'no good open ground near the lodge');
        return null;
      }
      const stand = standBeside(world, p, spot);
      return newActivity(world, p, {
        kind: 'plant_tree',
        label: 'Planting a young tree',
        goal: 'to thicken the wood near home',
        targetId: lodge.id,
        targetType: 'building',
        tx: spot.x + 0.5,
        ty: spot.y + 0.5,
        spotX: stand.x,
        spotY: stand.y,
        data: { sticky: true }, // a planting is finished once begun, unless danger or a deadly need says otherwise
      });
    },
  });
}
const PLANT_ETA = 150;

function optPlanFacilities(ctx: Ctx): void {
  const { world, p, hh } = ctx;
  if (!hh || ctx.stage === 'child') return;
  if (world.settings.scene !== 'natural') return; // new projects are an ordinary-world decision; staged scenes stay as staged
  if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28 || ctx.drives.energy > 40) return;
  if (world.tick < DAY * 5 || !ownsHut(ctx)) return; // first things first: a proper roof, for this household and (as far as they know) for others
  if (beliefsByKind(p, ['building']).filter((b) => isSolidHome(b.btype)).length < 2) return;
  if (projectsUnderWay(world, false, settlementAnchor(ctx)) >= projectLimit(world)) return;
  if (beliefsByKind(p, ['site']).some((s) => s.hh === hh.id && s.btype && isFacilityType(s.btype as BuildingType))) return;
  const tm = traitMods(p);
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  if (init < 0.42) return;
  for (const w of facilityWants(ctx)) {
    const type = w.type;
    // improvements are taken up by a few, not by everyone on the same afternoon
    if (hashUnit(p.id, Math.floor(world.tick / 500), Object.keys(BUILD_DEF).indexOf(type)) > 0.25 + 0.4 * init) continue;
    const key = -3000 - Object.keys(BUILD_DEF).indexOf(type);
    if (recentFailure(world, p, key, 900)) {
      addBlocked(ctx, 'plan_site', `Lay out a ${BUILD_DEF[type].label}`, 0, 'could not find a good spot or was beaten to it recently', 'build');
      continue;
    }
    const base = (9 + 20 * w.signal) * tm.work * (0.7 + 0.5 * init);
    const sc = new Scorer().add(w.why, base);
    const util = sc.total * nightMult(ctx) * weatherMult(ctx);
    addOption(ctx, {
      kind: 'plan_site',
      label: `Lay out a ${BUILD_DEF[type].label}`,
      goal: w.why,
      need: null,
      util,
      parts: sc.parts,
      eta: 70,
      key: `plan_site:${type}`,
      targetId: 0,
      tag: 'build',
      make: () => {
        const d = BUILD_DEF[type];
        const camp = baseHub(world, p, ctx.home);
        let spot: { x: number; y: number } | null = null;
        let depositId = 0;
        if (type === 'quarry' || type === 'mine') {
          const dep = beliefsByKind(p, [type === 'mine' ? 'ore_vein' : 'outcrop'])
            .filter((b) => b.amount >= 10 && world.byId.get(b.id))
            .sort((a, c) => hyp(a.x - camp.x, a.y - camp.y) - hyp(c.x - camp.x, c.y - camp.y))[0];
          if (dep) {
            depositId = dep.id;
            spot = findBuildSpot(world, p, type, dep.x, dep.y, 1.5, 6, 3);
          }
        } else if (type === 'stockyard') spot = findBuildSpot(world, p, type, camp.x, camp.y, 3, 10, 5);
        else if (type === 'forester') {
          const h = ctx.home;
          spot = lodgeSpot(world, p, h ? h.x + h.w / 2 : camp.x, h ? h.y + h.h / 2 : camp.y) ?? findBuildSpot(world, p, type, camp.x, camp.y, 5, 14, 8);
        } else if (type === 'mill') spot = findBuildSpot(world, p, type, camp.x, camp.y, 7, 16, 11);
        else if (type === 'smokehouse' || type === 'brewery') spot = findBuildSpot(world, p, type, camp.x, camp.y, 5, 12, 8);
        else if (type === 'clamp') {
          // by the trees it burns, and well away from the houses it smokes over
          spot = edgeSpot(world, p, camp.x, camp.y, 'clamp', 0.75, 3, 9, 5) ?? findBuildSpot(world, p, type, camp.x, camp.y, 8, 16, 11);
        }
        else if (type === 'well' || type === 'cellar') {
          const h = ctx.home;
          spot = h ? findBuildSpot(world, p, type, h.x + h.w / 2, h.y + h.h / 2, 2, type === 'well' ? 8 : 7, type === 'well' ? 4 : 3) : null;
        } else if (type === 'granary' || type === 'hall') spot = findBuildSpot(world, p, type, camp.x, camp.y, 3, 11, 6);
        else if (type === 'kiln' || type === 'smithy') spot = findBuildSpot(world, p, type, camp.x, camp.y, 7, 15, 10);
        else spot = findBuildSpot(world, p, type, camp.x, camp.y, 5, 14, 8);
        if (!spot) {
          noteFailure(world, p, key, 'no suitable spot');
          return null;
        }
        return newActivity(world, p, {
          kind: 'plan_site',
          label: `Marking out a ${d.label}`,
          goal: w.why,
          tx: spot.x + d.w / 2,
          ty: spot.y + d.h / 2,
          spotX: spot.x + 0.5,
          spotY: spot.y + d.h + 0.5,
          utility: util,
          minCommit: 60,
          maxTicks: 800,
          data: { type, sx: spot.x, sy: spot.y, hh: hh.id, depositId },
        });
      },
    });
  }
}

/** A household that has outgrown its hut, and knows where planks and bricks come from, may decide to rebuild it as a house. */
function optPlanUpgrade(ctx: Ctx): void {
  const { world, p, hh, home } = ctx;
  if (!hh || !home || ctx.stage === 'child') return;
  if (world.settings.scene !== 'natural') return;
  if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28) return;
  const wish = upgradeWish(ctx);
  if (wish < 0.45) return;
  const hs = hhState(ctx);
  if (hs.shortage > 0.35) return;
  if (projectsUnderWay(world, true, settlementAnchor(ctx)) >= projectLimit(world)) return;
  // the means have to exist or at least be under way, as far as this person knows
  const yard = knowsOfAny(ctx, 'timber_yard');
  const kiln = knowsOfAny(ctx, 'kiln');
  if (!yard || !kiln) return;
  if (beliefsByKind(p, ['site']).some((s) => s.hh === hh.id)) return;
  if (world.sites.some((s) => s.hhId === hh.id)) return;
  const key = -3500;
  if (recentFailure(world, p, key, 1200)) return;
  // not everyone in the household sets out to do it at once
  if (hashUnit(p.id, Math.floor(world.tick / 400), 31) > 0.35 + 0.4 * p.traits.diligence) return;
  const tm = traitMods(p);
  const sc = new Scorer().add('the hut is too small and wearing thin: rebuild it as a proper house', (10 + 20 * wish) * tm.work);
  const util = sc.total * nightMult(ctx) * weatherMult(ctx);
  addOption(ctx, {
    kind: 'plan_site',
    label: 'Plan to rebuild the hut as a house',
    goal: 'to give the household a better home',
    need: null,
    util,
    parts: sc.parts,
    eta: 40,
    key: 'plan_site:house',
    targetId: home.id,
    tag: 'build',
    make: () => {
      const h = world.byId.get(home.id);
      if (!h || h.ent !== 'building' || h.type !== 'hut') {
        noteFailure(world, p, key, 'no hut to rebuild');
        return null;
      }
      const d = BUILD_DEF.house;
      return newActivity(world, p, {
        kind: 'plan_site',
        label: 'Marking out the rebuilding of the hut',
        goal: 'to give the household a better home',
        tx: h.x + d.w / 2,
        ty: h.y + d.h / 2,
        spotX: h.doorX + 0.5,
        spotY: h.doorY + 0.5,
        utility: util,
        minCommit: 40,
        maxTicks: 600,
        data: { type: 'house', sx: h.x, sy: h.y, hh: hh.id, upgradeOf: h.id },
      });
    },
  });
}

/** how long a step taken toward something keeps the rest of its chain in mind (rich worlds) */
const PLAN_MOMENTUM = DAY * 1.5;

// ───────────────────────── entry point ─────────────────────────
export function productionOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (ctx.stage === 'child') return;
  if (!workRules(world.settings.scene)) return; // staged scenes stay exactly as staged
  if (ctx.drives.hunger > 30 || ctx.drives.thirst > 30 || ctx.drives.energy > 45) return;
  if (p.health < 45) return;
  const demands = demandsOf(ctx);
  const rich = isRich(world);
  for (const d of demands) {
    // (rich worlds) a job already begun is carried through: the next step of a chain this person has lately taken a step in is worth more
    const key = 'plan:' + d.item;
    const begun = rich && world.tick - (p.cooldowns[key] ?? -1e9) < PLAN_MOMENTUM;
    const before = ctx.options.length;
    supply(ctx, d.item, d.qty, begun ? d.base + 12 : d.base, begun ? `${d.why} (already under way)` : d.why, d.tag, 0, null, d.item === 'cart' || d.tier ? d.have : undefined, d.siteId ?? 0);
    if (!rich) continue;
    for (let i = before; i < ctx.options.length; i++) {
      const o = ctx.options[i];
      if (!o.make) continue;
      const mk = o.make;
      o.make = () => {
        const a = mk();
        if (a) p.cooldowns[key] = world.tick;
        return a;
      };
    }
  }
  optGranaryStore(ctx);
  optTendGranary(ctx);
  optToolMaintenance(ctx);
  optCartHaul(ctx);
  optRackSpare(ctx);
  optStockYard(ctx);
  optStockSmithy(ctx);
  optStockHall(ctx);
  optBringBedHome(ctx);
  optPlantTrees(ctx);
  optPlanFacilities(ctx);
  optPlanUpgrade(ctx);
}

void RECIPES;
void REPAIR_USES;
void weightOf;
void toolOf;
void belief;

/**
 * A person who would start a workshop if they only knew where the clay, the ore or the big outcrop was goes looking for it.
 * Returns what they are after, or null.
 */
export function depositLead(ctx: Ctx): { what: 'clay_pit' | 'ore_vein' | 'outcrop'; why: string } | null {
  const { p, world } = ctx;
  if (ctx.stage === 'child' || world.tick < DAY * 4) return null;
  const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
  if (init < 0.45) return null;
  const hs = hhState(ctx);
  if (hs.shortage > 0.45) return null;
  const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
  if (!knowTrees) return null;
  if (countBeliefsOfKind(p, 'clay_pit') === 0 && (bricksWanted(ctx) > 0 || (upgradeWish(ctx) > 0.5 && knowsOfAny(ctx, 'timber_yard')))) return { what: 'clay_pit', why: 'to find clay for bricks' };
  if (countBeliefsOfKind(p, 'outcrop') === 0 && countBeliefsOfKind(p, 'rock') < 4 && beliefsByKind(p, ['site']).some((s) => unitsOf(s.need?.stone) >= 4)) return { what: 'outcrop', why: 'to find a big stone outcrop' };
  if (countBeliefsOfKind(p, 'ore_vein') === 0 && knowsOfAny(ctx, 'kiln') && toolsHeldBy(world, p.id).some((t) => t.wear >= 25 && t.kind !== 'jar')) return { what: 'ore_vein', why: 'to find ore for iron tools' };
  return null;
}
