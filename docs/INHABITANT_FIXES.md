# Inhabitant audit implementation queue

Owner authorised proceeding on 2026-10-25 after a reduced civilisation regression run.
Long-run civilisation measurements remain deferred; see CIVILISATION_IMPLEMENTATION.md.
Historical evidence remains unchanged on audit commit fc04d7db45c034c5ea317086bb7533ae6e085f7f.
Priority source: 030d62d7fea592bdc620ba357012d1534edb20c5, docs/audits/2026-10-24-odette/NEXT_PRIORITIES.md.
Current implementation starts from bc9e3c8 (rules 26), not the audited version 13.

| Order | Finding | Current disposition |
|---|---|---|
| 1 | F1 night shelter restart | Fixed and verified; integrated in 1981f26 (rules 27). |
| 2 | F3 duplicate choice keys | Fixed and verified; protocols 5/6, observation 4. |
| 3 | F2 unexplained crafting gate | Queued: actual needs gate, no balance change. |
| 4 | F4 stale Last summary | Queued: most recent recorded action/interaction, stable ties. |
| 5 | F5 unclear time basis | Queued: action estimates and memory ages, no timing change. |

Each disposition requires reproduction/current evidence, owned fix, focused regression,
compatibility, rendered manual observation, and delivery. Stop/report after these five;
recommend household and settlement continuation. No additional long ensemble is a gate.

## F1 — fixed and verified on rules 27

Reproduced on rules 26 through a real accepted chat: suspension zeroes work progress,
rest.begin reloads the original full amount, and the unchanged expiry produces
"took too long" in daylight. The immutable rules-26 reference was recorded at 34b96b1
before the fix. Historical worlds retain that behaviour; no saves are relabelled.

Ownership/design: night_wait.ts owns eligibility and the lab switch; Activity.data.daylightAt
owns the saved deadline; optShelter creates it; rest execution validates the physical
shelter and ends at that boundary. Alternatives were remaining-work accounting versus
an absolute daylight boundary. Chosen boundary matches the action's promise, including
time spent talking. It does not invent shelter credit during a conversation. Generic
suspension continues resetting ordinary work. The dedicated wait resumes even after
its former expiry so the rest handler can report daylight or actual shelter loss.
Urgent needs/danger retain their existing interruption path. Lab ablation:
rich-no-night-wait-boundary. Behaviour becomes current rules 27.

Verification: seven focused night-wait contracts; historical timeout; uninterrupted wait;
actual conversation before/across dawn; missing shelter; urgent thirst with real carried
water; ablation; complete serialized equality after save/load mid-conversation.
Full suite: 1167 tests / 136 files passed. Typecheck, build, historical golden script passed.
Earlier focused combined run found a fixture with no available water could not choose a
drinking interruption; fixed its initial carried inventory before ledger initialization,
not the runtime need thresholds. The revised seven contracts pass.

Manual rendered evidence: selected only the offered shelter action in the ordinary
inhabitant panel of scripts/fixtures/inhabitant-audit.html. This is a labelled STAGED
scene; Ben's initial physical approach is staged, conversations and execution are real.
At 06:00 the action reports success: daylight arrived. Transcript downloaded through
Save transcript, replayed with scripts/inhabitant_f1_replay.ts; replay verifies recorded
observations, choices and final state. Screenshot inspected in Edge after the in-app
browser's screenshot capability failed. Evidence: inhabitant_evidence/f1/.
No autonomous-emergence or human-usability claim. F3/F2/F4/F5 remain queued.

## F3 — fixed and verified (protocols 5/6, observation 4)

Current rules-27 meadow/town at tick 118 reproduces duplicate gather keys for household
stocking (up to four) and hunger relief (up to two). The old external boundary picked
the first matching key. No historical wrong transfer is claimed.

Agent choice_keys.ts owns decision-local public identity; transcript.ts translates the
selected public key to a validated ranked index plus internal key. decision.ts validates
both before checking that alternative's limits. Internal plan/cooldown keys are unchanged.
Legacy protocols 1–4 keep their recorded first-match meaning; no save or autonomous
rules change. Alternatives were canonicalisation versus distinct identity: different
goals/amounts require distinct identity. UI shows those goals on separate wrapping lines.

Four new contracts cover the reproduction, legacy selection, actual new selection and
full-state replay, mismatched index rejection, and generated-key collisions. Browser
manual selection chose the hunger offer with amount two; physical gathering completed
with two fruit. Downloaded transcript replay matches: scripts/inhabitant_f3_replay.ts.
Evidence: inhabitant_evidence/f3/. Browser screenshot exposed truncated goal lines;
fixed their layout and inspected the corrected wrapping in Edge.

Full suite initially passed 1169/1171: the two failures were new-run header assertions
still expecting protocols 3/4. Updated those assertions to 5/6, retaining historical
1/2 checks and legacy replay contracts. Focused rerun: 19/19 passed. Typecheck/build
passed. Complete suite will run again at the next integrated presentation boundary.
Existing modules touched: observation/protocol/transcript for versioned public identity;
external/decision for validated selection; inhabitant UI/styles for readable alternatives.
