# Household food preparation, carried through winter

The companion to `prep_out8/`. Same question, same arms, same seeds, same rules; only the window is longer.

## Why a second window

`prep_out8` ends at the tick winter sets in, which is the right place to read "food within reach entering winter". It
cannot say whether having that food made any difference once winter had actually arrived, and hunger exposure over its
window was effectively zero - in a 28-person world with eight easy days, almost nobody goes critically hungry, so there
was nothing for a reserve to improve on.

This run covers the whole of winter: 12 days from the fork, so days 8 to 11 - the four winter days, when wild food comes
back at 40% of its pace at the worst and crops at 30% - are inside the window.

## Design, metrics and interpretation

Unchanged from `prep_out8/RUN.md`, which was written before either run. `hungerExposure` is now the metric of interest,
because it finally has something to measure; `homeFoodPerPerson` at day 12 reads as "what came through winter", not as
"what went into it".

The same rule stands: an effect counts only if its interval excludes zero AND it is larger than what the two nudge arms
show. A null is reported as a null, and a cost without a benefit is reported as a cost.

## Provenance

- HEAD: 83c770e  (branch `claude/household-preparation-v2`)
- rules version: 2, dynamics `rich`, profile `normal`, arrivals off, seeds: the first 24 of the standard list
- command:

```
node scripts/lab.mjs --out prep_out12 --seeds 24 --fork 0 --days 12 --profile normal --branches rich-no-stock,nudge:1,nudge:2
```
