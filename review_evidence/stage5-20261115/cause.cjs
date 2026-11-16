// Read-only. What the twelve rules-251 twenty-year traces say about the collapses, from the traces alone (no new run).
// node cause.cjs > cause.txt
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'traces');
const seeds = ['aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'];
const T = Object.fromEntries(seeds.map(s => [s, JSON.parse(fs.readFileSync(path.join(dir, s + '-on.json'), 'utf8'))]));

console.log('1. Standing trees at the end of each 12-day year (year 1..20)');
for (const s of seeds) console.log(s.padEnd(7), T[s].years.map(y => y.trees).join(' '));

console.log('\n2. Order of events (days): trees down to 15 or fewer; buildings down to 85% and 50% of their peak; people down to 70% of their peak');
for (const s of seeds) {
  const t = T[s], D = t.days;
  const tz = t.years.find(y => y.trees <= 15);
  let mx = 0, d85 = null, d50 = null, pk = 0, pkd = 0, p70 = null;
  for (const d of D) {
    if (d.buildings > mx) mx = d.buildings;
    if (d.alive > pk) { pk = d.alive; pkd = d.day; }
    if (d85 === null && d.buildings <= 0.85 * mx && d.day > 40) d85 = d.day;
    if (d50 === null && d.buildings <= 0.5 * mx && d.day > 40) d50 = d.day;
  }
  for (const d of D) if (d.day > pkd && d.alive <= 0.7 * pk) { p70 = d.day; break; }
  console.log(s.padEnd(7), 'trees<=15:', tz ? tz.day : 'never', '| buildings 85%:', d85, ' 50%:', d50, '| people peak', pk, '@', pkd, ' 70%:', p70);
}

console.log('\n3. Change in standing trees over one 12-day year, by the settlement\'s mean size (years that began with 250 or more trees)');
const pts = [];
for (const s of seeds) { const y = T[s].years; for (let i = 1; i < y.length; i++) { const a = y[i-1], b = y[i]; if (a.trees < 250 || !a.alive || !b.alive) continue; pts.push([(a.alive + b.alive) / 2, b.trees - a.trees]); } }
const bins = {}; for (const [p, d] of pts) (bins[Math.floor(p / 20) * 20] = bins[Math.floor(p / 20) * 20] || []).push(d);
for (const k of Object.keys(bins).sort((a, b) => a - b)) { const v = bins[k]; console.log('people', k + '-' + (+k + 19), 'years', v.length, 'mean change', (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)); }

console.log('\n4. The same trees in the rules-220 set (arrivals on; 25 to 59 people), years 1, 5, 10, 15, 20');
const g = path.join(__dirname, '..', 'generation-20261113', 'traces');
for (const s of seeds) { try { const y = JSON.parse(fs.readFileSync(path.join(g, s + '-on.json'), 'utf8')).years; console.log(s.padEnd(7), [1,5,10,15,20].map(n => y[n-1] ? y[n-1].trees : '-').join(' '), '| people y10', y[9] ? y[9].alive : '-', 'y20', y[19] ? y[19].alive : '-'); } catch (e) {} }
