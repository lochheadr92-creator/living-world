// P0.1a analysis: per-run outcomes, seed x rules matrix, forest detail, population by day, cross-check.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const OUT = 'C:/dev/Claude Experiment/living-world-integrate/p01_evidence/p01a-bisection-noarrivals';
const REF = 'C:/dev/Claude Experiment/living-world-integrate/integration121_evidence/longrun-25days-noarrivals/production-forest';
const RULES = [118, 119, 120, 121], SEEDS = ['forest', 'river', 'meadow'], DAY = 2400, DAYS = 25;
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');

const runs = [];
for (const seed of SEEDS) for (const rules of RULES) {
  const dir = join(OUT, `${seed}-r${rules}`), rep = join(dir, 'report.json'), fin = join(dir, 'final.json');
  if (!existsSync(rep)) { runs.push({seed, rules, missing: true}); continue; }
  const r = JSON.parse(readFileSync(rep, 'utf8')), w = JSON.parse(readFileSync(fin, 'utf8')).world;
  const chron = w.chronicle ?? [];
  const arrivals = chron.filter(e => e.kind === 'life' && / arrives? at the settlement/.test(e.text)).flatMap(e => e.ids.map(() => e.tick));
  const births = chron.filter(e => e.kind === 'life' && / was born /.test(e.text)).map(e => e.tick);
  const deaths = r.deaths;
  const founders = r.population + deaths.length - arrivals.length - births.length;
  const chronicleComplete = chron.length < 400 || (chron[0]?.tick ?? Infinity) < DAY;
  const popByDay = Array.from({length: DAYS + 1}, (_, d) => {
    const t = d * DAY;
    return founders + arrivals.filter(x => x <= t).length + births.filter(x => x <= t).length - deaths.filter(x => x.tick <= t).length;
  });
  const deathsByCause = {}; for (const x of deaths) deathsByCause[x.cause] = (deathsByCause[x.cause] ?? 0) + 1;
  const deathsByDay = Array(DAYS).fill(0); for (const x of deaths) deathsByDay[Math.min(DAYS - 1, Math.floor(x.tick / DAY))]++;
  runs.push({seed, rules, head: r.head?.slice(0, 7), dirty: r.dirty, stop: r.stop, tick: r.tick, seconds: Math.round(r.seconds),
    rulesRan: r.settings.rulesVersion, immigration: r.settings.immigration, alive: r.population, deaths: deaths.length,
    arrivals: arrivals.length, births: births.length, founders, chronicleComplete, popEndMatches: popByDay[DAYS] === r.population,
    pureChecks: r.pureChecks, conserved: r.conservation?.ok, continuationEqual: r.continuationEqual,
    deathsByCause, deathsByDay, popByDay, hungerDays: deaths.filter(x => x.cause === 'hunger').map(x => +(x.tick / DAY).toFixed(1)),
    finalSha: sha(fin)});
}

// Cross-check against the recorded rules-121 arrivals-off forest run (ready_step_observe, 3f65f8c).
const ref = JSON.parse(readFileSync(join(REF, 'report.json'), 'utf8'));
const f121 = runs.find(x => x.seed === 'forest' && x.rules === 121);
const f121deaths = f121.missing ? null : JSON.parse(readFileSync(join(OUT, 'forest-r121', 'report.json'), 'utf8')).deaths;
const cross = {reference: REF, refAlive: ref.population, refDeaths: ref.deaths.length,
  alive: f121.alive, deaths: f121.deaths,
  deathListIdentical: JSON.stringify(f121deaths) === JSON.stringify(ref.deaths),
  finalSaveIdentical: !f121.missing && f121.finalSha === sha(join(REF, 'final.json'))};
cross.pass = cross.alive === 1 && cross.deaths === 28 && cross.deathListIdentical;

const fmtCause = c => Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ') || '-';
let md = `# P0.1a rules bisection (arrivals off, 25 days)\n\n`;
md += `Cross-check (forest r121 vs recorded 1 alive / 28 deaths): **${cross.pass ? 'PASS' : 'FAIL'}**; alive ${cross.alive}, deaths ${cross.deaths}, identical death list ${cross.deathListIdentical}, identical final save ${cross.finalSaveIdentical}.\n\n`;
md += `## Alive at day 25 (deaths, arrivals, births)\n\n| Seed | ${RULES.map(r => 'r' + r).join(' | ')} |\n|---|${RULES.map(() => '---').join('|')}|\n`;
for (const seed of SEEDS) md += `| ${seed} | ${RULES.map(rules => { const x = runs.find(y => y.seed === seed && y.rules === rules); return x.missing ? 'missing' : `${x.alive} (${x.deaths}d, ${x.arrivals}a, ${x.births}b)${x.stop !== 'horizon' ? ' ' + x.stop : ''}`; }).join(' | ')} |\n`;
md += `\n## Deaths by cause\n\n| Seed | ${RULES.map(r => 'r' + r).join(' | ')} |\n|---|${RULES.map(() => '---').join('|')}|\n`;
for (const seed of SEEDS) md += `| ${seed} | ${RULES.map(rules => { const x = runs.find(y => y.seed === seed && y.rules === rules); return x.missing ? '-' : fmtCause(x.deathsByCause); }).join(' | ')} |\n`;
md += `\n## Forest population by day (days 0-25)\n\n`;
for (const rules of RULES) { const x = runs.find(y => y.seed === 'forest' && y.rules === rules); if (!x.missing) md += `- r${rules}: ${x.popByDay.join(' ')}\n`; }
md += `\n## Forest deaths by day (days 1-25)\n\n`;
for (const rules of RULES) { const x = runs.find(y => y.seed === 'forest' && y.rules === rules); if (!x.missing) md += `- r${rules}: ${x.deathsByDay.join(' ')} | hunger days ${x.hungerDays.join(', ') || '-'}\n`; }
md += `\n## Run integrity\n\n| Run | head | dirty | rules | arrivals on | stop | pure checks | conserved | twin | chronicle complete | 28 founders reconcile | s |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
for (const x of runs) md += x.missing ? `| ${x.seed}-r${x.rules} | missing |||||||||||\n` : `| ${x.seed}-r${x.rules} | ${x.head} | ${x.dirty} | ${x.rulesRan} | ${x.immigration} | ${x.stop} | ${x.pureChecks} | ${x.conserved} | ${x.continuationEqual} | ${x.chronicleComplete} | ${x.founders === 28 ? 'yes' : 'NO: ' + x.founders + ' founders'} | ${x.seconds} |\n`;

writeFileSync(join(OUT, 'summary.json'), JSON.stringify({cross, runs}, null, 2));
writeFileSync(join(OUT, 'summary.md'), md);
const csv = ['seed,rules,' + Array.from({length: DAYS + 1}, (_, d) => 'd' + d).join(',')];
for (const x of runs) if (!x.missing) csv.push(`${x.seed},${x.rules},${x.popByDay.join(',')}`);
writeFileSync(join(OUT, 'population_by_day.csv'), csv.join('\n') + '\n');
console.log(md);
