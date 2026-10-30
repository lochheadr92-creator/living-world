# Source-specific gathering experience — rules 74

Start from rules 73 runtime `1b41ded`, pinned/published `04ffff3`. The preceding diagnostic establishes that an actual
empty tree updates a category-wide wood-work estimate, which is also applied to a never-tried tree. That is the existing
category contract; it is not yet source-specific learning. No ordinary-rate or benefit claim follows from the staged trace.

Extend the existing payoff owner with bounded per-source observations inside each work-category estimate. Preserve the
general productivity estimate for experiences that support it. A personally verified empty source is an availability
observation about that place, not evidence that every source of that work is poor or that another person acted in bad faith.
Use only real gathering endings and personally held knowledge, never live hidden source stock. A zero-yield interruption,
route failure, full pack or lost tool must not be relabelled as an empty source without firsthand evidence.

Retain at most eight sources per work category and four concrete activity events per source, with actual activity, tick,
units, elapsed/expected cost and outcome. Reject duplicate activity evidence. Bound confidence and influence; source and
category information must share the existing maximum preference rather than adding two uncapped penalties. A later
firsthand observation of positive stock must suppress obsolete empty-source influence, while hearsay alone is not truth
detection. A forgotten source must not become known because an experience entry survived. No blanket timer changes.

Verify an actual physical empty-source event, matched source choices, productive reuse, corrective firsthand observation,
uninformed-person independence, interruption/hidden-state negatives, intermediate save, observer purity, bounded retention
and historical continuation. Show the personal basis in existing option/inspector/inhabitant explanations. Report ordinary
activation separately with the fixed fresh Normal five-day window and source manifests; broad benefit and costly mature
validation remain separate. Task-specific helpers, route learning, conflicting human reports and the wider programme stay open.

## Implementation and ownership

`source_learning.ts` owns the bounded entries inside the existing `Payoff`, not another general memory store. Actual
gather endings carry activity IDs; the activity marker and retained event IDs prevent duplicate callbacks. Productive
returns use the existing estimate/elapsed-time ratio and exponential update, with confidence growing over three visits.
An empty visit requires failed zero-yield gathering plus a firsthand empty belief observed during that activity. It
contributes a place warning rather than a category productivity sample. Interruptions still retain the previous category
learning contract and do not automatically become evidence of empty stock. Events not establishing either fact add no
source entry. Eight places per category, four events per place, three unresolved empty visits and the existing combined
±6 utility limit bound memory and influence. An event evicted from this bounded history is not an eternal deduplication key.

`learning.ts` applies the existing category estimate unless that known source has productive experience. Direct
`knowledge.observe` corrects an empty warning when stock is personally seen; later hearsay cannot revive that old warning.
This does not certify present stock forever. Unknown locations remain unknown even if experience survives. No hidden live
stock enters scoring. `options_work.ts` and `options_survival.ts` pass the source ID and personal explanation through legal
offers. `activities.ts` supplies the actual ending. `types.ts`, save validation and `hashWorld` preserve the bounded state;
`inspect.ts` and the existing Traits panel expose it without mutation. The lab removal `rich-no-source-learning` preserves
the original category-learning path. Rules 73 and earlier retain their frozen behavior.

## Verification and review

- `tests/source_learning.test.ts`: 11 contracts cover real depletion, physical alternative gathering and construction,
  exact intermediate-save continuation, inspector/AI purity, independent uninformed people, hidden restocking, hearsay,
  firsthand correction, interruptions, duplicate evidence, bounds, malformed saves and predecessor/removal behavior.
- Focused source/category checks: 19/19 (`autonomy-source74-focused2.log`). Earlier combined source/category/rules-73
  continuation: 20/20 (`autonomy-source74-first-tests.log`). The final full suite also includes that immutable predecessor.
- Full suite: **255 files / 1,726 tests passed**, 178.16 seconds (`autonomy-source74-full-tests.log`). Typecheck passed
  (`autonomy-source74-typecheck3.log`), production build passed (`autonomy-source74-build.log`), diff whitespace clean.
  Build retains the existing large-chunk notice (988.80 kB JavaScript). The suite emits the existing oversized-timeout warning.
- Rendered staged check: **7/7**, `scripts/browser/source_learning_check.mjs`, report/screenshots in
  `autonomy_evidence/source74-rendered2/`. Actual empty visit and productive alternative precede the displayed records;
  the separate correction scene physically restocks and observes the source. The productive branch restores the save
  before that staged restock. Corrected and productive screenshots were visually reviewed; text is readable beside the
  selected person and the construction reached with the gathered material.
- Preserved findings: initial synthetic test activities required explicit partial-object casts for typechecking; runtime
  was unchanged. The first browser run failed its correction display assertion because the staged mutation happened at
  the same paused tick; inspector caching is intentional. Advancing one real tick updates the display. That failed report
  remains in `source74-rendered/`. Review also added retained-ID duplicate rejection and made combined positive-work/empty
  labels describe both grounds. No source/tests changed during the release full suite or ordinary runs.

## Ordinary occurrence and later choice

Fresh Normal rich worlds, immigration disabled, 5 days / 12,000 ticks, rules 74. Each has **2,800 person samples** at
120-tick intervals, **100 full-state/RNG purity checks**, exact unobserved continuation, and balanced resources. Samples
are not independent opportunities; retained events can be missed between samples. Starts count matching recorded reasons
and can miss a source influence omitted from the compact decision explanation. No completion/use rate follows from starts.

| Seed | Samples with experience | Retained actual events sampled | Empty events | Samples with source offer | Changed top on removal | Actual starts with source reason | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| river | 2731 | 471 | 60 | 883 | 65 | 84 | 92.41 |
| forest | 2735 | 449 | 62 | 798 | 73 | 89 | 89.87 |
| meadow | 2723 | 431 | 13 | 876 | 50 | 60 | 77.91 |

Reproduce with `npx --no-install vite-node scripts/source_learning_observe.ts -- river <fresh-output>` and likewise forest
and meadow; source hashes, time partitions, settings, final saves and exact rows are in `autonomy_evidence/r74-{seed}/`.
Initial exploratory runs accidentally used literal seed names `river-test` and `forest-test`; their successful reports
are retained separately and excluded from this fixed-seed table. No tuning followed those results.

**Ordinary causal story:** river, Edda **1146**, wild-grain source **993**. Her actual gathering activity **1491** ended
at tick **504**, yielding one grain in 73 ticks against an estimated 54.15. At a naturally idle decision at tick **684**,
a matched one-tick continuation starts `gather:993`; removing only source learning starts `gather:989`. Both branches begin
from exactly the same unmodified ordinary state and conserve resources. The source-specific estimate is 0.742, compared
with her category estimate 0.683, so this is a relative preference based on experience, not a claim of above-plan yield.
`scripts/source_choice_check.ts`, `autonomy-source74-choice.log`, and `autonomy_evidence/source74-choice/` retain both
saves and reasons. The whole-world one-tick removal is not a long-horizon benefit experiment.

**Preserved ordinary failure:** the same river person later reaches source **993**, activity **2814**, and obtains zero
units after 87 ticks, ending at **3566**. The empty-place record is retained rather than being turned into a successful
journey. Earlier productive experience did not guarantee future availability.

## Remaining limits

This closes the source-specific gathering component of A7, not route/helper reliability, conflicting-report handling,
broader memory, communication or the full autonomy/environment programme. The physical staged chain proves useful wood
consumption; the short ordinary sample proves occurrence and later influence, not aggregate production, survival or
household viability. Mature-world performance and long-horizon effects remain pending under `AUTONOMY_VALIDATION.md`.
For an isolated aggregate test on the eventual combined revision, use the documented 24-seed/45-day lab command with
`--branches nudge:1,nudge:2,rich-no-source-learning`, a fresh revision-specific output root, and the same lab-report command.
Estimated all-core cost is about 90 minutes; do not treat it as executed here.
