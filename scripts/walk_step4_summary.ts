import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { JOBS } from '../src/sim/finish_job';
import type { ActivityKind } from '../src/sim/types';

interface Row { count: number; ticks: number }
type Counts = Record<string, Row>;
type Event = { kind: string; nextKind: string; extraTicks: number; job: boolean };
interface Run {
  loaded: string; walkingTicks: number; adultTicks13d: number; endHash: string; reasons: Counts;
  replacements: Counts; reviews: Counts; switches: Counts; unmatched: number; stationary: number;
  censoredTicks: number; detours: Event[];
}
function add(counts: Counts, key: string, source: Row) {
  const row = counts[key] ??= { count: 0, ticks: 0 };
  row.count += source.count;
  row.ticks += source.ticks;
}
function top(counts: Counts, n: number, field: keyof Row = 'count') {
  return Object.entries(counts).sort((a,b) => b[1][field] - a[1][field]).slice(0,n);
}
const reasons: Counts = {}, pairs: Counts = {}, reviewPairs: Counts = {}, geometry: Counts = {};
const perStart = [];
for (const seed of ['aspen', 'gen-4', 'river']) for (const day of [48, 96]) {
  const path = join('review_evidence/walk-step4-20261119', seed + '-day' + day + '.json');
  const run: Run = JSON.parse(readFileSync(path, 'utf8'));
  const byReason = Object.entries(run.reasons);
  const drops = byReason.reduce((n,[,r]) => n+r.count,0);
  const dropTicks = byReason.reduce((n,[,r]) => n+r.ticks,0);
  for (const [reason,row] of byReason) add(reasons, reason, row);
  for (const [key,row] of Object.entries(run.replacements)) add(pairs, key, row);
  let generic = 0, absent = 0, unkeyed = 0, jobGeneric = 0, jobAbsent = 0, jobPresent = 0;
  let totalReviews = 0, totalSwitches = 0, presentReviews = 0, presentSwitches = 0;
  for (const [key,r] of Object.entries(run.reviews)) {
    totalReviews += r.count;
    if (key.endsWith('|present')) presentReviews += r.count;
  }
  for (const [key,r] of Object.entries(run.switches)) {
    const [kind,next,reason,presence] = key.split('|');
    totalSwitches += r.count;
    if (presence === 'present') presentSwitches += r.count;
    if (reason !== 'something better came up') continue;
    add(reviewPairs, kind+'|'+presence, r);
    generic += r.count;
    if (presence === 'absent') absent += r.count;
    if (presence === 'unkeyed') unkeyed += r.count;
    if (JOBS.has(kind as ActivityKind)) {
      jobGeneric += r.count;
      if (presence === 'absent') jobAbsent += r.count;
      if (presence === 'present') jobPresent += r.count;
    }
  }
  let detour = 0, jobDetour = 0;
  const byPair: Counts = {};
  for (const e of run.detours) {
    const row = { count: 1, ticks: e.extraTicks };
    add(byPair,e.kind+'|'+e.nextKind,row);
    add(geometry,e.kind+'|'+e.nextKind,row);
    detour += e.extraTicks;
    if (e.job) jobDetour += e.extraTicks;
  }
  perStart.push({ id: basename(run.loaded,'.save.json'), endHash: run.endHash, adultTicks13d: run.adultTicks13d,
    drops, dropTicks, walkingTicks: run.walkingTicks, totalReviews, totalSwitches, presentHeld: presentReviews-presentSwitches,
    generic, absent, unkeyed, jobGeneric, jobPresent, jobAbsent, detour, jobDetour, positivePaceRows:run.detours.length,
    unmatched: run.unmatched, stationary: run.stationary, censoredTicks: run.censoredTicks, detourByPair: byPair });
}
console.log(JSON.stringify({perStart, reasons: top(reasons,100), replacements: top(pairs,20),
  reviewKinds: top(reviewPairs,30), detourKinds: top(geometry,20,'ticks')}, null, 1));
