// The numbers that decide how big a settlement is allowed to get (and what a failed trip may cost), gathered in one place.
//
// The ordinary world was tuned for about 28 founders and a settlement of at most a few dozen. Several limits are written in terms of
// that: immigration stops at 54 people, conception above 64, only four building sites may be open at once, and there is exactly one
// timber yard, kiln, smithy, bakery, granary, hall and storehouse in the whole world. They are sensible for a village and wrong for a
// region, so each is now a rule that a world can scale.
//
// * ORDINARY_RULES are the original values, to the digit. A world without `settings.ruleSet` uses them, so the ordinary world,
//   saves made before this existed, and every staged scene behave exactly as they always did (tests/golden.test.ts holds that).
// * scaledRules(...) express the same limits as ratios of how many people the world was founded with, and make the two "one of each"
//   and "so many open sites" rules local: they count what is within SETTLEMENT_RADIUS tiles instead of everything in the world.
//   A scaled world with 28 founders has the ordinary limits except for that locality.
import type { RuleSet, World } from './types';

import { hyp } from './util';
/** the founding population the ordinary limits were tuned for; every scaled limit is a ratio of this */
export const ORDINARY_FOUNDERS = 28;

/** how far apart two workplaces of one kind, or two groups of open building sites, must be to count as different settlements */
export const SETTLEMENT_RADIUS = 40;

export interface Rules {
  /** arrivals stop once this many people are alive */
  immigrationCap: number;
  /** conceptions stop once more than this many people are alive */
  conceptionCap: number;
  /** a family arrives only while population + 3 is at most this, a couple while population + 2 is */
  arrivalGroupCap: number;
  /** homes, fires and storehouses that may be marked out at once */
  maxBasicSites: number;
  /** open sites of any kind at which a household stops starting a home */
  maxOpenSites: number;
  /** workshop, hall and granary projects (and house rebuilds, counted apart) that may be under way at once … */
  projectsBase: number;
  /** … and the number once the population has reached `projectsRaisedAt` */
  projectsRaised: number;
  projectsRaisedAt: number;
  /** a workplace of one kind rules out another within this many tiles; Infinity means anywhere in the world */
  facilityRadius: number;
  /** open sites are counted within this many tiles of where a new one would go; Infinity means the whole world */
  siteRadius: number;
  /**
   * How a failed trip is paid for. A search that finds no way floods everything it can reach before it gives up, which on a large map is
   * thousands of tiles each time (docs/SCALING.md), so a world that is large can ask not to repeat one:
   * ticks a wolf whose search for a goal found nothing waits before searching for that goal again (0: it searches every tick) …
   */
  wolfRetryAfterFail: number;
  /** … and ticks before a person picks again an option that failed because there was no way to get there (an option that failed otherwise: always 80) */
  unreachableCooldown: number;
  /** at least this many ticks between one group of travellers arriving and the next, anywhere in the world (immigrationTick checks every 400) */
  arrivalSpacing: number;
}

export const ORDINARY_RULES: Readonly<Rules> = Object.freeze({
  immigrationCap: 54,
  conceptionCap: 64,
  arrivalGroupCap: 56,
  maxBasicSites: 4,
  maxOpenSites: 4,
  projectsBase: 2,
  projectsRaised: 3,
  projectsRaisedAt: 55,
  facilityRadius: Infinity,
  siteRadius: Infinity,
  wolfRetryAfterFail: 0,
  unreachableCooldown: 80,
  arrivalSpacing: 6000,
});

/**
 * The ordinary limits scaled to a world founded with `founders` people, of whom `settlementFounders` live together in one settlement
 * (all of them, unless the world is laid out as several). Population limits scale with the whole world; the limits on building and on
 * workplaces scale with a settlement, because that is what they were limiting. Nothing ever goes below its ordinary value.
 */
export function scaledRules(founders: number, settlementFounders: number = founders): Rules {
  const o = ORDINARY_RULES;
  const up = (base: number, of: number): number => Math.max(base, Math.round((base * of) / ORDINARY_FOUNDERS));
  return {
    immigrationCap: up(o.immigrationCap, founders),
    conceptionCap: up(o.conceptionCap, founders),
    arrivalGroupCap: up(o.arrivalGroupCap, founders),
    maxBasicSites: up(o.maxBasicSites, settlementFounders),
    maxOpenSites: up(o.maxOpenSites, settlementFounders),
    projectsBase: up(o.projectsBase, settlementFounders),
    projectsRaised: up(o.projectsRaised, settlementFounders),
    projectsRaisedAt: up(o.projectsRaisedAt, founders),
    facilityRadius: SETTLEMENT_RADIUS,
    siteRadius: SETTLEMENT_RADIUS,
    wolfRetryAfterFail: 30,
    unreachableCooldown: 600,
    // one settlement's worth of travellers per spacing: the village's 6,000 ticks for one camp of its size, shorter in proportion to
    // how many such camps the world has (never below the 400 ticks at which arrivals are considered)
    arrivalSpacing: Math.max(400, Math.round((o.arrivalSpacing * settlementFounders) / Math.max(founders, settlementFounders))),
  };
}

export function rulesFor(ruleSet: RuleSet | undefined, founders: number, settlementFounders?: number): Readonly<Rules> {
  return ruleSet === 'scaled' ? scaled(founders, settlementFounders ?? founders) : ORDINARY_RULES;
}

const cache = new Map<string, Rules>();
function scaled(founders: number, settlementFounders: number): Rules {
  const key = founders + ':' + settlementFounders;
  let r = cache.get(key);
  if (!r) {
    r = scaledRules(founders, settlementFounders);
    cache.set(key, r);
  }
  return r;
}

/** the rules this world runs under */
export function rulesOf(world: World): Readonly<Rules> {
  return rulesFor(world.settings.ruleSet, world.settings.population, world.settings.settlementFounders);
}

/** is (x, y) within `radius` of (ax, ay)? An infinite radius is always true and costs nothing. */
export function within(radius: number, ax: number, ay: number, x: number, y: number): boolean {
  return radius === Infinity || hyp(x - ax, y - ay) <= radius;
}
