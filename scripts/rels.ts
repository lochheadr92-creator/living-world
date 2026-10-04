import { defaultSettings, createWorld } from '../src/sim/factory';
import { stepWorld } from '../src/sim/world';
const w = createWorld(defaultSettings(process.argv[2] ?? 'meadow'));
for (let i = 0; i < Number(process.argv[3] ?? 12) * 2400; i++) stepWorld(w);
const aff: number[] = []; let strong = 0, friend = 0, negative = 0; const pairs = new Set<string>();
for (const p of w.persons) for (const k in p.relations) { const r = p.relations[k as unknown as number]; if (r.kin) continue; aff.push(r.affinity); if (r.affinity >= 52) strong++; if (r.affinity >= 32) friend++; if (r.affinity < -10) negative++; }
aff.sort((a, b) => b - a);
console.log('non-kin directed relations', aff.length, 'top', aff.slice(0, 12).map(x => x.toFixed(0)).join(','), 'friend(>=32)', friend, 'strong(>=52)', strong, 'negative', negative);
const single = w.persons.filter(p => p.partnerId === 0 && Math.floor((w.tick - p.birthTick) / 2400) >= 17).length;
console.log('unpartnered adults', single, 'households', w.households.length, 'sizes', w.households.map(h => h.members.length).join(','));
