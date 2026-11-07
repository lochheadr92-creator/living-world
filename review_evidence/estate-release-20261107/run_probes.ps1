# Eight ordinary 14-day Normal worlds (arrivals on): four seeds, each at rules 162 and at rules 163, run in parallel.
# From the repo root: powershell -ExecutionPolicy Bypass -File review_evidence/estate-release-20261107/run_probes.ps1
$dir = "review_evidence/estate-release-20261107"
$procs = @()
foreach ($seed in @('econ-cc3', 'river', 'meadow', 'forest')) {
  foreach ($rules in @(162, 163)) {
    $out = "$dir/orphaned-$seed-r$rules.json"
    $log = "$dir/orphaned-$seed-r$rules.log"
    $err = "$dir/orphaned-$seed-r$rules.err"
    $procs += Start-Process -FilePath node -ArgumentList @('node_modules/vite-node/dist/cli.mjs', "$dir/orphaned.ts", '--', $seed, '14', "$rules", $out) -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError $err
  }
}
$procs | Wait-Process
foreach ($seed in @('econ-cc3', 'river', 'meadow', 'forest')) { foreach ($rules in @(162, 163)) { Get-Content "$dir/orphaned-$seed-r$rules.log" | Select-Object -First 1 } }
