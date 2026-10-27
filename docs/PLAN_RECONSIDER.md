# Rules 34 — plan reconsideration

A private plan whose material can no longer be fetched — the person knows no source of it with anything left, and no one has
promised to bring it — is relinquished with that reason, instead of being retried forever.

## The rule

`src/sim/intent.ts reviewIntentions`: for an active plan whose current step is `get` a material (`stepItem`), if
`outstandingForPlan` is zero (no one promised to bring it) and `hasKnownResource` is false (the person's own beliefs hold no
source of it whose `estimatedAmount` — belief plus regrowth — is above zero), the plan is dropped, its reservation released
(`wants = {}`), and a log line records the reason.

## Ownership and bounds

- Only the person's own knowledge is read (`p.beliefs` via `beliefsByKind`, `estimatedAmount`) and their own requests
  (`outstandingForPlan`); no world truth.
- Promise priority: a plan whose material is owed by a live promise is never dropped by this rule.
- Retain/defer/relinquish: with a known source the plan is kept; without one it is relinquished. A critical need or a wolf still
  sets it aside rather than dropping it (the existing path), and a regrowing source the person remembers still reads as
  `estimatedAmount > 0`, so the plan is kept and the person waits.
- The diagnostic off-switch `rich-no-reconsider` removes only this reconsideration and changes nothing below rules 34.
