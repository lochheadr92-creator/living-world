# Proposed projects — AI bounded goal proposals (A16), protocol inhabitant/31 and /32

Delivered 31 October 2026 on `main` after rules 107. Programme row A16 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md): "a versioned schema for goal proposals, stale/unknown/
cycle/repeat rejection, no partial unauthorized mutation; autonomous network-free same capability; no observer-only
secrets." Owner: `src/sim/proposals.ts`. This is a controller seam like `external.ts`, not a rules version: with nothing
installed the autonomous world is byte for byte unchanged (the goldens and the rules-107 reference prove it), so no
reference was re-recorded and no lab switch exists.

## What was missing

The AI inhabitant (`docs/INHABITANT.md`) could only pick one of the options the engine offered. The planner that
compiles a bounded production goal from a person's own knowledge (`project_compile.ts`, rules 69) existed, and the
autonomous person adopts such goals from the planner's own wants (`batch_plan.ts batchWanted`), but nothing let an
outside controller name a goal of its own.

## Contract

- **One more thing the controller may do.** `ExternalChoice` gains `{kind: 'propose', goal: {item, quantity, tier}}`.
  The engine validates it, in order: shape (`projectGoalError`: known item, quantity 1–24, tier 0/1, tier 1 only for
  a tool); the rules run production projects (69+, rich); not a repeat (no active batch making the item); feasible from
  the person's own knowledge (`compileProject`, which already refuses unknown ways, cycles, exceeded depth, nodes and
  search budget); a workshop recipe at the root (a thing already held, simply fetched from a known place, or made by
  hand is no project); then the ordinary adoption gates (`intent.ts adoptProposedBatch`: an adult, nothing actually
  wrong, the plan cap, one project at a time, never a second batch, the one-a-day batch cooldown).
- **Adopted means the ordinary plan.** The intention is made by the very code the planner's own batch uses
  (`makeBatchIntention`, lifted out of `adoptProject` without changing it), with reason "proposed from outside". Its
  steps are the engine's own offers from the next decision, judged and executed as for anyone; the proposal itself
  creates no goods, knowledge, access or reservation. This moment's action is the engine's own choice, notified as
  `{kind: 'proposed', goal, planId, activity}`.
- **Refused means nothing written.** Validation is pure until adoption; a refusal is notified as `rejected` with the
  reason (key `propose:<item>`) and counts as one of the bounded retries, after which the engine chooses.
- **Protocol 31/32, observation 17.** The observation gains `canPropose` (the outputs of recipes at workshops the person
  knows of, from their own beliefs only; knowing a workshop is not feasibility), and the prompt names proposing only
  when the observation carries it, so every older prompt and recording is unchanged. The answer is strict:
  `{"propose": {"item", "quantity"?, "tier"?}, "why"}`, never both `choose` and `propose`. A `propose` answered under a
  protocol below 31 is a fallback ("this protocol does not take proposals"). The transcript records the choice and a
  `proposed` result with the plan id; replay re-validates and stops on any difference (a tampered quantity is caught).
- **Repeat control.** The scripted proposer that proposes again after its plan ended is refused on the ordinary
  cooldown and the other gates; all refusals are recorded with their reason.

## Evidence

Staged (`tests/inhabit_proposals.test.ts`, 4 tests) on the rules-99 cart scene with its heavy site demand declared
small, so the planner has no cart want of its own and only a proposal can start one:

- eight malformed or infeasible goals are refused with their reasons and the save is unchanged; a cart is adopted as a
  batch plan with its compiled graph; a repeat and a second batch are refused; below rules 69 nothing is proposable.
- through the controller seam, a refused proposal then an adopted one in the same decision; the engine's own action is
  started; the plan's steps are offered next; save valid, conservation holds.
- through the protocol with the scripted proposer: inhabitant/31, observation 17, one `proposed` call, three plan-step
  picks (planks twice, the cart), the cart built and owned by the household with four planks consumed; exact replay
  with no model; a tampered quantity diverges; later repeat proposals refused on the recorded gates.
- an older observation shape carries no `canPropose` and its prompt never mentions proposing; the strict answer shape.

Existing inhabitant suites updated only for the new protocol and observation numbers. No ordinary-world claim: the
seam runs only with a controller installed, and no real-model run was made.

## Limits

Proposals are production goals only (the batch plan family); other goal families, revision of an adopted goal and
composition across goals (A3) remain open. The engine, not the model, chooses the action at the moment of proposing.
