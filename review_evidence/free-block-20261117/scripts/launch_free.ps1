# Starts the free block runs (SCRATCH ONLY): three worlds x five arms (A, N1, N2, D, E) plus one repeat of aspen D, sixteen runs of 30 days
# from the day 48 saves, detached, never more than 8 at a time, and records every PID and exact command line.
#   powershell -File launch_free.ps1            (refuses an existing out folder; starts a hidden supervisor and returns)
#   powershell -File launch_free.ps1 -Resume    (starts only the runs whose out folder does not exist yet; see the note below)
# The supervisor is this same file run with -Worker. It starts a run whenever fewer than 8 of its runs are alive, until all of its runs
# have started, then waits for the last and writes the exit codes.
#
# NOTE (17 November 2026): the first supervisor of this file died after the first eight runs. A loop variable named $r overwrote $R, the
# root path (PowerShell variables are not case sensitive), so the log paths of the ninth run were garbage. The eight runs it had started
# were not touched (each is its own node process). The loop variable is now $slot, and -Resume starts what was never started.
param([int]$Day = 48, [int]$Days = 30, [int]$MaxAtOnce = 8, [switch]$Worker, [switch]$Resume)
$R = 'C:\dev\_claude_scratch\regime-20261117'
$wt = "$R\wt"; $out = "$R\out\free"
# the queue, in start order: the aspen determinism pair first, so the check can be read early
$queue = @(
  @('aspen', 'A', @()), @('aspen', 'N1', @('--nudge', '1')), @('aspen', 'N2', @('--nudge', '2')), @('aspen', 'D', @('--block-from', '0.62')),
  @('aspen', 'Drepeat', @('--block-from', '0.62')), @('aspen', 'E', @('--block-from', '0.5')),
  @('river', 'A', @()), @('river', 'N1', @('--nudge', '1')), @('river', 'N2', @('--nudge', '2')), @('river', 'D', @('--block-from', '0.62')), @('river', 'E', @('--block-from', '0.5')),
  @('gen-4', 'A', @()), @('gen-4', 'N1', @('--nudge', '1')), @('gen-4', 'N2', @('--nudge', '2')), @('gen-4', 'D', @('--block-from', '0.62')), @('gen-4', 'E', @('--block-from', '0.5'))
)
# a run whose folder exists is done or under way and is never started again; -Resume keeps only the runs not yet started
if ($Resume) {
  $left = New-Object System.Collections.ArrayList
  foreach ($j in $queue) { if (-not (Test-Path "$out\$($j[0])-$($j[1])")) { [void]$left.Add($j) } }
  $queue = $left.ToArray()
}
function ArgsFor($job) {
  $w = $job[0]; $name = "$($job[0])-$($job[1])"
  return @('node_modules/vite-node/dist/cli.mjs', 'scripts/free_probe.ts', '--', '--load', "$R\saves\$w-day$Day.save.json", '--days', "$Days", '--out', "$out\$name") + $job[2]
}
if (-not $Worker) {
  if ((Test-Path $out) -and -not $Resume) { throw "out folder already exists: $out" }
  if ($Resume -and -not (Test-Path $out)) { throw "-Resume needs the out folder of the first launch: $out" }
  if ($queue.Count -eq 0) { throw 'nothing left to start' }
  foreach ($j in $queue) { $s = "$R\saves\$($j[0])-day$Day.save.json"; if (-not (Test-Path $s)) { throw "missing save $s" } }
  New-Item -ItemType Directory -Force $out | Out-Null
  New-Item -ItemType Directory -Force "$R\logs" | Out-Null
  $cmds = foreach ($j in $queue) { "$($j[0])-$($j[1]) | cwd $wt | node $((ArgsFor $j) -join ' ')" }
  $workerArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$R\launch_free.ps1", '-Worker', '-Day', "$Day", '-Days', "$Days", '-MaxAtOnce', "$MaxAtOnce")
  if ($Resume) {
    '' | Out-File -Encoding ascii -Append "$out\commands.txt"
    "RESUME $(Get-Date -Format s): the first supervisor died after wave one (a loop variable overwrote the root path); these runs were never started and are started by launch_free.ps1 -Resume" | Out-File -Encoding ascii -Append "$out\commands.txt"
    $cmds | Out-File -Encoding ascii -Append "$out\commands.txt"
    "resume $(Get-Date -Format s)" | Out-File -Encoding ascii -Append "$R\logs\free-pids.txt"
    $workerArgs += '-Resume'
  } else {
    $cmds | Out-File -Encoding ascii "$out\commands.txt"
    Get-Date -Format s | Out-File -Encoding ascii "$R\logs\free-pids.txt"
  }
  $sup = Start-Process powershell -ArgumentList $workerArgs -WorkingDirectory $R -WindowStyle Hidden -PassThru
  "supervisor $($sup.Id)" | Out-File -Encoding ascii -Append "$R\logs\free-pids.txt"
  Get-Content "$R\logs\free-pids.txt"
  Get-Date -Format s
  return
}
# supervisor
try {
  $running = @(); $done = @(); $i = 0
  while ($i -lt $queue.Count -or $running.Count -gt 0) {
    $still = @()
    foreach ($slot in $running) { if ($slot.P.HasExited) { $done += "$($slot.Name) pid $($slot.P.Id) exit $($slot.P.ExitCode) ended $(Get-Date -Format s)" } else { $still += $slot } }
    $running = $still
    while ($i -lt $queue.Count -and $running.Count -lt $MaxAtOnce) {
      $j = $queue[$i]; $name = "$($j[0])-$($j[1])"; $a = ArgsFor $j
      $p = Start-Process node -ArgumentList $a -WorkingDirectory $wt -RedirectStandardOutput "$R\logs\free-$name.log" -RedirectStandardError "$R\logs\free-$name.err" -WindowStyle Hidden -PassThru
      $null = $p.Handle
      "$($p.Id) $name started $(Get-Date -Format s) | node $($a -join ' ')" | Out-File -Encoding ascii -Append "$R\logs\free-pids.txt"
      $running += [pscustomobject]@{ Name = $name; P = $p }
      $i++
    }
    Start-Sleep -Seconds 5
  }
  $done | Out-File -Encoding ascii -Append "$R\logs\free-exit.txt"
  "all finished $(Get-Date -Format s)" | Out-File -Encoding ascii -Append "$R\logs\free-exit.txt"
} catch {
  "supervisor error $(Get-Date -Format s): $($_ | Out-String)" | Out-File -Encoding ascii -Append "$R\logs\free-supervisor.err"
  throw
}
