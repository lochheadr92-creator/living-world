# Villager age and carrying investigation — 4 November 2026

> Publication note, 5 November 2026: this is preserved rules-154 evidence. The historical coordination and proposed-work statements below are not current blockers. Rules 156 subsequently added child wood/stone eligibility, and rules 157 improved care-handover truth and targeting; see `review_evidence/child-tasks-20261104/README.md` and `review_evidence/carry-recovery-20261105/README.md`. Do not treat every original finding as an unresolved defect on newer rules.

Owner request: distinguish adult and child work, and address failed exchanges through realistic carrying/storage behaviour.

Status: **diagnosed; no production rules changed by this investigation**. Another active task is editing `activities.ts` and allocating rules 155 in the shared checkout. Coordination choice and age-policy preference were requested before starting a second rules-changing stream.

## Reproduction

From `C:\dev\Claude Experiment\living-world-integrate`:

```powershell
node node_modules/vite-node/dist/cli.mjs review_evidence/villager-age-carry-20261104/trace.ts
```

Uses a fresh ordinary meadow/Normal world pinned to rules 154, arrivals enabled, through tick 3450. No staged supplies or assigned decisions. `trace-verified.json` contains snapshots and the outcome. Exact equality against an unobserved twin and conservation both passed. This is a short causal reproduction, not a survival or population benefit measurement. The first diagnostic is retained in `trace.json`; the verified rerun adds the twin and accounting checks. An initial invocation used an absent vite-node entrypoint and failed before execution; the command above is the corrected entrypoint.

## Findings

1. **RUNTIME_LOGIC_BUG / missing age eligibility:** `decision.ts` already rejects children's construction, farming, crafting, fire-tending and several other action kinds. Generic `gather` is not forbidden, and fire-material gathering has a `fire` tag rather than one of the excluded tags. Abel, age five, starts wood gathering at tick 2496 and completes at 2598. The actual gather handler applies tree/rock work and injury risk. The fix must distinguish work by its physical task/source, not merely by the broad action name or translated label. Preserve food gathering and existing child learning/play; audit dangerous later-added action kinds as well. Enforcement must cover offered choices, external choices and activity execution/resumption, with older rules unchanged.

2. **EXPECTED_BEHAVIOUR in weight accounting, MISSING RECOVERY in exchange:** Abel begins offering berries to Bea at tick 3291. He has 3 berries and 1 wood (5/5 weight); Bea has 4 wood, 1 stone and 1 cutting (11.5/12 weight). A berry weighs 1, so none fits in Bea's remaining 0.5 capacity. The failed receipt is logged at tick 3365; conversation ends at 3403. Abel still has the offered berries. Nothing was lost or fabricated. A conversation success is not a goods-transfer success.

3. **Do not discard reserved goods:** Bea's active rod plan wants 3 wood and 1 stone. She has one extra wood beyond that plan, no active commitments, and remembers her household lean-to with food. She also has eligible food-at-home and food-gathering choices, so this exchange failure does not establish a starvation deadlock. Existing `leave_heaviest.ts` handles only wood/stone when a wanted raw-material gather is blocked, excludes an entire stack if any part is privately reserved, and targets storehouses/shared workplaces. It is not a general response to a failed food hand-over. `seed_storage.ts` and `care_capacity.ts` are additional bounded recovery paths, not a complete carrying policy.

## Proposed bounded direction

- Use the existing age boundaries (child below 12, youth below 16, then adult), subject to the owner's pending age-policy reply. Light chores/food gathering, learning and play remain useful child activities; heavy/dangerous work needs explicit eligibility, including teenagers' limits. Do not claim supervised work exists unless a real supervision mechanism is implemented.
- Prefer physically walking and depositing only the unreserved excess at a known, accessible store that accepts it. Keep tools, owned equipment identity, immediate food/water, plan allocations and promises protected. Deposit selection reads personal knowledge; arrival rechecks access and real capacity. Closed/full/missing storage must fail truthfully.
- Make the exchange outcome identify lack of receiver room versus unavailable giver goods. A recovery must lead to a real later transfer, not merely suppress the failed offer or grant transfer credit.
- Do not increase everyone's carrying capacity or add universal reserved slots as an unmeasured fix. Existing capacities are weight-based. Baskets/carts remain physical ways to increase carrying ability; reserving capacity for a specifically known need may be considered if storage recovery is insufficient.

## Required verification before promotion

Child/adolescent/adult eligibility boundaries; safe food/learning options retained; heavy work rejected even on resume; old-rule continuation unchanged. Full/partial/zero hand-over receipts; reserved portions retained while excess is deposited; no invented goods or overflow; real access/ownership and full-store failures; interrupted drop-off and save/replay; actual later food receipt. Follow with an ordinary latest-rules observation and keep changed trajectories separate from same-state causal reproduction. No production implementation, full suite or benefit verification has been performed by this investigation.
