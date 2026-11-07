# A fever is a sign others can see — rules 165

Predecessor rules 164 is pinned by `tests/v164_continuation.expected.json`, recorded before this
behaviour existed. Origin: the gap map of 7 November 2026 (`daily/2026-11-07-living-world-gap-map`,
G20, one of the six verified knowledge-gated reads), re-verified against source first. One leak, one
rules version (decision D2).

## The defect (every version up to 164)

`options_social.ts candidates` builds the list of people a given person might talk to, trade with or
ask. It skipped a stranger when the person was cautious (caution above 0.55), did not know them well
(affinity under 40, not kin) and `e.illness.severity >= 0.5`, where `e` is the other person's live
record. The comment says "plainly feverish", but nothing in what the person has seen, remembered or
been told says so: `SeenEntity` carries hungry, thirsty, tired, cold, hurt and what they carry, and no
sign of fever. Changing only the other person's illness record after the last glance changed the
options (`tests/fever_sign.test.ts`, the 164 half).

## The rule

`src/sim/fever_sign.ts` (`hasFeverSign`: rich, rules 165 or later, switch on):

- perception adds `feverish: true` to the record of a person in view whose fever has reached
  severity 0.5 (`describeSeenPerson`, next to hungry, cold and hurt; the key is absent otherwise, and
  absent altogether below 165, so a record from an older world is exactly what it was);
- `candidates` reads that sign instead of the live record. The threshold, the caution gate, the
  affinity gate and the kin exemption are unchanged, so the same people are avoided when the fever was
  in view; what changes is that the avoidance rests on the last glance. A fever that begins after the
  glance is not avoided until the person looks again, and one that has ended is not avoided after they
  look again.

Rules 164 and earlier keep their recorded behaviour. The module switch `setFeverSign`
(`feverSignOn`) restores the rules-164 read inside a rules-165 world; the lab branch name would be
`rich-no-fever-sign`.

## Evidence

- **Contract tests** `tests/fever_sign.test.ts` (5): change only Ben's live illness record after Ada's last glance and diff her options. At 164 Ben
  drops out of her options at once; at 165 they are unchanged until she looks again and then he drops out. The sign appears at severity 0.5 and not 0.49,
  goes when the fever does, and is absent from a record below 165; a friend (affinity 50), kin and a person who is not cautious are not avoided at
  either version; the switch restores the 164 read. Against a `git archive` export of `7a67eeaa` the two behavioural tests fail and the guard passes
  (`review_evidence/fever-sign-20261107/test-before-at-7a67eeaa.txt`).
- **Earlier rules unchanged:** 19 files, 111 tests including the pins 93, 161, 162, 163 and 164 and the goldens pass; `tsc --noEmit` is clean
  (`test-related-after.txt`). Immutable rules-165 continuation `tests/v165_continuation.*` (gen-6, 49,500 ticks, then 120 after a save and load),
  recorded in `afb50aef` from a clean checkout before any successor.
- **Ordinary worlds** (`scripts/ab_run.ps1`, the lab's twelve seeds, Normal, arrivals on, 25 days, 164 against 165): the final world is identical in 11 of
  12. gen-6, the one world with fevers at day 25 (three people ill), first differs at tick 49,020, the moment Zed's fever reaches 0.5 and the new key first
  appears in a sighting record. The saved state includes those records, so the hash differs from the tick the sign first exists, whether or not any decision
  changed; the headline outcomes are identical (alive 32, deaths 0, households 10, couples 8, mood and hunger unchanged to the decimal), so the run does not
  show that any decision differed. Conservation and the tool registry hold in all 24 runs. One world is not a paired comparison, so no lab verdict is given.
  No effect on survival, households or mood is claimed or measured.

Not touched: what a person does about their own fever, how a fever spreads (`illness.ts expose`),
the person card and the inhabitant observation (neither shows the new sign).
