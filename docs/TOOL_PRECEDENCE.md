# Required workshop tools before convenience tools — rules 64

The production planner records one missing tool for the existing borrowing, material gathering, crafting and private
tool-plan paths. Before this change, its first missing tool always stood. In the reproduced case a household site wants
planks and the person also wants a cart. Sawing names a missing saw first, although hand hewing can make the same planks.
The cart then names its indispensable hammer, but cannot replace the optional saw. Both blockers were truthful; the
single prerequisite carried into the later planning passes was the wrong one.

Rules 64 marks the derived tool fact as required when no other recipe for that wanted product at a known, accessible
workplace has both its needed procedure and tool available. A required tool displaces an earlier convenience; equal
priority keeps the existing demand order. The test is about a known alternative, not a guarantee of inputs, route,
capacity or successful work. The same execution checks still apply. A partly completed owned batch requires its actual
recipe's tool, even when a fresh batch could use another recipe: its paid materials and progress cannot be converted by
planning. The quarry's pick remains optional under the existing recipe, including when no loose-rock source is known.

The engine still chooses among eligible actions. No priority weight, need threshold, inventory capacity, recipe cost,
access rule or resource source changes. The derived `Ctx.toolWanted.required` flag is not saved. The isolated lab switch
`rich-no-tool-precedence` restores first-tool semantics. Historical rules 63 and earlier retain their original choices.
The immutable rules-63 reference was recorded in `b824caa` from `af357ee` before this change: ordinary meadow, active
food-care recovery and simultaneous plank/cart demand, with uninterrupted and saved continuations.

## Provenance and scope

The diagnosis and required/convenience rule adapt `c4ba75b80b9c97ac3a13a80f258e8424484c632b` from the concurrent
`ccr-8527b59e-oatizp` branch. That branch calls the change rules **59**, already used here for cart-plan order. It also
contains `c9c5dcf` (keeping a running activity's target in generated candidates), called **60** there and not integrated
by this slice; main 60 means batch-recipe choice. Neither branch's saves may be relabelled. The source branch was inspected
at `be786a8`; this is a bounded adaptation, not a merge of its version declarations or evidence as our own results.

Existing owners changed: `production.ts` derives precedence and preserves paid-batch recovery; `optutil.ts` carries the
derived fact; `options_work.ts` connects the already offered craft action to its known workshop purpose; `rulesversion.ts`
declares 64; the existing lab registers its removal. `scripts/observers/tool_demand.ts` is measurement only, used by
`autonomy_observe.ts --tools`; it restores the temporary lab switch in `finally` and never makes a decision.

## Contract and viewer evidence

`tests/tool_precedence.test.ts` covers the 63/64 boundary, isolated removal, crafting/visible borrowing, reserved inputs,
actual remembered rack equipment, optional quarry tools, paid-batch loss, the physical chain and unknown-source failure.
`tests/tool_demand_observer.test.ts` checks full saved-state/RNG purity and a subsequent 1,200-tick autonomous twin.
The physical chain uses externally selected legal actions: one gathered wood and two stone become a hammer; staged
workshop components become a cart; after actual rest and any offered need relief, the cart moves 14 real stone to the site.
Mid-craft save continuation is exact and material/tool ledgers balance. This is staged execution, not ordinary adoption.

The first rendered check found a real explanatory gap: an earlier generic crafting offer survived deduplication with
the purpose "to work faster", hiding the already known handcart prerequisite. The repair retains that offer's ordering,
utility and builder, but attaches the specific known purpose to the option and resulting action under rules 64. It
does not reconstruct a motive later from the viewer's world knowledge. The first failed report and screenshot remain
in `autonomy_evidence/tools64-rendered`; the final rerun passed **8/8** at
`autonomy_evidence/tools64-rendered-final`. Actual screenshots were inspected: hammer work names "to begin building a
handcart", the cart's paid work shows real progress, and its 14-stone load and later delivery are visible. The negative
snapshot shows that absent personal source knowledge does not create a tool; it is not a long-horizon abandonment test.

Fresh review also corrected two test assumptions, without changing the production rules to satisfy them: the actual
quarry recipe does not require a pick, and this shorter preparation gathers only one wood, so it has neither a spare-wood
haul nor an immediate drinking need. Tests follow the actual offers and preserve material costs. Earlier failing logs
are retained locally.

## Current verification and ordinary measurements

Final explanation/observer/tool/legacy regressions passed **17 tests / 4 files**; typecheck and build passed. The build
retains the known Vite import warnings and a 937.46 kB bundle-size warning. The first full run passed **1,546 tests / 232
files** in 298.76 seconds before the explanatory-purpose fix; the final full rerun passed the same **1,546 / 232** in
303.94 seconds (`autonomy-full-tests64-final.log`). Historical continuation references and goldens passed unchanged.
Tool-displacement samples are repeated observations of the
same state with precedence removed, not independent opportunities or alternate simulated trajectories. Actual craft
starts/endings are retained separately. No aggregate benefit or ordinary cart completion is inferred from the staged chain.

The current-source Normal meadow run, immigration off, reached day 45 in 169.21 seconds; all 900 serialized state/RNG
purity checks and daily/final resource checks passed. Its 26,410 living-person samples contained 1,585 missing-tool
facts, 192 required ones and **57** replacements of the earlier tool (Jonas #1032: 13; Vik #1036: 44). None of those
57 samples offered an immediately eligible hammer craft. Nine hammer crafts started across the world and five finished;
those totals must not be attributed to the precedence repair. The final population was 31 and carts remained zero.

All three current-source Normal seeds reached 45 days, immigration off. River stopped honestly at 97,080 ticks under
the 170-second budget and continued from that unchanged save for 10,920 ticks (18.68 seconds). Forest reached the horizon
in 129.02 seconds. Each complete seed has 900 pure observation samples and passing daily/final conservation checks.
Source manifests remained unchanged. Reports are `autonomy_evidence/r64-{meadow,river,forest}`, plus `r64-river-tail`.

| Seed | Living-person samples | Missing tool / required | Old tool displaced | In those samples: craft offered / eligible / ranked first | Actual hammer starts / completions | End population / carts |
|---|---:|---|---:|---|---|---|
| meadow | 26,410 | 1,585 / 192 | 57 | 0 / 0 / 0 | 9 / 5 | 31 / 0 |
| river | 25,732 | 1,551 / 131 | 12 | 0 / 0 / 0 | 8 / 3 | 25 / 0 |
| forest | 18,956 | 746 / 86 | 29 | 11 / 11 / 0 | 12 / 8 | 13 / 0 |

No samples or craft events were omitted. River's displaced samples involve Basil #1138 and Jax #1145; forest's involve
Jax #928 and Isla #929. Forest Isla has one wood and two stone at tick 22,320 and an eligible hammer craft, but ongoing
material gathering ranks ahead of it. She later starts a hammer at 24,900, is interrupted at 25,022, restarts at 26,293,
and finishes at 26,409. Its recorded purpose then is generic work, so this is not a claim that the priority repair caused
completion. Meadow Sven #1000 starts a hammer explicitly for a cart at 49,026 and completes at 49,126, consuming one wood
and two stone, but already held a saw, so the precedence conflict was not his immediate obstacle. No cart follows in
these horizons. Aggregate welfare, production and leisure benefit remains unproven.

## Next diagnosed transition, not implemented here

`scripts/kept_target_diagnostic.ts` reproduces a rules-64 journey being undervalued when its still-stocked source falls
outside a generator's top-two cut. Hana actually walks from (40.5, 40.5) to about (39.83, 51.69) over 86 ticks, discovers
two closer trees through normal perception (last seen at 1084), and switches at 1086 from `gather:5` to `gather:6`.
Her old source is still believed to hold eight units, but its option is absent, so `decision.ts currentUtility` assigns
zero. Observation is pure and conservation holds. Output: `autonomy_evidence/kept-target64-physical.json`.

The first draft reused a candidate fixture's `pin()` and therefore waited in place; its local log is retained as
`autonomy-kept-target64-diagnostic.log` and is not evidence of 85 ticks of walking. The corrected diagnostic retains the
external selection only during the actual initial walk, then releases it before ordinary review. Future implementation
must pin 64 first, adapt `c9c5dcf` at the next unused main rules version, and test real motion, valid/invalid sources,
water and stores, urgent interruption, bounded candidates and exact continuation. Its candidate tests include a silently
skippable water case and a danger-labelled case without actual danger; those are not adequate acceptance evidence here.
