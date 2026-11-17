$ErrorActionPreference='Stop'
$root='C:\dev\_lw_daylength_20261117'
$days=4
$seeds=@('aspen','birch','meadow','river')
$node=(Get-Command node.exe).Source
New-Item -ItemType Directory -Force -Path (Join-Path $root 'results') | Out-Null
$all=@()
foreach($variant in @('baseline','double')) {
  foreach($seed in $seeds) {
    $work=Join-Path $root $variant
    $stem=Join-Path (Join-Path $root 'results') ($variant+'_'+$seed)
    $args=@('node_modules/vite-node/dist/cli.mjs','scripts/daylength_probe.ts','--','--seed',$seed,'--days',"$days",'--out',($stem+'.json'))
    $p=Start-Process -FilePath $node -ArgumentList $args -WorkingDirectory $work -PassThru -WindowStyle Hidden -RedirectStandardOutput ($stem+'.stdout.txt') -RedirectStandardError ($stem+'.stderr.txt')
    $all+=@{variant=$variant;seed=$seed;pid=$p.Id;output=$stem+'.json'}
    Write-Host "$variant $seed PID=$($p.Id)"
  }
}
$all|ConvertTo-Json -Depth 4|Set-Content -LiteralPath (Join-Path $root 'results\runs.json')
Write-Host "STARTED $($all.Count) RUNS, DAYS=$days"
