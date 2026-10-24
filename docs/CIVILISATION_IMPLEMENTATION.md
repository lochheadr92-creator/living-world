# Civilisation implementation register

Owner programme: 2026-10-24. Audit source: `claude/civilisation-phase1` at `3f6ec66`.
This is the continuation record; the audit remains dated evidence, not current acceptance.

## Owner queued priority after this programme

Owner instruction, 2026-10-24: finish the current civilisation implementation programme
and its required verification first, then address the five inhabitant audit findings
before unrelated new features. Do not interrupt or truncate this programme for this queue.

The committed [ordered queue and acceptance criteria](https://github.com/lochheadr92-creator/living-world/blob/030d62d/docs/audits/2026-10-24-odette/NEXT_PRIORITIES.md)
are: F1 shelter timeout after conversation; F3 ambiguous duplicate choice keys;
F2 missing crafting-block explanation; F4 stale post-conversation summary; F5 mixed
time labels. Status: queued, not started. Reproduce against the finished current
implementation before changing it; the original evidence is from version 13, not a
claim about the completed programme. Preserve historical save/replay semantics and
record current evidence if implementation work has already resolved a finding.

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
| Roadmap 10 / A5 / F | V12 project organiser; v15 explicit competing coordinators and voluntary support; no inherited office | S1/S2 bounded contracts/runtime; persistent factions and wider proposals remain | implemented: coordination; unresolved: factions/F ensemble |
| A1 other survival/cooperation capabilities | Existing needs/gathering/food/reserves/habitation/defence/requests | Preserve and regression test; aggregate survival separate | implemented |
| A4 economy / E | Physical production exists; purposeful cross-settlement trade absent | S4; known counterparty, co-presence, conserved barter/journey/failure | unresolved |
| A6 environment / C | Global weather and symmetric camps; no settlement production observations | S4; sustained actual action/flow differences under opportunities | unresolved |
| A8 generations / H | Birth/age/households/inheritance exist, practices have no holders | S5; bounded transmission records and natural generation timing | unresolved |
| A9 replay/AI | Existing seeded stepping, replay, legal-option model boundary | Every stage continuation/save/load/purity; preserve seam | implemented |
| D3 route blocking | Report predates current source; siting tests clearance only | S1 safety for project; S3 general reachability and occupied exits | unresolved |
| D4 death news | Confirmed global mood/need/partner notification; replaced at 14 with witness, grave or co-present typed news | S2; isolated bereaved, indoor/sleep, repeated story, mid-journey continuation | verified |
| D6 births | Confirmed regex count; v14 lifetime counter incremented at actual birth, legacy scope labelled | S2 prerequisite; rollover/death/save fixtures | verified |
| D7 market | V15 historical attendance enables remote trades; v16 validates physical venue/contact and local knowledge | S4 prerequisite; rejection, conserved barter, mid-walk save and rendered arrival | implemented: verification below |
| D9 passive decay | Accepted observation, no demonstrated defect | No change unless new evidence | not applicable: accepted |
| D10 historical growth | Deceased, graves and pair records retain causality; no retention audit yet | S6; bounded retention/indexing with inheritance/replay contracts | unresolved |
| D11 newborn skills | Audit reports adult-range initial skills; not yet rechecked | S5; explicit developmental competence and learning | unresolved |
| D12 / A aggregate reserve/shelter benefit | Historical null/mixed evidence is not failure of mechanism | S6; town paired controls/nudges/ablations, accept null | unresolved |
| B dependency map | Migration is not required for organisation within a settlement | Owner programme supersedes audit ordering; S1 before S3 | superseded |
| A9 performance | 28/100/250 profiles exist; historical timings are legacy | S6; current rules representative profile timings, 300 only if useful | unresolved |
| H docs: CLAUDE rules summary | Current civilisation section names current generation and reconciliation | S0-S2 agent guidance corrected | verified |
| H docs: README/ECONOMY population, animals, markets | Corrected obsolete one-settlement/one-species/no-market claims from current source; no purposeful intertown trade claimed | S4 market prerequisite | verified |
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

## S2 lifecycle correction: version 14

`death_knowledge.ts` owns personal learning of a death. The lifecycle owns death,
registry removal, inventory drops and operational obligation cleanup; those remain
immediate. Existing relations retain one typed learned-death marker, bounded stories
carry an identity/timestamp, and graves link to that identity. Alternative: consult
the global deceased list during decisions; rejected because that recreates omniscience.
No new unbounded death-news journal is introduced and no old ancestry is deleted.

Awake nearby witnesses in the same indoor/outdoor space learn first. A distant partner
keeps their believed partnership until hearing or observing evidence, then grief,
needs and bereavement change once. Grief starts at learning, not the unseen death.
Conversations require co-presence; prose containing "died" is not a typed death fact.
Funeral options require known death and a nearby visible gathering at a known place;
there is no remote invitation system yet. Automatic grave/funeral creation remains
legacy physical behavior; this slice does not implement burial labor or mourning culture.

D6: fresh v14 worlds start birthCount at zero; actual births increment it once, and
neither feed rollover nor child death erases the total. Historical worlds retain the
old calculation, with the tooltip explicitly calling it a surviving-feed count.
No historical lifetime total is invented. New fields are saved and hashed. The v13
reference was pinned at 078150b before changing rules; `rich-global-death-news`
provides the cheap knowledge ablation, not a product mode.

The staged runtime scene has Ben physically walk from x42 to x64.7, then tell Cora
(at x66) about Ada. At tick 340 she first learns the death from Ben. It takes 241
simulation steps; the ledger balances. Save/load 100 steps into the journey gives
identical complete final state. Viewer sees the actual "Ada has died" speech and
Cora's learned-tick/source in relationship history. Before contact she has no such
record or grief. This is a controlled fixture, not spontaneous discovery evidence.

Verification: stable full suite 1045 tests / 109 files passed. Initial full run overlapped the
last test/implementation edits and reported two failures in death news (speech and
same-day story identity); preserve `life-full-suite.log`. The stable focused rerun
passes 13 tests, including v13 continuation and legacy reputation. The passing stable full
rerun is `life-full-final.log`. Review caught a typed death story colliding with an
unrelated same-day news story; identity-based dedup and its regression fix that.
Rendered before/after screens are inspected; eight browser checks include full saved
state purity. Build/typecheck and historical standalone golden script pass.

Next executable work: S2b competing proposals/organisers; D7 co-present market repair
before cross-settlement trade. General route safety, relocation, knowledge/generations,
and current-rule performance/ensemble measurements remain open. Do not infer these
from the staged scenes.

## S2b: competing project coordinators (version 15)

Architecture: `civic_decision.ts` owns bounded candidate/support rules attached to the
existing civic project. Alternatives considered: duplicate rival physical buildings,
or alternate coordination proposals for the same public storehouse. Selected the
latter: preserves existing materials/site and creates meaningful disagreement without
speculative budgets, offices, property seizure or wasteful duplicate construction.
`organiserId` retains the original proposer; the council records the current coordinator.

A proposal begins without a mandate. At least two actual supporters and a strict lead
in support permit their coalition to work. Ties, withdrawal, death or household departure
remove the mandate; materials already supplied remain on the public site. Candidate
identity is never assigned from age or wealth. A respondent who knows the site may
propose an alternative coordinator after a personal grievance, distrust, witnessed
failure or known organiser death. The proposal is made in the ordinary co-present
recruit conversation. A resident may retain prior support or switch based on their
own affinity, trust, grievance and witnessed organising outcomes; the same outcome
is not added as another reputation story. Existing willingness/survival gates remain.

Four candidates, twelve participants, one response per person/candidate, twelve recent
coordinator transitions per retained project. No second civic truth store: accepted
conversation responses update the participation record. Switching releases the old
work promise as interrupted, without a fabricated moral failure. A failed tied project
is not attributed to an invented coordinator. Lab ablation: `rich-no-civic-choice`.
Version 14 continuation was pinned in 4c597b9 before implementation.

Contract evidence includes one-person blocking, physical accepted support, offered
challenge option, actual switch from Ada to Cora, tied support, urgent withdrawal,
coordinator death, private inventory conservation, complete observer purity, save/load,
and v14 continuation. A current-rule construction fixture still physically finishes
with exactly 10 wood, 4 stone, 640 work. Staged runtime shows Ben support Ada, Cora
refuse Ada, then Ben switch to Cora in an actual conversation. Mid-response save/load
produces identical complete final state. Eight browser checks pass; screenshots were
visually inspected. This demonstrates project-level collective decisions, not natural
leadership frequency or enduring factions. Experiment F remains unrun.

Review: the first fixture inadvertently allowed a different autonomous conversation
while waiting, so it did not isolate the requested interaction. The corrected labelled
fixture holds bystanders idle and waits for the exact asker/respondent request; it does
not force acceptance or alter probabilities. Other contracts retain autonomous stepping.
The challenge reads the person's last heard/supported organiser, not unseen current votes.

Remaining S2c: repeated alignments with persistent decision consequences and rival
investment priorities. S3-S6 remain as registered. Do not label a one-project coalition
an inherited faction or the whole civilisation programme complete.

S2b boundary checks: full suite 1052 tests / 111 files; build and typecheck passed;
historical golden script matched. Final review repaired the lab ablation's outcome
credit (work access already reverted); eight focused checks including v14 continuation
passed afterward. No product behavior or earlier reference was changed by that repair.

## S4 prerequisite: physical markets (version 16)

Confirmed D7: a v15 market attendee retained in the historical attendance list can
trade from x75 with someone near x40. V16 rejects that transfer before reading the
counterparty's pack/needs. `market_contact.ts` owns the physical boundary; `occasions.ts`
still owns attendance and barter; inventory transfer/ledger stay in economy.ts.
Alternatives: maintain a second live attendance roster, or validate actual presence
at each exchange. Selected validation avoids stale duplicate state. Both must be
awake, outside, within 3 tiles of each other and within 8 tiles of the active, existing
venue. The attendance list remains a history. Arrival relationship effects likewise
require local presence. A person must know the venue before generating attendance.

Both parties still evaluate their own surplus and valuation; no remote counterparty
inventory is consulted. Whole equal barter quantities are capacity-checked before
transfers; a capacity-limited fixture exchanges exactly one wood for one fish and
reports those quantities. Gifts preserve food already promised/reserved. A full pack
can honestly prevent a trade; simultaneous pack unloading is not added. No currency,
merchant role, invented goods, long-distance journey intent or new production labels.
`rich-remote-markets` restores the legacy path; v15 continuation pinned at 00fb9dd.

Staged rendered scene: Ada starts at x65; distant barter leaves complete state unchanged.
After 226 steps of the normal attendance activity she is at x40.5, Ben at x42, and
2 wood exchange for 2 fish. Both packs and the feed show the real quantities, ledger
balances. Saving 50 steps into travel produces identical complete continuation.
Eleven market contracts pass, including legacy reproduction, distant/indoor/asleep/
closed/wrong-place rejection, limited/full capacity, reservations and venue knowledge.
Seven rendered checks pass; final screenshots visually inspected with carrying visible.
Boundary checks: full suite 1065 tests / 113 files, build/typecheck and standalone
historical golden script pass; diff whitespace check clean. Broader S4
purposeful intertown exchange and measured dependence remain unresolved.
