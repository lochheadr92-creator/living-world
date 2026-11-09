# Version twins from a clean pinned worktree, two processes at a time (owner answer 1). Runs each pair in turn and writes ab-compare.txt per pair.
param([Parameter(Mandatory)][string]$Head,[Parameter(Mandatory)][string]$Out,[string]$Wt='C:\dev\Claude Experiment\living-world-v177-pin',[int[]]$Pairs=@(180,181,182),[int]$Days=25,[string]$Extra='')
$ErrorActionPreference='Stop'
Set-Location $Wt
if ((git rev-parse --short=8 HEAD) -ne $Head -or (git status --porcelain)) { throw "worktree is not the clean pin at $Head" }
New-Item -ItemType Directory -Force $Out | Out-Null
$seeds='aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'
for($k=0;$k -lt $Pairs.Count-1;$k++){
  $before=$Pairs[$k];$after=$Pairs[$k+1];$dir="$Out/r$before-r$after";New-Item -ItemType Directory -Force $dir|Out-Null
  $status="$dir/status.txt";"started $(Get-Date -Format s) head $Head days $Days before $before after $after extra '$Extra'"|Set-Content $status
  foreach($seed in $seeds){
    $procs=@()
    foreach($rules in @($before,$after)){
      $json="$dir/ab-$seed-r$rules.json";if(Test-Path $json){continue}
      $argv=@('node_modules/vite-node/dist/cli.mjs','scripts/ab_probe.ts','--',$seed,"$Days","$rules",$json);if($Extra -ne ''){$argv+=$Extra}
      $procs+=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $argv -NoNewWindow -PassThru -RedirectStandardOutput "$dir/ab-$seed-r$rules.log" -RedirectStandardError "$dir/ab-$seed-r$rules.err"
    }
    if($procs.Count -gt 0){$procs|Wait-Process}
    "$(Get-Date -Format s) done $seed"|Add-Content $status
  }
  cmd /c "node node_modules\vite-node\dist\cli.mjs scripts\ab_compare.ts -- `"$dir`" $before $after > `"$Out/compare-r$before-r$after.stdout.txt`" 2>&1"
  "finished $(Get-Date -Format s) compare exit $LASTEXITCODE"|Add-Content $status
}
