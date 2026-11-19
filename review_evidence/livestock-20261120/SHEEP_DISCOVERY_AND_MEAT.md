# Aspen sheep discovery and meat consumption

Rules 262, ordinary Aspen, grain boost and arrivals on. The butchery commit is 4ce51e86 on codex/withdraw-baseline-20261119. The instrumented copy included the local workshop source used in the original replay. All 15 daily hashes matched salvage-timing.jsonl, and all 19 daily conservation checks passed.

## Discovery

Sheep 1143 died at tick 27,843 on tile (44,46). Dax saw the body while cutting hay at 28,293, 450 ticks later. Five more people from other households saw it before Kira. Private carcass ownership restricted butchery to household 1086. Kira’s first observation was during tick 28,765. The earlier end-of-step sample recorded it at 28,766, giving the reported 923 ticks.

| Member of household 1086 | Scheduled perception checks | Indoors | Outdoors, beyond sight | Outdoors, within sight |
|---|---:|---:|---:|---:|
| Kira | 308 | 196 | 111 | 1 |
| Ben | 308 | 193 | 115 | 0 |
| Arlo | 307 | 275 | 32 | 0 |

Indoor perception covers the room. Outdoors, the engine compares the distance to the body with the person's current sight radius. Kira spent 499 of the sampled ticks asleep inside and 87 resting inside. Her trip for water and time sheltering by the hut kept her outside sight range. Bringing grain to the barn took her past the body. At 28,762 the body was 7.69 tiles away and she could see 7.46 tiles. At 28,765 it was 7.31 tiles away and she could see 7.50. Kira selected butchery 40 ticks after the recorded household sighting.

## Destination of every portion

The earlier timing probe recorded the first worker on a body. Per-cut events show that Ben also worked on the sheep.

| Worker and eater | Source | Cut ticks | Eating ticks | Destination |
|---|---|---|---|---|
| Kira | Sheep 1143 | 28,953; 29,073; 29,940 | 29,170; 29,180; 33,143 | Personal pack |
| Ben | Sheep 1143 | 29,707 | 31,571 | Personal pack |
| Mona | Chickens 1147, 1146, 6175 | 29,957; 32,945; 35,382 | 29,967; 34,309; 35,812 | Personal pack |

The seven cuts account for every meat addition to those packs during these sequences. Each corresponding removal was a successful personal eating action. Kira briefly held two portions from the same sheep. No unrelated raw meat entered any of the three stacks. None of the seven was handed over, deposited in a household store, set out at a shared meal or spoiled. This conclusion covers this replay.

## Evidence and reproduction

discovery.json contains the perception checks, first direct sightings, meat mutations, successful consumption records and daily hashes. Ticks in this report are engine event ticks except for the explicitly labelled end-of-step sighting. From the feature checkout, run the following PowerShell commands.

~~~powershell
$out = Join-Path $env:TEMP ('aspen-discovery-' + [guid]::NewGuid())
python review_evidence/livestock-20261120/discovery_setup.py $out
New-Item -ItemType Junction -Path "$out/node_modules" -Target (Resolve-Path node_modules) | Out-Null
Push-Location $out
try { node node_modules/vite-node/dist/cli.mjs discovery.ts "$out/discovery.json" }
finally { Pop-Location }
~~~

