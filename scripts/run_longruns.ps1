# Windows PowerShell 5.1. Run against an explicitly prepared source checkout.
param(
 [string]$Source=(Split-Path -Parent $PSScriptRoot),
 [string]$OutputRoot,
 [ValidatePattern('^[A-Za-z0-9_-]+$')][string[]]$Seeds=@('river','forest','meadow'),
 [ValidateSet('production','households','promises')][string[]]$Checks=@('production','households','promises'),
 [ValidateRange(1,365)][int]$Days=45,
 [ValidateRange(1,86400)][int]$BudgetSeconds=3600
)

function Start-LongRunProcess {
 param([string]$Node,[string[]]$Arguments,[string]$Source,[string]$Stdout,[string]$Stderr)
 # All arguments here are paths/names/numbers, never shell expressions. Quote spaces
 # for Start-Process, which joins ArgumentList into a Windows command line.
 $quoted=@($Arguments | ForEach-Object {
  if($_.Contains('"') -or $_.EndsWith('\')){throw 'Unsupported quote or trailing backslash in process argument'}
  '"'+$_+'"'
 })
 $process=Start-Process -FilePath $Node -ArgumentList $quoted -WorkingDirectory $Source -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr -WindowStyle Hidden -PassThru
 # Retain the native handle BEFORE polling HasExited. Without this Windows
 # PowerShell can return null ExitCode after redirected children exit (#5421).
 $handle=$process.Handle
 if($null -eq $handle -or $handle -eq [IntPtr]::Zero){throw 'Could not retain child process handle'}
 return $process
}

function Get-LongRunSummary {
 param($Job,[int]$Days)
 $Job.Process.WaitForExit()
 $code=$Job.Process.ExitCode
 $result=$null
 $failure=''
 if(Test-Path -LiteralPath $Job.Report){
  try {$result=Get-Content -LiteralPath $Job.Report -Raw | ConvertFrom-Json}
  catch {$failure='INVALID_REPORT'}
 }else{$failure='NO_VALID_REPORT'}
 if($null -eq $code){$failure='EXIT_CODE_UNAVAILABLE'}
 elseif($code -ne 0){$failure="PROCESS_EXIT_$code"}
 elseif($result){
  if($result.stop -ne 'horizon'){$failure='HORIZON_NOT_REACHED'}
  elseif($result.tick -ne $Days*2400 -or $result.days -ne $Days){$failure='HORIZON_MISMATCH'}
  elseif($result.conservation.ok -ne $true -or $result.continuationEqual -ne $true){$failure='INTEGRITY_FAILED'}
 }elseif(!$failure){$failure='INVALID_REPORT'}
 [pscustomobject]@{
  Run=$Job.Name
  Complete=($failure -eq '')
  ExitCode=$code
  StopReason=$(if($result){$result.stop}else{'NO_VALID_REPORT'})
  DaysReached=$(if($result){[math]::Round($result.tick/2400,2)}else{$null})
  Alive=$(if($result){$result.population}else{$null})
  Conserved=$(if($result){$result.conservation.ok}else{$null})
  Failure=$failure
 }
}

# Dot sourcing exposes the same process and summary functions to regression tests.
if($MyInvocation.InvocationName -ne '.'){
 $ErrorActionPreference='Stop'
 $Source=(Resolve-Path -LiteralPath $Source).Path
 if(!$OutputRoot){$OutputRoot=Join-Path (Split-Path -Parent $Source) ('living-world-longruns-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff'))}
 $OutputRoot=[IO.Path]::GetFullPath($OutputRoot)
 if(Test-Path -LiteralPath $OutputRoot){throw 'OutputRoot already exists; preserve it and choose a fresh directory'}
 if(@($Seeds|Select-Object -Unique).Count -ne $Seeds.Count -or @($Checks|Select-Object -Unique).Count -ne $Checks.Count){throw 'Duplicate seeds or checks'}
 $node=(Get-Command node.exe -ErrorAction Stop).Source
 $head=(& git -C $Source rev-parse HEAD).Trim()
 if($LASTEXITCODE -ne 0){throw 'Cannot identify source revision'}
 $scripts=@{production='scripts/ready_step_observe.ts';households='scripts/household_supply_observe.ts';promises='scripts/promised_supply_observe.ts'}
 foreach($file in @('node_modules/vite-node/dist/cli.mjs')+@($Checks|ForEach-Object{$scripts[$_]})){
  if(!(Test-Path -LiteralPath (Join-Path $Source $file))){throw "Missing prerequisite: $file"}
 }
 $reports=Join-Path $OutputRoot 'reports'
 New-Item -ItemType Directory -Path $reports | Out-Null
 # Capture local changes too: HEAD alone is insufficient provenance for a repair run.
 & git -C $Source diff HEAD --binary | Set-Content -LiteralPath (Join-Path $reports 'source.patch') -Encoding UTF8
 if($LASTEXITCODE -ne 0){throw 'Cannot record source diff'}
 Copy-Item -LiteralPath $PSCommandPath -Destination (Join-Path $reports 'run_longruns.ps1')
 @{commit=$head;source=$Source;node=(& $node --version);daysPerRun=$Days;secondsBudgetPerRun=$BudgetSeconds;seeds=$Seeds;checks=$Checks;note='Observers repeat each seed; they are not independent seeds. Source hashes are in each successful report.'} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $reports 'manifest.json') -Encoding UTF8
 $jobs=@()
 foreach($check in $Checks){foreach($seed in $Seeds){
  $name="$check-$seed"
  $out=Join-Path $OutputRoot $name
  $process=Start-LongRunProcess -Node $node -Arguments @('node_modules/vite-node/dist/cli.mjs',$scripts[$check],'--',$seed,$out,"$Days","$BudgetSeconds") -Source $Source -Stdout (Join-Path $reports "$name.stdout.log") -Stderr (Join-Path $reports "$name.stderr.log")
  $jobs+=[pscustomobject]@{Name=$name;Process=$process;Report=(Join-Path $out 'report.json')}
  Write-Host "Started $name, PID $($process.Id)"
 }}
 Write-Host "Results: $OutputRoot"
 while(@($jobs|Where-Object{!$_.Process.HasExited}).Count -gt 0){Start-Sleep -Seconds 1}
 $summary=@(foreach($job in $jobs){
  $row=Get-LongRunSummary -Job $job -Days $Days
  $row | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reports "$($job.Name).status.json") -Encoding UTF8
  if(Test-Path -LiteralPath $job.Report){Copy-Item -LiteralPath $job.Report -Destination (Join-Path $reports "$($job.Name).json")}
  $job.Process.Dispose()
  $row
 })
 $summary | Export-Csv -LiteralPath (Join-Path $reports 'summary.csv') -NoTypeInformation
 $summary | Format-Table -AutoSize
 Compress-Archive -Path (Join-Path $reports '*') -DestinationPath (Join-Path $OutputRoot 'Living-World-Long-Run-Results.zip')
 Write-Host 'BATCH FINISHED. Complete requires a captured zero exit code, full horizon and passing integrity checks.'
 if(@($summary|Where-Object{!$_.Complete}).Count){exit 1}
}
