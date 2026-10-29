// CUSTOMERS: SUPPLYING WHAT WAS ASKED FOR, AND WHAT CAME BACK (rules version 51, rich worlds only).
//
// Rules 43 gave a person a bounded memory of being asked for materials (local_demand.ts), and a trade can be taken up because
// "2 people asked me for planks". What was missing was everything after that: the demand was heard and then nothing connected
// the planks that person later made to the people who had asked. The ask was a one-off request that someone else may have
// answered, or that lapsed; the maker's surplus sat in the pack or went to a site; and no return ever came back to tell the
// maker whether the trade was worth keeping. This module owns that loop and nothing else:
//
//   * CUSTOMER LEADS. When a person is asked for a material and has none to spare at that moment (the ordinary evaluation
//     declines with no_item, making or committed, or with own_need while holding the thing with none of it spare: they would
//     have supplied, they could not), the asker is remembered as a customer for that material for CUSTOMER_WINDOW. A refusal by
//     choice (unwilling, disliked, own need with goods to spare) is not a lead: it was not unmet demand, it was demand turned
//     away. The lead holds the request, so what was asked for is never guessed.
//   * SUPPLY. While a lead is live and the person now holds a spare unit of that material, they may take it to the asker: a
//     swap through the existing barter conversation when the asker is seen carrying something the supplier lacks and values
//     more, otherwise a gift through the existing offer conversation, which leaves the ordinary favour debt. Both move goods by
//     the ordinary transfer that records every unit; nothing is created, reserved or teleported. An asker out of sight but
//     remembered is gone to (the rules-45 seek visit), and the supply is proposed again on arrival if they are there.
//   * RETURNS. A supplied lead records what came back: the swap goods, or "a favour owed". The record is the supplier's own
//     and is read by the trade review (trade.ts): a trade whose customers were supplied in the window is held a little more
//     firmly (SERVED_BONUS), and a trade taken up because people asked, whose leads then all lapsed unsupplied, is reviewed
//     again rather than kept on a demand that went nowhere. A second lead from a person supplied before is a repeat customer
//     and is worth a little more.
//   * The original request is closed honestly when the supply reaches it: delivered is what moved, and the note says it came
//     later. A request already answered by someone else is left as it was; the goods still change hands, as a gift or swap.
//
// Nothing here changes who may ask, the barter valuation, the offer, the favour debt, the trade's other triggers, or any reserve.
// Below rules 51, and with the lab switch off, no lead is ever written and every option stays as it was.
import type { ItemKind, Items, Person, Request, SkillKey, World } from './types';
import type { Ctx } from './optutil';
import { Scorer, addBlocked, pen, whereIs } from './optutil';
import { DAY } from './constants';
import { isRich } from './mood';
import { runsRulesVersion } from './rulesversion';
import { addLog } from './events';
import { demandSkill } from './local_demand';
import { isDependent } from './people';

/** The barter and request authorities this module reads, bound by social.ts at load (no import cycle through the activity registry). */
export interface CustomerDeps {
  surplusOf: (world: World, p: Person, item: ItemKind) => number;
  valueOf: (world: World, p: Person, item: ItemKind) => number;
  settle: (world: World, r: Request, status: Request['status'], note: string) => void;
}
let deps: CustomerDeps | null = null;
export function setCustomerDeps(d: CustomerDeps): void {
  deps = d;
}
const surplusOf = (world: World, p: Person, item: ItemKind): number => deps!.surplusOf(world, p, item);
const valueOf = (world: World, p: Person, item: ItemKind): number => deps!.valueOf(world, p, item);
const settle = (world: World, r: Request, status: Request['status'], note: string): void => deps!.settle(world, r, status, note);

export interface Customer {
  /** the request that was heard and could not be met then */
  requestId: number;
  personId: number;
  name: string;
  item: ItemKind;
  amount: number;
  /** when it was heard */
  heard: number;
  /** when it was supplied, or 0 while the lead is live */
  supplied: number;
  units: number;
  /** what came back: the swap goods, or null for a gift that left a favour owed */
  back: ItemKind | null;
  backUnits: number;
  /** the same person had been supplied before */
  repeat: boolean;
  /** supplied by a haul to the customer's own household site rather than into their hands */
  siteId?: number;
}

/** how long an unmet ask is remembered as a customer lead */
export const CUSTOMER_WINDOW = DAY * 6;
/** how many leads and supplied records a person keeps */
export const CUSTOMER_LIMIT = 8;
/** what a supplied customer in the window is worth to keeping the trade that made the goods */
export const SERVED_BONUS = 4;
/** how much a repeat customer adds to the supply option */
export const REPEAT_BONUS = 3;

let enabled = true;
export const customersOn = (): boolean => enabled;
/** Lab switch `rich-no-customers`: no lead is written, no supply is offered, the trade review reads nothing; no effect below 51. */
export function setCustomers(on: boolean): void {
  enabled = on;
}
export const hasCustomers = (world: World): boolean => enabled && isRich(world) && runsRulesVersion(world, 51);

const LEAD_KINDS = new Set<Request['kind']>(['wood', 'stone', 'goods']);
const LEAD_REASONS = new Set(['no_item', 'making', 'committed']);

/** Pure: the live, unsupplied leads as of now. */
export function liveLeads(world: World, p: Person): Customer[] {
  if (!hasCustomers(world) || !p.customers) return [];
  return p.customers.filter((c) => !c.supplied && c.heard <= world.tick && world.tick - c.heard < CUSTOMER_WINDOW);
}

/** Drop leads that lapsed unsupplied and supplied records older than two windows; bounded, deterministic, logged once. */
export function pruneCustomers(world: World, p: Person): void {
  if (!hasCustomers(world) || !p.customers) return;
  const keep: Customer[] = [];
  for (const c of p.customers) {
    if (!c.supplied && world.tick - c.heard >= CUSTOMER_WINDOW) {
      addLog(world, p, 'social', `${c.name}'s ask for ${c.item} is too old now; I never had any to spare for them.`);
      // kept, marked lapsed by a negative supplied tick, so the trade review can count a demand that went nowhere
      keep.push({ ...c, supplied: -world.tick });
      continue;
    }
    if (c.supplied < 0 && world.tick + c.supplied >= CUSTOMER_WINDOW) continue;
    if (c.supplied > 0 && world.tick - c.supplied >= CUSTOMER_WINDOW * 2) continue;
    keep.push(c);
  }
  p.customers = keep.slice(-CUSTOMER_LIMIT);
  if (!p.customers.length) delete p.customers;
}

/**
 * Response boundary: B was asked by A for a material, in person, and the ordinary evaluation declined because B had none to
 * spare (not by choice). A becomes a customer for it. Called at the one place a request is answered (social.ts).
 */
export function noteCustomer(world: World, B: Person, A: Person, req: Request, reason: string): void {
  if (!hasCustomers(world) || !LEAD_KINDS.has(req.kind) || A.id === B.id) return;
  const item = req.item ?? (req.kind === 'wood' || req.kind === 'stone' ? req.kind : null);
  if (!item || !demandSkill(item) || req.amount <= 0) return;
  // "my own needs come first" is two answers: a refusal of what they could spare (no lead) and, when they hold the thing and
  // none of it is spare because their own site or reserve has it, demand they would meet once it is (a lead). The first
  // ordinary worlds showed the second was the commonest refusal of all (13 of 33), and no lead came of it.
  const ownNeedWithNoneSpare = reason === 'own_need' && (B.inv[item] ?? 0) > 0 && surplusOf(world, B, item) < 1;
  if (!LEAD_REASONS.has(reason) && !ownNeedWithNoneSpare) return;
  pruneCustomers(world, B);
  const list = (B.customers ??= []);
  if (list.some((c) => c.requestId === req.id)) return;
  const repeat = list.some((c) => c.personId === A.id && c.supplied > 0);
  list.push({ requestId: req.id, personId: A.id, name: A.name, item, amount: req.amount, heard: world.tick, supplied: 0, units: 0, back: null, backUnits: 0, repeat });
  while (list.length > CUSTOMER_LIMIT) list.shift();
  addLog(world, B, 'social', `${A.name} asked me for ${item} and I had none to spare; if I come by some, ${A.name} is a customer for it${repeat ? ' again' : ''}.`);
}

/**
 * The goods reached the customer (the offer or the barter conversation moved them, social.ts). Records the supply and what
 * came back on the supplier's lead, and closes the original request honestly if it is still open.
 */
export function customerSupplied(world: World, supplier: Person, customer: Person, got: Items, requestId: number, back: { item: ItemKind; n: number } | null): void {
  if (!hasCustomers(world)) return;
  const lead = supplier.customers?.find((c) => c.requestId === requestId && !c.supplied);
  if (!lead) return;
  const units = got[lead.item] ?? 0;
  if (units <= 0) return;
  lead.supplied = world.tick;
  lead.units = units;
  lead.back = back?.item ?? null;
  lead.backUnits = back?.n ?? 0;
  const req = world.requests.find((r) => r.id === requestId);
  if (req && req.status === 'pending') {
    req.delivered = (req.delivered ?? 0) + units;
    req.offered = units;
    const full = req.delivered >= req.amount;
    settle(world, req, full ? 'fulfilled' : 'partial', `${supplier.name} brought ${units} ${lead.item} later, as asked`);
  }
  const returned = back ? `they gave me ${back.n} ${back.item} for it` : 'they owe me a favour for it';
  addLog(world, supplier, 'social', `Brought ${customer.name} the ${units} ${lead.item} they had asked me for; ${returned}.`);
  addLog(world, customer, 'social', `${supplier.name} brought me the ${units} ${lead.item} I had asked them for.`);
}

/**
 * The goods reached the customer's own household site by the ordinary haul (act_resource.ts): the ask was for that site, so
 * this supplies it as surely as a hand-over does, and it leaves no favour and no swap: the record says where it went.
 */
export function customerSuppliedAtSite(world: World, supplier: Person, siteHh: number, siteId: number, moved: Partial<Items>): void {
  if (!hasCustomers(world) || !supplier.customers) return;
  for (const lead of supplier.customers) {
    if (lead.supplied) continue;
    const units = moved[lead.item] ?? 0;
    if (units <= 0) continue;
    const q = world.byId.get(lead.personId);
    if (!q || q.ent !== 'person' || q.hhId !== siteHh) continue;
    lead.supplied = world.tick;
    lead.units = units;
    lead.siteId = siteId;
    const req = world.requests.find((r) => r.id === lead.requestId);
    if (req && req.status === 'pending') {
      req.delivered = (req.delivered ?? 0) + units;
      req.offered = units;
      settle(world, req, req.delivered >= req.amount ? 'fulfilled' : 'partial', `${supplier.name} brought ${units} ${lead.item} to the site later, as asked`);
    }
    addLog(world, supplier, 'social', `Took ${units} ${lead.item} to ${lead.name}'s site, as they had asked me for; nothing came back for it.`);
  }
}

/** Pure: how many customers for this skill's goods were supplied in the window, and how many leads lapsed unsupplied. */
export function customerRecord(world: World, p: Person, skill: SkillKey): { served: number; lapsed: number; paid: number } {
  const r = { served: 0, lapsed: 0, paid: 0 };
  if (!hasCustomers(world) || !p.customers) return r;
  for (const c of p.customers) {
    if (demandSkill(c.item) !== skill) continue;
    if (c.supplied > 0 && world.tick - c.supplied < CUSTOMER_WINDOW) {
      r.served++;
      if (c.back) r.paid++;
    } else if (c.supplied < 0) r.lapsed++;
  }
  return r;
}

/** What a supplied customer is worth to keeping the trade (trade.ts): bounded, from the person's own record. */
export function servedBonus(world: World, p: Person, skill: SkillKey): number {
  return customerRecord(world, p, skill).served > 0 ? SERVED_BONUS : 0;
}

/** A demand-taken trade whose heard demand all lapsed unsupplied: the review looks again instead of keeping it on that demand. */
export function demandLapsed(world: World, p: Person, skill: SkillKey): boolean {
  const r = customerRecord(world, p, skill);
  return r.lapsed >= 2 && r.served === 0;
}

/**
 * The supply options: for each live lead whose goods the person now holds spare, a swap or a gift to the asker when they are in
 * sight, or the walk to where they were last known. Every option names the planner's existing conversations; none moves goods.
 */
export function supplyOptions(ctx: Ctx, mk: (c: { q: Person; d: number }, purpose: 'offer' | 'trade', conv: Record<string, unknown>, label: string, goal: string, sc: Scorer, keySuffix: string) => void, walk: (q: Person, item: ItemKind, loc: { x: number; y: number; how: string }, sc: Scorer) => void): void {
  const { world, p } = ctx;
  if (!hasCustomers(world) || ctx.critical || ctx.night || ctx.stage === 'child') return;
  pruneCustomers(world, p);
  for (const lead of liveLeads(world, p)) {
    const q = world.byId.get(lead.personId);
    if (!q || q.ent !== 'person' || !q.alive) continue;
    const spare = surplusOf(world, p, lead.item);
    if (spare < 1) continue;
    const n = Math.min(spare, lead.amount);
    const seen = ctx.seenPersons.find((s) => s.id === q.id);
    const sc = new Scorer().add(`${q.name} asked me for ${lead.item}`, 12 + 2 * p.traits.generosity);
    if (lead.repeat) sc.add('a regular customer', REPEAT_BONUS);
    if (p.trade && demandSkill(lead.item) === p.trade.key) sc.add('my trade', 2);
    if (seen && !seen.asleep && !seen.busyTalking) {
      const d = Math.hypot(seen.x - p.x, seen.y - p.y);
      if (d > 14) continue;
      sc.add('walking', -pen((d * 1.18) / Math.max(0.03, ctx.speed)) * 0.6);
      // a swap when they carry something I lack and value more than what I am bringing; a gift otherwise
      let want: ItemKind | null = null;
      let gain = 0;
      for (const k of seen.carrying) {
        if (k === lead.item || (p.inv[k] ?? 0) >= 2 || surplusOf(world, q, k) < 1) continue;
        const g = valueOf(world, p, k) - valueOf(world, p, lead.item);
        if (g > gain) {
          gain = g;
          want = k;
        }
      }
      // a swap is two for one at most, as at the market: the barter refuses what the other pack cannot carry on top of what it holds
      if (want && !isDependent(world, q)) mk({ q, d }, 'trade', { item: want, amount: 1, offer: lead.item, offerAmount: Math.min(2, n), customer: lead.requestId }, `Bring ${q.name} the ${lead.item} they asked for, for ${want}`, `to supply ${q.name} with ${lead.item}`, sc.add('they carry something I could use', Math.min(4, gain)), ':' + lead.item);
      else mk({ q, d }, 'offer', { items: { [lead.item]: n }, customer: lead.requestId }, `Bring ${q.name} the ${lead.item} they asked for`, `to supply ${q.name} with ${lead.item}`, sc, ':' + lead.item);
      continue;
    }
    if ((p.cooldowns['seek' + q.id] ?? 0) > world.tick) {
      addBlocked(ctx, 'visit', `Take ${lead.item} to ${q.name}`, q.id, 'looked for them lately and they were not there', 'trade');
      continue;
    }
    const loc = whereIs(ctx, q.id, 0);
    if (!loc) {
      addBlocked(ctx, 'visit', `Take ${lead.item} to ${q.name}`, q.id, 'does not know where they are', 'trade');
      continue;
    }
    const d = Math.hypot(loc.x - p.x, loc.y - p.y);
    if (d > 30) continue;
    // the walk is priced as the other social trips are (six ticks a tile), not as a gathering trip
    sc.add(`${q.name} would be there (${loc.how})`, 2).add('walking', -pen(d * 6));
    if (sc.total < 6) continue;
    walk(q, lead.item, loc, sc);
  }
}

/** The person card's lines: each lead or supply in the person's own words. */
export function describeCustomers(world: World, p: Person): string[] {
  if (!hasCustomers(world) || !p.customers) return [];
  const days = (t: number) => ((world.tick - t) / DAY).toFixed(1);
  return p.customers.slice(-5).map((c) => {
    if (c.supplied > 0) return `${c.name} asked me for ${c.item} ${days(c.heard)} days ago; I ${c.siteId ? 'took' : 'brought'} them ${c.units} ${days(c.supplied)} days ago${c.siteId ? ' to their site, and nothing came back for it' : c.back ? ` and got ${c.backUnits} ${c.back} back` : ' and they owe me a favour'}${c.repeat ? ' (a regular customer)' : ''}.`;
    if (c.supplied < 0) return `${c.name} asked me for ${c.item} ${days(c.heard)} days ago; I never had any to spare, and it is too old to count now.`;
    return `${c.name} asked me for ${c.amount} ${c.item} ${days(c.heard)} days ago; ${surplusOf(world, p, c.item) >= 1 ? 'I have some to spare now' : 'none to spare yet'}${c.repeat ? ' (a regular customer)' : ''}.`;
  });
}

export function validateCustomers(world: World): void {
  for (const p of world.persons) {
    if (!p.customers) continue;
    if (!runsRulesVersion(world, 51) || p.customers.length > CUSTOMER_LIMIT) throw new Error('Invalid customer records');
    for (const c of p.customers) if (!Number.isFinite(c.requestId) || !Number.isFinite(c.personId) || !Number.isFinite(c.heard) || !Number.isFinite(c.supplied) || !Number.isFinite(c.units) || !Number.isFinite(c.backUnits) || c.amount <= 0 || !demandSkill(c.item)) throw new Error('Invalid customer record');
  }
}
