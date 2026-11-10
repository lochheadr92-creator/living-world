# The settlement's first storehouse is wanted from what the person knows: rules 192

Predecessor rules 191 is pinned by `tests/v191_continuation.expected.json`. Origin: gap ledger row G32 (`docs/GAP_LEDGER.md`), the part the
end-to-end trace of 10 November 2026 demonstrated (`docs/END_TO_END_TRACE.md`, links 2, 9, 18, 21 and 24, the proposal gate seen five
times), taken in the diagnose-and-repair session of 11 November 2026 (`docs/REPAIRS_20261111.md`) once the files it sits in were released.
Stream: repair.

## The defect (every version from 162 to 191)

Rules 162 lets a settlement with a solid home and no storehouse lay out its first one without the household-food, temperament and site-cap
gates. `firstStorehouseWanted` (`options_work.ts`) read `world.buildings` for the solid home and `noFirstStorehouse` (`shared_stone.ts`) read
the world's buildings and sites for the store. So in ordinary aspen eight people chose "Lay out a storehouse" within a tenth of a day of Dax
finishing the first hut, whether or not they had seen it, and the want reopened for everyone the moment a site was cancelled, whether or not
they knew. The recorded reason gave the purpose and never why now.

## The rule (rules 192, rich worlds)

`src/sim/shared_stone.ts knownSolidHomeNear` and `noKnownStorehouseNear`, asked by `firstStorehouseWanted`. The cue is a solid home the person
believes stands within the settlement radius (a building belief with a solid home type and a condition above zero) and no storehouse, standing
or laid out, that they believe in (with the `each` part of rules 162, within the radius; without it, anywhere). The trees-and-rock knowledge
test is unchanged. The recorded reason says why now: "the first shared storehouse, a place to keep stone, wood and tools for everyone, now that
a hut stands here and I know of no store".

What follows from reading beliefs:

- A site the person still believes in that is in fact gone holds them back until they see the spot again (`perception.ts refreshBeliefs` drops
  a belief of a thing that is no longer there when they come within sight of it).
- A site they have not seen lets them want the store and go to mark one out; the world refuses at the spot as it always did ("a storehouse is
  already being built", `act_build.ts siteConflict`, unchanged). The physical checks at execution still read the world: that is the spot
  refusing, not knowledge.
- Someone who has not seen the hut does not want the store. Someone who has seen it does, whether or not it still stands, until they see otherwise.

Rules 191 and earlier, authored worlds and `setKnownFirstStorehouse(false)` read the register as before. The `each`, `quarry`, `restock` and
`cue` parts of rules 162, the later storehouse allowance (`stores < facilityAllowance`, already belief-based) and `siteConflict` are unchanged.

## What it can change

Fewer people race for the first storehouse the moment a hut is finished, and a cancelled site does not reopen the want for everyone at once.
Where a settlement's people have all seen the hut the difference is small. No benefit is claimed.

## Limits

- The rest of G32 is not taken: the household's own-site test (`world.sites` filtered by household), `openSitesNear` and the non-township
  `huts` count still read the world. Each is a separate change with its own evidence.
- A belief of a building keeps its condition from the last sight; a hut that has since collapsed still counts until seen.

## Evidence

- Contract tests `tests/known_first_storehouse.test.ts` (6), each with the rules-191 contrast: a hut she has never seen offers the store at
  191 and not at 192 until she sees it; the reason names the hut at 192 and is the purpose alone at 191; a known site that is gone holds her back
  at 192 until she sees the spot, while 191 reopens the want at once; an unseen site lets her try at 192 and the world refuses at the spot, while
  191 stops her beforehand; the switch keeps the register read.
- `npm run typecheck` passed; `tests/shared_stone.test.ts` (rules 162, pinned at 162 in its scenes), `lab`, `townships`, `shared_projects` and
  `civic_choice` pass beside it (56 tests).
- Immutable pin `tests/v192_continuation.*` (Normal gen-2, arrivals on, 7,200 ticks then 120 after a save and load; a recorded reason wanting
  the first storehouse from what the person knows by tick 7,100, the site marked out by 7,175), recorded from a clean checkout of `4a4d5823`.
  In the same probe cedar reached it at tick 8,325 and river at 9,575.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 191 and at 192 from a clean checkout of `4a4d5823`:
  see `review_evidence/repairs-20261111/twins/r191-r192/`.
- Twin result: the final world differs in 12 of 12 seeds (single draws: meadow 15 against 28 alive, aspen 19 against 24, cedar 26 against 21); conservation and
  the tool registry hold in all 24 runs.
- Paired lab (`scripts/lab_versions.ts`, 12 seeds, Normal, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`, rules 191 pinned with `--rules 191` against current rules 192, clean checkout of `8ad697bd`, `dirty` false): nothing moved by more than a single draw moves it (people 22.9 against 23.4, deaths 9.1 against 8.4, mean hunger 49.1 against 50.2, all inside their noise floors); five rows are systematic and inside their floors and are not called larger than chance (first yard day +3.0, 10 of 12 later; projects done -4.6, 10 of 12 fewer; prep units -19.4; buildings -1.1; projects adopted -4.7). No benefit or harm is claimed. Evidence: `review_evidence/repairs-20261111/lab192/`.

The systematic rows are consistent with the rule: fewer people want the first storehouse the moment a hut is finished, so the first yard and the shared projects
come a little later and fewer projects are adopted and finished inside 25 days. None is larger than a single draw moves it.
