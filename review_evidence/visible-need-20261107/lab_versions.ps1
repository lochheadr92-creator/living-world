# Two 12-seed Normal 25-day labs from a CLEAN checkout: the previous rules version pinned with --rules, and the current version, each with the control and two
# nudge arms. The working directory handed to Start-Process must be the LONG form of the path: an 8.3 short path ("...\SCRATC~1\clean") crashes libuv's file
# watcher in every seed ("Assertion failed: !_wcsnicmp(filename, dir, dirlen)"), while the same checkout started from its long path runs.
#   powershell -NoProfile -ExecutionPolicy Bypass -File <this> -Tree <clean worktree> -Rel review_evidence/<folder> -Pinned <previous version>
param([Parameter(Mandatory=$true)][string]$Tree,[Parameter(Mandatory=$true)][string]$Rel,[Parameter(Mandatory=$true)][int]$Pinned)
$Tree = (Get-Item $Tree).FullName
Set-Location $Tree
"start $(Get-Date -Format o) head $(git rev-parse --short HEAD)" | Out-File -Encoding utf8 "$Rel/lab_versions.status"
$a = Start-Process node -ArgumentList 'scripts/lab.mjs','--out',"$Rel/lab$Pinned",'--seeds','12','--fork','0','--days','25','--profile','normal','--rules',"$Pinned",'--branches','nudge:1,nudge:2' -WorkingDirectory $Tree -RedirectStandardOutput "$Rel/lab$Pinned.log" -RedirectStandardError "$Rel/lab$Pinned.err.log" -WindowStyle Hidden -PassThru
$b = Start-Process node -ArgumentList 'scripts/lab.mjs','--out',"$Rel/labcurrent",'--seeds','12','--fork','0','--days','25','--profile','normal','--branches','nudge:1,nudge:2' -WorkingDirectory $Tree -RedirectStandardOutput "$Rel/labcurrent.log" -RedirectStandardError "$Rel/labcurrent.err.log" -WindowStyle Hidden -PassThru
$a,$b | Wait-Process
"labs exit $($a.ExitCode) $($b.ExitCode) at $(Get-Date -Format o); done" | Add-Content -Encoding utf8 "$Rel/lab_versions.status"