# Version twin 184 against 185 from a clean pinned worktree, all 24 processes at once (decision D-1), with the township extent key stripped before hashing.
# One extra process runs birch at 185 without the strip, to show the strip is what makes the hashes equal.
param([Parameter(Mandatory)][string]$Head,[Parameter(Mandatory)][string]$Out,[string]$Wt='C:\dev\Claude Experiment\living-world-v183-pin',[int]$Before=184,[int]$After=185,[int]$Days=25)
$ErrorActionPreference='Stop'
Set-Location $Wt
if ((git rev-parse --short=8 HEAD) -ne $Head -or (git status --porcelain)) { throw "worktree is not the clean pin at $Head" }
New-Item -ItemType Directory -Force $Out | Out-Null
$status="$Out/status.txt";"started $(Get-Date -Format s) head $Head days $Days before $Before after $After extra '--strip-extent' stream gap dirty=false"|Set-Content $status
$seeds='aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'
$node='C:\Program Files\nodejs\node.exe'
$procs=@()
foreach($seed in $seeds){ foreach($rules in @($Before,$After)){
  $argv=@('node_modules/vite-node/dist/cli.mjs','scripts/ab_probe.ts','--',$seed,"$Days","$rules","$Out/ab-$seed-r$rules.json",'--strip-extent')
  $procs+=Start-Process -FilePath $node -ArgumentList $argv -NoNewWindow -PassThru -RedirectStandardOutput "$Out/ab-$seed-r$rules.log" -RedirectStandardError "$Out/ab-$seed-r$rules.err"
}}
$procs+=Start-Process -FilePath $node -ArgumentList @('node_modules/vite-node/dist/cli.mjs','scripts/ab_probe.ts','--','birch',"$Days","$After","$Out/nostrip-birch-r$After.json") -NoNewWindow -PassThru -RedirectStandardOutput "$Out/nostrip-birch-r$After.log" -RedirectStandardError "$Out/nostrip-birch-r$After.err"
$procs|Wait-Process
"runs done $(Get-Date -Format s)"|Add-Content $status
cmd /c "node node_modules\vite-node\dist\cli.mjs scripts\ab_compare.ts -- `"$Out`" $Before $After > `"$Out/ab-compare.txt`" 2>&1"
"finished $(Get-Date -Format s) compare exit $LASTEXITCODE"|Add-Content $status
