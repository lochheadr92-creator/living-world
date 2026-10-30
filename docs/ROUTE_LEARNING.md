# Personal route-failure experience — rules 76

Start from rules 75 runtime `5b8593d`, pinned and published `6bd1a91`. The source-contact repair is a prerequisite:
failed travel now retains uncertain stock rather than observing a destination remotely. The staged retry diagnostic
records failures at 323, 485, 591 and 793. Position inspection shows materially different approaches: (14.5,26.5),
(33.89,21.69), (34.81,18.50), (39.69,27.08). Not every retry is the same route. Do not tune a rule to suppress all four.

Extend the existing person-held `failures` owner with bounded route evidence, not a new general memory store. A record
must arise from an actual path-failed travel activity toward a personally known stationary destination. Record its activity,
tick, starting area, known destination, action kind and cart mode. Moving people/animals/carts are not stationary destinations.
An empty source, full pack, interruption or rejected access is not a failed route. Count an actual event once.

Only repeated failures from a similar approach justify a longer reconsideration interval. Predeclared similarity: within
8 tiles of the preceding attempt's origin, same destination belief position within 2 tiles, same action kind and cart mode.
One failure retains the existing 80-tick behavior; a second justifies 240 ticks, a third or later 600 ticks. Group failures
only within two days. These are bounded retry intervals, not measured optimal weights or a global increase to cooldowns.
Different approaches remain eligible; elapsed time permits a probe even if hidden terrain has not changed. Changing hidden
terrain or hearing that stock exists must not secretly clear the route record. Physically reaching the destination corrects
the relevant expectation, even if its stock is then empty. Do not label pathfinding-budget failure as permanent impossibility.

Keep at most eight destinations and four recent concrete route events per person/destination, preserving ordinary failure
records separately within the same owner. A successful gathering may clear its operational failure while a bounded route
summary survives as history; corrected history must not remain a current blocker. Expose the actual event and retry reason
through existing inspector, blocked legal offers and personal AI observation, without revealing global terrain epochs.

Verify two actual blocked attempts from one approach, bounded avoidance, another known reachable option, later physical
arrival/correction after the retry boundary, actual useful work, intermediate save, purity, hidden-change/uninformed-person
negatives, changed-origin/mode/destination exceptions, deduplication, retention and rules-75 continuation. Staged timings and
manually selected legal actions remain labelled. Observe fixed five-day ordinary worlds separately; zeros and null effects
remain results. Source/helper reliability, conflicting reports and all other programme rows retain their individual status.

## Implementation and ownership

`route_learning.ts` owns `Failure.route`, retained inside the existing person's failure map. Activity departure stores
the attempted approach; a real path-failed travel ending records it after the existing activity handler has recorded its
operational failure. A repeated callback cannot count its retained activity ID twice. Only stationary personally known
targets qualify. `decision.ts` removes a temporarily deferred same-approach option before journey preparation derives its
prerequisites; collected blocked offers include the actual attempt ID and remaining interval for inspector/AI use. Different
origins, remembered destination locations, action kinds and cart modes remain independently eligible.

Arrival corrects the path expectation before work begins, so correction does not claim permission, available stock or
successful work. The first corrective arrival is retained; later successful visits do not crowd the failure history out.
`knowledge.ts` can clear an operational failure while retaining its bounded route receipt. Resolved failures cease being
current AI failure claims. Existing logs also record the actual corrective arrival. `inspect.ts` and the Traits panel show
the personal history and uncertainty; the count cap is explicitly “at least three,” and one attempt adds no new restriction.
Save validation and `hashWorld` include route evidence and in-flight attempt metadata; no older saved semantics are changed.
The isolated lab removal is `rich-no-route-learning`. These are targeted retry intervals, not new global cooldown values.

## Physical chain, failure preserved, and review

`tests/route_learning.test.ts` has nine contracts, supported by `tests/helpers/route_learning.ts`. Two actual path failures
occur at ticks **323** and **404**. Preparation is legally selected, and the second trip is selected from ranked legal
offers after the normal cooldown. During the intervening wait the staged person is pinned; ordinary needs still evolve.
This is a mechanism fixture, not spontaneous adoption. At tick 405 the source is deferred for the remaining 239 ticks,
while a different known source remains available. The failure's stored source quantity is not secretly corrected.

The original scene has no stone source. An initial 6,000-tick end-to-end assertion expected wood consumption in construction
and failed. The trace showed a real route correction and six wood delivered, but the site had already exhausted its initial
work allowance before materials arrived. A fixed five-day diagnostic delivered ten wood and still could not progress without
stone. This is retained as an explicit missing-material failure contract, not labelled a completed building or failed route.

A separate complete-material scene adds a real, personally known stone source and physically removes the staged barrier.
It injects no carried or delivered goods. Subsequent decisions gather stone, haul it and consume one stone in construction;
later the person reaches the original tree at **2692**, gathers wood, and uses wood and stone to craft a **basket at 3568**
and **hammer at 5371**. Ledger reasons and actual successful crafting endings prove paid use. The original private building
purpose does not complete; useful material use occurs in other work. Ordinary need breaks, the abandoned preparation
deadline and the uncompleted building remain recorded.

Saved continuation covers the reconsideration state and the entire five-day complete-material chain. The dedicated
`scripts/route_travel_save.ts` additionally saves at tick **2542**, activity **34**, during real travel to the tree; restored
and uninterrupted worlds match exactly through **3342**, including the correction at **2692**, with conservation.
Observer and inhabitant reads preserve full state/RNG. Negative/unit cases cover changed context, uninformed people,
interruptions/stock failures, timed probes, eight-destination/four-event retention, the 600-tick cap and malformed saves.
Retention stress inputs are synthetic handler-boundary evidence, not claimed physical journeys.

Review fixes: only the first successful correction is retained; resolved historical failures stop being current blockers;
chronology and activity metadata are validated. The first typed event append needed a literal type annotation. The initial
use assertion exposed the real missing-stone prerequisite above. A later ledger assertion omitted the existing minus-sign
prefix and was corrected against `ledgerConsume`. Restoring the staged barrier now exactly restores the original shallow
water and sand shoreline as well as grass; initial diagnostic logs used a simplified strip and are retained as exploratory.
Final wording explains the capped count and the unchanged first-failure behavior. A quoting error in that wording edit
caused a parse failure; it was fixed and the final focused tests/build rerun. No valid contract was deleted to hide a failure.

## Validation

- Full suite: **259 files / 1,742 tests passed**, 178.26 seconds (`autonomy-route76-full-tests.log`). This ran on frozen
  implementation/tests before the final count/first-attempt wording refinement. Final focused route/contact/predecessor
  tests: **15/15**, 12.19 seconds (`autonomy-route76-release-focused.log`). That refinement changes explanation text only.
- Typechecking and production build pass (`autonomy-route76-release-build.log`); the existing large-chunk notice remains
  at 994.79 kB JavaScript. The full suite retains its oversized-timeout warning. Whitespace diff check passes.
- Rendered checks: **8/8**, `scripts/browser/route_learning_check.mjs`, report/screenshots in
  `autonomy_evidence/route76-rendered/`. Visually reviewed reconsideration, actual arrival, and the later carried basket
  with real crafting events in the feed. The two-attempt and correction text shown there is unchanged by the final wording
  refinement. Page observation preserves the full world. This is readable staged evidence, not human watchability research.
- Travel save result: `autonomy-route76-travel-save.log`. Earlier failing contracts and diagnostic traces remain in
  `autonomy-route76-first-tests.log`, `autonomy-route76-second-tests.log`, `autonomy-route76-chain-*.log` and
  `autonomy-route76-final-focused.log` (the failed wording parse), separate from final passing evidence.

## Ordinary sample and outstanding scope

Fresh Normal rich worlds, immigration disabled, fixed five-day / 12,000-tick horizon. Every seed has **2,800 person
samples**, **100 full-state/RNG purity checks**, exact unobserved continuation and balanced resources. Source manifests
and settings are in `autonomy_evidence/r76-{seed}/report.json`; those runs preceded only the final wording refinement.

| Seed | Starts toward remembered stationary destinations | Actual qualifying failures | Corrective arrivals | Samples with route memory | Samples with deferred offers | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| river | 1602 | 0 | 0 | 0 | 0 | 86.43 |
| forest | 1467 | 0 | 0 | 0 | 0 | 83.73 |
| meadow | 1394 | 0 | 0 | 0 | 0 | 85.36 |

Starts are not independent failure opportunities and samples are not independent people. **Ordinary activation and
aggregate benefit remain unproven.** Reproduce using `npx --no-install vite-node scripts/route_learning_observe.ts -- river
<fresh-output>` and likewise forest/meadow. A longer/obstructed world is a separate measurement, not a reason to pick a
favourable replacement seed. Mature-world performance and costly aggregate validation remain pending under
`AUTONOMY_VALIDATION.md`; an eventual matched 24-seed, 45-day lab can use `rich-no-route-learning` alongside the documented
control and two nudges (about 90 minutes under that estimate), with a fresh revision-specific output root.

This delivers bounded repeated-approach learning, not a remembered global road map, alternate-route planner or proof of
long-term benefit. Task-specific helper reliability and conflicting reports remain open within A7. The current durable
request receipt in `social_memory.ts` retains outcome/reason/person/site but not request kind/item or demonstrated task
ability; helper choice in `options_social.ts` still uses general personal trust. Audit the actual settlement and contribution
paths before adding any task-specific inference. The wider autonomy/environment programme remains incomplete.

The next diagnostic is now physical: `scripts/helper_task_diagnostic.ts` / `autonomy-helper77-before.log`, explicit rules
76. Ada 2 requests two stone from Ben 7 (request 22); Ben voluntarily promises, withdraws and delivers two stone, and Ada
crafts a pick. Both receipts at tick 989 say only “promise kept,” with no task kind, item or delivered quantity. The outsider
has no receipt, resources balance, and the transcript replays exactly. This establishes the structured-retention gap; it
does not justify a helper-selection weight or treating inability as bad faith.
