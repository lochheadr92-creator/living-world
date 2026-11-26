import { readFileSync, writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { DAY, SOURCE_ITEM } from '../src/sim/constants';
import { conservationReport, roomFor } from '../src/sim/economy';
import { makeCtx } from '../src/sim/optutil';
import { materialNeeds } from '../src/sim/options_work';
import { materialsHomeOption, spareMaterial } from '../src/sim/pack_materials';
import { spareSeed } from '../src/sim/seed_storage';
import { reservedFor } from '../src/sim/reserved_goods';
import { errandCarries } from '../src/sim/errand_load';
import { whileObserving } from '../src/sim/lifechanges';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { ItemKind, Items, SourceType } from '../src/sim/types';

interface Leg {
  person: number;
  actId: number;
  startTick: number;
  stage: string;
  leftCensored: boolean;
  outcome: string;
  kind: string;
  subKind: string;
  plannedUnits: number;
  walkingTicks: number;
  homeDistStart: number | null;
  packStart: { items: Items; cap: number };
  moved: { units: number } | null;
}

function purpose(trip: Leg): string {
  const match = /\| purpose=([^|]+) \| stype=/.exec(trip.subKind);
  if (!match) throw Error('Missing gather purpose in ' + trip.subKind);
  return match[1].trim();
}

function targetItem(trip: Leg): ItemKind {
  const source = trip.subKind.split('stype=')[1] as SourceType;
  const item = SOURCE_ITEM[source];
  if (!item) throw Error('Unknown gather source in ' + trip.subKind);
  return item;
}

function purposes(trips: Leg[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const trip of trips) {
    const key = purpose(trip);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const walking = (trips: Leg[]) => trips.reduce((n, t) => n + t.walkingTicks, 0);
const packChange = (trips: Leg[]) => trips.reduce((n, t) => n + (t.moved?.units ?? 0), 0);
const didJob = (t: Leg) => t.outcome === 'arrived_did_job';
function roomAfterUnloadingEverything(trip: Leg): number {
  const remaining = { ...trip.packStart.items, wood: 0, stone: 0, clay: 0, seeds: 0 };
  return roomFor(remaining, trip.packStart.cap, targetItem(trip));
}

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt);
const control = JSON.parse(readFileSync(opt('trips', ''), 'utf8'));
const initialHash = hashWorld(w);
if (!loaded || control.initialHash !== initialHash || control.rulesVersion !== 257 ||
    control.benchOff !== false || control.nudge !== 0 || !control.arrivals ||
    control.days !== 13 || !control.conservation.ok) throw Error('Control mismatch');

const measured = (control.trips as Leg[]).filter(t =>
  t.stage === '12_and_over' && !t.leftCensored && t.outcome !== 'censored');
const gathers = measured.filter(t => t.kind === 'gather');
const successes = gathers.filter(t => didJob(t) && (t.moved?.units ?? 0) > 0);
const small = successes.filter(t => t.moved!.units <= 2);
const constrained = small.filter(t => roomFor(t.packStart.items, t.packStart.cap, targetItem(t)) <= 2);
const literal = constrained.filter(t => t.plannedUnits > 2);
const candidate = constrained.filter(t => purpose(t) === 'stock' && t.homeDistStart !== null &&
  t.homeDistStart <= 2 && roomAfterUnloadingEverything(t) >= 3);
const deposits = measured.filter(t => t.kind === 'deposit');
const units = packChange(successes);
const baseline = {
  gathers: successes.length, units, unitsPerPositiveWalk: units / successes.length,
  gatherWalkingTicksPerUnit: walking(gathers) / units, small: small.length,
  constrained: constrained.length, purposes: purposes(constrained),
  literal: literal.length, literalPurposes: purposes(literal),
  literalRestoredIgnoringAllClaims: literal.filter(t => roomAfterUnloadingEverything(t) >= t.plannedUnits).length,
  candidateUpperBound: candidate.length, candidateWalkingTicks: walking(candidate),
  deposits: deposits.length, depositWalkingTicks: walking(deposits), depositUnits: packChange(deposits.filter(didJob)),
  completedWalkJobs: measured.filter(didJob).length, deaths: control.deaths, storeFood: control.endStoreFood,
  hungryWakingShare: control.day.hungryTime.hungryShareOfWaking
};

// A saved trip records the pack, but only a replay has this actor's current beliefs and obligations.
const stop = w.tick + DAY;
const sample = constrained.filter(t => t.startTick >= w.tick && t.startTick < stop);
const byTick = new Map<number, Leg[]>();
for (const trip of sample) {
  const departures = byTick.get(trip.startTick) ?? [];
  departures.push(trip);
  byTick.set(trip.startTick, departures);
}
const items: Record<string, { reserved: number; needed: number; spare: number; protected: number }> = {};
let observed = 0, depositOffered = 0, plans = 0, roomRestored = 0, roomRestoredWithAllClay = 0;
const twin = worldFromArgs(opt).w;
while (w.tick < stop) {
  for (const trip of byTick.get(w.tick) ?? []) {
    const p = w.byId.get(trip.person);
    if (p?.ent !== 'person' || p.activity?.id !== trip.actId) throw Error('Wrong departure at ' + w.tick);
    for (const key of Object.keys({ ...p.inv, ...trip.packStart.items }) as ItemKind[]) {
      if ((p.inv[key] ?? 0) !== (trip.packStart.items[key] ?? 0)) throw Error('Pack mismatch at ' + w.tick);
    }
    whileObserving(() => {
      const ctx = makeCtx(w, p, true, true);
      const needs = materialNeeds(ctx);
      materialsHomeOption(ctx);
      if (ctx.options.some(o => o.key.startsWith('pack_materials:'))) depositOffered++;
      const remaining = { ...p.inv };
      for (const [name, count] of Object.entries(p.inv)) {
        if (!count) continue;
        const k = name as ItemKind;
        const reserved = Math.min(count, errandCarries(w, p, k) ? count : reservedFor(w, p, k));
        let spare = 0, needed = 0;
        if (k === 'wood' || k === 'stone' || k === 'seeds') {
          spare = k === 'seeds' ? spareSeed(p, w) : spareMaterial(ctx, k, needs);
          needed = count - reserved - spare;
        }
        const totals = items[k] ??= { reserved: 0, needed: 0, spare: 0, protected: 0 };
        totals.reserved += reserved;
        totals.needed += needed;
        totals.spare += spare;
        totals.protected += count - reserved - needed - spare;
        remaining[k] = count - spare;
      }
      if (trip.plannedUnits > 2) {
        plans++;
        const item = targetItem(trip);
        if (roomFor(remaining, trip.packStart.cap, item) >= trip.plannedUnits) roomRestored++;
        // Deliberately optimistic sensitivity check, even committed clay is allowed here.
        if (roomFor({ ...remaining, clay: 0 }, trip.packStart.cap, item) >= trip.plannedUnits) roomRestoredWithAllClay++;
      }
      observed++;
    });
  }
  stepWorld(w);
  stepWorld(twin);
}
const endHash = hashWorld(w);
if (observed !== sample.length || endHash !== hashWorld(twin) || !conservationReport(w).ok)
  throw Error('Pack replay verification failed');
const sampleDay = { observed, depositOffered, literal: plans, roomRestored, roomRestoredWithAllClay,
  items, endHash, conservation: true, unwatchedTwinMatched: true };
writeFileSync(opt('out', ''), JSON.stringify({ loaded, initialHash, baseline, sampleDay }, null, 2) + '\n');
