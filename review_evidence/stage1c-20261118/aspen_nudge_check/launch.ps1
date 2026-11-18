$repo = 'C:\dev\Claude Experiment\living-world-integrate'
$d = 'C:\dev\lw_runs\aspen_check'
$save = 'C:\dev\lw_saves\day48\aspen-day48.save.json'
Set-Location $repo
foreach ($n in 0,1,2) {
  Start-Process cmd -ArgumentList "/c node_modules\.bin\vite-node.cmd scripts\generation_trace.ts -- --load $save --rules-up 255 --days 12 --nudge $n --out $d\trace_nudge$n.json > $d\trace_nudge$n.txt 2>&1" -WindowStyle Hidden
}
Get-Date -Format 'HH:mm:ss'