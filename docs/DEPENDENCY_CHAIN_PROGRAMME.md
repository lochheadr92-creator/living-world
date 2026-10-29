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
- **Diagnosis.** In the rules-45/46 runs nearly every household was housed at both winters (0-1 homeless of 11-13),
  1-3 homes per seed were below condition 40 by the second winter (doubled spoilage), exposure deaths were 2-5 per
  winter in forest. Replacement after collapse is the lean-to-first ladder (collapse sets `homeId = 0`); an abandoned
  site leaves its materials in a pile; a plan that cannot be fed is relinquished (34); nobody-able households ask a
  neighbour to mend the roof. What was missing was the candidate's three winter blockers and the pre-winter push.
- **Contract (rules 47, `docs/WINTER_SHELTER.md`).** Pre-winter nudge (+12, "winter is coming") on laying out, hauling
  to, building and mending the household's own home while fed; during the window a household wanting a home is not
  blocked by its own workshop site or the open-site cap, and its home site is not swept for idleness. Switch
  `rich-no-winter-shelter`. Owner `src/sim/winter_shelter.ts`; `options_work.ts optSites/optPlanBuild/optRepairAndFire`,
  `world.ts clearStaleSites`.
- **Not added (recorded).** Rebuild-in-place after collapse; a home plan for households of only children and elders;
  a remembered-failure memory beyond the existing 700-tick site cooldown and rules-34 relinquishing.
- **Status.** Impl `yes` · Contract `yes` (12 cases, `tests/winter_shelter.test.ts`) · E2E `partial` (staged: cap and
  workshop exemptions, site kept, nudge named; the existing chain tests cover fetch → build → occupy) · Ordinary `yes` (nudged starts in every seed; table in the slice log) · Rendered `partial` (the nudge is named in the decision "because"; blocked reasons on the card) ·
  Aggregate `partial` (8-seed lab: +1.4 solid homes and +5.4 condition beyond noise; deaths and homelessness within chance).

### WS5 Cooperation, commitments, reliable contact
- **Current.** Trust-based helper choice (39), stored-material promises (40), promise upkeep and relationship consequences
  (`social.ts updateCommitments`). Give fails with "was not where I expected" and clears whereabouts.
- **Diagnosis.** A promise to a person could be kept only by a hand-over; a helper arriving where the asker was last seen
  found nobody, and expired/interrupted/broken food promises ran at 12-18 per seed per 30 days (rules 45). Trust moved
  on kept (+6) and broken (−12) promises but the food ask never read it, so no later choice could change.
- **Contract (rules 48, `docs/DELIVERY_PLACE.md`).** At promise time a helper who knows the asker's home names it as the
  agreed place (said in the request note); keeping the promise is the hand-over or an ordinary deposit there, credited
  once from what moved, fulfilling the commitment with the same consequences; the household eats from its own store; the
  food/water ask leans on trust by at most ±4 ("they came through before" / "they let me down before"). Switch
  `rich-no-delivery-place`. Owner `src/sim/delivery_place.ts`; `social.ts` promise, `options_work.ts` leave option,
  `act_resource.ts` deposit credit, `options_social.ts` ask score.
- **Preserved.** Expiry, interruption, refusal, death, "not where I expected", no-room obstacles; no tracking, no public
  store as a place, no promise that anyone waits. Repeated futile asks are still bounded by the existing `asked` cooldown.
- **Status.** Impl `yes` · Contract `yes` (4 cases, `tests/delivery_place.test.ts`) · E2E `yes` (staged: promise names
  the hut → asker away → fish left at the door → promise kept → asker eats from her store; and kept promise → trust →
  the reliable neighbour asked first) · Ordinary `yes` (place named on 52/40/12 promises, 7/1/0 left at a door; table in the slice log) · Rendered `partial` (request note names the place;
  commitment row "n of m delivered"; log lines on both sides; no new page check) · Aggregate `unproven` (8-seed lab: nothing beyond noise either way).

### WS6 Production chains and workshop use
- **Current.** `recipes.ts`, `production.ts` (supply planner to depth 3), `facilities.ts`, `act_production.ts`.
  Day-30 rules-43 saves: planks 25-34, bricks 6-12, charcoal 0/3/0, iron 0, ore unmined, flour/bread/jars/handles 0.
- **Diagnosis (45-day audits, rules 48, `chain_evidence/audit-45-*`).** Wants were constant (planks and bricks by ~20
  people, jars by 9-18, carts by 1-6) and every step was offered, yet kilns fired 1-4 batches in 29 days, no jar,
  handle or cart was ever made, house sites waited weeks at 6 %. Two structural causes: no persistence between a
  chain's steps (each leaf re-derived and attenuated at every decision), and a batch left in its work phase could
  never be got back to (any job blocked every operate as "busy"; the maker called away to drink lost it to the stall
  limit). Ore stays untouched only because no smithy finished within 45 days (sites laid out on days 37-39); demand for
  iron, flour and bread cannot arise before the workshop exists.
- **Contract (rules 50, `docs/BATCH_PLAN.md`).** A private batch plan (after food, shelter, roof and tool plans) sees
  one wanted workshop product through: get the raw input, bring it, run the recipe, wait or collect, haul to the site;
  it adds no option, only names the planner's own options as its steps so the existing nudge carries them; it needs the
  tool, the technique and a known source for every raw input before it is taken up, and ends with a stated reason. A
  batch in its work phase can be resumed by its maker at once and by anyone with access after 300 ticks. A processed
  input the same workshop makes from known raw inputs is made first under the same plan (handles before a cart, flour
  before bread), one stage only; a hand-tool or roof plan may be taken on beside a batch (one extra plan), because the
  first lab showed a batch holding the one slot cost about seven hand tools per world. Switches
  `rich-no-batch-plans`, `rich-no-batch-resume`. Owners `src/sim/batch_plan.ts`, `facilities.ts resumableJob`;
  `intent.ts` hooks, adoption, credit; `production.ts planRecipe` offers the way back.
- **Chains covered by the mechanism.** planks (yard), handles (yard), bricks and jars (kiln), charcoal (kiln, with the
  technique), iron (smithy), flour and bread (bakery), cart (yard, hammer first). Quarry stone is not a batch plan:
  the quarry already runs on the ordinary site haul and had 12 / 9 / 3 stone produced.
- **Status.** Impl `yes` · Contract `yes` (7 cases) · E2E `yes` (staged: clay → kiln → fired → collected → hauled to the
  house; a farmer's jar fired and in hand; a stalled batch resumed; flour milled then bread baked under one plan) · Ordinary `yes` (14 / 13 / 4 plans adopted, 5 / 6 / 0 finished; first handles, jars and charcoal plans in ordinary worlds; table in the slice log) · Rendered `partial` (plan
  goal and step on the person card through the existing plan panel; "get back to it" named in the option) · Aggregate
  `unproven` (lab rows in the slice log).

### WS7 Transport, carts, capacity
- **Current.** `production.ts wantsCart` reads current known site deficits ≥ 40 weight (no hauling history despite the
  comment); `cart_haul` serves known sites only. No cart in any ordinary run.
- **Diagnosis (45-day audits).** Cart wanted by 3 / 6 / 1 people; "Building a handcart: needs a hammer" blocked 5 / 146 / 4
  samples and no hammer was crafted in 45 days (hammers exist but are held by others); handles were never made because
  the cart recipe's inputs are not planned while its tool is missing. Rules 50's batch plan covers the cart once a hammer
  is in hand; the hammer is the hand-tool plan's job.
- **Status.** Impl `partial` (batch plan reaches the cart recipe) · Contract `partial` · E2E `partial (staged haul scene)`
  · Ordinary `no` · Rendered `partial` · Aggregate `unproven`.

### WS8 Public projects and civic benefit
- **Current.** Rules 42 `civic_benefit.ts recordCivicBenefit`, one call site after a successful `withdraw`
  (`act_resource.ts`). Public food use runs through `eat_store` (43 starts vs 5 withdraws in 30 days) and earns nothing.
- **Contract (rules 49, `docs/CIVIC_FOOD_BENEFIT.md`).** A meal from a witnessed public storehouse earns the one receipt per
  project, counted once when the meal ends by exactly what left the store (units moved to the pack at the start, or bites
  eaten at the store with a full pack); empty attempts, arrivals and unwitnessed stores earn nothing; attribution stays
  the person's own witnessed record; the ±0.12 experience bound is unchanged. Switch `rich-no-civic-food-benefit`.
  Owner `src/sim/civic_benefit.ts`; one call site in the `eat_store` handler's end (`act_resource.ts`).
- **Other public buildings.** No receipt for halls or granaries: no single attributable transfer; judged by use (granary
  use is now measured by the rules-46 flows).
- **Status.** Impl `yes` · Contract `yes` (4 cases, `tests/civic_food_benefit.test.ts`; rules-42 tests unchanged) · E2E
  `yes` (staged: witnessed completion → public meal → receipt → experience 0.04 → 0.08, which the existing rules-42
  recruit path reads) · Ordinary `no` (0 meal receipts of 1 witnessed public meal in three seeds; table in the slice log) · Rendered `partial` (log line "the shared storehouse … helped me: I ate";
  recruit note; no new page check) · Aggregate `unproven` (8-seed lab: nothing beyond noise).

### WS9 Demand, specialisation, exchange
- **Current.** Trade choice `trade.ts`, local demand rules 43, exchange journeys rules 22 (smoke: zero everywhere).
- **Diagnosis (rules-50 audits, 45 days, three seeds).** Ordinary (Normal) worlds found one township, so the rules-22
  inter-settlement chain has a denominator of zero there (no trade lead can be told; `tellTradeLead` needs two townships;
  the Large profile has four). Heard demand (rules 43) reached 5 / 5 / 1 people and no trade was ever taken up for it (two
  different askers inside three days is rare), and nothing connected a maker's later surplus to the people who had asked
  or told the maker whether the work paid. The local swap (`optTrade`) wants only fish-when-short or an own-site's wood or
  stone and fired 0 times in 135 seed-days.
- **Contract (rules 51, `docs/CUSTOMERS.md`).** An ask for wood, stone or a workshop good turned down because the person
  had none to spare (not by choice) is remembered as a customer lead for six days; while it is live and the goods are
  spare they may be brought to the asker as a swap through the barter (when they carry something the supplier lacks and
  values more, two for one at most), as a gift through the offer (the ordinary favour debt), after a walk to where they
  were last known, or by the ordinary haul to the asker's own household site; each lead is supplied once and records the
  units and what came back; the open request closes as delivered later. The trade review reads the record: a served
  customer holds the trade (+4); a demand-taken trade whose leads all lapsed is reviewed again. Switch `rich-no-customers`.
  Owner `src/sim/customers.ts`; call sites in `social.ts` (the decline, the offer and barter resolutions), `act_resource.ts`
  (the site haul), `options_social.ts` (the options), `trade.ts` (the review), `inspect.ts` + `person_sections.ts` (card).
- **Not done here.** Inter-settlement exchange (needs a Large-profile observation; rules 22 untouched); a lapsed promise
  as a lead; produce-for-a-customer (the lead speaks for nothing; the person makes goods for their own reasons and the
  lead only says where spare ones may go).
- **Status.** Impl `partial` (customers yes; exchange untouched) · Contract `yes` (7 cases, `tests/customers.test.ts`) ·
  E2E `yes` (staged: ask → declined → lead → planks spare → gift / swap / walk / site haul → record → trade review) ·
  Ordinary `partial` (9 leads of 33 refusals in three 45-day seeds, 2 supplied, both hauled to the asker's site; no hand-over,
  swap, return or trade reading in 135 seed-days; table in the slice log) · Rendered `yes` ("Their customers" lines on the
  person card; page check `scripts/browser/customers_check.mjs` 4 / 4) · Aggregate `unproven` (lab rows in the slice log).

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

### Slice 3 — rules 47 winter shelter (WS4), 2026-10-29

Predecessor reference: `tests/v46_continuation.expected.json` recorded from `80b0fe4` by `scripts/v46_reference.ts --write`
before any behaviour change. Contract: `docs/WINTER_SHELTER.md`. Tests: `tests/winter_shelter.test.ts` (12, adapted from
the candidate at a fresh number), focused run 5 files / 74 tests with v46 continuation, household home, shelter, winter reserve.

Ordinary observation, `scripts/shelter_observe.ts`, Normal, immigration off, 30 days, same seeds under rules 46 (explicit
version) and 47 (current); horizons reached, conservation and observer-purity checks passed. Diverged worlds, not a pair.

| seed | rules | "winter is coming" offers sampled / starts under it (haul, build, repair, hut, lean-to) | home plans blocked by the cap (samples) | homes laid out / finished / abandoned / collapsed | repairs done | homes at end (below 40) | homeless at end | deaths (exposure, of them without a home) |
|---|---|---|---:|---|---:|---|---:|---|
| meadow | 46 | 0 / none | 440 | 15 / 13 / 1 / 1 | 3 | 20 | 0 | 1 (0, 0) |
| meadow | 47 | 449 / 35, 28, 43, 10, 0 | 308 | 16 / 15 / 1 / 0 | 7 | 22 | 0 | 0 (0, 0) |
| river | 46 | 0 / none | 368 | 17 / 12 / 2 / 2 | 2 | 20 | 0 | 1 (0, 0) |
| river | 47 | 386 / 19, 14, 54, 10, 1 | 309 | 18 / 15 / 2 / 0 | 6 | 19 | 1 | 4 (1, 1) |
| forest | 46 | 0 / none | 328 | 16 / 12 / 4 / 2 | 2 | 10 | 0 | 21 (8, 8) |
| forest | 47 | 453 / 17, 13, 48, 4, 3 | 232 | 16 / 15 / 1 / 4 | 2 | 17 | 0 | 9 (2, 2) |

The own-workshop-site block was not seen in any sample at either version (0 of 1,694-2,038 blocked home plans; the cap
and "already laid out a home" are what block). Forest at 46 is the candidate's lead made concrete: eight exposure deaths
among people whose household had no home. Evidence: `shelter_evidence/ordinary-30-{seed}-r46|r47` (report, samples,
winter rows, deaths with home and condition, events, nudged starts, provenance, final save).

Lab `shelter_evidence/lab-shelter` (8 seeds, control + nudge + `rich-no-winter-shelter`): solid homes −1.4 [−2.8, −0.3] and
mean home condition −5.4 [−10.0, −0.8] for the ablation (both larger than chance: the slice adds them); deaths +0.4
[−0.8, +1.9], homeless +0.6 [−0.1, +1.4], people +0.1 (not distinguishable from chance). Full table in
`docs/WINTER_SHELTER.md`. No survival claim.

### Slice 4 — rules 48 agreed delivery place (WS5), 2026-10-29

Predecessor reference: `tests/v47_continuation.expected.json` recorded from `2a05b30` by `scripts/v47_reference.ts --write`
before any behaviour change. Contract: `docs/DELIVERY_PLACE.md`. Tests: `tests/delivery_place.test.ts` (4), focused run
12 files / 178 tests (food help, cooperation, project cooperation, commitments, social, stored materials, project helpers,
recovery, preparation, v46/v47 continuation).

Ordinary observation, `scripts/food_help_observe.ts`, Normal, immigration off, 30 days, rules 48
(`food_help_evidence/ordinary-30-{seed}-r48`); horizons reached, conservation and observer purity held. The rules-45
rows are the same seeds before this slice (diverged worlds, not a pair).

| seed | rules | food/care asks | fetch promises | promised deliveries completed (asks / units) | promises naming a place | left at a door | sampled asks with a trust term | lapsed promises (expired, interrupted, broken, failed) | deaths (hunger) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| meadow | 45 | 155 | 36 | 20 / 37 | n/a | n/a | 0 / 946 | 49 | 1 (0) |
| meadow | 48 | 229 | 60 | 57 / 110 | 52 | 7 | 901 / 1211 | 37 | 1 (0) |
| river | 45 | 399 | 65 | 33 / 57 | n/a | n/a | 0 / 1578 | 70 | 3 (2) |
| river | 48 | 388 | 55 | 36 / 68 | 40 | 1 | 1258 / 1755 | 37 | 1 (0) |
| forest | 45 | 350 | 54 | 22 / 35 | n/a | n/a | 0 / 1347 | 101 | 6 (5) |
| forest | 48 | 381 | 53 | 47 / 86 | 12 | 0 | 1201 / 1698 | 28 | 22 (19) |

Leaving goods at a door is rare in these worlds (most promises are kept in person, which the walk prefers when the asker
is in reach); the place is named on most promises where the helper knows the home. Forest's 22 deaths are at the top of
that seed's range (6, 15, 13, 21, 9 and 22 across the slices' runs); the lab rows below are the comparison that means
anything.

Lab `food_help_evidence/lab-place` (8 seeds, control + nudge + `rich-no-delivery-place`): deaths +0.5 [−0.9, +2.1], people −0.4
[−2.4, +1.5], mean hunger +1.0 [−3.3, +5.3], ask units delivered −0.4 [−2.3, +1.3], home food per person 0 for the ablation; all
not distinguishable from chance. No harm established, no benefit claimed.

### Slice 5 — rules 49 public food benefit (WS8), 2026-10-29

Predecessor reference: `tests/v48_continuation.expected.json` recorded from `53b06ec` by `scripts/v48_reference.ts --write`.
Contract: `docs/CIVIC_FOOD_BENEFIT.md`. Tests: `tests/civic_food_benefit.test.ts` (4) with the rules-42 tests, table eating and
the v48 continuation (the first attempt wrote the meal's pack count into activity data for every version and moved the v48
continuation; it is gated on 49 now and the reference holds).

Ordinary observation, `scripts/civic_food_observe.ts`, Normal, immigration off, 30 days, rules 49
(`civic_food_evidence/ordinary-30-{seed}`): one public storehouse completed in each seed; witnesses holding its completion
record 1 / 4 / 1; public meal starts 10 / 0 / 0 and withdrawals 5 / 2 / 1; meals by a witness 1 / 0 / 0, and that one
witness had already earned the project's single receipt by a withdrawal. Receipts 1 / 0 / 0, all by withdrawal, none by a
meal. Ordinary activation of the meal path is therefore unproven here: 0 receipts of 1 witnessed meal, with the receipt
already taken; the contract is proven staged only.

Lab `civic_food_evidence/lab-civic-food` (8 seeds, control + nudge + `rich-no-civic-food-benefit`, run on the rules-50 tree with
only the meal receipt removed): deaths −0.6 [−1.7, +0.3], people +0.4 [−0.6, +1.3], retained shared projects completed −0.1
[−0.3, 0] and failed +0.3 [+0.1, +0.5] (within the noise floor), projects done +4.1 (within noise) for the ablation; nothing
distinguishable from chance. No harm established, no benefit claimed.

### Slice 6 — rules 50 batch plans and resumed batches (WS6, WS7 part), 2026-10-29

Predecessor reference: `tests/v49_continuation.expected.json` recorded from `de8af50` by `scripts/v49_reference.ts --write`.
Contract and the two root causes: `docs/BATCH_PLAN.md`. Tests: `tests/batch_plan.test.ts` (7), focused run 22 files / 235
tests (intentions, reconsideration, projects, chains, economy, settlement economy, home, shelter, techniques, learner
instruction, local demand, project helpers, stored materials, leave-heaviest, winter reserve, craft explanation, v48/v49
continuation).

Chain audit, `scripts/chain_audit.ts`, Normal, immigration off, 45 days, same seeds at rules 48 (before) and 50 (final
source): horizons reached, conservation held, observer purity held at every 240-tick sample. Diverged worlds, not pairs.

| seed | rules | deaths | planks made | bricks made | handles | charcoal | jars | carts | kiln built (day) | smithy | bakery | sites open at end | batch plans adopted / done / dropped (by product) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|
| meadow | 48 | 1 | 22 | 12 | 0 | 0 | 0 | 0 | 16.1 | site 81 % | built 37.4 | houses 6 %, 6 %; hut 31 % | n/a |
| meadow | 50 | 0 | 34 | 15 | 2 | 0 | 2 | 0 | 16.1 | built 21.5 | built 32.4 | houses 81 %, 6 %; hut 56 % | 14 / 5 / 9 (planks 7 → 2 done, jars 4 → 2, bricks 3 → 1) |
| river | 48 | 10 | 30 | 3 | 0 | 0 | 0 | 0 | 36.1 | site 6 % | none | houses 6 %, 6 %; hall 46 % | n/a |
| river | 50 | 8 | 32 | 9 | 0 | 6 | 0 | 0 | 20.4 | built 29.4 | site 6 % | house 6 % | 13 / 6 / 7 (planks 6 → 1, charcoal 4 → 4, bricks 2 → 1, jar 1 → 0) |
| forest | 48 | 22 | 9 | 3 | 0 | 0 | 0 | 0 | 18.0 | none | site 6 % | granary 81 % | n/a |
| forest | 50 | 22 | 7 | 3 | 0 | 0 | 0 | 0 | 18.0 | none | site 6 % | granary 56 % | 4 / 0 / 3, 1 active (bricks 3, planks 1) |

The first handles (2, meadow) and water jars (2, meadow, both under a jar plan) ever made in an ordinary world, and the
first charcoal plans finished (river, 4 of 4, 6 charcoal); meadow's smithy was built on day 21.5 against a site at 81 %
on day 45 before, river's on day 29.4 against 6 %. Diverged worlds, so none of this is a paired effect; the lab rows
below are the only aggregate reading. Drop reasons in the final runs (19 drops): "time is up" at a named step (collect
the planks or bricks 5, firing 4, get more clay or wood 3, hewing 1) 13, "the site came by its planks some other way" 2,
"the site is finished or gone" 1, and "gave it up after N tries: nothing there to take" 2, the last being a collect
attempted on a batch the person believed ready that was not, or whose output somebody else's earmark had taken: a
preserved failure that the person's record names. Forest lost 22 of 30 in its second winter at both versions. No cart
was built (no cart plan adopted: the hammer-holders did not want one, the wanters held no hammer). Evidence:
`chain_evidence/audit-45-{seed}` (rules 48) and `-r50` (final source; report, plans, samples, provenance, final save).
Earlier rules-50 runs with two-day patience, and with the batch holding the one project slot, were overwritten by the
final form; their numbers are not kept.

Lab rows (final source, 8 seeds, 30 days, control + nudge against `rich-no-batch-plans`; rows are ablation − reference;
`chain_evidence/lab-batch/report.txt`): workplaces −0.1 [−0.9, +0.8], solid homes −0.1, buildings +0.8 [−0.9, +2.3],
tools +5.0 [+1.1, +9.6] (systematic, within the ±8.7 floor; was +6.9 before the beside-a-tool rule), projects done +4.3
[0, +9.4], deaths −2.0 [−5.2, +0.3], people +1.4, all not distinguishable from chance except "below critical hunger at
day 30" 0.9 → 0.0 [−2.3, −0.1], marked larger than chance (floor ±0.8) and carried by one seed: river, a world on the
edge of famine in both arms, whose famine fell on day 23 without plans (3 dead, recovered by day 30) and on day 29-30
with them (1 dead, 5 hungry at the snapshot, none of them at a batch; `scripts/chain_hunger_trace.ts`, logs beside the
report). Recorded as a timing artefact with the question left open; no benefit claimed, no harm established.

### Slice 7 — rules 51 customers (WS9 first part), 2026-10-29

Predecessor reference: `tests/v50_continuation.expected.json` recorded from `7c70fb0` by `scripts/v50_reference.ts --write`
(commit `6fa3509`). Contract and the three findings (one township in a Normal world; heard demand going nowhere; the local
swap never accepted): `docs/CUSTOMERS.md`. Tests: `tests/customers.test.ts` (7); focused 16 files / 120 tests (customers,
local demand, trade, cooperation trade, exchange journeys, project cooperation, delivery place, food help, occasions,
misdeeds, golden, inspect purity, v49/v50 continuation, batch plan, intentions). Page check `scripts/browser/customers_check.mjs`
4 / 4 on the page's own meadow world (a lead row "Yara asked me for 4 wood 0.1 days ago; none to spare yet", a supplied row
"Sven asked me for stone … I took them 1 … to their site, and nothing came back for it"; `customers_evidence/rendered`).

Ordinary observation, `scripts/customers_observe.ts`, Normal, immigration off, 45 days, rules 51 final source
(`customers_evidence/obs-45-{seed}`): horizons reached, conservation held, observer purity held daily. Denominators first:

| seed | alive / dead | material asks made (wood, stone, planks, bricks) | declined, by the words | leads (item) | supplied | by hand / swap / site | units | returns | repeat | lapsed | trades reading the record |
|---|---|---:|---|---|---:|---|---:|---|---:|---:|---:|
| meadow | 28 / 3 | 30 | own need 5, unwilling 5, making 4, committed 1 | 2 (wood) | 0 | 0 / 0 / 0 | 0 | none | 0 | 0 | 0 of 19 |
| river | 27 / 6 | 21 | own need 7, unwilling 4, committed 3, making 1 | 7 (wood 5, planks 2) | 2 | 0 / 0 / 2 | 6 planks | none | 0 | 2 | 0 of 19 |
| forest | 8 / 22 | 6 | unwilling 1, enough 1, own need 1 | 0 | 0 | 0 / 0 / 0 | 0 | none | 0 | 0 | 0 of 6 |

Read plainly: the lead is written where the brief said it should be (an ask turned down for want of spare goods: 28 of 33
refusals were for want, not by choice, and 9 leads came of them, two more having lapsed), and two of them were supplied,
both by Emre hauling planks to the sites of the two people who had asked him (river, day 38). Nothing was brought into a
hand, nothing swapped, nothing came back, and no trade read the record in 135 seed-days: a maker's spare goods go to a
site before they go to a person, and the people who asked for wood seldom came within sight of the holder again while the
holder had any spare. The chain's first two links now exist and fire; the return link exists and has not fired in an
ordinary world. The local swap (unchanged) was proposed 132 times and refused 132 times (86 "nothing to spare", 46 "no
room"); the one-for-one-to-a-plenty-carrier rule tried against it was refused 155 of 155 times and cost projects in the
lab (`customers_evidence/lab-customers-swaprule`: projects adopted +7.9 without the slice, 8 of 8 seeds; done +7.1, 7 of 8),
so it was taken out before the commit and the swap stands as it was, its failure recorded. Inter-settlement exchange: 1
township in every Normal world, 0 leads, 0 journeys: a denominator of zero, not a result.

Lab rows (leads alone, final source, 8 seeds, 30 days, control + nudge against `rich-no-customers`; rows are ablation −
reference; `customers_evidence/lab-customers/report.txt`): workplaces +0.3 [−0.3, +0.8], solid homes +0.1, buildings +0.9 [−0.6, +2.3], people +0.4, deaths −0.8 [−2.3, +0.7],
tools +1.6 [−2.3, +5.2], projects adopted +7.2 [−1.1, +14.3] (7 / 1 seeds), projects done +2.9 [−3.9, +8.1], project asks
−0.8, ask units delivered +0.1, below critical hunger +0.4 [+0.1, +0.9] (systematic, within the ±0.8 floor): "nothing moved
by more than a one-draw nudge moves it". The projects-adopted lean (7 of 8 seeds fewer with the slice on) is the same
direction as the swap-rule lab and is noted as a lead to watch, not a result. No benefit claimed, no harm established.
