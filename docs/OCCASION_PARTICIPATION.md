# Staying through an occasion — rules 111

Owner: `src/sim/occasion_participation.ts`. Programme A1 / social-place use.
This slice follows a reproduced ordinary failure, documented in
`HOUSEHOLD_RHYTHM_MEASUREMENT.md`; it does not retune needs or leisure scores.

## Contract and failure

On physical arrival, `occasions.ts` records a person in `attended`. The same module
previously excluded every attended person from future offers. `decision.ts` then
valued their current activity at zero because its option was missing. Ordinary
review could therefore abandon a gathering after one participation tick.

At rich rules 111, the existing offer remains available only for the same actual
`attend` activity, in its work phase, with progress below its duration, the matching
occasion id, recorded admission and current physical presence at an open gathering.
Its label becomes “Stay at the …”. The existing score, ranking, stronger-needs
interruption, danger, closing time, physical handlers and finite duration remain
in charge. This is not a sticky action or another reward. After completion or
departure, past attendance still prevents a second visit. No new saved state,
protocol, resource, claim or global knowledge is introduced.

Existing modules touched, and why:

- `occasions.ts`: distinguish an ongoing admitted guest from a completed visitor;
  describe staying honestly. Admission, exchange and handlers are unchanged.
- `rulesversion.ts`: declare new behaviour and preserve every predecessor.
- `scripts/lab/lab.ts`: `rich-no-occasion-participation` restores the old boundary.

## Verification and predeclared ordinary window

The first contract test failed on the old source because the ongoing option was
absent. Nine contracts now pass: retained option/review, completed participation
across a save, one admission, pure observation, no re-entry, prior rules and lab
removal, closed/remote/finished cases, critical thirst and stronger noncritical
hunger. Together with occasions, market locality, traditions and immutable rules
110, the focused run passes **28 tests in 5 files**. Typecheck/build pass with the
existing bundle-size warning. Full regression passes **348 files / 2,244 tests**,
519.73 seconds, on the final source. Runtime `0d6db43`; immutable reference
`5617c0d` was added after collection and passes separately (10/10 with the nine
participation contracts).

`occasion111-rendered` passes **7/7**, both screenshots inspected. The supplied
adult is explicitly staged already at a known public fire. The engine's offered
action admits her; ordinary continuation completes the bounded attendance with
one admission, exact save twins/reload and conserved items. This is mechanism
evidence, not spontaneous household activity.

Before observing results: fresh Normal meadow and river, 20 days each at rules 110
and 111, immigration off, no supplied events/resources/decisions. The script
`occasion_observe.ts` records offered opportunities, starts, physical admissions,
participation ticks and endings separately; it also retains full exclusive time
budgets, critical exposure and adverse outcomes. The expected transition is that
some admitted guests can complete participation ordinarily, while legitimate
interruptions remain. No-opportunity windows remain null. Worlds may diverge, so
raw differences are not paired opportunities or a general welfare estimate.

All four runs reached tick 48,000, with 400 pure inspections, exact unobserved
twins/reloads and conserved items. Reports: `occasion{110,111}-{meadow,river}-20`.

| Ordinary measure | Meadow 110 | Meadow 111 | River 110 | River 111 |
|---|---:|---:|---:|---:|
| Living-person samples | 10,454 | 10,454 | 11,619 | 11,591 |
| Attendance offered samples | 99 | 182 | 314 | 401 |
| Attendance starts | 8 | 36 | 109 | 86 |
| Activities observed physically admitted | 4 | 20 | 92 | 76 |
| Admitted participation ticks | 153 | 2,739 | 3,323 | 11,423 |
| Successful attendance endings | 0 | 17 | 2 | 66 |
| Interrupted attendance endings | 5 | 1 | 87 | 4 |
| Failed attendance endings | 3 | 14 | 10 | 6 |
| All critical-need ticks | 77,533 | 74,463 | 18,558 | 13,459 |
| All work ticks | 142,372 | 145,875 | 172,339 | 168,642 |
| Deaths | 4 | 4 | 0 | 0 |
| Final population | 24 | 24 | 32 | 31 |

Ordinary ongoing-option samples at 111 are retained in all 24 meadow and 91 river
cases. The old river run does sometimes finish (2), so the old defect is not an
absolute ban. Meadow has the same four deaths in both versions. River has a
different birth count; no population or survival benefit is established. Work
time changes in opposite directions across the two seeds.

Starts and endings are deliberately not forced to balance: meadow 111 has four
starts with no ending callback, river 111 ten, and neither has attendance active
or suspended in the final save. Review found a further execution gap: generic
resumption looks for occasion ids in the entity registry and silently drops a
paused visit. A staged suspension reproduces it. Rules 112 investigates that
separate boundary; these counts alone do not attribute every missing ending to it.

Open: arrival/access failures, late trips, repeated ordinary household leisure,
adequate reserves and household viability. Staying longer may cost work or expose
someone to later pressure; those outcomes must be reported rather than assumed away.
