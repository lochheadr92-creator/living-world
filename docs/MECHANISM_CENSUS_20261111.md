# Which mechanisms fire in an ordinary world, and why the rest do not: census of 11 November 2026 (rules 196)

A diagnosis, not a change. The owner asked, after the survival-pressure rebalance (`docs/ORDINARY_METABOLISM.md`), what else keeps the world's systems from firing:
"the majority of systems rarely fire". Everything below is measured in ordinary worlds at the current rules; the proposals at the end are ranked by what the
evidence says, each with the smallest change that would test it, and none is approved by this document.

## Method

`review_evidence/balance-20261111/census/census.ts`, the twelve lab seeds (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), Normal profile, arrivals on,
25 days from a founding (two winters), rules 196. Read from the record only: every activity end by kind and outcome (the activity-end hook), every conversation by
purpose (one count each as it appears on `world.conversations`), every event by kind and text, the world's occasions, traditions, crews, civic projects, buildings,
and each living person's last decision sampled every 50 ticks (what was offered, what was chosen, what was blocked and the recorded reason; names and numbers
normalised). `approach_probe.ts` (four seeds, 15 days) adds how approaches for company end, by the recorded reason and the purpose. `census_sum.py` aggregates;
`summary.txt` is the full table. All figures are per settlement means over the twelve seeds unless they say otherwise.

## What fires

| | per settlement, 25 days |
|---|---:|
| people at day 25 / deaths / births | 31.3 / 2.2 / 1.8 |
| households / with a trade / apprentices | 12.3 / 21.9 of 31 / 0.3 |
| conversations held | 1,957 |
| of which: warn / request / foraging practice / chat / family time / child play | 258 / 255 / 123 / 108 / 85 / 73 |
| of which: cancel a request / offer / recruit / share work / trade / every other purpose | 17 / 10 / 10 / 9 / 6 / under 5 each |
| approaches that failed before any talk | 924 (a third of all approaches) |
| occasions held: harvest feast / birth feast / funeral / wedding / market | 3.5 / 2.6 / 0.9 / 0.3 / 0 |
| attendances / traditions kept / crews | 63 / 2.0 (midwinter, harvest) / 6.0 |
| shared meals hosted / sat down to / invitations chosen | 0.3 / 0.3 / 1.4 |
| visits paid of attempted | 19 of 57 |
| halls / markets / brewing / exchange journeys / factions | 0 / 0 / 0 / 0 / 0 |
| hunts that ended with meat / sheep / carts / mines | 0.1 / 0 / 0 / 0.25 |
| buildings: lean-to / hut / cellar / well / quarry / yard / kiln / storehouse / rack | 11.5 / 10.3 / 2.9 / 1.7 / 1.3 / 1.0 / 1.0 / 1.0 / 0.8 |
| the communal fire went out | 23 times |
| stories carried in people's heads / techniques learned | 920 / 11 |

Warnings about wolves and requests for goods are the two commonest conversations. Childhood (foraging practice, play, family time) is the next block and the one the
rebalance moved. Company for its own sake (chat) is fourth. Trade, invitations, coaching, mediation, apologies, check-ins and proposals together are under three
percent of talk.

## Where the offers go

Sampled decisions, per settlement over 25 days (offered / chosen):

| option | offered | chosen |
|---|---:|---:|
| Potter about near home (spare time) | 7,223 | 154 |
| Warn somebody about the wolf | 4,343 | 669 |
| Foraging practice with a child | 3,386 | 624 |
| Ask somebody for food | 2,788 | 505 |
| Chat | 1,886 | 285 |
| A guessing game (child play) | 1,634 | 329 |
| Family time | 1,182 | 359 |
| Ask somebody for stone / for wood | 1,118 / 776 | 123 / 61 |
| Go to the harvest feast / the birth feast | 633 / 440 | 248 / 180 |
| Tell somebody my promised work is complete | 437 | 7 |
| Look in on somebody | 370 | 16 |
| Ask somebody to help with the hut | 366 | 7 |
| Offer a swap (all kinds together) | about 1,000 | about 20 |
| Ask for coaching (all skills together) | about 150 | about 9 |
| Invite somebody to eat together | 22 | 1.4 |
| Make peace with somebody | 38 | 1.7 |
| Ask somebody to move in together | 9 | 2.1 |

The most-blocked decisions, per settlement over 25 days, by recorded reason: picking berries "believes it is empty" 40,275; eating from the stores "remembers it being
empty" 21,633; wild grain "believes it is empty" 10,778; fibre, net, garment, blanket and trap work "does not know of a timber yard they may use" about 8,100
together; building work "site is waiting for materials" about 11,900 together (stone 5,372, planks 2,556, wood and stone 1,441, bricks 1,374); warming "thinks the
fire has gone out" 3,347; laying out a hut "too much already being built here at once" 1,559; gathering for a site or a fire "no room in my pack for one stone /
wood" about 5,000 together; checking on somebody "they are not close enough to go looking" 1,041.

## Why a third of approaches fail

Four seeds, 15 days: 4,010 conversations held, 2,052 approaches failed (34 percent). The reasons: "was too busy to stop" 980; "something better came up" (the
asker's own review switched them away) 422; "was already talking to someone" 209; "they are inside a different space" 197; "had more pressing needs" 116;
"they walked away" 81; asleep, busy, danger, could not find them under 15 each. By purpose, foraging practice lost 425 approaches (259 of them "too busy to stop"),
requests 471, warnings 287, chat 286 (81 of them to somebody indoors), child play 255 (159 "too busy"), family time 90, coaching 9 of 9 attempts.

"Too busy to stop" is a roll (`social.ts acceptsTalk`): the approached person stops with probability `avail x (0.5 + 0.45 x sociability) + affinity / 220 + urgency
+ 0.2 if kin`, where `avail` is the availability their current activity declares (gathering 0.45, building 0.35 to 0.4, farming 0.3, production 0.2, a meal 0.1,
resting or sleeping 0) and urgency is 0.4 for a warning, 0.12 for a request, offer or invitation, and 0 for everything else, including a child's ask for practice or
play. A person at work stops for a child about a quarter to two fifths of the time, and the refusal sets a 120-tick cooldown on that pair. The second cause,
"something better came up", is the asker's own review dropping the approach before it is answered: an approach is not committed work.

## Ranked diagnosis, with the smallest change that would test each

1. **Approaches for company fail on a coin and are dropped mid-walk.** The single largest social lever: 16 percent of all approaches end "too busy to stop" and 7
   percent "something better came up". Smallest change (one rules version): give childhood and learning asks the request's urgency (0.12) in `acceptsTalk`, and make
   the approach sticky for its walk (a `minCommit` on the socialize activity so the asker's own review does not abandon it). Measure: the failure share, and the
   conversation counts the lab already records.
2. **The timber yard is private, so nets, traps, textiles and baskets never start.** About 8,100 blocked decisions per settlement want fibre, net, garment, blanket
   or trap work and "do not know of a timber yard they may use": the one yard belongs to the household that built it and everyone else has access level none
   (`facilities.ts mayUse`). Downstream of it sit fishing nets, traps (hunting 0.1 meals in 25 days), wool garments (warmth) and sheep (0). Smallest change: the first
   yard of a settlement as a communal workplace, as rules 192 made the first storehouse public, or a guest level for fibre work with the owner present.
3. **Shared meals: 0.3 a settlement.** The invitation (`meals.ts`) wants three units of food in the pack beyond two per dependant, an afternoon window (half past
   noon to four), a friend of affinity six or more within 14 tiles, hunger drive under 24 and a score of seven; 22 invitations offered, 1.4 chosen. Smallest change:
   count a stocked home store as food to share (the table already eats from the store since rules 9) and widen the window to daylight.
4. **No hall in any of the 36 arms, so no market and no brewing.** The hall is planned (`production.ts`) only after three solid homes are known and either a yard
   stands or 24 people live here, outside a shortage, under the project cap, on a hash; at rules 195 the crowd clause is met around day 20, and the one hall site seen
   was stone-starved ("get stone for the shared hall", 163 pack-room blocks). The market (`occasions.ts occasionsTick`) requires a hall. Smallest change: the market
   is called at the fire when there is no hall, as every other occasion already is; the hall's own stone cost is the second thing to look at.
5. **Stalled sites do not provoke the ask that would unstall them.** About 11,900 decisions per settlement found a site "waiting for materials", while "ask somebody
   to help with the hut" was chosen 7 times in 366 offers and project asks total 2.3 a settlement. Smallest change: the help ask's score rises with how long the
   site has waited (the site records its stall), so the ask outranks another solo stone trip once a site has waited a day.
6. **Coaching and apprenticeship: 0.3 apprentices, 9 coaching asks chosen.** The learner's side wants hunger, thirst and energy all above 65 (the fed window, 18
   percent of awake time at 195, 13 at 194); the teacher's offer needs two workers of the skill within ten tiles, a master at skill 1.2 with a lead of 0.15, and a
   hash of 0.25 plus 0.35 times generosity per 64 ticks. Smallest change: the fed-window gate down to the drive's start (62 and 66), which is the gate the
   rebalance already widened; measure coaching and apprentices.
7. **Swaps are offered a thousand times and chosen twenty.** The option exists for every pair of goods in sight but scores below a gathering trip. Smallest change:
   score a swap that yields food by the gathering trip it replaces (the relief ETA is already computed for hunger in `relief.ts`), so a hungry person with wood takes
   the berries on offer beside them.
8. **The fire goes out once a day.** 23 times a settlement, 3,347 blocked warmings "thinks the fire has gone out", and every occasion and meal is held at the fire.
   Refuelling is offered only when fuel is under 150 or at night, in rain, or on a promise; wood in hand is the limit (898 "no room in my pack for one wood").
   Smallest change: the "keep the fire going" responsibility (17 offered, 0.7 chosen) weighted up when an occasion or meal is called at that fire.
9. **Half of all blocked decisions are a remembered emptiness.** 72,000 per settlement: berries, grain and the home store "believed empty". Knowledge-honest, but a
   belief of emptiness never ages: a bush is not re-checked because it is remembered bare. Smallest change: a belief of emptiness that is older than a regrowth span
   (the source's own regrowth, already in the rules) reads as "may have come back" and lets the option through at a discount. This touches knowledge, not
   survival; it should be its own measured version.
10. **Left alone, by design or by scale:** visits blocked "not close enough to go looking" (actor-local whereabouts, correct); births 1.8 and weddings 0.3 (coupling
    wants affinity 30 and trust 20 both ways, conception a roof, food per head 3 and 0.5 a year; two 12-day years is a short window); exchange journeys and factions
    need a second township, which a single-settlement world never has; relocations 2.6.

## Suggested order

1 (approaches), 2 (the yard), 3 (meals), 4 (market at the fire), 5 (stalled-site asks), 6 (the coaching gate), 7 (swaps), 8 (the fire), 9 (remembered emptiness).
Each is one rules version with a contract test, a pin and the paired lab's life metrics as the measure; 1, 3, 4 and 6 are gate changes of a line or two; 2 and 9 are
small rules with knowledge consequences and want their own design note first.

Evidence: `review_evidence/balance-20261111/census/` (the probe, twelve rows, the approach rows, `summary.txt`).
