# Civilisation validation: exact remaining workloads

Prepared 2026-10-24. **Not run.** Product rules 26; mechanism contracts and rendered
checks are recorded in CIVILISATION_IMPLEMENTATION.md. These runs complete measurement
questions; a null is valid evidence and is not permission to retune until positive.
No aggregate benefit or natural multigeneration persistence is claimed yet.

Pinned executable source: **b402f3d44bf3919b82982b6c66d37cd8d0e74873**. The later
handoff/documentation commit does not change executable source. Use an isolated detached
checkout so subsequent work cannot change a running experiment. Do not use the retired
original checkout or reset an existing directory. If the target already exists, inspect
its HEAD/status before reusing; `git worktree add` will fail rather than overwrite it.

## Hypotheses declared before execution

| Suite | Hypothesis and workload | Comparison and metrics | Interpretation |
|---|---|---|---|
| A / D12 | Household reserves and shelter fetching improve survival/access to homes; Town/100, 24 seeds, 24 days, immigration off | Control + two nudges versus no-stock and no-shelter; deaths, people, hungerExposure, solidHomes, homeless, homeFoodPerPerson, prep effort | Paired differences versus mean control/nudges. Report adverse effects and nulls. No post-result tuning of reserves or shelter plans. |
| C | Spatial finite geology produces different sustained production mixes; Large/100, 24 seeds, 24 days | Control + two nudges versus same-seed generation with geology disabled; townsWithRepeatedProduction, townProductionDistance, retained exchanges, welfare | Initial quantities differ deliberately; this is a generation comparison, not a post-fork transfer. Production distance alone does not prove geology caused it. Compare arms. |
| D/E/F | Sustained hardship, heard opportunities and remembered support can produce relocation, exchange and durable alignments; Large/100, 24 seeds, 24 days | Control + two nudges versus no-relocation, no-exchange-journeys, no-political-alignment; retained outcomes, repeated exchange pairs, present alignments/factions, welfare | Count mechanisms separately from benefit. A zero retained count is not proof that no earlier event occurred; inspect retained evidence and selected saved scenes before emergence claims. B's one-prior-promise counterfactual already exists. |
| G/H | Explicit instruction and family meal contact leave knowledge in later people; Normal/28, 8 seeds, 480 days (40 years), immigration off | Control + two nudges versus no-household-practices; taught charcoal holders, family supper holders, second transmission, holders born during the window | Actual recorded provenance required. Existing parent/child fixtures are not natural generations. No lifespan or maturation changes. Zero births/transmission is a valid null, not a passing natural-culture demonstration. The ablation isolates supper, not charcoal instruction. |
| Performance | Current structures/history may increase cost with world age | Existing bench, meadow, no immigration: Normal/28 for 60 days, Large/100 for 24, Huge/250 for 12; ms/tick samples, heap, population, state size proxies and ledger/tool checks | These are three actual workloads, not one common population/time comparison. Preserve failures. No 300-person diagnostic unless these leave a specific question unanswered. |

Metrics are pure end-of-window observations. `retained*` counts only retained records
within the fork window. They are lower bounds, not lifetime counters. `*AtEnd` means
living/present then; it does not count a learner who died earlier. Production distance
is mean pairwise total variation of item shares for towns with at least three production
days in the last eight. Fewer than two eligible towns yields zero with an accompanying
eligibility count, not proof of identical production. These limitations must remain in
any interpretation. Long-run causal examples may require additional saved checkpoints;
the lab summary alone cannot supply an invented event history.

## Safe preparation on this Windows machine

24 logical cores were confirmed with `node -p "require('node:os').cpus().length"`.
The repository's expensive-run policy still requires these commands to be handed over;
no long ensemble was started by the implementation session. The dispatcher skill's older
branch whitelist is superseded by the owner's request to use current repository scripts:
all named ablations below exist in `scripts/lab/lab.ts` and the geology comparison was
exercised through the actual runner. The detached-launch workflow is used unchanged.

Run each line separately in PowerShell:

```powershell
cd "C:\Users\RJLoc\.codex\worktrees\home-habitation\living-world"
```

```powershell
git fetch origin
```

```powershell
git worktree add --detach "C:\dev\Claude Experiment\living-world-validation-v26" b402f3d44bf3919b82982b6c66d37cd8d0e74873
```

```powershell
cd "C:\dev\Claude Experiment\living-world-validation-v26"
```

```powershell
npm ci
```

The dependency install is needed for this new checkout only. Do not edit source or pull
another revision into this detached checkout while measurements are running.

## Launch, monitor and resume

The launcher runs A, C, DEF, GH and performance **sequentially**. Each ensemble uses one
worker per seed (up to 24). To begin with A only, replace `all` with `A`; use `C`, `DEF`,
`GH` or `performance` later. The combined report keeps every unrun section pending.

```powershell
Start-Process powershell.exe -ArgumentList '-NoProfile','-NonInteractive','-File','scripts/run_civilisation_validation.ps1','-Only','all' -WorkingDirectory "C:\dev\Claude Experiment\living-world-validation-v26" -RedirectStandardOutput "C:\dev\Claude Experiment\living-world-validation-v26\validation.log" -RedirectStandardError "C:\dev\Claude Experiment\living-world-validation-v26\validation.err.log" -WindowStyle Hidden -PassThru
```

Note the printed process Id. To check it (replace 12345 with that Id):

```powershell
Get-Process -Id 12345
```

Check the process, not JSONL modification times: each seed's output is buffered. If the
process has ended, read the combined report and error log before assuming failure.

```powershell
Get-Content -LiteralPath "C:\dev\Claude Experiment\living-world-validation-v26\civ_validation_v26\report.txt"
```

Paste back **only `civ_validation_v26\report.txt`**, not progress logs. The launcher
records exact source/workload provenance in manifest.json, rejects source/configuration
changes, and validates every seed's completion marker and expected branch set. Resume
by rerunning the same launch command after confirming the old process is gone. Completed
lab seeds are skipped; unfinished seeds restart. Benchmarks are skipped only when their
complete recorded tick count matches. Preserve partial/error files. A new source or
workload requires a fresh OutputName and fresh evidence, never relabelling old results.

## Estimated time, not a promise

Use the policy's measured saturated Large rate of about 30 CPU-seconds per simulated day,
not its idle-core rate. Effective workers are min(seeds, 24), because one seed runs its
branches sequentially. Approximate arithmetic:

- A: 24 seeds × 5 arms × 24 days × 30 / 24 = **60 minutes**.
- C: 24 × 4 × 24 × 30 / 24 = **48 minutes**.
- DEF: 24 × 6 × 24 × 30 / 24 = **72 minutes**.
- GH: 8 × 4 × 480 × 30 / 8 = **16 hours** using the conservative Large rate. Normal
  starts much faster, but long-run population, extinction and history costs are unknown;
  do not extrapolate its first-day rate into a guaranteed finish time.
- Performance: allow roughly **30–90 minutes**, with substantial uncertainty at older
  world ages. This is a planning allowance, not a measured mature-world rate.

For `all`, reserve roughly **20 hours** under that conservative model; actual GH duration
may be much shorter. The launcher is detached so the run can outlive this chat. No time
estimate is an acceptance threshold. Review actual durations before scheduling repeats.

## Evidence already obtained for this tooling

`npm test`: 1159 tests / 134 files; typecheck/build passed. Focused lab/report/resume
contracts passed. Actual 0.02-day Normal/meadow runner with control, nudge and generation
ablation produced all rows and a report, then skipped the completed seed on resume.
Final smoke is `civic_evidence/lab-civ-metric-final-smoke/`. PowerShell launcher parsed
successfully; its long execution is unrun. Do not treat parsing or the tiny runner smoke
as verification of long-run outcomes.

After results arrive: verify provenance/completeness, interpret A-H honestly, fix any
concrete invariant/compatibility failures, inspect natural scenes where claims require
it, and update the register. Only then establish whether the civilisation prerequisite
is satisfied and start queued F1, F3, F2, F4, F5 on current source. After that queue is
verified and delivered, stop/report and recommend continued household/settlement work.
