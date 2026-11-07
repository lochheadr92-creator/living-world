# Rules 166: a stranger's need is what the signs show (7 November 2026)

Adversarial review item 6, "exact needs used beyond the visible flag (`optOffer`, `knownNeeds`)" (brain note `daily/2026-11-07-living-world-adversarial-review`).
Contract and limits: `docs/VISIBLE_NEED.md`. Repo `living-world-integrate`, `main`, start `afb50aef` (rules 165). Only the `optOffer` half is changed.

## Re-verification against source

`options_social.ts optOffer` read `q.needs.hunger` and `q.needs.thirst` (the other person's exact figures) to choose the food (`pickFood`), the amount (three
below hunger 25, else two) and the urgency (`(50 - figure) / 50`). `perception.ts describeSeenPerson` carries only `hungry` (under 42) and `thirsty` (under
40). `remembered_need.ts knownNeeds` returns a dependant's live needs when they are in sight; that was rules 106's own decision and was left alone. The finding
holds as written.

## Files

- `test-before-at-afb50aef.txt` — `tests/visible_need.test.ts` against a `git archive` export of the previous commit, the two describe blocks that need the
  new module removed: 3 of 4 fail on behaviour; the fourth (someone who does not look hungry is not offered food) is a guard that holds at both versions.
- `test-related-after.txt` — 18 files, 111 tests (pins 93/161 to 165, goldens, rules version, social, perception, the new tests): all pass.
- `first_offer.ts` — read-only: first tick at which a spontaneous offer opens, and how many open in 12 days, for a seed at a rules version.
- `twelve/` — `scripts/ab_run.ps1`, twelve seeds, Normal, 25 days, rules 165 against 166, from a clean checkout of `260a961a`:
  `ab-compare.txt`, `ab-summary.txt`, the 24 JSON outcomes. The saved state differs in all twelve (any new sighting key does that); the outcomes move in both
  directions.
- `lab_versions.ps1`, `lab_versions.status`, `lab165/provenance.json`, `labcurrent/provenance.json`, `versions-report.txt` — the paired lab: twelve seeds,
  Normal, arrivals on, 25 days, control plus `nudge:1` and `nudge:2`, rules 165 pinned with `--rules 165` against rules 166, from a clean checkout of
  `260a961a`, compared by `scripts/lab_versions.ts` (the twelve raw `lab_*.jsonl` files per run stay untracked, as in the other lab folders). The runner
  must hand `Start-Process` the LONG form of the working directory: an 8.3 short path crashes every seed on a libuv file-watcher assertion (the first two
  launches failed that way and wrote nothing).
- `suite_run.ps1`, `suite_run.status`, `suite-run.txt` — the full suite for the series 164 to 166 from a clean checkout of `776f34a5`.

## Results

| Probe | Result |
|---|---|
| Offers in the first 12 days, twelve seeds | 2 to 13 each; the first between ticks 959 and 10,457 |
| Twelve seeds, 25 days, 165 against 166 | saved state differs in 12 of 12; outcomes shift both ways seed by seed |
| Paired lab, 12 seeds x 3 arms per version | nothing moved by more than a single draw moves it; deaths +0.9 [-0.6, +2.5] against a floor of 4.4, people -0.8 [-1.8, +0.4], mean hunger +1.5, mean mood +2.1 |
| Leans inside the noise floor | homeless +0.4 [+0.1, +0.8], first yard day +2.5 [+0.3, +5.0], mean condition -2.2 [-4.3, -0.1]; none called larger than chance |

No benefit is claimed, and neither is harm: twelve seeds cannot exclude a small effect either way.

## Immutable pin

`tests/v166_continuation.*`, recorded in `776f34a5` from a clean checkout of `260a961a` before any successor: the Normal birch world, 6,000 ticks (several offers
from tick 959 and the new signs seen), then 120 more after a save and load. The integrate checkout gives the same digests.
