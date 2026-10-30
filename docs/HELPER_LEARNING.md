# Personally received material and later helper choice — rules 78

Predecessor 77 was pinned at `f84dbaf` from runtime `8063625`, including a physical fulfilled material promise and its
saved/replayed continuation. Its expected file and explicitly versioned fixtures remain unchanged.

## Missing link and ownership

The prior physical diagnostic (`scripts/helper_task_diagnostic.ts`, explicit rules 76) demonstrated Ada requesting two
stone, Ben voluntarily promising and physically delivering them, and Ada making a pick. The durable receipt only retained
the request ID, counterpart, outcome, reason, role, site and tick. Once the operational request expired, it did not retain
the task or a structured direct delivery. Existing helper choice used general trust or current distance/carrying evidence.

`helper_learning.ts` extends the existing request receipt owner. It does not create another memory store or assign work.
`social.ts` records the last positive physical hand-over to the requester, naming its item, quantity, tick and conversation
or activity ID. A promised amount, remote site delivery, deposit in a building or mere arrival is not a direct receipt.
The request's existing delivered total remains separate: **last direct hand-over is not a cumulative delivery total**.
The two integrated hand-over boundaries are an immediate request response and the ordinary promised `give` activity.
Customer re-supply, remote contributions and non-material competence remain outside that positive evidence path.

When the existing request settlement creates a personal receipt, it retains kind, requested item, requested amount,
offered amount when known, and that direct receipt when present. The existing same-space/three-tile contact requirement
for the asker remains. The helper knows their own settlement; uninvolved people gain no task receipt. Old receipts stay
unknown; they are not reconstructed from current world truth or guessed from prose.

## Bounded influence and limits

The existing maximum of 32 receipts and request-ID deduplication remain. Influence additionally deduplicates the physical
conversation/activity ID, so two request records cannot multiply the same hand-over. Choice considers at most the two most recent
distinct matching requests within 12 days. Each positive direct receipt contributes 3 for its first four days and 1.5 for
the remainder; maximum 6. This is a bounded experience preference, **not a probability of success or a measured skill**.
The period covers the existing one-day project cooldown and repeated contact; longer-term retention/benefit is unproven.

Only requester-role evidence with the exact request kind and material, and a positive matching direct receipt, contributes.
Wood does not establish stone capability, nor does a stone hand-over establish childcare, repair or forging skill.
Partial delivery can establish that something real was supplied; failure, refusal, interruption and absence of evidence
do not introduce an ability penalty. Existing relationships still have their own consequences; this feature adds none.
No helper inventory, skill, private plan or live willingness is read to infer competence.

For private material plans, the bounded preference supplements the asker's existing trust ordering among candidates; all
current carrying, age, contact, own-work, cooldown and capacity checks remain. For construction material requests, it
adds a small score component to already eligible asks. This is evidence of supplying the material, not proof that the
helper can haul it to the site. The helper still evaluates the request and can decline or propose an existing alternative.
Lab removal `rich-no-helper-learning` disables recording and influence while leaving ordinary trust and replies intact.

The existing relationship-history panel shows requested/agreed amounts and the last direct receipt, or says that direct
receipt/ability was not established by that outcome. Legal-option reasons name the actual request, event and tick. The
AI inhabitant receives the same legal reason; no observer-only history or another person's private memory is exposed.

Existing modules touched, and why: `social_memory.ts` retains the typed evidence; `social.ts` owns the real transfers;
`options_social.ts` owns eligible helper choices; `history.ts` renders recorded facts; `types.ts`, `save.ts` and `world.ts`
retain, validate and hash the added data; `rulesversion.ts` protects historical behavior; `scripts/lab/lab.ts` owns removal.

## Evidence and review

The current staged fixture first performs the real request → voluntary promise → two-stone hand-over (activity 29,
tick 989) → pick crafting (completed by tick 1190), with exact recorded AI transcript replay. It then runs to tick 2000.
For a **separate staged follow-up workload**, it creates a known home site and moves two existing store stones into the
competing helper's initial challenge stock. That redistribution is ledger-conserved and grants no experience. Cora is
deliberately nearer from the initial setup; Ben starts with lower personal trust. No receipt, learned ability or outcome
is injected. This challenge is not an ordinary-world frequency or uninterrupted autonomous project-completion claim.

At tick 2281, the same eligible stone asks rank Ben first with the evidence (30.5814 versus Cora 28.0036), and Cora first
without it (28.0036 versus Ben 27.5814). The chosen real request reaches Ben. He **declines at tick 2327 because he is
making something himself**. The old two-stone receipt remains, the new refusal has no direct receipt, and no ability
penalty is added. Saved and uninterrupted continuations through tick 3000 are identical and resources balance.

Exploratory failures are retained: `autonomy-helper78-choice-trace.log` produced no second request in its longer follow-up;
food/night needs took priority, and its temporary fixture hooks were not retained through the AI runner's rewind, so it
is not valid proof of persistent pinned helpers. `...trace2.log` revealed the second workload used the existing site-ask
path and also used a stale pre-rewind world for its comparison. `...trace3.log` correctly sampled the actual decision but
changed only the score, not the selected helper. `...trace4.log` is the explicit nearer-comparator challenge above. These
are mechanism fixture investigations, not replacement ordinary seeds or an improved-world claim.

Focused contracts: **20/20** across helper learning, existing project helpers and immutable rules 77
(`autonomy-helper78-final-focused.log`, 12.54 seconds, after the event-deduplication repair). They cover actual receipt/use, delay/save, a changed eligible choice,
valid later refusal, uninformed/nonmatching cases, bounded/aging evidence, duplicate event influence, legacy/ablation,
malformed saves, observer purity and resource conservation. Unit cases with synthetic receipts are labelled separately.

Rendered checks: **7/7**, `scripts/browser/helper_learning_check.mjs`; screenshots and report in
`autonomy_evidence/helper78-fresh-rendered/`. Visually reviewed the retained delivery and later refusal in the actual panel,
alongside the carried pick and real feed events. The browser preserves full state and shows a genuine started request
after loading. Typecheck and production build pass (`autonomy-helper78-final-build.log`), with the existing large chunk notice
at 998.20 kB JavaScript. Final full suite: **263 files / 1,757 tests passed**, 175.41 seconds
(`autonomy-helper78-final-full-tests.log`), after the event-deduplication repair. Source and tests remained frozen during
that suite and the final ordinary measurements. The existing oversized-timeout warning remains; whitespace checks pass.

The long-running Vite server produced one failed browser removal comparison after hot reload: `helper78-final-rendered`
reported the same selected helper with the removal switch on and off, while the engine fixture passed. Restarting only
the owned development server, with no source or fixture changes, restored the expected difference and all seven checks.
The evidence is the failed report plus `autonomy-helper78-fresh-browser.log`; distinct hot-reloaded module instances are
the likely cause, not a verified engine defect. Final rendered evidence uses the fresh server.

Review found and fixed an additional boundary: the initial unit cap fixture copied one physical event under different
request IDs and incorrectly expected two contributions. Influence now deduplicates the event as well as the request;
the cap fixture uses distinct events and separately proves duplicate-event neutrality. The first passing full suite
(263 files / 1,757 tests, 166.94 seconds, `autonomy-helper78-full-tests.log`) and initial river report preceded that repair.
The final verification above uses the repaired frozen source; the earlier outputs remain attributed evidence.

Review confirmed that refusal is not negated by previous ability, zero/remote transfers cannot mint direct evidence,
partial hand-overs do not claim the whole ask was delivered, and historical unknowns remain unknown. Broader work/care
competence, communication of inability/delay/cancellation, conflicting reports and dispute attribution remain open in A7
and the wider programme. This slice does not complete those requirements or establish aggregate benefit.

## Ordinary five-day measurements

Fresh Normal rich worlds, no immigration, fixed river/forest/meadow seeds and 12,000 ticks. Each run has 2,800 living-person
samples, 100 full-state/RNG purity checks, an exact unobserved saved twin and balanced resources.

| Seed | Material ask starts | Retained task receipts (both roles) | Direct requester receipts | Samples with a direct receipt (either role) | Influenced offers / starts / changed top choices | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| river | 62 | 94 | 1 | 182 | 0 / 0 / 0 | 85.29 |
| forest | 45 | 132 | 8 | 566 | 0 / 0 / 0 | 81.10 |
| meadow | 51 | 104 | 6 | 761 | 0 / 0 / 0 | 64.36 |

Reports/manifests: `autonomy_evidence/r78-river-final/report.json`, `r78-forest/report.json`, `r78-meadow/report.json`.
Reproduce with `npx --no-install vite-node scripts/helper_learning_observe.ts -- <seed> <fresh-output>`.
The preliminary river report predates only the event-deduplication repair and is retained separately as `r78-river`.
Runs overlapped tests, so runtime differences are not a controlled performance result. Samples are not independent people;
receipts can concern food/water/care as well as materials, and a helper's own receipt does not influence requester choice.

River's actual direct record is requester 1116, helper 1125, request 1822: two wood received at tick 1061, activity 1865.
Forest includes one direct wood receipt among its eight direct receipts; the other seven concern food, water or care.
This establishes ordinary structured receipt recording. **Ordinary later influence and aggregate benefit remain unproven.**
Longer and mature-world validation remains pending under `AUTONOMY_VALIDATION.md`; no favourable seed substitution or
reduced success threshold was used.

Next local audit: the private-plan ask path consults the existing communicated `MAKING_NOTE`, whereas the construction
ask path does not. This is an inspected pre-existing eligibility gap, not yet a reproduced repeated-request failure.
Trace actual refusal, remaining material, contact and cooldown before extending it. Keep that operational willingness
question separate from the real past delivery and from work/care competence that has never been demonstrated.
