// Rules 260 (the social scenes stream, bundle A, part 2 of `docs/SOCIAL_SCENES_PLAN.md`): welcoming newcomers. A resident walks over to
// people who have just arrived, speaks to them, tells them where water and food are, and hands over food if they have it to spare.
//
// What stood before: a group of travellers appears at a map edge as a new homeless household, walks to the fire on an 'explore' activity
// ("Arriving at the settlement") knowing only the fire and the nearest shore (lifecycle.ts immigrationTick), and nobody reacts to them.
//
// One part, `welcome` (switched in meeting.ts). From rules 260:
//
//   the record  When a group arrives its household records `arrived` (the tick) and, as residents welcome it, `welcomed` (who, at most
//               WELCOMERS_MAX). Both are cleared when the household has a home or KEEP ticks after it arrived, whichever is first
//               (welcomeTick). Nothing else is saved.
//   the cue     A grown resident (an adult or an elder, not of that household, whose own household is not itself newly arrived) who can see
//               a grown newcomer within WELCOME_REACH tiles and has never met them (no relation, or familiarity under 1) may go over, when
//               they are at ease (hunger and thirst drives 40 or less, no critical need, no danger believed about, not after dark), they
//               have not welcomed anybody in the last quarter of a day, and the newcomer's household has fewer than two welcomers, A not
//               among them. That the newcomer's household arrived within the last day only bounds the scene: what A reasons from is a
//               stranger in sight. The ask is worth 34, 8 for the sociable and 4 for the big-hearted, less the walk (options_social.ts
//               optWelcome). Nobody is sought out at their work, and nobody who is asleep or talking.
//   the welcome A's line is a welcome; the newcomer always answers. A tells them one water source and one food place that A holds as
//               beliefs and they do not (news.ts tellBelief, the hand-over every told place goes through, so the teller and the source are
//               recorded as for any told knowledge), and, if A has food to spare by the rule an offer uses (social.ts surplusOf), hands one
//               portion over through the ordinary giving path, so the ledger balances and those who see it hold a generous deed. Both come to
//               know each other a little (familiarity +3, trust +2), A grows fonder by 3 and the newcomer by 5, the newcomer is glad of it for
//               two days, each has a log line, A is not asked to welcome anybody else for a quarter of a day, and the newcomer's household
//               records A. What is told and given is settled when the talk ends as talks end: a talk cut short records nothing.
//   the feed    "A welcomed the newcomer B", or "the newcomers B and C" (those of B's household within 5 tiles of B, "little Z" for a child),
//               then " and told them where to find water" only if a water place was newly told, and " and gave them food" only if food
//               changed hands. A household's first welcome reads "A was the first to welcome ..." and is kept by the chronicle; a second is not.
//
// Nothing here reads anybody's true state: A acts on what A sees and holds. Newcomers nobody sees, or who arrive when nobody is about,
// are not welcomed and nothing is written; there is no fallback. Rich worlds at rules 260 and later only; rules 257 and earlier, authored
// worlds and a part switched off keep the old behaviour.
import { DAY } from './constants';
import { transfer } from './economy';
import { pickFood } from './economy';
import { addEvent, addLog } from './events';
import { householdById } from './households';
import { estimatedAmount } from './knowledge';
import { MEETING_FROM, hasWelcome } from './meeting';
import { think } from './mood';
import { observeOffer } from './transmission';
import { tellBelief } from './news';
import type { Ctx } from './optutil';
import { carryCap, stageOf } from './people';
import { adjustRel } from './relations';
import { runsRulesVersion } from './rulesversion';
import { onGift, surplusOf } from './social';
import { hasVisibleNeed, visibleHunger } from './visible_need';
import { rememberedDry, rememberedWaterCost } from './water_access';
import type { Belief, Conversation, ItemKind, Person, SeenEntity, World } from './types';
import { hyp } from './util';

// ── the cue ──
/** how near a newcomer must be seen */
export const WELCOME_REACH = 12;
/** the scene's bound: a household that arrived within this long ago */
export const WELCOME_WINDOW = DAY;
/** how long a household keeps the record of its arrival, unless it has a home sooner */
export const WELCOME_KEEP = 3 * DAY;
/** the most welcomers a household records, and the drives A may have (hunger and thirst) */
export const WELCOMERS_MAX = 2;
export const WELCOME_DRIVE_MAX = 40;
/** the ask's score: a base, per point of sociability, and for the big-hearted (generosity from GENEROUS_FROM, the line an offer already draws) */
export const WELCOME_BASE = 34;
export const WELCOME_SOCIABLE = 8;
export const WELCOME_GENEROUS = 4;
export const GENEROUS_FROM = 0.55;
/** after a welcome the welcomer is not asked to welcome again for this long */
export const WELCOME_WAIT = DAY / 4;

// ── what a completed welcome changes ──
export const WELCOME_FAMILIARITY = 3;
export const WELCOME_TRUST = 2;
export const WELCOMER_AFFINITY = 3;
export const NEWCOMER_AFFINITY = 5;
/** the newcomer's glad thought, and how long it lasts */
export const GLAD = 3;
export const GLAD_FOR = 2 * DAY;
/** the household members of the one welcomed who count as present */
export const PRESENT_WITHIN = 5;

/** what A decided to tell and give when the newcomer answered; carried in the conversation until it ends */
export interface WelcomePlan {
  water?: number;
  food?: number;
  give?: ItemKind;
}

// ───────────────────────── the record ─────────────────────────
/** Clear what households keep of their arrival: once they have a home, or KEEP ticks after they came. */
export function welcomeTick(w: World): void {
  if (w.settings.dynamics !== 'rich' || !runsRulesVersion(w, MEETING_FROM)) return;
  for (const hh of w.households) {
    if (hh.arrived === undefined) continue;
    if (hh.homeId > 0 || w.tick - hh.arrived >= WELCOME_KEEP) {
      delete hh.arrived;
      delete hh.welcomed;
    }
  }
}

// ───────────────────────── the ask ─────────────────────────
/** Is the resident, as they are now, in a state to go and welcome somebody? Their own needs, cooldown and household only. */
export function mayWelcomeNow(ctx: Ctx): boolean {
  const { world: w, p } = ctx;
  if (!hasWelcome(w) || w.settings.scene !== 'natural') return false;
  if (ctx.stage !== 'adult' && ctx.stage !== 'elder') return false;
  if (ctx.drives.hunger > WELCOME_DRIVE_MAX || ctx.drives.thirst > WELCOME_DRIVE_MAX) return false;
  if (ctx.critical || ctx.night || ctx.dangers.length) return false;
  if ((p.cooldowns.welcome ?? 0) > w.tick) return false;
  // newly arrived themselves: not yet the one to welcome anybody
  return householdById(w, p.hhId)?.arrived === undefined;
}

/**
 * May this resident go and welcome this person, seen `d` tiles away? A grown stranger of another household that came within the day and has
 * fewer than two welcomers, A not among them. The newcomer's household record is what bounds the scene; A reasons from a stranger in sight.
 */
export function mayWelcome(ctx: Ctx, q: Person, s: SeenEntity, d: number): boolean {
  const { world: w, p } = ctx;
  if (d > WELCOME_REACH || s.asleep || q.hhId === p.hhId) return false;
  const st = stageOf(w, q);
  if (st === 'child' || st === 'youth') return false;
  if ((p.relations[q.id]?.familiarity ?? 0) >= 1) return false;
  const hh = householdById(w, q.hhId);
  if (!hh || hh.arrived === undefined || w.tick - hh.arrived > WELCOME_WINDOW) return false;
  const by = hh.welcomed ?? [];
  return by.length < WELCOMERS_MAX && !by.includes(p.id);
}

/** the extra the big-hearted bring to it (whatever trait the offer option reads: generosity) */
export const generousLean = (p: Person): boolean => p.traits.generosity > GENEROUS_FROM;

// ───────────────────────── the welcome ─────────────────────────
/** The best place of these kinds that A holds and B does not, for B (nearest to B, by the score an answer to a question about places uses). */
function placeToTell(w: World, A: Person, B: Person, kinds: Belief['kind'][]): Belief | null {
  let best: Belief | null = null;
  let bs = -1e9;
  for (const k in A.beliefs) {
    const b = A.beliefs[k as unknown as number];
    if (!kinds.includes(b.kind) || B.beliefs[b.id] || (b.kind === 'water' && rememberedDry(w, b))) continue;
    const est = estimatedAmount(w, b);
    if (b.kind !== 'water' && est < 1) continue;
    const score = -(b.kind === 'water' ? rememberedWaterCost(w, b) : 0) - hyp(b.x - B.x, b.y - B.y) * 0.4 + Math.min(est, 5) * 1.2 - (w.tick - b.seen) / 1500 + (b.kind === 'fish_spot' || b.kind === 'fruit_tree' ? 1 : 0);
    if (score > bs) {
      bs = score;
      best = b;
    }
  }
  return best;
}

const FOOD_PLACES: Belief['kind'][] = ['fruit_tree', 'fish_spot', 'wild_grain', 'berry_bush'];

/** What A would tell and give B now, from what A holds and carries: the first the newcomer's answer settles; it is carried out when the talk ends. */
export function planWelcome(w: World, A: Person, B: Person): { plan: WelcomePlan; water: Belief | null; food: Belief | null } {
  const water = placeToTell(w, A, B, ['water']);
  const food = placeToTell(w, A, B, FOOD_PLACES);
  const plan: WelcomePlan = {};
  if (water) plan.water = water.id;
  if (food) plan.food = food.id;
  // food to spare by the rule an offer uses, for how hungry they look (what the signs show, rules 166)
  const s = A.seen.find((x) => x.id === B.id);
  const hungerNow = s && hasVisibleNeed(w) ? visibleHunger(s) : s ? (s.hungry ? 30 : 60) : 60;
  const k = pickFood(A.inv, hungerNow, w) as ItemKind | null;
  if (k && surplusOf(w, A, k) >= 1) plan.give = k;
  return { plan, water, food };
}

/** "the newcomer B", "the newcomers B and C", "the newcomers B, C and little Z": B and those of their household within PRESENT_WITHIN tiles */
function newcomersPhrase(w: World, B: Person): { text: string; ids: number[] } {
  const hh = householdById(w, B.hhId);
  const present: Person[] = [B];
  for (const id of hh?.members ?? []) {
    const m = w.byId.get(id);
    if (id !== B.id && m && m.ent === 'person' && m.alive && hyp(m.x - B.x, m.y - B.y) <= PRESENT_WITHIN) present.push(m);
  }
  const names = present.map((m) => (stageOf(w, m) === 'child' ? `little ${m.name}` : m.name));
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return { text: `${names.length === 1 ? 'the newcomer' : 'the newcomers'} ${list}`, ids: present.map((m) => m.id) };
}

/**
 * The talk ended as talks end (social.ts finishConversation): carry out what was settled. Tell the places (a place the newcomer already holds is
 * not told), hand over one portion if there is one to spare, let them know each other, record the welcome, and write it.
 */
export function completeWelcome(w: World, c: Conversation, A: Person, B: Person): void {
  const hh = householdById(w, B.hhId);
  if (!hh) return;
  const plan = (c.data.welcome ?? {}) as WelcomePlan;
  let toldWater = false;
  for (const [what, id] of [['water', plan.water], ['food', plan.food]] as const) {
    const b = id === undefined ? undefined : A.beliefs[id];
    if (!b) continue;
    const told = observeOffer(w, 'news', A, B, b, () => tellBelief(w, A, B, b));
    if (told && what === 'water') toldWater = true;
  }
  let gave = false;
  if (plan.give && surplusOf(w, A, plan.give) >= 1) {
    const moved = transfer(w, A.inv, B.inv, carryCap(w, B), plan.give, 1, 'person:' + A.id, 'person:' + B.id, 'offered gift');
    if (moved > 0) {
      onGift(w, A, B, { [plan.give]: moved }, 'offer', true);
      gave = true;
    }
  }
  const { text: who, ids } = newcomersPhrase(w, B);
  const first = (hh.welcomed ?? []).length === 0;
  adjustRel(A, B.id, w.tick, { aff: WELCOMER_AFFINITY, trust: WELCOME_TRUST, fam: WELCOME_FAMILIARITY, note: `welcomed ${B.name}` });
  adjustRel(B, A.id, w.tick, { aff: NEWCOMER_AFFINITY, trust: WELCOME_TRUST, fam: WELCOME_FAMILIARITY, note: `${A.name} welcomed me` });
  think(w, B, 'welcomed', GLAD, GLAD_FOR, 'was welcomed');
  addLog(w, A, 'social', `Welcomed ${B.name}${toldWater ? ' and told them where to find water' : ''}${gave ? ' and gave them food' : ''}.`);
  addLog(w, B, 'social', `${A.name} welcomed me${toldWater ? ' and told me where to find water' : ''}${gave ? ' and gave me food' : ''}.`);
  const by = (hh.welcomed ??= []);
  if (by.length < WELCOMERS_MAX && !by.includes(A.id)) by.push(A.id);
  A.cooldowns.welcome = w.tick + WELCOME_WAIT;
  addEvent(w, 'social', `${A.name} ${first ? 'was the first to welcome' : 'welcomed'} ${who}${toldWater ? ' and told them where to find water' : ''}${gave ? ' and gave them food' : ''}.`, [A.id, ...ids], B.x, B.y);
}

// ───────────────────────── saved state ─────────────────────────
/** What a save may hold of this (rules 260, rich only); anything else is refused on loading. */
export function validateWelcome(w: World): void {
  const allowed = w.settings.dynamics === 'rich' && runsRulesVersion(w, MEETING_FROM);
  for (const hh of w.households) {
    if (hh.arrived === undefined && hh.welcomed === undefined) continue;
    if (!allowed || !Number.isSafeInteger(hh.arrived) || hh.arrived! < 0 || hh.arrived! > w.tick || w.tick - hh.arrived! > WELCOME_KEEP + 600) throw new Error('Invalid arrival record');
    const by = hh.welcomed;
    if (by !== undefined && (!Array.isArray(by) || by.length < 1 || by.length > WELCOMERS_MAX || by.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(by).size !== by.length)) throw new Error('Invalid welcomers');
  }
  for (const c of w.conversations) if (c.purpose === 'welcome' && !allowed) throw new Error('Invalid welcome conversation');
}
