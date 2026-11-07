# Eight ordinary 25-day Normal worlds (arrivals on): four seeds, each at rules 163 and at rules 164, run in parallel.
# From the repo root: powershell -ExecutionPolicy Bypass -File review_evidence/proposal-belief-20261107/run_probes.ps1
$dir = "review_evidence/proposal-belief-20261107"
$procs = @()
foreach ($seed in @('econ-cc3', 'river', 'meadow', 'forest')) {
  foreach ($rules in @(163, 164)) {
    $out = "$dir/proposals-$seed-r$rules.json"
    $log = "$dir/proposals-$seed-r$rules.log"
    $err = "$dir/proposals-$seed-r$rules.err"
    $procs += Start-Process -FilePath node -ArgumentList @('node_modules/vite-node/dist/cli.mjs', "$dir/proposals.ts", '--', $seed, '25', "$rules", $out) -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError $err
  }
}
$procs | Wait-Process
foreach ($seed in @('econ-cc3', 'river', 'meadow', 'forest')) { foreach ($rules in @(163, 164)) { Get-Content "$dir/proposals-$seed-r$rules.log" | Select-Object -Last 1 } }
