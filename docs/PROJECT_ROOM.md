# A shared project never takes a thirteenth participant: rules 196

Predecessor rules 195 is pinned by `tests/v195_continuation.expected.json`. Origin: the full suite at the rules-195 head (`review_evidence/balance-20261111/suite-head-195.log`),
where `tests/save_told.test.ts` failed at 195 and passes at 194: the product world told-beliefs-legacy (Normal, arrivals off), run 5.1 days, could not be loaded
("Invalid project participants"). Stream: balance (`docs/RULES_RANGES.md`).

## The defect (every version up to 195)

A civic project (`townships.ts`) records its participants, refusals included; `canInvite` refuses the ask once twelve are on the record, and `validateTownships`
refuses a save with more than twelve at load. The answer is recorded later than the ask, when the conversation reaches its response phase
(`recordProjectResponse`), and it was pushed without looking at the count again. Two asks in flight at once (a council lets any candidate ask) could both pass the
gate at eleven and both land. In told-beliefs-legacy the first shared storehouse held thirteen at tick 12,031 under rules 195, whose larger settlements have more
people to ask; the same world stays inside twelve at 194 for the test's span. The live world ran on, and the save could never be loaded again. Older than 195.

## The rule (rules 196, rich worlds)

`src/sim/project_room.ts projectHasRoom`, asked by `recordProjectResponse` before a new participant is pushed: when the project already holds `PROJECT_CAP` (12)
and the responder is not on the record, the answer is not recorded there (no participation, no civic choice); the request keeps its own status, as before. A
renewed answer from somebody already on the record is recorded as before. Rules 195 and earlier, authored worlds and `setProjectRoom(false)` keep the old push.

## Evidence

- Contract tests `tests/project_room.test.ts` (5, each with the rules-195 contrast): the staged race (eleven on the record at the ask, one more landing during the
  talk) makes thirteen at 195 and `validateTownships` throws; at 196 the answer is not recorded and the world loads; with room the answer is recorded; somebody
  already on the record is still answered for; the switch off and an authored world push again. `tests/save_told.test.ts` passes again at the current rules;
  `tests/answer_cause.test.ts`, `tests/rules_version.test.ts` and `tests/metabolism.test.ts` pass beside them; `npm run typecheck` passed.
- Immutable pin `tests/v196_continuation.*` (Normal told-beliefs-legacy, arrivals off, 12,100 ticks checked every tick for a project over the cap, then 120 after a
  save and load, which 195 could not do), recorded from a clean checkout of `d254d424` (`review_evidence/balance-20261111/pin196.log`).
- Twin and paired lab: `review_evidence/balance-20261111/final196/` (12 seeds, Normal, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 195 pinned
  against 196, clean checkout of `d254d424`).

Twin (clean `d254d424`): the final world is identical at 195 and 196 in 12 of 12 seeds; conservation and the tool registry hold in 12 of 12. Paired lab
(`scripts/lab_versions.ts`, 195 pinned against 196, control plus two nudges, clean `d254d424`, `dirty` false): every metric differs by 0; nothing moved by more
than a single draw moves it. The race is rare: of the twelve lab seeds none reaches thirteen inside 25 days, and the product world that does (told-beliefs-legacy,
arrivals off) is not among them. The rule changes nothing where it is not reached, and where it is reached it keeps the save loadable. Full suite from the clean
checkout of `d254d424` (`review_evidence/balance-20261111/suite-head-196.log`): 16 files failed of 583, 73 tests of 3,252; against the 195 head one failure is
gone (`save_told`) and none is new. No benefit or harm is claimed.
