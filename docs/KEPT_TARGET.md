# A running journey remains a scored alternative — rules 65

Activity review looks up the running action's option key in the freshly generated alternatives. If the key is absent,
its current utility is zero. The source, material-store, production-stock and drinking generators retain short lists.
Actual walking and newly observed nearer places can move a still-usable destination beyond that list. Review then
switches trips as though the running destination had no value. `scripts/kept_target_diagnostic.ts` reproduces this at
rules 64: Hana physically walks from (40.5, 40.5) to about (39.83, 51.69), discovers two nearer trees, loses `gather:5` from
the list, and switches at tick 1,086 even though her remembered destination still holds eight wood.

Rules 65 keeps the existing top two material/stock candidates or top three food sources, plus at most the matching
running option when it passed the ordinary candidate filters. Drinking retains the normal separated shore choices and
adds the known running drinking place if omitted. All are scored through the original distance, danger, recent trouble,
need and purpose calculations. This does not force commitment: normal minimum commitment, switching margin, critical
needs, danger and execution checks still apply. Missing beliefs, observed depletion, inaccessible stock and insufficient
capacity cannot be restored by this helper. Water trouble remains a scoring cost, not an invented absolute exclusion.
No knowledge, inventory, reservation, needs threshold, yield or saved field is added or retuned.

`src/sim/kept_target.ts` owns this candidate-retention rule. Existing modules touched, and why: `options_work.ts` applies
it after raw-source and remembered-material filtering; `options_survival.ts` after food-source filtering; `production.ts`
after stock/access checks; `optutil.ts` retains an omitted drinking shore; `rulesversion.ts` declares the boundary; the
lab offers `rich-no-kept-target`. The disabled switch restores old candidate cuts. `decision.ts` is unchanged.

The mechanism adapts concurrent candidate `c9c5dcf01f042d3e078e40fa3397d6b1240fb908`, whose rules **60** conflicts with
main's batch-recipe meaning. The branch remains separate; no foreign save is relabelled. Main's immutable rules-64
continuation was committed in `e6a6d27` before these edits and verified again before implementation. It includes ordinary
world, care, competing-tool and actual source-journey continuations. Historical expected results are unchanged.

## Contract and rendered evidence

`tests/kept_target.test.ts` starts legal actions through the existing external-controller seam and lets the person
actually walk and perceive. The initial controller is released before ordinary review. It covers the 64/65 boundary,
bounded candidate count, isolated removal, food, raw and processed stock, and real shoreline discovery with no skipped
case. The source journey gathers wood and then ordinarily switches to a useful haul, delivering it to its household's
site. The stock journeys physically withdraw their named goods. The water journey reaches the shore and drinks past
86 thirst. Intermediate saved twins continue identically; resource checks pass. Depletion, lost source knowledge,
forbidden home access, a pack filled only to its real capacity, a visible wolf and critical thirst retain rejection or
interruption. This is staged mechanism evidence, not proof of ordinary adoption or broad welfare improvement.

Fresh review corrected test assumptions rather than altering the engine to satisfy them: gathering can legitimately
end as interrupted after useful output when delivery becomes preferable; drinking can yield once thirst is relieved.
The wolf fixture must rebuild the mobile spatial index before perception. A staged source loss must debit the ledger.
The shore fixture needs enough actual walking to enter sight of alternative water access; it now asserts that discovery
and the contrasting candidate sets. Typechecking corrected the building ownership field and an optional item count.

`scripts/browser/kept_target_check.mjs` passed 7/7 rendered checks; final evidence is
`autonomy_evidence/kept65-rendered-final`. Screens show the initial externally chosen journey honestly, actual chopping,
ordinary wood delivery to the site, observed depletion and drinking at the shore. Inspector rendering preserves the
serialized simulation. The first browser run passed its behavior checks but exited 13 because `Browser.close` could close
its socket without replying. `scripts/browser/cdp.mjs` now rejects pending commands on socket closure; the checker exits
normally after all seven checks. The original report and log are retained. No browser exception was reported.

## Ordinary measurement contract

Predeclared before these runs: the same Normal meadow/river/forest seeds, immigration off, 45 days, 170 seconds per run.
Budget stops remain explicit and may continue only from the unchanged saved world for the remaining interval. Measure
exclusive living-person occupancy, actual interruption causes, travel associated with failed/interrupted activities,
and work periods through the existing observer. Do not call all interrupted travel wasted: it may have produced goods.
The desired local repair is a nonzero ordinary count of restored eligible destinations without disabling real failure
or urgent interruption. Aggregate improvement requires the separate matched-control/nudge ensemble, not three seeds.

`autonomy_observe.ts --kept` adds a read-only comparison against disabled retention in the same state, every 120 ticks.
`scripts/observers/kept_target.ts` records living-person/relevant-activity sample denominators, restored/eligible counts,
unique sampled activities, their actual later endings, censored open activities and any omitted rows. These samples are
not independent opportunities or enacted counterfactuals. It copies retained details, restores the lab switch in
`finally`, and its 1,200-tick full-serialization twin test demonstrates observer purity. Source manifests must remain
unchanged throughout a measurement. Ordinary results and the final check totals are recorded below after completion.

All three runs reached their 170-second budget, **not** the intended 45-day horizon. They ran while regression work was
active, so wall time is not a controlled performance comparison. Their exact saves remain local in
`autonomy_evidence/r65-{meadow,river,forest}/final-save.json`; reports, samples and source manifests are retained.
Daily/final conservation passed and all 410 / 288 / 341 full-serialization observation checks were pure. No samples or
events were omitted. Further 45-day and mature-Large validation remains pending under the repository's costly-run policy.

| Seed | Days completed | Living-person ticks | Travel / work / leisure ticks | Critical exposure ticks | Restored / relevant activity samples | Eligible restored samples | Unique sampled activities / open | End population / carts |
|---|---:|---:|---|---:|---|---:|---|---|
| meadow | 20.5 | 1,401,702 | 504,537 / 173,325 / 11,098 | 42,890 | 413 / 2,979 | 410 | 398 / 0 | 29 / 0 |
| river | 14.4 | 994,566 | 367,140 / 136,321 / 5,811 | 6,214 | 343 / 2,186 | 340 | 326 / 1 | 31 / 0 |
| forest | 17.05 | 1,145,667 | 427,384 / 130,521 / 3,983 | 56,813 | 459 / 2,517 | 448 | 443 / 0 | 28 / 0 |

Total living-person sample denominators are 11,680 / 8,286 / 9,547. Linked restored-candidate activities have actual
successes (108 gathering and 29 drinking in meadow; 82 and 16 in river; 75 and 13 in forest), along with reservation,
depletion, disappearance, full-pack, danger, urgent-need and ordinary better-option endings. An option's prior restoration
does not prove it caused a later success. In particular, 8 / 6 / 5 linked activities still interrupt for danger; river
also has an energy interruption and forest has seven warmth and one energy interruption. Those are preserved outcomes.

Across all activity kinds, failed/interrupted travel has 3,112 / 2,323 / 2,873 endings and 205,159 / 158,140 / 196,780 travel
ticks, including 1,535 / 987 / 1,391 repeat endings at the same person/kind/target. These are not wholly wasted ticks and
are not directly comparable with the earlier 45-day totals. Completed work spells of at least 300 ticks are 20 / 9 / 4;
the reports retain every shorter bin and censored open spell. No survival, leisure, productivity or cart-adoption benefit
is established by these partial ordinary runs. No need pressure or switching threshold was tuned.

## Two ordinary events reproduced for the continuation record

`scripts/kept_target_story.ts` replays the first 180 ticks of the same rules-65 Normal meadow seed, immigration off,
with no forced action. The retained events match the original trace. At tick **120**, Jax **#1019** is working at tree
**#259** (activity **1079**). His running gather is eligible and ranked first with retention and absent without it.
He then completes at tick **178**, having gathered **two wood**; his carried wood rises from one at the sample to two
at completion. This is an actual linked outcome, not evidence that the sampled removal would have caused a different
choice or that population productivity improved.

The preserved failure is Isla **#1031** walking to berry bush **#815** (activity **1132**), also a restored eligible
candidate at tick **120**. At tick **123**, the real reservation check refuses her with "someone else is already taking
it"; cycle/output is **zero**. Retention did not grant ownership or suppress that failure. Full observed/unobserved
continuations match and conservation passes. Report: `autonomy_evidence/r65-meadow-story.json`.

## Verification verdict

**TURN_INTEGRATION_VERIFIED for this bounded rules-65 mechanism; the full autonomy/environment programme is incomplete.**
The full suite passed **235 files / 1,556 tests** in 966.69 seconds (`autonomy-full-tests65.log`). Its long elapsed time
overlapped build, browser and ordinary-run work and is not a simulation performance measurement. Historical goldens and
continuation references passed unchanged. The focused mechanism/observer/64-continuation run passed 10 tests / 3 files;
the strengthened physical-stock and valid-capacity cases passed again (8 tests / 1 file). Final typecheck and build
passed. The build retains existing Vite native-loader notices and a 937.88 kB bundle warning. The suite also emitted a
Node timeout-overflow warning; no test failed. `git diff --check` passed.

Fresh critical review found and resolved the fixture accounting, observation, ownership typing and browser-close issues
described above. It did not identify a remaining production defect in this candidate-retention change. This is one
agent's implementation and review, not an independent-review claim. Required long ordinary, matched aggregate and
mature-Large measurements are still pending; exact commands are in `AUTONOMY_VALIDATION.md`.

## Rules 265: a trip under way is not dropped by a start gate or a workshop swap

The measurements and the 25-day lab below were run on this fix when it was numbered 262, on a rules-260 tree, before social scenes bundles B to D (rules 261 to 263) existed there; the lab outputs name `--rules-up 262`.

**The defect.** `reviewActivity` makes the person's options again and values the running activity through the option that has its key. A key that is not offered is worth 0, so any option worth more than 3 replaces it ("something better came up"). `scripts/option_absent_diagnostic.ts` (measurement only) ran at rules 260 on three fresh Normal worlds for 25 days and three saved settlements for 5 days. Most absences were right: the person's own newer sight had ruled the target out. Two kinds were not.

1. A start gate closes on the way. About 35 option generators return early when hunger, thirst or tiredness passes a threshold (`productionOptions` in `production.ts`, the material and site options in `options_work.ts`). They are meant to stop work from starting. Somebody who set out below a gate and crossed it on the way lost the option and dropped the trip, often 60 to 80% walked. That was 1,062 of the 8,565 absent switches, 416 of them on walking gather, withdraw, haul and deposit legs. In 349 of those 416 the old trip would have held on score alone.
2. The workshop swap on withdrawals. A batch's place is the nearest workshop of its type from where the person stands now (`facilitiesOf(ctx, r.at)[0]` in `supply`), and a store that is the batch's own place is never a source for it (`collectOptions`, `b.id === dest.id`). Walking to a second bakery or smithy B for an ingredient of a batch at A made B the nearest, so B became the batch's place and `collect:B:item` vanished. That was 402 of 909 walking withdrawals, almost all in the large saved settlements.

**What 265 does.** Two parts, each with its own lab switch, both on by default. `src/sim/trip_kept.ts` holds the gate, the switches and the small helpers.

- Kept through needs (`setKeptThroughNeeds`, lab arm `rich-no-kept-needs`). `startActivity` records the hunger, thirst and tiredness levels the person began with, as `activity.data.needsAtStart` (three numbers; a higher level is better met), on any activity that has an option key. In `reviewActivity`, when the running key is not among the fresh options, the record exists, at least one of the three is now worse, something beats 3, and none of danger, a deadlier need, minimum commitment or an outside controller has already settled it, the planner is asked once more in its observer form. The three needs are held at the better of now and then, and put back afterwards in a `finally`. If the key is offered there, the running activity is valued as `util × (1.08 + 0.35 × progress)`, the same formula as for a present key, and never below 0. Only that one number is read. The candidates and the best option still come from the real, ungated options, so the kept trip yields to anything clearly better. At thirst 25 the person goes to drink, at critical thirst or with a wolf in sight the interruption is the old one, and a target the person has ruled out is still dropped.
- Kept batch place (`setKeptBatchPlace`, lab arm `rich-no-kept-place`). A withdrawal that `collectOptions` makes for a batch at a known workshop records that workshop (`activity.data.forPlace`). `batchPlaceOf` in `production.ts` returns that workshop instead of the nearest while the withdrawal is running and the workshop is still among those the person knows and may use. `supply` and `toolRequiredFor` use it. `facilitiesOf` itself stays nearest-first for every other caller, and once the withdrawal ends the nearest is the place again.
- `rich-no-trip-kept` turns both off. The diagnostic takes `--no-kept-needs` and `--no-kept-place` for the same.
- Two places were left as they are on purpose. `batch_plan.ts` `batchWanted` runs only when somebody decides (`decide`, which needs no running activity), so a running withdrawal can never name a place there. `optRackSpare` in `production.ts` chooses where to leave a spare tool, which is not a batch place.
- Below 265, in authored worlds and with a switch off, nothing new is written and every choice is the old one. With both switches off a world at 265 is the world at 263 byte for byte apart from the version number (a test over 2,400 ticks of an ordinary world; any supported version below 265 serves), and the off arm below reproduced the earlier rules-260 counts exactly.
- Two probe counters, only under `probe.on`: `keptNeedsReviews` (reviews where the second look valued the running key above 0) and `keptPlaceChoices` (batch-place choices, one per recipe weighed in a planner pass, where a withdrawal under way held a place other than the nearest).

**Why the second look is read-only.** It uses `generateOptions(world, p, false, true)`, the observer form, which runs under `whileObserving` and sets `ctx.observer`. The planner's known writes (cooldowns, the request and promise notes, the worry list, an expired life event) are behind that flag; that is read from the code, not proved from it, so it was checked three ways. `tests/trip_kept.test.ts` compares the whole serialised world (the random stream included), `hashWorld` and the person's needs before and after the second look, on a staged world and for every person with a keyed activity in an ordinary world at three moments of its first day (everybody made to look worse off than at the start, so the look is asked for each). It also checks that a whole review that keeps the trip equals one ordinary planner pass plus the next think and nothing more. And the diagnostic's own purity checks, which use the same observer form with the needs put back, found no change in 611 to 1,795 analysed switches per run (hash) and 36 to 47 full serialisations per run, 0 failures in all twelve runs. No random number is drawn: the planner uses `hashUnit`, and the serialised random stream does not move.

**Measured.** Same code, 12 runs, one pair per world: ON is both parts, OFF is both switches off (`--no-kept-needs --no-kept-place`). Fresh Normal seeds aspen, river and gen-4, 25 days, arrivals on; saves `aspen-day96`, `gen-4-day96` and `river-day48` from `lw_saves/rules256` raised to 262 (`--rules-up 262`) for 5 days. Worlds differ after the first changed choice, so these are three pairs of each kind, not an ensemble. OFF reproduces the rules-260 counts of the earlier measurement exactly (8,565 absent, 1,062 needs drift, 909 walking withdraws, 402 workshop swaps). Outputs are in `C:/dev/lw_labs/trip_kept/` (local).

| pooled over the six runs | ON | OFF |
|---|---:|---:|
| ordinary switches | 12,252 | 13,315 |
| key absent | 7,593 | 8,565 |
| absent, `needs_drift` | 477 | 1,062 |
| absent, `target_became_dest` | 150 | 552 |
| absent, `newer_sight` (not touched) | 1,842 | 1,816 |
| walking gather absent | 550 | 639 |
| walking withdraw absent | 520 | 909 |
| walking haul absent | 159 | 269 |
| walking deposit absent | 329 | 415 |
| walking work absent, `needs_drift` | 62 | 416 |
| walking work absent, `target_became_dest` | 35 | 412 |
| absent switches followed by the same kind of trip within 600 ticks | 14.8% | 20.7% |
| the same, walking work legs only | 31.4% | 38.9% |
| adult walking ticks spent on legs abandoned with the key absent | 14.3% | 17.3% |
| reviews where the second look kept a value above 0 | 1,222 | 0 |
| batch-place choices that held a place other than the nearest | 1,127 | 0 |
| people alive at the end, six worlds | 470 | 474 |
| deaths in the runs | 0 | 0 |
| mean hunger / thirst level at the end (weighted by people) | 67.7 / 75.6 | 67.3 / 74.0 |
| planner passes per review (`generations / reviews`, decisions included) | 1.78 | 1.67 |
| planner passes per review, not counting the one each decision makes | 1.095 | 1.000 |

Key absent by run, ON / OFF: fresh aspen 1,399 / 1,461, fresh river 1,538 / 1,595, fresh gen-4 1,466 / 1,795, saved aspen 1,173 / 1,395, saved gen-4 1,406 / 1,617, saved river 611 / 702. The batch-place counter is 0 in the three fresh worlds (one workshop of each type) and 622, 395 and 110 in the three saved settlements. Of the 416 walking work legs dropped for a closed gate, 349 would have held on score with the needs put back; with the fix 5 of the 62 left would have (the rest lose on score even when valued). Of the 402 walking withdrawals dropped by the workshop swap, 32 remain. The second look costs about one planner pass for every ten reviews; run time per world was within the noise of a shared machine (6 pairs, 4,068 s on against 4,277 s off in total). A no-hook control of fresh aspen with the fix on ends at the same hash and serialisation as the hooked run (`3a2c7f78`, `6460355:171f74e9`).

**What is not fixed.**
- A newer sight of the target by the person that rules it out is still the largest cause (1,842 absent switches). Where the sight only shows another person got there first, it needs a reservation, which is a separate rule.
- `till:new` becoming `till:<id>` once the plot exists is a rename of the key, not a change of target.
- The `plan_site` and `repair` rows with no cause the diagnostic could name stay unexplained (1,278 unexplained rows in all, of every kind).
- The second look holds hunger, thirst and tiredness only. Rows where warmth, safety or social need closed the gate (`rest` at work, `warm`) are as before, and an activity that serves a need the person has since met (eating when full) is not kept, by design.
- 32 walking withdrawals still end as `target_became_dest`. The four river rows looked at end in `operate:<A>:bake_bread`, so the batch place did stay A and the water was no longer wanted; the others were not looked at.
- Activities already running when an older save is loaded have no record, so the first part does nothing for them.

**Tests and checks.** `tests/trip_kept.test.ts`, 20 tests: the trip kept when thirst crosses the gate on a gather, a store and a haul trip, and dropped at 263 (the comparison version, one constant at the top of the file; any supported version below 265 serves) and with the switch off; thirst 25, critical thirst and a wolf still interrupt; ruled-out targets are still dropped, with the second look asked and answering no; the second look is not asked when it cannot matter; two bakeries kept at 265 and lost with the switch off or at 263; the place named only while the withdrawal runs and only while known; no new fields below 265, with a switch off or on an activity with no key; save and load of both fields; the purity checks above; the probe counters and the cost of one more planner pass; 265 with both switches off equal to 263. Also run: `npx tsc --noEmit`, `tests/probe.test.ts`, `tests/golden.test.ts` (unchanged, no re-record: its worlds do not run rules 265), the continuation pins for rules 250 to 257 and 260 to 263 (unchanged), `tests/rules_version.test.ts`, `run_rules`, `current_recovery`, `household_preparation`, `support_floor`, `agent_docs`, `suite_assurance`, `kept_target`, `bench_access`, and eleven workshop and production test files. After the rebase onto rules 263 the same checks were run again, with `tests/director.test.ts`, `tests/lifechanges.test.ts` and every test file that names `CURRENT_RULES_VERSION` (139 more files, 1,474 tests), all unchanged and passing. The whole suite was not run. The ensemble gates (`scripts/gates.ts`) were not run.

**Not verified.** Whether the change helps the settlement over a long time (food, wood, buildings, population): no long run and no ensemble were made, and the three fresh pairs end with 132 people on against 136 off, which was not examined. Whether the 32 remaining workshop swaps are another cause. The rules-265 continuation pin is not recorded. Nothing was looked at in the browser.

**25-day lab (26 November 2026, commit `ad34091a`, outputs `C:/dev/lw_labs/trip_kept/lab_fresh` and `lab_saves`).** Each arm removes part of the fix, so a figure below is "fix removed, against the mean of the control and two nudges".
- Fresh Normal worlds, 12 seeds, arrivals on, arms `rich-no-kept-needs` and `rich-no-trip-kept` (identical there, because no fresh world has a second workshop of a type). Nothing moves beyond chance: people 44.6 against 44.9, deaths 0.1 against 0.2, homeless 1.9 against 2.0, mean hunger 66.1 against 66.2. Inside the noise floor but one-sided: plans finished 127.6 against 121.8, food preparations finished 27.6 against 22.9 (lower in 10 of 12 with the fix removed), mean mood -1.5 against -0.7 (higher in 9 of 12 with the fix removed).
- Six saved settlements (rules-256 saves of aspen, gen-4 and river at days 48 and 96, raised to 262, about 128 people), all three arms. With the whole fix removed: bread made 533 against 471 (lower in 5 of 6, larger than chance, noise 34), building sites abandoned 8.3 against 10.5 (higher in 5 of 6, larger than chance), work taken up 220 against 203 (larger than chance), households without a solid home 18.0 against 19.0 (higher in 5 of 6, inside the noise floor), homeless 20.1 against 23.8 (not distinguishable from chance). People, deaths, births and mean hunger do not move.
- The parts alone, in the saves: the needs part removed lowers solid homes (37.2 against 36.0, lower in 5, higher in none) and work taken up (220 against 193); the place part removed lowers buildings (150.0 against 147.3, lower in 6 of 6) and leaves bread at 533 against 496 (not distinguishable alone).
- Reading: the fix does no harm to survival and, in settlements with more than one workshop of a type, more bread is baked and fewer sites are abandoned. The lower mood in fresh worlds is inside the noise floor and was not looked into.
