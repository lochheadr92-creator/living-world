// P0.1c analysis: forest floors at rules 118 and 121, arrivals on and off. Each arm is 25 draws: the control and 24 nudges
// (nudge:1-8 forked at day 4, nudge:1-4 forked at days 2, 3, 5 and 6), all ending at day 25. Also cross-checks the controls
// against the P0.1a single runs and the arrivals-off rules-121 rows against P0.1b's.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const EV = 'C:/dev/Claude Experiment/living-world-integrate/p01_evidence';
const OUT = join(EV, 'p01c-floors');
const ARMS = ['r118-on', 'r121-on', 'r118-off', 'r121-off'];
// P0.1a single runs, alive (deaths) at day 25: docs/FOREST_ATTRIBUTION.md
const P01A = {'r118-on': [3, 30], 'r121-on': [4, 29], 'r118-off': [21, 10], 'r121-off': [1, 28]};
const WANT = {'r118-on': [118, true], 'r121-on': [121, false], 'r118-off': [118, true], 'r121-off': [121, false]};

const read = f => readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

const problems = [];
const arms = {};
for (const arm of ARMS) {
  const rows = readdirSync(join(OUT, arm)).filter(f => f.endsWith('.jsonl')).sort().flatMap(f => {
    const lines = read(join(OUT, arm, f));
    if (!lines.some(r => r.done)) problems.push(`${arm}/${f} has no done line`);
    return lines.filter(r => r.spec).map(r => ({...r, file: f}));
  });
  const [version, pinned] = WANT[arm];
  for (const r of rows) {
    if (r.rulesVersion !== version) problems.push(`${arm} ${r.file} ${r.spec}: rulesVersion ${r.rulesVersion}`);
    if ((r.rulesPinned === true) !== pinned) problems.push(`${arm} ${r.file} ${r.spec}: rulesPinned ${r.rulesPinned}`);
    if (r.arrivals !== arm.endsWith('-on')) problems.push(`${arm} ${r.file} ${r.spec}: arrivals ${r.arrivals}`);
    if (!r.provenance?.head?.startsWith('b5694c7') || r.provenance.dirty) problems.push(`${arm} ${r.file}: provenance ${r.provenance?.head} dirty=${r.provenance?.dirty}`);
    if (r.fork + r.days !== 25) problems.push(`${arm} ${r.file}: ends at day ${r.fork + r.days}`);
  }
  const controls = rows.filter(r => r.spec === 'control');
  const ctlHashes = new Set(controls.map(r => r.finalHash));
  if (controls.length !== 8 || ctlHashes.size !== 1) problems.push(`${arm}: ${controls.length} controls, ${ctlHashes.size} distinct final states`);
  const nudges = rows.filter(r => r.spec.startsWith('nudge'));
  if (nudges.length !== 24) problems.push(`${arm}: ${nudges.length} nudges`);
  const draws = [controls[0], ...nudges];
  const alive = draws.map(r => r.outcome.people), deaths = draws.map(r => r.outcome.deaths);
  // alive at the start of the second winter (day 20) from popByDay, which runs from the fork day
  const atDay = (r, d) => r.popByDay?.[d - r.fork];
  arms[arm] = {
    control: {alive: controls[0].outcome.people, deaths: controls[0].outcome.deaths, finalHash: controls[0].finalHash, identicalControls: controls.length},
    draws: draws.map(r => ({spec: r.spec, fork: r.fork, alive: r.outcome.people, deaths: r.outcome.deaths, day20: atDay(r, 20), finalHash: r.finalHash, divergedAfterTicks: r.divergedAfterTicks})),
    n: draws.length, alive: {mean: mean(alive), sd: sd(alive), median: median(alive), min: Math.min(...alive), max: Math.max(...alive)},
    deaths: {mean: mean(deaths)}, atLeast10: alive.filter(v => v >= 10).length,
    day20: {mean: mean(draws.map(r => atDay(r, 20)))},
    sameAsControl: nudges.filter(r => r.finalHash === controls[0].finalHash).length,
  };
  const [a, d] = P01A[arm];
  arms[arm].p01aMatch = controls[0].outcome.people === a && controls[0].outcome.deaths === d;
  if (!arms[arm].p01aMatch) problems.push(`${arm}: control ${controls[0].outcome.people} (${controls[0].outcome.deaths}) vs P0.1a ${a} (${d})`);
}

// P0.1b rows (frozen 3df2ac8, rules 121, arrivals forced off): the same draws must give the same final states
const p01b = [
  ...read(join(EV, 'p01b-forest', 'lab_forest.jsonl')).filter(r => r.spec === 'control' || r.spec === 'nudge:1' || r.spec === 'nudge:2'),
  ...readdirSync(join(EV, 'p01b-forest-nudges')).filter(f => f.endsWith('.jsonl')).flatMap(f => read(join(EV, 'p01b-forest-nudges', f))),
  ...readdirSync(join(EV, 'p01b-forest-forks')).filter(f => f.endsWith('.jsonl')).flatMap(f => read(join(EV, 'p01b-forest-forks', f))),
].filter(r => r.spec === 'control' || r.spec?.startsWith('nudge'));
const key = r => `${r.fork}:${r.spec}`;
const b = new Map(p01b.map(r => [key(r), r.finalHash]));
const off121 = arms['r121-off'].draws;
const compared = off121.filter(r => b.has(key(r)));
const p01bSame = compared.filter(r => b.get(key(r)) === r.finalHash).length;
if (p01bSame !== compared.length) problems.push(`r121-off: ${compared.length - p01bSame} of ${compared.length} draws differ from P0.1b`);

// 118 against 121 within one arrivals setting. The draws are not paired (different rules make different trajectories), so the
// difference in means is tested by permutation with a fixed generator, and given a bootstrap 95% interval.
let s = 20261103;
const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const contrast = (x, y) => {
  const d = mean(x) - mean(y), all = [...x, ...y], N = 20000;
  let extreme = 0;
  for (let i = 0; i < N; i++) {
    const p = [...all];
    for (let j = p.length - 1; j > 0; j--) { const k = Math.floor(rnd() * (j + 1)); [p[j], p[k]] = [p[k], p[j]]; }
    if (Math.abs(mean(p.slice(0, x.length)) - mean(p.slice(x.length))) >= Math.abs(d) - 1e-9) extreme++;
  }
  const boots = [];
  for (let i = 0; i < N; i++) {
    const bx = x.map(() => x[Math.floor(rnd() * x.length)]), by = y.map(() => y[Math.floor(rnd() * y.length)]);
    boots.push(mean(bx) - mean(by));
  }
  boots.sort((p, q) => p - q);
  return {diff: d, p: (extreme + 1) / (N + 1), ci95: [boots[Math.floor(0.025 * N)], boots[Math.floor(0.975 * N)]]};
};
const alive = arm => arms[arm].draws.map(r => r.alive);
const contrasts = {
  'arrivals on: 118 - 121': contrast(alive('r118-on'), alive('r121-on')),
  'arrivals off: 118 - 121': contrast(alive('r118-off'), alive('r121-off')),
};

const f1 = v => v.toFixed(1);
let md = '# P0.1c forest floors: rules 118 and 121, arrivals on and off\n\n';
md += 'Frozen worktree at `b5694c7`, Normal profile, seed forest, every draw ending at day 25. 25 draws per arm: the control and 24 nudges.\n\n';
md += `Checks: ${problems.length ? 'PROBLEMS:\n' + problems.map(p => '- ' + p).join('\n') : 'all rows finished, provenance b5694c7 clean, rules/pinned/arrivals as asked, 8 identical controls per arm, controls equal the P0.1a single runs'}.\n`;
md += `P0.1b cross-check: ${p01bSame} of ${compared.length} arrivals-off rules-121 draws end in the same final state as P0.1b (frozen 3df2ac8).\n\n`;
md += '| Arm | control alive (deaths) | mean alive | sd | median | range | draws with 10+ alive | mean alive at day 20 | nudges equal to control |\n|---|---|---|---|---|---|---|---|---|\n';
for (const arm of ARMS) { const a = arms[arm]; md += `| ${arm} | ${a.control.alive} (${a.control.deaths}) | ${f1(a.alive.mean)} | ${f1(a.alive.sd)} | ${a.alive.median} | ${a.alive.min}-${a.alive.max} | ${a.atLeast10} of ${a.n} | ${f1(a.day20.mean)} | ${a.sameAsControl} |\n`; }
md += '\n| Contrast (alive at day 25) | difference in means | bootstrap 95% interval | permutation p |\n|---|---|---|---|\n';
for (const [k, c] of Object.entries(contrasts)) md += `| ${k} | ${c.diff >= 0 ? '+' : ''}${f1(c.diff)} | ${f1(c.ci95[0])} to ${f1(c.ci95[1])} | ${c.p.toFixed(4)} |\n`;
md += '\nAlive includes arrived people when arrivals are on, so on and off arms are not compared with each other here.\n\n## Draws\n\n';
for (const arm of ARMS) md += `- ${arm}: ${arms[arm].draws.map(r => `${r.spec}@${r.fork}=${r.alive}`).join(', ')}\n`;
writeFileSync(join(OUT, 'summary.md'), md);
writeFileSync(join(OUT, 'summary.json'), JSON.stringify({arms, contrasts, p01b: {compared: compared.length, same: p01bSame}, problems}, null, 2) + '\n');
console.log(md.split('\n## Draws')[0]);
