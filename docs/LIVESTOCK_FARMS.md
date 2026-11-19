# Livestock and grain feed

Rules 260 adds cattle, pigs, chickens, goats and sheep to rich worlds. In a new settlement the founding household starts with two chickens and a cage. Barns hold eight animals, paddocks six and chicken cages twelve. Keepers can stock water and feed, cut hay, move an animal into housing and seek a mate for it. A laying hen, a first fleece and a mate for an existing animal each give a household a reason to acquire stock. Its choice depends on what the keeper knows about available feed, water and shelter.

The breeding calendar scales to the simulation year. Cow gestation uses 283 calendar days, pig 114, goat and sheep 150, and chicken incubation 21. Litter sizes, maturity, recovery, feed demand and housing limits are simulation parameters. Housing, available space and animal care constrain births. Cows, goats and sheep give milk after a birth. Hens lay eggs, sheep grow wool and carcasses supply meat and hides. Keepers can make cheese, smoke pork into bacon, and work leather into a coat, gloves or shoes.

## Grain for animals

Rules 261 increases wild-grain patch capacity from five to eight. Wild grain replenishes at 1.5 times its previous rate under the same conditions. A keeper's estimate of how much has grown back uses that rate. At ripening a field gains half its previous grain yield, rounded down, with the same seed yield. For example, a crop that previously produced nine grain now produces thirteen.

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
