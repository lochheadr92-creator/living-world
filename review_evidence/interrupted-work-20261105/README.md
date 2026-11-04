# Interrupted useful work and repeated switching among food sources: ordinary diagnosis (5 November 2026)

Brain priority findings, item 3: "interrupted useful work and survival-action completion ... repeated switching among depleted food
sources and interrupted care/storage trips. Preserve valid urgent interruptions; fix demonstrated gaps rather than force every
project to finish." Starting evidence: the rules-153 investigation (Fenn "travelled among depleted sources"; Alma had seven
interrupted crafts; Milo's sheltering was interrupted).

## Method

`probe.ts`: four ordinary 25-day Normal worlds (forest, river, meadow, life-stages-6), arrivals on, rules 160, read-only hooks
(`onActivityEnd`, `onNourishment`) and pure option reads (`generateOptions(..., observer=true)`). Every run's exact unhooked twin
matches and conserves goods (`*-r160.json`: `exactTwin`, `conserved`). Staged reads of the same ordinary runs: `search-truth.ts`
(what the world held against what a starving person believed; `impure: 0`).

## What was found

1. **A large share of foraging "interruptions" are not choices.** The four worlds ended 6,221 hunger gathers: 3,827 (61.5%)
   interrupted, 395 (6.3%) a success, the rest failed or partial. Of 2,074 snapshotted review switches that ended a hunger gather
   with "something better came up", the person's own target had dropped out of their options in 1,346; in **1,270 of those the cause was
   that they now believed the place empty** (65 usable but not listed, 11 failed there after a wolf). In the other 728 the current
   target was still offered; of all 2,074, the replacement was another gather in 1,648 (79%). So 61% of these endings say
   "something better came up" when the person had walked into sight of a picked-over patch.
2. **Individuals do not keep going back to places they found empty.** Of 1,740 "nothing left" endings, the same person started
   another hunger gather there within 2,400 ticks (one day) 89 times (5%).
3. **Other people do.** After someone found a source empty, someone else started a hunger gather there within 600 ticks 1,340 times
   and within 1,200 ticks 2,243 times; 545 (41%) and 843 (38%) of those also found nothing left. Hunger-gather sequences between
   meals of two or more gathers: 360 / 251 / 322 / 259; at three or more different sources: 215 / 150 / 178 / 161; ending below
   hunger 10: 87 / 93 / 71 / 79 (forest / river / meadow / life-stages-6). The longest: forest adult Zeke, 23 gathers at 20
   sources, no success, hunger 27 to 0 over 3,372 ticks.
4. **The world really is near famine, and the beliefs are optimistic** (`truth-*-r160.json`). Zeke at tick 52,400 held 66 food-source
   beliefs, 59 of them believed to hold food; 12 of the sources he knew really did. 28 sources within 60 tiles held food (the nearest eight each held one
   unit); his household of four had no food stored. A child, Talia, had 56 believed against 14. Fruit trees last seen about 2,300
   ticks earlier were estimated at 4 against 0 or 1. River: Petra 37 believed against 20; Mira 40 against 12. Remembered empty
   patches "slowly turn hopeful" by design (`knowledge.ts estimatedAmount`), which does not allow for neighbours eating from them.
5. **Other interrupted work is mostly ordinary re-weighing.** Across the four worlds, interrupted against completed, with what came
   next (urgent need / other): repair 292 against 12 success and 89 partial (116/176); deposit 284 against 839 (93/191); build 257
   against 110 success and 318 partial (145/112); till 178 against 118 (63/115); craft 131 against 146 (73/58); haul 147 against 624;
   give 38 against 372. Nearly every one is "something better came up"; danger is a few per cent.
   **Caution on resumption:** the table in `*-r160.json` (`resume`) counts a later *success* of the same kind at the same target
   within 4,800 ticks (repair 3 of 288, build 74 of 254, deposit 102 of 280, craft 39 of 131). Building and repair finish by
   planned "partial" work spells and a deposit can resume at another store, so this undercounts and **is not a defect rate**.

## Decision

- **Done: rules 161** (`../found-empty-20261105/`). The truthful part of finding 1: a gatherer who leaves a place because it now looks
  empty says so. Reason text only; behaviour is unchanged by test and by 25-day side-by-side runs.
- **Not repaired, queued with the evidence above:**
  - *Phantom food beliefs in a famine* (findings 3 and 4). A behaviour change (discount an estimate for competition, or pass on
    "I saw it empty") would change who walks where in the worst weeks. It needs its own design and a lab ablation; nothing here shows it
    would save anyone, because the food really is thin.
  - *Resumption of interrupted work*, measured by progress at the target (or goods still carried), not by success. Interrupted deposits
    leave goods in the pack, which links to the jammed-pack custody design left open from rules 159.
  - Alma's seven interrupted crafts and Milo's interrupted sheltering are single cases from the rules-153 investigation; here craft
    interruptions are 131 against 146 completed, mostly for urgent needs.

## Retained attempts

- `census-v1/`, `probe-v1-census.ts`: the first census (outcome and reason counts only).
- `attempt2-writing-path/`: the probe first called `generateOptions` without its `observer` flag, which takes the person's own
  deciding path and writes `blockedAt` on commitments. Its meadow twin differed from the unhooked twin (`exactTwin: false`);
  `purity-meadow.ts` traced it to `persons.0.commitments.0.blockedAt` at tick 8,034. Not a defect in the game; a mistake in the
  probe. All reported numbers use the observer path.
- `attempt3-before-resume/`: results before the resume analysis was added.
