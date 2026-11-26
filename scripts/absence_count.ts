// Read-only count of two situations in an ordinary world, to see how often they occur (docs: none; a one-off measurement).
//   A. absences between close kin of one household: partner and partner, parent and a child under 12 (Relation.kin). Sampled every
//      10 ticks; the last sample at which the two were within 10 tiles is kept, and each return after a gap is recorded.
//   B. departures: the provisioning plan of kind 'journey', exchange journeys, care journeys, household relocations. Read between
//      ticks (every tick, since reading is cheap), from the state and from world.events. Nothing is hooked into src/.
//   C. the living population at the start and the end.
// The script only reads the world after each stepWorld; it writes nothing to it and draws nothing from its random state.
//
//   npx vite-node scripts/absence_count.ts -- --save C:\dev\lw_saves\rules256\aspen-day48.save.json --days 25 --out out.json
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { AGE_CHILD, DAY } from '../src/sim/constants';
import { householdById, membersOf } from '../src/sim/households';
import { ageYears } from '../src/sim/people';
import { stepWorld } from '../src/sim/world';
import { hyp } from '../src/sim/util';
import type { Person, World, WorldEvent } from '../src/sim/types';

const { opt } = argsOf(process.argv);
const savePath = opt('save', opt('load', ''));
const days = Number(opt('days', '25'));
const out = opt('out', '');
const SAMPLE = Number(opt('interval', '10')); // ticks between samples for part A
const NEAR = 10; // tiles
const THRESHOLDS_DAYS = [0.25, 0.5, 1, 2];
if (!savePath) throw new Error('--save <path to a .save.json> is required');

const { w, startDay } = worldFromArgs((n, d) => (n === 'load' ? savePath : opt(n, d)));
const startTick = w.tick;
const endTick = startTick + Math.round(days * DAY);
const near = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => hyp(a.x - b.x, a.y - b.y) <= NEAR;
const alive = (): Person[] => w.persons.filter((p) => p.alive);
const popStart = alive().length;
const deadStart = w.deceased.length;
const personCountStart = w.persons.length;
let gitHeadStart = '';
try { gitHeadStart = execSync('git rev-parse --short HEAD', { cwd: process.cwd(), encoding: 'utf8' }).trim(); } catch { gitHeadStart = 'unknown'; }

// ---------------------------------------------------------------- part A: kin pairs
type PairType = 'partner' | 'parent_child';
interface Pair { type: PairType; lastNear: number; apart: boolean; censored: boolean; maxGap: number; returnsOver: number[] }
const pairs = new Map<string, Pair>();
const PAIR_TYPES: PairType[] = ['partner', 'parent_child'];
const acc = {
  samples: 0,
  pairSum: { partner: 0, parent_child: 0 } as Record<PairType, number>,
  returns: { partner: THRESHOLDS_DAYS.map(() => 0), parent_child: THRESHOLDS_DAYS.map(() => 0) } as Record<PairType, number[]>,
  returnsCensored: { partner: THRESHOLDS_DAYS.map(() => 0), parent_child: THRESHOLDS_DAYS.map(() => 0) } as Record<PairType, number[]>,
  distinct: { partner: THRESHOLDS_DAYS.map(() => new Set<string>()), parent_child: THRESHOLDS_DAYS.map(() => new Set<string>()) } as Record<PairType, Set<string>[]>,
  pairsEver: { partner: new Set<string>(), parent_child: new Set<string>() } as Record<PairType, Set<string>>,
  longestClosed: { partner: 0, parent_child: 0 } as Record<PairType, number>,
  longestOpen: { partner: 0, parent_child: 0 } as Record<PairType, number>,
  returnsAll: { partner: 0, parent_child: 0 } as Record<PairType, number>,
  gaps: { partner: [] as number[], parent_child: [] as number[] }, // every closed gap of at least the smallest threshold, in ticks
  endedApart: { partner: 0, parent_child: 0 } as Record<PairType, number>, // pairs that stopped existing (death, left the household, child came of age) while apart
};

function currentPairs(): Map<string, { type: PairType; a: Person; b: Person }> {
  const cur = new Map<string, { type: PairType; a: Person; b: Person }>();
  for (const hh of w.households) {
    const ms = membersOf(w, hh);
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const a = ms[i];
        const b = ms[j];
        const lo = Math.min(a.id, b.id);
        const hi = Math.max(a.id, b.id);
        if (a.relations[b.id]?.kin === 'partner' || b.relations[a.id]?.kin === 'partner') {
          cur.set(`partner:${lo}-${hi}`, { type: 'partner', a, b });
          continue;
        }
        for (const [c, par] of [[a, b], [b, a]] as [Person, Person][]) {
          if (ageYears(w, c) < AGE_CHILD && (c.relations[par.id]?.kin === 'parent' || par.relations[c.id]?.kin === 'child')) {
            cur.set(`parent_child:${lo}-${hi}`, { type: 'parent_child', a, b });
            break;
          }
        }
      }
    }
  }
  return cur;
}

function samplePairs(first: boolean): void {
  const t = w.tick;
  const cur = currentPairs();
  acc.samples++;
  for (const [key, c] of cur) {
    acc.pairSum[c.type]++;
    acc.pairsEver[c.type].add(key);
    let pr = pairs.get(key);
    if (!pr) {
      // a pair first seen now: the baseline is this tick. A pair already apart at the start of the run has an absence of unknown start, so its first return is left-censored.
      pr = { type: c.type, lastNear: t, apart: false, censored: first && !near(c.a, c.b), maxGap: 0, returnsOver: [] };
      pairs.set(key, pr);
    }
    if (near(c.a, c.b)) {
      if (pr.apart) {
        const gap = t - pr.lastNear;
        acc.returnsAll[pr.type]++;
        if (gap > acc.longestClosed[pr.type]) acc.longestClosed[pr.type] = gap;
        if (gap >= THRESHOLDS_DAYS[0] * DAY) acc.gaps[pr.type].push(gap);
        THRESHOLDS_DAYS.forEach((d, k) => {
          if (gap >= d * DAY) {
            acc.returns[pr!.type][k]++;
            if (pr!.censored) acc.returnsCensored[pr!.type][k]++;
            acc.distinct[pr!.type][k].add(key);
          }
        });
        pr.apart = false;
        pr.censored = false; // a return after the pair was seen together settles its history; later gaps are fully measured
      }
      pr.lastNear = t;
    } else pr.apart = true;
  }
  // pairs that no longer exist
  for (const [key, pr] of pairs) {
    if (cur.has(key)) continue;
    if (pr.apart) {
      acc.endedApart[pr.type]++;
      const open = t - pr.lastNear;
      if (open > acc.longestOpen[pr.type]) acc.longestOpen[pr.type] = open;
    }
    pairs.delete(key);
  }
}

// ---------------------------------------------------------------- part B: departures
interface Start { kind: string; tick: number; person: number; hh: number; others: number; othersNear: number; detail?: string; stayers?: number; stayersNear?: number; ids?: number }
const starts: Start[] = [];
const seenJourneyPlan = new Set<number>();
const seenExchange = new Set<number>();
const seenCare = new Set<string>();
const seenRelocationRecord = new Set<number>();
const relocationRecords: { id: number; tick: number; phase: string; organiser: number }[] = [];
const relocationEvents: { tick: number; kind: string; reloc: boolean; text: string; othersNear?: number; others?: number; stayers?: number; stayersNear?: number }[] = [];
let lastEventId = w.events.length ? w.events[w.events.length - 1].id : -1;

// seed the "already there" sets, so only what starts during the run is counted
for (const p of w.persons) {
  for (const i of p.intentions) if (i.kind === 'journey') seenJourneyPlan.add(i.id);
  for (const j of p.exchangeJourneys ?? []) seenExchange.add(j.id);
  if (p.careJourney) seenCare.add(`${p.id}:${p.careJourney.since}:${p.careJourney.to}`);
}
for (const hh of w.households) for (const r of hh.relocations ?? []) seenRelocationRecord.add(r.id);

function company(p: Person): { others: number; near: number } {
  const hh = householdById(w, p.hhId);
  const ms = membersOf(w, hh).filter((m) => m.id !== p.id);
  return { others: ms.length, near: ms.filter((m) => near(m, p)).length };
}

const RELOC_PATTERNS: [string, (t: string) => boolean][] = [
  ['set out', (t) => t.includes('set out')],
  ['arrived', (t) => t.includes('arrived')],
  ['turned back', (t) => t.includes('turned back')],
  ['is back at the old home', (t) => t.includes('is back at the old home')],
];
// the texts relocation.ts writes (and nothing else writes): the others that merely contain the words are counted apart
const isRelocationText = (t: string): boolean =>
  /household set out carrying their own provisions|set out with \d+ of the household, carrying their own provisions|household arrived; shelter still needs|household found no usable water and fresh food at the destination and turned back to the old home|household is back at the old home after the journey came to nothing/.test(t);

function scanStarts(): void {
  for (const p of w.persons) {
    if (!p.alive) continue;
    for (const i of p.intentions) {
      if (i.kind !== 'journey' || seenJourneyPlan.has(i.id)) continue;
      seenJourneyPlan.add(i.id);
      const c = company(p);
      starts.push({ kind: 'journey_plan', tick: w.tick, person: p.id, hh: p.hhId, others: c.others, othersNear: c.near, detail: `${i.journey?.kind ?? ''}:${i.journey?.label ?? i.goal}` });
    }
    if (p.exchangeJourneys) {
      for (const j of p.exchangeJourneys) {
        if (seenExchange.has(j.id)) continue;
        seenExchange.add(j.id);
        const c = company(p);
        starts.push({ kind: 'exchange_journey', tick: j.started, person: p.id, hh: p.hhId, others: c.others, othersNear: c.near, detail: `${j.offer}->${j.item}` });
      }
    }
    const cj = p.careJourney;
    if (cj) {
      const key = `${p.id}:${cj.since}:${cj.to}`;
      if (!seenCare.has(key)) {
        seenCare.add(key);
        const c = company(p);
        starts.push({ kind: 'care_journey', tick: cj.since, person: p.id, hh: p.hhId, others: c.others, othersNear: c.near, detail: cj.item });
      }
    }
  }
  for (const hh of w.households) {
    for (const r of hh.relocations ?? []) {
      if (seenRelocationRecord.has(r.id)) continue;
      seenRelocationRecord.add(r.id);
      relocationRecords.push({ id: r.id, tick: r.started, phase: r.phase, organiser: r.organiserId });
    }
  }
  // new events since the last tick
  const evs = w.events;
  if (evs.length && evs[evs.length - 1].id > lastEventId) {
    const fresh: WorldEvent[] = [];
    for (let k = evs.length - 1; k >= 0 && evs[k].id > lastEventId; k--) fresh.push(evs[k]);
    fresh.reverse();
    lastEventId = evs[evs.length - 1].id;
    for (const ev of fresh) {
      for (const [name, test] of RELOC_PATTERNS) {
        if (!test(ev.text)) continue;
        const rec: (typeof relocationEvents)[number] = { tick: ev.tick, kind: name, reloc: isRelocationText(ev.text), text: ev.text.slice(0, 160) };
        if (name === 'set out' && rec.reloc) {
          const first = ev.ids.map((id) => w.byId.get(id)).find((e): e is Person => !!e && e.ent === 'person');
          const hh = first ? householdById(w, first.hhId) : undefined;
          const r = hh?.relocations?.find((q) => q.phase === 'travelling') ?? hh?.relocations?.[hh.relocations.length - 1];
          const org = r ? w.byId.get(r.organiserId) : first;
          if (org && org.ent === 'person') {
            const c = company(org);
            rec.others = c.others;
            rec.othersNear = c.near;
            const trav = new Set(ev.ids);
            const stay = membersOf(w, householdById(w, org.hhId)).filter((m) => !trav.has(m.id));
            rec.stayers = stay.length;
            rec.stayersNear = stay.filter((m) => near(m, org)).length;
            starts.push({ kind: 'relocation_set_out', tick: ev.tick, person: org.id, hh: org.hhId, others: c.others, othersNear: c.near, stayers: rec.stayers, stayersNear: rec.stayersNear, ids: ev.ids.length });
          }
        }
        relocationEvents.push(rec);
      }
    }
  }
}

// ---------------------------------------------------------------- run
const t0 = Date.now();
const secs = (): number => Math.round((Date.now() - t0) / 100) / 10;
const log = (s: string): void => { console.error(`[${secs()}s] ${s}`); };
samplePairs(true);
const dayLog: { day: number; alive: number; seconds: number }[] = [];

function summary(done: boolean): unknown {
  // open gaps at this moment (pairs apart now): reported as the longest including open ones
  const longestOpenNow: Record<PairType, number> = { partner: acc.longestOpen.partner, parent_child: acc.longestOpen.parent_child };
  const openCount: Record<PairType, number> = { partner: 0, parent_child: 0 };
  for (const pr of pairs.values()) if (pr.apart) { openCount[pr.type]++; longestOpenNow[pr.type] = Math.max(longestOpenNow[pr.type], w.tick - pr.lastNear); }
  const byKind: Record<string, Start[]> = {};
  for (const s of starts) (byKind[s.kind] ??= []).push(s);
  const dep = (kind: string): unknown => {
    const l = byKind[kind] ?? [];
    return { starts: l.length, withHouseholdMemberNear: l.filter((s) => s.othersNear > 0).length, withNoOtherMemberAlive: l.filter((s) => s.others === 0).length, withOthersAliveButNoneNear: l.filter((s) => s.others > 0 && s.othersNear === 0).length };
  };
  const setOut = byKind['relocation_set_out'] ?? [];
  return {
    save: savePath,
    seed: w.settings.seed,
    rulesVersion: w.settings.rulesVersion,
    arrivals: w.settings.immigration,
    startDay,
    daysAsked: days,
    daysRun: Math.round(((w.tick - startTick) / DAY) * 100) / 100,
    done,
    sampleTicks: SAMPLE,
    departureScanEveryTick: true,
    nearTiles: NEAR,
    gitHeadAtStart: gitHeadStart,
    seconds: secs(),
    population: { start: popStart, end: alive().length, deadAtStartInSave: deadStart, diedDuringRun: w.deceased.length - deadStart, personsAtStart: personCountStart, personsNow: w.persons.length },
    A: {
      samples: acc.samples,
      thresholdsDays: THRESHOLDS_DAYS,
      byType: Object.fromEntries(PAIR_TYPES.map((t) => [t, {
        avgPairs: acc.pairSum[t] / Math.max(1, acc.samples),
        distinctPairsSeen: acc.pairsEver[t].size,
        returnsAnyGap: acc.returnsAll[t],
        returnsAtLeast: Object.fromEntries(THRESHOLDS_DAYS.map((d, k) => [String(d), acc.returns[t][k]])),
        ofWhichLeftCensored: Object.fromEntries(THRESHOLDS_DAYS.map((d, k) => [String(d), acc.returnsCensored[t][k]])),
        distinctPairsWithReturnAtLeast: Object.fromEntries(THRESHOLDS_DAYS.map((d, k) => [String(d), acc.distinct[t][k].size])),
        longestClosedGapDays: acc.longestClosed[t] / DAY,
        longestGapIncludingOpenDays: Math.max(acc.longestClosed[t], longestOpenNow[t]) / DAY,
        pairsApartAtEnd: openCount[t],
        pairsEndedWhileApart: acc.endedApart[t],
        gapsOverQuarterDayTicks: acc.gaps[t],
      }])),
    },
    B: {
      journey_plan: dep('journey_plan'),
      exchange_journey: dep('exchange_journey'),
      care_journey: dep('care_journey'),
      relocation_set_out: { ...(dep('relocation_set_out') as object), withStayerNear: setOut.filter((s) => (s.stayersNear ?? 0) > 0).length, withStayers: setOut.filter((s) => (s.stayers ?? 0) > 0).length },
      relocationProposalsStarted: relocationRecords.length,
      relocationEventsRaw: Object.fromEntries(RELOC_PATTERNS.map(([n]) => [n, relocationEvents.filter((e) => e.kind === n).length])),
      relocationEventsRelocationText: Object.fromEntries(RELOC_PATTERNS.map(([n]) => [n, relocationEvents.filter((e) => e.kind === n && e.reloc).length])),
      relocationEvents,
      relocationRecords,
      starts,
    },
  };
}
const write = (done: boolean): void => { if (out) writeFileSync(out, JSON.stringify(summary(done))); };

log(`start day ${startDay} tick ${startTick}, ${popStart} alive, ${acc.pairSum.partner} partner pairs, ${acc.pairSum.parent_child} parent-child pairs, head ${gitHeadStart}`);
while (w.tick < endTick) {
  stepWorld(w);
  scanStarts();
  if (w.tick % SAMPLE === 0) samplePairs(false);
  if ((w.tick - startTick) % DAY === 0) {
    const d = (w.tick - startTick) / DAY;
    dayLog.push({ day: d, alive: alive().length, seconds: secs() });
    log(`day +${d}: alive ${alive().length}, starts ${starts.length}, returns>=0.25d ${acc.returns.partner[0] + acc.returns.parent_child[0]}`);
    write(false);
  }
}
write(true);
log(`done in ${secs()}s`);
