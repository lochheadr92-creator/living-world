# Empty food corrections — rules 174, 175 and 176

A positive food report could already travel as hearsay. An empty one could not, in three separate ways. Each way is its own rules version. No benefit is claimed. The ordinary-world comparison, when it exists, measures the three together.

Predecessor rules 173 stays pinned by `tests/v173_continuation.*`. Immutable continuation pins for 174, 175 and 176 were not recorded.

## What rules 173 did

Reproduced on the committed baseline `e019cb33` before these edits, by contract tests that failed until the matching rule existed:

- `tellBelief` replaced an existing belief only when the incoming original observation was more than 200 ticks newer. A zero-berry sight 1 tick or 100 ticks after a remembered six was refused.
- The telling cooldown was written before that check. A successful positive telling of that place to that listener then kept the newer empty report out of `pickNews` for 3,500 ticks.
- Empty food was news only after the speaker's own failed gather, and only when that failure was under 1,100 ticks old and tied to the sighting. A fresh direct sight with no failure was not offered. A listener who had not failed there could not pass the report on.
- The failure window (1,100) is shorter than the repeat-telling cooldown (3,500).

Positive food reports were already allowed as hearsay. The personal-failure gate was the empty-food gate only.

Historical travel and serial-search notes motivated the investigation. They do not show that these gates caused a particular death, and they do not explain every quiet feature.

## Rules 174 — a newer empty sight can correct a positive memory

`acceptsToldReport` in `src/sim/empty_news.ts`, used by `tellBelief`. Rich dynamics and rules 174 or later. `setEmptyCorrection(false)` restores the 200-tick gap inside such a world.

For a berry bush, fruit tree, wild grain or fishing spot, a zero-quantity report replaces a positive belief when its original `seen` is strictly newer. One tick is enough. An older empty report leaves the existing belief. An equal `seen` leaves it. The comparison is `seen`, not `learned`.

The stored copy stays hearsay: `src: 'told'`, `from` is the speaker, `origin` stays the original observer, `hops` increases by one. A received report is not a direct observation.

`learn` returns false when it refreshes a belief that was already held, and it also accepts an equal `seen`. A refused report is not passed to `learn`. `tellBelief` returns its own acceptance. `noteDisagreement` still runs when a correction is accepted, as rules 107 already did.

Any other report, including a positive food report and an empty report replacing an empty memory, still needs `seen` more than 200 ticks newer. A later direct sight of regrowth replaces a stale empty memory through `observe` / `learn`, which already accepts an equal or newer personal sight. That path was not given a second rule.

Unversioned worlds and authored dynamics stay on the old gap.

## Rules 175 — the correction is offered, and a refusal is not a delivery

`tellingSuppressed`, `noteFoodAccepted` and `noteEmptyRejected`. Rich dynamics and rules 175 or later. `setCorrectionDelivery(false)` restores the plain cooldown inside such a world.

Speaker selection reads the speaker's own belief and the speaker's own record of what was told. It does not read the listener's beliefs.

`Person.told` stays a tick, because wolf warnings still treat `world.tick - told[key] < 3500` as a cooldown. Two speaker-owned records were added, keyed by `listenerId * 1_000_000 + beliefId`:

- `newsTold`: the original `seen` of the last food report this speaker successfully gave this listener about this place.
- `newsHeld`: `{ tick, seen }` of an empty report this speaker already offered and the listener did not take.

Below 175, `tellBelief` still writes `told` before the freshness check. At 175, a positive food report and every non-food telling still write `told` first. An empty food report writes `told` and `newsTold` only when the listener's belief changes, and writes `newsHeld` only when it does not. Acceptance clears that held key. An empty `newsHeld` map is removed.

A newer empty observation can be offered inside the 3,500-tick cooldown of an earlier positive telling, because its `seen` is newer than `newsTold`. The same `seen`, once accepted or once refused, is not offered again until 3,500 ticks have passed. A `told` entry left by an older build has no `newsTold`, so that cooldown stands. After 3,500 ticks a refused observation may be tried once more, then held again. A stale empty belief is excluded before scoring, so it does not take one of the two news slots.

The fields are written only when the rule is on. Loading a world does not raise its rules version. A save that carries either field outside rich dynamics, or below rules 175, throws `Invalid empty-food telling record`. So does an empty map, a non-canonical key, a non-integer, or a held `tick` outside `0..world.tick`. `seen` may be any safe integer. Absence of both fields is legal on every version. `hooks` are not saved. `hashWorld` does not include `told`, `newsTold`, `newsHeld` or `hooks`. Continuation checks use `serializeWorld`.

This is not a general obligation or messaging system.

## Rules 176 — a fresh empty sight can be told and passed on

`emptyFoodShareable`. Rich dynamics and rules 176 or later. `setEmptyTravel(false)` restores the personal-failure gate inside such a world.

A direct empty sight is shareable with no failed gather. A received empty report is relayable with no failure of the speaker's own. The original `seen`, origin, immediate teller, hop count and hearsay status are kept. Nothing invents a personal failure. Telling or receiving does not make `seen` newer. `learned` remains the time that person received it.

The horizon is the existing 1,100 ticks, counted from `seen`. Age 1,099 can be told. Age 1,100 cannot. A shareable empty report uses the existing depleted-news score (the +2.2, and it skips the penalty for an estimate under 2) so it can clear `score > 1.2`. Ranking freshness still uses `learned`. A stale report cannot replace newer evidence, because rules 174 still compares `seen`.

Contact, conversation, eligibility and the two-item news cap stay as they were. There is no broadcast, shared village memory, forced conversation or live-stock lookup.

## Removing rules 176

Rules 176 is the commit after `c0198efb` (`feat: an empty correction is not blocked by the previous telling (rules 175)`). That commit is the verified rules 174+175 checkpoint. The pre-fix baseline is `e019cb33`. To measure or run without rules 176, check out `c0198efb`. Do not reset `main` and do not rewrite history.

A save stamped rules 176 will not load on the rules 175 executable: `validateRulesVersion` refuses a future version. A rules 175 save has no required new field. A rules 176 save that happens to contain `newsTold` or `newsHeld` is a rules 175-or-later rich save; the 175 executable accepts those fields and refuses the version stamp. Do not assume an older executable can load a newer save.

The lab comparison of `e019cb33` with the full candidate measures all three rules at once. It cannot attribute a population difference to rules 176 alone.

## What stays as it was

Actor-local knowledge, physical access, travel, labour, time, conservation, deterministic order, and historical rules. Food supply, regrowth, need decay, carrying capacity, movement, population, conversation rate, and generic interruption or resumption are unchanged. Ordinary defaults are unchanged.

## Adjacent path, not part of this repair

`ask_info` in `social.ts` calls `tellBelief` and then `learn` on the looser `seen >= old.seen` rule. That second write was already there. `answerInfo` skips a food belief while `estimatedAmount` is under 1, so a fresh empty memory is not what an ask returns. After enough time for the remembered regrowth to reach 1, the stored `amount` can still be 0 and the ask can copy it. News selection does not use that path. The contract tests use `pickNews` and a real `socialize` conversation.

## Measurement, frozen before the ordinary-world runs

`World.hooks.onNews` is optional, never saved, and never read by a decision. The lab tally is `emptyNews` on the branch result, beside `outcome`, not inside it. `scripts/lab_versions.ts` reads `outcome` only.

Counts, candidate runs only:

- `directEmpty`: each `observe` of an empty food source, including a repeat.
- `accepted` / `rejected`: `tellBelief` results for empty food. Rejection reasons are `equal`, `older` or `gap`.
- `relays`: accepted empty reports whose stored hop count is at least 2.
- `receiptAge` / `receipts`: sum and count of original-observation age at acceptance. The mean is the ratio.
- `skippedStale`, `skippedHeld`, `skippedCooldown`: `pickNews` exclusions of empty food before a delivery is attempted.

Baseline `e019cb33` has no hook and no `emptyNews`. Those counts are descriptive. They are not a paired difference.

Not collected, because a clean read was not available:

- Daily occupancy from `scripts/observers/time_budget.ts`. `samplePlans` calls `generateOptions` and `rankOptions`, so it was not attached. `sampleTick` alone would not be paired with the baseline.
- Whether a correction arrived before a departure or during travel.
- Departures toward a source that was actually empty.
- Travel time per food unit acquired.
- Return and resumption after an interruption.

A changed belief is not evidence that a particular trip was prevented. Travel on an interrupted activity is not labelled wasted. Staged tests show the mechanism. The ordinary runs show occurrence and the existing outcome metrics. Neither is a full causal chain from one sighting to a later decision.

The declared comparison is 12 named seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, rich dynamics, arrivals on, fork day 0, 25 days, control plus `nudge:1` and `nudge:2`, baseline `e019cb33` against the frozen candidate. 72 runs. Controls are the primary observations. The nudges are sensitivity controls. Output lives outside the repo. Jsonl is not committed.

## Verification before that comparison

`npm run typecheck` and `npm run build` passed with the observer in the tree. Focused contracts passed: `empty_correction` 14, `empty_delivery` 9, `empty_travel` 7, `empty_news_observer` 2, `social_warning` 5, `knowledge` 5, `transmission` 14, `rules_version` 28, `v173_continuation` 1.

The full suite (`node node_modules/vitest/vitest.mjs run --maxWorkers=2`) finished 532 of 542 files and 3,021 of 3,086 tests in 1,641.47 s. Ten files failed, 65 tests. The same commands on the candidate and on detached `e019cb33` produced the same failure signatures for `household_preparation` (10), `household_home` (20), `household_continuity_view` (8), `preservation` (10), `project_helpers` (7), `stored_materials` (5), `carcass_supply` (1), `project_inputs` (1) and `transport` (1). Those assertions already fail on the pre-fix baseline. `zz_review_e_famine_trace` (2) cannot open gitignored `autonomy_evidence/helper-receipt107-first-invalid/final.json` from a clean worktree. No expectation was rewritten. Pins for rules 174, 175 and 176 were not added.
