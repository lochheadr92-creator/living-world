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
| 3 | F2 unexplained crafting gate | Fixed and verified; protocols 7/8, observation 5. |
| 4 | F4 stale Last summary | Fixed and verified; presentation only, actual timestamp ordering. |
| 5 | F5 unclear time basis | Fixed and verified; protocols 9/10, observation 6; 1x and 16x inspected. |

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

## F2 — fixed and verified (protocols 7/8, observation 5)

Reconfirmed optCraft's hunger/thirst-drive >30 early return. options_work.ts now shares
that unchanged predicate with a pure observer derivation which reuses the wanted/planned
tool, material allocation and known workspace checks without constructing an activity.
Observation 5 adds material-ready needs blockers to setAside; the manual panel displays
them. This is derived presentation, not saved simulation state. Rules remain 27.
Protocols 1–6 preserve earlier observation content; new runs use 7/8.

Three contracts: hunger despite broad 'ok' label; thirst/both gates and insufficient
materials; actual eating restores crafting, successful material consumption and complete
serialized replay equality. Observer test compares complete serialized state before/after.
Focused crafting/projects/protocol/memory: 60 tests passed. Typecheck passed.
Original fixture setup mistakenly used needs above the gate and then overfilled the pack;
corrected labelled initial conditions from the actual drive bands and carrying capacity.
No production thresholds/capacity/recipe changes were made.

Rendered Edge session: inspected the blocker, selected offered eating, then offered pick
craft; success appeared and wood/stone left inventory. Transcript downloaded and replayed
with scripts/inhabitant_f2_replay.ts. Evidence: inhabitant_evidence/f2/. Earlier F1 and F3
manual recordings still replay exactly. Full regression follows remaining presentation fixes.
Existing modules touched: crafting owns the predicate/candidate derivation; agent protocol
and observation own versioned explanation; inhabitant UI displays the recorded blocker.

## F4 — fixed and verified (presentation only)

Current manualBlock used only lastResult despite lastInteraction already being present.
UI-owned inhabit_summary.ts compares actual recorded ticks: later interaction wins;
later work wins; equal ticks prefer work. If a legacy work timestamp is absent, show
both records with 'order unknown'. Missing records add no invented outcome.
No simulation, saved schema, protocol or observation changes are needed.

Three contracts cover both orderings, ties and missing records/timestamps. Typecheck
passed. Rendered staged session chose eating, Chat with Ben, then Make a pick through
offered actions. Last changed to 'chat — friendly', then 'Making a pick — success'.
Both screenshots inspected; downloaded transcript replay matches and checks both
summaries. Evidence: inhabitant_evidence/f4/; scripts/inhabitant_f4_replay.ts.
Existing module touched: inhabitant UI delegates recorded-outcome selection to a pure
UI helper. No dialogue, emotions or causes are synthesized.

## F5 — fixed and verified (protocols 9/10, observation 6)

Confirmed action estimates used secondsText (ticks/10), while the world clock advances
1440 minutes per 2400 ticks; agoText used the same unexplained seconds/minutes basis.
Agent-owned time_text.ts now formats action estimates and observation memory ages as
world minutes/hours/days, rounded to minute precision. The manual panel explicitly
names this basis and displays estimates on the buttons. Playback, ticks, needs, work,
and the general observer inspector are unchanged. Scope is inhabitant observations and
manual choice presentation; historical observer/inspector formatting is not redesigned.

Four contracts cover short/hour/day durations, age boundaries/zero/future records,
unchanged offered execution and complete serialized observer purity, and every historical
protocol's observation/memory mapping. Old protocols 1–8 keep their wording; new 9/10
use observation 6. Rules remain 27. Rendered at both 1x and 16x with the same estimates
and memory ages; both screenshots inspected. A selected gathering action completed and
its downloaded protocol-9 transcript replays: scripts/inhabitant_f5_replay.ts.
Evidence: inhabitant_evidence/f5/. No elapsed-wall-time claim is made by these estimates.

Integrated validation: npm test passed 1181 tests / 140 files in 106.83 seconds;
npm run typecheck and npm run build passed; all historical fingerprints matched with
npx --no-install vite-node scripts/golden.ts. F1/F2/F3/F4 manual transcripts also replay
under the current code. Vite emits existing future config-loader import-extension warnings;
the timer-overflow warning is the intentional existing timeout regression test.
Existing modules touched: agent observation/protocol route versioned wording; manual UI
makes its basis and estimates visible. Presentation neither writes state nor draws RNG.

## Version-27 provenance collision found at delivery

Remote refresh discovered origin/claude/leisure-rhythm-v27 at 007b9d5 (based on bc9e3c8)
used 27 for a different behaviour. Its successor origin/claude/leisure-rhythm-v28 at
1d2c54b is correctly based on our main 1981f26. Neither candidate is merged by this task.
Version 28 is occupied by that separate candidate and must not be reused.

Both old 27 lines wrote the same rulesLineage, so their raw saves cannot be interpreted
safely from that number/tag. New main-27 save envelopes carry rulesGeneration
'main-night-wait-boundary-27'. Unmarked/differently marked 27 is rejected before world
replacement; originals remain in storage. This includes unmarked main-27 saves written
before this check: open them with their exact original build (e.g. 1981f26), do not edit
a marker by hand. No automatic migration or experimental-branch integration is claimed.
Historical <=26 formats and rules are unchanged. Transcript observation/world-hash replay
still checks its recorded behaviour independently; original evidence is not rewritten.

Three provenance contracts plus an actual loadGame/localStorage preservation regression;
focused save/version/night/continuation checks: 64 tests / 7 files passed; typecheck/build
passed. This is a persistence compatibility guard, not another behavioural generation.
