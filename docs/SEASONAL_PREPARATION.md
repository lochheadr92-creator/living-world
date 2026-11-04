# Seasonal preparation (workstream 3): historical diagnosis and contract

> Integration review, 4 November 2026: this is the original rules-44-era proposal,
> retained for provenance. Its claim below that reserve size is the binding constraint
> is **not established by its diagnostic**: that script counts aggregate food eaten
> and spoiled, not the fate of the particular food deposited in household reserves.
> A falling home-store total plus world-wide consumption cannot distinguish every
> withdrawal, consumption, spoilage or loss of the reserve itself. The old proposed
> rules-46 contract is historical, not an instruction to change today's simulation.
> See `WINTER_RESERVE.md` and the current programme for subsequent implementation
> and evidence. No new causal or welfare claim is made by importing this record.

Rules-2 household food preparation (`src/sim/provision.ts`) is the only seasonal-preparation behaviour. This note
establishes what it does, what it has been shown to do, and the contract the WS3 improvement must meet before its
target or timing changes.

## What exists today

An adult may take on a private `stock` plan to put food into their own household's home store. Two cues, kept apart
and recorded on the plan:

- **hardship** — the household can see it is short (remembered home store + carried food under half a day's eating,
  or the person themselves went hungry within the last day). A response to what already happened.
- **season** — the deterministic pre-winter window (`PREPARE_DAYS = 2` days before the last `WINTER_LENGTH = 4` days of
  the year). Never the random lean season, never any hidden world state.

The target is deliberately small: `min(4 × 1 day × members, 12, store room)` — one day's eating, capped at three
members' worth, and never more than the remembered store holds. The plan keeps its step a candidate and nudges it, the
gathering is the ordinary forage, the deposit is the ordinary store deposit, and the food is ordinary stored food that
spoils and is eaten like any other.

## What it has been shown to do

`prep_out12` (rules-2 era): store food per person entering winter **1.62** with preparation vs **0.83** without. So the
mechanism roughly doubles stored food before winter — but **no welfare benefit was shown**. Winter is four days, wild
food regrows at 40 %, crops at 30 %, and stored food spoils three times as fast (`hardship.ts`); a one-day cushion
cannot carry a household through that, however fully it is achieved.

## Diagnosis

Three things the one-day reserve could be doing in winter are **not separately traced**, and the right improvement
depends on which one is the real constraint:

1. **Too small** — one day of four is the difference between a bad first morning and a bad week; it may simply be spent
   at once and leave three days unprotected.
2. **Spoiled before use** — the ×3 winter store spoilage (`facilities.ts spoilMultiplier`) may eat a reserve as fast as
   it is filled, so a larger reserve would not help until spoilage is addressed.
3. **Not withdrawn/eaten** — a starving person already carrying food, or food stranded in a distant member's store, is
   a distribution problem (`docs/FOOD_HELP.md` adjacent), not a stockpile problem.

A bounded improvement must first establish which of these is the actual constraint in an ordinary world; the programme
is explicit that the answer is not "demand ever-larger stockpiles."

**First diagnostic result** (`scripts/seasonal_prep_diagnostic.ts`, meadow, rules 44, 36 days): store food is **drawn to
near zero by deep winter every year** (49 → 0 by year-day 11, and again each winter), so the reserve is **eaten, not
spoiled or left unused** — the binding constraint is #1, it is too small. Eaten vs spoiled is ~87 % / ~13 % (3728 vs 559
units), so spoilage is a minor factor here, not the thing that strands households. A larger reserve is therefore the
right shape for the improvement, not a spoilage or distribution fix.

## Contract (rules 46, to be implemented)

1. **Per-flow trace.** Add an observation (never saved, never hashed) that follows a household reserve's food through
   the cycle separately: **gathered → deposited → withdrawn → eaten / spoiled / lost**. The ordinary `world.ledger`
   and `facilities.ts` `noteDeposit` / `noteWithdraw` / `noteSpoiled` already carry most of this; the reserve's own
   share is what must be followed across a winter.

2. **Bounded target, only once the flow is known.** Extend the seasonal reserve from the one-day cushion toward a
   defensible multi-day provision, gated on `runsRulesVersion(world, 46)`, capped by store capacity and the existing
   food-first surplus rule, and driven only by the same personal knowledge the current plan reads. No prediction of the
   lean season, no global food totals, no change to decay or spoilage constants, no change to winter itself.

3. **Use the reserve.** Whatever the target, the improvement is only "done" when the trace shows stored food actually
   being withdrawn and eaten during scarcity — not merely accumulated and spoiled.

4. **Preserve scarcity.** A household that cannot prepare adequately must remain possible; the change is a better
   strategy, not a survival guarantee.

## Status

Diagnosis and contract established; implementation (the per-flow trace, then the gated target) is the next slice.
