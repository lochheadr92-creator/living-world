Set-Location -LiteralPath 'C:\dev\Claude Experiment\living-world-hearth-check1'
& npm.cmd test -- --maxWorkers=8 *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\hearth-check1\full-test.log'
$code=$LASTEXITCODE
@{exitCode=$code;command='npm test -- --maxWorkers=8';source=(Get-Location).Path;finished=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\hearth-check1\full-status.json'
exit $code
