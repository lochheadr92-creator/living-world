// Why one lab seed read hungrier at day 30 with batch plans: npx vite-node scripts/chain_hunger_trace.ts plans|noplans (river, Normal, 30 days).
// Why does the river lab world have 5-6 people below critical hunger at day 30 with batch plans and 0 without?
import { createWorld } from '../src/sim/factory';
import { freshRunSettings, parseRunRules } from '../src/sim/profiles';
import { stepWorld } from '../src/sim/world';
import { DAY } from '../src/sim/constants';
import { setBatchPlans } from '../src/sim/batch_plan';
const arm = process.argv[2] ?? 'plans';
setBatchPlans(arm === 'plans');
const settings = freshRunSettings(parseRunRules('rich'), 'normal', 'river', { immigration: false });
const w = createWorld(settings);
const batchHolders = new Set<number>();
const hungryDays: Record<number, number> = {};
for (let d = 0; d < 30; d++) {
  for (let t = 0; t < DAY; t++) {
    stepWorld(w);
    if (w.tick % 60 === 0) for (const p of w.persons) if (p.alive) {
      if (p.intentions.some((i) => i.kind === 'batch')) batchHolders.add(p.id);
      if (p.needs.hunger < 14) hungryDays[p.id] = (hungryDays[p.id] ?? 0) + 1;
    }
  }
  const alive = w.persons.filter((p) => p.alive);
  const below = alive.filter((p) => p.needs.hunger < 14);
  const mean = alive.reduce((s, p) => s + p.needs.hunger, 0) / alive.length;
  const food = w.buildings.reduce((s, b) => s + Object.entries(b.store?.items ?? {}).filter(([k]) => ['berries','bread','meat','grain','fish'].includes(k)).reduce((x, [, v]) => x + (v ?? 0), 0), 0);
  const batches = alive.filter((p) => p.intentions.some((i) => i.kind === 'batch')).length;
  if (d >= 20 || d % 5 === 0) console.log(`day ${d + 1} alive ${alive.length} meanHunger ${mean.toFixed(1)} below ${below.length} storedFood ${food} activeBatches ${batches} ${below.map((p) => `${p.name}(${Math.round(p.needs.hunger)}${p.intentions.some((i)=>i.kind==='batch')?'*':''}${batchHolders.has(p.id)?'h':''}:${p.activity?.label ?? '-'})`).join(' ')}`);
}
console.log('batch holders ever', batchHolders.size, 'of', w.persons.length, '; sixty-tick samples below critical by person:', JSON.stringify(Object.fromEntries(Object.entries(hungryDays).map(([id, n]) => [w.persons.find((p) => p.id === Number(id))?.name + (batchHolders.has(Number(id)) ? '*' : ''), n]))));
