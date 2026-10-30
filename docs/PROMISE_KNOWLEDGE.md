# Local completion knowledge and reporting — rules 80

## Reproduced cause

Rules 79's childcare competence memory required actual sight, but `fulfillCommitment` still changed a distant
requester's relationship, `lastMet`, supposedly firsthand reliable story and thanks. The explicit rules-79 diagnostic
`scripts/remote_promise_diagnostic.ts` records a real accepted watch finishing at tick 581, distance 22.15 from Ada.
Her trust jumps 70.3145728 → 76.3145728, affinity gains 3, and a reliable story names her as eyewitness. She receives
no witnessed-completion receipt. Output: `autonomy-remote80-before.log`. This is remote personal knowledge, not a
failure of the physical work. Rules 79 was pinned at `40474f0` before this change.

## Behaviour and ownership

`promise_knowledge.ts` owns the difference between a completed engine obligation, personal knowledge, a spoken
report and acknowledgement. Optional metadata extends the existing 32-entry `socialMemory`; no new memory store
or message queue is introduced. It retains source, learned tick, completion tick, commitment identity, actual activity
identity when available (otherwise zero/unknown), reporter/conversation identity and acknowledgement time.

The physical settlement still finishes the commitment and request. The helper retains their own completion. A
requester receives firsthand completion knowledge and its existing positive relationship consequence only when awake,
in the same space, within three units and both people's sight radius. Childcare additionally requires sight of the
child; a named building/site must be locally visible. This observes completion, not the entire preceding work period.
Sleeping or absent requesters do not receive the receipt, trust, reliable story or thanks through this path.
The helper receives the former reciprocal relationship reward only at this local acknowledgement.

Pending reports are drawn from the helper's own retained completion records, never from a remote requester's private
state. Records remain usable after operational requests/commitments are removed, for at most twelve days. At most
two eligible reports are offered, newest first, after checking which recipients are personally seen. Newer unseen
recipients do not hide an eligible older report. The normal social eligibility, walking, conversation acceptance,
urgent interruptions and needs remain in force. Reports score 18 minus the existing walking penalty; no survival or
leisure thresholds are retuned.

The existing `report` conversation purpose now carries the original request identity. Phase one reads the helper's
own completion and says, for example, “I've finished watching the child, as we agreed.” At actual contact the listener
retains **helper report**, with reporter, original completion and this conversation's provenance. Material receipts and
firsthand childcare evidence are deliberately not copied. No reliability deed, competence credit or special trust
reward follows merely from the claim. Normal conversation relationship effects still apply.

Phase two acknowledges hearing the report. Only then does the helper mark it acknowledged. Interruption after speech
leaves the listener informed and the helper uncertain about acknowledgement; another telling cannot multiply the
listener's retained event or award a completion reward. The 400-tick retry time is inside that same bounded memory
entry and removed on acknowledgement. It does not add indefinitely accumulating per-request cooldown keys.

`social.ts` owns physical settlement hooks and real conversation phases; `social_memory.ts` checks knowledge contact;
`options_social.ts` offers the registered reporting action; `history.ts` renders provenance and uncertainty. Existing
social-memory hashing covers the added fields. Save validation rejects wrong rules, roles, sources, timestamps,
duplicate/oversized memories and reported outcomes carrying forged firsthand task receipts. The lab removal
`rich-no-promise-knowledge` restores prior attribution and disables this reporting path. Old rules remain unchanged.

## Roof-repair attribution found during verification

An actual accepted repair consumed wood and raised hut condition from 38 to 65.3948. At tick 355 the upkeep sweep
cancelled the obligation as “mended by someone else” while the helper was still repairing (activity 13, cycle 1).
Contribution had been credited only in `onEnd`, so the sound-roof check ran before attribution existed.
`autonomy-promise80-repair2.log` preserves that failure.

For rules 80, `act_build.ts` credits the matching repair obligation immediately after each paid physical cycle and
does not credit it again at activity end. Fire duties still require actual fuel, not roof repair. The upkeep completion
path uses the same local knowledge/reporting boundary. The physical contract checks consumed repair materials,
improved condition, a fulfilled obligation, unchanged remote requester relationship, retained helper report and no
second contribution at activity end. Historical repair semantics remain below rules 80 and in the isolated removal.

## Staged chain and tests

`tests/helpers/promise_knowledge.ts` explicitly stages an injured parent and distant child. A real offered request is
voluntarily accepted and the registered watch completes 300 ticks. The parent remains uninformed at completion. A
separate staged rendezvous walks the parent physically to x=55; the helper then sees them and has an offered reporting
trip. A local deterministic test controller prioritises critical needs, then reports. This demonstrates execution of
an eligible choice, not autonomous frequency. The physical repair and direct material-delivery/crafted-pick tests
exercise other completion owners under current rules.

The report fixture is saved before the trip and its continuation matches an unobserved copy byte-for-byte. A separate
test saves after speech but before acknowledgement, interrupts the conversation and verifies retained uncertainty and
deduplication on a later unit-level retry. Other contracts cover absent/sleeping/different-room listeners, unrelated
speakers, memory age, bounded candidates, predecessor/removal and invalid saved metadata.

Focused evidence before final full run: 69 tests / five files; after repair integration, 59 tests / four files,
including physical upkeep and rules-79 continuation. Release build passes with the existing bundle-size and Vite
configuration notices. Release full suite: **267 files / 1,786 tests pass**, 363.62 seconds, four workers,
`autonomy-promise80-release-full-tests.log`. The known oversized-timeout warning remains. Release build/typecheck pass,
`autonomy-promise80-release-build.log`. Ordinary results are appended when complete.

Rendered release check: **8/8**, `autonomy_evidence/promise80-release-rendered/`, log
`autonomy-promise80-release-browser.log`. Earlier fresh screenshots were visually inspected: the spoken sentence is
natural language while the inspector retains request/activity/tick provenance and “reported, not independently
witnessed.” The helper's missing acknowledgement and later acknowledgement are separately rendered.

## Preserved failed attempts and review

- First rendezvous fixture left the parent pinned, so the registered walk never advanced. It now releases that
  fixture hold only for the physical walk and reapplies it after arrival; no needs or histories are reset.
- x=53 remained 9.8 units away, outside the helper's actual radius 9. No reporting option was correct. The separately
  staged rendezvous now reaches x=55; the runtime sight radius is unchanged (`autonomy-promise80-report-before.log`).
- Without the test controller the helper's report trip gave way to another activity; later they asked for information
  and cared for the child (`autonomy-promise80-report2.log`). That remains a valid ordinary priority result.
- Fresh review moved retry time out of accumulating cooldown keys, retained eligible older reports beyond unseen
  newer ones, and kept helper-only retry state out of the listener's report.
- Visual review removed internal request/tick jargon from spoken dialogue. The initial full run was deliberately
  stopped for that correction; a second was stopped for the bounded timer correction. Neither is a passing full run.
- The post-edit browser ablation on a hot-reloaded server failed its removal check. Restarting the owned server with
  unchanged source passed. This matches the prior module-instance mismatch symptom; its exact HMR cause remains an
  inference. Failed `promise80-rendered-final` and passing fresh/release reports are retained.
- An initial repair-credit patch landed at the earlier construction cycle rather than the repair cycle; review
  corrected placement before release verification. The failed repair3 log is retained.

## Ordinary protocol and remaining scope

`scripts/promise_knowledge_observe.ts` uses fixed Normal rich river, forest and meadow, five days, no immigration,
170-second per-run limit, source manifests, 100 whole-world observer-purity comparisons, an exact unobserved twin
and conserved resources. It separates personal completion records, heard reports, offered reports, actual starts and
matched sampled top choices. No alternate seeds or longer windows are substituted for zeros. Mature and aggregate
validation remains owner-run under `AUTONOMY_VALIDATION.md`.

All three fixed windows reached tick 12,000 with 2,800 person samples, 100 full purity checks, exact unobserved twins
and balanced resources. Outputs are `autonomy_evidence/r80-{river,forest,meadow}`.

| Seed | Own completions | Observed completions | Heard reports | Reporting starts | Sampled offers influenced | Sampled top choice changed | Seconds |
|---|---:|---:|---:|---:|---:|---:|---:|
| river | 12 | 3 | 0 | 1 | 130 | 1 | 29.32 |
| forest | 7 | 5 | 1 | 1 | 13 | 0 | 27.48 |
| meadow | 9 | 3 | 0 | 0 | 113 | 1 | 26.13 |

Counts are distinct person/request memories, not independent people or all work events. Sampled opportunity changes
are not actual starts. The forest ordinary chain is real: Zeke #935 completes wood request #1792 at tick 2367, starts
reporting to Cole #936 at 3067 (activity 2354), and Cole hears it at 3095 in conversation 2374. The stored report says
reported rather than witnessed. Five observed completions plus this report yield six acknowledged helper records.
This establishes ordinary occurrence in one fixed window, not frequency or aggregate benefit.

River's actual attempt is retained as a negative: Mira #1106 starts reporting request #2240 to Emre at 4913, but the
trip ends at 5022 with **“Emre was too busy to stop.”** No report reaches the listener. The unchanged-seed reproduction
`scripts/promise_ordinary_trace.ts` retains this in `autonomy-promise80-river-trace.log`, with a balanced ledger.

This closes the reproduced positive-completion attribution path and adds locally spoken completion/acknowledgement.
It does not establish that every historical settlement path is locally informed. Cancellation, partial expiry,
failure/blame, death/unavailable targets, delay updates, counteroffers, disputed reports, outstanding-request readers
and broader household coordination still require audit and implementation under the full programme. No aggregate
benefit or mature household viability is claimed.
