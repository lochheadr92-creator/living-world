# Reruns the suite files that failed in the full parallel run, one file at a time on an idle machine, from the same clean checkout.
#   powershell -NoProfile -ExecutionPolicy Bypass -File rerun_failed_alone.ps1 -Tree <clean worktree> -Out <absolute evidence dir>
param([Parameter(Mandatory=$true)][string]$Tree, [Parameter(Mandatory=$true)][string]$Out)
Set-Location $Tree
"start $(Get-Date -Format o) head $(git rev-parse --short HEAD)" | Out-File -Encoding utf8 "$Out\rerun_failed_alone.status"
cmd /c "node node_modules\vitest\vitest.mjs run --no-file-parallelism tests/v165_continuation.test.ts tests/zz_review_g_observer_purity.test.ts tests/zz_review_h_retention.test.ts tests/zz_review_main_toolreport_saves.test.ts > ""$Out\suite-failed-rerun-alone.log"" 2>&1"
"vitest exit $LASTEXITCODE at $(Get-Date -Format o); done" | Add-Content -Encoding utf8 "$Out\rerun_failed_alone.status"