// Combine the per-world raw_grain_probe JSON files into one table. Usage: node aggregate.mjs out/run_aspen.json out/run_cedar.json ...
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const runs = files.map((f) => JSON.parse(readFileSync(f, 'utf8')));
const add = (a, b, k) => { a[k] = (a[k] ?? 0) + b; };
const r1 = (n) => Math.round(n * 10) / 10;

function categories(R) {
  const c = {};
  const cons = R.grainExits.consumedByReason;
  const spo = R.grainExits.spoiledByReason;
  const es = R.eatenSplit;
  const eatenLedger = cons['eaten'] ?? 0;
  const eatPack = es.fromThePackWhileEating;
  const eatStore = es.mealTakenFromAStoreAndEatenFromThePack;
  const table = es.eatenAtAStoreTable;
  const other = Math.max(0, eatenLedger - eatPack - eatStore - table);
  c['eaten from the pack (activity eat)'] = eatPack;
  c['eaten from the pack after taking a meal from a store (eat_store)'] = eatStore;
  c["eaten at a store's table"] = table;
  c['eaten, other (hand-fed, unattributed)'] = other;
  c['eaten at the wild source'] = cons['eaten at the source'] ?? 0;
  c['eaten at a shared meal'] = cons['eaten at a shared meal'] ?? 0;
  let milled = 0, brewed = 0, seed = 0, sheep = 0, rest = 0;
  for (const [k, n] of Object.entries(cons)) {
    if (k === 'eaten' || k === 'eaten at the source' || k === 'eaten at a shared meal') continue;
    if (/^(used in (milled flour|ground flour)|wasted: (husks and chaff|bran and dust))$/.test(k)) milled += n;
    else if (/^(used in beer|wasted: spent mash)$/.test(k)) brewed += n;
    else if (k === 'saved as seed') seed += n;
    else if (k === 'feeding sheep') sheep += n;
    else rest += n;
  }
  c['loaded into mill/bakery (milled, incl. husks)'] = milled;
  c['brewed'] = brewed;
  c['saved as seed'] = seed;
  c['fed to sheep'] = sheep;
  c['other consumed'] = rest;
  c['spoiled in the granary bins'] = spo['grain bins: stored food spoiled'] ?? 0;
  c['spoiled in other stores'] = spo['stored food spoiled'] ?? 0;
  c['rotted unharvested in the field'] = spo['crop left to rot'] ?? 0;
  c['spoiled left out in the open'] = spo['left-out food spoiled'] ?? 0;
  const known = ['grain bins: stored food spoiled', 'stored food spoiled', 'crop left to rot', 'left-out food spoiled'];
  c['spoiled, other'] = Object.entries(spo).filter(([k]) => !known.includes(k)).reduce((s, [, n]) => s + n, 0);
  return c;
}

function sumObj(into, o) { for (const [k, n] of Object.entries(o ?? {})) add(into, n, k); }

const tot = { cat: {}, created: {}, flour: {}, bread: {}, breadConsumed: {}, flourConsumed: {}, breadSpoiled: {}, flourSpoiled: {}, inflows: {}, bites: {} };
const per = [];
for (const R of runs) {
  const c = categories(R);
  sumObj(tot.cat, c);
  sumObj(tot.created, R.grainExits.createdByReason);
  sumObj(tot.flour, R.flourMade); sumObj(tot.bread, R.breadMade);
  sumObj(tot.breadConsumed, R.breadConsumed); sumObj(tot.flourConsumed, R.flourConsumed);
  sumObj(tot.breadSpoiled, R.breadSpoiled); sumObj(tot.flourSpoiled, R.flourSpoiled);
  sumObj(tot.inflows, R.packInflows);
  per.push({ seed: R.seed, c, R });
}
const sum = (o) => Object.values(o).reduce((s, n) => s + n, 0);
const exitTot = sum(tot.cat);
console.log(`worlds: ${runs.map((r) => `${r.seed} ${r.startDay}->${r.days}`).join(', ')}`);
console.log(`people start->end: ${runs.map((r) => `${r.seed} ${r.people.start}->${r.people.end}`).join(', ')}`);
console.log(`grain created: ${r1(sum(tot.created))}  (${Object.entries(tot.created).map(([k, n]) => k + ' ' + r1(n)).join(', ')})`);
console.log(`grain removed: ${r1(exitTot)}`);
const seeds = per.map((p) => p.seed);
console.log(['how'.padEnd(66), 'ALL units', 'ALL %', ...seeds.map((s) => s.padStart(7))].join(' | '));
for (const k of Object.keys(tot.cat)) {
  const n = tot.cat[k];
  console.log([k.padEnd(66), String(r1(n)).padStart(9), (100 * n / exitTot).toFixed(1).padStart(5), ...per.map((p) => String(r1(p.c[k])).padStart(7))].join(' | '));
}
console.log(['TOTAL removed'.padEnd(66), String(r1(exitTot)).padStart(9), '100.0', ...per.map((p) => String(r1(sum(p.c))).padStart(7))].join(' | '));
console.log('flour made', JSON.stringify(tot.flour), 'bread made', JSON.stringify(tot.bread));
console.log('flour consumed', JSON.stringify(tot.flourConsumed), 'flour spoiled', JSON.stringify(tot.flourSpoiled));
console.log('bread consumed', JSON.stringify(tot.breadConsumed), 'bread spoiled', JSON.stringify(tot.breadSpoiled));
console.log('per world flour/bread made', per.map((p) => `${p.seed}: flour ${r1(sum(p.R.flourMade))} bread ${r1(sum(p.R.breadMade))}`).join('; '));
console.log('pack inflows (all worlds)', JSON.stringify(Object.fromEntries(Object.entries(tot.inflows).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, r1(n)]))));

// bites
const kinds = new Set();
for (const R of runs) for (const k of Object.keys(R.packBites)) kinds.add(k);
for (const k of kinds) {
  let units = 0, only = 0, withOther = 0, hungerSum = 0, hn = 0;
  const band = {}, stage = {}, knew = {}, lastIn = {}, age = {}, held = {}, other = {};
  let knewGranaryGrain = 0, ageSum = 0, ageN = 0;
  for (const R of runs) {
    const b = R.packBites[k]; if (!b) continue;
    units += b.units; only += b.grainWasTheOnlyFood;
    sumObj(band, b.hungerBand); sumObj(stage, b.stage); sumObj(knew, b.knew); sumObj(lastIn, b.lastGrainIntoThePackWas); sumObj(age, b.lastGrainIntoThePackAge); sumObj(held, b.grainHeldBeforeBite);
    for (const [f, n] of Object.entries(b.otherFoodPresent)) add(other, n, f);
    knewGranaryGrain += b.knewAGranaryHoldingGrain;
    hungerSum += b.hunger.mean * b.units; hn += b.units;
    ageSum += b.ageYears.mean * b.units; ageN += b.units;
  }
  console.log(`BITES ${k}: ${units} units; grain the only food ${only} (${(100 * only / Math.max(1, units)).toFixed(1)}%); other food present on ${units - only} (${(100 * (units - only) / Math.max(1, units)).toFixed(1)}%): ${JSON.stringify(other)}`);
  console.log(`   mean hunger ${r1(hungerSum / Math.max(1, hn))}, mean age ${r1(ageSum / Math.max(1, ageN))}; hunger bands ${JSON.stringify(band)}; stage ${JSON.stringify(stage)}`);
  console.log(`   knew: ${JSON.stringify(knew)}; knew a granary holding grain on ${knewGranaryGrain} units (${(100 * knewGranaryGrain / Math.max(1, units)).toFixed(1)}%)`);
  console.log(`   last grain into the pack: ${JSON.stringify(Object.fromEntries(Object.entries(lastIn).sort((a, b) => b[1] - a[1]).map(([k2, n]) => [k2, n])))}; age ${JSON.stringify(age)}; held before bite ${JSON.stringify(held)}`);
}
const failed = {};
for (const R of runs) for (const [k, v] of Object.entries(R.rulesFailedWhileEatingFromAPack ?? {})) { const f = (failed[k] ??= { units: 0, hs: 0, band: {}, stage: {}, knewGranary: 0 }); f.units += v.units; f.hs += v.meanHunger * v.units; sumObj(f.band, v.hungerBand); sumObj(f.stage, v.stage); f.knewGranary += v.knewAGranary; }
for (const [k, f] of Object.entries(failed)) console.log(`OTHER FOOD HELD while eating grain from a pack (${k}): ${f.units} units, mean hunger ${r1(f.hs / Math.max(1, f.units))}, bands ${JSON.stringify(f.band)}, stage ${JSON.stringify(f.stage)}, also knew a granary ${f.knewGranary}`);
const onlyG = {};
for (const R of runs) sumObj(onlyG, R.onlyFoodAndKnewAGranaryWithGrain);
console.log('grain the only food AND a granary holding grain was known:', JSON.stringify(onlyG));
// per-run reconcile
for (const R of runs) console.log(`RECONCILE ${R.seed}: ${JSON.stringify(R.reconcile)} packUnexplained ${JSON.stringify(R.packUnexplained)}; storeUnexplained loss ${JSON.stringify(R.storeUsedUp.unexplainedLoss)} gain ${R.storeUsedUp.unexplainedGain} returnedFromBatch ${R.storeUsedUp.returnedFromBatch}`);
