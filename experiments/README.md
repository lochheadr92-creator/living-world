# Experiments

Recorded runs of the AI inhabitant (`docs/INHABITANT.md`). Each folder holds the transcript the runner wrote (`transcript.json`), its
report (`report.txt`) and, where made, the replay check (`replay.txt`) and the standard window (`standard.txt`). A transcript replays
without the model: `npx vite-node scripts/inhabit.ts -- --mode replay --transcript <folder>/transcript.json --out <folder>`
(add `--allow-source-drift` when the sources have moved on since; every state hash is still checked).

## baseline-pavel-gpt5: the first real-model run (no memory)

| | |
|---|---|
| seed | `meadow` (village), authored dynamics |
| inhabitant | Pavel (#996), an elder |
| window | tick 2400 to 3600 (day 1 from 07:12, half a day) |
| model | `gpt-5` through Chat Completions, no effort setting, default budget |
| protocol | `inhabitant/1` (no memory) |
| decisions | 5, applied 5, refused 0, engine fallbacks 0, timing mismatches 0 |
| final world hash | `0d0de0ed` |
| replay | PASS on the operator's machine (`0d0de0ed` recorded and reproduced) |
| standard window | `053460f5` |

The four files are kept here (since 2026-10-11), so the table above is read from them and not from pasted output. They had been
written to the runner's default `--out` folder, which `.gitignore` excludes, and were very nearly lost. The runner refuses to
overwrite an existing `transcript.json` unless told `--overwrite`, which is what saved them.

## memory-pavel-gpt5: the first real-model run with memory

Same window and model as the baseline, `--memory` (protocol `inhabitant/2`): 5 decisions, applied 5, refused 0, engine fallbacks 0,
timing mismatches 0; notes 5 updates, 0 rejected; final world hash `4f05d50c`, notes hash `e068ba0e`; replay PASS on the operator's
machine. Kept in `memory-pavel-gpt5/` since 2026-10-11 (transcript, report, replay).

The five actions, their ticks and their outcomes are those of the baseline, checked against both files: strip `world.inhabitants` from
the two replayed end states and they hash alike (`a9896b72`), so `0d0de0ed` against `4f05d50c` is the notes being folded into the
world hash and nothing else. Memory changed what Pavel wrote and the reason he gave, not what he did - in a window of five
decisions, which is too short to ask more of it. It cost 13,108 output tokens against 3,697.

**Replayability across the memory stage (VERIFIED):** a protocol `inhabitant/1` transcript recorded before the memory stage (a
scripted model, seed meadow, Pavel, tick 2400 to 3000) replays on the build that carries memory to its recorded state (`36f5b4dd`),
with the warning that the sources moved (`--allow-source-drift`); without the flag it is refused, as designed. The baseline above
was recorded under the same protocol and behaviour fingerprint (`22b83b7c:3780a61a`), so it replays the same way.

## Reading a run: attribution, then the counterfactual re-ask (2026-10-12)

```
npx vite-node scripts/inhabit_attribute.ts -- experiments/memory-pavel-gpt5
npx vite-node scripts/inhabit_counterfactual.ts -- --transcript experiments/memory-pavel-gpt5 --asks auto --repeats 3 --api openai --model gpt-5
```

The first writes `attribution.txt` beside the transcript (committed here for both Pavel runs): per decision, the reason words found
only in the notes, and the noted goal or intention the chosen option carries out. The second puts the candidate decisions to the model
again, with the notes and without, and writes `counterfactual.json` and `counterfactual.txt`; it costs asks x repeats x 2 calls
and runs nothing in the world. On the memory run, attribution finds two weak candidates (asks 1 and 2) and none at the chop (ask 3),
whose reason answered the fresh build result while the notes still said the site had materials: see `docs/INHABITANT.md`, section 8.

## harsh6-tomas-gpt5: six harsh days, GPT-5 with memory (run 2026-10-11, kept 2026-10-12)

Seed meadow, harsh, Tomas (#981), tick 2400 to 16800 (`--days 6`), `--memory`, `gpt-5`, timeout 120 s, 16,000 output tokens.
`transcript.json` (3.3 MB), the runner's `report.txt`, the operator's `replay.txt`, and `attribution.txt`. Replayed again on the
cloud container to the recorded state `23ac03a0` (95 decisions, 8 overrides, 22 s). Five rate limits at day 6.2 tripped the gate's
breaker and the engine drove the last two thirds of a day; the fix is in the branch. Attribution: the notes named a target at 58
decisions and the choice was one of them at 6; six strong candidates (asks 24, 51, 59, 60, 75, 79). The reading is in
`docs/INHABITANT.md`, section 8. To run the counterfactual on them:

```
npx vite-node scripts/inhabit_counterfactual.ts -- --transcript experiments/harsh6-tomas-gpt5 --asks auto --repeats 3 --api openai --model gpt-5
```

**Failed attempt, 2026-10-13:** the first counterfactual on the Tomas run met an account with no credits; all 36 calls failed. The
files it wrote were moved out of the folder by the operator (they said "0 of 6 shift", which was the renderer's mistake, since fixed:
such a run now writes `counterfactual.failed.txt` and no `counterfactual.json`). The run is to be repeated once credits are on the
account, on the fixed code.
