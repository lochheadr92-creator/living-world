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
