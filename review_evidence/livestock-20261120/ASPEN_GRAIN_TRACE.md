# Where Aspen’s extra grain went

Normal Aspen, rules 261, arrivals on, 28,800 ticks per run. Both arms can make feed. Only the wild and field grain boost differs. The trace instruments a disposable copy of the feature checkout; it records grain-specific ledger calls, keeper decisions and animal life histories. Counts are from these two deterministic histories.

## Grain budget

Both settlements began with 89 grain. Previous yields produced 479 units over the run and raised yields produced 708. Grain units share an inventory stack, so individual grains lose their source identity after transfer. The whole-world difference reconciles exactly.

| Grain destination | Previous yields | Raised yields | Difference |
|---|---:|---:|---:|
| People ate, including at the source | 270 | 360 | +90 |
| Saved as seed | 41 | 37 | −4 |
| Mixed into livestock feed | 16 | 14 | −2 |
| Fed directly or used to lead livestock | 5 | 7 | +2 |
| Spoiled in storage, on the ground or on a plot | 67 | 84 | +17 |
| Remaining on wild patches | 110 | 176 | +66 |
| Remaining on field plots | 0 | 68 | +68 |
| Remaining in packs | 17 | 26 | +9 |
| Remaining in buildings | 42 | 25 | −17 |
| **Total, including starting stock** | **568** | **797** | **+229** |

Field rot rose from 1 to 25 grain, storage spoilage fell from 65 to 59, and loose spoilage fell from 1 to 0. Across human consumption and final stocks, most of the increase went to eating and grain still standing in the landscape.

## Feed decisions

One mixing job takes one carried grain and makes two portions. A keeper needs spare grain, more than two edible units in their pack, and an own enclosure they believe needs stocking. The planner checks each remembered enclosure and can check it several times before choosing a job. In the previous/raised runs, 68/75 station checks passed the mixing gate. At launch, feed was among ranked choices 26/33 times, and the person chose mixing 18/15 times. Food and drink won six competing decisions in each run. In the raised run, sleep, building or laying out a site, giving, gathering and hauling together won eleven more. The previous run recorded one harvest and one other animal job beside the food and drink choices. These counts describe decisions with a feed option present; one person's alternatives can change many times.

The founding coop completed six/five batches and the barns together ten/nine. Prepared portions eaten were 20/21. Both arms spent 21 raw grain directly or indirectly on animals when including grain to lead them. Some barn work prepares for a prospective animal. A completed batch can therefore fill a trough that has no resident yet.

## Housed animals

Both runs housed the founding hen and rooster at coop 1157 and acquired the same sheep, 1143. The sheep died at tick 27,843 in each run with water at zero and substantial food remaining. The first four chicks hatched at exactly the same ticks in each arm. Three of those four died in each, and one survived. The previous-yield hen then began a fifth brood at tick 25,974 and chick 10651 hatched at 27,631. This chick accounts for the entire four-versus-three difference at day 12.


**Why the fifth brood was missed.** At tick 25,974 both hens had accrued 2,423 egg-production ticks (one egg needs 2,400), had finished their recovery, and both pairs had food above the breeding minimum of 11. At previous yields the hen and rooster had 1.29 and 0.57 water. At raised yields both had 0.29, below the 0.5 each needs. The raised-yield coop was empty at all 24 scheduled checks from this tick through day 12, and both birds stayed below the water threshold. Egg collection at ticks 27,383 and 28,412 came after the first missed opportunity. The trace establishes the immediate water constraint. It does not identify which earlier household water-carrying decisions led to it.

Of the 18 previous-yield mixing jobs started, 16 finished, one found a stocked or full trough and one was interrupted by danger. Of 15 raised-yield starts, 14 finished and one switched to another activity.

## Verification and replay

The final trace matched all twelve recorded daily hashes in each arm and passed all 24 conservation checks. The day-12 hashes are f07b5016 and b18292a9. The trace used the working source that produced the earlier evidence, including the separate local workshop edits. To reproduce it in PowerShell from that checkout:

~~~powershell
$traceDir = Join-Path $env:TEMP ("aspen-grain-" + [guid]::NewGuid())
$evidence = (Resolve-Path review_evidence/livestock-20261120).Path
python "$evidence/trace_setup.py" $traceDir
New-Item -ItemType Junction -Path "$traceDir/node_modules" -Target (Resolve-Path node_modules) | Out-Null
Push-Location $traceDir
try {
  foreach ($arm in 'base','boost') {
    node node_modules/vite-node/dist/cli.mjs trace.ts $arm "$traceDir/replay-$arm.json"
  }
} finally { Pop-Location }
~~~
