# Event cards (presentation only)

11 November 2026, rules 211 unchanged. A small white card opens beside the place where a big occasion has just begun, so it can
be noticed while watching the settlement from afar. No simulation, save format, RNG or balance change.

## What gets a card, from which record

| happening | record | when | card |
|---|---|---|---|
| wedding | `Occasion` kind `wedding`, about the couple | status turns `called` to `gathering` | gold bells that swing, petals and blossoms; "A wedding has begun!", "Ada & Ben", "At the fire" |
| birth feast | `Occasion` kind `feast` about [baby, mother] (`noteBirth`) | as above | star and blossom; "Welcoming Cal, born to Ada" |
| yearly feast (midwinter) | `feast` held for a `Tradition` that day | as above | flame; the tradition's own name |
| harvest feast | `Occasion` kind `harvest` | as above | wheat, falling leaves and grain |
| market | `Occasion` kind `market` | as above (an announced market has no card) | stall and bunting, no burst |
| funeral, remembrance | `Occasion` kind `funeral`; a remembrance when a `Tradition` of that kind was held that day | as above | candle, a subdued card, no burst |
| shared building finished | a new `Building` with no owning household (`hhId` 0) of a facility kind, hall, storehouse or well; not a fire or food rack | first seen in `world.buildings` | house and hammer, a little sparkle; builders from `builtBy` |

Not supported, because the simulation has no record of them: birthday parties and emergencies such as a building fire.

## Behaviour

- An occasion that is only called has no card. The card opens when it begins and stays six seconds of UI time (paused or at any
  speed), then folds to a small marker over the venue until the occasion ends. A building's card simply closes.
- At most two cards are open; at most two wait. A card that waits eight seconds, or is pushed past the queue, gives up its card
  (an occasion keeps its marker). Each happening is announced once per world.
- The first look at a world (a new game, a loaded save) announces nothing: an occasion already under way shows its marker only.
- Placement: above the venue with a pointer to it, about 2.5 tiles of ground kept clear for the people there; stacked above another
  card at the same place; stepped clear of the interface's panels; held inside the view, without a pointer when the venue is off
  screen. About 244 px wide, narrower on a small screen; the same size at every zoom.
- Dismiss (x) and Watch buttons with labels; Watch and a marker click call `Game.flyTo`. Nothing moves the camera unasked.
  Decoration ignores the pointer.
- Reduced motion: the card and its icon stay; no swing, no slide, no burst.

## Files

`src/ui/event_cards_model.ts` (which happenings, the words, the queue, placement; no DOM), `src/ui/event_cards_art.ts` (fixed SVG
strings and the burst's geometry, a hash of the card's key, no random draw), `src/ui/event_cards.ts` (the UI part), styles in
`src/styles.css` (`.ev-*`), mounted in `src/ui/index.ts`.

## Verification

- `tests/event_cards.test.ts` (14): wording from records, a called occasion has no card, one announcement over many frames, fold
  and end, dismiss, no replay on load, the queue and staleness, placement (edge, two at one venue, a panel over the venue, off
  screen, narrow), the burst, and observer purity: a seeded Normal river run watched by the model is identical to an unwatched
  twin (fingerprint and serialized state at four checkpoints) while a real wedding opens and closes in it.
- `scripts/browser/event_cards_check.mjs` (30 checks, real page, CDP input) on an ordinary Normal river world (80 by 80); the
  occasions are STAGED with the simulation's own calls and opened by its own clock, and the funeral is a staged fixture in a
  throwaway copy. It includes purity of the shown world against a twin stepped in lockstep. Evidence:
  `viewer_evidence/event-cards-20261111/`.
