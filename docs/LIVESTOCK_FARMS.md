# Livestock and grain feed

Numbering: this work was built on the branch `codex/withdraw-baseline-20261119` as rules 260 to 265 and 269. When it was merged into `main` on 27 November 2026 every number moved up by seven, to 267 to 272 and 276, because `main` had used 260 to 265. The text below uses the new numbers. Evidence files under `review_evidence/livestock-20261120` keep the numbers they were recorded with (for example `meat-sharing-265.jsonl` is rules 272 and `spoilage-264.jsonl` is rules 271).

Rules 267 adds cattle, pigs, chickens, goats and sheep to rich worlds. In a new settlement the founding household starts with two chickens and a cage. Barns hold eight animals, paddocks six and chicken cages twelve. Keepers can stock water and feed, cut hay, move an animal into housing and seek a mate for it. A laying hen, a first fleece and a mate for an existing animal each give a household a reason to acquire stock. Its choice depends on what the keeper knows about available feed, water and shelter.

The breeding calendar scales to the simulation year. Cow gestation uses 283 calendar days, pig 114, goat and sheep 150, and chicken incubation 21. Litter sizes, maturity, recovery, feed demand and housing limits are simulation parameters. Housing, available space and animal care constrain births. Cows, goats and sheep give milk after a birth. Hens lay eggs, sheep grow wool and carcasses supply meat and hides. Keepers can make cheese, smoke pork into bacon, and work leather into a coat, gloves or shoes.

## Water at founder placement

From rules 276 each founding pair starts near forage on a tile from which it can see a drinkable bank within eight tiles and walk to the bank it would choose. If the route fails, generation tries the next candidate. In the Forest start with arrivals off, the founding sheep moved one tile closer to water. Both drank at tick 241 and survived to day two. At rules 275 neither drank and both died before day two.

## Grain for animals

Rules 268 increases wild-grain patch capacity from five to eight. Wild grain replenishes at 1.5 times its previous rate under the same conditions. A keeper's estimate of how much has grown back uses that rate. At ripening a field gains half its previous grain yield, rounded down, with the same seed yield. For example, a crop that previously produced nine grain now produces thirteen.

At a household barn, paddock or chicken cage, a keeper spends 50 work ticks to turn one carried grain into two feed portions stored on site. The two portions together weigh as much as the grain and provide the same 22 points of animal nourishment. The keeper must have an unclaimed grain and at least three edible units in their pack before mixing. The job checks the ingredients, available storage and supply at the trough again during work. Housed animals eat prepared feed when they are at the entrance. Water is stocked separately.

The comparison switch `rich-no-grain-boost` restores the previous grain supply while households can still make feed. For a matched pair of ordinary twelve-day Aspen runs:

```powershell
npx vite-node scripts/farm_reach.ts aspen 12
npx vite-node scripts/farm_reach.ts aspen 12 --no-grain-boost
```

The final daily records are in `review_evidence/livestock-20261120/final-boost.jsonl` and `final-base.jsonl`. Feed produced, feed eaten and unprocessed grain are distinct quantities. Egg and meat products are ledger creations. The hay creation total includes meadow growth. The hunger measure counts awake person-ticks with the hunger meter below 40.

## Aspen through day 12

| Measure | Previous yields | Increased yields |
| --- | ---: | ---: |
| Wild grain regrown | 251 | 344 |
| Field grain at ripening | 228 | 364 |
| Portions mixed | 32 | 28 |
| Portions eaten by livestock | 20 | 21 |
| Eggs collected | 3 | 5 |
| Housed animals on day 12 | 4 | 3 |
| Awake person-ticks below hunger meter 40 | 6.60% | 6.47% |

Both runs passed daily conservation checks. Reloading the increased-yield save reproduced the day-12 hash `b18292a9`. One pair shows the grain-to-feed chain operating in Aspen. Longer-term herd growth, hunger and the destination of the remaining grain need separate measurements.

## Recovering livestock after a death

From rules 269, a livestock death from neglect leaves the animal’s recoverable meat, hide and fat available for the ordinary two-day carcass lifetime. A grown household member who learns about their livestock carcass can prioritise meat recovery, limited by carrying room and up to four portions per trip. Each portion takes 120 work ticks. Danger prevents the offer and a critical need removes its priority bonus. Other households cannot take privately held carcasses. Yield depends on species and growth at death. A small chick can leave less than one whole meat unit.

In ordinary Aspen through day 15 the previously immediate loss was seven meat units, from one sheep and three chickens. At rules 269 keepers recovered all seven. Three other chicks died before reaching one whole unit. See the individual death and work records in review_evidence/livestock-20261120/salvage-timing.jsonl and the rules-268 control in salvage-261.jsonl. This tracks recovery into a pack. Consumption at meals is a separate measurement.

## Meat portions at rules 270

A fully grown cow yields 48 portions, a pig 28 portions of pork, a sheep 16 portions, a goat 12 portions and a chicken 4 portions. Four times the rules-269 yield is a first balance setting. A growing animal yields its fraction of the adult amount, rounded down to whole portions. The keeper still has to find the body, cut the meat and carry it away before it decays.

In one paired 15-day Aspen run, the same sheep and three grown chickens supplied 7 portions at rules 269 and 28 at rules 270. At 270, keepers cut 12 of the sheep's 16 portions before the remaining four spoiled, and all 12 chicken portions. People ate 14 by day 15 and 10 recovered portions remained. At 269 all seven were recovered and eaten. Three small chicks yielded zero in both runs. The 15 daily control hashes matched the previous salvage trace, and both runs passed daily conservation. The two portions-*.jsonl files in review_evidence/livestock-20261120 record the daily ledger and individual carcasses.

## Slower livestock carcass spoilage at rules 271

Keepers have four days (9,600 ticks) from death to recover meat, hide and fat from household livestock. Wild game and unowned carcasses last two days. The inspector shows each body's deadline. Each portion still needs 120 ticks of cutting and room in the worker's pack. The change affects parts on the carcass only.

In the paired Aspen trace, the extended deadline let Ben cut three more sheep portions and Kira cut the last one. All 16 were recovered. Across sheep and chickens, all 28 recovered portions had been eaten by day 20. See review_evidence/livestock-20261120/SHEEP_SPOILAGE_AND_MEALS.md for the original loss and the route from packs to eaters.

## Sharing the butcher's meat at rules 272

The usual food delivery now accepts raw meat. When packing a surplus, a person loads raw meat and pork first, leaves a road ration, and uses their memory of the space at home, in the household cellar, or at a communal storehouse. Promises and the ration are checked again when the load arrives. Members can eat from their household store, and another household can eat from the communal storehouse.

In the Aspen replay the original sheep and three chickens yielded 28 portions. Kira and Ben took 14 sheep portions home and Mona stored six chicken portions. Eight of the 20 deposited portions came out for meals, including three that Arlo ate. Twelve spoiled in two lean-tos and a hut. The other eight portions were eaten without entering storage. At rules 271 all 28 portions were eaten and none were deposited. Raw sheep and chicken meat is subject to spoilage in buildings and is absent from the carried-food spoilage list. This one Aspen comparison shows both the route that fed Arlo and its cost. The focused storehouse test exercises access by someone from another household.

The events for this comparison are in `review_evidence/livestock-20261120/meat-sharing-265.jsonl` and `spoilage-264.jsonl`. At ticks 31,611 and 33,779 Arlo collected one portion from the lean-to and two from the hut. He ate them at 31,620, 33,788 and 33,798. Those were individual meals from family stores.
