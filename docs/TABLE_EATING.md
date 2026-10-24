> Reconciliation 2026-10-24: historical candidate evidence below uses a conflicting
> numeric generation. This implementation applies courier recovery and store eating
> from version 11 on the local-main lineage. The old measured numbers are not new measurements.

# Eating at a store with a full pack

Rules version 9. One link in the household survival loop that was failing more often than it worked, repaired: a household's
store can now be eaten from by the people it was kept for, including when their hands are full.

The product question this answers ([PRODUCT_VISION.md](../PRODUCT_VISION.md)): *a household puts food by, and someone who needs
it walks to the store. Can they eat?* On version 8 they often could not, and the card said "there is no food there" about a
store the person had just looked at.

## What was wrong

`eat_store` (`src/sim/act_resource.ts`) took food out of a store by moving it into the person's **pack** (`transfer`, bounded by
`roomFor`, which is by weight) and only then ate it from the pack. When nothing fitted, nothing moved, the activity ended with
"there is no food there", and `noteFailure` made the person believe that for the next 400 ticks (`options_survival.ts:285`: *went
there recently and found nothing*).

What made it common is something the earlier slices put there on purpose. Version 7's shelter plans send people out carrying
wood and stone for their household's house site, and a pack that is full of timber has no room for a berry. The two features
each worked; together they left a person with a stocked store in front of them and a loaf's worth of room short.

Measured on the version-8 revision with `scripts/store_meals.ts` (seeds `river, brook, meadow, stone5`, Normal, arrivals off,
8 days; [table_evidence/store_meals_normal_r8.json](../table_evidence/store_meals_normal_r8.json)):

| rules version | finished store meals | fed | failed | failed with food in the store and no room for it | failed with an empty store | failed at hunger below 25 |
|---|---|---|---|---|---|---|
| 8 | 348 | 150 | **198 (56.9%)** | **189 (95.5% of failures)** | 4 | **47** |
| 9 | 230 | 225 | **5 (2.2%)** | **0** | 5 | **0** |

Both arms are the same seeds on the same code with a different version stamp. They diverge after the first meal, so they are
not the same people in the same places; what does not depend on that is that the situation is possible on version 8 and
impossible on version 9. (The 5 other version-8 failures had food in the store and room in the pack and are unexplained.)

"No room" means no room for **that food**, not necessarily a full pack. In the retained example below the pack weighed 11 of
12, which leaves room for a berry (1) but not for fish or meat (1.5 each), and a hungry person is offered the most nourishing
food first. The contents of that store were not read, so which food it was is an inference from the weights.

## What changed

When nothing could be moved into the pack and the store **does** hold food, the person eats **at the store** instead. Each bite
comes out of the store's own items and is consumed through the same ledger entry as a bite out of a pack (`consume(…, 'eaten')`).

* No food is created, none is carried, nothing is owed. The household's food is spent exactly as it would have been.
* The meal ends when hunger is satisfied (88), the store has nothing left, or the activity is interrupted, as any meal does.
* If somebody else empties the store before the first bite, the meal **fails honestly** ("somebody else had finished the food")
  and the store is then written off, because now it is empty.
* The person's belief about the store is refreshed **after** the meal, so they remember what is really left.
* A store that is not theirs is still theft: it is still only an option for someone very hungry with nothing to carry, still
  weighed against conscience, and the theft is still reported to the people who saw. It is reported **once, when the meal ends,
  for the number of units actually eaten** (before, it was reported at the start for the number moved).
* A meal with room in the pack goes through the pack exactly as before, byte for byte
  (`tests/table_eating.test.ts`: *a pack with room is not touched*).

**What it does not do.** It does not make anyone hungrier or more willing to go to a store, does not change what a store may be
eaten from, does not lift a carry limit, and does not touch the other full-pack failures that remain (`give`, `harvest` and
bringing food home each still say "no room"). It does not change how many people can reach a store at once.

## Compatibility

* **Rules version 9**, gated by `eatsAtTheStore(world)` = lab switch on, rich dynamics, `runsRulesVersion(world, 9)`
  (`src/sim/tableeating.ts`). Versions 1 to 4 and 6 to 8 behave exactly as they did; an unversioned world is never eligible.
* **Version-8 continuation** is pinned by `tests/v8_continuation.expected.json`, recorded by `scripts/v8_reference.ts` from
  `3d93180` **before any behaviour was written** (commit `bfdd936`, `src/` untouched). Unlike the earlier references it also
  records, in words, how many times someone reached a food-bearing store and could not eat: 24 of 26 failed store meals by tick
  12,000 (5 at hunger below 25). A world that leaked version-9 behaviour would show that count falling as well as its hash moving.
  It is unchanged. Never re-record it to make a change pass.
* **Save format unchanged.** An in-flight meal carries `data.table: true` in the activity's existing free-form `data`; no older
  save contains it, and `tests/table_eating.test.ts` saves and reloads in the middle of a meal at a store and continues
  identically (`hashWorld` and the deep hash).
* Goldens and the version-1/2/3/4/6/7 references were not re-recorded.
* **The lab switch** `rich-no-table-eating` removes only this. With it on a full pack fails exactly as on version 8; below
  version 9 it changes nothing.

## What was measured

### Does it feed people? (mechanism)

Yes: the table above. In the ordinary `river` run
([household_life_river_r9.json](../table_evidence/household_life_river_r9.json)), 56 store meals fed somebody against 34 on
version 8, with no failure for want of room.

### Does it change how hungry people are? (aggregate)

The paired lab, same seeds, control against the same rules with `rich-no-table-eating`, and two one-draw nudges as the noise
floor. The lab's own wording is quoted; "larger than chance" is its strongest verdict and means beyond what a nudge moves.

**Town profile** (100 founders on the Normal map, 3.6× as crowded; 16 seeds, 8 days;
[lab_town_report.txt](../table_evidence/lab_town_report.txt), [paired_town.txt](../table_evidence/paired_town.txt)):

| | rule on (control / nudge 1 / nudge 2) | rule off | lab verdict |
|---|---|---|---|
| mean hunger (higher is better fed) | 63.97 / 63.89 / 64.43 | **60.52** (−3.6, interval [−6.3, −1.3]; worse in 12 seeds, better in 4) | **larger than chance** |
| hunger exposure (share of person-time below critical) | 0.00096 / 0.00146 / 0.00110 | **0.00310**; higher in 13 seeds, lower in 1 | **larger than chance** |
| people with low mood | 2.2 | 4.6 (+2.4, [+0.5, +4.8]) | larger than chance |
| deaths in 8 days, all causes | 7 / 5 / 3 | 9 | not distinguishable |
| below critical need at the end | 6 / 16 / 20 | 25 | not distinguishable |
| food left unconsumed in home stores per person | | +0.3 | systematic, within the noise floor |

**Normal profile** (28 founders; 32 seeds, 12 days; [lab_normal_report.txt](../table_evidence/lab_normal_report.txt),
[paired_normal.txt](../table_evidence/paired_normal.txt)):

| | rule on | rule off |
|---|---|---|
| deaths, all causes (32 seeds) | 37 / 25 / 34 | 49 |
| seeds with a death | 12 / 10 / 11 | 16 |
| hunger exposure | 0.0096 / 0.0076 / 0.0094 | 0.0119 (higher in 21 seeds, lower in 8) |
| mean hunger | 60.1 / 59.8 / 59.2 | 57.0 (−2.7, [−5.5, −0.2]) |

The direction is the same, and in the Normal profile the lab labels every one of these "systematic, within the noise floor":
detectable by sign, but no larger than the spread between two nudges. The three rule-on arms are the control and two one-draw
nudges, and the rule-off arm is higher than all three on deaths. Paired against its own control it had more deaths in 11 seeds,
fewer in 5 and the same in 16. With 12 extra deaths across 32 worlds of 28 people, and the lab calling it within the noise
floor, this is a lead and not a result.

**What this supports.** Where food is short enough to matter (the town), taking the rule away makes people measurably hungrier
and unhappier. **What it does not support:** a reduction in deaths. No death effect is distinguishable in either profile.

### Is it followable? (the household's own story)

`scripts/household_life.ts` reads a whole household's loop off the records of an ordinary run. Seed `river`, Normal, arrivals
off, 8 days, [version 9](../table_evidence/household_life_river_r9.json) against [version 8](../table_evidence/household_life_river_r8.json):

| | version 8 | version 9 |
|---|---|---|
| hunger episodes (a member below 30) | 43 | 25 |
| fed at a store / failed at a store | 34 / 43 (41 for want of room) | 56 / 4 (0 for want of room) |
| households that completed the loop (solid home, lived in, nobody lost to need) | 7 of 12 | 7 of 12 (+1 housed, nobody seen inside yet) |
| asks made / units recorded as handed over | 129 / 27 | 117 / 49 |
| people lost | 0 | 0 |

One seed, chaotic arms: this shows the loop and where it stops, not a rate.

**The retained example, version 9, the Brook household (1116).** Nothing is staged.

| tick | what the records say |
|---|---|
| 11136 | Abel (1119) is hungry (30/100); his pack holds `2 wood, 1 stone, 4 berries`; the household store holds 0 food |
| 11659 | he eats at the communal store #4536: hunger 21 → 76; his pack is unchanged; his live plan is *be fed, watered and under shelter before dark* |
| 11659 | recorded as *"fed again after 523 ticks, lowest 21: ate at the store (pack full)"* |

On version 8 that visit is "there is no food there" and the store is written off.

## What is NOT claimed

* **No reduction in deaths.** Not distinguishable in either profile.
* **No effect on housing.** Solid homes, homeless and building counts are unchanged in both ensembles.
* **Town profile only 16 seeds and 8 days; Normal 32 seeds and 12 days.** No Large or Huge ensemble was run, no longer window,
  and no acceptance baseline was recorded or replaced (the first change at a new rules version cannot be gated; see
  [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md)).
* **No presentation was changed and no page check was run.** The activity label is still "Eating at home" and the log line is
  unchanged, so a viewer sees someone eating at home with timber still on their back. That is the truth of the state, but it
  has not been rendered or put in front of anyone.
* **The change in preparation behaviour is not explained.** With the rule off, people adopt fewer food-reserve plans (−40
  units in the town). A plausible reason is that a store nobody can eat from never looks depleted, but that was not tested.
* **Ensemble provenance.** The two ensembles ran from the working tree whose `src/` is exactly the files in this change; the only
  `src/` edit made afterwards is the observer-only fix in `lifechanges.ts`/`inspect.ts` (a separate commit), which the lab does
  not exercise. Use a fresh output directory after any source change.

## Verification

```
npx --no-install vitest run tests/table_eating.test.ts      16 tests (this change)
npx --no-install vitest run tests/v8_continuation.test.ts   the version-8 pin
npx --no-install vitest run                                 994 tests in 98 files
npx --no-install vite-node scripts/golden.ts                all historical fingerprints match
npx --no-install vite-node scripts/v8_reference.ts          Version-8 continuation unchanged
npx --no-install tsc --noEmit
git diff --check
```

The 16 contract tests include: a full-pack meal feeds from the store with the pack untouched; the ledger balances and no food
is created (`conservationReport`); a pack with room is identical under versions 8 and 9; versions 8, the lab switch and legacy
dynamics each still fail exactly as before; theft is reported once for the units eaten; a store emptied before the first bite
ends as a failure; a world saved in the middle of a meal continues identically; a watched world equals an unwatched one; and an
ordinary `river` run has full-pack failures on version 8 and none on version 9 with a balanced ledger.

## Known limits

* Other full-pack failures remain: *"no room to carry it"* when given something, *"cannot carry any more"* when harvesting.
* A meal at a pile or a communal storehouse uses the same path. The staged tests use a household's own store; piles and
  storehouses were exercised only by the ordinary runs, where they were not counted separately.
* Theft by a person with a full pack is reported at the end of the meal, when witnesses may have moved.
* The 5 unexplained version-8 failures (food present, room present) were not investigated.
