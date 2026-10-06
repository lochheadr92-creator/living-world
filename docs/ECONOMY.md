# How the settlement makes things, and keeps its word

This describes the rules the simulation actually runs: who owns what, what a workplace does with what is brought to it,
how tools and carts behave, how promises begin and end, what the planners consider before choosing work, and what happens
to goods when something goes wrong. Numbers that live in code are not repeated here; they are generated into
[`recipes.generated.md`](recipes.generated.md) by `npm run docs`, straight from the tables the simulation reads.

Nothing in the world is scripted. No building is guaranteed, nothing unlocks on a date, nothing is ordered by anyone with
a view of the whole settlement. A workshop exists because somebody who knew the means decided to lay it out and others
decided to supply it; a plank exists because somebody turned wood into it; a meal happened because somebody asked.

## Who owns what in the code

| Concern | Module | Notes |
|---|---|---|
| Items, weights, spoilage, nutrition, buildings, tools, carts, tuning numbers | `sim/constants.ts` | `BUILD_DEF`, `TOOL_DEFS`, `PERISHABLE`, … |
| Recipes (one table: inputs, fuel, work, burn, outputs, waste, tool, skill, workers) | `sim/recipes.ts` | read by the facility code, the planner, the inspector and the docs generator |
| Item containers, the ledger, transfers, claims/reservations | `sim/economy.ts` | `transfer` also moves tool records; `totalItems` counts job contents, carts and meal tables |
| Workplaces: batches, access, earmarks, granary shares, spoilage multiplier | `sim/facilities.ts` | the only code that starts, advances, shelves or finishes a batch |
| Tool records, wear, effects, lending, bench checkout, death rules | `sim/tools.ts`, `sim/toolreg.ts` | `toolreg` is dependency-free so `transfer` can call it |
| Handcarts | `sim/carts.ts`, `sim/act_production.ts` (`cart_haul`) | wheels-only pathing in `sim/pathfinding.ts` |
| What people want made, and how they get it (the planner) | `sim/production.ts` | generates ordinary options; never acts |
| Activity handlers for operate / mend / cart haul | `sim/act_production.ts` | |
| Construction, upgrades in place, ownership of finished workplaces | `sim/buildings.ts`, `sim/act_build.ts` | |
| Requests, promises, news, quarrels, gifts, trades | `sim/social.ts`, `sim/news.ts`, `sim/options_social.ts` | |
| Grievances and the way back from them | `sim/grievance.ts` | |
| Shared meals and the hall | `sim/meals.ts` | |
| Looking after one another | `sim/welfare.ts` | |
| Not letting work strand anyone from water or food | `sim/relief.ts` | wired into `rankOptions` |
| Fixed-step clock, stalls, requested/achieved speed | `app/game.ts` | |
| Read-only view-models for the inspectors | `sim/inspect.ts`, `sim/inspect_work.ts` | |

## The chains

```
tree ── wood ──┬── planks (timber yard: sawn 3→2, or hewn 3→1) ──┬── buildings (house, hall, granary…), carts
               ├── handles (timber yard 1→2) ───────────────────┼── carts, iron tools, tool repairs
               ├── charcoal (kiln 6→3, burns 70 s) ──────────────┴── smelting, forging
               └── fuel (kiln, bakery, fires)

outcrop ── stone (quarry, 3 at a time; or by hand from small rocks) ── buildings, hand-made tools
clay pit ── clay ── bricks (kiln 4→3) ── house, bakery, smithy ;  clay ── water jar (kiln 3→1)
ore vein ── ore ── iron (smithy: 3 ore + 2 charcoal → 1 iron) ── iron axe / pickaxe / hoe / saw / hammer
field ── grain ── flour (bakery 4→3) ── bread (3 flour + 2 water + 1 wood → 4 loaves) ── meals, caring, hunger
fish spot ── fish (by hand; a fishing rod makes it faster) ── smoked fish (smokehouse: 4 fish + 1 wood → 3) ── meals, caring, hunger
```

Every arrow is a recipe in `recipes.ts`. There are no circular dependencies (a test walks the graph) and every chain can
start from hand tools: planks need no saw (hewing with an axe, or with nothing but wedges and stones, only wastes more
wood), a saw and a hammer are made by hand from wood and stone, and nothing in the first links of any chain is made by a
workshop. Iron tools exist only once a smithy, ore, charcoal and a hammer all exist together.

### Accounting for a batch

When a batch starts, its inputs and fuel leave the shelves and are *held by the batch* (they still exist and still count).
When it finishes:

* each input is recorded as consumed, split into the part **used** in the product and the part **wasted**, with the
  waste's cause in words (`-wasted: sawdust and offcuts`, `-wasted: slag`, …);
* fuel is recorded as `-burned as fuel` at the moment the fire is lit;
* products are created into the workplace's store (`+made sawn planks`), except stone cut from an outcrop, which is
  *moved* out of the deposit and creates nothing;
* a tool or cart product is a new record (tools) or a new entity (carts), created once.

If the store has no room for the product the finished batch waits (`ready`) with its contents still held, and completes
when room appears. A batch nobody works on for two days is shelved: its materials go back on the shelves unharmed. A
workplace that collapses scatters the batch, the stock and the tools as a heap of rubble. Nothing silently disappears; the
ledger test (`initial + created − consumed − spoiled = what exists`) runs after every kind of event in the suite.

### Skills

Skills are work-speed multipliers (about 0.7–1.5 at the start, ceiling 1.8). `carpentry`, `kiln`, `smith` and `bake` rise
**only when a batch is finished**, and only for workers who put in at least a fifth of its work. The gain falls as the skill
approaches the ceiling. Time spent on a batch that is never finished teaches nothing. Existing skills (`stone`, `build`,
`craft`, …) rise as before.

## Workplaces

* **Location.** Workplaces are laid out on free dry land the planner's person has seen, not against water, near the camp
  (kiln and smithy a little further out). A **quarry** is always laid out beside a known stone outcrop; its batches cut
  stone out of that outcrop and nowhere else. A **house** is not a new building: it is the owner's hut rebuilt *in place*
  (the same building object, the same footprint and household, still lived in while the work goes on, store and contents
  intact).
* **Capacity and throughput.** One batch at a time; at most `workers` people on it (recipe-specific); a store with a weight
  capacity shared by inputs and products. A second kiln or yard is not laid out: **one of each kind** (a second quarry only
  at a different outcrop). Homes, fires and the storehouse are limited to four sites at a time and never queue behind
  workshops; communal improvement projects (and, separately, house rebuilds) are limited to two at a time (three once the
  settlement passes fifty-five).
* **Ownership.** The household that did at least 60% of the effort of building a workplace (materials count 1 a unit, work 1
  per 25 ticks) holds title; otherwise it belongs to everyone. Halls and granaries are always common.
* **Access.** Owners and everyone, for common workplaces, may use a workplace. A household that did at least a fifth of
  the building may too. Anyone else may if one of the owners counts them a friend (affinity of 12 or more). A visitor can use
  the owner's stock only if the owner's household would; what a visitor brings is theirs ("earmarked") while they use it, and
  what they make is held for them for a day and a half, after which it becomes the workplace's own stock.
* **Contested inputs.** Inputs on the shelves are a shared pool among those allowed to use them; whoever starts the batch
  first (see "the contested-claim rule") takes them. A second person is told what is missing.
* **Held goods.** What a batch makes is held for the person who ordered it for a day and a half. When it was ordered for a
  building site the claim remembers the site, and anyone who is taking materials to *that very site* may take the goods on the
  owner's behalf (the claim was made for the site, not for anyone's own use); what they take comes out of the claim. For any
  other purpose the claim holds, owners included. What a person believes of a workplace includes who was holding what when
  they last looked, so nobody is sent to collect goods they could not take — and a friend of the owners, who may work at a
  private workshop but not carry its stock away, is not sent either. The arithmetic for all of this is one function
  (`takeableUnits` in `sim/facilities.ts`), used by the real rule and by the planner alike.
* **Repairs.** Every building decays and is mended with its own material where it has one (planks for a house, granary or
  hall; bricks for a kiln, smithy or bakery), or with plain wood at a smaller gain. Common workplaces are kept up by those
  who use them.
* **Granary.** Grain, flour and bread kept there are recorded **per household**; a household may take out only its own share —
  except that someone starving (or with a starving dependent) may take up to three units beyond their share, drawn from the
  richest other share. Grain, flour and bread spoil in ordinary stores and in heaps (grain slowly, bread faster); in a
  *tended* granary they spoil at a fifth of that rate. The bins need tending (a 60-tick job) every three days; neglected for
  longer they spoil more than twice as fast as an ordinary store.
* **Hall.** The hall is where shared meals are held and where news travels among whoever is sitting there (one telling at a
  time, only between people actually present). It gives shelter. It does not broadcast anything.
* **Well.** A 1 × 1 building (4 wood, 8 stone) that makes nothing and stores nothing: it is water. A finished well is water
  to everything that looks for water — the same drinking and jar-filling activities, the same choice of where to go, ranked
  by the walk, by danger and by being driven off — and the ground round it is shore. It belongs to everyone, is raised as a
  shared project, there is only ever one, and it is mended with stone. It is wanted by someone whose home is a long way (9 tiles
  or more) from the nearest water they know of, or who has lately been driven off the shore, and is laid out in the middle of
  the village at least six tiles from the lake (a well beside the lake would save nobody a walk). Water drawn from it is
  entered in the books as `water drawn from the well`.
* **Smokehouse.** Four fresh fish and a stick of wood become three smoked fish and one fish's worth of waste (water driven
  off, bones); a practised fisher gets through a batch faster. Fresh fish goes off at 1.6 times the berry rate; smoked fish
  at 0.2 (about the rate of grain), weighs a third less and restores a little more. It is wanted when more fresh fish is
  held than will be eaten soon, and is laid out only after the first week or so, by somebody who knows a timber yard and a
  fish spot and holds spare fish. Like the other workplaces it is neither guaranteed nor immediate.

## Tools

A tool is a **record** (kind, quality tier, wear, owner household, holder, loan) *and* a count in whatever holds it, kept
in step by every transfer. It is never conjured: hand-making and forging record it as created; breaking records it as
consumed.

* **Effects** are task-specific: axe (felling, and hewing planks), pickaxe (rock, clay, ore, outcrops, quarry), hoe (till/tend), basket
  (picking, carrying), fishing rod (catching fish: 0.6 of the time), hammer (construction and repair speed; required for forging and for building a cart), saw (planks with
  little waste; required for sawing), water jar (carries four units of water without adding to the load). With no tool the
  task is simply slower.
* **Wear.** Use wears a tool a little per tick (iron half as much); past 70% wear the benefit fades, and at 100% it breaks
  (recorded: `-tool worn out`). A fitted handle restores more wear than a stick of wood when a tool is mended.
* **Iron** tools are quicker and wear half as fast; they are forged only at a smithy.
* **Lending and shared use — the rules.**
  1. A tool has one holder at a time; nobody can use a tool someone else is holding.
  2. A **loan** is a favour asked in conversation: the owner (or anyone holding a spare) decides by willingness, trust and
     whether they need it this moment. The borrower promises to bring it back within a day.
  3. A borrowed tool cannot be lent on. Returning it hands *that* tool to the lender.
  4. A tool on a shared **rack** (a workshop's or the storehouse's store, ownerless) may be taken: it leaves the rack as a
     loan from the commons, due back in a day. A generous person with a spare leaves it on the rack of a workshop that uses it.
  5. A tool on a workshop's rack may be used **at the bench**: one person at a time. The checkout lasts while they work and
     lapses on its own a few moments after they stop.
  6. If the **borrower dies** the loan ends; the tool goes with their other belongings to the heap where they fell and is
     found and collected like anything else. If the **lender dies**, the promise now runs to the oldest living member of
     their household; with no household left the borrower's household owns the tool.
  7. If a **workplace is destroyed**, tools on its racks fall with the rubble into a heap and any bench checkout ends. A
     tool that breaks while on loan is the borrower's misfortune: recorded once, with no phantom record left behind.

## Handcarts

A cart is built at the timber yard (planks, handles, wood, a hammer) and belongs to a household. It carries up to a fixed
weight in its bed, loaded and unloaded **only by a person standing at the place**, pulled by one person at a time, who is
slowed by a loaded cart and wears the cart out slightly with every tile. It follows the puller; if the puller dies it stays
where it stands, load and all. Wheels cannot cross forest, stony ground or water: a cart haul checks both legs of the trip
for a wheeled route before anything is loaded and is refused honestly if there is none. Nothing is delivered remotely.

## What drives work: wants, not orders

Each person decides from what they know. For each thing they might want — material for a building site they know of, a
repair, a better tool, bread for the household, a cart for heavy hauling, a promise they made — the **supply planner**
(`production.ts`) works backwards through the recipe table, stopping at the first thing that is at hand:

1. what they already carry; 2. stock on shelves or heaps they know of (counting only what they may take, and, for a
   workshop, what a batch of theirs will have finished by the time they get there); 3. a workplace they may use that makes
   it — bring what the batch lacks, or go and work it; 4. what is lacking is a want in turn (up to three levels), ending at
   something they can gather by hand.

It produces ordinary options, each with its utility, travel time and the reason it was or was not taken, which the
inspector shows. Production is therefore **demand-driven and bounded**: nothing is made for a want that is already met by
stock somebody knows about; there is no standing reserve except what a household holds for its table; and the wants
themselves are bounded (a site needs only its missing materials, a person wants one tool of each kind, bread is wanted only
by a household that has grain to spare and fewer loaves than twelve-tenths of its members).

Workplaces are *laid out* the same way. Each kind has a small set of local signals — planks wanted and no yard known,
bricks wanted and clay known, tools wearing and ore known, grain piling up, a hut outgrown, a settlement with several solid
homes and a sociable person — and a person with initiative (diligence, curiosity, generosity) who knows the ingredients may
mark one out. Several of them cannot start the same afternoon; a person who does not yet know where the clay, the ore or a
big outcrop is will go and look for it.

## Promises

A **request** names who asked whom, for what, how much, where it is to go, why, and by when (`expires`; `deadline` for work
requests). The answer is one of: give now, promise, or decline — with the reason (`no_item`, `own_need`, `unwilling`,
`disliked`, and for duplicates `enough`, `committed`, `in_use`).

A **promise** (commitment) has a kind (deliver to a person, haul to a site, help build, do repair work, return a tool), a
quantity or milestone, a destination, a deadline, and what has been delivered so far. Its resources are **reserved by being
derived**: the maker's spare of that item is their stock less what is promised and undelivered, so the reservation vanishes
the moment the promise ends in any way (kept, expired, set aside, moot, the maker dying). A person carries at most three at
once; an asker does not ask again for what others have already promised; a maker does not promise what they already owe the
same place; a building site takes only as many helpers as it has room for.

Time asleep or spent seeing to survival does not count against the deadline. A promise ends exactly one way:

| Outcome | When | Effect on the asker's view of the maker | Grievance |
|---|---|---|---|
| **done** | delivered in full / enough work / returned / mended | +3 warmth, +6 trust | closes none |
| **expired** | time ran out with some of it done | +2.5·fraction − 0.5 warmth, +4·fraction − 1 trust | none |
| **moot** | the building was finished or given up, the roof was mended by someone else, the other person is gone | none | none |
| **interrupted** | put aside for their own survival until it was too late | −1 trust, −0.4 warmth | none |
| **failed** | proved impossible (no stock, nothing known, the site was waiting on something they could not supply) | −2 trust, −0.6 warmth | none |
| **broken** | the maker was free and capable and did nothing | −12 trust, −5 warmth | opens "broken promise" |

A **refusal** is not a broken promise: it costs a little warmth in proportion to how much was at stake (−1.5…−6 warmth, up
to −3.5 trust), opens a grievance only if the need was real, and costs nothing at all if the reason was that it had been seen
to already, or was owed elsewhere, or the tool was in use.

Promises to bring materials to a **building site** are delivered *to the site*, not handed to the person asking (whose pack
may be full); work and deliveries toward the site, including the sawing of the planks it needs, count toward promises to help
with it.

News is carried in conversation and keeps its **provenance**: the person who first saw it, how many mouths it has passed
through, and the time of the original sighting (a told belief is never made fresher by being told).

## Shared meals

One interaction from start to finish, each step acting on real state: **invitation** (a conversation; the guest learns where
the hall is) → **acceptance** (one serving reserved against the host's own spare food) → **travel** to a physical place (the
hall, or a lit fire) → the host **lays the table** (food leaves their pack and sits on the table; it can be seen and counted)
→ guests **eat**, one unit each, which is the only way anything leaves the table → an **ending**, recorded: everyone ate and
leftovers returned to the host; or the meal was called off because the host had no food after all, nobody could come, no guest
turned up, a wolf came near, the host died, or the place was lost. A guest who is pulled away by an urgent need is marked as
having missed it, and their serving is simply not eaten. An invitation that fails is not repeated to that person for most of a
day, and a host whose meal failed does not call another for a day and a half.

## Looking after each other

A worry exists only because the worrier saw someone hungry, thirsty or hurt, or was told by someone who did (with the original
sighting's time). Dependents nobody has seen for a good while become a worry about where they are. A worry leads to a visit
only if the worrier is close enough to care, has supplies to spare (food or water they actually carry), is not in need
themselves, and knows roughly where to go. On arrival they look: if help is needed the supplies change hands; if not, the worry
is dropped and that person is not checked on again for a long while; if they are not there, the old place is forgotten and the
worry softened. Nobody knows of an injury, a hunger or a death that no one has seen or told them of.

## Quarrels

A quarrel is a **grievance** with a cause (competition for something, scarcity while going hungry, a refusal when it mattered, a
broken promise) in words, a weight that falls with time (−3 every 240 ticks, gone within three days at the latest), with
apologies and with gifts. An apology is attempted only while a grievance is open and not given up on (at most three
unaccepted apologies), only after it has cooled, and an accepted one closes it on both sides and records it as settled. A
settled pair is much less likely to fall out again over the same sort of thing for most of a day. A different incident is a
different grievance. Greetings, company, friendship and news sharing are unchanged.

## Surviving while working

Before taking on anything that is not about survival, a person works out whether they could still reach water and food: the
walk there, the work (up to about fifty seconds of it, since longer jobs are reviewed as they go), and the walk back, against
what they carry or can see — **confirmed** relief, with a small margin — or only remember — **possible** relief, which needs
a large one and is a fallback, never a rescue. Work that fails the test is not taken on, and the inspector says so ("would
leave them too far from water for too long…"). With wolves about, a long trip that cannot be finished before dark is not started.
A drink or a meal already under way is finished while it is still doing good unless danger or a deadlier need says otherwise;
danger and critical needs interrupt anything at once, and a promise put aside for survival is marked as such rather than as
neglect.

## The contested-claim rule

People are stepped each tick in a rotating order `(i + tick) mod n`. Anything exclusive — one unit of a berry bush, a worker
slot on a site, a field plot, the start of a batch, the bench tool, a tool on a rack — goes to whoever acts first in that order.
The other's activity fails at once with the reason recorded ("someone else is already taking it", "a batch is already under
way"), the option is not retried for a while, and the loss is a small grievance if the thing contested was food. The order
depends only on the tick and the population, so a run is reproducible.

## What happens to goods when something goes wrong

| Situation | Rule |
|---|---|
| Materials delivered to a site that is then given up (no work or supply for 4 days; 7 days for workshops and rebuilds) | left in a heap on the spot, found and collected by ordinary salvage options |
| Inputs on a workshop's shelves that nobody uses | stay there as stock; a visitor's unused deliveries lapse into the workplace's stock after a day and a half |
| A batch nobody finishes | shelved after two days; materials back on the shelves |
| Full store when a batch finishes | the batch waits, still holding its contents, and completes when room appears |
| Spoilage | food in stores and heaps goes off at a recorded rate (granary: a fifth when tended); the loss is in the ledger |
| A tool wears out | breaks; recorded; no record left behind |
| A building collapses or is destroyed | store, running batch and racked tools become a heap of rubble |
| A person dies | belongings, tools included, are dropped where they fell; promises are released; requests withdrawn; a meal they hosted is called off |
| A cart's puller dies | the cart stays, load and all |

## Rule changes made on purpose (relative to the version before this work)

* Goods made at a workplace for a building site are held for that site as well as for whoever ordered them, and the planner
  knows what is held. Before, every plank held for somebody's granary looked free to the whole settlement: in 20-day runs of
  `meadow` and `fern` about half of all trips to collect from a workshop failed (187 of 357 and 163 of 322), and 93–94% of those
  failures were at goods held for somebody else (fourteen different people walked to the yard for the same single plank). After:
  7 of 176 and 15 of 324, one of them at goods held for another person. These are single runs of two seeds, measured by
  watching withdraw trips in a headless run; the worlds differ after the change, so they are not the same trajectories.
* Grain, flour and bread spoil in ordinary stores and heaps (grain did not before); the granary exists to slow it.
* A fishing rod, a smokehouse and smoked fish exist (fish was the one food with no way to keep it). Measured, not assumed: in
  four 30-day runs (`meadow`, `river`, `fern`, `aspen`) the first rods were in stock by day 2–6, the first smoked fish on day
  14, 19, 21 and 13, and from then on smoked fish was in stock at every daily sample to day 30; no one died and the books
  balanced in all four. Fish was not much of a waste problem to begin with — in 25-day runs of the same four worlds before the
  change about a tenth of the fish caught spoiled (73 of 748, 43 of 396, 92 of 767, 73 of 753) — so what the smokehouse adds is
  food that keeps and weighs less, not a large cut in spoilage. A new building kind must be added **last** in `BUILD_DEF`: the
  order of its keys salts the per-building hashes (`tests/smoking.test.ts` keeps it honest).
* A well exists (`scripts/waterwalk.ts` measures the walk, `scripts/wellgeo.ts` the placement). Before it, in 30-day runs of
  `meadow` and `fern` (ordinary and harsh), the one-way walk to a drinking place took 5.2–5.7% of everybody's time, the median
  walk was 8–10 tiles and the longest 29–48, and in the two harsh worlds most of the people whose thirst was critical were still
  walking to the water (133 of 173 samples in `fern`, 74 of 88 in `meadow`). With the well, in the same four runs (built on day
  9–12): 3.8–4.8% of time, a median of 5.1–8.0 tiles (the longest walk 28–38, little changed), and 130 and 71 critical-thirst
  samples instead of 173 and 88. These are single runs of each world, and the worlds differ once the well stands, so this is what
  happened and not a controlled difference. It saves a walk only to the people it is nearer to than the lake: it stands near the
  camp and at least six tiles from the water, and in four ordinary worlds (`meadow`, `river`, `fern`, `aspen`) it was nearer than
  the shore to 17 of 21, 9 of 23, 11 of 23 and 12 of 31 homes. Centring it on the homes that are far from the water was tried and
  put it where fewer homes were nearer to it than to the lake, so it stays at the camp.
* A site limit of four homes/fires/storehouse at a time, with separate allowances for improvement projects.
* Promise deadlines are 1800 ticks (were 1200 or 1400), exclude sleep and survival time, and end in six distinct ways.
* A trade is declined, not attempted, when either pack cannot take what it would be given.
* Recruiting is done only when a site can actually use another pair of hands; a site takes a bounded number of helpers.
* Apologies are made only over an open grievance with a cause (before: whenever affinity was low or a quarrel was recent).
* Discretionary work is held back when it would strand someone from water or food; long trips are not started with wolves about
  and the dark coming.
* A drink or meal in progress is not abandoned for something better.
* Tools wear and break (they never did), and there are three new ones.
* Shared meals are called between noon and about 16:20 on the simulation clock, so that the meal itself (about 52 seconds of
  simulation later) falls at dusk. An earlier build of this work measured the window from the raw tick count instead of the
  clock the rest of the simulation uses, which put invitations in the late evening; that was a defect, not a rule.
* A handcart haul no longer loads anything until the hauler is standing at the load. A mid-flight change of destination
  inside the activity's start-up step used to let the first leg's work run immediately at the wrong place (found by a staged
  scene whose store was far from the cart; `tests/chains.test.ts` now keeps a far store in view).
* A person asked to go and look at someone no longer gives up because the usual place to stand beside them is built over or
  boxed in (asleep between three lean-tos): any open ground within talking distance will do. In an earlier build most welfare
  visits ended "cannot reach them" for this reason alone.
* A visit to someone who may be in need is not abandoned on the way just because they come into view; and a worry about a
  grown person who was hungry or thirsty is not acted on once more than 48 seconds old (they will have seen to it themselves),
  while a worry about a child, a frail elder, someone hurt, or someone not seen for a long time stands for most of a day.
* Someone who would swap a wearing tool for an iron one and knows a smithy now wants a hammer of their own (forging needs one),
  and the planner lets a long chain end in gathering raw materials at any depth (the wood for the charcoal for the iron),
  where before it stopped two stages short. Before this, nobody in an ordinary world forged anything.
* The clock is told the real length of every frame (it used to be clamped before the clock saw it, which hid stalls from the
  speed readout), counts what it gives up, and the readout reports recent skips only. The first frame after resuming carries
  on from the picture that was on screen instead of stepping back a little.
* Saved worlds are version 3. Saves from before workshops, tools and carts existed are refused rather than half-loaded; a saved
  world with a cart on the road used to lose the cart on loading and now resumes exactly.
* A handcart is valued by the trips on foot it saves: a load that would take three trips carrying a pack is worth fetching
  the cart for, a load that fits in one pack is not.

## Staged scenes

The ordinary seeded world is the demonstration of natural behaviour. Six small scenes are staged for watching one rule in
isolation, each labelled **TEST SCENE** on screen and in `world.sceneLabel`. Three predate this work (a contested berry, a
request for help, a shared building). Four are new, and none of them tells anybody what to do:

| Scene | Set up | What to watch |
|---|---|---|
| `workshop` | a hut being rebuilt as a house, all but the planks delivered; a timber yard, a saw, an axe, trees | who cuts and saws, planks carried to the site, the house finishing |
| `meal` | a hall by the water, a host with bread and fish, two friends, late afternoon | the invitation, the table, one serving each, the recorded ending |
| `haul` | bricks and planks in a store about 25 tiles from a house site that wants them, a parked cart by the house | the cart going out empty, loaded at the store, back to the site, never over its bed |
| `care` | a frail old man asleep and hungry in his lean-to on the far side of the settlement, who knows of no food; a neighbour who earlier saw how he looked (the one staged memory); a friend with food | the neighbour deciding to go, walking over, finding him in need, and the food changing hands; the worry then dropped |

Only the planners that turn wants into work (workshop, meal, care) run in these scenes; planners that start new building
projects stay off, so a staged scene never grows more than was staged.

## Limits worth knowing

* There is still one settlement, one map, one animal species; no currency, no markets, no caravans, no combat.
* A workplace's output is not routed anywhere automatically: somebody has to want it and go and fetch it.
* **Iron is the slowest chain and does not appear in every world.** The ore lies 23–26 tiles from the camp in all four standard
  seeds, a wooden tool is cheap to replace, and a forger needs a hammer of their own, charcoal from the kiln, and ore carried
  a long way. In the 120-day ordinary runs tried (`river`, `meadow`), `river` forged its first iron axes by about day 50 and
  `meadow` built a smithy around day 20 and had still forged nothing at day 120. The whole chain from raw materials to an iron
  axe is exercised by one person's ordinary decisions in `tests/chains.test.ts`; how often it emerges unprompted is not claimed.
* **Carts are rare in ordinary play.** No cart was built in any of the ordinary runs tried (up to 160 days); one is built only
  once somebody has carried heavy loads far enough often enough. Their mechanics, their value to a hauler who would otherwise
  make several trips, and the staged `haul` scene are tested; their emergence is not demonstrated.
* Wear rates, recipe yields and the like are tuned to make chains visible in a few weeks of watching, not calibrated to
  anything real.
* One run of any seed is one run: the baseline comparison in `BASELINE.md` is evidence about those runs, not a claim about
  long-term stability.
