# A dissolved household's belongings are released — rules 163

Predecessor rules 162 is pinned by `tests/v162_continuation.expected.json` (`770b208b`), recorded
before this behaviour existed. Origin: the 7 November 2026 whole-project adversarial review,
item 5, re-verified against source before anything was written.

## The defect (rules 93 to 162)

`estate.ts` stamps a dead person's belongings with their household (`pile.estate.hhId`) and
`pile_access.ts` admits only that household; perception copies the stamp into beliefs, so
`mayTakeKnownPile` also hides such a parcel from everyone else's options. `dissolveHousehold`
(`households.ts`) released a dissolved household's buildings, sites and plots but never its
parcels. Two ordinary paths dissolve a household: its last member dies (`killPerson` drops the
estate at `lifecycle.ts:246` and removes the member at `:270`, so the parcel is orphaned the same
tick), or its last member, nearly always a child, is taken into another household
(`adoptOrphans` → `addToHousehold`), after which the heir is in a different household and is
locked out too. Nobody could take the parcel and nobody was offered it.

## The rule

`src/sim/estate_release.ts`, called from `dissolveHousehold` once the household is out of the
world:

- the dissolving household's estate parcels pass to the household its last member joined
  (`addToHousehold` passes the destination and the member: an adopted child, someone moving in
  with a partner or kin, a relocation that split the household);
- when the last member died (`removeFromHousehold`) they become shared property (`hhId` 0,
  anyone may take them, as public equipment already was);
- the tools in a parcel change owner with it (`Tool.ownerHh`), so the rules-93 validator and the
  tool registry stay consistent;
- one `life` event per dissolved household says what happened ("No one of the Juniper household
  is left; what they left behind is anyone's to take." / "What the Hazel household left behind
  passed to the Reed household with Dax."), and the inspector's "Belongs to" row names the new
  owner or "Shared property".

Nothing is moved, created or lost: a parcel still has to be reached and collected as before, and
people learn the new owner when they next see the parcel (`knowledge.ts` copies the stamp on
sight), so a stale belief keeps hiding it until then. Rules 162 and earlier keep their recorded
behaviour; a save made before 163 keeps its locked parcels. The module switch `setEstateRelease`
(`estateReleaseOn`) restores the rules-162 behaviour inside a rules-163 world for the lab; its
branch name is `rich-no-estate-release`, to be registered in `scripts/lab/lab.ts` (that file held
another session's uncommitted work when this was written, so the registration waits for the owner).

Not touched: meal leftovers stamped for a dissolved household (`mealFood.hhId`, food that spoils),
and tools a dissolved household had lent out (`Tool.ownerHh` of tools held elsewhere).

## Evidence

- **Contract tests** `tests/estate_release.test.ts` (6): the last member dies (parcel shared, axe
  owner 0, a neighbour collects, 162 keeps it locked and the neighbour gets nothing; the released
  parcel is offered after being seen, never at 162; inspector row and feed line), the last member
  is taken in (parcel and axe pass to the carer's household, the carer collects, a stranger still
  cannot, 162 locks the carer out), and the switch. Each contrast runs the same staged scene at 162
  and 163; conservation, the tool report and an exact save/load round trip are checked in each.
  Against a `git archive` export of `2c64a632` (the commit before this one) all six fail on
  behaviour (owner stays the dead household, no offer, heir locked out):
  `review_evidence/estate-release-20261107/test-before-at-2c64a632.txt`.
- **Earlier rules unchanged:** the 93, 161 and 162 continuation pins pass, with the estate,
  lifecycle, life-changes, meal-leftover, succession and rules-version files (11 files, 81 tests);
  a wider 50-file subset (inhabitant, saves, goldens, lab, households, knowledge, inspector) passes
  47 of 50 under load and the three load-sensitive lab files pass alone (7 tests).
- **Immutable rules-163 continuation:** `tests/v163_continuation.*` (econ-cc3, 27,120 ticks, then
  120 after a save and load; the world holds released parcels by then), recorded in the commit
  after this one, before any successor.
- **Ordinary worlds** (`review_evidence/estate-release-20261107/orphaned.ts`, four Normal seeds,
  arrivals on, 14 days, each at 162 and at 163; conservation and the tool report hold in all eight):

  | World | Deaths (14 d) | Parcels | Orphaned at 162 | At 163: shared / passed to an heir / orphaned | Tools locked 162 → 163 |
  |---|---:|---:|---:|---|---|
  | econ-cc3 (famine) | 22 of 28 | 20 | 16 | 9 / 11 / 0 (8 releases: 6 last deaths, 2 children taken in) | 15 → 0 (2 axes, hoe, 5 baskets, pick, 5 rods, spear) |
  | forest | 1 | 1 | 1 (3 seeds) | 0 / 1 (to the Sedge household with Silas) / 0 | 0 → 0 |
  | river | 0 | 0 | 0 | 0 / 0 / 0 | 0 → 0 |
  | meadow | 0 | 0 | 0 | 0 / 0 / 0 | 0 → 0 |

  At 162 the seven econ-cc3 survivors held one tool between them while 15 sat in parcels nobody
  could take. At 163 the survivors know 4 to 12 of the released parcels each, but no parcel was
  collected in the two to three days left after the releases at either version (the rightful
  households' own parcels at 162 were not collected either): "Gather up what was left behind" is
  a low-weight option, offered only to a non-child whose hunger and thirst are not pressing and
  who has seen the parcel since, and it competes with everything else. The lock is removed; how
  often a released parcel is then put to use is not established here. Alive at day 14: 7 at 162,
  6 at 163, one seed, not an estimate of anything.

No survival, household or production benefit is claimed. The 12-seed paired lab against a nudge
floor is the owner's run once the lab branch is registered.
