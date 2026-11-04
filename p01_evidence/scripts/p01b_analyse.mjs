// P0.1b analysis: people alive at the end of each arm against the noise floor (control, nudge:1, nudge:2).
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const EV = 'C:/dev/Claude Experiment/living-world-integrate/p01_evidence';
const DIRS = ['p01b-forest', 'p01b-8seeds'];
const FLOOR = ['control', 'nudge:1', 'nudge:2'];
const ARMS = ['rich-no-childhood', 'rich-no-lived-life', 'rich-no-critical-search', 'rich-no-reachable-tilling'];

const seeds = [];
for (const d of DIRS) for (const f of readdirSync(join(EV, d)).filter(f => /^lab_.+\.jsonl$/.test(f)).sort()) {
  const lines = readFileSync(join(EV, d, f), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const done = lines.some(r => r.done);
  const rows = Object.fromEntries(lines.filter(r => r.spec).map(r => [r.spec, r]));
  seeds.push({seed: f.slice(4, -6), done, rows});
}

const end = r => r?.outcome?.people;
const dead = r => r?.outcome?.deaths;
let md = '# P0.1b switch ablation at rules 121 (arrivals off, Normal, fork day 4, 21 days)\n\n';
md += 'People alive at the end of each arm. Floor = control, nudge:1, nudge:2; an arm is marked * when it lies outside the floor range.\n\n';
md += `| Seed | done | ${FLOOR.join(' | ')} | floor mean | ${ARMS.join(' | ')} |\n|---|---|${FLOOR.map(() => '---').join('|')}|---|${ARMS.map(() => '---').join('|')}|\n`;
const sum = Object.fromEntries(ARMS.map(a => [a, {diff: [], outside: 0, n: 0}]));
for (const s of seeds) {
  const fl = FLOOR.map(b => end(s.rows[b])).filter(v => v !== undefined);
  const m = fl.reduce((a, b) => a + b, 0) / Math.max(1, fl.length), lo = Math.min(...fl), hi = Math.max(...fl);
  const cells = ARMS.map(a => {
    const v = end(s.rows[a]);
    if (v === undefined) return '-';
    sum[a].diff.push(v - m); sum[a].n++; if (v < lo || v > hi) sum[a].outside++;
    return `${v}${v < lo || v > hi ? '*' : ''} (${dead(s.rows[a])}d)`;
  });
  md += `| ${s.seed} | ${s.done} | ${FLOOR.map(b => s.rows[b] ? `${end(s.rows[b])} (${dead(s.rows[b])}d)` : '-').join(' | ')} | ${m.toFixed(1)} | ${cells.join(' | ')} |\n`;
}
md += '\n## Per arm across seeds\n\n| Arm | seeds | mean difference from floor mean | outside floor range |\n|---|---|---|---|\n';
for (const a of ARMS) { const x = sum[a]; md += `| ${a} | ${x.n} | ${(x.diff.reduce((p, q) => p + q, 0) / Math.max(1, x.n)).toFixed(2)} | ${x.outside} of ${x.n} |\n`; }
const forest = seeds.find(s => s.seed === 'forest');
if (forest) {
  md += '\n## Forest people by day after the fork (fork = day 4)\n\n';
  for (const b of [...FLOOR, ...ARMS]) if (forest.rows[b]) md += `- ${b}: ${forest.rows[b].popByDay.join(' ')}\n`;
}
writeFileSync(join(EV, 'p01b-summary.md'), md);
console.log(md);
