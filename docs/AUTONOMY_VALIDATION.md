# Autonomy programme: retained measurements and pending costly validation

The capability register remains `DEPENDENCY_CHAIN_PROGRAMME.md`. This file supplies runnable validation and records
performance-method limits; it does not close any unimplemented capability or substitute for ordinary evidence.

## Performance tool verification at rules 63

`scripts/mature_perf.ts` now names the supplied retained world honestly, refuses an existing output directory, captures
all source files and their hashes, and checks that source remains unchanged during measurement. `--current-large` requires
the actual current rules, the 160 × 160 Large profile and at least 45 accumulated days. It does not upgrade a save or invent
history. An extinct input produces no person-inspector/history samples rather than a crash or an apparent zero cost.
The browser runner uses precisely the snapshots and hashes in `headless.json`, preserves existing output, and uses an
isolated disposable browser profile. Both share the existing engine, renderer and inspector, not alternate implementations.

The tool was exercised on fresh current Normal/Large and a retained genuine day-45 Normal save from rules **62**. All three
conserved resources and preserved full serialized observer state/RNG and saved continuation. The browser had no exceptions
and preserved each paused world. A retained rules-62 Normal input was correctly rejected by `--current-large` before an
output folder was created. Evidence: `autonomy_evidence/perf63-retained/{headless,browser}.json`, with real screenshots.

| Measured world | Tick p95 ms | Person inspector p95 ms | History p95 ms | Save p95 ms | Load p95 ms | Serialized bytes | Browser frame submission p95 ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| Fresh Normal, rules 63 | 1.87 | 1.77 | 0.042 | 8.18 | 21.33 | 816,222 | 2.6 |
| Fresh Large, rules 63 | 5.38 | 2.56 | 0.026 | 37.36 | 89.19 | 3,000,244 | 3.0 |
| Retained Normal, day 45, rules 62 | 3.41 | 5.02 | 0.117 | 38.45 | 106.77 | 4,070,521 | 4.7 |

This is tool/short-workload evidence, **not current mature Large performance**. The machine was doing other development
work, so timings are not a controlled comparison. Headless measurements cover 240 ticks, 60 inspector/history calls and
five save/load repetitions per case. Browser measurements retain 150 of 180 paused frames after warm-up, then 60 forced UI
updates. Frame submission measures CPU work, not GPU completion. Browser heap after GC was about 11.8 / 15.9 / 23.9 MB;
Node heap includes transient process allocations. No state was deleted to improve those numbers.

## Pending current mature Large and matched ensemble

These exceed AGENTS.md's roughly three-minute execution budget and are **pending**, not passed. Run only against the
published source revision being assessed; new behaviour requires a fresh output root. Do not load a conflicting historical
branch's rules-59 save. Keep the profile/rules/source metadata with every returned result.

PowerShell, one command per line, after pulling the published main checkout. The dependency lock is unchanged by this
programme; `npm ci` is needed only if dependencies are absent or changed. The root includes the commit so results from
different revisions are not mixed.

```powershell
cd "C:\dev\Claude Experiment\living-world-integrate"
```

```powershell
git pull --ff-only
```

```powershell
$runRoot = "autonomy_owner_" + (git rev-parse --short HEAD)
```

Generate a genuine Large meadow world with 100 founders across four camps, immigration off, for 45 days. No people,
history, workshops or resources are staged. Expect roughly **12–25 minutes on an otherwise idle core**, plus instrumentation
overhead; the explicit one-hour safety budget produces a labelled partial save if reached. This is generation for an
accumulated-state benchmark, not a general viability or ecology horizon.

```powershell
npx vite-node scripts/autonomy_observe.ts -- --out "$runRoot-large" --profile large --seed meadow --days 45 --budget 3600
```

```powershell
npx vite-node scripts/mature_perf.ts -- "$runRoot-large/final-save.json" "$runRoot-performance" --current-large
```

The strict benchmark will reject a budget-stopped world younger than day 45. Continue its unchanged save for the remaining
days into a new output directory before measuring; never relabel its age or rules. Save the actual source revision with it.
For browser timings, start this development page in a separate terminal, then run the following browser command while it
is serving. The browser tool launches and closes its own isolated Chrome session.

```powershell
npm run dev -- --host 127.0.0.1 --port 5288 --strictPort
```

```powershell
node scripts/browser/mature_perf_check.mjs http://127.0.0.1:5288/ "$runRoot-performance"
```

Return the generation `report.json`, performance `headless.json` and `browser.json`, with their screenshots for readability
review. Raw saves stay local unless specifically needed. These tools finish in tens of seconds once the mature save exists.

For the capacity repair's **aggregate** effect, use the existing matched-control/nudge method on 24 fixed Large seeds.
Control is included automatically; the three named arms give two noise comparisons and the isolated removal. This does
not validate still-absent ecology, general plans or other programme rows. At the repository's all-core estimate of 30 CPU
seconds per simulated day, four arms × 45 days × 24 seeds / 24 cores costs about **90 minutes**, plus overhead.

```powershell
node scripts/lab.mjs --out "$runRoot-care-ensemble" --seeds 24 --fork 0 --days 45 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-care-capacity
```

```powershell
npx vite-node scripts/lab_report.ts -- "$runRoot-care-ensemble"
```

Return only `$runRoot-care-ensemble/report.txt`, not the progress lines. Rerunning the same command against the **same
source revision** resumes unfinished seeds. Compare the intervention with the control and both nudges, preserving deaths,
zeros, labour displacement and uncertain effects. Existing lab output checks rules compatibility, not every source hash;
the revision-specific output root is therefore required. A later source revision must use a fresh directory.
