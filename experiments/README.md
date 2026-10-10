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

**Limitation, recorded:** the transcript and report of this run were written to `inhabit_out\` on the operator's Windows machine, which
is not tracked, and were not available to the session that built the memory stage. The folder `experiments/baseline-pavel-gpt5/` is
where they belong; the summary above is from the operator's pasted output, not reconstructed from the files. To preserve them:

```
cd "C:\dev\Claude Experiment\living-world"
Copy-Item inhabit_out\transcript.json experiments\baseline-pavel-gpt5\transcript.json
Copy-Item inhabit_out\report.txt experiments\baseline-pavel-gpt5\report.txt
Copy-Item inhabit_out\replay.txt experiments\baseline-pavel-gpt5\replay.txt
Copy-Item inhabit_out\standard.txt experiments\baseline-pavel-gpt5\standard.txt
git add experiments
git commit -m "Keep the baseline Pavel transcript"
```

The runner now refuses to overwrite an existing `transcript.json` in its `--out` folder unless told `--overwrite`.

**Replayability across the memory stage (VERIFIED):** a protocol `inhabitant/1` transcript recorded before the memory stage (a
scripted model, seed meadow, Pavel, tick 2400 to 3000) replays on the build that carries memory to its recorded state (`36f5b4dd`),
with the warning that the sources moved (`--allow-source-drift`); without the flag it is refused, as designed. The baseline above
was recorded under the same protocol and behaviour fingerprint (`22b83b7c:3780a61a`), so it replays the same way.
