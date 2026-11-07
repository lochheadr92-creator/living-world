# The full suite for rules 164 from a CLEAN checkout of the commit (the integrate working tree holds another session's uncommitted simulation edits).
#   powershell -NoProfile -ExecutionPolicy Bypass -File suite_run.ps1 -Tree <clean worktree> -Out <absolute evidence dir>
param([Parameter(Mandatory=$true)][string]$Tree, [Parameter(Mandatory=$true)][string]$Out)
Set-Location $Tree
"start $(Get-Date -Format o) tree $Tree head $(git rev-parse --short HEAD)" | Out-File -Encoding utf8 "$Out\suite_run.status"
cmd /c "node node_modules\vitest\vitest.mjs run > ""$Out\suite.log"" 2>&1"
"suite exit $LASTEXITCODE at $(Get-Date -Format o); done" | Add-Content -Encoding utf8 "$Out\suite_run.status"