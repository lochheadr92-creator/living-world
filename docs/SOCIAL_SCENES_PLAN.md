# Social scenes, Group 1: plan

Drafted 26 November 2026 on the owner's instruction ("draft the plan for Group 1"). Bundles A, B and C are built (rules 260, 261 and 262, `docs/SOCIAL_SCENES.md`); D and E are planned in the last section. It is the first of six
groups from the 40 social actions listed in chat the same day; the other groups are not planned yet.

**Why.** The story director (`docs/STORY_DIRECTOR.md`) has too little to follow. Group 1 adds scenes to things the simulation
already does (pairing, births, arrivals, deaths, rescues, finished buildings, the evening fire, feasts), so each needs few new
decisions and puts the settlement at little risk.

## What the code reading changed

Read on 26 November 2026 at `b56340b3` (rules 257). File and line references below are from that reading.

- **Nobody leaves the map and comes back.** The only departure is a household relocating (`relocation.ts:329`, hunger-driven and
  rare). So "a send-off" and "a reunion" are redesigned around absence as people actually experience it (part 9) and must be
  measured before they are built.
- **A birth already calls a feast** (`occasions.ts:124`) and the baby is named at birth by a random draw (`people.ts:23`). The
  naming day is that feast given a purpose, not a new gathering.
- **Nobody is ever "dying".** Death is the moment health reaches zero (`lifecycle.ts:230`). A vigil can only be kept with somebody
  seen to be badly ill or hurt, who may or may not die.
- **Gatherings are people standing still** (`occasions.ts:370-391`): no eating, talk or movement. That is why they are dull to watch.

## How it is delivered

Three rules versions, three separately switched parts each, after the pattern of rules 200, 216 and 253. One version per action
would cost nine continuation pins and nine labs for no extra evidence: every part has its own switch and lab removal arm, so its
effect can still be read by itself.

| Version | Bundle | Parts |
|---|---|---|
| 260 | A: meeting | 1 courting, 2 welcoming newcomers, 3 public praise |
| 261 | B: hearth | 4 helping at a birth, 5 the naming day, 6 keeping vigil |
| 262 | C: company | 7a a song at the fire, 7b a dance at a feast, 8 a reunion (9, a send-off, is out) |

Claimed 26 November 2026: 260 to 264 in `docs/RULES_RANGES.md` as the "social scenes" stream. The trips stream held 258 and 259
for its unbuilt parts B and C; the owner dropped them the same day ("Yes, drop them"), so that claim is closed at 257.

Rules common to every part:
- Rich worlds at the part's version only (`runsRulesVersion`), a `setX(on, part?)` switch, a `rich-no-<part>` arm in
  `scripts/lab/lab.ts`. The old branch stays.
- People act on what they have seen or been told, walk there, and spend the time. No part reads the world's true state to plan.
- Every part writes one feed event in the simulation's own words, and has a refusal or a "nobody came" case that is also written.
- No part adds a way to die or lowers a birth or pairing chance. Measured against the growth goal (see Acceptance).
- New saved state is listed per part and is bounded.

## Bundle A (rules 260): meeting

**Status, 26 November 2026: built and measured, not committed.** All three parts are built and switched. Uptake, the lab and the full
suite are in `docs/SOCIAL_SCENES.md`, "Measured (rules 260)". The acceptance items are under "Acceptance, per bundle" below.

### 1. Courting
- **Viewer sees:** two unpartnered people walk out together of an evening, more than once, before one of them proposes.
- **Now:** affinity grows through chats (`social.ts:1021`), then one conversation decides it (`social.ts:1650`). No lead-up.
- **Trigger:** `optCourt` in `options_social.ts` beside `optPropose`: both grown and unpartnered, not kin, `spark`, familiarity
  10 or more, affinity 20 or more, the other in sight within 10 tiles, spare time (the conditions `optPropose` uses for needs).
  Respects rules 227 (nobody is sought out at their work).
- **Action:** new conversation purpose `court` ("Walk with me?"). On a yes both take a `wander` activity with `data.walk` to a
  place the asker knows (a haunt from `leisure.ts`, the shore, the fire), about 150 ticks, side by side.
- **Outcome:** each outing adds affinity and trust to both and counts on the pair (`Relation.courted`: count and last tick). A
  proposal is worth more and more readily accepted after two outings. **Courting is not required for a proposal** in this version:
  a requirement could slow pairing and births. Make it required only if the lab shows pairing is not slowed.
- **Refusal:** the other says not today (busy, tired, affinity too low): a cooldown, and the asker's affinity falls a little after
  the third refusal running.
- **Events:** "A and B walked out together to the shore." / "A asked B to walk out; B said not today."
- **Strengthens:** pairing (a visible cause), spare time, known places.
- **Director:** an outing under way is a live shot scored above a lesson (about 62); the first outing of a pair is a middle event.

### 2. Welcoming newcomers
- **Viewer sees:** a resident walks over to people who have just arrived, talks to them and points the way to water.
- **Now:** arrivals walk to the fire knowing only the fire and the shore (`lifecycle.ts:471-486`). No resident reacts.
- **Trigger:** a resident sees somebody they have never met (familiarity 0) whose household has no home, within a day of arriving.
  Option `optWelcome`; more likely for the sociable and the generous. One or two welcomers per group, not the whole settlement:
  the arriving household records who has welcomed it (`hh.welcomed`, capped at 2, cleared when it has a home).
- **Action:** conversation purpose `welcome`. The welcomer tells them one water source and one food place they know (the existing
  knowledge hand-over used by `info`), and offers food through the existing offer path if they carry spare.
- **Outcome:** first relation both ways; the newcomers know where to drink; food given is a `generous` deed seen by others.
- **Failure:** nobody awake or in sight (a night arrival): no welcome, and nothing is written.
- **Event:** "A welcomed the newcomers B and C and told them where the spring is."
- **Strengthens:** arrivals (first-day thirst and hunger), knowledge passing, reputation.
- **Director:** middle event; the talk is a live shot at about 58.

### 3. Public praise
- **Viewer sees:** somebody rescued from a wolf thanks their rescuer on the spot, then speaks up for them at the fire; the
  builders of a shared building are named at the fire.
- **Now:** a rescue writes a log and a thought only (`defence.ts:350-373`); a finished building credits the finisher
  (`buildings.ts:257`). THANKS is never said for either.
- **Trigger and action:**
  - Rescue: at `defence.ts` resolve, the rescued person says THANKS, their affinity and trust toward the rescuer rise, and
    witnesses who saw it (rules 183) hold a new first-hand deed kind `brave`. The rescued person holds one owed thanks
    (`p.thanksOwed`: to, what for, since; cap 3; lapses after 3 days).
  - At the next evening fire sitting or occasion where both are present, the thanks is spoken: `say` and an event, and the
    listeners hold the story as heard from the rescued person.
  - Shared building ("for everyone"): everybody in `b.builtBy` is named the same way by the first person at the fire who used
    or saw the building, once per building.
- **Outcome:** the story travels by the existing retelling (`shareRumour`); `brave` counts in `reputationOf`; the `respected`
  hope moves.
- **Failure:** the two never meet in company within 3 days: the thanks lapses unspoken.
- **Events:** "At the fire B thanked A before 5 people for driving a wolf off her." / "At the fire D thanked A, B and C for the
  new well."
- **Strengthens:** wolf defence (a consequence that lasts), reputation, the evening fire, the `respected` hope.
- **Director:** the spoken thanks is a middle event (as built: 70 for a rescuer thanked in company, 55 for builders); the rescue itself is already a top event.

## Bundle B (rules 261): hearth

**Status, 26 November 2026: built, uptake measured, not committed; the lab is not run.** All three parts are built and switched (`src/sim/hearth_scenes.ts`; the arms are `rich-no-hearth-scenes` and `rich-no-hearth-birth|naming|vigil`, because `src/sim/hearth.ts` and `rich-no-hearth` already belong to rules 123's indoor hearth). Where the code differs from the text below is listed in `docs/SOCIAL_SCENES.md`, "Helping at a birth", "The naming day" and "Keeping vigil". Uptake is in "Measured (rules 261)" there.

### 4. Helping at a birth
- **Viewer sees:** a woman near her time goes home; her partner fetches a neighbour; the child is born with somebody there.
- **Now:** the birth happens wherever she is, with nobody involved (`lifecycle.ts:139-200`). `pregnantUntil` is known.
- **Trigger and action:** in the last third of a day before `pregnantUntil` she lies in at home (a rest activity). A housemate
  who sees it goes to ask one helper: a request of a new kind `attend_birth`, answered like the `watch` request
  (`responsibilities.ts`), carried out as a `visit` with `data.birth`. The asker prefers women who have borne or attended a
  child, kin, then friends.
- **Outcome:** the birth resolves at the same tick as now. Helpers present are recorded: mother and helper grow closer, the
  helper's count of births attended rises (`p.attended`), and the helper is the first to look in afterwards (existing welfare
  visit).
- **Failure:** nobody at home to send, or everyone asked refuses: she bears the child alone, with a small lasting thought.
  **No health risk is added either way.**
- **Events:** "X was born to M and F, with H there to help." / "X was born to M and F. M was alone."
- **Strengthens:** births, requests and promises, the new-parent period.
- **Director:** lying in with a helper present is a live shot (72); the birth stays a top event.

### 5. The naming day
- **Viewer sees:** at the feast already called for a birth, the parents show the child and say the name; sometimes the child is
  named after somebody who died.
- **Now:** the feast is a generic "feast"; the name is a random unused one.
- **Action:** at birth, if a parent has a dead parent, partner, sibling or close friend whose name no living person bears, the
  child takes that name (`p.namedAfter`: the dead person's id). The feast is labelled "naming feast for X". When it begins with a
  parent present, the parent says the name and an event is written; everybody attending comes to know the child.
- **Failure:** nobody came: the existing "nobody came" line, and no naming event.
- **Events:** "M and F named their daughter X before 6 people, after M's mother." (the last clause only when true)
- **Strengthens:** occasions (a feast with a purpose), the record of the dead, the inspector (a person's namesake).
- **Director:** middle event (58); the gathering is already a live shot.

### 6. Keeping vigil
- **Viewer sees:** kin sit through the night beside somebody badly ill or hurt; sometimes they are there at the end.
- **Now:** no nursing. A neighbour may look in once with food or water (`welfare.ts:379`). Others avoid a visible fever.
- **Trigger:** a housemate, partner, parent or child sees the person with health under 35, or with a strong fever
  (`fever_sign.ts`). Kin do not apply the fever avoidance to their own.
- **Action:** a `visit` with `data.vigil` beside them, through the night if need be, one sitter at a time per sick person.
  The sitter brings water or food by the existing welfare path when they carry it.
- **Outcome:** the sick person's thirst and hunger are tended and their mood eased. If they recover they remember who sat with
  them. If they die the sitter is a witness, and their grief is shortened as a grave visit shortens it.
- **Cost:** the sitter loses the night's sleep, and a fever can pass to them by the existing spread. That is the real risk in
  this part and the lab must show deaths do not rise.
- **Events:** "A sat up through the night with B, who has a fever." / "A was with B when he died."
- **Strengthens:** illness (care exists at last), welfare visits, grief.
- **Director:** a vigil under way is a live shot (66); "was with B when he died" joins the death as one top shot.

## Bundle C (rules 262): company

**Status, 26 November 2026: built, not committed; uptake in ordinary worlds and the lab are NOT measured.** By the owner's ruling of 26 November 2026 the uptake count and the lab run once, after bundle E, not per bundle. All three parts are built and switched (`src/sim/company_scenes.ts`; the arms are `rich-no-company-scenes` and `rich-no-company-song|dance|reunion`, because `src/sim/company.ts`, `setCompany` and `rich-no-company` already belong to rules 200's room for company). Where the code differs from the text below is listed in `docs/SOCIAL_SCENES.md`, "A song at the fire", "A dance at a feast" and "A reunion". The part-9 send-off is out of Group 1 (see below). The counts of 26 November 2026 that shaped the parts are in "Bundles C, D and E: revised plan" at the end of this file.

### 7a. A song at the fire; 7b. A dance at a feast
Split in two on 26 November 2026, because the song and the dance are different code in different places (`evening_fire.ts` and `occasions.ts`) and want separate switches and arms.
- **Viewer sees:** a song at the evening fire that others join; at a wedding or harvest feast people walk a ring round the place.
- **Now:** fire sitters sit; feast attendees stand (`occasions.ts`, the attend handler).
- **Action (song):** at a sitter's half-way point, with neither a thanks nor a story done at that sitting, three or more sitting, a sociable grown sitter in good spirits starts a song (`say`, one event) and those sitting there in good spirits join with a line of their own. At most one song a fire an evening, on about one evening in three at each fire (a hash of the fire and the day; no draw from the shared stream). Director rank 30, filler.
- **Action (dance):** at a wedding, feast or harvest feast with four or more there, those in good spirits walk a ring round the place for about 120 ticks, on a count of their own in the activity's data, by direct steps (no path, so nothing restarts); the ring is round the place's centre and within 2 tiles of its footprint. Only in daylight, or when the place is within 4 tiles of a lit fire. At most eight dance at one gathering (the coordinator's count of 26 November: gatherings are big, a median of 16 to 23 there at once, and a ring two tiles across holds eight). A dance under way is a live shot, 68.
- **Outcome:** want of company eased more than by sitting; the singers and dancers know each other better; two unpartnered dancers who pass courting's own test gain what one counted walk gives, and no walk is counted (`Relation.courted` is not touched), with courting on.
- **Failure:** too few people, or nobody in the mood: nothing happens and nothing is written.
- **Events:** "A started a song at the fire and N joined in." / "People danced at the wedding feast for A and B."
- **Strengthens:** the evening fire, occasions, courting.

### 8. A reunion (and 9. A send-off, which is out)
- **Viewer sees:** a partner, a child or a parent runs to meet a household member they have not seen for a day and a half or more, when they see them near home.
- **Now:** a passing wave and nothing else.
- **Action:** a short run to them (the running speed fleeing uses), a wave and a spoken line from each; about 100 ticks in all. The cue is the sighting itself (`perception.ts`): the person's own last first-hand sighting is read before the new one replaces it, so a record that came by hearsay is no cue.
- **Limits** (from the count: at one day apart there were about 7 reunions a day a settlement, which is noise): more than a day and a half apart; the greeter within 12 tiles of their own home (or of the settlement centre with none); once a pair every two days; no critical need and no danger in sight; never while either is asleep.
- **Outcome:** a glad thought for both and a little more fondness. Children may greet.
- **Failure:** need, danger or the other leaving sight before they meet: nothing is written.
- **Event:** "C ran to meet A, back after two days." (the gap floored to the half day, from the runner's own record). Director rank 60.
- **Counted 26 November 2026** (`scripts/absence_count.ts`, six saves, 25 days each): in 401 of 405 cases of a day or more apart at least one of the two was really away from home, so the scene is honest.
- **Send-off: out.** No journey plan, exchange journey or relocation departure started in any of the six runs, and a departure was seen in none of the later counts. The detectors had no positive control. Care journeys are short supply errands, not departures. Part 9 leaves Group 1; nothing was built for it.

## Tasks and models

Owner's rule: the cheapest model that can do the task. "Lead" is the session model (Fable).

| # | Task | Model | Notes |
|---|---|---|---|
| 0a | Settle trips 258 and 259; claim 260 to 264 | Done | Owner dropped trips B and C, 26 November 2026 |
| 0b | Record the rules-257 continuation pin from a clean checkout | Sonnet | Pattern: `scripts/v256_reference.ts` |
| 0c | Count absences and departures (parts 8, 9) | Haiku | Script over saves, read-only |
| 1 | Build bundle A, one part at a time, with tests and a staged scene each | Sonnet | One builder: the parts share `social.ts`, `options_social.ts`, `lab.ts` |
| 2 | Director ranks and page check for the new events | Sonnet | `director_model.ts`, `director_live.ts` |
| 3 | Review the diff against this plan: local knowledge, saved state, observer purity | Lead | |
| 4 | Lab: 24 seeds, 25 days, control, two nudges, full, three removal arms | Haiku runs, Lead reads | About 90 minutes on 24 cores (7 arms x 25 days x 30 CPU-seconds) |
| 5 | `docs/RULES_LOG.md` paragraph, `docs/SOCIAL_SCENES.md` section, brain checkpoint | Sonnet | |
| 6 | Repeat 1 to 5 for bundle B, then C | as above | |

## Acceptance, per bundle

- Tests: each part's unit tests and staged scene; the previous version's continuation pin unchanged. The full suite, recorded under
  decision D-3, runs once after bundle E (the owner's ruling of 26 November 2026), not per bundle.
- Uptake in ordinary worlds: each scene counted per settlement over 25 days. A part that hardly ever happens is reported as such. This
  also runs once after bundle E; until then a bundle's uptake is "not measured" in `docs/SOCIAL_SCENES.md`.
- No harm to growth: population, births, pairings and deaths against the mean of control and nudges, per removal arm. The lab runs once, after
  bundle E, with every part's removal arm.
- Watched: the owner watches the director with the bundle on.
- No twenty-year runs for these bundles.

Bundle A, 26 November 2026:
- Met: each part has unit tests and staged scenes (`tests/courting.test.ts`, `tests/welcome.test.ts`, `tests/praise.test.ts`); the
  rules-257 pin is unchanged; the full suite is recorded with five timeouts under load and no regression (D-3); no part harms growth in
  the lab.
- Met with limits: uptake was counted over 45 days in three worlds, not 25 days a settlement, and the rescue half of praise has never
  been seen in an ordinary world. The lab ran 12 fresh seeds and six saves, not the 24 seeds planned, and it records no births or
  pairings, so `people` stands in for growth.
- Open: the owner watches the director with the bundle on. Done since: the rules-260 continuation pin is recorded (gen-2 at tick 48000, `tests/v260_continuation.*`).

Bundle C, 26 November 2026:
- Met: each part has unit tests and staged scenes (`tests/song.test.ts`, `tests/dance.test.ts`, `tests/reunion.test.ts`) and the director has its ranks and a live
  shot (`tests/director.test.ts`); typecheck, the rules-261, -260 and -257 pins and the golden test pass unchanged; one two-day ordinary world ran at rules 262 with nothing
  thrown.
- Not met, by the owner's ruling: uptake in ordinary worlds, the lab, the full suite. They run once after bundle E.
- Recorded: the rules-262 continuation pin (ordinary Normal gen-2, arrivals on, tick 48000, from a clean checkout of `bf07213c`: `tests/v262_continuation.*`).
- Open: the owner watches the director with the bundle on.

## Bundles C, D and E: revised plan (26 November 2026)

The text below is the planning note of 26 November 2026, copied unchanged apart from its heading levels (each is two deeper than it was). Where bundle C was built differently, `docs/SOCIAL_SCENES.md` says so.

### Social scenes: plan for bundles C, D and E

Draft, 26 November 2026. Nothing here is built. It follows the Group 1 plan in the repository (`docs/SOCIAL_SCENES_PLAN.md`) and will be folded into that file when bundle B is committed.

Status of the five bundles:

| Bundle | Rules | Parts | State |
|---|---|---|---|
| A, meeting | 260 | Courting, welcoming newcomers, public praise | Built and committed |
| B, hearth | 261 | Helping at a birth, the naming day, keeping vigil | Building |
| C, company | 262 | Song, dance, reunion | Planned below |
| D, growing up | 263 | Sitting with the grieving, coming of age, settling a child for the night | Built (rules 263, 26 November 2026; `docs/SOCIAL_SCENES.md`, `src/sim/kin_scenes.ts`) |
| E, standing together | 264 | Fetching someone home after dark, speaking for a shared building, standing up for someone | Planned below |

The owner's ruling (26 November): all five bundles are built before the full test suite and the one 25-day lab are run. Each bundle is still checked on typecheck, its own tests, the reference worlds of every earlier version, the golden test, and a count of how often each scene happens in ordinary worlds.

#### What the code reading changed

Two read-only passes over the code on 26 November. Each correction below changed a scene.

- **A visit to the bereaved already exists**, but only after a partner dies. It is a 12-tick stand with no words and no line in the feed, and a friend who can already see the bereaved person never makes it.
- **Coming of age already writes a feed line** at 16 ("has come of age and joins the work"). Nothing gathers and nobody speaks. The person's hope is picked up to half a day later and shows only in their own log.
- **"Asking a family's blessing" is dropped.** People who arrive alone are 18 to 36 with no parents in the settlement, and a child born in the world is not grown until about day 192. The scene would almost never happen.
- **There is no night lookout of any kind.** The existing "watch" request is childminding for a parent who is laid up. Wolves bite often: 15 to 23 times per settlement in 25 days in earlier measurements.
- **Two people together are not safe from a wolf.** Safety needs three people within 5 tiles, or a lit fire within 4 tiles, or being indoors. So a watch has to be kept at a fire.
- **There is no settlement organiser and no election.** What exists is a coordinator for each shared building, chosen one conversation at a time. So "a speech before choosing an organiser" becomes "speaking for a shared building in front of people".
- **A theft nobody sees leaves the owner no trace**, and thefts have never been counted. A public accusation waits for a count.
- **Nothing in the simulation moves a person around a point.** Children's chase and hide-and-seek are speech bubbles. A dance needs a small new piece of movement, and there is no dance pose to draw, so it is drawn as walking.
- **Why partners are apart for a day is unknown.** The earlier count (7.8 times per settlement-week) did not look at where the two were. If it is mostly two people sleeping at different fires, a "reunion" would read oddly.

#### The counts are in (26 November, evening)

Six saved settlements, 25 days each at rules 260, 579 people at the start and 768 at the end. Totals across all six. Results are in `C:\dev\lw_labs\scene_counts\summary.txt`.

| Count | Result | What it decides |
|---|---|---|
| Thefts | **1** in all six settlements | A public accusation is cut. There is almost nothing to accuse anyone of. |
| Wolf bites | 87, none fatal. 65 in the dark. **No victim was asleep.** Typical bite is 27 tiles from the settlement and 25 from any lit fire; 76 of 87 on someone with nobody within 5 tiles | The night watch at the fire is cut. Bites happen to lone people far out after dark, not to sleepers at home. |
| Nights with a wolf within 12 tiles of the settlement | **1 of 150** | The same: wolves almost never come near. |
| Arguments | 82, and in 32 a bystander was kin or friend of exactly one side | "Standing up for someone" has a real trigger: about 5 per settlement in 25 days. |
| Shared buildings | 15 proposed, 13 agreed, typically a day from proposal to agreement, over 136 private asks. None was asked at a fire or gathering | Speaking for a shared building stays in. |
| Evening fire | 2,844 sittings; 1,440 of the 1,623 that reached half-way had five or more people. 346 stories | A song has plenty of room. |
| Feasts and weddings | 40 feasts, 13 weddings, 32 harvest feasts | A dance has occasions to happen at. |
| Days apart | In 401 of 405 cases at least one of the two was really away from home, and in 360 one had gone more than 25 tiles out | The reunion is honest and stays in. |
| Reunions as a person would see them | 1,046, about 7 a day per settlement | Far too many at "one day apart". The reunion needs a longer gap or a cap. |
| Small children at night | 77% of under-eights already sleep within 3 tiles of a parent. Children are outdoors and awake after dark on nearly every night | Settling a child has a nightly trigger. |
| Turning 16 | 8 in all six settlements | Coming of age: about once per settlement in 25 days. |

What changed in the plan because of them:
- **Bundle E loses the night watch and the public accusation.** It gains standing up for someone, and fetching someone home after dark in company.
- **The reunion** is limited so it stays an event: at least a day and a half apart, seen coming back toward home, once per pair every two days.

The original list of what was to be counted:

| Count | Decides |
|---|---|
| Thefts: seen by the owner, seen by others, unseen | Whether a public accusation is worth building |
| Wolf bites: dark or light, victim asleep or awake, distance to a lit fire | How the night watch should work |
| Arguments with a bystander present | Whether "standing up for someone" is a candidate |
| Shared building projects: proposed, time to agreement, contested | Speaking for a shared building |
| People present at the fire and at feasts | Whether song (3 or more) and dance (4 or more) can happen |
| Where partners were during a day apart | Whether the reunion is honest |
| Children at night, and children near danger | Singing a child to sleep; scolding a child |
| People turning 12 and 16 | Coming of age |

#### Bundle C (rules 262): company

##### 7a. A song at the fire
- **Viewer sees:** somebody at the evening fire starts a song and others join in.
- **Now:** fire sitters stand for 150 ticks. At the half-way point an older person may tell a story. The code notes songs as "not in this version".
- **Trigger:** three or more at the fire, no story and no thanks being spoken at that sitting, and a sociable sitter in good spirits.
- **Action:** the singer speaks a line; those in good spirits within 4 tiles join with a line of their own.
- **Outcome:** want of company eased more than by sitting; singers know each other a little better.
- **Failure:** too few people or nobody in the mood: nothing happens and nothing is written.
- **Event:** "A started a song at the fire and 4 joined in."
- **Frequent:** about 42 fire sittings per settlement in 25 days, of which about 8 have a story.
- **Risk:** none found. It uses the story's slot, so a sitting has a story or a song, not both.

##### 7b. A dance at a feast
- **Viewer sees:** at a wedding or a feast, people move in a ring round the fire or the hall.
- **Now:** attendees stand facing the place for 90 to 240 ticks.
- **Trigger:** a wedding, feast or harvest feast with four or more present. Never at a funeral.
- **Action:** those who join walk a short ring round the place, a few steps at a time, for about 120 ticks.
- **Outcome:** as for a song; two unpartnered dancers who could be a couple gain what a courting walk gives.
- **Failure:** too few, or it is dark and away from a lit fire: no dance.
- **Event:** "People danced at the wedding feast for A and B."
- **Known difficulty:** arriving at a spot restarts an activity's clock, so the dance must keep its own count of steps. This is the one piece of new movement in the plan.
- **Capped at eight dancers.** Gatherings are large: a typical wedding has 23 people present at once and a feast 21. The rest stand as now.
- **Risk:** a ring away from the fire after dark puts dancers within a wolf's reach. The dance is held only in daylight or within the fire's safe distance.

##### 8. A reunion
- **Viewer sees:** a partner or a child runs to meet a household member they have not seen for a day or more.
- **Now:** a passing wave and nothing else.
- **Trigger:** a person sees, first-hand, their partner or their own child or parent when their own last first-hand sighting of them is more than a day old.
- **Action:** a short run to them, a wave and a line. About 100 ticks, once per return.
- **Outcome:** a glad thought for both and a little more fondness.
- **Failure:** the greeter has a pressing need or a danger in sight: no reunion.
- **Event:** "C ran to meet A, back after two days."
- **Gate passed:** in 401 of 405 cases at least one of the two was really away from home.
- **Limit:** at "one day apart" a person would have about 7 reunions a day per settlement to see, which is noise. So: at least a day and a half apart, the returning person seen coming back toward home, and once per pair every two days.

**Send-off stays out:** no departure of any kind was seen in the earlier count.

#### Bundle D (rules 263): growing up

##### 10. Sitting with the grieving
- **Viewer sees:** a friend or relative comes to somebody who has lost a partner, parent, child or sibling and sits with them for a while. Sometimes they go to the grave together.
- **Now:** only a lost partner draws a visit, and the visit is a 12-tick stand in silence.
- **Trigger:** a person who knows of the death and is kin or fond of the bereaved. They need not have been standing nearby when the news arrived, and they may come even if the bereaved is already in sight.
- **Action:** the existing visit, made a sit of a few hundred ticks beside them, with a spoken line.
- **Outcome:** the bereaved person's grief eased as a grave visit eases it; the two grow closer.
- **Failure:** the bereaved is asleep, working far off or not found: the visitor turns back, and nothing is written.
- **Event:** "B sat with A, who has lost her mother."
- **Rare:** deaths are 0.1 to 0.8 per settlement in 25 days at current rules. Reported as rare, not tuned upward.

##### 11. Coming of age
- **Viewer sees:** when somebody turns 16 the household's feast is called for them; a parent or elder says a few words, and the young person says what they hope for.
- **Now:** one feed line. The hope appears later in a private log.
- **Trigger:** the existing moment a person turns 16.
- **Action:** the engine's existing way of calling a feast, given a purpose, as the naming day does in bundle B. The hope is chosen at the feast, not half a day later, by the same rule as now.
- **Outcome:** everyone attending knows the person's hope; the person gains a glad thought.
- **Failure:** nobody came: the existing "nobody came" line, and the hope is still chosen as now.
- **Event:** "D came of age before 7 people and hopes for a home of her own."
- **Rare in short runs:** roughly one per settlement in 45 days in young worlds, more as settlements grow and children born in the world reach 16.
- **Care needed:** a feast on the same day as another must not merge into it and lose its purpose.

##### 12. Settling a child for the night
Chosen after a second code reading (26 November).
- **Viewer sees:** at a small child's bedtime a parent comes and sits beside them, says or sings a few words, and stays until they are asleep.
- **Now:** every child goes to bed alone, by its own clock, exactly as an adult does. No parent is involved, nothing is said and nothing is written.
- **Trigger:** a parent in the same household who sees their own small child tired or lying down in the evening. The parent cannot read the child's body clock, only what shows.
- **Action:** a sit beside the child for a short while, with one spoken line, built on the same pattern as keeping vigil in bundle B.
- **Outcome:** a glad thought for the child and the parent, and the two a little closer. **It does not change when or how well the child sleeps**; nothing in the simulation would let it honestly do so.
- **Failure:** the parent is away, asleep, or has a pressing need: the child sleeps alone as now, and nothing is written.
- **Event:** "A settled little C for the night." Written at most once per child per evening, and ranked low for the director so it does not crowd out rarer scenes.
- **Frequent:** a fresh settlement holds about five children under seven, so about five chances every evening.
- **Cost:** a few hundred ticks of a parent's evening and a slightly later bedtime for them.
- **Open, for the counts:** how often a parent already sleeps within three tiles of their child, and whether the age limit should be under 7 or under 12.

**Scolding a child is not built.** Children in the simulation do nothing wrong that an adult could see: they never steal, there are no dares, and they cannot do the work that causes injuries. The honest version would be "calling a child away from danger", and adults already warn children of wolves many times a day.

**Note for coming of age:** children under 12 cannot attend occasions today, so younger brothers and sisters would not be at the feast unless that rule is relaxed for it.

#### Bundle E (rules 264): standing together

##### 13. Fetching someone home after dark
Replaces the night watch, which the counts cut: no sleeper was bitten, and a wolf came within 12 tiles of a settlement on 1 night in 150.
- **Viewer sees:** when a household member is not back by dark, somebody asks a neighbour to come along, and two or three go out together to find them and walk them home.
- **Now:** one person notices and goes alone, into the same danger. 76 of 87 bites were on somebody with nobody else within 5 tiles, 65 of them in the dark, typically 27 tiles from the settlement.
- **Why company matters, by the existing rules:** a wolf breaks off a stalk when two people are near it, and will not pick anyone who has two others within 5 tiles. Nothing new is needed for the group to be safer; they only have to go together.
- **Trigger:** the existing worry for a household member not seen for a long while, when it is dark or nearly so.
- **Action:** ask one or two people in sight to come, through the existing request and promise machinery; walk out together toward where the missing person was last seen; walk back together.
- **Outcome:** the missing person comes home in company. Those who went are thanked through bundle A's public praise.
- **Failure:** nobody will come: the worrier goes alone, as now. Not found: they turn back at a limit, and it is written.
- **Event:** "A and B went out after dark and brought C home."
- **Cost:** two or three people's evening, and they are out in the dark themselves, though together.
- **Care needed:** the group must really stay within reach of each other, or it is three lone people and not a group.

##### 14. Speaking for a shared building
- **Viewer sees:** at the fire or at a gathering, somebody stands and makes the case for a well, a hall or a workshop, and people answer there and then.
- **Now:** support is asked for one person at a time, in private conversations. A building with no agreed coordinator is not worked on at all.
- **Trigger:** a person who has proposed a shared building, or who wants to coordinate one, at an evening fire or an occasion with two or more listeners.
- **Action:** one spoken line; each listener answers by the same rule as a private ask, from their own regard for the speaker and their own needs.
- **Outcome:** agreement can be reached in one evening; a rival may speak at the same fire.
- **Failure:** nobody is persuaded: written as such, and the private asks carry on as before.
- **Event:** "At the fire A spoke for a new well; 3 of 5 said they would help."
- **Frequent:** 43 shared buildings were finished in three worlds over 45 days.
- **Care needed:** the speech sits on top of the private ask and must never leave a building with no coordinator.

##### 15. Standing up for someone
Chosen by the counts: 82 arguments, and in 32 of them a bystander was kin or friend of exactly one side. A public accusation is cut (one theft in six settlements).
- **Viewer sees:** two people are arguing, and a third steps in on one side.
- **Now:** bystanders watch. Somebody close to both may make peace later, once it has cooled; nobody takes a side.
- **Trigger:** a person who sees an argument and is kin or a friend of exactly one of the two. In the counts every such bystander was kin (39 of 39), and every argument was over the last of some food, so in practice this is a relative stepping in over a squabble for the last berries.
- **Action:** they walk over and speak up. A spoken line, during the argument.
- **Outcome:** the one they stood up for is heartened and grows closer to them. The other side thinks less of the one who stepped in. The argument may end sooner.
- **Failure:** the argument is over before they arrive: nothing is said.
- **Event:** "B stood up for A against C."
- **Risk:** it spreads a quarrel to a third person. The lab arm must show quarrels do not multiply, and the peace-making that already exists must still work afterwards.
- **Must not:** turn an argument into a fight. Nobody is hurt.

#### How it is delivered

One rules version per bundle, each part with its own switch and lab removal arm, as bundles A and B. The reference world for each version is recorded from a clean checkout before the next version is written.

| # | Task | Model |
|---|---|---|
| 1 | Finish, review and commit bundle B; record its reference world | Sonnet builds, Fable reviews |
| 2 | Fold the counts into this plan; settle parts 12 and 15 and the two gates | Fable |
| 3 | Build bundle C, one part at a time, with tests | Sonnet |
| 4 | Build bundle D | Sonnet |
| 5 | Build bundle E | Sonnet |
| 6 | Review each diff against the plan: local knowledge, saved state, no change to an earlier version | Fable |
| 7 | Count how often each scene happens in three ordinary worlds, per bundle | Haiku runs, Fable reads |
| 8 | Full test suite, then one 25-day lab with every part's removal arm | Haiku runs, Fable reads |
| 9 | Write up results; brain checkpoint | Sonnet |

One builder at a time: the bundles share the same files.

#### Rules common to every part

- People act on what they have seen or been told. No part reads the world's true state to plan.
- No part adds a way to die or lowers a chance of pairing, conception or birth.
- Every scene writes one feed line in plain words, and its failure case writes its own where one is named above.
- A part switched off, or an earlier rules version, behaves exactly as before.
- A scene that hardly ever happens is reported as rare. It is not tuned until it shows.

#### Known costs of building five before measuring

- Five bundles use every claimed version (260 to 264). A fix for anything the lab finds needs a new version, 265.
- A fault outside the focused tests would be found up to five versions after it was introduced.
- Several scenes are rare by nature (sitting with the grieving, coming of age). The lab will say little about them; the uptake count is their evidence.
