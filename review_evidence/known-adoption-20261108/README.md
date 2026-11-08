# Rules 167: a carerless child is taken in only by an adult who knows of them (8 November 2026)

Contract: `docs/KNOWN_ADOPTION.md`.
Repo `living-world-integrate`, `main`. Recorded from a clean detached checkout of `4cdc01e9` (`C:\dev\Claude Experiment\living-world-v167-pin`). Both arms' provenance: `head` `4cdc01e9933eb40b799a789df455fb8a696c46ae`, `dirty` false, `modified` empty.

## Files

- `suite-run.txt` — the parallel `npm test` log. `*.log` is gitignored, so this is the copy.
- `suite_run.status` — the wrapper status. The recorded exit codes are blank. The script treated a blank code as failure, so the first wrapper wrote `labs not started; done` after a finished suite. The labs below are the later launch. A blank code is not a crash: the suite summary and both lab reports exist.
- `isolated-rerun.txt` — the four load or spawn failures, re-run alone.
- `versions-report.txt` — `scripts/lab_versions.ts` on the two arms.
- `lab166/` and `lab167/` — `report.txt` and `provenance.json` only. The twelve `lab_*.jsonl` seed files stay untracked, as in `estate-release-20261107/lab163`.

## Suite

20:07:23–20:15:08, 454.65s. 521 of 526 files passed. 3,000 of 3,010 tests passed, 3 skipped, 7 failed.

`tests/known_adoption.test.ts` (7) and `tests/v167_continuation.test.ts` passed in that run.

Five files failed:

- `tests/lab_defaults.test.ts` — `spawnSync` status was null under load (10s timeout).
- `tests/zz_review_h_retention.test.ts` — `beforeAll` hook timed out.
- `tests/zz_review_main_toolreport_saves.test.ts` — test timed out.
- `tests/zz_review_g_observer_purity.test.ts` — the river case timed out.
- `tests/zz_review_e_famine_trace.test.ts` — ENOENT on `autonomy_evidence/helper-receipt107-first-invalid/final.json`. `.gitignore` ignores `autonomy_evidence/**/final.json`. Not rerun.

Isolated rerun of the first four, started 20:16:28, 176.03s, exit 0: 4 files, 10 tests passed.

## Lab

Launched 20:21:34. Both arms finished 20:39:05. Compare finished 20:39:11. An earlier 20:19 launch wrote under `C:\dev\Claude` because `Start-Process -ArgumentList` split the out path on a space. Those processes were killed and that directory was removed. It is not this result.

12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal profile, forked at day 0, 25 days, arrivals on. Arms: control, `nudge:1`, `nudge:2`. Rules 166 pinned with `--rules 166`. Rules 167 is the checkout's current version. Both arms finished 12 of 12 seeds.

`versions-report.txt` ends: nothing moved by more than a single draw moves it.

| metric | 166 | 167 | diff | 95% interval | up/down | verdict |
|---|---:|---:|---:|---|---|---|
| people | 22.2 | 22.3 | +0.1 | [-0.3, +0.5] | 1/2 | not distinguishable from chance (floor ±4.3) |
| deaths | 9.1 | 9.0 | -0.1 | [-0.4, +0.2] | 1/1 | not distinguishable from chance (floor ±4.3) |
| meanMood | -19.6 | -18.7 | +0.9 | [0, +2.2] | 4/0 | systematic, within the noise floor (±10.0) |
| meanCondition | 50.6 | 51.3 | +0.6 | [0, +1.3] | 4/0 | systematic, within the noise floor (±10.0) |

Every other listed metric is not distinguishable from chance, or is an exact zero. `scripts/lab_versions.ts` says an effect smaller than the noise floor is never called larger than chance, so "not distinguishable from chance" over 12 seeds is weak evidence of no effect. The one-seed forest alive counts (15 at 166, 7 at 167) are not this result. No benefit or harm is claimed.
