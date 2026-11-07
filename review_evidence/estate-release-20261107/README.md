# Rules 163: a dissolved household's belongings are released (7 November 2026)

Adversarial review item 5 (brain note `daily/2026-11-07-living-world-adversarial-review`). Contract and limits: `docs/ESTATE_RELEASE.md`.
Repo `living-world-integrate`, `main`, start `2c64a632` (rules 162).

## Re-verification against source

`households.ts dissolveHousehold` clears `hhId` on buildings, sites and plots only; `pile_access.ts:11` admits only `estate.hhId`;
`knowledge.ts:90` copies the stamp into beliefs so `mayTakeKnownPile` hides the parcel from options; in `lifecycle.ts killPerson` the estate
is dropped (:246) before the member is removed (:270), so a last member's parcel is orphaned the same tick; `adoptOrphans` moves the child
out of the household through `addToHousehold`, which dissolves it. The finding holds as written.

## Files

- `orphaned.ts` — read-only probe: `npx vite-node review_evidence/estate-release-20261107/orphaned.ts -- <seed> <days> <rules> <out.json>`.
  Daily: alive, deaths, households, estate parcels, orphaned (stamped for a household that no longer exists), shared, owned by a living
  household, items and tools in orphaned parcels. End: every parcel's history, release events, survivors with hunger/thirst and how many
  released parcels they know (belief owner equals the real owner) or know stale.
- `run_probes.ps1` — the eight runs (econ-cc3, river, meadow, forest × rules 162, 163), 14 days, Normal, arrivals on, in parallel.
- `orphaned-<seed>-r<rules>.json` — the results.
- `test-before-at-2c64a632.txt` — the new contract tests run against a `git archive` export of the previous commit: 6 of 6 fail.
- `test-related-after.txt` — 11 related files incl. the 93/161/162 pins at 163: 81 of 81 pass.
- `test-subset-after.txt` — 50-file subset at 163: 47 files pass under load; the three load-sensitive lab files pass alone (appended).

## Results

| World | Deaths | Parcels | Orphaned at 162 (items) | At 163 shared / heir / orphaned | Tools in orphaned parcels 162 → 163 | Releases at 163 |
|---|---:|---:|---|---|---|---|
| econ-cc3 | 22 of 28 | 20 | 16 (wood 37, seeds 24, stone 7, axe 2, basket 5, rod 5, hoe 1, pick 1, spear 1) | 9 / 11 / 0 | 15 → 0 | 8 (6 last deaths, 2 children taken in: Dax to Reed, Yan to Reed, then Reed's to Briar with Yan) |
| forest | 1 | 1 | 1 (seeds 3) | 0 / 1 / 0 | 0 → 0 | 1 (Alder's to Sedge with Silas) |
| river | 0 | 0 | 0 | 0 / 0 / 0 | 0 → 0 | 0 |
| meadow | 0 | 0 | 0 | 0 / 0 / 0 | 0 → 0 | 0 |

Conservation and the tool report hold in all eight worlds. In econ-cc3 the releases start on day 11 (tick 26,275) and most fall on day
12, when 17 people die; at 162 the seven survivors hold one tool between them. At 163 no released parcel was collected by day 14 (nor were
the four rightful households' parcels at 162): the salvage option needs a fed non-child who has seen the parcel since the release and
weighs 8 to 22 against everything else. Survivors at day 14 (163): Ivy, Abel, Zia, Kai, Zeke, Arlo, knowing 4 to 12 released parcels each.
Alive 7 (162) against 6 (163) is one seed's divergence after the first release changed the id sequence, not a measurement.

Not run here (over three minutes; owner's machine): the full suite and the 12-seed paired lab, which needs the `rich-no-estate-release`
branch registered in `scripts/lab/lab.ts` (another session's uncommitted file at the time).
