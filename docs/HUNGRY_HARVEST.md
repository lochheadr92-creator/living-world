# Harvesting known ripe grain when hungry — rules 114

Owner: `src/sim/hungry_harvest.ts`, offered before the existing discretionary
farm-work guard in `options_work.ts`. That guard suppressed all farm options when
hunger drive exceeded 30, including already-ripe personally known household grain.
Merely removing the guard would still leave the old need-null work outside the
critical-hunger relief choices. Two initial contracts failed on predecessor source:
no harvest offer, and the hungry staged person explored beside the known crop.

At rich rules 114, an adult household member with hunger drive above 30 can consider
a personally remembered ripe household plot with at least one grain and room for
one grain. Existing recent failures, travel cost, known danger, physical destination,
field claims and handler checks apply. The option names hunger as its purpose;
planting, tending and other discretionary work retain their original guards.
The ordinary harvest handler performs all travel, work, resource movement and claim
release; subsequent eating remains a separate ordinary action. Nothing grants food,
changes crop growth or discovers an unknown plot. No saved fields or random draws
are added. Earlier rules and `rich-no-hungry-harvest` retain predecessor behaviour.

## Evidence and review

Twelve contracts cover the offer, old/removal behaviour, unknown/foreign/empty/
growing crops, full packs, children, more urgent thirst, a real claimed crop changing
during work, and autonomous travel/harvest/eating across a mid-work save. Focused
harvest/ecology/economy/immutable-113 suites pass 44 tests in four files (8.10 s).
Typecheck/build pass with existing Vite native-loader and bundle-size warnings.

The rendered labelled staged scene passes 8/8. At tick 65, one physically harvested
grain has been eaten, food rises from 10 to 29.735, and the field claim is released.
The inspector explains “Harvesting grain to eat”; both screenshots were inspected.
Exact saved twins/reload, resource accounting and observer purity pass. The supplied
ripe crop and prior knowledge make this mechanism evidence, not ordinary frequency.

Fresh review traced remembered ownership/ripeness through the unchanged arrival,
claim and work revalidation. A stale growing crop stops with “field changed”, releases
its real claim and changes neither carried goods nor ledger. The initial test had
incorrectly forced the work phase without acquiring a claim; it was corrected to
actually travel, arrive and claim before the staged crop change. No runtime change
was made to accommodate that invalid fixture. More urgent thirst retains priority.

Predeclared ordinary measurement: five days each in fresh Normal river, meadow and
forest at 113 and 114, immigration off, no inserted goods, knowledge or decisions.
`scripts/hungry_harvest_observe.ts` records hunger-harvest starts/endings and grain,
120-tick known-ripe-crop opportunity samples, exact unobserved twins/reload, full item
accounting, pure inspection and frozen source hashes. Samples are repeated states,
not independent decisions; believed grain is not guaranteed physically accessible.
Harvested grain is not proof of eating. Divergent world totals do not establish
survival benefit. The six ordinary windows and full regression completed.

The retained rules-107 forest famine endpoints have no ripe plots; this discovered
choice omission has not been shown to cause that famine. Winter food and general
population viability remain open. Immutable 114 was pinned before any successor.

## Ordinary five-day results

All six windows reach tick 12,000 with 28 living people, zero deaths, 100 pure
checks, exact unobserved twins/reloads and balanced all-item accounts. Runtime
`c52d7d4`; immutable continuation `3655551` passes separately with harvest contracts,
13 tests / 2 files (15.24 s), after the full suite had already collected its tests.

| Rules | Seed | Hungry known ripe crop with room samples | Harvest offered | Ranked first | Hunger-harvest starts | Successes | Grain harvested |
|---|---|---:|---:|---:|---:|---:|---:|
| 113 | forest | 5 | 0 | 0 | 0 | 0 | 0 |
| 113 | meadow | 5 | 0 | 0 | 0 | 0 | 0 |
| 113 | river | 0 | 0 | 0 | 0 | 0 | 0 |
| 114 | forest | 3 | 3 | 2 | 1 | 1 | 2 |
| 114 | meadow | 5 | 5 | 0 | 0 | 0 | 0 |
| 114 | river | 0 | 0 | 0 | 0 | 0 | 0 |

Forest at 114 has one ordinary successful hunger harvest yielding two grain.
Meadow has offered/eligible choices but no hunger-harvest start; river has no sampled
opportunity. This establishes one ordinary activation, not frequency across seeds,
subsequent consumption or winter/population benefit. Each meadow version also has
seven hungry-known-crop samples with a full pack, and 14 total harvest starts with
six success, six failure and two interruptions. Those pre-existing boundaries were
preserved. Reports are `autonomy_evidence/harvest{113,114}-{seed}-5/report.json`;
full worlds remain local.

Full regression on the final runtime passes **357 files / 2,291 tests**, 353.77 s
(`autonomy-harvest114-full-tests.log`). Immutable 114 was added after collection;
its separate 13-test check above includes the twelve harvest contracts. The existing
Node timeout-overflow test warning occurred without a failure. No old references
were regenerated.

A further predeclared ordinary forest 45-day screen is running on this frozen
runtime in `autonomy_evidence/harvest114-forest-45`. It measures hunger harvests,
physical grain, mortality, pure observers, exact twins/reload and accounting with
no inserted supplies or decisions. Compare descriptively with the retained rules-113
forest, not as evidence of general population viability from one seed. That result
is pending and is not included in the delivered five-day evidence.

## Adverse 45-day forest result

The further frozen-114 screen completed tick 108,000 in 186.93 s, with 900 pure
checks, exact unobserved twins/reloads and conserved items. It records 143 hungry
known-ripe-crop samples: 56 with room and 87 with a full pack. Of the 56 with room,
56 offer harvesting, 55 are eligible and 31 rank it first. There are 21 actual
hunger-harvest starts, 18 successful endings and three failures, yielding 36 grain.
These are physical harvests; this observer does not attribute subsequent eating.

**All 31 people who lived in this world died; final population is zero.** The last
death is at tick 55,958, well before day 45. The retained rules-113 forest ends with
five alive and 27 deaths. These divergent single-seed totals are adverse evidence;
there is no established survival benefit, and the new choice is not a demonstrated
remedy for famine. Do not erase this result or label winter food complete. A wider
comparison and a causal trace of food access, capacity and winter supply remain
necessary before drawing a general conclusion.

Report: `autonomy_evidence/harvest114-forest-45/report.json`; complete world local.
No runtime was changed during the run. The previous pending paragraph is superseded
by this completed result, not silently rewritten as success.
