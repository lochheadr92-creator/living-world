# Invalid observer run — preserved for diagnosis only

This first version-30 trace called `generateOptions(world, person, true)`. Its third
argument collects options; it does **not** enable read-only observer mode. A real
decision planner may update a commitment's `blockedAt`, and this runner did so.

The run exits 1 with purity/twin/continuation failures. It is **not accepted as an
observer-pure natural demonstration**, and it does not establish a game-inspector
purity defect. `markBlocked` already respects `ctx.observer`; the actual inspector
already supplies the fourth argument. This is an instrumentation error.

Both verification runners now use `generateOptions(world, person, true, true)`.
`tests/observer_planning_mode.test.ts` verifies a sensitive blocked-promise case and
distinguishes observer reads from legitimate decision writes. The corrected repeat
is in `../2026-10-26-layout-v30-observer/`; use that result instead.

No production promise rule was changed, and no extra rules generation was introduced
to repair a measurement script. The earlier rules-29 runs reported zero differences
against their twins in their sampled workloads; this correction prevents the latent
instrumentation error from affecting future promise-bearing trajectories.
