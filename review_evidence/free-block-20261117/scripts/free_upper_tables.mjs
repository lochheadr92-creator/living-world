// SCRATCH ONLY. Tables and the fixed reading for the free block UPPER-BOUND runs. node free_upper_tables.mjs > out\free-upper\tables.md
// Controls A, N1, N2 and the believed-fed arms D and E are read from out\free (not rerun); the upper-bound arms UD and UE from out\free-upper.
// The reading is the one in FREE_UPPER_READING.md (copied to out\free-upper\READING.md), written before the runs. One run per arm is a description.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ROOT = 'C:/dev/_claude_scratch/regime-20261117';
const OLD = `${ROOT}/out/free`, NEW = `${ROOT}/out/free-upper`;
const WORLDS = ['aspen', 'river', 'gen-4'];
const ARMS = ['A', 'N1', 'N2', 'D', 'E', 'UD', 'UE'];
const NAME = { A: 'A', N1: 'N1', N2: 'N2', D: 'D (believed-fed, earlier)', E: 'E (believed-fed, earlier)', UD: 'UD (upper bound, 0.62)', UE: 'UE (upper bound, 0.50)' };
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
const WCATS = [...CATS, 'sleep', 'failure_recovery', 'defence'];

const runs = {}, missing = [];
for (const w of WORLDS) for (const a of ARMS) {
  const dir = `${a === 'UD' || a === 'UE' ? NEW : OLD}/${w}-${a}`;
  if (!existsSync(`${dir}/report.json`)) { missing.push(`${w}-${a}`); continue; }
  runs[`${w}-${a}`] = { world: w, arm: a, dir, r: json(dir + '/report.json'), trips: existsSync(`${dir}/trips.jsonl`) ? lines(`${dir}/trips.jsonl`) : [] };
}
const get = (w, a) => runs[`${w}-${a}`];

function measures(x) {
  const r = x.r, ds = r.dayShape, fw = r.freeWindow;
  const wk = ds.hungryTime.wakingByHunger;
  const split = (stage) => { const rows = wk.filter((q) => !stage || q.stage === stage); const t = rows.reduce((n, q) => n + q.ticks, 0); const m = {}; for (const q of rows) m[q.category] = (m[q.category] ?? 0) + q.ticks; return { t, m }; };
  const s12 = split('12_and_over'), sAll = split('');
  const share = (s, c) => pct(s.m[c] ?? 0, s.t);
  const other = (s) => 100 - CATS.reduce((n, c) => n + share(s, c), 0);
  const b12 = fw.bands['12_and_over'], bu = fw.bands.under_12;
  const last = ds.foodWhereItIs.daily[ds.foodWhereItIs.daily.length - 1];
  const heads = last.heads || 1;
  const headDays = r.tripShape.livingPersonTicks / 2400;
  const t = x.trips.filter((q) => !q.leftCensored && q.outcome !== 'censored');
  let food = 0, wood = 0;
  for (const q of t.filter((q) => q.kind === 'gather')) for (const [k, v] of Object.entries(q.moved?.byItem ?? {})) { if (FOOD.has(k)) food += v; if (k === 'wood') wood += v; }
  const done = t.filter((q) => q.outcome === 'arrived_did_job' && q.endOutcome === 'success');
  const p = r.people;
  return {
    life12: share(s12, 'social_contact') + share(s12, 'leisure'), lifeAll: share(sAll, 'social_contact') + share(sAll, 'leisure'), s12, sAll, share, other,
    company12: pct(b12.company, b12.waking), companyAll: 100 * r.outdoor.shares.all.company,
    hungryNoFood12: pct(b12.hungryNoFood, b12.waking), hungryNoFoodAll: pct(b12.hungryNoFood + bu.hungryNoFood, b12.waking + bu.waking),
    foodEnd: { packs: last.perHead.packs, homes: last.perHead.homeStores, granary: (last.otherBuildingsByType?.granary ?? 0) / heads, other: last.perHead.otherBuildings, held: last.perHead.heldTotal },
    foodGathered: food / headDays, woodGathered: wood / headDays, jobs: done.filter((q) => q.lifeGroup === 'work').length / headDays,
    people: p, deaths: p.died, peopleEnd: p.end,
    checks: { stop: r.stop, conservation: r.conservation.ok, purity: r.purityChecks, travel: r.travelCheck.equal, lifeTally: r.lifeTallyCheck.equal, window: r.windowCheck.equal, dayShape: Object.values(ds.selfChecks).every(Boolean), trip: Object.values(r.tripShape.selfChecks).every(Boolean) },
  };
}
for (const k of Object.keys(runs)) runs[k].m = measures(runs[k]);
if (missing.length) console.log(`MISSING RUNS (no report.json): ${missing.join(', ')}\n`);

// ───────── checks ─────────
console.log('## Checks\n');
const readingSha = (f) => (existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : 'MISSING');
const recorded = existsSync(`${NEW}/commands.txt`) ? (readFileSync(`${NEW}/commands.txt`, 'utf8').match(/sha256 ([0-9a-f]{64})/) ?? [])[1] : null;
console.log(`- The reading: \`FREE_UPPER_READING.md\` sha256 now ${readingSha(`${ROOT}/FREE_UPPER_READING.md`)}; recorded at launch in out\\free-upper\\commands.txt ${recorded ?? 'MISSING'}; the copy out\\free-upper\\READING.md ${readingSha(`${NEW}/READING.md`)}: ${recorded && readingSha(`${ROOT}/FREE_UPPER_READING.md`) === recorded && readingSha(`${NEW}/READING.md`) === recorded ? 'ALL EQUAL (not edited after the runs started)' : 'NOT EQUAL'}.`);
console.log('- Controls used (not rerun): ' + WORLDS.map((w) => `${w} A ${get(w, 'A')?.r.hash ?? 'MISSING'} (expected ${EXPECT_A[w]}: ${get(w, 'A')?.r.hash === EXPECT_A[w] ? 'EQUAL' : 'DIFFERENT'})`).join('; ') + '.');
console.log('- Gate off is inert on the edited source: see the one-day smoke recorded in the report (aspen A one day: 510f235b before and after the edit).\n');
const ok = (b) => (b ? 'ok' : 'FAIL');
table(['run', 'arm flags', 'end hash', 'stop', 'conservation', 'purity checks', 'travel equal', 'LifeTally equal', 'window check equal', 'DayShape checks', 'TripShape checks', 'people start', 'end', 'born', 'came', 'died', 'causes', 'seconds'],
  Object.entries(runs).filter(([, x]) => x.arm === 'UD' || x.arm === 'UE').map(([k, x]) => { const c = x.m.checks, p = x.m.people; return [k, `--block-from ${x.r.blockFrom}${x.r.ignoreFood ? ' --ignore-food' : ''}`, x.r.hash, c.stop, ok(c.conservation), c.purity, ok(c.travel), ok(c.lifeTally), ok(c.window), ok(c.dayShape), ok(c.trip), p.start, p.end, p.born, p.came, p.died, Object.entries(p.causes).map(([a, b]) => `${a} ${b}`).join(', ') || '-', x.r.seconds]; }));

// ───────── main tables ─────────
const present = (w) => ARMS.filter((a) => get(w, a));
console.log('## Main table, people aged 12 and over (share of their waking ticks, per cent; A, N1, N2, D, E are the earlier runs)\n');
table(['world', 'arm', ...CATS, 'other', 'LIFE (social + leisure)', 'outdoor company', 'hungry, no food in pack or home'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m; return [w, NAME[a], ...CATS.map((c) => f1(m.share(m.s12, c))), f1(m.other(m.s12)), f1(m.life12), f1(m.company12), f1(m.hungryNoFood12)]; })));
console.log('## The same for everyone (per cent of waking ticks)\n');
table(['world', 'arm', ...CATS, 'other', 'LIFE (social + leisure)', 'outdoor company', 'hungry, no food in pack or home'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m; return [w, NAME[a], ...CATS.map((c) => f1(m.share(m.sAll, c))), f1(m.other(m.sAll)), f1(m.lifeAll), f1(m.companyAll), f1(m.hungryNoFoodAll)]; })));
console.log('## Food, work and people (everyone; food at the end of day 30; gathered and jobs are a head a day)\n');
table(['world', 'arm', 'food held a head, end', 'in packs', 'in home stores', 'in granaries', 'in other buildings', 'food gathered', 'wood gathered', 'work jobs finished', 'people start', 'people end', 'died', 'causes'],
  WORLDS.flatMap((w) => present(w).map((a) => { const m = get(w, a).m, f = m.foodEnd; return [w, NAME[a], f2(f.held), f2(f.packs), f2(f.homes), f2(f.granary), f2(f.other), f2(m.foodGathered), f2(m.woodGathered), f2(m.jobs), m.people.start, m.people.end, m.people.died, Object.entries(m.people.causes).map(([x, y]) => `${x} ${y}`).join(', ') || '-']; })));

// ───────── engagement and where the time went ─────────
console.log('## How often the gate was on, and where the time went (people aged 12 and over, per window)\n');
console.log('The upper-bound gate is on for every window person-tick with no need under CRITICAL. In a control run that count is the window ticks less the urgent-need ones (urgent only plus both, at most about 1% of window ticks in the earlier runs); the controls have no per-tick record of which kinds of activity fall in the non-urgent ticks, so the controls\' category split below is of ALL window ticks, which is within that margin of the safe ticks.\n');
table(['run', 'window', 'window person-ticks', 'gate on %', 'urgent-need ticks %', 'upper gate: outdoor company % of its ticks'],
  ['UD', 'UE'].flatMap((a) => WORLDS.filter((w) => get(w, a)).map((w) => { const x = get(w, a), win = a === 'UD' ? 'D' : 'E', v = x.r.freeWindow.windows[win]; return [`${w}-${a}`, win, v.personTicks, f1(100 * v.safeShare), f1(100 - 100 * v.safeShare), f1(100 * v.safeOutdoorCompanyShare)]; })));
console.log('### The ticks where the gate was on, by TimeBudget category (% of those ticks); the controls\' row is all window ticks of the same window\n');
const catRows = [];
for (const w of WORLDS) for (const [a, ctl, win] of [['UD', 'A', 'D'], ['UE', 'A', 'E']]) {
  const x = get(w, a), c = get(w, ctl); if (!x || !c) continue;
  const vx = x.r.freeWindow.windows[win], vc = c.r.freeWindow.windows[win];
  catRows.push([`${w}-${ctl}`, `${win} (all window ticks)`, vc.personTicks, ...WCATS.map((k) => f1(pct(vc.allByCategory[k] ?? 0, vc.personTicks)))]);
  catRows.push([`${w}-${a}`, `${win} (gate-on ticks)`, vx.safe, ...WCATS.map((k) => f1(pct(vx.safeByCategory[k] ?? 0, vx.safe)))]);
}
table(['run', 'window', 'ticks', ...WCATS], catRows);
console.log('### The ten largest activity kinds in the gate-on ticks (% of those ticks)\n');
table(['run', 'window', 'ten largest kinds'], ['UD', 'UE'].flatMap((a) => WORLDS.filter((w) => get(w, a)).map((w) => { const v = get(w, a).r.freeWindow.windows[a === 'UD' ? 'D' : 'E']; return [`${w}-${a}`, a === 'UD' ? 'D' : 'E', v.safeByKind.slice(0, 10).map((q) => `${q.key} ${f1(pct(q.ticks, v.safe))}`).join(', ')]; })));
console.log('### What the gate did (counts of calls to rankOptions, which include the 600 observer samples)\n');
table(['run', 'calls with the gate set', 'calls where it applied', 'options removed', 'running activity kept (exempt)', 'removed by kind'],
  Object.keys(runs).filter((k) => ['UD', 'UE', 'D', 'E'].includes(runs[k].arm)).map((k) => { const s = runs[k].r.freeBlock.stats; return [`${k}${runs[k].arm.startsWith('U') ? '' : ' (earlier)'}`, s.calls, s.applied, s.removed, s.exemptRunning, Object.entries(s.removedByKind).sort((a, b) => b[1] - a[1]).map(([a, b]) => `${a} ${b}`).join(', ')]; }));

// ───────── the fixed reading ─────────
console.log('## The fixed reading (FREE_UPPER_READING.md), applied\n');
console.log('People aged 12 and over. life = social_contact + leisure, share of waking time. noise = the larger of |N1 - A| and |N2 - A| in that world. A world counts toward LIFE OPENS when UE life minus A life is at least 8 points, and more than the noise, and survival holds for UE (deaths <= the highest of A, N1, N2 plus 2, and hungry-with-no-food <= A + noise + 3 points). LIFE OPENS when at least 2 of 3 worlds count. SURVIVAL COST when survival fails for UE in at least 2 of 3 worlds. Order: SURVIVAL COST, LIFE OPENS, else NOT OPENED. UD is reported, not part of the headline.\n');
const V = {}, rowsV = [];
for (const w of WORLDS) {
  const a = get(w, 'A'), n1 = get(w, 'N1'), n2 = get(w, 'N2'), ud = get(w, 'UD'), ue = get(w, 'UE');
  if (!(a && n1 && n2 && ue)) { rowsV.push([w, 'incomplete']); V[w] = null; continue; }
  const noise = (f) => Math.max(Math.abs(f(n1.m) - f(a.m)), Math.abs(f(n2.m) - f(a.m)));
  const nLife = noise((m) => m.life12), nHun = noise((m) => m.hungryNoFood12), maxDeaths = Math.max(a.m.deaths, n1.m.deaths, n2.m.deaths);
  const surv = (x) => (x ? { ok: x.m.deaths <= maxDeaths + 2 && x.m.hungryNoFood12 <= a.m.hungryNoFood12 + nHun + 3, why: `deaths ${x.m.deaths} vs limit ${maxDeaths + 2}; hungry no food ${f1(x.m.hungryNoFood12)} vs limit ${f1(a.m.hungryNoFood12 + nHun + 3)}` } : null);
  const sE = surv(ue), sD = surv(ud);
  const dLife = ue.m.life12 - a.m.life12;
  V[w] = { dLife, nLife, lifeEnough: dLife >= 8 && dLife > nLife, survives: sE.ok, counts: dLife >= 8 && dLife > nLife && sE.ok, survivalFails: !sE.ok };
  rowsV.push([w, f1(a.m.life12), f1(n1.m.life12), f1(n2.m.life12), f1(ud?.m.life12), f1(ue.m.life12), f1(nLife), `${f1(dLife)}`, dLife >= 8 ? 'yes' : 'no', dLife > nLife ? 'yes' : 'no', `${a.m.deaths}/${n1.m.deaths}/${n2.m.deaths}/${ud?.m.deaths ?? '-'}/${ue.m.deaths}`, sD ? (sD.ok ? 'holds' : 'FAILS') : '-', sE.ok ? 'holds' : `FAILS (${sE.why})`, V[w].counts ? 'COUNTS' : 'does not count']);
}
table(['world', 'life A', 'N1', 'N2', 'UD', 'UE', 'noise (life)', 'UE - A', '>= 8 points', '> noise', 'deaths A/N1/N2/UD/UE', 'survival UD', 'survival UE', 'world'], rowsV);
const done = WORLDS.filter((w) => V[w]);
const nCounts = done.filter((w) => V[w].counts).length, nFail = done.filter((w) => V[w].survivalFails).length;
const survivalCost = nFail >= 2, opens = nCounts >= 2;
console.log(`- SURVIVAL COST (survival fails for UE in at least 2 of 3 worlds): ${nFail} of ${done.length} fail -> ${survivalCost ? 'YES' : 'no'}`);
console.log(`- LIFE OPENS (UE life above A by at least 8 points and above the noise, with survival holding, in at least 2 of 3 worlds): ${nCounts} of ${done.length} worlds count -> ${opens ? 'YES' : 'no'}`);
console.log(`\n**VERDICT by the fixed order: ${done.length < 3 ? 'INCOMPLETE' : survivalCost ? 'SURVIVAL COST' : opens ? 'LIFE OPENS' : 'NOT OPENED (freed time does not become life even when the gate is always on)'}.**\n`);
console.log('Per world: ' + done.map((w) => `${w}: UE-A ${f1(V[w].dLife)} points (noise ${f1(V[w].nLife)}), survival ${V[w].survives ? 'holds' : 'FAILS'}`).join('; ') + '.\n');

// ───────── category movement and the other measures ─────────
console.log('## Where the time went over the whole waking day (people aged 12 and over, % of waking ticks; against the noise of the nudged controls)\n');
table(['world', 'category', 'A', 'N1', 'N2', 'D (earlier)', 'E (earlier)', 'UD', 'UE', 'UD - A', 'UE - A', 'noise'],
  WORLDS.flatMap((w) => { const a = get(w, 'A'); if (!a) return []; return [...CATS, 'other'].map((c) => { const f = (x) => (x ? (c === 'other' ? x.m.other(x.m.s12) : x.m.share(x.m.s12, c)) : NaN); const n = Math.max(Math.abs(f(get(w, 'N1')) - f(a)), Math.abs(f(get(w, 'N2')) - f(a))); return [w, c, f1(f(a)), f1(f(get(w, 'N1'))), f1(f(get(w, 'N2'))), f1(f(get(w, 'D'))), f1(f(get(w, 'E'))), f1(f(get(w, 'UD'))), f1(f(get(w, 'UE'))), f1(f(get(w, 'UD')) - f(a)), f1(f(get(w, 'UE')) - f(a)), f1(n)]; }); }));
const OTHER = { 'outdoor company 12+': (m) => m.company12, 'hungry no food 12+': (m) => m.hungryNoFood12, 'food held a head, end': (m) => m.foodEnd.held, 'food gathered a head a day': (m) => m.foodGathered, 'wood gathered a head a day': (m) => m.woodGathered, 'work jobs a head a day': (m) => m.jobs, deaths: (m) => m.deaths, 'people at the end': (m) => m.peopleEnd };
console.log('## The other measures against the nudge spread (spread = larger of |N1 - A| and |N2 - A|; BEYOND = the arm minus A is larger than the spread)\n');
const ex = []; let beyond = 0, total = 0;
const orows = [];
for (const w of WORLDS) { const a = get(w, 'A'); if (!a || !get(w, 'N1') || !get(w, 'N2')) continue; for (const [k, f] of Object.entries(OTHER)) { const sp = Math.max(Math.abs(f(get(w, 'N1').m) - f(a.m)), Math.abs(f(get(w, 'N2').m) - f(a.m))); const cells = ['UD', 'UE'].map((arm) => { const x = get(w, arm); if (!x) return '-'; const d = f(x.m) - f(a.m); total++; if (Math.abs(d) > sp) { beyond++; ex.push(`${w} ${arm} ${k} ${d >= 0 ? '+' : ''}${f2(d)} (spread ${f2(sp)})`); return `${f2(d)} BEYOND`; } return f2(d); }); orows.push([w, k, f2(f(a.m)), f2(f(get(w, 'N1').m)), f2(f(get(w, 'N2').m)), f2(f(get(w, 'UD')?.m ?? { company12: NaN, hungryNoFood12: NaN, foodEnd: { held: NaN }, foodGathered: NaN, woodGathered: NaN, jobs: NaN, deaths: NaN, peopleEnd: NaN })), f2(f(get(w, 'UE')?.m ?? { company12: NaN, hungryNoFood12: NaN, foodEnd: { held: NaN }, foodGathered: NaN, woodGathered: NaN, jobs: NaN, deaths: NaN, peopleEnd: NaN })), f2(sp), cells[0], cells[1]]); } }
table(['world', 'measure', 'A', 'N1', 'N2', 'UD', 'UE', 'spread', 'UD - A', 'UE - A'], orows);
console.log(`${beyond} of ${total} UD or UE comparisons on these measures exceed the spread. Under no effect a comparison clears the larger of two nudge differences about a third of the time (reasoning from exchangeability, not tested): ${ex.join('; ') || 'none'}.\n`);
