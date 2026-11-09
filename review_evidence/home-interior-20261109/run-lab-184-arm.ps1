# One arm only (the current version, not pinned), for a subset of seeds, for resuming a lab whose other arm is complete. Two instances run side by side (owner answer 1).
param([Parameter(Mandatory)][string]$Out,[Parameter(Mandatory)][string]$Head,[Parameter(Mandatory)][string]$Dir,[Parameter(Mandatory)][string]$Seeds,[string]$Wt='C:\dev\Claude Experiment\living-world-v183-pin',[int]$Days=25)
$ErrorActionPreference='Stop'
Set-Location $Wt
if ((git rev-parse --short=8 HEAD) -ne $Head -or (git status --porcelain)) { throw "worktree is not the clean pin at $Head" }
$status="$Out/status_$($Seeds.Split(',')[0]).txt"; "started $(Get-Date -Format s) head $Head seeds $Seeds (current version, unpinned)"|Set-Content $status
foreach($seed in $Seeds.Split(',')){
  $jsonl="$Out/$Dir/lab_$seed.jsonl"
  $argv=@('node_modules/vite-node/dist/cli.mjs','scripts/lab_seed.ts','--','--seed',$seed,'--profile','normal','--fork','0','--days',"$Days",'--branches','nudge:1,nudge:2','--dynamics','rich','--arrivals','on')
  $p=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $argv -NoNewWindow -PassThru -RedirectStandardOutput $jsonl -RedirectStandardError "$Out/$Dir/lab_$seed.err"
  $p|Wait-Process
  "$(Get-Date -Format s) done $seed"|Add-Content $status
}
"finished $(Get-Date -Format s)"|Add-Content $status
