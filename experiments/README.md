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
