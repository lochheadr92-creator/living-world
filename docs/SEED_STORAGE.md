# Pack capacity and useful seed storage — rules 58

## Diagnoses, before changing rules

Rules-57 fixed river/Normal at day 45 retained hammer plans that ended short of stone.
Ben and Petra had packs at 17.5/18 and 16/18, including 12 and 26 seeds, known stone
sources and known household homes. `seed_capacity_trace.ts` continued that exact save
for one day without intervention: 60 samples of three people, 50 activity starts,
exact twin continuation, conservation and observer purity all passed. Ben lacked room
for one stone in 8/20 samples and Petra in 4/20; eating sometimes freed space. This
is an intermittent acquisition gap, not proof that capacity caused every failed plan.

The existing `leave_heaviest.ts` only puts down unneeded wood or stone. Farming can
withdraw seeds from a home but had no matching spare-seed deposit. This new option
connects those existing physical stores and farming choices. It does not replace
leftover-material handling, invent a shared pack, or discard seeds or tools.

The first physical contract then exposed a separate execution defect: hand crafting
checked capacity for the output before subtracting its consumed wood and stone.
The result would fit, but the craft failed. `act_build.ts` now checks the actual
post-consumption weight before moving any goods. Recipes, capacities, work times
and tools' weights are unchanged; a genuinely overweight result still fails.

## Contract and owners

- `seed_storage.ts` owns the bounded storage option and its reserve calculation.
  `options_work.ts gatherMaterial` calls it only for an actual wanted raw material
  with a personally usable source and no room for one unit. Existing need/work gates
  still apply. Only a personally remembered household home with enough believed room
  is considered. A recent failed visit is avoided for 300 ticks.
- Keep three seeds (the existing home-withdrawal batch), or one per personally known
  household plot if greater. Keep additional quantities for active promises and plans.
  A seed errand prevents this option. No global plot count or hidden home stock is
  consulted by the new calculation. Unknown plots cannot change the reserve.
- Store only the remaining seed, at one known home. The offered amount must free room
  for at least one unit of the wanted material. Other options retain their scores;
  storage uses the existing leftover-material option's 0.85 urgency convention and
  walking/danger costs. Multiple material needs do not create duplicate storage choices.
- `act_resource.ts` executes the ordinary deposit with physical travel/work and ledger
  transfer. At transfer it rechecks household identity, home type/ownership, current
  seed reserves and actual capacity. New promises can reduce or cancel the transfer.
  An interrupted or failed trip leaves undeposited goods in the pack; death uses the
  existing physical estate/pile path. No delivery or civic credit is manufactured.
- The existing farming options and `withdraw`/`plant` handlers retrieve and use stored
  seeds. This change adds no remote collection, guaranteed waiting, crop yield boost
  or exemption from access, travel, work, hunger or danger.
- The missing-capacity explanation now appears among the person's recorded material
  blockers. It is dated as historical in the viewer after the decision, as other
  recorded blockers are; a later successful deposit does not rewrite old history.

## Persistence and compatibility

Rules 57 and older retain previous selection and crafting semantics. The immutable
rules-57 reference was captured at `d5eeadd`, committed at `8dd1373`, before changing
behavior. It pins an ordinary river world and an active hammer craft.

There is no new person, household, inventory or global-planner state. A selected
deposit uses existing `Activity.data` with `seedStash: true`, `seedOwner` (the consenting
person's household at selection), normal `items` and `leftAt`. These travel with the
existing saved/hashed activity, are consumed by the deposit handler and disappear
through the existing activity lifecycle. Only that person knows the intended trip;
the home's actual stock changes only on transfer. No cache is authoritative.

Lab `rich-no-seed-storage` removes only new offers; an already selected saved trip
still revalidates ownership and seed protection. `rich-no-craft-capacity` restores the
old pre-consumption check. These are separate removals so later measurements need not
attribute the two changes to one another. No paired-control/nudge measurement has run.

## Contract and rendered evidence

`tests/seed_storage.test.ts`: ten contracts, including the historical boundary,
observer purity, an exact travelling save continuation, physical storage→gathering→
hammer, physical storage→three plantings→withdrawal→new plot→planting, unknown homes
and sources, reservations, changed promises/ownership/full store, interruption,
death, ablation and genuinely overweight craft output. The existing seven workshop
prerequisite tests and immutable rules-57 reference pass alongside them (18/18).

`node scripts/browser/seed_storage_check.mjs http://127.0.0.1:5286/ viewer_evidence/seed58`
passes 6/6. Screenshots of the stored seed and fourth planted crop were visually
inspected. The inventory, home, field preparations, family size and workshop demand
are explicitly staged. Actual offered actions pass through the inhabitant selection
boundary; work/travel/consumption are real, but this is not spontaneous selection.
Same-Chromium travelling continuation and full-save viewing purity both pass.

Review findings are preserved: the pre-consumption craft capacity defect was fixed;
the first negative fixture deleted a belief without its index (use `delBelief`);
two fixtures re-snapshotted initial goods after recording seed creation (removed that
second snapshot). Assertions were retained. The diagnostic script initially imported
the home-type helper from the wrong module; its correct owner is `constants.ts`.

Ordinary results and the final full-suite boundary are recorded in the programme
register, not inferred from these staged journeys. Remaining pack constraints include
tools and other goods, unknown/full stores, conflicting real needs and sources that
have changed. No claim is made that every hammer, cart or household now succeeds.
