# Public food counts: a meal from a witnessed storehouse (rules version 49)

Delivered 2026-10-29 on `main` after rules 48 (`53b06ec`). Workstream 8 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Extends rules 42
([EXPERIENCE_CONNECTIONS.md](EXPERIENCE_CONNECTIONS.md)), which recorded one personal benefit per witnessed public
storehouse project, but only on a material `withdraw`.

## What was missing

Ordinary public food use runs through `eat_store`, not `withdraw`: in 30 days of a rules-43 river world the public
storehouse saw 43 meal starts and 5 withdrawals, and the earlier civic food diagnosis (`scripts/civic_food_diagnosis.ts`)
found meals from public stores by people who had witnessed the storehouse finished and were owed nothing for them. So a
storehouse that fed somebody who had helped raise it or seen it finished changed nothing in how they later weighed its
organiser.

## Contract

Gated on `runsRulesVersion(world, 49)` and rules-42 civic benefit; the rules-48 full serialized continuation
(`tests/v48_continuation.expected.json`) was recorded from `53b06ec` before it. Lab switch `rich-no-civic-food-benefit`
(removes the meal receipt only; withdrawal receipts and the physical food are untouched). Owner `src/sim/civic_benefit.ts`
(`recordCivicFoodBenefit`), one call site in the `eat_store` handler's `onEnd` (`act_resource.ts`).

- **The event boundary.** Food that actually left a public storehouse (`hhId 0`, type `storehouse`) for this person
  during a meal there: units moved into their pack at the start of the meal (recorded as `a.data.took` when the meal
  begins, rules 49 only, since activity data is saved), plus units eaten at the store because the pack was full. It is
  counted once, when that meal ends, with the kind eaten and the total that moved. Arriving, an empty store, a meal that
  moved nothing, and a meal at a private or household store count nothing.
- **Attribution.** Only a person whose own `civicOutcomes` hold a witnessed successful completion of that building
  (rules 42's record) can receive it; the organiser named is the one that record names. Nothing is inferred from the
  world's current coordinator or anyone else's memory.
- **Bounds.** One receipt per project (`memory.benefit` set once, by whichever came first: a withdrawal or a meal);
  the civic-experience total stays within ±0.12 as before, so repeated meals cannot farm credit. The log line says
  "I ate 2 berries" where a withdrawal says "I collected 2 bricks".
- **What it changes later.** The same two consumers as rules 42: the recruit response note ("remembers benefiting
  from their earlier shared storehouse") and `civicExperience` (+0.04), which `civic_decision.ts` reads when weighing
  rival coordinators.

No new state beyond the existing `benefit` record; no save-format change.

## Tests

`tests/civic_food_benefit.test.ts` (4 staged contracts): a witness's meal from the pack path earns one receipt by
exactly what moved, raises civic experience from 0.04 to 0.08, and a second meal earns nothing; a meal eaten at the
store with a full pack counts the bites actually eaten when the meal ends; an empty store or an unwitnessed store earns
nothing; the switch, exact save/replay and observer purity. `tests/civic_benefit.test.ts` (rules 42) and
`tests/v48_continuation.test.ts` unchanged and passing.

## Ordinary worlds and the lab

`scripts/civic_food_observe.ts`: public storehouses, witnessed completions, public meal starts and withdrawals, units
that left public stores by kind, meals by witnesses, and receipts split by meal and withdrawal. The 8-seed lab harm
check runs `rich-no-civic-food-benefit` against control and nudge. Both are recorded in the slice log of
DEPENDENCY_CHAIN_PROGRAMME.md.

## Limits

- A receipt needs a witnessed completion, which needs a public project to finish while the person was near it; in
  Normal worlds that is two to three people per storehouse, so receipts stay rare. That is the attribution rule
  working, not a defect.
- Halls and granaries earn no receipt: a hall's benefit is gathering and information, a granary's is preservation, and
  neither has a single attributable transfer to a person; they are judged through their use, not awarded credit.
