# Relocation extensions: the consenting part of a household, succession, return and search (rules version 54)

Delivered 2026-10-29 on `main` after rules 53 (`557f647`). Workstream 12 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md); the first form is [RELOCATION.md](RELOCATION.md) (rules 20).

## What stood before, and why it never fired

Rules 20 moves a household as one body: the proposal must be heard by every member together, any refusal ends it, the
departure, the arrival and the founding each need every member in contact with the organiser, and a dead organiser is
succeeded by nobody. The diagnosis (`scripts/relocation_observe.ts`, three Normal seeds, 45 days, rules 53) found the chain
stopped at its first link: sustained hardship with a remembered destination occurred in 329 adult samples across the three
seeds, the whole household was in contact outdoors in 68 of them, and the one proposal attempted (river) failed with "the
household must hear the proposal together". No agreement was ever formed, so consent, journey, succession, return and
rescue had no denominator at all.

## Contract

Gated on `hasRelocation(w)` (rich, rules 20) and `runsRulesVersion(w, 54)`; lab switch `rich-no-relocation-extensions`
keeps the rules-20 whole-household form at rules 54 and changes nothing below it. Owner: `src/sim/relocation.ts`. New
saved state on the agreement record: the response `stays`, the phases `returning` and `returned`, `successions`,
`rescues` (at most 8) and `newHouseholdId`; all hashed, and refused on load in a world below rules 54. The rules-53 full
serialized continuation (`tests/v53_continuation.expected.json`) was recorded from `953eb90` before any of it.

### Subgroup consent

- **Hearing.** A proposal needs the organiser and one other member in contact (a household of one proposes alone). The
  members present are asked one at a time, in contact, as before; the absent are asked when met. The option's label says
  "to those here".
- **Refusal.** A refusal is recorded and the agreement goes on; the refuser is a stayer. A child whose parent in the
  household refused or stays stays with them ("stays with Ben"); any other child travels as a dependant of the accepted
  adults, with the rules-20 waiting rules (adults wait for dependants, dependants only walk with an accepted adult in
  sight). A member still unasked a day after the proposal is recorded as staying when the organiser prepares the journey;
  before that the organiser is blocked ("Ben has not yet been asked").
- **Travellers.** The accepted adults and their dependants, alive. They, not the household, must be assembled to prepare,
  depart, arrive and found; provisions are two food and two water per traveller; a traveller who turns unfit at departure
  stays, and the departure goes on if the rest are still assembled and supplied, otherwise it must be agreed again.
- **Founding with stayers.** When the travellers found a home and living members stayed behind, the travellers form a new
  household by the ordinary household creation (a new name, the organiser its head), which owns the new shelter and is the
  township's founding household; the old household keeps its name, home, store and stayers. The record names the new
  household and lists who stayed. Nothing is moved or reassigned without consent, and the ledger is untouched.

### Succession

An accepted adult traveller may take over the journey when the organiser has died and the traveller knows it (rules 14:
witnessed, told, or read at the grave; the world tells nobody) or when the organiser has left the household. The record
keeps who took over from whom, when and why; a departed organiser becomes a stayer. The dead are no longer waited for:
the travellers are the living.

### Return

When arrival reveals no usable water or fresh food, and the old home still stands in the household's hands, the agreement
turns to `returning` instead of failing: the travellers walk back ("Return to the old home"), and the organiser declares
it `returned` with them assembled there. The outcome, the day's retry cooldown and the deadline (after which the overdue
journey is ended as before) apply. Without an old home the arrival fails as at rules 20.

### Search

While travelling or building, the organiser may look for a traveller who is out of contact and out of sight for
`RESCUE_AFTER` (half a day) at the place the organiser last saw them, their own `whereabouts` (what perception records),
if that is within `RESCUE_WINDOW` (two days). The walk heads for that place and re-aims only when the person comes into
sight. Finding them is recorded; finding nobody is recorded and the stale whereabouts forgotten. Without a known place the
organiser is blocked ("does not know where Ben is"). Nobody is moved.

## Tests

`tests/relocation_extensions.test.ts` (6): heard by two of three with one away; the absent one cannot be asked until in
contact; refusal keeps the agreement and the refuser's child stays with him; the organiser alone packs for herself,
departs, walks, arrives, lays out, hauls, gathers, builds and founds; the new household owns the new shelter and founds the
township, the old keeps the home, the two stayers and its township, conservation holds and the household history is pure
to read. A member not found within a day stays; one who withdraws at departure stays and the rest go. A traveller who
witnessed the organiser's death takes the journey over and arrives alone. An unsuitable arrival turns one traveller back
and she returns, with the outcome and cooldown. The organiser looks for a traveller where last seen, finds him, later
finds nobody and forgets the place, and is blocked without one. Switch and rules 53 end on refusal as rules 20 did; exact
replay through succession; observer purity; hash coverage; a rules-53 save carrying extension state is refused.
`tests/relocation.test.ts` (14) is unchanged and passes at rules 20. `tests/v53_continuation.test.ts` pins rules 53.

## Ordinary worlds and the lab

Three 45-day seeds at rules 54 (`relocation_evidence/obs-45-{seed}-r54`) and the 8-seed lab against the switch
(`relocation_evidence/lab-extensions`): results in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md. No benefit is claimed.

## Limits

- The proposal still needs an adult in sustained hardship who remembers water and food at a distance; the extension changes
  who must be present to hear it, not the cue.
- A search is one walk to one remembered place; there is no tracking, no asking others where the missing went.
- A stayer's household and the travellers' new household keep no relation record of the split beyond the agreement.
- No aggregate claim.
