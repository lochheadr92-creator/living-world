# Durable flood footprints and locally informed access — source audit

Audited on the rules 87 water candidate. A12 is still incomplete; this file is the next
implementation contract, not a claim that durable flooding or access repair has been delivered.
The existing programme register remains authoritative. Allocate a successor only after rules
87 is verified, committed and pinned; preserve its current water-body geometry and accounting.

## Current owners and missing transition

- `hardship.ts/floodTick` triggers at storm strength >=0.92, on the 30-tick schedule and no more
  than once per three days. It immediately spoils shore piles and damages nearby lean-tos/huts,
  records a world event and mood effects. `lastFlood` prevents repeated onset losses, but there
  is no retained wet/flooded footprint, physical depth, drainage or temporary access recovery.
- `pathfinding.ts` owns tile costs, cart exclusions, A* and string pulling. Current costs read
  static terrain, solidity and wear. It has no per-person hazard knowledge input. Adding hidden
  live flood costs to the global cost function would let remote route selection know the flood.
- `activities.ts/planPath,stepTravel` own actual person movement. A saved route is followed as
  waypoints; stuck detection can replan, but there is no local flood encounter boundary. A hazard
  that begins after departure therefore needs a physical movement check before crossing it.
- `habitation.ts/canEnterHome,enterHome,leaveHome` owns actual entrances and exits. Existing
  blocked-door behavior preserves an indoor person's physical location. A new wet-door condition
  must be checked at these actual boundaries, without remotely revealing it in option generation.
- `knowledge.ts`, `perception.ts`, `route_learning.ts` and `options_survival.ts` already own
  bounded personal observations, experienced route failures and survival choices. Extend those
  existing concepts for local signs, stale warnings, correction and alternatives. Do not create
  a global private hazard oracle or make an unobserved flood another person's knowledge.
- `transport.ts` and pathfinding cart mode retain wheel restrictions and physical loads.
  `hydrology.ts` rules 87 stores fixed terrain-water components and exact stock/recharge/loss.
  Temporary flood ground must not silently rewrite those components or duplicate natural water.

## Required connected situation

Keep a bounded saved footprint with onset, active and recovery phases, observable signs and
finite duration. Relate the footprint to an actual storm/water condition. Existing onset loss
and shelter damage are credited once; renewed observations or recovery must not repeat spoilage.
Render the affected ground and show its retained cause and uncertain recovery to the viewer.

Personal planning uses remembered affected tiles or places; physical execution checks the
current local ground. A traveller who departed before onset can notice the danger, preserve
useful work, choose a feasible known route, wait within a bounded timeout or shelter. An old
warning must be corrected by later observation, rather than permanently banning the place.
Keep the distinction between a known route, a searched route and a physically checked route.

Exercise ordinary walking and carts, after-departure onset, a warning that outlasts the actual
flood, an already-indoor person whose doorway changes, and a person already on affected ground
who must be able to retreat without teleportation. No goods or people disappear for convenience.
If drainage/clearing is required for an otherwise viable journey, give it lawful siting, actual
work/material costs, interruption and ownership; it is not a free route reset. Bounded waiting
and natural recovery may suffice where no constructed repair is justified.

Required checks include a saved traveller, actual local discovery, usable alternative or visible
failure, saved flood/recovery transition, exact twins and conservation, uninformed-person
nonreaction, stale-warning correction, inspector/AI purity and rendered signs. Ordinary onset
frequency and successful adaptations require fixed-seed evidence separately from staged storms.
Long environmental recovery and mature Large performance remain pending under the documented
owner-run runtime policy; an audit or attractive warning label cannot close A12.

## Rules 88 implementation and predeclared checks

Rules 87 was committed and pinned (`1e21d6a`, immutable `8d5d89a`), then published at
`b410300` before successor edits. Rules 88 currently implements the following bounded model;
release verification and ordinary results remain pending until recorded below.

- One saved, sorted footprint, bounded by map area, arises under the existing storm threshold
  and cooldown only beside natural water at least half full. Static water geometry and stock
  are unchanged. Flood ground is non-extractable environmental wetness, not duplicate water.
- Active unsafe ground lasts a quarter day; slow recovering ground lasts until one day after
  onset. These are declared model parameters, not hydrological calibration. Actual onset goods
  loss/shelter damage happens once. Recovery costs elapsed time and does not refund spoiled goods.
- Close personal observation uses the existing belief store, capped at 64 ground records per
  person. It carries state/source/seen/learned, never the real recovery deadline. A day-old
  warning becomes uncertain; actual observation corrects it sooner. Indoor residents can inspect
  their actual exit while attempting to leave, not the surrounding outside map.
- A* and smoothing receive only those remembered costs. Physical movement detects newly flooded
  ground locally, records the encounter and replans. A caught person can retreat at reduced speed
  through a three-tile local search. Carts retain their original terrain restrictions, physical
  loads and a one-tile clearance from known wet ground. A failed route waits at most 180 ticks,
  with 30-tick retries and ordinary urgent interruption, then ends with an explicit failure.
- Flood onset during outside work releases unfinished claims and causes retreat. Completed
  inventory/site/batch work stays with its existing owner; an unfinished work cycle must restart
  on physical return. The staged gatherer retains the first berry and then really eats it.
- The existing map renders flood and muddy recovery; clicking ground opens current-world cause
  and access. Personal inspection distinguishes retreat, waiting and an already revised route.
  Protocols 27/28 expose observation 15 dated ground signs; 25/26 retain observation 14.
  Lab removal: `rich-no-flood-access` keeps historical instantaneous damage only.

Expected outcome: an offered food trip already in progress notices the newly affected route,
physically detours, gathers real food and continues exactly after a mid-journey save. Failure:
no remembered safe path yields a bounded wait and explicit failed result with claims released.
Also check an already-working person, caught walker/cart, unchanged distant uninformed routing,
stale correction, flooded doorway, one-time loss, replay/purity and rendered phases.

Initial foundation failures were fixture issues (the helper default was historical authored
rather than rich; the staged pause had not been released; a storm active at tick 7 triggered
before the intended after-departure onset). All are retained in the logs. The work-retreat test
initially expected its berry to remain carried for 180 ticks; diagnostic evidence showed actual
`-eaten` consumption of that retained berry, not unexplained loss. The final contract checks
retention immediately after interruption and real later consumption, with conservation.

Focused physical/access/protocol/historical checks passed 48/5 before the rendered status fix.
Rendered 8/8 exposed a misleading current blocker after successful replanning; that label is
now cleared, with its original encounter kept in activity provenance and personal history.
Retreat/wait/revised-route wording derives from real activity state. The first full run was
cancelled for this concrete fix, so `autonomy-flood88-full-tests.log` is not a passing full run.
Final focused status/protocol/immutable checks pass 15/3. Final rendered checks pass 8/8 in
`autonomy_evidence/flood88-final-rendered`; screenshots require direct visual review as well.

Ordinary predeclaration: fixed Normal rich/current 88 river, forest and meadow, no immigration,
five days / 12,000 ticks and a 170-second budget per seed. `scripts/flood_observe.ts` records
storm maximum, actual onset and outdoors/affected-ground opportunity denominators, physical
retreat/wait/replan/work-interruption and endings, repeated memories, exact unobserved twins,
100 full-state purity samples, daily conservation and validated final save. Zero onsets is a
valid limit, not permission to force storms or choose favorable seeds. Long environmental,
combined and mature Large measurements stay pending under the repository run-budget policy.

## Pre-fix five-day ordinary results (rules 88 candidate; superseded below)

All three Normal/current rich worlds, immigration off, reached 12,000 ticks. Each has 2,800
repeated living-person samples, 100 full-state purity checks, exact unobserved twins, daily
conservation and exact validated final saves. All retain 28 living people and zero deaths;
this does not establish a survival benefit.

| Seed | Maximum storm | Flood onsets | Outdoor / on affected ground at onset | Flood-related activity endings: success / failed / interrupted | Seconds | Final save bytes |
|---|---:|---:|---|---|---:|---:|
| river | 0 | 0 | no onset opportunity | 0 / 0 / 0 | 33.76 | 3,295,529 |
| forest | 1 | 1 | 28 / 1 | 10 / 18 / 3 | 29.96 | 2,778,950 |
| meadow | 0 | 0 | no onset opportunity | 0 / 0 / 0 | 28.59 | 2,543,574 |

Forest's actual storm produces a 293-tile footprint at tick 4,747. It becomes recovering ground
at 5,347 and clears at 7,147. The start-of-loop observer counts 599 active / 1,801 recovering
world-tick samples (the update boundary explains these sampling counts; the declared phase
lengths remain 600 and 1,800 ticks). It records 28 person-ticks of retreat, 4,119 person-ticks
of waiting, 19 distinct activities with a physical flood encounter, one interrupted work
activity and 28 distinct activity/wait-start records. Repeated memories: 3,195 flooded,
13,557 recovering, 7,982 clear. These are repeated observations, not independent people or
opportunities. Total travel person-ticks: 129,238 / 130,055 / 120,855 in seed order above.

An ordinary causal story is reproduced without intervention by `scripts/flood_story.ts`
(6200 ticks, exact unobserved twin, balanced ledger): forest Mira #905 fails a trip to access
#1000192 at tick 5,216 after a bounded flood wait. At 5,217 she chooses access #1000172 from
her available options; actual local flood encounter is recorded at 5,270. She reaches it and
completes two real shore sips at 5,515, with thirst satisfaction 95.228, then chooses company
with #920 at 5,516. This establishes ordinary route response, real useful consumption and a
later choice. It does not show that the flood or response increased social activity or welfare.

Preserved adverse chain: forest Delia #942 fails successive water trips, including a wait
for #1000171 ending at tick 5,464 with thirst satisfaction down to 7.236. A new trip to
#1000170 begins at 5,465 and completes three actual sips at 5,494, restoring thirst to 100.
Do not erase the critical delay because she later recovered. Tessa #926 was the one person
already on affected ground at onset; her rest at #922 was interrupted, she retreated with her
carried food and the attempt failed at 4,955 after waiting. No death occurred in this short
window, but no claim of reliable winter or long-world survival follows.

Evidence: `autonomy_evidence/r88-{river,forest,meadow}` and `r88-ordinary-stories`; all four
processes exited 0. Runtime was unchanged during these measurements. Browser final 8/8 and
actual inspected screenshots show the same place flooded, crossed by a real detour, then
muddy and clear; the corrected person panel describes a revised route without a false current
blocker. The final build/typecheck pass; existing Vite extension/bundle warnings are retained.

The immutable-reference preparation also preserved an expected adverse case: a low-hunger
staged visitor abandoned a proposed wait for urgent gathering at tick 527. Its reference
fixture now declares initially satisfied hunger to isolate waiting across recovery. No runtime
urgency rule was weakened. The final full suite and immutable capture are recorded next.

## Release review correction and replacement ordinary results

A fresh physical-handler review found that `act_resource.ts/forgetUnreachableWater` deleted a
real water-location belief after any failed journey whose detail contained "blocked". A
bounded **temporary flood** wait therefore erased the shore location along with reporting the
route failure. `autonomy-flood88-location-before.log` reproduces this through an actual offered
drink, retreat and failed wait (one failed / 11 passed). Rules 88 now preserves the location
for a recorded flood wait; its dated ground warning remains separate. Historical behavior is
unchanged. Physical/source/route/door/protocol regression passes **65 tests / 6 files** in
`autonomy-flood88-location-fixed.log`.

The second full run (`autonomy-flood88-final-full-tests.log`) was cancelled for this concrete
fix and has no passing verdict. The complete replacement is `autonomy-flood88-release-full-tests.log`.
The ordinary windows and story were rerun on unchanged release runtime, preserving the older
artifacts and results above as pre-fix evidence. Do not use their routes/timestamps as the
release's ordinary story.

| Seed | Onsets | Affected endings: success / failed / interrupted | Seconds | Final save bytes |
|---|---:|---|---:|---:|
| river | 0 | 0 / 0 / 0 | 34.83 | 3,295,529 |
| forest | 1 | 10 / 18 / 1 | 31.61 | 2,730,120 |
| meadow | 0 | 0 / 0 / 0 | 30.13 | 2,543,574 |

Each again reaches 12,000 ticks with 28 living / zero deaths, 2,800 repeated person samples,
100 full-state purity checks, exact unobserved twins, balanced daily ledgers and validated
final saves. Forest's onset remains tick 4,747, 293 tiles, 28 outside and one actually on the
footprint; active/recovery boundaries remain 5,347/7,147. It records 28 retreat person-ticks,
3,747 waiting person-ticks, 19 locally encountered activities, one interrupted work activity,
26 distinct wait starts and 121,216 total travel person-ticks. Repeated signs are 3,428 flooded,
15,181 recovering and 6,292 clear. No causal aggregate comparison is claimed from differences
between these single chaotic trajectories.

**Release ordinary story:** forest Mira #905 ends a blocked trip at tick 5,216, chooses
water access #1000170 at 5,217, sees the affected ground at 5,302 and begins a bounded wait at
5,333. After actual recovery begins at 5,347, she reaches the shore and completes two real
sips at 5,385, reaching thirst satisfaction 100. At 5,386 she chooses warmth at fire #895.
This is a local encounter → waiting/recovery → physical water consumption → later choice
chain, not a claim of increased warmth or survival.

**Release preserved failure:** Delia #942 fails water trips at 4,967 and 5,283 with no sips;
she starts another for #1000172 at 5,284 and encounters the flood at 5,310 with thirst
satisfaction only 13.396 (critical). That journey eventually completes three sips at 5,596,
restoring thirst satisfaction to 100. The critical delay remains part of the evidence even
though she survives. No recovery deadline was revealed to her. Tessa's interrupted rest and
retreat at onset remain observed. The 6,200-tick fixed story replay records 66 events with
exact unobserved twin and conservation, without modified weather, needs or choices.

Release roots: `autonomy_evidence/r88-release-{river,forest,meadow}`, `r88-release-stories`
and `flood88-release-rendered`. All ordinary processes and browser exit 0; rendered checks
8/8. Typecheck/build pass in `autonomy-flood88-release-{typecheck,build}.log`. The release
build retains the existing bundle/import warnings. Full-regression and immutable results
follow once completed; mature Large, repeated environmental recurrence and aggregate benefit
remain pending. No drainage/clearing primitive is justified for this temporary footprint:
physical alternatives, bounded waiting and actual natural recovery are implemented. Other
persistent access obstructions require their own evidence; no free terrain reset was added.

Release full regression completed: **287 files / 1,944 tests passed**, 410.34 seconds,
`autonomy-flood88-release-full-tests.log`. The existing timeout-overflow test warning remains.
This replaces the two explicitly cancelled runs; neither cancelled run is counted as a pass.
Immutable rules-88 continuation will be captured from the committed runtime before any
successor behaviour is introduced.
