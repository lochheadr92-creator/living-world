# Completing known construction — rules 109

## Reproduced defect

The valid finite home-loss fixture retained at rules 108 stops at 197.6603902139764
of 200 work, with all four wood already consumed. `options_work.ts` used
`progress < min(1, 0.06 + fractionAvailable) - 0.02` for every construction offer.
The margin is useful at partial-material boundaries, but excludes the last two
percent even when all materials are known to be supplied. It can remove the option
while the person is already working, or prevent resumption after a break. Physical
execution already knows how to finish; this is an option-eligibility defect.

Two focused tests fail before the change: a rested builder is not offered the last
work, and autonomous continuation fails to finish the staged near-complete site.
This isolates the option boundary from the separate thirst/energy gates. The older
five-day adverse trajectory is not evidence that this is its only survival problem.

## Bounded correction and ownership

`construction_finish.ts` allows a remembered fully supplied site to remain eligible
while remembered progress is below one. Partial-material margins, urgent needs,
permission, slots, actual material consumption, labour and completion remain with
their existing owners. It reads no live site to override the person's knowledge.
Rules 108 and older retain the old result; lab removal is
`rich-no-construction-finish`. No new saved fields or AI protocol.

Existing modules touched: one eligibility call in `options_work.ts`, the version
owner and the lab switch. `act_build.ts` is unchanged. The rules-108 reference was
verified and pinned at `51b8591` before 109 was allocated; it is never regenerated.

## Evidence and limits

Eight tests cover eligibility, actual autonomous final work, exact save continuation,
legacy/removal, completed/partial boundaries, stale knowledge, urgent thirst, and
the unchanged valid home-loss fixture's full gathering → hauling → building →
sheltered sleep sequence. Focused housing/layout/golden/reference regression passes
93 tests in six files before the additional journey test; the final construction
file passes 8/8. Typecheck and production build pass (existing bundle-size warning).
The full regression is running separately and is not yet claimed here.

Two real-page checks: `finish109-rendered` passes 5/5 for the explicitly staged
199-of-200-work boundary; `home109-rendered` passes 7/7 for the same finite observed
collapse fixture that failed at 108. In the latter, the inhabitant independently
lays out, gathers, hauls and builds, completes at tick 3,573, then sleeps at that
lean-to and restores energy across a save. Both screenshots of the completed
lean-to/use were inspected. The prior labour in the boundary-only scene is staged
and explicitly labelled; the collapse scene's labour is executed by the simulation.

The full five-day diagnostic at 109 remains adverse: Ada dies of thirst at tick
7,343. Exact twins/reload and all-item conservation pass. This is **replacement and
use, not household viability**. Rules 107/108 failed to finish and died at tick
7,371; that timing difference is not a mortality-benefit claim.

Initial fixed five-day ordinary river/meadow screens each retain 2,800 live-person
samples, 100 pure checks, exact twins/reload, full conservation and no deaths.
There are 291/275 near-complete remembered-site samples and 61/21 samples where
removing this correction removes a build offer. No build *starts* within the last
two percent were seen. Because the correction can keep an already-running action
eligible, a follow-up on the same predeclared windows records actions entering and
finishing that final portion as well; its separate reports retain the initial results.
Neither sample counts nor a completed staged home establish aggregate benefit.

That follow-up finished with the same initial hashes and unchanged simulation
source: river 16 actions reached the final two percent, 10 ended successfully and
6 partially; meadow 11 reached it, 8 succeeded and 3 ended partially. The offer
differences and denominators are unchanged. Twins, reload, purity and conservation
pass, no deaths. Reports are `finish109-{river,meadow}-5-completions`. These are
observed endings, not a matched estimate of extra homes caused by the correction.

Fresh review: the helper changes only the fully supplied case and has no observer
mutation; partial availability, old versions and switch restoration have tests;
actual ownership/material work is still enforced by existing handlers. The
remaining thirst failure and ordinary-collapse reliability remain open under WS4/16.
