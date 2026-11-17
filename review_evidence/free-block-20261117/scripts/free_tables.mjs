// SCRATCH ONLY. Tables and the fixed reading for the free block runs. node free_tables.mjs > out\free\tables.md
// Reads out\free\<world>-<arm>\report.json (and trips.jsonl) for worlds aspen, river, gen-4 and arms A, N1, N2, D, E, plus aspen-Drepeat.
// The reading is the one fixed in FREE_BLOCK_BRIEF.md before any run; the thresholds in it (8 points, 2 deaths, 3 points, 60 percent) are
// Claude's proposals, accepted by Ryan on 17 November 2026 (brain note, eighth checkpoint). One run per arm is a description, never a rate.
import { readFileSync, existsSync } from 'node:fs';
const R = 'C:/dev/_claude_scratch/regime-20261117/out/free';
const WORLDS = ['aspen', 'river', 'gen-4'];
const ARMS = ['A', 'N1', 'N2', 'D', 'E'];
const EXPECT_A = { aspen: '168d98f7', river: '8f513a37', 'gen-4': '523f2943' };
const pct = (n, d) => (d ? (100 * n / d) : NaN);
const f1 = (x) => (x == null || Number.isNaN(+x) ? '-' : (+x).toFixed(1));
const f2 = (x) => (x == null || Number.isNaN(+x) ? '-' : (+x).toFixed(2));
const row = (c) => '| ' + c.join(' | ') + ' |';
const table = (head, rows) => { console.log(row(head)); console.log(row(head.map(() => '---'))); for (const x of rows) console.log(row(x)); console.log(''); };
const json = (f) => JSON.parse(readFileSync(f, 'utf8'));
const lines = (f) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const FOOD = new Set(['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat', 'rendered_fat']);
const CATS = ['travel', 'work', 'social_contact', 'leisure', 'waiting', 'rest', 'idle', 'eating_drinking_warming'];

const runs = {};
const missing = [];
for (const w of WORLDS) for (const a of [...ARMS, ...(w === 'aspen' ? ['Drepeat'] : [])]) {
  const dir = `${R}/${w}-${a}`;
  if (!existsSync(`${dir}/report.json`)) { missing.push(`${w}-${a}`); continue; }
  const r = json(dir + '/report.json');
  const trips = existsSync(`${dir}/trips.jsonl`) ? lines(`${dir}/trips.jsonl`) : [];
  runs[`${w}-${a}`] = { world: w, arm: a, r, trips };
}
const get = (w, a) => runs[`${w}-${a}`];

// ───────── derived measures for one run ─────────
function measures(x) {
  const r = x.r, ds = r.dayShape, fw = r.freeWindow, tb = r.timeBudget;
  const wk = ds.hungryTime.wakingByHunger;
  const split = (stage) => { const rows = wk.filter((q) => !stage || q.stage === stage); const t = rows.reduce((n, q) => n + q.ticks, 0); const m = {}; for (const q of rows) m[q.category] = (m[q.category] ?? 0) + q.ticks; return { t, m }; };
  const s12 = split('12_and_over'), sAll = split('');
  const share = (s, c) => pct(s.m[c] ?? 0, s.t);
  const other = (s) => 100 - CATS.reduce((n, c) => n + share(s, c), 0);
  const b12 = fw.bands['12_and_over'], bu = fw.bands.under_12;
  const oc = r.outdoor.shares.all;
  const last = ds.foodWhereItIs.daily[ds.foodWhereItIs.daily.length - 1];
  const heads = last.heads || 1;
  const gran = (last.otherBuildingsByType?.granary ?? 0) / heads;
  const headDays = r.tripShape.livingPersonTicks / 2400;
  const t = x.trips.filter((q) => !q.leftCensored && q.outcome !== 'censored');
  const g = t.filter((q) => q.kind === 'gather');
  let food = 0, wood = 0, units = 0, unit12 = 0;
  for (const q of g) for (const [k, v] of Object.entries(q.moved?.byItem ?? {})) { units += v; if (q.stage === '12_and_over') unit12 += v; if (FOOD.has(k)) food += v; if (k === 'wood') wood += v; }
  const done = t.filter((q) => q.outcome === 'arrived_did_job' && q.endOutcome === 'success');
  const win = (k) => fw.windows[k];
  const sleepIn = (k) => pct(win(k).allByCategory.sleep ?? 0, win(k).personTicks);
  const p = r.people;
  return {
    life12: share(s12, 'social_contact') + share(s12, 'leisure'), lifeAll: share(sAll, 'social_contact') + share(sAll, 'leisure'),
    s12, sAll, share, other,
    company12: pct(b12.company, b12.waking), companyAll: 100 * oc.company,
    hungryNoFood12: pct(b12.hungryNoFood, b12.waking), hungryNoFoodAll: pct(b12.hungryNoFood + bu.hungryNoFood, b12.waking + bu.waking),
    foodEnd: { packs: last.perHead.packs, homes: last.perHead.homeStores, granary: gran, otherBuildings: last.perHead.otherBuildings, held: last.perHead.heldTotal, heads },
    foodGathered: food / headDays, woodGathered: wood / headDays, unitsShare12: pct(unit12, units), jobs: done.filter((q) => q.lifeGroup === 'work').length / headDays, jobsAll: done.length / headDays,
    sleepD: sleepIn('D'), sleepE: sleepIn('E'),
    people: p, deaths: p.died,
    checks: { stop: r.stop, conservation: r.conservation.ok, purity: r.purityChecks, travel: r.travelCheck.equal, lifeTally: r.lifeTallyCheck.equal, window: r.windowCheck.equal, dayShape: Object.values(ds.selfChecks).every(Boolean), trip: Object.values(r.tripShape.selfChecks).every(Boolean), wake12: b12.waking === s12.t },
  };
}
for (const k of Object.keys(runs)) runs[k].m = measures(runs[k]);

if (missing.length) console.log(`MISSING RUNS (no report.json): ${missing.join(', ')}\n`);

// ───────── 1. checks ─────────
console.log('## Checks\n');
const ok = (b) => (b ? 'ok' : 'FAIL');
table(['run', 'arm flags', 'end hash', 'stop', 'conservation', 'purity checks', 'travel totals equal', 'LifeTally equal', 'window check equal', 'DayShape self checks', 'TripShape self checks', 'waking 12+ equal', 'people start', 'end', 'born', 'came', 'died', 'causes', 'plenty factors', 'seconds'],
  Object.entries(runs).map(([k, x]) => { const m = x.m, c = m.checks, p = m.people; return [k, `${x.r.blockFrom !== null ? '--block-from ' + x.r.blockFrom : ''}${x.r.nudge ? ' --nudge ' + x.r.nudge : ''}`.trim() || '(none)', x.r.hash, c.stop, ok(c.conservation), c.purity, ok(c.travel), ok(c.lifeTally), ok(c.window), ok(c.dayShape), ok(c.trip), ok(c.wake12), p.start, p.end, p.born, p.came, p.died, Object.entries(p.causes).map(([a, b]) => `${a} ${b}`).join(', ') || '-', JSON.stringify(x.r.plentyFactors), x.r.seconds]; }));
console.log('### The four hash equality checks\n');
for (const w of WORLDS) { const a = get(w, 'A'); console.log(`- ${w} A ends on ${a ? a.r.hash : 'MISSING'}; expected ${EXPECT_A[w]}: ${a ? (a.r.hash === EXPECT_A[w] ? 'EQUAL' : 'DIFFERENT') : 'not run'}.`); }
{ const d = get('aspen', 'D'), d2 = get('aspen', 'Drepeat'); console.log(`- aspen D ends on ${d ? d.r.hash : 'MISSING'}; the repeat ends on ${d2 ? d2.r.hash : 'MISSING'}: ${d && d2 ? (d.r.hash === d2.r.hash ? 'EQUAL' : 'DIFFERENT') : 'not run'}.`); }
console.log('- All of the start hashes of one world (the save as loaded): ' + WORLDS.map((w) => `${w} ${[...new Set(ARMS.map((a) => get(w, a)?.r.startHash).filter(Boolean))].join('/')}`).join('; ') + '.\n');

// ───────── 2. main table ─────────
const present = (w) => ARMS.filter((a) => get(w, a));
console.log('## Main table, people aged 12 and over (share of their waking ticks, per cent)\n');
table(['world', 'arm', ...CATS, 'other', 'LIFE (social + leisure)', 'outdoor company', 'hungry, no food in pack or home', 'sleep before bedtime, window D (% of window ticks)', 'window E'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m; return [w, a, ...CATS.map((c) => f1(m.share(m.s12, c))), f1(m.other(m.s12)), f1(m.life12), f1(m.company12), f1(m.hungryNoFood12), f1(m.sleepD), f1(m.sleepE)]; })));
console.log('## The same for everyone (per cent of waking ticks)\n');
table(['world', 'arm', ...CATS, 'other', 'LIFE (social + leisure)', 'outdoor company', 'hungry, no food in pack or home'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m; return [w, a, ...CATS.map((c) => f1(m.share(m.sAll, c))), f1(m.other(m.sAll)), f1(m.lifeAll), f1(m.companyAll), f1(m.hungryNoFoodAll)]; })));
console.log('## Food, work and people (everyone; food at the end of day 30; gathered and jobs are a head a day)\n');
table(['world', 'arm', 'food held a head, end', 'in packs', 'in home stores', 'in granaries', 'in other buildings (incl. cellars, granaries)', 'food gathered', 'wood gathered', 'share of gathered units by 12 and over %', 'work jobs finished (TripShape life kind work)', 'all jobs finished', 'people start', 'people end', 'died', 'causes'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m, f = m.foodEnd; return [w, a, f2(f.held), f2(f.packs), f2(f.homes), f2(f.granary), f2(f.otherBuildings), f2(m.foodGathered), f2(m.woodGathered), f1(m.unitsShare12), f2(m.jobs), f2(m.jobsAll), m.people.start, m.people.end, m.people.died, Object.entries(m.people.causes).map(([x, y]) => `${x} ${y}`).join(', ') || '-']; })));
console.log('The window columns are the share of person-ticks of people aged 12 and over inside that window (from F to their own bedtime) that are asleep. "Food gathered" and "wood gathered" are units a head a day from TripShape (gather walks that ended inside the run), as scripts out\\pace\\tables.md counted them. "Other buildings" include cellars and granaries; "in granaries" is the granary part of it, from the same daily food row.\n');

// ───────── 3. window table ─────────
console.log('## Window table: where the predicate holds (people aged 12 and over, per world, arm and window)\n');
console.log('Window D starts at day fraction 0.62, window E at 0.50, each until the person\'s own bedtime (0.8 + chrono). Both windows are accounted in every run, gate on or off. A person-tick is counted whether the person is asleep or awake. "Holds" means the gate would apply: no need under its CRITICAL level and, as that person believes it, at least one day (4 units) of food a head in their household.\n');
const own = (a) => (a === 'D' || a === 'Drepeat' ? 'D' : a === 'E' ? 'E' : '');
const keysAll = Object.keys(runs);
table(['run', 'window', 'window person-ticks', 'holds %', 'fails: urgent need only %', 'household short only %', 'both %', 'holding ticks: outdoor company %', 'gate on in this run for this window'],
  keysAll.flatMap((k) => ['D', 'E'].map((win) => { const x = runs[k], v = x.r.freeWindow.windows[win], n = v.personTicks; return [k, win, n, f1(100 * v.holdShare), f1(pct(v.fail.urgentOnly, n)), f1(pct(v.fail.shortOnly, n)), f1(pct(v.fail.both, n)), f1(100 * v.holdOutdoorCompanyShare), own(x.arm) === win ? 'yes (its own window)' : '']; })));
const WCATS = ['travel', 'work', 'social_contact', 'leisure', 'waiting', 'rest', 'idle', 'eating_drinking_warming', 'sleep', 'failure_recovery', 'defence'];
console.log('### The holding ticks by TimeBudget category (% of holding ticks)\n');
table(['run', 'window', 'holding ticks', ...WCATS],
  keysAll.flatMap((k) => ['D', 'E'].map((win) => { const v = runs[k].r.freeWindow.windows[win]; return [k, win, v.holds, ...WCATS.map((c) => f1(pct(v.holdByCategory[c] ?? 0, v.holds)))]; })));
console.log('### The holding ticks by activity kind: the ten largest (% of holding ticks)\n');
table(['run', 'window', 'ten largest kinds'],
  keysAll.flatMap((k) => ['D', 'E'].map((win) => { const v = runs[k].r.freeWindow.windows[win]; return [k, win, v.holdByKind.slice(0, 10).map((q) => `${q.key} ${f1(pct(q.ticks, v.holds))}`).join(', ')]; })));
console.log('### What the gate did in the runs where it was on (counts of calls to rankOptions, which include the 600 observer samples)\n');
table(['run', 'calls with the gate on', 'calls where it applied', 'options removed', 'running activity kept (exempt)', 'removed by kind'],
  keysAll.filter((k) => runs[k].r.blockFrom !== null).map((k) => { const s = runs[k].r.freeBlock.stats; return [k, s.calls, s.applied, s.removed, s.exemptRunning, Object.entries(s.removedByKind).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(', ')]; }));

// ───────── 4. the fixed reading ─────────
console.log('## The fixed reading, applied\n');
console.log('Measures are for people aged 12 and over. life = social_contact + leisure, share of waking time. Noise, per world and measure, is the larger of |N1 - A| and |N2 - A|. Survival holds for an arm in a world when deaths <= the highest of A, N1, N2 plus 2, and hungry-with-no-food share <= A + noise + 3 points.\n');
const verdict = {};
const rowsV = [];
for (const w of WORLDS) {
  const a = get(w, 'A'), n1 = get(w, 'N1'), n2 = get(w, 'N2'), d = get(w, 'D'), e = get(w, 'E');
  if (!(a && n1 && n2)) { rowsV.push([w, 'incomplete (a control is missing)']); verdict[w] = null; continue; }
  const noise = (f) => Math.max(Math.abs(f(n1.m) - f(a.m)), Math.abs(f(n2.m) - f(a.m)));
  const nLife = noise((m) => m.life12), nHun = noise((m) => m.hungryNoFood12);
  const maxDeaths = Math.max(a.m.deaths, n1.m.deaths, n2.m.deaths);
  const surv = (x) => (x ? { deaths: x.m.deaths, hun: x.m.hungryNoFood12, ok: x.m.deaths <= maxDeaths + 2 && x.m.hungryNoFood12 <= a.m.hungryNoFood12 + nHun + 3 } : null);
  const sD = surv(d), sE = surv(e);
  const holdE = e ? 100 * e.r.freeWindow.windows.E.holdShare : NaN;
  const hv = e ? e.r.freeWindow.windows.E : null;
  const fillTicks = hv ? (hv.holdByCategory.waiting ?? 0) + (hv.holdByCategory.idle ?? 0) + (hv.holdByCategory.rest ?? 0) + (hv.holdByCategory.sleep ?? 0) : NaN;
  verdict[w] = {
    survivalFailsE: sE ? !sE.ok : null,
    rarelyActive: e ? holdE < 60 : null,
    lifeE: e ? e.m.life12 - a.m.life12 : NaN, lifeD: d ? d.m.life12 - a.m.life12 : NaN,
    opens: e && d ? (e.m.life12 - a.m.life12 >= 8 && e.m.life12 - a.m.life12 > nLife && d.m.life12 - a.m.life12 > nLife && sE.ok && sD.ok) : null,
    nothingFills: e ? (holdE >= 60 && fillTicks > hv.holds / 2) : null,
  };
  rowsV.push([w, f1(a.m.life12), f1(n1.m.life12), f1(n2.m.life12), f1(d?.m.life12), f1(e?.m.life12), f1(nLife), f1(a.m.hungryNoFood12), f1(n1.m.hungryNoFood12), f1(n2.m.hungryNoFood12), f1(d?.m.hungryNoFood12), f1(e?.m.hungryNoFood12), f1(nHun), `${a.m.deaths}/${n1.m.deaths}/${n2.m.deaths}/${d?.m.deaths ?? '-'}/${e?.m.deaths ?? '-'}`, sD ? (sD.ok ? 'holds' : 'FAILS') : '-', sE ? (sE.ok ? 'holds' : 'FAILS') : '-', f1(holdE), f1(hv ? pct(fillTicks, hv.holds) : NaN)]);
}
table(['world', 'life A', 'N1', 'N2', 'D', 'E', 'noise (life)', 'hungry no food A', 'N1', 'N2', 'D', 'E', 'noise (hungry)', 'deaths A/N1/N2/D/E', 'survival D', 'survival E', 'E: predicate holds % of window ticks', 'E: waiting+idle+rest+sleep % of holding ticks'], rowsV);
const done = WORLDS.filter((w) => verdict[w]);
const count = (f) => done.filter((w) => f(verdict[w]) === true).length;
const survivalCost = count((v) => v.survivalFailsE) >= 2;
const rarely = count((v) => v.rarelyActive) >= 2;
const opens = count((v) => v.opens) >= 2;
const fills = count((v) => v.nothingFills) >= 2;
console.log(`Worlds with a complete set: ${done.join(', ') || 'none'} (${done.length} of 3).\n`);
console.log(`- SURVIVAL COST (survival fails for E in at least 2 of 3 worlds): ${count((v) => v.survivalFailsE)} of ${done.length} worlds fail -> ${survivalCost ? 'YES' : 'no'}`);
console.log(`- GATE RARELY ACTIVE (in E the predicate holds for under 60% of window person-ticks in at least 2 of 3 worlds): ${count((v) => v.rarelyActive)} of ${done.length} -> ${rarely ? 'YES' : 'no'}`);
console.log(`- OPENS A LIFE (in at least 2 of 3 worlds: life E - A >= 8 points and > noise, life D - A > noise, survival holds for D and E): ${count((v) => v.opens)} of ${done.length} -> ${opens ? 'YES' : 'no'}`);
console.log(`- TIME OPENS, NOTHING FILLS IT (predicate holds for >= 60% of window ticks in E and waiting+idle+rest+early sleep > half of the holding ticks, in at least 2 of 3 worlds): ${count((v) => v.nothingFills)} of ${done.length} -> ${fills ? 'YES' : 'no'}`);
const name = done.length < 3 ? 'INCOMPLETE (not every world has its controls)' : survivalCost ? 'SURVIVAL COST' : rarely ? 'GATE RARELY ACTIVE' : opens ? 'OPENS A LIFE' : fills ? 'TIME OPENS, NOTHING FILLS IT' : 'MIXED';
console.log(`\n**VERDICT by the fixed order (survival cost, rarely active, opens a life, time opens and nothing fills it, else mixed): ${name}.**\n`);
console.log('Per world: ' + done.map((w) => { const v = verdict[w]; return `${w}: life E-A ${f1(v.lifeE)}, D-A ${f1(v.lifeD)} points; survival fails for E ${v.survivalFailsE}; rarely active ${v.rarelyActive}; opens ${v.opens}; nothing fills ${v.nothingFills}`; }).join('. ') + '.\n');

// ───────── 5. where the gated time went ─────────
console.log('## Where the time went, category by category (people aged 12 and over, % of waking ticks; E minus A against the noise of the nudged controls)\n');
table(['world', 'category', 'A', 'N1', 'N2', 'D', 'E', 'D - A', 'E - A', 'noise = max(|N1-A|, |N2-A|)'],
  WORLDS.flatMap((w) => { const a = get(w, 'A'); if (!a) return []; return [...CATS, 'other'].map((c) => { const f = (x) => (x ? (c === 'other' ? x.m.other(x.m.s12) : x.m.share(x.m.s12, c)) : NaN); const n = Math.max(Math.abs(f(get(w, 'N1')) - f(a)), Math.abs(f(get(w, 'N2')) - f(a))); return [w, c, f1(f(a)), f1(f(get(w, 'N1'))), f1(f(get(w, 'N2'))), f1(f(get(w, 'D'))), f1(f(get(w, 'E'))), f1(f(get(w, 'D')) - f(a)), f1(f(get(w, 'E')) - f(a)), f1(n)]; }); }));
