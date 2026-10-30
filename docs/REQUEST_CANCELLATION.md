# Requester cancellation through actual contact — rules 84

## Reproduced gap and contract

The explicit rules-83 diagnostic (`scripts/requester_cancellation_diagnostic.ts`,
`autonomy-requester84-before.log`) follows an accepted roof request, staged remote collapse,
and the requester's physical approach. Edda observes her missing hut at tick 209; Ned still
remembers it and holds the obligation. Edda has no way to withdraw the now-obsolete work.

Rules 84 keeps those two knowledge states separate. A requester who personally observes the
missing target, or personally finishes the site, ends their own expectation and retains a
pending cancellation in the existing bounded 32-entry request memory. The helper's obligation,
knowledge and shared execution record remain unchanged until the requester actually speaks.
The requester can choose an eligible nearby helper, approach, and explain the cancellation.
A heard cancellation ends only the matching active obligation, releases matching suspended
work and claims, and settles its shared request. Inventory is unchanged. A separate actual
response acknowledges hearing; interruption between the phases does not undo the speech.
Retry is bounded by the existing memory, a 400-tick cooldown and a 12-day reporting window.
Personally known death prevents seeking that helper. No distant helper location or progress
is read to decide whether to offer cancellation.

If work already ended, the helper preserves the true outcome and can state the retained
completion or failure during the response. Cancellation does not rewind construction,
remove delivered goods or fabricate firsthand competence. A helper learns the requester's
account of the target, not an independently witnessed disappearance. The inspector shows
source, target observation, conversation and acknowledgement separately.

## Ownership and compatibility

`src/sim/request_cancellation.ts` owns bounded personal cancellation knowledge, pure pending
selection, speech/acknowledgement transitions and validation. `promise_targets.ts` supplies
actual local observation; `promise_expectations.ts` owns the requester's ended expectation.
`options_social.ts` offers the conversation through existing contact candidates and scoring.
`social.ts` owns physical conversation phases and suspended-action/request settlement. No
activity-registration import was introduced into the cancellation module. `types.ts`,
`save.ts`, `history.ts` and `rulesversion.ts` expose, validate and preserve the typed state.
Full social-memory hashing already covers the new field. Lab-only removal:
`rich-no-request-cancellation`; rules 83 and earlier retain their behavior. Immutable rules-83
reference `57b5fe4` was published before this implementation.

This is specifically locally justified withdrawal of target work. Arbitrary preference
cancellation, remembered distant helper search, counteramount/place, delay proposals,
ability/location questions and conflict resolution remain separate programme gaps.

## Review and focused evidence

`tests/request_cancellation.test.ts` drives real acceptance, physical requester inspection and
return, actual offered speech, interrupted speech and acknowledgement, suspended work release,
late cancellation after actual construction, save/replay, observer purity, contact boundaries,
old rules, isolated removal and malformed saved provenance. Explicit contact-position probes
are unit boundary tests, not claimed physical journeys. The helper-without-memory-array case
passes using the existing lazy initialization; no speculative fix was made. The late-completion
case retains the real building and reports completion without firsthand requester work credit.

Initial focused evidence: 70 tests / three files. Added race/validation cases: 17/17. Fresh review
cases: 19/19. The first post-review typecheck caught TypeScript retaining the `delete` narrowing
across the mutating call in a test. A typed read of the helper fixes that test-only issue; the
runtime was unchanged. Final typecheck passes and the broader focused run passes **96 tests /
five files** (`autonomy-cancel84-reviewed-focused.log`), including economy, survival, wolf
entry points and immutable rules-83 continuation. No assertions or historical references were
weakened.

## Rendered evidence

`scripts/browser/request_cancellation_check.mjs` and `autonomy-cancel84-browser.log` pass **10/10**
on a freshly started Vite server. `autonomy_evidence/cancel84-rendered` holds screenshots and
structured assertions. The helper-heard screenshot was visually inspected: the speech bubble
withdraws the request, and Ned's relationship history says the target change was reported,
not independently witnessed. The requester view records missing acknowledgement first, then
the real response. Full-save inspection purity, exact continuation after hearing, unchanged
helper inventory, balanced resources and absence of browser exceptions pass.

## Ordinary observations and release gate

Fixed fresh Normal rich river/forest/meadow worlds, no immigration, five days (12,000 ticks),
170-second per-seed limit. `scripts/request_cancellation_observe.ts` records a frozen source
manifest, exact unobserved twin, 100 full-save inspection-purity checks, 2,800 living-person
samples and resource accounting in each world. Pending/eligible counts repeat people and
requests; starts can fail or retry and are not messages heard. Distinct retained person/request
records determine observed cancellation, hearing and acknowledgement counts. The final saved
worlds are separately validated, round-tripped and continued for 120 ticks with exact twins.

Ordinary results and the final full-suite/build gate are pending completion below. No population,
survival, efficiency or broad household-coordination benefit is claimed.


| Seed | Own cancellations | Pending samples | Eligible samples | Starts | Heard | Acknowledged | Heard while active | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| river | 11 | 252 | 56 | 14 | 8 | 7 | 0 | 30.0 |
| forest | 4 | 58 | 5 | 5 | 3 | 3 | 0 | 29.6 |
| meadow | 8 | 101 | 16 | 13 | 6 | 6 | 0 | 30.6 |

All three windows reached their horizon with exact twins, pure observation and balanced ledgers.
Logs: `autonomy-cancel84-{seed}.log`; roots: `autonomy_evidence/r84-{seed}`. Final-save validation,
exact round trips and 120-tick saved twins also pass (`autonomy-cancel84-final-saves.log`,
`autonomy-cancel84-meadow-final-save.log`). In river, request #1485 ends with Cole explaining
his actual 2/3 wood delivery after finishing the site; request #1721 ends with Basil reporting
his completed promise. The requester's earlier local withdrawal does not erase either fact.
The horizon ends with some messages still unacknowledged; no eventual-delivery guarantee is made.

Build and typecheck pass (`autonomy-cancel84-build.log`, `autonomy-cancel84-typecheck.log`).
The existing Vite import-extension and bundle-size warnings remain. Final full-suite result
is still pending at this writing.


All 17 distinct ordinary heard cancellations arrived after the helper's obligation had ended.
Stopping active work is established by the staged physical conversation, not these ordinary
windows. The new ordinary behavior supplies truthful late reconciliation; its cost or benefit
has not been compared against a matched control.

## Next reproduced communication gap

`scripts/promise_delay_diagnostic.ts` explicitly runs rules 84 with a real accepted watch
request, a declared impassable strip, an actual failed approach and a physical requester
rendezvous. The helper remains able to speak, has no critical need, and remembers the real
failed attempt while the obligation remains active. The requester still has only the original
heard agreement; the offer set has neither an active-delay explanation nor a renegotiation.
`autonomy-delay85-before.log` retains the full state and pure inspection/save/resource checks.
This is a source-audited gap in active-promise communication, not evidence that more time alone
would fix the obstruction or protect the child. The child is alive at the diagnostic horizon.


## Final review finding: overlapping obligations

Two explicit unit overlap variants reproduced a real settlement defect: the target-based
fallback discarded suspended work even when it was explicitly bound to another active
obligation, or still served another obligation at the same site. Both failed before the fix
(`autonomy-cancel84-overlap-before.log`, 2 failed / 19 passed). The initial full run was stopped
for this concrete finding (`autonomy-cancel84-full-tests.log`); it is not a passing suite.

The conversation owner now respects an explicit activity/commitment binding. Target fallback
is used only when no explicit binding exists and no other active personal obligation still
needs that target. The original cancellation still ends its own obligation. The tests stage
the second obligation to isolate this ownership boundary; they do not claim two naturally
accepted requests. The physical cancellation conversation is unchanged. Immutable rules-84
reference `eba0b94`, recorded from candidate `fb55f77`, remains unchanged and must pass after
this fix; no expected hashes are regenerated.


The corrected ownership-focused run passes **99 tests / six files**, including immutable 83
and 84 references (`autonomy-cancel84-overlap-fixed.log`). Corrected typecheck/build and fresh
browser **10/10** pass (`autonomy-cancel84-overlap-typecheck.log`, `autonomy-cancel84-final-build.log`,
`autonomy-cancel84-final-browser.log`). Final screenshots/report are in
`autonomy_evidence/cancel84-final-rendered`.

Final-source ordinary reruns `autonomy_evidence/r84-final-{seed}` reproduce every count in the
table above, with 32.8 / 29.2 / 29.4 seconds for river/forest/meadow. All horizons, exact twins,
100 purity checks per seed, source manifests and ledgers pass. Final-save validation, exact
round trips and 120-tick continuations also pass for all three
(`autonomy-cancel84-final-saved-continuations.log`). Initial observations remain candidate
provenance; the final-source measurements are the corrected release evidence.
