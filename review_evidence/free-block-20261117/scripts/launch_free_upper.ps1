# Starts the free block UPPER-BOUND runs (SCRATCH ONLY): three worlds x two arms (UD: window from 0.62, UE: from 0.50, the gate on for every
# safe person of 12 or over in the window whatever they believe their household holds), six runs of 30 days from the day 48 saves, in one
# wave, detached, and records every PID and exact command line. powershell -File launch_free_upper.ps1
# Refuses an existing out folder. Six runs start at once (never more than 8); there is no supervisor, so there is nothing to die between runs.
# The controls (A, N1, N2) are the runs already in out\free; they are not rerun.
param([int]$Day = 48, [int]$Days = 30)
$root = 'C:\dev\_claude_scratch\regime-20261117'
$tree = "$root\wt"; $out = "$root\out\free-upper"
if (Test-Path $out) { throw "out folder already exists: $out" }
$reading = "$root\FREE_UPPER_READING.md"
if (-not (Test-Path $reading)) { throw "the reading must be written before the runs: $reading" }
$jobs = @()
foreach ($world in 'aspen', 'river', 'gen-4') { foreach ($arm in @(@('UD', '0.62'), @('UE', '0.5'))) { $jobs += , @($world, $arm[0], $arm[1]) } }
foreach ($job in $jobs) { $save = "$root\saves\$($job[0])-day$Day.save.json"; if (-not (Test-Path $save)) { throw "missing save $save" } }
New-Item -ItemType Directory -Force $out | Out-Null
New-Item -ItemType Directory -Force "$root\logs" | Out-Null
Copy-Item $reading "$out\READING.md"
$hash = (Get-FileHash -Algorithm SHA256 $reading).Hash.ToLower()
$cmds = @("reading $reading sha256 $hash ($(Get-Date -Format s))"); $started = @()
foreach ($job in $jobs) {
  $save = "$root\saves\$($job[0])-day$Day.save.json"
  $name = "$($job[0])-$($job[1])"
  $argList = @('node_modules/vite-node/dist/cli.mjs', 'scripts/free_probe.ts', '--', '--load', $save, '--days', "$Days", '--out', "$out\$name", '--block-from', $job[2], '--ignore-food')
  $proc = Start-Process node -ArgumentList $argList -WorkingDirectory $tree -RedirectStandardOutput "$root\logs\free-upper-$name.log" -RedirectStandardError "$root\logs\free-upper-$name.err" -WindowStyle Hidden -PassThru
  $null = $proc.Handle
  $started += "$($proc.Id) $name started $(Get-Date -Format s)"
  $cmds += "$name | cwd $tree | node $($argList -join ' ')"
}
$started | Out-File -Encoding ascii "$root\logs\free-upper-pids.txt"
$cmds | Out-File -Encoding ascii "$out\commands.txt"
Get-Content "$root\logs\free-upper-pids.txt"
"reading sha256 $hash"
Get-Date -Format s
