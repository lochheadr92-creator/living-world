# Review D notes: knowledge boundaries and social causality (HEAD b2cf812, rules 115)

Read-only audit of decision-time truth reads. Tests written: tests/zz_review_d_*.test.ts (6 files).

## Decision-time truth reads found (file:line, gate, class)

Live at 115 (class c):
- welfare.ts:129 `if (!subject || !subject.alive) continue;` (visit option dropped when remote subject dies); :43 outOfDate -> isDependent(subject) live health; :138 `isDependent(world, subject)`; :42 `subject.lifeEvent`.
- optutil.ts:156 `dependents: members.filter(isDependent)` live health of all household members (used by optEat keep, optStockpile, optWaterRun, optCare, hhState foodTarget, optDepositFood, surplusOf/reserveOf/careFoodAvailable keep).
- options_work.ts:1862 optClaimHome `e0.hhId !== 0` live owner (comment claims belief-only).
- options_work.ts:1764 return_tool `lender.alive` live.
- options_work.ts:117-123 friendlyTo, :151-156 repairStake: alive + stage of other households' members.
- options_work.ts:622 rules-32 shortfall text from live missingMaterials(siteEnt) (text only).
- options_work.ts:710 `world.sites.filter(hhId===hh.id)`; :810-815 settlement-wide buildings/sites counts.
- social.ts evaluateRequest ~L445-452: `lacks` from live site.required/delivered/used; `ownKids` live membership; helpersOn :163 (all persons' commitments) used in options_social.ts:548 and social.ts:1520.
- options_social.ts:577-580 optPropose reads `q.relations[p.id]` (other's private affinity); :586-588 q's home type.
- options_social.ts:548-553 optRecruit: helpersOn, `c.q.commitments`, activeCommitments(c.q), siteEnt.maxWorkers.
- customers.ts:226-227 `q.alive`, :239 `surplusOf(world,q,k)` of seen person (private reserves).
- production.ts:80 mayUseBelief `real.ops.builders`; :479,:646,:733 `real.ops.shares` (own ledger defence; spoilage facilities.ts:267-279 reduces shares out of sight); :700-703 cart wear/puller within 14 tiles (> sense 9); :816-821 remote cart existence + cartLoaded; :1001 alive count; :1059 outcrop existence.
- provision.ts:117-118 knownGranary `real.ops.builders`; :136-141 granaryShare live shares.
- batch_plan.ts:248-253 batchOutcome: world.carts ownership; site.delivered/used/required live -> plan dropped "came by its planks some other way".
- optutil.ts:337-344 whereIs fallback: byId existence + q.hhId live.
- relocation.ts:103 travellers alive filter; :162-164 organiser `o.hhId` live (death part gated by knowsDeath).
- responsibilities.ts:55-57 childrenNeedingWatch: members laidUp/health live.
- succession.ts:142 hhId of a seen person (fine), :135/:145 gated <92 (class b).

Gated (class b): options_work.ts:1599-1601 watch child alive/position (<82/<56); :1643-1644 deliver recipient alive (<82); social.ts outstandingFor/outstandingForPlan owner commitments (<82); checkCommitments site existence / building existence (<83); succession.ts:135,145 (<92); perceive rules 106 signs; remembered_need knownNeeds (<106 live).

Legitimate (class a): perception (sense radius with light/weather), act_* handlers at arrival, social.ts conversation phases (co-present), occasions arrive/market, defence/hunting on seen animals (a.state retreat visible), optOffer/evaluateRequest reading co-present A.needs (visible signs), relocation assembled/contact checks, candidates() illness visible.

## Perception (Q3)
- senseRadius: light (0.5+0.5*light), weather, child 0.88, fire within 7 extends. Night respected.
- Indoors: sees only own home + same-space persons; cannot see out; refreshBeliefs returns indoors.
- Outdoors: persons indoors are not seen (sameSpace); BUT static entities incl. buildings are observed from outside with full store.items/ops/tools snapshot (knowledge.ts:41-51) -> stores visible through walls. Test zz_review_d_perceive_store.
- refreshBeliefs: no stock updates; only deletes beliefs of vanished entities within 0.92r and fades danger. estimatedAmount is the person's own regrowth estimate from belief ecology sign. No regrowth leak.
- Dead person's beliefs: killPerson removes from persons/byId; deceased keeps id/name only; shareRumour needs both alive at 14+. No use of dead beliefs found.

## Death knowledge (Q4)
- learnDeath via witness (within 10, awake), grave (within 10, outdoors, awake), told (shareRumour death). knowsDeath = relation.deathKnown or heard death rumour.
- Direct q.alive / existence reads at decision time: welfare.ts:129 (TEST), options_work.ts:1764 return_tool, customers.ts:227, relocation travellers :103, optutil whereIs fallback :337 (dead -> null, "does not know where they are"), meeting_knowledge upkeep (process), civic_decision recount (civic record).
- Succession: successionWanted :111 requires knowsDeath(p,u.by) — verified. relocation succession: death via knowsDeath, "left the household" via live hhId.

## Evidence counts (Q5) from retained rules-107 45-day saves
autonomy_evidence/resume107-promise-river-45 (17 alive, 14 dead) / resume107-supply-meadow-45 (23 alive, 6 dead):
- heard rumours 510 / 690 (told 318/423, seen 192/267; kinds generous 204/512, news 263/157, reliable 39/11, thief 4/10; death 228/120)
- socialMemory 492 / 689; expectation 30/47 (own timeout 20/23, observed completion 3/9, helper report 2/10, own cancellation 3/5); completion 47/78 (own 42/62, observed 3/9, helper report 2/7); resolution 9/17; cancellation 8/25; task.receipt (helperReceipt) 11/43; careHandback 0/0
- relations.workHeard 4/15, workTold 4/15; relations.meeting 1/2; relations.accounts (107) 198/279; deathKnown 237/134 (grave 174/102, told 51/12, witness 12/20); handovers 1/8
- whereabouts notes 510/637; with `from` (105) 0/0; with `seen` signs (106) 510/637; room 7/7
- heardDemand (43) 4/12; customers (51) 1/4, supplied>0: 0/0 (rules-51 save river: 7 leads, 2 supplied); tradeLeads (22) 0/0 everywhere (requires speaker and listener in different townships: exchange_journeys.ts:29); exchangeJourneys 0
- careJourney 7/13; civicOutcomes 1/3 (benefit 0/1); households.unfinished 1/0; meals.heard 2/2; sharedSupper 0/1
Zero ordinary creation at 107 in 45 days: whereabouts.from (105), tradeLeads (22), customers.supplied (51), careHandback (97).

## Double counting (Q6)
- reputation.keep dedups sameStory per person; shareRumour copies drop relationshipApplied (13+) so reputationOf skips applied stories; witness() excludes actor/other; onGift noteDeed relationshipApplied=true. civic_benefit one receipt per project; household_practices dedup by mealId; helperExperience dedups requestId+event; addEvent copies ids at 29+. No double count found. Pre-13 worlds double-apply (gated).

## Stale beliefs (Q7)
- Sources: estimatedAmount regrowth, sourceUsable/recentFailure, noteFailure at arrival (act_resource 220/342/378/793), source_learning 74/75 empty correction, noteDepletedSource (32). Stores: stockAt/foodInBelief use belief items without age discount; refreshed only by sight (observe at arrival/passing). No age discount on store beliefs (by design: "cost of local knowledge").

## Tests
- zz_review_d_welfare_truth (2 tests) PASS; zz_review_d_dependents_truth (2) PASS; claim_home, request_site, perceive_store, propose: see run log.

## Test run (2026-11-01)
All six files pass: welfare_truth 2/2, dependents_truth 2/2, claim_home_truth 1/1, request_site_truth 1/1, perceive_store 1/1, propose_truth 1/1 (vitest, ~1.5s each batch). git status: only the six untracked tests added; no tracked file changed.
