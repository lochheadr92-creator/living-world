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
replay that consumes it without a model; a model gate with budgets; a runner; per-field provenance; the model's own persistent notes
(section 4, the second stage). Not yet built: first-person reports, per-person metrics and the comparative arms (section 7).

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
   opportunities (calls) and model calls (asks) are counted apart. Added after the first six-day run: a provider's refusal for the
   moment (a rate limit, an outage, a dropped connection) is told apart from the model's failures. It is waited out with backoff
   inside one call's retry budget (`maxRetryMs`, five minutes; the wait the provider names is honoured) and counts nothing against
   the model unless that budget runs out; and the breaker is half-open (`probeEvery`, ten): once the model is given up on, every
   tenth ask is tried anyway and one success puts it back in play. Before this, five consecutive 429s at day 6.2 of a six-day run
   the operator reported tripped the breaker for good, and the engine drove the remaining two thirds of a day.
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

## 4. Memory

The engine's own per-person memory (beliefs, log, relations, failures, concerns, commitments) is the verified and remembered part and
is read every turn. The model's own notes are `world.inhabitants[id].notes` (`src/agent/memory.ts`), kept only in a run with memory
(`--memory`, protocol `inhabitant/2`); a run without it speaks `inhabitant/1` to the byte, so the first real-model transcript still
replays.

**Epistemic standing.** Five kinds are kept apart and named as such in the prompt: what the person *sees* now and what they
*remember or were told* (the observation, from the engine); what the model *infers* (inferences, with a confidence and a basis), what
it *intends or hopes* (goals, intentions) and what it *doubts* (uncertainties), all in the notes, written by the model, never
verified by the engine. The system prompt says of the notes: "They are not facts about the world and they may be wrong." An
inference never becomes knowledge: nothing in `src/sim` reads the notes (a static test holds it), and the options a person is
offered are the same with or without them.

**Schema** (`InhabitantNotes` in `types.ts`):

| list | entry | limit |
|---|---|---|
| goals, intentions, uncertainties | `{ id, text, since }` | 6, 6, 8 entries of 200 characters |
| inferences | `{ id, text, since, confidence, basis[], revised }` | 12 entries of 200 characters; confidence 0.00 to 1.00; up to 6 references of 60 characters |
| journal | `{ tick, text }` | 40 entries of 240 characters (the last 12 are shown to the model) |
| the whole record | JSON | 12,000 characters |

**References.** A basis entry names something the model was shown: `place:<id>` (a remembered place), `seen:<id>` or `person:<id>`
(a person), `memory:<tick>` (a remembered event), `result:<tick>` (the last result), `option:<key>`, `obs:<tick>` (the moment). A
reference is accepted only if the current observation supports it or an earlier accepted inference already cited it; an inference
left with no accepted reference is refused and counted.

**Updates.** The model answers with its notes after each decision: a list it includes replaces that list (restating entries by id
keeps them, leaving one out drops it, an entry without a known id is new); a list it leaves out is unchanged; the journal takes one
new entry. The update is parsed (shape-checked) when the answer arrives and applied when the choice is consumed, at the ask's own
tick, in both live and replay. Normalisation is deterministic: control characters removed, text cut to its limit, extra entries
dropped, confidence clamped and rounded, unsupported references dropped, then the record trimmed to its total size (oldest journal
first, then the least confident inference, then the last uncertainty, intention, goal). A notes field that is not an object, or a
list that is not a list, refuses the whole update; the choice stands either way. A failed call (no answer) touches nothing.

**Revision.** For inferences every update is classified by id: new, kept (same text and confidence), strengthened, weakened, revised
(text changed), abandoned (left out); goals adopted and dropped are counted too. The per-update record goes on the transcript's call;
cumulative counters live in `world.inhabitants[id].memory` with the notes, so they are saved and hashed.

**Verification.** The notes are part of `hashWorld` whenever the mark exists, so every call's world hash and the end hash cover them;
in addition each consuming call records the hash of the notes after its update, and a replay refuses a different one. The header
records the memory version and the limits; a transcript kept under others is refused.

## 5. Control, time, transcript and replay

The observation's shape is pinned in the transcript header (`observationVersion`, since 2026-10-12): a replay builds that shape
whatever the build's current one, because it rebuilds each ask's observation and refuses one that differs from the recording. So any
change to what the observation says, or how it words it, is a new `OBSERVATION_VERSION` with the old shape kept under the old number
(`observe.ts` branches on the version, as it already does for 1 against 2), and `observationVersionFor` says which version a new run
under each protocol gets. A header without the field (the first transcripts) is read by its protocol. The recorded runs are the
experiment's evidence; this is what keeps them replayable across changes to the prompt.

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

## 6b. In the page

The same `LiveSession` the headless runner uses is driven by the app's clock (`src/app/inhabit.ts`): `Game` runs two hooks around each
tick it plays; before a tick the session may snapshot (the person is about to be free), after a tick an open ask pauses the clock. The
driver asks the model, rewinds the tick exactly as the runner does, swaps the restored world into the game and resumes at the speed
that was set. The page is opened with a query string naming the person, the model and the world (`?inhabit=Pavel&api=openai&model=gpt-5&memory=1&seed=meadow&from=1&days=5`);
the world is fast-forwarded to the start day in small steps, the person selected and followed, and a panel (`src/ui/inhabit.ts`)
shows the status, the latest decision and the model's reason, the notes and the revision counts, with a button that saves the
transcript (replayable with `scripts/inhabit.ts --mode replay`). The model is reached through a Vite dev-server endpoint
(`scripts/inhabit/devserver.ts`), which calls the same SDK clients the script uses with the key from the shell that started
`npm run dev`; the key never enters the browser, and a build carries no endpoint. `tests/inhabit_app.test.ts` holds that the hooks run
around every tick and stop a frame on request, that the driver pauses while the model thinks and applies the answer at the asked
tick, and that the transcript the app records replays headlessly to the same world and notes.

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
per-person measures and the paired arms are not built yet (section 7). The transcript and report of this run live on the operator's
machine (`experiments/README.md` records the limitation and where they belong).

### The memory experiment (scripted model, VERIFIED, 2026-10-10)

The question for this stage is narrow: can an inhabitant preserve and revise its own intentions and inferences across decisions
while subject to exactly the same mechanics and information as anyone else, and can pursuit from memory be told apart from the
engine offering the same action again? A scripted model answers it without a language model's noise. The **goal keeper**
(`src/agent/stubs.ts`) adopts the goal of finishing a building site at the first ask in which the engine offers work at one, writes
it into its notes, and takes the first option at that moment like any other; it never acts on a goal at the moment of adopting it.
Only a goal read back from its notes is acted on: deliver to the site, build at it, or chop wood when its notes say the site lacks
wood. Three arms run the baseline window (seed meadow, Pavel, tick 2400 to 3600):

| arm | notes written | notes read | decisions | choices that were not the first option |
|---|---|---|---|---|
| memory | yes | yes | 7 | 1: at tick 2721, "Build the hut" over "Chopping wood to keep the fire going" |
| blind (memory on, never read) | yes | no | 7 | 0 |
| no memory (protocol 1) | no | no | 7 | 0 |

The sequence asked for, as it happened in the memory arm:
1. Tick 2702: the engine offered delivering materials to a hut site; the goal "Help finish the hut site … [place:2077]" was adopted,
   with the inference "The site still needs: 5 wood, 2 stone" (confidence 0.8, basis the site and the moment) and the uncertainty
   whether anyone else was bringing materials. The first option (the delivery itself) was taken, as the policy requires.
2. Tick 2721: the goal was read back and "Build the hut" chosen. Both control arms, at the same tick with the **same observation
   hash**, were offered the same option and took the first one (chopping wood) instead. That is the distinction the stage needed:
   same offer, same world, different choice, and the only difference between the arms is whether the notes were read.
3. The build ended partial at tick 2965: "no materials to work with (3 wood)".
4. The goal stayed in the notes; at tick 2965 the journal recorded the failure in its own words and a new inference was made,
   "Working there is pointless until materials arrive" (0.7, basis the result and the site); the "still needs" inference was revised
   as the remembered site's needs changed, and its confidence lowered to 0.3 once the site was remembered as needing nothing.
5. Chopping wood was chosen for the site's sake (the same action the first option would have given: pursuit from memory and the
   engine's default coincided there, which the table above does not count).
6. Later asks offered no way to advance the site; the first option was taken each time, the goal kept.

Counters at the end of the memory arm: 7 updates, 2 inferences made, 5 kept, 3 revised, 0 abandoned, 0 entries rejected. The
blind arm, which rewrote its notes every ask without reading them, shows what re-adoption looks like: 4 made, 3 abandoned, 0 kept.

Replay of the memory arm reproduced the end state and the notes hash with no model; the controls were replayable too.

What this establishes: the memory mechanism carries a goal across decisions, the goal changes a choice the engine would not have
made by default, the inhabitant records what became of it, and inferences move with the evidence; all under the same offers, claims
and consequences as any other person. What it does not establish: that a language model will use its notes this way, or that doing so
is any better. The scripted policy is a test instrument, not a claim about strategy.

### The first real-model run with memory (VERIFIED from the operator's pasted output, 2026-10-10)

The baseline window again (seed meadow, Pavel, tick 2400 to 3600), `gpt-5`, `--memory`, protocol `inhabitant/2`, default budget.

| | |
|---|---|
| decisions | 5, all applied, none refused, none by the engine, none lagged |
| notes | 5 updates, 0 rejected (updates or entries); inferences 6 made, 10 restated, 5 revised, 1 weakened, 1 abandoned |
| model output | 13,108 tokens over 5 calls (3,697 in the run without memory); prompt about 112 KB in all (97 KB) |
| replay | OK: world `4f05d50c` and the notes hash reproduced, no model |

**The actions were the five of the no-memory baseline, at the same ticks, with the same outcomes** (potter, deliver to the hut site,
build there until the materials ran out, chop wood, sleep). VERIFIED against the two transcripts (2026-10-11, no model): the five
ticks, the five chosen options and the four recorded outcomes are equal, and replaying both and re-hashing the end states with
`world.inhabitants` removed gives one and the same world, `a9896b72`. So the end hashes differ (`0d0de0ed` against `4f05d50c`) only
because the notes are folded into the world hash (`src/sim/world.ts`, the `E` term), which also means a memory run and a no-memory
run cannot be compared by world hash as it stands; `end.notesHash` already fingerprints the notes on their own. The five observation
hashes do differ, as they must: the memory prompt carries the notes. In this window, memory changed what the inhabitant wrote and why
it said it chose, not what it did.

What the notes show (the model's words): four goals (stock the lean-to, social time, map resources, and from tick 2702 "support
neighbours' building projects"); five inferences each resting on accepted references (a person in sight, the campfire's remembered fuel,
the site, the moment); a journal whose every entry matches the observation of its tick (the cloudy morning, the wood just chopped,
children nearby, the stalled build for want of 3 wood). The revision worth noting: at tick 3275 it inferred from a remembered building
that "Thistle's hut looks complete" (0.95), abandoned the plan to haul more wood, and gave that as its reason for resting instead;
whether the hut was in fact complete is a question for the observer stage (belief against truth), not yet built.

What this establishes: a language model keeps grounded, bounded, revisable notes through the restricted interface, with no rejected
entries, and reads them back (the goal adopted at tick 2702 and the inference at tick 3275 both appear in later reasons). What it
does not establish: any effect on what happens in the world. Five decisions in a half day in which the engine's offers already lined
up with the model's aims leave no room to see one; a longer window, a harder situation, or a person with more to decide is needed.

### Attribution and the counterfactual re-ask (VERIFIED on the recorded runs, 2026-10-12)

Whether memory changes behaviour cannot be read off an end hash: the model is not deterministic between runs, so two runs part at
their first differing choice and everything after is a different world. Two tools read the transcripts instead.

`scripts/inhabit_attribute.ts` (`src/agent/attribute.ts`) looks at each decision the model made: which content words of its stated
reason occur in the notes it was shown and nowhere in the observation, and whether the option it chose carries out a goal or intention
written at an earlier ask (matched by the target the note names, which is strong, or by shared words, which is weak). It is triage:
a word the model coined in an earlier note counts as notes-only although the fact behind it was observable, and a reason can rest on a
note without reusing its words. On the recorded memory run (Pavel, 5 decisions):

| ask | chose | what attribution finds |
|---|---|---|
| 0 | potter about | the notebook was still empty |
| 1 | deliver materials | two reason words only in the notes ("full", "neighborly"): the model's own earlier wording |
| 2 | build the hut | carries out the intention written at ask 1 (shared words with the option: weak) |
| 3 | chop wood | nothing from the notes. The reason ("stalled for lack of wood") answers the fresh partial-build result; the notes it was shown still said the site had materials (inference i14). The "chop and bring wood" intention was written *after* this choice. |
| 4 | sleep | nothing from the notes |

So two weak candidates and no strong one, and the one decision that looked like memory at work (ask 3) was the observation
correcting a stale note. That matches the hash result (same world as the no-memory run) and sharpens it: in this window the notes followed the
decisions, they did not lead them.

`scripts/inhabit_counterfactual.ts` (`src/agent/counterfactual.ts`) is the decider, at a model's price: it puts the very observation
a recorded decision was made on to the model again, several times, with its notes and without, and reports where the most common
choice moves. The pairing is exact (same observation, same refused picks), and the with-notes arm measures the model's own variance,
so a shift is read against that and not against one draw. `--asks auto` takes attribution's candidates. Nothing runs in the world.
Checked with scripted models: one that takes the last option when shown its notes and the first when not is reported as shifting on
every ask that had notes and on none that had an empty notebook; one that ignores its notes shows no shift. A run in which no call
was answered is no result, never a null result: it renders as NO RESULT in its first line, leaves `counterfactual.failed.txt` instead
of `counterfactual.json`, and exits 1, so a check for the file cannot pass on a failure. Learned the hard way: the first real attempt
(2026-10-13) hit an account with no credits, every call failed, and the renderer of the day printed "0 of 6 asks shift". An ask where
one arm got no usable answer is reported as undecided, not as a non-shift. The OpenAI client now tells an exhausted account (a 429
with `insufficient_quota`) from a rate limit and fails it at once rather than waiting out a limit that no wait will lift.

A full no-memory arm would cost a six-day run again and could not be paired with it; these two, in that order, are the test.

### The six-day harsh run (Tomas, GPT-5 with memory; VERIFIED from the transcript, 2026-10-12)

Seed meadow, harsh, Tomas (#981), tick 2400 to 16800, run by the operator on 2026-10-11 and kept in `experiments/harsh6-tomas-gpt5/`.
Replayed here without a model: the recorded end state `23ac03a0` reproduced, 95 decisions consumed, 8 engine overrides matched,
22 seconds of wall time (with `--allow-source-drift`: the sources moved on after the recording).

| | |
|---|---|
| asks | 95: 82 answered and applied, 0 refused by the model, 13 fallen to the engine |
| the 13 | five rate-limit failures (day 6.20 to 6.32), then eight refused by the tripped breaker (day 6.34 to 6.97); the gate has been fixed since (section 2, item 4) |
| model time | 87 calls; latency median 34 s, p90 48 s, max 73 s |
| tokens | input 740,309 (6.3k per call at the start, 10.1k at the end, as known places went from 45 to 64 and the notebook from nothing to 8.7k characters); output 323,333, of which about 680 per call is the visible answer, so about five sixths is reasoning |
| what Tomas did | applied by kind: gather 26, socialize 20, warm 11, sleep 5, deposit 5, eat 4, drink 3, rest 3, and one each of fuel, haul, explore, visit, repair; outcomes 47 success, 12 failed, 11 unknown, 7 interrupted, 5 partial; alive at the end, health 100, 72 things gathered, 14 conversations, 217 places known |
| memory | 82 updates, 0 rejected, 2 entries refused; 42 new, 573 kept, 158 revised, 31 abandoned, 15 strengthened, 12 weakened; the notebook held 4 goals, 5 intentions and 11 inferences at the end |

Attribution over the 82 decisions:

- The notes named a specific target (a bush, a spot, a person) at 58 of them. The chosen option was one of the named targets at 6.
  At the other 52 the model picked a different target from the fresh observation (the bush that still had berries, the person who
  was there) and then rewrote the intention to match. The notebook trailed the decisions.
- 6 strong candidates for the counterfactual, asks 24, 51, 59, 60, 75 and 79: every one a berry or fruit pick at a bush the
  intention named, the wording written 1 to 6 asks earlier. 65 weak ones, which is the whole run in effect: with one vocabulary
  ("Birch", "stock", "berries") the word signals cannot tell the notes from the observation.
- The two passages the operator's reading singled out as memory at work are visible without notes: the fishing quarrel with Zed is
  in the relations shown (as a grievance) and the last 14 events; the four declined food offers are in `lastResult` and the
  failures list. They are good behaviour; they are not evidence for memory.

What this does not settle: a goal that names no target ("keep Dov and me fed; stock Birch") can shape a choice, and attribution
cannot separate that from the household's empty larder, which is in the observation. The counterfactual on the six strong asks
costs 36 calls (about 20 minutes and a third of a million input tokens); widening it to the weak tier costs 71 asks' worth.

### The counterfactual on the Tomas run: the notes did move two of six choices (VERIFIED, 2026-10-13)

Run at last, on the six strong asks: 36 calls, 33 answered, 3 lost to a 120 s timeout, 32 minutes. The record is
`experiments/harsh6-tomas-gpt5/counterfactual.json` and `counterfactual.txt`. The calls were made by the pre-fix build (the run was
already in flight when the renderer fix landed); the record was then rebuilt with the fixed shift rule and re-rendered by the fixed
renderer from those same arms. No verdict moved, per-ask or total, and `undecided` is 0 because no arm went unanswered; the only
change is the header's new `(33 answered)` and `of 6 decided asks`. Its first line, quoted:

```
counterfactual re-ask: Tomas, gpt-5, 3 repeats per arm, 36 calls (33 answered); 5 of 6 decided asks shift when the notes are taken away
```

**That 5 of 6 is the tool's count and it is too generous.** `majority()` breaks a tie by option name, so an arm whose three repeats
chose three different things still reports a "majority" - the alphabetically first of them. Three of the five shifts rest on such a
tie. Read ask by ask, with the size of each arm's plurality:

| ask | with notes | without notes | reading |
|---|---|---|---|
| 59 | `gather:811` x3 | `eat:0` x3 | **shift**; both arms unanimous, no failures |
| 60 | `gather:810` x2 of 3 | `rest:home:980` x2 of 3 | **shift**; a real majority each side |
| 51 | `gather:812` x2 of 2 | `gather:812` x2 of 3 | no shift |
| 79 | `warm:951` x2 of 3 | three different gathers, 1 each | with notes it sought warmth, without it foraged - but the no-notes arm has no majority |
| 24 | `eat:0` and `gather:831` 1 each | `gather:913` x3 | the with-notes arm is a 1-1 tie; nothing to shift *from* |
| 75 | two choices, 1 each | three choices, 1 each | both arms are scatter; the "shift" is one tiebreak against another |

So: **2 shifts that hold** (asks 59 and 60), one directional difference worth naming (79), one clean non-shift (51), and two asks
where the model's own variance with its notes was total and nothing can be concluded (24, 75). VERIFIED as the mechanical result of
these 36 calls; one window, one person, one model, three repeats.

LIKELY, as an interpretation: at both asks that hold, the with-notes choice is the one the run actually recorded (`gather:811`,
`gather:810`) and taking the notes away moved it to the nearest immediate need - eat, then rest. The notes carried the errand
("stock Birch", "keep Dov and me fed"); without them the model served the body in front of it. That is the thing attribution could
not settle, since a goal naming no target cannot be told from an empty larder by word overlap, and it cuts against the attribution
reading in the right way: at 52 of 58 decisions the notes did not pick the target, but at the few asks where the choice was a
*plan* rather than a target, removing the notes changed it.

UNKNOWN: whether this holds beyond six asks, and whether the three tiebreak asks would decide either way with more repeats. The
weak tier is 71 asks' worth.

**A limitation of the tool, found by this run.** The fixed renderer catches an arm that was never answered; it does not catch an
arm that answered differently every time. A plurality of one in three is printed as a majority and counted as a shift or a
non-shift accordingly. Until that is fixed, a shift count from this tool is an upper bound, and the per-ask table is the result.
