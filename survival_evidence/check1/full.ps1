$source='C:\dev\Claude Experiment\living-world-survival-check1'
Set-Location -LiteralPath $source
& npm.cmd test *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check1\full-test.log'
$code=$LASTEXITCODE
@{exitCode=$code;finished=(Get-Date).ToString('o');command='npm test';source=$source} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\check1\full-test-status.json'
exit $code
