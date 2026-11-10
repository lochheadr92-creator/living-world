// DIAGNOSTIC census: which mechanisms fire in an ordinary world (current rules, Normal, arrivals on, N days), and what is on offer but
// not taken or blocked. Writes one JSON per seed.
//   node node_modules/vite-node/dist/cli.mjs <this> -- <seed> <days> <out.json>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const from = (p: string) => import(pathToFileURL(join(process.cwd(), p)).href);
const [seed = 'meadow', days = '25', out = 'census.json'] = process.argv.slice(2).filter((a) => a !== '--');
const { createWorld } = await from('src/sim/factory.ts');
const { currentWorldSettings } = await from('src/sim/profiles.ts');
const { stepWorld } = await from('src/sim/world.ts');
const { DAY } = await from('src/sim/constants.ts');
const { stageOf } = await from('src/sim/people.ts');
const w: any = createWorld(currentWorldSettings('normal', seed, { immigration: true }));
const inc = (m: Record<string, number>, k: string, n = 1) => { m[k] = (m[k] ?? 0) + n; };
const norm = (s: string) => String(s ?? '').replace(/\b(\d+(\.\d+)?)\b/g, 'N').replace(/(^|\s)([A-Z][a-z]+)('s)?\b/g, (m, a, b, c, off) => (off === 0 ? m : a + '<name>' + (c ?? ''))).slice(0, 90);
const actEnd: Record<string, number> = {}, actEndOk: Record<string, number> = {}, actStart: Record<string, number> = {};
const convs = new Set<number>(); const convByPurpose: Record<string, number> = {};
const offered: Record<string, number> = {}, chosen: Record<string, number> = {}, blocked: Record<string, number> = {};
const offeredByStage: Record<string, Record<string, number>> = { child: {}, youth: {}, adult: {}, elder: {} };
let samples = 0;
w.hooks = {
  onActivityStart: (_p: any, a: any) => inc(actStart, a.kind),
  onActivityEnd: (_p: any, a: any, outcome: string) => { inc(actEnd, a.kind); if (outcome === 'success') inc(actEndOk, a.kind); },
};
const seenEvents = new Set<number>(); const events: Record<string, number> = {}; const eventTexts: Record<string, number> = {};
while (w.tick < Number(days) * DAY) {
  stepWorld(w);
  for (const c of w.conversations) if (!convs.has(c.id)) { convs.add(c.id); inc(convByPurpose, c.purpose); }
  for (const e of w.events) if (!seenEvents.has(e.id)) { seenEvents.add(e.id); inc(events, e.kind); inc(eventTexts, e.kind + ': ' + norm(e.text)); }
  if (w.tick % 50 === 0) for (const p of w.persons) {
    if (!p.alive) continue; const d = p.lastDecision; if (!d) continue; samples++;
    const st = stageOf(w, p);
    const all = [...(d.alternatives ?? []), ...(d.chosen ? [d.chosen] : [])];
    for (const o of all) { const k = (o.kind ?? '?') + ': ' + norm(o.label); inc(offered, k); inc(offeredByStage[st], k); }
    if (d.chosen) inc(chosen, (d.chosen.kind ?? '?') + ': ' + norm(d.chosen.label));
    for (const b of d.blocked ?? []) inc(blocked, (b.kind ?? '?') + ': ' + norm(b.label) + ' | ' + norm(b.reason ?? b.why ?? b.blocked ?? '?'));
  }
}
const alive = w.persons.filter((p: any) => p.alive);
const occasions: Record<string, number> = {}; for (const o of w.occasions ?? []) inc(occasions, o.kind + ':' + (o.status ?? o.state ?? '?'));
const chron: Record<string, number> = {}; for (const e of w.chronicle ?? []) inc(chron, e.kind);
const buildings: Record<string, number> = {}; for (const b of w.buildings) inc(buildings, b.type);
const persons = {
  alive: alive.length, children: alive.filter((p: any) => stageOf(w, p) === 'child').length, elders: alive.filter((p: any) => stageOf(w, p) === 'elder').length,
  withTrade: alive.filter((p: any) => p.trade?.kind || p.trade).length, apprentices: alive.filter((p: any) => p.apprentice || p.apprenticeship).length,
  partnered: alive.filter((p: any) => p.partnerId || p.partner).length, withGoal: alive.filter((p: any) => p.goal).length,
  ill: alive.filter((p: any) => p.illness).length, injured: alive.filter((p: any) => p.injury).length,
  heardStories: alive.reduce((s: number, p: any) => s + (p.heard?.length ?? 0), 0), techniques: alive.reduce((s: number, p: any) => s + (Object.keys(p.techniques ?? {}).length), 0),
};
const res = {
  seed, days: Number(days), rules: w.settings.rulesVersion, persons, deaths: w.deceased.length, births: w.birthCount ?? 0,
  households: w.households.length, buildings, sites: w.sites.length, plots: w.plots.length, tools: w.tools.length, carts: w.carts.length, animals: w.animals.filter((a: any) => a.kind === 'sheep').length,
  occasions, traditions: (w.traditions ?? []).length, crews: (w.crews ?? []).length, civicProjects: (w.civicProjects ?? []).map((q: any) => q.status), exchangeReceipts: (w.exchangeReceipts ?? []).length,
  meals: w.meals.length, chronicle: chron, events, convByPurpose, actStart, actEnd, actEndOk, samples, offered, chosen, blocked, offeredByStage, eventTexts,
};
writeFileSync(out, JSON.stringify(res, null, 1));
console.log(`${seed}: alive ${alive.length} deaths ${w.deceased.length} births ${res.births} convs ${convs.size} occasions ${JSON.stringify(occasions)} traditions ${res.traditions} crews ${res.crews} meals ${w.meals.length} exchange ${res.exchangeReceipts} civic ${JSON.stringify(res.civicProjects)}`);
