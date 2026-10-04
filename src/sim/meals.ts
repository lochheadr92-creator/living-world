import { faceToward, newActivity, registerHandler, standSpotFor } from './activities';
import type { WorkResult } from './activities';
import { DAY, NUTRITION, workRules } from './constants';
import { dropNear } from './buildings';
import { consume, foodUnits, pickFood, transfer } from './economy';
import { dayFraction } from './environment';
import { addEvent, addFx, addLog, say as speak } from './events';
import { pickNews, tellBelief } from './news';
import type { Ctx } from './optutil';
import { Scorer, addBlocked, addOption, beliefsByKind, eta, pen, spotNear, traitMods } from './optutil';
import { personById } from './registry';
import { adjustRel } from './relations';
import { hashUnit } from './rng';
import type { Activity, Belief, FoodKind, Items, ItemKind, Meal, Person, World } from './types';
import { stageOf } from './people';

/**
 * Shared meals, as one interaction from start to finish:
 *   invitation (a real conversation) → acceptance (a servings reservation) → travel to a physical place → the host sets out
 *   food that actually exists (it leaves their pack for the table) → people eat it, a serving each, one unit at a time → the
 *   meal ends in a named way. Every other ending (no food, nobody came, danger, an urgent need, the place lost) is recorded
 *   with its reason, and an invitation that fails is not repeated for a long time.
 */
export const MEAL_LEAD = 520;
export const HOST_COOLDOWN_DONE = DAY;
export const HOST_COOLDOWN_FAILED = Math.round(DAY * 1.5);
export const INVITE_COOLDOWN = Math.round(DAY * 0.9);
const MAX_GUESTS = 4;

const bubble = (world: World, p: Person, text: string, kind: 'say' | 'ask' | 'happy' = 'say', ticks = 54): void => speak(world, p, text, kind, ticks);

// ───────────────────────── lookups ─────────────────────────
export function openMeals(world: World): Meal[] {
  return world.meals.filter((m) => m.status === 'inviting' || m.status === 'gathering' || m.status === 'eating');
}

/** The meal this person is hosting or has accepted an invitation to (still to happen or under way). */
export function mealOf(world: World, p: Person): Meal | null {
  for (const m of world.meals) {
    if (m.status === 'done' || m.status === 'cancelled') continue;
    if (m.host === p.id || m.accepted.includes(p.id)) return m;
  }
  return null;
}

export function previousMealOf(world: World, p: Person): Meal | null {
  for (let i = world.meals.length - 1; i >= 0; i--) {
    const m = world.meals[i];
    if ((m.status === 'done' || m.status === 'cancelled') && (m.host === p.id || m.invited.includes(p.id))) return m;
  }
  return null;
}

/** Servings of the host's own food spoken for by a meal they have called: not theirs to give away meanwhile. */
export function mealReserved(world: World, p: Person): number {
  let n = 0;
  for (const m of world.meals) if (m.host === p.id && (m.status === 'inviting') && foodUnits(m.table) === 0) n += m.reserved + 1;
  return n;
}

function tableUnits(m: Meal): number {
  return foodUnits(m.table);
}

// ───────────────────────── where ─────────────────────────
interface Place {
  id: number;
  name: string;
  x: number;
  y: number;
  hall: boolean;
}

/** A place for people to gather: the hall if one is known, otherwise the host's own home door or a lit fire. */
function placeFor(ctx: Ctx): Place | null {
  const { p } = ctx;
  let best: { pl: Place; score: number } | null = null;
  for (const b of beliefsByKind(p, ['building'])) {
    if (b.btype === 'hall' && (b.cond ?? 100) > 15) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      const score = 20 - d * 0.2;
      if (!best || score > best.score) best = { pl: { id: b.id, name: 'the communal hall', x: b.x, y: b.y + 2.4, hall: true }, score };
    } else if (b.btype === 'fire' && (b.fuel ?? 0) - (ctx.world.tick - b.seen) > 300) {
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      const score = 6 - d * 0.2;
      if (!best || score > best.score) best = { pl: { id: b.id, name: 'the fire', x: b.x + 0.5, y: b.y + 1.6, hall: false }, score };
    }
  }
  return best ? best.pl : null;
}

// ───────────────────────── deciding to host ─────────────────────────
function spareFood(ctx: Ctx): number {
  const { p } = ctx;
  const keep = 2 + ctx.dependents.length * 2;
  return Math.max(0, foodUnits(p.inv) - keep);
}

function hostingWindow(ctx: Ctx): boolean {
  const f = dayFraction(ctx.world.tick); // the same clock everyone else sleeps and works by
  return f > 0.5 && f < 0.68; // an invitation made in the afternoon puts the meal (MEAL_LEAD later) at dusk
}

export function mealOptions(ctx: Ctx): void {
  const { world, p } = ctx;
  if (!workRules(world.settings.scene)) return;
  if (ctx.stage === 'child') return;
  const mine = mealOf(world, p);
  if (mine) {
    // a meal already called is kept unless something truly pressing has come up
    if (ctx.criticals.length === 0 && ctx.drives.thirst < 70 && ctx.drives.energy < 60) {
      if (mine.host === p.id) hostOptions(ctx, mine);
      else guestOptions(ctx, mine);
    }
    return;
  }
  if (ctx.drives.hunger > 24 || ctx.drives.thirst > 24 || ctx.drives.energy > 40) return;
  // an invitation to extend: only to friends or housemates, and only with food actually in hand
  if ((p.cooldowns.hostMeal ?? 0) > world.tick) return;
  if (!hostingWindow(ctx)) return;
  const spare = spareFood(ctx);
  if (spare < 3) return;
  const place = placeFor(ctx);
  if (!place) {
    addBlocked(ctx, 'socialize', 'Invite people to a meal', 0, 'knows of no hall or fire to gather at', 'meal');
    return;
  }
  const tm = traitMods(p);
  let best: { q: Person; s: number } | null = null;
  for (const s of ctx.seenPersons) {
    if (s.asleep || s.busyTalking || s.child) continue;
    const q = personById(world, s.id);
    if (!q || !q.alive || q.hhId === p.hhId && false) continue;
    if (mealOf(world, q)) continue;
    if ((p.cooldowns['invite' + q.id] ?? 0) > world.tick) continue;
    const rel = p.relations[q.id];
    const aff = rel?.affinity ?? 0;
    if (aff < 6 && q.hhId !== p.hhId) continue;
    if (rel && rel.avoidUntil > world.tick) continue;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d > 14) continue;
    const score = aff * 0.1 + (s.hungry ? 3 : 0) - d * 0.15;
    if (!best || score > best.s) best = { q, s: score };
  }
  if (!best) return;
  const q = best.q;
  const sc = new Scorer()
    .add('food to share and good company to share it with', (7 + 14 * (p.traits.sociability * 0.6 + p.traits.generosity * 0.4)) * tm.social)
    .add('walking', -pen(Math.hypot(q.x - p.x, q.y - p.y) * 6));
  if (place.hall) sc.add('a hall to eat in', 3);
  if (sc.total < 7) return;
  const s = ctx.seenPersons.find((x) => x.id === q.id)!;
  const e = (Math.hypot(s.x - p.x, s.y - p.y) * 1.18) / Math.max(0.03, ctx.speed);
  addOption(ctx, {
    kind: 'socialize',
    label: `Invite ${q.name} to eat together at ${place.name}`,
    goal: 'to share a meal',
    need: 'social',
    util: sc.total,
    parts: sc.parts,
    eta: e + 70,
    key: `socialize:${q.id}:invite`,
    targetId: q.id,
    tag: 'meal',
    make: () => {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      return newActivity(world, p, {
        kind: 'socialize',
        label: `Inviting ${q.name} to a meal`,
        goal: 'to share a meal',
        need: 'social',
        targetId: q.id,
        targetType: 'person',
        tx: s.x,
        ty: s.y,
        spotX: s.x + (dx / dist) * 1.35,
        spotY: s.y + (dy / dist) * 1.35,
        utility: sc.total,
        minCommit: 40,
        maxTicks: 420,
        data: { purpose: 'invite', conv: { mealPlan: { placeId: place.id, placeName: place.name, x: place.x, y: place.y } } },
      });
    },
  });
}

function hostOptions(ctx: Ctx, m: Meal): void {
  const { world, p } = ctx;
  const tooLate = world.tick > m.at + 700;
  if (tooLate) return;
  // keep inviting while there is room at the table
  if (m.status === 'inviting' && m.invited.length < MAX_GUESTS && m.accepted.length + 1 < Math.min(MAX_GUESTS + 1, foodUnits(p.inv)) && world.tick < m.at - 240) {
    for (const s of ctx.seenPersons) {
      if (s.asleep || s.busyTalking || s.child) continue;
      const q = personById(world, s.id);
      if (!q || m.invited.includes(q.id) || mealOf(world, q)) continue;
      if ((p.cooldowns['invite' + q.id] ?? 0) > world.tick) continue;
      const rel = p.relations[q.id];
      if ((rel?.affinity ?? 0) < 6 && q.hhId !== p.hhId) continue;
      if (rel && rel.avoidUntil > world.tick) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d > 11) continue;
      const sc = new Scorer().add('room at the table', 22).add('walking', -pen(d * 6));
      const e = (d * 1.18) / Math.max(0.03, ctx.speed);
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const dist = Math.hypot(dx, dy) || 1;
      addOption(ctx, {
        kind: 'socialize',
        label: `Invite ${q.name} to the meal`,
        goal: 'to share a meal',
        need: 'social',
        util: sc.total,
        parts: sc.parts,
        eta: e + 70,
        key: `socialize:${q.id}:invite2`,
        targetId: q.id,
        tag: 'meal',
        make: () =>
          newActivity(world, p, {
            kind: 'socialize',
            label: `Inviting ${q.name} to the meal`,
            goal: 'to share a meal',
            need: 'social',
            targetId: q.id,
            targetType: 'person',
            tx: s.x,
            ty: s.y,
            spotX: s.x + (dx / dist) * 1.35,
            spotY: s.y + (dy / dist) * 1.35,
            utility: sc.total,
            minCommit: 40,
            maxTicks: 420,
            data: { purpose: 'invite', conv: { mealId: m.id } },
          }),
      });
      break;
    }
  }
  // go and lay the table, in time
  const place = world.byId.get(m.placeId);
  const px = m.x;
  const py = m.y;
  const eHome = (Math.hypot(px - p.x, py - p.y) * 1.18) / Math.max(0.03, ctx.speed);
  const due = m.at - eHome - 140;
  if (world.tick >= Math.min(due, m.at - 160) && (m.status === 'inviting' || m.status === 'gathering') && (place || m.placeName === 'the fire')) {
    const sc = new Scorer().add('guests are coming: lay the table', 60).add('walking', -pen(eHome) * 0.3);
    addOption(ctx, {
      kind: 'host_meal',
      label: `Lay out the meal at ${m.placeName}`,
      goal: 'to feed the guests I invited',
      need: null,
      util: sc.total,
      parts: sc.parts,
      eta: eHome + 80,
      key: `host_meal:${m.id}`,
      targetId: m.placeId,
      tag: 'meal',
      make: () => {
        const spot = mealSpot(world, p, m);
        return newActivity(world, p, {
          kind: 'host_meal',
          label: `Going to lay the table at ${m.placeName}`,
          goal: 'to feed the guests I invited',
          targetId: m.placeId,
          targetType: 'building',
          tx: px,
          ty: py,
          spotX: spot.x,
          spotY: spot.y,
          utility: sc.total,
          minCommit: 200,
          maxTicks: 1500,
          data: { mealId: m.id, sticky: true },
        });
      },
    });
  }
}

function guestOptions(ctx: Ctx, m: Meal): void {
  const { world, p } = ctx;
  if (m.status === 'eating' && m.arrived.includes(p.id) && !m.ate.includes(p.id)) {
    // already there: handled by the activity itself
  }
  if (m.arrived.includes(p.id)) return;
  const e = eta(ctx, m.x, m.y);
  // leave early enough to arrive when the meal starts
  if (world.tick < m.at - e - 160) return;
  if (world.tick > m.at + 500) return;
  const sc = new Scorer().add(`promised to eat with ${personById(world, m.host)?.name ?? 'them'}`, 58).add('walking', -pen(e) * 0.3);
  addOption(ctx, {
    kind: 'attend_meal',
    label: `Go to the shared meal at ${m.placeName}`,
    goal: 'to eat together as agreed',
    need: null,
    util: sc.total,
    parts: sc.parts,
    eta: e + 40,
    key: `attend_meal:${m.id}`,
    targetId: m.placeId,
    tag: 'meal',
    make: () => {
      const spot = mealSpot(world, p, m);
      return newActivity(world, p, {
        kind: 'attend_meal',
        label: `Going to eat at ${m.placeName}`,
        goal: 'to eat together as agreed',
        targetId: m.placeId,
        targetType: 'building',
        tx: m.x,
        ty: m.y,
        spotX: spot.x,
        spotY: spot.y,
        utility: sc.total,
        minCommit: 240,
        maxTicks: 1500,
        data: { mealId: m.id, sticky: true },
      });
    },
  });
}

/** Somewhere to stand at the place: next to the hall or fire itself, spread out so people do not stack up. */
function mealSpot(world: World, p: Person, m: Meal): { x: number; y: number } {
  const e = world.byId.get(m.placeId);
  if (e) {
    const spot = standSpotFor(world, p, e);
    if (spot) return spot;
  }
  return { x: m.x + (hashUnit(p.id, m.id, 3) - 0.5) * 2.2, y: m.y + 0.6 + (hashUnit(p.id, m.id, 4) - 0.2) * 1.4 };
}

// ───────────────────────── conversations (called from social.ts) ─────────────────────────
export interface MealPlan {
  placeId: number;
  placeName: string;
  x: number;
  y: number;
}

export function inviteAsk(world: World, A: Person, B: Person, d: { mealId?: number; mealPlan?: MealPlan }): number {
  let m = d.mealId ? world.meals.find((x) => x.id === d.mealId) : undefined;
  if (!m && d.mealPlan) {
    m = {
      id: world.nextId++,
      host: A.id,
      placeId: d.mealPlan.placeId,
      placeName: d.mealPlan.placeName,
      x: d.mealPlan.x,
      y: d.mealPlan.y,
      created: world.tick,
      at: world.tick + MEAL_LEAD,
      invited: [],
      accepted: [],
      arrived: [],
      ate: [],
      missed: {},
      table: {},
      servings: 0,
      reserved: 0,
      status: 'inviting',
      end: '',
    };
    world.meals.push(m);
    if (world.meals.length > 60) world.meals.splice(0, world.meals.length - 60);
    addLog(world, A, 'social', `Decided to share a meal at ${m.placeName}.`);
  }
  if (!m) return 0;
  d.mealId = m.id;
  if (!m.invited.includes(B.id)) m.invited.push(B.id);
  bubble(world, A, m.placeName === 'the communal hall' ? `Eat with us at the hall tonight, ${B.name}?` : `Come and eat with us by the fire, ${B.name}?`, 'ask', 62);
  return m.id;
}

export function inviteRespond(world: World, A: Person, B: Person, mealId: number): void {
  const m = world.meals.find((x) => x.id === mealId);
  if (!m || m.status !== 'inviting') {
    bubble(world, B, 'Sounds nice — but it seems the plan fell through.', 'say', 52);
    return;
  }
  const rel = B.relations[A.id];
  const aff = rel?.affinity ?? 0;
  const hungry = B.needs.hunger < 70;
  let why = '';
  if (mealOf(world, B)) why = 'already promised to eat elsewhere';
  else if (B.needs.thirst < 22 || B.needs.hunger < 12 || B.needs.energy < 14) why = 'had more pressing needs';
  else if (rel && rel.avoidUntil > world.tick) why = 'was not on good terms with the host';
  else if (m.accepted.length + 1 >= Math.min(MAX_GUESTS + 1, foodUnits(A.inv))) why = 'there was no room at the table';
  else {
    const w = 0.34 + 0.4 * B.traits.sociability + 0.3 * Math.max(0, aff) / 100 + (hungry ? 0.18 : 0) + (B.hhId === A.hhId ? 0.2 : 0) - 0.4 * (Math.max(0, 40 - B.needs.energy) / 40);
    if (hashUnit(B.id, A.id, world.tick >> 4) > w) why = 'preferred to stay on with their own plans';
  }
  if (why) {
    m.missed[B.id] = `declined: ${why}`;
    A.cooldowns['invite' + B.id] = world.tick + INVITE_COOLDOWN;
    bubble(world, B, why === 'there was no room at the table' ? 'Save it for the others — thank you.' : 'Thank you, but not tonight.', 'say', 52);
    addLog(world, A, 'social', `${B.name} could not come to the meal (${why}).`);
    return;
  }
  m.accepted.push(B.id);
  m.reserved = m.accepted.length;
  // the invitation carries the place with it: the guest now knows where to go (and how old that knowledge is)
  const pb = A.beliefs[m.placeId];
  if (pb) tellBelief(world, A, B, pb);
  bubble(world, B, 'I’d love to.', 'happy', 50);
  addLog(world, B, 'social', `Promised to eat with ${A.name} at ${m.placeName}.`);
  A.cooldowns['invite' + B.id] = world.tick + INVITE_COOLDOWN;
  adjustRel(B, A.id, world.tick, { aff: 0.8, trust: 0.5, note: `${A.name} invited me to eat` });
  B.nextThink = world.tick;
}

// ───────────────────────── endings ─────────────────────────
export function cancelMeal(world: World, m: Meal, why: string): void {
  if (m.status === 'done' || m.status === 'cancelled') return;
  m.status = 'cancelled';
  m.end = why;
  returnTable(world, m);
  const host = personById(world, m.host);
  if (host) {
    host.cooldowns.hostMeal = world.tick + HOST_COOLDOWN_FAILED;
    addLog(world, host, 'social', `The meal at ${m.placeName} did not happen: ${why}.`);
  }
  for (const id of m.accepted) {
    if (m.arrived.includes(id) && m.ate.includes(id)) continue;
    const g = personById(world, id);
    if (g) {
      m.missed[id] ??= why;
      addLog(world, g, 'social', `The meal at ${m.placeName} was called off: ${why}.`);
      g.nextThink = world.tick;
    }
  }
  if (m.accepted.length > 0 || m.invited.length > 1) addEvent(world, 'social', `The shared meal at ${m.placeName} was called off (${why}).`, [m.host, ...m.accepted].slice(0, 3), m.x, m.y);
}

function returnTable(world: World, m: Meal): void {
  const host = personById(world, m.host);
  for (const k of Object.keys(m.table) as ItemKind[]) {
    const n = m.table[k] ?? 0;
    if (n <= 0) continue;
    let left = n;
    if (host) left -= transfer(world, m.table, host.inv, 99, k, n, 'meal:' + m.id, 'person:' + host.id, 'table cleared');
    if (left > 0) {
      const part: Items = { [k]: left } as Items;
      dropNear(world, m.x, m.y, part, 'left from a meal');
      m.table[k] = (m.table[k] ?? 0) - left;
    }
    if ((m.table[k] ?? 0) <= 0) delete m.table[k];
  }
}

function finishMeal(world: World, m: Meal): void {
  if (m.ate.length < 2) {
    cancelMeal(world, m, 'only the host sat down to it');
    return;
  }
  m.status = 'done';
  m.end = `${m.ate.length} ate together`;
  returnTable(world, m);
  const host = personById(world, m.host);
  if (host) host.cooldowns.hostMeal = world.tick + HOST_COOLDOWN_DONE;
  const ate = m.ate.map((id) => personById(world, id)).filter((x): x is Person => !!x);
  for (const a of ate)
    for (const b of ate) {
      if (a.id >= b.id) continue;
      adjustRel(a, b.id, world.tick, { aff: 1.2, trust: 0.6, fam: 0.8, note: 'ate together' });
      adjustRel(b, a.id, world.tick, { aff: 1.2, trust: 0.6, fam: 0.8, note: 'ate together' });
    }
  for (const a of ate) {
    a.needs.social = Math.min(100, a.needs.social + 18);
    addLog(world, a, 'social', `Shared a meal at ${m.placeName} with ${ate.filter((x) => x !== a).map((x) => x.name).slice(0, 3).join(', ') || 'no one else'}.`);
  }
  if (host && ate.length >= 2) addEvent(world, 'social', `${host.name} hosted a shared meal at ${m.placeName}: ${ate.length} sat down together.`, ate.map((x) => x.id).slice(0, 4), m.x, m.y);
}

// ───────────────────────── upkeep ─────────────────────────
export function mealTick(world: World): void {
  for (const m of world.meals) {
    if (m.status === 'done' || m.status === 'cancelled') continue;
    const host = personById(world, m.host);
    if (!host || !host.alive) {
      cancelMeal(world, m, 'the host died');
      continue;
    }
    m.accepted = m.accepted.filter((id) => personById(world, id));
    if (m.placeName !== 'the fire' && !world.byId.has(m.placeId)) {
      cancelMeal(world, m, 'the place was lost');
      continue;
    }
    // danger puts an end to a meal
    if (world.animals.some((a) => Math.hypot(a.x - m.x, a.y - m.y) < 6)) {
      cancelMeal(world, m, 'a wolf came near');
      continue;
    }
    if (m.status === 'inviting') {
      if (m.accepted.length === 0 && world.tick > m.at - 120) cancelMeal(world, m, m.invited.length ? 'nobody could come' : 'nobody was invited');
      else if (world.tick > m.at + 40 && tableUnits(m) === 0) cancelMeal(world, m, 'the host never got the table laid (food or time ran short)');
    } else if (m.status === 'gathering') {
      const present = m.accepted.filter((id) => m.arrived.includes(id));
      if (m.accepted.length === 0) {
        cancelMeal(world, m, 'the guests could not come');
        continue;
      }
      const allHere = present.length === m.accepted.length;
      if (world.tick >= m.at || allHere) {
        // guests who are not here by the start are given a little longer; then the meal goes ahead without them
        if (allHere || world.tick >= m.at + 160) {
          for (const id of m.accepted) if (!m.arrived.includes(id)) m.missed[id] = 'did not arrive';
          if (m.arrived.length === 0 && present.length === 0 && world.tick >= m.at + 160) cancelMeal(world, m, 'no guest came');
          else m.status = 'eating';
        }
      }
      if (world.tick > m.at + 900) cancelMeal(world, m, 'it never got going');
    } else if (m.status === 'eating') {
      const diners = [m.host, ...m.arrived];
      const done = diners.every((id) => m.ate.includes(id) || !personById(world, id));
      if (done || tableUnits(m) === 0 || world.tick > m.at + 1100) finishMeal(world, m);
    }
  }
  hallGossip(world);
}

/** People gathered in a hall exchange what they know — only with those actually sitting there, and one telling at a time. */
function hallGossip(world: World): void {
  if (world.tick % 90 !== 17) return;
  for (const b of world.buildings) {
    if (b.type !== 'hall') continue;
    const present: Person[] = [];
    for (const p of world.persons) {
      if (!p.alive || p.pose === 'sleep' || p.convId) continue;
      if (Math.hypot(p.x - (b.x + b.w / 2), p.y - (b.y + b.h / 2)) <= 4) present.push(p);
    }
    if (present.length < 2) continue;
    const i = Math.floor(hashUnit(b.id, world.tick, 5) * present.length);
    const j = (i + 1 + Math.floor(hashUnit(b.id, world.tick, 6) * (present.length - 1))) % present.length;
    const S = present[i];
    const L = present[j];
    if (S === L) continue;
    const news = pickNews(world, S, L, 1);
    for (const n of news) if (tellBelief(world, S, L, n)) addFx(world, 'sparkle', S.x, S.y, 0);
  }
}

// ───────────────────────── activities ─────────────────────────
function mealById(world: World, a: Activity): Meal | undefined {
  return world.meals.find((x) => x.id === (a.data.mealId as number));
}

function eatServing(world: World, m: Meal, p: Person): boolean {
  const k = pickFood(m.table, p.needs.hunger) as FoodKind | null;
  if (!k) return false;
  if (consume(world, m.table, k, 1, 'eaten at a shared meal') < 1) return false;
  p.needs.hunger = Math.min(100, p.needs.hunger + NUTRITION[k]);
  p.lastAteTick = world.tick;
  addFx(world, 'eat', p.x, p.y, 0);
  return true;
}

registerHandler('host_meal', {
  availability: 0.1,
  pose: (a) => (a.data.eating ? 'eat' : a.data.laid ? 'sit' : 'store'),
  begin(world, p, a) {
    const m = mealById(world, a);
    if (!m || m.status === 'done' || m.status === 'cancelled') return 'the meal was called off';
    a.duration = 30;
    if (m.status === 'inviting') {
      // lay the table with food that is really in the pack
      const need = m.accepted.length + 1;
      let have = foodUnits(p.inv);
      if (have < need) {
        cancelMeal(world, m, 'the host did not have enough food after all');
        return 'not enough food to lay a table';
      }
      let left = need + Math.min(1, have - need);
      const order: FoodKind[] = ['bread', 'fish', 'fruit', 'grain', 'berries'];
      for (const k of order) {
        const n = Math.min(left, p.inv[k] ?? 0);
        if (n > 0) {
          const t = transfer(world, p.inv, m.table, 99, k, n, 'person:' + p.id, 'meal:' + m.id, 'set out for a shared meal');
          left -= t;
        }
        if (left <= 0) break;
      }
      m.servings = tableUnits(m);
      have = m.servings;
      if (have < need) {
        cancelMeal(world, m, 'the host did not have enough food after all');
        return 'not enough food to lay a table';
      }
      m.status = 'gathering';
      addFx(world, 'built', m.x, m.y, 0);
      bubble(world, p, 'Come and eat — the table is ready.', 'say', 60);
    }
  },
  work(world, p, a): WorkResult {
    const m = mealById(world, a);
    if (!m) return 'fail:the meal was called off';
    if (m.status === 'cancelled') return 'fail:the meal was called off';
    if (m.status === 'done') return 'done';
    faceToward(p, m.x, m.y - 1);
    a.data.laid = true;
    if (m.status === 'eating') {
      a.data.eating = true;
      a.progress++;
      if (a.progress >= 22 && !m.ate.includes(p.id)) {
        if (eatServing(world, m, p)) {
          m.ate.push(p.id);
          a.cycle++;
        } else m.ate.push(p.id);
        a.progress = 0;
      }
      return m.ate.includes(p.id) && m.status === 'eating' ? 'continue' : 'continue';
    }
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    const m = mealById(world, a);
    if (m && (m.status === 'inviting' || m.status === 'gathering') && outcome !== 'success') {
      // the host was pulled away before the meal began
      if (m.host === p.id) cancelMeal(world, m, detail.includes('wolf') || detail.includes('danger') ? 'danger' : `the host had to leave (${detail})`);
    }
  },
});

registerHandler('attend_meal', {
  availability: 0.1,
  pose: (a) => (a.data.eating ? 'eat' : 'sit'),
  begin(world, p, a) {
    const m = mealById(world, a);
    if (!m || m.status === 'done' || m.status === 'cancelled') return 'the meal was called off';
    if (!m.arrived.includes(p.id)) m.arrived.push(p.id);
    a.duration = 24;
    faceToward(p, m.x, m.y - 1);
  },
  work(world, p, a): WorkResult {
    const m = mealById(world, a);
    if (!m) return 'fail:the meal was called off';
    if (m.status === 'cancelled') return 'fail:the meal was called off';
    if (m.status === 'done') return m.ate.includes(p.id) ? 'done' : 'fail:it was over before they ate';
    // an urgent need of their own ends the wait
    if (p.needs.thirst < 14 || p.needs.energy < 8) {
      m.missed[p.id] = 'left to see to an urgent need';
      m.arrived = m.arrived.filter((x) => x !== p.id);
      return 'fail:an urgent need of their own came first';
    }
    faceToward(p, m.x, m.y - 1);
    if (m.status === 'eating') {
      a.data.eating = true;
      a.progress++;
      if (a.progress >= a.duration && !m.ate.includes(p.id)) {
        if (eatServing(world, m, p)) {
          m.ate.push(p.id);
          a.cycle++;
          return 'done';
        }
        // the table ran out before their turn
        m.missed[p.id] = 'the food ran out';
        return 'fail:the food ran out';
      }
    }
    return 'continue';
  },
  onEnd(world, p, a, outcome, detail) {
    const m = mealById(world, a);
    if (m && outcome !== 'success' && m.status !== 'done' && m.status !== 'cancelled') {
      m.arrived = m.arrived.filter((x) => x !== p.id);
      m.missed[p.id] ??= detail;
      if (m.accepted.includes(p.id) && !m.ate.includes(p.id)) m.accepted = m.accepted.filter((x) => x !== p.id);
    }
  },
});

void stageOf;
void ({} as Belief);
