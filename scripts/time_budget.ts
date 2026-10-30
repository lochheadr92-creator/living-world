// A living-person time budget for an ordinary world (owner brief §4, 2026-10-30): every tick of every living person classified
// into exactly one of sleep, bodily needs (eating, drinking, fetching water, warming, resting), travel (any activity in its
// travel phase), work, social contact, leisure (the rules-28 haunts, time alone), danger (fleeing, defending), waiting (an
// activity standing blocked), or idle (no activity). Measured as well: critical-need exposure (ticks with any need below its
// CRITICAL line), activity endings by outcome, ticks spent in activities that ended failed or interrupted (lost time) with the
// stated reason, aborted journeys (failed or interrupted while still travelling), and uninterrupted work runs. Per person,
// per household and per world. Pure observation: nothing here writes to the world; a serialized check guards each sample.
// Usage: vite-node scripts/time_budget.ts <out> <meadow|river|forest> [days] [arrivals|none]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { serializeWorld } from '../src/app/save';
import { CRITICAL, DAY, NEED_KEYS } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { stageOf } from '../src/sim/people';
import { generateOptions } from '../src/sim/decision';
import type { Activity, ActivityKind, Person } from '../src/sim/types';
const [out, seed, daysArg, arrivalsArg] = process.argv.slice(2), days = Number(daysArg ?? 30), immigration = arrivalsArg === 'arrivals';
if (!out || existsSync(out) || !['meadow', 'river', 'forest'].includes(seed) || !Number.isInteger(days) || days < 1 || days > 90) throw new Error('Fresh output, registered seed and 1-90 days required');
mkdirSync(out, { recursive: true });
const paths = readdirSync('src', { recursive: true }).map(String).filter((p) => p.endsWith('.ts')).map((p) => 'src/' + p).concat(['scripts/time_budget.ts']).sort();
const manifest = () => Object.fromEntries(paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source = manifest();
const w = createWorld(currentWorldSettings('normal', seed, { immigration }));
writeFileSync(`${out}/provenance.json`, JSON.stringify({ head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), source, settings: w.settings, days, question: 'How do living people spend their ticks, how often are they in critical need, and where is time lost? Observation only; no causal claim.' }, null, 2));
export type Category = 'sleep' | 'needs' | 'travel' | 'work' | 'social' | 'leisure' | 'danger' | 'waiting' | 'idle';
const CATEGORIES: Category[] = ['sleep', 'needs', 'travel', 'work', 'social', 'leisure', 'danger', 'waiting', 'idle'];
const SOCIAL: ActivityKind[] = ['socialize', 'converse', 'give', 'care', 'argue', 'fulfill', 'visit', 'attend', 'attend_meal', 'host_meal'];
const NEEDS: ActivityKind[] = ['eat', 'eat_store', 'drink', 'fetch_water', 'warm', 'rest'];
const DANGER: ActivityKind[] = ['flee', 'defend'];
/** the one category a tick belongs to */
export function categoryOf(a: Activity | null): Category {
  if (!a) return 'idle';
  if (a.blocked) return 'waiting';
  if (a.phase === 'travel') return 'travel';
  if (a.kind === 'sleep') return 'sleep';
  if (a.data.haunt || a.kind === 'alone' || a.kind === 'wander') return 'leisure';
  if (NEEDS.includes(a.kind)) return 'needs';
  if (SOCIAL.includes(a.kind)) return 'social';
  if (DANGER.includes(a.kind)) return 'danger';
  return 'work';
}
type Budget = Record<Category, number>;
const blank = (): Budget => Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Budget;
const perPerson = new Map<number, { name: string; hh: number; ticks: number; budget: Budget; critical: number; criticalBy: Record<string, number>; ends: Record<string, number>; lost: number; lostBy: Record<string, number>; abortedJourneys: number; workRuns: number[]; adultTicks: number }>();
const live = new Map<number, { a: Activity; since: number; travelTicks: number; workTicks: number; lastTick: number }>();
const rec = (p: Person) => {
  let r = perPerson.get(p.id);
  if (!r) { r = { name: p.name, hh: p.hhId, ticks: 0, budget: blank(), critical: 0, criticalBy: {}, ends: {}, lost: 0, lostBy: {}, abortedJourneys: 0, workRuns: [], adultTicks: 0 }; perPerson.set(p.id, r); }
  return r;
};
/** interruptions attributed: what was given up (kind, phase, ticks already spent) and what replaced it; read off the person's own result record */
const interruptions: Record<string, { n: number; ticks: number; travelTicks: number; oldKeyStillOffered: number; oldTargetStillBelieved: number }> = {};
const interruptedBy: Record<string, number> = {};
w.hooks = {
  onActivityStart(p: Person, a: Activity) {
    const prev = live.get(p.id);
    const res = p.lastResult;
    if (!prev || !res || res.outcome !== 'interrupted' || res.tick < prev.since) return;
    const why = res.detail === 'something better came up' ? 'better' : /urgent need/.test(res.detail) ? 'need' : /danger/.test(res.detail) ? 'danger' : 'other';
    const key = `${prev.a.kind}/${prev.a.phase} -> ${a.kind} (${why})`;
    const e = (interruptions[key] ??= { n: 0, ticks: 0, travelTicks: 0, oldKeyStillOffered: 0, oldTargetStillBelieved: 0 });
    e.n++; e.ticks += w.tick - prev.since; e.travelTicks += prev.travelTicks;
    // was the option the person was acting on still on the table when it was dropped? (observer derivation, same tick)
    if (why === 'better' && prev.a.kind === 'gather') {
      const oldKey = prev.a.data.optKey as string | undefined;
      if (oldKey && generateOptions(w, p, true, true).options.some((o) => o.key === oldKey)) e.oldKeyStillOffered++;
      if (prev.a.targetId && p.beliefs[prev.a.targetId] && (p.beliefs[prev.a.targetId].amount ?? 1) > 0) e.oldTargetStillBelieved++;
    }
    interruptedBy[why] = (interruptedBy[why] ?? 0) + 1;
  },
};
const began = Date.now();
let stop = 'horizon', pure = true;
while (w.tick < days * DAY) {
  stepWorld(w);
  const sampled = w.tick % 240 === 0, before = sampled ? serializeWorld(w) : '';
  for (const p of w.persons) {
    if (!p.alive) continue;
    const r = rec(p);
    r.ticks++;
    if (stageOf(w, p) === 'adult') r.adultTicks++;
    const c = categoryOf(p.activity);
    r.budget[c]++;
    for (const k of NEED_KEYS) if (k !== 'social' && p.needs[k] < CRITICAL[k]) { r.critical++; r.criticalBy[k] = (r.criticalBy[k] ?? 0) + 1; break; }
    // activity instances: begun, continuing, or ended (the person's own record says how)
    const cur = live.get(p.id);
    if (p.activity && (!cur || cur.a.id !== p.activity.id)) {
      if (cur) closeInstance(p, r, cur);
      live.set(p.id, { a: p.activity, since: w.tick, travelTicks: 0, workTicks: 0, lastTick: w.tick });
    } else if (!p.activity && cur) { closeInstance(p, r, cur); live.delete(p.id); }
    const now = live.get(p.id);
    if (now) { if (c === 'travel') now.travelTicks++; else if (c === 'work') now.workTicks++; now.lastTick = w.tick; }
  }
  if (sampled) pure &&= serializeWorld(w) === before; // the reading loop above wrote nothing
  if (w.tick % 2400 === 0 && Date.now() - began > 420000) { stop = 'budget'; break; }
}
function closeInstance(p: Person, r: ReturnType<typeof rec>, cur: { a: Activity; since: number; travelTicks: number; workTicks: number; lastTick: number }): void {
  const res = p.lastResult && p.lastResult.tick >= cur.since ? p.lastResult : null;
  const outcome = res?.outcome ?? 'unknown';
  r.ends[outcome] = (r.ends[outcome] ?? 0) + 1;
  const spent = cur.lastTick - cur.since + 1;
  if (outcome === 'failed' || outcome === 'interrupted') {
    r.lost += spent;
    const why = `${cur.a.kind}: ${(res?.detail ?? '').replace(/\d+/g, 'N').slice(0, 60)}`;
    r.lostBy[why] = (r.lostBy[why] ?? 0) + spent;
    if (cur.a.phase === 'travel') r.abortedJourneys++;
  }
  if (cur.workTicks > 0) r.workRuns.push(cur.workTicks);
}
for (const p of w.persons) { const cur = live.get(p.id); if (cur) closeInstance(p, rec(p), cur); }
if (JSON.stringify(source) !== JSON.stringify(manifest())) throw new Error('Source changed during run');
const total = blank();
let ticks = 0, critical = 0, lost = 0, aborted = 0;
const ends: Record<string, number> = {}, lostBy: Record<string, number> = {};
const people = [...perPerson.values()].map((r) => {
  ticks += r.ticks; critical += r.critical; lost += r.lost; aborted += r.abortedJourneys;
  for (const c of CATEGORIES) total[c] += r.budget[c];
  for (const [k, v] of Object.entries(r.ends)) ends[k] = (ends[k] ?? 0) + v;
  for (const [k, v] of Object.entries(r.lostBy)) lostBy[k] = (lostBy[k] ?? 0) + v;
  const runs = r.workRuns.sort((a, b) => a - b);
  return { name: r.name, hh: r.hh, ticks: r.ticks, adultTicks: r.adultTicks, share: Object.fromEntries(CATEGORIES.map((c) => [c, +(r.budget[c] / r.ticks).toFixed(3)])), criticalShare: +(r.critical / r.ticks).toFixed(3), criticalBy: r.criticalBy, ends: r.ends, lostShare: +(r.lost / r.ticks).toFixed(3), abortedJourneys: r.abortedJourneys, workRuns: runs.length, medianWorkRun: runs.length ? runs[Math.floor(runs.length / 2)] : 0, longestWorkRun: runs.length ? runs[runs.length - 1] : 0 };
});
const households = Object.values(people.reduce((m, q) => { const h = (m[q.hh] ??= { hh: q.hh, members: [] as string[], ticks: 0, leisure: 0, social: 0, critical: 0, lost: 0 }); h.members.push(q.name); h.ticks += q.ticks; h.leisure += q.share.leisure * q.ticks; h.social += q.share.social * q.ticks; h.critical += q.criticalShare * q.ticks; h.lost += q.lostShare * q.ticks; return m; }, {} as Record<number, { hh: number; members: string[]; ticks: number; leisure: number; social: number; critical: number; lost: number }>)).map((h) => ({ ...h, leisure: +(h.leisure / h.ticks).toFixed(3), social: +(h.social / h.ticks).toFixed(3), critical: +(h.critical / h.ticks).toFixed(3), lost: +(h.lost / h.ticks).toFixed(3) }));
const report = { seed, days, immigration, rules: w.settings.rulesVersion, tick: w.tick, stop, seconds: (Date.now() - began) / 1000, pure, conservation: conservationReport(w), alive: w.persons.filter((p) => p.alive).length, deaths: w.deceased.length, livingTicks: ticks, share: Object.fromEntries(CATEGORIES.map((c) => [c, +(total[c] / ticks).toFixed(4)])), criticalShare: +(critical / ticks).toFixed(4), lostShare: +(lost / ticks).toFixed(4), abortedJourneys: aborted, ends, interruptedBy, interruptions: Object.fromEntries(Object.entries(interruptions).sort((a, b) => b[1].ticks - a[1].ticks).slice(0, 60)), lostBy: Object.fromEntries(Object.entries(lostBy).sort((a, b) => b[1] - a[1]).slice(0, 40)), households, people };
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ seed, days, tick: w.tick, stop, seconds: report.seconds, pure, conservation: report.conservation.ok, alive: report.alive, deaths: report.deaths, share: report.share, criticalShare: report.criticalShare, lostShare: report.lostShare, abortedJourneys: aborted, ends }));
if (stop !== 'horizon' || !report.conservation.ok || !pure) process.exitCode = 1;
