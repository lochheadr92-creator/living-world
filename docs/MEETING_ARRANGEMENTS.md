# Shared-place arrangements — current-source audit

## Rules 91: connected personal arrangements

Predecessor rules 90 is published at `e2ecf75`, runtime `c766251`, immutable reference
`ec4eab7`. This implements the arrangement contract below; verification and final ordinary
repeats are recorded here. It is not whole-programme completion.

`meeting_knowledge.ts` owns one heard snapshot per participant on the existing meal
(at most five participants, at most 60 operational meals). Host and guest decisions use
their own heard time/place, answer and outcome. A remote death, lost hall, danger or table
cleanup cannot clear the guest's appointment or disclose its cause. Actual early arrival
waits through the agreed time plus 500 ticks, with urgent needs still taking precedence.
An unanswered invitation expires without acceptance and cannot occupy history forever.
An ended table is prunable only after its living participants' appointments have ended.

Actual `cancel_meeting` speech and its response use the same-space contact boundary in
both conversation phases. Hearing and acknowledgement are separate, saved events; a broken
conversation preserves whichever phase actually happened. Pending announcements retry no
sooner than 400 ticks and cease after two days. Duplicate acknowledgement has no further
effect. A late explanation retains the earlier unknown-cause timeout and separately records
the host's report; it is not retroactive firsthand knowledge or evidence of bad faith.

One new invitation can replace a personally failed meal after a 120-tick pause, during a
one-day opportunity window. It uses a new ID and the host's currently remembered shared
place. The listener hears cancellation of the old arrangement before answering the new
invitation, and can refuse. Uninformed guests retain their old appointment. A replacement
cannot itself be replaced; laid food is never moved by speech. The new time allows an
additional 240 preparation ticks. This is a modest response to experienced failure, not
proof that extra time solves every obstacle.

The latest sourced meal experience belongs to each existing relationship, retaining meal,
place, original time, outcome time, source and confidence after the operational record
expires. It neither creates a parallel general memory store nor changes request receipts
or helper competence. Remembered successful company adds two points to an eligible later
invitation; a remembered unsuccessful arrangement adds preparation time. No trust penalty
is inferred from absence, inability or refusal. Existing six-entry relationship text history
and social-memory bounds remain unchanged.

`meals.ts` retains ownership of the real table, physical arrivals and food consumption.
`social.ts` performs contact-checked speech; existing options expose cancellation and one
replacement. The person meal card distinguishes agreed, waiting, window passed and experienced
food, labels the account as what the person knows, and retains provenance. World/building
views may still show observer truth. Protocols **29/30**, observation **16**, expose at most
six personally heard appointments; old protocol shapes omit them. Legal action selection,
not expressive model text, executes every action. `rich-no-meeting-knowledge` is the lab
removal; old rules preserve the original shared-status behavior.

### Current evidence and resolved findings

- The two initial defect tests failed: distant cancellation was broadcast, and a heard
  refusal still offered table laying. Both now pass.
- Final focused contracts, AI live/stub replay, historical meal contracts and immutable
  rules-90 reference pass **39 tests / four files** in **2.27 seconds**. Typecheck/build pass;
  the existing large-bundle warning remains (JavaScript about 1,091 kB, gzip about 368 kB).
- Contracts exercise actual invitation → accepted time → saved travel/wait → shared bread;
  remote death/place loss, walls, interrupted speech before/after hearing, replacement
  refusal, uninformed third guest, bounded history, late explanation, malformed provenance,
  repeated replies and later experience after operational removal. Fixtures and explicit
  legal selections are staged evidence, not natural occurrence.
- The first rendered checker queried a hidden building panel instead of the person card;
  the actual screenshot already showed waiting correctly. The corrected selector and the
  clearer “What they know” label pass **7/7**. Final screenshots under
  `autonomy_evidence/meeting91-final-rendered` show the real waiting, heard replacement and
  consumed meal. Earlier failures remain in `autonomy-meeting91-browser.log`.
- The first ordinary forest run exposed a real one-tick repeat-host attempt after each
  completed meal. The new regression failed (`autonomy-meeting91-host-finish-before.log`).
  Completion now records the physically present host's own outcome immediately; a remote
  host does not receive that observation or cooldown. The earlier full-suite run was
  stopped for this finding, not counted as a pass. Three final fixed-seed screens are
  recorded below.
- The final regression found an obsolete current-protocol assertion in the existing
  memory experiment (expected 28, received the deliberately introduced 30). Its behaviour,
  conservation and memory assertions passed. Only the current protocol assertions/imports
  were updated to 29/30; no fixture, threshold or historical expectation changed. The
  memory file and actual meeting replay then pass **14 tests / two files** in **14.51 s**
  (`autonomy-meeting91-memory-final.log`); the original failure remains recorded.
- The complete run exercised **297 files / 1,999 tests** in **419.30 s**: **1,990 passed**,
  and nine failed solely on the intentionally changed current protocol/observation numbers,
  across six files. The five remaining files were corrected only at those version assertions
  and pass **16/16** in **1.95 s** (`autonomy-meeting91-versions-final.log`). Together with
  the memory rerun, all nine findings are resolved without a runtime change. This is a full
  run plus focused corrections, not a claim that the original run exited successfully.
  Historical mappings and fixed reference data were not rewritten. Reference-helper
  typecheck also passes (`autonomy-meeting91-reference-types.log`).

No reliable rescheduling frequency, aggregate welfare gain, long household viability or
mature Large-world performance is claimed. The entire wider programme remains required.

### Final ordinary five-day screen

`scripts/meeting_arrangements_observe.ts` uses the same fixed Normal/current-rich river,
forest and meadow worlds, immigration off, **12,000 ticks** each. Each report retains its
source manifest, **2,800 repeated living-person samples**, **100 full-state observer-purity
checks**, exact unobserved twin, daily conservation and validated final save. All end with
28 living people and no deaths. Repeated samples are not independent opportunities.

| Transition | River | Forest | Meadow |
|---|---:|---:|---:|
| Invitation approach starts | 2 | 6 | 0 |
| Completed invitation conversations | 1 | 5 | 0 |
| Heard guest invitations / accepted / refused | 1 / 0 / 1 | 5 / 4 / 1 | 0 / 0 / 0 |
| Host starts / successes / failures | 0 / 0 / 0 | 2 / 2 / 0 | 0 / 0 / 0 |
| Guest starts / successes | 0 / 0 | 4 / 4 | 0 / 0 |
| Actual food placed / people eating portions | 0 / 0 | 7 / 6 | 0 / 0 |
| Cancellation-update / replacement starts | 0 / 0 | 0 / 0 | 0 / 0 |

The unused invitation approaches failed because the intended partner was busy. In meadow,
four sampled invitation offers include one ranked first, but no invitation actually starts.
Forest has six sampled leftover-recovery offers and no selected recovery. Neither sampled
ranking nor an accepted invitation is counted as physical completion.

**Ordinary causal story:** at forest fire #895, Maren #939 invites Dov #940 through
conversation #2258 (heard tick **2,920**, agreed **3,440**). Dov physically arrives at
**3,275**, eats at **3,377**, and records that personal experience. Maren, #935 and #923
also eat; the meal ends at **3,383**. Dov later invites #902 through conversation #3103
(heard **5,442**, agreed **5,962**) at the same fire. #902 arrives at **5,816** and eats at
**5,847**, after Dov eats at **5,845**; the second meal ends at **5,853**. This establishes
repeat useful visits by Dov, real contact and food exchange. It does not establish that the
new experience nudge caused that second invitation, whose recipient was different, nor an
aggregate improvement or ordinary replacement invitation.

**Preserved refusal/failure:** river Kai #1131 invites #1116 to fire #1102 through
conversation #5126 at **10,195**. The reply at **10,217** declines in favor of the guest's
own plans. Kai ends their hosting intention at **10,563** because nobody accepted, before
laying any food. A separate approach by #1113 to Arlo #1150 fails at **5,327** because Arlo
is busy. Forest likewise preserves Dov's failed approach to Jax #928 at **5,561**, and #943's
later refusal. These outcomes are not suppressed or reclassified as success.

Final-source costs are **43.779 / 37.724 / 35.542 seconds**, measured while regression work
also ran; saves are **3,292,309 / 2,763,185 / 2,543,574 bytes**. These are short-screen costs,
not isolated or mature Large-world performance. Evidence lives under
`autonomy_evidence/r91-final-{river,forest,meadow}`. Initial `r91-*` runs and the repeat-host
failure remain retained. Final full regression is still pending; longer and paired
measurements remain owner-run commands under `AUTONOMY_VALIDATION.md`.

This audit began against published rules 89. Rules 90 implements its physical leftover
prerequisite (`MEAL_LEFTOVERS.md`); private arrangements remain the next implementation.
It continues A4/A8/A14 and the existing shared-meal, household-practice and contact paths.

## Existing mechanisms to preserve

`meals.ts` already owns invitation through actual conversation, voluntary acceptance/refusal,
promised servings, personally communicated place knowledge, arrival, actual table inventory,
bounded gathering/eating windows, urgent departure and meaningful outcomes. `occasions.ts`
owns calendar/event gatherings; `leisure.ts` supplies known shared and quiet destinations with
personal tastes and recent visits. `household_practices.ts` learns from real shared portions.
None is absent, and no new generic social hub or compulsory schedule is justified.

`tests/community.test.ts` covers normal meals, capacity of invitations, no food/no show,
danger/death/place loss and refusal cooldown. Its no-food expectation is immediate guest
release under historical rules. New local-knowledge behavior must preserve those historical
rules and add explicit current contracts; do not weaken the existing test to hide a change.

## Reproduced prerequisite gaps

`autonomy_evidence/meal90-audit.ts` and `autonomy-meal90-boundary-audit.log` exercise the current
rules-89 cancellation boundary. The setup explicitly declares a table populated by a real
transfer, a host away from it and a distant accepted guest. It is a staged boundary reproduction,
not a claim that an ordinary host travelled there in this run.

- Four bread units on the table instantly move into the host's pack **48.738 tiles away**.
  `returnTable` calls `transfer` with capacity **99**, without location/interior/pack checks.
  Conservation still passes: balance alone does not establish physical custody or capacity.
  A second declared contact/load fixture (`autonomy-meal90-pack-audit.log`) uses real transfers
  to load the host to **11/12 weight** while four bread remain on the table. Cancellation then
  produces **15/12 weight**, still with a balanced ledger. This separately reproduces the pack
  bypass at the same place, without depending on the distant-host case.
- The uninformed distant guest immediately gets the exact cancellation reason in their log.
  `cancelMeal` writes all accepted guests regardless of contact. `mealOf` also drops the
  cancelled arrangement globally, so later options can implicitly learn its status.
- The place and time are read from the shared operational meal record. There is no versioned
  personal acceptance snapshot for later delay/cancellation/revision; private knowledge and
  current truth must be separated before adding rescheduling.

The next implementation dependency is physically lawful leftover recovery and cancellation
knowledge. Trace host interruption during gathering versus leaving during eating, remaining
food, dead/absent/full-pack hosts and guests in another interior. Keep actual food somewhere
after the meal ends; no transfer across a wall, remote return or arbitrary 99-capacity bypass.
Reuse existing piles/storage/withdrawal where their ownership contract is sufficient. If an
ownership claim is necessary, define its scope/expiry and actual collection checks explicitly
rather than silently making private goods communal or creating a second inventory system.

## Remaining arrangement contract

Retain a bounded personally heard arrangement (original teller/event/tick, place, agreed time,
accepted/refused reply), and use that knowledge for departure and bounded waiting. A distant
cancellation must be learned through actual contact or local arrival evidence. A guest seeing
an empty table does not thereby know the host died, why another guest is late or anyone's
private intent. Preserve a truthful timeout and urgent alternative.

Connect a voluntary revised time/place or cancellation and acknowledgement through the same
conversation machinery. Revisions require the other party's hearing/acceptance; unknown or
stale arrangements cannot be changed remotely. Keep material promises, attendance intentions
and actual consumed portions distinct. A missed known meeting can influence a later eligible
arrangement once, without treating inability as deliberate breach. Reuse bounded existing
social history where it owns this event; do not add a second generic memory database.

Acceptance requires a real contact → agreed place/time → travel/wait → useful shared meal or
other actual exchange, with cancellation/revision and save/load negatives. Ordinary repeat
contact, quiet refusal and null/failed gatherings need their own fixed-window denominators.
Inspection must show what each participant knew then and whether the arrangement was merely
promised, locally cancelled, actually heard or completed. AI follows the same legal offers and
cannot read the observer's global meal state. Long ordinary validation remains pending under
`AUTONOMY_VALIDATION.md`; every other unfinished programme row remains in the main register.

## Existing ordinary meals in the unchanged rules-89 five-day saves

Read-only deserialization of the already completed fixed screens (no additional simulation),
`autonomy-meal90-ordinary-audit.log`, finds:

- **Forest:** meal #2263, host #939, fire #895; created tick 2,920, agreed tick 3,440;
  invited/accepted #940/#923/#935, all three arrived, and #939/#935/#940/#923 ate. Final
  status is done, "4 ate together", no missed guests and no remaining table inventory.
- **River:** meal #5131, host #1131, place #1102; created 10,195, agreed 10,715;
  invitee #1116 is recorded as declining for their own plans, nobody ate, and the meal ended
  cancelled because guests could not come. Preserve the refusal and empty gathering.
- **Meadow:** no meals in the retained records.

The actual start counters are host/guest **1/0, 1/3, 0/0** for river/forest/meadow. These
establish an ordinary successful shared meal and a refusal, not repeat attendance, later
arrangement learning, a cancellation communication path or aggregate benefit. They reinforce
the instruction to extend existing shared places rather than adding a duplicate hub.

## Physical prerequisite and the next knowledge boundary

The rules-90 candidate is documented separately in `MEAL_LEFTOVERS.md`. It keeps food at the
site, preserves household ownership and uses actual bounded collection. It does not repair
the distant cancellation log or the shared-status knowledge read. Its ordinary river trace
also exposes an existing unhelpful transition: the host sets out food despite having heard
the sole invitee decline; the gathering then cancels on the following tick. Do not conceal
that refusal, force attendance or raise cleanup above every legitimate need to hide it.

For the next slice, separate the operational table from each participant's personally heard
arrangement. Existing meals already bound participants and live/history records. An explicit
per-participant acceptance snapshot belongs to this operational meeting owner; it is not a
second general social-memory database. Retained outcome experience should use the existing
bounded relationship memory, with an explicit meal event identity and source, after the
operational record expires. The request-receipt store has mandatory asker/helper semantics
and is not the owner of attendance. Preserve its meaning and existing relationship/history
bounds. Do not overload material commitment or helper competence with attendance.

Audit every `mealOf` caller, including candidate invitations, guest departure, host invitations
and the observer view. Other people's private attendance cannot be read just because they
are visible. A guest's departure uses their heard time/place and their own timeout, even if
the remote table manager has ended the meal. Arrival can establish an empty place or absent
meal; it does not establish a death, refusal, wolf or deliberate breach elsewhere. Early
arrival needs a bounded wait rather than omniscient immediate failure. A host who heard every
guest refuse has local grounds to stop before setting out food.

Actual cancellation/acknowledgement should reuse conversation processing, with contact
rechecked through the existing same-space boundary. A global cancellation event remains an
observer fact; it is not a broadcast to every guest. Host death, distant danger, loss of the
place and urgent departure need separate knowledge tests. Preserve unknown causes, legitimate
refusal, urgent alternatives and original invitation provenance through save/load.

Time/place revision must be heard and voluntarily accepted. It cannot move already-laid food
or silently revise an uninformed guest's original appointment. Bound revisions and retry,
retain both old and new agreed information, and avoid a new generic hub or rigid schedule.
The physical and communication slices still do not close ordinary repeated successful
meetings, long-term household outcomes, broad causal inspection or AI goal proposals.

## Predeclared next implementation and failure cases

Rules 91 will retain each participant's heard place/time and answer inside the existing
bounded meal owner. Decisions read only that participant's snapshot. Actual table stock,
arrival and consumption remain physical world facts; a snapshot never creates food or
reserves another household's goods. An ended remote table does not erase a living person's
appointment. Locally observing an empty meeting place supplies no explanation of its cause.
The guest may wait until the agreed time plus the existing 500-tick guest window, with
urgent needs still able to interrupt. Personal timeout supplies a truthful unknown outcome.

A host's own interruption, actual refusal or local observation supplies grounds to cancel;
distant operational cleanup alone supplies none. A cancellation speech act and its later
acknowledgement are separate contact-checked phases. Interrupted speech may be retried after
a bounded cooldown. It cannot remove a different meal or another suspended obligation.

One replacement invitation may follow a personally known failed arrangement. It uses a new
meal ID, retains its predecessor, requires actual contact and a voluntary answer, and keeps
unheard participants' original appointments intact. Already-laid food remains at its real
site. No recursive revision chain, compulsory attendance or repeated postponement is allowed.
The host's own remembered failed meeting can justify additional preparation time in that
later invitation, without inferring bad faith or reducing unrelated helper competence.

Predeclared success: actual invitation conversation, acceptance, saved travel/early waiting,
physical shared food, and a personally sourced outcome influencing a later eligible choice.
Failure cases: remote cancellation/death/place loss, different interiors, interrupted update
before/after hearing, refusal of a replacement, urgent departure, unknown cause at an empty
place, full operational history and stale/repeated revision. Historical rules-90 references
must remain exact. Measure ordinary offered/selected/started/heard/answered/arrived/ate/end
separately in the same fixed five-day seeds; retain zero or failed revision opportunities.
