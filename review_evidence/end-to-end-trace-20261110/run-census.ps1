# Twelve ordinary worlds, one process each, from the clean pinned worktree. Outputs go to a path with no space, then are copied into this folder.
param([int]$Days=45,[string]$Wt='C:\dev\Claude Experiment\living-world-v183-pin',[string]$Scratch='C:\dev\_claude_scratch\trace-20261110',[string[]]$Seeds=@('aspen','birch','cedar','fern','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6','meadow','river'))
$ErrorActionPreference='Stop'
$here=Split-Path -Parent $MyInvocation.MyCommand.Path
if (Test-Path 'C:\dev\STOP-LIVING-WORLD') { throw 'C:\dev\STOP-LIVING-WORLD exists' }
Set-Location $Wt
if (git status --porcelain) { throw "worktree $Wt is not clean" }
$head=git rev-parse --short=8 HEAD
New-Item -ItemType Directory -Force $Scratch | Out-Null
Copy-Item "$here\census_probe.ts" "$Scratch\census_probe.ts" -Force
"started $(Get-Date -Format s) head $head days $Days dirty=false worktree $Wt" | Set-Content "$Scratch\status.txt"
$sw=[Diagnostics.Stopwatch]::StartNew()
$procs=@()
foreach($s in $Seeds){
  $argv=@('node_modules/vite-node/dist/cli.mjs',"$Scratch\census_probe.ts",'--',$s,"$Days","$Scratch\census-$s.json")
  $procs+=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList $argv -NoNewWindow -PassThru -RedirectStandardOutput "$Scratch\census-$s.out.txt" -RedirectStandardError "$Scratch\census-$s.err.txt"
}
Write-Host "running $($Seeds.Count) worlds for $Days days from $head ..."
$procs | Wait-Process
"finished $(Get-Date -Format s) after $([int]$sw.Elapsed.TotalSeconds)s" | Add-Content "$Scratch\status.txt"
foreach($s in $Seeds){ $l=Get-Content "$Scratch\census-$s.out.txt" -Tail 1 -ErrorAction SilentlyContinue; if($l){$l}else{"$s FAILED: $(Get-Content "$Scratch\census-$s.err.txt" -Tail 3)"} }
New-Item -ItemType Directory -Force "$here\census" | Out-Null
Copy-Item "$Scratch\census-*.json","$Scratch\census-*.out.txt","$Scratch\status.txt" "$here\census" -Force
Write-Host "done in $([int]$sw.Elapsed.TotalSeconds)s. Results: $here\census"
