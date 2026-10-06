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
  /** of those, the ones that ran out of node budget (so "unreachable" may really mean "too far for the budget") */
  pathBudgetHit: number;
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
  generations: 0,
  optionsGenerated: 0,
  decisions: 0,
  reviews: 0,
  perceives: 0,
  perceiveStatic: 0,
  perceiveMobile: 0,
  perceiveFresh: 0,
});

/** `on` gates every increment, so the cost when off is one boolean test */
export const probe: ProbeCounters & { on: boolean } = { on: false, ...zero() };

export function probeReset(): void {
  Object.assign(probe, zero());
}

export function probeSnapshot(): ProbeCounters {
  const s = zero();
  for (const k of COUNTER_KEYS) s[k] = probe[k];
  return s;
}
