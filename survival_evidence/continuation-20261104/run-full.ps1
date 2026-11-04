$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\dev\Claude Experiment\living-world-survival-work'
$folder='survival_evidence/continuation-20261104'
$files=@(Get-ChildItem src,scripts,tests -Recurse -File | Where-Object { $_.Extension -in '.ts','.js','.mjs','.json' }); $files+=Get-Item package.json,package-lock.json,tsconfig.json,vite.config.ts
$manifest=@($files | Sort-Object FullName | ForEach-Object { @{path=$_.FullName.Substring($PWD.Path.Length+1);hash=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash} })
$manifest | ConvertTo-Json -Depth 4 | Set-Content "$folder/final-source-manifest.json"
$record=@{started=(Get-Date).ToString('o');command='npx vitest run --maxWorkers=4 --reporter=verbose';head=(git rev-parse HEAD);sourceManifest='final-source-manifest.json';host=$env:COMPUTERNAME}
& npx vitest run --maxWorkers=4 --reporter=verbose *> "$folder/full-suite.log"
$record.exitCode=$LASTEXITCODE
$record.finished=(Get-Date).ToString('o')
$changed=@($manifest | Where-Object { (Get-FileHash -LiteralPath $_.path -Algorithm SHA256).Hash -ne $_.hash })
$record.changedSources=$changed
$record | ConvertTo-Json -Depth 5 | Set-Content "$folder/full-suite-run.json"
if($record.exitCode -ne 0 -or $changed.Count -ne 0){exit 1}
