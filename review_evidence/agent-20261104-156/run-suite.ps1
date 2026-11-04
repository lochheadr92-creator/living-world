Set-Location "C:\dev\Claude Experiment\living-world-child"
$o="review_evidence\agent-20261104-156\suite"
& npx.cmd vitest run --reporter=json --outputFile="$o\full-suite.json" 2> "$o\full-suite.stderr.log" | Out-Null
"$LASTEXITCODE" | Out-File -Encoding ascii "$o\full-suite.exit.txt"
