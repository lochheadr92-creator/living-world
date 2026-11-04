# P0.1c forest floors: rules 118 vs 121, arrivals on and off, 25 draws each (control + 24 nudges), Normal profile, to day 25.
# Same draw design as P0.1b: nudge:1-8 forked at day 4, nudge:1-4 forked at days 2, 3, 5 and 6. Launched detached from the
# frozen worktree at b5694c7 so the runs outlive the session and the source cannot change under them.
$src = 'C:\dev\Claude Experiment\living-world-p01c-b5694c7'
$out = 'C:\dev\Claude Experiment\living-world-integrate\p01_evidence\p01c-floors'
# relative to the working directory: Windows PowerShell 5.1 does not quote ArgumentList items, and the path has a space
$vite = 'node_modules/vite-node/dist/cli.mjs'
$arms = @(
  @{ name = 'r118-on';  rules = '118'; arrivals = 'on'  },
  @{ name = 'r121-on';  rules = '';    arrivals = 'on'  },
  @{ name = 'r118-off'; rules = '118'; arrivals = 'off' },
  @{ name = 'r121-off'; rules = '';    arrivals = 'off' }
)
$jobs = @(
  @{ fork = 4; branches = 'nudge:1,nudge:2'; label = 'f4-n1-2' },
  @{ fork = 4; branches = 'nudge:3,nudge:4'; label = 'f4-n3-4' },
  @{ fork = 4; branches = 'nudge:5,nudge:6'; label = 'f4-n5-6' },
  @{ fork = 4; branches = 'nudge:7,nudge:8'; label = 'f4-n7-8' },
  @{ fork = 2; branches = 'nudge:1,nudge:2,nudge:3,nudge:4'; label = 'f2-n1-4' },
  @{ fork = 3; branches = 'nudge:1,nudge:2,nudge:3,nudge:4'; label = 'f3-n1-4' },
  @{ fork = 5; branches = 'nudge:1,nudge:2,nudge:3,nudge:4'; label = 'f5-n1-4' },
  @{ fork = 6; branches = 'nudge:1,nudge:2,nudge:3,nudge:4'; label = 'f6-n1-4' }
)
$launched = @()
foreach ($arm in $arms) {
  $dir = Join-Path $out $arm.name
  New-Item -ItemType Directory -Force $dir | Out-Null
  foreach ($job in $jobs) {
    $days = 25 - $job.fork
    $argv = @($vite, 'scripts/lab_seed.ts', '--', '--seed', 'forest', '--profile', 'normal', '--fork', "$($job.fork)", '--days', "$days", '--branches', $job.branches, '--arrivals', $arm.arrivals)
    if ($arm.rules) { $argv += @('--rules', $arm.rules) }
    $stdout = Join-Path $dir "forest-$($job.label).jsonl"
    $stderr = Join-Path $dir "forest-$($job.label).stderr.log"
    $p = Start-Process node -ArgumentList $argv -WorkingDirectory $src -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
    $launched += [ordered]@{ arm = $arm.name; job = $job.label; fork = $job.fork; days = $days; branches = $job.branches; pid = $p.Id }
  }
}
$launch = [ordered]@{ started = (Get-Date -Format s); commit = 'b5694c7'; source = $src; profile = 'normal'; seed = 'forest'; processes = $launched }
$launch | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $out 'launch.json')
($launched | ForEach-Object { $_.pid }) -join ' '
