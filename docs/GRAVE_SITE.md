# A grave is never dug in a doorway: rules 190

Predecessor rules 188 is pinned by `tests/v188_continuation.expected.json` (189 is unused: the gap stream claimed it and has not landed it). Origin: the
diagnose-and-repair session of 11 November 2026 (`docs/REPAIRS_20261111.md`), which stepped the twelve lab seeds for 45 days and recorded every
person's state just before death and every activity blocked for more than half a day. Stream: repair (`docs/RULES_RANGES.md`).

## The defect (every version up to 188)

`killPerson` (`lifecycle.ts`) marks a grave on the nearest free land tile to where the person died, searching outward to five tiles, and
`registerGeneric` makes a grave solid for good. A home's door tile is free land, and people die at doors: heading for shelter in a cold snap, or
on their own threshold. When the grave took the door tile, `leaveHome` refused everyone inside with "home exit is blocked" and `canEnterHome`
refused everyone outside with "home entrance is blocked", for the rest of the world's life. Nothing ever removes a grave.

Ordinary worlds at rules 188 (Normal, arrivals on, 45 days, `review_evidence/repairs-20261111/`):

- **meadow**: Mona died of hunger at the door of the Hazel household's hut on day 23.9 (tick 57,437). Her grave took the door tile (33, 50).
  Sofia and Kai were inside. From tick 57,500 both were refused "home exit is blocked"; by tick 58,800 Kai sat at thirst 0 and hunger 4 behind it.
- **birch**: Hugo, of another household, died of exposure at the door of the Rowan hut on day 22.9 (tick 55,027). His grave took the door
  (34, 45). Gus, inside, was refused "home exit is blocked" from tick 55,100 and died of thirst at tick 58,981.

Both were found by a probe that only steps the world and reads it; neither needed anything staged.

## The rule (rules 190, rich worlds)

`src/sim/grave_site.ts`, asked once in the grave placement loop of `killPerson`. A tile may take a grave if it is not the door tile of any
standing building and not where the door of any laid-out site will be (`isDoorTile`). The search is otherwise as before: nearest free land
within five tiles, never sand, and a death with no other tile within reach still marks no grave. Piles are not solid and are not moved.

Rules 189 and earlier, authored worlds (which have no indoor habitation to shut anyone in) and `setGraveSite(false)` keep the old placement.

## What it can change

A death on a doorstep no longer ends a household's home. The grave sits a tile to the side. Nothing about the death itself, the estate, the
feed or who learns of it changes.

## Limits

- Only door tiles are protected. A grave can still land on any other walkable tile, including a narrow passage; pathfinding routes around it as
  it does around every other solid thing.
- Graves already dug in doorways in a saved rules-188 world stay where they are; this rule changes placement, not existing graves.
- Nothing else that is solid is checked here. Trees and rocks are placed at world generation and planting needs a clear ring; sites and buildings
  refuse a footprint that would obstruct access (`construction_access.ts`).

## Evidence

- Contract tests `tests/grave_site.test.ts` (6), each with the rules-189 contrast: at 189 the grave takes the door and the person inside is
  refused "home exit is blocked" and a housemate "home entrance is blocked"; at 190 the grave is beside the door and both pass; a site's future
  door is kept clear; the switch and an authored world keep the old placement; an ordinary tile is unchanged and the world saves and loads.
- `npm run typecheck` passed.
- Immutable pin `tests/v190_continuation.*` (Normal birch, arrivals on, 55,200 ticks then 120 after a save and load; Hugo's death on the
  doorstep at tick 55,027 is buried beside the door, sampled every 25 ticks), recorded from a clean checkout of `7e984634`.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 188 and at 190 from a clean checkout of `7e984634`,
  24 processes at once: identical in 9 of 12 seeds; aspen, birch and meadow part (each has a death near a door inside 25 days); conservation and
  the tool registry hold in all 24 runs. `review_evidence/repairs-20261111/twins/r188-r190/`.
- Door scan, 12 seeds, Normal, 45 days, arrivals on, `door_scan.ts` from clean checkouts (`6254dc9b` at 188, `8ad697bd` at 192): at 188 four graves took a home's door tile in three seeds (birch: Hugo, day 22.9; gen-5: Yan, day 26.9, on an empty hut, and Jax, day 34.7; meadow: Mona, day 23.9), four people were shut in (Gus, Otto, Sofia, Kai) and all four died of thirst behind the door (ticks 58,981, 84,951, 60,615, 59,099); a fifth home was sealed with nobody inside. At 192 no grave took a door tile and nobody was refused an exit in any of the twelve worlds. `review_evidence/repairs-20261111/doorscan/`.

No aggregate benefit is claimed: a paired lab was not run for this version, because the change is a physical correction with no decision
behind it, and the twin shows where it bites.
