# Social scenes: what is built

Plan: `docs/SOCIAL_SCENES_PLAN.md` (Group 1, three bundles). Rules ranges: `docs/RULES_RANGES.md` (260 to 264). Each bundle is one
rules version of three separately switched parts, with a lab removal arm for the whole bundle and for each part. Bundle A (rules 260,
`src/sim/meeting.ts`): all three parts are built (courting, welcoming newcomers, public praise). Results are in "Measured (rules 260)"
at the end of this file.

## Courting (rules 260, part 1)

**What a person can now do.** Two unpartnered grown people who have come to like each other may walk out together, more than once,
before one of them proposes. A person at ease (not hungry, thirsty or worn out, no danger believed about, not after dark) asks one
they can see within 10 tiles, who is no kin, with whom there is a spark, and whom they know well (familiarity 10, affinity 15,
trust 12, on their own record only: they cannot read the other's regard, rules 164). The one asked says yes or "not today". On a yes
both set out to one place the asker chose from what they know (a haunt of theirs within 20 tiles, else water they know, else a point
about 6 tiles from a fire they know), stand side by side for 150 ticks and come away. A viewer sees two people leave together, a
"Walking out with B" line in the inspector, and a line in the feed.

**What it connects to.** Spark and the slow warming of affinity (`relations.ts`, `social.ts`); proposals (`options_social.ts
optPropose`, `social.ts case 'propose'`): from two walks the proposer scores +6 where before two they score -4, and the answerer needs
affinity 24 where it was 28. Courting is not required to propose. Spare-time haunts (`leisure.ts`: a walk to one of the asker's haunts
is noted as time there), want of company, mood, the chronicle (the first walk of a pair), the inspector (history row, doing line,
purpose tables), the story director (`court: 62`), the family hope's nudge (the ask is a 'social' option), and the quiet of rules 227:
two people visibly out walking (`SeenEntity.walkingOut`) are left alone by `leftToWork`, so nobody asks them for a chat, family time,
a game or a walk; and somebody on a walk takes no talk of any other kind but a warning (`acceptsTalk`: "Ben is walking out with Ada").
Danger and a critical need still end a walk.

**Switch and arm.** `setMeeting(on, part?)`; lab arms `rich-no-meeting` and `rich-no-meeting-courting` (`rich-no-meeting-knowledge` is an
older, unrelated arm and is untouched). Rich worlds at 260 and later only.

**Constants** (top of `src/sim/courting.ts`; to be tuned from a lab). Ask: 30 + 0.3 per affinity over 15 + 4 x sociability + 8 of an
evening (18 and 20 at first, then 26: the ask seldom ranked first against work by day or the evening fire). Yes: affinity 15, hunger and thirst
drives 40, not worn out, a roll under 0.7 + 0.3 x sociability from a hash of the ids and the tick. Walk: 150 ticks standing (the walk
there is extra), together is within 3 tiles for half of it. Counted: affinity +4, trust +2, familiarity +2, company +10, a glad day, a
day's rest from each other and half a day from asking anybody. Saved: `Relation.courted {n, last}` on both sides,
`Relation.courtRefused` (1 to 3), the walk's record in the activity's data.

**Refusal and interruption.** A refusal: the asker waits a day, the third running (and each after) costs 6 affinity and three days, a
yes clears the count; the feed says "A asked B to walk out; B said not today." Danger or a critical need of either ends both walks, and
so does a walk where they were together under half the time: nothing counted, a quarter-day's wait (my value), "A and B set out to
walk together and turned back."

**Tests.** `tests/courting.test.ts`: each reason against the ask, the answer, the walk, refusals, called away, the two proposal
adjustments on and off, the gates, the arms, save/load/continue, a third person's chat, and an ordinary world that prints counts.

**Not measured.** Uptake and its effect on pairing and births, from three seeds (gen-4, gen-2, gen-6), 45 days, the whole bundle on
against off, one run each (so chance). On: asks 0, 14, 4; yes 0, 9, 3; counted walks 0, 9, 2; cut short 0, 0, 1; couples 0, 2, 1. Off:
no ask, no couple. (With the ask at 26 and chats still breaking in, gen-4 had 16 asks and 6 of 9 walks cut short.) Births: 5, 5, 7 on and
3, 4, 5 off; the worlds part company early (welcomes), so that is not an effect.

## Welcoming newcomers (rules 260, part 2)

**What a person can now do.** A grown resident who sees a grown stranger of a household that arrived within the day (and has never
met them) goes over, speaks to them, tells them one water source and one food place the newcomer does not hold, and hands over one
portion of food if they have it to spare. A viewer sees a resident walk up to the arrivals, a line in the feed ("A welcomed the
newcomers B and C and told them where to find water and gave them food"), and the newcomers able to find water on their own.

**The cue.** What A reasons from is a stranger in sight; the household's record of arriving bounds the scene. A is an adult or elder
of another household that did not itself just arrive, at ease (hunger and thirst drives 40 or less, no critical need, no danger
believed about, not after dark), with no welcome in the last quarter of a day, within 12 tiles of the newcomer, who is not asleep or
at work. The household has fewer than two welcomers and A is not one. Worth 34 + 8 x sociability (+4 if generosity is over 0.55,
the line an offer already draws) less the walk (16 at first: the best option beat it by 15 at the median).

**What it connects to.** Arrivals (`lifecycle.ts immigrationTick`, which records `Household.arrived`); told knowledge (`news.ts
tellBelief`, so the source and the teller are recorded as for any told place); the offer's spare-food rule (`surplusOf`), the ordinary
gift (`onGift`: the ledger, the witnesses and their generous-deed record; its own feed line is left out, the welcome's line says it);
relations; mood; the chronicle (a household's first welcome: "A was the first to welcome ..."); the inspector and the director
(`welcome: 58`). Arrivals of a night, or that nobody sees, get no welcome and nothing is written.

**Switch and arm.** `rich-no-meeting-welcome`. Saved: `Household.arrived` and `Household.welcomed` (at most 2), cleared when the
household has a home or three days after it arrived (`welcomeTick`); the conversation carries what was settled until it ends.

**Refusal and interruption.** The newcomer always answers. A talk cut short records nothing: no telling, no gift, no record, no line.
If the newcomer is too busy to stop, the resident waits as for any talk.

**Tests.** `tests/welcome.test.ts`: the cue and each reason against it, a completed welcome (knowledge with a told source, relations,
the record, the line for one, a couple and a family, food only when spare and the ledger balanced), a second welcomer and no third,
a cut-short talk, the clearing, the arrival record, save/load/continue and the fingerprint, and a report from ordinary worlds.

**Not measured.** Whether it changes how the newcomers fare, which was not remeasured at 34. On, three seeds (gen-4, gen-2, gen-6), 45 days:
17, 20 and 19 groups arrived and 16, 19 and 17 were welcomed (most had two welcomers: 29, 37 and 31 welcomes), the first a median of
992, 901 and 740 ticks after arriving; off, none. At 16 it had been 5 of 56.

## Public praise (rules 260, part 3)

**What a person can now do.** Somebody a wolf was driven off, or that was killed after, thanks their rescuer on the spot, and later speaks
up for them in company; the builders of a building for everyone are thanked in company. A viewer sees a thanks said at the moment of the
rescue, and later at the evening fire or a feast a line in the feed: "At the fire Quinn thanked Pat before 5 people for driving off a
wolf." and "At the fire Dan thanked Abe, Bea and Cal for the new kiln."

**The rescue** (`defence.ts resolve`, both outcomes, the one rescued alive and not the rescuer). If they are within 8 tiles they say a
thanks at once (the ordinary thanks lines); they grow fonder (affinity +10, trust +6, the rescuer +3 of them); everybody awake who could
see it holds a `brave` deed first-hand (`reputation.ts`, weighted as `generous`, the rules-183 sight); and they hold one thanks owed
(`Person.thanksOwed`: whom, since, whether the wolf was killed; at most three; each lapses three days on, in silence).

**In company.** At the half-way point of an evening fire sitting (in place of a story that person would tell) and on arriving at an
occasion that has begun (not a funeral): a person holding a thanks owed, to somebody there within 6 tiles, with two others or more
there, says it, and it is cleared. Each other hears it as a story from them (heard, one mouth on) and grows fonder of the rescuer by
2; the rescuer is glad two days; the two grow fonder by 2. The event is kind 'social' and the chronicle keeps it ("At the ..."
and " thanked ").

**A shared building.** `completeSite` marks a finished workplace or hall with no owner `Building.thanksDue` (the tick; cleared when
spoken or three days on). At the same two moments somebody who is not a builder and holds a belief of it, with a builder there within 6
tiles and two others or more, thanks the builders who are there (three names, then "and the others who built it"); each is glad two
days; the others hear a `reliable` story about each named and grow fonder of them by 1.5. Once for the building. A rescue thanks comes
before a building thanks, and one is spoken at a time. **The simplification:** the speaker is taken to know who built a shared building
they have seen (the builders are on the building's own record), and names only builders who are present.

**Switch and arm.** `rich-no-meeting-praise`. Saved: `Person.thanksOwed`, `Building.thanksDue`, both in the fingerprint and checked on
loading; absent below 260 and with the part off. The story director ranks the thanks as events (`src/ui/director_model.ts`: a rescue
thanked in company 70, builders thanked 55; `docs/STORY_DIRECTOR.md`). There is no talk purpose for it.

**Tests.** `tests/praise.test.ts`: a real rescue (driven off and killed) through the defence handler, nothing for the rescuer or the dead,
the thanks owed spoken at the fire and at an occasion (only with the one owed there and two others), the lapse, the heard stories, the
building thanks (once, only with a builder there, not by a builder, after a rescue thanks), `completeSite`, the gates, the arm,
save/load/continue, and an ordinary-world report of the whole bundle.

**Not measured.** The rescue half has never been seen in an ordinary world: in 45 days on six seeds (gen-4, gen-2, gen-6, gen-1, gen-3,
gen-5) no wolf was driven off or killed for a living person, so what rescues do to a name and a feast is untested outside the staged
scenes. The building half: gen-4, gen-2, gen-6 finished 15, 14 and 14 buildings for everyone, all due thanks, and 8, 8 and 9 were thanked
(7, 3 and 4 lapsed unsaid, 0, 3 and 1 still due at the end); with the bundle off, 8, 12 and 12 were finished and none thanked. Whether the
thanks changes who is liked, or who comes to the fire, is not measured.

## Measured (rules 260)

Measured on 26 November 2026 on the uncommitted tree at head `d7b55e98`, with rules 260 built and nothing committed. Raw outputs:
`C:/dev/lw_labs/social260_fresh` and `C:/dev/lw_labs/social260_saves`. The three "Not measured" paragraphs above hold the per-world
counts behind the uptake figures, from the same runs.

**Uptake.** Three ordinary Normal worlds (gen-4, gen-2, gen-6), 45 days, arrivals on, the whole bundle on, one run each.

- Courting: 18 asks, 12 accepted, 6 refused, 11 counted walks, 1 cut short, 3 couples who had walked out. gen-4 had no asks at all.
- Welcome: 52 of 56 arriving groups were welcomed. The median from arrival to the first welcome was 740 to 992 ticks, depending on the
  world.
- Praise: 43 shared buildings were finished. The builders were thanked for 25, the thanks lapsed unsaid for 14 and 4 were still due at
  the end.
- Rescue thanks: 0. No rescue of a living person happened in any of these worlds, so that path is exercised only by the staged tests.
- Deaths: 0.

An earlier courting-only comparison on the same three seeds gave 4 couples with courting on against 0 with it off over 45 days. The
worlds diverge, so this is not an effect size.

**Lab.** 25 days. Each removal arm is read against the mean of the control and two one-draw nudges. The first figure in each result is
that mean and the second is the arm.

- Fresh worlds: 12 Normal seeds from day 0 (aspen, birch, cedar, fern, gen-1 to gen-6, meadow, river), arrivals on.
- Saved settlements: six saves at rules 256 raised to 260 (aspen, gen-4 and river, each at day 48 and day 96; about 128 people).

| Set | Arm off | Measure | Result | Direction |
|---|---|---|---|---|
| Fresh | any arm | people (45.4), deaths, homeless, mean hunger | nothing moves beyond chance | |
| Fresh | whole bundle | mean mood | -0.9 to -2.0 | lower in 10 of 12; systematic, within the noise floor |
| Fresh | whole bundle | `defenceLeftOnItsOwn` | 5.6 to 8.1 | higher in 9 of 12 |
| Fresh | courting | all measures | ends identical to the control in 5 of 12 seeds | nobody asked in those worlds within 25 days |
| Saves | courting | homeless | 21.8 to 28.5 (+6.7, interval +2.8 to +10.5) | higher in 6 of 6 |
| Saves | courting | households without a solid home | 18.6 to 21.8 (+3.2) | higher in 6 of 6 |
| Saves | courting | spare time | 121.4 to 95.5 | lower in 6 of 6 |
| Saves | whole bundle | deaths | 0.1 to 0.8 (+0.8, interval +0.3 to +1.3) | higher in 4, lower in 0 |
| Saves | whole bundle | people | 127.9 to 126.3 | |
| Saves | whole bundle | households without a solid home | +1.9 | higher in 6 of 6 |
| Saves | whole bundle | spare time | -18.6 | |
| Saves | welcome | people in low mood | 2.5 to 3.5 | higher in 4, lower in 0 |
| Saves | welcome | mean hunger | 63.6 to 64.7 | |
| Saves | praise | all measures | nothing moves by more than a nudge moves it | |

**Reading.** No part harms growth in either set. In established settlements courting is associated with fewer homeless people.

**Why courting houses people.** Checked with `scripts/courting_housing_check.ts` on the same six saves, 25 days, courting on and off,
one run each (outputs `C:/dev/lw_saves/courting_check`; the script's one-day runs end on the same world hash as the lab's two arms).
Totals over the six settlements, courting on against courting off:

| Count | On | Off |
|---|---|---|
| Asks to walk out / counted walks | 82 / 56 | 0 / 0 |
| Proposals to be partners | 19 | 10 |
| Couples formed | 14 | 1 |
| Of those, two housed people from separate households | 13 | 1 |
| Households housed at the save and gone by the end | 13 | 1 |
| A household moved into an empty home | 22 | 1 |
| People homeless at the save who ended in a home that already stood | 16 | 0 |
| People homeless at the save housed by pairing with a housed partner | 1 | 0 |
| People homeless at the save whose own household built a home | 18 | 24 |
| Homes standing at the end, mean a settlement | 73.3 | 73.2 |
| Homeless at the end, mean a settlement | 23.8 | 28.5 |
| Births, mean a settlement | 6.5 | 5.8 |

So courting does not add homes. It pairs people off, the one who moves in leaves a home empty, and a household without one moves into
it. 13 of the 14 couples had walked out together at least twice before they paired. Without courting, pairing in these settlements all
but stops: one couple in six settlements over 25 days. In these single runs the homeless count at the end is lower with courting on in
4 of the 6 saves and higher in 2 (aspen at day 48, 14 against 9; river at day 96, 38 against 37), so the size of the housing effect
rests on the lab's six-of-six result above, and the route rests on this check. Births do not differ at 25 days.

**Limits.** The lab records no births or pairings, so `people` stands in for growth; the pairing counts above come from the housing
check, one run an arm. Six saves is a small set. Mean deaths are
under one a save in both arms, so the deaths result rests on very few deaths. The uptake counts are one run on each of three seeds.

**Full suite.** `npx vitest run`, default workers, 24-core machine, 26 November 2026, same uncommitted tree: 459 files, 3,706 tests,
3,700 passed, 5 failed, 1 skipped, 420.6 s. All 5 failures are timeouts under load: `tests/lab_report.test.ts` (2 tests, spawnSync
ETIMEDOUT), `tests/v250_continuation.test.ts`, `tests/zz_review_g_observer_purity.test.ts` and
`tests/zz_review_main_toolreport_saves.test.ts`. The four files rerun on their own with 4 workers: 4 files, 7 tests, all passed
(203 s). No regression classified. No golden fingerprint and no continuation pin moved; the rules-257 pin
(`tests/v257_continuation.test.ts`) was recorded before this version.

**Story director.** It ranks and follows the new scenes (`src/ui/director_model.ts`, `src/ui/director_live.ts`,
`docs/STORY_DIRECTOR.md`). 67 director tests pass.

**Not verified.**
- How the scenes look in the browser and the inspector. `scripts/browser/director_check.mjs` has not been rerun.
- The owner has not yet watched the director with the bundle on.
- Rescue thanks has never been seen in an ordinary world.
- The rules-260 continuation pin is recorded (ordinary Normal gen-2, arrivals on, tick 48000, from a clean checkout of `bc7e9410`: `tests/v260_continuation.*`), before rules 261.
