# Rules 176 against 177: one ordinary Normal world per seed at each version, two processes at a time (owner answer 1).
# Run from the clean pinned worktree. Output: <Out>/ab-<seed>-r<rules>.json/.log/.err and a status file.
param([int]$Before = 176, [int]$After = 177, [string]$Out, [int]$Days = 25)
$ErrorActionPreference = 'Stop'
Set-Location 'C:\dev\Claude Experiment\living-world-v177-pin'
if ((git rev-parse --short=8 HEAD) -ne 'fcfedf91' -or (git status --porcelain)) { throw 'worktree is not the clean pin at fcfedf91' }
New-Item -ItemType Directory -Force $Out | Out-Null
$seeds = 'aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'
$status = "$Out/status.txt"
"started $(Get-Date -Format s) head fcfedf91 days $Days before $Before after $After" | Set-Content $status
foreach ($seed in $seeds) {
  $procs = @()
  foreach ($rules in @($Before, $After)) {
    $json = "$Out/ab-$seed-r$rules.json"
    if (Test-Path $json) { continue }   # resume: finished runs are kept
    $procs += Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @('node_modules/vite-node/dist/cli.mjs', 'scripts/ab_probe.ts', '--', $seed, "$Days", "$rules", $json) -NoNewWindow -PassThru -RedirectStandardOutput "$Out/ab-$seed-r$rules.log" -RedirectStandardError "$Out/ab-$seed-r$rules.err"
  }
  if ($procs.Count -gt 0) { $procs | Wait-Process }
  "$(Get-Date -Format s) done $seed" | Add-Content $status
}
"finished $(Get-Date -Format s)" | Add-Content $status
