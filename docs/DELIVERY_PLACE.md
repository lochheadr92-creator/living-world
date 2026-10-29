# An agreed place to leave it, and a remembered outcome (rules version 48)

Delivered 2026-10-29 on `main` after rules 47 (`2a05b30`). Workstream 5 of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## The situation this completes

> Someone short of food asks a neighbour. The neighbour promises to bring some and says where they will leave it if the
> asker is not about. They fetch it; the asker has gone gathering; the neighbour leaves it at the asker's door. The
> asker comes home and eats it. Next time, the asker turns first to the neighbour who came through.

## What was there, and what was missing

Promises to a person (`deliver` commitments) were kept one way only: find the person and hand it over
(`options_work.ts optCommitments`, the `give` handler). A helper who arrived where the asker was last seen found nobody,
forgot the stale whereabouts (`whereIs` then falls back to "at their home") and tried again; a hand-over at the home
also fails if the asker is out. In the rules-45 river run the one visible example lapsed as "Thea had no room in their
pack for it", and expired promises (`expired` / `interrupted` / `broken`) ran at 12-18 per seed per 30 days. Trust was
raised by a kept promise (`social.ts fulfillCommitment`, +6) and lowered by a broken one (−12), and rules 39 used trust
to choose among helpers for a tool plan's material, but a hungry person's choice of whom to ask for food did not read it:
candidates were scored by plausibility, kinship, affinity and the walk, with trust only deciding whether the ask was
worth making at all.

## Contract

Gated on `runsRulesVersion(world, 48)` and rich dynamics; the rules-47 full serialized continuation
(`tests/v47_continuation.expected.json`) was recorded from `2a05b30` before any of it. Lab switch
`rich-no-delivery-place`. Owner: `src/sim/delivery_place.ts`.

1. **The place is named when the promise is made.** For a promise to a person (not to a site), if the helper knows the
   asker's household home (their own belief about a home-type building of that household: `agreedPlace`), the
   commitment records it (`destKind: 'building'`, `destId`), `c.to` stays the person, and the request note says
   "…will bring 2 fish (or leave it at Ada's hut)". A helper who does not know the asker's home promises as before.
   Nothing tracks anyone; the asker's own home is a place both can name, and nobody is promised that anyone will wait.
2. **Keeping it.** Beside the ordinary hand-over, the helper may leave the promised goods at that home (an ordinary
   `deposit`, "Leave fish at Ada's hut as promised"); the walk decides which is nearer. A deposit under a promise credits
   `Commitment.delivered` and `Request.delivered` with exactly what moved, fulfils the commitment when the amount is
   reached (same `fulfillCommitment`, same trust and relationship consequences, same `promise kept` note), writes a log
   line on both sides, and credits nothing to a reserve plan or a site. No room at the store is a recorded obstacle on
   the commitment, as a full pack is for a hand-over. Expiry, interruption, refusal, death and cancellation are unchanged.
3. **Eating it.** The asker's household eats from its own store as before (`eat_store`, "Eat from the home store").
4. **The remembered outcome leans the next ask.** In the food/water ask, trust adds at most ±4 to a candidate's score
   (`askTrustBonus`: 0.08 per point of trust above or below the neutral 10, named "they came through before" or "they
   let me down before"). A kept promise (+6 trust) is worth about half a point; a broken one (−12) about one; it takes
   several outcomes to move a choice decisively. Plausibility, kinship, affinity and the walk still weigh as before.

No new state, no save-format change: `Commitment.destKind/destId` existed, `Activity.data` is already serialized.

## Tests

`tests/delivery_place.test.ts` (4 staged contracts): the place is named at 48 and not at 47; the asker away, the fish
are left at her door, credited once, the promise fulfilled with "promise kept", the store holds exactly the credited
amount, and she eats from her own store; the trust lean names its reason, orders two otherwise equal neighbours, is
bounded at ±4 and absent below 48; the switch, exact save/replay and observer purity. `tests/food_help.test.ts` still
proves the hand-over path. `tests/v47_continuation.test.ts` pins rules 47.

## Ordinary worlds and the lab

`scripts/food_help_observe.ts` now also counts promises that name a place, deliveries left at a door, and sampled food
asks whose score names trust. In three 30-day Normal worlds the place was named on 52 / 40 / 12 promises, goods were
left at a door 7 / 1 / 0 times (most promises are kept in person, which the walk prefers), and 901-1258 of 1211-1755
sampled food asks carried a trust term. The 8-seed lab (`food_help_evidence/lab-place`, control + nudge +
`rich-no-delivery-place`) found nothing beyond chance either way (deaths +0.5 [−0.9, +2.1] for the ablation). Table and
rows: the slice log of DEPENDENCY_CHAIN_PROGRAMME.md.

## Limits

- Only food, water and personal goods promised to a person; site hauls already had a place. Only the asker's household
  home can be named; a public store is not, because what is left there is not the asker's.
- The repeated loop (help → remembered outcome → changed choice → second delivery) is proven staged, with the trust set
  as a kept promise sets it; ordinary occurrence of the full loop in one person's record is counted, not guaranteed.
- No aggregate claim.
