# Persistent ecological condition — current-source audit

Audited against rules 85 runtime `8d41d2a`, before allocating successor behavior. This is a
source audit and implementation continuation, not a completed ecology feature or measured
benefit. The owner's full autonomy/environment prompt remains the scope; the capability row
in `DEPENDENCY_CHAIN_PROGRAMME.md` stays open.

## Existing owners and confirmed gap

- `sources.ts/makeSource,updateSources`: stock, maximum stock, regrowth timer, tree maturity,
  rain/season/hardship growth and natural tree seeding. No persistent harvest-pressure condition.
  Rich rock and mineral deposits remain finite. Tree removal leaves an existing cosmetic stump.
- `act_resource.ts`: actual source extraction includes ordinary inventory gathering through
  `economy.ts/gatherFromSource` and a distinct full-pack eating-at-source path which removes a
  unit directly and records consumption. Any pressure hook must cover both once, using actual
  removed quantity, without double-counting reservation, transfer or food consumption.
- `farming.ts/createPlot,updatePlots`: crop care and accumulated care affect growth and grain/seed
  yield. `act_farm.ts/plant` resets crop care after consuming a real seed. Tending already costs
  time and tool wear; it consumes one carried water when available for a larger care improvement.
  No persistent soil condition survives successive crop cycles, and no fallow/rest decision exists.
- `knowledge.ts`, `source_learning.ts` and work/source options own personal observation, stale
  quantity estimates and actual gathering experience. Ecological knowledge must be observed
  locally or honestly communicated, with no access to exact unseen current condition.
- `types.ts`, `world.ts`, `save.ts` own authoritative state, update ordering, hashing and saved
  validation; existing source/plot renderer and inspector owners supply visible place changes.

## Required implementation and evidence

The missing behavior is not another stock counter. Introduce bounded persistent local productive
condition, separate from harvestable inventory, with pressure from actual extraction/cultivation
and recovery through rest, appropriate real tending/fallowing and feasible replanting. Recovery
must respond to existing season/weather/local circumstances. Avoid resetting a damaged place
merely by replacing its resource entity. Keep finite mineral stock finite and biological growth
explicit in the material ledger. No negative stocks, duplicate growth or free planting material.

People need observable condition distinctions and corresponding lawful options: use another
remembered source, preserve seed, tend, rest a field or establish a patch when feasible. Reuse
existing movement, household access, work, claims, tools, water and seed consumption. Execution
must revalidate location, ownership/access, materials and competing use. An unknown condition
or recovery time stays uncertain. Choices remain voluntary under genuine survival pressure.

Verification must include comparable patches under different real harvest pressure, rest versus
treatment, successive crops, a physical local response, interruption/concurrency/failure cases,
continued save/replay, pure inspection and a visible persistent change. Preserve ordinary adverse
outcomes and opportunity denominators. Staged divergence alone does not establish ordinary
frequency, viable food supply or welfare benefit. Current mature Large/long ecological ensembles
remain the explicitly pending owner-run validation in `AUTONOMY_VALIDATION.md`.

The same owner prompt separately requires bounded accessible water supply/recharge/extraction
and any justified constructed well or collector. Lake fetching is currently not a hydrological
budget. That requirement and durable hazards/debris remain open; ecological-condition work must
not label them complete by association.


## Rules 86 candidate contract (predeclared before ordinary sampling)

The candidate stores one bounded condition record per actually used tile, separate from stock.
Biological extraction costs 0.008 condition per unit while at least half the source remains,
or 0.035 below half; real sowing costs 0.16. Condition is bounded to [0.15, 1]. Replacing a
source or resetting crop care cannot reset the tile. Minerals receive no pressure or renewal.
Natural-source growth is multiplied by 0.25 + 0.75 × condition; crop growth and grain yield by
0.5 + 0.5 × condition. All created inventory still passes through the existing growth ledger.
These are declared model parameters, not a claimed empirical soil-science model or measured balance.

After half a day without extraction/sowing, uncovered idle ground recovers on a deterministic
60-tick pass: 0.06/day times local water proximity, rain, cold and existing dry weather. Growing,
standing or being-tilled crops do not passively recover; buildings/sites block ground recovery.
Actual crop care improves condition by 0.015, or 0.04 with one real carried water, no more than
once per 900 ticks at the place. A farmer with remembered strained/worn own ground and at least
two known food units can voluntarily prepare it to rest through the existing tend activity.
This costs work/tool wear and optionally carried water; three days of rest doubles recovery,
without guaranteeing full recovery. Rested fields retain seed by not sowing it. Other household
farmers observe the prepared rest locally. Existing crop planting is the replanting mechanism;
this change does not invent tree planting from grain seed.

Choices use only coarse vigorous/strained/worn snapshots at their existing source timestamp.
Remembered worn/strained food sources receive bounded 5/2-point costs, fading over four days;
remembered renewal is slower. Unknown current condition stays unknown. A hungry person can
still use a struggling source. Field rest, planting and harvest revalidate household ownership,
physical contact, state and exclusive claims. Observation protocol 13 exposes only the coarse
remembered signs; requested older observation versions omit the added fields. Lab removal:
`rich-no-ecology`.

Expected mechanism: equal-stock patches diverge after different real pressure; actual care/rest
and dry/cold recovery differ; real seed → growing crop → harvested grain/seed → useful eating
and resowing conserve goods and retain soil condition. A missed approach must not reveal a remote
field's new condition. Interrupted work must not consume seed/water or grant completed rest.
Negative cases include ownership/claim changes, no stock/pack room, unseen recovery, old rules,
invalid saves and surviving tile condition after entity replacement.

Fresh review reproduced one existing tilling-ending leak into the new knowledge field:
`autonomy-ecology86-contact-before.log` had 1 failed / 19 passed because a failed journey refreshed
unseen ground. Current rules now refresh that ending only with actual contact; older behavior is
preserved. `autonomy-ecology86-contact-fixed.log`: 38 tests / 5 files pass, including frozen 85,
environment, economy and inhabitant plans. A whole staged crop grows through full-world ordinary
choices after the first manually selected sowing; it ripens at tick 5764, is physically harvested,
resown and eaten. The extra consumption hunger in that test is declared staging, not natural evidence.

Ordinary predeclaration: Normal, rich/current 86, no immigration, fixed river/forest/meadow,
5 days (12,000 ticks) each, 170-second wall limit per seed. Record used places, actual condition
bands, source/care/plant/harvest/rest starts and completions, repeated person samples, options with
condition reasons, selected starts carrying such a reason, and counterfactual sampled choice
changes when only ecology is removed. Keep full-save unobserved twins, observer purity, daily
conservation and final validated saves. Five days is a short occurrence/adverse screen, not a
long ecological recovery or population-benefit experiment. Mature Large/long ecological checks
remain owner-run under the documented runtime policy.


The first ordinary launch caught an overly strict new save validator before any simulation ran:
founder source memories legitimately have negative observation timestamps (worldgen.ts), predating
the world clock. Three fresh Normal seeds reproduced the refusal (`autonomy-ecology86-founder-before.log`,
3 failed / 20 passed). Their original timestamps are now accepted as safe integers no later than
now; physical ecology-use/care timestamps remain nonnegative. The first full run was stopped for
this repair and is not a passing release result. The new regression keeps each initial save exact.


## Short ordinary results and rendered review

Corrected runtime, fixed Normal/current 86/no-immigration seeds, each 12,000 ticks:

| Seed | Used places | Vigorous / strained / worn | Condition-reason gathering starts | Sampled choices changed by removal | Successful sow / tend / harvest | Rest offers / starts |
|---|---:|---|---:|---:|---|---|
| river | 112 | 87 / 24 / 1 | 77 | 113 | 16 / 17 / 5 | 0 / 0 |
| forest | 115 | 93 / 22 / 0 | 92 | 104 | 12 / 17 / 0 | 0 / 0 |
| meadow | 90 | 64 / 16 / 10 | 95 | 77 | 15 / 14 / 6 | 0 / 0 |

Each run has 2,800 repeated living-person samples and 100 full-save purity checks. Condition-
reason options counted 3,386 / 3,594 / 3,099; repeated strained-place memories counted
37,158 / 38,141 / 35,902. Gathering starts total 668 / 726 / 550. The condition-reason starts
count only retained selected-action text that actually names the observation; they do not claim
that the modifier was necessary to select the action. The removal figures compare sampled first
legal choices, not actual interventions or independent decisions. Completed harvest may take
only seeds when pack space limits grain. Preserve that distinction from completed crop clearance.

All three unobserved twins, daily resource ledgers and validated final saves match exactly.
Populations remain 28/28, with zero deaths within the short window, not a survival-benefit result.
Times: 32.60 / 29.02 / 28.31 seconds, while regression tests also ran. Serialized final saves:
2,951,411 / 2,682,640 / 2,588,643 bytes. These are not mature-world performance measurements.
Evidence: `autonomy_evidence/r86-release-{river,forest,meadow}/report.json` and corresponding
`autonomy-ecology86-release-*.log`. Original startup failures remain in their earlier logs.

Ordinary causal story, reproduced by `scripts/ecology_story.ts`: in river, Faye #1147 starts
fishing at #1091 at tick 877, using her tick-875 firsthand memory of two fish and strained
condition. Household shortage still makes the option worth doing despite its condition cost.
She finishes two real fish at 1059; the patch condition is about 0.72. She eats one fish at 2602
and deposits the remaining fish with a grain at her home #2051 at 2952. No choices were staged;
exact unobserved twin and conservation pass through tick 3000. This shows the modifier coexisting
with needs and useful provisioning, not that it caused a better outcome.

Preserved adverse example: meadow, person #1029 tries source #815 and fails at tick 171 because
nothing remains. River has 84 failed gathering endings; forest 98; meadow 28. Forest has no
harvest starts even though two ripe fields remain at the horizon. Field rest has no ordinary
offers or starts in any of these five-day windows; its physical response/recovery remains staged.
Do not retune the window or weights merely to turn those zeros into a success story.

Fresh browser `ecology86-release-rendered`: 10/10 checks pass. Screenshots were visually inspected:
pale worn versus dark healthy soil, actual on-site work, modest paid improvement and visible
rested cover, a real ripe crop and its subsequent harvest. Inspector shows days remaining with
no guaranteed recovery date; person/AI knowledge stays coarse and dated. The browser's initial
worn ground and manually selected responses are explicitly staged. The later founder-timestamp
fix only broadens valid historical observation timestamps, not these rendering paths.

After the five-day runs, the observer gained optional day/budget CLI arguments for owner-run
long validation; its defaults and engine were unchanged. One-day river CLI smoke passed at
2,400 ticks with exact twin, 20 pure checks and a balanced ledger. Earlier reports retain the
exact script/runtime manifests they ran. Long ecological/aggregate/mature Large validation is
still pending in `AUTONOMY_VALIDATION.md`. Bounded water and durable hazards remain separate
unimplemented requirements; `WATER_BUDGET.md` records the next actual source audit.

## AI session integration finding

The first completed full regression (`autonomy-ecology86-release-full-tests.log`) passed 1,904
tests but failed the current-session observation-version contract. New observations had version
13, while `protocolFor` still selected protocols 21/22, whose historical shape is 12. This was a
real routing omission: ordinary live AI sessions would not receive the added ecological signs.
New protocols 23/24 now select observation 13; recorded protocols 21/22 still select 12. The
latest-default assertions were advanced, without changing the older mapping assertions.
`ecology_protocol.test.ts` exercises actual stub live sessions with and without notes, paid
field-rest completion, balanced resources and transcript replay, plus older shape omission.
The focused protocol regression passed 44 tests / 5 files in 17.28 seconds. No paid model calls
were used. The final complete regression is recorded separately below when finished.

Final release regression: `autonomy-ecology86-final-full-tests.log`, **281 files / 1,908 tests
passed**, 394.02 seconds, exit 0. `autonomy-ecology86-final-typecheck.log` and
`autonomy-ecology86-final-build.log` also pass. The build retains the existing import-extension
and large-bundle warnings (main JavaScript 1,051.48 kB). Existing TimeoutOverflowWarning remains
visible in the test log. These results supersede the failed release run without deleting it.
The final protocol-only repair does not change NPC ecology or the rendered field-work path;
the ordinary and browser evidence above retains its original source provenance.
