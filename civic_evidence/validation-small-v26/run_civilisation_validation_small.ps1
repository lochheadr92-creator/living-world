param(
 [ValidateSet('A','C','DEF','GH','performance','all')][string]$Only='A',
 [ValidatePattern('^[A-Za-z0-9_-]+$')][string]$OutputName='civ_validation_small_v26'
)
$ErrorActionPreference='Stop'
$repoPath=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoPath
$sourceHead=(& git rev-parse HEAD).Trim()
if($LASTEXITCODE -ne 0){throw 'Cannot identify source revision'}
& git diff --quiet
if($LASTEXITCODE -ne 0){throw 'Tracked source changes present; use the pinned clean validation checkout'}
& git diff --cached --quiet
if($LASTEXITCODE -ne 0){throw 'Staged changes present; use the pinned clean validation checkout'}
if((Get-Content -LiteralPath (Join-Path $repoPath 'src/sim/rulesversion.ts') -Raw) -notmatch 'CURRENT_RULES_VERSION = 26;'){throw 'This workload is pinned to rules 26; prepare a new workload record for later rules'}
$nodePath=(Get-Command node).Source
$outputPath=Join-Path $repoPath $OutputName
$manifestPath=Join-Path $outputPath 'manifest.json'
$specs=@(
 [ordered]@{Name='A';Seeds=4;Profile='town';Days=2;Branches='nudge:1,nudge:2,rich-no-stock,rich-no-shelter';Geology='no'},
 [ordered]@{Name='C';Seeds=4;Profile='large';Days=2;Branches='nudge:1,nudge:2';Geology='yes'},
 [ordered]@{Name='DEF';Seeds=4;Profile='large';Days=2;Branches='nudge:1,nudge:2,rich-no-relocation,rich-no-exchange-journeys,rich-no-political-alignment';Geology='no'},
 [ordered]@{Name='GH';Seeds=4;Profile='normal';Days=4;Branches='nudge:1,nudge:2,rich-no-household-practices';Geology='no'}
)
$benchmarks=@(
 [ordered]@{Profile='normal';Days=1},[ordered]@{Profile='large';Days=1},[ordered]@{Profile='huge';Days=1}
)
$manifest=[ordered]@{SourceHead=$sourceHead;RulesVersion=26;Specs=$specs;Benchmarks=$benchmarks}
$manifestJson=$manifest|ConvertTo-Json -Depth 8
if(Test-Path -LiteralPath $outputPath){
 if(!(Test-Path -LiteralPath $manifestPath)){throw 'Existing output has no provenance manifest; choose a fresh OutputName'}
 if((Get-Content -LiteralPath $manifestPath -Raw).Trim() -ne $manifestJson.Trim()){throw 'Source/workload differs from manifest; choose a fresh OutputName'}
}else{
 New-Item -ItemType Directory -Path $outputPath|Out-Null
 Set-Content -LiteralPath $manifestPath -Value $manifestJson -Encoding UTF8
}
$seeds=@('meadow','river','fern','aspen','birch','cedar','gen-1','gen-2','gen-3','gen-4','gen-5','gen-6')+@(1..20|ForEach-Object{"nov-$_"})
function Write-CombinedReport {
 $lines=@("Living World SMALL regression validation: $sourceHead",'Rules 26. Retained/end-state metrics are not lifetime event totals.','Owner-reduced workload: short-run regression only. Long-run benefit, mature-world cost and natural generations remain unverified. See SMALL_VALIDATION_SCOPE.md.','')
 foreach($spec in $specs){
  $dir=Join-Path $outputPath $spec.Name;$complete=Test-Path -LiteralPath (Join-Path $dir 'verified-complete.txt')
  $lines+=('=== '+$spec.Name+': '+$(if($complete){'all configured seed/arm outputs verified'}else{'pending or incomplete'})+' ===')
  $report=Join-Path $dir 'report.txt';if(Test-Path -LiteralPath $report){$lines+=Get-Content -LiteralPath $report}
 }
 foreach($b in $benchmarks){$file=Join-Path $outputPath ('bench-'+$b.Profile+'.json');$lines+=('=== performance '+$b.Profile+' ===');if(Test-Path -LiteralPath $file){$d=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json;$lines+=($d.meta|ConvertTo-Json -Depth 5);$lines+=($d.summary|ConvertTo-Json -Depth 5);$lines+=($d.checks|ConvertTo-Json -Depth 5)}else{$lines+='pending'}}
 Set-Content -LiteralPath (Join-Path $outputPath 'report.txt') -Value $lines -Encoding UTF8
}
Write-CombinedReport
foreach($spec in $specs){
 if($Only -ne 'all' -and $Only -ne $spec.Name){continue}
 $relativeOut=$OutputName+'/'+$spec.Name
 $arguments=@('scripts/lab.mjs','--out',$relativeOut,'--seeds',[string]$spec.Seeds,'--fork','0','--days',[string]$spec.Days,'--profile',$spec.Profile,'--dynamics','rich','--branches',$spec.Branches,'--geology-comparison',$spec.Geology)
 $process=Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $repoPath -RedirectStandardOutput (Join-Path $outputPath ($spec.Name+'.log')) -RedirectStandardError (Join-Path $outputPath ($spec.Name+'.err.log')) -WindowStyle Hidden -Wait -PassThru
 if($process.ExitCode -ne 0){Write-CombinedReport;throw ($spec.Name+' failed; inspect its err.log')}
 $expected=@('control')+$spec.Branches.Split(',');if($spec.Geology -eq 'yes'){$expected+= 'no-geology-at-generation'}
 foreach($seed in $seeds[0..($spec.Seeds-1)]){
  $file=Join-Path $repoPath ($relativeOut+'/lab_'+$seed+'.jsonl');if(!(Test-Path -LiteralPath $file)){throw ('Missing '+$file)}
  $rows=@(Get-Content -LiteralPath $file|Where-Object{$_}|ForEach-Object{$_|ConvertFrom-Json})
  if(!$rows[-1].done){throw ('Incomplete seed '+$seed)}
  foreach($branch in $expected){$branchRows=@($rows|Where-Object{$_.spec -eq $branch});if($branchRows.Count -ne 1){throw ('Missing/duplicate branch '+$branch+' in '+$seed)};if($branchRows[0].rulesVersion -ne 26){throw 'Wrong rules generation'}}
 }
 Set-Content -LiteralPath (Join-Path $repoPath ($relativeOut+'/verified-complete.txt')) -Value $sourceHead -Encoding ASCII
 Write-CombinedReport
}
if($Only -eq 'all' -or $Only -eq 'performance'){
 foreach($b in $benchmarks){
  $relativeFile=$OutputName+'/bench-'+$b.Profile+'.json';$file=Join-Path $repoPath $relativeFile
  if(Test-Path -LiteralPath $file){$d=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json;if($d.summary.ticks -eq $b.Days*2400 -and $d.meta.settings.rulesVersion -eq 26){continue};throw 'Incomplete benchmark file; preserve it and use a fresh OutputName'}
  $arguments=@('node_modules/vite-node/dist/cli.mjs','scripts/bench.ts','--','--current','--profile',$b.Profile,'--days',[string]$b.Days,'--seed','meadow','--arrivals','off','--check','2400','--quiet','--out',$relativeFile)
  $process=Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $repoPath -RedirectStandardOutput (Join-Path $outputPath ('bench-'+$b.Profile+'.log')) -RedirectStandardError (Join-Path $outputPath ('bench-'+$b.Profile+'.err.log')) -WindowStyle Hidden -Wait -PassThru
  if($process.ExitCode -ne 0){Write-CombinedReport;throw 'Benchmark failed'}
  Write-CombinedReport
 }
}
Write-CombinedReport
Write-Output ('Read only '+(Join-Path $outputPath 'report.txt')+' for the combined result. Pending sections remain pending.')

