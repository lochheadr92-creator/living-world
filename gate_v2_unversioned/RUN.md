# The acceptance gate that CAN be run for this change, and what it does not cover

Written before the run.

## What this is

`scripts/gates.ts` is the repository's acceptance test for a change meant to alter behaviour: it asks whether the world's
averages are still where a healthy world's are. It compares like with like and refuses otherwise - same dynamics, same
RULES VERSION, same profile, fork day, days and branch.

Both recorded baselines are UNVERSIONED:

| baseline | dynamics | rulesVersion | profile | fork | days | seeds |
|---|---|---|---|---|---|---|
| `docs/gates.json` | authored | (absent) | large | 0 | 12 | 8 |
| `docs/gates-rich.json` | rich | (absent) | large | 0 | 12 | 24 |

So neither can accept a rules-version-2 run: `gates.ts` would refuse it with "rules version unversioned vs 2", which is
the guard working correctly, not a defect.

What CAN be checked, and is checked here, is the generation the baselines actually cover: an UNVERSIONED rich Large
world, run from today's source, against `docs/gates-rich.json`, which was recorded from an earlier revision. A pass says
this change did not disturb the generation the gates describe. It says NOTHING about whether version-2 behaviour is
acceptable - no baseline exists at version 2, and recording one from this candidate and then checking the candidate
against it would be comparing it with itself.

This gate also covers ground nothing else does: the goldens are 80x80 ordinary worlds and scenes, and the version-1
continuation reference is the `normal` profile. Neither touches a Large world at 12 days.

## Provenance

- source HEAD: see HEAD.txt in this directory (recorded at the moment of the run, with the working-tree diff if any)
- rules: `rich-unversioned` - rich dynamics, deliberately on the pre-version baseline, which is what the recorded
  baseline is
- profile `large`, fork day 0, 12 days, branch `control` only, the first 24 seeds of the standard list
- command:

```
node scripts/lab.mjs --out gate_v2_unversioned --seeds 24 --fork 0 --days 12 --profile large --dynamics rich-unversioned --branches none
npx vite-node scripts/gates.ts -- gate_v2_unversioned --file docs/gates-rich.json
```
