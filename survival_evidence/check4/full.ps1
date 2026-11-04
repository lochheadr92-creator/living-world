$source='C:\dev\Claude Experiment\living-world-survival-check4'
Set-Location -LiteralPath $source
& npm.cmd test *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check4\full-test.log'
$code=$LASTEXITCODE
@{exitCode=$code;finished=(Get-Date).ToString('o');command='npm test';source=$source} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check4\full-test-status.json'
exit $code
