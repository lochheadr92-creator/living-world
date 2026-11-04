Set-Location -LiteralPath 'C:\dev\Claude Experiment\living-world-survival-baseline'
& npx.cmd --no-install vitest run --maxWorkers 4 tests/zz_review_a_tools.test.ts tests/zz_review_a_flood_tools.test.ts tests/zz_review_b_undefined_keyorder.test.ts tests/zz_review_f_acquire_double_count.test.ts tests/zz_review_g_ledger_endings.test.ts tests/zz_review_main_site_fate.test.ts tests/zz_review_b_roundtrip.test.ts tests/zz_review_g_stale_blocked.test.ts *> 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\baseline-review\test.log'
$code=$LASTEXITCODE
@{exitCode=$code;head='61cb6e5139adbedfd52f463fc635a90d4172327b';finished=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath 'C:\dev\Claude Experiment\living-world-integrate\survival_evidence\baseline-review\status.json'
exit $code
