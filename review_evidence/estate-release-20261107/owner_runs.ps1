# The two long runs for rules 163, one after the other, from a CLEAN checkout of the commit (the integrate working tree holds another
# session's uncommitted simulation edits, which a lab or suite run there would measure as well).
#   powershell -NoProfile -ExecutionPolicy Bypass -File review_evidence/estate-release-20261107/owner_runs.ps1 -Tree <clean worktree> -Out <absolute evidence dir>
# Launch it detached with Start-Process so it outlives the session; it writes suite.log, lab163/ (report.txt) and lab163-report.log into -Out.
param([Parameter(Mandatory=$true)][string]$Tree, [Parameter(Mandatory=$true)][string]$Out)
Set-Location $Tree
"start $(Get-Date -Format o) tree $Tree head $(git rev-parse --short HEAD)" | Out-File -Encoding utf8 "$Out\owner_runs.status"
cmd /c "node node_modules\vitest\vitest.mjs run > ""$Out\suite.log"" 2>&1"
"suite exit $LASTEXITCODE at $(Get-Date -Format o)" | Add-Content -Encoding utf8 "$Out\owner_runs.status"
cmd /c "node scripts\lab.mjs --out ""$Out\lab163"" --seeds 12 --fork 0 --days 25 --profile normal --branches nudge:1,nudge:2,rich-no-estate-release > ""$Out\lab163.log"" 2>&1"
"lab exit $LASTEXITCODE at $(Get-Date -Format o)" | Add-Content -Encoding utf8 "$Out\owner_runs.status"
cmd /c "node node_modules\vite-node\dist\cli.mjs scripts\lab_report.ts -- ""$Out\lab163"" > ""$Out\lab163-report.log"" 2>&1"
"report exit $LASTEXITCODE at $(Get-Date -Format o); done" | Add-Content -Encoding utf8 "$Out\owner_runs.status"
