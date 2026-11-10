# An answer to a help-build ask keeps the term that decided it: rules 187

Predecessor rules 186 is pinned by `tests/v186_continuation.expected.json`. Origin: the end-to-end trace of 10 November 2026 (`docs/END_TO_END_TRACE.md`, links 6, 10, 28, 33
and 34), not a row of the gap map (nearest G74, G09). Stream: gap.

## The gap (every version up to 186)

Asked to help build, a person's answer is a sum compared with 0.55 (`social.ts`, `case 'recruit'`): what they have seen of this organiser's shared work (-0.12 to 0.12),
0.2, 0.45 times diligence, 0.3 times generosity, 0.4 times fondness, a draw of up to 0.075 either way, minus half their strongest drive, plus 0.2 for kin. The request kept
a label. "Not willing to commit to this proposal" is the label when no other applies. No term was kept. In the traced outcome five of eight answers had a label and no cause.

## The rule (rules 187, rich worlds)

`answerCause` (`src/sim/answer_cause.ts`) names the first term, in a fixed order, without which the answer would have gone the other way.

| answer | tried in this order | text |
|---|---|---|
| yes | kin | "<asker> is kin" |
| yes | the organiser's shared work | "has seen <asker>'s shared work come good" |
| yes | fondness | "is fond of <asker>" |
| yes | the draw | "it was close, and it was yes this time" |
| yes | none alone | "it is in their nature to take on shared work" |
| no | the organiser's shared work | "has seen <asker>'s shared work fail" |
| no | their own drives | "their own needs weighed too much just then" |
| no | the draw | "it was close, and it was no this time" |
| no | an ordinary bond (affinity 30) would have tipped it | "does not know <asker> well enough to commit" |
| no | none alone | "it is not in their nature to take on shared work" |

The text is stored as `answerWhy` on the request, on the participation record and on the council decision, and the project history prints it in brackets after the label.
The inputs are recomputed from the same pure functions. The sum and the branch are untouched, and nothing reads the text.

Rules 186 and earlier, authored worlds and `setAnswerCause(false)` keep the label only.

## Limits

- One deciding term, not every weight, and no figures. In ordinary gen-2 the first four answers all read "it is in their nature to take on shared work", which is true and thin.
- Only the help-build answer. Refusals made before the rule is reached keep their own labels. Requests for goods are untouched.
- The label and the cause can point different ways. "Own needs take priority (it is not in their nature to take on shared work)" means their drives were up, and that the
  drives alone did not turn the answer.
- Inaction is still unexplained: a proposer who never asks leaves no record of why.
- A failed project with no coordinator still leaves no memory, so "has seen <asker>'s shared work fail" needs a coordinated failure to appear.

## Evidence

- Contract tests `tests/answer_cause.test.ts` (7 pass): ten pure cases; a staged ask keeps no cause at 186 and one at 187; status and note are equal at 186 and 187 for a
  yes and for a no; the switch.
- `npm run typecheck` passed.
- Immutable pin `tests/v187_continuation.*` (Normal gen-2, arrivals on, 7,400 ticks then 120 after a save and load; the first kept cause is at tick 7,135), recorded from a
  clean checkout of `717420fd`.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts --strip-answers` at 186 and 187 from a clean checkout of `af15790c`, 25 processes at once: identical in 12 of 12, conservation and the tool registry hold in all 24 runs. gen-2 at 187 without the strip hashes to `af232ad22d98a9df` against `d8adc3b6cf6bd5d5` with it. `review_evidence/trace-fixes-20261110/r186-r187/`.
- Full suite: one run for rules 186 to 188, clean checkout of `6254dc9b`, default worker pool, 490 s: 567 files, 3,194 tests, 73 failed. The 65 baseline failures are all present by name and none is missing. The other eight tests and one file hook are timeouts under load in six files (`lab_defaults` 3, `lab_report` 2, `lab_provenance` 1, observer purity 1, tool-report saves 1, the `zz_review_h_retention` hook); those six files pass alone at the same commit, 14 of 14 tests in 164 s. No regression. `review_evidence/trace-fixes-20261110/suite-summary.txt`.

No benefit or harm is claimed.
