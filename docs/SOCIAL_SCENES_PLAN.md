# Social scenes, Group 1: plan

Drafted 26 November 2026 on the owner's instruction ("draft the plan for Group 1"). Nothing here is built. It is the first of six
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
| 262 | C: company | 7 song and dance, 8 a reunion, 9 a send-off |

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
- **Director:** the spoken thanks is a middle event (60); the rescue itself is already a top event.

## Bundle B (rules 261): hearth

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

### 7. Song and dance
- **Viewer sees:** a song at the evening fire that others join; at a wedding or harvest feast people dance round the fire.
- **Now:** fire sitters sit; feast attendees stand (`occasions.ts:379`).
- **Action:** at the fire, with 3 or more sitting and no story being told, a sociable sitter starts a song (`say`, an event) and
  those in good spirits join. At a wedding, feast or harvest feast with 4 or more present, a dance begins: those who join move in
  a ring round the place for about 120 ticks (a new `dance` step in the attend handler; the renderer needs nothing new if it is
  ordinary walking).
- **Outcome:** want of company eased more than by sitting; singers and dancers know each other better; two unpartnered dancers
  with `spark` gain what an outing gives (it feeds part 1).
- **Cost:** it runs late, so bedtime slips.
- **Failure:** too few people, or nobody in the mood: nothing happens.
- **Events:** "A started a song at the fire and 4 joined in." / "People danced at the wedding feast for A and B."
- **Strengthens:** the evening fire, occasions, courting.
- **Director:** a dance under way is a live shot (68); a song 55.

### 8. A reunion and 9. A send-off: measure first
- **Idea:** a child or partner who has not seen a household member for a day or more runs to meet them when they come back in
  sight (reunion). A household that sees a member set out on a provisioned journey (`journey.ts`) or a relocation sees them off
  and hands them food (send-off).
- **Unknown:** how often anybody is away from their household for a day, and how often a relocation or journey plan starts.
- **Task before any design:** count both in the six rules-256 saves (`docs/SAVE_LIBRARY.md`) over 25 days. Build part 8 only if
  day-long absences happen at least weekly per settlement, and part 9 only if departures do. Otherwise both move to a later group
  and bundle C is song and dance alone.

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

- Tests: each part's unit tests and staged scene; the previous version's continuation pin unchanged; full suite recorded under
  decision D-3.
- Uptake in ordinary worlds: each scene counted per settlement over 25 days. A part that hardly ever happens is reported as such.
- No harm to growth: population, births, pairings and deaths against the mean of control and nudges, per removal arm.
- Watched: the owner watches the director with the bundle on.
- No twenty-year runs for these bundles.
