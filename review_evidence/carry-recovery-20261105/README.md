# Rules 157 — care hand-overs and carrying space, 5 November 2026

Brain implementation list, row 2a item 2 ("recover from insufficient carrying space during food/goods exchanges").
Starting evidence: the other agent's rules-154 meadow trace (`review_evidence/villager-age-carry-20261104/`, Abel offers berries
to Bea, whose pack has 0.5 of 12 free; no goods move) and the Brain's life-stage follow-up (Alma's failed grain hand-over to
Zed recovered through the rules-63 household-store fallback, but Zed was not seen eating that grain).

## Diagnosis (ordinary, rules 156)

`exchange-room-probe.ts`: four Normal worlds with arrivals on (forest, river, meadow, and the other agent's `life-stages-6`),
10 days each, read-only hooks and log scan; every run's exact twin and conservation check passes.

- **Cross-household gifts:** none failed (23 received, 0 empty). The Abel/Bea case is real but rare. Abel and Bea are in different households, so the same-household care fallback cannot apply; Bea was walking home to eat.
- **Care hand-overs:** 59 failed with "they had no room to carry it", against 144 that succeeded. **All 66 recorded room failures (care and promise) had a recipient already carrying food.** 59 were care hand-overs to children, mostly holding household-stock berries in a 5-weight pack.
- **What the full-pack memory caused:** rules 63 sent the carer to leave food at home 6 times, and the intended recipient took none of it within 2,400 ticks.
- **Conclusion:** carrying capacity is not the problem; no capacity change is made. The carer could not know about the pack, or could see it but the existing check only applied to a non-thirsty dependant.

## Rules 157 (`src/sim/handover_outcome.ts`)

- **An empty hand-over says why**, from what the giver sees at the hand-over:
  - "I no longer had what I was bringing";
  - "they already have food with them" (care only);
  - "they had no room to carry it".

  Gift receipts are split the same way. Only the last outcome keeps the rules-63 full-pack memory and household-store fallback (preserved: `tests/handover_outcome.test.ts`, the wood-and-seeds full pack).
- **Food is not brought to a dependant seen holding food**, thirsty or not. Water still is.
- **Out of sight**, a dependant last reached holding food is not set out for on food alone for 600 ticks. Seeing them again decides afresh.
- **In every case**, the carer records a truthful blocked reason.
- **Nothing is moved, created or lost by the rule.**
- **Lab removal:** `rich-no-handover-truth`.

## Attempts (all retained)

1. `r157-attempt1-no-memory/`: truthful endings only. Pointless deposits fell 6 → 0, but carers came back within 600 ticks (26 repeat trips).
2. `r157-attempt2-memory-only/`: added the out-of-sight memory. **Identical results**: it never fired. The path files (`meadow-r157-paths.*`) show every repeat was the roaming care option deciding *in sight*. The cause was the old check `seenNow && !thirsty && carrying food`, which pressed food on a thirsty dependant holding food.
3. **Final**: food is withheld from a dependant seen holding food, thirsty or not.

## Ordinary effect (single trajectories, rules 156 → 157)

| World | Care failed | Care succeeded | Already-has-food endings | Home deposits | Alive |
|---|---|---|---|---|---|
| forest | 17 → 6 | 45 → 30 | 0 → 0 | 1 → 0 | 28 → 28 |
| river | 9 → 7 | 27 → 32 | 0 → 0 | 2 → 0 | 29 → 29 |
| meadow | 38 → 4 | 36 → 25 | 0 → 0 | 1 → 0 | 30 → 31 |
| life-stages-6 | 17 → 5 | 36 → 15 | 0 → 0 | 2 → 0 | 32 → 31 |

**Children's hunger** (`hunger/`, sampled every 60 ticks; exact twin and conservation hold in all eight runs):

| | Rules 156 | Rules 157 |
|---|---|---|
| Child samples below 25 | 69 | 73 |
| Below 10 | 19 | 18 |
| Child deaths | 0 | 0 |

By world, below 25: forest 17 → 31, river 0 → 22, meadow 3 → 5, life-stages-6 49 → 15. This shows no measured harm and no benefit claim.

## Found while checking harm, not caused by 157

`hunger/low-children.ts` (river, rules 157). Eli, a child gathering to eat, catches a fish at hunger 8 and keeps fishing, reaching 0, for about 300 ticks before eating. A berry-picking case at tick 14,460 shows the same pattern. Under rules 156, a carer who sees a non-thirsty child holding food also skips them, so this is a pre-existing self-feeding gap in hunger gathering, now less masked. It is queued as its own diagnosis.

Retained mistakes:
- `low-children-river-157-attempt1-inv-reference.json` stored inventory references and showed end-of-run inventories;
- `eli-options-9120-attempt*` read a state that never held food.

## Verification

- **Contract tests:** `tests/handover_outcome.test.ts`, 7 tests. They cover:
  - the already-has-food ending;
  - the preserved full-pack fallback;
  - the giver-lacks ending;
  - rules 156 and lab-removal equivalence;
  - pure classification and save continuity;
  - the bounded out-of-sight memory;
  - water only for a thirsty dependant seen holding food.
- **Immutable v157 reference:** meadow, recorded while 157 was current.
- **Full suite** (`../agent-20261105-157/suite/`): exit 1, 2,882 of 2,893 pass. The 8 failures are the same spawn and long-test timeouts seen at 156, plus a 10 s hook timeout in the retention test. All six affected files pass alone: 14 of 14, exit 0 (`../agent-20261105-157/isolated/rerun.log`). These lab spawn tests now time out in every full run on this machine and are worth a dedicated look.
- **Rendered check, ordinary world** (`render.mjs`, `render/`): the rules-157 meadow world, Hal (40) at tick 511, debug panel shows "Care for Abel — is carrying food already". Pure, with no exceptions.
- **25-day screens** (Normal, arrivals on): forest, river and meadow each reach the horizon, with 500 pure checks, exact continuation and conservation.

| World | Deaths, rules 156 | Deaths, rules 157 |
|---|---|---|
| forest | 26 (child 7) | 26 (child 8) |
| river | 2 | 2 |
| meadow | 1 | 5: Felix 75, fever; Pavel 73, hunger; Dax 35, hunger; Ivo 45, fever; Wes 7, fever |

None of the meadow dead held food at death, so the rule (which withholds food only from someone holding it) could not have applied to them. These are single diverged trajectories, recorded without a benefit or harm claim.
