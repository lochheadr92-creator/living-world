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
| Roadmap 1 / D1 / A1 eating | Candidate full-pack meal imported at 11, ordinary consumption ledger | S0; table_eating tests, conservation, continuation | implemented |
| Roadmap 2 / D2 / A9 observer | Candidate observer flags + life-event read guard imported | S0; purity + full state checks | implemented |
| Roadmap 3 / A9 typed history, household/relationship views | Existing requests, commitments, sites, households carry typed links; no durable universal cause | S1 minimal project view; S2 history navigation, unknown causes explicit | unresolved |
| Roadmap 4 / B | Broken promise affects social state; no measured counterfactual yet | S2; matched initial state, one changed promise, ranking/willingness/choice | unresolved |
| Roadmap 5 / D5 | Local-main 9 already allows one adult to lay out hut | S0 preserve; existing housing contracts | implemented |
| Roadmap 6 / A3 / D8 | Relations, trust, debt, grievances, hearsay exist; duplicate influence needs repro | S2; single-count witnessed/told memory contracts and B | unresolved |
| Roadmap 7 / A6 / D | No runtime relocation/founding; reserve/explore exist | S3; known destination, physical household travel/failure, membership, save | unresolved |
| Roadmap 8 / A2 | Hubs are coordinates; cohort capture is diagnostic only | S1 persistent membership; S4 action-derived statistics | unresolved |
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
| H docs: CLAUDE rules summary | Stale candidate version descriptions | S0/S1 update current policy with lineage mapping | unresolved |
| H docs: README/ECONOMY population, animals, markets | Audit leads, update when corresponding subsystem checked | S4 | unresolved |
| H docs: RICH_WORLD traditionsTick, fish/dry spell | Audit leads, no behavioural repair inferred | S5 | unresolved |
| H docs: AUTONOMY R5/R6 | Predates trust/debt/heard | S2 | unresolved |
| H docs: INHABITANT missing AGENTS | Stale file-existence claim | S2 | unresolved |
| H docs: midwinter calendar vs inherited tradition | Calendar is not transmission | S5 | unresolved |
| H docs: grievance side-by-side easing | Audit says bondWorkers never calls easing | S2 recheck and correct prose | unresolved |
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
access to private stock. Current product entrypoints use 12; lab ablation is
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
causes say unknown. Full relationship history remains S2. Inspector shows township,
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

Next executable work: S2 pure relationship-history views and the broken-promise
counterfactual B before changing existing social weights. Do not tune scores to force
a positive result. Then audit D4/D8 against that evidence; D3 broader route safety,
D6/D7/D10/D11 and S3-S6 remain unresolved as mapped above.
