# Resuming an occasion after conversation — rules 112

Owner: `src/sim/occasion_recovery.ts`. This completes the next execution boundary
exposed by the rules-111 attendance measurements; it does not make visits sticky.

The generic pause path reset work progress and converted the activity back to
travel. Resumption then looked for every non-person/non-tile target in `byId`.
Occasions live in `world.occasions`, so a valid occasion id failed that lookup and
the saved visit disappeared without an ending callback. A contract test failed on
the predecessor source at the attempted resume.

At rich rules 112, an attendance pause keeps its actual phase and progress.
Resumption checks the occasion in its owning collection, the original timeout,
the event's closing time and the physical place. A guest resuming participation
must still be there and awake/outside; a pre-arrival journey cannot reuse an
already completed visit. Early waiting remains waiting and grants no attendance
credit. An invalid paused visit ends through the ordinary ending boundary with a
reason. A valid one keeps its original id, duration and expiry, receives no new
admission or reward, and remains interruptible by ordinary decisions.

Existing modules touched, and why:

- `activities.ts` asks the occasion owner whether to retain work progress and how
  to revalidate this one target kind. All other activity families retain their
  prior pause/resume path.
- `rulesversion.ts` gates the change at 112; old saves keep the old semantics.
- `scripts/lab/lab.ts` adds `rich-no-occasion-recovery`, removing only this slice.

No saved field, schema, protocol, resource, timer extension or new global knowledge
is introduced. The already-saved activity carries the retained progress.

## Evidence and ordinary measurement contract

The initial focused run passes 58 tests across recovery, participation, the
immutable-111 reference, care handback and layout claims. An additional fresh-review
contract verifies that critical thirst cutting a real conversation short records
the interrupted visit; all 11 recovery contracts pass. These include real offered
and accepted conversation, a saved pause and exact continued completion, old/lab
behaviour, closed/missing-place/distant/expired refusal, early waiting and urgent
interruption. Typecheck/build pass with the existing bundle-size warning.

`occasion112-rendered` passes 8/8; both screenshots inspected. The labelled staged
guest is talking with Ben, then resumes the same feast with retained progress.
Its actual ending succeeds once, admission stays singular, saved twins/reload are
exact and item accounting balances. No ordinary adoption is inferred from it.

Before results: Normal meadow and river, 20 days each at rules 111 and 112,
immigration off. `occasion_recovery_observe.ts` retains the attendance measurements
and adds tick-boundary pause, progress, resume and missing-ending counts. It adds
no events, goods, knowledge or choices. The expected transition is a real paused
ordinary visit resuming when still valid, with an explicit ending if no longer
valid. Source is frozen during the runs. Same-tick transitions can be missed;
lost-progress counts are lower bounds, and the worlds can diverge. Full regression
and these four windows are running; no aggregate household benefit is claimed.
