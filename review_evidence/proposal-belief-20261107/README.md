# Rules 164: a proposal is made from the proposer's own feelings (7 November 2026)

Adversarial review item 6 (omniscience leaks), first leak (brain note `daily/2026-11-07-living-world-adversarial-review`).
Contract and limits: `docs/PROPOSAL_BELIEF.md`. Repo `living-world-integrate`, `main`, start `25ee4147` (rules 163).

## Re-verification against source

`options_social.ts optPropose` read `q.relations[p.id]` (the other person's own relation toward the proposer) and required it to exist with
affinity at least 26 (couple) or 32 (roommates), and read `world.households.find(h => h.id === q.hhId)?.homeId` and the type of that building
for the roommate room, whether or not the proposer had ever seen it. Nothing in the proposer's sight or memory carries either figure. The
review's staged test (`tests/zz_review_d_propose_truth.test.ts`, rules 115) reproduces it by changing only Ben's private affinity. The finding
holds as written. `spark(p, q)` is a seeded symmetric pair attraction and was left alone.

## Files

- `proposals.ts` — read-only probe: `npx vite-node review_evidence/proposal-belief-20261107/proposals.ts -- <seed> <days> <rules> <out.json>`.
  Steps a Normal world with arrivals on; counts proposal conversations (by kind), refusals and "no room" answers from the proposer's cooldown
  writes, couples and households daily; every 120 ticks reads every adult's options through the observer entry point and records each
  proposal option offered (pair, kind, and whether the other's private regard would have passed the rules-163 gate); the final state hash with
  the rules number masked.
- `run_probes.ps1` — four seeds (econ-cc3, river, meadow, forest) at 163 and 164; `proposals-<seed>-r<rules>.json`, `four-worlds-summary.txt`.
- `run_twelve.ps1` — the twelve lab seeds at 163 and 164 (24 processes in parallel); `twelve/proposals-<seed>-r<rules>.json`,
  `twelve-seeds-summary.txt`. This is the substitute for the paired lab (see below).
- `test-before-at-25ee4147.txt` — the new contract tests run against a `git archive` export of the previous commit (the two tests that need the
  new module removed): 4 of 6 fail on behaviour, 2 are guards that hold at both versions.
- `test-related-after.txt` — 18 files, 114 tests (pins 93/161/162/163, goldens, rules version, social, lifechanges, temperament, cooperation,
  inhabit proposals, estate release, shared stone, the new tests): all pass.
- `suite_run.ps1`, `suite_run.status`, `suite-run.txt` (a copy of `suite.log`, which the `*.log` ignore rule keeps out of git) — the full
  suite from a clean checkout of `0d963f23`: 516 of 520 files, 2,982 of 2,989 tests (3 skipped) in one parallel run.
- `rerun_failed_alone.ps1`, `rerun_failed_alone.status`, `suite-failed-rerun-alone.txt` — the four files that failed (load timeouts) re-run
  one at a time: 10 of 10 pass.

## Results

| Probe | Rules 163 and 164 compared | Result |
|---|---|---|
| Four Normal seeds, 25 days | econ-cc3, forest, meadow, river | one pair ever offered the option (forest); no proposal made; identical worlds |
| Twelve lab seeds, 25 days | final-state hash, rules number masked | identical in 12 of 12 |
| Options offered (twelve seeds) | birch 4 pairs, cedar 1, fern 2, gen-3 4, gen-4 3; the other seven seeds none | every pair offered at 164 was also offered at 163 |
| Proposals made (twelve seeds) | birch 1, fern 1, gen-3 2, gen-4 1; all to share a life | 1 refused (gen-3, at both versions) |

Conservation and the tool registry hold in all 32 runs. In every offered pair the other person's private affinity already met the old
threshold, so dropping the read removed no offer and added none in these worlds. Why offers are rare is not investigated.

## Not run, and why

The paired lab (control, two nudges, `rich-no-proposal-belief`) needs the branch registered in `scripts/lab/lab.ts`, another session's
uncommitted file; under the standing instruction the registration awaits the owner's decision. The twelve-seed twin is the substitute and shows
no divergence, so a paired comparison on these seeds would have nothing to measure. No benefit is claimed.
