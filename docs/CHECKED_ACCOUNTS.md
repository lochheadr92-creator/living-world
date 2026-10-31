# Checked accounts of places — rules 107

Delivered 31 October 2026 on `main` after rules 106. Programme row A7 (reliability learning and conflicting reports) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md): "handle conflicting reports without granting truth
detection; preserve teller, age and firsthand versus hearsay status; let later observations revise a belief; record
disagreement, trust changes and reconciliation only when the person has grounds for them." Owner:
`src/sim/checked_accounts.ts`; lab removal `rich-no-checked-accounts`; rules 106 and earlier keep their recorded behaviour.

## Diagnosis

The belief store already preserves the teller (`Belief.from`), when they saw the place (`seen`), when it was told
(`learned`) and how many mouths it passed (`hops`); a fresher personal observation already replaces hearsay
(`knowledge.ts learn`) and a stale retelling is refused (`news.ts tellBelief`). What was missing was any record of what
became of an account once the listener checked it, and any later choice that used that record. A neighbour whose
descriptions were never there when one arrived was asked again exactly like one whose descriptions always were.

## Contract (rules 107, rich worlds)

- **Grounds.** When a personal observation of a source replaces a told belief of it (`knowledge.observe`), the account is
  checkable only if it was first-hand (one mouth), told within a day of the teller's own sight, of two or more, and is
  being checked within two days of the telling (`checkableAccount`). It is borne out when what is found is at least half
  of what the description, regrown by the ordinary estimate, led the listener to expect; otherwise not.
- **What is kept.** On the listener's existing relation with the teller: accounts checked, accounts borne out, and the
  last check in full (place, described, expected, found, told at, checked at). Counts are halved before passing twelve.
  A log line states the verdict with the age of the telling, and trust moves once by a bounded step (+1 borne out, −3
  not) with a dated relation note. Seeing the same place again is the same grounds, not new ones: the belief is then
  the listener's own.
- **Relayed accounts** (two or more mouths) that fall short are logged as "passed on from somebody else … I hold it
  against nobody". Stale or late checks are no grounds: things get picked.
- **Disagreement.** When a newer account of a place the listener saw themselves differs by more than half, the ordinary
  adoption goes ahead and the disagreement is logged with both figures and both dates ("Theirs is the newer sight, so I
  go by it until I see for myself").
- **The one later choice.** Among people present, whom to ask where food, wood, stone or water can be found is weighed
  by the tally, at most ±4, with the tally as the stated reason (`options_social.ts optAskInfo`); the inhabitant gets
  the same reason. Nothing else reads it. The relationship-history panel shows the tally and the last check.
- **Not truth detection.** A bush somebody else stripped the same morning counts against the teller, because the
  listener cannot know that; the panel says so. No skill, willingness or honesty is inferred; trust steps are bounded.
- Save: validated (rich, 107+, integer bounds, borne out ≤ checked, dates ordered); refused relabelled below 107.

## Evidence

- Staged (`tests/checked_accounts.test.ts`, 3 tests; fixture `tests/helpers/checked_accounts.ts`): Ben's first-hand
  account of a bush declared stripped after he saw it; Ada walks there on his word, finds it short, holds it to him once
  (trust 10 → 7, one log line, one note), Cara and Ben hold nothing; the wood question she then has for both neighbours
  weighs Cara over Ben by four with the tally as reason; below 107 and with the lab removal they are asked alike. An
  account borne out counts +1 and +4; relayed, stale, late and small accounts are no grounds; a newer differing sight of
  Cara's is adopted and logged; saves round-trip, are refused relabelled 106, and a reloaded twin continues exactly.
- Rendered (`scripts/browser/checked_accounts_check.mjs`, 7/7, screenshots inspected): the same scene in the page; the
  relationship history reads "Accounts of places checked: 1, borne out 0" with its grounds, and left to herself Ada asks
  Cara with asking Ben passed over (`autonomy_evidence/accounts107-rendered`).
- Ordinary (`scripts/checked_accounts_observe.ts`, five days, Normal): river at 107, 71 accounts checked (64 borne out,
  7 not), 12 disagreements logged, 2 relayed accounts found short; meadow at 107, 87 checked (76/11), 31 disagreements,
  1 relayed; river at pinned 106, none. No sampled where-to-find ask was offered in either window, so the weighed choice
  occurred only staged. No deaths. Reports: `autonomy_evidence/r107-{river,meadow}`, `r107-river-at106`.
- Regression 337 files / 2,199 tests; runtime `a430195`, reference `4bcbb9c`.

## Limits

Accounts of places only; accounts of people's whereabouts (rules 105), promises and work are not graded here. The
rumour path (`reputation.ts`) keeps its own fading and is not revised by this rule; a corrected rumour's influence
remains open on the register. No claim that the choice of whom to ask is better for it.
