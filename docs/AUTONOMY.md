# Plans, projects and bounded action (the autonomy brief)

What this brief adds to the village: a person can mean to do something that takes longer than one activity, carry that meaning
across the interruptions of an ordinary day, and end up having done it — or not, for a reason they can be asked about. Everything
here is behind `settings.dynamics = 'rich'` — the private plans of Stage C, and the asking for help of Stage D1 — and an authored
world takes on no plans and makes no such asks, so the golden fingerprints that pin authored worlds are unchanged by every commit in
this brief. Those fingerprints say nothing about the rich world: night planning
and control by hand are checked separately, and reported separately below.

The mechanism is deliberately small. `src/sim/intent.ts` does two things and no more: it keeps a plan's own next step from being
thrown away merely for scoring low, and it adds a bounded +14 to that step's score. It never makes anyone do anything; the engine
still generates every option and still ranks them, so hunger, thirst, cold and a wolf keep winning. Each plan reads only what its
owner knows (their needs, the places they remember, the light they can see), never the world behind their back.

## The requirement matrix (R1–R14)

These are the brief's own fourteen requirements. Each is a scope, not a feature: a requirement counts as **met** only when the whole
of it holds, **partial** when some of it is implemented and the rest is named below, and **unstarted** when essentially none of it
is. Stage C's work falls inside R2, R10 and R13 and does not finish any of them.

| # | Requirement | Status | What is implemented, and what the status rests on |
|---|---|---|---|
| R1 | Distinguish possible actions from preferred actions | partial | Every option carries a utility and a `make()` that may fail; impossible ones go to `ctx.blocked` **with the reason**, and the inspector answers "why didn't they take that?" by separating "could not" from "was outscored" (`optutil.ts addBlocked`, `inspect.ts`). Stage C made the distinction bite: a plan's step stays a candidate at utility 0, so "possible but not preferred just now" is no longer thrown away (`decision.ts rankOptions`). **Not done:** the distinction lives in the option layer, not in anyone's head — nobody can be asked what they *could* do as against what they want to do. |
| R2 | Persistent personal intentions and longer projects | partial | Three kinds of personal plan (`intent.ts`): get through the night, make a tool, mend a roof. Stage D1 lets a tool project reach past its owner: it can ask for what it lacks, carry an outstanding promise without counting it as material, and say what it was waiting on when it ends. Adopted for stated reasons, carried across 30+ activities, set aside and resumed, revised, finished or abandoned with a reason; saved, hashed and replayed. Evidence: `tests/projects.test.ts` (26), `tests/night_plan.test.ts` (28) and the autonomous runs below. **Not done:** horizons are one night or two days and at most two plans at once (`MAX_INTENTIONS`); nothing spans weeks (a house of one's own, a stocked store), nothing has sub-goals, and no plan is shared with anyone. |
| R3 | Deliberate waiting, sheltering and bounded activities | partial | Waiting out the night is a real action that takes real time and is credited by time actually spent under shelter (`options_survival.ts optShelter`, `intent.ts creditShelter`). That credit was broken until the F1 repair below — the activity carried no shelter to be credited against — so the claim now rests on a test that drives the real option (`tests/night_plan.test.ts`, "a night really spent in shelter is the night the plan is judged on"). Activities accept bounds, validated so a limit can only ever make one stop sooner, with an invalid limit refused outright (`optutil.ts OptionLimit`, `decision.ts checkLimits`; `tests/action_bounds.test.ts`, 11). **Not done:** only a controller ever sets a bound — an autonomous person never chooses "two portions" or "an hour of this"; and the only thing anyone waits for is daylight. |
| R4 | Modest practical foresight | partial | A person projects thirst and hunger forward over the hours of darkness they can see coming, from their own needs and the sky, and that projection is what a night plan rests on (`intent.ts nightLooksHard`, `untilDaylight`). A repair is taken on while the roof is merely going, not after it fails. **Not done:** one horizon only (the coming night) and one projection; winter stocking is still pressure from `hardship.ts` rather than anticipation, and nobody anticipates another person. |
| R5 | Learning from experience | partial | Pre-existing: a failure at a place is remembered and steers choices away from it (`knowledge.ts noteFailure/recentFailure`), beliefs go stale, skills rise with use, wolves are remembered. Stage C: three failures at the same target end a project, with that failure as the reason (`tests/projects.test.ts`). **Not done:** nothing durably changes what a person prefers — no one learns which sources repay the walk, or which neighbour never returns a tool. |
| R6 | Practical relationships and precise social decisions | partial | Pre-existing: affection/trust, requests, declines, grievances, warnings, meals. This brief: a warning reports what it actually came to — delivered, they knew already, nothing to tell, never got to it (`social.ts warnReport`; `tests/social_warning.test.ts`, 5). Stage D1: a refusal names the claim the decision actually used — none at all, owed to someone else, spoken for by my own project, my own needs — and in ordinary runs refusal is the common answer (22 of 29 requests in the measured run). Rich-only: an authored world keeps the wording it had (`tests/project_cooperation.test.ts`). **Not done:** no one weighs a relationship against a project over time; no bargaining, no reciprocity ledger, and nobody knows what another person is *able* to get. |
| R7 | Local cooperation and shared projects | partial | Pre-existing: promises to help build, haul and work, settled by what the promiser knows (`social.ts checkCommitments`; `tests/commitments.test.ts`, `tests/cooperation.test.ts`); building sites are shared work in effect. Stage D1 adds the first cooperation on a *personal* project: a bounded material contribution asked for locally, decided independently, kept or refused through the existing commitment and activity machinery, with a promise that outranks the promiser's own plan (`tests/project_cooperation.test.ts`, 26; 24 of 65 projects asked in the measured run, making 29 requests, 5 units delivered). **Not done:** two people still cannot adopt one project, divide it, or join one someone else is carrying; one project type, one contribution type, no shared labour. |
| R8 | Skills, teaching and adaptive specialisation | unstarted (skills aside) | Skills exist, rise with use, change what people choose and how fast they work, and weight which tool someone wants (`options_work.ts wantedTool`). There is **no** teaching, no apprenticeship, and no specialisation that forms and persists. Stage C added nothing here. |
| R9 | Landscape changes through use | partial | Pre-existing: sources deplete and regrow, more slowly in harsh worlds (`sources.ts`, `hardship.ts regrowRate`); buildings, sites and plots change the map; belongings drop where someone dies. **Not done:** nothing wears a path, exhausts a patch for good, or marks the ground from use. Stage C added nothing here. |
| R10 | Preparation, maintenance and material consequences | partial | Maintenance is real and measured: a repair consumes material, raises condition, credits only the hands that did it, and is abandoned when a neighbour gets there first (`act_build.ts creditRepair`, `intent.ts repairStep`). Making a tool is real: the ordinary recipe, the ordinary accounting, credited where the tool is minted, so having one is told apart from having made one (`creditMade`). Preparation for the night is judged on what actually happened, not on where someone stood at dawn. Material consequence: what a plan has spoken for cannot be spent twice and is free again the moment the plan ends (`freeOf`/`freeInv`). **Not done:** only homes are maintained (tools wear out and are replaced, never mended); preparation reaches one night ahead, not a season. |
| R11 | Household and generational continuity | partial, untouched by this brief | Pre-existing: households, conception, birth, ageing, death, orphan adoption, immigration (`lifecycle.ts`), tools reassigned and belongings dropped on death. **Not done by this brief:** a plan is strictly personal — nothing is passed on, nothing is taken up by a survivor, and no plan belongs to a household. |
| R12 | Bounded composition of known actions | partial | Bounding is done and tested (R3 above): limits are declared by the option, validated, and may only narrow. **Composition is not implemented at all** — neither a person nor a controller can build a new action out of known ones. A plan sequences known actions one step at a time, which is the nearest thing in the tree and is not composition. |
| R13 | Causal history and watchable explanations | partial | Explanations: the record of each decision says what was weighed (`decision.ts because`), the person card answers five questions plus, for someone with a plan, a line that keeps three things apart — the step settled on, whether it is under way, and what became of the project (`inspect.ts qa.plan`, `intent.ts planOfActivity`; `tests/projects.test.ts`). Stage D1 adds the states of asking for help, each one the records actually hold: asked, promised and not yet delivered, part delivered, delivered, refused with the reason given, ended — with the contributor, recipient, item, quantity and project on the row, checked in the running page. Causal history: the cascade tracer links happenings into chains (`scripts/cascade.ts`), logs and events are per person, and paired tests show one event changing a later, different decision (`tests/chains_consequence.test.ts`, 2). **Not done:** history is reconstructed by scripts over a run; the app cannot be asked at any moment why a particular state came about, and a decision's record is kept only for the last decision. |
| R14 | Reliable manual control and replay | met for what is tested; narrow | Manual control: the clock does not move while a decision waits, an answer belongs to the tick it was composed for, a stale or repeated answer is refused, and handing control back leaves nothing pending (`src/app/inhabit.ts`, `src/ui/inhabit.ts`; `tests/inhabit_manual.test.ts` + `tests/inhabit_manual_reliability.test.ts`, 16). Replay: a recorded run replays from its transcript, a mid-project save carries on identically, the fingerprint covers plans, and the verifier itself is tested (`scripts/statediff.ts`, `tests/statediff.test.ts`, 6). **Limits:** one person at a time can be driven by hand, and replay equality is checked on the world hash and a state diff, not on what is drawn. |

### Stage C's acceptance, which is not the brief's completion

Stage C was accepted on four things, all measured below: tool-making produces a real tool through the existing recipe and
accounting; home repair consumes materials and measurably improves condition; materials reserved for a plan cannot be
double-spent and are released when the plan ends; and the explanations keep choosing a step, executing it and completing the
project apart. Those four hold.

They are a subset of R2, R10 and R13, and of nothing else. Stage D1 adds one bounded slice inside R6, R7 and R13 (with the R2 work
its project needed): the cooperation chain works and is observable. It does not complete R6 or R7, and it says nothing about whether
a village that cooperates this way fares better. R8 and R12's composition half are essentially unstarted; R1, R3, R4,
R5, R6, R7, R9, R11 and R13 are partial with the gaps named in the table. The brief is **not** complete, and no ensemble run has
yet said whether any of this changes how a village turns out.

## Stage C: what was built

1. **Two projects on the existing mechanism.** A tool someone means to make and a roof they mean to mend are both `Intention`s of
   their own kind. The engine will not offer the last step (craft, repair) until the materials are in the pack, so the plan is what
   carries the want across the fetching: it keeps the fetching step a candidate and says, truthfully, what is still missing.
2. **Reservations that bite on the person's own other uses.** `plannedFor` already kept a plan's materials out of gifts. It now also
   keeps them out of unpromised site deliveries, the camp fire, a neighbour's roof, and out of what counts as "already fetched" for a
   site's needs. A **promise outranks a private plan**: a promised delivery may still spend the material, and the plan then reports
   that it is short again. This was not theoretical — before it, a basket's wood went to the nearest building site over and over, and
   the plan's step kept resetting from "get 1 more wood" to "get 3 more wood".
3. **The planned tool stays on offer.** `optCraft` used to offer only the tool a person would want *now*, which drifts as they learn
   the country and gain skills. It now also offers the tool a live plan is about, so the step the plan fetched the materials for does
   not quietly stop existing. (One extra option, scored the ordinary way; authored worlds generate exactly what they did.)
4. **Every live plan has its step recognised.** Someone may carry a project and, come the evening, a night plan. The ranking used to
   look only at the first of them, so the second one's step got neither the nudge nor the record.
5. **Failure adaptation and honest endings.** A step that fails three times ends the project with the failure as the reason. A
   deadline that passes says what was still missing (`never got round to the pick (still short 2 stone)`), or, when the materials were
   there, says that instead (`had the makings for the basket but never sat down to it`). A plan now records the tick it `ended`, and
   the same kind of project cannot be taken up again for a day after the last one ended — "gave up for want of stone" followed at once
   by "means to make it: the makings are short" is the same decision made again with nothing new to go on.
6. **Three explanations, kept apart.** Choosing a step is recorded where the choice is made (`a step toward “make an axe”: get 1 more
   stone for the axe`, then the ordinary scores). Executing it is the activity's own business: the activity carries `forPlan`, and the
   inspector says `under way (Chopping wood)` versus `settled on, not started` (`intent.ts planOfActivity`: an activity chosen for a
   hut is not the plan's step merely because it brings back the same material, and a mark left by a plan that has ended counts for
   nothing). Completing the project is a third thing, reported only when the plan ends: `done: made the axe`, `given up: never got
   round to the pick (still short 2 stone)`.
7. **Having a tool is not having made one.** `(p.inv[tool] ?? 0) > 0` is also true of a tool borrowed from a neighbour or taken off
   a workshop rack, and the plan used to call that "made the basket". The making is now credited where it happens, beside the mint in
   the craft handler (`creditMade`), so a project finishes as `made the basket` only when those hands made it; a tool that arrived
   some other way ends the plan as `came by a basket without making it` — the want is met, but nothing is claimed that was not
   measured.
8. **A plan is about one particular tool.** `servesIntent`'s `make` case accepted any crafting, so with two crafts on offer a plan to
   make a basket could be served, nudged and credited by making a pick. It now matches the tool the plan names.
9. **The lab tells the truth about its counterfactual, and a baseline is not a gate.** `rich-no-night` (alias `rich-no-plans`) removes every private plan, projects
   included, and now says so. Two metrics were added for the outstanding ensemble run: `tools` (tools in living hands) and
   `meanCondition` (how sound the standing buildings are). Neither is gated, so the recorded baseline in `docs/gates.json` still
   works. `scripts/gates.ts` now keeps creating a baseline apart from checking against one: `--record` needs an explicit `--file`,
   will not overwrite an existing baseline without `--force`, writes down which world the numbers came from (dynamics, profile, fork
   day, days, branch, seeds), and a check refuses to compare runs of different worlds. The authored baseline in `docs/gates.json`
   cannot be replaced by a rich run by accident, and every row the lab writes now records its `dynamics`.

## Evidence: ordinary autonomous runs

`npx vite-node scripts/projects.ts -- --seed <seed> --profile normal --days 10` creates a world the way the app does, runs it
forward, and reads every change to every person's plans off the records the simulation sets. Nobody is scripted and nothing is
forced. A project counts as finished only if the thing itself happened: a tool really in the pack, condition really put back by that
person's own hands.

| | seed `meadow` | seed `river` |
|---|---|---|
| people alive after 10 days | 28 | 29 |
| tool projects taken on | 64 | 74 |
| … finished, with the tool in the pack and the making credited to their own hands | 20 (20/20 verified) | 33 (33/33 verified) |
| … given up, with a stated reason | 32 | 31 |
| … carried across 2+ activities | 63/64 (median 35) | 74/74 (median 32) |
| … set aside at least once | 38 | 33 |
| repair projects taken on | 9 | 10 |
| … finished, condition put back by their own hands | 5 (e.g. 49→74, 28 theirs) | 5 (e.g. 55→75, 28 theirs) |
| night plans taken on / finished | 45 / 23 | 42 / 28 |
| materials account balances | yes | yes |

What held projects up, counted from the records: `a wolf about` ×51 and ×41 for tool projects, `warmth comes first` ×11 and ×2, and
`no food there` (a step that kept failing) on repairs and night plans. Projects were taken up again after being set aside 53 and 38
times. Night plans revised what they were about (a different shelter, or one that turned out not to be there) 27 and 19 times.

The same script on an authored world, same seed: **0 projects taken on by 0 people**, and the materials account balances. That is
the rich-mode boundary, measured rather than asserted.

One run, trimmed to the beats (seed `meadow`, Isla, 33 activities started while the plan stood, 5 of them its own step, set aside 3×):

```
d1 10:09  means to make an axe — it would make the work easier, and the makings are short
d1 10:09  first step: get 2 more wood for the axe
d1 13:36  took the step: Chopping wood
d1 14:03  step now: get 1 more wood for the axe     (one of the two was in the pack)
d2 10:12  took the step: Chopping wood
d2 11:54  step now: get 1 more stone for the axe    (the wood was there; the stone was not)
d2 15:13  did something else: Breaking stone        (chosen for a hut, not for the axe — but the stone counted all the same)
d2 16:42  took the step: Making an axe
d2 20:13  did something else: Sleeping by my lean-to
d3 05:09  set aside: a wolf about                   (she warned three people about it instead)
d3 07:38  taken up again (make the axe)
d3 07:43  took the step: Making an axe
d3 08:35  finished: made the axe
```

Between those beats she drank, fished, ate, slept, talked, asked Jonas for wood, picked berries and worked on the hut. That is the
point: the plan survived two ordinary days without overriding any of them. Note the line at d2 15:13 — a step counts as taken only
when the engine chose it *for the plan*; breaking stone for somebody's hut still put stone in her pack, which is why the next beat
is the craft, but the explanation does not claim she did it for the axe.

## What the fingerprints prove, and what they do not

Two different comparisons are used in this project, and they are not interchangeable.

**`hashWorld`** is the compact behavioural hash. Of the intention and cooperation state it covers only (rich branch, `world.ts`):

| line | what it carries |
|---|---|
| `N<person>` | each plan's `kind`, `status`, `stepKey`, `setAside` |
| `O<person>` | each live commitment's `kind`, `to`, `item`, `amount`, `delivered`, `contrib` |
| `J<request>` | each plan-bound **pending or promised** request: from, to, item, amount, status, plan |

**`serializeWorld`** keeps everything the game would save, which for the same state additionally includes: a plan's `sheltered`,
`worked`, `ended`, `since`, `until`, `wants`, `reason`, `blocked`, `step`, `stepItem`, `stepTarget`, `aboutId`, `makes`, `goal`; and
a request's `delivered`, `offered`, `purpose`, `note`, `resolved`, plus every settled request and ended plan.

So **two worlds can share a behavioural hash and still disagree about what happened**: the F1 defect (a whole night under shelter
credited to nobody) moved `sheltered` only, which no hash covers, and it survived every hash comparison in the suite. The same is
true of partial deliveries, the reasons plans ended, and how much anyone was ever owed.

**The standing rule for this brief:** acceptance evidence for intentions and cooperation requires a **full serialized-state
comparison** (`serializeWorld` + `scripts/statediff.ts deepEqualState`) **plus** assertions on the records themselves — event
history, intention reasons and counters, commitments, request status and delivered amounts. A matching `hashWorld` may be reported
alongside, never instead. Golden fixtures and the hash algorithms are unchanged by this rule; `docs/SCALING.md` already describes
golden's own pair of fingerprints (`hashWorld` and a deep hash of the whole save).

## Stage C: F2, two plans at once (one night, one project)

What was wrong: `reviewIntentions` returned on the first live plan before it ever reached its own capacity check, and
`adoptProject` refused outright while anything was live. So `MAX_INTENTIONS = 2` was never enforced (the check was dead code) and
in practice nobody could mean two things at once - a project and the coming night were mutually exclusive.

The contract now implemented, in four slices, each gated on its own tests:

1. **Allocation.** A plan's shortfall is reckoned against the share of the pack that is actually its own, handed out in **adoption
   order** (`intent.ts shareOf`, `stillNeededFor`). That order is bookkeeping, not precedence: it decides whose stone this is, never
   which plan the person works on next. For any number of plans: nobody is allotted more than they want, the allotments together
   never exceed what is carried, and the answer depends only on the list and the pack - so it survives a save and a replay. A plan
   not yet adopted counts only what no live plan has spoken for (`freeOf`). Record-trimming now skips live plans.
2. **Capacity.** Both gates repaired: at most `MAX_INTENTIONS` live, at most one of each kind, a night plan may join a project and a
   project may join a night plan, and a third or a duplicate kind is refused. Adopting one leaves the other untouched - same `since`,
   same `wants`, no set-aside.
3. **Lifecycle.** A death ends every live plan with `dropped`, reason **"they died"**, clearing `wants`. The schema has no
   "interrupted" for a private plan and inventing one would change the save for a single word, so `dropped` carries it - the
   limitation is recorded here. The activity is ended first, so hours actually sat through are credited and nothing accrues after.
4. **Inspector.** The card lists every plan it finds, each with kind, goal, step, state (`under way` / `waiting` / `blocked` /
   `done` / `ended`), what it still lacks, its progress, its deadline and its outcome (`inspect.ts planViews`, `PlanView`). No plan
   is labelled the leader, because the engine has no such notion: the one being got on with is the one that reads `under way`.

Measured, read-only, on a live 6-day `normal` rich world: **most live plans held by anyone at any tick: 2**; **0** ticks with two of
a kind; **38,071** person-ticks holding a night plan *and* a project at once; **0** person-ticks where a dead person still held a
live plan. In a 10-day run the difference shows where it should: night plans **90 adopted / 51 finished** (45/23 when a project
blocked them), repairs **8 of 11 finished** (3 of 11 before), projects 19 of 70, and the materials account balances.

## Stage C/D1 closure: F4, F5, F7, F8

Four defects found by the read-only closure audit, each repaired minimally and each with a regression that fails without its fix:

| | was | now | regression fails without the fix with |
|---|---|---|---|
| **F4** a top-up ask refused as "enough" | `evaluateRequest` measured other people's promises against *this request's size* (`lacks = req.amount`) for a person-destination ask, so two promises of one "covered" a shortage of three | for a plan-bound ask, `lacks` is the plan's real uncovered shortfall (`intent.ts planShortfall`, which counts only that plan's own share of the pack); the site branch is untouched | `{"kind":"decline","reason":"enough"}` |
| **F5** a kept promise read as half-done | `settle` records a fulfilled request's outcome as `kept`; `agent/run.ts talkOutcome` matched `fulfilled` but not `kept`, so the transcript called it `partial` | one line: `kept` maps to `success`; partial, refused and cancelled keep their own readings | `expected 'partial' not to be 'partial'` |
| **F7** one night credited to two plans | `creditShelter` matched on `aboutId` alone, and a repair plan is about the same home as the night plan, so sitting out a night inflated the repair plan's `sheltered` | kind-gated like `creditRepair`/`creditMade`: only a night plan earns shelter time | `expected 1014 to be +0` |
| **F8** an unrelated craft spending claimed material | `craftOption` gated on the raw pack, so the wood set aside for a basket could go into an axe | the tool a live plan is about may use that plan's allocation; any other tool may use only `freeOf` — the same rule site deliveries, the camp fire and a neighbour's roof already follow | `['craft:axe','craft:basket']` instead of `['craft:basket']` |

A craft already under way keeps its materials (it was chosen when they were free); the plan adopted afterwards simply reports the
real state of the pack at its next review. No new reservation subsystem was added, and no claim is held by a running activity.

Two integration tests were added, which the audit had listed as missing proof:

* **Test A — two live plans, a contested pack, a save in the middle.** A project and a night plan, wood the project has spoken for,
  400 ticks of ordinary life, a save, then 3,000 further ticks across first light. The resumed world is compared with the
  uninterrupted one by **full serialized state** (`deepEqualState`), and separately by intention records (kind, status, reason,
  `sheltered`, `worked`), commitments, event history, request status and delivered amounts, with conservation on both. The compact
  hash is checked too, and reported as the weaker check.
* **Test B — cooperation while carrying two plans.** Unprompted: the project's shortage becomes an ask, a neighbour answers for
  himself, material really moves, the project's shortfall moves by exactly what arrived, and the night plan is neither erased nor
  credited (same `status`, `sheltered`, `since`, `until`). The card shows both plans, with the help named on the project alone and
  the request carrying the project it was for.

## Stage C follow-up: the world judges, not the next decision

The dawn repair put the order right but left the *timing* in the wrong hands. `reviewIntentions` runs only from `decide`
(`decision.ts`), and when somebody next decides depends on `p.nextThink` - which carries a jitter drawn from their own id
(`decision.ts reviewActivity`) - on whether an activity is running at all, and on pauses. Two people with physically identical
nights could therefore be judged at different moments, with different verdicts, and a person who never became free was never judged
at all. Measured: the same night came out `done` when judged at day fraction 0.250 and `dropped` ("sheltered, but still thirsty at
dawn") when judged at 0.359, because needs had drifted in between.

What is due is now settled by the world, in its own person phase: `world.ts stepPerson` calls `intent.ts settleIntentions` for every
living person, after the death check and before perception and deciding, in the same deterministic order as the rest of the tick. It
carries the same three-step contract (account for the physical thing, conclude what is due, then let a deadline end what has no
verdict of its own), needs no option context, allocates nothing, and costs one length check for anyone with no plans - which is
everyone in an authored world. `reviewIntentions` calls it too, so every entry point agrees and settling twice in a tick is a no-op;
what is left in `reviewIntentions` is the part that genuinely needs the options, which is adopting a plan and keeping its step up to
date.

Measured after the change: every verdict lands at first light (tick 2281, frac 0.250) whatever the owner's schedule, and the night is
judged on the facts at that moment - thirst 100 and 90 both `done`, 80 and 70 `sheltered, but still thirsty at dawn`. A stay that
outlasts the night is judged on the hours it has actually sat through (`shelterInFlight`, counted once). A person who dies in the
night keeps the hours they really sat through and is given no verdict at all. In an ordinary 8-day autonomous run, 17 of 23 night
plans now finish, where before a plan's fate turned on when its owner happened to reconsider it.

Three existing expectations changed with it, deliberately: the F1 test's night now ends `done` (judged at dawn, when that person was
still watered, rather than an hour later when they were not); the dawn test asserts the verdict arrives at first light *before* the
deadline rather than after it; and the need-short case needs thirst 80 to be genuinely short at dawn. The regressions fail without
the world-phase sweep - the night is judged late (frac 0.359) or not at all.

## Stage D1: one person's project, another person's help

The slice is one causal chain, end to end and no wider: a project of someone's own is short of a material → they ask somebody
standing there whom they can see carrying it → that person decides for themselves → an accepted contribution competes with their
own needs and promises → the material really moves → and both sides' explanations say only what their owner did.

**Where the responsibility lives.** Nothing here is a new engine. The ask is an ordinary option (`options_social.ts`, beside the
other asks); the answer is `social.ts evaluateRequest`, unchanged in substance; the obligation is a `Commitment` in the existing
commitment system; the material moves through the ordinary `give` activity and `transfer`; the project is judged by
`intent.ts reviewIntentions`; and the explanations are read off those records at display time (`inspect.ts`). Three small things were
added: `Request.planId` (which project an ask was for), `Request.delivered` (how much actually arrived, written only where material
changes hands), and `intent.ts planHelp` / `outstandingForPlan`, which read the requests and the promiser's own commitment and say
what they add up to. There is no second ledger: the plan still owns what it wants, the request owns the asking, the commitment owns
the obligation.

**What the asker may do.** Only what they can see and know: their plan's own shortfall (`wants` minus what is in the pack), minus
what is already asked for or promised for that same plan, and only to someone within 12 tiles whom perception reports as carrying
that material. They ask only when fetching it themselves is not quick (no option on offer that yields it within 260 ticks), never
while a critical need or a wolf is on them, never as a child, and not again about that material for 900 ticks after asking. A
promise is **not** counted as material: the step still says what is missing, and the craft option is not offered until the stone is
actually in the pack.

**What the helper may do.** Decide. `evaluateRequest` weighs their relationship, their own needs, their promises, their private
plans' reservations and what they can get, and answers: hand it over now, promise to bring it, or refuse. A refusal names the claim
the decision actually used — `no_item` (there is none), `committed` (owed to somebody else), `making` (spoken for by their own
project), `own_need`, `unwilling`, `disliked`, `enough` (others have already promised it). The precise wording is rich-only: an
authored world keeps the answer it always gave, because the reason a refusal gives is part of what follows from it.

**Rules chosen here, and why.**
- *A promise outranks a private plan* (as designed in Stage C): a promised delivery may spend material the promiser's own plan had
  spoken for, and that plan then truthfully reports that it is short again.
- *Material that arrives after the need has gone stays with the recipient.* The helper has no way of knowing a project ended — they
  learn things by being there — so they still bring it. The stone is real, it stays in the recipient's pack, the obligation is
  discharged as kept, and the project that ended stays ended: it gets no credit, and nothing is destroyed. (`conservationReport`
  holds through every one of these cases.)
- *Help never makes a tool.* The craft is still the asker's own work, credited where it happens (Stage C `creditMade`), and the
  finished record names the two acts separately: `made the axe (Ben brought 1 of the stone)`.

### Evidence: an ordinary autonomous run (seed `meadow`, normal profile, rich, 10 days)

`npx vite-node scripts/projects.ts -- --seed meadow --profile normal --days 10` — nothing scripted, no helper assigned:

Projects and requests are different denominators, and are reported as such (one project may ask more than one person):

- **24 of 65 tool projects asked a neighbour** for material, between them making **29 requests**.
- Those 29 requests came to: **22 declined, 4 fulfilled, 2 failed, 1 broken** — and **5 units of stone actually delivered**.
- Repair and night plans asked nobody; they are outside this slice.
- Refusal is the common answer, which is the honest shape of a village where everyone has their own plans. (The count is of
  requests still on the world's record; the existing cap evicts settled requests past about 260, which this run never reached.)

One sequence in full (Sven's pick, from the run's own report):

```
d1 11:09  step now: get 2 more stone for the pick
d1 15:49  asked Bea for 1 stone
d1 16:02  Bea promised 1 stone (0 brought so far)
d1 16:26  set aside: a wolf about
d2 02:55  taken up again (get 1 more stone for the pick (Bea promised 1, not yet delivered))
d2 12:30  took the step: Breaking stone              (he kept working for it himself)
d2 12:58  Bea brought 1 stone                        (~21 hours after the promise)
d2 13:16  step now: get 1 more stone for the pick
d2 15:11  asked Dax for 2 stone
d2 15:24  Dax: declined
```

The project was later given up — he never got the full two stone in time — and says so. Another, Edda's pick: asked Bea (declined),
asked Ivo (declined), then found stone herself and finished it. Both are the chain working; neither is the chain succeeding by
being made easy.

### Evidence: focused contract tests

`npx vitest run tests/project_cooperation.test.ts` — **26 passed**. The scenes place people, needs, sources and relations; from
there the engine does the work. Where a test needs the ask taken at a particular moment it uses the external-controller seam to pick
an option *the engine offered*; no test scripts the helper's answer, writes a commitment's outcome, or credits anyone with work.

| Acceptance case | What the test holds |
|---|---|
| A — ordinary chain | She asks unprompted, is given the stone, the account balances, the step becomes the making, she makes the axe, and the record reads `made the axe (Ben brought 1 of the stone)` — with the gift on the event log as a gift |
| A2 — promise ≠ delivery ≠ project | The promise is a commitment with a quantity and a recipient, `delivered` 0, nothing in her pack, the craft option absent, no second ask while it stands; then the material arrives by ordinary work, the request is fulfilled, the obligation discharged, and the tool still has to be made |
| B — meaningful refusal | `making` when his own project has spoken for the stone and he cannot fetch more (he tried that rock and it gave him nothing); `no_item` when there is none — in both, no promise and no transfer are fabricated |
| C — interruption | Thirst at the edge puts the promise aside (`setAside` set, still active, nothing credited, his card says so), and afterwards it is either kept or ends with a reason — never silently as a success |
| D — no double spending | Two askers cannot both be promised the one stone that exists (the second is refused, and he owes one, not two); promised and delivered are counted separately, and neither is material in the asker's pack |
| E — stale project / recipient | A project that runs out of time says what it was waiting on; the delivery still happens, the stone stays with her, no tool appears, the ended project stays ended; a recipient who dies makes the promise `moot` with its reason and the request `cancelled`, losing nothing |
| F — save/load | A world saved with an outstanding promise, then run 4000 ticks, is **state-identical** to one that was never saved (`deepEqualState` over the whole serialized world, not a hash) |
| G — authored preservation | No plans, so no project ask is ever offered and no request carries a project; and a refusal in an authored world still says `own_need`, as it always did |

Reported separately, by system: authored golden **9 passed** (no fingerprint re-recorded), rich night planning **41 passed**, control
by hand and in the page **20 passed**, determinism and save **35 passed** (with `tests/save_storage.test.ts`), everything **484
passed in 49 files**. `npx tsc --noEmit` and `npm run build` both clean; `git diff --check` clean.

### Evidence: the running app (headless Chrome, DOM only)

`npx vite --port 5182` then `node scripts/browser/cooperation_check.mjs` — **6 of 6 checks passed** against the real page, a rich
village of 28 people, reading only what the interface puts on screen. Three project asks arose naturally in the page within the
window. What the person card showed:

```
Asked Bea for 1 stone — make a pick     DECLINED    Making · 15s ago
Asked Zeke for 1 stone — make a hoe     FULFILLED   1 of 1 stone brought · Promise kept · 26s ago

WHAT ARE THEY SET ON?  Make a pick. Step: get 1 more stone for the pick — settled on, not started. Bea said no (making).
WHAT ARE THEY SET ON?  Make a hoe. Step: make the hoe — settled on, not started. Zeke brought the stone (1).
```

A promise reads as a promise, a delivery says how much was actually brought, and the delivery does not finish the project — the
making is still the next step. This is a check on the text the interface puts on the page; it is **not** a check on how any of it
looks to a human eye, which a headless browser cannot show.

### Stage D1 correction passes: four acceptance defects

**1. A partly covered shortage was asked for twice.** The generation block checked `outstandingForPlan` against the shortage but
then asked for the whole shortage again: three wood short with one already promised produced a request for three, so four were
coming for a need of three. The remainder is now computed before the bound (`uncovered = short − outstanding`, then
`min(uncovered, 3)`), and coverage and inventory stay distinct — promised units are coverage, never material in the pack.

The response path could drift the same way while a helper walked over, so an unanswered ask is now kept in step by the person who
made it (`social.ts keepOwnAskHonest`, in the existing `updateRequests` sweep, every 30 ticks). While it is **pending** they narrow
it to what is still uncovered, or withdraw it (`no longer needed: it is covered now` / `…that project has ended`). It uses nothing
but the asker's own plan and pack, and it never touches an obligation anyone has already given: a promise once made runs its own
course, and the helper learns of a change by being there.

**2. A partial contribution was labelled fulfilled.** A helper with two of the three asked for transferred two — correctly — and
the request was then recorded as `fulfilled`. There is now a `partial` status, and the three quantities are kept apart: `amount`
(asked for), `offered` (what the helper actually agreed to), `delivered` (what arrived). A partial gift records
`asked for 3, given 2, received 2 wood`, creates **no** commitment, and leaves nobody owing the difference; the asker's plan simply
reports that it is still one short, and the card says `Ben brought 2 of the 3 wood asked for, and owes nothing more`. A promise kept
in full that still answers only part of an ask settles as `partial` too (`promise kept: 2 of the 3 asked for`).

**Where the authored line is drawn.** The sharpened record is rich-only. An authored world keeps the wording it always had — a
partial gift there is still recorded as `fulfilled`, and no `offered` field is written into an authored save — because the golden
fingerprints are the authored contract and this slice is not allowed to move them. That is a known, deliberate untruth in authored
worlds, not an oversight; a future commit that re-records the fingerprints could carry it across.

Regressions (in `tests/project_cooperation.test.ts`, which is now **26 tests**), each through the ordinary option → request →
response → transfer path, with no commitment outcome written by hand:

| Case | What it holds |
|---|---|
| partial coverage | three wood short, one already promised → the ask the engine generates is for **two**, and coverage never exceeds the shortage |
| coverage drift | a pending ask for three, then another neighbour promises two → the ask narrows itself to **one** before anyone answers, and no answer can push the total past the shortage |
| covered another way | material found meanwhile → the unanswered ask is withdrawn as `no longer needed`, and nobody is left owing anything |
| a helper spares less | asked 3, had 2 → exactly 2 moved, account balances, status `partial`, `offered` 2, `delivered` 2, **no** commitment, and the plan reports `get 1 more wood for the basket` |
| the pack limits it | a nearly full pack takes less than was offered → `delivered` < `offered`, status `partial`, the helper keeps the rest, and no debt is invented |
| authored | no plan, so no project ask, no `partial` status and no `offered` field anywhere in an authored run |

**3. An answer could act on an ask that had stopped being one.** `phaseRespond` checked only that the request existed, so the
periodic sweep was doing work that belongs at the moment of the answer. Two orderings were reproduced: the asker came by the
material before the next 30-tick sweep and was given more anyway; and the sweep withdrew the ask first, after which the answer
transferred a stone regardless and turned `cancelled` into `fulfilled`.

The answer is where material moves and obligations are taken on, so the ask is now checked there. Before any side effect, a project
ask is brought up to date against the asker's own plan and pack (the same `keepOwnAskHonest`, narrowing or withdrawing it), and the
status is then **rechecked**: anything no longer pending gets no answer at all — no transfer, no promise, no thanks, no change of
standing — and the exchange records itself as `nothing was needed`. The periodic sweep is kept, but nothing depends on it for
correctness any more. Existing promises are untouched, so the late-delivery rule above still holds, and the check is rich-only: an
authored world answers exactly as it did.

| Case | What it holds |
|---|---|
| need met after the last sweep, before the answer | the answer gives nothing: status `cancelled`, `delivered` 0, both packs and the commitment count unchanged, standing unchanged, account balances, and the sweep afterwards does not reopen it |
| already withdrawn by the sweep | it stays `cancelled` through the rest of the exchange and 400 ticks beyond: no gift of wood on the record, no promise, nobody owing anything, her card still shows nothing brought |
| answered once | the rest of the exchange and 600 ticks beyond change neither the status nor `delivered`, and no obligation appears afterwards |
| authored | no plan to revalidate against, so the authored answer is the answer it always was |

**4. The guard ran in the wrong order, so a second answer rewrote a settled record.** Replaying the answering step of the same
exchange left the stone where it was — nothing moved twice — but turned `fulfilled` into `cancelled` and replaced `received 1 stone`
with `no longer needed: it is covered now`, because the revalidation ran *before* the status check and happily rewrote a record that
had already been settled. The order inside the rich guard is now: turn away anything that is not pending, **changing nothing about
it**; revalidate only a still-open project ask; look at the status again; and only then evaluate and carry out the answer. The
helper itself (`keepOwnAskHonest`) now also returns at once for anything that is not pending, so its own contract is safe wherever
it is called from (both call sites already check, which is why the regression below pins the order rather than the helper).

The continuation test (another 600 ticks, which never calls the same response twice) was supplemented with a real repeated-response
regression: it puts the exchange back on its answering step and runs `updateConversations` again.

| Case | What it holds on repetition |
|---|---|
| a fulfilled ask, answered again | status, note, outcome, `resolved` tick, `delivered`, `offered` and `amount` all unchanged; both packs unchanged; no commitment appears; trust and affinity unchanged; account balances |
| a **promised** ask, answered again — with the asker having since found the material herself | still `promised` with its own note and amounts; the obligation is still active and was not voided from afar (the late-delivery rule); nothing delivered; no second commitment |
| a withdrawn ask, answered again | still `cancelled`, with the reason and `resolved` tick it was withdrawn with; nothing given; no obligation |

Without the order fix, the first of these fails exactly as reported (`expected 'cancelled' to be 'fulfilled'`), which is how it was
verified.

### Stage C follow-up: F1, the shelter that was credited to nobody

The `shelter:` option carried the shelter's id, but the activity its `make()` built did not, so `newActivity` defaulted the target
to 0 and `creditShelter` — which credits the plan the shelter belongs to — rejected every tick of it. Measured on the real pathway
before the repair: a rested adult with a night plan chose `shelter:<home>`, stayed for **1035 ticks**, and the plan recorded
`sheltered = 0` and dropped itself with **"the night passed without shelter"**. After adding `targetId: s.id` to that one
`newActivity` call: the activity's target is the home, `sheltered = 1035`, and the morning judges the night on a real need
(`sheltered, but still thirsty at dawn`) rather than on a shelter that supposedly never happened.

Why the existing tests missed it: they credited `creditShelter(p, home.id, 300)` by hand or set `sheltered` on the plan, never
driving the option's own activity. The new test does, and it fails without the repair (`expected +0 to be 3` for the target). Note
that `Intention.sheltered` is not part of the behavioural fingerprint, so no hash comparison could have caught this.

### Stage C follow-up: the dawn ordering, repaired

The defect F1's verification turned up: `reviewIntentions` looked at a plan's `until` deadline **before** the morning assessment, so
a night genuinely spent under shelter could be thrown out with `the night it was for has passed`. The two boundaries were never
inconsistent - a night plan's `until` is first light plus 240 ticks, so the deadline always falls *inside* the morning window
(`DAWN` 0.25 to `MORNING_ENDS` 0.6) - and `reviewIntentions` runs only when somebody decides, so the first decision after dawn can
easily land past the deadline. It was the order, not the clock.

The order is now a stated contract, from what happened, through what it means, to what merely ran out:

1. **account for the physical thing** - a stay still under way has not been credited yet (credit lands when the activity ends), so
   `shelterInFlight` adds what is in `a.progress` to the plan before it is judged, under exactly the conditions `creditShelterFrom`
   uses, so nothing can be counted twice;
2. **conclude any plan whose moment has come** - the morning verdict for a night plan, the thing-itself verdict for a project;
3. **then, and only then, apply a deadline** to a plan with no verdict of its own.

Measured on the real pathway (the reported reproduction, thirst 100): before, `sheltered = 1035` and the plan was dropped with
`the night it was for has passed`; after, the same night ends `done` - "under shelter for 1035 ticks of the night, fed and watered
by morning" - with the verdict arriving at day fraction 0.359, well past the deadline it used to lose to. A night mostly spent
outside still says `only N ticks under shelter; the night mostly passed without it`; a sheltered night that left them thirsty still
says `sheltered, but still thirsty at dawn`; and a plan nobody ever judges (the morning gone by without a decision) is still ended
by its deadline, so nothing persists for ever.

One existing expectation changed with it, deliberately and not silently: the older expiry test jumped the clock to `until + 1`,
which lands in the morning, and asserted the deadline's wording. Under the contract that moment is a morning, so the verdict is the
morning's - `the night passed without shelter` for someone who never sheltered. Both are failures; the new one says which. The
deadline's own wording is still asserted, by the case where the morning passes unjudged.

### Stage D1's boundaries

- One project type (tool-making) and one contribution type (a bounded quantity of a raw material, delivered). Home repair asks
  nobody; there is no shared labour, no joint project, no bargaining, no market.
- The asker only ever asks someone they can **see carrying** the material. Nobody asks a neighbour who could fetch it but is not
  holding any, because that would need knowledge about other people's abilities that no one in this world has.
- Refusal is the common answer in ordinary runs (22 of the 29 requests in the measured run). No weights were tuned to make cooperation succeed
  more often; the ask is scored like any other option and loses to work that pays off sooner.
- `world.requests` is capped at about 260 live records by the existing eviction, which is what keeps `planHelp` and
  `outstandingForPlan` cheap; they are small scans over that capped list, run for people who have a tool project. A count of
  requests in a long run is therefore a count of what is still on the record.
- A partial contribution is recorded truthfully only in a rich world; an authored world keeps the older, blunter `fulfilled`, to
  leave its golden fingerprints untouched.
- An unanswered ask is narrowed or withdrawn by the asker — both by the periodic sweep and, authoritatively, at the moment an
  answer would take effect; a promise already given is never cancelled from afar, so material can still arrive for a need that has
  since been met (it stays with the recipient, credits nothing, and loses nothing).
- The response-time revalidation is rich-only, like the partial record: an authored world answers as it always did, including the
  older case where a request settled mid-conversation could still be answered.
- Nothing here says whether a village with this does better than one without. No ensemble was run (the prepared commands below are
  still unrun).

## Evidence: focused tests, reported by system

Three different systems have to be shown to be intact, and one of them cannot stand in for another. Unchanged authored
fingerprints say nothing about night planning or about control by hand: they are checks on the authored world only.

| What is being checked | Command | Result |
|---|---|---|
| **Authored worlds unchanged** (the golden fingerprints: an authored world must step to the recorded state tick for tick) | `npx vitest run tests/golden.test.ts` | 9 passed; no fingerprint re-recorded in Stage C |
| **Rich night planning** (adopt, carry, set aside, resume, revise, finish or give up; sheltering until light; the authored no-op) | `npx vitest run tests/night_plan.test.ts tests/rich.test.ts` | 41 passed |
| **Control by hand and in the page** (clock holds, an answer belongs to its tick, stale answers refused, control handed back clean) | `npx vitest run tests/inhabit_manual.test.ts tests/inhabit_manual_reliability.test.ts tests/inhabit_app.test.ts` | 20 passed |
| **Stage C's projects** (the groups listed below) | `npx vitest run tests/projects.test.ts` | 26 passed |
| **Stage D1's cooperation** (the acceptance table above) | `npx vitest run tests/project_cooperation.test.ts` | 26 passed |
| **Determinism and save** (same seed, same world; a save changes nothing) | `npx vitest run tests/determinism.test.ts tests/save.test.ts tests/save_storage.test.ts` | 26 passed |
| Everything | `npx vitest run` | 49 files, 484 tests passed |

Stage C's own groups, by what they hold:
- **the thing really happens** — the tool comes out of the ordinary recipe (`wood` and `stone` down by exactly the recipe, the tool
  in the pack, `conservationReport().ok`); mending consumes material, raises the condition, and credits only what their own hands put
  back (a roof a neighbour mended is a reason to stop, not an achievement).
- **one particular tool** — a plan to make a basket is not served by a pick that happens to be craftable: the wrong craft gets no
  bonus and is not the step, with or without the step's option key to match on, and the ordinary decision path starts the basket,
  attributes it to the plan, and ends with a basket in the pack and no axe.
- **having one is not having made one** — a tool crafted by their own hands finishes the project (`made the basket`); one borrowed
  from a neighbour ends it as `came by a basket without making it`, because possession is all that was measured.
- **reservations** — a plan's wood cannot be given away (and the refusal says `making`, not "nothing owned"); an unpromised errand of
  their own cannot take it, and can the moment the plan ends; a promise can; a plan cannot reserve its way past what is carried.
- **failure** — three failures at the same target end the project with that failure as the reason.
- **interruption** — a wolf sets a project aside without ending it (`setAside` rises, `blocked` says why), and it is taken up again.
- **save/load** — a project comes back with its materials, its workings and what it is about; the save changes no hash.
- **replay** — the same seed gives the same world with plans in flight; a save taken mid-project carries on identically for another
  800 ticks; and the fingerprint notices a plan pressing for a different step.
- **explanations** — one test walks the three states in order: chosen (the record names plan and step), under way, and done.

## Still outstanding (prepared, not run: they belong on the 24-core machine)

Unchanged by Stage D1, which added no ensemble of its own: cooperation's effect on how a village turns out is not measured by
anything here. A Large world costs about 15 CPU-seconds per simulated day.

**1. Does planning change how a village turns out?** The comparison must be made inside one kind of world: the control and both
nudges have to be rich too, or the measurement is "rich versus authored" wearing the wrong label. `--dynamics rich` founds the
world rich, so the control is rich, and `rich-no-plans` is then the only thing that differs. Fresh output directory, because the
earlier directories hold authored rows that are not comparable. About 24 × (15 × 3) days of CPU, roughly 20 minutes on 24 cores.

```
node scripts/lab.mjs --out plans_rich_out --seeds 24 --fork 0 --days 15 --profile large --dynamics rich --branches nudge:1,nudge:2,rich-no-plans
```

```
npx vite-node scripts/lab_report.ts -- plans_rich_out
```

Read it as: `rich-no-plans` against the mean of the control and the two nudges, on `tools` and `meanCondition` first (what projects
are for), then on the ordinary outcomes. One control is one chaotic draw.

**2. A baseline for rich worlds, so future changes to them can be gated.** `docs/gates.json` records an **authored** Large world
and must stay that way; a rich baseline is a separate file. Recording a baseline is not a check — it asserts nothing, it writes down
where a world sat — and `scripts/gates.ts` now refuses to record without an explicit destination, refuses to overwrite an existing
baseline without `--force`, and refuses to compare runs of different worlds.

```
node scripts/lab.mjs --out gates_rich_out --seeds 24 --fork 0 --days 12 --profile large --dynamics rich --branches none
```

```
npx vite-node scripts/gates.ts -- gates_rich_out --record --file docs/gates-rich.json
```

Then, and only then, a later rich change can be gated against it:

```
npx vite-node scripts/gates.ts -- <a later run> --file docs/gates-rich.json
```

Re-running either `lab.mjs` line resumes: finished seeds are skipped. Paste back only `<out>\report.txt`, never the progress lines.

## Known limitations of what Stage C measured

- The autonomous runs are the **normal** profile (about 28 people), 10 days, two seeds. They show that projects arise, complete and
  fail for stated reasons; they are not an ensemble and say nothing about whether a village with plans fares differently.
- About half of the tool projects end at their two-day deadline. The reasons are specific (`still short 2 stone`; `had the makings
  but never sat down to it`), and no tuning was done to raise the completion rate: the nudge stays at +14 by design.
- `tools` and `meanCondition` were added to the lab's metrics but are **not** gated, and have never been recorded as a baseline.
- The two-seed lab smoke run (2 days, 2 seeds, `normal`) exists only to prove the branch and the metrics work end to end. Its
  directions (fewer tools and lower condition without plans) are inside the noise and are not evidence.
