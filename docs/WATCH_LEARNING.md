# Witnessed childcare completion — rules 79

## Contract and ownership

Rules 78 retained actual material handovers but did not retain nonmaterial work evidence. The baseline diagnostic
`scripts/watch_learning_diagnostic.ts` explicitly runs rules 78. In its staged scene request 13 is accepted, the registered
watch activity 16 completes 300 ticks at tick 396, and the child physically receives five bread. The nearby parent's
durable receipt records a fulfilled watch without a completion source. `autonomy-watch79-before.log` preserves this.

Rules 79 adds one bounded kind of competence evidence: **seeing completion of an agreed watch**. It does not assert
that the parent saw the entire supervision period, that the child was always safe, or that the helper will agree again.
The `responsibilities.ts` physical completion boundary records the activity, child and completion tick on its existing
request. The helper knows their own completed work. The requester knows the completion only when alive and awake,
within three units of the helper and their own sight radius, with both helper and child in the same accessible space
and the child in sight. Sleeping, distant and interrupted cases receive no learned competence credit.

`helper_learning.ts` retains the evidence in the existing 32-entry `socialMemory`; no second memory store is introduced.
The requester and helper sources are distinct (`completion in sight` / `own work`). Only the requester source contributes
to later childcare requests. Task mismatch, material delivery, hearsay and a generic fulfilled outcome do not substitute.
Old memories are not backfilled. Operational requests can expire without deleting retained personal evidence.

Only already-eligible watch requests receive the preference. Each distinct completion adds 3 for four days, then 1.5
through twelve days, then zero. At most two distinct request/activity pairs count, capped at 6. These deliberately weak
weights match the existing material-experience bound; they are not estimated success probabilities. Current eligibility,
distance, urgent needs, other commitments and voluntary replies remain in force. Fire, repair and forging receive no
bonus from childcare. Refusal and interruption add no ability penalty.

`social_memory.ts` assigns personal source, `options_social.ts` consumes matching experience and exposes its reason,
`types.ts` describes optional metadata, `world.ts` hashes it, and the existing save validation checks version, task,
target, timestamp, event and role. `describeHelperTask` uses the existing rendered relationship history. The lab removal
`rich-no-watch-learning` disables only this new completion record and choice preference. Rules 78 remains unchanged;
its immutable reference was pinned at `0f26bc7` before this work.

## Staged evidence and retained limitations

`tests/helpers/watch_learning.ts` explicitly stages an injured parent, nearby resting child and two willing neighbours.
It selects a real offered request to Ben, lets his ordinary reply accept, then starts his accepted physical watch.
No completion or competence is assigned. Ada sees completion at tick 396. The delayed-choice fixture holds the
neighbours and child between trials until tick 800; needs, relationship changes, memory and cooldowns keep advancing.
This quiet interval is staged, not ordinary household behaviour.

At tick 800 both neighbours are eligible: with learned evidence the first watch option is Ben (6); removing only
watch learning chooses nearer Cora (8). A save/load retains that distinction. A local deterministic test controller
prioritises critical needs, then offered watch requests. The real later request is voluntarily accepted and another
physical watch completes by tick 1250; its activity identity differs from the first. Saved and uninterrupted worlds
remain byte-identical and the resource ledger balances.

The first delayed diagnostic let Ben continue ordinarily until tick 1100. He was in a conversation, so only Cora was
eligible and both arms chose her (`autonomy-watch79-choice.log`). That is a valid eligibility result, not evidence of
a learning defect. The explicit quiet fixture (`autonomy-watch79-choice2.log`) isolates the eligible comparison.
Neither scene establishes ordinary adoption, frequency, welfare or longer-term household viability.

Tests cover actual completion, sources/privacy, mid-watch save continuation, later choice and work, absent/sleeping
requesters, interruption, predecessor/removal, expiry/caps/event deduplication and malformed saved metadata.
Rendered browser check `scripts/browser/watch_learning_check.mjs` passes 6/6 and screenshots are retained in
`autonomy_evidence/watch79-rendered/`; the retained-history screenshot was visually inspected for readable provenance.
Build passes with the existing bundle-size and Vite configuration notices. Full suite: **265 files / 1,771 tests pass**,
359.51 seconds with four workers (`autonomy-watch79-full-tests.log`), including the frozen rules-78 continuation.
The existing oversized-timeout warning remains. Initial focused new/predecessor check: 12/12; expanded local tests then
12/12, with the interruption contract added before the full run. Ordinary results are recorded below;
a test pass alone does not close the wider cooperation programme.

## Ordinary protocol

`scripts/watch_learning_observe.ts` runs the fixed Normal rich river, forest and meadow seeds for five days each,
without immigration, at most 170 seconds per run. It separately counts actual watch-request starts, retained task
receipts, personally witnessed completions, sampled influenced offers and actual influenced starts. An unobserved twin
must remain byte-identical; observer serialization and conservation are checked. Source hashes are recorded and must
remain unchanged. Samples are not independent people. Zeros remain zeros; no seeds or windows are replaced to get
activation. Longer mature-world and aggregate comparisons remain owner-run under `AUTONOMY_VALIDATION.md`.

All three windows reached tick 12,000. River / forest / meadow took 28.27 / 26.16 / 26.02 seconds. Each recorded
**zero watch-request starts, zero watch task receipts, zero witnessed completions, zero influenced offers/starts**.
Each has 2,800 person samples and 100 full observer-purity checks, an exact unobserved twin and balanced resources.
Reports and final saves are in `autonomy_evidence/r79-river`, `r79-forest`, `r79-meadow`; execution logs are
`autonomy-watch79-{river,forest,meadow}.log`. Thus these ordinary windows do not establish activation or benefit.

The second staged watch completes at tick 1243 with `witnessId: 0`: the parent has moved away by then. The new memory
correctly does not award a second witnessed-completion preference. The older generic trust/thanks effect described in
the review below is still visible. This distinction is preserved rather than presenting all successful work as known.

Runtime commit: `e704d0156fb0d156591a3fe297fe1f1155247bf4`. The rules-79 reference is recorded from that commit,
before successor behaviour, using ordinary meadow continuation, an active watch through witnessed completion, and
the saved delayed choice through the second accepted watch. Its expectation and fixture must not be re-recorded to
make a successor pass.

Broader work competence, asking about ability, delay/cancellation communication, conflicting reports, recovery handover
and the wider A7/A8/household programme remain open.

## Review

Fresh source review checked the physical completion boundary, source assignment, task-specific consumer, caps,
deduplication, save validation, hash coverage and historical gating. It found the initial option exposed the evidence
only as a score component; the explicit `selectionReason` was then connected so ordinary decision text and agent
observations retain the provenance. The delayed-choice contract and rendered check cover that correction.

Separate finding for the next audit: `fulfillCommitment` still awards the requester's relationship change, reliable
deed and thanks whenever the requester exists, independently of contact. Rules 79's new completion memory is local,
but this older generic relationship effect may inform a distant or sleeping requester. This is not fixed or declared
verified here; reproduce the full physical path before changing attribution or adding communication.

That reproduction now exists in `scripts/remote_promise_diagnostic.ts`, explicitly rules 79, with retained output
`autonomy-remote80-before.log`. An actual accepted watch finishes at tick 581 with parent/helper distance **22.15**.
The requester receives no completion receipt (`witnessId: 0`), yet trust increases **70.3145728 → 76.3145728**, affinity
increases by 3, `lastMet` becomes 581, and a supposedly firsthand reliable story names the parent as origin. No contact
occurs in that tick. The ledger balances. This establishes a remote attribution defect; the next rules version must
preserve the physical completion while making knowledge and any acknowledgement depend on observation or speech.
