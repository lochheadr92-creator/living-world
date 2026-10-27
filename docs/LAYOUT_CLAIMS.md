# Pending layout coordination and safe occupancy recovery

Owner-authorised repair, 26 October 2026; rules version 30. This addresses the Briar
audit's two accepted layout attempts for the same hut footprint before either
became a real site. It does not change the four-open-site limit or material supply.

## Ownership and alternative

`layout_claims.ts` owns execution-boundary arbitration. An accepted `plan_site`
activity carries `data.layoutClaimed`; the live activity itself is the reservation.
There is no second world-level claim registry to synchronise, migrate or prune.
Adding a separate reservation table was considered and rejected because the existing
activity already supplies its owner, footprint, household and bounded expiry.

Start order is the existing deterministic engine order. The first accepted layout
claims its footprint and the ordinary one-tile access gap. A second overlapping
layout is refused, even across households; a household cannot accept two home
layouts at different positions either. Refusal becomes an actual failed attempt,
with a recorded reason and the normal failed-option cooldown. An accepted choice
is not a promise that a site or building will exist.

This is a scheduling constraint at activity acceptance, arrival, resumption and
commit. Pending intent is not fed into the person's candidate-location search,
personal beliefs, option utilities or household knowledge. Existing engine slot
constraints and final physical validation remain authoritative. It does not assign
jobs, teach a remote source, or create a shared household objective.

Reservations do not occupy tiles or stop people walking through them. They protect
layout scheduling, not a building that has not been created yet.

## Lifecycle and recovery

Only living owners with active, unexpired activities in the recorded household hold
claims. Finishing, cancellation, interruption, death, expiry or household change
therefore leaves no ghost reservation. A conversation suspension releases the claim;
resumption must reacquire against current owners and can honestly fail. It does not
extend the original deadline. Activity metadata already round-trips through saves.

On the final layout tick the engine still checks real land, household/project limits
and access. If a living outdoor person occupies the footprint, the builder waits at
most **90 ticks** and exposes the reason in the existing activity inspector. The
absolute wait start is saved in `data.layoutWaitSince`. A person clearing the area
allows the normal full check to run again. There is no eviction, movement shortcut,
extra resource or safety bypass.

If the footprint stays occupied, the attempt fails and releases its claim. The
ordinary cooldown and location search can then choose a safe alternative. A blocked
door or disconnected route with no footprint occupant fails normally; it is not
mistaken for passing traffic. Urgent interruption and the existing activity expiry
remain authoritative. Home upgrades retain their existing in-place safety contract.

## Compatibility and verification

Rules 29 and older retain their precise old path. Before production changes,
`scripts/v29_reference.ts --write` captured SHA-256 of complete serialized river
worlds saved at 5280 and continued to 9600, with and without loading. Never rewrite
that reference to make a later rule pass. Historical saves are not relabelled.
Rules 30 fingerprints active/suspended layout footprint, ownership, expiry, claim
marker and wait start; complete save equality remains stronger than a summary hash.
Save-envelope format and inhabitant protocol are unchanged.

`tests/layout_claims.test.ts` covers duplicate household layouts, cross-household
overlap/access gaps, all release conditions, suspension/reacquisition, saved competing
attempts, ownership revalidation, honest inspection, legacy semantics, fingerprint
sensitivity, temporary occupancy, bounded timeout, alternative placement, expiry and
permanent access obstruction. The natural runner also checks every tick and accepted
layout for conflicting claims alongside unobserved-twin and save continuity checks.

Claims of success are bounded to the recorded tests and natural trace, not long-run
housing benefit, representative variety or rendered human usability. Exact validation
and the repeated Briar outcome are recorded in the implementation register and
`home_evidence/2026-10-26-layout-v30/README.md`.

Existing modules touched: `activities.ts` accepts/reacquires claims; `act_build.ts`
revalidates and waits at the mutation boundary; `world.ts` fingerprints future-relevant
layout state; `rulesversion.ts` gates generation 30. The new owned module derives the
reservation set. No planner ranking, resources, site limits or pathfinding rules change.
