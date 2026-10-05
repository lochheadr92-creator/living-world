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
| Word about people: accounts, passing them on, the hearsay cap | `sim/reputation.ts` | |
| Grief, the grave visit, the remembrance meal | `sim/grief.ts` | |
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

## Tools

A tool is a **record** (kind, quality tier, wear, owner household, holder, loan) *and* a count in whatever holds it, kept
in step by every transfer. It is never conjured: hand-making and forging record it as created; breaking records it as
consumed.

* **Effects** are task-specific: axe (felling, and hewing planks), pickaxe (rock, clay, ore, outcrops, quarry), hoe (till/tend), basket
  (picking, carrying), hammer (construction and repair speed; required for forging and for building a cart), saw (planks with
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

## Word about people

People tell each other about *people*, not only about places. An **account** is something one person did to another, as the
holder knows it: `kept` (a promise was kept), `broke` (a promise was broken, when the maker was free to keep it) or `gave` (a
real gift between households, or to someone in real need; routine care of children does not count). Someone holds an account
only because it happened to them, they watched it, or someone who held it told them. It keeps the event's own time, who it was
about, who it was done to, who first held it (the origin) and how many tellings it has been through. Up to ten are kept per
person, newest first, and an account older than three days is no longer told.

When two people talk, the speaker may bring one up: a grievance is raised by someone who cares about who was wronged (family,
housemate, a friend) or who already thinks ill of the subject; praise is raised by someone who likes the subject. Nobody is
told about themself or about something done to them, nobody is told the same event twice, and an account is passed on at most
twice (a listener who heard it at the second hop keeps it to themself).

What the listener does with it is deliberately small. Their trust in the subject moves by at most about 40% of what the same
thing does first-hand (a broken promise is −12 first-hand and at most −4.5 by hearsay), scaled by how far they trust the teller
(a teller they trust little or not at all is not believed and the account is not kept), by how little they already know the
subject (someone they know well is judged on what they have seen), and by how fresh it is. The total that hearsay can have moved
one person's trust in another is capped (−15 to +9) and that cap relaxes with time. Every change is in the listener's record of
the pair with the teller's name on it, and the person inspector lists each account with how it came to be known.

## Quarrels

A quarrel is a **grievance** with a cause (competition for something, scarcity while going hungry, a refusal when it mattered, a
broken promise) in words, a weight that falls with time (−3 every 240 ticks, gone within three days at the latest), with
apologies and with gifts. An apology is attempted only while a grievance is open and not given up on (at most three
unaccepted apologies), only after it has cooled, and an accepted one closes it on both sides and records it as settled. A
settled pair is much less likely to fall out again over the same sort of thing for most of a day. A different incident is a
different grievance. Greetings, company, friendship and news sharing are unchanged.

### Onlookers, and friends who step in

A quarrel is also a thing other people know about. Both people in it, and everyone awake within about seven tiles, hold an
account of it (`quarreled`: who started it, who it was with). Each side holds their own version, so each may tell it, and a
listener weighs it by how far they trust the teller (see "Word about people"); it counts for less than a broken promise.

An onlooker **takes a side** only if they are clearly closer to one of the two (affinity, plus a lot for kin and a fair amount for
housemates; a difference under 12 points means no side). They regard the one they sided with slightly better and the other
slightly worse, and it is in their log. Nobody takes a side over something they did not see or hear of.

A friend may **step in**. Someone who holds an account of a quarrel or broken promise between two people, no sooner than about 40
ticks after it happened and no later than three days, who likes one of them and does not dislike the other, is not sore at either,
and is sociable enough, may go and talk one of them round. The urge is strongest soon after and fades over about a day, because most
quarrels fade by themselves by then (a friend who arrives late usually finds it already healed, and says so). The one spoken to
listens in proportion to how far they trust the friend and less the deeper the hurt (a 10–90% chance); if they do, their soreness
towards the other falls by 14–26 (a quarrel's weight starts at about 40–46) and they feel a little less alone. If the other person
is standing within nine tiles and awake, the friend gets to them in the same visit, with the same odds from their own trust, and if
that leaves neither sore the feed says the friend helped them make up; otherwise the other side is a separate conversation later.
If the quarrel has already healed they say so and the friend does not try again soon; if they will not listen, the friend waits
longer. The friend never learns whether a quarrel is still live except by asking: the option is chosen from the account alone.

What this achieved in ordinary play (four seeds, 30 days each, one run each): a friend's talk was heard 1 to 8 times a world and
fully made up a quarrel in 0 to 2 of them. It stays modest on purpose and by the nature of the world: arguments are rare (3 to
12 a month) and most end on their own or by apology before anyone steps in. The counters `stats.mediated`, `medTried`,
`medHealed`, `medRefused`, `madeUp` and `sided` are kept so this can be watched.

## Grief and remembrance

Someone mourns only because they **learned** a person had died, one of three ways: they were awake within 14 tiles when it
happened (and close to the person), they came upon the fresh grave within nine tiles (a death nobody saw is found out this way),
or someone who knew told them, in an ordinary conversation, once. Nobody who was not close to them grieves. How close is read from
kinship (partner 90, parent or child 80, sibling 65), shared household (50) and strong warmth (25–40).

That number is how heavily it weighs at first. It eases by about 12 a day, and the person is somewhat less hungry for company and
wanders and works less willingly while it weighs (their appetite for work is cut by up to 35% and for exploring by up to 40%;
kindness is untouched). It eases faster in three ways. **At the grave:** with nothing pressing (not night, not hungry, thirsty or
tired) someone whose grief weighs 25 or more may walk to the grave they were told of or saw, stand there 150–210 ticks and come
away eased by 15–20; nothing is created. **Among others who mourn the same person:** when two of them talk it eases each by
4, once a day. **Over a meal in memory:** a meal called by someone still mourning (within three days) is marked as held in memory,
the host is keener to call it and to ask others who mourn the same person, and everyone who sits down to it and mourns that person
is eased by 15. People remember having been told for six days, so word can still pass on.

How often this happens depends on how often people die; see "Ages, ageing and death" below. The tests bring a death about in a
running village and check what the village does after it: in one such run three people mourned, one went to the grave and no meal
was called in memory.

## Ages, ageing and death

A year of age is still twelve days (so a day is about four minutes at 1×, and a lifetime is about 56 hours at 1× or 3.5 at 16×).
What changed is what a life is like. Everything below comes from a person's age and an inborn **frailty** (0.6 hardy to 1.9
frail, fixed by the seed and the person), with no stored state and no random stream, so it cannot disturb anything else
(`sim/ageing.ts`).

**Death.** Each minute of simulated time everyone has a small chance of dying of ordinary causes, from this yearly hazard: 12% in
the first year, 3% falling to 1.2% by five, 0.6% to fifteen, then `0.2% + 0.055% × e^(0.07 × age)` (doubling about every ten
years from fifty on), all times frailty, and times up to 3 for someone who is hurt or worn out. It is fitted so that of people who
reach fifteen about 85% see forty, half see sixty, a third seventy, a tenth eighty and one in fifty ninety, and about three in four
newborns reach fifteen; the mean age at death comes out near 46 (children included). The cause is put down as a childhood illness
(under twelve), illness (to sixty-two) or old age. A birth carries about a one in a hundred risk to the mother in her twenties,
more after thirty-five and for the frail. Hunger, thirst, cold and wolves are separate and unchanged. A village of about thirty loses
someone about every three weeks of simulated time, mostly infants, the old and, now and then, someone in their prime.

**Vigour.** From about forty-five (earlier for the frail) strength fades: walking speed falls to about 80% by the late eighties, a
pack holds less (12 in the prime, about 8 at the end), and gathering, mending and crafting take up to about 1.5 times as long. It
never falls below 45% of the prime. Children keep their own stage factors as before. (Sight, recovery and skill are not changed.)

**Fertility.** Full to thirty, falling to nothing at forty-five (it was a flat window from 17 to 44).

**The starting age mix.** Adults are spread from 17 to 62, there are usually two to four elders aged 63 to 84, and children from
one to eleven, so deaths and handovers show up in the first weeks. Travellers who arrive are 18 to 48.

**Whether the population holds.** `scripts/demography.ts` runs the real mortality, fertility and childbirth functions inside a
simplified model (couples form, every settled couple is fed and housed, arrivals come when the village is small), hundreds of
simulated years in seconds. Over 20 starting villages for 300 years, with arrivals on (the default): none die out and the village
settles at about 55 to 62 people (range 54 to 66). With arrivals off, a closed village of about thirty shrinks slowly (median
30 at year 50 to 100, 20 at year 200) and 6 of 20 die out within 300 years, which is what a closed population of thirty should do.
The model is optimistic about food and housing, so it bounds the full simulation rather than replacing it. The full simulation, run for 90 days
(7.5 years) on four seeds, one run each: populations of 58 to 64 (from 28, with births and arrivals), five to seven deaths each
(about one every two weeks; ages 0, 0, 0, 1, 3, 9, 10, 11, 27, 28, 32, 32, 33, 33, 34, 35, 36, 37, 38, 41, 47, 78, 85, 86; causes
illness, old age, childhood illness, one childbirth and one exposure), up to four people grieving at once, and the ledger balanced
at every checkpoint. Longer full runs were not done: a 90-day full run takes about half an hour of real time on four cores, which is
why the fast model exists.

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

* Grain, flour and bread spoil in ordinary stores and heaps (grain did not before); the granary exists to slow it.
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
* Saved worlds were made version 3 at this point (version 4 is below). Saves from before workshops, tools and carts existed are refused rather than half-loaded; a saved
  world with a cart on the road used to lose the cart on loading and now resumes exactly.
* A handcart is valued by the trips on foot it saves: a load that would take three trips carrying a pack is worth fetching
  the cart for, a load that fits in one pack is not.

* Saved worlds are version 5: people hold accounts of how others have behaved, carry a hearsay total and grief for those who died,
  and the dead are recorded with their household and grave, so saves from before that are refused rather than half-loaded.

* People now die of ordinary causes at realistic rates (illness, old age, childbirth), strength and fertility fade with age, and
  the starting population has more old people. See "Ages, ageing and death". Two tests changed because of it: the two-week
  ordinary world no longer asserts that nobody dies at all (only that nobody starves, freezes or is eaten) and no longer asserts
  that a shared meal is completed within fourteen days.

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
