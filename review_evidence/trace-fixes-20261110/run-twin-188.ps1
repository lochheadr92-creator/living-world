# Version twin 187 v 188 (--strip-taken) from a clean pinned worktree, 24 processes plus one unstripped (decision D-1). Outputs go to a path with no space; this folder gets copies.
param([Parameter(Mandatory)][string]$Head,[string]$Wt='C:\dev\Claude Experiment\living-world-v183-pin',[string]$Scratch='C:\dev\_claude_scratch\twins-188',[int]$Days=25)
$ErrorActionPreference='Stop'
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Wt
if ((git rev-parse --short=8 HEAD) -ne $Head -or (git status --porcelain)) { throw "worktree is not the clean pin at $Head" }
$seeds='aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'
$node='C:\Program Files\nodejs\node.exe'
foreach($pair in @(,@(187,188,"--strip-taken","river"))){
  $before=$pair[0];$after=$pair[1];$extra=$pair[2];$plain=$pair[3];$dir="$Scratch\r$before-r$after";New-Item -ItemType Directory -Force $dir|Out-Null
  "started $(Get-Date -Format s) head $Head days $Days before $before after $after extra '$extra' stream gap dirty=false"|Set-Content "$dir\status.txt"
  $procs=@()
  foreach($seed in $seeds){foreach($rules in @($before,$after)){
    $procs+=Start-Process -FilePath $node -ArgumentList @('node_modules/vite-node/dist/cli.mjs','scripts/ab_probe.ts','--',$seed,"$Days","$rules","$dir\ab-$seed-r$rules.json",$extra) -NoNewWindow -PassThru -RedirectStandardOutput "$dir\ab-$seed-r$rules.out.txt" -RedirectStandardError "$dir\ab-$seed-r$rules.err.txt"
  }}
  $procs+=Start-Process -FilePath $node -ArgumentList @('node_modules/vite-node/dist/cli.mjs','scripts/ab_probe.ts','--',$plain,"$Days","$after","$dir\nostrip-$plain-r$after.json") -NoNewWindow -PassThru -RedirectStandardOutput "$dir\nostrip-$plain-r$after.out.txt" -RedirectStandardError "$dir\nostrip-$plain-r$after.err.txt"
  $procs|Wait-Process
  cmd /c "node node_modules\vite-node\dist\cli.mjs scripts\ab_compare.ts -- $dir $before $after > $dir\compare.stdout.txt 2>&1"
  "finished $(Get-Date -Format s) compare exit $LASTEXITCODE"|Add-Content "$dir\status.txt"
  New-Item -ItemType Directory -Force "$here\r$before-r$after"|Out-Null
  Copy-Item "$dir\*.json","$dir\*.txt" "$here\r$before-r$after" -Force
}
"all done $(Get-Date -Format s)"|Set-Content "$Scratch\done.txt"
