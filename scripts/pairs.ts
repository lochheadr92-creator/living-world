import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
import { ageYears, stageOf } from '../src/sim/people';
const seed = process.argv[2] ?? 'meadow';
const days = Number(process.argv[3] ?? 20);
const w = createWorld(defaultSettings(seed));
for (let i = 0; i < days * 2400; i++) stepWorld(w);
const text = w.events.map((e) => e.text);
const cnt = (re: RegExp) => text.filter((t) => re.test(t)).length;
console.log('couples', cnt(/became a couple/), 'moved in', cnt(/moved in together/), 'share a home', cnt(/now share a home/), 'births', cnt(/was born/), 'arrivals', cnt(/arrives/));
// affinity matrix for single fertile women vs single men
const singlesF = w.persons.filter((p) => p.alive && p.sex === 'f' && p.partnerId === 0 && ageYears(w, p) >= 17 && ageYears(w, p) <= 44);
const singlesM = w.persons.filter((p) => p.alive && p.sex === 'm' && p.partnerId === 0 && ageYears(w, p) >= 17);
console.log('single fertile women', singlesF.length, 'single men', singlesM.length);
for (const f of singlesF) {
  const row: string[] = [];
  for (const m of singlesM) {
    const a = f.relations[m.id]; const b = m.relations[f.id];
    row.push(`${m.name}:${a ? a.affinity.toFixed(0) : '-'}/${b ? b.affinity.toFixed(0) : '-'}t${a ? a.trust.toFixed(0) : '-'}f${a ? a.familiarity.toFixed(0) : '-'}`);
  }
  console.log(`${f.name}(${ageYears(w, f).toFixed(0)}, hh${f.hhId}, stage ${stageOf(w, f)}) -> ${row.join(' ')}`);
}
// all affinity quantiles among adults
const aff: number[] = [];
for (const p of w.persons) if (p.alive) for (const k in p.relations) { const q = w.byId.get(Number(k)); if (q && (q as any).alive) aff.push(p.relations[k as any].affinity); }
aff.sort((a, b) => a - b);
const q = (f: number) => aff[Math.floor(aff.length * f)].toFixed(0);
console.log('affinity quantiles 10/50/90/99:', q(0.1), q(0.5), q(0.9), q(0.99), 'max', aff[aff.length - 1].toFixed(0));
