// SCRATCH ONLY (trip waste measurement, 18 November 2026). Writes out\trip-waste\tables.md from
//   Q1 loads and Q3 dropped walks: trips.jsonl of the nine controls in out\free (A, N1, N2 in three worlds), people of 12 and over,
//   Q2 withdraws: report.json and withdraws.jsonl of the three runs in out\trip-waste.
// The reading is TRIP_WASTE_READING.md with TRIP_WASTE_READING_AMENDMENT_1.md (question 1 replaced). node trip_waste_tables.mjs
import fs from 'node:fs';
import readline from 'node:readline';
const root = 'C:\\dev\\_claude_scratch\\regime-20261117';
const worlds = ['aspen', 'river', 'gen-4'];
const ctrl = ['A', 'N1', 'N2'];
const r3 = (x) => (x === null || x === undefined ? null : Math.round(x * 1000) / 1000);
const pct = (x) => (x === null || x === undefined ? 'n/a' : (x * 100).toFixed(1) + '%');
const share = (n, d) => (d > 0 ? n / d : null);

// item weights straight from the source file
const csrc = fs.readFileSync(`${root}\\wt\\src\\sim\\constants.ts`, 'utf8');
const wStart = csrc.indexOf('export const WEIGHT');
const wBlock = csrc.slice(csrc.indexOf('{', csrc.indexOf('=', wStart)) + 1, csrc.indexOf('};', wStart));
const WEIGHT = {};
for (const m of wBlock.replace(/\/\/.*$/gm, '').matchAll(/([a-z_]+)\s*:\s*(\d*\.?\d+)/g)) WEIGHT[m[1]] = Number(m[2]);

const FOOD = new Set(['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat', 'flour']);
const MATERIAL = new Set(['clay', 'ore', 'planks', 'handles', 'bricks', 'charcoal', 'iron', 'fibre', 'wool', 'hide', 'fat', 'offcuts', 'cutting']);
const TOOLS = new Set(['axe', 'pick', 'hoe', 'basket', 'hammer', 'rod', 'net', 'trap', 'saw', 'knife', 'spear', 'bow', 'cart', 'jar', 'shovel', 'sickle', 'adze']);
const packClass = (k) => (FOOD.has(k) ? 'food' : k === 'wood' ? 'wood' : k === 'stone' ? 'stone' : k === 'seeds' ? 'seeds' : MATERIAL.has(k) ? 'other materials' : TOOLS.has(k) ? 'tools' : 'other');
const PACK_CLASSES = ['food', 'wood', 'stone', 'other materials', 'tools', 'seeds', 'other'];
const norm = (s) => String(s ?? '').replace(/[0-9]+(\.[0-9]+)?/g, '#').slice(0, 70);

async function readTrips(file, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) { if (line) fn(JSON.parse(line)); }
}

const bump = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };

// ───────── Q1 and Q3 from the nine controls ─────────
const runs = {}; // world -> arm -> stats
for (const world of worlds) {
  runs[world] = {};
  for (const arm of ctrl) {
    const file = `${root}\\out\\free\\${world}-${arm}\\trips.jsonl`;
    const S = {
      walks: 0, ticks: 0, gather: 0, gatherDid: 0, gatherMeasured: 0, tiny: 0, tinyTicks: 0, tinyClass: {}, tinyClassTicks: {}, tinyPurpose: {}, tinyStype: {}, gatherTaken: {}, gatherPackWeightShare: {}, gatherPackN: 0,
      packClassWeight: Object.fromEntries(PACK_CLASSES.map((c) => [c, 0])), packWeightOverCap: 0, roomAtStart: {}, droppedTicks: 0, dropped: {}, droppedByKind: {}, noJobTicks: 0, noJob: {}, droppedGW: {}, droppedGWticks: 0, toKind: {}, byOutcomeTicks: {},
    };
    await readTrips(file, (t) => {
      if (t.stage !== '12_and_over' || t.leftCensored || t.outcome === 'censored') return;
      S.walks++; S.ticks += t.walkingTicks;
      bump(S.byOutcomeTicks, t.outcome, t.walkingTicks);
      if (t.kind === 'gather') {
        S.gather++;
        const pk = t.packStart;
        if (pk && pk.cap > 0) {
          S.gatherPackN++; S.packWeightOverCap += pk.weight / pk.cap;
          for (const [k, n] of Object.entries(pk.items)) S.packClassWeight[packClass(k)] += (n * (WEIGHT[k] ?? 1)) / pk.cap;
        }
        if (t.outcome === 'arrived_did_job' && t.moved && t.moved.units >= 1 && pk && t.moved.mainItem !== 'none') {
          S.gatherDid++;
          const T = t.moved.units, P = t.plannedUnits, w = WEIGHT[t.moved.mainItem] ?? 1;
          const R = Math.max(0, Math.floor((pk.cap - pk.weight + 1e-9) / w));
          bump(S.gatherTaken, T <= 5 ? String(T) : '6+');
          if (T <= 2) {
            const cls = R <= 2 ? 'pack full' : (P !== null && T < P) ? 'short of plan' : (P !== null && T === P && P <= 2) ? 'small plan' : 'other';
            S.tiny++; S.tinyTicks += t.walkingTicks; bump(S.tinyClass, cls); bump(S.tinyClassTicks, cls, t.walkingTicks);
            const m = /purpose=([^|]*)\|\s*stype=(.*)$/.exec(t.subKind ?? '');
            const purpose = m ? m[1].trim() : (t.subKind ?? 'none').slice(0, 30); const stype = m ? m[2].trim() : 'n/a';
            bump(S.tinyPurpose, purpose.replace(/to obtain food for .*/, 'care supply')); bump(S.tinyStype, stype);
          }
          bump(S.roomAtStart, R <= 2 ? 'room 0-2' : R <= 5 ? 'room 3-5' : 'room 6+');
        }
      }
      if (t.outcome === 'switched_mid_walk' || t.outcome === 'gave_up_before_arrival') {
        S.droppedTicks += t.walkingTicks;
        const key = `${t.kind}|${t.endOutcome} | ${norm(t.endDetail)}`;
        bump(S.dropped, key, t.walkingTicks); bump(S.droppedByKind, t.kind, t.walkingTicks);
        if (t.kind === 'gather' || t.kind === 'withdraw') { bump(S.droppedGW, `${t.endOutcome} | ${norm(t.endDetail)}`, t.walkingTicks); S.droppedGWticks += t.walkingTicks; }
        if (t.outcome === 'switched_mid_walk') bump(S.toKind, `${t.kind} -> ${t.toKind || 'none'}`, t.walkingTicks);
      }
      if (t.outcome === 'arrived_no_job') { S.noJobTicks += t.walkingTicks; bump(S.noJob, `${t.kind}|${t.endOutcome} | ${norm(t.endDetail)}`, t.walkingTicks); }
    });
    runs[world][arm] = S;
    console.error(`read ${world}-${arm}: ${S.walks} walks`);
  }
}

const pooled = (world) => {
  const P = { walks: 0, ticks: 0, gather: 0, gatherDid: 0, tiny: 0, tinyTicks: 0, tinyClass: {}, tinyPurpose: {}, tinyStype: {}, gatherTaken: {}, dropped: {}, droppedTicks: 0, droppedGW: {}, droppedGWticks: 0, droppedByKind: {}, toKind: {}, roomAtStart: {}, packClassWeight: Object.fromEntries(PACK_CLASSES.map((c) => [c, 0])), packWeightOverCap: 0, gatherPackN: 0, noJobTicks: 0, noJob: {} };
  for (const arm of ctrl) {
    const S = runs[world][arm];
    for (const k of ['walks', 'ticks', 'gather', 'gatherDid', 'tiny', 'tinyTicks', 'droppedTicks', 'droppedGWticks', 'packWeightOverCap', 'gatherPackN', 'noJobTicks']) P[k] += S[k];
    for (const k of ['tinyClass', 'tinyPurpose', 'tinyStype', 'gatherTaken', 'dropped', 'droppedGW', 'droppedByKind', 'toKind', 'roomAtStart', 'noJob']) for (const [a, b] of Object.entries(S[k])) bump(P[k], a, b);
    for (const c of PACK_CLASSES) P.packClassWeight[c] += S.packClassWeight[c];
  }
  return P;
};
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);

// ───────── Q2 from the three new runs ─────────
const q2 = {};
for (const world of worlds) {
  const dir = `${root}\\out\\trip-waste\\${world}-A`;
  if (!fs.existsSync(`${dir}\\report.json`)) { q2[world] = null; continue; }
  const rep = JSON.parse(fs.readFileSync(`${dir}\\report.json`, 'utf8'));
  q2[world] = { rep, wc: rep.withdrawCheck, self: rep.withdrawCheckSelf, hash: rep.hash, purity: rep.purityChecks, conservation: rep.conservation.ok, adultTicks: rep.tripShape.counts.byStage['12_and_over'].walkingTicks };
}
const EXPECT = { aspen: '168d98f7', river: '8f513a37', 'gen-4': '523f2943' };

// ───────── write ─────────
const L = [];
const out = (s = '') => L.push(s);
out('# Trip waste measurement: tables (SCRATCH ONLY, 18 November 2026)');
out('');
out('Reading: `READING.md` (SHA-256 `c223694b8482d55675cb174633956f6d52b033d20fab677e33b2a5625dadc47d`) with `READING_AMENDMENT_1.md` (question 1 replaced; SHA-256 `ad35c7f96e529a1569d96a184fed1feef7b014574ba09a595cff8e7db09b897f`). Rules 250, day 48 saves, 30 days, one run per arm. Questions 1 and 3 read the nine control runs of `out\\free` (A, N1, N2), question 2 the three new runs. People of 12 and over, walks closed and not under way at the first sample. One run per arm is a description, never a rate. No benefit claim.');
out('');

// Q1
out('## Question 1: loads (gather walks that did their job and took at least one unit)');
out('');
out('| world | run | gather walks | did job, took >=1 | tiny (T<=2) | share tiny | pack full | short of plan | small plan | other | tiny walking ticks / all walking ticks |');
out('|---|---|---|---|---|---|---|---|---|---|---|');
const q1verdict = {};
for (const world of worlds) {
  for (const arm of ctrl) {
    const S = runs[world][arm];
    const c = S.tinyClass;
    out(`| ${world} | ${arm} | ${S.gather} | ${S.gatherDid} | ${S.tiny} | ${pct(share(S.tiny, S.gatherDid))} | ${c['pack full'] ?? 0} | ${c['short of plan'] ?? 0} | ${c['small plan'] ?? 0} | ${c.other ?? 0} | ${pct(share(S.tinyTicks, S.ticks))} |`);
  }
  const P = pooled(world), c = P.tinyClass;
  out(`| ${world} | **pooled** | ${P.gather} | ${P.gatherDid} | ${P.tiny} | ${pct(share(P.tiny, P.gatherDid))} | ${pct(share(c['pack full'] ?? 0, P.tiny))} | ${pct(share(c['short of plan'] ?? 0, P.tiny))} | ${pct(share(c['small plan'] ?? 0, P.tiny))} | ${pct(share(c.other ?? 0, P.tiny))} | ${pct(share(P.tinyTicks, P.ticks))} |`);
  q1verdict[world] = { pack: share(c['pack full'] ?? 0, P.tiny), plan: share(c['small plan'] ?? 0, P.tiny), place: share(c['short of plan'] ?? 0, P.tiny) };
}
const count = (f) => worlds.filter(f).length;
const q1 = count((w) => (q1verdict[w].pack ?? 0) >= 0.5) >= 2 ? 'TINY LOADS ARE THE PACK' : count((w) => (q1verdict[w].plan ?? 0) >= 0.5) >= 2 ? 'TINY LOADS ARE THE PLAN' : count((w) => (q1verdict[w].place ?? 0) >= 0.5) >= 2 ? 'TINY LOADS ARE THE PLACE' : 'MIXED';
out('');
out(`**Verdict, question 1: ${q1}** (pooled shares of the tiny gathers; pack full ${worlds.map((w) => pct(q1verdict[w].pack)).join(' / ')}, small plan ${worlds.map((w) => pct(q1verdict[w].plan)).join(' / ')}, short of plan ${worlds.map((w) => pct(q1verdict[w].place)).join(' / ')}, in ${worlds.join(' / ')}).`);
out('');
out('Units taken by a gather that did its job (pooled), room at the start of the walk, what the pack held, and what the tiny gathers were for:');
out('');
out('| world | taken 1 | 2 | 3 | 4 | 5 | 6+ | room 0-2 | room 3-5 | room 6+ | pack weight / capacity at start | in it: food | wood | stone | other materials | tools | seeds | other |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const world of worlds) {
  const P = pooled(world), g = P.gatherTaken, r = P.roomAtStart, n = P.gatherPackN;
  out(`| ${world} | ${g['1'] ?? 0} | ${g['2'] ?? 0} | ${g['3'] ?? 0} | ${g['4'] ?? 0} | ${g['5'] ?? 0} | ${g['6+'] ?? 0} | ${r['room 0-2'] ?? 0} | ${r['room 3-5'] ?? 0} | ${r['room 6+'] ?? 0} | ${pct(share(P.packWeightOverCap, n))} | ${PACK_CLASSES.map((c) => pct(share(P.packClassWeight[c], n))).join(' | ')} |`);
}
out('');
for (const world of worlds) {
  const P = pooled(world);
  out(`- ${world}, tiny gathers by purpose: ${top(P.tinyPurpose, 6).map(([k, v]) => `${k} ${v}`).join('; ')}. By source type: ${top(P.tinyStype, 8).map(([k, v]) => `${k} ${v}`).join('; ')}.`);
}
out('');

// Q2
out('## Question 2: withdraws (the three new runs; people of 12 and over)');
out('');
out('| world | end hash | expected (control A) | equal | purity | conservation | withdraw ticks WithdrawCheck = TripShape | withdraws | took all | took some | took none, empty | took none, other | ended before arrival | open at end |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const world of worlds) {
  const x = q2[world];
  if (!x) { out(`| ${world} | missing | ${EXPECT[world]} | | | | | | | | | | | |`); continue; }
  const a = x.wc.adults, n = a.byResult.count;
  out(`| ${world} | ${x.hash} | ${EXPECT[world]} | ${x.hash === EXPECT[world]} | ${x.purity} | ${x.conservation} | ${x.self.equal} (${x.self.withdrawTravelTicksWithdrawCheck}) | ${a.byResult.withdraws} | ${n.took_all ?? 0} | ${n.took_some ?? 0} | ${n.took_none_empty ?? 0} | ${n.took_none_other ?? 0} | ${n.ended_before_arrival ?? 0} | ${n.censored ?? 0} |`);
}
out('');
out('The empty withdraws (arrived, "there was nothing to take"), by what was true:');
out('');
out('| world | empty withdraws | stale at departure | (with a belief of 1+ unit) | drained on the way | emptied while waiting | stock there, nothing allowed | glance (belief 1, true 2+) | belief age median (ticks) | walking ticks of the empty ones | share of all adult withdraw walking ticks | share of all adult walking ticks |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|');
const q2verdict = {};
for (const world of worlds) {
  const x = q2[world]; if (!x) continue;
  const e = x.wc.adults.emptyWithdraws, w = e.why.count, n = e.count;
  out(`| ${world} | ${n} | ${w.stale_at_departure ?? 0} | ${e.staleAtDepartureWithABeliefOfOneOrMoreUnits} | ${w.drained_on_the_way ?? 0} | ${w.emptied_while_waiting ?? 0} | ${w.stock_there_nothing_allowed ?? 0} | ${e.glance.count} (${pct(e.glance.share)}) | ${e.beliefAgeTicks.median} | ${e.travelTicks} | ${pct(e.shareOfAllWithdrawTravelTicks)} | ${pct(share(e.travelTicks, x.adultTicks))} |`);
  q2verdict[world] = { stale: share(e.staleAtDepartureWithABeliefOfOneOrMoreUnits, n), race: share((w.drained_on_the_way ?? 0) + (w.emptied_while_waiting ?? 0), n), access: share(w.stock_there_nothing_allowed ?? 0, n) };
}
const q2v = count((w) => (q2verdict[w]?.stale ?? 0) >= 0.5) >= 2 ? 'EMPTY WITHDRAWS ARE STALE BELIEF' : count((w) => (q2verdict[w]?.race ?? 0) >= 0.5) >= 2 ? 'EMPTY WITHDRAWS ARE A RACE' : count((w) => (q2verdict[w]?.access ?? 0) >= 0.5) >= 2 ? 'EMPTY WITHDRAWS ARE ACCESS' : 'MIXED';
out('');
out(`**Verdict, question 2: ${q2v}** (stale with a belief ${worlds.map((w) => pct(q2verdict[w]?.stale)).join(' / ')}, race ${worlds.map((w) => pct(q2verdict[w]?.race)).join(' / ')}, access ${worlds.map((w) => pct(q2verdict[w]?.access)).join(' / ')}, in ${worlds.join(' / ')}, as shares of the empty withdraws).`);
out('');
for (const world of worlds) {
  const x = q2[world]; if (!x) continue;
  const a = x.wc.adults;
  out(`### ${world}`);
  out('');
  out(`- Store class (result counts): ${Object.entries(a.byStoreClass).map(([k, v]) => `${k}: all ${v.all}, took all ${v.took_all ?? 0}, empty ${v.took_none_empty ?? 0}, before arrival ${v.ended_before_arrival ?? 0}`).join('; ')}.`);
  out(`- Building type: ${Object.entries(a.byBuildingType).sort((p, q) => q[1].all - p[1].all).slice(0, 8).map(([k, v]) => `${k}: all ${v.all}, empty ${v.took_none_empty ?? 0}`).join('; ')}.`);
  out(`- Belief class at departure (all withdraws): ${Object.entries(a.byBeliefClass).map(([k, v]) => `${k}: all ${v.all}, empty ${v.took_none_empty ?? 0}`).join('; ')}. Glance among all withdraws: ${a.glanceAmongAllWithdraws.count} (${pct(a.glanceAmongAllWithdraws.share)}).`);
  out(`- Pack room for the wanted kind at departure: ${Object.entries(a.byPackRoom).map(([k, v]) => `${k}: all ${v.all}, took none ${(v.took_none_empty ?? 0) + (v.took_none_other ?? 0)}`).join('; ')}. Units wanted median ${a.unitsWanted.median} (mean ${a.unitsWanted.mean}); units taken when something was taken median ${a.unitsTaken.median} (mean ${a.unitsTaken.mean}).`);
  out(`- Repeat empties at the same place: ${a.emptyWithdraws.repeatEmptiesAtTheSamePlace.secondOrLaterEmptyWalks} second-or-later empty walks, ${a.emptyWithdraws.repeatEmptiesAtTheSamePlace.byADifferentPerson} by a different person than the last; ticks from the last empty end to the next walk start: median ${a.emptyWithdraws.repeatEmptiesAtTheSamePlace.ticksFromTheLastEmptyEndToTheNextWalkStart.median}.`);
  out(`- Belief source of the empty ones: ${JSON.stringify(a.emptyWithdraws.beliefSource)}; belief age (ticks) p25/median/p75: ${a.emptyWithdraws.beliefAgeTicks.p25}/${a.emptyWithdraws.beliefAgeTicks.median}/${a.emptyWithdraws.beliefAgeTicks.p75}.`);
  out(`- What the withdraws were for (top goals): ${a.topGoals.slice(0, 8).map(([k, v]) => `${k} ${v}`).join('; ')}.`);
  out('');
}

// Q3
out('## Question 3: walks dropped before arrival (nine controls, pooled by world)');
out('');
out('| world | walks | walking ticks | dropped walks, ticks | share of all walking ticks | of which gather+withdraw: ticks | the place looked empty | something better came up + switched to something else | danger nearby | other reasons | arrived, no job: ticks | share of all walking ticks |');
out('|---|---|---|---|---|---|---|---|---|---|---|---|');
const q3verdict = {};
for (const world of worlds) {
  const P = pooled(world), d = P.droppedGW, g = P.droppedGWticks;
  const empty = d['interrupted | the place looked empty'] ?? 0;
  const review = (d['interrupted | something better came up'] ?? 0) + (d['interrupted | switched to something else'] ?? 0);
  const danger = d['interrupted | danger nearby'] ?? 0;
  out(`| ${world} | ${P.walks} | ${P.ticks} | ${P.droppedTicks} | ${pct(share(P.droppedTicks, P.ticks))} | ${g} | ${pct(share(empty, g))} | ${pct(share(review, g))} | ${pct(share(danger, g))} | ${pct(share(g - empty - review - danger, g))} | ${P.noJobTicks} | ${pct(share(P.noJobTicks, P.ticks))} |`);
  q3verdict[world] = { empty: share(empty, g), review: share(review, g) };
}
const q3 = count((w) => (q3verdict[w].empty ?? 0) >= 0.5) >= 2 ? 'DROPPED WALKS ARE FOUND-EMPTY' : count((w) => (q3verdict[w].review ?? 0) >= 0.5) >= 2 ? 'DROPPED WALKS ARE REVIEW SWITCHES' : 'MIXED';
out('');
out(`**Verdict, question 3: ${q3}** (gather and withdraw walks ended before arrival, by walking ticks: the place looked empty ${worlds.map((w) => pct(q3verdict[w].empty)).join(' / ')}, review switches ${worlds.map((w) => pct(q3verdict[w].review)).join(' / ')}, in ${worlds.join(' / ')}).`);
out('');
for (const world of worlds) {
  const P = pooled(world);
  out(`- ${world}, dropped walking ticks by kind: ${top(P.droppedByKind, 7).map(([k, v]) => `${k} ${v}`).join('; ')}. Largest switches (from -> to, ticks): ${top(P.toKind, 6).map(([k, v]) => `${k} ${v}`).join('; ')}.`);
  out(`  Reasons, top (kind | outcome | detail, ticks): ${top(P.dropped, 7).map(([k, v]) => `${k} ${v}`).join('; ')}.`);
}
out('');

// walking ticks lost, per world, in the A runs
out('## Walking ticks counted as waste, as a share of all walking ticks of people of 12 and over (arm A of each world; the three overlap and are not added)');
out('');
out('| world | withdraws that took none, empty | gathers that took 2 units or fewer | walks dropped before arrival (all kinds) | walks that arrived with no job (all kinds) |');
out('|---|---|---|---|---|');
for (const world of worlds) {
  const S = runs[world].A, x = q2[world];
  out(`| ${world} | ${x ? pct(share(x.wc.adults.emptyWithdraws.travelTicks, x.adultTicks)) : 'n/a'} | ${pct(share(S.tinyTicks, S.ticks))} | ${pct(share(S.droppedTicks, S.ticks))} | ${pct(share(S.noJobTicks, S.ticks))} |`);
}
out('');
out('The first column reads the new runs (their own walking ticks as the denominator); the other three read the control A runs of `out\\free`, which the new runs equal by hash, so the denominators agree.');
out('');
out('## Arrived with no job: what the walks were (nine controls pooled)');
out('');
for (const world of worlds) {
  const P = pooled(world);
  out(`- ${world}: ${top(P.noJob, 8).map(([k, v]) => `${k} ${v}`).join('; ')}.`);
}
fs.writeFileSync(`${root}\\out\\trip-waste\\tables.md`, L.join('\n') + '\n');
console.log(`wrote tables.md: ${L.length} lines; verdicts: Q1 ${q1} | Q2 ${q2v} | Q3 ${q3}`);
