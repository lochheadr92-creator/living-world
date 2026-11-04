$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\dev\Claude Experiment\living-world-survival-work'
$folder='survival_evidence/continuation-20261104'
$files=@(Get-ChildItem src,scripts,tests -Recurse -File | Where-Object { $_.Extension -in '.ts','.js','.mjs','.json' }); $files+=Get-Item package.json,package-lock.json,tsconfig.json,vite.config.ts,experiments/memory-pavel-gpt5/transcript.json,experiments/baseline-pavel-gpt5/transcript.json,experiments/harsh6-tomas-gpt5/transcript.json,autonomy_evidence/helper-receipt107-first-invalid/final.json
$manifest=@($files | Sort-Object FullName | ForEach-Object { @{path=$_.FullName.Substring($PWD.Path.Length+1);hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash} })
$manifest | ConvertTo-Json -Depth 4 | Set-Content "$folder/final-source-and-fixtures-manifest.json"
$args=@('node_modules/vitest/vitest.mjs','run','--maxWorkers=8','--reporter=verbose','--reporter=json',"--outputFile.json=$folder/full-suite.json")
$record=@{started=(Get-Date).ToString('o');command=('node '+($args -join ' '));head=(git rev-parse HEAD);sourceManifest='final-source-and-fixtures-manifest.json';host=$env:COMPUTERNAME}
$process=Start-Process -FilePath node -ArgumentList $args -WorkingDirectory $PWD -WindowStyle Hidden -RedirectStandardOutput "$folder/full-suite.stdout.log" -RedirectStandardError "$folder/full-suite.stderr.log" -PassThru
$handle=$process.Handle
$process.WaitForExit();$process.Refresh()
$record.exitCode=$process.ExitCode
$record.finished=(Get-Date).ToString('o')
$record.changedSources=@($manifest | Where-Object { (Get-FileHash -LiteralPath $_.path -Algorithm SHA256).Hash -ne $_.hash })
$record | ConvertTo-Json -Depth 5 | Set-Content "$folder/full-suite-run.json"
if($record.exitCode -ne 0 -or $record.changedSources.Count -ne 0){exit 1}
