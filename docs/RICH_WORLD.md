# The integrated world: implemented systems and evidence limits

Current direction (2026-10-17): these systems are the default for new product worlds. The internal `rich` name remains for save compatibility and lab controls; it is no longer an opt-in product mode. See [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md). The implementation inventory below does not establish aggregate benefit for every system.

Historical implementation notes follow. One page, one line of truth per mechanism: what it is, where it is read, and how to see it in the page. Everything here is
behind `settings.dynamics = 'rich'`. In an authored world every function below returns its neutral value and no field below is
ever created, so authored saves and fingerprints are untouched (the golden suite checks this on every commit). Every chance
below is a hash of the seed, the person and the tick, never a draw from the world's random stream, so a replay is exact and
the lab's "nudge" still tells chaos from cause.

| Mechanism | Module | What it changes | Read where | See it |
|---|---|---|---|---|
| Occasions | `occasions.ts` | A death calls a funeral, a birth or wedding a feast, a harvest a harvest feast, the calendar a market every sixth day once a hall stands. Held at the hall (else the fire), in daylight by the world clock. | `attendOptions` (30–50 against ordinary work's 20–45; closer kin and friends, the sociable, more), `arrive` (the first eight met, a thought for everyone, food to the hungriest at the market, `marketSwap` barter) | Feed: "A funeral for X is called at the hall today"; people's logs "Went to the market" |
| Reputation and news | `reputation.ts` | What people saw of each other (a gift, a quarrel, a promise kept or broken, a death, a birth, a wedding, a theft) is held with its source, teller, hops and age, passed one story per conversation, weighed by trust, fading over twelve days. | `social.ts willingness` (±0.25), chat option (±3), the ask worth making | Person card, Traits & skills: "What they have heard of people" |
| Illness | `illness.ts` | A fever from cold, hunger and exhaustion (more in winter); passes in talk (12%), at one table (15%), under one roof; worsens a day, eases with rest counted double; costs health (fatal on an empty stomach), twenty days' immunity after. | bed and rest options (+14–30, +10–22), chat candidates (the cautious keep away), existing care for the hurt | Health line: "62 · a fever, day 2: bad" |
| Apprenticeship | `apprentice.ts` | On top of the trade a person settles on for themselves (`trade.ts`, by comparative advantage and what they see others at): a tradesperson may take on a workmate after a job done together; the apprentice learns half as much again within ten tiles of the master, graduates into a trade of their own when nearly as good, lapses after five idle days. Skill still grows only by practice. | `onSharedWork` (facilities, building sites), `notePractice` at every skill-gain site | Traits & skills line: "Their trade: smithing — learned from Sven; apprentice at smithing under Sven"; feed "has taken X on as an apprentice" |
| Hopes | `life.ts` | On coming of age one hope from the nature: a solid home, a family, a trade, a full store, a good name. Progress is read from the world; a nudge of 4 to what serves it; a weight when long unmet, a lift when reached. | `goalNudge` in the ranking; thoughts | Traits summary: "Hopes for a family (50% there)" |
| Injury and age | `life.ts` | Felling, breaking stone and building may hurt (sprain, cut, broken arm): walking up to 40% slower, work up to 50%, healing two to six days. Elders carry and mend at three quarters and are hurt twice as easily. | `moveSpeed`, `tools.ts taskMultiplier`, `carryCap`, `needs.ts` recovery | Health line: "a broken arm (at the building site), 4 days to heal" |
| Theft | `misdeeds.ts` | Very hungry, nothing carried, nothing at home: another household's store is an option weighed against conscience (−18, −8·caution, −6·generosity). Who saw decides the cost: witnesses hold the story, the household wronged a grievance. | `options_survival.ts` eat-from-store loop, `act_resource.ts onTheft` | Feed (conflict): "Bea caught Sven taking food from the Ash household's store" |
| Favours | `misdeeds.ts` | `Relation.debt` (a gift leaves one) is read: whoever owes is readier to grant, whoever is owed readier to ask. | `willingness`, `optRequest` | Decision record: "they owe me a favour +3" |
| An ask worth making | `options_social.ts` | A request for food or water is weighed by how likely the answer is yes (plausibility, trust, their name, what they owe); a likely refusal is not asked unless the need is dire. | `optRequest` | Decision record, blocked: "not worth asking: they would likely say no" |
| Finite rock | `sources.ts` | Rock does not grow back; after it, the quarry at an outcrop. | `makeSource` | Rock card: no regrowth |
| Dry spell, flood | `hardship.ts` | High summer may bring a dry spell (12%/day, 2–5 days): wild food at 40%, crops at 30%, fish and water untouched. A storm at its height floods the shore: piles within two tiles of water lost (recorded as spoiled), lean-tos and huts there lose 25 condition; at most once in three days. | `regrowRate`, `growthRate`, `floodTick` | Feed (nature) |
| Deer and hunting | `wildlife.ts`, `hunting.ts` | Two deer and one more per twenty-five people graze at the forest's edge and bolt from anyone within seven tiles (four for a stalker). A hunt is an option (hungrier, better forager, with others near); the strike lands by 22% + 18% per companion + 10% per skill point; a kill yields four meat plus one per companion, shared, recorded. Deer are no danger to anyone. | `huntOptions` in `survivalOptions`; `isThreat` | A brown deer on the map; feed "X and Y brought down a deer" |
| Chronicle | `events.ts` | The events worth remembering (lives, the land, what was finished, held, fought over) kept up to four hundred after the feed has rolled on. | `addEvent` | Feed filter "Chronicle" |
| Buildings remember | `buildings.ts` | A finished building records who finished it and when. | `completeSite` | Building card: "Built by Kai, Bea (3 days ago)" |
| Roads | `world.ts roadsTick` | A tile worn to 0.85 for eight checks (two days) becomes a road that stays worn: plain to see, faster to walk. Nothing is built. | `decayWear` keeps wear at 0.7; `terrainSpeed` reads wear | The worn paths that never fade; feed at 20/60/120/240 tiles |
| A crowd's hall | `production.ts` | Once two dozen live here a hall is wanted whether or not a yard stands. | facility wants | The town builds its hall, then holds its market |

| Boundaries and alone time | `temperament.ts` | `p.crowd` counts company close by; a reserved person (sociability < 0.4) worn down by it feels crowded and takes time alone nine tiles from everyone; declines a crowded table without slight; a sociable person is lifted more by a full table. | `aloneOptions`, `meals.ts inviteRespond` | Thoughts "has had too much company" / "had some time alone" |
| Life changes | `lifechanges.ts` | One `p.lifeEvent` for a while: bereaved (kin and friends come to look in, help more readily; the bereaved seek them), new parent (lifted, drawn to the partner, helped), moved (old home cooler, new one nearer), took in a child (household makes room, neighbours remember). | `willingness` (`leanOn`), chat (`companyPull`), welfare `bereaved` concern | Traits summary; feed |
| Traditions and stories | `traditions.ts` | A harvest feast or funeral eight came to, or the first winter survived, becomes a yearly gathering; unattended twice it lapses. The chronicle is retold as stories in conversation. | `occasionsTick` → `noteOccasionOver`, `traditionsTick`, `shareRumour` | Feed "has become a tradition"; a person's heard list "they still tell how…" |
| Crews | `crews.ts` | Mutual friends (30+) become a crew of three to six; a friend of most of one joins; members lean toward each other's work and company (+4); a grievance, lost liking or a move takes a member out. | `crewNudge` in the ranking, chat | Traits summary "one of Sven's crew"; feed |
| Mediation | `mediation.ts` | Someone close to both sides of a quarrel who knows of it asks the holder to make it up: peace, a softening, a rebuff or "not yet", by trust, generosity and soreness; the unliked are not heard. | conversation purpose `mediate` | Feed "helped X and Y make peace" / "told X to stay out of it" |
| Shared responsibilities | `responsibilities.ts` | Someone laid up (injury, a bad fever) with a child and no able adult at home asks a neighbour to keep an eye on them for the day; or to keep the fire going. The neighbour weighs it (own children, needs, promises, liking) and may decline; a promise is kept by staying with the child or feeding the fire; a refusal leaves the asker to ask another or manage. | request kinds `watch`, `fire`; `evaluateRequest`; `visit` with `data.watch`; `fuel_fire` | Feed "promised to keep an eye on…" / "could not watch the children for…" |

## Household food preparation (rules version 2, 2026-10-18)

The first behaviour added under a RULES VERSION rather than only under `dynamics`. Everything below is gated on
`runsRulesVersion(world, 2)` as well as on rich dynamics, so a world still running version 1 - or an unversioned one - has
none of it, which `tests/v1_continuation.test.ts` holds against a reference recorded before the code was written.

| Mechanism | Module | What it changes | Read where | See it |
|---|---|---|---|---|
| A household food reserve | `provision.ts`, the `stock` plan in `intent.ts` | An adult may take on getting a modest food reserve into their own household's home store, and carry it out with the gathering and depositing that already existed. The reserve is ordinary food in the ordinary store: it spoils and is eaten like any other. | `preparationWanted` (the two cues and the target), `adoptProject` (taken on before a roof or a tool when a cue is live), `stockStep` (gather, then deposit), `stockOutcome` (judged on the store, not on the plan), `creditStocked` in `act_resource.ts` (credited where the food actually moves) | Person card: "Put 8 units of food by for the household. Step: take the food home (5 more to put by) - under way. 3 of 8 units put by so far. Why: there is next to nothing at home to fall back on." |

**The two cues, and why they are kept apart.** HARDSHIP is what the person can actually see of their own household: the home
store as they remember it, plus what they are carrying, coming to under half a day's eating for its members; or their own
memory of having gone hungry within the last day (`mood.ts`'s `hungry` thought). SEASON is winter, which is the one hardship
here that is not a roll of the dice - the last 4 days of every 12-day year, the same days each year, announced when it
arrives and when it goes. The LEAN SEASON is a one-in-five daily roll and **nothing in `provision.ts` reads it**, nor
`world.hardship`, nor any draw behind it; a lean season reaches people only through the hardship cue, once their store has
actually emptied or they have actually gone hungry. Hardship is tested first, so `season` means the narrow thing: nothing
visibly wrong, and winter close. The cue is recorded on the plan (`Intention.cue`) so a measurement can tell anticipation
from reaction.

**The size of it, with the arithmetic.** Hunger falls by `HUNGER_RATE` (0.03) a tick and a day is 2400 ticks, so a person
loses 72 hunger a day; the foods people eat are worth 12 to 28 (`NUTRITION`) and average about 18, so 72/18 = 4 units a
person a day - and a measured Large run gave 3.8. The target is therefore one day's eating per member (`DAY_FOOD` 4 x
`RESERVE_DAYS` 1 x members), capped at `RESERVE_CAP` 12 (three members' worth, and exactly a lean-to's capacity, so the
poorest household can hold one), and clipped again by the room the person believes their own home still has. It is a cushion
of about one day. **It is not provision for winter** - winter is four days and a household of three would need something
like 48 units to sit it out - and nothing here prevents starvation.

**What it refuses to do.** It speaks for no material in the pack (unlike a tool plan: food in the pack is also what keeps
somebody alive, and `freeOf` would have hidden it from a person about to faint). It promises nothing to anybody, allocates no
role, and plans no further ahead than the engine's own next step. Two members of one household converge on one level rather
than each demanding a storeful: the target is a level the store should reach, not a quota each owes, and the second plan ends
as "the store came to hold 8 without their doing" - which is not called an achievement and is not credited to them.

**What was measured** (24 seeds, `normal`, rules version 2, `rich-no-stock` as the ablation and two nudges as the noise
floor; `prep_out8/`, `prep_out12/`, plan in `prep_out8/RUN.md`, full-precision table in `prep_out8/PAIRED.md`):

* It runs on its own. 37 preparations in 8 days (6.3 seasonal, 31.0 from observed hardship), 16 finished, 166 units of food
  really moved into home stores; 56 and 215 over 12 days. Zero on every seed with the switch off.
* It changes what a household can reach. Home-store food per person entering winter: **1.62 against 0.83** (diff -0.80, 95%
  CI [-1.05, -0.54], lower in 22 of 24 seeds) against a nudge floor of 0.04-0.16. After winter, 0.73 against 0.29.
* **It did not improve anybody's welfare in this measurement.** Hunger exposure 0.00303 against 0.00261 over 8 days and
  0.00973 against 0.00882 over 12 - both intervals straddling zero, both the size of the noise floor. `belowCritical`,
  `meanHunger`, `deaths`, `meanMood` and `lowMood`: all indistinguishable from chance. WHY is not established: reserve
  size, timing, access to the store when it is needed, the work the preparation displaces, low baseline hardship in
  these runs and plain statistical power are all live explanations and nothing here separates them. "No welfare benefit
  was demonstrated" is the whole of the claim, and is not the same as "the feature does nothing".
* **It costs.** 8.1 person-days over 8 days and 12.4 over 12 - about 3.6% of all person-time - and 15.3 fewer tool and
  repair projects STARTED over 12 days, in all 24 seeds. Projects finished and tools held are unchanged.

Every figure above is **the arm minus `control`**, and `control` is the run with preparation enabled: a negative
`homeFoodPerPerson` means the arm without preparation ends with less, so preparation raises it.

Whether a village that is actually short would benefit is open; the `town` profile is where it could be answered, and that
run has not been made. See `HANDOFF.md` for the command, and for why a second null there would settle nothing on its own.

Also in this pass, not rich-gated: the town survives its first lean season (fishing spots on a short shore fill as fast as the
town's share would; the lean-to ring grows with the camp), and a settlement may hold one workplace of a kind per village's
worth of people (`rules.ts facilitiesPerKind`).

## What was checked

Household food preparation has `tests/household_preparation.test.ts` (43 contract tests, one group per acceptance criterion),
`tests/v1_continuation.test.ts` (a version-1 world saved, loaded and continued against a reference recorded before version 2
existed) and `scripts/browser/preparation_check.mjs` (19 assertions on behaviour and displayed text in a real headless Chrome;
nothing in it inspects the drawing). Its lab switch is `rich-no-stock`.

Each earlier mechanism has a unit test (`tests/{occasions,reputation,illness,apprentice,life,misdeeds,environment,settlement_record}.test.ts`)
that holds the mechanism to its rule and holds an authored world to having none of it. The golden suite matched after every
commit. No ensemble was run for this pass: it is a build, not a measurement. The lab switch `rich-no-trades` (trade.ts) removes the trade and the apprenticeship together; the other mechanisms can be given
switches on the same pattern.

## What is not done

Nothing here is tuned against an ensemble; the numbers are first settings chosen to be visible without dominating (a gathering
beats a chore, never a pressing need; a trade's nudge is the plan's nudge; a hope's is smaller).

**That next pass has since been built** (status read from the source on 2026-10-17): boundaries and alone time
(`temperament.ts`), mentors and apprentices (`apprentice.ts`, on `trade.ts`), crews (`crews.ts`), mediation (`mediation.ts`),
shared responsibilities (`responsibilities.ts`), life changes (`lifechanges.ts`) and traditions (`traditions.ts`), each with its
own unit test (`tests/{temperament,apprentice,crews,mediation,responsibilities,lifechanges,traditions}.test.ts`). They do build on
the records named here: `p.heard`, `p.trade`, `p.apprentice`, `p.goal`, `world.chronicle`. What that establishes is that the
mechanisms exist, are rich-only and are deterministic - not that any of them improves an outcome: no ensemble has been run for
either pass, and one 12-day observation found apprenticeship starting once in four worlds.
