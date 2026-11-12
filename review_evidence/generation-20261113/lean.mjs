import { readFileSync, readdirSync } from 'node:fs';
const runs = readdirSync('traces').filter((f) => /-(on|off)\.json$/.test(f)).map((f) => JSON.parse(readFileSync('traces/' + f, 'utf8')));
const bands = [[0, 29], [30, 34], [35, 39], [40, 44], [45, 49], [50, 54], [55, 99]];
const acc = bands.map(() => ({ n: 0, deaths: 0, hunger: 0, winter: 0, wDeaths: 0, noW: 0, nDeaths: 0, big: 0 }));
let seasons = 0;
for (const r of runs) {
  const d = r.days;
  for (let i = 0; i < d.length; i++) {
    if (d[i].hardship !== 'lean' || (i > 0 && d[i - 1].hardship === 'lean')) continue;
    let j = i; while (j < d.length && d[j].hardship === 'lean') j++;
    const end = Math.min(d.length, j + 3); // the season and the three days after
    const pop = i > 0 ? d[i - 1].alive : 28;
    let deaths = 0, hunger = 0, winter = false;
    for (let k = i; k < end; k++) { deaths += d[k].died; hunger += (d[k].causes.hunger ?? 0); if (((d[k].day - 1) % 12) >= 8 && k < j) winter = true; }
    const b = acc[bands.findIndex(([a, z]) => pop >= a && pop <= z)];
    b.n++; b.deaths += deaths; b.hunger += hunger; if (deaths >= 8) b.big++;
    if (winter) { b.winter++; b.wDeaths += deaths; } else { b.noW++; b.nDeaths += deaths; }
    seasons++;
  }
}
console.log(`lean seasons in all 24 runs: ${seasons}`);
console.log('people when it began | seasons | deaths a season | of hunger | 8 or more died | into winter: n, deaths | clear of winter: n, deaths');
bands.forEach(([a, z], i) => { const b = acc[i]; if (b.n) console.log(`${String(a).padStart(3)}-${String(z).padEnd(3)} | ${String(b.n).padStart(3)} | ${(b.deaths / b.n).toFixed(1).padStart(5)} | ${(b.hunger / b.n).toFixed(1).padStart(5)} | ${String(b.big).padStart(2)} of ${b.n} | ${b.winter}, ${b.winter ? (b.wDeaths / b.winter).toFixed(1) : '-'} | ${b.noW}, ${b.noW ? (b.nDeaths / b.noW).toFixed(1) : '-'}`); });
// arrivals: how many came in all, and totals
for (const arm of [true, false]) { const rs = runs.filter((r) => r.arrivals === arm); const tot = (f) => rs.reduce((n, r) => n + r.days.reduce((m, d) => m + f(d), 0), 0) / rs.length;
  console.log(`arrivals ${arm ? 'on' : 'off'}: per settlement over 240 days born ${tot((d) => d.born).toFixed(1)}, came ${tot((d) => d.came).toFixed(1)}, died ${tot((d) => d.died).toFixed(1)}`); }
