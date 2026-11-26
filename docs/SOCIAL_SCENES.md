# Social scenes: what is built

Plan: `docs/SOCIAL_SCENES_PLAN.md` (Group 1, three bundles). Rules ranges: `docs/RULES_RANGES.md` (260 to 264). Each bundle is one
rules version of three separately switched parts, with a lab removal arm for the whole bundle and for each part. Bundle A (rules 260,
`src/sim/meeting.ts`): all three parts are built (courting, welcoming newcomers, public praise). Results are in "Measured (rules 260)"
later in this file. Bundle B (rules 261, `src/sim/hearth_scenes.ts`): all three parts are built (helping at a birth, the naming day, keeping vigil); their uptake is in
"Measured (rules 261)" at the end; the lab is not yet run. The bundle's switch file is not `hearth.ts` and its whole-bundle arm is not `rich-no-hearth`: both belong to
rules 123's indoor hearth, so the switch is `setHearthScenes` and the arms are `rich-no-hearth-scenes` and `rich-no-hearth-birth|naming|vigil`.
Bundle C (rules 262, `src/sim/company_scenes.ts`): all three parts are built (a song at the fire, a dance at a feast, a reunion); the send-off is out. Their uptake in ordinary worlds and the lab are NOT
measured: by the owner's ruling of 26 November 2026 both run once, after bundle E (see "Measured (rules 262)" at the end). The bundle's switch file is not `company.ts`, and its whole-bundle arm is not
`rich-no-company`: both belong to rules 200's room for company, so the switch is `setCompanyScenes` and the arms are `rich-no-company-scenes` and `rich-no-company-song|dance|reunion`.

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

## Helping at a birth (rules 261, part 4)

**What a person can now do.** A woman near her time who has a home, is up and about in daylight and has nothing pressing goes to the door of her home and
lies in there, sitting beside it, for the last third of a day. In the last day before her time she may ask one grown neighbour she can see to be with her when
the child comes, and tells them when to come (the moment her lying in opens, a third of a day before her time) and where her door is; a housemate who sees her
lying in may ask one as well (no time told: the neighbour goes at once). The neighbour answers as to a request to watch a child, may say no, and on a yes goes to her
door when it is time and stays beside her, whether or not she is there to be seen yet. A viewer sees a woman speak to a neighbour, the neighbour come to her door, the
woman sitting by it ("Lying in by her door"), and the birth line in the feed: "X was born to M and F, with H there to help." when somebody was beside her, and the old
plain "X was born to M and F." in every other case (the feed does not say who was not there).

**What it connects to.** Births (`lifecycle.ts giveBirth`: the same tick, the same code, the same draws; the part adds one call that settles the scene
and writes the line, and it makes no draw, tested against a world with the part off: the baby, its name and the shared stream are the same). Requests and
promises: a new request kind `attend_birth`, asked in an ordinary conversation (`options_social.ts optBirthHelp` through `mkSocial`), answered by
`social.ts evaluateRequest` the way a watch is (`birth_help.ts answerBirthHelp`: their own needs, promises, children and liking; having borne or attended
a child, being a woman and knowing her each count for a little), and a yes is an ordinary promise (a `work` Commitment, milestone 'attended', a day) kept
(at the birth, with the helper beside her, or a helper who stopped to talk still counts) by a `visit` marked `data.birth` (`options_work.ts optCommitments`, `welfare.ts` visit handler). A housemate tells the helper where they last saw her, as for
a watch; the woman herself tells her where her door is (the home she holds a belief of, as a told place) and when to come: the tick her lying in opens, carried
on the request (`Request.deadline`), so the promise falls due then (`communicateMotherLocation`, `birthHelpCommitmentOption`). The helper goes to the door (the tile at the door of the home she holds a belief of: the one the household lives in if she holds a belief of it, else the first home she holds one of; if none, where she last saw the woman)
whether or not she can see the woman lying in. The woman's ask is `optBirthHelp`
(`motherAsking`: a woman with a home, from a day before her time until she lies in; her own needs and dangers, the other in sight and free to talk, and not
sought out at their work, as for any request) and it counts, with the housemates' asks, to one cap of three a day. The welfare visit: the helper is the first to look in afterwards, by a new kind of worry (`Concern` 'newborn',
raised by what they saw, not settled by seeing her well, `welfare.ts`). Perception: a woman lying in is visible (`SeenEntity.lyingIn`), which is all the
asker reasons from. The new-parent period (`lifechanges.ts`) is as before. The story director (`lying:<id>` 72 live, only with a helper beside her), the
inspector (the activity's own label; history rows "Has been beside N births as a helper").

**Where it differs from the plan.** (1) She lies in outside by her door, not inside: a home admits its own household only (`habitation.ts`, "no guests"),
so a neighbour could not stand beside her indoors. (2) A woman who is asleep indoors, or it is dark, or a storm blows, does not lie in (it needs daylight and
a woman up and about): her birth has the old line, word for word, as every birth without a helper beside her does. (3) No line says who was not there: the plan's "was alone" (and the first
build's "M had no helper.") was dropped, because written for every woman who lay in it was on eight of thirteen births in the first measure, and written only when somebody was asked and nobody came it was
on twelve of fifteen in the second; either way the sad line was the usual one. (4) The woman herself (from a day before her time
until she lies in), or a housemate who SEES her lying in, asks, and only somebody they see: nobody is sent for from across the settlement. (5) The helper waits at most a third of a
day (for one who was told a time, and the minute the life check can take to deliver the child, `BIRTH_LAG`); up to three asks in a day, the woman's and her housemates' together, and one promised helper at a time.

**Switch and arm.** `setHearthScenes(on, 'birth')`; lab arms `rich-no-hearth-scenes` (all three parts) and `rich-no-hearth-birth`. (Not `rich-no-hearth`:
that is rules 123's indoor hearth, `hearth.ts`.) Rich worlds at 261 and later only.

**Constants** (top of `src/sim/birth_help.ts`; to be tuned from a lab). Lying in: from 800 ticks before her time, worth 60 (ordinary work is 20 to 45),
hunger and thirst drives 40 or less and the warmth drive 20 or less (she sits out of doors: two women broke it off for the cold in the first ordinary run, which set this),
not in a storm (0.3) or hard rain (0.6), outdoors, in the day; she sits on for 120 ticks past her time. The ask (the woman's own, from `ASK_EARLY` = a day, 2,400 ticks, before her time, and a housemate's, the same): 50,
plus 8 for a woman who has borne a child (4 for one who has helped at a birth), 3 for a woman, 6 for kin, 4 for a friend (affinity 25), less the walk; seen
within 14 tiles; at most 3 a day, 400 ticks before the same neighbour is asked again. The answer: as a watch (the neighbour's willingness 0.5 and over),
plus 0.12 for having borne or attended a child, 0.05 for a woman, 0.1 for knowing her. The help: within 4 tiles of her, worth 56, waits a third of a day (a helper told a time, 60 ticks more: `BIRTH_LAG`, because the life check that delivers a child runs once in 60 ticks),
stays 60 ticks after the child comes, looks again after 120 if it could not find her. The birth: mother and helper grow fonder (affinity 8 and 4, trust 4
and 2, familiarity 3), a glad thought of 6 for a day each; an unhelped mother has a thought of -6 for three days (the birth thought of +25 is unchanged).
Attended counts to 99.

**Refusal and interruption.** A no is an ordinary refusal (it costs what any refusal costs and writes nothing in the feed; the asker waits 400 ticks
before asking that neighbour again and asks the next). Nobody at home to send, nobody in sight, three asks used up, or everyone refusing: she bears the
child with the plain old line, and, if she had lain in or somebody was asked, the small lasting thought of a woman with nobody to help.
A helper told a time who finds an empty door (the woman did not lie in, or has not come) waits a third of a day and a minute, and the promise lapses with a line in her log and none in the feed; a child born before
she came is the same release as before (moot, request cancelled, a line in her log). A critical need or danger ends her lying in (she may break it off: it is sticky only against
ordinary options) and the same for the helper's wait; a promise that no helper reached in time is released as moot and the request cancelled, not
broken (the child was born before they could come); a helper who waited a third of a day for a child that did not come gives up the same way.

**Saved state** (optional fields, bounded, each checked by `validateBirthHelp` on loading): `Person.lyingIn` (the tick, until the birth, with a pregnancy
and within a day and a third), `Person.attended` (1 to 99), `Person.birthAsked` (the tick somebody was first asked for this birth, cleared at the birth, with a pregnancy; it makes the birth settle the asks even for a woman who did not lie in),
the activity data (`lyingIn`, `birth`, `birthDone`, `waitFrom`, `told`, `emptyDoor`), requests of kind `attend_birth`
(destination a person; `deadline`, the told time, 0 or up to a day past now, and only on a request the woman made for herself), the Commitment milestone 'attended', and the Concern kind 'newborn' (not checked: concerns never were). All in the fingerprint
(`Hearth<id>`), absent below 261 and with the part off.

**Tests.** `tests/birth_help.test.ts`: the registration, lying in offered only when each condition holds (eleven negatives), the activity and what is
seen of it, the ask (offered to whom, who is preferred, one at a time, not when nobody is in sight, a real request answered like a watch, a no, the limit of
three), the whole scene (helper there, the line, the counts, the fondness, the promise kept), the same tick and the same shared stream as a world with the
part off, nobody to send, everyone refusing, the old line when she had not lain in or had no home, the part off and rules 260, a helper too late or
waiting too long, the look-in afterwards, save and load in the middle, the validation, the lab arms, and an ordinary-world report. For the woman's own ask: it is offered
and made (a request from her, her bubble and log lines, her home told as a place); not offered when her time is more than a day away or has come, with no home, lying in
already, hungry, critically thirsty, in danger, when the neighbours in sight are at their work, when only her own household is in sight, when she was refused lately,
when somebody has already promised, or when three asks are used up (each with a control); the told time is carried (`deadline` is the opening of her lying in, the
commitment is due a day after it); the helper comes to her door without seeing her, waits at an empty door and then is beside her when she comes home and lies in; one promised helper at a time; the cap of three
shared with a housemate's asks; a promise that lapses quietly if she never lies in (a line in the helper's log, none in the feed); a helper at the door of a woman who has not lain in is
counted when the child comes (and for a birth that comes up to the life check's minute late); save and load in the middle of a promise; the validation. The birth lines (helped; the plain line in every other case: asked and nobody came, nobody asked, lain in or not, and never "had no helper"); the part-on and part-off twin (the same baby and shared stream) still holds.

## The naming day (rules 261, part 5)

**What a person can now do.** The feast a birth already called is the child's naming feast. A parent who is there when it opens, with somebody else who came, says
the name before them; and now and then the child bears the name of somebody who has died. A viewer sees "A naming feast for X and M is called at the fire today.",
the mother at it (she never went before), and "M and F named their daughter X before 3 people, after M's mother." (the last clause only when true).

**What it connects to.** Occasions (`occasions.ts`: the feast's label, the mother attending, the naming at the opening, the later arrivals coming to know the
child), births (`giveBirth`: the name still drawn from the shared stream first, so the stream is exactly what it was, then replaced if the rule applies), the
record of the dead (`world.deceased`: a parent names a dead person they hold a relation with and know to be dead, `death_knowledge.ts`), relations
(familiarity, a little affinity), the inspector (history row "Named at birth after X, who had died."), the story director ("named" 58; the naming feast is the feast
rule, 55, and the gathering already a live shot).

**The name.** A parent's dead parent, then partner, then sibling, then close friend (affinity 60), the mother's before the father's, whose name suits the child's
sex (read from the plain names, numeral or not) and which NO LIVING PERSON BEARS (checked against everybody alive). A name with a numeral ("Cora II", the world's
way of naming when the plain names ran out) is taken whole: the rule is about the exact name, and nothing is added or taken away. The child records `namedAfter`
(the dead person's id); the name drawn first goes back among those nobody has borne.

**Where it differs from the plan.** (1) The mother is in the feast's `about`, which kept her away; with the part on she goes (and counts as the one it is most for).
(2) The naming is said at the tick the feast opens, by a parent who has come for it and is there, before at least ONE other who has come and is there (not
the plan's several): people set out up to 200 ticks before and many arrive after, so two made the naming rare; a parent who comes late, or nobody else, means no
naming line (the feast goes on, and the child is met by those who arrive: see below). (3) The feast's lines say "naming feast", including "is over: nobody came."

**Switch and arm.** `setHearthScenes(on, 'naming')`; arms `rich-no-hearth-scenes` and `rich-no-hearth-naming`.

**Constants** (top of `src/sim/naming.ts`). Others needed: 1. Most newborns named at one feast: 4. Hearing a child named: familiarity 3 and affinity 1.5 for each who
comes to the feast afterwards (and those there, when they arrive); the parents' glad thought 6 for a day. A friend to be named after: affinity 60.

**Refusal and interruption.** No parent there, or nobody else: no line, and nothing is said. "Nobody came" is still the line of an empty feast. A child who has
died before it opens is not named. A name nobody dead gives, or a dead person's name a living person bears, or that suits the other sex: the drawn name stands.

**Saved state.** `Person.namedAfter`, `Occasion.naming` (at most four newborn ids) and `Occasion.named` (which of them were named aloud), checked by
`validateNaming` (the namesake must be on the death record), in the fingerprint, absent below 261 and with the part off.

**Tests.** `tests/naming.test.ts`: the plain names, a child named after a dead mother with the shared stream and the baby identical to a world with the part off,
only a name nobody alive bears and a numeral taken whole, the order of kin and what must be known, the part off and rules 260, the feast's label, the mother
going, the name said (one line, the three forms, "after M's mother" only when true), no parent there, too few there, nobody came, two births at one feast,
save and load, the validation, the lab arm, and an ordinary-world report.

## Keeping vigil (rules 261, part 6)

**What a person can now do.** Somebody of the household, or a partner, parent or child, who sees one of theirs visibly feverish or hurt and resting goes and sits
beside them, through the night if need be, up to half a day, handing over water or food they can spare if the sick person looks thirsty or hungry. A viewer sees
"Sitting up with B" in the inspector and a shot of it, and when it ends one line: "A sat up through the night with B, who has a fever." ("sat with" by day,
"who is hurt" for a hurt one); and if B dies with A beside them, "A was with B when he died."

**What it connects to.** Illness (nothing about how a fever spreads is touched: the module never calls `expose`, tested; the sick person mends no faster, tested
against a world with the part off), welfare (the same transfer and gift, `onGift` 'care', the same visible signs: `feverish` from rules 165 and `hurt`, health
under 60, which the welfare worry reads), grief (the sitter's grief for the dead is cut to 0.7 of what is left, as a visit to a grave cuts it,
`options_places.ts`), relations (the sick person remembers who sat with them, more if they mended), mood (a glad thought), the story director (a vigil
under way 66 live, one per sick person; the line 50; "was with B when he died" 100, taking the plain death's place as one top shot), the inspector (the
activity's own label, the relation notes).

**Where it differs from the plan.** (1) The trigger is the SIGN, not the number: "health under 35" is in nobody's sight, so a person acts on `hurt` (health under 60,
what the welfare visit treats as visible) or on a fever of 0.5 and over, and only when the sick person is at rest, asleep or by a fire. That is a wider band
than the plan's, and the bundle's uptake counts are of vigils begun on the sign. (2) "One sitter at a time" is kept by sight: nobody sits who sees somebody
sitting beside them, and a second who arrives and finds one there gives it up. (3) The line is written once, when the vigil ends, if it lasted 90 ticks or more;
a shorter one writes nothing. (4) The sitter does not lose sleep by any rule of the part: they simply do not sleep while they sit, and leave when worn out
(energy under 12), thirsty (under 35), hungry (under 30) or cold (under 25). The cost is their time. (5) A vigil indoors is kept only in the sitter's own household's home
(a home admits its own household only, `habitation.ts`); a sitter who was walking up, or sitting outdoors, follows a housemate in at their own door if they saw them go in
(last seen near the door within 150 ticks); outdoors it is beside them wherever they are, and a walk to a kinsman of another house follows him while he is in sight.

**Switch and arm.** `setHearthScenes(on, 'vigil')`; arms `rich-no-hearth-scenes` and `rich-no-hearth-vigil`.

**Constants** (top of `src/sim/vigil.ts`). The cue: hunger and thirst drives 30, energy drive 45 (the gates `welfare.ts` uses), worth 52, plus 8 for a
partner, parent or child (4 for a housemate), 6 for a fever (4 hurt), 6 in the dark, less the walk. Half a day at most (1,200 ticks); done after 60 ticks of the sick person looking well;
near is within 3.2 tiles; a look every 60 ticks; written from 90 ticks; the sitter rests 300 ticks before sitting with the same person again (150 if cut short). The
sick person's glad thought 5 for half a day; fondness +2 and trust +1 (more, +2 and +1, if they mended).

**Refusal and interruption.** A critical need or danger, the sitter's own thirst, hunger, cold or weariness, a fever of their own, losing sight of the sick
person, or the sick person leaving the room ends it, with a log line and one in the feed if it had lasted. If the sick person dies, "was with" is written only if
the sitter was in work beside them, in the same place, at that tick; their vigil is over and nothing else is written.

**Saved state.** The vigil's own record in the activity's data (`vigil`: whom for, since when, ticks sat, fever or hurt, well-for, whether the dark has fallen or the
death was met), checked by `validateVigil`. Nothing on the person. `SeenEntity.sittingUp` is not saved.

**Tests.** `tests/vigil.test.ts`: the cue and its parts, offered to a partner, a housemate and not a neighbour, a hurt person and not one at 60, eleven negatives (each
one with its control), the part off and rules 260, the sign and not the illness, the scene (walks, sits, tends, ends at half a day, "sat with" by day, "sat up
through the night" in the dark, mended, cut short, a second sitter), no faster mending, no call to `expose`, the death with her beside him (one line, her grief cut) and
the deaths without, save and load, the validation, the lab arm, and an ordinary-world report.

## A song at the fire (rules 262, part 7a)

**What a person can now do.** At the half-way point of an evening sitting by the fire (the point at which a thanks is spoken or a story told), with neither of those done at that sitting, the most sociable
grown sitter in good spirits starts a song, and the others sitting there in good spirits join in with a line of their own. A viewer sees speech bubbles, and one line in the feed: "A started a song at the fire and
N joined in." The fire has at most one song an evening, and the hash of the fire and the day gives it a song on about one evening in three.

**What it connects to.** The evening fire (`evening_fire.ts`: the sitting, its half-way point and who counts as sitting there), public praise (`praise.ts`: a thanks comes first), the story (a story comes second;
`eveningFireWork` now says whether one was told), mood (the song needs good spirits; it gives a glad thought), relations (a little fonder and better acquainted with every other singer), the want of company, the
story director (the line is 30, filler).

**Where it differs from the plan.** (1) "In good spirits" is the mood level at 0 or more (the inspector's 70 or more), not 5: in the first two evenings of an ordinary world the people who sat at the fire ran from -8
to 19 and mostly between -5 and 8 (those who go to the fire are those who want company, which pulls the mood down), and at 5 no fire had a sociable grown sitter in good spirits. (2) Each sitter reaches the half-way
point at their own tick, so the song is considered at anybody's half-way point; the one who starts it is the most sociable (the lowest id on a tie), not necessarily the one whose point it is. (3) At least one person
must join, so "joined in" is never nought; the plan's "three or more sitting" is kept. (4) "One song a fire an evening" is kept by the tick of the last song on the fire (`Building.sung`), a fire that has had one being
quiet for half a day, and the evening's hash.

**Switch and arm.** `setCompanyScenes(on, 'song')`; arms `rich-no-company-scenes` and `rich-no-company-song`.

**Constants** (top of `src/sim/song.ts` and `company_scenes.ts`). A song on about one evening in three (a hash of the fire and the day, 1/3); at least 3 sitting; the starter at sociability 0.5 or more and an adult or
elder; the fire quiet for half a day (1,200 ticks) after a song; each singer's want of company eased by 6 on top of what the sitting gives, fonder by 1.5 and better acquainted by 0.5 with each other singer, a glad
thought of 3 for half a day. Good spirits: mood level 0 or more. The story's listener values (fonder by 1.5, a glad thought of 2, 4 for a child) were the yardstick; nothing here is much above them.

**Refusal and interruption.** Too few sitting, nobody sociable and in good spirits to start it, nobody in good spirits to join, the hash giving this fire no song this evening, a song already sung there in the last half
day: nothing happens and nothing is written. A thanks owed or a story told at that sitting takes the place of the song.

**Saved state.** `Building.sung`, the tick of the last song at that fire, in the world fingerprint and checked by `validateSong` (a fire only; not in the future; rich worlds of rules 262 and later). Nothing else.

**Tests.** `tests/song.test.ts`: the switch, the arm and the rules; the song (the starter, the joiners' lines, the event, the eased want, the closeness, the glad thought); a child who joins and one who does not start;
the tie; those low in mood; the negatives (two sitters, nobody to join, nobody sociable, nobody in the mood, no hash, the wrong half); the caps (one a fire an evening; the hash about a third); the order (a story first,
a thanks first, else a song); the part off and rules 261 (events, needs, relations and thoughts equal, and the shared stream where it was); save and load across the half-way point; the fingerprint; the validation.

## A dance at a feast (rules 262, part 7b)

**What a person can now do.** At a wedding, a feast (a naming feast too) or a harvest feast that has begun, never a funeral and never a market, with four or more there, those in good spirits begin to walk a small ring
round the place, a few steps at a time, for about 120 ticks, and then stand as before. At most eight dance at one gathering. A viewer sees them walking round the fire or the hall, the inspector says "Dancing at the
wedding feast", and when the second has danced long enough one line in the feed: "People danced at the wedding feast for A and B." (the occasion's own words: "People danced at the harvest feast.").

**What it connects to.** Occasions (`occasions.ts`: the attend handler calls the step; the occasion's own label and names are used), courting (two unpartnered dancers who pass courting's own conditions for walking out
together gain what one counted walk gives, with the courting part on; the walk is not counted), mood and the want of company, the wolf's safe distance (`hardship.ts` `wolfNerve`), the story director (a dance under way
is a live shot, 68; the line is not ranked).

**Where it differs from the plan.** (1) At most eight dance (the coordinator's count of 26 November: the median gathering has 16 to 23 there at once, and a ring two tiles across holds eight): of those there who are fit to
dance, the eight of the lowest ids, by a sort that reads nothing but ids; the rest stand as before. (2) The dancers are moved by direct steps along the ring, not by a path, because arriving at a spot restarts an
activity (`activities.ts` `beginWork`); every step is checked to be open ground within 2 tiles of the place's footprint, and the first step that is not ends that person's dance where they stand. The attend activity's
own progress and duration are not touched (tested tick by tick). (3) The ring is round the place's centre at half the footprint's diagonal and 0.8 more (1.5 for a fire, 2.9 for the 3 by 3 hall), not "2 tiles of the
place": within 2 tiles of the footprint is the guard. (4) The line is written when the second person has danced 24 ticks, so a dance that stopped at once writes nothing. (5) Courting's own test is
`mayWalkOutTogether` (new, in `courting.ts`, the ask's own conditions read both ways: unpartnered, grown, not kin, a spark, and the familiarity, affinity and trust it asks), without the hunger and the hour of
`mayCourtNow`; `mayAskToWalk` is unchanged and now calls the same function. (6) There is no dance pose; a dancer is drawn walking on the ticks they step and standing between.

**Switch and arm.** `setCompanyScenes(on, 'dance')`; arms `rich-no-company-scenes` and `rich-no-company-dance`.

**Constants** (top of `src/sim/dance.ts`). At least 4 there at once; at most 8 dancers; 120 ticks a dancer; "has danced here" at 24 ticks; the ring within 2 tiles of the footprint, 0.8 outside the half-diagonal; a step
of 0.06 of ring on 6 ticks in every 10, at 0.8 of a walk; a person not yet dancing looks every 5th tick; fed and watered (hunger and thirst 30 or more), energy 20 or more, health 60 or more, no injury; each who has
danced: want of company eased by 6, a glad thought of 3 for half a day, fonder by 1.5 and better acquainted by 0.5 with each other dancer within 6 tiles who has danced as long (each pair once, by the later of the
two); a pair with a spark: courting's walk gains (fondness 4, trust 2, familiarity 2). Daylight, or the place within 4 tiles (the wolf's safe distance) of a lit fire.

**Refusal and interruption.** Fewer than four there, nobody in good spirits, a funeral or a market, the dark with no lit fire near the place, a step that is not open ground within reach: no dance for that person, nothing
written. A dance under way stops where the dancer stands when the light goes with no fire near, when the gathering is over, or when a need of theirs falls. A talk that holds the activity keeps the count (it is in the
activity's data).

**Saved state.** `Occasion.dance` (who has begun, at most 8; how many have danced the 24 ticks; whether the line is written) and a dancer's own record in the activity's data (`dance`: ticks danced, the angle on the
ring, its radius, stepping, over), both in the world fingerprint and checked by `validateDance`.

**Tests.** `tests/dance.test.ts`: the switch and the arm; the ring (open ground within reach every tick, the attend clock and length untouched, walking while stepping and standing between, the label, the count); the
line in the occasion's words at a wedding, a feast and a harvest feast, once; what it does for each who has danced; not at a funeral or a market; three there and four; those low in mood, hurt or unfed; eight of twelve,
the lowest ids, the others standing; the dark away from a lit fire and beside one; a dance stopped by the light going; a hut on the ring; the courting gain once, with no walk counted, and not with courting off, a couple or
strangers; the part off and rules 261 (positions, events, needs equal, the shared stream where it was); a dancer held and picked up; save and load mid-dance; the fingerprint; the validation.

## A reunion (rules 262, part 8)

**What a person can now do.** Somebody who sees their partner, their own child or their own parent after more than a day and a half apart, close to their own home and free to go, runs to meet them: they wave, each
says a line, and one line goes in the feed: "C ran to meet A, back after two days." A child can run to a parent. It takes about a hundred ticks, and then both go on.

**What it connects to.** Perception (`perception.ts`: the sighting is where the cue is made, and the person's own previous sighting in `whereabouts` is read before the new one replaces it), kin (the person's own
record), the decision (an option worth 60, 4 more for a partner, less the walk), movement (the running speed fleeing uses, and the engine's following of a person in sight), relations, mood, the story director (60).

**Where it differs from the plan.** (1) The cue is made in an OUTDOOR sighting only: an indoor one (`rememberRoomContact`) makes none, so a person waiting indoors does not run out. (2) A record that came by hearsay
(it has a `from`) is no cue: it says nothing of when they last saw them. A record that was never made is none either. (3) The no-danger and no-critical-need tests are made when the run is offered, not at the sighting;
the cue is kept 150 ticks for that. (4) The other is neither stopped nor given an activity: they wave and say a line where they are, and go on with what they were doing; the runner stands with them for 50 ticks. (5)
The home test is the household's own home door within 12 tiles, or the nearest settlement centre (the camp, or one of `extraSettlements`) within 12 if the household has no home. (6) "Back after N days" is floored to the
half day from the runner's own record ("a day and a half", "two days", "two and a half days"). (7) A pair rests two days from another reunion once they have met; the one who sets out holds the pair for 300 ticks while
they run, so the other does not run too, and a run that fails costs only that hold.

**Switch and arm.** `setCompanyScenes(on, 'reunion')`; arms `rich-no-company-scenes` and `rich-no-company-reunion`.

**Constants** (top of `src/sim/reunion.ts`). More than 3,600 ticks (a day and a half); a cue kept 150 ticks; within 12 tiles of home; a pair rests 4,800 ticks (two days), holds 300 while one runs; the option is worth 60,
plus 4 for a partner; met within 2.5 tiles, stand 50 ticks; fonder by 2 each way and better acquainted by 0.5; a glad thought of 4 for half a day.

**Refusal and interruption.** A critical need, a danger believed about, the other asleep, busy talking, out of sight, indoors or dead, the runner indoors or in a talk, farther than 12 tiles from home, a cue gone stale,
or a pair that rested: no run, or a run that ends where it was, and nothing is written (the inspector shows how the activity ended, as for any activity).

**Saved state.** `Person.reunion` (who, the gap, when seen; kept 150 ticks) and the scene's record in the activity's data (`reunion`: whom, the gap, when set out, when met), both in the world fingerprint and checked
by `validateReunion`. The pair's rest is in the person's ordinary `cooldowns`.

**Tests.** `tests/reunion.test.ts`: the switch and the arm; the gap in words; the cue (the real gap, the old record read first, a child and a parent, no kin, the edge of a day and a half, hearsay, nothing before, either
asleep, a pair at rest, the part off, rules 261, an authored world, lapse, one cue at a time); the offer (its parts, home and camp, twelve tiles, a critical need, a wolf, the other asleep or talking or gone, a stale cue,
the pair resting); the scene (a run, the line, the wave and the words, fondness, the glad thought, the rest; a child; the other not stopped); failure (he leaves, sleeps, goes indoors, dies); the caps (two days; one of two
runs); the part off and rules 261 (the shared stream where it was); save and load with a cue held and mid-run; the fingerprint; the validation; and an ordinary two-day world that prints what happened.

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

## Measured (rules 261)

Measured on 26 November 2026 on the uncommitted tree at head `e97aaffa`, nothing committed. Raw outputs, one JSON and one log a world: `C:/dev/lw_labs/hearth261_uptake_v2`
(`gen-4`, `gen-2`, `gen-6`: the numbers below), `C:/dev/lw_labs/hearth261_uptake_v2/first_run_before_door_fix` (the same worlds on the rework before the helper went to the door tile: 13 births, 1 helped,
19 asks, 11 promises, 1 in time) and `C:/dev/lw_labs/hearth261_uptake` (the first build, the "was" in the table; it has `gen-6-off-all.json`, the same world with the whole bundle off). The script is `scripts/hearth_uptake.ts`
(`--probe` also reads, through the observer path of `generateOptions` that writes nothing, who could have asked for a helper and how far each stretch of somebody ill or hurt got toward a vigil). Each count is in the bundle's own words from the
world's own record.

**What this table is and is not.** It is the part 4 rework (the woman asks for herself, tells the helper when to come, and the helper goes to her door) measured with the helper going to the tile at the door of the home
and waiting out the life check's minute. It is NOT the final code. Two things changed after it and were NOT measured in ordinary worlds: (1) the helper now picks, among the homes she holds a belief of, the one the household
lives in (in the one case traced she had gone to an old lean-to of the household, not its hut), and (2) the feed no longer says "M had no helper." (every unhelped birth writes the plain line; the "somebody was asked"
row below was written that way when it was measured). A scene for a helper who arrives after the birth was considered and NOT built. The helped-birth count below is therefore the count before (1), and the naming and vigil rows
come from the same runs.

**Uptake.** Three ordinary Normal worlds (gen-4, gen-2, gen-6), 45 days from the start, arrivals on, the whole bundle on, one run each (so a sample of chance, not an effect). The three worlds ended with 64, 64 and 63 people and no
death in any of them; each took 530 to 550 s with the probe, three at a time and under other load. "was → now" is the first build against this rework.

| Count (was → now) | gen-4 | gen-2 | gen-6 | All three |
|---|---|---|---|---|
| Days run / people at the end / deaths (now) | 45 / 64 / 0 | 45 / 64 / 0 | 45 / 63 / 0 | 135 days, 0 deaths |
| **Helping at a birth** | | | | |
| Births | 5 → 7 | 2 → 3 | 6 → 5 | 13 → 15 |
| with a helper there ("with H there to help") | 0 → 0 | 0 → 1 | 1 → 0 | 1 → 1 |
| unhelped, somebody was asked (written then "M had no helper."; now the plain line) | 2 → 5 | 2 → 2 | 4 → 5 | 8 → 12 |
| unhelped, nobody asked, she had lain in (the plain line) | 0 → 1 | 0 → 0 | 0 → 0 | 0 → 1 |
| unhelped, nobody asked, she had a home and had not lain in (the plain line) | 3 → 1 | 0 → 0 | 1 → 0 | 4 → 1 |
| unhelped, nobody asked, she had no home (the plain line) | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| lyings in begun (activities started) | 2 → 6 | 2 → 2 | 5 → 5 | 9 → 13 |
| asks made (requests) | 1 → 8 | 1 → 6 | 5 → 8 | 7 → 22 |
| by the mother herself | 0 → 8 | 0 → 6 | 0 → 8 | 0 → 22 |
| by a housemate | 1 → 0 | 1 → 0 | 5 → 0 | 7 → 0 |
| refused ("own need" and the like) | 1 → 3 | 0 → 3 | 3 → 4 | 4 → 10 |
| promises given | 0 → 5 | 1 → 3 | 2 → 4 | 3 → 12 |
| of them to the mother herself | 0 → 5 | 0 → 3 | 0 → 4 | 0 → 12 |
| helpers who came in time (promise fulfilled, beside her) | 0 → 0 | 0 → 1 | 1 → 0 | 1 → 1 |
| promised, and the child came first (cancelled) | 0 → 5 | 1 → 2 | 1 → 4 | 2 → 11 |
| helpers sent to a door (told a time) | 0 → 5 | 0 → 3 | 0 → 4 | 0 → 12 |
| helpers who waited at an empty door | 0 → 3 | 0 → 1 | 0 → 2 | 0 → 6 |
| **The naming day** | | | | |
| naming feasts called | 6 (was 5) | 3 (was 2) | 4 (was 6) | 13 |
| naming feasts opened by the end of the run | 6 (was 4) | 3 (was 2) | 4 (was 6) | 13 (was 12) |
| names said (a parent there with somebody else) | 4 (was 3) | 1 | 3 (was 5) | 8 (was 9) |
| children named after the dead | 0 | 0 | 0 | 0 |
| feasts nobody came to | 0 | 0 | 0 | 0 |
| **Keeping vigil** | | | | |
| people ill or hurt in the world (fevers begun) | 7 (was 6) | 6 (was 2) | 13 (was 10) | 26 (was 18) |
| stretches of looking feverish (0.5 and over) or hurt (health under 60) | 2 (was 0) | 8 (was 3) | 9 (was 8) | 19 (was 11) |
| of them with an adult of the household, or a partner, parent or child, alive | 2 (was 0) | 7 (was 2) | 8 (was 7) | 17 (was 9) |
| of them seen so by one such person | 2 (was 0) | 7 (was 1) | 8 (was 7) | 17 (was 8) |
| of them seen at rest (asleep, resting or by a fire) | 1 (was 0) | 7 (was 1) | 7 (was 5) | 15 (was 6) |
| of them for whom the vigil was offered (at a look every 20 ticks) | 0 | 5 (was 0) | 5 (was 2) | 10 (was 2) |
| vigils begun | 0 | 3 (was 1) | 4 (was 2) | 7 (was 3) |
| total ticks sat | 0 | 100 (was 341) | 1217 (was 431) | 1317 (was 772) |
| ended by the sick person mending | 0 | 0 (was 1) | 3 (was 1) | 3 (was 2) |
| ended by the sitter leaving for a need or falling ill | 0 | 2 (was 0) | 0 (was 1) | 2 (was 1) |
| ended by the sick person dying (with the sitter beside them) | 0 | 0 | 0 | 0 |
| ended at the half day | 0 | 0 | 0 | 0 |
| ended otherwise (not in the same place, lost sight, not where expected) | 0 | 1 (was 0) | 1 (was 0) | 2 (was 0) |
| lines written ("sat up through the night with" / "sat with") | 0 | 1 | 3 (was 1) | 4 (was 2) |
| "was with B when he died" | 0 | 0 | 0 | 0 |
| sitters who caught the fever from the one they sat with | 0 | 0 | 1 (was 0) | 1 (was 0) |

**Reading, and what stops each part.** Counts, not benefits.

- *Helping at a birth*: **one birth in fifteen had a helper there (gen-2), where it was one in thirteen.** The rework did what it was for in the asking: women asked 22 times for themselves (a housemate, 0 times), 10 were
  refused (the neighbour's own need and the like), 12 promised, and 12 helpers were sent to a door (against 7 asks and 3 promises). It did not bring the helpers to the birth: of the 12 promises 1 was kept in time and 11 ended
  "the child was born before they could come" (6 of the 12 had waited at an empty door: the woman was not there to be seen). The funnel of the woman's own ask, from the probe, at a look every 20 ticks (1,396 looks at women in the
  last day before their time, with a home, not yet lying in): 218 offered the ask, 501 had no grown person in sight, 677 had one in sight and were not offered it (her own needs, a neighbour at work, one already refused or
  promised, or the cap). The housemate's funnel, while a woman lay in (377 looks): a housemate saw her at 89 and was offered the ask at 2 (it was 90 and 29 before; the woman's own ask now comes first).
- *Why helpers were late* (one case traced, gen-6 Bea and Ivy, on the first run of this rework; the other ten were not traced): births fell across the whole day (ticks of the day 137 to 1937, not at dusk); the promise fell due when her lying in opened and the
  helper set out within about 30 ticks, from about 27 tiles away (she was carrying food into a cellar); and she never reached the woman, because the home she went to was the first she held a belief of, the household's old lean-to, 7 tiles from the woman lying in by the
  door of its hut, and she stood there "at an empty door". Two defects of the told-helper path were fixed afterwards (she went to the wall of the home nearest her, not its door; and she took the first home she held a belief of, not the one the household lives in; in the traced case the second was the cause); whether that brings helpers
  in time in the other cases was not measured. A third was found earlier by a test (the wait ended at the day the child was due, before the life check that delivers it, up to 60 ticks later) and is in these numbers as fixed.
- *The naming day* fired in every world: 13 naming feasts called, 13 opened by the end, 8 with the name said before somebody. No child was named after the dead, and nobody could have been: there was no death in any of the three
  worlds in 135 days; the namesake rule is untested outside the staged scenes. No naming feast was empty. Same kind as before (13 called, 12 opened, 9 said); the small moves are the worlds going differently after the first different ask.
- *Keeping vigil* began 7 times in 135 world-days (0, 3 and 4), against 3, and wrote 4 lines (2 before). The funnel from the probe: 19 stretches of somebody looking ill or hurt (feverish at 0.5 or more, or health under 60; 11 before),
  17 with an adult housemate or a partner, parent or child alive, 17 seen so by one of them, 15 seen at rest, the vigil offered for 10 and begun 7. 6 of the 7 were for a fever and 1 for a hurt person (gen-2). They ended with the sick person
  mending (3), the sitter leaving for a need (2) and not finding them or being in another place (2); nobody was with anyone at a death (there was none), and 1 sitter caught the fever from the one they sat with (0 before). This is more than in the first
  measure and the kind is the same; the three worlds are different worlds after the first different ask (26 fevers against 18), so it is a change of chance in a sample of three, not an effect of the rework.

**Limits.** Three worlds, 45 days, young settlements of 30 to 66 people: the count of `scripts/vigil_count.ts` in six saved settlements (65 to 159 people, 25 days) was 46 episodes of health under 35 or a visible fever, 38 of them with
kin alive, against 19 stretches here in 135 world-days, so these counts say what happens in a young settlement and little of an established one. The lab (12 fresh worlds, six saved settlements, two nudges) has not been run; whether any
part moves people, deaths, mood or births is not measured, and the whole of this table is mechanism and opportunity, not benefit. The rules-261 continuation pin is recorded (ordinary Normal gen-2, arrivals on, tick 48000, from a clean checkout of `5fb051d2`: `tests/v261_continuation.*`), before rules 262.

## Measured (rules 262)

**Uptake in ordinary worlds and the lab are NOT measured.** By the owner's ruling of 26 November 2026 they run once, after bundle E, with every part's removal arm. Nothing below is a claim that the song, the dance or the
reunion happens in an ordinary world, how often, or that it helps or harms anybody.

What was done, on the uncommitted tree at head `510cc5a1` (the rules-261 pin):
- Staged scenes only for the three parts (`tests/song.test.ts`, `tests/dance.test.ts`, `tests/reunion.test.ts`, and the company block of `tests/director.test.ts`): they check each rule, not how often it happens.
- One ordinary Normal world, gen-4, arrivals on, rules 262, the whole bundle on, TWO days (`tests/reunion.test.ts`, the last test, `COMPANY_DAYS`): it ran to the end of day 2 with 28 people in 22 s and nothing was thrown.
  In it: songs 0, dances 0, reunions 0, no cue held at the end. That is two days of one young settlement and says nothing about how often these happen.
- One look at the mood of the people at the evening fire in that same world (the first two evenings, 26 half-way points at one fire): the hash gave that fire no song on either evening; the sitters numbered 2 to 13;
  the mood levels of those sitting ran from -8 to 19, 12 of 32 at 5 or more and 14 of 32 at 0 or more; with the good-spirits line at 5 no evening had a sociable grown sitter in good spirits among them, at 0 one of the two
  did. That is why the line is 0 (see "A song at the fire"). It is two evenings at one fire in one world.
- Not run: the full suite, the lab, the uptake count in three ordinary worlds, a look in the browser or the inspector. The rules-262 continuation pin is recorded (ordinary Normal gen-2, arrivals on, tick 48000, saved and continued 120 ticks, from a clean checkout of `bf07213c`: `tests/v262_continuation.*`), before any code gated at rules 263 or above.
