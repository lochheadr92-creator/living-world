# Rules 33 — leave the heaviest left-over

Idea taken from a sibling simulation's rule R9 (leave the heaviest left-over at the nearest shared worksite when there is no
carry room), reimplemented here from the idea alone, on this simulation's own ledger and local knowledge.

## The situation it acts on

`gatherMaterial` (`src/sim/options_work.ts`) offers nothing when the pack has no room for one more of the material a person is
short of. Nothing says why, and nothing frees the room. So a person whose hands are full of wood or stone that none of their
needs asks for can neither fetch what they are short of nor put the left-over down.

From rules 33, in exactly that situation, one more option can appear: **leave the heaviest such stack at a place they already
know that takes it.** After that the ordinary gather is offered as it always was.

## Contract

All of it is `src/sim/leave_heaviest.ts`, called from `optMaterials` just before the gather that would have been dropped.

| must hold | how |
|---|---|
| only in a rich world running 33 or later | `isRich` and `runsRulesVersion(world, LEAVE_HEAVIEST_FROM_VERSION)`; below 33 nothing is generated |
| only when hands are the reason | `invRoom(world, p, item) < 1` for the material they are short of, with hunger and thirst quiet (the gather's own condition) |
| only if there is something to fetch afterwards | a source of that material they believe is worth the walk (`sourceUsable`) |
| never what anything of theirs asks for | not a material any open need names (`materialNeeds`), nothing a private plan has spoken for (`freeOf`), nothing under an active promise (`Commitment.item`), nothing an errand is carrying |
| only wood and stone | `LEAVE_KINDS`: the two materials involved in every measured stall. Food, water, seeds, tools and processed goods are left to the options and chains that already move them |
| the heaviest stack | carried count x `WEIGHT`, ties broken by the order of `LEAVE_KINDS` |
| only a place they know of, from their own belief | a believed storehouse, or a believed shared workplace (`hh === 0`, a facility type) whose work accepts that material (`acceptedAt`), with believed room, not recently failed, nearest by walking time plus danger. No home store, no private workplace, no world lookup |
| ledger and capacity unchanged | the trip is an ordinary `deposit` activity. `transfer` moves the units, `mayDeposit` and store capacity apply, and a store that turns out full or unwilling ends the trip partial or failed as any deposit does |
| nothing reserved | the activity holds no claims, so an interrupted, failed or fatal trip has nothing to release; what was not put down is still in the pack, and a death settles the pack as it always did |
| explainable | the option's parts read "hands full of stone that nothing needs", the goal "to free my hands <for the need>", and a completed trip writes "Left 2 stone at the storehouse to free my hands." to the person's log (the deposit handler's wording for every other deposit is unchanged) |
| removable | lab arm `rich-no-leave-heaviest` (`setLeaveHeaviest(false)`) removes only this, and changes nothing below 33 |

No score, weight, threshold or RNG draw of any other option changed. The option's own urgency is 0.85 of the gather it makes
room for, less the walk, and it is not offered at all below a total of 8.

## What the rule does not fix

- **Withdraw.** A withdraw that finds the pack full ends "there was nothing to take" (`act_resource.ts`, withdraw handler). That
  false failure text is a separate defect and is not changed here.
- **People who know no suitable place.** About two thirds of the stalled decisions measured below were taken by people who
  know no storehouse or shared workplace that takes the left-over. They stay stalled, as before.
- **Left-over that other options will want.** "Open need" is what `materialNeeds`, the person's plans, promises and errand
  say. A left-over a later production batch or repair would have used can be put down and fetched again; nothing here
  predicts that.

## Evidence

Evidence class: **mechanism** (the rule does what it says through the ledger, and leaks nowhere); the **magnitude** below is a
count of a situation, not a benefit. No claim is made about deaths, food security or productivity.

### Step 5.0: how often the situation arises (rules 32, before the rule existed)

Ordinary Normal-profile worlds (`freshRunSettings('rich', 'normal', seed)`), seeds meadow, river, fern, aspen, 14 days each
(56 seed-days), source tree `073ddb3`. A *stalled decision* is a decision point (an activity chosen) at which: a raw material is
short, there is no room in the pack for one more, a source is believed worth the walk, and the pack holds wood or stone that no
open need, plan, promise or errand wants. The instrumentor was throwaway and is not committed; `scripts/leave_heaviest_check.ts`
counts the same situation.

| count | meadow | river | fern | aspen | all | per seed-day | per seed-week |
|---|---|---|---|---|---|---|---|
| stalled decisions | 76 | 109 | 180 | 184 | 549 | 9.8 | 68.6 |
| ...of which a storehouse or shared workplace that takes the heaviest is known | 51 | 15 | 9 | 100 | 175 | 3.1 | 21.9 |
| people who stalled at least once | 7 | 8 | 12 | 10 | | | |
| heaviest left-over: stone / wood | 52 / 24 | 63 / 46 | 150 / 30 | 95 / 89 | 360 / 189 | | |

Stalls cluster on days 2 to 8 of a world, while the first buildings are going up. People who stalled mostly did something else
at the decision (harvesting, resting, talking, wandering, a gather of something other than what was short).

**Reading of the gate.** The brief's gate was "at least one episode per simulated week". Counted as *attempts that fail* on pack
room, the answer is lower: 14 gather attempts ended on pack room in the 56 seed-days, 1 of them with a left-over nothing wanted
(0.13 per seed-week), because the option that would start such an attempt is dropped before it is offered. Counted as *stalls*,
the decisions above, the situation arises about 22 times per seed-week even where a place is known. The rule was built on the
second reading, on the owner's instruction (2026-10-28). The first reading would not have met the gate.

### Step 5.1: before and after, same seeds

`npx vite-node scripts/leave_heaviest_check.ts -- <seed> <days> [off]`, same four seeds, 14 days each, rules 33. `off` installs the lab
arm, so it is the "before" row (and its counts equal the 5.0 counts above, as they should: the arm removes the rule completely).
Once a trip is chosen the two worlds diverge, so a seed where a trip happened is a different trajectory from there on; a seed
where none was chosen is identical to its "before".

| seed | arm | stalled | leave option on offer | trips begun | trips that put something down | units left | gathers of the short material started within 1200 ticks |
|---|---|---|---|---|---|---|---|
| meadow | before | 76 | 0 | 0 | 0 | | 2 |
| meadow | after | 116 | 56 | 10 | 8 | 2 stone, 9 wood | 3 |
| river | before | 109 | 0 | 0 | 0 | | 2 |
| river | after | 109 | 13 | 0 | 0 | | 2 |
| fern | before | 180 | 0 | 0 | 0 | | 4 |
| fern | after | 180 | 0 | 0 | 0 | | 4 |
| aspen | before | 184 | 0 | 0 | 0 | | 1 |
| aspen | after | 150 | 47 | 3 | 2 | 3 wood | 1 |
| **all** | before | 549 | 0 | 0 | 0 | | 9 |
| **all** | after | 555 | 116 | 13 | 10 | 2 stone, 12 wood | 9 |

What this shows, and what it does not:

- The rule works as specified: where a trip was chosen it ran through the ledgered deposit and the units are in the store.
- It is **rarely chosen**. The option was on offer at 116 of the 555 stalled decisions after (fern: never, as few there know a
  place that takes the left-over; river: 13 times, never chosen), and chosen 13 times, 10 completed (the other three put nothing
  down: interrupted, failed, or still under way when the run ended; not separated here). That is about 0.2 trips per seed-day, and 12 stone-and-wood units moved in 56 seed-days.
- It **did not measurably reduce the stall** in this sample. The stalled-decision count after (555) is not below the count
  before (549) and the gathers started inside the window are the same (9 and 9); with trajectories that diverge after the
  first trip and four seeds, a difference of this size is not distinguishable from noise. No claim is made that it helps.
- Why the option is outbid is not established here. Its urgency is set below the gather it makes room for by construction
  (0.85 of it, less the walk), and was not tuned. Whether to raise it, and whether that helps anything, is an owner decision
  that needs the lab comparison below, not this table.

### Compatibility

- The rules-32 full serialized continuation (`tests/v32_continuation.test.ts`, reference recorded from `073ddb3` by
  `scripts/v32_reference.ts` before any of this existed) passes unchanged. Its world (meadow, no immigration, to tick 14400)
  passes through the situation, so it is not vacuous: run at rules 33 with the version stamp put back to 32, it is
  byte-identical to the reference with the lab arm installed and differs from it with the rule on (both asserted in
  `tests/leave_heaviest.test.ts`). So with the rule off, rules 33 differs from rules 32 in its stamp and nothing else.
- Every earlier continuation reference and the historical goldens pass unchanged (full suite).
- `tests/leave_heaviest.test.ts`: a real completed trip found in an ordinary world; the units moved through the ledgered
  deposit and the store; conservation; the option offered only at 33 with the switch on and not at 32, authored,
  unversioned or with the lab arm; observer purity; save and load in mid-trip; death in mid-trip; an interrupted trip;
  the helper's reading of plans, promises, errand and needs.

## Not done

- No ensemble, no `scripts/gates.ts` check and no lab comparison were run here (they belong on the 24-core machine). The first
  change at a new rules version cannot be gated like for like: see "The first change at a new rules version cannot be gated" in
  [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md).
- Other materials (clay, ore, processed goods) and other full-pack failures (withdraw, haul) are not touched.
