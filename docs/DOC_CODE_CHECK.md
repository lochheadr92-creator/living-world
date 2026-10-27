# Doc ↔ code discrepancies

Report only. Each entry quotes the doc line and the code file:line it disagrees with, and was checked
against `src/sim` on the branch this file was written from. No doc below was edited; this file records
the gaps so a later change can fix them with the right claim.

## 1. `docs/recipes.generated.md` is stale (missing `meat` and `spear`)

- **Doc:** `docs/recipes.generated.md` (committed) — its Item and Tool tables have no `meat` row and no `spear` row.
- **Code:** `src/sim/constants.ts:23` (`NUTRITION.meat: 26`), `:26` (`WEIGHT.meat: 1.5`), `:57` (`PERISHABLE.meat: 1.4`), `:18` (`TOOLS` includes `'spear'`), `:342` (`TOOL_DEFS.spear`).
- **Evidence:** running `npx vite-node scripts/docs.ts` adds three rows to the generated file: `meat` (item), `spear` (item) and `spear` (tool). The committed file predates the hunting/wolf-defence additions.

## 2. README's tool list omits the spear

- **Doc:** `README.md:84` — “**Tools.** Axe, pickaxe, hoe, basket, hammer, saw, water jar (iron versions of most).”
- **Code:** `src/sim/constants.ts:18` (`TOOLS` ends with `'spear'`) and `:342` (`TOOL_DEFS.spear`, hand-made and lent like the others, kept for wolf defence since rules version 4).
- **Note:** the spear is a genuine tool (wear, hand recipe, loanable) but is absent from the work-tool paragraph; the only spear-adjacent README text is under wolves.

## 3. README understates the pregnancy duration

- **Doc:** `README.md:128` — “a pregnancy lasts nine days (half an hour at 1×)”.
- **Code:** `src/sim/constants.ts:443` (`TICKS_PER_YEAR = DAY * DAYS_PER_YEAR`) and `:445` (`PREGNANCY_TICKS = Math.round(0.75 * TICKS_PER_YEAR)`). Nine days is 9 × 2400 ticks = 21,600 ticks = 2,160 s = **36 minutes**, not half an hour (30 minutes).
- **Note:** minor; the surrounding durations (“twelve days”, “2400 ticks, four minutes”, “thirteen hours to adulthood”) all check out.
