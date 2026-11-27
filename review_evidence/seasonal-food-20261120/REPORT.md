# Item 4 · Wild-food renewal in lean seasons and winter

Both settlements collected and ate more portions in the moderate trial. River spent less waking time hungry. Aspen spent more, especially during winter, and ate less total nutrition. These two starts support keeping the candidate for comparison. They give no consistent hunger improvement to justify a new default.

## Natural settlements

Each cell shows control → moderate over 36 days. Both arms use Normal, arrivals on, frozen rules 266 at `9b96ae61`, and item 3's base grain setting. Each seed passes through three winters and one naturally occurring lean season. The candidate changes only wild berry bushes, fruit trees, fish spots and grain. Lean renewal retains 40% of ordinary speed, up from 10%. Peak winter retains 60%, up from 40%. Crop yield, harvest rules, starting food, dry-spell factors, carrying capacity and behaviour are identical at launch. What people subsequently choose is free to diverge.

| Measure | Aspen | River |
|---|---:|---:|
| Wild portions regrown | 4,599 → 4,816 | 5,583 → 5,824 |
| Wild portions gathered into packs or eaten at the source | 4,382 → 4,552 | 5,084 → 5,450 |
| Field grain harvested, counted separately | 1,068 → 1,227 | 1,139 → 1,228 |
| All food portions eaten | 4,135 → 4,238 | 4,775 → 4,883 |
| All nutrition eaten | 76,902 → 76,370 | 85,386 → 86,228 |
| Waking person-time with hunger below 62 | 53.36% → 53.92% | 53.61% → 48.84% |
| Same measure during the 12 winter days | 55.46% → 58.29% | 59.52% → 52.94% |
| People alive at the end | 52 → 53 | 59 → 63 |
| Deaths over the run | 0 → 0 | 0 → 0 |

| Change in portions people actually ate, across all meal types | Aspen | River |
|---|---:|---:|
| Berries | +239 | +33 |
| Fruit | −54 | +57 |
| Fresh fish | −110 | −62 |
| Raw grain, wild and cultivated combined | +46 | +58 |

A fish provides 28 nutrition and a berry 12. The mix explains how the number of portions can grow while total nutrition falls. The observers count stock taken at its source and consumption at its destination. Grain loses its wild or field origin when stocks merge. Milk, bread, preserved foods and other foods are included in total intake. Run totals also reflect changes in settlement population. Neither the meal ledger nor the population count alone establishes a survival effect.

River experienced 5,484 ticks (2.29 days) with both lean conditions and winter depth above zero. Aspen's 11,084 lean ticks all fell outside winter. The two settlements therefore exercised different weather histories. Across the 12 winter days, all-food intake was 26,708 → 26,562 in Aspen and 29,658 → 30,954 in River.

## Physical checks

At peak winter on maximally worn ground in a lean season, the seasonal and ground factors multiply to 1.45% of normal pre-modifier renewal in the control and 8.70% in the trial. Ground still delivers only 36.25% of the equivalent healthy tile. Crop climate factors retain 7.5% at that same lean/winter point before temperature and care. The food factor outside winter and hardship is 1 in both arms.

In a fixed, depleted but watered Aspen fishing spot, one fish regrew after 3,966 → 661 source updates on the Normal map and 1,121 → 187 on the Town map. Town places 11 spots here with a 65-tick base interval versus Normal's 230. These are single-spot checks with weather, wear and season held fixed. Emptying the supporting water eliminated the fish present and produced zero new fish under all four conditions. The habitat test is separate from ordinary village yields.

## Verification and reproduction

Each of the four natural runs passed world conservation and every food balance every day. Confirmed eaten portions, including shared meals and hand-feeding, reconciled exactly to the nutrition intake hooks on all 144 days. Replay matched all 144 daily world hashes. For the first 12 days on each control all 24 archived item 3 hashes matched. On the working branch 59 existing ecology, food-budget, environment, plenty, growth and lean-year tests passed in seven files. Product source and saved-world rules were not edited for this experiment.

From the feature checkout in PowerShell, select a fresh scratch directory. The preparation step reads the frozen git tree and the two archived item 3 controls beside this evidence directory. The four probes can run concurrently, each writing to its own file.

```powershell
$repo = (Get-Location).Path
$evidence = Join-Path $repo 'review_evidence/seasonal-food-20261120'
$scratch = Join-Path 'C:/dev/_claude_scratch' ('seasonal-food-' + (Get-Date -Format yyyyMMdd-HHmmss))
python "$evidence/prepare.py" $scratch
Push-Location $scratch
try {
    node "$repo/node_modules/vite-node/dist/cli.mjs" contract.ts
    foreach ($seed in 'aspen','river') {
        foreach ($arm in 'control','moderate') {
            node "$repo/node_modules/vite-node/dist/cli.mjs" probe.ts $seed $arm "$scratch/$seed-$arm.json"
            if ($LASTEXITCODE -ne 0) { throw "Failed $seed $arm" }
        }
    }
    Copy-Item "$evidence/summarize.py" $scratch
    python "$scratch/summarize.py"
} finally { Pop-Location }
```
