# Keyed draws (rules 256)

Item 5 of the plan of 17 November 2026 (brain note `knowledge/living-world/2026-11-17-research-index-viability-and-plan`), carried on by Ryan's instruction of 18 November 2026 to continue down the plan. Code: `src/sim/keyed_draws.ts`. Contract tests: `tests/keyed_draws.test.ts` (33). Pin: `tests/v256_continuation.*`.

## What changes

Until rules 255 every random event in a world took its number from one stream, `world.rng`, in the order the code reached it (read in source: `review_evidence/stage1c-20261118/step0c_shared_stream_map.txt`). One extra draw anywhere, a wolf's turn, a name, a birth, moves every draw after it. Two runs that differ by a single draw then have a different weather, different arrivals and different spoilage from that point on. A change to one system shows up as noise in all the others, and a small offset can also be swallowed whole (stage 1c step 4: aspen `nudge:2` at 255 ends exactly where the control does).

From 256, in rich worlds, five parts draw from a key made of the world seed, the system, the tick and the ids of the things involved, and from nothing else. Each part has its own switch.

| part | where | what is keyed | key |
|---|---|---|---|
| weather | `environment.ts` `updateEnvironment` | the next weather and how long it lasts | seed, `weather`, tick of the change |
| arrivals | `lifecycle.ts` `immigrationTick` | whether a newcomer comes, from where, who they are and what they are like (one short generator per arrival: the gate, the sites, `createHousehold`, `createPerson`, sex, ages) | seed, `arrivals`, tick |
| spoilage | `world.ts` `spoilGoods`, `facilities.ts` `noteSpoiled` | each unit of perishable food in a pack, cart, store or pile, and the granary share that takes the loss | seed, `spoilage`, tick, holder kind and id, item kind, the unit's place in the heap |
| trees | `sources.ts` `updateSources` | whether a mature tree seeds a sapling and where it lands | seed, `trees`, tick, tree id |
| grain | `act_resource.ts` via `grainSeedRoll` | whether a gatherer keeps heads for seed (one chance in five) | seed, `grain`, tick, gatherer id, plant id |

The chances are the ones they were and no rule reads the number differently. Only which number is drawn changes.

## What stays on the shared stream

Old-age death, conception, births, all wildlife (ten lines) and relocation names. These are the remainder: a nudge or any other extra draw still moves them, and nothing else.

## Key construction

`keyAt(world, part, tick) = hash3(seedHash(world), SALT[part], tick)`. `keyMix(key, a, b)` folds ids and counters in. `keyUnit(key)` is `key / 2^32`, a number in [0,1). `keyedRng(key)` is a short generator that lives for one call and is never saved. The seed hash is worked out once per world and cached in a `WeakMap`. Spoilage unit `i` of one kind in one holder is `keyUnit(keyMix(spoilPrefix(base, group, holderId, kind), i))`, and the holder kinds (pack, store, pile, share) have their own group numbers so an id reused across kinds never shares a key.

## When it applies

`keyedOn(world, part)` is true when the part's switch is on, `settings.dynamics === 'rich'` and the world runs rules 256 or later. At 255 and earlier the code path is the old one: the generator in use is `world.rng` itself, so the draw order is the same as before (checked by the twin gate below). Authored worlds keep the shared stream.

## Switches

`setKeyedDraws(enabled, part?)` is a lab and test switch. It is never saved and never hashed. Lab arms: `rich-no-keyed-draws` (all five) and `rich-no-keyed-draws-<part>`. A world run with a part off is a rules-256 world that draws that part from the shared stream.

## No save field

A key is built from the seed, the tick and ids the world already holds. Nothing is added to the save, the save format stays 5, and a world loaded from a save continues exactly as the uninterrupted world does (tested).

## Contract

1. With every part off, a 256 world has the same hash as a 255 world, the version label equalised before hashing. Gate script `scripts/keyed_twin.ts`, run at day 5 and day 25 on gen-4, aspen and river (arrivals on, Normal): identical at both days on all three seeds. Evidence: `review_evidence/stage1c-20261118/step5/twin_*.txt`. The suite carries a shorter twin (three seeds, 3,000 ticks), because the full-length gate costs about 11 ms a tick at day 25.
2. A key is a function of its inputs only: the same inputs give the same number, in any order and any number of times.
3. Uniformity: 100,000 keys on each of the five parts and four shapes of key give numbers that are flat across [0,1).
4. Independence: with keyed draws on, an extra draw on the shared stream changes none of the five parts' outcomes. The same test at 255 shows that it does change them, so the test can fail.
5. Save and load: a keyed world loaded from a save continues exactly as the uninterrupted world.
6. A 256 world differs from a 255 world of the same seed once a keyed draw has been made (first difference in gen-4: tick 50, `review_evidence/stage1c-20261118/step5/first_diff_gen-4.txt`).
7. Pins for 251 to 255 are unchanged.

## Cost

About 0.2% of run time, inclusive, in a profile of the step loop (profile not kept in the repo). One hash per draw, and the per-world seed hash is cached.

## What is claimed

A 256 world is a different world from a 255 world of the same seed. No rule changed and no benefit to the world is claimed. The point is for experiments: a change in one system no longer reshuffles the weather, the arrivals, the spoilage, the trees and the grain.

## Consequences for the lab

- `nudge:N` still calls `world.rng.next()` N times before the first step. At 256 that moves only the shared remainder above, so a nudge is a smaller perturbation than at 255. Whether it is large enough to move a world at all is the first check of stage 1c step 6: a control and `nudge:1` that end with the same hash mean the nudge is inert and a different perturbation is needed.
- A 255 save raised with `--rules-up 256` keeps its history and draws from keys from the tick of the change.
- The yardstick and spread figures of stage 1c step 4 were measured at 255 and 250 and do not carry over to 256.

## Tests that pinned a shared-stream draw

Two existing test files forced or compared the shared stream for a part that is now keyed, and switch that one part off: `tests/preservation.test.ts` (a mocked draw to force spoilage) and `tests/wild_seed.test.ts` (the grain chance and the generator state it compares). The keyed draws themselves are covered by `tests/keyed_draws.test.ts`.
