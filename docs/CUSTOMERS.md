# Customers: supplying what was asked for, and what came back (rules version 51)

Delivered 2026-10-29 on `main` after rules 50 (`7c70fb0`). Workstream 9 (first slice) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md).

## What the ordinary worlds showed first

The 45-day chain audits at rules 50 (`chain_evidence/audit-45-*-r50`, three seeds, Normal, immigration off) and the final
saves:

| seed | townships | trade leads heard | exchange journeys | people with heard demand | trades taken because people asked | swap events in 45 days |
|---|---:|---:|---:|---:|---:|---:|
| meadow | 1 | 0 | 0 | 5 of 31 | 0 of 21 | 0 |
| river | 1 | 0 | 0 | 5 of 23 | 0 of 16 | 0 |
| forest | 1 | 0 | 0 | 1 of 8 | 0 of 6 | 0 |

Three findings, each structural:

1. **Inter-settlement exchange cannot happen in an ordinary world.** The Normal profile founds one camp and one township
   (`profiles.ts layoutFor` has no entry for it; `worldgen.ts` founds membership at the one camp), and a trade lead is told
   only across townships (`exchange_journeys.ts tellTradeLead`). The rules-22 chain is reachable only in the Large profile
   (2 × 2 camps) or after a rules-20 relocation founds a second township. Its zero in every Normal observation is a
   denominator of zero, not a failure of the mechanism; it is left to a Large-profile observation (see Limits).
2. **Heard demand went nowhere.** Rules 43 lets a person remember being asked for a material (3 days, two different askers
   per material) and take up the trade that makes it. In 45 days nobody's trade read "people asked me": two different askers
   for one material inside three days is rare, and when the demand was heard the ask itself was a one-off that somebody
   else answered or that lapsed; the maker's later surplus had no path back to the person who had asked, and nothing ever
   told the maker whether the work had been worth it.
3. **The local swap never fired.** `optTrade` wants only fish-when-short or an own-site's wood or stone, from someone seen
   carrying it; with the rules-50 chains wanting planks, bricks and clay this never matched. No swap event in 135 seed-days.

## Contract

Gated on `runsRulesVersion(world, 51)` and rich dynamics; the rules-50 full serialized continuation
(`tests/v50_continuation.expected.json`) was recorded from `7c70fb0` before any of it. One lab switch, `rich-no-customers`
(no lead written, no supply offered, the trade review reads no return; asks, barter, gifts and favours unchanged). Owner:
`src/sim/customers.ts`. New saved state: `Person.customers` (at most 8 records; hashed, validated on load).

**A customer lead.** When a person is asked in person for wood, stone or a workshop good and the ordinary evaluation turns
the ask down because they had none to spare (`no_item`, `making`, `committed`, or `own_need` while holding the thing with
none of it spare because their own site or reserve has it: they would have supplied, they could not), the asker is
remembered as a customer for that material for six days, with the request itself (what and how much). A refusal by choice
(`unwilling`, `disliked`, `own_need` with goods to spare) is demand turned away, not unmet, and leaves nothing. The first
ordinary runs showed "my own needs come first" over held, spoken-for goods to be the commonest refusal of all (13 of 33),
which is why it counts. A lead from a person supplied before is a repeat customer. Rules 43's own memory and trade choice
are untouched.

**The local swap, left as it was, with its failure recorded.** The same first runs showed 132 swaps proposed and every one
refused: 86 "nothing to spare" (the other carried one or two and kept them) and 46 "no room to carry the swap" (two or
three units of wood on top of a full pack). Proposing the swap only to somebody seen carrying more than one of the thing,
one for one, was tried in this slice: 155 of 155 were still refused (the keeper keeps two when hungry; the asker's own
pack was full), and the 8-seed lab with that rule in showed fewer projects adopted and done with the slice on (adopted
+7.9 without it, 8 of 8 seeds; done +7.1, 7 of 8; `customers_evidence/lab-customers-swaprule`), the likeliest cause being
the hundreds of failed swap conversations that still carried news of sites and sources between people. The rule was
taken out again; the swap (`options_social.ts optTrade`) is exactly as before 51, and its 100 % refusal rate is an open
finding for a later slice that would need the asker to read room and spare before asking, as the material ask does.

**Supplying it.** While a lead is live and the person now holds a spare unit of that material (`surplusOf`: nothing a
promise, plan, own site or reserve has spoken for), they may take it to the asker:

- a **swap** through the existing barter conversation when the asker is seen carrying something the supplier lacks and
  values more, two for one at most as at the market; the asker judges it by their own valuation and refuses what their pack
  cannot carry, exactly as before;
- a **gift** through the existing offer conversation otherwise, which leaves the ordinary favour debt;
- a **walk** to where the asker was last known (the rules-45 seek visit, priced like the other social trips, within 30
  tiles) when they are out of sight, after which the supply is proposed again if they are there;
- a **haul to the asker's own household site** by the ordinary site delivery counts too: the ask was for that site.

Every option names a conversation or trip the planner already had; none moves goods. Each lead is supplied once.

**What came back.** The supplied lead records the units and the return: the swap goods, "a favour owed", or "to their site,
nothing back". The original request, if still open, closes with `delivered` set to what moved and a note that it came
later; a request already declined or answered stays as it was (the goods still changed hands). The trade review
(`trade.ts reviewTrade`) reads the supplier's own record and nothing else: a customer supplied in the window adds
`SERVED_BONUS` (4) to the skill that makes the goods, so the trade is held a little more firmly and may be taken up as
"people I supplied came back for more"; a trade taken up because people asked, whose leads then all lapsed unsupplied
(two or more, none served), is reviewed again instead of kept on a demand that went nowhere. Lapsed leads are kept one
window as that record, then dropped.

Nothing else changed: who may ask, the barter valuation, the offer, the favour debt, the reserves, the trade's other
triggers, the rules-43 demand window and bonus.

## Tests

`tests/customers.test.ts` (7 staged contracts, Ada / Ben / Cora, Ben's four planks all promised to Cora's site): an ask
turned down as committed leaves a lead at 51 and none at 50, a refusal by choice leaves none, and no supply is offered while
the planks are spoken for; the promise moot, Ben brings Ada the planks as a gift, the record says a favour is owed, the
declined ask is left as it was and the ledger is conserved; Ada carrying fish, the supply is a swap of two planks for one
fish through the barter, recorded as the return; a supplied customer gives the carpentry trade its bonus and a demand-taken
trade whose two leads lapsed is given up; an out-of-sight customer is walked to and supplied, by hand or (when a rules-50
batch plan for her site had spoken for the planks) by the haul to her site; a haul to the customer's own site supplies the
lead with the site named; switch, exact replay, observer purity, hash coverage, and rules 50 unchanged.
`tests/v50_continuation.test.ts` pins rules 50.

## Ordinary worlds and the lab

Three 45-day seeds (`customers_evidence/obs-45-{seed}`, `scripts/customers_observe.ts`): 57 material asks, 33 refused, 28
of them for want of spare goods rather than by choice; 9 leads written (wood 7, planks 2) and 2 more that lapsed; 2 leads
supplied, both by one man hauling planks to the sites of the two who had asked him; nothing into a hand, nothing swapped,
nothing back, no trade reading the record. The first two links fire in an ordinary world; the return link exists and has
not fired there. The 8-seed lab against `rich-no-customers` (`customers_evidence/lab-customers/report.txt`): nothing beyond
the noise floor; projects adopted lean lower with the slice on in 7 of 8 seeds (+7.2 without it, [−1.1, +14.3]), noted as a
lead to watch. The full table is in the slice log of DEPENDENCY_CHAIN_PROGRAMME.md. No benefit is claimed.

## Limits

- Leads come from declined asks only. A promise that later lapsed (set aside, expired) is not turned into a lead here; it is
  the commitment's own record. A later slice may add it if the ordinary rows show it matters.
- Inter-settlement exchange (rules 22) is untouched and unobserved in Normal worlds, where it cannot occur; a Large-profile
  observation is the next step of workstream 9, not this slice.
- The return of a gift is a favour debt, which the existing ask already reads; no price, currency or account is kept.
- No aggregate claim.
