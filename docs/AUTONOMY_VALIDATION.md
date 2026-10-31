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

Rules-65 retained Normal runs stopped at their per-run budgets after 20.5 / 14.4 / 17.05 days. They establish observed
candidate-retention opportunities, not the 45-day result or a performance regression. For complete current Normal
windows, run the following sequentially against one published revision, retaining source manifests and exact stop
reasons. Allow roughly 3–8 minutes each on an otherwise idle core, including observation overhead; the 20-minute safety
budget produces an explicit partial result if reached. Return each `report.json` and `kept-target.json`. An existing
output is refused; do not overwrite the retained partial evidence.

```powershell
npx vite-node scripts/autonomy_observe.ts -- --out "$runRoot-kept-meadow" --seed meadow --days 45 --budget 1200 --kept
```

```powershell
npx vite-node scripts/autonomy_observe.ts -- --out "$runRoot-kept-river" --seed river --days 45 --budget 1200 --kept
```

```powershell
npx vite-node scripts/autonomy_observe.ts -- --out "$runRoot-kept-forest" --seed forest --days 45 --budget 1200 --kept
```

For a retention-specific aggregate comparison, use the matched ensemble command below with
`--branches nudge:1,nudge:2,rich-no-kept-target` and a distinct `$runRoot-kept-ensemble` output. The same approximately
90-minute estimate and interpretation limits apply. All these longer results are pending.

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


## Pending long ecological occurrence and matched comparison (rules 86 onward)

Persistent condition now has short-window and staged mechanism evidence. The five-day screen is
not the required long recovery/generation or mature Large evidence. Use a freshly published
revision and `$runRoot` as above. The observer additionally accepts days and a wall-time budget;
its defaults remain 5 days / 170 seconds. These 45-day runs allow 20 minutes each and may still
stop explicitly at budget. Estimated cost is several minutes per seed, dependent on surviving
population and observer overhead. Do not divide a costly horizon into small agent-run chunks.

```powershell
npx --no-install tsx scripts/ecology_observe.ts river "$runRoot-ecology-river45" 45 1200
```

```powershell
npx --no-install tsx scripts/ecology_observe.ts forest "$runRoot-ecology-forest45" 45 1200
```

```powershell
npx --no-install tsx scripts/ecology_observe.ts meadow "$runRoot-ecology-meadow45" 45 1200
```

Return each report.json with source manifest, stop reason, condition bands, actual starts/endings,
rest opportunities, failures, retained stories, conservation and saved-twin results. These are
ordinary occurrence measurements, not controls for benefit. Saves remain local. A budget stop is
a partial result, not a pass at 45 days.

For aggregate effects, use the existing fixed-seed Large matched-control/nudge design. The
four-arm 24-seed, 45-day suite has the same approximately 90-minute all-core estimate as above:

```powershell
node scripts/lab.mjs --out "$runRoot-ecology-ensemble" --seeds 24 --fork 0 --days 45 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-ecology
```

```powershell
npx vite-node scripts/lab_report.ts -- "$runRoot-ecology-ensemble"
```

Return report.txt, preserving labour displacement, mortality, failed journeys and null results.
The current mature Large generation/performance commands earlier in this document still apply.
None of these costly ecology/combined-world results has been claimed as run or passed here.

## Rules 87 water budget — long validation remains pending

The five-day Normal windows verify accounting and ordinary draws, not natural depletion or
long drought recovery: all nine bodies remain wet. Use a fresh `$runRoot` after checkout checks
above. At the measured short-run rate, each 45-day Normal run is roughly 4–6 minutes and may
cost more as the world accumulates. These are owner-run commands, not claimed results.

```powershell
npx --no-install tsx scripts/water_observe.ts river "$runRoot-water-river45" 45 1200
```

```powershell
npx --no-install tsx scripts/water_observe.ts forest "$runRoot-water-forest45" 45 1200
```

```powershell
npx --no-install tsx scripts/water_observe.ts meadow "$runRoot-water-meadow45" 45 1200
```

Return each report.json, including horizon/budget stop, actual stock/recharge/loss, low/dry
opportunities and refusals, repeated-observation denominators, interruptions, deaths and final
save size. Do not extend a favourable seed alone or treat all draws as useful deliveries.
For an aggregate claim, the existing control/nudge method and a genuine Large profile apply:

```powershell
node scripts/lab.mjs --out "$runRoot-water-ensemble" --seeds 24 --fork 0 --days 45 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-water-budget
```

```powershell
npx vite-node scripts/lab_report.ts -- "$runRoot-water-ensemble"
```

The prior repository estimate for this scale is about 90 minutes on 24 busy cores; current
cost is unmeasured. Retain displacement and adverse outcomes. The accumulated current-rules
Large performance commands above remain necessary; short initial saves are not a substitute.

## Rules 88 flood follow-up (pending owner-run measurements)

The fixed five-day Normal screen is in `FLOOD_ACCESS.md`: one ordinary forest onset, none in
river/meadow. Longer recurrence/recovery and combined benefit remain pending. Use fresh output
folders after pulling the verified release; repeat existing ensemble instructions with the
`rich-no-flood-access` arm for matched control/nudge/removal analysis. No result is implied.
Three 45-day Normal observation commands are below. Based only on the measured five-day cost,
allow roughly 5–15 minutes per seed; this extrapolation is not a mature-world benchmark. Each
run stops with a non-success status at its explicit 1,200-second limit and preserves its report.
Return each output folder's `report.json`; those scripts require a fresh destination.

```powershell
npx --no-install tsx scripts/flood_observe.ts river "$runRoot-flood-river45" 45 1200
```

```powershell
npx --no-install tsx scripts/flood_observe.ts forest "$runRoot-flood-forest45" 45 1200
```

```powershell
npx --no-install tsx scripts/flood_observe.ts meadow "$runRoot-flood-meadow45" 45 1200
```

## Rules 89 by-product follow-up (pending owner-run measurements)

The fixed five-day Normal screen produces zero timber batches in all three seeds and hence
zero recoverable offcut opportunities. This leaves ordinary activation unproven, rather than
establishing a new supply defect. After the verified release is pushed, use fresh destinations
for these longer ordinary screens. Based on the five-day observed cost, allow 6–15 minutes
per 45-day seed, with a 1,200-second cap; accumulated-world cost is uncertain. Return each
folder's `report.json`. These scripts do not resume and require fresh output roots. Existing
matched ensembles should include `rich-no-offcuts` with control and nudges for benefit claims.

```powershell
npx --no-install vite-node scripts/offcuts_observe.ts -- river "$runRoot-offcuts-river45" 45 1200
```

```powershell
npx --no-install vite-node scripts/offcuts_observe.ts -- forest "$runRoot-offcuts-forest45" 45 1200
```

```powershell
npx --no-install vite-node scripts/offcuts_observe.ts -- meadow "$runRoot-offcuts-meadow45" 45 1200
```

## Rules 90 shared-meal recovery follow-up (pending owner-run measurements)

The short fixed screen shows one actual forest recovery and useful household/personal use,
plus uncollected river food that spoils. It does not establish reliable repeated meetings
or a welfare benefit. After publication, these longer screens retain ordinary refusals,
failures, resource losses, offers, actual collections and later choices. Allow approximately
6–15 minutes per seed, with a 1,200-second cap and uncertainty as the world accumulates.
Each command requires a fresh output directory and does not resume; return its `report.json`.
Use `rich-no-meal-leftovers` with controls and nudges in the existing matched lab for any
aggregate claim; the unpaired short-world comparison is insufficient.

```powershell
npx --no-install vite-node scripts/meal_leftovers_observe.ts -- river "$runRoot-meals-river45" 45 1200
```

```powershell
npx --no-install vite-node scripts/meal_leftovers_observe.ts -- forest "$runRoot-meals-forest45" 45 1200
```

```powershell
npx --no-install vite-node scripts/meal_leftovers_observe.ts -- meadow "$runRoot-meals-meadow45" 45 1200
```

## Rules 91 personal arrangements (pending owner-run measurements)

The fixed short screen has two forest meals and a repeated visitor, a river refusal and
no meadow meals. It has zero cancellation-update or replacement starts. Run longer fixed
screens to measure those opportunities without forcing attendance or rerolling seeds.
Allow about 6–15 minutes per seed, with a 1,200-second cap; each output directory must be
new. Return `report.json`, retaining failures and the source manifest. Use
`rich-no-meeting-knowledge` with the existing controls/nudges for aggregate claims.

```powershell
npx --no-install vite-node scripts/meeting_arrangements_observe.ts -- river "$runRoot-arrangements-river45" 45 1200
```

```powershell
npx --no-install vite-node scripts/meeting_arrangements_observe.ts -- forest "$runRoot-arrangements-forest45" 45 1200
```

```powershell
npx --no-install vite-node scripts/meeting_arrangements_observe.ts -- meadow "$runRoot-arrangements-meadow45" 45 1200
```

## Rules 92 informed household continuity: longer ordinary screen (pending)

After pulling the published rules-92 code, use the fresh `$runRoot` defined above.
These are 45-day **Normal** screens, not a mature Large benchmark. Allow roughly 6–15
minutes for the three commands depending on contention; each has a 1,200-second cap.
The script requires fresh destinations and does not resume. Retain the reports and
source manifests, including deaths, refusals, unknown work and zero successions.
Return the three `report.json` summaries; no claimed benefit follows from counts alone.

```powershell
npx --no-install vite-node scripts/informed_continuity_observe.ts -- river "$runRoot-continuity-river45" 45 1200
```

```powershell
npx --no-install vite-node scripts/informed_continuity_observe.ts -- forest "$runRoot-continuity-forest45" 45 1200
```

```powershell
npx --no-install vite-node scripts/informed_continuity_observe.ts -- meadow "$runRoot-continuity-meadow45" 45 1200
```

## Rules 99 prepared project steps: ordinary cart activation (pending owner-run measurements)

The cloud five-day river screen adopted no project and operated no workshop; the question whether an ordinary world now
finishes a cart needs the 45-day horizon of the rules-64 screens. Three seeds, detached, about seven to nine minutes each
on the 24-core machine at the rules-65 rate (14–20 days per 170 s); run them in parallel:

```
cd "C:\dev\Claude Experiment\living-world"
git pull
npm ci
Start-Process npx -ArgumentList 'vite-node','scripts/ready_step_observe.ts','river','autonomy_evidence/r99-river45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r99-river45.log -WindowStyle Hidden -PassThru
Start-Process npx -ArgumentList 'vite-node','scripts/ready_step_observe.ts','forest','autonomy_evidence/r99-forest45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r99-forest45.log -WindowStyle Hidden -PassThru
Start-Process npx -ArgumentList 'vite-node','scripts/ready_step_observe.ts','meadow','autonomy_evidence/r99-meadow45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r99-meadow45.log -WindowStyle Hidden -PassThru
```

Paste back the single JSON line at the end of each `r99-*45.log` (counts: project plans adopted, sampled operate steps
offered prepared/unprepared and ranked first, project operate starts/endings, cart hauls, carts at end). A `stop` of
`budget` means the horizon was not reached; re-run with a larger last argument. Zero carts remains a recorded result.
A matched comparison against `rich-no-ready-step` through `scripts/lab.mjs` is a separate, later step and is not implied.

## Rules 100 heard household supply: ordinary season deferral (pending owner-run measurements)

Five river days never reach a season window (winter sets in on day 8 of a twelve-day year), so every ordinary reserve plan
in the cloud screen was hardship-cued and nothing could be deferred. The 45-day runs below pass three winters; run them
detached in parallel (about seven to nine minutes each on the 24-core machine) and paste back the final JSON line of each
log. Count `reserve left to teller`, `heard undertakings:stock`, `start:share_work`, `stock plans adopted:season` and the
two-plans-for-one-store samples. A second set pinned at rules 99 (last argument `99`) gives the paired baseline; it is a
single-seed contrast per seed, not an ensemble claim.

```
cd "C:\dev\Claude Experiment\living-world"
git pull
npm ci
Start-Process npx -ArgumentList 'vite-node','scripts/household_supply_observe.ts','river','autonomy_evidence/r100-river45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r100-river45.log -WindowStyle Hidden -PassThru
Start-Process npx -ArgumentList 'vite-node','scripts/household_supply_observe.ts','forest','autonomy_evidence/r100-forest45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r100-forest45.log -WindowStyle Hidden -PassThru
Start-Process npx -ArgumentList 'vite-node','scripts/household_supply_observe.ts','meadow','autonomy_evidence/r100-meadow45','45','1200' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r100-meadow45.log -WindowStyle Hidden -PassThru
Start-Process npx -ArgumentList 'vite-node','scripts/household_supply_observe.ts','river','autonomy_evidence/r100-river45-at99','45','1200','99' -WorkingDirectory "C:\dev\Claude Experiment\living-world" -RedirectStandardOutput r100-river45-at99.log -WindowStyle Hidden -PassThru
```
