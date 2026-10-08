// Writes docs/recipes.generated.md from the data tables the simulation itself reads (so the documentation cannot drift from the rules).
// usage: npx vite-node scripts/docs.ts
import { writeFileSync } from 'node:fs';
import { BUILD_DEF, CART_CAP, CARRY_CAP, DAY, DECAY_PER_TICK, ITEM_LABEL, NUTRITION, PERISHABLE, REPAIR_USES, SOURCE_MAX, TOOL_DEFS, TOOL_EFFECT, WEIGHT } from '../src/sim/constants';
import { RECIPES } from '../src/sim/recipes';
import type { Items, ItemKind } from '../src/sim/types';

const items = (it: Items): string => {
  const parts = (Object.keys(it) as ItemKind[]).filter((k) => (it[k] ?? 0) > 0).map((k) => `${it[k]} ${ITEM_LABEL[k]}`);
  return parts.length ? parts.join(', ') : '—';
};
const secs = (ticks: number): string => (ticks ? `${Math.round(ticks / 10)} s` : '—');

let out = '# Generated tables\n\nWritten by `npx vite-node scripts/docs.ts` from `src/sim/constants.ts` and `src/sim/recipes.ts`. Durations are simulation seconds at 1× (10 ticks); a day is 240 s.\n\n';

out += '## Buildings\n\n| Building | Footprint | Materials | Construction work | Storage (weight) | Max builders | Decay per day | Role |\n|---|---|---|---|---|---|---|---|\n';
for (const t of Object.keys(BUILD_DEF) as (keyof typeof BUILD_DEF)[]) {
  const d = BUILD_DEF[t];
  out += `| ${d.label} | ${d.w}×${d.h} | ${items(d.cost)} | ${secs(d.work)} | ${d.cap || '—'} | ${d.workers} | ${t === 'fire' ? '—' : (DECAY_PER_TICK[t] * DAY).toFixed(1) + '%'} | ${d.blurb} |\n`;
}

out += '\n## Recipes (what a workplace makes)\n\n| Workplace | Batch | Inputs | Fuel | Work | Burn | Products | Waste (recorded) | Tool | Skill | Workers | Why anyone makes it |\n|---|---|---|---|---|---|---|---|---|---|---|---|\n';
for (const r of RECIPES) {
  const prod = r.toolOut ? `an ${r.toolOut.tier ? 'iron ' : ''}${TOOL_DEFS[r.toolOut.kind].label}` : r.cartOut ? 'a handcart' : r.fromDeposit ? `${r.fromDeposit.n} ${ITEM_LABEL[r.fromDeposit.item]} ${r.at === 'mine' ? 'dug from the vein' : 'cut from the outcrop'}` : items(r.outputs);
  out += `| ${BUILD_DEF[r.at].label} | ${r.label} | ${r.fromDeposit ? '—' : items(r.inputs)} | ${items(r.fuel)} | ${secs(r.work)} | ${secs(r.burn)} | ${prod} | ${Object.keys(r.waste).length ? `${items(r.waste)} (${r.wasteWhy})` : '—'} | ${r.tool ? `${r.tool.kind}${r.tool.required ? ' (required)' : ` (×${r.tool.speed} time)`}` : '—'} | ${r.skill ?? '—'} | ${r.workers} | ${r.benefit} |\n`;
}

out += '\n## Items\n\n| Item | Weight | Hunger restored | Spoils (relative rate) | Used to mend |\n|---|---|---|---|---|\n';
for (const k of Object.keys(WEIGHT) as ItemKind[]) {
  const mends = (Object.keys(REPAIR_USES) as (keyof typeof REPAIR_USES)[]).filter((b) => REPAIR_USES[b] === k).map((b) => BUILD_DEF[b].label);
  out += `| ${ITEM_LABEL[k]} | ${WEIGHT[k]} | ${(NUTRITION as Record<string, number>)[k] ?? '—'} | ${PERISHABLE[k] ?? '—'} | ${mends.join(', ') || (k === 'wood' ? 'everything else' : '—')} |\n`;
}

out += '\n## Tools\n\n| Tool | Made by hand from | Hand-making work | Wear per tick of use | What it is for |\n|---|---|---|---|---|\n';
for (const k of Object.keys(TOOL_DEFS) as (keyof typeof TOOL_DEFS)[]) {
  const d = TOOL_DEFS[k];
  out += `| ${d.label} | ${d.hand ? items(d.hand.cost) : 'cannot be made by hand (kiln)'} | ${d.hand ? secs(d.hand.work) : '—'} | ${d.wear} (iron: ${d.wear / 2}) | ${d.blurb} |\n`;
}
out += `\nDuration multipliers while using the right tool (lower is faster): ${Object.entries(TOOL_EFFECT)
  .map(([k, v]) => `${k} ${v}`)
  .join(', ')}. Past 70 wear the benefit fades linearly to nothing at 100, where the tool breaks.\n`;

out += `\n## Deposits and carrying\n\n- Clay pit: ${SOURCE_MAX.clay_pit} clay · ore vein: ${SOURCE_MAX.ore_vein} ore · stone outcrop: ${SOURCE_MAX.outcrop} stone (all finite, none regrow).\n- A person carries ${CARRY_CAP.child}/${CARRY_CAP.youth}/${CARRY_CAP.adult}/${CARRY_CAP.elder} weight (child/youth/adult/elder); a handcart's bed holds ${CART_CAP}.\n`;

writeFileSync(new URL('../docs/recipes.generated.md', import.meta.url), out);
console.log(out.split('\n').length, 'lines written to docs/recipes.generated.md');
