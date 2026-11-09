# Rules 182 against 181: a grievance remembers the event that caused it (gap G01, first slice)

Change: `addEvent` returns the id it allocates; where a broken promise, a refusal that makes the feed, a contest lost on a feed day or an argument also records an event, that
id is kept on the grievance (`Grievance.eventId`) and on the relation history notes written for it (`src/sim/causal_events.ts`, `linkCause`). Nothing reads the id, so no decision
should change. Contract: `docs/GAP_LEDGER.md`, "G01 first slice". Record: `docs/CAUSAL_EVENTS.md`.

## Pre-stated comparison and what was run

Stated before any run: the version twin on the 12 seeds (Normal, 25 days, arrivals on, control arm, `scripts/ab_probe.ts` at 181 and 182, rules number masked) **with the new
fields stripped before hashing** (`--strip-cause`, added to the probe for this step and off by default), two processes at a time, clean worktree. The final world must be identical at
181 and 182 in 12 of 12 seeds; if any seed parts, the change is not decision-neutral and the lab runs. A null is the expected and desired result: this is a record, not a behaviour.

Run: clean worktree `living-world-v177-pin` at `f26cadcb` (`dirty` false), 2026-11-09 23:50 to 2026-11-10 00:31, from `run-twin.ps1` in this folder (`-Pairs 181,182 -Extra --strip-cause`),
in the foreground session, with other runs alongside, so wall times are slower than a quiet machine. No scheduled task, no hidden window.

## Result

`twelve/ab-compare.txt`: with the ids stripped, the final world is identical at 181 and 182 in 12 of 12 seeds; conservation and the tool registry hold in all 24 runs. The first line of
that file names the temporary directory the run wrote to; the JSON files here are copies.

The check was first run on a two-day birch world while building the option: rules 181 and 182 gave different hashes without the option and the same hash with it, which is what keeps
the strip from hiding a difference (it removes only `,"eventId":N` keys). That the ids really are kept is shown by the pin and the tests, not by this comparison: in ordinary birch a
linked grievance and history note first appear at tick 76.

## Limits

Stripping hides every `"eventId"` key, including one that already existed at 181 (a helper-work record); a difference only in those would also be hidden. The comparison says the dynamics
are unchanged in these twelve 25-day worlds, not that the stored ids are right in every incident. A theft, and any incident that records no event, is not linked. No benefit or harm is claimed.
