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
survival benefit. Full regression and six ordinary windows are being collected.

The retained rules-107 forest famine endpoints have no ripe plots; this discovered
choice omission has not been shown to cause that famine. Winter food and general
population viability remain open. Immutable 114 is to be pinned before any successor.
