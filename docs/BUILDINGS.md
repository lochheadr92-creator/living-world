# Village-economy expansion: coverage, chains and build order

Status: **stage A implemented** (well, cellar, stockyard, forester's lodge, mine: see "Stage A: progress and evidence" at the end);
stages B–F not started. The coverage table is the contract the implementation is checked against. The existing catalogue (12 types, `BUILD_DEF` in `src/sim/constants.ts`): lean-to, hut, house
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
| Well | new `well` (A) | bounded water access by the houses; stone and timber (the windlass and bucket are part of the build); drawn by hand; relieves the long walk to the shore |
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
| Forester's lodge | new `forester` (A) | young trees raised from a grown tree within the lodge's reach and set on open ground; real forestry work, not a regrowth multiplier (nothing in the world yet threatens a sapling, so protecting them is deferred until something does) |
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
  logs → clamp → charcoal → smelting. Forestry: a grown tree within reach of the lodge → a young tree set on open ground → growth over days → mature tree.
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
* **Services** (input → activity → outcome): well (site, stone, timber → water seeps in, drawn by hand → carried water, thirst); bunkhouse (beds → stay →
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
| A | plumbing for rich-only types (definitions, wear, repair, icons, sprites, inspector, save); well, stockyard, cellar, forester (planting), mine | implemented; evidence below |
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

## Stage A: progress and evidence

Plumbing: `RICH_ONLY_BUILDINGS` and `buildable()` (`src/sim/expansion.ts`) gate every new type; `siteConflict` refuses them in an
ordinary world, the planner never considers them, and the golden, determinism and save tests check that authored worlds are unchanged.
Each type has a definition (`BUILD_DEF`), wear and a repair material, an icon, a sprite (`src/render/bld_service.ts`), construction
drawing, inspector rows, and lives in the ordinary save as a building of its type (save format unchanged at 4; the only new optional
field is `Household.lost`, written when present). The lab can switch any of them off: `rich-no:well+cellar` and so on.

| Building | Implemented | Contract-tested | Observed in an ordinary seeded run (rich, normal profile, 4 seeds, 30 days) | Observed in the browser |
|---|---|---|---|---|
| well (`water.ts`) | yes | `tests/expansion_water.test.ts` (10) | laid out day 5–6 in 4/4 seeds; 1–2 built per world; 154–627 drinks and water-fetches by 25–30 people | yes: `docs/evidence/stage-a/well.jpg` (meadow, day 14, "Owner: everyone, Water in the well 7/12") |
| cellar (`storage.ts`, spoils at 0.15× of a home store, below a tended granary's 0.2×) | yes | `tests/expansion_storage.test.ts` (9) | 4–8 laid out per world from day 5; 4–8 built; 180–313 deposits and meals by 14–16 people; one or two sites per world wait days for stone | yes: `cellar.jpg` (meadow, day 14, Brook household, "Lost lately about 2 units", fruit, berries and grain inside) |
| stockyard (`stockyard.ts`) | yes | `tests/expansion_stockyard.test.ts` (8) | laid out day 6–19 in 4/4; built 4/4; 34–344 stackings and collections by 14–20 people (it runs near empty: builders draw it down as fast as it fills) | yes: `stockyard.jpg` (meadow, day 14) |
| forester's lodge (`forestry.ts`, `act_forestry.ts`) | yes | `tests/expansion_forestry.test.ts` (7) | laid out day 13–29 in 4/4; built 4/4; planted from in 2/4 within 30 days (1 and 3 plantings), 3/4 within 45 days (11–43 plantings by 3–8 people) | yes: `forester.jpg` (fern, day 27, "Young trees: 2 of at most 10 standing within 11 tiles") |
| mine (`recipes.ts` `mine_ore`) | yes | `tests/expansion_mine.test.ts` (5) | laid out day 22–30 in 3/4 seeds over 45 days (1/4 within 30); built; dug 0–2 times: **built, not working** (below) | standing only: `mine.jpg` (fern, day 27, Willow household, idle) |

Numbers are from `scripts/chainwatch.ts` on seeds meadow, river, fern and aspen (`docs/evidence/stage-a/chainwatch-<seed>.json`, which
also hold the causal trace of each type's first instance: who marked it out and the problem they gave as their reason, who finished
it, who first used it and for what). The browser evidence is `scripts/browser/stage_a.mjs` against the built app (`meadow.json`,
`fern.json` and the screenshots beside them): the world is restarted rich from the page's own controls, run on, and each building
selected and read from the inspector.

Causal traces (from `chainwatch-<seed>.json`, commit 3a89016; each is the first instance of its kind in that world, nothing staged):

* well, meadow: day 5.1 Ivo lays one out ("the nearest water I know is 18 tiles from home, and a well close to the houses would
  save the walk"); day 5.8 Ivo finishes it and is the first to drink at it (thirst 59/100). 627 drinks and fetches by 30 people
  follow in 30 days. In the browser at day 14 Pavel is walking to it to drink (`person-well.jpg` is fern's Otto doing the same).
* cellar, river: day 5.7 Basil ("we keep finding food gone off (about 12 units lately): a cellar would keep it cool"); day 7.1
  Basil finishes it; day 7.2 Ivy is the first to bring food home to it. 313 deposits and meals by 16 people.
* stockyard, river: day 8 Abel ("the wood I fetch is about 12 tiles from home: a yard by the houses would save every builder the
  walk"); day 8.5 Basil finishes it; day 9.2 Petra stacks 3 stone there "for whoever builds or works next". 344 stackings and
  collections by 20 people in the remaining 22 days.
* forester's lodge, fern: day 14.2 Otto ("only 9 trees that I know of stand near home: someone should be planting"); day 16 Dax
  finishes it; day 24.2 Yusuf plants the first young tree "to thicken the wood near home"; 3 plantings by day 30.
* mine, fern: day 20.5 Nora ("my tools are wearing out, the smithy has no ore and a vein is known: a mine would bring it out by
  the load"); day 26.2 Nora finishes it; it is then dug twice in four days and the ore sits at the shaft head: nobody smelts.

Chains that are not working yet, with the measured reason:

* **Mine → smithy → iron tools.** The mine is laid out only where a smithy is known and tools are wearing, which in these seeds is
  day 22 or later; once built it is dug 0–2 times in 45 days. The cause is upstream: the smithy itself ran no batch in 45 days in
  any of the four seeds (probe on river: `batches=0` throughout), because the only demand for iron is a worn tool of someone who
  also knows a smithy, and charcoal for smelting comes from the kiln, which is busy with bricks. Stage B (clamp, metalwork) is where
  that chain is made to run; the mine's own contract (ore out of a finite vein, pick required, one mine per vein, save mid-batch)
  is tested.
* **Forester's lodge.** Works, but late: the wood near home only reads as thin after the first weeks of felling, so most lodges stand
  from day 13–29 and planting is light within 30 days. Growth is real (`SAPLING_TICKS`, wood created in the ledger as "tree growth").
* **Stone.** Several cellar and well sites wait days for their last few stone; stone is gathered by hand from small rocks until a
  quarry exists. Not changed here (it is the authored world's supply rule); worth a look when the gates are run on 24 seeds.

Rule changes beside the new types: a building with nobody's name on the title (hall, granary, well, lodge, yard) is now created
with household 0 whoever laid it out (`titleHolder` was consulted for workplaces only; for the three new common types that matters
to the inspector, which read "nobody (empty)" for an empty yard); a belief passed on by word of mouth no longer carries keys set
to undefined (`news.ts`), which made a saved world and its live copy serialise differently (`tests/save_told.test.ts`).

## Review after stage A (what was found, what was done)

A seven-dimension adversarial review of the stage A diff (locality, accounting, persistence, rich-only gating, performance, contract
consistency, handlers), each finding checked independently where time allowed. Fixed, each with a test in `tests/expansion_review.test.ts`:

* **Nobody mended a well, a yard or a lodge** (high): common buildings have nobody on the title, and `repairStake` gave a stake only for
  one's own buildings, the storehouse and household-0 workplaces, so these decayed to a dead state (a silted well stops seeping at
  condition 10) and collapsed on a timer. Now anyone has the same stake in them as in a hall. Their sites are also a shared project
  to strangers (`siteRelation`), as a granary's is; before, only friends of the planner would carry stone to a well site.
* **Planting never walked** (high): the option set the planting tile but not the stand, so the person "arrived" where they stood and
  the tree appeared up to twenty tiles away. The walk now goes to a stand beside the tile, and the planting refuses a person not there.
* **Yard ping-pong** (high): a person collecting one log for the fire then held one "spare" and stacked it back, nine ticks a cycle.
  What is carried for a need of one's own (`materialNeeds`) is not spare.
* **A well wanted where none could be laid out** (medium): the want asked for no well within 14 tiles of home while the spot could be
  8 tiles from home and the spacing rule refused anything within 14 of another well; a home 14–22 tiles from a well retried for ever.
  The want now treats a well within 22 of home as near enough.
* **An orphaned cellar** (medium): a household that dissolved left a cellar with household 0 that nobody could use, mend or replace.
  Whoever moves into the vacant house takes over a cellar within 8 tiles of it.
* **Planning read the world's truth** (medium, locality): the planting spot was searched at every review from the world's occupancy
  (also the heaviest new per-decision cost); known lodges, yards and veins were dropped the instant they vanished, before anyone had
  looked. The spot is now found when the option is taken; the existence filters are gone and a gone lodge is forgotten on arrival.
* **A well drew two units for one drink** (low): the first unit was drawn before drinking and the rest whenever the credit ran low, so
  a nearly quenched person drew twice what they drank. Units are drawn only as the last is used up.
* Smaller: the loss tally is in the fingerprint (rich worlds only); `rich-stakes-only` and `rich-mood-only` lab branches no longer carry
  the expansion buildings; a one-item collect from the yard no longer shares an option key with the workshop-supply collect; the
  stockyard's stocking scan runs for one good per review; `woodDistance` is one pass; the deposit log names the yard and the cellar;
  the well's blurb states its real rate; the cellar's multiplier is 0.15 (the table said "below a granary's"; 0.3 was not).

Decided, not changed: the well needs no jar or rope (the windlass is timber in its cost; a jar requirement would hang every well on a
kiln); protecting saplings waits for something that threatens them; the household's loss tally is sanctioned household state (the
household notices its own food going off whether or not a member is at the store at that moment), which is now stated in the
coverage row. Not yet done: a contract test for every failure mode the brief lists is still incomplete (a full cellar, a full yard, a
silted well and a lodge in disrepair are now tested; the world tree ceiling is not).
