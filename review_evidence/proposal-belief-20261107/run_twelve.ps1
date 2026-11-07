# The twelve seeds of the 12-seed Normal lab (aspen, birch, cedar, fern, gen-1..gen-6, meadow, river), each run for 25 days with arrivals on
# at rules 163 and at rules 164, twenty-four processes in parallel (the lab's own default world, but one run per version and a final-state hash
# instead of a paired report: the removal arm needs a branch registered in scripts/lab/lab.ts, another session's uncommitted file).
# From the repo root: powershell -ExecutionPolicy Bypass -File review_evidence/proposal-belief-20261107/run_twelve.ps1
$dir = "review_evidence/proposal-belief-20261107/twelve"
New-Item -ItemType Directory -Force $dir | Out-Null
$procs = @()
$seeds = @('aspen', 'birch', 'cedar', 'fern', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', 'meadow', 'river')
foreach ($seed in $seeds) {
  foreach ($rules in @(163, 164)) {
    $out = "$dir/proposals-$seed-r$rules.json"
    $log = "$dir/proposals-$seed-r$rules.log"
    $err = "$dir/proposals-$seed-r$rules.err"
    $procs += Start-Process -FilePath node -ArgumentList @('node_modules/vite-node/dist/cli.mjs', 'review_evidence/proposal-belief-20261107/proposals.ts', '--', $seed, '25', "$rules", $out) -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError $err
  }
}
$procs | Wait-Process
foreach ($seed in $seeds) { foreach ($rules in @(163, 164)) { Get-Content "$dir/proposals-$seed-r$rules.log" | Select-Object -Last 1 } }
