# Talia: food that gets home, and time to be a child

## Authority and starting point

Owner instruction, 1 November 2026: implement Talia's requests in a separate branch,
fix food delivery and replay, add meaningful family time, play with siblings and other
children, and learning; then inhabit her life again. Delivery is this branch, not main.

`feature/talia-lived-childhood`, worktree `C:\dev\Claude Experiment\living-world-talia`,
starts at `c3f1310709831d7e90be2bdcbc023f33c8a391a8` on `feature/pavel-lived-life`.
This is the exact rules-117 source of the preceding Talia visit, with Pavel's completed
increment and its immutable continuation. Main is still at rules 116. The original
integration checkout is on a separate repair lineage (`320c521`, rules 118), with
untracked evidence preserved. Neither its history nor its files are absorbed here.
Rules **119** is the next unused number; this build deliberately does not accept 118.

## Evidence and dispositions

Original rendered visit: `living-world-civilian-visit-20261101/civilian_evidence/`.
Talia, age eight, meadow normal profile, immigration enabled, ticks 2400–9600:
40 applied choices, no rejected choices or transport failures. Read its REPORT.md and
original transcript for exact observation limits. This was manual inhabiting, not an
autonomous benefit test.

* **Reproduced:** two fish, one berry and one seed leave insufficient pack room for
  another gathering unit, but three food portions do not meet the ordinary two-portion
  surplus deposit threshold after retaining two for oneself. A child can now return one
  unreserved surplus portion to their own home. Actual arrival, ownership and store
  capacity still decide the transfer. Adult/public-store thresholds stay unchanged.
* **Reproduced:** a child with a sibling can withhold their own breakfast because the
  generic food choice reserves two portions for each dependent. Children now keep
  access to their own carried meal without taking on the adult provisioning reserve.
* **Reproduced:** browser versus Node replay rejected an identical first observation
  and answer because a routine record captured warmth as `71.21084038161287` versus
  `71.21084038161288`. Those raw digits entered JSON in the state hash. Rules 119 records
  routine ETA, starting energy and warmth at four decimals, matching the simulation's
  existing need fingerprint precision. Strict replay checks remain enabled. Historical
  rules-117 recording is retained unchanged; its old numeric behaviour is not rewritten.
* **Reproduced missing capability:** the previous 40 choices offered no child-initiated
  family time, play or practical lesson. New invitations use first-hand visible people,
  actual contact, ordinary willingness to stop, paired paid time and persistent effects.
* **Valid behaviour:** solitude can be interrupted by company, people can be busy or
  refuse, food can run out, and an activity still underway at the observation window's
  end is not a failure. None is forced to succeed.

## New capability and stronger connections

A child can invite a family member to sit and share their day, invite a sibling or
another visible child to a turn-taking guessing game, or ask a familiar adult to
practise recognising food plants. Family time and play take 120 shared ticks; practice
takes 160. The existing social approach handles walking, space, availability and
voluntary contact. Survival, avoidance and separation can interrupt the activity.

Only completed time changes relationships, social need and a fading mood thought.
At most four relationships keep up to three childhood experience kinds, each with a
dated, capped count. Those memories slightly favour a later invitation; a daily limit
prevents repeated play or lessons from crowding out life. Lessons require a genuinely
more skilled adult at contact and increase foraging skill by about 0.025 (four-decimal
recording precision), capped at
the teacher's skill. They create no food or remotely acquired beliefs. Existing
foraging uses the actual skill. Existing continuing-company records also receive the
shared experience where their own eligibility conditions hold.

Activity labels, actual ending, relationship history and mood explain the consequence.
Session progress and remembered experience are saved, validated and fingerprinted.
`rich-no-childhood` removes the childhood choices and child food policies in the lab.
The routine numeric repair remains a rules-119 compatibility boundary.

Reserved children can also seek the existing quiet activity while their crowded
thought is still active. The candidate destination is nearby explored ground, checked
against people the child can actually see; unseen people can still make it unsuitable
on arrival. A successful quiet interval suppresses immediate repeated adoption from
the old fading thought. While pursuing quiet, they can decline casual talk, trade,
play or lessons. Warnings and necessary requests retain the existing contact path;
physical company can still interrupt solitude. This is a bounded extension of the
existing temperament owner, not a guaranteed private space.

Rules-119 inspector ages and promise deadlines now use the same explicit world clock
as the inhabitant panel. Historical controller observation wording remains unchanged.
No simulation duration or rate was altered for this presentation repair.

## Verification record

The frozen runtime passes `npx vitest run --maxWorkers=8`: **377 files passed,
1 skipped; 2,372 tests passed, 1 todo; exit 0; 316.56 seconds**. The existing skip,
todo and budget-test timeout-overflow warning were not changed. `npm run build`
passes TypeScript checking and production bundling; the existing chunk-size advisory
remains. `git diff --check` passes.

Focused contracts cover physical food transfer, protected promises, capacity changing
after an offer, child self-feeding, the reproduced numeric boundary, paid shared time,
refused instruction, separation and need interruption, remote absence, local danger,
observer purity, daily limits, quiet boundaries, clock compatibility and exact saved
continuation. No historical golden or continuation record was rewritten. The new
rules-119 continuation passes separately **1/1**, with 24 childhood relationship
experiences by tick 3000 and full serialized equality after another 120 ticks.

Fresh self-review found and fixed four concrete issues: successful conversations did
not populate the activity result; a distant remembered wolf suppressed every child
invitation; another child could be invited to repeated play despite their own daily
limit; and a fading crowded thought could immediately prompt another quiet interval
after successful solitude. Tests retain each relevant boundary. The quiet-contact
fixture originally pinned the inviting person's activity and was corrected to allow
the actual contact attempt. No runtime rule was weakened to satisfy it.

Earlier development runs remain in `talia_evidence/`: one loaded the pre-fix food policy
before a newly written lab-removal test was collected; another mixed development and
hit subprocess timeouts under unrestricted concurrency. The frozen eight-worker run
above is the final full result. Test timeouts and assertions were not relaxed.

Three ordinary five-day worlds (meadow, river, forest), followed by 120 saved-continuation
ticks, preserve complete save equality and resource conservation. They record 162,
130 and 146 participant endings of childhood activities respectively. These include
unsuccessful invitations and interruptions and count participants, not unique paired
sessions. See `ordinary-summary.json` for dispositions. They establish ordinary
activation, not aggregate welfare or mature-world benefit.

The rendered manual visit and its strict replay are documented in
[`../talia_evidence/REPORT.md`](../talia_evidence/REPORT.md). The original rules-117
recording and both exploratory pilots remain separate from final acceptance evidence.
