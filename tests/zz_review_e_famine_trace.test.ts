// REVIEW DIAGNOSTIC (agent E). Loads the retained rules-107 forest save at tick 43,440 and runs one day under ITS rules,
// instrumenting activity endings and critical-hunger decisions. Writes a report to the review scratchpad. Changes nothing
// in the repository; the retained save is only read.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { deserializeWorld } from '../src/app/save';
import { stepWorld } from '../src/sim/world';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { foodUnits, invWeight } from '../src/sim/economy';
import { carryCap } from '../src/sim/people';
import { estimatedAmount, recentFailure } from '../src/sim/knowledge';
import { SOURCE_FOOD } from '../src/sim/food_help';
import { CRITICAL } from '../src/sim/constants';
import { regrowRate, winterDepth } from '../src/sim/hardship';
import type { Activity, Person, World } from '../src/sim/types';

const SAVE = 'autonomy_evidence/helper-receipt107-first-invalid/final.json';
const OUT = 'C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_e';
const TICKS = 2400;

const foodSource = (w: World, id: number) => {
  const e = w.byId.get(id);
  return e && e.ent === 'source' && SOURCE_FOOD[e.type] ? e : null;
};
const bump = (r: Record<string, number>, k: string, n = 1) => (r[k] = (r[k] ?? 0) + n);

function sourceStats(w: World) {
  const by: Record<string, { n: number; nonempty: number; amount: number; regrow: number }> = {};
  for (const s of w.sources) {
    if (!SOURCE_FOOD[s.type]) continue;
    const t = (by[s.type] ??= { n: 0, nonempty: 0, amount: 0, regrow: s.regrowEvery });
    t.n++;
    t.amount += s.amount;
    if (s.amount >= 1) t.nonempty++;
  }
  return by;
}

function nearestActual(w: World, p: Person) {
  let best: { d: number; id: number; amount: number; believed: number | null } | null = null;
  for (const s of w.sources) {
    if (!SOURCE_FOOD[s.type] || s.amount < 1) continue;
    const d = Math.hypot(s.x + 0.5 - p.x, s.y + 0.5 - p.y);
    if (!best || d < best.d) {
      const b = p.beliefs[s.id];
      best = { d, id: s.id, amount: s.amount, believed: b ? estimatedAmount(w, b) : null };
    }
  }
  return best;
}

function nearestBelieved(w: World, p: Person) {
  let best: { d: number; id: number; est: number; actual: number | null; failed: string | null } | null = null;
  let count = 0;
  for (const k in p.beliefs) {
    const b = p.beliefs[k as unknown as number];
    if (!SOURCE_FOOD[b.kind]) continue;
    const est = estimatedAmount(w, b);
    if (est < 1) continue;
    count++;
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (!best || d < best.d) {
      const e = w.byId.get(b.id);
      const f = recentFailure(w, p, b.id, 520);
      best = { d, id: b.id, est, actual: e && e.ent === 'source' ? e.amount : null, failed: f ? f.reason : null };
    }
  }
  return { best, count };
}

function runDay(label: string, prepare: (w: World) => void) {
  const raw = readFileSync(SAVE, 'utf8');
  const w = deserializeWorld(raw);
  prepare(w);
  const start = w.tick;
  expect(start).toBe(43440);
  expect(w.settings.rulesVersion).toBe(107);
  mkdirSync(OUT, { recursive: true });

  const ledger0 = JSON.parse(JSON.stringify(w.ledger));
  const facts0 = { tick: w.tick, alive: w.persons.filter((p) => p.alive).length, hardship: w.hardship ?? null, regrowRate: regrowRate(w), winterDepth: winterDepth(w), sources: sourceStats(w), meanHunger: 0 };
  facts0.meanHunger = w.persons.filter((p) => p.alive).reduce((s, p) => s + p.needs.hunger, 0) / facts0.alive;

  type StartInfo = { tick: number; kind: string; target: number; optKey: string | undefined; need: string | null; dist: number; est: number | null; actual: number | null; hunger: number; thirst: number; purpose: string | undefined };
  const starts = new Map<number, StartInfo>();
  const endings: any[] = [];
  const endingCounts: Record<string, number> = {};
  const gatherTravelBetter: any[] = [];
  const pendingNext = new Map<number, any>();
  let eatsCompleted = 0;
  let unitsEatenAtSource = 0;

  w.hooks = {
    onActivityStart: (p: Person, a: Activity) => {
      const src = foodSource(w, a.targetId);
      const b = p.beliefs[a.targetId];
      const info: StartInfo = { tick: w.tick, kind: a.kind, target: a.targetId, optKey: a.data.optKey, need: a.need, dist: Math.hypot(a.tx - p.x, a.ty - p.y), est: b && SOURCE_FOOD[b.kind] ? estimatedAmount(w, b) : null, actual: src ? src.amount : null, hunger: p.needs.hunger, thirst: p.needs.thirst, purpose: a.data.purpose };
      starts.set(p.id, info);
      const pend = pendingNext.get(p.id);
      if (pend) {
        pend.next = { kind: a.kind, label: a.label, target: a.targetId, optKey: a.data.optKey, need: a.need, dist: info.dist, foodSource: !!src, sameTarget: a.targetId === pend.target };
        pendingNext.delete(p.id);
      }
    },
    onActivityEnd: (p: Person, a: Activity, outcome, detail) => {
      const s = starts.get(p.id);
      const src = foodSource(w, a.targetId);
      const b = p.beliefs[a.targetId];
      const estNow = b && SOURCE_FOOD[b.kind] ? estimatedAmount(w, b) : null;
      const rec: any = { tick: w.tick, person: p.name, kind: a.kind, phase: a.phase, need: a.need, purpose: a.data.purpose, outcome, detail, took: w.tick - a.start, cycle: a.cycle, target: a.targetId, foodSource: !!src, distAtEnd: Math.hypot(a.tx - p.x, a.ty - p.y), distAtStart: s?.dist ?? null, estAtStart: s?.est ?? null, estNow, actualAtStart: s?.actual ?? null, actualNow: src ? src.amount : null, hunger: p.needs.hunger, thirst: p.needs.thirst, failure: p.failures[a.targetId] ? p.failures[a.targetId].reason : null, chosen: p.lastDecision?.chosen ? { kind: p.lastDecision.chosen.kind, label: p.lastDecision.chosen.label, utility: p.lastDecision.chosen.utility } : null, because: p.lastDecision?.because };
      bump(endingCounts, `${a.kind}|${a.phase}|${outcome}|${detail}`);
      if (a.kind === 'gather' && a.data.purpose === 'eat' && a.cycle > 0) {
        eatsCompleted++;
      }
      if ((a.kind === 'eat' || a.kind === 'eat_store') && a.cycle > 0) eatsCompleted++;
      if (a.kind === 'gather' && a.phase === 'travel' && outcome === 'interrupted' && detail === 'something better came up') {
        gatherTravelBetter.push(rec);
        pendingNext.set(p.id, rec);
      }
      if (endings.length < 4000) endings.push(rec);
    },
    onTransfer: () => {},
  };

  // per-tick occupancy of critical-hunger people, and periodic observer samples
  const critOccupancy: Record<string, number> = {};
  const critTicks: Record<string, number> = {};
  const samples: any[] = [];
  const sampleCounts: Record<string, number> = {};
  let sampleN = 0;
  const hungerPath: Record<string, number[]> = {};

  for (let i = 0; i < TICKS; i++) {
    for (const p of w.persons) {
      if (!p.alive) continue;
      if (p.needs.hunger < CRITICAL.hunger) {
        bump(critTicks, p.name);
        bump(critOccupancy, `${p.activity?.kind ?? 'none'}|${p.activity?.phase ?? 'none'}`);
      }
    }
    if ((w.tick - start) % 120 === 0) {
      for (const p of w.persons) {
        if (!p.alive) continue;
        (hungerPath[p.name] ??= []).push(Math.round(p.needs.hunger * 10) / 10);
        if (p.needs.hunger >= CRITICAL.hunger) continue;
        sampleN++;
        const ctx = generateOptions(w, p, true, true);
        const ranked = rankOptions(ctx);
        const allFood = ctx.options.filter((o) => o.need === 'hunger');
        const eligibleFood = ranked.filter((o) => o.need === 'hunger');
        const top = ranked[0];
        bump(sampleCounts, 'critical samples');
        if (!allFood.length) bump(sampleCounts, 'no food offer at all');
        if (!eligibleFood.length) bump(sampleCounts, 'no eligible food option');
        if (!eligibleFood.length) bump(sampleCounts, 'no eligible food: lead=' + (ctx.critical ?? 'none') + ' criticals=' + ctx.criticals.join('+') + ' top=' + (top?.kind ?? 'none'));
        bump(sampleCounts, 'top:' + (top?.kind ?? 'none'));
        bump(sampleCounts, 'current:' + (p.activity?.kind ?? 'none') + '|' + (p.activity?.phase ?? 'none'));
        if (invWeight(p) >= carryCap(w, p)) bump(sampleCounts, 'full pack');
        if (foodUnits(p.inv) > 0) bump(sampleCounts, 'carrying food');
        const na = nearestActual(w, p);
        const nb = nearestBelieved(w, p);
        if (na && na.d <= 10) bump(sampleCounts, 'actual nonempty food source within 10 tiles');
        if (na && na.d <= 10 && (na.believed ?? 0) < 1) bump(sampleCounts, 'actual nonempty within 10 but believed empty/unknown');
        if (nb.best && nb.best.actual !== null && nb.best.actual < 1) bump(sampleCounts, 'nearest believed-nonempty source is actually empty');
        if (samples.length < 400) samples.push({ tick: w.tick, name: p.name, hunger: Math.round(p.needs.hunger * 10) / 10, thirst: Math.round(p.needs.thirst * 10) / 10, energy: Math.round(p.needs.energy * 10) / 10, warmth: Math.round(p.needs.warmth * 10) / 10, health: Math.round(p.health), criticals: ctx.criticals, lead: ctx.critical, fullPack: invWeight(p) >= carryCap(w, p), food: foodUnits(p.inv), activity: p.activity ? { kind: p.activity.kind, phase: p.activity.phase, target: p.activity.targetId, label: p.activity.label, dist: Math.round(Math.hypot(p.activity.tx - p.x, p.activity.ty - p.y) * 10) / 10 } : null, top: ranked.slice(0, 3).map((o) => ({ kind: o.kind, label: o.label, need: o.need, eta: Math.round(o.eta), util: Math.round(o.util * 10) / 10 })), foodOptions: allFood.length, eligibleFood: eligibleFood.length, nearestActual: na ? { d: Math.round(na.d * 10) / 10, amount: na.amount, believed: na.believed } : null, nearestBelieved: nb.best ? { d: Math.round(nb.best.d * 10) / 10, est: nb.best.est, actual: nb.best.actual, failed: nb.best.failed } : null, believedNonemptyCount: nb.count, blocked: ctx.blocked.filter((o) => o.need === 'hunger' || o.tag === 'food').slice(0, 8).map((o) => `${o.label}: ${o.blocked}`) });
      }
    }
    stepWorld(w);
  }
  delete w.hooks;
  expect(w.tick).toBe(start + TICKS);

  const facts1 = { tick: w.tick, alive: w.persons.filter((p) => p.alive).length, hardship: w.hardship ?? null, regrowRate: regrowRate(w), winterDepth: winterDepth(w), sources: sourceStats(w), meanHunger: 0 };
  facts1.meanHunger = w.persons.filter((p) => p.alive).reduce((s, p) => s + p.needs.hunger, 0) / facts1.alive;
  const diff = (a: Record<string, number>, b: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = (b[k] ?? 0) - (a[k] ?? 0);
      if (d) out[k] = Math.round(d * 1000) / 1000;
    }
    return out;
  };
  const ledgerDiff = { created: diff(ledger0.created, w.ledger.created), consumed: diff(ledger0.consumed, w.ledger.consumed), spoiled: diff(ledger0.spoiled, w.ledger.spoiled), reasons: diff(ledger0.reasons, w.ledger.reasons) };

  // classify the gather-travel interruptions "something better came up"
  const cls: Record<string, number> = {};
  for (const r of gatherTravelBetter) {
    const sawEmpty = (r.estNow ?? 0) < 1;
    const failed = !!r.failure;
    const next = r.next;
    let k = sawEmpty ? 'target now believed empty' : failed ? 'target has a failure note' : 'target still believed nonempty';
    k += ' -> next=' + (next ? (next.kind === 'gather' ? (next.foodSource ? 'gather(food)' : 'gather(material)') : next.kind) : 'none');
    if (next && next.kind === 'gather' && !sawEmpty && !failed) k += next.dist < r.distAtEnd ? ' nearer' : ' farther';
    bump(cls, k);
  }
  const deaths = w.deceased.filter((d) => d.tick >= start).map((d) => ({ name: d.name, tick: d.tick, cause: d.cause }));
  const report = { save: SAVE, rulesVersion: w.settings.rulesVersion, start, end: w.tick, facts0, facts1, ledgerDiff, endingCounts, eatsCompleted, unitsEatenAtSource, critTicks, critOccupancy, gatherTravelBetterCount: gatherTravelBetter.length, gatherTravelBetterClasses: cls, gatherTravelBetterExamples: gatherTravelBetter.slice(0, 40), sampleN, sampleCounts, samples, hungerPath, deaths, endings: endings.slice(0, 1500) };
  writeFileSync(OUT + '/famine_trace_107' + label + '.json', JSON.stringify(report, null, 1));
  const lines = [
    `start ${start} end ${w.tick} alive ${facts0.alive}->${facts1.alive} meanHunger ${facts0.meanHunger.toFixed(1)}->${facts1.meanHunger.toFixed(1)}`,
    `hardship0 ${JSON.stringify(facts0.hardship)} regrow0 ${facts0.regrowRate} winter0 ${facts0.winterDepth}`,
    `hardship1 ${JSON.stringify(facts1.hardship)} regrow1 ${facts1.regrowRate} winter1 ${facts1.winterDepth}`,
    `sources0 ${JSON.stringify(facts0.sources)}`,
    `sources1 ${JSON.stringify(facts1.sources)}`,
    `ledger created diff ${JSON.stringify(ledgerDiff.created)}`,
    `ledger consumed diff ${JSON.stringify(ledgerDiff.consumed)}`,
    `ledger reasons diff ${JSON.stringify(ledgerDiff.reasons)}`,
    `eatsCompleted ${eatsCompleted}`,
    `critOccupancy ${JSON.stringify(critOccupancy)}`,
    `sampleCounts ${JSON.stringify(sampleCounts, null, 1)}`,
    `gatherTravelBetter ${gatherTravelBetter.length} classes ${JSON.stringify(cls, null, 1)}`,
    `endings:`,
    ...Object.entries(endingCounts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `  ${v} ${k}`),
    `deaths ${JSON.stringify(deaths)}`,
  ];
  writeFileSync(OUT + '/famine_trace_107_summary.txt', lines.join('\n'));
  console.log(lines.join('\n'));
  expect(existsSync(OUT + '/famine_trace_107' + label + '.json')).toBe(true);
}

it('traces one day of the retained rules-107 forest famine (diagnostic, writes a report)', () => {
  runDay('', () => {});
}, 180_000);

it('CONTRAST (diagnostic intervention on world state, not a rules change): the same day with the lean season removed', () => {
  runDay('_nolean', (w) => { delete w.hardship; });
}, 180_000);
