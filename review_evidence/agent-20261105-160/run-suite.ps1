Set-Location "C:\dev\Claude Experiment\living-world-carry"
$o="review_evidence\agent-20261105-160\suite"
& npx.cmd vitest run --reporter=json --outputFile="$o\full-suite.json" 2> "$o\full-suite.stderr.log" | Out-Null
"$LASTEXITCODE" | Out-File -Encoding ascii "$o\full-suite.exit.txt"
