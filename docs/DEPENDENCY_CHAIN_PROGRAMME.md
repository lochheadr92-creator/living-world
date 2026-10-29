# Dependency-chain programme register

Started 2026-10-29 from `main` `7625337` (rules 44) in `C:\dev\Claude Experiment\living-world-integrate`.
Owner brief: complete understandable situations, need → informed choice → physical action → useful outcome → remembered
consequence → changed future behaviour, across the workstreams below. This file is the continuation point: every row stays
until its evidence is recorded, and a row never disappears because it is hard.

Status fields (each row carries all six): **Impl** implemented · **Contract** contract-tested · **E2E** connected end to end
in one staged physical run · **Ordinary** observed in an ordinary seeded world (with denominators) · **Rendered** inspectable
and understandable in the page · **Aggregate** benefit measured (paired control/nudge) or explicitly unproven.
Values: `no`, `partial`, `yes`, `n/a`, `unproven`. Historical rules-43 runs are leads, not acceptance baselines (section 14).

Dated evidence reused here is from `docs/EXPERIENCE_CONNECTIONS.md`, `docs/STORED_MATERIAL_CONNECTIONS.md`,
`docs/MEANINGFUL_CONNECTIONS.md`, `docs/SIX_STAGE_COMPLETION.md`, `docs/HOUSEHOLD_HOME.md`, `docs/HABITATION.md`,
`docs/ECONOMY.md`, `docs/RELOCATION.md`, `docs/CIVILISATION_IMPLEMENTATION.md` and the rules-43 day-30 saves under
`inhabitant_evidence/connections-natural-30-*`.

## Baseline (section 1)

- HEAD `7625337` on `main`, rules 44, 18+ commits ahead of `origin/main` `39c3027`, nothing pushed by this programme.
- Tracked tree clean; 72 untracked evidence directories/logs from earlier slices left as found. `gate_v35/` and
  `connection-civic-food-diagnosis.json` untracked, left as found.
- Other worktrees untouched: `living-world` (dirty, `deepseek-b1`), `living-world-winter-shelter-v34` (`f33cd0b`, its rules
  "34" collides with main's 34), Codex worktrees.
- Rules-44 natural request → lesson → charcoal chain (Pia/Hana, meadow) preserved; nothing in this programme touches
  `background.ts` or `techniques.ts` instruction semantics.

## Workstreams

### WS2 Food assistance, household distribution, eating
- **Current implementation.** Ask: `options_social.ts optRequest/tryNeed` (hunger drive ≥ 26, no good self option).
  Answer: `social.ts evaluateRequest`. Promise: `addCommitment(kind 'deliver', destKind 'person')`. Execution:
  `options_work.ts` deliver branch (give when held; otherwise `foragePlans(mode 'stock')`). Delivery: `social.ts`
  `give` handler, credits `cm.delivered`/`req.delivered` from what actually moved. Eating: `options_survival.ts optEat`.
- **Confirmed root cause.** For `food`/`care`, `item = pickFood(B.inv)`; an empty-handed helper returns `no_item` at the
  `if (!item)` guard before the fetch branch, so promise-to-fetch is unreachable for them. The fetch branch also substitutes
  `'berries'` blindly, and the execution forages any food kind while the give needs the exact kind.
- **Contract (rules 45).** A willing, capable helper with no spare food may promise a food kind they personally know a
  usable source of (own beliefs only: berry bush, fruit tree, wild grain, fish spot with est ≥ 2; own-household home or
  public storehouse remembered holding that food). The commitment names that kind; execution forages/collects that kind;
  delivery and credit unchanged. Willingness, drive, commitment caps, dependant reserves, reservations unchanged.
  Lab switch `rich-no-food-fetch`. Owner: `src/sim/food_help.ts`.
- **Also in rules 45 (same slice).** `optEat`/`optCare` count every edible kind, so meat and bread in a pack can be
  eaten and brought to a dependant (before 45 `foodCount` saw only the four wild kinds). A dependant who is hungry or
  thirsty, sees no good way to see to it alone and has no household adult in sight may go to where they believe one is
  (`welfare.ts seekCarerOptions`, an ordinary `visit`; arriving hands over to the ordinary ask and care). Lab switch
  `rich-no-seek-carer` isolates the seek; the eat/care counting has no switch.
- **Examined and preserved.** Hungry people holding food but not eating (hungry-with-food samples below) are adults at
  hunger 20-29 keeping 1-3 units for dependants while gathering more (`optEat` keep rule); nobody below 20 held food
  without an eat option; none of the rules-44 deaths with food in the pack was a hunger death (wolf, thirst, exposure).
  Household distribution: the one hunger death in river (Eli, 5) had two household members 30 tiles away holding 14
  spare units who had a stale "missing" worry and never saw him; the mother was starving herself. That is the gap the
  seek step addresses from the dependant's side; nothing is made omniscient and the adults' own priorities are unchanged.
- **Dependencies.** None. **Downstream.** WS5 (contact/meeting), WS8 (public food benefit).
- **Status.** Impl `yes` · Contract `yes` (11 cases, `tests/food_help.test.ts`) · E2E `yes` (staged fish and berry
  chains: promise → forage → delivery credited once → eaten; seek → found → cared for) · Ordinary `yes` (table below) ·
  Rendered `yes` (headless page check 5/5, screenshots) · Aggregate `unproven` (no paired control/nudge run; the same-seed rules-44 rows below are
  not a controlled comparison, the worlds diverge after the first promise).

### WS3 Seasonal preparation, preservation, resilience
- **Current.** `provision.ts` rules-2 `stock` plan: target `min(4 × 1 day × members, 12, store room)`; cue = visible
  shortage or deterministic pre-winter window. Measured: store food/person entering winter 1.62 vs 0.83, no welfare benefit
  shown (`prep_out12`). Winter: regrowth 40 %, crops 30 %, stored spoilage ×3 (`hardship.ts`), low home condition raises
  spoilage. Granary shares and spoilage multiplier in `facilities.ts`.
- **Gap.** Target is a one-day cushion; access during scarcity, spoilage and replenishment not traced separately.
- **Diagnosis (rules 45, three seeds, 30 days).** About half of everything put into home stores spoiled before it was
  eaten (531/1113, 512/1076, 205/465 units; berries ~60 % of the loss, grain next); season plans reached the one-day
  cushion in about half the cases; hardship plans churned (45 % never put anything by in their two days); the granaries that
  stood were empty because nobody could eat from one; stores were empty at every winter's end. Preservation, not the
  target, was the real constraint.
- **Contract (rules 46, `docs/WINTER_RESERVE.md`).** Season target two days' eating (cap 20, bounded by room unless a
  granary is known), window three days; a season plan gathers grain when it knows a wild grain source, takes grain to a
  known granary (share counts as reserve, deposit credited), and a household eats from the granary within its share or the
  emergency ration, booked unit by unit. Hardship cue untouched. Switch `rich-no-winter-reserve` (one strategy, removed
  together). Owner `src/sim/provision.ts`; `intent.ts` stock step/outcome, `production.ts optGranaryStore`,
  `options_survival.ts eat_store`, `act_resource.ts` share booking.
- **Flows traced.** `scripts/winter_reserve_observe.ts`: deposits and eating per store type, ledger spoilage and eating per
  day, per-kind spoilage from the ledger, plan records by cue, household rows at each winter boundary.
- **Preserved failures.** Larger targets mostly run out of their window ("time is up" in the plan record); lean-to
  households stay bounded by 12 weight of room; berries still spoil at home; forest still loses most of a household in its
  second winter.
- **Status.** Impl `yes` · Contract `yes` (6 cases, `tests/winter_reserve.test.ts`) · E2E `yes` (staged: season plan →
  grain to granary → credited share → eaten within share) · Ordinary `yes` (granary 11 in / 4 eaten in two seeds; season
  units 47/62/5) · Rendered `partial` (plan step text "take the grain to the granary", option "Eat from the granary",
  existing plan panel; no new page check) · Aggregate `unproven` (8-seed lab: nothing beyond noise except the plan counts; deaths in the adverse direction within noise).

### WS4 Shelter maintenance, replacement, recovery
- **Current.** Site layout `optPlanBuild`; fetch plan rules 7 (`shelter.ts`); build `act_build.ts`; occupancy rules 3;
  repair want `intent.ts repairWanted` (cond < 55); upgrade `production.ts upgradeWish`; collapse `destroyBuilding`;
  stale sites `world.ts clearStaleSites`. Candidate `claude/winter-shelter-v34`: pre-winter boost, workshop-site
  exemption, stale home sites kept in the window (`winter_shelter.ts`), no death claim.
- **Gap.** No replacement-after-loss behaviour, no remembered-failure fallback, limited-labour households.
- **Status.** Impl `partial` · Contract `partial` · E2E `no` · Ordinary `partial` · Rendered `partial` · Aggregate `unproven`.

### WS5 Cooperation, commitments, reliable contact
- **Current.** Trust-based helper choice (39), stored-material promises (40), promise upkeep and relationship consequences
  (`social.ts updateCommitments`). Give fails with "was not where I expected" and clears whereabouts.
- **Gap.** No agreed delivery place; repeated futile contact; no demonstrated repeated loop.
- **Status.** Impl `partial` · Contract `partial` · E2E `no` · Ordinary `no` · Rendered `partial` · Aggregate `unproven`.

### WS6 Production chains and workshop use
- **Current.** `recipes.ts`, `production.ts` (supply planner to depth 3), `facilities.ts`, `act_production.ts`.
  Day-30 rules-43 saves: planks 25-34, bricks 6-12, charcoal 0/3/0, iron 0, ore unmined, flour/bread/jars/handles 0.
- **Gap.** Demand not reaching ore/flour/handles; to be diagnosed chain by chain.
- **Status.** Impl `partial` · Contract `partial` · E2E `partial` · Ordinary `partial` · Rendered `partial` · Aggregate `unproven`.

### WS7 Transport, carts, capacity
- **Current.** `production.ts wantsCart` reads current known site deficits ≥ 40 weight (no hauling history despite the
  comment); `cart_haul` serves known sites only. No cart in any ordinary run.
- **Status.** Impl `partial` · Contract `partial` · E2E `partial (staged haul scene)` · Ordinary `no` · Rendered `partial` · Aggregate `unproven`.

### WS8 Public projects and civic benefit
- **Current.** Rules 42 `civic_benefit.ts recordCivicBenefit`, one call site after a successful `withdraw`
  (`act_resource.ts`). Public food use runs through `eat_store` (43 starts vs 5 withdraws in 30 days) and earns nothing.
- **Status.** Impl `partial` · Contract `yes (withdraw)` · E2E `partial` · Ordinary `1 receipt (river)` · Rendered `partial` · Aggregate `unproven`.

### WS9 Demand, specialisation, exchange
- **Current.** Trade choice `trade.ts`, local demand rules 43, exchange journeys rules 22 (smoke: zero everywhere).
- **Status.** Impl `partial` · Contract `partial` · E2E `partial (staged)` · Ordinary `no` · Rendered `partial` · Aggregate `unproven`.

### WS10 Knowledge, teaching, technique dependencies
- **Current.** One technique (charcoal), person-held; lessons 180 ticks; learner requests (41); backgrounds (44).
- **Status.** Impl `partial` · Contract `yes (charcoal)` · E2E `yes (charcoal)` · Ordinary `1 lesson (meadow)` · Rendered `partial` · Aggregate `unproven`.

### WS11 Household projects, succession, culture
- **Current.** Promises released on death; organiser death confers no office; supper practice (24); aspirations (38).
  No mechanism continues another person's undertaking.
- **Status.** Impl `no` · Contract `no` · E2E `no` · Ordinary `no` · Rendered `no` · Aggregate `unproven`.

### WS12 Relocation, splitting, rescue, return
- **Current.** Rules 20 whole-household relocation; any refusal ends it; no subgroup, succession, return or rescue.
- **Status.** Impl `partial` · Contract `partial` · E2E `partial (staged)` · Ordinary `no` · Rendered `partial` · Aggregate `unproven`.

### WS13 Observable explanations
- **Status.** Per chain; recorded with each slice.

### WS14 Evidence and corrected findings
- Corrections kept (see brief section 14); every new claim below names its boundary event and denominator.

## Slice log

### Slice 1 — rules 45 food help (WS2), 2026-10-29

Predecessor reference: `tests/v44_continuation.expected.json` recorded from `7625337` by `scripts/v44_reference.ts --write`
before any behaviour change. Contract: `docs/FOOD_HELP.md`. Tests: `tests/food_help.test.ts` (9), `tests/v44_continuation.test.ts`.

Ordinary observation, `scripts/food_help_observe.ts`, Normal profile, immigration off, 30 days, all three seeds reached the
horizon (no budget stop), conservation ok, observer-purity check passed at every 240-tick sample. Same seeds under rules 44
(explicit version argument) are shown for the denominators; they are a different world after the first changed answer.

| seed | rules | food/care asks | `no item` refusals | fetch promises | delivered (asks / units) | gifts on the spot | seeks selected (found / not there / other) | deaths (hunger) |
|---|---|---:|---:|---:|---:|---:|---|---:|
| meadow | 44 | 206 | 152 | 0 | 0 / 0 | 13 | n/a | 1 (1) |
| meadow | 45 | 155 | 44 | 36 | 20 / 37 | 10 | 6 (1 / 2 / 3) | 1 (0) |
| river | 44 | 420 | 344 | 0 | 0 / 0 | 25 | n/a | 4 (1) |
| river | 45 | 399 | 142 | 65 | 33 / 57 | 25 | 17 (1 / 3 / 12, 1 seeker later died) | 3 (2) |
| forest | 44 | 205 | 144 | 0 | 0 / 0 | 17 | n/a | 11 (4) |
| forest | 45 | 350 | 125 | 54 | 22 / 35 | 10 | 14 (0 / 0 / 13, 1 seeker later died) | 6 (5) |

The rules-45 rows are the final source (capable-helper gate included). Every remaining `no item` at 45 is a child answering
another child's care ask (9 distinct child refusers per seed, checked on the final saves); no working-age adult who knew a
usable source refused with `no item`. An earlier rules-45 run without the capable gate had 0 / 1 / 0 such refusals because
small children were promising to fetch; the page check caught a two-year-old doing so. "other" seek outcomes are visits
interrupted before arrival (danger or a deadlier need) or ended without the found/not-there log within 900 ticks.
Lab check of the seek step (`food_help_evidence/lab-seek`, 8 seeds, control + nudge + `rich-no-seek-carer`): deaths −0.6
[−2.8, +1.3] for the ablation, not distinguishable from chance at a ±3.8 noise floor; no harm established, no benefit claimed.
Hungry-with-food samples (hunger < 30, food in pack): 159 / 324 / 357; of these 99 / 233 / 254 had no eat option, all with
the reason "saving the food for dependents", all at hunger 20-29. Evidence: `food_help_evidence/ordinary-30-{seed}` and
`-r44`, `-noseek` (report, requests, deliveries, deaths, seeks, carriedHungry, samples, provenance with source hashes,
final save).

Rendered: `scripts/browser/food_help_check.mjs` against the page's own river village, 5/5 (`food_help_evidence/rendered2/`, `docs/FOOD_HELP.md` Rendered section).

Checks at the integration boundary: `npm run typecheck` clean; `npm test -- --maxWorkers=4` 184 files / 1360 tests passed (before the capable gate; rerun after it recorded in the commit); `npm run build` clean; `git diff --check` clean. Commit `ce50c0a`.

### Slice 2 — rules 46 winter reserve (WS3), 2026-10-29

Predecessor reference: `tests/v45_continuation.expected.json` recorded from `ce50c0a` by `scripts/v45_reference.ts --write`
before any behaviour change. Contract and both ordinary tables: `docs/WINTER_RESERVE.md`. Tests:
`tests/winter_reserve.test.ts` (6), focused run 13 files / 158 tests including `household_preparation`, v1/v2/v45
continuation, economy, settlement economy, chains, intentions, plan reconsideration. Lab harm check
`winter_reserve_evidence/lab-reserve` (8 seeds, control + nudge + `rich-no-winter-reserve`): season plans −8.3 and plans done
+11.8 for the ablation (larger than chance, the mechanism itself), mean hunger −5.4 and units put by +54.6 (within noise),
deaths −1.9 [−4.6, +0.3] and people +2.4 [−0.1, +5.3] (not distinguishable from chance; the death direction is adverse and
is recorded as the thing to watch). Full table in `docs/WINTER_RESERVE.md`. No benefit claimed.
