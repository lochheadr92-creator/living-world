# Informed living-worker handover — rules 94

Predecessor rules 93 is published at `0ff6ceb`, runtime `6045fae`, immutable
reference `94600c4`. The implementation and its verification are recorded below.

## Implemented responsibility boundary

`handover_state.ts` owns at most two records on each existing personal relationship;
live proposals/agreements cannot be trimmed to make room for another. `work_handover.ts`
owns the actual proposal, answer, return and outcome-report conversations. Personal
injury/substantial illness is a cause. Departure is supported for the relocation
organiser, who personally heard the staying member's response during the existing
relocation agreement. Another traveller cannot infer those responses from shared state.

The existing `handover_work` legal conversation has offer, return and report forms.
Both speech phases require awake contact. Hearing supplies a dated undertaking through
the existing knowledge owner; acceptance is a later answer. Own urgent needs, existing
work, incapacity, distrust, missing known materials or ineligible remaining work can
prevent acceptance. One successful answer creates the listener's own plan through the
existing intention factory, then ends the speaker's active responsibility and releases
its private material claims. Matching suspended work stops; unrelated work and promises
remain. No goods, tools, skills, procedure knowledge or obligations are copied.

An accepted delegation blocks a second private plan of the same kind for the original
worker. The helper's execution stays subject to ordinary survival, work, travel and
failure rules. Their plan has its own identity and work credit. Completion/failure
updates only their own record; the original learns through an actual report or personal
death knowledge. Recovery alone does not reclaim responsibility. A later conversation
must communicate the helper's current undertaking and agree to a new eligible personal
plan for the recovered worker. Physical site progress remains, and helper credit stays
with the helper. Already-ended work is reported rather than restarted.

The original informational `share_work` act remains distinct. The inspector names the
handover and separately displays proposal, answer, state, cause and provenance. A work
account linked to a handover points to that agreement instead of claiming no takeover
occurred. The lab removal is `rich-no-work-handover`; old rules remain unchanged.

## Evidence and preserved failures

- A rules-93 baseline failed the injured-worker legal-offer check; ordinary healthy
  work-sharing passed. The failure remains in `autonomy-handover94-before.log`.
- Focused checks pass **34 tests / four files**, **2.70 s**: handover contracts,
  AI replay with/without notes, informed continuity and immutable rules 93. The
  handover file contains **17 tests**. The existing legal AI action seam needs no
  new free-form command or observation/protocol shape.
- Initial full runs were cancelled for inspector corrections and a reproduced
  stock-destination defect; cancelled runs are not passes. Release verification uses
  distinct `release` log/root names. The stock regression showed that an eligible
  reserve plan could name a different home store from the communicated undertaking.
  Acceptance now refuses that mismatch. The failing result is retained in
  `autonomy-handover94-store-before.log`; the focused release run includes its fix.
- The first delivery assertion failed: the declared household lacked nearby known
  relief. Ben gathered six wood, but the survival guard refused delivery for lack of
  known water; he later wandered and slept with the wood. An initial hypothesis that
  the ordinary work-pressure cutoff alone caused this was insufficient. A bounded
  delivery exception did not fix it and was removed completely. No hunger/thirst,
  work-pressure or survival-guard rule was relaxed. The unsuccessful trace and logs
  remain, and the unsupplied case is retained explicitly as a failure outcome.
- A separate supplied scene declares actual nearby shallow water and berries before
  any simulation. Initial fixture attempts omitted rebuilding the water budget and
  access cells after changing initial geography; their save/knowledge failures remain
  in `autonomy-handover94-contracts3.log` and `contracts4.log`. Correct initial
  accounting and access, followed by actual perception, resolve those fixture errors.
- Final rendered verification passes **9/9** under
  `autonomy_evidence/handover94-release-rendered`. Actual speech is heard at tick **18**,
  accepted at **40**; Ben's retained plan delivers **two wood at 761**. A declared
  recovery does nothing by itself. Actual later contact and agreement at **824** end
  Ben's plan, retaining his **two work**, and create Ada's resumed plan with **zero
  credited work**. Saves continue exactly, goods are not copied at agreement, resource
  accounting balances, rendering is pure, and no browser exceptions occur. Screenshots
  were inspected and raw conversation-purpose wording corrected. These are staged
  circumstances and recovery, with offered conversations and autonomous helper work.
- Typecheck/build pass with the existing large-bundle warning (JavaScript about
  1,111 kB, gzip about 374 kB). Final log: `autonomy-handover94-release2-build.log`.
- The release full run exercised **306 files / 2,052 tests** in **432.00 s**:
  **2,051 passed; one failed**. `night_plan.test.ts` exposed a real loader defect:
  pre-intention saves omit `intentions`, and the new validator iterated it before
  the existing loader supplied the historical empty-list default. The validator
  now tolerates that absent historical field without weakening handover validation.
  The affected night-plan file, handover contracts, both AI replays and immutable
  rules 93 pass together: **61 tests / four files**, **2.50 s**, recorded in
  `autonomy-handover94-loader-regression.log`. The full-suite failure is retained
  in `autonomy-handover94-release-full-tests.log`; no claim of a subsequent full
  green run is made. This final loader-only correction does not change live decisions
  or the valid saves used by the rendered/ordinary screens.

Release ordinary screens use fixed Normal/rich settings, immigration disabled, and
five days (12,000 ticks) per seed. Each has an exact unobserved twin, 100 observer-purity
checks, daily conservation checks, a final saved continuation and unchanged source.

| Seed | Wall seconds | Samples with active projects | Incapacity samples | Handover offers/starts/agreements | Deaths |
|---|---:|---:|---:|---:|---|
| river | 48.91 | 1,837 | 54 | 0 / 0 / 0 | none |
| forest | 43.71 | 1,775 | 0 | 0 / 0 / 0 | none |
| meadow | 47.06 | 1,750 | 0 | 0 / 0 / 0 | Talia, age 8, thirst, tick 8,746 |

Artifacts are `autonomy_evidence/r94-release-{river,forest,meadow}`. Counts are repeated
person samples, not independent opportunities. River's incapacity did not produce an
eligible offer. These results establish no ordinary handover uptake or survival benefit.

Ordinary uptake, useful handback frequency, care coverage, relocation success and
household viability remain separate questions. This mechanism does not itself acquire
care supplies, finish a home or guarantee survival. The wider prompt remains open.

## Pre-implementation audit and contract

Rules 92 owns personally communicated work in `continuity_knowledge.ts` and
death succession in `succession.ts`. Rules 93 owns physical estate custody.
Neither implements consent to cover a living worker's undertaking. The existing
`share_work` acknowledgement explicitly makes no takeover promise. This document
recorded the intended implementation contract before rules 94.

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
