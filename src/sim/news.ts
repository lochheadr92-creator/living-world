import { nearestHub } from './settlements';
import * as D from './dialogue';
import { estimatedAmount, learn } from './knowledge';
import { BELIEF_NOUN } from './labels';
import { isFacilityType } from './recipes';
import { addLog } from './events';
import { hashUnit } from './rng';
import type { Belief, BuildingType, Person, World } from './types';

const toldKey = (listener: number, beliefId: number): number => listener * 1_000_000 + beliefId;

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
    const isFood = b.kind === 'berry_bush' || b.kind === 'fruit_tree' || b.kind === 'wild_grain' || b.kind === 'fish_spot';
    const depletedNews = isFood && b.amount <= 0 && S.failures[b.id] !== undefined && world.tick - S.failures[b.id].tick < 1100 && b.seen >= S.failures[b.id].tick - 60;
    if (isFood && b.amount <= 0 && !depletedNews) continue; // an old, stale 'empty' is not news
    if (b.kind === 'tree' && hashUnit(S.id, b.id, world.tick >> 7) > 0.08) continue;
    if (S.told[toldKey(L.id, b.id)] !== undefined && world.tick - S.told[toldKey(L.id, b.id)] < 3500) continue;
    const hub = nearestHub(world, b.x, b.y);
    const dCamp = Math.hypot(b.x - hub.x, b.y - hub.y);
    const fresh = Math.max(0, 1 - (world.tick - b.learned) / 4000);
    // the speaker cannot see the listener's mind; far places are likelier to be news
    let score = wgt * (0.6 + fresh) + (dCamp > 12 ? 1.6 : -1) + hashUnit(S.id, b.id, world.tick >> 6) * 1.2;
    if (isFood && !depletedNews && estimatedAmount(world, b) < 2) score -= 2.5;
    if (depletedNews) score += 2.2;
    if (Math.hypot(b.x - L.x, b.y - L.y) < 6) score -= 3; // they can see it for themselves
    if (score > 1.2) scored.push({ b, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.b);
}

/** The listener learns it as hearsay; returns true if it was actually new or fresher for them. */
export function tellBelief(world: World, S: Person, L: Person, b: Belief): boolean {
  S.told[toldKey(L.id, b.id)] = world.tick;
  const old = L.beliefs[b.id];
  const isNew = !old || b.seen > old.seen + 200;
  if (!isNew) return false;
  const copy: Belief = { ...b, items: b.items ? { ...b.items } : undefined, need: b.need ? { ...b.need } : undefined, src: 'told', from: S.id, learned: world.tick, origin: b.origin ?? S.id, hops: (b.hops ?? 0) + 1 };
  learn(L, copy);
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
    if (!kinds.includes(b.kind)) continue;
    const est = estimatedAmount(world, b);
    if (b.kind !== 'water' && b.kind !== 'tree' && est < 1) continue;
    const score = -Math.hypot(b.x - A.x, b.y - A.y) * 0.4 + Math.min(est, 5) * 1.2 - (world.tick - b.seen) / 1500 + (b.kind === 'fish_spot' || b.kind === 'fruit_tree' ? 1 : 0);
    if (score > bs) {
      bs = score;
      best = b;
    }
  }
  return best;
}

