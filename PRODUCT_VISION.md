# Living World: product direction

Owner decision, 2026-10-22. This is the single authoritative product brief for everyone working
on this repository, Codex and Claude included. Delivery rules live in
[WORKFLOW.md](WORKFLOW.md) and are unchanged by this file: read that first. This file says what
we are building and how to judge whether a change delivered it — not how to get it committed.

## Product identity

Living World is an **autonomous world game with few direct controls**, supported by a causal,
deterministic simulation.

The experience is watching recognisable people pursue their own needs, build homes, form
relationships and respond to changing circumstances. Inhabitants act for themselves. The viewer
follows individuals, households, relationships, places and changes over time, and should be able
to follow what happens, understand why, and see that the consequences last.

Observation controls serve that experience: pause, single step, speed, following a person,
inspection, the overlays, the feed, the chronicle. **This brief authorises no new controls.**
Intervention controls — orders, job assignment, placement, direct commands over a person — need a
separately authorised task.

This supersedes the earlier categorical "this is not a game" framing while keeping its intent:

- No compulsory micromanagement, and no assigning everyone's jobs.
- No scripted success, fabricated resources, or decorative behaviour presented as a real decision.
- No assumption that a game needs scores, winning, quests, unlock trees, combat progression or
  management controls. Living World has none of those and is not waiting for them.

The simulation is the foundation. The observable experience is the product.

## Development priorities

Optimise for:

- **Recognisable people and households** — someone a viewer can tell apart and come back to.
- **Understandable motives and choices** — the reason sits in that person's own state, knowledge
  and history, and the inspector can show it.
- **Physical actions that visibly connect to their outcomes** — the walk, the work, the thing
  carried, the thing that now exists.
- **Persistent consequences** — what happened is still true later, and still visible.
- **Readable homes, work, relationships and danger.**
- **Situations worth following, including understandable failure.**
- **Presentation that exposes actual simulation state.**

The default product question for a behavioural change is:

> **What will someone watching the world notice, understand or care about after this change?**

Ask it alongside correctness and maintainability, not instead of them. A change that passes its
tests and leaves nothing for a viewer to notice is not finished, it is half delivered. A change
that reads well on screen but misrepresents the state underneath is worse than not shipping it.

## Feature increments: new capability and stronger connections

Owner decision, 1 November 2026. Read this before planning or implementing a feature.

**Each feature increment must add one meaningful new inhabitant mechanic/capability and
strengthen existing systems through the same coherent, observable situation.** New capability
and deeper connections are delivered together. The world does not have to finish every
existing system before gaining a new capability.

Before implementation, state:

1. What an inhabitant can now do that they could not do before, and what a viewer will notice.
2. Which existing systems gain a concrete new use, recovery path or lasting consequence,
   and the exact transitions that connect them to the new mechanic.
3. The bounded situation to complete: legitimate local observation or communication ->
   decision -> ordinary physical action -> useful outcome or explained failure -> saved
   consequence and later influence where applicable.
4. The relevant interruption, refusal, loss, cancellation and recovery cases, the owning
   modules, and the evidence needed to establish both the new capability and its connections.

Strengthening must change useful behaviour: for example, remembered demand starts feasible
production, an existing workshop serves an actual customer, or an experienced outcome changes
a later cooperation choice. Extra fields, logs, modifiers or module dependencies alone do not
establish a stronger system. Reuse existing owners and execution paths; introduce new state or
abstractions only for a demonstrated missing capability with a bounded lifecycle.

An authorised feature includes the necessary connecting implementation and repairs across
that causal chain. Carry it through to completion without stopping for routine implementation
choices. Several focused steps and commits may deliver one feature; each intermediate result
must retain its actual scope. Unrelated defects, redesigns and neighbouring features stay
outside the increment. This policy does not override explicit task boundaries or authorise
starting a feature during an assessment.

Verify the new mechanic and the behaviour it strengthens, including relevant negative cases,
resource/ownership accounting, determinism, save/replay compatibility and rendered explanation.
Apply the existing numeric rules-version policy. Keep staged mechanism evidence, ordinary-world
opportunity/activation, and aggregate benefit separate; report nulls, adverse outcomes and
unverified links honestly. A staged complete chain does not establish ordinary uptake.

For example, agreeing to make goods for someone could connect a personally heard request to
production prerequisites, actual delivery, a remembered outcome and a later customer choice.
This illustrates the delivery shape; it does not claim that mechanic exists or reorder the
authorised programme.

**Dedicated integrity/bug fixes, compatibility work, performance work and documentation tasks
remain focused and do not require a new mechanic.** Existing repair work is not expanded by this
rule. No mandatory PR, second reviewer or extra approval step is added; `WORKFLOW.md` remains
the delivery authority.

## Foundations that remain

These are not traded away for a better-looking scene:

- **Deterministic seeded behaviour.** Same seed, same world; inspecting never perturbs it.
- **Local knowledge and plausible inhabitant decisions.** Nobody consults the world's true state
  to plan.
- **Explicit resource origins, movement and consumption.** The ledger balances.
- **Real ownership, travel, work and time costs.**
- **Save/replay continuity and the numeric rules-version policy**
  ([docs/DEVELOPMENT_POLICY.md](docs/DEVELOPMENT_POLICY.md)).
- **Honest inspector and event descriptions.** The words say what the state is.
- **Meaningful failure and consequences.** People can fail, and failing costs them.

Do not introduce hidden omniscience, free resources, scripted completion or fake causal
explanations in order to produce a more attractive scene. Where a demonstration genuinely needs
staging, it is a staged scene and is labelled as one (the *Scenes* menu, `tests/scenes.test.ts`);
the ordinary seeded world is the demonstration of spontaneous behaviour.

## Prefer complete situations

Prefer **completing one coherent situation** over adding several disconnected internal systems. A
mechanism nobody can follow from cause to consequence has not yet earned its complexity.

The shape wanted, as a worked example:

> A household recognises that its shelter is inadequate, chooses a feasible response, obtains the
> materials, builds, and physically occupies its home — or meets an understandable reason it
> cannot finish, which a viewer can see and name.

That is a **product target, not a claim that all of it already works.** What is implemented, what
was only piloted and what is merely proposed are recorded in
[docs/EMERGENCE.md](docs/EMERGENCE.md), [docs/RICH_WORLD.md](docs/RICH_WORLD.md),
[docs/HABITATION.md](docs/HABITATION.md) and [docs/WOLF_DEFENCE.md](docs/WOLF_DEFENCE.md);
keep proposed behaviour distinct from implemented behaviour whenever you write about it.

Further situations of the same shape, as examples rather than a committed programme:

- Household shelter need → material gathering → construction → occupation.
- Recognised threat → preparation → response → lasting consequence.
- Relationship history → understandable choice → observable effect.

## How claims about this work are judged

Different claims need different evidence, and the distinctions are set out once, in
[docs/DEVELOPMENT_POLICY.md](docs/DEVELOPMENT_POLICY.md) under "Matching evidence to the claim":
correctness, physical coherence, readability, variety and watchability, and aggregate
effectiveness are separate purposes, and mechanism tests, rendered evidence, human usability
evidence and ensemble results answer different questions. Two consequences of that are worth
stating here, because they follow from this brief: a feature can be valuable without improving
survival or any other aggregate metric, and a null aggregate result does not by itself make a
feature worthless.

None of this is a new approval process. It is how to describe what you did accurately.

## Scope discipline

Product direction is a way of judging work, not a licence to widen it. A bounded task stays
bounded. If this brief suggests something the current task does not cover — a new control, a
neighbouring mechanism, a presentation overhaul — write it down and raise it; do not fold it in.
