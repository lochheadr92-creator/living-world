param([string]$Runner,[string]$Node,[string]$Fixture,[string]$OutputRoot)
$ErrorActionPreference='Stop'
. $Runner -OutputRoot $OutputRoot
$jobs=@()
foreach($kind in @('success','nonzero','crash','budget','short','integrity','invalid')){
 $out=Join-Path $OutputRoot $kind
 $p=Start-LongRunProcess -Node $Node -Arguments @($Fixture,$out,$kind) -Source $OutputRoot -Stdout "$OutputRoot/$kind.stdout.log" -Stderr "$OutputRoot/$kind.stderr.log"
 $jobs+=[pscustomobject]@{Name=$kind;Process=$p;Report="$out/report.json"}
}
while(@($jobs|Where-Object{!$_.Process.HasExited}).Count){Start-Sleep -Milliseconds 10}
$rows=@(foreach($job in $jobs){
 $row=Get-LongRunSummary -Job $job -Days 1
 $expected=if($job.Name -in @('nonzero','crash')){7}elseif($job.Name -eq 'budget'){1}else{0}
 if($null -eq $row.ExitCode -or $row.ExitCode -ne $expected){throw "Incorrect exit code for $($job.Name): $($row.ExitCode)"}
 if($row.Complete -ne ($job.Name -eq 'success')){throw "Incorrect completion for $($job.Name)"}
 if((Get-Content "$OutputRoot/$($job.Name).stdout.log" -Raw).Trim() -ne 'stdout retained'){throw 'Lost stdout'}
 if((Get-Content "$OutputRoot/$($job.Name).stderr.log" -Raw).Trim() -ne 'stderr retained'){throw 'Lost stderr'}
 $job.Process.Dispose()
 $row
})
# An unavailable native exit code must never be cast to zero or inferred from JSON.
$unknown=[pscustomobject]@{ExitCode=$null}
$unknown|Add-Member -MemberType ScriptMethod -Name WaitForExit -Value {}
$row=Get-LongRunSummary -Job ([pscustomobject]@{Name='unknown';Process=$unknown;Report="$OutputRoot/success/report.json"}) -Days 1
if($row.Complete -or $row.Failure -ne 'EXIT_CODE_UNAVAILABLE' -or $null -ne $row.ExitCode){throw 'Unknown exit code was accepted'}
$rows+=$row
$rows|ConvertTo-Json -Depth 5
