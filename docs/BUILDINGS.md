# Village-economy expansion: coverage, chains and build order

Status: **design and plan; nothing in this file is implemented yet** except the rows marked "reuse". It is the contract the
implementation is checked against. The existing catalogue (12 types, `BUILD_DEF` in `src/sim/constants.ts`): lean-to, hut, house
(an in-place upgrade of a hut), storehouse, fire, timber yard, quarry, kiln, smithy, granary, bakery, hall. Recipes (11) are in
`src/sim/recipes.ts`; item kinds are food (berries, fruit, fish, grain, bread), seeds, water, materials (wood, stone, clay, ore,
planks, handles, bricks, charcoal, iron, flour) and tools (axe, pick, hoe, basket, hammer, saw, jar). There are no domestic animals
(only wolves, `src/sim/wildlife.ts`), no cloth, leather, meat, eggs or beer, no sapling planting (trees regrow in `sources.ts`), no
trade between settlements and no service building except the hall. Save format 4 (reads 3 and 4).

Compatibility policy (`CLAUDE.md`): everything new is behind `settings.dynamics = 'rich'`. In an authored world none of the new
building types is ever considered, none of the new recipes is offered, and saves are byte-for-byte what they were.

## Coverage table

Disposition: **reuse** (already there), **extend** (an existing building gains a function), **new** (a new type), **deferred**
(outside this expansion, with the missing premise). Stage letters are the build order below.

| Catalogue entry | Disposition | What it is here |
|---|---|---|
| House / cottage | reuse | `house`, the in-place upgrade of a hut |
| Communal shelter / bunkhouse | new `bunkhouse` (E) | common beds for arrivals and the homeless; occupancy and release |
| Well | new `well` (A) | bounded water access beside a known site; needs stone, a jar or bucket-rope; relieves the long walk to the shore |
| Farm / farmhouse | extend | fields (plots) and the household's hut are the farm; plots gain animal manure and crop by-products (C) |
| Barn / livestock shed | new `barn` (C) | shelter, feed and bedding store for larger stock |
| Chicken coop | new `coop` (C) | small shelter for fowl; eggs, offspring |
| Fishing hut | extend → `dock` (D) | folded into the dock: shoreline fishing, drying rack, loading |
| Hunting lodge | new `lodge` (C) | spears and traps kept, carcasses brought in and dressed; also the butcher's bench |
| Gatherer's hut | extend | baskets already give gatherers the capacity; no separate function worth a type |
| Granary | reuse | grain, flour, bread; per-household shares; tending |
| Food / root cellar | new `cellar` (A) | cool store: spoilage multiplier below a granary's for roots, fruit, eggs, smoked food |
| Windmill / watermill | new `mill` (B), wind only | a windmill on open ground with a throughput advantage over the quern; the watermill is deferred (no flowing water) |
| Bakery | reuse | milling by quern remains the bootstrap |
| Butcher's workshop | extend → `lodge` (C) | a bench at the lodge: carcass to meat, hide, fat, bone |
| Smokehouse / drying shed | new `smokehouse` (B) | meat and fish plus wood: preserved food, long storage |
| Brewery | new `brewery` (B) | grain, water, a jar, time to beer; consumed at the tavern or exchanged; no alcohol need |
| Storehouse / warehouse | reuse | |
| Stockyard | new `stockyard` (A) | open yard for bulky raw goods (logs, stone, clay, ore); keeps the storehouse for finished goods |
| Woodcutter's hut / logging camp | extend → `stockyard` (A) | felling already happens by hand with an axe; the yard is where logs are stacked |
| Forester's lodge | new `forester` (A) | seed trees, planting, protecting saplings; real forestry work, not a regrowth multiplier |
| Sawmill / timber yard | reuse | planks and handles; gains furniture and repair recipes (B) |
| Quarry | reuse | |
| Mine | new `mine` (A) | batch extraction at an ore vein with props; same shape as the quarry; finite ore |
| Kiln / brickworks | reuse | |
| Charcoal burner | new `clamp` (B) | earth-and-wood clamp near trees; no stone; a long burn that frees the kiln for bricks |
| Smelter / foundry | extend (smithy) | the smithy already smelts; a separate smelter would add no distinct capacity |
| Smithy | reuse | |
| Carpenter's workshop | extend (timber yard) | furniture, fittings, repairs |
| Weaver's workshop | new `weaver` (C) | spinning, weaving, rope; the tailor's cutting table is a second recipe set in the same building |
| Tailor's workshop | extend → `weaver` (C) | shares the building |
| Tannery | new `tannery` (C) | hides, water, tanning bark: leather; sited downstream and away from houses |
| Market | new `market` (D) | open stalls where households bring surplus and others who know of it barter |
| Trading post | new `trading_post` (D) | between two known settlements (Large/Huge); a real journey and cargo; useless in a single-settlement world |
| Dock | new `dock` (D) | shoreline fishing and loading; no shipping |
| Stable | new `stable` (D) | housing, feed, water and harness for working animals that really pull or carry |
| Tavern / inn | new `tavern` (E) | beer and food served, temporary beds, news |
| Town hall / meeting hall | reuse | |
| Healer's hut / clinic | new `healer` (E) | bed, water, herbs or bandages; treatment of reported injuries |
| School / apprenticeship | extend (hall, workshops) | a teaching activity at a hall or a workshop between someone who can and someone who wants to |
| Chapel / shrine / memorial | new `shrine` (E) | a small place for remembrance and gathering; no religion system |
| Cemetery | extend (graves) | burial ground and memorial attendance on top of the existing grave markers |
| Watchtower / guard post | new `watchpost` (E) | local observation of wildlife danger, a warning to those who hear it |
| Barracks | deferred | no army, no war |
| Gatehouse | deferred | no walls to put it in |

New building types: well, stockyard, cellar, forester, mine, clamp, mill, smokehouse, brewery, barn, coop, lodge, weaver, tannery,
market, trading post, dock, stable, tavern, healer, shrine, watchpost, bunkhouse: 23.

## The chains to be built

Every chain below is data in the recipe, building and source tables and is shown by the resource-tree view generated from them
(stage F). Each link names where its input comes from, who knows about it, who does the work, where the product goes, who wants
it, and what happens when the link fails.

* **Timber**: tree, felling (axe) → logs → stockyard → timber yard → planks, handles → buildings, furniture, carts, repairs;
  logs → clamp → charcoal → smelting. Forestry: seed tree → forester plants and protects saplings → growth over days → mature tree.
* **Stone and clay**: outcrop or rock → quarry or by hand → stone → foundations, wells, walls; clay pit → clay → kiln + fuel → bricks,
  jars → buildings, water, storage. Ore vein → mine → ore → smithy + charcoal → iron → tools and fittings; slag recorded as waste.
* **Grain and bread**: seeds + land + water + time → grain and straw (feed, bedding, thatch) → granary → quern or mill → flour →
  bakery (water, fuel) → bread → meals. Grain + water + a jar + time → beer → tavern or exchange.
* **Food and preservation**: gathering, fishing, hunting → fresh food → eaten, or smokehouse or dried, or cellar; hunting needs a
  spear and a finite animal that a person actually walks to; the lodge dresses what is brought.
* **Animals**: a founding stock or a real purchase → owned animals with identity, owner, age stage, condition → feed, water, shelter →
  eggs, wool, milk, offspring → slaughter → carcass → lodge → meat, hide. Working animals: stable, feed, harness → carry or pull.
* **Fibre and leather**: flax or a wild fibre, or wool → weaver → cloth, rope → tailor → clothing, bandages; hides + water + bark →
  tannery → leather → boots, harness. Clothing is carried and worn, wears out, and has a bounded effect on exposure.
* **Services** (input → activity → outcome): well (site, stone, rope → water drawn → carried water, thirst); bunkhouse (beds → stay →
  sleep and shelter); market (surplus brought → stall → barter → goods change hands); trading post (known surplus and demand in two
  settlements → a journey with cargo → exchange); tavern (beer, food, host → serving → consumption, lodging, news); healer (injury
  reported, bed, supplies → treatment → recovery); teaching (someone who can, someone who wants, practice → bounded skill gain);
  shrine (a death or loss known → gathering, remembrance → grief eased); watchpost (observer on duty → local detection → warning).

## How a building comes to exist

Local need or opportunity → observed, remembered or heard → eligibility → choice → physical work → saved result → visible
consequence. Planning reads only what the person knows (beliefs and the household's own state); the world's truth is consulted
only when an action is attempted. Triggers (each a concrete, locally known problem): shelter pressure; repeated long water
journeys; spoilage in stores; persistent unmet demand for a product; a processing bottleneck; repeated heavy hauling; animals
needing shelter; an injury needing treatment; a skilled person and a willing learner; a gathering the hall cannot hold. Nothing is
built at startup, on a date, or by a hidden worker; not every seed will build every building, and unused chains are reported with
their measured reason.

## Build order (each stage ends with tests, a seeded ordinary run, and a look in the app)

| Stage | Contents | Status |
|---|---|---|
| A | plumbing for rich-only types (definitions, wear, repair, icons, sprites, inspector, save); well, stockyard, cellar, forester (planting), mine | not started |
| B | mill, clamp, smokehouse, brewery; furniture and repair recipes at the timber yard | not started |
| C | animal records, coop, barn, lodge (hunt and butcher), weaver and tailor, tannery, clothing with wear | not started |
| D | market, trading post, dock, stable and working animals | not started |
| E | bunkhouse, healer, teaching, tavern, shrine, watchpost | not started |
| F | resource-tree view from the tables; `npm run docs`; ensembles on the 24-core machine; browser walk-through | not started |

## Evidence standard

A chain counts as working only when an unstaged rich seeded run shows, in order: the problem observed, the decision to act, the
materials delivered, the work done, the output created, the output used, and the consequence; a fixture is not evidence. More
buildings is not evidence either: the gates measure building counts, and a catalogue can grow while nobody's day changes. Each new
building therefore also gets a causal trace for one actual instance (who needed what, who did what, what changed afterwards).
