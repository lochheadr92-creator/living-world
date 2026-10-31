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
existing bundle-size warning. Full regression is running on this final source.

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

Open: arrival/access failures, late trips, repeated ordinary household leisure,
adequate reserves and household viability. Staying longer may cost work or expose
someone to later pressure; those outcomes must be reported rather than assumed away.
