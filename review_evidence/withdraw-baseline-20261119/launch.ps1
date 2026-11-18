$ErrorActionPreference = 'Stop'
$root = 'C:\dev\lw-withdraw-baseline-20261119'
$outdir = 'C:\dev\lw-withdraw-baseline-20261119\review_evidence\withdraw-baseline-20261119\runs'
New-Item -ItemType Directory -Force -Path $outdir | Out-Null
foreach ($seedName in @('aspen', 'river', 'gen-4')) {
  foreach ($startDay in @(48, 96)) {
    $id = "$seedName-day$startDay"
    $save = "C:/dev/lw_saves/rules256/$id.save.json"
    $out = "$outdir\$id.json"
    if (Test-Path -LiteralPath $out) { throw "Output already exists: $out" }
    $arguments = @('node_modules/vite-node/dist/cli.mjs', 'scripts/withdraw_baseline.ts', '--', '--load', $save, '--days', '13', '--out', $out)
    $p = Start-Process node -ArgumentList $arguments -WorkingDirectory $root -RedirectStandardOutput "$outdir\$id.stdout.log" -RedirectStandardError "$outdir\$id.stderr.log" -WindowStyle Hidden -PassThru
    [pscustomobject]@{name=$id; pid=$p.Id; output=$out} | ConvertTo-Json -Compress | Add-Content "$outdir\processes.jsonl"
  }
}
