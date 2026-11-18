// Read-only. Part B of stage 1c step 6: the noise floor of each version on its own (lab_versions.ts pools both), and the seeds whose control
// and nudge:1 end with the same hash. Same definition of the floor as lab_versions.ts: sd over seeds and arms of (one arm minus the mean of the
// other arms of its own run), here per version. Sample sd; the choice does not matter for comparing the two versions.
// usage: node equiv_floors.mjs <earlier lab dir> <later lab dir> <lab_versions stdout, for the metric names>
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dirA, dirB, reportFile] = process.argv.slice(2);
function load(dir) {
  const bySeed = new Map();
  for (const f of readdirSync(dir).filter((f) => /^lab_.*\.jsonl$/.test(f)).sort()) {
    for (const l of readFileSync(join(dir, f), 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(l);
      if (!r.spec) continue;
      if (!bySeed.has(r.seed)) bySeed.set(r.seed, []);
      bySeed.get(r.seed).push(r);
    }
  }
  return bySeed;
}
const REF = ['control', 'nudge:1', 'nudge:2'];
const A = load(dirA), B = load(dirB);
const seeds = [...A.keys()].filter((s) => B.has(s)).sort();
const metrics = readFileSync(reportFile, 'utf8').split('\n')
  .map((l) => l.match(/^(\S+)\s+[-+0-9.e]+\s+[-+0-9.e]+\s+[-+0-9.e]+\s+\[.*\]\s+\d+\/\d+\s+\S/))
  .filter(Boolean).map((m) => m[1]);
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const arms = (runs, s) => REF.map((spec) => runs.get(s).find((r) => r.spec === spec));
function floor(runs, m) {
  const d = [];
  for (const s of seeds) {
    const rows = arms(runs, s);
    rows.forEach((r, i) => d.push(r.outcome[m] - mean(rows.filter((_, j) => j !== i).map((x) => x.outcome[m]))));
  }
  return sd(d);
}
console.log(`seeds ${seeds.length}: ${seeds.join(', ')}; metrics read from the report: ${metrics.length}`);
const rows = metrics.map((m) => ({ m, a: floor(A, m), b: floor(B, m) }));
const live = rows.filter((r) => r.a > 0 || r.b > 0);
const less = live.filter((r) => r.b < r.a - 1e-12).length, more = live.filter((r) => r.b > r.a + 1e-12).length, tie = live.length - less - more;
console.log(`\nFLOOR PER VERSION, metrics with a floor above zero in at least one version: ${live.length}`);
console.log(`  floor at the later version smaller on ${less}, larger on ${more}, equal on ${tie}`);
const ratio = live.filter((r) => r.a > 0).map((r) => r.b / r.a).sort((x, y) => x - y);
console.log(`  later floor over earlier floor: median ${ratio[Math.floor(ratio.length / 2)].toFixed(2)}, lower quartile ${ratio[Math.floor(ratio.length / 4)].toFixed(2)}, upper quartile ${ratio[Math.floor((3 * ratio.length) / 4)].toFixed(2)}`);
const SHOW = (process.argv[5] || 'chats,otherTalk,spareTime,guestJobs,soloStones,soloBugs,nKilns,people,deaths,meanHunger,hungerExposure,belowCritical,homeless,meanMood,lowMood').split(',');
console.log('\nmetric                 floor 255   floor 256   256/255');
for (const m of SHOW) {
  const r = rows.find((x) => x.m === m);
  if (r) console.log(`${m.padEnd(22)}${r.a.toFixed(2).padStart(9)}${r.b.toFixed(2).padStart(12)}${(r.a > 0 ? (r.b / r.a).toFixed(2) : 'n/a').padStart(10)}`);
}
console.log('\nSEEDS WHOSE CONTROL AND nudge:1 END WITH THE SAME HASH, and control and nudge:2');
for (const [name, runs] of [['earlier', A], ['later', B]]) {
  const same1 = [], same2 = [], same12 = [];
  for (const s of seeds) {
    const [c, n1, n2] = arms(runs, s).map((r) => r.finalHash);
    if (c === n1) same1.push(s);
    if (c === n2) same2.push(s);
    if (n1 === n2) same12.push(s);
  }
  console.log(`  ${name}: control=nudge:1 on ${same1.length} [${same1.join(', ')}]; control=nudge:2 on ${same2.length} [${same2.join(', ')}]; nudge:1=nudge:2 on ${same12.length} [${same12.join(', ')}]`);
}
