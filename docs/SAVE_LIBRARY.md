# Save library at rules 256

Six saved settlements for labs that start from a mature world (Stage 1d of the plan of 17 November 2026). Written on 18 November 2026
by `scripts/generation_trace.ts` in the format the product writes (save format 5, no new field). The saves are not in git: they are
large (12.0 to 13.4 MB at day 48, 32.5 to 34.7 MB at day 96). They live in `C:\dev\lw_saves\rules256\` on TheWeapon and are rebuilt by the commands below.

All six: rules version 256, rich dynamics, arrivals on, Normal profile, no edits after the run, no nudge. The hash is `hashWorld` of the
world read back from the file (it includes the rules version label); the file digest is the first 16 hex characters of the SHA-256 of the
file text, to tell whether a file is the one listed.

| seed | day | rules | people alive | dead so far | world hash | file digest | size |
|---|---|---|---|---|---|---|---|
| aspen | 48 | 256 | 65 | 0 | af381544 | 16e90b98c74e1d6f | 12.0 MB |
| aspen | 96 | 256 | 128 | 1 | ad72bbd1 | 24e5fdf38ff1017f | 34.7 MB |
| gen-4 | 48 | 256 | 67 | 0 | 7a9b9a5e | d19866c4ee371d70 | 13.1 MB |
| gen-4 | 96 | 256 | 125 | 0 | 2a693b5e | 29bf9080a5cf4313 | 32.5 MB |
| river | 48 | 256 | 67 | 1 | 854dfc20 | 2211959686800917 | 13.4 MB |
| river | 96 | 256 | 127 | 1 | ff460fe2 | 0d37057b1e72b20b | 34.7 MB |

Day 48 is the first day of year 5 and day 96 the first day of year 9 (a year is 12 days). The winter that follows each is days 56 to 60 and
days 104 to 108.

## Rebuild

One run writes both saves of a seed (from the integrate checkout, at rules 256 or later with the same behaviour, no `--rules` option):

```
node_modules\.bin\vite-node scripts\generation_trace.ts -- --seed aspen --days 96 --save-every 48 --save-dir C:\dev\lw_saves\rules256
node_modules\.bin\vite-node scripts\generation_trace.ts -- --seed gen-4 --days 96 --save-every 48 --save-dir C:\dev\lw_saves\rules256
node_modules\.bin\vite-node scripts\generation_trace.ts -- --seed river --days 96 --save-every 48 --save-dir C:\dev\lw_saves\rules256
```

Immigration is on by default. The files are named `<seed>-day48.save.json` and `<seed>-day96.save.json`.

## What has been checked

- aspen, day 48: rebuilt on 18 November by a separate run of the same command with `--days 48`. The file is byte for byte identical to the one
  in the library (SHA-256 `16e90b98c74e1d6f9ed72dc30c1805ed3f4f90a3095010c7dbb5f9e29d26339f`). VERIFIED for that save only.
- The other five saves have not been rebuilt a second time. That a rebuild gives the same file is LIKELY from the one check above and from
  the determinism and save and load checks of rules 256 (`review_evidence/stage1c-20261118/RESULT_step5_keyed_draws.txt`), not VERIFIED.
- Each save loads with `deserializeWorld` and its rules version reads 256 (the table above is read from the files, not from the run logs).

## Use

```
node scripts\lab.mjs --saves C:\dev\lw_saves\rules256\aspen-day48.save.json,... --days 13 --branches nudge:1,nudge:2 --out <dir>
npx vite-node scripts/generation_trace.ts -- --load C:\dev\lw_saves\rules256\aspen-day48.save.json --days 13
```

A lab started from a save treats `--days` as days to continue, applies each arm from the save's day on, and reads the save's own seed, rules
version and arrivals setting. `--rules-up N` raises a save to a later rules version for measurement; the result is a reinterpretation and not
a continuation of the save's own rules (see `scripts/world_args.ts`).

A save from before a rules change is a record of that version. When the rules version moves on, rebuild the library at the new version and
replace the table above; do not edit a save in place.
