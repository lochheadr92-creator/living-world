// Work counters for scaling analysis.
//
// Plain integers that the simulation increments and never reads. They are not part of the world, the state hash or a save,
// they use no randomness and read no clock, so a run is identical with them on or off (tests/probe.test.ts holds that).
// Off by default; scripts/bench.ts turns them on. Timing is deliberately NOT done here: the simulation never reads a clock,
// so wall-time is measured around it by the runner (or with node --cpu-prof).

export interface ProbeCounters {
  /** findPath calls (including ones that return at once because the start already satisfies the goal) */
  pathCalls: number;
  /** tiles expanded by A* */
  pathExpanded: number;
  /** searches that returned null */
  pathNull: number;
  /** of those, the ones that stopped because they ran out of node budget with tiles still to try ("far", not "unreachable") */
  pathBudgetHit: number;
  /** of those, the ones that stopped because every tile reachable from the start had been tried: genuinely unreachable (pathNull = pathUnreachable + pathBudgetHit) */
  pathUnreachable: number;
  /** generateOptions calls (decisions plus periodic reviews plus inspector look-ups) */
  generations: number;
  /** options produced across all generateOptions calls */
  optionsGenerated: number;
  /** free-person decisions */
  decisions: number;
  /** reviews of an activity already under way */
  reviews: number;
  /** perceive calls */
  perceives: number;
  /** static entities (trees, buildings, sites, …) inside sensing range, summed over perceive calls */
  perceiveStatic: number;
  /** people and animals seen, summed over perceive calls */
  perceiveMobile: number;
  /** beliefs created or first learned during perceive */
  perceiveFresh: number;
}

export const COUNTER_KEYS: (keyof ProbeCounters)[] = [
  'pathCalls',
  'pathExpanded',
  'pathNull',
  'pathBudgetHit',
  'pathUnreachable',
  'generations',
  'optionsGenerated',
  'decisions',
  'reviews',
  'perceives',
  'perceiveStatic',
  'perceiveMobile',
  'perceiveFresh',
];

const zero = (): ProbeCounters => ({
  pathCalls: 0,
  pathExpanded: 0,
  pathNull: 0,
  pathBudgetHit: 0,
  pathUnreachable: 0,
  generations: 0,
  optionsGenerated: 0,
  decisions: 0,
  reviews: 0,
  perceives: 0,
  perceiveStatic: 0,
  perceiveMobile: 0,
  perceiveFresh: 0,
});

/**
 * `on` gates every increment, so the cost when off is one boolean test.
 * `verify` (only meaningful while `on`) makes a search that ran out of budget be repeated without one, its answer discarded, to learn
 * whether the goal was reachable after all. That costs real time and changes nothing the simulation can see.
 */
export const probe: ProbeCounters & { on: boolean; verify: boolean } = { on: false, verify: false, ...zero() };

export function probeReset(): void {
  Object.assign(probe, zero());
  for (const k of Object.keys(pathCells)) delete pathCells[k];
}

export function probeSnapshot(): ProbeCounters {
  const s = zero();
  for (const k of COUNTER_KEYS) s[k] = probe[k];
  return s;
}

// ── path searches by who asked and how far the target was ─────────────────────────────────────────────────────────────────
// A search ends in one of three ways: it found the goal ('ok'), it emptied its open set ('unreachable': nothing it can walk to
// satisfies the goal), or it hit its node budget with tiles still to try ('budget': the goal may well be reachable, only far).
// Counted per caller (an activity kind, or the name of another call site) and per straight-line distance from start to target.

export const DIST_BUCKETS = ['<20', '20-40', '40-80', '>80'] as const;
export type PathOutcome = 'ok' | 'unreachable' | 'budget' | 'budgetReachable' | 'budgetUnreachable';

export function distBucket(d: number): number {
  return d < 20 ? 0 : d < 40 ? 1 : d < 80 ? 2 : 3;
}

export interface PathCell {
  ok: number;
  unreachable: number;
  /** ran out of budget (all of the below, when `probe.verify` was off, none of them classified) */
  budget: number;
  expandedOk: number;
  expandedUnreachable: number;
  expandedBudget: number;
  /** of `budget`, checked with `probe.verify`: an unlimited search found the goal / also found nothing */
  budgetReachable: number;
  budgetUnreachable: number;
  /** tiles the unlimited search expanded to find the goal, summed over the budgetReachable ones */
  tilesNeeded: number;
}

const pathCells: Record<string, PathCell> = {};

/** record one finished search. Called only while `probe.on`. */
export function probePath(caller: string, dist: number, outcome: PathOutcome, expanded: number, needed = 0): void {
  const key = caller + '|' + distBucket(dist);
  const c = (pathCells[key] ??= { ok: 0, unreachable: 0, budget: 0, expandedOk: 0, expandedUnreachable: 0, expandedBudget: 0, budgetReachable: 0, budgetUnreachable: 0, tilesNeeded: 0 });
  if (outcome === 'budgetReachable' || outcome === 'budgetUnreachable') {
    c.budget++;
    c.expandedBudget += expanded;
    if (outcome === 'budgetReachable') {
      c.budgetReachable++;
      c.tilesNeeded += needed;
    } else c.budgetUnreachable++;
  } else if (outcome === 'ok') {
    c.ok++;
    c.expandedOk += expanded;
  } else if (outcome === 'unreachable') {
    c.unreachable++;
    c.expandedUnreachable += expanded;
  } else {
    c.budget++;
    c.expandedBudget += expanded;
  }
}

/** copy of the per-caller, per-distance cells, keyed "caller|bucket index" */
export function probePathCells(): Record<string, PathCell> {
  const out: Record<string, PathCell> = {};
  for (const k of Object.keys(pathCells)) out[k] = { ...pathCells[k] };
  return out;
}
