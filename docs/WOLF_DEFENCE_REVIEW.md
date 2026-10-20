# Wolf-defence review and resolution record

Recorded retrospectively on 2026-10-21. This document preserves the earlier review and
subsequent implementation evidence; it is not a new independent review or a GitHub approval.

## Review provenance and verdict

The read-only Codex review on 2026-10-19 returned **REQUEST CHANGES** for two blocking
correctness findings. Its target was the uncommitted candidate in
`codex/wolf-habitation-integration`, based on
`a5530cfd36ab6bdba9ab62bfa7fb212ee5c79e24`, including its untracked files.
That candidate combined habitation, wolf defence at rules version 4, and a separate mood
change at version 5. The base commit alone does not identify the reviewed diff.
The review session identifier was `01a15294-c7b9-7523-b3de-f5c75b793c10`.

The implementation was published in [PR #20](https://github.com/lochheadr92-creator/living-world/pull/20),
branch `codex/wolf-defence-integration`. The owner closed the PR and integrated the branch
directly by fast-forwarding and pushing main to `9a082d6`, verified on 2026-10-21.
Commit `57e3047` integrates defence with habitation
at version 4 and includes the repairs below; it excludes the separate mood change.
The earlier review therefore must not be represented as approval of this final candidate.

**Current review status: both reported blockers are resolved with fixes and regression
evidence. No further independent re-review is required by project policy.** The owner
removed the automatic re-review requirement on 2026-10-21. The original request-changes
verdict remains historical evidence; no independent approval is claimed.

## Findings and resolution

| Finding | Observed failure and cause | Repair in `57e3047` | Resolution evidence |
| --- | --- | --- | --- |
| **P1 — armed people do not interrupt sleep or committed work to defend** | `reviewActivity()` treated a newly preferred `flee` as urgent but omitted `defend`. An armed sleeper remained asleep and took a bite, while an unarmed sleeper interrupted sleep to flee. | [`decision.ts`](../src/sim/decision.ts) treats newly selected defence as an urgent response while retaining a fit, already-running defence. | [`defence_response.test.ts`](../tests/defence_response.test.ts) checks armed sleep and committed-work interruption, unarmed flight, and retention of a valid defence until the defender becomes unfit. Resolved with regression evidence. |
| **P2 — approach to a stationary wolf stalls** | A fresh approach cleared the path and its index but retained `pathTries: 1`. Travel initializes a path only when the attempt count is zero. A defender remained motionless for 120 ticks against a visible diagonal stationary target. | [`defence.ts`](../src/sim/defence.ts) resets `pathTries` on a fresh approach. Distance observations distinguish a closing wolf from a stationary one so the existing hold-ground behaviour remains intact. | The same regression file checks actual movement toward a stationary wolf, a resolved attempt and spear wear. The existing hold-ground test and its threshold were preserved. Resolved with regression evidence. |

During repair on 2026-10-20, six of eight checks in the original two-version candidate
failed before the fixes and passed afterwards. The final isolated version-4 branch has
five response checks, with the duplicate version cases removed. These are different test
sets; their counts should not be interchanged.

The original review's existing focused suite passed 71 tests in six files despite the
two defects. Those passing tests were supporting evidence, not grounds for approval.

## Verification of the repaired implementation

The following results were recorded on 2026-10-20 for the simulation source committed
as `57e3047`. They were not rerun to create this documentation record.
Exact commands and retained evidence are in [the evidence run record](../wolf_evidence/RUN.md).

| Check | Recorded result and scope |
| --- | --- |
| Focused defence, habitation, lab and version-3 continuation tests | 69 tests in five files passed. |
| Full suite | 887 tests in 86 files passed. |
| `npm run build` | TypeScript checking and production build passed. |
| Historical golden fingerprints | Matched unchanged. Preserved continuation references were not re-recorded to obtain a pass. |
| Browser checks | Defence 5/5; habitation 10/10; autonomous saved scene 4/4. These use headless Chrome, not a broad usability assessment. |
| `git diff --check HEAD` | Passed at implementation closeout. |

The autonomous village example demonstrated spear creation and initiation of a response
to protect another person. The wolf left before a strike, so the result was partial with
no successful-defence credit. Separately, 40 staged encounters produced 18 drive-offs and
22 failures; disabling the defence action produced zero attempts. These demonstrate
specific mechanisms, not a village-wide survival benefit.

## Remaining issues and review boundary

- **Review record:** no additional independent review is required by project policy.
  This record is not a submitted GitHub approval, acceptance baseline or merge decision.
- **Existing death ordering:** wildlife updates precede person needs/death checks; passive
  healing can occur after a fatal bite but before death is checked. The prior review
  identified this separately from the integration defects. It remains unresolved and
  requires a separately scoped, versioned repair.
- **Acceptance evidence:** no broad survival ensemble or new acceptance baseline was run.
  The stale historical ensemble baseline remains unchanged.
- **Experimental save compatibility:** experimental wolf-version-3 saves and
  habitation-version-3 saves have different semantics. This implementation does not
  claim to identify or silently migrate every unmarked experimental save.

See [the implementation contract](WOLF_DEFENCE.md) for the complete behavioural scope and
[HANDOFF.md](../HANDOFF.md) for the branch's integration status. Future reviews should
record their reviewed commit, concrete findings, verification and verdict explicitly,
preserving this original request-changes history.
