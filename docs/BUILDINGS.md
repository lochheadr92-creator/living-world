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
| Forester's lodge | new `forester` (A) | stands at the wood's edge, between the houses and the nearest grown trees; young trees raised from a grown tree within its reach and set on open ground; real forestry work, not a regrowth multiplier (nothing in the world yet threatens a sapling, so protecting them is deferred until something does) |
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
| B | mill, clamp, smokehouse, brewery; furniture and repair recipes at the timber yard | implemented (B1–B5), contract-tested; natural-run evidence below; browser check pending |
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

| Building | Implemented | Contract-tested | Observed in an ordinary seeded run (rich, normal profile, 4 seeds, 30 days, commit f201d90) | Observed in the browser (commit f201d90) |
|---|---|---|---|---|
| well (`water.ts`) | yes | `tests/expansion_water.test.ts` (10), `expansion_review` | laid out day 5–6 in 4/4 seeds and built; 143–2804 drinks and water-fetches by 22–30 people | yes: `well.jpg` (meadow, day 14, "Owner: everyone, Water in the well"); Hal and Mona drinking at it; `person-well.jpg` (fern, day 27, Juno) |
| cellar (`storage.ts`, spoils at 0.15× of a home store, below a tended granary's 0.2×) | yes | `tests/expansion_storage.test.ts` (9), `expansion_review` | 5–7 laid out per world from day 5; 5–7 built; 169–360 deposits and meals by 14–23 people | yes: `cellar.jpg` (meadow, day 14); Quinn "Taking food to the cellar" |
| stockyard (`stockyard.ts`) | yes | `tests/expansion_stockyard.test.ts` (8), `expansion_review` | laid out day 7–18 in 4/4; built 4/4; 11–50 stackings and collections by 4–13 people (it runs near empty: builders draw it down as it fills) | yes: `stockyard.jpg` (meadow, day 14, "Owner: everyone") |
| forester's lodge (`forestry.ts`, `act_forestry.ts`) | yes | `tests/expansion_forestry.test.ts` (7), `expansion_review` | laid out day 8–23 in 4/4 at the wood's edge; built 4/4; planted from in 3/4 within 30 days (17, 7, 6 plantings by 8, 2, 2 people; the fourth lodge stood only from day 25) | yes: `forester.jpg` (fern, day 27, "Young trees: 2 of at most 10 standing within 11 tiles"); Yusuf "Planting a young tree" |
| mine (`recipes.ts` `mine_ore`) | yes | `tests/expansion_mine.test.ts` (5) | laid out day 28 in 1/4 seeds within 30 days (3/4 within 45 in an earlier run), built, dug 0–2 times: **built, not working** (below) | none stood in either browser run (river's mine was finished on day 29.5) |

Numbers are from `scripts/chainwatch.ts` on seeds meadow, river, fern and aspen (`docs/evidence/stage-a/chainwatch-<seed>.json`, which
also hold the causal trace of each type's first instance: who marked it out and the problem they gave as their reason, who finished
it, who first used it and for what). The browser evidence is `scripts/browser/stage_a.mjs` against the built app (`meadow.json`,
`fern.json` and the screenshots beside them): the world is restarted rich from the page's own controls, run on, and each building
selected and read from the inspector. An earlier set of numbers (commit 3a89016, before the review below) showed 34–344 stockyard
uses; most of those were a deposit-withdraw loop the review found, not use.

Causal traces (from `chainwatch-<seed>.json`, commit f201d90; each is the first instance of its kind in that world, nothing staged):

* well, meadow: day 5.1 Ivo lays one out ("the nearest water I know is 18 tiles from home, and a well close to the houses would
  save the walk"); day 5.4 Sven finishes it; day 5.7 Sofia is the first to drink at it (thirst 47/100). 2804 drinks and fetches by
  30 people follow in 30 days.
* cellar, river: day 5.7 Basil ("we keep finding food gone off (about 12 units lately): a cellar would keep it cool"); day 7.1
  Basil finishes it; day 7.2 Ivy is the first to take food to it. 285 deposits and meals by 18 people.
* stockyard, river: day 8 Abel ("the wood I fetch is about 12 tiles from home: a yard by the houses would save every builder the
  walk"); day 8.1 Talia finishes it; day 9.2 Yan stacks a load of clay there "for whoever builds or works next"; 50 stackings and
  collections by 13 people in the remaining 22 days.
* forester's lodge, meadow: day 8.2 Zeke ("only 6 trees that I know of stand near home: someone should be planting"); day 9 Zeke
  finishes it at the wood's edge; day 15.3 Yara plants the first young tree "to thicken the wood near home"; 17 plantings by 8
  people by day 30.
* mine, river: day 24.4 Cole ("my tools are wearing out, the smithy has no ore and a vein is known: a mine would bring it out by
  the load"); day 29.5 Talia finishes it; nobody has dug by day 30, and in the earlier 45-day run a mine was dug twice and its ore
  then sat at the shaft head: nobody smelts.

Chains that are not working yet, with the measured reason:

* **Mine → smithy → iron tools.** The mine is laid out only where a smithy is known and tools are wearing, which in these seeds is
  day 24 or later; once built it is dug 0–2 times in 45 days. The cause is upstream: the smithy itself ran no batch in 45 days in
  any of the four seeds (probe on river: `batches=0` throughout), because the only demand for iron is a worn tool of someone who
  also knows a smithy, and charcoal for smelting comes from the kiln, which is busy with bricks. Stage B (clamp, metalwork) is where
  that chain is made to run; the mine's own contract (ore out of a finite vein, pick required, one mine per vein, save mid-batch)
  is tested.
* **Forester's lodge.** Works, but late: the wood near home only reads as thin after the first weeks of felling, so lodges stand
  from day 9–25 and the one finished on day 25 had not been planted from by day 30. Growth is real (`SAPLING_TICKS`, wood created
  in the ledger as "tree growth").
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
* **The lodge went dormant once planting needed a seed tree** (found by re-measuring after the fixes): lodges were sited by the camp,
  where the wood is thin, so no grown tree stood within reach. A lodge now stands at the wood's edge, between home and the nearest
  grown trees the planner knows (`lodgeSpot`), and the new wood grows toward the houses: 17, 7, 6 and 0 plantings in 30 days on the
  four seeds, against 0–1 before the siting change.
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

## Stage B: the chains behind the buildings

Stage A ended with one chain measured dead: the mine stood and nobody smelted. A probe on an ordinary seed at day 30 showed why: thirty
people share two axes, a pick, a hoe and a saw; only one person had both a worn tool and knowledge of the smithy; not one hammer existed;
the kiln had fired bricks nine times and charcoal never. "Replace a worn tool" is far too weak a trigger for a four-leg chain. Stage B
is built in sub-stages, each with its tests, a natural run and its own commit. A three-lens design panel (emergence, economy,
simplicity) judged the plan before it was built; what it changed is recorded under each part.

**B1, the iron chain** (implemented). The charcoal clamp (`clamp`, rich only): a stack of logs under turf and clay, six charcoal from
ten logs after a long smoulder, no stone, no bricks, so the kiln is left to its bricks; wanted by a smith who has looked into the
smithy and found no charcoal, sited at the wood's edge away from the houses. The smith (`isSmith`: whoever has practised at the
smithy, or is diligent enough to take it up; skills start at 1.0 so "skill ≥ 1" would be half the village) keeps iron and handles
on the smithy's shelf in slack time, at the pay of a site job because its chain is four legs long; a batch for the shelf belongs to
nobody, so anyone may forge with it. Anyone who wants a hand tool and knows a smithy with iron on the shelf wants it in iron (the
forge outranks the stone tool; the plan fetches the handle itself); a hammer is wanted by whoever is about to forge or works the
smithy; a known clamp is preferred to the kiln for charcoal; the smith's demand counts toward wanting a mine. Measured: with the
first, weaker version nothing was smelted in 4 × 30 days although clamps and mines were built; with this version a 40-day probe on
aspen shows the whole chain in motion from the day the smithy and clamp stand (about day 20–28): wood collected and burnt in the
clamp, charcoal collected, ore dug by hand and at the mine, "Smelting iron", "Forging an iron axe". The chain is thin because its
buildings come late; its evidence window is 45 days. New lab metrics `ironTools` and `smithyBatches`; chainwatch now reports every
workshop's batches.

**B2, the windmill** (implemented). Grinds six grain to five flour in a fraction of the quern's time; where a mill is known the quern
is no longer planned, so the bakery keeps its oven for bread. The want is the measured bottleneck the panel asked for: in a rich world
a person turned away from a workplace busy with a batch they cannot join remembers it, and whoever found the bakery busy when they
came with grain wants a windmill. Lab metrics `breadMade`, `flourMilled`.

**B3, the smokehouse** (implemented). Smoked fish is a new food (nutrition 26, spoils at 0.15 against fresh fish's 1.6), added to
every hand-kept food list, and eaten only when nothing fresher is in the store, so it is the reserve. A household with fish beyond
what it will eat soon that knows a smokehouse plans to smoke it; the smokehouse is wanted where that surplus meets a cellar of one's
own or the hard season, so it does not compete with the cellar for the spoilage signal.

**B4, the brewery** (implemented). Beer is a new item, not food. Brewed from six grain and four water over a day; the brewer
(sociable, or practised at baking, knowing a hall and a brewery) keeps four crocks at the hall. At a shared meal in the hall each
guest gets a mug while it lasts: those who drank together grow closer, remember the evening, and the feed notes it; an invitation to
a hall known to hold beer is accepted more readily. Wanted by a household with grain going off that knows a hall. Lab metric
`beerDrunk`.

**B5, the bed** (implemented). Made at the timber yard (four planks and a handle, hammer required). Sleeping in one's own home with a
bed in its store is six degrees warmer, so cold nights break sleep less; a night slept through in it is a small thought. A night
broken by cold is remembered; a household with a solid home that woke cold lately, or keeps a child or an elder, wants one, and
whoever carries one takes it home. "Repairs" at the timber yard need no new recipe: planks already mend houses and handles mend tools.
The bed recipe is listed at the timber yard in every world (the recipe table is one table) but only demanded in rich worlds. Lab
metric `beds`.

**Natural-run evidence for stage B** (two ordinary rich seeds, 45 days, commit d2b630a, `docs/evidence/stage-b/`): the parts are
implemented and contract-tested, but most are **not yet observed working in an ordinary run**:

| Part | aspen | meadow | Measured reason |
|---|---|---|---|
| clamp and smelting | clamp built day 20; smithy smelted 1 iron | clamp built day 25; no smelting | the chain's buildings come late (day 20–25); hammers are 0–1 per village |
| windmill | not wanted | not wanted | the bakery ran no batch in either seed, so nobody ever found it busy: the bread chain itself is dormant |
| smokehouse | not wanted | not wanted | no household held 8 fish together with a cellar or in a hard season |
| brewery | built day 31, no brew by day 45 | not wanted | late; its demand needs a hall and grain going off |
| bed | none made | none made | `make_bed` needs a hammer, and almost nobody has one |

Two shared bottlenecks explain most of it: hammers (the forge and the bed both require one, and a village of thirty has 0–1), and a
bakery that never runs. Those are the next things to work on, before any new building. Review pass and browser check: not yet run.
