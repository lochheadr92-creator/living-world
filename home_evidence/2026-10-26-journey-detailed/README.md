# Briar's shelter journey: a choice that did not become a blueprint

The rules-29 repair was fast-forward merged into main at `810d32f`. Then we followed
one household, chosen before running, through four ordinary simulated days.

**Outcome: the household remained in its lean-to. The chain stopped at site layout.**
This is an explained failure, not a completed housing demonstration.

## Selection and run

River seed, Normal profile, 28 founders, immigration off, ticks 0–9600. Before the
first tick, select the first household by stable ID with two adults and no solid home.
That selects **Briar #1103**: Mira #1106 and Emre #1107, with children Viktor #1108
and Theo #1109. They start in lean-to #1105. No commands, assigned jobs, forced
choices, changed thresholds, staged supplies or population changes occur in the run.

The detailed runner's clean local source `8856a27` is published as `07b87a74e0452bc0b86f996c327192b33fb03418`;
both have tree `492a4a4cb3bf4ced98256e5e2034af8cbbf0c77d`. Simulation code is the
unchanged rules-29 main. The final packaging compresses the story JSON losslessly;
the subsequent runner writes that compressed representation directly.

## What actually happened

| Link | Observed evidence |
|---|---|
| Recognise inadequate shelter | Both adults remember their own lean-to and do not believe they have a solid home. Their actual chosen goal later is “to build a proper hut.” |
| Clear immediate constraints | Decisions expose food reserve, hunger, thirst, early-settlement and construction-cap blocks. Four members require 12 food to hand before starting a hut. These are recorded gates, not invented motives. |
| Decide to build | Mira starts `plan_site` at tick 5307; Emre starts at 5366. Both target a 2×2 hut at `(47,37)`. They know their own existing home #1105. |
| Create the site | Neither succeeds. Emre's result at 5406 and Mira's at 5409 is “the footprint would obstruct access.” No site is created for Briar. |
| Fetch and deliver for the home | Not reached: no own home site, no shelter-material plan, and no own-site delivery. Gathering for other purposes is not credited to this nonexistent project. |
| Construct and occupy | Not reached. At 9600, their home is still lean-to #1105. No hut construction or indoor move-in is claimed. |

The snapshot captured immediately after the first failure (world tick 5407) contains
**Ivy #1137 at (47.5,38.5), inside the proposed footprint**. The access check correctly
refuses it. A separate offline diagnostic re-evaluates that exact saved snapshot,
then a fresh copy with footprint occupants excluded from the function's input.
Access changes from false to true. No ticks advance in this diagnostic; nobody is
removed or moved in the natural run. This isolates transient occupancy for that
refusal, not a reason to weaken the safety check. `layout-diagnostic.json` retains
the snapshot hash and exact inputs.

At the end, four other households' unfinished huts fill the four-open-site allowance.
Required minus delivered minus used is **8 wood and 14 stone short in total**.
Those are actual accounting fields; some site status strings are stale and are not
used as inventory evidence. Briar's adult decision records contain 53 construction-cap
blocks across the window, alongside other gates; this is a count of decisions,
not time spent blocked. One other household has a completed hut at the endpoint.
All 28 residents survive; no population-level housing-success rate is inferred.

## Verification

- 164 personal observations/cards leave the complete serialized world unchanged.
- 41/41 checkpoints match an independently generated unobserved twin, field by field.
- No own site appears, so the save checkpoint uses the declared day-one fallback,
  tick 2400. All 31 checkpoints from that load onward match uninterrupted state.
  This is not a mid-site continuation demonstration.
- Ledger and tool checks pass at all 41 checkpoints. Zero failures; runner exit 0.
- The first pass and detailed repeat have identical final household state. The second
  pass adds result transitions and auditor construction context, without changing choices.
- Typecheck and whitespace checks pass. No production modules changed, so the already
  passed rules-29 full suite (1207/146) was not repeated for reporting-only scripts.
- No rendered UI/usability check, ensemble, long-run benefit or universal replay claim.

## Where the planning gap is

`findBuildSpot` checks real occupied footprints, spacing, explored land and access.
Its selection does not reserve the position against another pending `plan_site`
activity. `siteConflict` prevents duplicate real sites, but neither layout has made
a site yet. Both adults can therefore spend time laying out the same home.

Proposed repair, **not implemented by this audit**:

1. One active home-layout claim per household; arbitration must not create an extra
   secret source of knowledge for inhabitants.
2. Deterministic footprint claims at accepted layout start, with overlap/spacing
   validation and clear cancellation/death/suspension/expiry semantics.
3. Revalidate on arrival and completion; a transient occupant permits a bounded
   wait or safe re-selection. Preserve the live-person and access checks.

Highest-value next contract: two adults choose an overlapping layout, a passer-by
occupies then leaves the footprint, the survivor resumes or chooses another safe
location, save/reload agrees, and at most one real household home site is created.
The construction cap is a separate material-throughput constraint; increasing it is
not a repair for overlapping layout attempts.

## Files and reproduction

`report.json` carries settings, selection, final state and all checkpoints.
`story.json.gz` records decision/result/plan transitions. `activities.json.gz` retains
chosen targets, the actor's own beliefs and exact activity parameters.
`observations.json.gz` separates personal observations from labelled auditor-only
construction context. `transfers.json.gz` records actual wood/stone movements across
the world; these are fungible goods, not uniquely identified material units.
`layout-failure.json.gz` and `final-world.json.gz` are actual saved worlds.
The initial narrower pass remains in `../2026-10-26-journey/`.

Run with an unused directory:

```sh
npx --no-install vite-node scripts/shelter_journey.ts --out home_evidence/new-journey
npx --no-install vite-node scripts/shelter_journey_diagnostic.ts home_evidence/new-journey
```

The offline diagnostic is specific to this recorded footprint and must not be
silently used for a different case. Both natural runs used the same seed, not
independent samples. This evidence explains one stalled household.

Existing modules touched: none in the simulation/UI. Added two observer/diagnostic
scripts and evidence; the implementation register records integration and outcomes.
