# Revising a personal production quantity

Owner: `src/sim/project_revision.ts`. This extends the installed inhabitant seam
with one bounded revision: change the quantity of an existing personal production
plan, keeping its item and quality. It does not implement general goal families or
cross-goal composition, and is never called without an installed controller.

The request names the person's own active batch plan and a whole quantity 1–24.
The engine refuses malformed, unchanged, missing, expired, failed, site-delivery
and cart requests, critical needs/danger/children, current or paused physical work,
unknown prerequisites, an outstanding retry wait or exhausted reconsiderations.
Cart plans remain single carts; revising a private quantity cannot renegotiate a
site obligation. Refusal leaves the saved world unchanged.

A successful revision recompiles through the existing personal-knowledge planner,
crediting that plan's own reserved input. It keeps identity, birth time, deadline
and recorded paid work. Real inventory/workshop stock supplies progress; new graph
node numbers are not credited with old execution. Bounded earlier history is kept
as explicitly prior-graph history at the new root, with its original tick. Current
step reservations are refreshed through their ordinary owner. No goods, entity ids,
claims, permissions or knowledge are granted. All physical work remains the
engine's existing offered actions and execution checks.

The revision uses one of the existing three project reconsiderations and their
240-tick spacing. It cannot reset that budget or extend the plan's deadline. A
visible plan-history entry describes the old and new quantity. The decision owner
rebuilds options after revision before choosing the immediate ordinary action, so
an obsolete quantity cannot start a superseded step.

Protocols 33/34 and observation 18 expose own saved revisable plans and the strict
`revise` answer. A revision cannot simultaneously choose, propose or set action
limits. Notes still follow the existing memory protocol. Transcript calls record
revision and subsequent physical outcomes separately; replay calls no model.
Protocols 31/32 retain observation 17 and have no revision offer. No simulation
rules version, saved graph schema or lab switch changes: the installed seam alone
can invoke the operation. Uninstalled ordinary equivalence is checked separately.

## Verification and limits

Core, inhabitant, protocol, memory, old recordings and immutable-113 checks pass
40 tests across 10 files before the additional retry-timestamp review correction.
Typecheck/build pass with the existing Vite warnings. The pre-revision source had
no revision module/API; the initial test collection failure establishes a missing
capability, not a reproduced runtime defect.

The labelled staged rendered check passes 8/8. Hana revises four planks to two,
uses three actual wood, physically collects both planks and completes the same
plan at tick 948 before its original deadline 7200. Screenshots were inspected;
the plan and carried goods are visible. Exact transcript replay, reload, material
accounting and observer purity pass. This is a scripted controller with supplied
workshop/tools/knowledge, not a real-model or ordinary adoption claim.

An initial 900-tick integration window was unfinished: production had succeeded,
but only one plank fit before drinking freed capacity for collection of the second.
That log is retained. The test now observes the existing original plan deadline,
without changing capacity, needs or the deadline, and records actual completion.

Fresh review found that `retryAt` is the last reconsideration timestamp, not its
expiry. The first revision implementation could bypass the 240-tick spacing. The
valid-last-attempt contract failed, and the in-progress full suite was stopped;
it is not counted as verification. The corrected boundary measures elapsed time
from the last attempt and stamps a successful revision as a new reconsideration;
the unchanged 240-tick constant is shared with ordinary batch recovery. The
corrected core/old-recording/immutable-113 run passes **10 tests / 3 files**.
Build/typecheck and the final rendered run pass again. Full regression and three
five-day uninstalled comparisons subsequently completed on frozen corrected source.

Immutable older-protocol evidence: `tests/protocol31_32_revision_predecessor.json`
was captured on unchanged main `e64789d`, before revision support. Both protocol
31 and 32 transcripts replay to their exact final hashes. Never regenerate that
record on successor source. No claim is made about general project revision,
cross-family composition, real-model decisions or aggregate world benefit.

## Final verified checkpoint

Runtime `9425ac3`. The first completed full run had 355 passing files / 2,278 passing
tests and one current-observation assertion still pinning 17. It was corrected to
18; historical protocol-31/32 assertions remain 17. Focused 13 tests / 3 files pass,
then the full suite was rerun end to end: **356 files / 2,279 tests passed**,
332.66 s (`autonomy-project-revision-full-verified.log`). No unresolved failure is
being carried as "likely fixed". The existing timeout-overflow warning is retained.

The final rendered run passes 8/8 and its screenshots were inspected. All three
five-day Normal river/meadow/forest worlds with no controller installed match the
pre-revision rules-113 saves **byte for byte**. Each also has 100 pure checks,
exact unobserved twins/reloads, conserved items, 28 alive and no deaths. Reports and
SHA-256 comparisons are in `autonomy_evidence/revision-uninstalled-final-*-5`;
full saves remain local. This supports the unchanged autonomous semantics and no
rules bump; it is not evidence of ordinary autonomous revision or broad welfare.
