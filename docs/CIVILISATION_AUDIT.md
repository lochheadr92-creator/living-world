# Civilisation audit: what exists, what links are missing, and what to build next

Audit date 2026-10-24. Source: `origin/main` at `3d93180` (rules version 8), plus the one slice this branch adds (rules version 9,
[TABLE_EATING.md](TABLE_EATING.md)). Written for the brief "turn Living World into a persistent, observable civilisation
simulator", which asks for a capability matrix, a causal dependency map, a prioritised roadmap, an observer design and a
defect register before any building. This is that audit. It is an inventory and a plan; it changes no behaviour.

## How to read the evidence

Every row says how it is known. The three classes are not interchangeable.

| Tag | Meaning |
|---|---|
| **[R]** | I read the source line myself in this session and the line is cited. |
| **[M]** | I ran it and measured it in this session; the command or file is cited. |
| **[A]** | Reported by one of four read-only audit agents (settlements/economy/environment, relationships/politics, skills/generations, observer/determinism/AI) and **not** independently re-read. Treat as a strong lead, not a verified fact. File:line citations are theirs. |

Where an agent and a document disagreed, the source won. Agents also disagreed with the docs in several places; those
discrepancies are listed at the end, because stale documents are themselves a risk to the next person.

**What the brief named that does not exist.** There is no `WORLD_DIRECTIONS.md` anywhere in the tracked tree. The nearest
equivalents are [PRODUCT_VISION.md](../PRODUCT_VISION.md) (product direction), [WORKFLOW.md](../WORKFLOW.md) (delivery rules),
[DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md) (rules versions, evidence matching) and [EMERGENCE.md](EMERGENCE.md) (stages and
measurements); those were read. The retired-branch triage is [BRANCH_LIFECYCLE.md](BRANCH_LIFECYCLE.md). **No code index was
found.** The owner's checkout (`C:\dev\Claude Experiment\living-world`) was on the superseded `claude/wolf-defence-v3` branch,
rules version 3 era, so work was done in a separate worktree cut from `origin/main`; nothing in the owner's checkout or in the
Codex worktree was touched.

## A. Capability matrix

Status words: **FULL** works and is in normal play. **PARTIAL** works in part, or narrowly. **EXPERIMENTAL** exists but is
unproven or off by default. **ABSENT** no mechanism. "Rich" means `settings.dynamics === 'rich'`, which every product world is.

### A1. The Phase 1 survival loop (hunger, food, shelter, household, cooperation)

| Capability | Status | Core | End-to-end evidence | Agent can perceive and use it | Observer | Tag |
|---|---|---|---|---|---|---|
| Hunger, thirst, warmth, energy needs | FULL | `needs.ts`, `constants.ts` | every run | yes, own state | person card | [A] |
| Gathering (berries, fruit, grain, fishing at a spot, wood, stone) with depletion and regrowth | FULL | `act_resource.ts`, `economy.ts gatherFromSource`, `sources.ts` | `economy.test.ts`; 444 successful meals and 237 berry-picks in 2 seeds × 6 days | beliefs of places, not world truth | source card | [M] |
| Eating what is carried | FULL | `act_resource.ts eatTick` | same | yes | log | [M] |
| **Eating at a store** | **FULL as of version 9; was broken** | `act_resource.ts eat_store` | **57% of finished store meals failed on version 8 (198 of 348, 4 seeds × 8 days), 95% of those with food in the store and no room for it in the pack; 2% on version 9** | yes | person log, `scripts/household_life.ts` | [M] |
| Household food reserve | FULL, benefit not shown | `provision.ts`, `stock` plan | `household_preparation.test.ts`, [RICH_WORLD.md](RICH_WORLD.md) ablation | yes, from the household store as the person remembers it | person card | [R] |
| Household shelter plan, gather and haul to own site | FULL, benefit not shown | `shelter.ts`, `shelter` plan | [HOUSEHOLD_HOME.md](HOUSEHOLD_HOME.md), `home_evidence/river.json` | yes, own beliefs | site and person cards | [R] |
| Laying out, building, ownership (`hh.homeId`) | FULL | `options_work.ts optPlanBuild`, `buildings.ts completeSite` | same | yes | building card | [R] |
| A hut for a household of one | **ABSENT by rule** | `options_work.ts:693` requires `members >= 2` | seed `river`: 3 of 12 households blocked by exactly this | n/a | the card says so | [M] |
| Physical occupancy (enter, sleep, leave) | FULL | `habitation.ts` (version 3) | [HABITATION.md](HABITATION.md) | yes | home card lists who is inside | [R] |
| Cooperation on a project: ask, answer, promise, deliver | FULL | `options_social.ts`, `social.ts evaluateRequest`, `Commitment` | `project_cooperation.test.ts`; 117 asks, 49 units recorded handed over, seed `river` 8 days | yes | request views | [M] |
| Courier promise when the requester's pack is full (v8) | FULL | `social.ts:470` | [COURIER_RECOVERY.md](COURIER_RECOVERY.md) | yes | request views | [R] |
| Source memory (beliefs, failures, hearsay) | FULL | `knowledge.ts`, `news.ts` | `knowledge.test.ts`, `save_told.test.ts` | this is the input to options | inspector | [A] |
| Defence: flee, shelter, spear, stand | FULL | `defence.ts`, `wildlife.ts` | [WOLF_DEFENCE.md](WOLF_DEFENCE.md) | yes | feed, card | [R] |
| A building site that seals its owner in | **open** | `buildings.ts findBuildSpot` checks the door tile is free, not that it stays reachable | logged 2026-10-05, 1 of 16 seeds; **not re-run on this build** | n/a | none | [R] |

### A2. System A: settlement identity and specialisation

| Capability | Status | Core | Notes | Tag |
|---|---|---|---|---|
| A settlement as an entity with members, stats, kind, prosperity | **ABSENT** | `settlements.ts` is `{x, y}` and nearest-hub helpers; `World.extraSettlements?: {x,y}[]` | a settlement exists only as a coordinate; `addSettlement` has one caller, `worldgen.ts:305` | [R] |
| Per-settlement activity statistics | **ABSENT** | none in the engine | only offline per-camp cohorts in `scripts/stage4/metrics.ts` | [A] |
| Specialisation derived from behaviour | PARTIAL | `trade.ts` (a person's settled work), `production.ts` (workplace siting from beliefs) | personal and occupational, never aggregated by settlement; camps are generated symmetric, so there is no resource asymmetry to specialise on | [A] |
| Founding or splitting a settlement at run time | **ABSENT** | nothing writes a hub after worldgen | `SCALING.md:451`: 0 of 24 new settlements even with food removed | [A] |
| Several settlements per world | PARTIAL | `large` (4 camps), `huge` (6) profiles only | the default product world has exactly one | [R] |

### A3. System B: relationships, trust, memory, grudges

| Capability | Status | Core | Notes | Tag |
|---|---|---|---|---|
| Per-pair affinity, trust, familiarity, debt, avoidance, short history | FULL as scalars | `relations.ts adjustRel`, about 35 call sites | changes only through logged events, plus one passive path (below) | [A] |
| Trust and reputation feed decisions | PARTIAL, weak | `social.ts:296 willingness` | trust enters at about ±0.1 and reputation ±0.25 against thresholds 0.6/0.66 | [A] |
| Rumours with source, hops and age (`p.heard`, cap 30) | FULL, rich | `reputation.ts` | spreads one story per conversation | [A] |
| Broken promise to later refusal | PARTIAL | `social.ts:652-663`, then `willingness` | the path exists; the effect is about −0.12 on willingness; **no test chains an earlier betrayal to a later refusal**; decisive only for tool loans (lender needs trust ≥ 14) | [A] |
| Grievances and making peace | PARTIAL | `grievance.ts`, `mediation.ts` | grievances last at most about 3 days and are **not read by `willingness`**; the victim initiates peace and the offender decides to forgive; no restitution after a promise is `broken` | [A] |
| Rescue, unfair exchange, abandonment, reliability streaks as durable facts | **ABSENT** | none | a rescue leaves a one-day mood thought and a log line only | [A] |
| Relationship decay | PARTIAL | `relations.ts:86` | exponential only, kin exempt; no consolidation; per-pair maps (`relations`, `asked`, `told`, `failures`) are never pruned | [A] |

### A4. System C: economies, scarcity, trade

| Capability | Status | Core | Notes | Tag |
|---|---|---|---|---|
| Ledger: created, consumed, spoiled, initial; `conservationReport` | FULL | `economy.ts` | all movement goes through `transfer`/`produce`/`consume`; the long-run rich conservation test is **thin** (staged only) | [R]/[A] |
| Carry limits by weight; carts | FULL | `people.ts carryCap`, `economy.ts roomFor`, `carts.ts` | this limit is what version 9 had to respect | [R] |
| Pairwise barter and a one-per-world market day | PARTIAL | `options_social.ts:539`, `occasions.ts` | the market reads world truth and a 60-tile reach; goods "teleport" between people who were not co-present | [A] |
| Local scarcity and valuation | PARTIAL | `social.ts:140` | personal (pack, hunger, reserve); no settlement or market price | [A] |
| Currency | ABSENT | | correctly absent per the brief | [A] |
| Trade between settlements, trade records, dependence | **ABSENT** | | 0 cross-camp contacts in a 1-day pilot (`EMERGENCE.md`); trade is text events in a 500-event feed | [A] |

### A5. System D: leadership, politics, factions

| Capability | Status | Notes | Tag |
|---|---|---|---|
| Any authority, influence, vote, faction, collective decision, allocation by a non-owner | **ABSENT** | `Household.headId` is written at creation and when a head leaves and **no decision consults it** | [R] |
| Crews | PARTIAL | symmetric friend groups with a +4 option nudge; they read crewmates' live activity from world truth | [A] |
| Group decides to move or found a settlement | **ABSENT** | `Intention` is strictly personal, `MAX_INTENTIONS = 2` | [R] |

### A6. System E: environment and adaptation

| Capability | Status | Core | Notes | Tag |
|---|---|---|---|---|
| Seasons, winter, lean seasons, dry spells, floods, finite rock, spoilage | FULL, deterministic, **global** | `hardship.ts`, `environment.ts`, `sources.ts` | one weather for the whole map even at 256×256 | [A] |
| Adaptation: reserve before winter, exploring | PARTIAL | `provision.ts`, `options_work.ts` | household-level; benefit not demonstrated | [A] |
| Overcrowding or carrying capacity as a pressure | **ABSENT** | | | [A] |
| Migration when local survival fails | **ABSENT** | no relocate action, no plan kind, no runtime hub creation | the precise missing link of the whole emergent chain | [A] |

### A7. System F: invention, skills, knowledge transfer

| Capability | Status | Notes | Tag |
|---|---|---|---|
| Skills as per-person numbers that grow with practice | FULL | change work speed, **not yield**; never decay | [A] |
| Recipes and production chains | FULL as physical infrastructure | **every adult effectively knows every recipe**; there is no knowledge object; progress is gated by who has *seen* a clay pit or an ore vein, not who knows what | [A] |
| Invention or experimentation with cost and failure | **ABSENT** | | [A] |
| Teaching | PARTIAL | apprenticeship only (`apprentice.ts`), world-rolled not an agent option, about once in four 12-day worlds, isolated tests only | [A] |
| Knowledge loss when the skilled die | **ABSENT** | | [A] |
| Newborns and arrivals | **unjustified competence** | `makeSkills` gives everyone adult-range skill 0.7–1.5; nothing is inherited | [A] |

### A8. System G: generations, families, culture

| Capability | Status | Notes | Tag |
|---|---|---|---|
| Birth, ageing, death, pairing, household merge | FULL, resource-gated | conception needs a roof, household food per head ≥ 3, caps and spacing | [A] |
| Arrivals | FULL, bounded | tick ≥ 4800, population cap, food and roof gates, 6000-tick spacing | [A] |
| Inheritance | PARTIAL, implicit | belongings become a pile; the home stays with the household | [A] |
| Traditions | PARTIAL | world-held schedule records; **held by no one**; a midwinter tradition is created at day 12 regardless of "first winter survived" | [A] |
| Multi-generation evidence | **ABSENT** | adulthood is 192 simulated days; longest evidence is 40-day scripts | [A] |

### A9. System H and cross-cutting infrastructure

| Capability | Status | Notes | Tag |
|---|---|---|---|
| Determinism: seeded RNG, stateless `hashUnit` | FULL | no `Math.random`/`Date.now` in any simulation path; hits are UI, agent clock, save timestamp | [A], partly [R] |
| Rules versions, refused unsupported saves, per-version continuation references | FULL | [DEVELOPMENT_POLICY.md](DEVELOPMENT_POLICY.md); versions 1–4, 6–9 supported, 5 refused by name | [R] |
| Replay and state diff | FULL | `replay_check.ts`, `statediff.ts`, goldens (unversioned worlds only) | [A] |
| External AI boundary | FULL | the model picks an option key from the options the engine generated for one controlled person; `externalDecide` refuses anything else; no bypass found | [A] |
| Event feed | PARTIAL | `{id, tick, kind, text, ids, x, y}`; **no cause, no actor/target roles**; capped at 500; the chronicle (cap 400) is selected by substring match on the text | [R] |
| Typed causal links | PARTIAL, local to subsystems | `Request.commitmentId/planId/siteId`, `Commitment.requestId`, `Site.creatorId/hhId`, `Intention.aboutId`, `Building.builtBy`, rumour provenance | [R] |
| Household, settlement, relationship, resource-flow views | **ABSENT** | household is a name on a person card; flow is ledger totals and an opt-in transfer hook | [A] |
| Observer purity | PARTIAL | `tests/purity.test.ts` (2 seeds × 5000 ticks); five hand-placed guards; **one confirmed write** below | [R]/[A] |
| Performance at 30 / 100 / 300 | PARTIAL | profiles: normal 28, town/large 100, huge 250; **no 300 profile**; `SCALING.md` figures were taken on legacy unversioned worlds, not the product world | [A] |

## B. Causal dependency map

Arrows read "depends on". **solid** = the link exists and runs; **weak** = exists but its effect is small or unproven;
**missing** = no mechanism.

```
history that matters ........ needs: events with causes (missing) + persistence of settlements and people (partial)
  ^
generations & culture ....... needs: reproduction (solid, resource-gated) + knowledge as a thing people hold (missing)
  ^                                   + traditions held by people (missing)
politics & leadership ....... needs: influence from relationships (missing) + collective decisions (missing)
  ^                                   + a shared goal larger than one person (missing: plans are personal)
settlement identity ......... needs: a settlement that is more than a coordinate (missing)
  ^                                   + per-settlement activity statistics (missing)
trade & dependence .......... needs: two settlements with asymmetric resources (missing: camps are symmetric)
  ^                                   + purposeful travel between them (missing) + a trade record (missing)
migration ................... needs: a signal that local survival is failing (weak: household shortage only)
  ^                                   + a relocation intention (missing) + a runtime hub (missing)
cooperation under scarcity .. needs: trust that changes who helps (weak) + refusals remembered (weak)
  ^                                   + promises that cost something when broken (solid, small effect)
household survival loop ..... needs: food you can eat (FIXED by v9) -> a store you stocked (solid, v2)
                                      -> a roof you fetch for (solid, v7) -> a home you sleep in (solid, v3)
                                      -> help you can ask for (solid, v8)  -> hut for a household of one (blocked by rule)
```

Everything above the household loop depends on something that is **missing**, not weak. That is the central finding. The
household loop is the only one with every link present, which is why the one slice this branch implements sits there.

### The brief's illustrative chain, link by link

| Step | Exists? | Precise gap |
|---|---|---|
| 1. A settlement's food falls | locally yes (a household's shortage), settlement-level no | no settlement-level food signal |
| 2. Disagreement over distribution | emergent only (independent refusals become grievances) | no norm or belief of a fair share; no way to compare positions |
| 3. Past interactions change who cooperates | yes, weakly | coefficients small; grievances not read by `willingness`; no ablation or end-to-end test |
| 4. Some refuse, and it is remembered | partly: scalars plus a grievance of ≤ 3 days | no durable typed "X refused me" fact; no refusal rumour kind |
| 5. A group considers relocation | **no** | plans are personal; no relocation option |
| 6. A new settlement is founded | **no** | hubs are written only at world generation |
| 7. It specialises | ingredients only | camps are symmetric; nothing aggregates by settlement |
| 8. Trade emerges | **no** | no purposeful inter-settlement travel; market reads world truth |
| 9. Dependence | **no** | no recurring flows, counterparty record or import logic |
| 10. Later generations inherit it | partly | households persist while a member lives; no knowledge, practice or settlement identity is inherited |

**The first missing link is step 5.** Steps 6 to 9 cannot exist without it, so there is no honest way to "verify whether the
simulation can produce the sequence through normal execution": it cannot, and the reason is one primitive.

## C. Prioritised engineering roadmap

Ordered by causal importance, then reuse, then risk. Effort is a rough size, not a promise. Every behavioural item needs a new
rules version, a continuation reference recorded **first**, an ablation switch, and a paired lab run.

| # | Slice | Why it comes here | Reuses | Risk | Effort | Measurable |
|---|---|---|---|---|---|---|
| 1 | **Eat at a store with a full pack (done, v9)** | the household loop's food link was failing 57% of the time | `eat_store`, ledger | low | small | store-meal failure rate 57% → 2% [M] |
| 2 | Observer write in `lifeEventOf` | rule 10; a one-line read-path fix | `inspect.ts` | very low | tiny | `deepHash` unchanged by inspection |
| 3 | Household and relationship **history views** (read-only) | prerequisite for every later "show why" claim | typed links above | low | medium | questions answerable: what / why / who / what changed |
| 4 | Social consequence experiment (B) as a **lab arm** | Phase 2 needs a counterfactual before more mechanism | lab, `checkCommitments` | low | medium | decision flips attributable to one promise |
| 5 | Single-member hut question | an explicit rule that strands 3 of 12 households | `optPlanBuild` | medium | small | households with a solid home |
| 6 | Grievances into `willingness`; durable refusal fact | makes trust matter | `grievance.ts` | medium | medium | cooperation divergence between histories |
| 7 | Relocation primitive (plan kind + runtime hub) | the first missing link of the emergent chain | `Intention`, `settlements.ts` | **high** | large | migrations that follow shortage |
| 8 | Settlement entity with statistics | needed before specialisation or trade can be measured | household and hub data | medium | medium | per-settlement activity mix |
| 9 | Knowledge as a held, teachable, losable object | needed before technology or culture | `apprentice.ts`, recipes | **high** | large | skill spread via contact |
| 10 | Leadership and factions | depends on 3, 6, 7, 8 | | high | large | influence traceable to relationships |

Items 7 to 10 are **architectural**. Per the brief, alternatives must be written down and one recommended before building:

* **Relocation (7).** *Option A*, a per-person `relocate` plan kind that picks a believed-viable site and carries a household's
  belongings, with a hub created when a second household arrives. *Option B*, a group plan owned by an elected-by-circumstance
  proposer. *Recommendation: A.* B needs politics (10) that does not exist, and A reuses the existing plan machinery
  (`intent.ts`) and household identity. A is also the smallest thing that can make step 5 happen.
* **Knowledge (9).** *Option A*, a per-person `knows: Set<string>` of techniques with learning from doing and teaching on
  contact. *Option B*, keep universal knowledge and gate only on tools. *Recommendation: A, introduced for a single technique
  first* (for example food preservation, which has a measurable effect on the winter reserve) so that "no spontaneous
  universal knowledge" can be tested on one case before it is generalised.

## D. What this branch implemented

One slice, item 1, [TABLE_EATING.md](TABLE_EATING.md): rules version 9. Plus the read-only tooling that found and measured it
(`scripts/household_life.ts`, `tests/helpers/storewatch.ts`) and the continuation reference recorded before the change
(`tests/v8_continuation.expected.json`).

## E. Observer and history design (minimum infrastructure)

What the brief asks the observer to answer: *what happened, why, who caused it, what changed because of it.* What exists:
descriptions of the present (`describePerson`, `describeEntity`), a bounded feed of text, and typed references inside
subsystems. What is missing is a way to follow a reference from one record to the next.

**Recommendation: derive causal links at read time from references that already exist, and add nothing to saved state.**

1. A pure module, `src/sim/history.ts`, that takes a `World` and returns a chain for a household, a person, a site or a
   request by following `Request.commitmentId`, `Commitment.requestId/siteId`, `Site.creatorId/hhId`, `Intention.aboutId`,
   `Building.builtBy` and `hh.homeId`. It never writes, never touches `world.rng`, and is tested by hashing before and after.
2. Keep the 500-event feed as description. Do not add a `cause` field to `WorldEvent` yet: it is saved state, so it is a
   save-format and rules-version change, and it would only record causes a subsystem chose to write. Revisit if (1) shows
   that derived chains leave important events unexplained.
3. Bound everything the view keeps (it keeps nothing; it recomputes) and answer queries by id lookup.
4. `scripts/household_life.ts` is the first consumer and the prototype of the household chain.

**What would be fabricated and must not be:** a "because" for an event with no record. The tool prints only text taken from
a plan's `reason`, a request's `status`/`outcome`, a site's `delivered`, a card line. Where nothing was recorded it says so.

## F. Experiments A to H

| | Hypothesis | Status | What exists | What blocks it |
|---|---|---|---|---|
| A | Household survival | **supported, partial evidence** | `scripts/household_life.ts`; seed `river`, 12 households, 8 complete the chain | one seed; a paired ensemble for the *rate* is in [TABLE_EATING.md](TABLE_EATING.md) |
| B | A broken promise changes later cooperation | **not run**; path exists, effect small | `checkCommitments` → `willingness` | needs a lab arm that breaks one promise and a measured later refusal |
| C | Environments produce distinct settlements | **BLOCKED** | | camps are symmetric; no settlement statistics |
| D | Scarcity produces adaptation or migration | adaptation partial, migration **BLOCKED** | reserve plans | no relocation primitive |
| E | Complementary resources produce trade | **BLOCKED** | | no inter-settlement exchange; one camp by default |
| F | Competence and trust produce leadership | **BLOCKED** | | nothing to measure; no influence mechanism |
| G | A skill spreads by contact | **partial**; one channel | `apprentice.ts` | world-rolled, rare, isolated tests; no solo-skill channel; others cannot see skill |
| H | Practices continue across generations | **BLOCKED** for knowledge and practices | relationships, households | no held knowledge; no long run exists |

Blocked experiments are blocked, not substituted.

## G. Defect and blocker register

For each: trigger, consequence, mitigation, rollback. "Fixed" means fixed on this branch.

| ID | Defect | Trigger | Consequence | Mitigation | Rollback | State |
|---|---|---|---|---|---|---|
| D1 | A stocked store cannot be eaten from with a full pack | a person carrying material reaches a store with food that does not fit | 57% of store meals fail; the store is written off for 400 ticks; 47 failures at hunger < 25 [M] | version 9: eat at the store | `setTableEating(false)` / lab arm `rich-no-table-eating`; worlds below 9 never had it | **fixed (v9)** |
| D2 | Inspecting a person deletes their expired `lifeEvent` | `describePerson` → `describeLifeEvent` → `lifeEventOf` (`lifechanges.ts:29`) | saved state of an inspected world differs from an uninspected one; benign for behaviour [R] | make the read path non-mutating | revert one function | open (item 2) |
| D3 | A site can seal its owner in | `findBuildSpot` checks the door tile, not reachability | one death by thirst on seed `cedar` (2026-10-05) | reachability check at siting | n/a | open; not re-run [R] |
| D4 | Death news ignores distance | `lifecycle.ts` lowers needs for all kin and friends at once | omniscient grief; breaks "local knowledge" | gate on what the person could have heard | | open [A] |
| D5 | A hut cannot be built by a household of one | `options_work.ts:693` | 3 of 12 households on `river` stay in lean-tos | a design decision, not a bug | | open; needs the owner |
| D6 | `summarizeWorld` counts births with a regex over the 500-event feed | feed rolls over | births wrong after 500 events | count from person `birthTick` | | open [A] |
| D7 | Market and `attendOptions` read world truth | `occasions.ts:188,286-305` | goods change hands between people who were not together | require co-presence and a belief | | open [A] |
| D8 | Hearsay is counted twice | `reputation.ts:108` + `reputationOf` | inflated reputation | de-duplicate by story id | | open [A] |
| D9 | Time decay is the only passive relationship change | `relations.ts:86` | none harmful; recorded for rule 11 | n/a | | accepted |
| D10 | Per-pair maps and `world.deceased/graves/stumps` grow without bound | long runs | memory growth, linear `find` on `deceased` | prune dead pairs; index | | open [A] |
| D11 | Newborns get adult-range skills | `makeSkills` at birth | no generational learning is possible | inherit or start low | | open [A] |
| D12 | The benefit of reserve and shelter plans is unproven | | features without demonstrated welfare effect | measure in the `town` profile | | open [R] |

**Blockers (architectural):** no relocation primitive; no settlement entity; no held knowledge; no authority or collective
decision; no inter-settlement exchange; no 300-person profile; no event causality; `SCALING.md` measures legacy worlds.

**Unverified assumptions:** every row tagged [A]; that the grievance/willingness decoupling is the reason trust is weak (it is
a reading of the code, not a measurement); that D3 still reproduces.

## H. Where the documents disagree with the source

* `CLAUDE.md` (on `main`) stops at rules version 7; the source is at 8, now 9 on this branch.
* `README.md` and `ECONOMY.md` still say one settlement, only wolves, no hunting, no markets. All are stale.
* `RICH_WORLD.md` names `traditionsTick`, which does not exist; says a dry spell leaves fish untouched (the code slows every source).
* `AUTONOMY.md` R5/R6 ("nobody learns anything about another person", "no reciprocity ledger") predate trust, debt and `p.heard`.
* `INHABITANT.md` says `AGENTS.md` does not exist; it does.
* The midwinter tradition is documented as "first winter survived"; it is created at day 12 unconditionally.
* `grievance.ts` says working side by side eases grievances; `bondWorkers` never calls `easeGrievance`.
* Dead code with no callers: `overdueLoans`, `settlementCount`, `trustOf`/`peekRel`/`familiarityOf`, `grievanceOf`, `commonsStock`,
  `cartLoadItems`, and several `economy.ts` helpers.
