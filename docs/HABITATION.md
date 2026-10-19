# Actual home occupancy

Implemented on `codex/home-habitation`, based on household-preparation commit `1a13408`.
This branch is separate from the ongoing wolf-defence checkout. The owner chose habitation first,
then wolf-defence integration. Version 3 on THIS branch means habitation, not wolf defence.
Do not combine saves or code from two different meanings of version 3. The subsequent wolf change
must receive a distinct later version and preserve this version's semantics before integration.

## Contract

`src/sim/habitation.ts` owns admission, exit, occupancy queries and indoor/outdoor contact.
`Person.indoors` is authoritative and optional; absence means outdoors. The pre-existing
`Building.inside` field is unused legacy data, not a second occupancy record.

A hut or house has an abstract interior. Its existing door tile is the map anchor of that
interior. A person walks to that door before entry. Indoor presence is a distinct location,
not an outdoor person given a shelter bonus. Building footprints remain impassable.

Residents may use a home owned by their household. Nominal room is four for a hut and eight
for a house, extended to fit the actual living household; food storage capacity is unrelated.
There is no guest/tenancy system or overcrowding penalty in this slice. A change of ownership
does not teleport an existing occupant, but re-entry requires current access.
Handcarts cannot enter; the existing owner must unhitch before admission.

Sleep, rest and taking refuge at a known solid home enter it. Existing home-store eating and
carried-food eating may continue inside. Other activities must leave before moving or working.
Between indoor activities, occupancy persists. A blocked exit pauses outside work; existing
activity expiry remains bounded. No invisible outside work or teleporting through blocked doors.

Indoor residents see the home and its occupants, not outside animals, people or resource
changes through walls. Outside observers do not see residents as outdoor neighbours.
Direct person-targeted actions cannot execute across the indoor/outdoor boundary. Starting a
conversation with an indoor person is deliberately unavailable in this first slice.

Warmth and rain protection for enclosed homes now require occupancy and use the home's condition.
Halls retain their earlier public-shelter abstraction; lean-tos remain open shelters, and fires
remain outdoor heat sources. Residents do not receive neighbouring outdoor fire warmth.
Wolves cannot target or bite an indoor resident, including between periodic safety checks.
Indoor residents do not count as outdoor companions deterring a wolf. Fleeing toward one's
known solid home now enters at its door rather than stopping at a protective radius.

Death clears occupancy. Collapse clears it and, if the doorway is obstructed, uses the newly
opened floor of the collapsed building. In-place hut-to-house upgrades retain occupancy.
Newborns inherit an indoor mother's location. No rooms or furniture are simulated.

## Persistence and compatibility

Rules version 3 adds habitation; versions 1 and 2 remain supported. Unversioned worlds retain
their earlier semantics. New fields are not stamped into older generations.

Indoor location is serialized with each person and included in the compact state fingerprint.
The save format remains 4 because its existing generic person-field serialization supports the
optional field. Loading rejects invalid indoor references instead of guessing or relocating.

Before behaviour was changed, commit `780a593` captured version-2 continuation from
`1a13408`: save/load at tick 2400, continue to 4800, compare compact/deep hashes and plain counts.
The earlier version-1 continuation and historical goldens also remain unchanged.
These are bounded compatibility checks, not proof for every possible world.

## Visible behaviour

The person inspector names the occupied building. A home's inspector lists the occupants and
their activities; clickable occupant chips select each person. Roof markers identify indoor
presence, with sleeping indicators and the selected person's name. Occupants are not rendered or
picked as invisible outdoor bodies. Following/locating still uses the home's entrance anchor.

One ordinary unmodified Normal-profile run, seed `river`, arrivals off:

- Started with zero enclosed homes; four existed by tick 7200.
- Mira (1105) finished hut 2827 at tick 3349.
- Emre (1106) entered it to sleep at tick 3516.
- Across 7200 ticks: 28 entries, 26 exits, 11132 occupant-ticks indoors; 28 people alive.
- Full serialized state was identical after save/load.

This demonstrates autonomous use of newly built homes. It does not promise that every household
will build, or establish a survival benefit.

The lab intervention `no-home-entry` prevents new admissions without changing versions or
restoring radius protection. Existing occupants retain shelter until they leave. The switch is
reset by the runner; it is not saved. The same short seed with entry disabled recorded zero
entries and zero indoor ticks. This is an admission-mechanism check, not an estimate of welfare
effect, and it does not isolate all consequences of changing the shelter model.

## Verification

- `npm run typecheck`: passed.
- `npm test`: 818 tests in 81 files passed, including 24 habitation contract tests.
- `npm run build`: passed.
- `npx vite-node scripts/golden.ts`: all historical fingerprints match, not re-recorded.
- Version-1 and version-2 continuation tests: passed in the full suite.
- `node scripts/browser/habitation_check.mjs http://127.0.0.1:5186/ habitation_evidence/final`:
  10/10, including autonomous entry, a staged entry/sleep/save/load/exit sequence, actual displayed
  occupancy, occupant-chip selection and indoor-versus-outdoor protection.
- Existing current-world browser check: 15/15.
- Preparation browser check: 19/19 on current rules. It now follows the current-version constant
  and selects an ended plan actually displayed by the card, verifying its exact recorded reason.
- `npx vite-node scripts/habitation_smoke.ts` and `--no-entry`: the short observations above.

Headless Chrome was used. The final screenshots were also visually inspected: the hut's occupant
list and selected person's indoor status are visible, with no person sleeping beside its wall.
This is not a broad usability assessment.

A browser attempt made while the development server was hot-reloading reported “unknown activity”
on the exit step. Its report remains in `habitation_evidence/report.json`. A fresh server and fresh
browser passed the unchanged contract; final evidence is under `habitation_evidence/final/`.
The first full suite exposed a test pinning CURRENT_RULES_VERSION to 2; its current-generation
assertions now follow the version owner, while the new version-2 reference separately pins history.

## Review and integration

Self-review found and fixed the wolf's between-check bite, missing-home interruption, same-space
validation before direct activity handlers, and protection leaking from a neighbouring building.
Tests cover blocked doors, death, newborns, ownership changes, upgrades, invalid saves, urgent
interruption, real entry and exit, perception, actual wolf retreat, and built-home use.
This is not independent review or merge approval.

The original checkout's wolf work was not edited. Household PR #18 is a dependency, and its
acceptance/gate decisions are not resolved by this branch. No expensive ensemble was launched,
no acceptance baseline was replaced, and no merge was performed.

Commands from this checkout:

```powershell
Set-Location -LiteralPath 'C:\Users\RJLoc\.codex\worktrees\home-habitation\living-world'
npm run dev -- --host 127.0.0.1 --port 5186 --strictPort
```

Use a fresh current world to see habitation. Existing saved worlds correctly retain their older rules.
