# A home is what was told, or the searcher's own household — rules 171

Predecessor rules 170 is pinned by `tests/v170_continuation.expected.json`, recorded before this
behaviour existed. Origin: the free-file omniscience leak in `whereIs`, which matched any
believed home whose household stamp equalled the target's current `hhId`. This step is that
match, in its own rules version (decision D2).

## The defect (every version up to 170)

`whereIs` read `q.hhId` off the live person and scanned the searcher's beliefs for a home
stamped with that id. A stranger's household, including one the searcher had never been told,
was enough to answer "at their home". A person gone from the register had no `hhId`, so a
believed site was also dropped.

## The rule

`src/sim/known_home.ts` (`hasKnownHome`: rich, rules 171 or later, switch on). `whereIs` in
`optutil.ts`:

- in sight, and a whereabouts note younger than 900 ticks, are unchanged;
- a believed building site (`siteId`) is still used, including when the person is gone from
  the register;
- "at their home" is a room note whose `homeId` names a believed home, or, when the target is
  the searcher's own child, partner or parent, or the room says `household`, the first believed
  home stamped with the searcher's own household id. The target's live household id is not read;
- otherwise a stale whereabouts note is "last seen long ago", or there is no place.

Rules 170 and earlier, and authored worlds, keep the live household scan. `setKnownHome(false)`
restores it inside a rules-171 rich world. The plan-wide name `rich-no-care-knowledge` is not
used. No saved membership map is added. `knownPlace` and `delivery_place.ts` are unchanged.
Lab evidence compares rules 170 pinned with `lab.mjs --rules 170` against current rules, so
`scripts/lab/lab.ts` is not edited.

## What was checked, and what was not

`tests/known_home.test.ts` (6), staged, not spontaneous. At 170 a believed home stamped with
the target's household is "at their home". At 171 that stranger match is absent, including
after the target's household id changes. A stale room note naming a believed hut stays on that
hut when both household ids change. A child is looked for at the searcher's own home, not at a
belief stamped with the child's household. After the target leaves the register, a believed
site is still returned at 171 and is absent at 170. The switch and an authored world keep the
live match. `npm run typecheck` passed with this rule in the tree.

Immutable pin `tests/v171_continuation.*`: Normal forest, arrivals on, 12,000 ticks then 120
after a save and load, recorded from a clean checkout of `93aeb5e9` (pin commit `611a06fc`).
A searcher looks someone up at a told room that is not the home the target's live household id
would select, first seen at tick 11,951, sampled every 50 ticks. Saved digest
`3037f3d1592be5bc2ba0c295d91b4d095796af298d1e0b01d90b3443d8d16f09`, continued
`5c8a6c93ff5247f69eeb581a1815c45cf1a7324af0c11d4da48d1e04f43d952e`. The pin test passed on
that checkout, 1 of 1 in 17.8s. Birch, meadow, river, aspen and cedar still matched the live
household inside 12,000 ticks, which is why the pin is forest. The reference script refuses
to overwrite.

The paired lab is not run. No benefit or harm is claimed.

## Not touched

The recruit cap is rules 172 (`docs/HEARD_HELPERS.md`). `knownNeeds` for a dependant in sight is rules 173 (`docs/SEEN_DEPENDANT.md`). The leaks that
sit in another session's uncommitted files.
