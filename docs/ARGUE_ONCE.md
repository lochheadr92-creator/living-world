# An argument does not start with somebody already arguing: rules 194

Predecessor rules 193 is pinned by `tests/v193_continuation.expected.json`. Origin: the full suite at the rules-193 head (`review_evidence/repairs-20261111/suite-head-193.log`),
where `tests/suspended_scan.test.ts` failed: in the ordinary five-day river world (arrivals off) a paused activity vanished at tick 7,262 without reaching the rules-116
ending path. Stream: repair (`docs/RULES_RANGES.md`), the last number of its claim.

## The defect (every version up to 193)

`startArgument` (`social.ts`) puts both parties' current activity on hold (`suspendActivity`, `activities.ts`) and starts an `argue` activity for each. It refused only when
either party was in a conversation (`convId`). An argument is an activity, not a conversation, so a second argument could start on a person in the middle of a first (a
contest lost to a third person, `contestLost`, is the one caller). `suspendActivity` then wrote the first argument into the held slot over whatever was already there,
and that earlier paused activity was gone: not resumed, not ended, its claims already released. In river Alma was eating, was pulled into an argument with Emre, and the
second argument with Arlo overwrote the paused meal (`scratchpad` probe `susp_probe.ts`, reproduced at the 193 head). A conversation cannot open on an arguing person
(both carry `convId`), so this is the only nesting the code allowed. The hole is older than 193; that version's trajectory reached it in river, and ordinary gen-2 with
arrivals on reaches it at tick 252 at rules 193 (meadow and birch do not inside 12,000 ticks).

## The rule (rules 194, rich worlds)

`src/sim/argue_once.ts alreadyArguing`, asked first thing in `startArgument`: when either party's current activity is an argument, the second argument does not start.
No suspension, no cooldown, no grievance, no event, no feed line for it; the contest that would have started it still records its own grievance and feed line, as before.
Rules 193 and earlier, authored worlds and `setArgueOnce(false)` keep the old behaviour.

## Evidence

- Contract tests `tests/no_nested_argument.test.ts` (6, each with the rules-193 contrast): at 193 the second argument overwrites the held meal, which vanishes without an
  ending; at 194 it does not start, the first argument and the held meal are untouched and nothing is recorded for the second; the newcomer cannot be drawn in either way
  round; two people not arguing still argue; the switch off and an authored world nest again. `tests/suspended_scan.test.ts` passes again at the current rules;
  `tests/causal_events.test.ts` and `tests/rules_version.test.ts` pass beside them. `npm run typecheck` passed.
- Immutable pin `tests/v194_continuation.*` (Normal gen-2, arrivals on, 2,400 ticks checked every tick for an argument paused under another, then 120 after a save and
  load), recorded from a clean checkout of `03b430b6` (`review_evidence/repairs-20261111/pin194.log`).
- Twin and paired lab: `review_evidence/repairs-20261111/twins/r193-r194/` and `lab194/` (12 seeds, Normal, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`,
  rules 193 pinned against 194, clean checkout of `dc9ac993`). Results are in the AGENTS.md checkpoint paragraph and below.

Twin (`scripts/ab_probe.ts` and `ab_compare.ts`, 12 seeds, Normal, 25 days, arrivals on, control arm, clean `dc9ac993`): the final world is identical at 193 and
194 in 9 of 12 seeds (aspen, birch, cedar, gen-1, gen-3, gen-4, gen-5, gen-6, meadow) and differs in fern, gen-2 and river; conservation and the tool registry hold in
12 of 12 pairs. Paired lab (`scripts/lab_versions.ts`, 12 seeds, Normal, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 193 pinned with `--rules
193` against 194, clean checkout of `dc9ac993`, `dirty` false, `modified` empty): nothing moved by more than a single draw moves it. People 22.4 against 22.7 (+0.2
[-0.7, +1.1]), deaths 9.6 against 9.1 (-0.4 [-1.3, +0.2]), chats 103.9 against 102.0, family time 61.7 against 62.2, child play 53.6 against 54.6, foraging practice
94.2 against 95.6: every metric not distinguishable from chance, the three that are systematic (life share, child life share, thirst exposure) inside their floors.
No benefit or harm is claimed; the rule closes a hole, and the worlds that never reach it are untouched.
