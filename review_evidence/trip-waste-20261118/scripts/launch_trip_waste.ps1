# Starts the trip waste measurement runs (SCRATCH ONLY): three worlds, arm A (gate off) with the read-only WithdrawCheck observer attached
# (--withdraw-check), 30 days from the day 48 saves, one wave, detached; records every PID and exact command line. powershell -File launch_trip_waste.ps1
# Refuses an existing out folder. Three runs start at once; there is no supervisor. The controls (A, N1, N2) are the runs already in out\free.
param([int]$Day = 48, [int]$Days = 30)
$root = 'C:\dev\_claude_scratch\regime-20261117'
$tree = "$root\wt"; $out = "$root\out\trip-waste"
if (Test-Path $out) { throw "out folder already exists: $out" }
$reading = "$root\TRIP_WASTE_READING.md"
if (-not (Test-Path $reading)) { throw "the reading must be written before the runs: $reading" }
$worlds = 'aspen', 'river', 'gen-4'
foreach ($world in $worlds) { $save = "$root\saves\$world-day$Day.save.json"; if (-not (Test-Path $save)) { throw "missing save $save" } }
New-Item -ItemType Directory -Force $out | Out-Null
New-Item -ItemType Directory -Force "$root\logs" | Out-Null
Copy-Item $reading "$out\READING.md"
$hash = (Get-FileHash -Algorithm SHA256 $reading).Hash.ToLower()
$cmds = @("reading $reading sha256 $hash ($(Get-Date -Format s))"); $started = @()
foreach ($world in $worlds) {
  $save = "$root\saves\$world-day$Day.save.json"
  $name = "$world-A"
  $argList = @('node_modules/vite-node/dist/cli.mjs', 'scripts/free_probe.ts', '--', '--load', $save, '--days', "$Days", '--out', "$out\$name", '--withdraw-check')
  $proc = Start-Process node -ArgumentList $argList -WorkingDirectory $tree -RedirectStandardOutput "$root\logs\trip-waste-$name.log" -RedirectStandardError "$root\logs\trip-waste-$name.err" -WindowStyle Hidden -PassThru
  $null = $proc.Handle
  $started += "$($proc.Id) $name started $(Get-Date -Format s)"
  $cmds += "$name | cwd $tree | node $($argList -join ' ')"
}
$started | Out-File -Encoding ascii "$root\logs\trip-waste-pids.txt"
$cmds | Out-File -Encoding ascii "$out\commands.txt"
Get-Content "$root\logs\trip-waste-pids.txt"
"reading sha256 $hash"
Get-Date -Format s
