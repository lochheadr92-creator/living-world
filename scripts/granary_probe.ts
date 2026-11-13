// Why does one world never build a granary? Read-only measurement: a world is loaded from a save point and stepped as it is; the probe
// only looks (it writes nothing to the world: a run with it and a run with --bare end on the same hash).
//
// A granary is wanted by anybody whose household works a plot (rules 243, src/sim/grain_kept.ts, src/sim/production.ts facilityWants)
// and laid out by optPlanFacilities (plan_site:granary), on a spot findBuildSpot finds 3 to 11 tiles from the hub. Every SAMPLE ticks
// this records:
//   1. for every grown person whose household works a plot: does facilityWants return a granary, and if not which test in it fails;
//      does optPlanFacilities offer the option, and if not which of its gates stops it; if it is offered, where it ranks;
//   2. the refusals: every person's failure record for the granary key (-3000 - index in BUILD_DEF: "no suitable spot", 900 ticks),
//      the same for every other workplace for contrast, and every plan_site activity that began and how it ended (hooks);
//   3. every granary site and building, what became of each site, and every world event that mentions a granary;
//   4. how many free footprints a granary could take 3 to 11 and 3 to 20 tiles from the hub (the findBuildSpot test, counted),
//      with the first reason each rejected spot fails on; and the same for the bakery's 5 to 14 ring.
//
//   node scripts/fast.mjs scripts/granary_probe.ts -- --load <save> --days <absolute day> --out <file.json> [--bare] [--every 100]
//   (--bare steps the world with no observation, for the purity check)
import { writeFileSync } from 'node:fs';
import { argsOf, worldFromArgs } from './world_args';
import { BUILD_DEF, DAY, isSolidHome } from '../src/sim/constants';
import { allSitesNeedAccess, preservesAccess } from '../src/sim/construction_access';
import { findBuildSpot } from '../src/sim/buildings';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { wantsGrainWorks } from '../src/sim/grain_kept';
import { recentFailure } from '../src/sim/knowledge';
import { beliefsByKind, countBeliefsOfKind, makeCtx } from '../src/sim/optutil';
import { projectLimit, projectsUnderWay } from '../src/sim/act_build';
import { settlementAnchor } from '../src/sim/options_work';
import { facilityWants, knowsEnough, knowsOfAny } from '../src/sim/production';
import { isFreeLand, isWalkable } from '../src/sim/registry';
import { hashUnit } from '../src/sim/rng';
import { baseHub } from '../src/sim/settlements';
import { stageOf } from '../src/sim/people';
import { T } from '../src/sim/types';
import { dist } from '../src/sim/util';
import { hashWorld, stepWorld } from '../src/sim/world';
import type { BuildingType, Person, World } from '../src/sim/types';

const { opt, args } = argsOf(process.argv);
const days = Number(opt('days', '36'));
const out = opt('out', '');
const bare = args.includes('--bare');
const EVERY = Number(opt('every', '100'));
const { w, loaded }: { w: World; loaded: string } = worldFromArgs(opt, opt('seed', 'aspen'));
const startTick = w.tick;

const round = (n: number, d = 2): number => Math.round(n * 10 ** d) / 10 ** d;
const median = (xs: number[]): number => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const bump = (o: Record<string, number>, k: string, n = 1): void => { o[k] = (o[k] ?? 0) + n; };
const TYPES = Object.keys(BUILD_DEF) as BuildingType[];
const keyOf = (type: BuildingType): number => -3000 - TYPES.indexOf(type);
const GRANARY_KEY = keyOf('granary');

// ───────────── footprints: the findBuildSpot test, counted ─────────────
interface SpotCount { anchors: number; packed: number; rejected: Record<string, number> }
function footprintFree(world: World, x: number, y: number, ww: number, hh: number): boolean {
  for (let yy = y; yy < y + hh; yy++) for (let xx = x; xx < x + ww; xx++) if (!isFreeLand(world, xx, yy)) return false;
  return true;
}
/** every spot findBuildSpot would accept (anchor tiles), the first reason the others fail on, and how many fit without touching */
function countSpots(world: World, p: Person | null, type: BuildingType, ax: number, ay: number, rMin: number, rMax: number): SpotCount {
  const d = BUILD_DEF[type];
  const rejected: Record<string, number> = {};
  const good: { x: number; y: number }[] = [];
  const x0 = Math.max(2, Math.floor(ax - rMax));
  const x1 = Math.min(world.W - 4, Math.ceil(ax + rMax));
  const y0 = Math.max(2, Math.floor(ay - rMax));
  const y1 = Math.min(world.H - 4, Math.ceil(ay + rMax));
  const access = allSitesNeedAccess(world);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dd = dist(x + d.w / 2, y + d.h / 2, ax, ay);
      if (dd < rMin || dd > rMax) continue;
      if (!footprintFree(world, x, y, d.w, d.h)) { bump(rejected, 'footprint not free land'); continue; }
      if (!isFreeLand(world, x, y + d.h) && !isWalkable(world, x, y + d.h)) { bump(rejected, 'doorway tile blocked'); continue; }
      if (p && p.explored[y * world.W + x] === 0) { bump(rejected, 'never explored by this person'); continue; }
      let why = '';
      let wd = 255;
      for (let yy = y - 1; yy <= y + d.h && !why; yy++) {
        for (let xx = x - 1; xx <= x + d.w && !why; xx++) {
          if (xx < 0 || yy < 0 || xx >= world.W || yy >= world.H) { why = 'edge of map'; break; }
          const i = yy * world.W + xx;
          const inside = xx >= x && xx < x + d.w && yy >= y && yy < y + d.h;
          if (!inside) {
            if (world.terrain[i] === T.DEEP) why = 'deep water beside it';
            const occ = world.occ[i];
            if (!why && occ) {
              const e = world.byId.get(occ);
              if (e && (e.ent === 'building' || e.ent === 'site')) why = 'a building or site touches it (the one-tile gap)';
            }
          }
          wd = Math.min(wd, world.waterDist[i]);
        }
      }
      if (why) { bump(rejected, why); continue; }
      if (wd < 2) { bump(rejected, 'water within 2 tiles'); continue; }
      if (access && !preservesAccess(world, x, y, d.w, d.h)) { bump(rejected, 'would obstruct access'); continue; }
      good.push({ x, y });
    }
  }
  // how many could stand at once, a tile apart (greedy, scan order)
  const taken: { x: number; y: number }[] = [];
  for (const g of good) if (!taken.some((t) => Math.abs(t.x - g.x) < d.w + 1 && Math.abs(t.y - g.y) < d.h + 1)) taken.push(g);
  return { anchors: good.length, packed: taken.length, rejected };
}

// ───────────── state the probe keeps (never the world's) ─────────────
const planStarts: Record<string, number> = {};
const planEnds: Record<string, Record<string, number>> = {};
const granaryPlanLog: Record<string, unknown>[] = [];
const sitesSeen = new Map<number, { firstTick: number; lastTick: number; x: number; y: number; hhId: number; fate: string }>();
const eventLog: { tick: number; text: string }[] = [];
let lastEventId = -1;
const failMax = new Map<number, Record<string, { count: number; tick: number; reason: string }>>(); // person -> key name -> record
const gateTotals = { plan: {} as Record<string, number>, want: {} as Record<string, number>, state: {} as Record<string, number> };
const rankTotals = { offered: 0, rankSum: 0, top1: 0, ranks: [] as number[], utils: [] as number[], topUtils: [] as number[], topKinds: {} as Record<string, number> };
let mismatches = 0;
let spotMismatches = 0;
let spotChecks = 0;
const samples: Record<string, unknown>[] = [];

if (!bare) {
  w.hooks = {
    onActivityStart: (p, a) => {
      if (a.kind !== 'plan_site') return;
      const type = String(a.data.type);
      bump(planStarts, type);
      if (type === 'granary') granaryPlanLog.push({ tick: w.tick, day: round(w.tick / DAY), person: p.id, hh: p.hhId, at: [a.data.sx, a.data.sy], event: 'start' });
    },
    onActivityEnd: (p, a, outcome, detail) => {
      if (a.kind !== 'plan_site') return;
      const type = String(a.data.type);
      const o = (planEnds[type] ??= {});
      bump(o, `${outcome}${detail ? ': ' + detail : ''}`);
      if (type === 'granary') granaryPlanLog.push({ tick: w.tick, day: round(w.tick / DAY), person: p.id, hh: p.hhId, event: 'end', outcome, detail });
    },
  };
}

const facilityTypes = TYPES.filter((t) => ['timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'mill', 'hall', 'mine'].includes(t));

function sample(world: World, withPersonSpots: boolean): void {
  const plotHhs = new Set(world.plots.map((pl) => pl.hhId));
  const living = world.persons.filter((p) => p.alive);
  const row: Record<string, unknown> = { tick: world.tick, day: round(world.tick / DAY), alive: living.length, plots: world.plots.length, hhWithPlots: [...plotHhs].filter((id) => world.households.some((h) => h.id === id && h.members.length > 0)).length };
  const planGates: Record<string, number> = {};
  const wantGates: Record<string, number> = {};
  let eligible = 0;
  let wantsN = 0;
  let offeredN = 0;
  let blockedN = 0;
  const ranks: number[] = [];
  const spotsByPerson: { p311: number; p320: number }[] = [];
  const hubs = new Map<string, { x: number; y: number; p: Person }>();
  let projectsNow = -1;
  let limitNow = projectLimit(world);

  for (const p of living) {
    if (stageOf(world, p) === 'child') continue;
    if (!plotHhs.has(p.hhId)) continue;
    eligible++;
    const ctx = makeCtx(world, p, false, true);
    const { hh } = ctx;
    if (!hh) { bump(planGates, '0 no household'); continue; }
    const init = 0.5 * p.traits.diligence + 0.3 * p.traits.curiosity + 0.2 * p.traits.generosity;
    // what facilityWants says about a granary, and the first test in it that fails
    const wants = facilityWants(ctx);
    const wantsGranary = wants.some((x) => x.type === 'granary');
    let wantGate = 'WANT RETURNED';
    const knowTrees = countBeliefsOfKind(p, 'tree') >= 3;
    const knowRocks = countBeliefsOfKind(p, 'rock') + countBeliefsOfKind(p, 'outcrop') >= 1;
    if (!knowTrees || !knowRocks) wantGate = `W1 knows fewer than 3 trees (${knowTrees ? 'ok' : 'no'}) or no rock/outcrop (${knowRocks ? 'ok' : 'no'})`;
    else if (knowsEnough(ctx, 'granary')) wantGate = 'W2 already knows of a granary (or site)';
    else if (!knowsOfAny(ctx, 'timber_yard')) wantGate = 'W3 knows of no timber yard';
    else if (!wantsGranary) wantGate = 'W4 other (shortage / signal under 0.6)';
    if (wantsGranary !== (wantGate === 'WANT RETURNED')) mismatches++;
    bump(wantGates, wantGate);
    if (wantsGranary) wantsN++;
    // optPlanFacilities' own gates, in its order
    let planGate = 'offered';
    const near = settlementAnchor(ctx);
    const projects = projectsUnderWay(world, false, near);
    projectsNow = projects;
    limitNow = projectLimit(world);
    if (ctx.drives.hunger > 28 || ctx.drives.thirst > 28 || ctx.drives.energy > 40) planGate = 'P1 busy with hunger, thirst or tiredness';
    else if (world.tick < DAY * 5 || !(ctx.home && isSolidHome(ctx.home.type))) planGate = 'P2 no solid home of their own';
    else if (beliefsByKind(p, ['building']).filter((b) => isSolidHome(b.btype)).length < 2) planGate = 'P3 knows fewer than 2 solid homes';
    else if (projects >= limitNow) planGate = `P4 improvement projects at the limit (${limitNow})`;
    else if (beliefsByKind(p, ['site']).some((s) => s.hh === hh.id && s.btype && (['timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'mill', 'hall', 'mine', 'brewery', 'food_rack', 'storehouse'] as string[]).includes(s.btype))) planGate = 'P5 own household already has a facility site';
    else if (init < 0.42) planGate = 'P6 initiative under 0.42';
    else if (!wantsGranary) planGate = 'P7 facilityWants returns no granary (see want gates)';
    else if (hashUnit(p.id, Math.floor(world.tick / 500), TYPES.indexOf('granary')) > 0.25 + 0.4 * init) planGate = 'P8 the 500-tick lottery passes it over';
    else if (recentFailure(world, p, GRANARY_KEY, 900)) planGate = 'P9 inside the 900-tick refusal timer';
    // the real option list
    const full = generateOptions(world, p, true, true);
    const optn = full.options.find((o) => o.key === 'plan_site:granary');
    const blockedGranary = full.blocked.find((o) => o.label === 'Lay out a granary');
    const actual = optn ? 'offered' : blockedGranary ? 'P9 inside the 900-tick refusal timer' : planGate;
    // my replica of the gates against what the planner really did: any disagreement is counted
    const state = optn ? 'offered' : blockedGranary ? 'blocked' : 'absent';
    const expected = planGate === 'offered' ? 'offered' : planGate.startsWith('P9') ? 'blocked' : 'absent';
    if (state !== expected) mismatches++;
    bump(planGates, actual);
    if (blockedGranary) blockedN++;
    if (optn) {
      offeredN++;
      const ranked = rankOptions(full);
      const at = ranked.indexOf(optn);
      rankTotals.offered++;
      if (at >= 0) {
        rankTotals.rankSum += at + 1;
        rankTotals.ranks.push(at + 1);
        ranks.push(at + 1);
        if (at === 0) rankTotals.top1++;
        else bump(rankTotals.topKinds, ranked[0].kind + ':' + ranked[0].key.split(':')[0]);
      } else bump(rankTotals.topKinds, 'filtered out of the ranking');
      rankTotals.utils.push(optn.util);
      if (ranked[0]) rankTotals.topUtils.push(ranked[0].util);
    }
    // where the person lays things out from, and the free spots there
    const hub = baseHub(world, p, ctx.home);
    hubs.set(`${Math.round(hub.x)},${Math.round(hub.y)}`, { x: hub.x, y: hub.y, p });
    if (withPersonSpots) {
      const a = countSpots(world, p, 'granary', hub.x, hub.y, 3, 11);
      const b = countSpots(world, p, 'granary', hub.x, hub.y, 3, 20);
      spotsByPerson.push({ p311: a.anchors, p320: b.anchors });
      spotChecks++;
      if ((findBuildSpot(world, p, 'granary', hub.x, hub.y, 3, 11, 6) !== null) !== (a.anchors > 0)) spotMismatches++;
    }
  }
  for (const [k, v] of Object.entries(planGates)) bump(gateTotals.plan, k, v);
  for (const [k, v] of Object.entries(wantGates)) bump(gateTotals.want, k, v);
  row.eligiblePersons = eligible;
  row.wantsGranary = wantsN;
  row.offered = offeredN;
  row.blockedByTimer = blockedN;
  row.planGates = planGates;
  row.wantGates = wantGates;
  row.rankOfGranaryOption = ranks;
  row.projectsUnderWay = projectsNow;
  row.projectLimit = limitNow;
  if (spotsByPerson.length) {
    const a = spotsByPerson.map((s) => s.p311);
    const b = spotsByPerson.map((s) => s.p320);
    row.personSpots = { persons: a.length, ring3to11: { min: Math.min(...a), median: median(a), max: Math.max(...a), none: a.filter((n) => n === 0).length }, ring3to20: { min: Math.min(...b), median: median(b), max: Math.max(...b), none: b.filter((n) => n === 0).length } };
  }
  // the hubs' terrain (nobody's map): 3 to 11 and 3 to 20 for a granary, 5 to 14 for a bakery
  row.hubSpots = [...hubs.values()].map((h) => {
    const a = countSpots(world, null, 'granary', h.x, h.y, 3, 11);
    const b = countSpots(world, null, 'granary', h.x, h.y, 3, 20);
    const c = countSpots(world, null, 'bakery', h.x, h.y, 5, 14);
    return { hub: [round(h.x, 1), round(h.y, 1)], granary3to11: a, granary3to20: b, bakery5to14: c };
  });
  // refusals, from every person's own failure records
  const refusals: Record<string, { people: number; total: number; lastTick: number; reasons: Record<string, number> }> = {};
  for (const p of world.persons) {
    for (const t of facilityTypes) {
      const f = p.failures[keyOf(t)];
      if (!f) continue;
      const m = failMax.get(p.id) ?? {};
      const prev = m[t];
      if (!prev || f.count >= prev.count) m[t] = { count: f.count, tick: f.tick, reason: f.reason };
      failMax.set(p.id, m);
    }
  }
  for (const [, m] of failMax) {
    for (const [t, f] of Object.entries(m)) {
      const r = (refusals[t] ??= { people: 0, total: 0, lastTick: 0, reasons: {} });
      r.people++;
      r.total += f.count;
      r.lastTick = Math.max(r.lastTick, f.tick);
      bump(r.reasons, f.reason, f.count);
    }
  }
  row.refusalsCumulative = refusals;
  // granary sites and buildings
  const grSites = world.sites.filter((s) => s.type === 'granary');
  const grBuildings = world.buildings.filter((b) => b.type === 'granary');
  row.granarySites = grSites.map((s) => ({ id: s.id, at: [s.x, s.y], hh: s.hhId, delivered: s.delivered }));
  row.granaryBuildings = grBuildings.map((b) => ({ id: b.id, at: [b.x, b.y], hh: b.hhId, grain: b.store.items.grain ?? 0 }));
  for (const s of grSites) {
    const prev = sitesSeen.get(s.id);
    if (prev) prev.lastTick = world.tick;
    else sitesSeen.set(s.id, { firstTick: world.tick, lastTick: world.tick, x: s.x, y: s.y, hhId: s.hhId, fate: 'standing' });
  }
  for (const [id, info] of sitesSeen) {
    if (info.fate !== 'standing' || grSites.some((s) => s.id === id)) continue;
    info.fate = grBuildings.some((b) => b.x === info.x && b.y === info.y) ? 'built' : 'gone without a granary at the spot (abandoned or swept away)';
  }
  // other workplaces and open improvement sites, for the projects gate
  row.facilitySites = world.sites.filter((s) => (['timber_yard', 'quarry', 'kiln', 'smithy', 'granary', 'bakery', 'mill', 'hall', 'mine', 'brewery'] as string[]).includes(s.type)).map((s) => s.type);
  row.facilityBuildings = world.buildings.filter((b) => facilityTypes.includes(b.type)).reduce((o, b) => { bump(o, b.type); return o; }, {} as Record<string, number>);
  // events mentioning a granary
  for (const ev of world.events) {
    if (ev.id <= lastEventId) continue;
    if (/granary|granaries/i.test(ev.text)) eventLog.push({ tick: ev.tick, text: ev.text });
  }
  if (world.events.length) lastEventId = Math.max(lastEventId, world.events[world.events.length - 1].id);
  samples.push(row);
}

// ───────────── the run ─────────────
const began = Date.now();
console.log(`${bare ? 'bare' : 'observed'} ${w.settings.seed} rules ${w.settings.rulesVersion} from tick ${startTick} (day ${round(startTick / DAY)}) to day ${days}; granary key ${GRANARY_KEY}, grain works wanted: ${wantsGrainWorks(w)}`);
let n = 0;
for (let i = w.tick + 1; i <= days * DAY; i++) {
  stepWorld(w);
  if (!bare && i % EVERY === 0) { sample(w, n % 5 === 0); n++; }
  if (i % (2 * DAY) === 0) console.log(`.. day ${i / DAY} of ${days}, ${Math.round((Date.now() - began) / 1000)}s`);
}
const endHash = hashWorld(w);
console.log(`hashWorld ${endHash} (${bare ? 'bare, no observation' : 'with observation'}) alive ${w.persons.filter((p) => p.alive).length}`);

if (!bare && out) {
  const granaryBlock = BUILD_DEF.granary;
  const lastRow = samples[samples.length - 1] as { refusalsCumulative: unknown };
  writeFileSync(out, JSON.stringify({
    seed: w.settings.seed, rulesVersion: w.settings.rulesVersion, loaded, startTick, endTick: w.tick, every: EVERY, endHash,
    granaryFootprint: { w: granaryBlock.w, h: granaryBlock.h, cost: granaryBlock.cost },
    bakeryFootprint: { w: BUILD_DEF.bakery.w, h: BUILD_DEF.bakery.h },
    hallFootprint: { w: BUILD_DEF.hall.w, h: BUILD_DEF.hall.h },
    gateTotalsOverAllPersonSamples: gateTotals,
    gateReplicaMismatches: mismatches,
    findBuildSpotAgreement: { checks: spotChecks, disagreements: spotMismatches },
    ranking: { offered: rankTotals.offered, top1: rankTotals.top1, meanRank: rankTotals.offered ? round(rankTotals.rankSum / rankTotals.offered) : 0, medianRank: median(rankTotals.ranks), meanUtilOfGranaryOption: rankTotals.utils.length ? round(rankTotals.utils.reduce((a, b) => a + b, 0) / rankTotals.utils.length) : 0, meanUtilOfTopOption: rankTotals.topUtils.length ? round(rankTotals.topUtils.reduce((a, b) => a + b, 0) / rankTotals.topUtils.length) : 0, whatBeatItWhenNotTop: rankTotals.topKinds },
    planSiteStarts: planStarts,
    planSiteEnds: planEnds,
    granaryPlanLog,
    granarySitesSeen: [...sitesSeen].map(([id, s]) => ({ id, ...s })),
    granaryEvents: eventLog,
    refusalsAtEnd: lastRow ? lastRow.refusalsCumulative : null,
    samples,
  }));
  console.log(`wrote ${out}`);
}
