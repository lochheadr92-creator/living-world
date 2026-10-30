# Batch plans name the recipe their tools make available — rules 60

Owner programme: WS6/7 in [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Predecessor main `1448583`
was rules 59; immutable ordinary and active-cart continuations were recorded before this change and committed at `f3b9fb1`.

## Reproduced cause and bounded change

`batchWanted` and `stageBefore` selected the first feasible recipe in the recipe table: hewing before sawing. The ordinary
supply planner already suppresses hewing when a saw is held or remembered on the chosen workshop's rack. A cart plan could
therefore name `operate:<yard>:hew_planks` while only `operate:<yard>:saw_planks` existed. The plan's nudge and explanation
did not apply to the available precursor. The initial regression failed with expected `operate:5:saw_planks`, actual
`operate:5:hew_planks`; offered-saw and suppressed-hew assertions both passed first.

`production.ts preferredRecipeForTools` owns that existing preference. Supply uses the extracted, equivalent predicate;
`batch_plan.ts` reuses it for initial and precursor recipes in rich worlds from rules 60. No priority, pressure, weather,
capacity, patience, reservation, access, knowledge or action-validator threshold changes. No new saved state or protocol.
Lab ablation `rich-no-batch-recipe-choice` restores the old plan recipe choice only. Rules 59 and earlier keep it exactly.
An already running precursor remains the recipe resumed; no paid inputs/progress are converted to a different recipe.

The cart's absence in ordinary worlds is not attributed solely to this mismatch. The rules-59 forest time trace had 17/60
eligible cart-step samples, 2/60 ranked first, one marked start and expiry. At some samples the intended hewing recipe did
exist. Weight, fleeting demand, tool acquisition, source availability and competing plans remain separate questions.

## Physical and rendered verification

Six contract tests cover preferred primary/precursor recipes, rules-59/ablation preservation, personally remembered rack
equipment, a lost tool followed by a feasible precursor alternative, actual execution rejection when the saw disappears
during travel, and the physical chain through interruption/save/use. The narrow chain starts with labelled staged tools,
raw timber, handles and a heavy site requirement; actions are explicitly selected from legal engine offers.

The running page completes two sawing batches, producing four planks from six wood (the remaining wood is consumed by
the cart); drinks its carried water after an imposed interruption, resumes the same job across an exact same-browser
save continuation, builds one household-owned cart, sleeps, hauls **14 stone**, and consumes **3 stone** in construction.
The site remains unfinished and truthfully reports its missing 10 wood/26 stone. Nothing is created to complete it.
Conservation holds. Browser report: `autonomy_evidence/batch60-rendered-final/report.json`, **7/7** checks, no exceptions.
Screenshots were visually inspected: the sawing posture/workshop, loaded moving cart, grounded delivered stone and partial
site are visible; the panel names the plan step and marks these choices as selected externally. This is staged mechanism
and rendered-state evidence, not spontaneous adoption or human usability evidence.

Visual review found a separate presentation defect: the person panel used the activity's zero duration instead of the
workshop job's progress, showing **0%** during work at **7/60**. `inspect_work.ts workshopProgress` now reads the matching
current job only during work; `inspect.ts` uses that read-only value. A fresh rendered image displays **12%**. The failed
0-versus-0.1166667 regression and its repaired save/purity check distinguish this from a behavioural change. Inhabitant
protocols 21/22 retain their own observation format; no historical transcript was changed.

Two fixture assumptions failed during development and were corrected without weakening the contract: a fully hydrated
person legally offered no drink, so the explicit drink-break case starts mildly thirsty with carried water; after assembly
the immediate cart trip was unavailable until the offered sleep was completed. Real sleep was added rather than changing
time, weather, energy, action eligibility or safety rules.

## Known next physical failure

A new negative test, still on rules 60, breaks a required saw after work starts. The next tick advances the job from **7**
to **8.4** despite the tool being gone. `workJob` revalidates technique but treats a null required tool as unassisted work.
The resume offer also bypasses the missing-tool branch because it returns from the busy-workshop path first. This is a
separate execution/recovery defect to address after pinning rules 60, not covered up by the successful travel-loss test.
Retain the paid job and inputs, stop work truthfully, connect replacement acquisition and resume through normal costs.

Ordinary occurrence, full-suite results and any later revisions are recorded in the programme register with their exact
source manifests. No aggregate effectiveness claim is made by this change.
