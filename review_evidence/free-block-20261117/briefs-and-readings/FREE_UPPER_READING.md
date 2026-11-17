# Free block upper bound: the reading, fixed before any run (SCRATCH ONLY, 17 November 2026)

Written at 22:33 Brisbane on 17 November 2026, on Ryan's message of that evening, before any of the six runs starts and before any result of this task exists. The earlier results (out\free, verdict GATE RARELY ACTIVE) are known and are the reason for this run. The file's SHA-256 is recorded in `out\free-upper\commands.txt` when the runs are launched; it is not edited afterwards.

## What is run
Six runs of 30 days from the same day 48 saves (aspen, river, gen-4), in one wave. In each world two arms, which Ryan called the D and E arms and which are named UD and UE here to keep them apart from the believed-fed D and E runs in out\free:
- UD: the window starts at 0.62 of the day. UE: it starts at 0.50. Each window ends at the person's own bedtime, 0.8 + p.chrono.
- **The upper-bound gate** is the gate of out\free with the food condition removed. For a person aged 12 or over, inside their window, with no need under its CRITICAL level, new stocking and production options are not offered, whatever the person believes their household holds. Everything else is as before: the same classification of options (110 rows, scripts/free_classify.ts), the running activity is exempt, no score changes, under-12s are untouched.
- **Controls:** the A, N1 and N2 runs already in out\free (aspen, river, gen-4). They are not rerun ("the same controls"). The source edited for this run differs from the source they ran on, so gate-off inertness is checked again: a one-day smoke of aspen A on the edited source must end on the hash `510f235b`, the hash of the same one-day smoke before the edit.

## Measures and noise (as in out\free)
People aged 12 and over. life = social_contact plus leisure, share of waking time. noise, per world and measure = the larger of |N1 minus A| and |N2 minus A|, from the existing controls. Survival holds for an arm in a world when deaths are at most the highest of A, N1, N2 plus 2, and the hungry-with-no-food share is at most A plus noise plus 3 points.

## Ryan's reading, in his words
- "Life opens: E life above A by at least 8 points and above the noise in at least 2 of 3 worlds, with survival holding as before. Otherwise freed time does not become life even when the gate is always on. That points at walking and pace, and away from stocking outranking leisure."
- "Survival risk: removing stocking from households that believe themselves short could cause hunger deaths. The existing survival test already covers that, so it is part of the result."

## How it is applied (my reading of those sentences; Ryan to veto)
1. A world **counts** toward LIFE OPENS when, in that world, life in UE minus life in A is at least 8 points, and is more than the noise for life, and survival holds for UE.
2. **LIFE OPENS** when at least 2 of 3 worlds count. Otherwise **NOT OPENED**: freed time does not become life even when the gate is always on.
3. **SURVIVAL COST** is reported as before: survival fails for UE in at least 2 of 3 worlds. Order of reading: SURVIVAL COST first, then LIFE OPENS, else NOT OPENED. The deaths are reported by cause in every arm; a death in one run is not attributed to the gate.
4. UD is reported on the same measures. It is not part of the headline test, because Ryan's sentence names E.
5. The inference "that points at walking and pace, and away from stocking outranking leisure" is Ryan's. The run measures only whether life rose and where the freed time went (category and activity kind, in the ticks where the gate was on). The report will say what the numbers show about that and will not take the inference as measured.
6. How engagement is reported: the share of window person-ticks where the upper-bound gate was on (every tick with no need under CRITICAL), and, for those ticks, the TimeBudget category, the ten largest activity kinds and the outdoor company share, in UE against A under the same accounting.

## Limits stated now
One run per arm: a description, never a rate. The noise floor is two nudges (crude). Rules 250, not 255. Three worlds. No benefit claim. No change to any score, rule, pin, lab arm or file under docs/. Scratch only.
