# Care decided from remembered need — rules 106

Delivered 31 October 2026 on `main` after rules 105. Closes the first of the two open audit items recorded with
[LOCATION_QUESTION.md](LOCATION_QUESTION.md) (the care option read a dependant's live needs out of sight) and belongs to
programme rows A2/WS17 (local knowledge; household care) of [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).
Owner: `src/sim/remembered_need.ts`; lab removal `rich-no-remembered-need`; rules 105 and earlier keep their recorded
behaviour and references.

## Diagnosis

`options_work.ts optCare` decided whether to bring food, water or warmth to a household dependant (a child, a frail elder,
somebody badly hurt) from `d.needs`, the dependant's true current hunger, thirst and warmth, whether or not the carer could
see them. The carer's *location* knowledge was already local (sight or a whereabouts note no older than 700 ticks), but
the *need* was not: a parent set out with bread the moment a child two fields away grew hungry, which nobody could know.
The same live read raised the gathering urge (`optStockpile`, `optWaterRun`) for a dependant out of sight.

Perception already reports visible signs of a person in sight (`perception.ts describeSeenPerson`: looks hungry below
42, thirsty below 40, cold below 35), and `SeenEntity` is rebuilt every tick for what is in sight now.

## Contract (rules 106, rich worlds)

- **Remembered signs.** When a person is seen, the visible signs are kept with the whereabouts note written at the same
  sight (`whereabouts[id].seen = {hungry, thirsty, cold}`, `rememberSigns`). A note that came from somebody else's answer
  (rules 105, `from`) carries no signs; a note from before rules 106 carries none either.
- **Out of sight, the signs stand for the needs** (`knownNeeds`): a dependant remembered hungry is taken as just past the
  visible threshold (hunger 41), thirsty as 39, cold as 34, and otherwise as fine. The care option, its severity, the
  amount to bring and the gathering urge are all computed from these figures, never from the dependant's live state. A
  dependant in sight is judged from what the carer sees, as before.
- **No signs, no care.** A dependant whose whereabouts the carer knows but whose state they never noted is set aside
  with "has not seen how they are"; one whose whereabouts is unknown or stale is set aside with "does not know where
  they are", as before.
- **The reason says so.** The option's first part reads "Cal needs bread (looked so when I last saw them, tick N)" when
  it rests on remembered signs, and the person panel shows it under "Why did they choose it?".
- **Honest consequences.** A child who grows hungry out of sight gets no care until somebody sees them (or they come
  home, where the resident-contact path of rules 56 already judges from presence). A carer who last saw a child hungry
  sets out even if the child has since eaten, and walks to where they last saw them. Both are the cost of local knowledge
  and are kept, not corrected.
- **Remaining live reads, left as they were:** `d.cooldowns.fedUntil` (a 120-tick window set only by an actual hand-over
  or resident care; it suppresses a second trip, never causes one) and the pre-56 watch fallback recorded with rules 105.
- Save: `seen` is validated to be booleans and allowed only in rich worlds at 106 or later. The fingerprint includes it.
  Replay and the rules-105 reference are unchanged.

## Evidence

- Staged (`tests/remembered_need.test.ts`, 3 tests; fixture `tests/helpers/remembered_need.ts`): a child who grows hungry
  out of sight draws no option and nothing set aside at 106, "Bring bread to Cal" at 105 and with the lab removal; in
  sight the option rests on sight; out of sight again it rests on the dated signs even after he has eaten; a told note
  without signs is "has not seen how they are"; the save round-trips, is refused relabelled 105, and a reloaded twin
  continues exactly for 300 ticks.
- Rendered (`scripts/browser/remembered_need_check.mjs`, 5/5, screenshot inspected): the same scene in the page; Ada's
  panel reads "Weighed up: Cal needs bread (looked so when I last saw them, tick 0) +75 · walking −1" and she walks to
  where she last saw him.
- Ordinary (`scripts/remembered_need_observe.ts`, river and meadow Normal, five days, 106 against pinned 105; the worlds
  diverge, so the counts are not paired): out-of-sight care trips river 5 (2 on signs still true, 3 no longer true) against
  41 on true needs, meadow 3 (2/1) against 92; dependants sampled hungry out of sight and not known to be, river 45 of 1,107
  out-of-sight samples, meadow 6 of 942; remembered signs differing from the true state, river 72, meadow 66; no deaths.
  Reports: `autonomy_evidence/r106-{river,meadow}` and `-at105`.
- Regression: 335 files / 2,195 tests, one emergent charcoal test failed on the shifted meadow trajectory and was widened
  with its measurements (`tests/iron_chain_stall.test.ts`); runtime `fe28953`, reference `9879e96`. The observer alone reads the dependant's true state to count how often remembered signs differ
  from it; nobody in the world does.

## Limits

No claim that care is better or worse for it; the change is to what the carer knows. Ordinary care reliability and
household viability remain unproven (register row WS17). The gathering urge for a dependant out of sight now reads the
same remembered signs; no separate measurement of that was made.
