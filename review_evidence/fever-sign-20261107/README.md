# Rules 165: a fever is a sign others can see (7 November 2026)

Gap map G20 (brain note `daily/2026-11-07-living-world-gap-map`). Contract and limits: `docs/FEVER_SIGN.md`. Repo `living-world-integrate`, `main`,
start `7a67eeaa` (rules 164).

## Re-verification against source

`options_social.ts candidates` skipped a stranger when the person was cautious (caution above 0.55), did not know them well (affinity under 40, not kin)
and `e.illness.severity >= 0.5` for the OTHER person's live record. `SeenEntity` (types.ts) carries hungry, thirsty, tired, cold, hurt and what they carry,
and no fever sign, and `perception.ts describeSeenPerson` sets none. The only other reads of an illness in option generation are the person's own. The
finding holds as written.

## Files

- `test-before-at-7a67eeaa.txt` — `tests/fever_sign.test.ts` run against a `git archive` export of the previous commit, the two describe blocks that need the
  new module removed: 2 of 3 fail on behaviour (the live record is read at once; the sign never appears); the third is a guard (a friend, kin or a bold
  person is not avoided) that holds at both versions.
- `test-related-after.txt` — 19 files, 111 tests (pins 93/161/162/163/164, goldens, rules version, social, perception, illness, estate release, shared
  stone, proposal belief, the new tests): all pass; `tsc --noEmit` clean.
- `twelve/` — `scripts/ab_run.ps1` (the lab's twelve seeds, Normal, 25 days, arrivals on, at rules 164 and 165, run from a clean checkout of `70367c85`):
  `ab-<seed>-r<rules>.json`, `ab-compare.txt` (the table), `ab-summary.txt` (one line per run). The final-state hash masks the rules number.
- `diverge.ts`, `diverge-gen-6.txt` — one world run at 164 and 165 side by side, first difference checked every 60 ticks: gen-6 first differs at tick 49,020
  (day 20.43), when Zed's fever reaches severity 0.5; the same person is ill in both. The first difference is the sign itself appearing in a sighting record
  (the saved state includes `seen`), not necessarily a changed decision. That tick fixes the length of the rules-165 continuation pin.

## Results

| Probe | Result |
|---|---|
| Twelve lab seeds, 25 days, rules 164 against 165 | saved state identical in 11 of 12; gen-6 first differs at tick 49,020, when the new key first appears in a sighting record (the save includes those records), and ends with the same alive 32, deaths 0, households 10, couples 8, three people ill; mood -0.4 against -0.4 and hunger 67.4 against 67.4, so no changed decision is shown |
| Fevers in the twelve worlds | people ill at day 25: gen-6 3, every other seed 0 (fevers that came and went earlier are not counted here); only gen-6 parted |
| Conservation, tool registry | hold in all 24 runs |

The change moves one world by details and none by headline outcome. No benefit is claimed. One world cannot carry a paired comparison, and the lab would
have only gen-6 to measure.

## Immutable pin

`tests/v165_continuation.*`, recorded in `afb50aef` from a clean checkout of `70367c85` before any successor: the Normal gen-6 world, 49,500 ticks (the sign
is seen at 49,020), then 120 more after a save and load. The integrate checkout, which carries another session's uncommitted edits, gives the same digests.
