# Civilisation implementation register

Owner programme: 2026-10-24. Audit source: `claude/civilisation-phase1` at `3f6ec66`.
This is the continuation record; the audit remains dated evidence, not current acceptance.

## Authority and reconciliation

Starting checkout `359bce9` is retired wolf defence. Local main `4ad23f1` and remote main
`3d93180` diverged from `287c12b`. Work: `codex/civilisation-programme` in
`C:/Users/RJLoc/.codex/worktrees/civilisation-programme/living-world`.
Untracked files in the original and home-habitation worktrees were left untouched.
WORKFLOW.md permits direct verified integration, no mandatory PR.

Local main owns ore search (8), warmth/single-adult homes (9), smithy fuel (10).
Remote/candidate used 8 for courier recovery and 9 for store eating. Those fixes are
reapplied at **11**; no candidate save is relabelled. Save envelopes now identify the
local-main lineage. Untagged 8/9 saves are ambiguous and rejected without modifying
originals. Open these with their original revision. Earlier continuations remain
unchanged; candidate reference values are retained as `candidate-v*-continuation.json`
and their executable sources remain in Git. Version-10 reference was recorded first.

## Execution map

Stages: S0 reconciliation; S1 township/shared storehouse; S2 history/social consequences/
politics; S3 relocation and route safety; S4 production differences/trade; S5 knowledge/
generations; S6 long-run retention/performance. Status means evidence, not aspiration.

| Audit item | Current source finding / implementation | Stage; acceptance | Status |
|---|---|---|---|
| Roadmap 1 / D1 / A1 eating | Candidate full-pack meal imported at 11, ordinary consumption ledger | S0; table_eating tests, conservation, continuation | verified |
| Roadmap 2 / D2 / A9 observer | Candidate observer flags + life-event read guard imported | S0; purity + full state checks | verified |
| Roadmap 3 / A9 typed history, household/relationship views | Household/project views plus relationship history and bounded known request receipts | S1/S2 panels, full state purity, typed links; missing causes labelled | verified |
| Roadmap 4 / B | B fixture measured at v12 and v13; one prior promise changes willingness and one v13 actual transfer | S2; 9 contexts, control + 2 nudges; see evidence below | verified: controlled mechanism only |
| Roadmap 5 / D5 | Local-main 9 already allows one adult to lay out hut | S0 preserve; existing housing contracts | implemented |
| Roadmap 6 / A3 / D8 | Duplicate direct/reputation and hearsay/scalar effects reproduced and removed at 13 | S2; direct/told/expiry/legacy contracts and B | verified |
| Roadmap 7 / A6 / D | No runtime relocation/founding; reserve/explore exist | S3; known destination, physical household travel/failure, membership, save | unresolved |
| Roadmap 8 / A2 | Persistent township membership now saved at 12; production observations still absent | S1 verified membership; S4 action-derived statistics | implemented: membership; unresolved: statistics |
| Roadmap 9 / A7 / G | Skills/practice/apprenticeship exist; no held technique | S5; contact/time teaching, provenance/loss, practice control | unresolved |
| Roadmap 10 / A5 / F | No civic authority; household head has no political decisions | S1 organiser + support/outcome; S2 rival support/factions/departure | unresolved |
| A1 other survival/cooperation capabilities | Existing needs/gathering/food/reserves/habitation/defence/requests | Preserve and regression test; aggregate survival separate | implemented |
| A4 economy / E | Physical production exists; purposeful cross-settlement trade absent | S4; known counterparty, co-presence, conserved barter/journey/failure | unresolved |
| A6 environment / C | Global weather and symmetric camps; no settlement production observations | S4; sustained actual action/flow differences under opportunities | unresolved |
| A8 generations / H | Birth/age/households/inheritance exist, practices have no holders | S5; bounded transmission records and natural generation timing | unresolved |
| A9 replay/AI | Existing seeded stepping, replay, legal-option model boundary | Every stage continuation/save/load/purity; preserve seam | implemented |
| D3 route blocking | Report predates current source; siting tests clearance only | S1 safety for project; S3 general reachability and occupied exits | unresolved |
| D4 death news | Audit says kin/friends notified globally; not yet rechecked | S2; witness/contact path, isolated bereaved control | unresolved |
| D6 births | Audit reports event-feed regex; not yet rechecked | S5; feed rollover fixture and durable birth counts | unresolved |
| D7 market | Audit reports remote exchanges; not yet rechecked | S4 prerequisite; distant/indoor rejection and conservation | unresolved |
| D9 passive decay | Accepted observation, no demonstrated defect | No change unless new evidence | not applicable: accepted |
| D10 historical growth | Deceased, graves and pair records retain causality; no retention audit yet | S6; bounded retention/indexing with inheritance/replay contracts | unresolved |
| D11 newborn skills | Audit reports adult-range initial skills; not yet rechecked | S5; explicit developmental competence and learning | unresolved |
| D12 / A aggregate reserve/shelter benefit | Historical null/mixed evidence is not failure of mechanism | S6; town paired controls/nudges/ablations, accept null | unresolved |
| B dependency map | Migration is not required for organisation within a settlement | Owner programme supersedes audit ordering; S1 before S3 | superseded |
| A9 performance | 28/100/250 profiles exist; historical timings are legacy | S6; current rules representative profile timings, 300 only if useful | unresolved |
| H docs: CLAUDE rules summary | Current civilisation section names current generation and reconciliation | S0-S2 agent guidance corrected | verified |
| H docs: README/ECONOMY population, animals, markets | Audit leads, update when corresponding subsystem checked | S4 | unresolved |
| H docs: RICH_WORLD traditionsTick, fish/dry spell | Audit leads, no behavioural repair inferred | S5 | unresolved |
| H docs: AUTONOMY R5/R6 | Source already has trust/debt/heard; obsolete absence claims corrected | S2 | verified |
| H docs: INHABITANT missing AGENTS | Old AGENTS absence statement marked superseded | S2 | verified |
| H docs: midwinter calendar vs inherited tradition | Calendar is not transmission | S5 | unresolved |
| H docs: grievance side-by-side easing | No side-by-side easing call; unsupported module comment corrected, no new effect invented | S2 | verified |
| H dead-code list | No programme dependency established | No unrelated cleanup | not applicable |

## Experiment contracts (not results)

A: town household survival; paired current/control/nudge and reserve/shelter ablations;
alive, housed, food shortage; null is valid. B: same saved interpersonal state with one
broken versus kept promise; willingness, ranked options, accepted action. C: same seeds
with measured local opportunity contrasts; sustained per-settlement production/flows.
D: locally perceived hardship versus matched control/nudge; preparation, departures,
arrivals, failed moves. E: complementary known resources versus control/nudge; physical
cross-settlement quantities and recurring counterparties. F: matched organiser histories
of actual completed/failed projects; later voluntary support and choices. G: one technique
holder with/without contact; transmission time, provenance, loss. H: naturally timed
multi-generation runs with/without transmission; holder lineage and changed actions.
Workloads for C-H must be fixed before running once their mechanisms exist. No long
ensemble is launched here; use dispatcher/detached-launch skills for user-machine runs.

## Delivered stage S0 and S1 (2026-10-24)

**S0 verified:** 1013 tests / 103 files passed before version 12. Candidate D1/D2
and courier fixes integrated; candidate tests retained, gates moved to 11. Local-main
continuation values and historical goldens unchanged. Save lineage tests reject
ambiguous 8/9 bytes before replacing any world. D5 already implemented on local main.

**S1 implemented and verified at the contract/runtime level:** version 12 creates
persistent township identities at household formation. A household retains membership
while walking. Public storehouse proposals use the existing decision, siting and
construction activities, with a recorded organiser and an explicit voluntary recruit
conversation. Support, refusal, urgent withdrawal, supplied items, actual work and
completion/failure persist. Organiser death conveys no inherited office; volunteers
may continue. Only participants near an outcome record personal civic experience;
that bounded memory nudges later recruitment acceptance. Public title confers no
access to private stock. At S1 product entrypoints used 12; lab ablation is
`rich-no-townships`. Existing worlds are not migrated. Civic references are validated
on load and included in compact hashes as well as complete saves.

Owner: `townships.ts` owns identity/project/participation/outcome records. Existing
social conversation, work options, resource transfer and construction own execution.
Alternative considered: new group planner/action language; rejected because it would
duplicate navigation, reservations and physical work. Selected: attach the civic
contract to existing public storehouse work and existing promises. Tradeoff: only
storehouses and first-response participation in this slice, not rival proposals,
elected offices, rejoining, factions, taxes or coercion. A township can disagree and
leave its project unfinished. Recent closed project detail is bounded to 24; personal
witnessed outcomes to 24; a project has at most 12 respondents including organiser.
Buildings and ownership remain authoritative after old project detail expires.

`history.ts` derives household/project views from typed records; missing formation
causes say unknown. Relationship history was subsequently delivered in S2a. Inspector shows township,
organiser, support, refusals, missing materials/work and contributions/outcome.
`construction_access.ts` conservatively protects connectivity around **new public
storehouse footprints**, rechecked at placement; D3 for other buildings remains open.

Verification: typecheck; build; full suite 1027 tests / 105 files; standalone golden
script all matches; diff whitespace check. After review repairs, township contracts
expanded to 16 passing tests and focused v10/v11 continuation checks passed. Contract
covers stable membership, local-home trigger and actual site marking, explicit
accept/refuse, withdrawal, public ownership, conservation, exact work, observer full
state purity, mid-promise and mid-haul save/load, invalid membership rejection,
organiser death and corridor obstruction. Browser script passed 10 checks; active,
site and completed screenshots were visually inspected. Initial header overlap was
found by image inspection and repaired with a measured layout assertion.

Staged physical outcome (`scripts/civilisation_scene.ts`): Ada delivered 6 wood,
Ben 4 wood + 4 stone, total actual work 640; public storehouse completed, balanced
ledger. Offered-option controller selects legal build/haul options; this is NOT an
autonomous emergence claim. Script/fixture are labelled staged in the app.
Unmodified `river`, Normal, arrivals off, 14400 ticks: final candidate had one
persistent township and **no civic proposal** in this window, ledger balanced.
An earlier pre-access-check candidate had a proposal/refusal; do not attribute it
to the final candidate. No aggregate benefit, completion frequency or performance
claim. A-H ensembles remain unrun. `civic_evidence` contains small reports/screenshots;
large local saved snapshots are reproducible and ignored.

S1 review findings closed: original courier call signature mismatch; candidate store
meal constant leaked to v10 (caught by immutable reference); private-plan reservations
hid volunteered material; full work credit could overcount the final tick; missing
civic hash fields; saved civic reference checks; public-owner wording; overlapping
header grid rows. Each repaired with the relevant contract/build/browser checks.

## Delivered S2a: social history and single counting (2026-10-24)

Version 13 preserves v12 continuation; no general social weights were raised. Social
execution owns outcomes; `social_memory.ts` retains at most 32 typed receipts per
person after requests expire. Absent askers do not receive remote receipts. History
views derive current relations and receipts, exposing unknown event links honestly.
The alternative of an unlimited event graph was rejected: it would duplicate truth
and grow indefinitely. The bounded view is not a complete lifelong biography.

D8: marked directly applied deeds retain their provenance but do not add reputation
again; retold stories affect reputation without a second permanent scalar adjustment.
An already known story is also marked if a direct consequence follows. Legacy rules
remain unchanged; `rich-no-reputation-dedup` restores old weighting for lab comparison.
Memory markers and receipts are saved/hashed. No currency, offices or factions added.

B contract: 9 fixed generosity/affinity contexts, same present physical state, one
stipulated prior work commitment (40 work versus 0), broken control plus nudge:1/2.
Before correction v12 willingness differences were .113/.134; at v13 .0255/.0465.
At v13 one of the six contexts with an actual conversation changed 2-wood fulfilment
into refusal. Three contexts had no answered conversation, not observed refusals.
All top-five work rankings remained identical; all broken nudges matched the broken
control action. Every ledger balanced. This demonstrates a mechanism; it is not
population benefit or spontaneous emergence. Raw reports retain both rule versions.

Verification: full suite 1037 tests / 107 files; build and typecheck passed. Final
small review repairs (counted-story hash, loaded-person test) passed 7 focused tests
including unchanged v12 continuation. Historical golden script matched. Browser
script passed 7 checks; kept/broken screenshots visually inspected: real conversation,
wood transfer/refusal, typed receipts and grievance visible. Whole saved state stays
identical during inspection. Review found and fixed repeat-story marker handling;
no failing tests were weakened. Faction/rival organiser politics remains S2b.

Next executable work: D4 local death knowledge (current lifecycle/mood notify all
kin/friends) and D6 durable birth accounting (inspect uses rolling event regex), then
S2b competing organisers. Pin v13 continuation before behavioral changes. General
route safety, relocation, trade, knowledge/generations and performance remain open.
