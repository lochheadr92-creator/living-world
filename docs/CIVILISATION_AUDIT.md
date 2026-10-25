# Civilisation capability audit — current main, rules 28

Updated 2026-10-25 against published main `d84e5eaa828e86ea01b9847809875acd4259cf3a`.
This supersedes this document's rules-8/9 assessment. That historical assessment remains in Git and on `claude/civilisation-phase1` at `3f6ec66`; its measurements must not be relabelled rules 28.

## Conclusion and authority

The household loop works in ordinary execution. Township membership, voluntary shared projects, project coordinators, household relocation and founding, trade journeys, held charcoal knowledge, teaching, and a narrow inherited supper practice now exist. The old recommendation to implement relocation then held knowledge is obsolete.

The next highest-value behavioural target is **completion and useful occupation/use of an autonomously proposed shared storehouse**, with support, material delivery, work, interruptions, and personal consequences visible throughout. First diagnose the existing path; do not add another project system or change scores merely to force completion. Fresh runs demonstrate proposal, voluntary support, coordinator selection and material/work contributions, but not finished civic infrastructure. They do not establish a deadlock.

Authoritative documents read: AGENTS.md, WORKFLOW.md, PRODUCT_VISION.md, DEVELOPMENT_POLICY.md, CIVILISATION_IMPLEMENTATION.md, CIVILISATION_VALIDATION.md, INHABITANT_FIXES.md, RELOCATION.md and BRANCH_LIFECYCLE.md. No WORLD_DIRECTIONS.md or separate code index was found. Historical branch triage remains dated evidence; no retired implementation was merged for this audit. Rules-29 work in another worktree is outside this main snapshot.

The familiar checkout `C:/dev/Claude Experiment/living-world` now holds main at the above revision. Main was fast-forwarded in its former worktree, that worktree was detached, then the familiar checkout switched to main. Two conflicting untracked skill files were preserved, with matching SHA256 checks, under `scratch_preserved_2026-10-25_checkout/`. Other untracked work remains. No simulation behaviour, schema, fixtures or compatibility contract changed in this audit.

## Evidence levels

**Source** means the implementation was inspected. **Contract** means current automated tests pass, including staged inputs; it is not evidence of autonomous frequency. **Natural** means the fresh bounded ordinary runs below. **Historical** is explicitly versioned prior evidence. **Unproven** does not mean absent.

The complete current suite passed: **1,200 tests, 144 files**. Production typecheck/build passed. The suite includes historical golden/continuation tests. This is component verification, not acceptance of the entire civilisation programme. No new rendered/browser acceptance was performed.

## Current capability matrix

Paths below are repository-relative implementation pointers. All listed active systems use the existing version gates and normal rich-world execution; diagnostic off-switches do not make them product defaults.

| Area | Current implementation and ownership | What works now | Remaining boundary / evidence |
|---|---|---|---|
| Food, gathering, fishing, resource memory | `src/sim/economy.ts`, `options_work.ts`, `decision.ts`; existing beliefs/action handlers | Local knowledge, acquisition, depletion, inventory/ledger transfers and eating; pack-full store eating integrated | Natural river: 34/34 recorded hunger episodes recovered, 50 successful store meals, zero finished failures. This is one seed, not a mortality-effect estimate. |
| Construction, housing, occupancy, provisioning | `options_work.ts`, existing home plans, sites/buildings, household ownership and habitation | Physical materials/work, owned shelter and actual indoor occupancy; single-adult solid homes allowed since local rules 9 | Natural river: 6/12 household loops complete by the tool's definition; six incomplete. Not universal household success. |
| Cooperation and resource allocation | Existing requests/commitments, `social_memory.ts`, `townships.ts` | Asking, refusal, promised delivery, fulfilment, household and voluntary project contribution | Actual received amounts count. No universal communal inventory or leader-directed resource allocation. |
| Defence | Existing wolves, refuge, route safety and home boundaries; `decision.ts` and rules-19 route safety | Local danger affects ordinary choices and movement; inherited contract coverage | No fresh threat encounter quantified here; not a demonstrated organised defensive polity. |
| A: settlement identity and specialisation | `townships.ts`, `settlement_economy.ts`, `scripts/lab/civilisation.ts` | Saved identity/membership; real production and gross transfer records; repeated activity summaries | Partial. Four towns show repeated production in Large meadow; production-distance metric 0.284. Activity accounting is observer-only, not an identity-driven economic policy or proven comparative advantage. |
| B: relationships, trust, memory | `social_memory.ts`, social requests/commitments, `political_alignment.ts`, `scripts/social_counterfactual.ts` | Bounded interaction receipts, trust/affinity consequences, support preferences and witnessed outcomes | Partial. Material social counterfactual infrastructure exists; no fresh multi-seed rules-28 causal-effect rerun here. Not every listed rescue, promise or reconciliation narrative has a distinct primitive. |
| C: economy, scarcity and trade | `economy.ts`, `exchange_journeys.ts`, `settlement_economy.ts`, `options_social.ts` | Physical inventories, direct barter, locally heard cross-town opportunities, provisioned travel and actual exchange receipts | Partial. Large run has trade-lead exposure but zero journeys/receipts. Dependence, stable routes and disruption effects remain unproven. No currency needed. |
| D: leadership and factions | `townships.ts`, `civic_decision.ts`, `political_alignment.ts` | Voluntary support selects a public-project coordinator; ties block work; trust/outcome-based challenge; repeated support can form alignment/factions | Partial. Both fresh runs selected coordinators from actual support. No leadership turnover or factions observed. Scope is one shared-storehouse project type, not government, taxation or coerced allocation. |
| E: environmental pressure/adaptation | Existing needs, resources, seasons/weather, finite geology; `relocation.ts` | Material resource limits; local hardship and remembered destination can initiate household relocation | Partial. Rules-20 relocation is integrated and contract-tested. Both fresh runs had zero sampled sustained-hardship eligibility; absence of relocation here is not a failed response to hardship. No fresh drought/adaptation contrast. |
| F: skill/knowledge | `techniques.ts`, existing practice skills and workshop handlers | Held charcoal technique, initial vs taught provenance, physical teaching, kiln access gated by knowledge; no automatic universal acquisition | Partial. Only one explicit technique; initial adult knowledge is seeded. No invention/dependency tree. Neither fresh run taught it. |
| G: generations/culture | Existing lifecycle/kinship/inheritance; `household_practices.ts` | Birth/age/death accounting; repeated real meals teach one supper practice and permit later parent-child transmission | Partial. One supper holder in Large, zero familial/second transmissions. Successive-generation cultural continuity unproven; no broad culture system. |
| H: history and observers | `history.ts`, `inspect.ts`, `events.ts`, existing person UI; household history script | Read-only household, project, relationship and relocation histories derived from records; explicit unknowns | Partial. Fresh full-state query purity and save continuation passed. No general event-cause graph or arbitrary historical replay query. Feed/chronicle bounded, but retained historical identities still need mature-world growth measurements. |
| External AI | Existing validated offered-action protocol, observation/execution boundaries; `docs/INHABITANT_FIXES.md` | Current protocol 9/10, observation 6; unique choice identifiers and execution validation; existing autonomous rules own authoritative effects | Not a general unrestricted intention API for all eight systems. Audit contains no live-model trial. Newly available capabilities should be checked against actual offered choices, not inferred from descriptive text. |

Persistence is represented in authoritative saved world records for the newer systems. Contract tests cover crafted cases; fresh natural save/load continuation only covers states actually reached. It does not independently exercise a mid-relocation, mid-trade or multi-generation recovery.

## What changed since Claude's audit

- Claude's candidate table-eating fix was reconciled into the later integration lineage (rules 11); its candidate version 9 must not be confused with main's version 9. Do not cherry-pick the old five commits wholesale.
- Single-member huts are no longer an unresolved design decision: `options_work.ts` permits them for rules >=9.
- Township/project identity, political support, relocation/founding, economic records, exchange journeys, held knowledge and household practices are no longer absent.
- Phase-3 history infrastructure exists, although comprehensive causal reconstruction remains incomplete.
- The old 994-test result is historical. Current result is 1,200 tests.
- F1–F5 inhabitant fixes are delivered on current main; rules 27 adds night waiting and rules 28 adds remembered leisure destinations. Older queue instructions are stale.

## Fresh reproducible evidence

Files: `civic_evidence/audit-r28/normal-river.json`, `large-meadow.json`, `household-river.json`. Runner: `scripts/audit_rules28.ts`. Immigration disabled; default current profile settings retained. One day is 2,400 ticks. No assigned actions, fabricated scarcity or changed resource budgets.

| Measure | Normal / river | Large / meadow |
|---|---:|---:|
| Initial population; duration | 28; 8 days / 19,200 ticks | 100; 4 days / 9,600 ticks |
| End alive / deaths | 28 / 0 | 100 / 0 |
| End solid homes / stored food | 6 / 64 | 8 / 210 |
| Shared projects proposed / finished | 1 / 0 | 1 / 0 |
| Relocations proposed / settled | 0 / 0 | 0 / 0 |
| Trade journeys / completed | 0 / 0 | 0 / 0 |
| Sampled sustained hardship | 0 | 0 |
| Trade-lead holder samples | 0 | 286 |
| Taught charcoal / familial supper transmissions | 0 / 0 | 0 / 0 |
| Daily food/material and tool ledger checks | All passed | All passed |
| Exact observer state preservation | Passed | Passed |
| Exact save roundtrip + 120-tick continuation | Passed | Passed |
| Continuation hash | `c53109e9` | `e5307231` |

Samples are person-samples every 120 ticks, not unique people or decisions. Full serialized state equality includes saved random state. Continuation checks compare the queried world and two loaded copies; they are not a separate replay of every historical input. Natural observations are deterministic within this snapshot, not estimates of population-wide benefit.

The household report follows Willow (household 1136) and preserves the actual tick-by-tick record. Its census: 100 asks, 34 units recorded handed over, no need deaths, 34 hunger recoveries; 6 complete households, one unfinished solid-home site, one abandoned site, four with no solid home started. The latter report two construction-capacity blockers, one hunger blocker and one existing lean-to. Its thresholds (hungry <30, recovery >=55) are reporting conventions, not newly adopted acceptance targets. Do not compare 6/12 directly to Claude's 7/12 as an isolated regression: many rules changed.

Project detail matters: river proposed at 17,559, gained a coordinator at 18,969, and had only 231 ticks afterwards before cutoff. It retained 38.5/640 work and no delivered materials. Large proposed at 7,391; by 9,600 two supporters had delivered 10 wood and 2 stone of the required 10/4, and 39.3/640 work. These are incomplete, young projects, not proof of permanent starvation or deadlocked cooperation. The site's cached status text still says all 10 wood/4 stone are waiting despite deliveries: explain outstanding amounts from authoritative required/delivered/used fields.

Performance fields are raw diagnostic observations including per-tick audit overhead. Final reruns overlapped other diagnostic processes and are not isolated benchmarks. Saved states were 2,958,064 and 7,420,677 bytes. Heap includes runtime and loaded copies. No new 300-person scaling claim. Historical rules-26 small validation measured 28/100/250 inhabitants at approximately 0.54/2.59/10.42 ms per tick for one day; those numbers are not current rules-28 benchmarks.

Historical small validation at `living-world-validation-v26/civ_validation_small_v26` used four seeds: A Town 2 days/20 rows, C Large 2 days/16, DEF Large 2 days/24, GH Normal 4 days/16. It found one maximum completed shared project in GH, but no settled relocations, exchange receipts, factions, taught charcoal or family-supper outcomes. That is historical short-run null evidence, not missing implementations. The owner-stopped long ensemble remains stopped.

## Causal dependency map and experiment status

Local perception/remembered sources -> validated choices -> physical acquisition/transfer -> food and safe shelter -> spare capacity for voluntary contact -> actual promises/support -> material/work contributions -> completed public infrastructure -> experienced benefits/failures -> trust and future coordination.

Resource scarcity + sustained personal hardship + fresh locally known alternative + household consent/provisions -> physical relocation -> actual built shelter -> changed township membership. Complementary needs + heard surplus + feasible provisioned journey -> ordinary barter -> actual receipt. These are implemented branches, but their connected autonomous frequency is not yet established.

Practice/held knowledge + contact/time + teaching willingness -> acquired technique -> production access. Repeated shared meals + learned parent + later qualifying meals -> transmitted practice. Survival and lifecycle accounting remain prerequisites for generational continuity.

| Experiment | Updated status |
|---|---|
| A household survival | Demonstrated in one fresh ordinary rules-28 seed; incomplete households retained honestly. |
| B social consequences | Implemented controlled counterfactual infrastructure and contract coverage; fresh rules-28 effect size unmeasured. |
| C differentiation | Repeated differing production observed; causal environmental control and persistent advantage unproven. |
| D scarcity/migration | Mechanism integrated; fresh worlds never met sampled hardship prerequisite. Need a controlled feasible-scarcity contrast. |
| E trade emergence | Mechanism integrated; leads observed, no natural delivery here. Eligibility/travel activation needs tracing. |
| F leadership | Natural support -> coordinator -> contribution observed. Turnover/accountability effects and factions unproven. |
| G knowledge diffusion | Narrow technique transfer contract-tested; natural contact-to-production improvement unproven. |
| H continuity | Narrow lifecycle/practice primitives exist; multi-generation ordinary outcome unproven. |

The illustrative chain no longer fails at step 5 because a relocation primitive is absent. Whole-household relocation exists; dissenting subgroup secession does not. Which later link fails in an ordinary scarcity chain must be measured rather than assumed. No claim of autonomous civilisation completion is justified.

## Prioritised next work

1. **Finish one voluntary civic project causally.** Reuse township council, relevant-site beliefs, `materialNeeds`, commitments, physical hauling and construction. Follow the already-started Large meadow storehouse beyond the current cutoff with a bounded run. Record each supporter's known remaining materials, reachable source, capacity, selected competing need, delivery refusal and resumption. Establish whether this is normal time-to-completion or a real continuation failure before editing. If blocked, repair only the demonstrated link under a new rules version and preserve old continuation fixtures. Acceptance: an ordinary proposal reaches actual completed public storage and useful deposits/withdrawals, with local knowledge, explicit inventory accounting, interruptions/resumption, save continuation and observer purity. Compare with the same-seed off/control condition; require a material outcome, not extra events. This connects survival, cooperation, politics and settlement value with high reuse and bounded scope.
2. Correct the leisure mortality test oracle before relying on a survival acceptance statement. Count authoritative deceased records and causes, and demonstrate the oracle detects a death. This is a small verification correction, not an established production mortality defect.
3. Trace trade eligibility from heard lead through private need, provisions, daytime, distance and capacity. If no eligible opportunity exists, design a justified controlled comparison; do not inflate scores blindly.
4. Run one feasible scarcity/relocation contrast and one actual teaching-to-output contrast. Preserve null results and measure missing dependencies.
5. Extend history causality and mature-world storage/scaling only after the above traces establish what records are missing. Multi-generation culture and wider governance remain later work.

No new production slice was implemented during this refresh: the latest request is to update the audit, recommend the next change and update the checkout. The original Phase-1 fix is already integrated. Major new state/architecture requires a separate versioned proposal, not an incidental audit edit.

## Minimal observer/history design

Extend existing read-only histories instead of maintaining parallel truth. Present a project timeline using proposal, accepted/refused support, remembered vs actual material requirements, physical deliveries, worker progress, interruptions, outcome and subsequent use. Link existing stable IDs and ticks; label missing causes unknown. Do not synthesize intent from a later result. Retain bounded causal references when old disposable records are pruned; any new persisted event parent field needs schema/version validation and legacy handling. Queries must preserve exact serialized state and RNG, including expired-record cases. Current history is useful but not a complete causal DAG or rewind engine.

## Defects, blockers, risks and rollback

| Finding / trigger | Consequence | Next mitigation / rollback |
|---|---|---|
| Leisure survival test counts `persons.filter(!alive)` although death removes people into `deceased` | Passing assertion is not mortality evidence | Correct test oracle; no production rollback justified by this finding alone. |
| Project site status string can lag delivered material totals | Misleading explanation of material blockage | Derive observer shortfall from ledger fields; keep production ledgers authoritative. Presentation-only rollback if changed. |
| Short runs end before project completion; no sustained hardship | Cannot infer deadlock or migration efficacy | Bounded targeted continuation/eligible controls; preserve seed/settings and unchanged baseline. |
| No natural trade/teaching/turnover/generational outcome in fresh runs | End-to-end benefit unproven | Trace prerequisites before adding mechanics; retain null evidence. |
| Old audit/HANDOFF instructions name earlier versions and queued fixes | Duplicate implementation/incorrect branch integration risk | Current header and this audit supersede dated claims; old commits/worktrees preserved. |
| Bounded local records coexist with retained historical identities | Long-lived worlds may still grow | Mature-world memory/query benchmarks at 30/100/300 where feasible; no pruning without recovery/compatibility tests. |
| Retired branches have independent version meanings | Blind cherry-picks can break historical continuation | Feature-level compatibility review only; no historical merge performed. |

## Verification and limits

Implemented here: audit runner/evidence, current capability matrix and recommendation, current-document pointers, safe main checkout update. Passing: complete suite and build; two bounded natural integrity/save/observer checks and household trace. No production regressions introduced by an audit-only change; absence of all existing regressions is not established by these runs. Known misleading test oracle remains documented and unchanged. No new browser inspection, live external-AI trial, full ensemble, causal mortality estimate, isolated scaling benchmark or generational demonstration was performed. Recommended next verification is the bounded civic-project continuation described above.
