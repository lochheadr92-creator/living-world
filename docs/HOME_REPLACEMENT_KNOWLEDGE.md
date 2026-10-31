# Home replacement from personal knowledge — rules 108

## Reproduced gap before editing

On 31 October 2026, `autonomy_evidence/home-loss107-probe.ts` compared Ada's
layout options before and after her remembered hut collapsed outside her sight.
Her belief remained identical: a sound hut at (71,66), observed at tick 0. Ada
remained at (30,30), heard no report and did not perceive the collapse. Before:
no home layout offer. After: `plan_site:lean_to`, reason `no shelter of our own yet`.
Both observations were pure and the resource ledger balanced. Log retained at
`autonomy-home-loss107-probe.log`.

Classification: **RUNTIME_LOGIC_BUG**. `Ctx.home` is populated by
`homeBuildingOf`, which follows the live household home id. `destroyBuilding`
correctly clears that physical ownership record, but `options_work.ts optPlanBuild`
uses it as the person's knowledge when choosing whether they need another home.
The existing `shelter.ts ownHomeBeliefFor` already owns the person's remembered
home; missing buildings are removed from that knowledge by actual local perception.
Replacing physical custody is not itself communication to absent household members.

## Implemented bounded contract

Home layout decisions and their stated housing need must use the person's own
remembered home type and location. An unseen collapse must not create a replacement
decision; an observed loss may open the existing costly shelter path. Physical
layout/site/ownership checks remain engine checks. Preserve pending layout claims,
material costs, capacity, actual labour, urgent needs and refusal/failure. Do not
copy a Building object into beliefs or use the live entity to fill missing facts.

The `home_replacement.ts` owner reads the existing `ownHomeBeliefFor` memory.
Layout choice and location use that remembered home. Stale knowledge can motivate
an attempted duplicate, but `act_build.ts` checks physical housing allocation at
both layout start and completion, without writing a new belief or location.
A lean-to still permits a proper hut; existing in-place upgrade checks remain.

Existing modules touched: `options_work.ts` for personal layout choice and anchor;
`act_build.ts` for physical allocation checks; `rulesversion.ts` and the lab switch
`rich-no-home-replacement-knowledge` for compatibility and isolated removal. No
new saved fields, resource costs, need weights, communication or AI protocol.
Rules 107 was checked unchanged before allocating 108. Older rules and lab removal
retain the previous choices exactly; the immutable reference is not regenerated.

Eight contract tests cover unseen and seen loss, a told home, remembered location,
legacy/removal, unknown existing physical housing, another home allocated during
the layout, allowed upgrades and actual gathering/hauling/paid partial construction
with save continuation. Final focused run: 80/80 across five files, including the
housing/layout regressions, meat validation and rules-107 reference. Typecheck passes.

Runtime commit `8193b8f`; immutable reference `51b8591`, recorded before any rules-109
code, passes 1/1. Full rules-108 regression: **342 files / 2,217 tests passed**,
646.38 seconds on the owner's Windows machine (`autonomy-home108-full-tests.log`).
The reference test was added after that run's collection and checked separately.
The fixture/typecheck correction and final physical-work contract also have their
separate final focused pass; no invalid-source completion is claimed.

## Ordinary and visible evidence

Five ordinary days each, Normal river and meadow, no induced loss: 2,800 live-person
samples and 100 pure observer checks per seed; exact unobserved twins, final save
reload and full item conservation pass; no deaths. There were 2,565 / 2,582 remembered
home samples, zero sampled remembered missing homes, and zero sampled differences
in layout offers when the knowledge boundary was removed. Meadow had 12 samples
of an allocated home not remembered. This is a null for the new loss boundary.
Reports: `autonomy_evidence/home108-{river,meadow}-5/report.json`.

The valid staged browser diagnostic reaches real gathering, hauling and paid
construction at tick 3,322, with the inspector reading "Building the lean-to".
Five of seven checks pass; completion and later sheltered sleep fail. Both failed
checks are retained in `autonomy_evidence/home108-valid-rendered/report.json`.
This is visible partial work, **not successful household recovery**.

## Retained adverse physical case

`autonomy_evidence/home-replacement107-probe.ts` stages one adult, a home collapsing
within sight, finite carried/home food and water and known raw sources. Existing
rules already lay out and build a replacement lean-to (finished at tick 2,609),
then begin a hut (layout at 3,188). By tick 12,000 the adult has died and the hut
did not finish. Exact twin continuation and conservation pass. This is not a claim
of reliable household recovery, and the fixture must not be silently edited to
erase that failure. Log: `autonomy-home-replacement107-probe.log`.

### Fixture correction and stronger adverse evidence

Typecheck subsequently found that the diagnostic used the invalid source name
`berry` instead of `berry_bush`. Its early apparent completion and the initial
browser report are therefore not valid product evidence. Both remain local; they
were not used to declare household recovery complete. Correcting the source type
changed the trajectory and exposed a failure. The new end-to-end test's intended
completion/sleep assertions were unsupported; the committed contract is explicitly
limited to real paid partial work and exact continuation. The original failed
completion check remains in the browser diagnostic rather than being relabelled a pass.

`scripts/home_recovery_diagnostic.ts` records the corrected finite fixture for both
rules 107 and 108 through 12,000 ticks, with events and 300-tick samples. Both outcomes
are identical: construction stops at 197.6603902139764 of 200 work after interruption,
all four wood already consumed; Ada dies of thirst at tick 7,371. Twin/reload and
all item conservation pass. Reports are in `autonomy_evidence/home108-valid-diagnostic`.

Fresh review found the next concrete gap: the build option's historical 0.02
progress margin suppresses a fully supplied site's last two percent after an
interruption. Execution can do that work, but the option never returns. This is
separate from the knowledge correction and requires its own rule and tests.
The fixture's water discovery and long-term viability remain unproven.

The broader WS16 replacement, limited-labour household viability and A3 goal-family
requirements remain open. This delivers one local-knowledge boundary, not the
whole housing journey or evidence for a global pressure change.
