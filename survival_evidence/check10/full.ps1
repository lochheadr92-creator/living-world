$source='C:\dev\Claude Experiment\living-world-survival-check10'
Set-Location -LiteralPath $source
& npm.cmd test -- --maxWorkers=8 *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check10\full-test.log'
$code=$LASTEXITCODE
@{exitCode=$code;finished=(Get-Date).ToString('o');command='npm test -- --maxWorkers=8';source=$source} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check10\full-test-status.json'
exit $code





