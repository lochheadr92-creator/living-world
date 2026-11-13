// How often a job is dropped part-way, and why. Read-only measurement: one ordinary world, every activity's ending counted by kind,
// by whether the person had arrived and begun (phase 'work') or was still walking there, and by the reason recorded for it. Also how
// many times people looked again at what they were doing (a review) against how many times they chose afresh.
//
//   npx vite-node scripts/job_drops.ts -- --seed aspen --days 10 [--arrivals on|off] [--rules N] [--out drops.json]
//   (or --load <save point> in place of --seed: see scripts/world_args.ts)
import { writeFileSync } from 'node:fs';
import { worldFromArgs } from './world_args';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { probe } from '../src/sim/probe';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import type { World } from '../src/sim/types';

const args = process.argv.slice(2).filter((a) => a !== '--');
const opt = (name: string, dflt: string): string => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : dflt;
};
let seed = opt('seed', 'aspen');
const days = Number(opt('days', '10'));
const out = opt('out', '');
// a world read from --load (a save point written by a long run) or made fresh (scripts/world_args.ts)
const { w }: { w: World } = worldFromArgs(opt, seed);
seed = w.settings.seed;

interface Row { ended: number; success: number; partial: number; failed: number; droppedWalking: number; droppedWorking: number; workTicksDropped: number; fracSum: number; reasons: Record<string, number> }
const rows: Record<string, Row> = {};
const row = (k: string): Row => (rows[k] ??= { ended: 0, success: 0, partial: 0, failed: 0, droppedWalking: 0, droppedWorking: 0, workTicksDropped: 0, fracSum: 0, reasons: {} });
// a reason with the names and numbers taken out, so "a more urgent need (thirst)" and "(hunger)" stay apart but people do not
const bucket = (detail: string): string => detail.replace(/\d+(\.\d+)?/g, 'N').slice(0, 60);
// Building looked at more closely: of the spells that reached the site, how many did no work at all, how many ended while the
// builder stood waiting for materials (act_build.ts: the work allowed by what has been delivered was used up), how long they
// had stood, and how many had been going longer than the hold of rules 227 lasts (finish_job.ts HOLD_MAX, 800 ticks).
const build = { reached: 0, noWork: 0, waitingAtEnd: 0, waitedTicks: 0, workTicks: 0, pastHold: 0, byEnding: {} as Record<string, number> };
w.hooks = {
  onActivityEnd: (_p, a, outcome, detail) => {
    if (a.kind === 'build' && a.phase === 'work') {
      build.reached++;
      build.workTicks += a.cycle;
      if (a.cycle === 0) build.noWork++;
      const waiting = (a.blocked ?? '').startsWith('waiting');
      if (waiting) { build.waitingAtEnd++; build.waitedTicks += Number(a.data.waited ?? 0); }
      if (w.tick - a.start >= 800) build.pastHold++;
      const key = `${outcome}${waiting ? ', waiting for materials' : ''}: ${bucket(detail).replace(/\(.*$/, '').trim()}`;
      build.byEnding[key] = (build.byEnding[key] ?? 0) + 1;
    }
    const r = row(a.kind);
    r.ended++;
    if (outcome !== 'interrupted') { r[outcome]++; return; }
    if (a.phase === 'work') {
      r.droppedWorking++;
      r.workTicksDropped += a.progress;
      r.fracSum += a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0;
      const b = bucket(detail);
      r.reasons[b] = (r.reasons[b] ?? 0) + 1;
    } else r.droppedWalking++;
  },
};
probe.on = true;
// Work put on hold because somebody began to talk to the person (activities.ts suspendActivity): no activity ends, so the hook
// above never sees it. Seen here by comparing each person before and after a tick.
interface Held { kind: string; phase: string; progress: number; frac: number }
const before = new Map<number, { a: object | null; held: Held }>();
const waiting = new Map<number, object>();
// rules 233 (picked_up.ts): of the work held at work, how much of its count is there again once the person is back at it
const heldCount = new Map<object, number>();
const back = new Map<number, { a: object; held: number }>();
const kept = { pickedUpAtWork: 0, countKept: 0, ticksKept: 0, ticksLost: 0 };
const talk: Record<string, { atWork: number; walking: number; workTicksLost: number; fracSum: number; purposes: Record<string, number> }> = {};
const looksBy: Record<string, number> = {};
let resumed = 0;
let neverResumed = 0;
const started = Date.now();
for (let i = w.tick; i < days * DAY; i++) {
  for (const p of w.persons) {
    if (!p.alive) continue;
    const a = p.activity;
    // a second look is due this tick (world.ts stepPerson): counted by what the person is doing and whether they have arrived
    if (a && a.kind !== 'converse' && a.kind !== 'argue' && w.tick + 1 >= p.nextThink) { const k = a.kind + (a.phase === 'work' ? '' : ' (walking)'); looksBy[k] = (looksBy[k] ?? 0) + 1; }
    before.set(p.id, { a, held: a ? { kind: a.kind, phase: a.phase, progress: a.progress, frac: a.duration > 0 ? Math.min(1, a.progress / a.duration) : 0 } : { kind: '', phase: '', progress: 0, frac: 0 } });
  }
  stepWorld(w);
  for (const p of w.persons) {
    if (!p.alive) continue;
    const was = before.get(p.id);
    const wait = waiting.get(p.id);
    const b = back.get(p.id);
    if (b) {
      if (p.activity !== b.a) back.delete(p.id);
      else if ((p.activity as { phase: string }).phase === 'work') {
        const now = (p.activity as { progress: number }).progress;
        kept.pickedUpAtWork++;
        if (now >= b.held) { kept.countKept++; kept.ticksKept += b.held; } else kept.ticksLost += b.held - now;
        back.delete(p.id);
      }
    }
    if (wait) {
      if (p.activity === wait) { resumed++; waiting.delete(p.id); const h = heldCount.get(wait); if (h !== undefined) { back.set(p.id, { a: wait, held: h }); heldCount.delete(wait); } }
      else if (p.suspended !== wait) { neverResumed++; waiting.delete(p.id); }
    }
    if (was && was.a && p.suspended === was.a && p.activity !== was.a && !waiting.has(p.id)) {
      waiting.set(p.id, was.a);
      const t = (talk[was.held.kind] ??= { atWork: 0, walking: 0, workTicksLost: 0, fracSum: 0, purposes: {} });
      if (was.held.phase === 'work') { t.atWork++; t.workTicksLost += was.held.progress; t.fracSum += was.held.frac; if (was.held.progress > 0) heldCount.set(was.a, was.held.progress); } else t.walking++;
      const purpose = w.conversations.find((c) => c.id === p.convId)?.purpose ?? (p.activity?.kind ?? 'other');
      t.purposes[purpose] = (t.purposes[purpose] ?? 0) + 1;
    }
  }
}
const secs = (Date.now() - started) / 1000;
const total = { ended: 0, droppedWorking: 0, droppedWalking: 0 };
const table = Object.entries(rows).map(([kind, r]) => {
  total.ended += r.ended; total.droppedWorking += r.droppedWorking; total.droppedWalking += r.droppedWalking;
  return { kind, ...r, meanFracDone: r.droppedWorking ? Math.round((r.fracSum / r.droppedWorking) * 100) / 100 : 0 };
}).sort((a, b) => b.droppedWorking - a.droppedWorking);
const reasons: Record<string, number> = {};
for (const r of Object.values(rows)) for (const [k, n] of Object.entries(r.reasons)) reasons[k] = (reasons[k] ?? 0) + n;
const talkTotal = Object.values(talk).reduce((n, t) => ({ atWork: n.atWork + t.atWork, walking: n.walking + t.walking, workTicksLost: n.workTicksLost + t.workTicksLost }), { atWork: 0, walking: 0, workTicksLost: 0 });
const purposes: Record<string, number> = {};
for (const t of Object.values(talk)) for (const [k, n] of Object.entries(t.purposes)) purposes[k] = (purposes[k] ?? 0) + n;
const result = { kept, build, seed, days, looksBy, talk, talkTotal, purposes, resumed, neverResumed, rulesVersion: w.settings.rulesVersion, alive: w.persons.filter((p) => p.alive).length, seconds: Math.round(secs), msPerTick: Math.round((secs * 1000 / (days * DAY)) * 100) / 100, reviews: probe.reviews, decisions: probe.decisions, total, reasons, table };
if (out) writeFileSync(out, JSON.stringify(result));
const pad = (s: unknown, n: number): string => String(s).padStart(n);
console.log(`${seed}: ${days} days, rules ${result.rulesVersion}, ${result.alive} alive, ${result.msPerTick} ms a tick; ${probe.reviews} reviews of a job under way against ${probe.decisions} fresh choices`);
console.log(`activities ended ${total.ended}; dropped while working ${total.droppedWorking} (${Math.round((100 * total.droppedWorking) / total.ended)}%), dropped while walking there ${total.droppedWalking}`);
console.log(pad('kind', 16) + pad('ended', 8) + pad('done', 7) + pad('partial', 8) + pad('failed', 7) + pad('walk', 6) + pad('work', 6) + pad('frac', 6) + '  (dropped walking / working, mean fraction done when dropped at work)');
for (const r of table.slice(0, 24)) console.log(pad(r.kind, 16) + pad(r.ended, 8) + pad(r.success, 7) + pad(r.partial, 8) + pad(r.failed, 7) + pad(r.droppedWalking, 6) + pad(r.droppedWorking, 6) + pad(r.meanFracDone, 6));
console.log('why a job was dropped at work: ' + Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join('; '));
console.log(`put on hold by somebody talking to them: ${talkTotal.atWork} at work (${Math.round(talkTotal.workTicksLost)} ticks of progress set back to nothing), ${talkTotal.walking} while walking; later picked up again ${resumed}, never ${neverResumed}`);
console.log('  by the job held: ' + Object.entries(talk).sort((a, b) => b[1].atWork - a[1].atWork).slice(0, 12).map(([k, t]) => `${k} ${t.atWork}`).join('; '));
console.log('  by what the talk was for: ' + Object.entries(purposes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} ${n}`).join('; '));
console.log(`building: ${build.reached} spells reached the site, ${build.noWork} did no work at all; ${build.waitingAtEnd} ended while waiting for materials (stood ${Math.round(build.waitedTicks / Math.max(1, build.waitingAtEnd))} ticks on average); ${build.pastHold} had run 800 ticks or more; ${Math.round(build.workTicks / Math.max(1, build.reached))} ticks of work a spell`);
console.log('  how building spells ended: ' + Object.entries(build.byEnding).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${n}x ${k}`).join('; '));
console.log(`  picked up again and back at the work: ${kept.pickedUpAtWork}; with the count as it was ${kept.countKept} (${Math.round(kept.ticksKept)} ticks kept); begun again ${kept.pickedUpAtWork - kept.countKept} (${Math.round(kept.ticksLost)} ticks lost)`);
console.log('  progress set back by talk, by the job held (ticks): ' + Object.entries(talk).sort((a, b) => b[1].workTicksLost - a[1].workTicksLost).slice(0, 10).map(([k, t]) => `${k} ${Math.round(t.workTicksLost)}`).join('; '));
console.log('second looks due, by what the person was doing: ' + Object.entries(looksBy).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, n]) => `${k} ${n}`).join('; '));
