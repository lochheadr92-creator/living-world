import { rememberedDry, rememberedWaterCost } from './water_access';
import { nearestHub } from './settlements';
import * as D from './dialogue';
import { acceptsToldReport, emptyFoodShareable, isEmptyFood, isFoodKind, noteEmptyRejected, noteFoodAccepted, tellingSuppressed, tracksFoodDelivery, toldKey } from './empty_news';
import { currentFailure, estimatedAmount, learn } from './knowledge';
import { hearsayNewsCost } from './teller_confidence';
import { noteDisagreement } from './checked_accounts';
import { BELIEF_NOUN } from './labels';
import { isFacilityType } from './recipes';
import { addLog } from './events';
import { hashUnit } from './rng';
import type { Belief, BuildingType, Person, World } from './types';

import { hyp } from './util';

// ───────────────────────── information ─────────────────────────
const NEWS_WEIGHT: Partial<Record<Belief['kind'], number>> = {
  fruit_tree: 3,
  fish_spot: 3,
  wild_grain: 3,
  berry_bush: 2,
  rock: 2,
  tree: 1,
  building: 1.5,
  site: 2.2,
  water: 1,
  danger: 7,
  clay_pit: 3.2,
  ore_vein: 3.2,
  outcrop: 3,
  cart: 0.6,
};

/** What would this speaker tell this listener? Only things the speaker has seen or heard. */
export function pickNews(world: World, S: Person, L: Person, max = 2): Belief[] {
  const rel = S.relations[L.id];
  if ((rel?.affinity ?? 0) < -10) return [];
  const scored: { b: Belief; score: number }[] = [];
  for (const k in S.beliefs) {
    const b = S.beliefs[k as unknown as number];
    const wgt = NEWS_WEIGHT[b.kind];
    if (!wgt) continue;
    if (b.kind === 'building' && !(b.btype === 'storehouse' || (b.btype && isFacilityType(b.btype as BuildingType)))) continue;
    // a household's own building site is its business, but a workshop or hall going up is everybody's news
    if (b.kind === 'site' && b.hh !== S.hhId && !(b.btype && isFacilityType(b.btype as BuildingType))) continue;
    if (b.kind === 'cart' && b.hh !== S.hhId) continue;
    if (b.kind === 'danger' && (b.amount <= 0 || world.tick - b.seen > 900)) continue;
    if (b.kind === 'water') continue;
    const isFood = isFoodKind(b.kind);
    // rules 176: a fresh empty sight, including one only heard, uses the same 1,100-tick horizon. Before that, a personal failure.
    const shareableEmpty = emptyFoodShareable(world, b, currentFailure(world, S, b.id));
    if (isFood && b.amount <= 0 && !shareableEmpty) continue; // an old, stale 'empty' is not news
    if (b.kind === 'tree' && hashUnit(S.id, b.id, world.tick >> 7) > 0.08) continue;
    if (tellingSuppressed(world, S, L.id, b)) continue;
    const hub = nearestHub(world, b.x, b.y);
    const dCamp = hyp(b.x - hub.x, b.y - hub.y);
    const fresh = Math.max(0, 1 - (world.tick - b.learned) / 4000);
    // the speaker cannot see the listener's mind; far places are likelier to be news
    let score = wgt * (0.6 + fresh) + (dCamp > 12 ? 1.6 : -1) + hashUnit(S.id, b.id, world.tick >> 6) * 1.2;
    if (isFood && !shareableEmpty && estimatedAmount(world, b) < 2) score -= 2.5;
    if (shareableEmpty) score += 2.2;
    score -= hearsayNewsCost(world, S, b); // rules 154: slower to pass on a place from a teller they have caught out
    if (hyp(b.x - L.x, b.y - L.y) < 6) score -= 3; // they can see it for themselves
    if (score > 1.2) scored.push({ b, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.b);
}

/** The listener learns it as hearsay; returns true if it was actually new or fresher for them. */
export function tellBelief(world: World, S: Person, L: Person, b: Belief): boolean {
  // Rules 175 records an empty correction only when the listener's belief changes. A positive food report and every
  // other telling still mark the attempt first, so a wolf warning keeps the cooldown it had.
  if (!tracksFoodDelivery(world, b) || !isEmptyFood(b)) S.told[toldKey(L.id, b.id)] = world.tick;
  const old = L.beliefs[b.id];
  // rules 174: a strictly newer empty food sighting can correct a positive memory inside the ordinary 200-tick gap.
  // learn() would also refresh an equal-time snapshot and then return false, so a refused report is not passed to it.
  const isNew = !old || acceptsToldReport(world, b, old);
  if (!isNew) {
    noteEmptyRejected(world, S, L.id, b);
    return false;
  }
  if (old) noteDisagreement(world, S, L, old, b); // rules 107: a differing newer account of a place seen oneself is logged
  const copy: Belief = { ...b, src: 'told', from: S.id, learned: world.tick, origin: b.origin ?? S.id, hops: (b.hops ?? 0) + 1 };
  // (a field that is absent stays absent: a key set to undefined is dropped by a save, so the saved and the live record would differ)
  if (b.items) copy.items = { ...b.items };
  else delete copy.items;
  if (b.need) copy.need = { ...b.need };
  else delete copy.need;
  learn(L, copy);
  noteFoodAccepted(world, S, L.id, b);
  const noun = BELIEF_NOUN[b.kind];
  if (b.kind === 'danger') {
    L.needs.safety = Math.max(0, L.needs.safety - 8);
    addLog(world, L, 'danger', `${S.name} warned me about a wolf ${D.dangerWords(world, b)} of camp.`);
  } else addLog(world, L, 'info', `${S.name} told me about a ${noun} ${D.placeWords(world, b)}.`);
  return true;
}

export function answerInfo(world: World, B: Person, A: Person, infoKind: string): Belief | null {
  const kinds: Belief['kind'][] =
    infoKind === 'food' ? ['fruit_tree', 'fish_spot', 'wild_grain', 'berry_bush'] : infoKind === 'wood' ? ['tree'] : infoKind === 'stone' ? ['rock'] : infoKind === 'water' ? ['water'] : ['berry_bush'];
  let best: Belief | null = null;
  let bs = -1e9;
  for (const k in B.beliefs) {
    const b = B.beliefs[k as unknown as number];
    if (!kinds.includes(b.kind) || (b.kind === 'water' && rememberedDry(world,b))) continue;
    const est = estimatedAmount(world, b);
    if (b.kind !== 'water' && b.kind !== 'tree' && est < 1) continue;
    const score = -(b.kind === 'water' ? rememberedWaterCost(world,b) : 0) - hyp(b.x - A.x, b.y - A.y) * 0.4 + Math.min(est, 5) * 1.2 - (world.tick - b.seen) / 1500 + (b.kind === 'fish_spot' || b.kind === 'fruit_tree' ? 1 : 0);
    if (score > bs) {
      bs = score;
      best = b;
    }
  }
  return best;
}

