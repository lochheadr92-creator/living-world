import { readFileSync, writeFileSync } from 'node:fs';
import { DAY } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { JOBS } from '../src/sim/finish_job';
import { ageYears } from '../src/sim/people';
import type { ActivityKind } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { argsOf, worldFromArgs } from './world_args';
import { timeCategory } from './observers/time_budget';

const { opt } = argsOf(process.argv);
const { w, loaded } = worldFromArgs(opt);
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const control = read(opt('control', '')), reference = read(opt('reference', ''));
const initialHash = hashWorld(w);
if (!loaded || w.settings.rulesVersion !== 257 || control.days !== 13 || control.nudge !== 0 ||
    control.benchOff !== false || !control.arrivals || !control.conservation.ok ||
    initialHash !== control.initialHash || initialHash !== reference.initialHash) throw Error('Wrong control');

type Trip = { stage: string; outcome: string; endDetail: string; kind: ActivityKind; toKind: string; walkingTicks: number };
type Totals = Record<string, { count: number; ticks: number }>;
function add(totals: Totals, key: string, ticks: number) {
  const row = totals[key] ??= { count: 0, ticks: 0 };
  row.count++;
  row.ticks += ticks;
}
const reasons: Totals = {}, replacements: Totals = {};
let adultTicks13d = 0;
for (const t of control.trips as Trip[]) {
  if (t.stage !== '12_and_over') continue;
  adultTicks13d += t.walkingTicks;
  if (t.outcome !== 'switched_mid_walk' && t.outcome !== 'gave_up_before_arrival') continue;
  add(reasons, t.endDetail || '(no reason)', t.walkingTicks);
  add(replacements, [t.kind, t.toKind || '(no immediate replacement)', t.endDetail].join('|'), t.walkingTicks);
}

// Follow the observed path up to the actual review, including its last fraction of a tile.
type Walk = { act: number; kind: ActivityKind; target: number; sx: number; sy: number; x: number; y: number;
  tiles: number; ticks: number; censored: boolean };
const legs = new Map<number, Walk>();
const firstTick = w.tick, stop = firstTick + DAY;
let walkingTicks = 0, unmatched = 0, censoredTicks = 0, stationary = 0;
type Presence = 'present' | 'absent' | 'unkeyed';
const reviews: Totals = {}, switches: Totals = {};
const reviewed = new Map<number, { tick: number; act: number; presence: Presence }>();
type Event = { person: number; act: number; next: number; tick: number; kind: ActivityKind; nextKind: ActivityKind;
  job: boolean; presence: Presence; walked: number; ticks: number; startX: number; startY: number; x: number; y: number };
const pending = new Map<number, Event>();
const rejectedStarts: Totals = {};
const detours: (Event & { targetX: number; targetY: number; remaining: number; direct: number; extraTicks: number })[] = [];
w.hooks = {
  onTravelReview(p, a, presence) {
    if (ageYears(w, p) < 12) return;
    reviewed.set(p.id, { tick: w.tick, act: a.id, presence });
    add(reviews, [a.kind, presence].join('|'), 0);
  },
  onTravelReviewSwitch(p, a, next, reason) {
    if (ageYears(w, p) < 12) return;
    const review = reviewed.get(p.id);
    if (review?.tick !== w.tick || review.act !== a.id) throw Error('Decision without review');
    add(switches, [a.kind, next.kind, reason, review.presence].join('|'), 0);
    if (reason !== 'something better came up') return;
    const leg = legs.get(p.id);
    if (!leg || leg.act !== a.id || leg.kind !== a.kind || leg.target !== a.targetId) { unmatched++; return; }
    if (leg.censored) { censoredTicks += leg.ticks; return; }
    const walked = leg.tiles + Math.hypot(p.x - leg.x, p.y - leg.y);
    if (!walked) { stationary++; return; }
    pending.set(p.id, { person: p.id, act: a.id, next: next.id, tick: w.tick, kind: a.kind, nextKind: next.kind,
      job: JOBS.has(a.kind), presence: review.presence, walked, ticks: leg.ticks,
      startX: leg.sx, startY: leg.sy, x: p.x, y: p.y });
  },
  onActivityEnd(p, a, outcome, detail) {
    const e = pending.get(p.id);
    if (e?.next !== a.id) return;
    // A failed layout claim ends the replacement before onActivityStart is emitted.
    add(rejectedStarts, [a.kind, outcome, detail].join('|'), e.ticks);
    pending.delete(p.id);
  },
  onActivityStart(p, next) {
    const e = pending.get(p.id);
    if (!e) return;
    if (next.id !== e.next || w.tick !== e.tick) throw Error('Replacement mismatch');
    pending.delete(p.id);
    const targetX = next.phase === 'work' ? p.x : next.spotX;
    const targetY = next.phase === 'work' ? p.y : next.spotY;
    const remaining = Math.hypot(targetX - e.x, targetY - e.y);
    const direct = Math.hypot(targetX - e.startX, targetY - e.startY);
    const extraTicks = Math.max(0, e.walked + remaining - direct) * e.ticks / e.walked;
    detours.push({ ...e, targetX, targetY, remaining, direct, extraTicks });
  }
};
while (w.tick < stop) {
  for (const p of w.persons) {
    const a = p.activity;
    if (!p.alive || !a || ageYears(w, p) < 12 || timeCategory(p, w.tick) !== 'travel') {
      legs.delete(p.id);
      continue;
    }
    walkingTicks++;
    let leg = legs.get(p.id);
    if (!leg || leg.act !== a.id || leg.kind !== a.kind || leg.target !== a.targetId) {
      leg = { act: a.id, kind: a.kind, target: a.targetId, sx: p.x, sy: p.y, x: p.x, y: p.y,
        ticks: 0, tiles: 0, censored: w.tick === firstTick && a.start < firstTick };
      legs.set(p.id, leg);
    }
    leg.tiles += Math.hypot(p.x - leg.x, p.y - leg.y);
    leg.x = p.x; leg.y = p.y;
    leg.ticks++;
  }
  stepWorld(w);
}
const endHash = hashWorld(w);
if (endHash !== reference.sampleDay.endHash || !conservationReport(w).ok || pending.size) throw Error('Replay mismatch');
writeFileSync(opt('out', ''), JSON.stringify({ loaded, firstTick, initialHash, endHash, walkingTicks, adultTicks13d,
  reasons, replacements, reviews, switches, unmatched, stationary, censoredTicks, rejectedStarts, detours }, null, 1));
