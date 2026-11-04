# Rules 156 — children's work by physical task, 4 November 2026

Brain implementation list, row 2a item 1. Origin: the other agent's ordinary diagnosis
(`review_evidence/villager-age-carry-20261104/`, rules 154 meadow: Abel, five, chops wood at tick 2496)
and the five-day life-stage follow-up in the Brain (`knowledge/living-world/domain-plan-revised`).

## Rule

A child (under 12) is not offered gathering at a tree or rock. The option is withheld with
the reason "too young to chop wood or break stone" (`src/sim/child_tasks.ts`, applied in
`decision.ts rankOptions` beside the existing child limits). A gather begun or resumed at a
tree or rock is refused on the same rule (`act_resource.ts` gather `begin`), which also covers
external-controller choices. Berries, fruit, grain, fishing, water, learning, play and dressing are
unchanged. Rules 155 and older are unchanged. Lab removal: `rich-no-child-tasks`.

## Audit of other kinds (no change needed)

The broad `CHILD_FORBIDDEN` list (decision.ts) predates later activity kinds. Each later heavy or
dangerous kind already excludes children both at the offer and at execution: `hunt`
(hunting.ts:34), `butcher` (carcass.ts:39/86, carcass_supply.ts:15), `tree_work` (forestry.ts:31/66),
`animal_work` (livestock.ts:48/122/151), `gear_work` (passive_gear.ts:26/104). `exchange_journey`
excludes children and youths. Generic `gather` was the only gap.

**Youths (12-15)** are deliberately unchanged. They already keep a distinct boundary (no exchange journeys)
and otherwise work like adults; the life-stage follow-up (Dax, 15, built, farmed and traded) shows
graduated responsibility, not a defect. There is no supervision mechanism, and none is claimed.

## Evidence

- **Staged contracts** (`tests/child_tasks.test.ts`, 4 tests): a child is offered no wood or stone, with
  the reason recorded, and berries are kept, as a pure read. Youths, adults, rules 155 and the lab
  removal are unchanged. A direct assignment is refused, taking nothing and conserving goods. Save
  continuity holds.
- **Ordinary probe** (`child-work-probe.ts`, Normal meadow, arrivals on, 5 days, 9 children):
  - rules 155: 6 child wood starts (Mona, Abel twice, Rafe, Wes), 3 completed;
  - rules 156: 0;
  - child food gathering starts: 179 vs 167;
  - population: 29 vs 30;
  - exact twin and conservation hold in both.

  These are single trajectories: an activation result, not a benefit claim.
- **Rendered check, ordinary world** (`render.mjs`, `render/`):
  - the rules-156 meadow world was stepped in the page until a child's own decision withheld heavy work;
  - Mona, 9, at tick 767 (the child who chopped at 766 under rules 155) shows "Chopping wood to keep the fire going — too young to chop wood or break stone" under Blocked options in the debug panel;
  - no child heavy starts; pure; no exceptions.

  The first attempt (`render-attempt1-tick-equality.json`) found nothing because the script compared the decision tick after `stepWorld` had advanced it; this is retained.
  Viewer limit: the reason is visible in the debug decision panel. The ordinary viewer sees the absence of small children chopping wood.
- **Immutable v156 reference:** meadow, recorded while 156 was current.
- **Full suite** (`../agent-20261104-156/suite/`): exit 1, 2,871 of 2,884 pass, 10 failed.
  - Cause 1: the retained rules-107 famine fixture, which is ignored by git, was absent from the new worktree again. It was restored unchanged (SHA-256 `c24c9d0e40b60ec9...`, identical to the main checkout).
  - Cause 2: spawn and long-test timeouts under full-suite load.
  - All six affected files rerun alone: 13 of 13 pass, exit 0 (`../agent-20261104-156/isolated/rerun.log`).
- **25-day screens** (Normal, arrivals on; `../agent-20261104-156/`): river and meadow (source `29413209`) and forest (rerun on `b6e15b3c`) each reach the horizon, with 500 pure observer checks, exact continuation and conservation. Single trajectories; forest still loses 26 people, the known chronic forest collapse.
- **The first forest screen failed** (`forest-attempt1-*`, retained) at the horizon save reload with "Invalid final account water". This is a latent rules-144 defect, not 156 behaviour: world generation dates founders' starting knowledge before tick 0, and Nico (a founder) died at tick 54,675 nearest a water memory seen at -50. Diagnosis: `final-account-water/` (the first finder attempt's filter missed it and is kept as well). Fixed load-side in `b6e15b3c` with a regression test; no rules change.
