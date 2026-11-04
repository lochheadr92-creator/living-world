# Declared before final treatment results: 25 draws each in forest, river and meadow.
# Each seed: one control; nudge 1..8 at day 4; nudge 1..4 at days 2,3,5,6; horizon day 25.
$ErrorActionPreference='Stop'
$source='C:/dev/Claude Experiment/living-world-survival-baseline-metrics'
$out='C:/dev/Claude Experiment/living-world-integrate/survival_evidence/aggregate-baseline'
$draws=@(@{fork=4;nudge=0})
foreach($n in 1..8){$draws+=@{fork=4;nudge=$n}}
foreach($f in @(2,3,5,6)){foreach($n in 1..4){$draws+=@{fork=$f;nudge=$n}}}
$queue=@()
foreach($seed in @('forest','river','meadow')){foreach($draw in $draws){
 $name=if($seed -eq 'forest' -and $draw.nudge -eq 0){'forest-control'}else{"$seed-f$($draw.fork)-n$($draw.nudge)"}
 $queue += [pscustomobject]@{name=$name;seed=$seed;fork=$draw.fork;nudge=$draw.nudge}
}}
$results=@();$active=@();$next=0
while($next -lt $queue.Count -or $active.Count -gt 0){
 while($next -lt $queue.Count -and $active.Count -lt 12){
  $j=$queue[$next];$next++;$dest="$out/$($j.name)"
  if(Test-Path "$dest/report.json"){
   $r=Get-Content "$dest/report.json" -Raw|ConvertFrom-Json
   if($r.tick -ne 60000 -or $r.seed -ne $j.seed -or $r.fork -ne $j.fork -or $r.nudge -ne $j.nudge -or $r.settings.rulesVersion -ne 121 -or !$r.settings.immigration){throw 'Existing result does not match the declared draw'}
   $results+=[pscustomobject]@{name=$j.name;status='retained complete';exitCode=0};continue
  }
  if(Test-Path $dest){throw "Incomplete existing output: $dest"}
  $argv=@('node_modules/vite-node/dist/cli.mjs','scripts/survival_ensemble.ts','--',$j.seed,"`"$dest`"","$($j.fork)","$($j.nudge)",'25')
  $p=Start-Process node -ArgumentList $argv -WorkingDirectory $source -WindowStyle Hidden -RedirectStandardOutput "$out/$($j.name).stdout.log" -RedirectStandardError "$out/$($j.name).stderr.log" -PassThru
  $active+=[pscustomobject]@{job=$j;process=$p}
 }
 $remaining=@()
 foreach($item in $active){
  $item.process.Refresh()
  if($item.process.HasExited){$item.process.WaitForExit();$results+=[pscustomobject]@{name=$item.job.name;status='finished';exitCode=$item.process.ExitCode}}
  else{$remaining+=$item}
 }
 $active=$remaining
 [pscustomobject]@{source=$source;rules=121;profile='normal';arrivals=$true;horizon=25;draws=$queue;started=$next;active=@($active|ForEach-Object{@{name=$_.job.name;pid=$_.process.Id}});results=$results}|ConvertTo-Json -Depth 6|Set-Content "$out/status.json"
 Start-Sleep -Seconds 1
}
if(@($results|Where-Object{$_.exitCode -ne 0}).Count){exit 1}
