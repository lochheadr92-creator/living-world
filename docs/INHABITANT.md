# The AI inhabitant: an external language model living inside Living World

An optional, off-by-default capability: an external language model drives one person in the simulation through a restricted
interface, choosing only among the actions the engine offers that person and seeing only what that person has legitimately seen,
been told or remembers. The simulation stays authoritative. This file is the architecture assessment made before the first line
was written (section 1), the review it received and what changed (section 2), the design as built (sections 3 to 7) and what has
been measured (section 8).

Status labels: VERIFIED means read in the code or checked by a test in this repository; LIKELY means inferred from the code and
not yet exercised; UNKNOWN means not determined.

## 1. Architecture assessment (before coding)

### 1.1 Canonical documents

The brief names `AGENTS.md` and `WORLD_DIRECTIONS.md`. **Neither exists in this repository** (VERIFIED: searched the whole tree). The
canonical documents that do exist and were read: `CLAUDE.md` (decisions already made, branch and testing rules), `README.md` (the
architecture and the verification suite), `docs/EMERGENCE.md` (the plan and the lab), `docs/SCALING.md` (random choice, the closed
action space), `docs/ECONOMY.md` (ownership, claims, promises). Nothing here assumes anything from the two missing files.

### 1.2 Existing systems and how they are reused (VERIFIED by reading `src/sim`)

| System | Where | Reused as |
|---|---|---|
| Decision loop: `world state -> perception -> options -> rank -> make -> start` | `decision.ts` (`decide`, `launch`, `rankOptions`, `reviewActivity`) | The only place the outside controller plugs in. `rankOptions` applies the hard filters (children's limits, relief guard, critical needs, fleeing, cooldowns) before anything is offered; the controller names an option `key` and the engine runs `make()` as usual. |
| The "chooser" seam | `setOptionChooser('utility' \| 'random')`: module-level, "kept beside the world, not in it: not saved, not hashed, off unless asked for" | The precedent: `src/sim/external.ts` is the same kind of switch. The lab installs such switches with `install()` returning the restore function. |
| Perception | `perception.ts`: `p.seen` (visible flags only), `p.beliefs` (timestamped snapshots with `src: 'seen' \| 'told'`, `from`, `origin`, `hops`), `p.whereabouts`, `p.explored` | The observation is built from these and nothing else (section 3). |
| Hearsay | `news.ts` (`tellBelief`, `answerInfo`), `social.ts` (`ask_info`), `welfare.ts` (concerns told) | Already the legitimate channel by which an inhabitant learns what it did not see; nothing to add. |
| Memory | `p.log`, `p.failures`, `p.relations` (with `history`), `p.concerns`, `p.commitments`, `p.lastResult`, `p.lastDecision`, `p.mood.thoughts` (rich) | The verified and remembered part, read every turn. The model's own notes are not built yet (section 4). |
| Validation, conflicts, commitment | `activities.ts`, `economy.ts` (claims, reservations, the ledger), the activity handlers, `social.ts` | Untouched; the controller never calls any of it. |
| Consequence feedback | `setResult` -> `p.lastResult`; `addLog` -> `p.log`; the `opt:<key>` cooldown after a failure | Already what the person legitimately perceives of an outcome. |
| Events | `world.events` (global feed) | Observer only; never reaches the controller. |
| Replay and determinism | seeded `RNG`, `hashUnit`, `hashWorld`, golden fingerprints, the probe-neutrality pattern | The controller is off unless installed; on, its inputs are a transcript (section 5). |
| Save/load | `src/app/save.ts` format 4 (every own property of `World`; people packed by column when they share fields) | The mark of a driven person is `world.inhabitants` at world level, absent in ordinary worlds, so people keep packing and ordinary saves are unchanged. |
| Inspector view-model | `inspect.ts` `describePerson` | Not reusable as a payload: `targetText` and `auditOpportunities` consult `world.byId` and `world.sources` ("unaware" reveals an unseen thing exists; "somewhere remembered" reveals a remembered thing is gone). A stricter builder was written. |
| The counterfactual lab | `scripts/lab/lab.ts` | The paired-comparison method for the later experiment; the runner's standard mode is its arm A. |
| Headless tooling | `scripts/*.ts` run `stepWorld` in a loop | The model call cannot happen inside a tick; the runner answers between ticks and rewinds (section 5). |

### 1.3 Missing capabilities (now built unless marked)

A seam in `decide` for an outside chooser that can defer; a restricted observation builder; a transcript of outside decisions with a
replay that consumes it without a model; a model gate with budgets; a runner; per-field provenance. Not yet built: the model's own
persistent notes, first-person reports, per-person metrics and the comparative arms (section 7).

### 1.4 Compatibility risks and how each is held

| Risk | Holding |
|---|---|
| The seam changes an ordinary world | Consulted only when a controller is installed and claims the person. The golden, determinism and save suites pass unchanged (VERIFIED); `tests/inhabitant.test.ts` also runs a world with a controller that claims nobody and compares hash and deep hash. |
| A new `Person` field breaks column packing or the deep hash | No new `Person` field. `world.inhabitants?` is absent in every ordinary world. |
| `hashWorld` ignores the mark | When `world.inhabitants` exists its JSON is folded into the hash (as the `D` lines are for rich dynamics). |
| The utility reviewer overrides the controller within a review period | For a driven person `reviewActivity` keeps the engine's hard interruptions (danger, a deadlier need) and drops the soft "something better came up" switch; each override is reported to the controller and recorded. |
| World text as instructions | All world text sits in an `<observation>` block the system prompt declares to be data; the seed is never included; the answer is strict JSON validated against the offered keys. |
| A failed or absent model corrupts the run | Error, timeout, exhausted budget, unusable text, or an unoffered key: the engine's own choice is taken and the transcript says so. |
| A fresh run passed off as a replay | A replay verifies the transcript against the build and the world at every decision (section 5) and stops on the first difference. |

### 1.5 Conflicts with canonical rules

* `CLAUDE.md` names branch `claude/epic-franklin-469omp`; this work is on `claude/dreamy-brahmagupta-o1ttw1` as instructed for this
  task. One branch, one purpose, draft PR, never merge, never force-push: kept.
* `CLAUDE.md`: "New behaviour goes behind `settings.dynamics = 'rich'`". That switch is for behaviour of the authored people. The
  inhabitant is not a behaviour of the world but an external input to one person, so it follows the chooser precedent (a switch
  beside the world) plus a world-level mark of who is driven. It is not a `Settings` field.
* README: "no network, no LLM calls" stays true of `src/sim` and of `src/agent`. The only network clients are `scripts/inhabit/anthropic.ts`
  and `scripts/inhabit/openai.ts`; both SDKs are dev dependencies used by scripts only.

## 2. The review, and what changed

The assessment above was reviewed before implementation. Each point, the decision, and the evidence.

1. **The boundary is not sealed (high).** Accepted. The builder now produces a deep-frozen `InhabitantObservation` with the record each
   field is taken from written beside it, and the prompt builder takes that object and nothing else. Specifics: household members are
   names and kin only; set-aside entries are included because every reason the engine writes is phrased from the person's own
   knowledge (VERIFIED: all 32 `addBlocked` call sites read); requests are filtered to those the person made or received; option
   targets are described from beliefs or sight, never from the world's index. The leak test runs through the engine's own
   option generation: across 15,974 options and set-aside entries sampled over two days of an ordinary world, every target was something
   the person already knew (VERIFIED, now a test). Option label text is engine-authored; the engine's own locality (every targeted
   place known, `tests/knowledge.test.ts`) is the boundary there, and the payload adds nothing to it.
2. **Replay needs stronger guarantees (high).** Accepted in full. The transcript header carries the transcript version, the protocol
   version, a behavioural fingerprint of the simulation (a fixed world stepped a fixed number of ticks), a fingerprint of the source
   files (when the runner can read them), the start tick and the start hash. Every call records the observation hash and the
   whole-world hash at the moment of choosing, in sequence; a replay refuses a missing, out-of-order, differently observed or
   differently stated decision, a different engine result, a different override, and a different end hash (VERIFIED by tampering
   tests).
3. **The one-tick disadvantage (high).** Accepted; the mechanism changed. The engine still answers "no answer yet" with a one-tick
   stand (the simulation stays functional without a special runner), but the runner never lets that stand: it rewinds the tick and
   runs it again with the answer, so the choice is applied at the tick, and against the options, it was asked about (section 5).
   A per-tick snapshot was measured and rejected (serialize plus restore of the village is about 185 ms against a 3 ms step); the
   runner snapshots only when the person is about to be free and after each applied choice. Every transcript records whether each
   call was exact or lagged; the tests require zero lagged calls.
4. **An explicit budget (medium).** Accepted: calls per simulated day, prompt size, answer size, wall-clock time per call, consecutive
   failures before the model is given up on (an unusable answer counts), all recorded in the transcript header; decision
   opportunities (calls) and model calls (asks) are counted apart.
5. **Self-reinforcing memory (medium).** Accepted for the memory stage: inferences will carry a confidence and the observations they
   rest on, and the runner will record when the model strengthens, weakens or drops one. Not built in this slice, by the reviewer's
   own sequencing ("prove the core first").
6. **A fourth arm, D: utility plus persistent strategic goals.** Agreed and planned (section 7). It will be a deterministic controller
   through the same seam, seeing only the same observation, so the comparison is fair.

The slice was narrowed as asked: one inhabitant, one decision, one model response, one validated action, one deterministic replay,
and the tests for them.

## 3. Information boundary

| Allowed | Taken from |
|---|---|
| Own condition: health, needs, inventory, load, tools held, age and stage, character in words, skills, mood and thoughts (rich) | `p.health`, `p.needs`, `p.inv`, `toolsHeldBy(p.id)`, `p.birthTick`, `p.traits`, `p.skills`, `p.mood` |
| Own position, time of day, light, weather, temperature | `p.x/y`; `world.tick`, `world.light`, `world.weather` (felt by everyone) |
| Household: name, members' names and kin, own home as remembered | `householdOf(p)`, `membersOf`, `p.beliefs[hh.homeId]`, `p.partnerId/parents/children` |
| What is going on: activity, a suspended one, the conversation the person is in, the last result, the last choice | `p.activity`, `p.suspended`, `p.convId`, `p.lastResult`, `p.lastDecision` |
| In sight: people (name, where, visible state flags, what they are visibly doing, what they carry) and wolves | `p.seen` |
| Known places: nearest of each kind, with believed and estimated amount, age, seen/told (by whom, hops), kind-specific extras as remembered; totals per kind | `p.beliefs` |
| People: relations as felt, last seen where, worries, own requests, own promises | `p.relations`, `p.whereabouts`, `p.concerns`, `world.requests` filtered to `from/to === p.id`, `p.commitments` |
| Recent memory, recent failures | `p.log`, `p.failures` |
| The options on offer (key, kind, label, goal, need, time, target as known) and what was set aside, with the person's reasons | `rankOptions(ctx)`, `ctx.blocked`; scores only with `showScores` |

Never: `world.events`, the world's own lists of things, other people's needs, inventories, beliefs or plans, `world.stats`, the
ledger, the dead, `auditOpportunities`, the seed. A static test holds that `observe.ts` and `protocol.ts` contain no such reads.

## 4. Memory (next stage)

The engine's own per-person memory is read every turn. The model's own notes will be `world.inhabitants[id].notes`: goals,
intentions, inferences (each with a confidence and the observations it rests on), doubts, a bounded journal; saved with the world,
folded into its hash, never read by the simulation, and diffed by the runner between turns so revision is measurable.

## 5. Control, time, transcript and replay

```
tick t      stepPerson -> decide -> generateOptions -> rankOptions -> controller.choose(world, p, ctx, ranked)
              no answer    -> an ASK is recorded (exact observation, hash) and 'defer': the person stands this tick
              a pick       -> key on offer: make() -> startActivity (every claim and check as usual); else refused, asked again
                              (at most EXTERNAL_RETRIES more times, the model told why), then the engine chooses and says so
runner      snapshot before a tick in which the person is about to be free, and after every applied choice
            after a tick with an open ask: await the model; restore the snapshot; re-run to the ask's tick; step it again with
            the answer. The discarded tick leaves no trace but the ask. The answer lands at the tick it was asked about.
```

The transcript holds the header (versions, fingerprints, start state, model identity and configuration, budget), the asks (one per
exchange: observation, what the model was told about refused picks, raw answer or failure reason, parsed proposal), the calls (one
per `choose()`: tick, attempt, observation hash, world hash, choice, timing, the engine's result), the overrides, the outcomes of
applied activities as the person recorded them, the observer entries, and the end state.

Replay installs the same controller in replay mode and steps the world; each `choose()` consumes the next call after checking tick,
attempt, observation hash and world hash; each result and override the engine reports must match; at the end every call must be
consumed and the hash must match. No model is involved; a fresh model run is always labelled `live`.

## 6. Observer

Written by the runner, never read by the prompt builder: the village's event feed entries naming the person between decisions, the
committed activity and what it came to, and the overrides. A test plants a sentinel in the feed and checks it never reaches the prompt.

## 7. Modes

* **A, standard:** nobody driven. Byte-identical to today (golden suite).
* **B, inhabitant:** one person driven by a model (live) or by a transcript (replay). Built.
* **C, random eligible choice:** a deterministic controller picking by hash among the offered keys, through the same seam. Planned.
* **D, utility plus persistent goals:** a small deterministic planner through the same seam, seeing only the observation. Planned.
* **Comparison:** the same world at the same tick for each arm, paired over seeds with the lab's nudge floor, per-person and per-world
  metrics. Planned.

## 8. Results

VERIFIED (this repository, 2026-10-10):
* Feature off: the golden fingerprints, determinism and save tests pass unchanged with the seam in place; a controller that claims
  nobody gives the same hash and deep hash as no controller.
* Boundary: a bush out of sight is in neither the observation nor the options, and appears as "told by Ana" once told; across an
  ordinary two-day run, every option and set-aside target and every id in the observation was known to the person; a sentinel in the
  event feed never reaches the prompt.
* Authority: a model that names an unoffered key, a non-existent target, or writes prose is refused at most `EXTERNAL_RETRIES` times
  and then the engine chooses; every applied key was on offer in the very ask it answered; the ledger balances.
* Timing: in a live run every applied call is exact (asked and applied at the same tick); no lagged call, no deferral in the final
  transcript.
* Replay: a live run with a scripted model replays from the transcript to the same hash and deep hash; a changed simulation
  fingerprint, protocol, world, or a missing, altered or extra decision is refused.
* Save: a world with a driven person round-trips (mark and counters intact, hash and deep hash equal) and carries on identically.
* Failures: a throwing, empty-answering or hanging model leaves the engine to choose at every decision, the ledger balanced, the run
  repeatable and replayable; the breaker gives the model up after the configured run of failures; the budget refuses calls past the
  per-day cap, a prompt over the size cap, and a call over the time cap.
* Smoke (village, seed meadow, day 1, a quarter day, scripted "last option"): 2 decisions, both exact, replay OK to the same hash,
  the standard window ends in a different hash. One observation was about 17 KB of JSON.

**First real-model run** (VERIFIED: run by the operator on a Windows machine, 2026-10-10; village, seed meadow, Pavel, an elder, day 1
from 07:12 for half a day; `gpt-5` through Chat Completions, no effort setting, the default budget).

| | |
|---|---|
| decisions | 5, all applied, none refused, none by the engine, none lagged |
| model calls | 5; about 97 KB of prompt in all, 3,697 output tokens in all (reasoning included) |
| replay | OK: ended in state `0d0de0ed`, the recorded state, 5 decisions consumed |
| standard window | ended in state `053460f5`: the choices changed the world |
| behaviour fingerprint | `22b83b7c:3780a61a`, the same on Linux and Windows |

The choices and the model's stated reasons: potter near home (carrying a full load, nothing urgent); deliver wood and stone to the
hut site nearby; build at that site, which ended partial for want of 3 wood; chop wood at a close tree "to keep work going on the
hut" (the engine's label for that option was keeping the fire going: the model picked an offered action for its own purpose, and
the engine did exactly what the option does); sleep at the lean-to with energy low. Every reason refers only to things in the
observation. Five decision points in half a day is the engine's own cadence for a busy person: opportunities come when an activity
ends, not on a timer.

What this does not show: whether the model's choices were better or worse than the engine's. One run is one chaotic draw, and the
per-person measures and the paired arms are not built yet (section 7).
