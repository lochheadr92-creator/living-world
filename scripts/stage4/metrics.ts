// Stage 4 measures: the cohort rule and every rate, kept out of the runner so that they can be tested on their own.
//
// Nothing here touches the simulation: it reads a world and the records the diagnostics made (src/sim/transmission.ts) and
// returns numbers. Every convention is the one written down in docs/EMERGENCE.md, "Stage 4", in particular: a zero denominator
// is "not estimable" (null), never a zero rate; a camp with no living known members is not estimable; and the cohort map is
// frozen at day 0 and never re-assigns anybody, not on moving house, not on death.
import { DAY } from '../../src/sim/constants';
import { nearestHub } from '../../src/sim/settlements';
import { campOfHousehold, UNKNOWN as NEVER_CAPTURED } from '../../src/sim/cohortcapture';
import type { ContactRecord, OfferRecord } from '../../src/sim/transmission';
import type { Person, World } from '../../src/sim/types';

// ───────────────────────── the frozen cohort ─────────────────────────
/**
 * Every person alive at day 0 is assigned to the camp nearest their household's home, and never re-assigned: not when they move,
 * not when the home is destroyed, not when they die (the map is kept for looking up where a belief's observer came from).
 * Somebody with no home at the snapshot is `unknown` and stays unknown - there is no fallback to where they happen to stand.
 */
export const UNKNOWN = -1;

/** the camp a person's household was founded at, or the camp their household home stands nearest to when no founding camp
 *  was ever captured (a staged scene or a hand-built test world), or UNKNOWN when neither exists */
function cohortFromHome(world: World, p: Person, index: Map<string, number>): number {
  const hh = world.households.find((h) => h.id === p.hhId);
  if (!hh) return UNKNOWN;
  const founded = campOfHousehold(hh.id);
  if (founded !== NEVER_CAPTURED) return founded;
  const home = hh.homeId ? world.byId.get(hh.homeId) : undefined;
  if (!home || home.ent !== 'building') return UNKNOWN;
  const hub = nearestHub(world, home.x + home.w / 2, home.y + home.h / 2);
  return index.get(`${hub.x},${hub.y}`) ?? UNKNOWN;
}

const hubIndex = (world: World): Map<string, number> => {
  const index = new Map<string, number>();
  [world.camp, ...(world.extraSettlements ?? [])].forEach((h, i) => index.set(`${h.x},${h.y}`, i));
  return index;
};

export function freezeCohorts(world: World): Map<number, number> {
  const index = hubIndex(world);
  const cohort = new Map<number, number>();
  for (const p of world.persons) {
    if (!p.alive) continue;
    cohort.set(p.id, cohortFromHome(world, p, index));
  }
  return cohort;
}

/**
 * Everybody who appears after the day-0 freeze, assigned once and then frozen like everyone else. The plan gives two different
 * rules, and they are not interchangeable:
 *
 *  * A BIRTH takes **the mother's** cohort - not the father's, and not "whichever parent happens to have a known one". The
 *    mother is `parents[0]` by the birth convention (`lifecycle.ts`: `parents: father ? [mother.id, father.id] : [mother.id]`).
 *    If her cohort is unknown, the baby's is unknown too: there is no fall back to the household's home for a birth.
 *  * A LATER ENTRANT (an arrival, or anyone else who was not alive at day 0 and has no mother in the registry) is assigned by
 *    the same first-entry rule as day 0 - the camp their household's home stands nearest to - and frozen there. An entrant with
 *    no such home is the separate `unknown` stratum.
 *
 * Somebody already in the map is never looked at again, so no later move, birth or death can re-assign anybody.
 */
export function extendCohorts(world: World, cohort: Map<number, number>): void {
  const index = hubIndex(world);
  for (const p of world.persons) {
    if (cohort.has(p.id)) continue;
    const motherId = p.parents[0];
    // a birth is one whose mother the measurement already knows; her cohort is the baby's, unknown included
    if (motherId !== undefined && cohort.has(motherId)) {
      cohort.set(p.id, cohort.get(motherId) as number);
      continue;
    }
    cohort.set(p.id, cohortFromHome(world, p, index));
  }
}

// ───────────────────────── reading the records ─────────────────────────
export const pairKey = (a: number, b: number): string => `${Math.min(a, b)}|${Math.max(a, b)}`;

interface Split {
  total: number;
  cross: number;
  within: number;
  unknown: number;
}
const emptySplit = (): Split => ({ total: 0, cross: 0, within: 0, unknown: 0 });
/** the share of events in which both people's camps were known: what every cross-camp rate below is actually based on */
export const coverageOf = (s: Split): number | null => (s.total > 0 ? Math.round(((s.total - s.unknown) / s.total) * 10000) / 10000 : null);
function addSplit(s: Split, ca: number | undefined, cb: number | undefined): void {
  s.total++;
  if (ca === undefined || cb === undefined || ca === UNKNOWN || cb === UNKNOWN) s.unknown++;
  else if (ca === cb) s.within++;
  else s.cross++;
}
/** a rate whose denominator may be zero: then it is not estimable, and says so rather than reading 0 */
export const rate = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 10000) / 10000 : null);

export function contactsReport(contacts: ContactRecord[], cohort: Map<number, number>, windows: [number, number][]) {
  const byChannel: Record<string, Split> = {};
  const uniquePairs = new Set<string>();
  const uniqueCross = new Set<string>();
  const perWindow: Record<string, Record<string, Split>> = {};
  for (const [lo, hi] of windows) perWindow[`(${lo},${hi}]`] = {};
  for (const c of contacts) {
    const ca = cohort.get(c.a);
    const cb = cohort.get(c.b);
    addSplit((byChannel[c.channel] ??= emptySplit()), ca, cb);
    // the unique-pair count deduplicates across the nested channels (a conversation and the invitation inside it are one pair)
    const k = pairKey(c.a, c.b);
    uniquePairs.add(k);
    if (ca !== undefined && cb !== undefined && ca !== UNKNOWN && cb !== UNKNOWN && ca !== cb) uniqueCross.add(k);
    for (const [lo, hi] of windows) {
      if (c.tick > lo * DAY && c.tick <= hi * DAY) addSplit((perWindow[`(${lo},${hi}]`][c.channel] ??= emptySplit()), ca, cb);
    }
  }
  const all = emptySplit();
  for (const s of Object.values(byChannel)) {
    all.total += s.total;
    all.cross += s.cross;
    all.within += s.within;
    all.unknown += s.unknown;
  }
  const byChannelCoverage: Record<string, number | null> = {};
  for (const [ch, sp] of Object.entries(byChannel)) byChannelCoverage[ch] = coverageOf(sp);
  return {
    byChannel,
    byChannelCoverage,
    all,
    crossFractionOfKnown: rate(all.cross, all.cross + all.within),
    /** of all pair-events, the share in which both camps were known: the cross fraction above says nothing about the rest */
    knownCohortCoverage: coverageOf(all),
    uniquePairs: uniquePairs.size,
    uniqueCrossPairs: uniqueCross.size,
    perWindow,
  };
}

export function offersReport(offers: OfferRecord[], cohort: Map<number, number>) {
  const genuine = (o: OfferRecord): boolean => o.outcome === 'inserted' || o.outcome === 'refreshed';
  const byChannel: Record<string, { attempts: number; api: number; genuine: number; bypass: number; outcomes: Record<string, number> }> = {};
  const crossAttempts = emptySplit();
  let crossGenuine = 0;
  let knownGenuine = 0;
  let crossOfKnownGenuine = 0;
  for (const o of offers) {
    const c = (byChannel[o.channel] ??= { attempts: 0, api: 0, genuine: 0, bypass: 0, outcomes: {} });
    c.attempts++;
    if (o.api) c.api++;
    if (genuine(o)) c.genuine++;
    if (o.bypass) c.bypass++;
    c.outcomes[o.outcome] = (c.outcomes[o.outcome] ?? 0) + 1;
    const ca = cohort.get(o.from);
    const cb = cohort.get(o.to);
    addSplit(crossAttempts, ca, cb);
    const known = ca !== undefined && cb !== undefined && ca !== UNKNOWN && cb !== UNKNOWN;
    if (genuine(o)) {
      if (known) {
        knownGenuine++;
        if (ca !== cb) {
          crossOfKnownGenuine++;
          crossGenuine++;
        }
      }
    }
  }
  const attempts = offers.length;
  const genuineAll = offers.filter(genuine).length;
  const outcomes: Record<string, number> = {};
  for (const o of offers) outcomes[o.outcome] = (outcomes[o.outcome] ?? 0) + 1;
  return {
    attempts,
    outcomes,
    apiAccepted: offers.filter((o) => o.api).length,
    genuine: genuineAll,
    bypassWrites: offers.filter((o) => o.bypass).length,
    provenanceOnly: offers.filter((o) => o.outcome === 'provenance').length,
    acceptedRate: rate(genuineAll, attempts),
    byChannel,
    crossAttempts,
    /** the share of offers whose sender and recipient camps were both known: the two rates below rest on this much of the data */
    knownCohortCoverage: coverageOf(crossAttempts),
    knownAccepted: knownGenuine,
    // the plan's two immediate-transfer rates, both undefined when nothing qualified
    crossAcceptedOfCrossAttempts: rate(crossGenuine, crossAttempts.cross),
    crossAcceptedOfKnownAccepted: rate(crossOfKnownGenuine, knownGenuine),
  };
}

/** what each camp's living known members retain, and how much of it they hold in common */
export function knowledgeReport(world: World, cohort: Map<number, number>, camps: number) {
  const sets: (Set<string> | null)[] = [];
  const members: number[] = [];
  for (let c = 0; c < camps; c++) {
    const set = new Set<string>();
    let n = 0;
    for (const p of world.persons) {
      if (!p.alive || cohort.get(p.id) !== c) continue;
      n++;
      for (const key in p.beliefs) {
        const b = p.beliefs[key as unknown as number];
        set.add(`${b.kind}:${b.id}`);
      }
    }
    members.push(n);
    sets.push(n > 0 ? set : null);
  }
  const pairs: { a: number; b: number; inter: number; union: number; j: number | null; sizes: [number, number]; keys?: { intersection: string[]; onlyA: string[]; onlyB: string[] } }[] = [];
  for (let a = 0; a < camps; a++) {
    for (let b = a + 1; b < camps; b++) {
      const A = sets[a];
      const B = sets[b];
      if (!A || !B) {
        pairs.push({ a, b, inter: 0, union: 0, j: null, sizes: [A ? A.size : 0, B ? B.size : 0] });
        continue; // a camp with no living known members is not estimable
      }
      const intersection: string[] = [];
      const onlyA: string[] = [];
      for (const k of A) (B.has(k) ? intersection : onlyA).push(k);
      const onlyB = [...B].filter((k) => !A.has(k));
      const inter = intersection.length;
      const union = A.size + B.size - inter;
      // both empty: undefined. one empty: 0.
      const j = A.size === 0 && B.size === 0 ? null : union === 0 ? null : Math.round((inter / union) * 10000) / 10000;
      // the identities themselves are retained, not only the counts: a later reading can ask WHICH knowledge two camps share
      pairs.push({ a, b, inter, union, j, sizes: [A.size, B.size], keys: { intersection, onlyA, onlyB } });
    }
  }
  const valid = pairs.filter((p) => p.j !== null);
  // retained told beliefs: where they came from, and how far
  let told = 0;
  let foreign = 0;
  let bothKnown = 0;
  let unknownOrigin = 0;
  let hopsSum = 0;
  let hopsN = 0;
  let hopsMax = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    const holder = cohort.get(p.id);
    for (const key in p.beliefs) {
      const b = p.beliefs[key as unknown as number];
      if (b.src !== 'told') continue;
      told++;
      const oc = b.origin === undefined ? undefined : cohort.get(b.origin);
      if (oc === undefined || oc === UNKNOWN || holder === undefined || holder === UNKNOWN) unknownOrigin++;
      else {
        bothKnown++;
        if (oc !== holder) foreign++;
      }
      if (b.hops !== undefined && Number.isFinite(b.hops)) {
        hopsSum += b.hops;
        hopsN++;
        if (b.hops > hopsMax) hopsMax = b.hops;
      }
    }
  }
  let living = 0;
  let livingKnown = 0;
  for (const p of world.persons) {
    if (!p.alive) continue;
    living++;
    const c = cohort.get(p.id);
    if (c !== undefined && c !== UNKNOWN) livingKnown++;
  }
  return {
    /** how much of the living population the camp measures could see at all */
    coverage: { living, livingKnown, share: living > 0 ? Math.round((livingKnown / living) * 10000) / 10000 : null },
    camps: sets.map((s, i) => ({ camp: i, livingKnownMembers: members[i], retained: s ? s.size : null })),
    pairs,
    meanJaccardOverValidPairs: valid.length ? Math.round((valid.reduce((n, p) => n + (p.j as number), 0) / valid.length) * 10000) / 10000 : null,
    validPairs: valid.length,
    totalPairs: pairs.length,
    retainedTold: told,
    foreignOriginOfKnown: rate(foreign, bothKnown),
    foreignOriginCount: foreign,
    bothCohortsKnown: bothKnown,
    unknownOriginOrCohort: unknownOrigin,
    hops: { mean: hopsN ? Math.round((hopsSum / hopsN) * 1000) / 1000 : null, max: hopsN ? hopsMax : null, entries: hopsN, missing: told - hopsN },
  };
}

