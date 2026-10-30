# Bounded production prerequisites — rules 69

Rules 69 connects personally wanted workshop goods and forged tools to a saved prerequisite graph. The visible journey is
worn axe → charcoal firing → iron smelting → forging → collection. Ordinary actions do all the work; the graph creates no
goods, knowledge, access, technique or remote reservation. Needs, interruptions, travel, costs and capacity still apply.
Rules 68 was pinned at `42e0b9e`, from runtime `2eb6ebf`, before this change. Historical expected files were not regenerated.
This delivers the production portion of A3/A4/A5; household rounds, general meetings, routines, coordination and AI intention
proposals remain open in the programme register. It does not close the full prompt.

## Cause, owners and existing modules touched

The old batch intention represented one workshop with at most one precursor there. Its planning was separate from ordinary
production search, and forged tools were excluded from sustained batch intentions despite existing worn-tool demand.
`project_compile.ts` derives bounded prerequisites from remembered workshops, stock, techniques and raw sources.
`project_step.ts` identifies the next physical prerequisite and records progress only during ordinary decisions.
`project_graph.ts` owns the declarative schema, recipe/structural validation and viewer explanation.

Existing owners remain: `batch_plan.ts` adopts, continues and concludes the intention; `production.ts` offers existing actions;
`options_work.ts` connects missing hand tools to crafting; `act_resource.ts` and `act_build.ts` revalidate project status and
competing allocations before input transfer/consumption. `act_misc.ts` permits a bounded full-energy firing wait and ends it
on cancellation or the personally expected completion time. Useful work can still outrank waiting.
The existing intention-hook boundary avoids importing production implementation back through `intent.ts`.
`types.ts`, `save.ts`, `world.ts` persist, validate and fingerprint the graph; `inspect.ts` shows its real chain and uncertain
work/firing estimate. `scripts/lab/lab.ts` provides `rich-no-project-plans`. No network or model is needed.

## Bounds and limits

- Maximum 32 nodes, depth 6, 96 search/validation visits, quantity 24, four alternative recipe names and eight recorded changes.
- Three reconsiderations at least 240 ticks apart when a remembered prerequisite becomes blocked. Current personal knowledge
  is recompiled; only this plan's own carried allocation is restored. Three failed reconsiderations end the intention.
  Existing failure-count and three-day batch deadlines remain.
- Each firing wait lasts at most 240 ticks and remains interruptible. It uses remembered timing, not unseen workshop truth.
- Claims cover the current input trip. Stock is believed available, not globally allocated. Actions check actual access/goods.
  Work/firing estimates exclude travel, skill, contention and interruption; they are not promises.
- Repeated ingredients may appear in separate branches. This is bounded feasibility, not an optimal aggregate schedule.
- Losing the primary workshop can end the existing batch plan. Universal alternate-workshop recovery and every goal family
  are not claimed. Succession derives a fresh same-item graph from the successor's own knowledge.

## Evidence

`tests/project_compile.test.ts`: 14/14: pure deterministic compilation, missing personal knowledge/procedures/input,
unseen-stock isolation, known-output reuse, cycles, unreachable nodes, size/depth/quantity/recipe/progress bounds.
`tests/project_production.test.ts`: staged known supplies/procedures/worn axe, autonomous adoption through charcoal,
transport, smelting, forging and collection, exact full-save continuation and conservation. A separately staged construction
need selects an actually offered wood trip: the new axe gains wear and wood is collected. That last selection is not autonomous.
`tests/project_recovery.test.ts`: final 16/16: old rules/lab removal, observer purity, invalid saves, lost-stock recompilation,
three failed reconsiderations, delivery cancellation/promises/lost goods, and a real full-energy firing wait with save and
cancellation. The retry-count test explicitly advances a decision-boundary clock, not an ordinary physical journey.
Two final cases stage a freshly compiled hand-tool prerequisite, then prove actual crafting and rejection of a later promise,
with exact continuation and conservation (`autonomy-project69-craft2.log`). These were added after the full suite below.

Full suite: **245 files / 1,643 tests passed**, 150.24 seconds (`autonomy-project69-full-tests.log`), including the wait test.
After arranging new imports with existing import blocks, focused checks: **30/30 in four files**, including immutable rules 68
(`autonomy-project69-reviewed.log`). Typecheck/build passed; the 962.06 kB bundle retains the large-chunk notice. Diff check passed.
Rendered check: **7/7**, `autonomy_evidence/project69-rendered-inspector/report.json`. Adoption, paid firing, iron, forged axe,
actual selected use, inspector explanation and no browser exceptions. Adopted/firing/use and scrolled-explanation images were
visually inspected. The firing stage has exact saved continuation. The earlier six-check render remains in `project69-rendered`.

Fixed fresh Normal worlds, immigration off, no staged supplies or selected actions (`scripts/project_observe.ts`):

| Seed | Days | Living-person samples | Observed projects / starts | Pure samples | Exact twin / conservation | Seconds |
|---|---:|---:|---:|---:|---|---:|
| meadow | 5 | 2,800 | 0 / 0 | 100 | pass / pass | 57.02 |
| river | 5 | 2,800 | 0 / 0 | 100 | pass / pass | 23.71 |
| forest | 5 | 2,800 | 0 / 0 | 100 | pass / pass | 21.28 |

Reports/saves: `autonomy_evidence/r69-{meadow,river,forest}-5/`, each with source manifest, unchanged-source check and 170-second
budget. Import placement alone changed between the first two and the forest run; focused checks passed afterward. Meadow
shared the machine with the full suite, so timings are not a benchmark. Plans are sampled every 120 ticks and very brief ones
may be missed. **Ordinary activation, productivity, welfare and mature-world benefit remain unproven.** Long validation remains
owner-run under `AUTONOMY_VALIDATION.md`.

## Review findings and retained failures

1. The initial import cycle prevented handler initialization. Fixed through existing batch hooks; failed log
   `autonomy-project69-first-chain.log` is retained.
2. The first chain made charcoal and iron but abandoned known handles because the old check accepted only raw sources.
   Fixed through project-specific acquisition knowledge; ordinary historical checks remain. Failed log `autonomy-project69-chain2.log`.
   Finished workshop output uses ordinary collection permission, not a raw-material flag.
3. Primitive possession must not complete a forged-axe goal. Completion checks actual tier-one tool records.
4. Cancelled goals and newly promised materials must not be transferred/consumed. Execution guards remain active when the lab
   removes planning offers. Delivery races prove this; hand-tool crafting uses the same allocation guard.
5. Initial malformed-save tests assumed row arrays; saves use packed data. Tests now serialize malformed graph fields through
   the real serializer and assert rejection by the loader. The failed log is retained.
6. Full-energy rest would end a firing wait after one tick. The bounded wait now has an explicit expected-time/cancellation
   condition, verified through saved continuation.
7. The first hand-tool fixture failed compilation because the pack could not accept its intended stone. The fixture now uses
   an explicitly lighter accounted load and asserts actual stone receipt; capacity rules were not changed. Failed logs retained.

A duplicate dev-server launch exited on its strict occupied port; the original server was preserved. No dependencies or
lockfiles changed. Local evidence and the prompt archive are not committed.
