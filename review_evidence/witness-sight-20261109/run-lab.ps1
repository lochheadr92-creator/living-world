# Rules 179 (pinned with --rules 179) against rules 180 (current): the lab's control plus nudge:1 and nudge:2, 12 seeds, Normal, fork 0, 25 days,
# arrivals on, rich. Two node processes at a time (owner answer 1), from the clean pinned worktree. No scheduled task, no hidden window.
# Output: <Out>/lab178/lab_<seed>.jsonl and <Out>/lab179/lab_<seed>.jsonl, then <Out>/report.txt from scripts/lab_versions.ts.
param([Parameter(Mandatory)][string]$Out, [Parameter(Mandatory)][string]$Head, [Parameter(Mandatory)][int]$Earlier, [Parameter(Mandatory)][int]$Later, [string]$Wt = 'C:\dev\Claude Experiment\living-world-v183-pin', [int]$Days = 25)
$ErrorActionPreference = 'Stop'
$wt = $Wt
Set-Location $wt
if ((git rev-parse --short=8 HEAD) -ne $Head -or (git status --porcelain)) { throw "worktree is not the clean pin at $Head" }
$dirA = "$Out/lab$Earlier"; $dirB = "$Out/lab$Later"
New-Item -ItemType Directory -Force $dirA, $dirB | Out-Null
$seeds = 'aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'
$status = "$Out/status.txt"
"started $(Get-Date -Format s) head $Head days $Days earlier-pinned $Earlier later-pinned $Later" | Set-Content $status
function Test-Done($f) { (Test-Path $f) -and ((Get-Content $f -Tail 1 -ErrorAction SilentlyContinue) -match '"done":true') }
foreach ($seed in $seeds) {
  $procs = @()
  foreach ($arm in @(@{ dir = $dirA; extra = @('--rules', "$Earlier") }, @{ dir = $dirB; extra = @('--rules', "$Later") })) {
    $jsonl = "$($arm.dir)/lab_$seed.jsonl"
    if (Test-Done $jsonl) { continue }
    $argv = @('node_modules/vite-node/dist/cli.mjs', 'scripts/lab_seed.ts', '--', '--seed', $seed, '--profile', 'normal', '--fork', '0', '--days', "$Days", '--branches', 'nudge:1,nudge:2', '--dynamics', 'rich', '--arrivals', 'on') + $arm.extra
    $procs += Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $argv -NoNewWindow -PassThru -RedirectStandardOutput $jsonl -RedirectStandardError "$($arm.dir)/lab_$seed.err"
  }
  if ($procs.Count -gt 0) { $procs | Wait-Process }
  "$(Get-Date -Format s) done $seed" | Add-Content $status
}
"finished arms $(Get-Date -Format s)" | Add-Content $status
$null = & 'C:\Program Files\nodejs\node.exe' node_modules/vite-node/dist/cli.mjs scripts/lab_versions.ts -- $dirA $dirB "$Out/report.txt" *> "$Out/versions_stdout.txt"
"versions exit $LASTEXITCODE $(Get-Date -Format s)" | Add-Content $status


