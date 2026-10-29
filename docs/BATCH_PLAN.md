# Seeing a batch through: the batch plan and getting back to a stalled batch (rules version 50)

Delivered 2026-10-29 on `main` after rules 49 (`de8af50`). Workstreams 6 and 7 (first part) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## What the ordinary worlds showed first

`scripts/chain_audit.ts`, Normal, immigration off, 45 days, rules 48, three seeds (`chain_evidence/audit-45-{seed}`):
samples every 240 ticks of every adult's planner wants (`demandsOf`) and the blocked operate/gather steps with their
reasons, plus the facilities' own records, the ledger and the ground at the end.

| seed | people wanting planks / bricks / jars / carts | planks made | bricks made | jars | handles | carts | kiln batches in 29 days | house sites at 6 % for | ore mined | smithy |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| meadow | 21 / 21 / 18 / 3 | 22 | 12 | 0 | 0 | 0 | 4 | 7.6 and 5.6 days | 0 | site, 81 % at day 45 |
| river | 21 / 17 / 16 / 6 | 30 | 3 | 0 | 0 | 0 | 1 (kiln from day 36) | 24.8 and 12.6 days | 0 | site, 6 % |
| forest | 19 / 6 / 9 / 1 | 9 | 3 | 0 | 0 | 0 | 1 | none | 0 | none |

The wants were there, the workshops stood, and every single step was on offer (dig clay, bring it to the kiln, fire
it, collect it, carry it to the site; 1,203-4,052 sampled jar wants per seed), yet the chains did not close. Two causes
were found, both structural rather than a missing recipe:

1. **No persistence between steps.** The supply planner (`production.ts`) re-derives every leaf at every decision,
   weights each stage a little less (×0.92-0.97 per step) and remembers nothing, so the person who dug clay this morning
   has no more reason than anyone else to carry it to the kiln this afternoon. A jar's whole chain sat at a weight of
   about 1 after the walk, below "potter about" at 6. Hand tools already had the remedy: a private plan (`intent.ts`)
   that persists, speaks for its materials and nudges its own next step by `NUDGE` (14).
2. **A batch nobody could get back to.** A person called away from a batch in its work phase (thirst, a wolf, night;
   the staged jar maker left at 64.5 of 70 work to drink) found the planner refusing the workshop as "busy with …",
   because `startBlocker` answered every operate with "a batch is already under way" while any job existed. The batch
   sat until the stall limit shelved it two days later; in the audits the kiln read "workshop busy" for 74 of 79
   blocked jar samples in meadow.

## Contract

Gated on `runsRulesVersion(world, 50)` and rich dynamics; the rules-49 full serialized continuation
(`tests/v49_continuation.expected.json`) was recorded from `de8af50` before any of it. Two lab switches:
`rich-no-batch-plans` (no plan is taken on; every option stays) and `rich-no-batch-resume` (a batch under way blocks
every operate as before). Owners: `src/sim/batch_plan.ts` (the plan), `src/sim/facilities.ts resumableJob` (the resume).

**The batch plan.** After food, shelter, roof and tool plans, and on the same one-a-day cooldown, an adult may take on
one batch: the planner's own best want among `planks, handles, bricks, charcoal, iron, flour, bread, jar, cart` with
base ≥ 8, at a workshop they know and may use, when the recipe's technique and tool are theirs (own pack or rack) and
every raw input the shelf and pack lack has a known source (`hasKnownResource`; a processed input they lack is not this
plan's to make: one workshop at a time). The plan records the recipe and the site the output is for (`Intention.recipe`,
`forSite`, new optional fields; absent on every other kind and below 50) and speaks for the raw inputs it still lacks
(`wants`, like a tool plan). It adds no option: each step names an option the planner already offers for the same
want, so the existing nudge recognises it: get the input (`yields`), bring it to the workshop (deposit there), run the
recipe (`operate:<workshop>:<recipe>`), get back to a batch of theirs left in its work phase, wait for a burning one, collect the output (`collect:<workshop>:<item>`),
haul what is held to the site (`haul:<site>`). It stays about its workshop whatever place a step names. It ends done when
the goods reached their use (hauled to the site, credited by `creditHauled`; in the pack; the household's cart exists),
or dropped with a stated reason: time up (three days: two trips for the inputs, the work, a burn of up to 420 ticks and the collection did not fit in two in the first ordinary runs), workshop or site no longer known, site finished or supplied another
way, no known source for an input (the rules-34 review), the rules switched off.

**One stage before, at the same workshop.** A processed input the recipe lacks (handles for a cart at the timber yard,
flour for bread at the bakery) is the plan's to make when the same workshop makes it from raw inputs the person knows
a source of (or already holds); the plan then runs that recipe first ("milling flour first, for the baked bread") and
the product recipe after. One stage only: a batch plan is one workshop, not the whole tree, so iron for a forged tool
is not made by the tool's plan while the smelting is at another's charcoal. Water counts as a known input when the
planner's own water ranking finds a spot.

**Beside a tool or roof plan.** A batch plan does not hold the one project slot against a hand-tool or roof plan:
either may be taken on while a batch is active (one extra plan in that case, rules 50 only), because the first 8-seed
lab showed the batch costing about seven hand tools per world when it did. A batch is never taken on beside another
project, and there is never more than one batch.

**Getting back to a batch.** A job in its work phase with the same recipe may be worked again by its own client at
any time, and by anyone with access once nobody has worked it for `RESUME_AFTER` (300) ticks; nothing is drawn from
the shelves again and the job keeps its inputs, progress and client (`facilities.ts startJob/startBlocker`). The planner
offers the way back to any unfinished batch of the person's own at that workshop, as they remember it ("… (get back to
it)"), instead of calling the workshop busy (`production.ts planRecipe`).

Nothing else changed: no weight, recipe, cap, capacity or stall limit; the relief guard (too far from water) and every
need still interrupt and refuse as before, which is why the staged jar maker's kiln had to be near the water.

## Tests

`tests/batch_plan.test.ts` (7 staged contracts): bricks wanted for a site with a known kiln and clay pit make a plan at 50
and none at 49; no plan without a known clay source or kiln; the full chain dig → bring → fire → collect → haul with the
plan done and the ledger conserved; a farmer's jar fired and in the pack; the switch, exact save/replay, observer purity; a
work-phase batch resumed by its maker at once and by another after the wait, blocked at 49 and with the resume switch off; a household with spare grain and a known bakery mills flour first and then
bakes bread under one plan. `tests/v49_continuation.test.ts` pins rules 49.

## Ordinary worlds and the lab

The same chain audit at rules 50 is recorded in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md. The 8-seed lab
(`chain_evidence/lab-batch/report.txt`, control + nudge + `rich-no-batch-plans`, rows are ablation − reference):

| metric | reference (with plans) | ablation | diff | 95 % | noise floor | verdict |
|---|---:|---:|---:|---|---:|---|
| workplaces | 5.4 | 5.4 | −0.1 | [−0.9, +0.8] | ±1.9 | not distinguishable from chance |
| solid homes | 9.6 | 9.5 | −0.1 | [−0.9, +0.7] | ±1.4 | not distinguishable from chance |
| buildings | 24.7 | 25.5 | +0.8 | [−0.9, +2.3] | ±4.7 | not distinguishable from chance |
| tools | 32.1 | 37.1 | +5.0 | [+1.1, +9.6] | ±8.7 | systematic, within the noise floor |
| projects done | 56.1 | 60.4 | +4.3 | [0, +9.4] | ±14.5 | not distinguishable from chance |
| deaths | 6.3 | 4.3 | −2.0 | [−5.2, +0.3] | ±3.9 | not distinguishable from chance |
| people at end | 24.3 | 25.8 | +1.4 | [−1.3, +4.6] | ±2.5 | not distinguishable from chance |
| below critical hunger at day 30 | 0.9 | 0.0 | −0.9 | [−2.3, −0.1] | ±0.8 | larger than chance; one seed, see below |

Read plainly: the tool cost of the first lab (+6.9 without plans) is down to +5.0 with the "beside a tool or roof plan"
rule and stays within the noise floor; no benefit is claimed. The one row the report marks larger than chance is
carried by a single seed: river had 6 people below critical hunger at day 30 with plans (5 in the nudge draw) and 0
without, while the other seven seeds read 0-2 everywhere. `scripts/chain_hunger_trace.ts` (logs
`chain_evidence/lab-batch/river_hunger_{plans,noplans}.log`) shows why: river is a world on the edge of famine in both
arms. Without plans the stores ran out on day 23 (4 below critical, 3 dead by day 25, mean hunger 33) and had
recovered by day 30; with plans the stores lasted to day 28 and the famine was at its worst on day 30 (5 below
critical, 1 dead, mean hunger 36). At that snapshot nobody held a batch plan: the five hungry were fishing and picking,
one of them had once held a plan, and four of the six who ever held one were not hungry. So the row is the timing of a
famine both worlds suffer, caught at the day the lab stops, not people starving at a kiln; whether the plans' labour
deepens such a famine cannot be told from one seed and is left open here.

## Limits

- The plan is one batch at a time after every other project kind, so in a busy household it is taken up rarely; the
  measure of it is the ordinary rows, not this page.
- A cart plan needs a hammer first (the recipe's tool), which is the existing hand-tool plan's job; the audits showed
  cart wanters without hammers and no hammer crafted in 45 days, so carts remain to be seen in ordinary worlds
  (workstream 7 continues from here).
- Iron, flour and bread plans need a standing smithy or bakery, which no 45-day world finished; the plan cannot make a
  workshop exist.
- No aggregate claim.
