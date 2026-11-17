# TASK: Free block experiment. With stocking and production work switched off for part of the day, do residents fill the time with company and leisure?

## Context
Living World, Ryan's solo project. Wording rule: write "Ryan". Never "the owner" as a separate person. No team or group terms. Follow the brain workflow (basic-memory-local, project brain, note readme) before acting.

State seen live on 17 November 2026, about 17:05 Brisbane. Confirm all of it live before starting.
- Integrate checkout C:\dev\Claude Experiment\living-world-integrate: branch main, HEAD baa9257d, rules 255, 36 status lines. Another session is writing there.
- Other worktrees: C:\dev\Claude Experiment\living-world (deepseek-b1), C:\dev\Claude Experiment\living-world-left-rail (claude/left-rail-legend).
- Scratch tree C:\dev\_claude_scratch\regime-20261117\wt: detached at 95ce6377, rules 250. Uncommitted scratch work already there: modified src/sim/activities.ts, livestock.ts, plenty.ts, wildlife.ts. Untracked src/sim/pace.ts, scripts/regime_probe.ts, day_probe.ts, trip_probe.ts, pace_probe.ts, scripts/observers/day_shape.ts, outdoor_company.ts, trip_shape.ts.
- Saves: C:\dev\_claude_scratch\regime-20261117\saves\aspen-day48.save.json, river-day48.save.json, gen-4-day48.save.json (51, 55 and 55 people).

What 17 November's four diagnostics found (brain note projects/claude-living-world, the four checkpoints of that date). All at rules 250, one run per arm, no noise floor.
- Regime experiment: residents kept fully fed gained no steady company or leisure time.
- Day probe: walking is 43 to 50% of waking time. Leisure is 1.2 to 1.8%. About 30% of waking time is "hungry with food in the pack".
- Trip probe: walks are short and direct (median 50 ticks, 5 to 6 tiles). Loads are tiny. 18 to 19% of walking is dropped part way.
- Pace runs: at twice the walking speed, walking falls to 30 to 40% of waking time, residents make more and longer trips, and leisure for people of 12 and over stays at or under 1%.

Why this task. src/sim/leisure.ts pickHaunt pins spare time at a total score of exactly 6 (the part named "spare time stays a fallback"). Every stocking or production option outranks 6, and such options are always on offer. Freed time therefore turns into more work. This task tests one gate in scratch: for part of each day, residents who are fed and safe are not offered new stocking or production work. No score changes. docs/LIFE_PLAN_20261111.md line 34 forbids score boosts to social options and allows gates, access rules and costs. This task stays inside that line.

Comparisons drift between runs because weather, arrivals, spoilage, tree seeding and wild grain all draw from the one stream world.rng (third checkpoint of 17 November). Read every difference against the nudged controls.

Read first: AGENTS.md, PRODUCT_VISION.md, docs/DEVELOPMENT_POLICY.md, docs/LIFE_PLAN_20261111.md. In the scratch tree: src/sim/leisure.ts, evening_fire.ts, kept_target.ts, decision.ts, optutil.ts, options_survival.ts (optEat and the gather options), options_work.ts, pace.ts (the pattern for a scratch setter), scripts/day_probe.ts, scripts/regime_probe.ts, scripts/generation_trace.ts (the --nudge flag), scripts/observers/time_budget.ts, day_shape.ts, outdoor_company.ts. At the scratch top level: launch_trip.ps1 and trip_tables.mjs (the launcher and tables patterns).

## Build
All of it in the existing scratch tree C:\dev\_claude_scratch\regime-20261117\wt. Do not create another worktree.

1. src/sim/free_block.ts, marked SCRATCH ONLY in its header, modelled on src/sim/pace.ts. A module level setting, off unless a runner sets it before the save is loaded. Never saved, never hashed. With the setting off, the world runs bit for bit as before.
   - Window: from a day fraction F until the person's own bedtime, 0.8 + p.chrono, the same bedtime evening_fire.ts line 77 and leisure.ts line 121 use.
   - Who: people aged 12 and over (AGE_CHILD). Under 12 unchanged.
   - Gate active for a person at a tick when all three hold: the tick is inside their window, none of their needs is under its CRITICAL level (constants.ts line 134), and their household has at least one day of food a head as that person believes it (own pack, home store belief, granary allowance as known). Use the knowledge functions the eat and withdraw options already use. Never read another person's live state or a store's live contents.
   - Effect while active: options that would START new stocking or production work are not offered. Everything else is offered exactly as today.
   - Gated: any option whose activity TimeBudget.timeCategory would count as work and which builds stock or makes things for later (gather to stock the household, wood and stone gathering, deposit, haul, withdraw for stock, operate, craft, build, repair, tool work, till, plant, tend, harvest, explore).
   - Never gated: eat, eat from store, drink, warm, sleep, rest, flee, defend, every social and leisure option (converse, socialize, attend, shared meals, visit, evening fire, play, wander, alone), any option made for the care of a named person in need, a give to a person in need, and gathering or withdrawing to ease the person's own present hunger or thirst.
   - An activity already begun is exempt. The gate must not remove the running activity from its own review (REVIEW_EVERY, SWITCH_MARGIN, kept_target.ts). Only new starts are gated.
   - Where the generator has a blocked option form (addBlocked in options_survival.ts), use it with the reason "done for today" so the inspector shows the gate. Otherwise filter in one place.
   - Export one pure predicate that says whether the gate WOULD apply to a person now, independent of the switch, so control runs use the same window accounting.

2. scripts/free_probe.ts, marked SCRATCH ONLY. A copy of scripts/day_probe.ts step for step: same loop, same purity check every 120 ticks, same conservation stop, DayShape, TimeBudget and LifeTally attached. Add OutdoorCompany as regime_probe.ts attaches it. The save is always continued unchanged (arm A of the earlier probes). The staged feeding arm is not used. Two new flags:
   - --block-from F: turns the gate on with window start F. Absent means gate off.
   - --nudge N: N extra draws from world.rng before the first step and nothing else, exactly as scripts/generation_trace.ts lines 50 to 51.

3. Window accounting, read only, in the runner or a new observer scripts/observers/free_window.ts. For people aged 12 and over, every person-tick inside their window: whether the predicate holds, and when not, which condition failed (urgent need, household short of food). For ticks where the predicate holds: the TimeBudget category, the activity kind, and whether the person is outdoors with at least two others within 3 tiles.

4. Fifteen runs, 30 days each, from the three day 48 saves. Per world five arms:
   - A: no flags.
   - N1: --nudge 1.
   - N2: --nudge 2.
   - D: --block-from 0.62 (EVENING_FROM, about 22% of waking time).
   - E: --block-from 0.50 (about 37% of waking time).
   Plus one repeat of aspen D for the determinism check. Output to C:\dev\_claude_scratch\regime-20261117\out\free\<world>-<arm>\. A launcher launch_free.ps1 at the scratch top level, modelled on launch_trip.ps1: refuses an existing out folder, runs detached, records every PID and exact command line. At most 8 runs at a time. Each run took 11 to 15 minutes in the trip probe.

5. free_tables.mjs at the scratch top level, writing out\free\tables.md. Then a one page out\free\report.md and out\free\scratch-free.patch (the scratch tree's diff, new files included).

6. A brain checkpoint appended at the bottom of projects/claude-living-world with expected_checksum, and the matching loops.md lines.

## Do NOT build yet
- No rules version, no pin, no arm in scripts/lab/lab.ts, no full suite, no 12 seed lab.
- No score change to any option. Not to wander, socialize, evening fire, eat or anything else.
- No new activity, place, need or state field. No "enough" gate outside the window.
- No change to the eating line (hunger 62), optEat, DAY, BASE_SPEED, the pace factor, loads, deposit or withdraw behaviour.
- No fix for trip waste (tiny loads, walks to an empty store, a gather dropped for another gather). Separate task.
- No viewer or UI change.

## Do NOT touch / do NOT wire in
- The integrate checkout's working tree, main, origin and every other worktree. Another session is writing in integrate.
- Existing evidence: out\day, out\day2, out\trip, out\pace, the nine regime run folders, out\report.md, the saves.
- CURRENT_RULES_VERSION, any tests/v*_continuation.* pin, any file under docs/.
- No commit, push, merge, stash, reset, branch deletion or file deletion. Cleanup only on Ryan's word. Remove a junction itself, never recursively.
- free_block.ts must not exist outside the scratch tree.

## Invariants to preserve
- Gate off is inert: the A runs end on 168d98f7 (aspen), 8f513a37 (river), 523f2943 (gen-4), the hashes of the regime, day and trip probes.
- Determinism: the two aspen D runs end on the same hash.
- The pace factor stays 1 and the plenty factors stay at their defaults in every run.
- Observers never mutate saved state or the random stream. 600 purity checks per run. Conservation holds in every run.
- Local knowledge: the gate reads only the person's own needs, age, chronotype, pack and beliefs.
- The gate removes options only. No option's score changes in any arm.
- Evidence labels on every claim: VERIFIED, LIKELY, UNKNOWN. One run per arm is a description, never a rate. No benefit claim.

## Acceptance criteria
- Integrate HEAD and status count recorded before and after. If they changed, say so and name the commits as another session's.
- Sixteen run folders each hold report.json, or each missing one is named with its reason.
- The three A hashes equal the values above. The aspen D repeat equals aspen D.
- npx tsc --noEmit exits 0 in the scratch tree.
- A classification table in report.md: every option kind the generators can offer, gated or kept, with file and line, and any doubtful kind flagged.
- tables.md, per world and arm, for people aged 12 and over and for everyone: share of waking time in travel, work, social_contact, leisure, waiting, rest, idle, eating_drinking_warming, sleep before bedtime. Life time (social_contact plus leisure). Outdoor company share. Hungry with no food in pack or home, share of waking time. Food held a head at the end, by packs, homes, granary. Food and wood gathered a head a day. Work jobs finished a head a day. People at start and end. Deaths by cause.
- tables.md window table, per world and arm: share of window person-ticks where the predicate holds, the split of the failing condition where not, and for the holding ticks the split by TimeBudget category, the ten largest activity kinds, and the outdoor company share.
- report.md states the verdict by the reading below and says where the gated time went, category by category.

Reading, fixed before any run. Measures are for people aged 12 and over.
- life = social_contact plus leisure, share of waking time.
- noise, per world and per measure = the larger of |N1 minus A| and |N2 minus A|.
- Survival holds for an arm in a world when deaths are at most the highest of A, N1, N2 plus 2, and the hungry with no food share is at most A plus noise plus 3 points.
- SURVIVAL COST: survival fails for E in at least 2 of 3 worlds.
- GATE RARELY ACTIVE: in E the predicate holds for under 60% of window person-ticks in at least 2 of 3 worlds. Report which condition failed.
- OPENS A LIFE: in at least 2 of 3 worlds, life in E exceeds A by at least 8 points and by more than noise, life in D exceeds A by more than noise, and survival holds.
- TIME OPENS, NOTHING FILLS IT: the predicate holds for at least 60% of window person-ticks in E, and waiting plus idle plus rest plus early sleep take more than half of those ticks, in at least 2 of 3 worlds.
- Test in that order. Anything else is MIXED. Report all three worlds and every arm, nulls and adverse results included.

## Verification, run these and paste the actual output
- git -C "C:\dev\Claude Experiment\living-world-integrate" rev-parse --short=8 HEAD, and git status --short counted, before and after.
- git worktree list.
- git -C "C:\dev\_claude_scratch\regime-20261117\wt" status --short, before and after.
- npx tsc --noEmit in the scratch tree.
- Every run's exact command line, end hash, purity count and conservation result.
- The four hash equality checks.
- The classification table, the main table and the window table.

## On missing data or ambiguity
STOP. Report the gap. Do not invent a definition, a threshold, a counter or a value. Stop in particular if:
- An A hash differs from the values above.
- Stocking gathering and own hunger gathering are not distinguishable where options are built.
- The gate needs edits in more than three existing source files, or more than a one line hook in any of them. List the files and wait.
- The running activity's review path makes "only new starts are gated" impossible without changing that path.
- The household food belief has no existing function to read it from.
- A run fails its purity or conservation check.
If only arm E or only one world is blocked, deliver the rest and say so.

## Commit discipline
- No commits anywhere and no push. Scratch files stay uncommitted. scratch-free.patch is the record.
- Final message to Ryan in four parts: STATUS, CHANGES, RISKS, NEXT STEP.

## Assumptions made (veto any that are wrong)
- Window starts at 0.62 (arm D) and 0.50 (arm E) of the day and ends at the person's own bedtime.
- The gate applies from age 12.
- One day of believed household food a head is the "fed" condition. CRITICAL levels are the "safe" condition.
- Explore counts as work for later and is gated.
- The thresholds (8 points of life time, 2 deaths, 3 points of hungry time, 60% of window ticks) are Claude's proposals.
- Two nudged controls per world are enough noise floor for a first read.
- Building on the existing scratch tree, with the pace edits left in at factor 1, is acceptable.
- Rules 250 and the day 48 saves stay the test bed, although main is at rules 255. Rules 251 to 255 have no brain checkpoint.
