# Ordinary survival-chain diagnosis and rules 152 — 4 November 2026

Starts from published main `d95a154c` (rules 151). All runs on THEWEAPON from the active
`living-world-integrate` checkout. Diagnostic scripts here only read state; each checks that
probing did not change the serialized world.

## Chain A: body-origin preserved meat (staged, no code change)

`../body-preservation-20261104/`. The rules-151 body-origin scene that "diverted" sits about
26 tiles from any water the inhabitant knows (`gate-trace.ts`): drying is offered at tick 840
but blocked as too far from water, and from tick 960 `productionOptions` is suppressed by the
thirst drive (production.ts, drives > 30). `preservationSurplus` stays `meat` throughout. A
known household well does not help: it is beyond `WELL_REACH` of any water body. Moving the
identical layout 15 tiles north beside the known lake, with nothing else changed
(`water-variant.ts`, `near-water`), completes the chain autonomously: render fat, butcher,
deposit, dry two meat, collect two dried meat for the household reserve plan, and eat both.
Exact twin and conservation pass. The null was a rational competing need created by the
fixture, not a planning defect. No rules change was made for A.

## Ordinary limiter for chains B and C: no timber yard, so no fibre

`sheep-probe.ts` (Normal, arrivals on, rules 151, 6 days, every 600 ticks): every adult soon
holds a dated sheep memory (28/27/28 knowers in forest/meadow/river), and sheep supplies
request fibre in 398/421/440 samples, yet nobody ever holds fibre and no acquire option ever
appears. Every fibre route is blocked: "does not know of a timber yard they may use". Traps and
nets need fibre from the same yard.

Retained finals show the regression: a timber yard stands at day 25 in 25/25 rules-121 worlds
(each seed) and 23/25 rules-132 forest worlds, but 0/9 at rules 148-151.

`timber-bisect.ts` pins only `settings.rulesVersion` on unchanged source (`bisect/`, forest,
15 days): rules 132-133 have 6 huts and no yard yet; 134 has 8 huts and a yard by tick 17,104;
from 135 onward 1-3 huts, 3-6 cellars and no yard, quarry, kiln or rack.

Cause (rules 135 cellars): `cellarDemand` accepted any home, including a lean-to, with
utility 28 + min(12, food) against the hut's 11 + 4 x members + 6. A household holds one open
site, so a cellar (480 work, 9 stone) displaced its hut. `optPlanFacilities` needs an owned hut
and two known solid homes, so workshops were never planned. This contradicts `optPlanBuild`'s
documented order: shelter, then a proper hut, then improvements.

## Rules 152 repair

Commit `4106e35f`: from rules 152 a household's cellar demand waits for a standing hut or
house it knows (`src/sim/cellars.ts`). Earlier rules unchanged. Contract tests
`tests/cellar_home_order.test.ts` (red before, then green), cellar suite, and immutable 135,
151 and newly recorded 152 continuations pass (`scripts/v152_reference.ts`).

25-day pinned comparison on the same source (`bisect25/`, single draws, descriptive):

| Seed | 134 | 151 | 152 |
|---|---|---|---|
| forest | 8 huts, yard tick 17,104, 8 alive | 1 hut, 5 cellars, no yard, 5 alive | 6 huts, yard 29,565, 6 alive |
| meadow | 9 huts, yard 21,959, 31 alive | 3 huts, 6 cellars, no yard, 21 alive | 8 huts, 2 cellars, yard 26,535, 28 alive |
| river | 9 huts, yard 19,471, 25 alive | 6 huts, 7 cellars, yard site unfinished, 26 alive | 9 huts, 4 cellars, yard 24,595, 30 alive |

Population differences are single trajectories, not a benefit claim.

## Verification of rules 152

- First full suite on `4106e35f` (`review_evidence/agent-20261104-152/suite/`): exit 1, 2,863
  passed, 2 failed. Both fixtures depended on lean-to cellars: `leisure.test.ts` (one-seed
  four-day place diversity; at 151 one visit, at 152 the settlement keeps building and the first
  non-home outing is day 8) and `project_helpers.test.ts` (the stone need came from a 9-stone
  cellar; a 1-stone axe is now met by Ben before Cora can be asked). Diagnosed by running each
  fixture at 151 and 152. `8bc429b7` keeps both assertions: leisure runs nine days, and the
  scripted stub no longer falls back to asking someone else for stone. Cora still declines.
- Final full suite on `8bc429b7` (`suite-final/`): exit 0, 490 files, 2,865 tests passed,
  zero failed, 441.8 s, THEWEAPON, tracked tree clean. Typecheck/build pass (`build.exit.txt`).
- Ordinary screens, rules 152, Normal, arrivals on, 25 days, `scripts/ready_step_observe.ts`
  (`review_evidence/agent-20261104-152/{forest,river,meadow}`): each reaches tick 60,000 with
  500 pure observer checks, exact 120-tick saved continuation and conservation.

| Seed | Alive | Sheep | Gear | Carcass |
|---|---:|---|---|---|
| forest | 6 | 1 acquired | 1 net made | 1 meat eaten, 7 spoiled |
| river | 30 | 4 acquired, 10 shearings, 1 mating, 1 pregnancy, **1 lamb born**; wool garment 16,660 protection ticks | 1 net set, 2 fish caught, 0 collected; trap failed for wood | none recovered |
| meadow | 28 | 2 acquired; feed, water, tether repair, 9 shearings | 3 nets, **1 trap** made; 2 set, 4 resets, 1 fish collected | none recovered |

At rules 151 all three seeds were null for these chains. These are single trajectories:
activation, not reliability or survival benefit. Still null: preserved-meat meals, trap-meat
meals, recovery of neglected-sheep carcasses.

## Next defect (not yet repaired)

River person 1132, pack full (axe, rod, basket, seeds, 4 wood, stone), starts seven net checks
from tick 48,861 to 49,475; each ends `partial: pack is full` with no fish moved. A partial
outcome records no failure, so `gearOptions` re-offers the same trip at once
(`src/sim/passive_gear.ts`: check offered without pack room; zero-transfer check is partial).
