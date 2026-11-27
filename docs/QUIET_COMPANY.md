# Quiet company (rules 284)

Source: `src/sim/quiet_company.ts`. Taken up on 28 November 2026 from the uncommitted draft in `C:\dev\lw-company-candidate-20261119` (gated there at 262 and 263), on Ryan's word to follow the order small world, quiet company, water, floor.

## What stood before

The want of company (`needs.social`) eased only through a talk, a gathering, a meal, an evening at the fire or the hall, or a scene. Sitting, eating or warming beside somebody in silence counted for nothing. The want drew a person only below 48 (`DRIVE_BANDS.social` [48, 26]), so people sought company once they were already lonely.

## What 284 does

Two parts, switched separately. Rich worlds at rules 284 and later only. Nothing is saved.

- **quiet**: a person awake and at rest, eating, drinking, warming or waiting, with another such person within 3 tiles in the same space, has their want of company eased by 1 point per 150 ticks. Nobody talks and no relation changes.
- **earlier**: the want of company draws a person from 60 in place of 48 (bands [60, 26]).

The draft's doses are kept unchanged.

Lab arms: `rich-no-quiet-company` (both parts off, equal to 283), `rich-no-quiet-company-quiet` and `rich-no-quiet-company-earlier`.

## Measurement (28 November 2026)

Saves lab (`C:\dev\lw_labs\quiet284`): 3 rules-256 saves at day 48, raised to 284, 8 days, with 2 nudge branches for noise. Taking both parts away gave:

- chats −10 (3 of 3 seeds down; the nudge spread is about ±13)
- spare time −19 (3 of 3 down; the nudge spread is about ±6)
- visits +6 and family time +6, mixed across seeds
- people, deaths, births and hunger unchanged

The `earlier` part alone accounts for most of the spare time gain (−12 without it, 3 of 3). Without `quiet` alone, family time −6 and visits −3, 3 of 3.

Free-time split (`C:\dev\lw_labs\free_time\r284` against `r282`, which is the night's-sleep build): free time of people 12 and over 10.9% → 11.2%. That is within noise; 284 does not move the time budget.

Unverified: the 4 fresh 30-day worlds ended 5 to 6 people larger at 284 than at the 282 set (50, 52, 54, 53 against 44, 46, 50, 48). The saves lab shows no change in people over 8 days. Treat as UNKNOWN until a longer paired run checks it.

## Risks

- The `quiet` part runs a spatial index every tick (a grid cache beside the world). Cost is small at the measured sizes; a large town has not been timed.
- Doses are the draft's trial doses. Raising `QUIET_PER_TICK` would let silent company replace talk.
