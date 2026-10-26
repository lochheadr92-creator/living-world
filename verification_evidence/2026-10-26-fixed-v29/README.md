# Event-history repair and repeated bounded verification

**The same two-day natural workload now passes exact save continuation.**

## Change and compatibility

Rules 29 snapshots participant IDs in `addEvent` instead of retaining a caller's
mutable array. A later crew join cannot add participants to its formation event.
The version changes because `pickStory` uses those IDs to determine who can hear a
story; this is more than a cosmetic fix. Rules 28 and earlier retain their historical
semantics. Existing saves are not upgraded or relabelled, and their old event lists
are not guessed or rewritten. Save schema, ownership, resources, crew membership
rules, randomness and activity selection code are unchanged.

Before changing production code, `scripts/v28_reference.ts --write` recorded SHA-256
of complete serialized rules-28 worlds before and after continuation, with and without
loading. The reference includes the old mismatch and is never re-recorded. The initial
failing run and counterexample saves remain in `../2026-10-26/`.

## Regression evidence

The new `tests/event_history.test.ts` was executed first against the original rules-28
code: **2 failed, 4 passed**. Both failures were the intended history-snapshot
assertions. After the fix, the focused history/crew/tradition/rules/old-continuation
set passed **39 tests / 5 files**.

The contracts cover caller mutation, preserved feed and chronicle participants,
story eligibility after a later join, and real crew formation → save/load → real
admission of a later member → exact complete save equality. Four old-generation
contracts explicitly retain the recorded alias semantics.

## Repeated natural workload

Command:

```sh
npx --no-install vite-node scripts/bounded_verification.ts --out verification_evidence/2026-10-26-fixed-v29
```

That is the recorded command. For another run, choose an unused `--out` directory;
the runner deliberately refuses to overwrite either set of evidence.

Source: clean local commit `c39cf110a1766c828e6cbd79df97f0b90b7e657d`, published as
`88d8a86525e6af814aee9d20f6df243d8e03311e`. Both have identical tree
`eb86d252e2fee902c5b31b4500ebe7d4efe24d62`. GitHub API publication assigns different
commit metadata; this is not a source difference. `report.json` records the local
source and an empty tracked source diff.

- Current rules 29; meadow, Normal, 28 founders, arrivals off, 4,800 ticks.
- Same first living founder, Pavel #997; ordinary autonomous choices throughout.
- **111 observation/card checks pass** without changing any serialized field.
- **21/21 checkpoints:** exact complete saved state equals the unobserved twin.
- **10/10 checkpoints after the day-one load:** exact complete saved state equals
  the uninterrupted world, including all event and chronicle participant lists.
- Ledger and tool checks pass at all 21 checkpoints. **Zero failures**, exit 0.
- All 28 founders survive. Pavel's health is 82 → 100. Activity tick counts exactly
  match the original run; no two-day welfare or behaviour improvement is claimed.

The separate scripted-controller replay also passes **4/4**, ten decisions applied,
zero engine fallbacks, exhaustive reconstructed saved-state equality. Current replay
end hash `8a5e4d7c`; source fingerprint `2243c921`. Its log is retained alongside this report.

## Validation and limits

**Full suite: 1,207 tests / 146 files passed**, exit 0, 235.91 seconds, command
`npm test`; output is `full-suite.log`. Build/typecheck and whitespace checks pass.
All existing historical references are unchanged; only the new rules-28 reference
was added, before the fix.

The original run was mistakenly believed stopped after it went quiet. The attempted
process stop had not actually ended the harness session; the original run continued
and produced the successful result above. A duplicate two-worker run was explicitly
interrupted through the harness and has no accepted result; its partial output is
`duplicate-suite-interrupted.log`. No duplicate test pass is claimed. Future full
suite runs at this measured cloud cost belong on the owner's Windows machine under
the repository's approximately three-minute budget.

This is one seed over two days plus controlled regression cases. It establishes
this repair and bounded continuity, not universal replay correctness, long-term
civilisation, aggregate benefit or rendered usability. No fresh browser review is
claimed. Older saves intentionally keep their historical behaviour, including this
defect; fixing those in place would require a separate, explicitly tested migration.

Existing modules touched: `events.ts` owns participant copying; `rulesversion.ts`
owns the new generation and compatibility gate; `AGENTS.md` and development policy
describe it. The verification runner now refuses output overwrite and records dirty
source differences. No unrelated simulation or UI mechanisms were changed.
