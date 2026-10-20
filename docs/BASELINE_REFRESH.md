# Recording an accepted-generation baseline

Checked 2026-10-19 against main `a5530cfd36ab6bdba9ab62bfa7fb212ee5c79e24` (rules version 3).
No run in this document has been launched or baseline recorded by this integration task.

`gates.ts` intentionally refuses cross-version comparisons. A version-1 baseline cannot
accept preparation version 2, habitation version 3, or this version-5 candidate. Recording
the candidate and checking it against itself is not acceptance. The current development
policy calls for compatibility, contracts, bounded ablation and browser evidence for the
first change at a new generation, followed by a baseline after acceptance/merge.

To record the already merged main snapshot independently of either dirty working tree,
use a fresh detached worktree. These commands record version 3 specifically; if a later
main is to be baselined, first review and pin its commit and rules version, then choose new
output and baseline names. Do not merely reuse these names on newer source.

```powershell
git -C "C:\dev\Claude Experiment\living-world" worktree add --detach "C:\dev\Claude Experiment\living-world-baseline-v3-a5530cf" a5530cfd36ab6bdba9ab62bfa7fb212ee5c79e24
```

```powershell
cd "C:\dev\Claude Experiment\living-world-baseline-v3-a5530cf"
```

```powershell
npm ci
```

```powershell
git rev-parse HEAD
```

```powershell
git status --short
```

Confirm the pinned HEAD above and no tracked changes before starting. On the 24-core
machine, 24 Large seeds × 12 days × about 30 CPU-seconds/day ÷ 24 cores is roughly six
minutes, plus startup and machine contention. This is a baseline record, not an experiment
showing benefit. The run is detached so it survives closing the chat.

```powershell
Start-Process node -ArgumentList 'scripts/lab.mjs','--out','gate_v3_a5530cf_out','--seeds','24','--profile','large','--fork','0','--days','12','--dynamics','rich','--branches','none' -WorkingDirectory "C:\dev\Claude Experiment\living-world-baseline-v3-a5530cf" -RedirectStandardOutput "C:\dev\Claude Experiment\living-world-baseline-v3-a5530cf\baseline-progress.log" -RedirectStandardError "C:\dev\Claude Experiment\living-world-baseline-v3-a5530cf\baseline-errors.log" -WindowStyle Hidden -PassThru
```

After the process exits successfully and all 24 controls are complete:

```powershell
npx --no-install vite-node scripts/gates.ts -- gate_v3_a5530cf_out --record --file docs/gates-rich-v3-a5530cf.json
```

Retain the baseline with its source SHA, command and report in a subsequent reviewed
documentation commit. Do not use `--force` to replace old baselines. Re-running the same
lab command with unchanged source/settings resumes unfinished seeds; it must not overlap
a still-running process. Paste back only `gate_v3_a5530cf_out\report.txt` and the short
baseline-recording output, not progress lines. This version-3 file must not be used to
claim acceptance of the version-5 integration.
