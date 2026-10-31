# Acquiring necessities for personally observed care

## Pre-implementation contract

The rules-94 source audit finds an incomplete transition in `resident_care.ts`:
personally remembered indoor hunger/thirst and incapacity can motivate returning
with spare goods, but an empty-handed helper only receives a blocker. Rules 45
already supports food acquisition after an accepted request. This slice connects
the separately observed care need to existing physical gathering/fetching and
handoff actions; it does not create another promise or transfer handler.

`autonomy_evidence/care95-before.ts` reproduces the gap at rules 94. Ada personally
sees injured, hungry Eli in their own home, leaves lawfully with no food, and knows
a real grain source. There is no care acquisition option; the recorded blocker is
“must keep supplies for my own needs, others or promises.” The failing assertion
and observed personal state are retained in `autonomy-care95-before2.log`.
An initial fixture consumed starting food and then took another initial snapshot;
that accounting error was caught by the fixture preflight. The replacement declares
the empty inventory before the initial snapshot. Both food and water variants now
save/reload exactly and conserve resources (`autonomy-care95-fixture2.log`). The
earlier failed fixture/log remains; it is not successful physical evidence.

The intended contract is:

- Trigger only from actual visible need or fresh personal room contact. Hidden
  health, inventory, changed location or source depletion must not become known.
- Consider at most one recipient's supply acquisition per decision. Require a
  capable helper with their own basic needs protected. Preserve promises and
  existing portions reserved for other dependants.
- Acquire only from personally known sources using existing registered actions,
  actual work, pack limits, access, water budgets and material accounting. The
  amount covers a bounded spare portion and necessary personal/committed reserves.
- Keep the recipient and observed need visible in the action explanation. Existing
  personal contact memory and action state retain the cause across a save; no
  second general memory store or compulsory household role is introduced.
- Urgent interruptions, stale observations, empty/unknown sources, a full pack,
  missing recipient or refusal of entrance remain genuine failure outcomes.
- After acquisition, existing contact-checked care, lawful home-store fallback and
  actual recipient consumption must establish usefulness. Acquiring goods alone
  is insufficient evidence of care.
- Preserve historical rules and add a lab removal. Test source loss, protected
  reserves, own urgency, observer purity, exact save continuation and legal AI
  selection/replay, then render the actual acquisition/return/consumption chain.

Warmth, childcare handback, ordinary frequency and household viability remain
separate programme requirements. No implementation or successful outcome is
claimed by this pre-implementation contract.
