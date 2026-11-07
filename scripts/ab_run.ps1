# Runs scripts/ab_probe.ts for the twelve lab seeds at two rules versions, twenty-four processes in parallel, from the tree it is started in
# (start it in a CLEAN checkout of the commit, not in a working tree that carries uncommitted simulation edits).
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ab_run.ps1 -Before 164 -After 165 -Out review_evidence/<folder>/twelve [-Days 25] [-Profile normal]
# Then: node node_modules/vite-node/dist/cli.mjs scripts/ab_compare.ts -- <Out> <Before> <After>
param([Parameter(Mandatory=$true)][int]$Before, [Parameter(Mandatory=$true)][int]$After, [Parameter(Mandatory=$true)][string]$Out, [int]$Days = 25, [string]$Profile = 'normal')
New-Item -ItemType Directory -Force $Out | Out-Null
$seeds = @('aspen', 'birch', 'cedar', 'fern', 'gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6', 'meadow', 'river')
$procs = @()
foreach ($seed in $seeds) {
  foreach ($rules in @($Before, $After)) {
    $json = "$Out/ab-$seed-r$rules.json"
    $log = "$Out/ab-$seed-r$rules.log"
    $err = "$Out/ab-$seed-r$rules.err"
    $procs += Start-Process -FilePath node -ArgumentList @('node_modules/vite-node/dist/cli.mjs', 'scripts/ab_probe.ts', '--', $seed, "$Days", "$rules", $json, '--profile', $Profile) -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError $err
  }
}
$procs | Wait-Process
foreach ($seed in $seeds) { foreach ($rules in @($Before, $After)) { Get-Content "$Out/ab-$seed-r$rules.log" | Select-Object -Last 1 } }
