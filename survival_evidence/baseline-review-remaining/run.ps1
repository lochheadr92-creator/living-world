Set-Location -LiteralPath 'C:\dev\Claude Experiment\living-world-survival-baseline'
& npx.cmd --no-install vitest run tests/zz_review_b_observer_purity.test.ts tests/zz_review_b_validators.test.ts tests/zz_review_b_validators_harsh.test.ts tests/zz_review_g_feed_caps.test.ts tests/zz_review_g_observer_purity.test.ts tests/zz_review_main_toolreport_saves.test.ts --maxWorkers=6 *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\baseline-review-remaining\test.log'
$code=$LASTEXITCODE
@{exitCode=$code;finished=(Get-Date).ToString('o');head='61cb6e5139adbedfd52f463fc635a90d4172327b';source='C:\dev\Claude Experiment\living-world-survival-baseline';scope='Six remaining review files, maxWorkers=6'} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\baseline-review-remaining\status.json'
exit $code
