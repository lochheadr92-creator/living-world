# A shared building remembers everyone who built it: rules 186

Predecessor rules 185 is pinned by `tests/v185_continuation.expected.json`. Origin: the end-to-end trace of 10 November 2026 (`docs/END_TO_END_TRACE.md`, link 36), not a row
of the gap map. Stream: gap (`docs/RULES_RANGES.md`).

## The defect (every version up to 185)

`completeSite` filled `Building.builtBy` from the site's contribution shares. The shares are keyed by household id. The list keeps only ids that are people. Nothing ever
matched, so the list was the person who struck the last blow. In ordinary aspen a storehouse built by Mona (330 work), Dax (223) and Petra (85) said "Built by: Mona".

## The rule (rules 186, rich worlds)

For a new building finished as a township's shared project, `noteSharedBuilders` (`src/sim/shared_builders.ts`) sets `builtBy` to every participant who gave work or
materials, in the order they joined, then the finisher if absent, and sets `builtAll`. It runs last in `completeSite`, after the completion aftermath, so who is pleased at
the finish, and in what order, is as before. The inspector row reads "Built by" when `builtAll` is set and "Finished by" otherwise. That wording is display only and applies
at every rules version.

Rules 185 and earlier, authored worlds and `setSharedBuilders(false)` keep the finisher alone.

## Limits

- Buildings with no project behind them (homes, a quarry, a timber yard, a kiln) still record the finisher only. Site work is credited to a household where it is done
  (`act_build.ts`, a held file), so no per-person record exists to read. "Finished by" says what the record holds.
- A participant who has died and left the register by the finish is not listed.
- `history.ts` still says "recorded builders" for a home. Not changed.

## Evidence

- Contract tests `tests/shared_builders.test.ts` (8 pass). A run with the rule disabled was not made; the 185 and switch-off tests assert the old list.
- `npm run typecheck` passed.
- Immutable pin `tests/v186_continuation.*` (Normal cedar, arrivals on, 13,200 ticks then 120 after a save and load; the storehouse is finished by two people at tick 12,908),
  recorded from a clean checkout of `d1a14434`.
- Twin: 12 seeds, Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts --strip-builders` at 185 and 186 from a clean checkout of `af15790c`, 25 processes at once: identical in 12 of 12, conservation and the tool registry hold in all 24 runs. Cedar at 186 without the strip hashes to `8657169f075267e4` against `ac4c5bc7624ec492` with it. `review_evidence/trace-fixes-20261110/r185-r186/`.
- Full suite: one run for rules 186 to 188, clean checkout of `6254dc9b`, default worker pool, 490 s: 567 files, 3,194 tests, 73 failed. The 65 baseline failures are all present by name and none is missing. The other eight tests and one file hook are timeouts under load in six files (`lab_defaults` 3, `lab_report` 2, `lab_provenance` 1, observer purity 1, tool-report saves 1, the `zz_review_h_retention` hook); those six files pass alone at the same commit, 14 of 14 tests in 164 s. No regression. `review_evidence/trace-fixes-20261110/suite-summary.txt`.

No benefit or harm is claimed.
