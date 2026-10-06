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
| Teaching: lessons and learning by watching | `sim/teaching.ts` | |
| Deciding together: proposals, stances, quorum | `sim/council.ts` | |
| Leisure: evenings at the fire, play, contests, keepsakes, calls, jokes, celebrations | `sim/leisure.ts` | |
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

How often this happens depends on how often people die; see "Ages, ageing and death" below (a death every couple of weeks of simulated time once the village is large, so grief is a regular part of life). The tests bring a death about in a
running village and check what the village does after it: in one such run three people mourned, one went to the grave and no meal
was called in memory.

## Ages, ageing and death

**Life pace.** The year of life is a setting (world menu, "Life pace", applied to the next new world): 6, 12, 24 or 48 days of
simulated time, 12 by default. At 12 a day is about four minutes at 1×, so a lifetime is about 56 hours at 1× or 3.5 at 16×. The
pace changes how fast people age, how long a pregnancy and the gap between births are, and how often someone dies per day. It does
not change what a year of life holds (the numbers below are per year), so slower means fewer deaths and births per day and children
who take longer to grow up, and faster the reverse. Illnesses last a few days whatever the pace. Older saves lack the setting and
keep 12.

Everything below comes from a person's age and an inborn **frailty** (0.6 hardy to 1.9 frail, fixed by the seed and the person),
with no stored state and no random stream, so it cannot disturb anything else (`sim/ageing.ts`, `sim/illness.ts`). The chance
mixes in the world's seed: people have the same ids in every world, and without it the same person met the same fate at the same
moment in every world.

**Death has two parts.** A *baseline*: sudden death and failing health, 2% in the first year, 0.5% falling to 0.2% by five, 0.07% to
fifteen, then `0.01% + 0.0000113% × e^(0.16 × age)` (very low in the prime, doubling about every four years in old age), times
frailty, times up to 3 for someone who is hurt or worn out. And *illness*, a visible spell (below). Together they are fitted to a
modern-style span: of people who reach fifteen, about 98% see forty, 92% sixty, 79% seventy, 54% eighty and 18% ninety, and more
than nine in ten newborns reach fifteen. A birth carries about a one in a hundred risk to the mother in her twenties, more after
thirty-five and for the frail. Hunger, thirst, cold and wolves are separate and unchanged. Causes are put down as a childhood
illness (under twelve), illness, or old age (baseline deaths from sixty-two).

**Illness.** A serious spell of illness starts with a yearly chance that depends on age (0.3 in the first year, 0.18 in childhood,
0.1 in the prime, 0.14 from forty-five, 0.22 from sixty-two) and frailty, and is likelier in rain and storms and when someone is
starving or cold. It lasts one and a half to four days (30% longer for the old) and has a severity from 0.3 (a cold) to 1 (grave;
about a quarter of spells are serious, 0.67 or more). Health dips towards the middle of it and recovers, so a serious spell shows:
the person looks hurt, and neighbours bring food and water through the ordinary caring behaviour (every such kindness is counted).
Meanwhile they are slow to work or wander (65% less appetite for either) and choose to lie down at home. When it comes to a head
they recover or die. The chance of dying is 5% for a newborn, 0.8% in childhood and the prime, 2% from forty-five, 6% from
sixty-two and 12% from seventy-five, times frailty, times a factor that rises with severity, halved by three kindnesses and
raised by 40% if they are starving. Someone who recovers is not ill again for three days. Serious spells and recoveries that
involved care are in the feed.

**Vigour.** From about forty-five (earlier for the frail) strength fades: walking speed falls to about 80% by the late eighties, a
pack holds less (12 in the prime, about 8 at the end), and gathering, mending and crafting take up to about 1.5 times as long. It
never falls below 45% of the prime. Children keep their own stage factors as before. (Sight, recovery and skill are not changed.)

**Fertility.** Full to thirty, falling to nothing at forty-five.

**The starting age mix.** Adults are spread from 17 to 62, there are usually two to four elders aged 63 to 84, and children from
one to eleven. Travellers who arrive are 18 to 48.

**How often someone dies** is mostly arithmetic: in a village of steady size, deaths a year are about the population divided by the
average lifespan. With this curve the mean age at death is about 74 and 85% of deaths fall on people over sixty-two, so a village of
about sixty loses someone about every 15 simulated days at 12 days a year (about every 31 at 24 and every 8 at 6), and a village of
28 about every 30 to 40.

**Whether the population holds.** `scripts/demography.ts` runs the real mortality, illness, fertility and childbirth functions
inside a simplified model (couples form, every settled couple is fed and housed, a spell of illness is cared for 60% of the time,
arrivals come when the village is small), hundreds of simulated years in seconds, at any life pace. Over 20 starting villages for
300 years with arrivals on (the default) none die out and the village settles at about 58 to 65 people (range 54 to 68), with about
a quarter of them elders. With arrivals off, a closed village of about thirty grows to about 55 to 65 by year 50, then declines
slowly (median 39 at year 300, worst 11); none of 20 died out. The model is optimistic about food and housing, so it bounds the full
simulation rather than replacing it. The full simulation, run for 30 days on four seeds (one run each): populations of 42 to 53,
10 to 21 spells of illness per world (59 in all, 9 of them serious, none of the serious ones fatal), four deaths in all (old age at
82, thirst at 3 and two mothers in childbirth at 28), and the ledger balanced. Longer full runs were not redone for this curve: a
90-day full run takes about half an hour of real time on four cores, which is why the fast model exists.

## Teaching

Skills (eleven of them, from foraging to smithing; about 0.7 to 1.5 to start with, 1.8 at most) still grow with practice, and now
they also pass from person to person, two ways. Everything is on the learner's record ("learned from others" in the person
inspector: who showed them, what, how much it helped), and nothing is created or consumed (`sim/teaching.ts`).

**Instruction.** Someone who is good at something (skill 1.0 or more) may offer to show someone who is clearly less skilled at it (a
gap of at least 0.2; for a grown person at least 0.3, since grown people are only shown what they clearly lack). It is an ordinary
conversation: the teacher says what they would show ("Let me show you how to saw planks"), the learner accepts or not (likelier for
children, the curious and the diligent, and someone who trusts the teacher). Teachers are chosen by the same things as everything
else: how big the gap is, generosity and sociability, a bonus for an elder passing on what they know, for family and for a young
learner, and a walk penalty. They only offer to people they are close to or live with, by day, when nothing pressing is going on.
A lesson raises the learner by 6% of the gap for a grown person, 10% for a youth and 12% for a child, scaled a little by how far
they trust the teacher (never less than 0.006 or more than 0.04, and never to within 0.05 of the teacher's own level, so nobody
ends up better than who taught them). The teacher gains 0.002. A person gives at most one lesson, and takes at most one, in half
a day, and the same skill to the same learner at most once a day.

**Watching.** Someone working at the same job next to a clearly better worker (building, repairing, crafting, farming, gathering the
same kind of thing) picks up a trickle of it (at most 0.003 each time the neighbours are noticed, roughly a tenth of the gap per
hundred notices for a child), never past the other person; every 0.04 gathered is noted on their record.

What this did in ordinary play (four seeds, 30 days, one run each): 126 to 272 lessons a world (four to nine a day), mostly
children and youths learning from adults and elders, with elders giving 10 to 50; lessons moved about a fifth of all skill growth and
watching about 3%, so practice still does most of it and people stay different from one another. It is a modest effect, by design.
It does not make skills spread from people who have died (their skills die with them), but while they live their knowledge can be
passed on, which is why an elder is worth something to a village after their strength has gone.

## Deciding together

A communal building (a timber yard, a quarry, a kiln, a smithy, a granary, a bakery, a hall) used to be marked out by whoever
had the initiative that afternoon. Now the village has to agree first, and nobody is in charge of that (`sim/council.ts`).

**A proposal.** The person who wants one (the same signals as before: planks wanted and no yard known, grain going off, and so on,
and the same "only a few take a thing up on a given afternoon") puts the idea to the people they meet, in an ordinary conversation
("We ought to build a granary, Ana: the grain keeps going off"). It starts open, with the proposer in favour.

**A stance.** Everyone who hears of it takes one, from their own circumstances: how much they like and trust the proposer; whether
they are hungry or thirsty themselves (food first); what the thing is for (a hall suits the sociable, a granary or bakery a household
with fields, a smithy or kiln the curious, a yard and a quarry everyone a little); how much work it means (the diligent lean
towards); whether they already know of one (strongly against a second); and a steady personal lean. The result is for, against or
not sure; people who are not sure count neither way.

**Word spreads by talking.** Only someone who has heard of a proposal can pass it on, one at a time in a conversation, and only
people who have heard of it count. When two people who have heard of different proposals for the same building meet, the younger is
folded into the older (supporters and all), so support is not split.

**Carried or turned down.** It is carried when the supporters reach about one in ten of the village (never fewer than three) and
outnumber the opposed: the feed says "The village agreed to raise a granary (5 for, 0 against)". Someone who supported it may then
mark the site out (a person who did not hear of it, or was against it, may not, and says in the inspector that "the others have not
agreed to it yet"), and everyone who was for it is inclined to help build it (a bonus of nine on building that kind of site for twelve
days). It is turned down when at least three are against and the opposed outnumber the supporters by two or more; nobody who heard of
it raises it again for two days. A proposal nobody settles lapses after two and a half days, a carried one nobody takes up after six.
The person inspector lists the proposals they have heard of, what they made of them and how each stands.

What this did in ordinary play (four seeds, 30 days, one run each, compared with the same worlds with councils turned off): most
buildings still go up, one to three days later (the first timber yard on day 6 to 8 against 5; the first granary on day 7 to 9
against 5), six or seven of the seven in every world, and ten to thirteen motions carried a world, one to three turned down and one to
six lapsed. The quarry is the building most likely to be late: it was sited in three of four worlds, as it was without councils. Several
people can raise the same thing before they have met; folding those together removed most of the churn, but a few duplicate proposals
remain. Turning councils off (`settings.councils = false`, not in the menu) restores the old behaviour exactly, and is how the
comparison was made. One existing test changed because of the delay: the save-and-resume test with a workshop at work now runs
24,000 ticks, not 15,500, before it expects one.

## Life that is not needed

Nothing here is needed to live. Each thing is an ordinary option that is only offered when nothing presses (nobody hungry,
thirsty or worn out, nothing wrong, not ill), so it loses to anything that matters, and each rests on something real: the fire
is lit, the story is something the teller knows, the keepsake costs wood, the bite is food that really changes hands, the
occasion really happened (`sim/leisure.ts`; `settings.leisure = false` turns all of it off).

**Evenings at the fire.** In the evening, someone with nothing pressing may go and sit at a fire they know to be lit, among
whoever is there (more attractive with company, and a little more so for a child or an elder). Every couple of minutes, at a lit
fire where two or more are sitting for the evening, someone who has not performed lately tells a story or sings (the sociable,
and elders, are likelier). Listeners feel better (+3 company for a story, +4 for a song, +5 for the performer), feel a little
closer to them, and it is in their log. A story is not only entertainment: whatever the teller knows of places and dangers, and
of how people have behaved, passes to the listeners exactly as in any other conversation (with the same limits), which is how
news now travels through a village in the evening.

**Celebrations.** A birth, a coming of age, a new partnership and a recovery from a serious illness are noted by everyone in the
circle round it (the person, their household, their kin) and stay on their minds for three days. Someone who carries one is keener
to call a shared meal (a bonus of seven) and to ask the others it concerns; the meal is marked as held for it, everyone who sits
down is cheered by ten, and the feed says "Hana held a meal to celebrate the birth of Mira". (A meal called in memory of someone who has
died takes precedence over a celebration.)

**Play.** A child with nothing pressing, by day, goes and plays, with other children if any are about (more attractive for the
sociable): they run about in a small circle on open ground for a few hundred ticks, feel better, grow fond of whoever they play
with, and a very little of what a grown person is doing nearby rubs off as make-believe (0.002 at a time). It takes a little energy.
They do not play again for a while.

**Friendly contests.** Two adults or youths who know each other, are not at odds and are strong enough may try each other at a
race, a wrestle or a throw: the one asked agrees more readily if not cautious and fond of the asker. It is decided by strength and
stamina on the day with a little luck from a hash of the moment, so the stronger wins more often but not always. Both enjoy it
(+4 company), the loser feels a touch of respect for the winner rather than a grudge, anyone close by who is free watches (+3) and
the feed hears of it now and then. Each can enter a contest only once in about half a day.

**Keepsakes.** Someone with a piece of wood to spare, a steady hand and a person they care about (family, a housemate, a close
friend; children and a person to celebrate count extra) carves something for them. It costs one piece of wood from the giver's
pack, written off in the ledger as "carved into a keepsake"; no item is made. The receiver keeps a record (a small bounded list,
shown in the person inspector) and feels warmer to the giver. Once every three days at most for a given person.

**Calling on someone.** A friend (or kin) who has not been seen for half a day and is known to be somewhere not too far off
(within about thirty tiles) may be called on, by day. It is a normal conversation, and the person called on offers a seat and, if
they are generous (or it is family) and can spare it, a bite: one unit of food that really leaves their pack. Either way it is a
pleasant visit for both (+6 and +3 company) and they grow closer.

**A joke in passing.** Now and then, in a chat, one says something funny. Between friends it lands (they laugh, +3 company,
a little warmer); between people who are neither friends nor foes it is mildly amusing or falls flat; only someone who already
dislikes them is stung (a little less trust). It is not repeated to the same person for a while.

What this did in ordinary play (four seeds, 30 days, one run each, with and without leisure): 27 to 57 evenings with a story or a song
a world (one to two per cent of everyone's time, 34 to 134 pieces of news passed on in stories), play about 2 to 4 per cent of
everyone's time, 40 to 80 contests, 6 to 13 keepsakes, 18 to 22 calls (one or two of which came with a bite), 10 to 26 jokes and
0 to 3 celebrations (happy occasions are few). The time spent working was unchanged (20 to 24 per cent either way), and the amount
done (things gathered, built, crafted and farmed) within a few per cent either way, which is within the difference between two runs
of a world; what leisure took was spare evenings and some of the plain chatting. Saves are version 9.

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

* Saved worlds are version 9: people hold accounts of how others have behaved, carry a hearsay total, grief for those who died,
  any spell of illness and a record of the skills they learned from others, the world holds the village's proposals, and people hold keepsakes they were given and occasions worth celebrating, and the dead are recorded with their household and grave, so saves from before that are refused rather than
  half-loaded.

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
