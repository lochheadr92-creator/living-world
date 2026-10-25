# Inhabitant audit implementation queue

Owner authorised proceeding on 2026-10-25 after a reduced civilisation regression run.
Long-run civilisation measurements remain deferred; see CIVILISATION_IMPLEMENTATION.md.
Historical evidence remains unchanged on audit commit fc04d7db45c034c5ea317086bb7533ae6e085f7f.
Priority source: 030d62d7fea592bdc620ba357012d1534edb20c5, docs/audits/2026-10-24-odette/NEXT_PRIORITIES.md.
Current implementation starts from bc9e3c8 (rules 26), not the audited version 13.

| Order | Finding | Current disposition |
|---|---|---|
| 1 | F1 night shelter restart | In progress: trace actual conversation suspension and dawn completion. |
| 2 | F3 duplicate choice keys | Queued: actual selection boundary and historical protocol meanings. |
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
