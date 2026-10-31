# Informed living-worker handover

## Current-source audit and intended contract

Rules 92 owns personally communicated work in `continuity_knowledge.ts` and
death succession in `succession.ts`. Rules 93 owns physical estate custody.
Neither implements consent to cover a living worker's undertaking. The existing
`share_work` acknowledgement explicitly makes no takeover promise. This document
records the next implementation contract; the mechanisms below are not yet delivered.

`responsibilities.ts` already identifies personal incapacity from injury or a
substantial illness and owns practical childcare/fire requests. `relocation.ts`
already owns consent to leave and stay, physical packing, travel and household
splits. The handover must use those causes, rather than infer departure from absence.
`intent.ts` remains the owner of plan eligibility, material needs, step composition,
claims, completion and failure. Its successor-plan factory can construct a new
personal plan from a communicated undertaking without copying the old plan's state.

The intended observable situation is an injured worker asking a household member
to cover known work, that person explicitly accepting or explaining a refusal,
physical work under their own plan, and a later conversation returning responsibility
after recovery. A departing worker may make the same request to a member staying
behind under the existing relocation agreement. A death is not treated as recovery.

Constraints for the implementation:

- An actual conversation supplies the undertaking and stated reason, with separate
  hearing and answering phases. Both require awake physical contact. Interrupted
  speech cannot transfer responsibility.
- The listener decides from their own needs, current projects, eligibility and dated
  place knowledge. Existing promises remain their original holders' obligations.
  Refusal must retain the actual reason without inventing bad faith.
- One accepted continuation replaces the original worker's active responsibility.
  Competing later proposals cannot duplicate it. Material claims release; inventory,
  tool identity/ownership, procedure knowledge and physical site progress stay put.
- A fresh personal plan uses the existing bounded plan rules. Missing known materials,
  a completed goal, urgent needs and interruption remain legitimate outcomes. No
  distant progress or private plan is read to make somebody's decision.
- Recovery does not silently move responsibility back. An informed conversation must
  convey the current outcome and agree handback. A completed or failed helper plan
  must be reported as such. The helper's progress must not be credited to the original.
- Live agreement records and their causal links must survive save/load. Retention is
  bounded, with active records protected from history trimming. Old rules keep their
  previous meaning, and a lab removal must be available.

Required evidence includes acceptance, refusal, interrupted phases, two competitors,
actual useful work under a retained plan, recovery/handback, departure to a staying
member, already-completed work, missing materials, unchanged goods/skills/promises,
save continuation, observer purity, legal AI action replay and rendered explanations.
Ordinary occurrence and household viability are separate measurements; no staged
success closes those programme rows.
