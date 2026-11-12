// scratch: summarise the generation traces in this folder. node summary.mjs [dir]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? 'traces';
const runs = readdirSync(dir).filter((f) => /-(on|off)\.json$/.test(f)).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '-');
const pad = (s, n) => String(s).padStart(n);
const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
const MARKS = [12, 24, 36, 60, 96, 120, 156, 192, 216, 240];
for (const arm of ['on', 'off']) {
  const rs = runs.filter((r) => (r.arrivals ? 'on' : 'off') === arm).sort((a, b) => a.seed.localeCompare(b.seed));
  if (!rs.length) continue;
  const upto = Math.min(...rs.map((r) => r.daysRun));
  console.log(`\n================ arrivals ${arm}: ${rs.length} seeds, rules ${rs[0].rulesVersion}, days run ${rs.map((r) => r.daysRun).join(' ')} (all done: ${rs.every((r) => r.done)}) ================`);
  const marks = MARKS.filter((d) => d <= upto);
  console.log('\nPeople alive at the end of day (28 founders):');
  console.log(pad('seed', 8) + marks.map((d) => pad('d' + d, 6)).join('') + '   low (day)  peak (day)');
  for (const r of rs) {
    const pop = r.days.map((d) => d.alive);
    const lo = Math.min(...pop), hi = Math.max(...pop);
    console.log(pad(r.seed, 8) + marks.map((d) => pad(r.days[d - 1].alive, 6)).join('') + `   ${pad(lo, 3)} (${pop.indexOf(lo) + 1})  ${pad(hi, 3)} (${pop.indexOf(hi) + 1})`);
  }
  console.log(pad('mean', 8) + marks.map((d) => pad(f1(mean(rs.map((r) => r.days[d - 1].alive))), 6)).join(''));
  console.log(pad('min', 8) + marks.map((d) => pad(Math.min(...rs.map((r) => r.days[d - 1].alive)), 6)).join(''));
  console.log(pad('max', 8) + marks.map((d) => pad(Math.max(...rs.map((r) => r.days[d - 1].alive)), 6)).join(''));
  console.log(pad('<4', 8) + marks.map((d) => pad(rs.filter((r) => r.days[d - 1].alive < 4).length, 6)).join('') + '   (settlements under four people)');

  // flows by 48-day span (four years)
  console.log('\nFlows per settlement, by span of 48 days (four years):');
  console.log(pad('span', 10) + pad('born', 7) + pad('came', 7) + pad('died', 7) + '  of: ' + ['hunger', 'thirst', 'exposure', 'wolf', 'old age', 'other'].map((c) => pad(c, 9)).join(''));
  const causeKey = (c) => (/hunger|starv/.test(c) ? 'hunger' : /thirst/.test(c) ? 'thirst' : /exposure|cold/.test(c) ? 'exposure' : /wolf/.test(c) ? 'wolf' : /old|age/.test(c) ? 'old age' : 'other');
  const allCauses = {};
  for (let a = 0; a < upto; a += 48) {
    const b = Math.min(upto, a + 48);
    const born = [], came = [], died = [], by = { hunger: [], thirst: [], exposure: [], wolf: [], 'old age': [], other: [] };
    for (const r of rs) {
      const span = r.days.slice(a, b);
      born.push(span.reduce((n, d) => n + d.born, 0)); came.push(span.reduce((n, d) => n + d.came, 0)); died.push(span.reduce((n, d) => n + d.died, 0));
      const c = { hunger: 0, thirst: 0, exposure: 0, wolf: 0, 'old age': 0, other: 0 };
      for (const d of span) for (const [k, n] of Object.entries(d.causes)) { c[causeKey(k)] += n; allCauses[k] = (allCauses[k] ?? 0) + n; }
      for (const k of Object.keys(by)) by[k].push(c[k]);
    }
    console.log(pad(`${a + 1}-${b}`, 10) + pad(f1(mean(born)), 7) + pad(f1(mean(came)), 7) + pad(f1(mean(died)), 7) + '      ' + Object.keys(by).map((k) => pad(f1(mean(by[k])), 9)).join(''));
  }
  console.log('raw causes, all seeds: ' + JSON.stringify(allCauses));

  // deaths by origin and age
  const deaths = rs.flatMap((r) => r.deaths.filter((d) => d.day <= upto));
  const byOrigin = {}; for (const d of deaths) byOrigin[d.origin] = (byOrigin[d.origin] ?? 0) + 1;
  const ageBand = (a) => (a < 3 ? '0-2' : a < 12 ? '3-11' : a < 16 ? '12-15' : a < 62 ? '16-61' : '62+');
  const byAge = {}; for (const d of deaths) byAge[ageBand(d.age)] = (byAge[ageBand(d.age)] ?? 0) + 1;
  console.log(`\nDeaths in all (${deaths.length} over ${rs.length} seeds): by origin ${JSON.stringify(byOrigin)}; by age ${JSON.stringify(byAge)}`);

  // crashes: a fall of 8 or more people within 3 days
  console.log('\nFalls of eight or more people within three days:');
  let crashes = 0;
  for (const r of rs) {
    const pop = [28, ...r.days.map((d) => d.alive)];
    for (let d = 3; d < pop.length; d++) {
      const fall = pop[d - 3] - pop[d];
      if (fall < 8) continue;
      const c = {}; for (const x of r.days.slice(d - 3, d)) for (const [k, n] of Object.entries(x.causes)) c[k] = (c[k] ?? 0) + n;
      const hs = [...new Set(r.days.slice(Math.max(0, d - 6), d).map((x) => x.hardship).filter(Boolean))].join('+') || 'none';
      const winter = r.days.slice(d - 3, d).some((x) => x.winter > 0 || ((x.day - 1) % 12) >= 8);
      console.log(`  ${pad(r.seed, 7)} days ${d - 2}-${d}: ${pop[d - 3]} -> ${pop[d]}  ${JSON.stringify(c)}  hardship ${hs}${winter ? ', winter' : ''}`);
      crashes++; d += 3;
    }
  }
  if (!crashes) console.log('  none');

  // year rows at the marks
  const yearAt = (r, day) => r.years.find((y) => y.day === day);
  const ymarks = [12, 60, 120, 192, 240].filter((d) => d <= upto);
  const avg = (get, day) => f1(mean(rs.map((r) => yearAt(r, day)).filter(Boolean).map(get)));
  const row = (label, get) => console.log(pad(label, 30) + ymarks.map((d) => pad(avg(get, d), 9)).join(''));
  console.log('\nThe settlement at the end of a year (means over seeds):');
  console.log(pad('', 30) + ymarks.map((d) => pad('d' + d, 9)).join(''));
  row('people', (y) => y.alive);
  row('  founders still alive', (y) => y.from.founder ?? 0);
  row('  born here', (y) => y.from.born ?? 0);
  row('  arrived', (y) => y.from.arrived ?? 0);
  row('  children (under 12)', (y) => y.stages.child ?? 0);
  row('  youths (12-15)', (y) => y.stages.youth ?? 0);
  row('  adults (16-61)', (y) => y.stages.adult ?? 0);
  row('  elders (62+)', (y) => y.stages.elder ?? 0);
  row('mean age', (y) => y.meanAge);
  row('oldest', (y) => y.oldest);
  row('couples', (y) => y.couples);
  row('households', (y) => y.households);
  row('  of one person', (y) => y.householdsOfOne);
  row('  households ever', (y) => y.householdsEver);
  row('mean mood', (y) => y.meanMood);
  const types = [...new Set(rs.flatMap((r) => r.years.flatMap((y) => Object.keys(y.buildings))))].sort();
  for (const t of types) row('building: ' + t, (y) => y.buildings[t] ?? 0);
  row('open building sites', (y) => sum(y.sites));
  row('farm plots', (y) => y.plots);
  const tools = [...new Set(rs.flatMap((r) => r.years.flatMap((y) => Object.keys(y.tools))))].sort();
  for (const t of tools) row('tool: ' + t, (y) => y.tools[t] ?? 0);
  row('carts', (y) => y.carts);
  row('apprentices', (y) => y.apprentices);
  for (const k of ['charcoal', 'smelting', 'forging']) row('knows ' + k, (y) => y.techniques[k] ?? 0);
  for (const k of ['forage', 'fish', 'farm', 'build', 'craft']) row('skill ' + k + ' (grown)', (y) => y.skills[k] * 10);
  row('stone left', (y) => y.stone); row('clay left', (y) => y.clay); row('ore left', (y) => y.ore); row('trees', (y) => y.trees);
  row('id counter', (y) => y.nextId);
  console.log('  (skills are shown x10)');
  // how many settlements have each building at the last mark
  const last = ymarks[ymarks.length - 1];
  console.log(`\nSettlements (of ${rs.length}) with at least one, at day ${last}: ` + types.map((t) => `${t} ${rs.filter((r) => (yearAt(r, last)?.buildings[t] ?? 0) > 0).length}`).join(', '));
  for (const t of ['hall', 'timber_yard', 'storehouse', 'house', 'well']) {
    const first = rs.map((r) => r.years.find((y) => (y.buildings[t] ?? 0) > 0)?.day);
    console.log(`  first ${t} standing at a year's end: ` + rs.map((r, i) => `${r.seed} ${first[i] ?? '-'}`).join(', '));
  }

  // life counters as rates per year, per span
  console.log('\nLife, per year of 12 days (means over seeds), by span:');
  const keys = ['chats', 'familyTime', 'childPlay', 'coaching', 'lessons', 'mealsSat', 'visits', 'fireSits', 'storiesTold', 'mealsFromStore', 'mealsFromPack', 'tradeTalk', 'marketsCalled', 'workplaceJobs', 'yardJobs', 'sitesAbandoned', 'toysMade', 'leanDays', 'dryDays'];
  const spans = []; for (let a = 0; a < upto; a += 48) spans.push([a, Math.min(upto, a + 48)]);
  console.log(pad('', 18) + spans.map(([a, b]) => pad(`${a + 1}-${b}`, 10)).join(''));
  for (const k of keys) {
    console.log(pad(k, 18) + spans.map(([a, b]) => pad(f1(mean(rs.map((r) => { const ya = a === 0 ? { life: {} } : yearAt(r, a), yb = yearAt(r, b); return yb && ya ? ((yb.life[k] ?? 0) - (ya.life[k] ?? 0)) / ((b - a) / 12) : NaN; }).filter(Number.isFinite))), 10)).join(''));
  }
  for (const k of ['hungryShare', 'thirstyShare', 'lifeShare', 'survivalShare', 'workShare']) console.log(pad(k + ' (to date)', 26) + ymarks.map((d) => pad(avg((y) => y.life[k] * 100, d), 9)).join('') + '  % at ' + ymarks.map((d) => 'd' + d).join(' '));
  console.log('minutes: ' + rs.map((r) => r.minutes).join(' ') + '; day-60 hashes: ' + rs.map((r) => `${r.seed} ${r.hash60}`).join(' '));
}
