# Promised supply is not fetched twice — rules 101

Delivered 31 October 2026 on `main` after rules 100 (`62e7268`, reference `116ad79`). Programme rows A4 (useful waits:
"a promised delivery may justify a bounded wait") and A9 (duplicate trips) of
[DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). Owner: `src/sim/promised_supply.ts`; lab removal
`rich-no-promised-supply`; rules 100 and earlier keep their recorded behaviour and references.

## What existed and what was missing

Since rules 82 the asker remembers a heard agreement (`promise_expectations.ts`): who promised what, for which site or
plan, and the hour spoken for it; rules 85 lets the helper negotiate one delay. That memory already stopped the asker
asking twice (`options_social.ts`, "what other people have already promised to bring is not asked for again") and kept a
tool plan honest about what it was waiting on. It changed nothing about fetching: `materialNeeds` counted the site's
whole remembered shortfall, `shelterWanted` planned the whole of it, and the tool step said in its own comment "they may
still fetch it themselves". So a person promised three wood for their site set off for the tree all the same, and the
promise arrived to a site that no longer wanted it.

## Contract (rules 101)

- **Only the asker's own memory is read.** `promisedSupply` sums the live expectations the person personally heard for
  that material and that site (status still `promised`: not past the spoken hour, the helper not known dead, not ended by
  an observed completion or a heard report), less what they have already received. Unanswered asks are not coverage.
- **Site fetching is reduced by what is promised.** In `materialNeeds` the remembered site need is reduced by the covered
  amount, and the fetch that is not made is named among the things set aside: "Ben promised 3 wood, expected by tick N".
  The person remains free for every other need; a shortfall beyond the promise is still fetched.
- **A home-site plan leaves the promised material out** and takes the next missing one, or is not adopted while every
  shortfall is covered (`shelter.ts`).
- **Coverage ends by the asker's own knowledge:** the spoken hour passes (rules 82 timeout, cause unknown), a hand-over
  they experience, a report they hear, or a death they witness or are told. Then the fetch is offered exactly as before.
- Nothing new is saved or hashed; no helper state is read; conservation is untouched.

## Evidence

Focused contracts (`tests/promised_supply.test.ts`, 6): a real site ask answered by a real haul promise (rules 11: the
asker's hands are full, the carrier promises to bring it to the site), the fetch absent and the waiting named in the
inhabitant observation, observation purity and exact reload; rules 100 and the ablation offer the same fetch while
promised; the spoken hour passing and a witnessed death restore the fetch; the helper physically delivers three wood while
the asker never starts a wood trip, the request is fulfilled, the twin continuation is exact and resources balance; the
home-site plan takes stone at 101 and wood at 100, and is not adopted when everything is covered. Affected existing files
pass **183 tests / 11 files**.

Rendered (`scripts/browser/promised_supply_check.mjs`, **6/6**, `autonomy_evidence/promised101-rendered`,
screenshots inspected): Ada's panel names the promised wood as the reason no wood trip is offered; Ben walks the wood to
the site; the site panel shows it delivered; the saved continuation is exact. Staged fixture and offered-ask selection;
everything after the ask is autonomous.

Ordinary river screen (`scripts/promised_supply_observe.ts river … 5 300`, rules 101 and pinned 100, reports committed,
final saves local): five days / 12,000 ticks each (90.61 s at 101, 91.24 s at 100), 2,800 samples, 100 purity checks, exact twins, conserved, no deaths. At **101**: 286 sampled site asks offered, 25 site material requests spoken of which 10 promised, 3 fulfilled, 7 cancelled, 15 declined; 126 samples of a live site promise; **72 samples where a fetch was set aside for a promise**; **zero** gathering or withdrawing starts for a material still under a live promise. At pinned **100**: 300 offered, 22 spoken, 9 promised, 2 fulfilled, 7 cancelled, 13 declined; 154 live-promise samples; no set-asides (no mechanism); also **zero** such starts. So in five river days the duplicate trip the slice prevents did not actually occur at either version: the staged scene is the only direct evidence of an avoided trip, and the set-aside samples show the mechanism acting without an observed trip saved. The two worlds diverge after the first set-aside, so the counts are one seed's paired contrast, not an ensemble claim.

## Limits and what remains

- A promise to a site is not marked received when the helper delivers while the asker is away: the asker's coverage then
  lasts until the spoken hour (at most a day and the rules-85 delay) and they may under-fetch a later shortfall by the
  promised amount for that long. That is what they know; it is recorded here as a bounded limit, not hidden.
- Tool plans keep their rules-80 behaviour (the step names the promise, the person may still fetch); water, food and
  care promises are outside this slice. Counteroffers, ability and location questions (A8) remain absent.
- No aggregate benefit, fewer-trips or survival claim is made; ordinary frequency is whatever the screens show.
- Fixture note (found while recording rules 103): the staged scene's far rock sits on the map boundary (80,12). A saved
  attempt to walk to it fails save validation, which none of the recorded rules-101 paths reach; the recorded reference
  is kept as it is, and later scenes pass an in-bounds rock through the fixture's `rockAt` argument.
