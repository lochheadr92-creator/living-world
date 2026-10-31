# A bounded personal decision ledger — rules 103

Delivered 31 October 2026 on `main` after rules 102. Programme row A15 / WS13 (causal inspection across time) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Owner: `src/sim/decision_ledger.ts`; lab removal
`rich-no-decision-ledger` (no behaviour depends on the ledger, so the removal changes only what is written). Rules 102 and
earlier keep their recorded state shape and references.

## What existed and what was missing

The inspector already answered "what are they doing, why, what are they trying to achieve, what is stopping them, what
happened after the last attempt, what are they set on" from `lastDecision`, `lastResult`, the log, plans, requests and
commitments (`inspect.ts buildQA`, `VIEWER_READABILITY.md`). Only the **last** decision and the **last** result were
kept, nothing linked a decision to the activity it launched or to how that activity ended, and the log was free text with
no ids. A viewer could see what was weighed a moment ago, never "she chose the tree over the storehouse at tick 4,120, the
trip failed at 4,310 because nothing was left, and next she chose the storehouse". Alternatives were only in the debug
section, with raw numbers.

## Contract (rules 103)

- **One entry per recorded decision** (`decision.ts record`, every path: ordinary launch, review switch, external choice
  and the no-choice case): tick, trigger, the chosen option's key, label, kind and target, the plan it served, the activity
  it launched, the three strongest alternatives passed over and the first three options set aside with the reasons given
  **at the time**. Nothing is re-scored against the present world; no internal sort score or nudge is shown.
- **Closed where the activity ends** (`activities.ts endActivity`): outcome, detail and the tick, matched by activity id,
  so a suspended and resumed activity closes its original entry.
- **Bounded**: eight entries per person; what falls off the end is counted in `decisionsDropped` and the panel says
  "N earlier decisions were compacted and are not kept". No entry is invented for anything before the ledger existed.
- **Saved with the person, never fingerprinted**: every person of a world that carries the ledger has the fields (older
  saves gain empty ones on load); the state hash ignores them, as it ignores the last decision and the log, because nothing
  in the simulation reads them. Validation refuses the fields below rules 103, more than eight entries, ticks beyond the
  world's, unordered ticks, malformed outcomes.
- **Shown** as "Recent decisions" in the person panel (`history.ts decisionHistory`, `ui/person.ts`), newest first:
  "Tick N (…), review: chose “Gather berries” as a step of plan #12; ended partial at tick M: nothing left. Passed over
  then: …. Set aside then: … (reason)." Still-running and never-started cases say so; a world below 103 says the history
  is not kept.

## Evidence

Focused contracts (`tests/decision_ledger.test.ts`, 3): nine hundred ordinary river ticks give every living person a
bounded, tick-ordered ledger whose entries name activities that person really started and whose closed entries match the
actual endings (over 100 entries, over 50 closed, compaction counted); exact save and reload; the fingerprint is unchanged
by clearing every ledger; rules 102 persons carry no fields; the switch off leaves empty ledgers; a tampered future tick is
refused; a rules-102 save relabelled 103 gains empty ledgers on load; a staged covered-site decision records the set-aside
reason "Ben promised 3 wood…" at the time, the inspector view repeats it, observation and inspection leave the state
unchanged, the entry closes with the real ending, and the recorded reason survives after the promise has lapsed.

Rendered (`scripts/browser/decision_ledger_check.mjs`, **4/4**, `autonomy_evidence/ledger103-rendered`, screenshot
inspected): an **ordinary** river world run 900 ticks in the page, no staging; the person with the most compacted
decisions shows closed choices with endings, what was passed over and what was set aside; inspection leaves the serialized
state unchanged; the world reloads exactly and reads the same.

Cost (`scripts/decision_ledger_cost.ts`, one river day, single run on the shared container): tick time 2.53 ms at 102
against 2.29 ms at 103 (noise), serialized size 1,942,141 against 2,041,730 bytes (**+99,589 bytes, +5.1%**) for 224 live
entries across 28 people with 285 compacted. The growth is bounded by the cap and the text limits (labels 80, reasons 120
characters); it is the price of keeping reasons as words.

## Limits and what remains

- The ledger links decision → activity → ending. It does not yet link to the triggering observation or the belief relied
  on (A15 "observation → belief then → choice"), nor to a later consequence beyond the activity's own ending; those remain.
- The AI inhabitant's observation is unchanged: it already sees its own last decision; the ledger is not exposed to it.
- Authored and pre-103 worlds keep no ledger and say so.
