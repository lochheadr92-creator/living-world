// SCRATCH ONLY (free block experiment, 17 November 2026). The classification table for out\free\report.md, kept as data and checked against
// the real function: every row below is an option as one generator builds it (file:line is where the generator calls addOption, or
// pushes onto ctx.options, at rules 250 in this scratch tree; kind, need, tag and key are read from that site), with the verdict I read
// for it. The script calls src/sim/free_block.ts classifyOption on each row and exits 1 on any disagreement, so the table cannot say
// something the gate does not do. Read only: it builds no world.
//
//   node node_modules/vite-node/dist/cli.mjs scripts/free_classify.ts -- [--md <file to write the table to>]
import { writeFileSync } from 'node:fs';
import { classifyOption } from '../src/sim/free_block';
import type { ActivityKind, NeedKey } from '../src/sim/types';

interface Row { site: string; kind: ActivityKind; need: NeedKey | null; tag?: string; key: string; verdict: 'gated' | 'kept'; doubtful?: string }
const G = 'gated', K = 'kept';
const rows: Row[] = [
  // ── options_survival.ts: eating, drinking, warmth, sleep, rest, flight ──
  { site: 'options_survival.ts:131', kind: 'flee', need: 'safety', tag: undefined, key: 'flee:0', verdict: K },
  { site: 'options_survival.ts:229 (foragePlans, mode eat)', kind: 'gather', need: 'hunger', tag: 'food', key: 'gather:ID', verdict: K },
  { site: 'options_survival.ts:229 (foragePlans, mode stock)', kind: 'gather', need: null, tag: 'food', key: 'gather:ID', verdict: G },
  { site: 'options_survival.ts:229 (foragePlans, food for a named person)', kind: 'gather', need: null, tag: 'care', key: 'care_supply:ID:gather:ID', verdict: K },
  { site: 'options_survival.ts:304', kind: 'eat', need: 'hunger', tag: 'food', key: 'eat:0', verdict: K },
  { site: 'options_survival.ts:365', kind: 'eat_store', need: 'hunger', tag: 'food', key: 'eat_store:ID', verdict: K },
  { site: 'options_survival.ts:411', kind: 'drink', need: 'thirst', tag: 'water', key: 'drink:inv', verdict: K },
  { site: 'options_survival.ts:441', kind: 'drink', need: 'thirst', tag: 'water', key: 'drink:ID', verdict: K },
  { site: 'options_survival.ts:516', kind: 'sleep', need: 'energy', tag: 'rest', key: 'sleep:ID', verdict: K },
  { site: 'options_survival.ts:549', kind: 'sleep', need: 'energy', tag: 'rest', key: 'sleep:here', verdict: K },
  { site: 'options_survival.ts:595', kind: 'warm', need: 'warmth', tag: 'warmth', key: 'warm:ID', verdict: K },
  { site: 'options_survival.ts:634', kind: 'rest', need: 'warmth', tag: 'warmth', key: 'rest:home:ID', verdict: K },
  { site: 'options_survival.ts:691', kind: 'rest', need: 'warmth', tag: 'rest', key: 'shelter:ID', verdict: K },
  { site: 'options_survival.ts:730', kind: 'rest', need: 'energy', tag: 'rest', key: 'rest:here', verdict: K },
  { site: 'stored_water.ts:11', kind: 'drink', need: 'thirst', tag: 'water', key: 'drink:store:ID', verdict: K },
  { site: 'wells.ts:57', kind: 'drink', need: 'thirst', tag: 'water', key: 'drink:well:ID', verdict: K },
  { site: 'defence.ts:240', kind: 'defend', need: 'safety', tag: 'danger', key: 'defend:ID', verdict: K },
  { site: 'hungry_harvest.ts:30', kind: 'harvest', need: 'hunger', tag: 'food', key: 'harvest:ID', verdict: K },
  { site: 'hearth.ts:88', kind: 'plan_site', need: 'warmth', tag: 'build', key: 'hearth_layout:ID', verdict: K },
  { site: 'hearth.ts:97', kind: 'fuel_fire', need: 'warmth', tag: 'fire', key: 'hearth_fuel:ID', verdict: K },
  { site: 'clothing.ts:86', kind: 'tool_work', need: 'warmth', tag: 'warmth', key: 'dress:ID', verdict: K },
  { site: 'hunting.ts:57', kind: 'hunt', need: 'hunger', tag: 'food', key: 'hunt:ID', verdict: K, doubtful: 'work category; hunts for meat, but the option is built as hunger-serving (need hunger), so it is kept' },
  { site: 'passive_gear.ts:107', kind: 'gear_work', need: 'hunger', tag: 'food', key: 'gear:OP:ID', verdict: K, doubtful: 'setting, checking and retrieving traps and nets is work for later, but every option is built with need hunger, so it is kept' },
  { site: 'carcass.ts:98', kind: 'butcher', need: 'hunger', tag: 'food', key: 'butcher:ID:PART', verdict: K, doubtful: 'recovering meat from a body: built with need hunger (warmth for a hide), so it is kept' },
  { site: 'carcass_supply.ts:33', kind: 'butcher', need: 'warmth', tag: 'warmth', key: 'butcher:ID:hide', verdict: K, doubtful: 'as carcass.ts:98' },
  // ── options_work.ts: stocking, materials, building, farming, crafting ──
  { site: 'options_work.ts:295', kind: 'deposit', need: null, tag: 'store', key: 'deposit:ID:food', verdict: G },
  { site: 'options_work.ts:534', kind: 'gather', need: null, tag: 'site', key: 'gather:ID', verdict: G },
  { site: 'options_work.ts:534 (other tags: repair, fire, craft, stock)', kind: 'gather', need: null, tag: 'craft', key: 'gather:ID', verdict: G },
  { site: 'options_work.ts:662', kind: 'haul', need: null, tag: 'site', key: 'haul:ID', verdict: G },
  { site: 'options_work.ts:715', kind: 'build', need: null, tag: 'site', key: 'build:ID', verdict: G },
  { site: 'options_work.ts:858', kind: 'plan_site', need: null, tag: 'build', key: 'plan_site:TYPE', verdict: G, doubtful: 'laying out a building is not itself named in the brief; gated as the first step of build' },
  { site: 'options_work.ts:991 (home is cold)', kind: 'fuel_fire', need: 'warmth', tag: 'fire', key: 'fuel:ID', verdict: K },
  { site: 'options_work.ts:991 (not cold)', kind: 'fuel_fire', need: null, tag: 'fire', key: 'fuel:ID', verdict: K, doubtful: 'feeding a fire when nobody is cold is upkeep, work for later; not a named kind, so kept' },
  { site: 'options_work.ts:1040', kind: 'repair', need: null, tag: 'repair', key: 'repair:ID', verdict: G },
  { site: 'options_work.ts:1177 (merged at 1102)', kind: 'craft', need: null, tag: 'craft', key: 'craft:TOOL', verdict: G },
  { site: 'options_work.ts:1234 (mk till)', kind: 'till', need: null, tag: 'farm', key: 'till:ID', verdict: G },
  { site: 'options_work.ts:1234 (mk plant)', kind: 'plant', need: null, tag: 'farm', key: 'plant:ID', verdict: G },
  { site: 'options_work.ts:1234 (mk tend)', kind: 'tend', need: null, tag: 'farm', key: 'tend:ID', verdict: G },
  { site: 'options_work.ts:1234 (mk harvest)', kind: 'harvest', need: null, tag: 'farm', key: 'harvest:ID', verdict: G },
  { site: 'options_work.ts:1307', kind: 'till', need: null, tag: 'farm', key: 'till:new', verdict: G },
  { site: 'options_work.ts:1349', kind: 'withdraw', need: null, tag: 'farm', key: 'withdraw:ID:seeds', verdict: G },
  { site: 'options_work.ts:1417', kind: 'withdraw', need: null, tag: 'salvage', key: 'withdraw:ID:salvage', verdict: G },
  { site: 'options_work.ts:1470', kind: 'fetch_water', need: null, tag: 'water', key: 'fetch_water', verdict: K, doubtful: 'carrying water home is work that builds a stock, but fetch_water is not a named kind, so kept' },
  { site: 'options_work.ts:1580 (explore, no known water or food)', kind: 'explore', need: 'thirst', tag: 'explore', key: 'explore', verdict: K, doubtful: 'explore is named as gated; kept only when it is built for the person\'s own present thirst or hunger (need set)' },
  { site: 'options_work.ts:1580 (explore, nothing pressing)', kind: 'explore', need: null, tag: 'explore', key: 'explore', verdict: G },
  { site: 'options_work.ts:1710', kind: 'give', need: null, tag: 'care', key: 'give:ID', verdict: K },
  { site: 'options_work.ts:1773', kind: 'visit', need: null, tag: 'promise', key: 'watch:ID', verdict: K },
  { site: 'options_work.ts:1818', kind: 'deposit', need: null, tag: 'promise', key: 'leave:ID:promise:ID', verdict: K, doubtful: 'deposit is gated, but this one keeps a promise to a named person (tag promise)' },
  { site: 'options_work.ts:1861', kind: 'give', need: null, tag: 'promise', key: 'give:ID:promise', verdict: K },
  { site: 'options_work.ts:1938', kind: 'give', need: null, tag: 'promise', key: 'give:ID:return:ID', verdict: K },
  { site: 'options_work.ts:1980', kind: 'fetch_water', need: null, tag: 'promise', key: 'fetch_water:promise', verdict: K },
  { site: 'options_work.ts:2028', kind: 'claim_home', need: null, tag: 'home', key: 'claim_home:ID', verdict: K, doubtful: 'work category (settling into a home); not a named kind, so kept' },
  { site: 'options_work.ts:2067', kind: 'wander', need: null, tag: 'idle', key: 'wander', verdict: K },
  { site: 'options_work.ts:2113', kind: 'wander', need: null, tag: 'idle', key: 'wander', verdict: K },
  // ── production.ts: workshops, batches, carts, planning ──
  { site: 'production.ts:182 (collect from a workshop or store)', kind: 'withdraw', need: null, tag: 'craft', key: 'collect:ID:ITEMS', verdict: G },
  { site: 'production.ts:236', kind: 'deposit', need: null, tag: 'craft', key: 'bring:ID:ITEMS', verdict: G },
  { site: 'production.ts:280', kind: 'fetch_water', need: null, tag: 'craft', key: 'fetch_water:production', verdict: K, doubtful: 'water for a workshop job; fetch_water is not a named kind, so kept' },
  { site: 'production.ts:496', kind: 'operate', need: null, tag: 'craft', key: 'operate:ID:RECIPE', verdict: G },
  { site: 'production.ts:812', kind: 'tool_work', need: null, tag: 'craft', key: 'mend:ID', verdict: G },
  { site: 'production.ts:835', kind: 'tool_work', need: null, tag: 'craft', key: 'mend:cart:ID', verdict: G },
  { site: 'production.ts:922', kind: 'deposit', need: null, tag: 'craft', key: 'rack:ID:KIND', verdict: G },
  { site: 'production.ts:995', kind: 'cart_haul', need: null, tag: 'site', key: 'cart:ID:ID', verdict: G },
  { site: 'production.ts:1188', kind: 'plan_site', need: null, tag: 'build', key: 'plan_site:TYPE', verdict: G, doubtful: 'as options_work.ts:858' },
  { site: 'production.ts:1267', kind: 'plan_site', need: null, tag: 'build', key: 'plan_site:house', verdict: G, doubtful: 'as options_work.ts:858' },
  { site: 'production.ts:1410', kind: 'rest', need: null, tag: 'rest', key: 'project_wait:ID:ID', verdict: K },
  { site: 'transport.ts:122', kind: 'cart_haul', need: null, tag: 'transport', key: 'cart:…', verdict: G },
  // ── the other generators ──
  { site: 'care_capacity.ts:70', kind: 'deposit', need: null, tag: 'care', key: 'care_store:ID:ID', verdict: K, doubtful: 'deposit is gated, but this one is made for a named dependant (tag care)' },
  { site: 'care_capacity.ts:96', kind: 'deposit', need: null, tag: 'care', key: 'care_water:ID:ID', verdict: K, doubtful: 'as care_capacity.ts:70' },
  { site: 'care_supply.ts:54', kind: 'fetch_water', need: null, tag: 'care', key: 'care_supply:ID:water:ID', verdict: K },
  { site: 'wells.ts:65 (water for a named person)', kind: 'fetch_water', need: null, tag: 'care', key: 'care_supply:ID:water:ID', verdict: K },
  { site: 'wells.ts:65 (water for the household)', kind: 'fetch_water', need: null, tag: undefined, key: 'fetch_water:well:ID', verdict: K, doubtful: 'as options_work.ts:1470' },
  { site: 'clothing.ts:93', kind: 'give', need: null, tag: 'help', key: 'clothe_child:ID', verdict: K },
  { site: 'resident_care.ts:59', kind: 'give', need: null, tag: 'care', key: 'give:ID:home', verdict: K },
  { site: 'toys.ts:178', kind: 'give', need: null, tag: 'gift', key: 'give:toy:ID', verdict: K, doubtful: 'a toy for a child is not "a person in need", but give is not a gated kind' },
  { site: 'toys.ts:125', kind: 'craft', need: null, tag: 'craft', key: 'craft:toy', verdict: G, doubtful: 'carving a toy for a child is craft (gated); it is made for a named child but not one in need' },
  { site: 'toys.ts:220', kind: 'wander', need: null, tag: 'play', key: 'play:toy', verdict: K },
  { site: 'play.ts:134', kind: 'wander', need: null, tag: 'play', key: 'play:KIND', verdict: K },
  { site: 'evening_fire.ts:115', kind: 'wander', need: null, tag: 'leisure', key: 'evening:fire', verdict: K },
  { site: 'temperament.ts:125', kind: 'alone', need: null, tag: 'rest', key: 'alone', verdict: K },
  { site: 'communal_stock.ts:49', kind: 'deposit', need: null, tag: 'store', key: 'communal_stock:ID', verdict: G },
  { site: 'communal_stock.ts:71 (restock gathers pushed from a scratch ctx)', kind: 'gather', need: null, tag: 'store', key: 'gather:ID', verdict: G },
  { site: 'leave_heaviest.ts:131', kind: 'deposit', need: null, tag: 'store', key: 'leave:ID:ITEM', verdict: G, doubtful: 'putting a left-over down to free the hands is housekeeping, but deposit is a named kind' },
  { site: 'pack_materials.ts:52', kind: 'deposit', need: null, tag: 'store', key: 'pack_materials:ID', verdict: G, doubtful: 'as leave_heaviest.ts:131' },
  { site: 'seed_storage.ts:44', kind: 'deposit', need: null, tag: 'store', key: 'seed_stash:ID', verdict: G, doubtful: 'as leave_heaviest.ts:131' },
  { site: 'site_supply.ts:116', kind: 'deposit', need: null, tag: 'craft', key: 'saw_to_yard:ID', verdict: G },
  { site: 'shared_projects.ts:14 (a copy of a plan_site option)', kind: 'plan_site', need: null, tag: 'build', key: 'plan_shared:TYPE', verdict: G, doubtful: 'as options_work.ts:858' },
  { site: 'journey.ts:65', kind: 'fetch_water', need: null, tag: 'journey', key: 'fetch_water:ID', verdict: K, doubtful: 'water for a work trip; fetch_water is not a named kind, so kept' },
  { site: 'journey.ts:83 (gather, build and operate options re-pushed with a journey attached)', kind: 'gather', need: null, tag: 'site', key: 'gather:ID', verdict: G },
  { site: 'forestry.ts:81', kind: 'tree_work', need: null, tag: 'work', key: 'plant_tree:X:Y', verdict: G, doubtful: 'tree_work is not a named kind; gated as planting a tree for wood later' },
  { site: 'forestry.ts:85', kind: 'tree_work', need: null, tag: 'work', key: 'tree_cutting:ID', verdict: G, doubtful: 'as forestry.ts:81' },
  { site: 'livestock.ts:130', kind: 'gather', need: null, tag: 'animals', key: 'sheep-grain:ID', verdict: G, doubtful: 'grain for sheep is a gather (gated) but it is care of animals, not of a named person' },
  { site: 'livestock.ts:133 (every sheep chore but slaughter)', kind: 'animal_work', need: null, tag: 'animals', key: 'sheep:OP:ID', verdict: K, doubtful: 'feeding, watering, shearing and mating sheep is work for later; animal_work is not a named kind, so kept' },
  { site: 'livestock.ts:133 (slaughter)', kind: 'animal_work', need: 'hunger', tag: 'animals', key: 'sheep:slaughter:ID', verdict: K },
  { site: 'exchange_journeys.ts:69', kind: 'exchange_journey', need: null, tag: 'trade', key: 'exchange:ID:ITEM:ITEM', verdict: K, doubtful: 'a trip to swap goods; not a named kind, so kept' },
  { site: 'relocation.ts:155', kind: 'relocate', need: null, tag: 'relocation', key: 'relocate:ID:STEP:ID', verdict: K, doubtful: 'a household move from sustained hunger; kept' },
  { site: 'relocation.ts:225', kind: 'withdraw', need: null, tag: 'relocation', key: 'relocate-pack:ID:ID', verdict: K, doubtful: 'withdraw is gated, but this packs the household for a move (tag relocation)' },
  { site: 'relocation.ts:245', kind: 'plan_site', need: null, tag: 'build', key: 'relocate-shelter:ID', verdict: K, doubtful: 'plan_site is gated, but this lays out shelter for a move (key relocate…)' },
  { site: 'options_places.ts:20', kind: 'pay_respects', need: null, tag: 'social', key: 'respects:ID', verdict: K, doubtful: 'work category in TimeBudget, but it is a visit to a grave; kept' },
  { site: 'wolf_skin.ts:116', kind: 'hang_skin', need: null, tag: 'social', key: 'hang_skin:ID', verdict: K, doubtful: 'work category in TimeBudget; a ritual at the hall, kept' },
  // ── social and leisure: never gated ──
  { site: 'options_social.ts:102 (chat, request, ask, warn, offer, and the rest)', kind: 'socialize', need: 'social', tag: 'social', key: 'socialize:ID:PURPOSE', verdict: K },
  { site: 'options_social.ts:714', kind: 'visit', need: null, tag: 'trade', key: 'supply:ID:ITEM', verdict: K },
  { site: 'meals.ts:174', kind: 'socialize', need: 'social', tag: 'meal', key: 'socialize:ID:invite', verdict: K },
  { site: 'meals.ts:230', kind: 'socialize', need: 'social', tag: 'meal', key: 'socialize:ID:invite2', verdict: K },
  { site: 'meals.ts:272', kind: 'withdraw', need: null, tag: 'meal', key: 'withdraw:ID:meal', verdict: K, doubtful: 'withdraw is gated, but this fetches a meal to share (tag meal)' },
  { site: 'meals.ts:313', kind: 'host_meal', need: null, tag: 'meal', key: 'host_meal:ID', verdict: K },
  { site: 'meals.ts:355', kind: 'socialize', need: 'social', tag: 'meal', key: 'socialize:ID:reschedule:ID', verdict: K },
  { site: 'meals.ts:371', kind: 'attend_meal', need: null, tag: 'meal', key: 'attend_meal:ID', verdict: K },
  { site: 'occasions.ts:225', kind: 'attend', need: 'social', tag: 'social', key: 'attend:ID', verdict: K },
  { site: 'welfare.ts:186', kind: 'visit', need: null, tag: 'care', key: 'visit:ID', verdict: K },
  { site: 'welfare.ts:269', kind: 'visit', need: null, tag: 'care', key: 'seek:ID', verdict: K },
];

// the rows that are not option kinds: lists and merges inside a generator, so no row of their own
const NOT_OPTIONS = [
  'optutil.ts:282, 283: the definition of addOption',
  'options_survival.ts:511: the list of beds before the sleep option is built (sleep rows above)',
  'options_work.ts:446 to 468: the weights of the tool a person might make (a list of {t, w}, not options)',
  'options_work.ts:1102: the craft offers of a scratch ctx merged into ctx.options (craft row above)',
  'production.ts:1422: the batch plan\'s step offers merged into ctx.options (the kinds of production.ts above)',
  'carcass_supply.ts:33, communal_stock.ts:71, journey.ts:83: re-pushes of options built elsewhere (rows above)',
];

let bad = 0;
for (const r of rows) {
  const c = classifyOption({ kind: r.kind, need: r.need, tag: r.tag, key: r.key });
  const got = c.gated ? 'gated' : 'kept';
  if (got !== r.verdict) { bad++; console.error(`MISMATCH ${r.site}: table says ${r.verdict}, classifyOption says ${got} (${c.why})`); }
}
const md: string[] = [];
md.push('| site (file:line) | kind | need | tag | key | verdict | rule applied | doubtful |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  const c = classifyOption({ kind: r.kind, need: r.need, tag: r.tag, key: r.key });
  md.push(`| ${r.site} | ${r.kind} | ${r.need ?? 'null'} | ${r.tag ?? '-'} | ${r.key} | **${c.gated ? 'GATED' : 'kept'}** | ${c.why} | ${r.doubtful ? 'DOUBTFUL: ' + r.doubtful : ''} |`);
}
md.push('', 'Not option kinds (no row of their own):', '', ...NOT_OPTIONS.map((x) => '- ' + x));
const kinds = [...new Set(rows.map((r) => r.kind))].sort();
const kindRows = kinds.map((k) => { const rs = rows.filter((r) => r.kind === k); const g = rs.filter((r) => r.verdict === 'gated').length; return `| ${k} | ${rs.length} | ${g} | ${rs.length - g} | ${rs.some((r) => r.doubtful) ? 'yes' : ''} |`; });
md.push('', 'By kind (rows of the table above):', '', '| kind | rows | gated | kept | any doubtful |', '| --- | --- | --- | --- | --- |', ...kindRows);
md.push('', `Activity kinds that appear in no option row: converse, argue, care, fulfill, search, return_tool (they are started by the social and commitment code, not offered through addOption; return_tool is a commitment kind). Rows: ${rows.length}; doubtful rows: ${rows.filter((r) => r.doubtful).length}; table and classifyOption agree on every row: ${bad === 0}.`);
const args = process.argv.slice(2).filter((a) => a !== '--');
const i = args.indexOf('--md');
if (i >= 0) writeFileSync(args[i + 1], md.join('\n') + '\n');
else console.log(md.join('\n'));
console.log(`free_classify: ${rows.length} rows, ${bad} mismatches`);
if (bad) process.exitCode = 1;
