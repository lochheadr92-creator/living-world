# The compact resident card, the full character viewer and the knowledge lens

11 November 2026, on `main` after rules 188 (`d47912e1`). Presentation only: no rules version, no change to serialized state,
save format, world generation, decisions, knowledge or timing. The ideas come from the survey sheet drawn on the design canvas
on 10 November (a second drawing of the sim); the canvas itself is untouched and nothing from it is copied here. This record
says what the ordinary interface already had, what was only exposed, what was built, and what was left out.

## Audit: what the ordinary interface already had

Before this change the person panel (`src/ui/person.ts`, `person_sections.ts`, `person_social.ts`) already answered what,
why, what for, what is in the way, how the last attempt went and what they are set on (`sim/inspect.ts buildQA`), with a task bar,
needs, mood, health, fever and injury, goods, carry capacity and tools, every plan with its state (`planViews`), the conversation,
meal, promises, quarrels and worries (`inspect_work.ts`), opportunities nearby, relationships with label, affection and trust,
requests, the personal log, knowledge counts with the six most recent hearsay sources (P1.1), family, traits and skills, the
recorded decision with alternatives and set-aside options (debug), the rules-103 decision ledger, and the household, relationship
and civic histories. Selection (`render/input.ts`, `render/picking.ts`), follow (`Game.setFollow`, F), centre (`Game.flyTo`) and a
knowledge overlay (`render/overlays.ts drawKnowledge` over `terrain.ts drawUnexplored`: unexplored ground darkened, remembered
places faded by age, hearsay hollow) all existed. Observer purity was already tested (`tests/purity.test.ts`,
`viewer_purity.test.ts`, `inspect_work_purity.test.ts`); the fingerprint is `sim/world.ts hashWorld`.

Recorded simulation state that was not shown well: each belief's source, teller and ages (only counts and six lines were
shown); `Person.whereabouts` (where they last knew people to be, and who told them); `Person.suspended` (work set aside that can
resume) was shown nowhere; the log and the decision ledger were two lists with different time words; the knowledge the current
action rests on was not named. Absent from the simulation and **not added**: a stored "contradicted" or "stale" flag (the person
has no such knowledge; the viewer can compare for itself), a confidence figure on beliefs (only the teller's checked accounts
exist), an expected duration for travel, and abandonment, transfer or consumption as outcome categories (a dropped plan carries
its reason; transfers and meals are log and ledger lines). Each was judged not to be a real, durable simulation concept with a
behavioural use of its own, so none was invented.

## What this change does

**One derived view module.** `src/sim/inspect_observer.ts` reads only recorded state and returns: a one-line `status` (at risk,
fleeing, blocked, stuck, unwell, hurt, interrupted with the set-aside work named, resting, helping someone, carrying food home or
goods to a place, in company, or no immediate problem, in that order); `intent` (the destination with tiles to go, the place
they are at, or the next plan step, with map coordinates); a `provenance` cue only when the current target rests on hearsay
(teller and age of the report), on an old sight, or on a last known location (seen or told); `relevantItems` (the action's item,
or everything carried for a delivery); `suspended`; `knowledgeItems` (newest sight first, trees thinned to three, each with
source, teller, seen and learned ages, staleness past 1,800 ticks, and a **world check** that is the viewer's own comparison:
present, gone, empty, or unchecked for water); `whereabouts` (seen or told, room, in sight now); and `timeline` (the log and the
ledger merged newest first, each stamped "Day N, HH:MM"). `describePerson` carries them on `PersonView`; `RelationView` gains
`household` and household members sort first.

One correction in `buildQA`: the last decision's reason is quoted only for the activity that decision launched (the ledger's
`activityId`) or one that carries its own `why`. An activity that arrived another way, such as a practice session a child asked
for, no longer borrows the previous decision's reason; the card says it was not a weighed choice and gives its aim.

**The compact card** (`person.ts`, depth `card`, the default) shows name, life stage and household; the status line; what they
are doing with progress; why; where to or what next, with a pin that centres the map there; the provenance cue when there is one;
what is in the way only when something is; how the last attempt ended; pressing needs only; goods only when they bear on the
action; and Follow, Centre, Full view and Close.

**The full character viewer** (depth `full`, opened from the card, 540 px wide, remembered in the UI state) has six collapsible
sections built by `person_sections.ts`: Now (the same action block, mood and health, thoughts, needs, nourishment, goods, carry
and tools); Plans and choices (work set aside, every plan with its state, the recorded reason in words, what was also considered
and what was set aside with the reason given at the time, a Technical detail toggle for the scores with every part signed, the
rules-103 Recent decisions and the Opportunities nearby disclosure, which is only computed while open); What they know (counts,
kinds, the Knowledge lens button, the item list with source, age and world check, where they last knew people to be, hearsay
sources); People and relationships (conversation, meal, promises, quarrels, worries, requests, relationships household first
with the affection figure given a word and folded past six, what they have heard of people, family); Recent history (the merged
timeline, folded past fourteen, entries with more opening on click); Household and character (home, township, the civic,
household and relationship histories as before, traits, skills, trade, practices and what has paid them, with a note that
nothing shown is display-only flavour). The debug raw numbers stay behind Shift+D.

**The knowledge lens** is the existing Knowledge overlay, extended in `drawKnowledge`: a cross over a remembered place the live
world no longer agrees with, and a ringed initial where the person last knew someone to be (dashed when told), with a thin thread
to where that person really is. The comparison is drawn over the real world; nothing is written to the person. The overlay chip,
its tooltip and the help card say so.

## Evidence

- `tests/observer_viewer.test.ts` (4): a hungry person acting on a told berry bush shows "Following Kai's report" and the card's
  intent points at the bush, while the teller's own row reads seen; the world check reads empty and gone from the live world
  while the person's belief keeps its 6; the status line orders at risk, interrupted (with `suspended` on the view) and blocked;
  an ordinary river world's timeline is newest first, every entry in world time, with decisions and their recorded endings.
- `tests/observer_viewer_purity.test.ts` (1): 3,000 ticks of a Normal river world with arrivals on, the observer selecting,
  following, centring, flipping the lens and the other overlays, reading every view with opportunities and drawing a frame every
  25 ticks: fingerprint and full serialized state equal an unwatched twin at ticks 300, 900, 1,500, 2,400 and 3,000.
- `scripts/browser/observer_viewer_check.mjs`, **25 of 25** in headless Chrome at 1440 × 900 against the dev server, output
  `viewer_evidence/observer-viewer-20261111/` (nine screenshots and `report.json`): an ordinary river world run 900 ticks in the
  page; the card's reason equals the person's recorded `lastDecision.because`; the selected person is on screen and not under the
  card; the six sections open and fill; the shown alternatives and set-aside options are the recorded ones; scores hidden until
  asked; the history's outcome row is the closed ledger entry; 1,200 more ticks run in four 300-tick steps between observer
  actions, the watched world equal to an unwatched twin in fingerprint and full state at ticks 1,200, 1,500, 1,800 and 2,100; then
  a separately staged second world (labelled STAGED, after the comparisons) where a belief told by Mira reads "Hearsay, told by
  Mira just now" and a sight dated 3,000 ticks back reads "Seen, old, possibly out of date", each from the belief's own fields.
- Focused suite: 18 of 19 files pass; `tests/household_continuity_view.test.ts` fails 8 of 8 identically at the untouched HEAD
  and is on the known failing list since rules 169 (`review_evidence/empty-food-landing-20261109/`).
- Full suite on this machine with the change in the tree: 553 of 569 files, 3,127 of 3,202 tests (3 skipped) in the parallel
  run, 519 s. Of the 16 failing files, 9 are on the rules-176 failing list (`failing-tests-10d3adf2.txt`), 6 are load timeouts
  that pass alone one at a time (`lab_defaults`, `lab_provenance`, `lab_report`, `zz_review_g_observer_purity`,
  `zz_review_h_retention`, `zz_review_main_toolreport_saves`), and one was a real delta: `tests/zz_review_g_ledger_endings.test.ts`
  had recorded the misattributed reason as a review finding (it asserted the listener in a conversation IS shown an unrelated
  earlier decision's reason). The finding is repaired by the `buildQA` correction, so that test now asserts zero misattributions
  and that every such listener reads "Not a weighed choice"; it passes.

## Limits and what was left out

- The staged hearsay and stale rows are rendered evidence only; in the ordinary river world at tick 900 the person shown held no
  hearsay, so the provenance cue on the card was exercised in the unit test, not in the page.
- Expected duration is not shown: the simulation keeps progress against duration and distance to go, not an arrival estimate.
- The world check and the lens compare with the live world for the viewer; they say nothing about what the person will learn.
- Phone and tablet layouts were not re-measured; the full viewer takes the whole width under 760 px by CSS and was not screenshotted.
- The canvas sheet's own defects (indoor positions, flood, dimmed unseen people, a silent frame loop) are not this repository's.
