# Launch the 24 four-year runs detached (6 worlds x arms A, B, A1, A2). Run once. Records every process id in pids.txt:
#   <world>-<arm> <pid> <start time ticks>
# Arms: A = as saved (rules 244); B = --rules-up 245; A1 = A with --nudge 1; A2 = A with --nudge 2.
$rootDir = 'C:\dev\_claude_scratch\fouryear245'
$wtDir = "$rootDir\wt"
$outDir = "$rootDir\out"
$pidFile = "$rootDir\pids.txt"
if (Test-Path $pidFile) { throw "pids.txt already exists: runs may already be launched" }
$worlds = @(
  @{ name = 'aspen';  save = 'C:\dev\_claude_scratch\engine\saves-aspen\aspen-day96.save.json' },
  @{ name = 'cedar';  save = 'C:\dev\_claude_scratch\saves244\cedar-day96.save.json' },
  @{ name = 'fern';   save = 'C:\dev\_claude_scratch\saves244\fern-day96.save.json' },
  @{ name = 'meadow'; save = 'C:\dev\_claude_scratch\saves244\meadow-day96.save.json' },
  @{ name = 'birch';  save = 'C:\dev\_claude_scratch\saves244\birch-day84.save.json' },
  @{ name = 'river';  save = 'C:\dev\_claude_scratch\saves244\river-day84.save.json' }
)
$arms = @(
  @{ name = 'A';  extra = @() },
  @{ name = 'B';  extra = @('--rules-up', '245') },
  @{ name = 'A1'; extra = @('--nudge', '1') },
  @{ name = 'A2'; extra = @('--nudge', '2') }
)
$cliPath = "$wtDir\node_modules\vite-node\dist\cli.mjs"
foreach ($worldRec in $worlds) {
  foreach ($armRec in $arms) {
    $tag = "$($worldRec.name)-$($armRec.name)"
    if (-not (Test-Path $worldRec.save)) { throw "missing save $($worldRec.save)" }
    $argList = @($cliPath, 'scripts/generation_trace.ts', '--', '--load', $worldRec.save, '--days', '48') + $armRec.extra + @('--out', "$outDir\$tag.json")
    $procRec = Start-Process node -ArgumentList $argList -WorkingDirectory $wtDir -RedirectStandardOutput "$outDir\$tag.log" -RedirectStandardError "$outDir\$tag.err.log" -WindowStyle Hidden -PassThru
    Add-Content -Path $pidFile -Value "$tag $($procRec.Id) $($procRec.StartTime.Ticks)"
    Start-Sleep -Milliseconds 400
  }
}
Get-Content $pidFile
