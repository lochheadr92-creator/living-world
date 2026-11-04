# State budget inventory — P0.6

Source audit: 4 November 2026, rules 148 (`65ae5cbb` plus the format-5 persistence work). This is a documentation-only inventory and a set of **proposed measurement thresholds**, not a change to retention, simulation state or save semantics. It replaces the older roadmap's assumption that logs, social memory, decisions and exchange receipts are all uncapped. The ordered programme is [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## Existing bounds and their exact scope

Paths and line numbers identify the inspected writer/validator at this checkpoint. A per-person bound is not a whole-world bound; a soft cleanup trigger is not a maximum. Retention never proves sufficient memory for every obligation or future decision.

| State | Existing behavior | Owning source |
|---|---|---|
| Event feed | Last 500 events | `src/sim/events.ts:4`, `:39` |
| Chronicle | Last 400 retained events | `src/sim/events.ts:9`, `:44` |
| Visual effects | Last 400 effects | `src/sim/events.ts:5`, `:57` |
| Person log | Last 60 entries per person | `src/sim/events.ts:6`, `:51` |
| Relation history | Ordinary writer shifts one entry above 6; grievance writer shifts one above 24. These are writer thresholds, not a universal truncate-to-6 operation; history grown to 24 can stay there. | `src/sim/relations.ts:63`, `src/sim/grievance.ts:31`, `:46` |
| Checked teller accounts | One summary and last account per relationship; counters are halved at 12 before incrementing, not a list of 12 full accounts | `src/sim/checked_accounts.ts:31`, `:55` |
| Heard reputation | 30 records per person | `src/sim/reputation.ts:27`, `:60` |
| Social memory | 32 records per person | `src/sim/social_memory.ts:29` |
| Decision ledger | 8 entries, with count of dropped entries; at most 3 passed-over and 3 blocked choices per entry | `src/sim/decision_ledger.ts:22`, `:32` |
| Mood thoughts | 14 per person | `src/sim/mood.ts:27`, `:53` |
| Welfare concerns | 6 per person, ordered by observation recency | `src/sim/welfare.ts:29`, `:66` |
| Production graph | 32 nodes, depth 6, search 96, quantity 24, 4 alternatives, 3 retries, 8 history entries | `src/sim/project_graph.ts:7` |
| Settlement production observations | 8-day window, at most 512 rows | `src/sim/settlement_economy.ts:19`, `:21` |
| Goods-flow observations | 128 rows, distinct from authoritative inventory and commitments | `src/sim/settlement_economy.ts:47` |
| Exchange receipts | 128 worldwide | `src/sim/exchange_journeys.ts:43`, `:111` |
| Trade leads / journeys | 12 leads and 8 journey records per person; at most one live journey | `src/sim/exchange_journeys.ts:34`, `:72`, `:114` |
| Civic project history | Retains 24 ended projects when a new project is added; live projects are not deleted by this cleanup | `src/sim/townships.ts:73` |
| Civic participation / council | 12 participants, 4 candidates, 12 leadership changes per project | `src/sim/townships.ts:148`, `:164`; `src/sim/civic_decision.ts:29`, `:101` |
| Personal civic memory | 24 entries | `src/sim/townships.ts:117` |
| Heard/told undertakings | 2 of each per relationship | `src/sim/continuity_knowledge.ts:53`, `:56` |
| Place memories / skill experiences | 8 of each per person | `src/sim/personal_places.ts:11`, `:33`; `src/sim/skill_coaching.ts:14`, `:46` |
| Prey / livestock beliefs | Specialized bounds of 4 prey and 12 livestock memories; not a global belief cap | `src/sim/passive_gear.ts:133`, `src/sim/livestock.ts:171` |
| Death final-account detail | Last 40 detailed accounts; up to 3 blocked reasons and 3 recent memories, strings truncated to 500 | `src/sim/final_account.ts:7`, `:11`, `:13` |

## Unbounded and softly bounded state

The proposed thresholds below are initial **diagnostic alarms** for P0.7, not measured safe limits and not authority to evict state. Report counts, serialized bytes, growth per day, and high-water marks before designing a retention change. Normal/Large thresholds deliberately differ. A breached alarm triggers inspection, not automatic cleanup.

| State and growth | Current cleanup / limitation | Proposed budget or candidate policy, not implemented |
|---|---|---|
| Beliefs per person: encountered or told entity IDs accumulate | `knowledge.ts:125` inserts; `perception.ts:236` removes missing entities only after local rediscovery and expires danger after 1,600 ticks. No global total cap found. | Alarm at 512 Normal / 2,048 Large per person. Any future finite cap must protect live goals, known homes, routes and obligations and preserve source/tick provenance; no omniscient pruning. |
| Relations per person: first interaction creates a record | `relations.ts:10` creates by person ID; no general relationship eviction found. Per-relation list bounds do not bound the number of relations. | Alarm at 128 Normal / 512 Large per person. No automatic deletion of kin, debt, unresolved grievance or active obligations. Candidate later policy: compact dormant neutral relations only after revisit-delay measurements. |
| Requests worldwide: each request appends | `social.ts:323` removes one resolved record above 260. If all are pending/promised the list can exceed 260, so 260 is a soft target. | Keep live obligations regardless of count; propose a 260 ended-record budget and alarm at 512 total. An actual implementation must retain references used by current commitments/history. |
| Commitments per person: accepted undertakings append | `social.ts:774` filters only once above 10, retaining all active and those made within 4,000 ticks. This is not a hard cap of 10. Some acceptance paths limit simultaneous promises, but not a global bound. | Alarm at 32 total per person. Candidate budget: 16 ended records after reference/retention analysis; never silently drop active commitments or their remaining goods. |
| Civic records: active projects and townships | Ended projects/participants/councils are bounded as above; no single world-wide live-project/township cap established by this audit. | Alarm at 4 live projects per township and 32 townships. Retain every paid unfinished site; only derived views may be aggregated without a behavior change. |
| Deceased archive: one identity/cause record per death | `lifecycle.ts:266–268` removes the full person and appends a death record. `final_account.ts:13` caps detailed payloads, not death identities. The derived lookup in `historical_index.ts:9` tracks the archive. | Alarm at 10,000 death records. No deletion cap proposed for canonical identities/causes; candidate paged historical storage with a 256-entry hot view only after measured need, preserving all saved records. |
| Piles: physical abandoned goods, estates, carcasses and gear | `world.ts:299–313` spoils goods and removes empty ordinary piles. Specialized carcass/gear lifecycle owns its contents; no arbitrary global entity cap. | Alarm at 4 piles per live person plus 64. No eviction cap on nonempty physical piles. Any later merge must preserve location/access/ownership/tool identity and accounting; decay must remain physical and rules-versioned. |
| Told/asked maps: listener/source or person IDs | `news.ts:53,70` and `social.ts:328` store timestamps; no global map-size cleanup found. Operational timer cleanup at `memory_retention.ts:12` covers only named deadline prefixes, not all maps or all cooldowns. | Alarm at 2,048 told / 512 asked entries per person. Candidate expiry only for keys whose complete readers use a finite look-back; prove unchanged behavior with off-path and saved-continuation tests. |
| Failure memory / other cooldown keys | Specialized care and route memory have local cleanup (`care_capacity.ts:41`, `route_learning.ts:22`); successful local observation can remove a failure (`knowledge.ts:242`). No general finite global bound established. | Alarm at 512 of each per person. Inventory every key's timestamp/counter meaning before proposing expiration; never apply deadline cleanup to counters or source evidence. |

For already bounded logs (60), social memory (32), decisions (8) and exchange receipts (128), the proposed cap is **retain the current cap** until a measured deficiency or cost justifies changing it. The same applies to the other bounded rows. No new global transfer log, causal graph or duplicate authoritative inventory is proposed.

## Measurement and completion boundary

P0.6 inventory is complete for the collections named in the revised plan, with additional currently relevant bounded records above. Verification was a source audit of owning writers, cleanup and validators, not a fresh proof of worst-case memory or correct long-term retention. The existing retention test's one-day checks are narrower than a mature-world bound.

P0.7 remains open: measure current all-on Normal and Large at a genuine day-45 state, with an explicitly recorded arrivals setting. The old plan's arrivals-off comparison against frozen rules 109 may be retained as a separately labelled historical comparator; it must not replace the owner's current arrivals-on baseline. Measure step/inspector/save/load p95, saved bytes, heap and frame submission when competing workloads are absent. The plan's proposed ratios (1.25x step/inspection, 1.5x bytes/heap) are comparison thresholds, not observations. The two early format-5 size snapshots in [SCALING.md](SCALING.md#product-save-format-5--4-november-2026) do not close P0.7.

No cap in this document is applied to runtime or saves. Future changes need a demonstrated growth or adequacy problem, a bounded contract, protected-state handling, and appropriate compatibility/evidence under the normal workflow.
