import { WEIGHT } from './constants';
import { runsRulesVersion } from './rulesversion';
import type { Belief, Earmark, ItemKind, Person, World } from './types';

// RULES 257: A WORKSHOP'S GOODS COUNT ONLY FOR WHO MAY TAKE THEM. Design A of the Stage 2 trips bundle (the designs of 18 November 2026).
//
// Read in source and measured (review_evidence/trip-waste-20261118, rules 250): 29 to 40% of adult withdraws arrive and take nothing, and 94 to
// 95% of those find the stock there and are allowed none: 96, 98 and 65% of them because it is earmarked to another person, and in one start 35%
// because it lay at another household's timber yard, where a person comes in as a guest. Planning and the transfer disagree about whose the goods
// are. Planning (site_supply.ts benchStock, from rules 229) counts everything the person's snapshot of a workshop shows lying there, and that
// snapshot holds no earmarks. The transfer (facilities.ts withdrawAllowance and usableUnits) gives a person the units earmarked to them, and the
// workshop's free stock only if they own the place, it is communal, or their household did a fifth of the building. A guest at an open workplace
// (rules 207) has none of that.
//
// From 257, in rich worlds, one part, three small changes, all in what the planner counts:
//   record  a sight of a workshop also records its live earmarks at that moment (`held` on the snapshot: who, what, how many, until when)
//   count   benchStock takes the person, and what counts is the units earmarked to them in that record, plus the units not earmarked only
//           if their own standing opens the free stock (their household owns the place, it is communal, or it did a fifth of the building)
//   a belief with no record, taken before 257, is counted as it was, until the person sees the place again
// The transfer does not change. Nobody gains or loses a right to any stock. Telling others of a wasted walk is not done, and the household
// earmark rule (an earmark is a person's, not a household's) is left as it is.
//
// Rules 256 and earlier, authored worlds and a switch thrown keep the old count.

export const BENCH_ACCESS_FROM = 257;

let on = true;
/** Lab switch (never saved or hashed): `rich-no-bench-access` counts a workshop's stock as rules 256 does. */
export const benchAccessOn = (): boolean => on;
export function setBenchAccess(enabled: boolean): void { on = enabled; }
export const hasBenchAccess = (world: World): boolean => on && world.settings.dynamics === 'rich' && runsRulesVersion(world, BENCH_ACCESS_FROM);
/** whether this build may hold a `held` record at all: the rules, not the lab switch, say so (a save is judged by this) */
export const runsBenchRecord = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, BENCH_ACCESS_FROM);
/** Rules 266 (from the withdrawal branch, merged 27 November 2026): a sight of a workshop also records its builders' shares, and the free stock opens on the
 *  shares as this person last saw them. Rules 257 to 265 read the shares from the building itself and record none. The rules say so, not the lab switch. */
export const SEEN_BUILDERS_FROM = 266;
export const runsSeenBuilders = (world: World): boolean => world.settings.dynamics === 'rich' && runsRulesVersion(world, SEEN_BUILDERS_FROM);

/** One earmark as a sight records it. */
export interface HeldEarmark { owner: number; item: ItemKind; n: number; until: number }

/** The earmarks that are live at this tick, as a snapshot records them. */
export function heldAtSight(world: World, earmarks: readonly Earmark[]): HeldEarmark[] {
  return earmarks.filter((e) => e.until > world.tick && e.n > 0).map((e) => ({ owner: e.owner, item: e.item, n: e.n, until: e.until }));
}

/** Do this person's own standing and the workshop's builders open the workshop's free stock to them (owner, communal or builder)? */
export function opensFreeStock(world: World, p: Person, b: Belief): boolean {
  if (b.hh === 0 || b.hh === p.hhId) return true;
  // rules 266: the builders' shares count as this person last saw them; before it they are read from the building itself
  if (runsSeenBuilders(world)) return (b.ops?.seenBuilders?.[p.hhId] ?? 0) >= 0.2;
  const real = world.byId.get(b.id);
  return !!real && real.ent === 'building' && (real.ops?.builders[p.hhId] ?? 0) >= 0.2;
}

/**
 * How many of `counted` units of `item` lying at a workshop (as benchStock counted them) this person may take, going by the earmarks the
 * snapshot recorded that have not run out since: the units earmarked to them, and the rest only if the free stock is open to them.
 */
export function takeableAtBench(world: World, p: Person, b: Belief, item: ItemKind, counted: number): number {
  const held = b.ops?.held;
  if (!hasBenchAccess(world) || !held) return counted;
  let mine = 0;
  let others = 0;
  for (const e of held) {
    if (e.item !== item || e.until <= world.tick) continue;
    if (e.owner === p.id) mine += e.n;
    else others += e.n;
  }
  const free = Math.max(0, counted - mine - others);
  return Math.min(counted, mine + (opensFreeStock(world, p, b) ? free : 0));
}

/** A record that is not a list of whole earmarks, or that this version does not run, makes a save invalid. */
export function validateHeld(w: World): void {
  for (const p of w.persons) {
    for (const b of Object.values(p.beliefs)) {
      const held = b.ops?.held;
      const builders = b.ops?.seenBuilders;
      if (builders !== undefined && (!runsSeenBuilders(w) || !builders || typeof builders !== 'object' || Array.isArray(builders) || Object.entries(builders).some(([id, share]) => !/^\d+$/.test(id) || typeof share !== 'number' || !Number.isFinite(share) || share < 0))) throw new Error('Invalid seen builders');
      if (held === undefined) continue;
      if (!runsBenchRecord(w) || !Array.isArray(held)) throw new Error('Invalid held earmarks');
      for (const e of held) {
        if (!e || !Number.isInteger(e.owner) || !Number.isInteger(e.n) || e.n < 1 || !Number.isFinite(e.until) || typeof e.item !== 'string' || !Object.prototype.hasOwnProperty.call(WEIGHT, e.item)) throw new Error('Invalid held earmarks');
      }
    }
  }
}
