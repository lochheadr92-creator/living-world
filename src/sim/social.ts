import { think } from './mood';
import {
  canInterruptForTalk,
  endActivity,
  faceToward,
  newActivity,
  registerHandler,
  resumeSuspended,
  startActivity,
  suspendActivity,
} from './activities';
import type { WorkResult } from './activities';
import { BUILD_DEF, CONV_REACH, DAY, GREET_COOLDOWN, LOAN_TERM, NUTRITION, PROMISE_TTL, REQUEST_TTL } from './constants';
import { foodUnits, pickFood, roomFor, transfer } from './economy';
import { carryCap, isDependent, itemsToText, stageOf } from './people';
import { addEvent, addFx, addLog, say as speak } from './events';
import { addToHousehold, householdById, membersOf } from './households';
import { estimatedAmount, learn, noteFailure } from './knowledge';
import { adjustRel, relOf, spark } from './relations';
import { hashUnit } from './rng';
import * as D from './dialogue';
import { drive } from './needs';
import { BELIEF_NOUN } from './labels';
import { isFacilityType } from './recipes';
import { easeGrievance, endGrievanceOnGift, openGrievance, quarrelDamper, settleBoth } from './grievance';
import { inviteAsk, inviteRespond, mealReserved } from './meals';
import { shareConcerns } from './welfare';
import { lendTool, returnLoan } from './tools';
import { toolsHeldBy } from './toolreg';
import { isToolItem } from './toolreg';
import type { Belief, Commitment, Conversation, ConvPurpose, ItemKind, Items, Person, Request, RequestKind, Speech, ToolKind, World } from './types';
import { clamp, hyp } from './util';

// ───────────────────────── small helpers ─────────────────────────
const toldKey = (listener: number, beliefId: number): number => listener * 1_000_000 + beliefId;

function bubble(world: World, p: Person, text: string, kind: Speech['kind'] = 'say', ticks = 56): void {
  speak(world, p, text, kind, ticks);
  world.stats.bubbles = (world.stats.bubbles ?? 0) + 1;
}

export function personOf(world: World, id: number): Person | null {
  const e = world.byId.get(id);
  return e && e.ent === 'person' && e.alive ? e : null;
}

const FOODS: ItemKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread'];

export function isFood(k: ItemKind): boolean {
  return FOODS.includes(k);
}

/** What a person is holding back for themselves and their dependents. */
export function reserveOf(world: World, p: Person, item: ItemKind): number {
  const hh = householdById(world, p.hhId);
  const dep = membersOf(world, hh).filter((m) => m.id !== p.id && isDependent(world, m)).length;
  switch (item) {
    case 'water':
      return p.needs.thirst < 60 ? 1 : 0;
    case 'wood':
    case 'stone':
    case 'planks':
    case 'bricks':
    case 'handles':
    case 'clay':
    case 'ore':
    case 'charcoal':
    case 'iron': {
      let n = 0;
      for (const id of p.bykind.site ?? []) {
        const b = p.beliefs[id];
        if (b.hh === p.hhId || p.commitments.some((c) => c.status === 'active' && c.siteId === b.id)) n += b.need?.[item] ?? 0;
      }
      return n;
    }
    case 'seeds':
      return world.plots.filter((pl) => pl.hhId === p.hhId && pl.state === 'tilled').length;
    case 'axe':
    case 'pick':
    case 'hoe':
    case 'basket':
    case 'hammer':
    case 'saw':
    case 'jar':
      return 1;
    default:
      return 0;
  }
  void dep;
}

/**
 * Goods this person has promised to someone and not yet handed over. Nothing is stored for this: it is read off the open
 * commitments, so it vanishes the moment a promise is kept, set aside, expires, is moot, or its maker dies.
 */
export function reservedFor(world: World, p: Person, item: ItemKind): number {
  let n = 0;
  for (const c of p.commitments) {
    if (c.status !== 'active' || c.item !== item) continue;
    if (c.kind === 'deliver' || c.kind === 'haul') n += Math.max(0, c.amount - (c.delivered ?? 0));
  }
  void world;
  return n;
}

/** How much of what `from` asked for (and has not yet got) is already spoken for by pending requests and promises. */
export function outstandingFor(world: World, from: number, item: ItemKind, destId = 0): number {
  let n = 0;
  for (const r of world.requests) {
    if (r.from !== from || r.item !== item) continue;
    if (destId && r.destId !== destId && r.siteId !== destId) continue;
    if (r.status === 'pending') n += r.amount;
    else if (r.status === 'promised') {
      const owner = world.byId.get(r.to);
      const c = owner && owner.ent === 'person' ? owner.commitments.find((x) => x.id === r.commitmentId && x.status === 'active') : undefined;
      n += c ? Math.max(0, c.amount - (c.delivered ?? 0)) : 0;
    }
  }
  return n;
}

/** People currently committed to put work or materials into a building site. */
export function helpersOn(world: World, siteId: number): number {
  let n = 0;
  for (const q of world.persons) if (q.alive && q.commitments.some((c) => c.status === 'active' && c.siteId === siteId && (c.kind === 'help_build' || c.kind === 'haul' || c.kind === 'work'))) n++;
  return n;
}

/** How much of `item` this person could part with without hurting themselves or their dependents. */
export function surplusOf(world: World, p: Person, item: ItemKind): number {
  const have = p.inv[item] ?? 0;
  if (isFood(item)) {
    const hh = householdById(world, p.hhId);
    const dep = membersOf(world, hh).filter((m) => m.id !== p.id && isDependent(world, m)).length;
    const keep = (p.needs.hunger < 55 ? 2 : 1) + dep * 2 + reservedFor(world, p, item) + mealReserved(world, p);
    const total = foodUnits(p.inv);
    return Math.max(0, Math.min(have - reservedFor(world, p, item), total - keep));
  }
  return Math.max(0, have - reserveOf(world, p, item) - reservedFor(world, p, item));
}

export function valueOf(world: World, p: Person, item: ItemKind): number {
  const base: Record<ItemKind, number> = {
    berries: 1, fruit: 1.3, fish: 2, grain: 1.6, bread: 2.4, water: 1, wood: 1.4, stone: 1.8, seeds: 2, clay: 1.5, ore: 2, planks: 2.6, handles: 2, bricks: 3, charcoal: 2.2, iron: 5,
    flour: 2, axe: 6, pick: 6, hoe: 6, basket: 5, hammer: 6, saw: 7, jar: 5,
  };
  let v = base[item];
  const have = p.inv[item] ?? 0;
  if (isFood(item)) {
    const total = foodUnits(p.inv);
    if (total < 3) v *= 1.9;
    else if (total > 8) v *= 0.55;
    v *= 1 + Math.max(0, 50 - p.needs.hunger) / 50;
  } else if (item === 'water') {
    v *= 1 + Math.max(0, 55 - p.needs.thirst) / 40;
  } else if (item === 'wood' || item === 'stone') {
    const need = reserveOf(world, p, item);
    if (need > have) v *= 1.8;
    else if (have > 6) v *= 0.6;
  }
  return v;
}

export function personalDriveMax(p: Person): number {
  return Math.max(drive(p.needs.hunger, 'hunger'), drive(p.needs.thirst, 'thirst'), drive(p.needs.warmth, 'warmth') * 0.8);
}

// ───────────────────────── gifts and relationships ─────────────────────────
function describeItems(items: Items): string {
  return itemsToText(items);
}

export function witness(world: World, kind: 'gift' | 'quarrel' | 'help', actor: Person, other: Person, x: number, y: number): void {
  for (const w of world.persons) {
    if (!w.alive || w === actor || w === other || w.pose === 'sleep') continue;
    if (hyp(w.x - x, w.y - y) > 7.5) continue;
    if (kind === 'gift' || kind === 'help') {
      adjustRel(w, actor.id, world.tick, { aff: 1.3, trust: 0.9, fam: 0.3, note: `saw ${actor.name} help ${other.name}` });
    } else {
      adjustRel(w, actor.id, world.tick, { aff: -1.1, trust: -1.1, note: `saw ${actor.name} quarrel` });
      adjustRel(w, other.id, world.tick, { aff: -0.6, note: `saw ${other.name} quarrel` });
    }
  }
}

/** Items have moved from `giver` to `receiver`: both remember it and onlookers notice. */
export function onGift(world: World, giver: Person, receiver: Person, items: Items, mode: string): void {
  const hungerSev = isFoodGift(items) ? clamp((60 - receiver.needs.hunger) / 60, 0, 1) : 0;
  const thirstSev = (items.water ?? 0) > 0 ? clamp((60 - receiver.needs.thirst) / 60, 0, 1) : 0;
  const sev = Math.max(hungerSev, thirstSev, 0.2);
  const txt = describeItems(items);
  adjustRel(receiver, giver.id, world.tick, { aff: 2.5 + 7 * sev, trust: 2 + 4 * sev, fam: 1, debt: -0.5, note: `${giver.name} gave me ${txt}` });
  adjustRel(giver, receiver.id, world.tick, { aff: 1 + 1.5 * sev, fam: 0.5, debt: 0.5, note: `I gave ${receiver.name} ${txt}` });
  // a gift eases a quarrel in proportion to what it meant, and may end it
  endGrievanceOnGift(world, giver, receiver, sev);
  giver.stats.given += 1;
  receiver.stats.received += 1;
  addLog(world, giver, 'social', `Gave ${txt} to ${receiver.name}${mode === 'care' ? ' (looking after them)' : ''}.`);
  addLog(world, receiver, 'social', `${giver.name} gave me ${txt}.`);
  think(world, receiver, 'gift:' + giver.id, 8, Math.round(DAY * 0.7), `${giver.name} gave me ${txt}`);
  witness(world, 'gift', giver, receiver, receiver.x, receiver.y);
  const notable = sev > 0.35 || giver.hhId !== receiver.hhId;
  if (notable && mode !== 'care') addEvent(world, 'social', `${giver.name} gave ${txt} to ${receiver.name}.`, [giver.id, receiver.id], receiver.x, receiver.y);
  else if (mode === 'care' && stageOf(world, receiver) === 'child' && hashUnit(giver.id, receiver.id, world.tick >> 6) < 0.25) addEvent(world, 'social', `${giver.name} fed ${receiver.name}.`, [giver.id, receiver.id], receiver.x, receiver.y);
  addFx(world, 'gift', receiver.x, receiver.y, 0);
  receiver.nextThink = world.tick;
}

function isFoodGift(items: Items): boolean {
  return FOODS.some((k) => (items[k] ?? 0) > 0);
}

// ───────────────────────── requests ─────────────────────────
export interface RequestOpts {
  kind: RequestKind;
  item?: ItemKind | null;
  amount?: number;
  offer?: ItemKind | null;
  offerAmount?: number;
  siteId?: number;
  infoKind?: string;
  purpose?: string;
  destKind?: Request['destKind'];
  destId?: number;
  deadline?: number;
  milestone?: string;
  toolKind?: ToolKind | null;
}

export function createRequest(world: World, from: Person, to: Person, o: RequestOpts): Request {
  const r: Request = {
    id: world.nextId++,
    kind: o.kind,
    from: from.id,
    to: to.id,
    item: o.item ?? null,
    amount: o.amount ?? 1,
    offer: o.offer ?? null,
    offerAmount: o.offerAmount ?? 0,
    siteId: o.siteId ?? 0,
    infoKind: o.infoKind ?? '',
    created: world.tick,
    expires: world.tick + REQUEST_TTL,
    status: 'pending',
    note: '',
    resolved: 0,
    purpose: o.purpose ?? '',
    destKind: o.destKind ?? (o.siteId ? 'site' : 'person'),
    destId: o.destId ?? (o.siteId ? o.siteId : from.id),
    deadline: o.deadline ?? 0,
    milestone: o.milestone ?? '',
    toolKind: o.toolKind ?? null,
    outcome: '',
  };
  world.requests.push(r);
  if (world.requests.length > 260) {
    const idx = world.requests.findIndex((x) => x.status !== 'pending' && x.status !== 'promised');
    if (idx >= 0) world.requests.splice(idx, 1);
  }
  from.asked[to.id] = world.tick;
  return r;
}

function settle(world: World, r: Request, status: Request['status'], note: string): void {
  r.status = status;
  r.note = note;
  r.resolved = world.tick;
  r.outcome = status === 'fulfilled' ? 'kept' : status === 'declined' ? 'refused' : status === 'expired' ? 'expired' : status === 'broken' ? 'broken' : status === 'interrupted' ? 'interrupted' : status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : status;
}

type Response =
  | { kind: 'give'; item: ItemKind; n: number }
  | { kind: 'promise'; item: ItemKind | null; n: number }
  | { kind: 'lend'; tool: import('./types').Tool }
  | { kind: 'decline'; reason: 'no_item' | 'own_need' | 'unwilling' | 'disliked' | 'committed' | 'enough' | 'in_use' };

function willingness(world: World, B: Person, A: Person, severity: number): number {
  const rel = B.relations[A.id];
  const aff = rel?.affinity ?? 0;
  const trust = rel?.trust ?? 10;
  let w = 0.18 + 0.5 * B.traits.generosity + 0.42 * Math.max(0, aff) / 100 + 0.5 * severity + 0.1 * (trust - 10) / 100;
  if (rel?.kin) w += 0.28;
  if (B.hhId === A.hhId) w += 0.15;
  if (aff < -10) w += aff / 100;
  if (rel && rel.avoidUntil > world.tick) w -= 0.6;
  w -= 0.45 * (personalDriveMax(B) / 100);
  w += (hashUnit(B.id, A.id, world.tick >> 5) - 0.5) * 0.16;
  return w;
}

/** Could B get hold of this item from somewhere they know of? (Used before promising to fetch it.) */
export function canObtain(world: World, B: Person, item: ItemKind): boolean {
  const need = item === 'wood' ? 'tree' : item === 'stone' ? 'rock' : item === 'clay' ? 'clay_pit' : item === 'ore' ? 'ore_vein' : item === 'water' ? 'water' : null;
  const usable = (b: Belief): boolean => {
    const f = B.failures[b.id];
    if (f && world.tick - f.tick < 520) return false; // they have just found it did not work
    return estimatedAmount(world, b) >= 1;
  };
  for (const k in B.beliefs) {
    const b = B.beliefs[k as unknown as number];
    if (item === 'stone' && b.kind === 'outcrop' && usable(b)) return true;
    if (need && b.kind === need && (b.kind === 'water' ? true : usable(b))) return true;
    if (b.kind === 'building' && (b.items?.[item] ?? 0) >= 1 && (b.hh === B.hhId || b.hh === 0 || b.btype === 'storehouse') && !need) return true;
    if (!need && isFood(item) && (b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot') && estimatedAmount(world, b) >= 2) return true;
  }
  return false;
}

/** A tool B could lend to A without leaving themselves short: not borrowed themselves, not in use this moment. */
function lendableTool(world: World, B: Person, kind: ToolKind): import('./types').Tool | null {
  const mine = toolsHeldBy(world, B.id, kind).filter((t) => !t.loan && t.wear < 80);
  if (!mine.length) return null;
  const spare = mine.length >= 2;
  const using = B.activity && B.activity.phase === 'work' && toolInUse(B.activity.kind, kind);
  if (using && !spare) return null;
  mine.sort((a, c) => c.wear - a.wear); // lend the most worn one when there is a choice
  return spare ? mine[0] : mine[mine.length - 1];
}

function toolInUse(act: string, kind: ToolKind): boolean {
  switch (kind) {
    case 'axe':
    case 'pick':
    case 'basket':
      return act === 'gather';
    case 'hoe':
      return act === 'till' || act === 'tend';
    case 'hammer':
    case 'saw':
      return act === 'build' || act === 'repair' || act === 'operate' || act === 'craft';
    default:
      return false;
  }
}

export function evaluateRequest(world: World, B: Person, A: Person, req: Request): Response {
  const rel = B.relations[A.id];
  const dislike = (rel?.affinity ?? 0) < -12 || (rel && rel.avoidUntil > world.tick);
  let sev = 0.3;
  let item: ItemKind | null = req.item;
  if (req.kind === 'tool' && req.toolKind) {
    // lending is a favour with a promise to bring it back
    const w0 = willingness(world, B, A, 0.25) + 0.1 * Math.max(0, ((rel?.trust ?? 10) - 20) / 60);
    const t = lendableTool(world, B, req.toolKind);
    if (!t) return { kind: 'decline', reason: toolsHeldBy(world, B.id, req.toolKind).some((x) => !x.loan) ? 'in_use' : 'no_item' };
    if (w0 >= 0.62 && (rel?.trust ?? 10) >= 14) return { kind: 'lend', tool: t };
    return { kind: 'decline', reason: dislike ? 'disliked' : 'unwilling' };
  }
  if (req.kind === 'repair') {
    const sound = stageOf(world, B) === 'adult' || stageOf(world, B) === 'youth';
    const w0 = willingness(world, B, A, 0.5) + 0.1;
    if (!sound) return { kind: 'decline', reason: 'unwilling' };
    if (activeCommitments(B).length >= MAX_ACTIVE_COMMITMENTS) return { kind: 'decline', reason: 'own_need' };
    const has = (B.inv.wood ?? 0) > 0 || canObtain(world, B, 'wood');
    if (!has) return { kind: 'decline', reason: 'no_item' };
    if (w0 >= 0.62 && personalDriveMax(B) < 40) return { kind: 'promise', item: 'wood', n: 1 };
    return { kind: 'decline', reason: dislike ? 'disliked' : personalDriveMax(B) > 35 ? 'own_need' : 'unwilling' };
  }
  // a request already covered by what others have promised is not one more to answer
  if (req.item && (req.kind === 'wood' || req.kind === 'stone' || req.kind === 'goods' || req.kind === 'haul')) {
    const others = outstandingFor(world, A.id, req.item, req.destId ?? req.siteId ?? 0) - req.amount;
    const site = req.siteId ? world.byId.get(req.siteId) : undefined;
    const lacks = site && site.ent === 'site' ? (site.required[req.item] ?? 0) - (site.delivered[req.item] ?? 0) - (site.used[req.item] ?? 0) - (A.inv[req.item] ?? 0) : req.amount;
    if (others >= Math.max(0, lacks)) return { kind: 'decline', reason: 'enough' };
    // B already owes the same thing to the same place
    const owes = B.commitments.filter((c) => c.status === 'active' && c.item === req.item && (c.destId ?? c.siteId) === (req.destId ?? req.siteId)).reduce((n, c) => n + c.amount - (c.delivered ?? 0), 0);
    if (owes >= req.amount) return { kind: 'decline', reason: 'committed' };
  }
  if (req.kind === 'food' || req.kind === 'care') {
    sev = clamp((62 - A.needs.hunger) / 62, 0.05, 1);
    item = pickFood(B.inv, A.needs.hunger) ?? null;
    // someone else’s share must not shortchange B's own dependents
    if (item && surplusOf(world, B, item) < 1) item = FOODS.find((k) => surplusOf(world, B, k) >= 1) ?? null;
  } else if (req.kind === 'water') {
    sev = clamp((66 - A.needs.thirst) / 66, 0.05, 1);
    item = 'water';
  } else if (req.kind === 'wood' || req.kind === 'stone') {
    sev = 0.35;
    item = req.kind;
  } else if (req.kind === 'goods' || req.kind === 'haul') {
    sev = 0.35;
    item = req.item;
  } else if (req.kind === 'seeds') {
    sev = 0.3;
    item = 'seeds';
  }
  const w = willingness(world, B, A, sev);
  if (!item) return { kind: 'decline', reason: dislike ? 'disliked' : 'no_item' };
  const sur = surplusOf(world, B, item);
  if (sur >= 1) {
    if (w >= 0.6) {
      const want = req.kind === 'food' || req.kind === 'care' ? Math.min(sur, Math.max(1, Math.ceil(sev * 3))) : Math.min(sur, req.amount);
      return { kind: 'give', item, n: Math.max(1, want) };
    }
    return { kind: 'decline', reason: dislike ? 'disliked' : personalDriveMax(B) > 35 ? 'own_need' : 'unwilling' };
  }
  // nothing to hand over right now: could B fetch some?
  if (w >= 0.66 && personalDriveMax(B) < 38 && B.commitments.filter((c) => c.status === 'active').length < 2 && canObtain(world, B, item) && (item === 'wood' || item === 'stone' || item === 'water' || item === 'clay' || item === 'ore' || ((item === 'planks' || item === 'bricks' || item === 'handles') && B.commitments.length < 3) || isFood(item))) {
    return { kind: 'promise', item: isFood(item) ? (B.inv[item] ? item : 'berries') : item, n: Math.max(1, req.amount) };
  }
  const have = B.inv[item] ?? 0;
  return { kind: 'decline', reason: have > 0 ? 'own_need' : dislike ? 'disliked' : 'no_item' };
}

function addCommitment(world: World, B: Person, req: Request, c: Partial<Commitment>): Commitment {
  const commit: Commitment = {
    id: world.nextId++,
    requestId: req.id,
    kind: 'deliver',
    to: req.from,
    item: null,
    amount: 1,
    siteId: 0,
    made: world.tick,
    deadline: world.tick + PROMISE_TTL,
    status: 'active',
    delivered: 0,
    destKind: req.destKind,
    destId: req.destId,
    grace: 0,
    ...c,
  };
  B.commitments.push(commit);
  req.commitmentId = commit.id;
  B.nextThink = world.tick;
  return commit;
}

/** Work or materials went into a building site: whoever promised to help with it is credited. */
export function creditContribution(p: Person, siteId: number, amount: number): void {
  if (!siteId) return;
  for (const c of p.commitments) if (c.status === 'active' && c.siteId === siteId && (c.kind === 'help_build' || c.kind === 'haul' || c.kind === 'work')) c.contrib = (c.contrib ?? 0) + amount;
}

/** A hard stop on how many promises one person carries at a time. */
export const MAX_ACTIVE_COMMITMENTS = 3;
export const activeCommitments = (p: Person): Commitment[] => p.commitments.filter((c) => c.status === 'active');

/** Survival came first: promises are put aside (not neglected) while a critical need or danger is dealt with. */
export function markSetAside(world: World, p: Person): void {
  for (const c of p.commitments) if (c.status === 'active') c.setAside = world.tick;
}

/** Someone died: what they had promised is moot, what was promised to them is released, and what they had asked for is withdrawn. */
export function socialOnDeath(world: World, p: Person): void {
  for (const c of p.commitments) {
    if (c.status !== 'active') continue;
    c.status = 'moot';
    c.reason = `${p.name} died`;
    const r = world.requests.find((x) => x.id === c.requestId);
    if (r && r.status === 'promised') settle(world, r, 'cancelled', `${p.name} died before they could`);
  }
  for (const r of world.requests) {
    if (r.status !== 'pending' && r.status !== 'promised') continue;
    if (r.from === p.id) {
      settle(world, r, 'cancelled', `${p.name} died`);
      const owner = world.byId.get(r.to);
      if (owner && owner.ent === 'person') for (const c of owner.commitments) if (c.requestId === r.id && c.status === 'active') {
        c.status = 'moot';
        c.reason = `${p.name} died`;
      }
    } else if (r.to === p.id && r.status === 'pending') settle(world, r, 'cancelled', `${p.name} died`);
  }
}

/** Called when a promised delivery arrives. */
export function fulfillCommitment(world: World, B: Person, commitmentId: number): void {
  const c = B.commitments.find((x) => x.id === commitmentId);
  if (!c || c.status !== 'active') return;
  c.status = 'done';
  const req = world.requests.find((r) => r.id === c.requestId);
  const A = personOf(world, c.to);
  if (req) settle(world, req, 'fulfilled', 'promise kept');
  if (A) {
    adjustRel(A, B.id, world.tick, { aff: 3, trust: 6, note: `${B.name} kept their promise` });
    adjustRel(B, A.id, world.tick, { aff: 1, trust: 1 });
    bubble(world, A, D.saying(D.THANKS, A.id, B.id, world.tick >> 4, { n: B.name }), 'happy');
    addEvent(world, 'social', `${B.name} kept a promise to ${A.name}.`, [A.id, B.id], A.x, A.y);
  }
}

/**
 * Upkeep of promises. A promise ends in exactly one of these ways, each with its own consequence:
 *   done         – kept (the request is fulfilled)
 *   expired      – the time ran out after some of it was done: partly kept, credit in proportion
 *   moot         – the need went away (the site was finished or abandoned, the other person died)
 *   interrupted  – the maker put it aside for their own survival until it was too late: a small mark, no blame
 *   failed       – it turned out to be impossible (nothing to give, nowhere to get it): a small mark
 *   broken       – the maker was free to do it and did not: the real penalty
 * Time asleep and time spent on survival does not count against the deadline.
 */
export function checkCommitments(world: World, p: Person): void {
  for (const c of p.commitments) {
    if (c.status !== 'active') continue;
    const A = personOf(world, c.to);
    const req = world.requests.find((r) => r.id === c.requestId);
    if (!A) {
      c.status = 'moot';
      c.reason = 'the other person is gone';
      if (req && (req.status === 'promised' || req.status === 'pending')) settle(world, req, 'cancelled', 'the other person is gone');
      continue;
    }
    if (p.pose === 'sleep' || (p.activity && p.activity.need)) c.grace = (c.grace ?? 0) + 40;
    // a building that no longer needs help
    if ((c.kind === 'help_build' || c.kind === 'haul' || c.kind === 'work') && c.siteId && !world.byId.has(c.siteId)) {
      const did = (c.contrib ?? 0) > 0 || (c.delivered ?? 0) > 0;
      c.status = did ? 'done' : 'moot';
      c.reason = did ? 'the building was finished with their help' : 'the building was finished or given up';
      if (req && req.status === 'promised') settle(world, req, did ? 'fulfilled' : 'cancelled', c.reason);
      continue;
    }
    if (c.kind === 'work' && c.destKind === 'building') {
      const target = c.destId ? world.byId.get(c.destId) : undefined;
      if (!target || target.ent !== 'building') {
        c.status = 'moot';
        c.reason = 'the building is gone';
        if (req && req.status === 'promised') settle(world, req, 'cancelled', c.reason);
        continue;
      }
      if (target.condition >= 62) {
        const did = (c.contrib ?? 0) > 0;
        c.status = did ? 'done' : 'moot';
        c.reason = did ? 'mended' : 'it was mended by someone else';
        if (req && req.status === 'promised') settle(world, req, did ? 'fulfilled' : 'cancelled', c.reason);
        if (did) adjustRel(A, p.id, world.tick, { aff: 3, trust: 5, note: `${p.name} mended our roof` });
        continue;
      }
    }
    if (c.kind === 'return_tool') {
      const t = c.toolId ? toolsHeldBy(world, p.id).find((x) => x.id === c.toolId) : undefined;
      if (!t || !t.loan) {
        // returned (or gone): nothing left to keep
        c.status = 'done';
        c.reason = 'handed back';
        continue;
      }
    }
    const effective = c.deadline + (c.grace ?? 0);
    const delivering = !!p.activity && p.activity.data.commitmentId === c.id && world.tick < effective + 300;
    if (world.tick <= effective || delivering) continue;
    // the time is up
    const total = c.kind === 'help_build' || c.kind === 'work' ? 40 : Math.max(1, c.amount);
    const got = c.kind === 'help_build' || c.kind === 'work' ? Math.min(total, c.contrib ?? 0) : Math.min(total, c.delivered ?? 0);
    const frac = got / total;
    if (frac >= 1) {
      c.status = 'done';
      if (req && req.status === 'promised') settle(world, req, 'fulfilled', 'did what they promised');
      adjustRel(A, p.id, world.tick, { aff: 2.5, trust: 3, note: `${p.name} helped with the building` });
    } else if (frac > 0) {
      c.status = 'expired';
      c.reason = `only ${Math.round(frac * 100)}% was done in time`;
      if (req && req.status === 'promised') settle(world, req, 'expired', c.reason);
      adjustRel(A, p.id, world.tick, { aff: 2.5 * frac - 0.5, trust: 4 * frac - 1, note: `${p.name} did part of what they promised` });
      addLog(world, p, 'social', `Only managed part of what I promised ${A.name}.`);
    } else if (c.setAside && world.tick - c.setAside < 900) {
      c.status = 'interrupted';
      c.reason = 'put aside while seeing to their own needs';
      if (req && req.status === 'promised') settle(world, req, 'interrupted', c.reason);
      adjustRel(A, p.id, world.tick, { trust: -1, aff: -0.4, note: `${p.name} could not manage what they promised` });
      addLog(world, p, 'social', `Could not get to what I promised ${A.name}: my own needs came first.`);
    } else if (c.blockedAt && world.tick - c.blockedAt < 600) {
      c.status = 'failed';
      c.reason = c.blocked ?? 'could not be done';
      if (req && req.status === 'promised') settle(world, req, 'failed', c.reason);
      adjustRel(A, p.id, world.tick, { trust: -2, aff: -0.6, note: `${p.name} found they could not do what they promised` });
      addLog(world, p, 'social', `Could not do what I promised ${A.name}: ${c.reason}.`);
    } else {
      c.status = 'broken';
      c.reason = 'not done in time';
      if (req) settle(world, req, 'broken', 'not delivered in time');
      adjustRel(A, p.id, world.tick, { aff: -5, trust: -12, note: `${p.name} did not keep a promise` });
      adjustRel(p, A.id, world.tick, { trust: -2, aff: -1 });
      openGrievance(world, A, p, 'broken_promise', `${p.name} did not do what they promised`, 38);
      addLog(world, p, 'social', `Failed to keep my promise to ${A.name}.`);
      addLog(world, A, 'social', `${p.name} never came through with what they promised.`);
      addEvent(world, 'conflict', `${p.name} did not keep a promise to ${A.name}.`, [p.id, A.id], A.x, A.y);
    }
  }
  if (p.commitments.length > 10) p.commitments = p.commitments.filter((c) => c.status === 'active' || world.tick - c.made < 4000);
}

export function updateRequests(world: World): void {
  for (const r of world.requests) {
    if (r.status === 'pending' && world.tick > r.expires) settle(world, r, 'expired', 'never got an answer');
  }
}

export { answerInfo, pickNews, tellBelief } from './news';
import { pickNews, tellBelief, answerInfo } from './news';

// ───────────────────────── conversations ─────────────────────────
function acceptsTalk(world: World, b: Person, a: Person, purpose: ConvPurpose): { ok: boolean; why: string } {
  if (!b.alive || b.pose === 'sleep') return { ok: false, why: 'was asleep' };
  if (b.convId) return { ok: false, why: 'was already talking to someone' };
  const avail = canInterruptForTalk(b);
  if (avail <= 0) return { ok: false, why: 'was busy' };
  const rel = b.relations[a.id];
  if (rel && rel.avoidUntil > world.tick && purpose !== 'apologize' && purpose !== 'warn') return { ok: false, why: 'did not want to talk' };
  if (personalDriveMax(b) > 62 && purpose !== 'request' && purpose !== 'warn') return { ok: false, why: 'had more pressing needs' };
  // someone visibly hungry or thirsty asking for help is hard to put off
  const visibleNeed = (a.needs.hunger < 38 || a.needs.thirst < 38) && (purpose === 'request' || purpose === 'ask_info') ? 0.3 : 0;
  const urgent = (purpose === 'warn' ? 0.4 : purpose === 'request' || purpose === 'offer' || purpose === 'invite' ? 0.12 : 0) + visibleNeed;
  const prob = clamp(avail * (0.5 + 0.45 * b.traits.sociability) + (rel?.affinity ?? 0) / 220 + urgent + (rel?.kin ? 0.2 : 0), 0, 0.97);
  if (hashUnit(b.id, a.id, world.tick >> 4) < prob) return { ok: true, why: '' };
  return { ok: false, why: 'was too busy to stop' };
}

export interface ConvData {
  reqKind?: RequestKind;
  item?: ItemKind | null;
  amount?: number;
  offer?: ItemKind | null;
  offerAmount?: number;
  siteId?: number;
  infoKind?: string;
  items?: Items;
  joinKind?: 'partner' | 'roommate';
  requestId?: number;
  toolKind?: ToolKind;
  purpose?: string;
  destKind?: Request['destKind'];
  destId?: number;
  deadline?: number;
  milestone?: string;
  mealId?: number;
  mealPlan?: import('./meals').MealPlan;
}

function convOf(world: World, id: number): Conversation | undefined {
  return world.conversations.find((c) => c.id === id);
}

function openConversation(world: World, A: Person, B: Person, actA: import('./types').Activity, purpose: ConvPurpose, data: ConvData): void {
  const c: Conversation = { id: world.nextId++, a: A.id, b: B.id, purpose, start: world.tick, phase: 0, nextAt: world.tick, end: 0, requestId: 0, data: { ...data } };
  world.conversations.push(c);
  // initiator: the 'socialize' activity becomes the conversation
  actA.kind = 'converse';
  actA.label = `Talking with ${B.name}`;
  actA.goal = purposeGoal(purpose, B.name);
  actA.phase = 'work';
  actA.progress = 0;
  actA.data = { convId: c.id, role: 'a' };
  actA.expire = world.tick + 500;
  actA.claims = [];
  A.convId = c.id;
  // the other person stops what they were doing
  suspendActivity(world, B);
  const actB = newActivity(world, B, { kind: 'converse', label: `Talking with ${A.name}`, goal: 'a chat', here: true, maxTicks: 500, minCommit: 400, data: { convId: c.id, role: 'b' } });
  startActivity(world, B, actB);
  B.convId = c.id;
  faceToward(A, B.x, B.y, 3);
  faceToward(B, A.x, A.y, 3);
}

function purposeGoal(purpose: ConvPurpose, name: string): string {
  switch (purpose) {
    case 'request':
      return `to ask ${name} for something`;
    case 'ask_info':
      return `to ask ${name} what they know`;
    case 'warn':
      return `to warn ${name}`;
    case 'offer':
      return `to help ${name}`;
    case 'apologize':
      return `to make peace with ${name}`;
    case 'recruit':
      return `to get ${name}'s help with a building`;
    case 'propose':
      return `to propose something to ${name}`;
    case 'trade':
      return `to swap goods with ${name}`;
    case 'invite':
      return `to invite ${name} to eat together`;
    default:
      return `to catch up with ${name}`;
  }
}

function endTalkActivity(world: World, p: Person, outcome: 'success' | 'interrupted'): void {
  p.convId = 0;
  if (p.activity && p.activity.kind === 'converse') {
    p.activity.data.finished = true;
    endActivity(world, p, outcome, outcome === 'success' ? 'finished a conversation' : 'conversation cut short');
  }
  if (!p.activity) resumeSuspended(world, p);
}

function finishConversation(world: World, c: Conversation, outcome: 'success' | 'interrupted'): void {
  const A = personOf(world, c.a);
  const B = personOf(world, c.b);
  const i = world.conversations.indexOf(c);
  if (i >= 0) world.conversations.splice(i, 1);
  // remember how this exchange ended, for each side, as one record (the partner, purpose and result stay together)
  const req = world.requests.find((r) => r.id === c.requestId);
  const resultText = outcome === 'interrupted' ? 'cut short' : req ? (req.outcome || req.status) : c.data.sour ? 'ended sourly' : 'friendly';
  const detailText = outcome === 'interrupted' ? 'one of them had to go' : req ? req.note : '';
  if (A) A.lastInteraction = { tick: world.tick, partner: c.b, purpose: c.purpose, role: 'asked', outcome: resultText, detail: detailText };
  if (B) B.lastInteraction = { tick: world.tick, partner: c.a, purpose: c.purpose, role: 'answered', outcome: resultText, detail: detailText };
  if (outcome === 'success' && A && B) {
    for (const [x, y] of [[A, B], [B, A]] as [Person, Person][]) {
      const rel = relOf(x, y.id);
      // how well do these two get along? temperaments that fit warm up quickly, ones that clash do not
      const fit = 1 - (Math.abs(x.traits.sociability - y.traits.sociability) + Math.abs(x.traits.generosity - y.traits.generosity) + Math.abs(x.traits.diligence - y.traits.diligence)) / 3;
      const early = rel.familiarity < 6 ? 1.5 : 1;
      const chem = hashUnit(Math.min(x.id, y.id), Math.max(x.id, y.id), 7) - 0.5; // some pairs click, some grate
      let gain = (fit - 0.6) * 4.6 * early + chem * 3.0 + (rel.familiarity > 3 && rel.affinity > 8 ? 0.8 : 0);
      if (y.needs.hunger < 28 || y.needs.energy < 20 || y.needs.warmth < 28) gain -= 0.7; // nobody is good company when miserable
      // two unattached adults with a spark between them warm to each other much faster
      if (gain > 0 && !x.partnerId && !y.partnerId && stageOf(world, x) !== 'child' && stageOf(world, y) !== 'child' && !rel.kin && spark(x, y)) gain += 2.6;
      if (rel.avoidUntil > world.tick || c.data.sour) gain = Math.min(gain, 0.2) * 0.4;
      adjustRel(x, y.id, world.tick, { aff: gain, fam: 1.3, trust: gain > 0 ? 0.6 : -0.2 });
      x.needs.social = Math.min(100, x.needs.social + (9 + 11 * x.traits.sociability) * (rel.affinity >= 20 ? 1.2 : 1));
      x.stats.talked++;
      x.cooldowns['talk' + y.id] = world.tick + 220;
    }
    A.wave = world.tick + 20;
    B.wave = world.tick + 24;
  }
  if (A) endTalkActivity(world, A, outcome);
  if (B) endTalkActivity(world, B, outcome);
}

/** Called when someone is removed from the world mid-conversation. */
export function abortConversationFor(world: World, p: Person): void {
  if (!p.convId) return;
  const c = convOf(world, p.convId);
  if (c) finishConversation(world, c, 'interrupted');
  p.convId = 0;
}

/** Per-tick conversation director: advances scripted phases, each of which acts on real state. */
export function updateConversations(world: World): void {
  for (const c of [...world.conversations]) {
    const A = personOf(world, c.a);
    const B = personOf(world, c.b);
    if (!A || !B || A.convId !== c.id || B.convId !== c.id) {
      finishConversation(world, c, 'interrupted');
      continue;
    }
    if (hyp(A.x - B.x, A.y - B.y) > CONV_REACH + 2.5 || world.tick - c.start > 400) {
      finishConversation(world, c, 'interrupted');
      continue;
    }
    if (world.tick < c.nextAt) continue;
    advance(world, c, A, B);
  }
}

function friendly(p: Person, q: Person): boolean {
  return (p.relations[q.id]?.affinity ?? 0) >= 28;
}

function advance(world: World, c: Conversation, A: Person, B: Person): void {
  const d = c.data as ConvData & { sour?: boolean; reqId?: number };
  switch (c.phase) {
    case 0: {
      // greeting
      A.wave = world.tick + 26;
      if (friendly(A, B) && hashUnit(A.id, B.id, world.tick >> 6) < 0.3) bubble(world, A, D.greeting(world, B.name, true, A.id, B.id), 'say', 44);
      c.phase = 1;
      c.nextAt = world.tick + 9;
      break;
    }
    case 1: {
      B.wave = world.tick + 24;
      phaseAsk(world, c, A, B, d);
      c.phase = 2;
      c.nextAt = world.tick + 22;
      break;
    }
    case 2: {
      phaseRespond(world, c, A, B, d);
      c.phase = 3;
      c.nextAt = world.tick + 22;
      break;
    }
    case 3: {
      if (!d.sour) {
        phaseNews(world, A, B);
        phaseNews(world, B, A);
      }
      c.phase = 4;
      c.nextAt = world.tick + 16;
      break;
    }
    default:
      finishConversation(world, c, 'success');
  }
}

// ── phase 1: the initiator says what they came for ──
function phaseAsk(world: World, c: Conversation, A: Person, B: Person, d: ConvData & { reqId?: number }): void {
  const vars = { n: B.name } as Record<string, string | number>;
  switch (c.purpose) {
    case 'chat': {
      if (hashUnit(A.id, B.id, world.tick >> 5) < 0.4) {
        const atFire = world.buildings.some((b) => b.type === 'fire' && b.fuel > 0 && hyp(b.x + 0.5 - A.x, b.y + 0.5 - A.y) < 5);
        const hard = A.needs.hunger < 45 || B.needs.hunger < 45;
        bubble(world, A, D.smallTalk(world, A.id, B.id, atFire, A.needs.warmth < 45, hard), 'say', 50);
      }
      break;
    }
    case 'request': {
      const kind = d.reqKind ?? 'food';
      const req = createRequest(world, A, B, { kind, item: d.item ?? null, amount: d.amount ?? 1, siteId: d.siteId ?? 0, purpose: d.purpose, destKind: d.destKind, destId: d.destId, deadline: d.deadline, milestone: d.milestone, toolKind: d.toolKind ?? null });
      d.reqId = req.id;
      c.requestId = req.id;
      if (kind === 'wood' || kind === 'stone' || kind === 'goods') A.cooldowns.askMaterials = world.tick + 900;
      const building = d.siteId ? String((world.byId.get(d.siteId) as { type?: string } | undefined)?.type ?? 'building').replace('_', '-') : 'building';
      if (kind === 'tool') bubble(world, A, `Could I borrow your ${d.toolKind ?? 'tool'}? I’ll bring it back.`, 'ask', 62);
      else if (kind === 'goods' || kind === 'haul') bubble(world, A, `Could you bring ${d.item ?? 'some materials'} to the ${building}?`, 'ask', 62);
      else if (kind === 'repair') bubble(world, A, 'Would you be able to patch our roof? It’s not keeping the rain out.', 'ask', 64);
      else bubble(world, A, D.requestLine(A.hhId === B.hhId && A.needs.hunger < 50 && stageOf(world, A) === 'child' ? 'care' : kind, A.id, B.id, { building }), 'ask', 60);
      addLog(world, A, 'social', `Asked ${B.name} for ${kind === 'food' ? 'food' : kind === 'tool' ? `the loan of a ${d.toolKind}` : (d.item ?? kind)}.`);
      break;
    }
    case 'ask_info': {
      const req = createRequest(world, A, B, { kind: 'info', infoKind: d.infoKind ?? 'food' });
      d.reqId = req.id;
      c.requestId = req.id;
      const thing = d.infoKind === 'wood' ? 'good trees' : d.infoKind === 'stone' ? 'stone' : d.infoKind === 'water' ? 'fresh water' : 'food';
      bubble(world, A, D.requestLine('info', A.id, B.id, { thing }), 'ask', 56);
      break;
    }
    case 'warn': {
      let danger: Belief | null = null;
      for (const k in A.beliefs) {
        const b = A.beliefs[k as unknown as number];
        if (b.kind === 'danger' && b.amount > 0 && world.tick - b.seen < 900 && (!danger || b.seen > danger.seen)) danger = b;
      }
      if (danger) {
        bubble(world, A, D.saying(D.WARN_LINES, A.id, B.id, world.tick >> 5, { dir: D.dangerWords(world, danger) }), 'warn', 66);
        c.data.warnId = danger.id;
      }
      break;
    }
    case 'offer': {
      const items = d.items ?? {};
      const what = Object.keys(items)[0] ?? 'something';
      bubble(world, A, D.saying(stageOf(world, B) === 'child' ? D.CARE_LINES : D.OFFER_LINES, A.id, B.id, world.tick >> 5, { n: B.name, what }), 'say', 60);
      break;
    }
    case 'recruit': {
      const site = world.byId.get(d.siteId ?? 0);
      const building = site && site.ent === 'site' ? site.type.replace('_', '-') : 'building';
      const req = createRequest(world, A, B, { kind: 'help_build', siteId: d.siteId ?? 0, amount: 1 });
      d.reqId = req.id;
      c.requestId = req.id;
      bubble(world, A, D.requestLine('help_build', A.id, B.id, { building }), 'ask', 60);
      break;
    }
    case 'apologize': {
      bubble(world, A, D.saying(D.APOLOGY, A.id, B.id, world.tick >> 5, vars), 'say', 58);
      break;
    }
    case 'invite': {
      inviteAsk(world, A, B, d);
      break;
    }
    case 'propose': {
      bubble(world, A, D.saying(d.joinKind === 'partner' ? (A.hhId === B.hhId ? D.PROPOSE_PARTNER_HOME : D.PROPOSE_PARTNER) : D.PROPOSE_ROOMMATE, A.id, B.id, world.tick >> 5, vars), 'ask', 62);
      break;
    }
    case 'trade': {
      const req = createRequest(world, A, B, { kind: 'trade', item: d.item ?? null, amount: d.amount ?? 1, offer: d.offer ?? null, offerAmount: d.offerAmount ?? 1 });
      d.reqId = req.id;
      c.requestId = req.id;
      bubble(world, A, D.requestLine('trade', A.id, B.id, { offer: D.ITEM_PHRASE[d.offer ?? 'wood'], want: D.ITEM_PHRASE[d.item ?? 'berries'] }), 'ask', 62);
      break;
    }
  }
}

function reqOf(world: World, c: Conversation): Request | undefined {
  return world.requests.find((r) => r.id === c.requestId);
}

// ── phase 2: the other person answers, and the answer has consequences ──
function phaseRespond(world: World, c: Conversation, A: Person, B: Person, d: ConvData): void {
  const req = reqOf(world, c);
  switch (c.purpose) {
    case 'chat': {
      if (hashUnit(B.id, A.id, world.tick >> 5) < 0.3) bubble(world, B, D.smallTalk(world, B.id, A.id, false, B.needs.warmth < 45, false), 'say', 46);
      break;
    }
    case 'request': {
      if (!req) break;
      const resp = evaluateRequest(world, B, A, req);
      if (resp.kind === 'give') {
        const moved = transfer(world, B.inv, A.inv, carryCap(world, A), resp.item, resp.n, 'person:' + B.id, 'person:' + A.id, 'gift on request');
        if (moved > 0) {
          const items: Items = { [resp.item]: moved };
          settle(world, req, 'fulfilled', `received ${moved} ${resp.item}`);
          bubble(world, B, D.saying(D.RESP_GIVE, B.id, A.id, world.tick >> 5, { what: `${moved} ${resp.item}` }), 'say', 56);
          onGift(world, B, A, items, 'request');
          // the thank-you comes next phase
          c.data.thank = true;
        } else {
          settle(world, req, 'failed', 'could not carry it');
          bubble(world, B, 'You can’t carry any more.', 'say', 50);
        }
      } else if (resp.kind === 'lend') {
        const t = resp.tool;
        const due = world.tick + LOAN_TERM;
        if (lendTool(world, t, B, A, due)) {
          settle(world, req, 'fulfilled', `lent a ${t.kind} until tomorrow`);
          req.outcome = 'lent';
          const c = addCommitment(world, A, req, { kind: 'return_tool', to: B.id, item: t.kind, amount: 1, toolId: t.id, deadline: due + 400, destKind: 'person', destId: B.id });
          void c;
          bubble(world, B, `Of course. Bring it back when you’re done.`, 'say', 58);
          adjustRel(A, B.id, world.tick, { aff: 3, trust: 2.5, fam: 0.5, note: `${B.name} lent me their ${t.kind}` });
          adjustRel(B, A.id, world.tick, { aff: 0.8, trust: 1, note: `I lent ${A.name} my ${t.kind}` });
          addLog(world, B, 'social', `Lent my ${t.kind} to ${A.name}.`);
          addLog(world, A, 'social', `${B.name} lent me a ${t.kind}; I promised to return it.`);
          addEvent(world, 'social', `${B.name} lent a ${t.kind} to ${A.name}.`, [A.id, B.id], A.x, A.y);
        } else {
          settle(world, req, 'failed', 'could not hand it over');
        }
      } else if (resp.kind === 'promise') {
        const item = resp.item;
        // what is wanted at a building site is brought to the site (not to the person asking, whose pack may be full)
        const toSite = !!req.siteId && !!item && !isFood(item) && item !== 'water';
        if (req.kind === 'repair') {
          addCommitment(world, B, req, { kind: 'work', item: null, amount: 1, siteId: 0, deadline: world.tick + PROMISE_TTL + 900, destKind: 'building', destId: req.destId, milestone: req.milestone || 'sound again' });
        } else {
          const kindC: Commitment['kind'] = req.kind === 'haul' || req.kind === 'goods' || toSite ? 'haul' : 'deliver';
          addCommitment(world, B, req, { kind: kindC, item, amount: resp.n, siteId: req.siteId, deadline: world.tick + (kindC === 'haul' ? PROMISE_TTL + 600 : PROMISE_TTL), destKind: kindC === 'haul' ? 'site' : 'person', destId: kindC === 'haul' ? req.siteId : A.id });
        }
        req.status = 'promised';
        req.note = `${B.name} will bring ${resp.n} ${item}`;
        if (req.kind === 'repair') {
          bubble(world, B, 'I’ll see to the roof.', 'say', 60);
          addLog(world, B, 'social', `Promised ${A.name} to mend their roof.`);
          addLog(world, A, 'social', `${B.name} promised to mend our roof.`);
          addEvent(world, 'social', `${B.name} promised to mend ${A.name}’s roof.`, [A.id, B.id], A.x, A.y);
        } else {
          bubble(world, B, D.saying(D.RESP_PROMISE_ITEM, B.id, A.id, world.tick >> 5, { what: item ?? 'it' }), 'say', 64);
          addLog(world, B, 'social', `Promised ${A.name} ${resp.n} ${item}.`);
          addLog(world, A, 'social', `${B.name} promised to bring me ${resp.n} ${item}.`);
          addEvent(world, 'social', `${B.name} promised ${A.name} ${item}.`, [A.id, B.id], A.x, A.y);
        }
        adjustRel(A, B.id, world.tick, { aff: 1.5, trust: 1 });
      } else {
        const lines = resp.reason === 'no_item' ? D.RESP_NO_ITEM : resp.reason === 'own_need' || resp.reason === 'in_use' ? D.RESP_OWN_NEED : resp.reason === 'disliked' ? D.RESP_DISLIKED : D.RESP_UNWILLING;
        if (resp.reason === 'enough') bubble(world, B, 'I think that’s been seen to already.', 'say', 54);
        else if (resp.reason === 'committed') bubble(world, B, 'I’ve already promised that to them.', 'say', 54);
        else if (resp.reason === 'in_use') bubble(world, B, 'I’m using it just now — ask me later?', 'say', 54);
        else bubble(world, B, D.saying(lines, B.id, A.id, world.tick >> 5), 'say', 56);
        settle(world, req, 'declined', resp.reason.replace('_', ' '));
        const sev = req.kind === 'food' ? clamp((62 - A.needs.hunger) / 62, 0, 1) : req.kind === 'water' ? clamp((66 - A.needs.thirst) / 66, 0, 1) : 0.3;
        if (resp.reason === 'unwilling' || resp.reason === 'disliked') {
          // a refusal is not a broken promise: it costs a little warmth, in proportion to how much was at stake
          adjustRel(A, B.id, world.tick, { aff: -(1.5 + 4.5 * sev), trust: -1.5 - 2 * sev, note: `${B.name} refused to help me` });
          adjustRel(B, A.id, world.tick, { aff: -0.3 });
          if (sev > 0.45) openGrievance(world, A, B, 'refusal', `${B.name} would not help when I really needed it`, 20 + 30 * sev);
          // only a refusal that matters (someone really needs it) makes the feed
          if (sev > 0.45 && (req.kind === 'food' || req.kind === 'water' || req.kind === 'care')) {
            addEvent(world, 'conflict', `${B.name} refused ${A.name}'s plea for ${req.kind === 'water' ? 'water' : 'food'}.`, [A.id, B.id], A.x, A.y);
          }
          c.data.sour = true;
        } else if (resp.reason === 'own_need') {
          adjustRel(A, B.id, world.tick, { aff: -0.3 });
        } else {
          // 'enough', 'committed', 'in_use', 'no_item': nobody did anything wrong
          A.asked[B.id] = world.tick - 400;
        }
        addLog(world, A, 'social', `${B.name} said no (${resp.reason.replace('_', ' ')}).`);
        addLog(world, B, 'social', `Turned down ${A.name}'s request (${resp.reason.replace('_', ' ')}).`);
        bubbleLater(world, A, D.saying(D.SHRUG, A.id, B.id, world.tick >> 5), 12);
      }
      break;
    }
    case 'ask_info': {
      if (!req) break;
      const belief = answerInfo(world, B, A, d.infoKind ?? 'food');
      if (belief) {
        tellBelief(world, B, A, belief);
        learn(A, { ...belief, src: 'told', from: B.id, learned: world.tick, origin: belief.origin ?? B.id, hops: (belief.hops ?? 0) + 1 });
        bubble(world, B, D.infoLine(world, belief, B.id, A.id), 'say', 70);
        settle(world, req, 'fulfilled', `told about a ${BELIEF_NOUN[belief.kind]}`);
        adjustRel(A, B.id, world.tick, { aff: 1.6, trust: 1.2, note: `${B.name} told me where to find ${d.infoKind ?? 'food'}` });
        A.errand = null;
        c.data.thank = true;
      } else {
        bubble(world, B, 'Sorry, I haven’t seen any.', 'say', 54);
        settle(world, req, 'failed', 'they did not know either');
        adjustRel(A, B.id, world.tick, { aff: 0.2 });
      }
      break;
    }
    case 'warn': {
      const id = c.data.warnId as number | undefined;
      if (id) {
        const b = A.beliefs[id];
        if (b) {
          tellBelief(world, A, B, b);
          bubble(world, B, 'Thanks for the warning.', 'say', 50);
          adjustRel(B, A.id, world.tick, { aff: 1.8, trust: 2.2, note: `${A.name} warned me about a wolf` });
          if ((world.stats.lastWarnEvent ?? -9999) < world.tick - 900) {
            world.stats.lastWarnEvent = world.tick;
            addEvent(world, 'danger', `${A.name} warned ${B.name} about a wolf.`, [A.id, B.id], A.x, A.y);
          }
        }
      }
      break;
    }
    case 'offer': {
      const items = d.items ?? {};
      let moved = 0;
      const got: Items = {};
      for (const k of Object.keys(items) as ItemKind[]) {
        const m = transfer(world, A.inv, B.inv, carryCap(world, B), k, items[k] ?? 0, 'person:' + A.id, 'person:' + B.id, 'offered gift');
        if (m > 0) got[k] = m;
        moved += m;
      }
      if (moved > 0) {
        onGift(world, A, B, got, isDependent(world, B) ? 'care' : 'offer');
        bubble(world, B, D.saying(D.THANKS, B.id, A.id, world.tick >> 5, { n: A.name }), 'happy', 52);
      }
      break;
    }
    case 'recruit': {
      if (!req) break;
      const siteBelief = A.beliefs[d.siteId ?? 0];
      const rel = B.relations[A.id];
      const site0 = world.byId.get(d.siteId ?? 0);
      const cap = (site0 && site0.ent === 'site' ? site0.maxWorkers : 3) + 1;
      if (helpersOn(world, d.siteId ?? 0) >= cap || activeCommitments(B).length >= MAX_ACTIVE_COMMITMENTS) {
        bubble(world, B, 'There are hands enough there already.', 'say', 52);
        settle(world, req, 'declined', 'enough hands already');
        A.asked[B.id] = world.tick - 400;
        break;
      }
      const w = 0.2 + 0.45 * B.traits.diligence + 0.3 * B.traits.generosity + 0.4 * Math.max(0, (rel?.affinity ?? 0)) / 100 + (hashUnit(B.id, A.id, world.tick >> 5) - 0.5) * 0.15 - 0.5 * (personalDriveMax(B) / 100) + (rel?.kin ? 0.2 : 0);
      if (w >= 0.55 && siteBelief && world.byId.has(d.siteId ?? 0)) {
        tellBelief(world, A, B, siteBelief);
        addCommitment(world, B, req, { kind: 'help_build', siteId: d.siteId ?? 0, amount: 1, deadline: world.tick + 1800, destKind: 'site', destId: d.siteId ?? 0, milestone: 'work on it or bring materials' });
        req.status = 'promised';
        req.note = `${B.name} will help build`;
        bubble(world, B, D.saying(D.RESP_PROMISE_HELP, B.id, A.id, world.tick >> 5), 'say', 64);
        addLog(world, B, 'social', `Agreed to help ${A.name} with the building.`);
        addEvent(world, 'social', `${B.name} agreed to help ${A.name} build.`, [A.id, B.id], A.x, A.y);
      } else {
        bubble(world, B, D.saying(D.RESP_UNWILLING, B.id, A.id, world.tick >> 5), 'say', 52);
        settle(world, req, 'declined', 'busy');
      }
      break;
    }
    case 'apologize': {
      const gA = A.relations[B.id]?.grievance;
      const gB = B.relations[A.id]?.grievance;
      const rel = B.relations[A.id];
      const weight = Math.max(gA?.weight ?? 0, gB?.weight ?? 0);
      if (!gA && !gB) {
        // nothing to make peace over any more: the quarrel was already settled
        bubble(world, B, 'We’re fine — don’t worry about it.', 'say', 50);
        break;
      }
      const sev = clamp(weight / 70, 0, 1);
      const p = clamp(0.4 + 0.5 * B.traits.generosity - 0.32 * sev + (rel ? rel.trust / 300 : 0) + 0.12 * (gA ? gA.apologies : 0), 0.1, 0.95);
      if (gA) gA.apologies++;
      if (hashUnit(B.id, A.id, world.tick >> 4) < p) {
        bubble(world, B, D.saying(D.FORGIVE, B.id, A.id, world.tick >> 5), 'happy', 56);
        adjustRel(B, A.id, world.tick, { aff: 9, trust: 4, note: `${A.name} apologised` });
        adjustRel(A, B.id, world.tick, { aff: 4, note: `${B.name} forgave me` });
        settleBoth(world, A, B, 'an apology');
        addEvent(world, 'social', `${A.name} and ${B.name} made peace.`, [A.id, B.id], A.x, A.y);
      } else {
        bubble(world, B, D.saying(D.NOT_YET, B.id, A.id, world.tick >> 5), 'angry', 52);
        // it eases a little just for having been said; the next attempt waits
        easeGrievance(world, B, A, 6, 'an apology that was not yet accepted');
        A.cooldowns['sorry' + B.id] = world.tick + 900 * (gA && gA.apologies >= 2 ? 2 : 1);
        c.data.sour = true;
      }
      break;
    }
    case 'invite': {
      if (d.mealId) inviteRespond(world, A, B, d.mealId);
      break;
    }
    case 'propose': {
      const rel = B.relations[A.id];
      const aff = rel?.affinity ?? 0;
      const trust = rel?.trust ?? 0;
      const kind = d.joinKind ?? 'roommate';
      const ok = kind === 'partner' ? aff >= 28 && trust >= 20 && B.partnerId === 0 && A.partnerId === 0 && spark(A, B) : aff >= 32 && trust >= 22;
      if (ok && hashUnit(B.id, A.id, world.tick >> 6) < 0.8 + 0.2 * B.traits.sociability) {
        if (joinHouseholds(world, A, B, kind)) {
          bubble(world, B, D.saying(D.ACCEPT_PROPOSE, B.id, A.id, world.tick >> 5), 'happy', 56);
        } else {
          bubble(world, B, D.saying(D.NO_ROOM, B.id, A.id, world.tick >> 5), 'say', 56);
          A.cooldowns['propose' + B.id] = world.tick + 1500;
        }
      } else {
        bubble(world, B, D.saying(D.DECLINE_PROPOSE, B.id, A.id, world.tick >> 5), 'say', 52);
        A.cooldowns['propose' + B.id] = world.tick + 2400;
      }
      break;
    }
    case 'trade': {
      if (!req || !req.item || !req.offer) break;
      const give = req.item;
      const take = req.offer;
      const bHas = surplusOf(world, B, give);
      const gain = valueOf(world, B, take) * req.offerAmount - valueOf(world, B, give) * req.amount;
      const rel = B.relations[A.id];
      // both packs must be able to take what they are about to be handed, or the swap does not happen at all
      const roomA = roomFor(A.inv, carryCap(world, A), give) + 0;
      const roomB = roomFor(B.inv, carryCap(world, B), take);
      const fits = roomA >= req.amount && roomB >= req.offerAmount;
      if (!fits && bHas >= req.amount && (A.inv[take] ?? 0) >= req.offerAmount) {
        bubble(world, B, 'I couldn’t carry that on top of what I have.', 'say', 50);
        settle(world, req, 'declined', 'no room to carry the swap');
        A.asked[B.id] = world.tick + 1200; // a swap that cannot be carried is not proposed to them again for the best part of a day
        break;
      }
      if (bHas >= req.amount && gain > 0.15 + (rel && rel.affinity < 0 ? 0.6 : 0) && (A.inv[take] ?? 0) >= req.offerAmount) {
        const m1 = transfer(world, B.inv, A.inv, carryCap(world, A), give, req.amount, 'person:' + B.id, 'person:' + A.id, 'trade');
        const m2 = m1 > 0 ? transfer(world, A.inv, B.inv, carryCap(world, B), take, req.offerAmount, 'person:' + A.id, 'person:' + B.id, 'trade') : 0;
        if (m1 > 0 && m2 > 0) {
          settle(world, req, 'fulfilled', `swapped ${m2} ${take} for ${m1} ${give}`);
          bubble(world, B, D.saying(D.TRADE_OK, B.id, A.id, world.tick >> 5), 'say', 46);
          adjustRel(A, B.id, world.tick, { aff: 1.8, trust: 1.5, fam: 0.5 });
          adjustRel(B, A.id, world.tick, { aff: 1.8, trust: 1.5, fam: 0.5 });
          addEvent(world, 'trade', `${A.name} swapped ${m2} ${take} for ${m1} ${give} with ${B.name}.`, [A.id, B.id], A.x, A.y);
          addLog(world, A, 'social', `Traded ${m2} ${take} for ${m1} ${give} with ${B.name}.`);
          addLog(world, B, 'social', `Traded ${m1} ${give} for ${m2} ${take} with ${A.name}.`);
          // undo half-done swaps if the second leg failed to move everything
        } else {
          if (m1 > 0) transfer(world, A.inv, B.inv, 9999, give, m1, 'person:' + A.id, 'person:' + B.id, 'trade rollback');
          settle(world, req, 'failed', 'could not carry the swap');
        }
      } else {
        bubble(world, B, D.saying(D.TRADE_NO, B.id, A.id, world.tick >> 5), 'say', 50);
        settle(world, req, 'declined', bHas < req.amount ? 'nothing to spare' : 'not worth it');
        A.asked[B.id] = world.tick + 1200; // told no: not asked again for a long while
      }
      break;
    }
  }
}

function bubbleLater(world: World, p: Person, text: string, after: number): void {
  world.delayed.push({ tick: world.tick + after, id: p.id, text });
}

export function flushDelayedBubbles(world: World): void {
  const delayed = world.delayed;
  for (let i = delayed.length - 1; i >= 0; i--) {
    const d = delayed[i];
    if (world.tick >= d.tick) {
      const p = personOf(world, d.id);
      if (p) bubble(world, p, d.text, 'say', 44);
      delayed.splice(i, 1);
    }
  }
}

// ── phase 3: news travels by word of mouth ──
function phaseNews(world: World, S: Person, L: Person): void {
  shareConcerns(world, S, L);
  const news = pickNews(world, S, L, 2);
  let shown = false;
  let learned = 0;
  for (const b of news) {
    const isNew = tellBelief(world, S, L, b);
    if (isNew) {
      learned++;
      if (!shown && !S.speech) {
        shown = true;
        if (b.kind === 'danger') bubble(world, S, D.saying(D.WARN_LINES, S.id, L.id, world.tick >> 5, { dir: D.dangerWords(world, b) }), 'warn', 62);
        else bubble(world, S, D.infoLine(world, b, S.id, L.id), 'say', 66);
      }
    }
  }
  if (learned > 0) adjustRel(L, S.id, world.tick, { aff: 0.5 * learned, trust: 0.3 * learned });
}

// ───────────────────────── households ─────────────────────────
function joinHouseholds(world: World, A: Person, B: Person, kind: 'partner' | 'roommate'): boolean {
  const hhA = householdById(world, A.hhId);
  const hhB = householdById(world, B.hhId);
  if (!hhA || !hhB) return false;
  if (hhA === hhB) {
    if (kind === 'partner') {
      bindPartners(world, A, B);
      return true;
    }
    return false;
  }
  const home = (h: typeof hhA) => (h.homeId ? (world.byId.get(h.homeId) as { type?: string } | undefined)?.type : undefined);
  const score = (h: typeof hhA) => (home(h) === 'house' ? 4 : home(h) === 'hut' ? 3 : home(h) === 'lean_to' ? 2 : 0) + membersOf(world, h).length * 0.1;
  // the better-housed side hosts, unless there is no room there — then the other side may
  const order = score(hhA) >= score(hhB) ? [hhA, hhB] : [hhB, hhA];
  for (const dest of order) {
    const src = dest === hhA ? hhB : hhA;
    const mover = dest === hhA ? B : A;
    const destHome = dest.homeId ? (world.byId.get(dest.homeId) as { type: keyof typeof BUILD_DEF } | undefined) : undefined;
    const cap = destHome ? BUILD_DEF[destHome.type].sleepers : 99;
    const incoming = [mover, ...membersOf(world, src).filter((m) => m.id !== mover.id && m.parents.includes(mover.id) && stageOf(world, m) === 'child')];
    if (membersOf(world, dest).length + incoming.length > cap) continue;
    for (const m of incoming) addToHousehold(world, m, dest);
    if (kind === 'partner') bindPartners(world, A, B);
    const label = kind === 'partner' ? 'moved in together' : 'now share a home';
    addEvent(world, 'social', `${A.name} and ${B.name} ${label} (${dest.name} household).`, [A.id, B.id], A.x, A.y);
    addLog(world, A, 'life', `${A.name} and ${B.name} ${label}.`);
    addLog(world, B, 'life', `${A.name} and ${B.name} ${label}.`);
    return true;
  }
  return false;
}

function bindPartners(world: World, A: Person, B: Person): void {
  A.partnerId = B.id;
  B.partnerId = A.id;
  const ra = relOf(A, B.id);
  const rb = relOf(B, A.id);
  ra.kin = 'partner';
  rb.kin = 'partner';
  ra.affinity = Math.max(ra.affinity, 68);
  rb.affinity = Math.max(rb.affinity, 68);
  ra.trust = Math.max(ra.trust, 55);
  rb.trust = Math.max(rb.trust, 55);
  addEvent(world, 'life', `${A.name} and ${B.name} became a couple.`, [A.id, B.id], A.x, A.y);
}

// ───────────────────────── conflict ─────────────────────────
/** Someone reached the last of a resource just before another person. */
export function contestLost(world: World, loser: Person, winnerId: number, src: { item: ItemKind; x: number; y: number }): void {
  const w = personOf(world, winnerId);
  if (!w) return;
  const d = hyp(loser.x - w.x, loser.y - w.y);
  if (d > 7) return;
  const desperate = loser.needs.hunger < 35 || loser.needs.thirst < 35;
  const rel = loser.relations[w.id];
  const sameHh = loser.hhId === w.hhId;
  adjustRel(loser, w.id, world.tick, { aff: -(0.8 + (desperate ? 2.2 : 0.4)), note: `${w.name} got the last ${src.item} before me` });
  addLog(world, loser, 'social', `${w.name} got to the last ${src.item} before me.`);
  // worth a line in the feed now and then (not for every missed berry)
  const isFood = src.item === 'berries' || src.item === 'fruit' || src.item === 'fish' || src.item === 'grain';
  if (isFood && loser.needs.hunger < 55 && world.tick - (loser.cooldowns.contestEvt ?? -9999) > 1200 && world.tick - (world.stats.lastContestEvt ?? -9999) > 450) {
    loser.cooldowns.contestEvt = world.tick;
    world.stats.lastContestEvt = world.tick;
    const one = src.item === 'berries' ? 'berry' : src.item;
    addEvent(world, 'conflict', `${w.name} reached the last ${one} a moment before ${loser.name}.`, [loser.id, w.id], loser.x, loser.y);
  }
  const p = clamp(0.08 + 0.4 * (1 - loser.traits.generosity) + (desperate ? 0.25 : 0) - 0.3 * Math.max(0, (rel?.affinity ?? 0)) / 100 - (sameHh ? 0.3 : 0), 0, 0.8);
  openGrievance(world, loser, w, desperate && isFood ? 'scarcity' : 'competition', `${w.name} got the last ${src.item} before me`, desperate ? 26 : 14);
  if (loser.cooldowns.argue > world.tick || loser.convId || w.convId) return;
  if (hashUnit(loser.id, w.id, world.tick >> 3) < p * quarrelDamper(world, loser, w)) startArgument(world, loser, w, `the last ${src.item}`, desperate && isFood ? 'scarcity' : 'competition');
}

export function startArgument(world: World, a: Person, b: Person, why: string, cause: import('./types').GrievanceCause = 'competition'): void {
  if (a.convId || b.convId) return;
  suspendActivity(world, a);
  suspendActivity(world, b);
  const mk = (me: Person, other: Person, first: boolean) => {
    const act = newActivity(world, me, { kind: 'argue', label: `Arguing with ${other.name}`, goal: 'a heated moment', here: true, maxTicks: 90, minCommit: 80, data: { other: other.id, first } });
    startActivity(world, me, act);
  };
  mk(a, b, true);
  mk(b, a, false);
  a.cooldowns.argue = world.tick + 700;
  b.cooldowns.argue = world.tick + 700;
  bubble(world, a, D.saying(D.ARGUE_A, a.id, b.id, world.tick >> 4), 'angry', 54);
  bubbleLater(world, b, D.saying(D.ARGUE_B, b.id, a.id, world.tick >> 4), 14);
  adjustRel(a, b.id, world.tick, { aff: -5, trust: -3, note: `argued over ${why}` });
  adjustRel(b, a.id, world.tick, { aff: -4, trust: -2, note: `argued over ${why}` });
  relOf(a, b.id).avoidUntil = world.tick + 700 + Math.floor(hashUnit(a.id, b.id, 4) * 500);
  relOf(b, a.id).avoidUntil = world.tick + 600 + Math.floor(hashUnit(b.id, a.id, 4) * 500);
  openGrievance(world, a, b, cause, `we argued over ${why}`, 46);
  openGrievance(world, b, a, cause, `we argued over ${why}`, 40);
  addEvent(world, 'conflict', `${a.name} and ${b.name} argued over ${why}.`, [a.id, b.id], a.x, a.y);
  addLog(world, a, 'social', `Argued with ${b.name} over ${why}.`);
  addLog(world, b, 'social', `Argued with ${a.name} over ${why}.`);
  addFx(world, 'anger', (a.x + b.x) / 2, (a.y + b.y) / 2, 0);
  think(world, a, 'argued:' + b.id, -12, DAY, `argued with ${b.name}`);
  think(world, b, 'argued:' + a.id, -12, DAY, `argued with ${a.name}`);
  witness(world, 'quarrel', a, b, a.x, a.y);
}

// ───────────────────────── working side by side ─────────────────────────
/** People who do the same job near each other (building together, working neighbouring plots) come to like each other. */
export function bondWorkers(world: World, p: Person): void {
  const a = p.activity;
  if (!a || a.phase !== 'work' || (world.tick + p.id) % 50 !== 0) return;
  if (!['build', 'haul', 'till', 'plant', 'tend', 'harvest', 'gather', 'repair', 'craft'].includes(a.kind)) return;
  for (const s of p.seen) {
    if (s.ent !== 'person' || s.act !== a.kind) continue;
    if (hyp(s.x - p.x, s.y - p.y) > 4.5) continue;
    const q = personOf(world, s.id);
    if (!q) continue;
    const rel = p.relations[q.id];
    if (rel && rel.avoidUntil > world.tick) continue;
    const fit = 1 - (Math.abs(p.traits.diligence - q.traits.diligence) + Math.abs(p.traits.sociability - q.traits.sociability)) / 2;
    if (fit < 0.45) continue;
    const sparked = !p.partnerId && !q.partnerId && stageOf(world, p) !== 'child' && stageOf(world, q) !== 'child' && !(rel && rel.kin) && spark(p, q);
    adjustRel(p, q.id, world.tick, { aff: 0.5 + 0.5 * fit + (sparked ? 0.7 : 0), fam: 0.5, trust: 0.4, note: `worked alongside ${q.name}` });
  }
}

// ───────────────────────── passing greetings ─────────────────────────
export function passingGreetings(world: World, p: Person): void {
  if (p.pose === 'sleep' || p.convId || p.wave > world.tick) return;
  if ((world.tick + p.id) % 14 !== 0) return;
  for (const s of p.seen) {
    if (s.ent !== 'person' || s.asleep || s.busyTalking) continue;
    if (hyp(s.x - p.x, s.y - p.y) > 2.8) continue;
    if ((p.cooldowns['greet' + s.id] ?? 0) > world.tick) continue;
    const q = personOf(world, s.id);
    if (!q) continue;
    const rel = p.relations[q.id];
    if (rel && rel.avoidUntil > world.tick) continue;
    const chance = 0.2 + 0.45 * p.traits.sociability + Math.min(0.25, (rel?.familiarity ?? 0) / 80);
    if (hashUnit(p.id, q.id, world.tick >> 4) > chance) continue;
    p.wave = world.tick + 28;
    p.cooldowns['greet' + q.id] = world.tick + GREET_COOLDOWN;
    adjustRel(p, q.id, world.tick, { aff: 0.3, fam: 0.5 });
    if (hashUnit(q.id, p.id, world.tick >> 4) < 0.75 && q.wave < world.tick) {
      q.wave = world.tick + 34;
      adjustRel(q, p.id, world.tick, { aff: 0.3, fam: 0.5 });
    }
    q.cooldowns['greet' + p.id] = world.tick + GREET_COOLDOWN;
    break;
  }
}

// ───────────────────────── activity handlers ─────────────────────────
registerHandler('socialize', {
  availability: 0.6,
  pose: () => 'talk',
  begin(world, p, a) {
    const t = personOf(world, a.targetId);
    if (!t) return 'they are no longer around';
    if (hyp(t.x - p.x, t.y - p.y) > CONV_REACH + 2.5) return 'could not find them';
  },
  work(world, p, a): WorkResult {
    const t = personOf(world, a.targetId);
    if (!t) return 'fail:they are no longer around';
    if (hyp(t.x - p.x, t.y - p.y) > CONV_REACH + 1.2) return 'fail:they walked away';
    const purpose = (a.data.purpose ?? 'chat') as ConvPurpose;
    const ok = acceptsTalk(world, t, p, purpose);
    if (!ok.ok) {
      // someone who was simply busy can be tried again soon; someone who wants nothing to do with you cannot
      p.cooldowns['talk' + t.id] = world.tick + (ok.why === 'was too busy to stop' || ok.why === 'was busy' ? 120 : 420);
      addLog(world, p, 'social', `Wanted a word with ${t.name}, who ${ok.why}.`);
      return `fail:${t.name} ${ok.why}`;
    }
    openConversation(world, p, t, a, purpose, (a.data.conv ?? {}) as ConvData);
    return 'continue';
  },
});

registerHandler('converse', {
  availability: 0,
  pose: () => 'talk',
  work(world, p, a): WorkResult {
    const c = convOf(world, a.data.convId as number);
    if (!c || a.data.finished) return 'done';
    const other = personOf(world, c.a === p.id ? c.b : c.a);
    if (!other) return 'done';
    faceToward(p, other.x, other.y);
    return 'continue';
  },
  onEnd(world, p, a, outcome) {
    const c = convOf(world, a.data.convId as number);
    if (c && !a.data.finished) {
      // this person was pulled away mid-conversation (danger, urgent need…): the other is left mid-sentence
      finishConversation(world, c, 'interrupted');
    }
    p.convId = 0;
    if (!p.activity) resumeSuspended(world, p);
  },
});

registerHandler('argue', {
  availability: 0,
  pose: () => 'argue',
  begin(world, p, a) {
    a.duration = 34 + (a.data.first ? 4 : 0);
  },
  work(world, p, a): WorkResult {
    const o = personOf(world, a.data.other as number);
    if (o) faceToward(p, o.x, o.y);
    a.progress++;
    return a.progress >= a.duration ? 'done' : 'continue';
  },
  onEnd(world, p) {
    if (!p.activity) resumeSuspended(world, p);
  },
});

registerHandler('give', {
  availability: 0.4,
  pose: () => 'give',
  begin(world, p, a) {
    const t = personOf(world, a.targetId);
    if (!t) return 'they are gone';
    if (hyp(t.x - p.x, t.y - p.y) > 3.2) {
      // not where I expected: update what I know and give up for now
      delete p.whereabouts[t.id];
      return `${t.name} was not where I expected`;
    }
    if ((t.cooldowns.pause ?? 0) > world.tick) return `${t.name} is already being attended to`;
    if ((t.cooldowns.fedUntil ?? 0) > world.tick) return `${t.name} has just been looked after`;
    a.duration = 14;
    // the other person stops for a moment to receive (one giver at a time)
    t.cooldowns.pause = world.tick + a.duration + 3;
    faceToward(p, t.x, t.y, 3);
    faceToward(t, p.x, p.y, 3);
  },
  work(world, p, a): WorkResult {
    const t = personOf(world, a.targetId);
    if (!t) return 'fail:they are gone';
    faceToward(p, t.x, t.y);
    faceToward(t, p.x, p.y, 0.5);
    a.progress++;
    if (a.progress < a.duration) return 'continue';
    const want = (a.data.items ?? {}) as Record<string, number>;
    const got: Items = {};
    let moved = 0;
    if ((a.data.mode as string) === 'return') {
      // a borrowed tool goes back into the lender's hands — that exact tool, not another of the same kind
      const tool = toolsHeldBy(world, p.id).find((x) => x.id === (a.data.toolId as number));
      if (!tool || !tool.loan) return 'fail:there is nothing to hand back';
      if ((t.inv[tool.kind] ?? 0) >= 1 && carryCap(world, t) < 99 && false) return 'fail:their hands are full';
      if (!returnLoan(world, tool, p, t)) return 'fail:could not hand it back';
      t.cooldowns.pause = 0;
      bubble(world, p, `Here’s your ${tool.kind} back — thank you.`, 'say', 56);
      bubbleLater(world, t, D.saying(D.THANKS, t.id, p.id, world.tick >> 5, { n: p.name }), 14);
      adjustRel(t, p.id, world.tick, { aff: 1.6, trust: 3.2, note: `${p.name} gave back my ${tool.kind}` });
      adjustRel(p, t.id, world.tick, { aff: 0.5, trust: 0.8 });
      addEvent(world, 'social', `${p.name} returned ${t.name}'s ${tool.kind}.`, [p.id, t.id], t.x, t.y);
      if (a.data.commitmentId) fulfillCommitment(world, p, a.data.commitmentId as number);
      a.cycle = 1;
      return 'done';
    }
    for (const k of Object.keys(want)) {
      const m = transfer(world, p.inv, t.inv, carryCap(world, t), k as ItemKind, Math.min(want[k], p.inv[k as ItemKind] ?? 0), 'person:' + p.id, 'person:' + t.id, 'given');
      if (m > 0) got[k as ItemKind] = m;
      moved += m;
    }
    t.cooldowns.pause = 0;
    t.cooldowns.fedUntil = world.tick + 120; // let them eat before anyone else fusses over them
    if (moved <= 0) {
      if (a.data.commitmentId) {
        const cm = p.commitments.find((x) => x.id === (a.data.commitmentId as number));
        if (cm) {
          cm.blocked = `${t.name} had no room in their pack for it`;
          cm.blockedAt = world.tick;
        }
      }
      return 'fail:they had no room to carry it';
    }
    a.cycle = moved;
    // being handed food or water wakes a sleeper
    if (t.activity && t.activity.kind === 'sleep') endActivity(world, t, 'interrupted', 'woken to be fed');
    const mode = (a.data.mode as string) ?? 'give';
    onGift(world, p, t, got, mode);
    bubble(world, p, D.saying(mode === 'care' ? D.CARE_LINES : D.OFFER_LINES, p.id, t.id, world.tick >> 5, { n: t.name, what: Object.keys(got)[0] }), 'say', 56);
    bubbleLater(world, t, D.saying(D.THANKS, t.id, p.id, world.tick >> 5, { n: p.name }), 14);
    if (mode === 'promise' && a.data.commitmentId) {
      const cm = p.commitments.find((x) => x.id === (a.data.commitmentId as number));
      if (cm && cm.item) cm.delivered = (cm.delivered ?? 0) + (got[cm.item] ?? 0);
      if (cm && (cm.delivered ?? 0) >= cm.amount) fulfillCommitment(world, p, cm.id);
    }
    return 'done';
  },
});

void estimatedAmount;
void NUTRITION;
void noteFailure;
void drive;

