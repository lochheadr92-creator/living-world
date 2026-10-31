# Shared-place arrangements — current-source audit

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
