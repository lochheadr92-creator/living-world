# Survival capabilities

**Current checkpoint (9 November 2026): rules 173, product save format 5.** A dependant in sight is judged from the signs a bystander can see, not from their live hunger, thirst and warmth (`src/sim/seen_dependant.ts`, `knownNeeds` in `remembered_need.ts`). Starving is read as 19, hungry as 41, parched as 19, thirsty as 39, and cold as warmth 34. That can blunt urgency: a child who is not marked hungry is read as 100. Out of sight stays rules 106. Rules 172 and earlier, authored worlds, and `setSeenDependant(false)` keep the live figures. Contract tests `tests/seen_dependant.test.ts` (5), plus `tests/remembered_need.test.ts` (3) and `tests/visible_need.test.ts` (6). At 173 a starving cold sight stays hunger 19, thirst 39 and warmth 34 when the live figures change; with no sight record the carer does not fall back to the live needs. `npm run typecheck` passed on a clean checkout of `05d22ddf`. Immutable pin `tests/v173_continuation.*` (Normal birch, arrivals on, 2,400 ticks then 120 after a save and load; a carer judges a household dependant in sight from signs rather than live needs, first seen at tick 1, sampled every 50 ticks), recorded from a clean checkout of `05d22ddf`; the pin test passed there, 1 of 1 in 10.0s. Forest, meadow, river, aspen and cedar also differ at tick 1. The paired lab is not run. No benefit or harm is claimed. Evidence: `docs/SEEN_DEPENDANT.md`.

**Rules 172 checkpoint (9 November 2026), product save format 5.** The recruit cap counts the asker's own help on that site plus distinct help they still remember as promised (`src/sim/heard_helpers.ts`, used by `optRecruit` in `options_social.ts`). It does not walk every living person's true commitment. Accepting a recruit still uses that true count. Rules 171 and earlier, authored worlds, and `setHeardHelpers(false)` keep the global count. Contract tests `tests/heard_helpers.test.ts` (7). Two other people truly committed block the ask at 171 and do not block it at 172; two remembered promises fill the cap at 172 and do not at 171. `npm run typecheck` passed with this rule in the tree. Immutable pin `tests/v172_continuation.*` (Normal aspen, arrivals on, 8,000 ticks then 120 after a save and load; the heard count and the live helper count sit on opposite sides of the cap, first seen at tick 3,001, sampled every 50 ticks), recorded from a clean checkout of `aa01408d`; the pin test passed there, 1 of 1 in 17.2s. Birch, forest, meadow, river and cedar did not differ inside 12,000 ticks. The paired lab is not run. No benefit or harm is claimed. Not done: `knownNeeds` for a dependant in sight. Evidence: `docs/HEARD_HELPERS.md`.

**Rules 171 checkpoint (9 November 2026), product save format 5.** Looking for someone at a home uses a room the searcher was told, or the searcher's own household when the person is their child, partner or parent (`src/sim/known_home.ts`, `whereIs` in `optutil.ts`). The target's live household id is not that knowledge. A believed building site is still used when the person is gone from the register. Rules 170 and earlier, authored worlds, and `setKnownHome(false)` keep the live household match. Contract tests `tests/known_home.test.ts` (6). At 170 a believed home stamped with the target's household is used; at 171 that stranger match is absent, a told room stays put when the household id changes, and a child is looked for at the searcher's own home. `npm run typecheck` passed with this rule in the tree. Immutable pin `tests/v171_continuation.*` (Normal forest, arrivals on, 12,000 ticks then 120 after a save and load; a searcher looks someone up at a told room that is not the home the target's live household id would select, first seen at tick 11,951, sampled every 50 ticks), recorded from a clean checkout of `93aeb5e9`; the pin test passed there, 1 of 1 in 17.8s. Birch, meadow, river, aspen and cedar still matched the live household inside 12,000 ticks. The paired lab is not run. No benefit or harm is claimed. Not done: the recruit cap, and `knownNeeds` for a dependant in sight. Evidence: `docs/KNOWN_HOME.md`.

**Rules 170 checkpoint (9 November 2026), product save format 5.** A worry about someone who is gone from the register, or marked not alive, stays until the worrier has learned the death or the worry itself is too old (`src/sim/known_worry.ts`, used by `welfare.ts`). Before 170 a missing person dropped the visit. Being on the deceased list is not that news. Sharing the worry uses the deceased name and the listener's own relation, not the missing person's household id. Starting the visit still finds them gone and does not teach the death. Rules 169 and earlier, authored worlds, and `setKnownWorry(false)` keep the drop. Contract tests `tests/known_worry.test.ts` (6). At 169 the concern and the visit are gone after the death; at 170 both stay, the label is `Bring bread to Ben`, and `knowsDeath` stays false; a learned death drops both; the worry is passed on without teaching the death. `npm run typecheck` passed. Immutable pin `tests/v170_continuation.*` (Normal birch, arrivals on, 32,000 ticks then 120 after a save and load; first death at tick 26,558; a worry still held about someone on the deceased list, by a person who has not learned that death, first seen at tick 30,433), recorded from a clean checkout of `1b59cebe`; the pin test passed there, 1 of 1 in 87.1s. Six seeds for 24,000 ticks had no deaths and no kept worry. Paired lab, clean checkout of `ba3c549f`, 9 November 2026: 12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`. Rules 169 pinned with `--rules 169` against current rules 170. Both arms finished 12 of 12 seeds, three arms each. Provenance head `ba3c549f`, `dirty` false, `modified` empty. Reports written 02:46:33 and 02:46:36; `scripts/lab_versions.ts` exited 0 at 02:47:13 and ends: nothing moved by more than a single draw moves it. Every listed metric differs by 0. The suite was not rerun. No benefit or harm is claimed. Evidence: `review_evidence/known-worry-20261109/`. Not done: `whereIs` household ids, the recruit cap, and `knownNeeds` for a dependant in sight. Evidence: `docs/KNOWN_WORRY.md`.

**Rules 169 checkpoint (9 November 2026), product save format 5.** A sight of a building store, a cart load or a pile remembers which kinds are there, and whether the container looked full, not the exact counts (`src/sim/seen_stock.ts`, used by `snapshotEntity`). Each present kind that is not a textile is remembered as one. When the true weight meets the cap, the lexicographically first of those kinds is raised until the remembered weight meets the cap. That stand-in is not the true split. A store of one kind filled exactly to the cap reproduces that count, because the cap and the unit weight determine it. Textile kinds stay at the counts that were there, because the clothing check requires the textile observation to be no larger than the remembered items. A pile has no weight cap; the glance uses 9999, so a heap is remembered as presence. Carcass parts and a gear pile's own record are unchanged. Facility operation counts and hearth fuel are not this rule. Live transfers still read the store. Rules 168 and earlier, authored worlds, and `setSeenStock(false)` keep the exact copy. Contract tests `tests/seen_stock.test.ts` (7). A partial hut of 8 grain and 3 wood is remembered as 1 and 1 at 169 and as 8 and 3 at 168; a cart of 4 wood and a pile of 5 fish become 1; a full store of 10 grain and 15 wood is remembered as full and not as that split; 40 grain stays 40; a garment count stays 3 beside grain remembered as 1. `tests/care_capacity.test.ts`, `tests/carcass.test.ts`, `tests/stored_water.test.ts` and `tests/wells.test.ts` passed in the same run. `npm run typecheck` passed. Immutable pin `tests/v169_continuation.*` (Normal birch, arrivals on, 12,000 ticks then 120 after a save and load; the saved world holds a belief of 1 for a kind the container really holds more of), recorded from a clean checkout of `f347ca5f`; the pin test passed there, 1 of 1 in 20.1s. Paired lab, clean checkout of `c9949b86`, 9 November 2026: 12 seeds (aspen, birch, cedar, fern, gen-1 through gen-6, meadow, river), Normal, fork 0, 25 days, arrivals on, control plus `nudge:1` and `nudge:2`. Rules 168 pinned with `--rules 168` against current rules 169. Both arms finished 12 of 12 seeds, three arms each. Provenance head `c9949b86`, `dirty` false, `modified` empty. Reports written 02:17:51 and 02:18:06; `scripts/lab_versions.ts` exited 0 at 02:21:35 and ends: nothing moved by more than a single draw moves it. Eight prep and bite rows are systematic and stay inside the noise floor. The suite was not rerun. No benefit or harm is claimed. Evidence: `review_evidence/seen-stock-20261109/`. Not done: a worry about a dead subject, `whereIs` household ids, the recruit cap, and `knownNeeds` for a dependant in sight. Evidence: `docs/SEEN_STOCK.md`.

**Rules 168 checkpoint (9 November 2026), product save format 5.** Decision D6(b), the handover half: in a rich world a laid-up adult asks a neighbour to watch a child only when that neighbour has a current sight of the child or a whereabouts note (`src/sim/known_handover.ts`, the ask in `options_social.ts`). Kin alone does not qualify. The inspector says the neighbour has not seen the child and has not been told where they are. Rules 167 and earlier, and authored worlds, keep the old ask. `setKnownHandover(false)` restores it. The fire ask is unchanged. Contract tests `tests/known_handover.test.ts` (7) and the responsibilities ask, which plants the neighbour's sight; `npm run typecheck` passed at `c4f31c15`. Immutable pin `tests/v168_continuation.*` (Normal birch, arrivals on, 12,000 ticks then 120 after a save and load; a probe sampling every 200 ticks generated a keep-an-eye option at tick 8,600), recorded from a clean checkout of `c4f31c15`; the pin test passed there, 1 of 1 in 16.5s. The same probe ran forest, birch, meadow, river, aspen and cedar for 72,000 ticks: no watch was requested, and every nearby adult at a watch moment had already seen the child, so those worlds do not exercise the refusal. The paired lab is recorded in `review_evidence/known-handover-20261109/`: 12 seeds, Normal, fork 0, 25 days, arrivals on, rules 167 pinned with `--rules 167` against rules 168, both arms from a clean checkout of `cd7334e4` (`dirty` false, `modified` empty). Every listed metric differs by 0. The version comparison ends: nothing moved by more than a single draw moves it. The suite was not rerun. No benefit or harm is claimed. Not done: the remaining free-file leaks (store contents at sight, a worry about a dead subject, `whereIs` household ids, and the recruit cap), each its own rules version. Evidence: `docs/KNOWN_HANDOVER.md`.

**Rules 167 checkpoint (8 November 2026), product save format 5.** Decision D6(b), the adoption half only: in a rich world `adoptOrphans` takes a carerless child only when a living adult has seen them or been told where they are (`src/sim/known_adoption.ts`); the distance is to that place, not the child's true coordinates; kin alone does not qualify; a youth still never takes a child; if nobody qualifies the child stays and household history says nobody who has seen them or been told where they are has taken them in. Rules 166 and earlier, and authored worlds, keep the old scan. `setKnownAdoption(false)` restores it. Carer handover is a later rules version. Contract tests `tests/known_adoption.test.ts` (7) failed on the 167 behaviour before the module existed and pass after; the lifecycle orphan test plants a whereabouts note on one surviving adult. `tsc --noEmit` passed. Immutable pin `tests/v167_continuation.*` (Normal forest, arrivals on, 33,000 ticks then 120 after a save and load; a probe of the same checkout recorded the first adoption at tick 30,643), recorded from a clean checkout of `4be83435`; the pin test passed there, 1 of 1 in 48s. A one-seed forest probe at 25 days is not a measurement: both 166 and 167 recorded adoptions, and the alive counts differed (15 and 7). Full suite from a clean checkout of `4cdc01e9`: 521 of 526 files, 3,000 of 3,010 tests (3 skipped) in the parallel run. Five files failed: four were load or spawn timeouts and pass alone (10 of 10), and `zz_review_e_famine_trace` reads gitignored `autonomy_evidence/**/final.json`, which a clean checkout does not have. Paired lab (12 seeds, Normal, 25 days, control plus `nudge:1` and `nudge:2`, rules 166 pinned with `--rules 166` against 167): nothing moved by more than a single draw moves it. People +0.1 [-0.3, +0.5] against a floor of ±4.3; deaths -0.1 [-0.4, +0.2] against ±4.3. Mean mood +0.9 and mean condition +0.6 lean the same way on 4 of 4 draws and stay inside floors of ±10.0. No benefit or harm is claimed. Not done: carer handover, and the remaining omniscience leaks (five still in another session's uncommitted files; store contents at sight, a worry about a dead subject, `whereIs` household ids, and the recruit cap still need their own designs). Evidence: `docs/KNOWN_ADOPTION.md`, `review_evidence/known-adoption-20261108/`.

**Rules 166 checkpoint (7 November 2026), product save format 5.** Gap map G20 and review item 6 (omniscience leaks), second and third leaks, each re-verified against source first and each its own rules version. Rules 165 (`src/sim/fever_sign.ts`): perception adds `feverish` (severity 0.5) to the record of a person in view, and the cautious avoid what they saw, not the other person's live illness record (`candidates` in `options_social.ts`); gen-6 is the one of the twelve lab seeds with fevers at day 25 and its headline outcomes are identical at 164 and 165, so no changed decision is shown. Rules 166 (`src/sim/visible_need.ts`): perception adds `starving` (hunger under 20) and `parched` (thirst under 20), and a spontaneous offer of food or water takes the food, amount and urgency from the need those signs imply (just inside the sign, as rules 106 does) instead of the stranger's exact hunger and thirst (`optOffer`); care of an in-sight dependant (`knownNeeds`) is left as rules 106 decided. Paired lab (twelve seeds, Normal, 25 days, a control and two nudges per version, rules 165 pinned against 166, `scripts/lab_versions.ts`): nothing moved by more than a single draw moves it (deaths +0.9 [-0.6, +2.5] against a floor of 4.4; three metrics lean inside their floors); no benefit or harm is claimed. Contract tests `tests/fever_sign.test.ts` (5) and `tests/visible_need.test.ts` (6), each failing on behaviour against the previous commit; immutable pins `tests/v165_continuation.*` (gen-6, 49,500 ticks) and `tests/v166_continuation.*` (birch, 6,000 ticks); pins 93 and 161 to 164 unchanged. Full suite for the series 164 to 166 from a clean checkout of `776f34a5`: 520 of 524 files, 2,996 of 3,002 tests (3 skipped) in the parallel run; the four that failed are load timeouts (one is the 110-second rules-165 pin, whose limit is now 600 seconds) and pass alone. New tooling: `scripts/ab_probe.ts`, `ab_run.ps1`, `ab_compare.ts` (an identical-or-not twin on the lab's seeds; the saved state includes sighting records, so a new sign key shows as a difference) and `scripts/lab_versions.ts` (the lab's verdicts across two versions, the earlier pinned with `lab.mjs --rules N`, so no `lab.ts` registration is needed). Not done: the remaining omniscience leaks, five of them in `options_work.ts` and `shared_stone.ts` (another session's uncommitted files), and in free files exact store contents copied at sight (`knowledge.ts`), orphan adoption (owner decision D6b), a worry about a dead subject (`welfare.ts`) and `whereIs`'s household ids. Evidence: `review_evidence/fever-sign-20261107/`, `review_evidence/visible-need-20261107/`, `docs/FEVER_SIGN.md`, `docs/VISIBLE_NEED.md`.

**Rules 164 checkpoint (7 November 2026), product save format 5.** Adversarial-review item 6 (omniscience leaks), first leak, re-verified against source: `optPropose` offered "Ask Ben to move in together" only when Ben's own private relation toward the proposer was warm enough (`q.relations[p.id]`), and a roommate offer read the true home of his household even if never seen; changing only Ben's private regard changed Ada's options (`tests/zz_review_d_propose_truth.test.ts`, kept as recorded at rules 115). Rules 164 (`src/sim/proposal_belief.ts`, called from `options_social.ts`; module switch `setProposalBelief`): the proposer asks on their own affinity and trust (thresholds unchanged) and finds out by asking (`social.ts` already refuses from the other's own figure and sets a 2,400-tick cooldown), and a roommate offer needs a building of his household that she believes in. Ordinary worlds (four Normal seeds, then the twelve lab seeds, 25 days, arrivals on): the option is rarely offered (14 pairs in 5 of 12 seeds, 5 proposals made, 1 refused) and in every pair offered the other's private regard already met the old gate, so the final world is bit-identical at 163 and 164 in 12 of 12 seeds (final-state hash). No behavioural effect is measured and no benefit is claimed. Contract tests `tests/proposal_belief.test.ts` (8; 4 of the 6 that need no new module fail against the previous commit on behaviour); pins 93, 161, 162 and 163 unchanged; immutable rules-164 continuation `tests/v164_continuation.*` (birch, 18,000 ticks including a proposal, then 120 after a save and load). Full suite from a clean checkout: 516 of 520 files, 2,982 of 2,989 tests (3 skipped) in the parallel run; the four that failed (load timeouts) pass alone, 10 of 10. Not done: the paired lab, which needs a `rich-no-proposal-belief` branch registered in `scripts/lab/lab.ts` (another session's uncommitted file, so the registration awaits the owner's decision); the other item-6 leaks, five of which sit in `options_work.ts` and `shared_stone.ts`, also another session's uncommitted files. Evidence: `review_evidence/proposal-belief-20261107/README.md`, `docs/PROPOSAL_BELIEF.md`.

**Rules 163 checkpoint (7 November 2026), product save format 5.** Adversarial-review item 5, re-verified against source first: `dissolveHousehold` released a dissolved household's buildings, sites and plots but not its estate parcels (rules 93), and `pileAccessBlocker` admits only the stamped household, so when a household's last member died, or its last member (a child) was taken into another household, the parcel stayed locked to a household nobody belonged to and was never offered to anyone. Ordinary 14-day Normal worlds at rules 162 (four seeds, read-only probe): in the famine world econ-cc3 (22 of 28 die) 16 of 20 parcels were orphaned at day 14, holding 2 axes, the hoe, 5 baskets, a pick, 5 rods and a spear (15 tools) while the seven survivors held one tool between them; forest had one orphaned parcel (3 seeds); river and meadow had no deaths. Rules 163 (`src/sim/estate_release.ts`, called from `dissolveHousehold`; module switch `setEstateRelease`, lab removal `rich-no-estate-release`): a dissolving household's estate parcels pass to the household its last member joined (an adopted child, moving in with a partner or kin, a relocation split) and become shared property when the last member died; the parcel's tools change owner with it; a feed and chronicle line says so and the inspector names the new owner; people learn it when they next see the parcel. Same worlds at 163: econ-cc3 0 orphaned (9 shared, 11 passed to heirs, 8 releases), forest 0 (passed to the Sedge household with Silas); no released parcel was collected in the two to three days left in the window at either version (salvage is a low-weight option for a fed non-child who has seen the parcel). No benefit claim. Contract tests `tests/estate_release.test.ts` (6; all fail at `2c64a632`, pass at 163, each with a rules-162 contrast); pins 93, 161 and 162 unchanged; 47 of 50 related files pass under load and the three load-sensitive lab files pass alone. Immutable rules-163 continuation: `tests/v163_continuation.*` (econ-cc3, 27,120 ticks then 120 after a save and load). The lab branch and the relaxed `tests/shared_stone.test.ts` version assertion were committed as their own hunks beside another session's uncommitted edits in those two files, at the owner's prompting; the full suite and the 12-seed paired lab (`nudge:1,nudge:2,rich-no-estate-release`, Normal, 25 days) ran detached from a clean checkout of that commit. Suite: 513 of 518 files (2,972 of 2,980 tests, 3 skipped) in the parallel run; the five that failed (four load timeouts and a gitignored fixture absent from the checkout) pass alone, 12 of 12 tests. Lab: removing the release parts the world from the control in 9 of 12 seeds (median day 11.7) and nothing on people (-0.3), deaths (+0.6), hunger, mood, homes or tools is distinguishable from the noise floor (intervals include zero). No benefit claim. Not done: meal leftovers and tools lent out of a dissolved household are not released. Evidence: `review_evidence/estate-release-20261107/README.md`, `docs/ESTATE_RELEASE.md`.

**Rules 162 checkpoint (7 November 2026), product save format 5.** Owner request after a recurring stone shortage in a lived life: a storehouse should simply be built, stone should be storable and retrievable there, movable from the quarry, and encouraged into more building. Ordinary diagnosis (four 25-day worlds at rules 161, read-only probes): no stone entered any store; three of four worlds never laid out a storehouse (the offer reached 0.1-0.5% of decisions; the four-site open cap, a household's own open site and no solid home stop 80-90% of people first, the food-shortage and temperament gates only 10-18%), and quarry yards holding 5-18 cut stone while sites lacked 5-13 were never offered as a place to collect from (81-96% of the time a person who knew the yard, believed it held stone and might draw it was offered no collect option). Rules 162 (`src/sim/shared_stone.ts`, four parts, each with a lab removal; `rich-no-shared-stone` removes all and equals rules 161): the settlement's first storehouse is laid out without the household-food or temperament gate and outside the site caps; a quarry yard one may draw from is a place to collect stone for a site, promise or tool; the public store aims at 16 stone and a person with no stone need of their own carries cut stone to it; a store known to hold the stone a building costs adds a small pull to stone buildings. Stored goods stay free for anyone. Results: a storehouse is laid out on days 2.4-3.3 and finished on days 5.0-6.3 in all three worlds that had none; stone drawn from the public quarry 0/0/18 to 18/24/16; but the store itself still holds about 0 stone, because every awake, fed person already has a stone need of their own (stone is production-limited, not access-limited, so there is no surplus to store); 12-seed paired ensemble (control, two nudges, three removals; Normal, 25 days): nothing on people, deaths or hunger is distinguishable from the noise floor (all parts removed: 21.6 against 23.3 people, +2.0 deaths, intervals include zero), shared projects completed 0.1 against 0.9. No benefit claim. Not done: a motive to produce stone for the store (a reserve plan, more quarry work) and any new stone-using building type (with stone short, more would deepen the shortage). Suite 2,922/2,932 (7 failures in 5 files are load timeouts or parallel-run clashes and pass alone; every pinned continuation reference from rules 1 to 161 passes, so earlier rules are unchanged). Evidence: `review_evidence/stone-haul-20261106/README.md`, `docs/SHARED_STONE.md`.

**Rules 161 checkpoint (5 November 2026), product save format 5.** Brain priority findings, item 3 (interrupted useful work and repeated switching among depleted food sources): ordinary diagnosis in four 25-day worlds found that 61% of the review switches that ended a hunger gather with “something better came up” (1,270 of 2,074) were really a person's own target dropping out because they now believed it empty. Rules 161 names that ending “the place looked empty”; reason text only (the outcome stays interrupted; the same four worlds run side by side at 160 and 161 behave identically for 25 days, 2,008 endings renamed). Also measured, not repaired: the world is near famine and food beliefs are optimistic (a starving adult held 59 believed food sources against 12 real); individuals rarely go back to a place they found empty (5%), but others walk to it within 600 ticks 1,340 times and 41% of those find it empty too; other interrupted work (repair, build, deposit, craft) is mostly ordinary re-weighing and no defect rate is established. Suite 2,901/2,914 (load timeouts; the files pass alone, lab_defaults only when run alone); 25-day screens pass; rendered check on Milo, an elder. Elder comfort (Brain item 4) is diagnosed in seven ordinary worlds with 32 founding elders: no elder-specific gap beyond the deliberate frailty (carry 75%, slower recovery), isolation costs about the same at any age, no rules change (`review_evidence/elder-comfort-20261105/README.md`). Queued: stale food beliefs in a famine, resumption of interrupted work measured by progress, the jammed-pack custody design, a carer's remembered-need severity. Evidence: `review_evidence/interrupted-work-20261105/README.md`, `review_evidence/found-empty-20261105/README.md`.

**Rules 160 checkpoint (5 November 2026), product save format 5.** Brain priority findings, evidence-quality item: a loaded world's static spatial grid (sources, buildings, sites, plots, piles, graves) was rebuilt by kind, where a live world lists each cell in ascending id order. Rules 160 sorts each loaded cell by id so a loaded copy replays like the live world; below 160 a loaded world keeps its recorded order. Reproduced first: a frozen rules-153 A/B on the investigation's own driver (Large river) fails at tick 45,600 as before, and the same source with only that sort passes all 19 days (one world, one seed; the 30-day rules-159 river twin matched without it, so it is not every trajectory). Live behaviour is unchanged (three Normal 5-day worlds identical except the version label); a 30-day Large river twin matches exactly at 159 and at 160. No behavioural benefit claim. Suite 2,898/2,908 (load-only timeouts; those files plus the new test pass alone, 16/16). Next from the Brain priority list: repeated switching among depleted food sources and interrupted useful work, then elder comfort; open from 159: a carer's memory of a dependant loses severity, and the jammed pack needs a custody design. Evidence: `review_evidence/load-order-20261105/README.md`.

**Rules 159 checkpoint (5 November 2026), product save format 5.** Brain priority findings, item 2: Fenn reproduced at rules 153 (a child at hunger 0 for 2,700 ticks carrying two wood in a five-weight pack while his mother held food for him). The pack blocked her hand-over, eating it was held for dependants and the home deposit was 11-35 tiles out of the fallback's 8-tile reach. Rules 159: when a care or promise hand-over moves nothing because the recipient's pack has no room and they are hungry and hold no food, the carer feeds them by hand (a meal through the ledger, no pack change, at most three units); a not-hungry full pack keeps the rules-63 fallback. A staged fork just before her hand-over turns the failure into a meal and Fenn lives about 500 ticks longer; it does not save him (famine, empty store, jammed pack remain). Ordinary Large 30-day worlds: hungry no-food recipients with a no-room failure 5/7/5 at 158, none at 159. No benefit claim. Suite 2,896/2,904 (load timeouts; 14/14 pass alone); 25-day screens pass; rendered check on an ordinary aspen feeding. Open from this: a carer's memory of a dependant loses severity (starving is remembered as hungry); the jammed pack itself; the Large River exact-twin discrepancy (cause reproduced, one world: a frozen rules-153 A/B on the investigation's own driver fails at tick 45,600 as before, and the same source with only the loaded grid's cells sorted by id passes all 19 days, so a loaded world's grid being ordered by kind where a live one is in id order explains that mismatch; a 30-day Large river twin run at rules 159 matched without it, so it is not every trajectory; the repair is rules 160; `review_evidence/load-order-20261105/`). Evidence: `review_evidence/fenn-repro-20261105/README.md`.

**Rules 158 checkpoint (5 November 2026), product save format 5.** A hungry person gathering or asking for food now eats food already in their own pack when that scores higher than their current way of easing hunger ("food in my pack would ease my hunger sooner"); the carer's household keep, thirst, danger and meals under way keep precedence. Ordinary diagnosis: hungry people holding food were sampled gathering 209 times against eating 22 times (a child fished from hunger 8 to 0). 8-seed lab: removal moves nothing beyond noise; an explained repair, no benefit claim. Suite 2,886/2,897 (load-only timeouts, pass alone); 25-day screens pass; rendered check on Ben (river, tick 2,099). Next, from the Brain priority findings: reproduce Fenn (a child starving with two wood in a five-weight pack), and the Large River exact-twin discrepancy. Evidence: `review_evidence/hungry-gatherer-20261105/README.md`.

**Rules 157 checkpoint (5 November 2026), product save format 5.** Brain list row 2a item 2. Ordinary diagnosis: gifts did not fail; care hand-overs failed "no room" because the recipient, nearly always a child, was already carrying food; the full-pack memory then sent carers to leave food at home, which no recipient took. Rules 157: an empty hand-over says why (giver lacks / already holds food / no room); food is not brought to a dependant seen or recently found holding food (water still is); a real full pack keeps the rules-63 fallback. No capacity change. Four ordinary worlds: failed care hand-overs 81 to 22, pointless deposits 6 to 0; child hunger samples unchanged (below 25: 69 vs 73; below 10: 19 vs 18). Found while checking for harm and queued: a hungry gatherer keeps gathering past starvation while holding food. Evidence: `review_evidence/carry-recovery-20261105/README.md`.

**Rules 156 checkpoint (5 November 2026), product save format 5.** Brain list row 2a item 1: a child (under 12) is not offered, and cannot start or resume, wood or stone gathering ("too young to chop wood or break stone"); light food gathering, water, learning and play are unchanged. An audit found every later heavy kind already excluded children; youths are unchanged. Ordinary meadow: 6 child wood starts at 155, none at 156; the debug panel shows the reason for Mona (9) at tick 767. A latent rules-144 save defect, where a founder's pre-start water memory made the final account unloadable, is fixed load-side. Suite: 2,871 of 2,884 pass; the 10 failures are a missing ignored fixture and load timeouts, and all affected files pass alone. 25-day screens pass. Next: row 2a item 2 (care hand-overs to dependants already holding food). Evidence: `review_evidence/child-tasks-20261104/README.md`.

**Rules 155 checkpoint (4 November 2026), product save format 5.** P1.1 shows where hearsay came from; P1.2 (rules 154, narrowed by owner decision) weighs a told food place by the listener's own checks of its teller: 2-6x fewer trips on a caught-out teller's word, no measured change in total wasted trips or survival (an explained knowledge behaviour, not a benefit). Rules 155 ends a paused care acquisition through the common ending when its purpose ends. Verification: 2,878/2,879 tests pass; the one observer-purity timeout under load passes in isolation at the same time as on the predecessor. Next per the Brain implementation list: children's work by physical task, carrying recovery in exchanges, interrupted-project diagnosis, elder warmth/shelter/company. Evidence: `review_evidence/p12-narrow-20261104/README.md`.

**Rules 153 checkpoint (4 November 2026), product save format 5.** Rules 153 stops a full-pack loop of empty-handed net checks seen in the ordinary river screen (blocked until there is room; a zero-transfer check fails). Full suite 492 files / 2,869 tests pass; 25-day screens pass integrity, and river now has 2 successful checks and no empty-handed ones. The uncollected meadow trap is rational competition (no tuning). Rules 152 summary follows. Evidence: `survival_evidence/ordinary-acquisition-20261104/README.md`.

**Rules 152 checkpoint (4 November 2026), product save format 5.** Ordinary diagnosis found the first broken transition for traps, nets and sheep: rules-135 cellars outranked a lean-to household's hut, so ordinary worlds kept 1-6 huts and never planned a timber yard (0/9 at rules 148-151, against 25/25 at rules 121), leaving no fibre. A rules-pinned bisection isolates 134 to 135. Rules 152 lays out a cellar only after a proper home. Ordinary 25-day Normal arrivals-on forest/river/meadow screens now activate sheep acquisition and care (river: mating, pregnancy and an ordinary lamb birth), nets (meadow: one trap) and wool garments, with integrity passes. The body-origin preservation null was a staged dry-camp fixture: beside known water the same scene dries and eats two meat portions; no rules change. Full suite 490 files / 2,865 tests pass; typecheck/build pass. Preserved-meat and trap-meat ordinary meals, sustained flocks and benefit remain open; next is a zero-progress net check with a full pack. Evidence: `survival_evidence/ordinary-acquisition-20261104/README.md`.

**Historical checkpoint (4 November 2026): rules 151, product save format 5.** Three survival-chain repairs are implemented: bounded collection of one's processing preserved food and quantity-aware paid butchery (149), checked trap-catch recovery before reset (150), and known food-route comparison before sheep slaughter (151). Final local verification on THEWEAPON passes 488 files / 2,860 tests with unchanged source/config hashes; typecheck/build pass. Staged autonomous runs demonstrate eaten dried meat, attributable trap-meat meals and a lamb birth with exact continuation and conservation. All nine 25-day Normal arrivals-on screens (rules 148/149/151, forest/river/meadow) pass integrity checks but show no activation of those three target chains. Ordinary uptake, body-origin preserved-meat completion, sustainable flocks and aggregate benefit remain open. See the survival capability record and `survival_evidence/continuation-20261104/README.md`; follow the ordered dependency-chain programme. Earlier checkpoints remain historical.

**Historical resumption, 4 November 2026:** the owner asked to reconcile the roadmap and proceed sequentially. The current execution order is in [DEPENDENCY_CHAIN_PROGRAMME.md](DEPENDENCY_CHAIN_PROGRAMME.md). The stop/publication account below remains historical. The next survival slice is diagnosis of ordinary preserved-meat meals, followed by attributable trap-meat meals and final-source lamb birth; no new success or benefit is implied by resumption. `scripts/preservation_uptake_trace.ts` pins rules 132 and checks its original reference, so it cannot be silently reused as a current-rules acceptance run. Preserve that historical runner and preregister any current-source comparison separately.

## Resumed chain repairs — rules 149 implementation checkpoint, 4 November 2026

The owner's next instruction explicitly requests preserved-meat meals, trap-meat meals and lamb births in order, fixing demonstrated gaps. Fresh ordinary forest/river/meadow Normal arrivals-on screens run to day 25 on frozen rules 148; rules 149 uses the same declared three screens. These are opportunity/activation screens with exact unobserved twins, purity, conservation and save continuation, not an aggregate benefit comparison and not a continuation of the interrupted rules-121/131/132 cohorts.

Preservation diagnosis found two runtime gaps. A staged autonomous person reached their own nearly finished rendering batch, failed with "nothing to take", then left the rack. Separately, the supply path discarded a recipe's two-portion meat request and offered only one paid portion. Rules 149 adds at most 240 ticks of on-site waiting for the collector's own processing preservation batch, without advancing it; available goods can still be collected immediately, rain can exhaust the wait, and urgent needs may interrupt. The wait counter is saved and validated. Ingredient butchery retains the requested quantity, capped by known parts and pack capacity, and pays 120 work per portion with ownership/capacity/expiry rechecked each time. Partial output stays physical and interruption never grants uncut meat. Older rules retain both prior behaviors. No survival score, need, yield, spoilage or food-reservation constant was changed.

Failed-before logs reproduce three assertions for each repair. Final targeted verification passes 95 tests in eight files, including immutable 148/149 continuations; typecheck/build pass. The existing carcass supply test now requests the required total portions rather than assuming one portion per selected activity, and still asserts the same real meal and conservation. Four rendered checks pass and both waiting/collected screenshots were inspected. The first rendered assertion queried a hidden building panel; its failure is retained and the corrected check reads the visible page. Explicit staged shelf/carried-meat worlds autonomously make and eat two dried-meat portions. The body-origin staged scenario still diverts into other needs; this is retained as a null, not called complete ordinary uptake. Evidence is under `survival_evidence/continuation-20261104/`; full-suite and ordinary results were pending at this historical implementation checkpoint; final results are above.

## Resumed lamb chain — rules 151 implementation checkpoint

The unchanged staged opportunity reproduces a pregnancy followed by slaughter of both parents despite nearby known grain, including the second killing before the first body was recovered. Rules 151 compares already generated, actor-known food routes at the time of their first meal against travel plus slaughter plus paid butchery. A no-slower known meal defers slaughter; missing, depleted or distant alternatives still permit it. The comparison does not inspect remote stock or change animal biology, food demand, scores or yields. Three failed-before assertions now pass. The same finite setup autonomously acquires, tends, mates and births a lamb at tick 10,353; rules 150 loses the pregnancy. Exact twin, observer purity, pregnancy/newborn save continuation and conservation pass. Later food shortage still leads to slaughter; the surviving lamb remains untethered at day 8. This is staged chain evidence, not ordinary uptake or mature-flock viability. At this implementation checkpoint the full suite and final-source ordinary screens were pending; final results are above.

## Inventory and implementation path

### Resumed trap chain — rules 150 implementation checkpoint

A checked, personally known catch still generated a reset offer although the physical reset handler refused it while any body record existed. Two new assertions reproduced the mismatch. Rules 150 routes the existing reset motive into recovery of that exact known body's remaining meat, hide and fat, using the same paid ingredient-sized butchery. Unknown, stale, foreign and full-pack cases do not acquire phantom goods or remote knowledge. An empty/expired body record no longer prevents physical reset; its accounting/history remains intact. No catch probability, animal origin or yield changes.

The staged checked-catch fixture then runs ordinary autonomous decisions: rules 149 records five refused resets and two meat meals; rules 150 records no refused reset, three meat meals and three total trap cycles by the same 2,400-tick horizon. Both preserve exact unobserved twins and conservation. This is one staged trajectory, not ordinary terrain uptake or population benefit. Targeted regression passes 38 tests in six files, including immutable 149/150 continuations; build passes. Four rendered checks pass and the recovery screenshot was inspected. The first purity test mistakenly called the state-changing activity constructor before comparing state; it was corrected to test option generation before constructing an action. Raw evidence remains in `survival_evidence/continuation-20261104/`.

Assignment: owner prompt, 4 November 2026. Starting checkout is
`C:\dev\Claude Experiment\living-world-integrate`, `main`,
`61cb6e5139adbedfd52f463fc635a90d4172327b`, rules 121. Verified before editing:
no tracked modifications, 149 untracked entries, preserved. The sibling checkout
is not this baseline. All ordinary product measurements keep arrivals on.

| Stream | Existing mechanism and owner | Missing connection to implement |
|---|---|---|
| 1. Preserve food | `recipes.ts`, `production.ts`, `facilities.ts`: paid batches, held inputs, work, passive processing, output capacity and claims. `economy.ts`, `provision.ts`, `act_resource.ts`: eating and storage. | Paid drying/smoking equipment; weather/fuel dependent, perishable batches; fish to stored provisions to actual meals. Existing meat follows the same route. |
| 2. Heat homes | `habitation.ts`, `needs.ts`, fire activities, `warmth_duty.ts`, `offcuts.ts` | Paid indoor hearth, physically delivered fuel, residual room heat and actual occupant benefit; diagnose child/refuge connection. |
| 3. Warm gear | Equipment registry/ownership, recipes, activities, care; appearance is cosmetic | Obtain/process plant fibre; manufacture, allocate, wear/use, wet/dry, repair and replace garment, blanket and bedding. Hide connection follows stream 4. |
| 4. Recover carcasses | `hunting.ts`, wildlife, carrying, ledger, transport | One finite corpse per kill, paid partial recovery of meat/hide/fat, access/decay/cleanup; replace current immediate reward only under new rules; complete streams 1 and 3. |
| 5. Traps and nets | Equipment, resources, perception, activities | Manufacture/place/revisit/collect saved gear; finite catches, deterioration and unsuccessful trips. |
| 6. Domestic animals | Wildlife/resource accounts, ownership, activities, carcass route after stream 4 | Select one species against source; accounted founders, food/water, containment, breeding, recurring product, slaughter and costs. |
| 7. Body reserves | Eating, needs, lifecycle and saved person state | Paid finite nourishment after streams 1–6, with explicit capacity/tolerance, no free migration reserves or healing, and predecessor/programme comparisons. |

One behaviour stream at a time (Brain D2). This assignment does not import P3.3,
reorder unrelated programme rows. The owner's revised seven-family attachment in
chat `01a1a465-bf07-75e1-8c93-84c5b2ee3919` explicitly authorises body reserves last,
superseding the earlier six-family restriction. The Brain assessment
and brainstorm are dated proposals; this owner prompt authorises implementation.
`WORKFLOW.md` governs delivery; no new review or approval gate is introduced.

## 1. Preservation — rules 122 implemented; bounded ordinary activation

Implementation path: add a small paid drying/smoking rack as an ordinary building
and facility. Use the existing layout, material acquisition, construction,
production, deposit, operate, withdraw and eat activities. One existing `Job`
holds each batch; no second inventory or scheduler. Drying and smoking are separate
recipes. The existing job start tick bounds elapsed deterioration; no extra state
or inventory is needed for this stream.
Inspection and save/load never advance it. The viewer must see work, held inputs,
elapsed processing and the actual reason it waits or fails.

Protect immediate eating at planning and execution; preserve a modest surplus,
not every raw portion. Hungry inhabitants can retrieve/eat accessible raw or
preserved food. Full output storage keeps goods accounted for in the batch.
Rain pauses drying; absent fuel prevents smoking; interruption retains work;
neglect, cancellation and destruction settle real contents without freshening food.

Predecessor evidence: `npx --no-install vitest run tests/v121_continuation.test.ts`
passed (1 file, 1 test, exit 0) on the unmodified baseline. The existing immutable
`tests/v121_continuation.expected.json` and helper exercise an ordinary arrivals-on
meadow world, childhood and exact serialized save/load continuation. Do not rewrite.

Candidate rules 122: a rack costs 4 wood, 2 stone and 180 construction work;
capacity 30, at most one paid batch. Both recipes use two raw portions and 60 work.
Drying then needs 720 rain-free ticks (rain over 0.1 pauses it); the covered smoking
pit instead consumes one delivered wood once and processes for 360 ticks. An
unfinished batch expires 4,800 ticks after it began, including interruptions and
full output storage. Unburned fuel waits for real storage capacity after expiry.
Cancelling does not return fresh raw fish or reset the clock.

Each recipe produces two portions. Dried fish/meat give 24/22 nutrition versus
raw 28/26; smoked fish/meat retain 28/26. Perishable multipliers are 0.18 dried and
0.25 smoked versus raw fish 1.6 and meat 1.4: deliberate finite shelf-life benefits,
with more stable drying and a small nutrition cost. Existing world spoilage runs
apply in stores and piles; new provisions also spoil in packs and carts. No winter,
need, raw spoilage or wildlife rate is changed. Preparing a new batch requires two
other accessible portions and yields to hunger and other immediate needs.

The food audit extends accounting, nutrition/weight/value, carrying sightings,
provisioning, storage, meals, sharing, care, trade, relocation, eating and display.
Source-foraging lists remain lists of obtainable wild foods. Actual granary eating
now checks each food's withdrawal allowance under the new rules; an inaccessible
first-listed food cannot hide a different available share. Old rules keep their
previous path. `rich-no-preservation` suppresses new preservation decisions and
starts, while any already-paid batches and product properties retain their semantics.

Verification and findings:

- Focused preservation, transport and predecessor tests: 33 passed, exit 0
  (19.54 s after strict batch validation). Earlier reserve/batch regressions:
  82 passed across five files, exit 0. Tests exercise paid work, interruption,
  expiry, rain, missing fuel, full storage/pack, competing claims, actual eating,
  care-compatible food access, exact continuation and pure repeated observation.
- Current rendered evidence: `survival_evidence/check9/rendered/`; all five
  assertions pass, exit 0. Paused-drying and stored-output images were inspected.
  The display uses actual workers, held inputs, progress and contents. These are
  explicitly staged checks, not ordinary activation evidence.
- `check8/full-test.log`: `npm test` exited 1, with 414 files passing and 14
  retained review files failing; 2,496 tests passed, 32 failed, three expected
  failures. All tracked tests passed. The full command is not green.
  `check9` is rerunning it after the transport/validation corrections.
- Required typecheck and build on check9 each exit 1 on the unchanged untracked
  `zz_review_f_plank_diversion.test.ts:27` and
  `zz_review_main_mature_large.test.ts:23` nullable errors. The same errors were
  reproduced on exact starting HEAD with these retained tests. Pristine tracked
  baseline typecheck passed. Eight unchanged review files separately reproduced
  17 failures on starting HEAD (`survival_evidence/baseline-review/`), including
  obsolete assertions and missing historical scratch paths. No review tests are
  excluded or weakened. A prior direct Vite build passed; that diagnostic does
  not make `npm run build` pass.

Ordinary evidence uses Normal forest and river, arrivals on, 25 days, exact
seed twins, observer-purity checks, conservation and save/load continuation.
Each frozen source and actual exit status is retained under
`survival_evidence/check*/ordinary/reports/`; completed reports have
`stop='horizon'`, tick 60,000, exit 0 and passing integrity checks.

- Check1 and check3 completed both worlds with no preserved food. All nulls remain
  in their raw reports. Check2 was a rendered check, not another ordinary run.
- Check4 produced and consumed food in river: two dried/two smoked made,
  one dried/two smoked eaten, one dried spoiled; forest remained null. This
  candidate's early rack-construction exception disrupted the valid leisure
  regression. The exception was removed; check4 is not current delivery proof.
- Check5, check6 and check7 completed with zero preserved food. Their final
  states are identical for each seed. Forest ended with three alive, with deaths
  from hunger 17, exposure 5, wolves 5, fever 3 and injuries 1. River ended with
  15 alive: hunger 13, exposure 5, wolves 2, fever 2 and injuries 3. Forest built
  a rack; river's rack layout encountered a real competing footprint claim.
- Check8 (reserve-plan connection) completed both worlds, exit 0 with all
  integrity checks. Forest made and ate two dried and two smoked fish, with one
  wood burned and no preserved-food spoilage. It ended with four alive; deaths:
  hunger 22, wolves 3, fever 4, exposure 0. River remained null and ended with
  15 alive; deaths: hunger 13, exposure 5, wolves 2, fever 2, injuries 3. Forest
  delivered seven raw fish and one wood to the rack. Seven operate activities
  started across two actual batches; two completed and five were interrupted.
  This proves bounded ordinary use of both recipes, including renewed work.
- Check9 includes transport integration and strict batch ownership/timing
  validation. Both 25-day runs completed with exit 0 and passing integrity
  checks, retaining check8's complete forest chain and null river chain.

Final loss-path review found that generic building collapse scattered an unfinished
batch as fresh raw stock. The rack now spoils its unfinished food once and leaves
unused fuel to the normal rubble recovery path. The focused reproduction failed
before this fix; 28 preservation, predecessor and equipment-loss tests then passed
(exit 0, 20.33 s). Check10 completed both ordinary worlds with this correction:
exit 0, full horizon and passing integrity checks; forest again made and ate
two dried and two smoked fish, river remained null. Its complete suite used
eight workers after check9's default run encountered
additional timing failures. Check9 exited 1: 33 failed tests, 2,494 passed, two
expected failures and three skipped; `lab_defaults` subprocess and retained
retention setup timeouts both passed unchanged in isolation (five passed, one
expected failure, exit 0). That does not make check9's full command green.
Check10's `npm test -- --maxWorkers=8` exited 1 after 434.39 s: 415 passing
files, 13 failing retained review files; 2,498 passed tests, 31 failed and three
expected failures. All tracked tests passed; no tests were excluded.
All 31 failures were separately reproduced at the exact starting HEAD: the
first eight-file diagnostic produced 17 failures, and
`survival_evidence/baseline-review-remaining/` produced 14 failures in five
files, with the sixth file passing (exit 1, 214.06 s). The failures concern
missing historical scratch-report directories and assertions expecting retired
rules or defects that the starting implementation no longer exhibits. This
classification does not turn any of the failed full commands into a pass.

The batch compiler could also substitute stale nearby rack stocks for the fresh
stocks that motivated a demand. A failing two-rack test demonstrated this; all
preservation planners now share the one-day remembered-stock limit. Forty-eight
affected tests passed, exit 0. Check11 is the latest frozen runtime and runs both
ordinary worlds. The immutable rules-122 continuation reference now exists and
passes its first test (exit 0, 7.24 s); it covers ordinary decisions and staged
paid work, rain-paused processing and output. No older reference was changed.

The relevant missing links were diagnosed before fixing them. General workshop
supply protected the entire household food reserve, preventing transfer to a
preservation rack; preservation now retains two immediate meals while other
production keeps its old reserve floor. Preservation can use the existing batch
planner, and an existing food-reserve plan can choose preparation without a
second project or reserving food away from meals. Its home destination remains
fixed while steps visit the rack. Passive processing does not keep someone
waiting beside the batch. Finished provisions enter existing cart reserve trips.
Malformed batches cannot lose their client and thereby finish without the
intended ownership claim. No general priority, need, climate or scarcity rate
was increased.

Bounded diagnostic replays and immutable samples are under
`survival_evidence/rack-diagnosis-v2.json` through `v5.json` and
`plan-diagnosis.json`. The first `rack-diagnosis.json` has valid aggregate
counters but shared nested inventory references; do not use those as historical
snapshots. V5 continues a retained day-ten world with the current candidate; it
is a diagnostic fork, not a replacement for an ordinary run. The current
observer records supply/processing starts, deliveries, work ticks, phase changes,
fuel, actual consumption/spoilage, failures and recent choices at the rack.

Resume verification, 4 November 2026: all 264 recorded source hashes match the
working source under the observer's documented LF normalization. All 1,467
tracked source/script/test/config files compared to frozen check11 also match
after line-ending normalization. Check11 finished both 25-day arrivals-on Normal
worlds at tick 60,000, exit 0, with conservation, exact twins, saved continuation
and 500 pure-observer checks per world. Forest made and ate two dried and two
smoked fish; river's rack layout lost its footprint claim and produced none.
Forest paid one wood, 123 operating person-ticks, 611 operating-travel ticks,
and additional supply/retrieval labour in the retained report. Nine withdrawals
failed with nothing left to take; five operate starts were interrupted.

Check11 `npm test -- --maxWorkers=8` exited 1: 416 passing files, 13 failing
retained review files; 2,500 tests passed, 31 failed, three expected failures
(372.04 s). These are the same 31 baseline-reproduced failures recorded above.
Fresh `npx --no-install vitest run tests/preservation.test.ts tests/transport.test.ts
tests/v121_continuation.test.ts tests/v122_continuation.test.ts` passed 35 tests
in four files (exit 0). Fresh `npm run typecheck` and `npm run build` both exited
2 on the two retained nullable review-test errors above. Logs:
`survival_evidence/resume-20261104/`. The check9 success and rain-pause screenshots
were inspected again; rendered files match the frozen source. No full-command
green claim is made. Mechanism/turn integration and bounded use are established;
reliable uptake and causal survival benefit are unproven. Carcass/fat connections
and final programme measurements remain required.

## 2. Indoor heating — rules 123 implemented; bounded ordinary activation

The existing in-place construction path fits a hearth into an owned solid home
for one wood, two stone and 160 work. It does not repair the home. Installation
starts cold with no fuel. Existing material acquisition, hauling, building and
`fuel_fire` activities supply and tend it; no separate inventory or scheduler.
Each fuel unit takes 24 work and contributes the existing 380 burn ticks for
wood or 190 for recovered offcuts. Capacity is 1,520 ticks. One tick burns per
world tick; heat rises by 0.08 degrees per burn tick, up to 18 degrees, while
losing 0.004–0.010 of its current value according to building condition.
After exhaustion only cooling remains. Heat reaches actual occupants through
`needs.ts`; outdoor fire heat remains excluded indoors.

Choices use known household homes, personally felt cold/current local weather,
unreserved carried fuel and independently dated indoor fuel observations.
Exterior sight reveals the fitting but never refreshes remembered thermal state.
Existing wood/offcut acquisition connects the cold-home cue to the next fuel
trip. The lab ablation `rich-no-hearth` suppresses new choices; existing paid
fittings keep burning and cooling. Old saves gain no fitting or heat, and malformed
new thermal state is rejected. Destruction removes the fitting; interrupted work,
competing tenders, full storage and excess materials settle physically.

The final focused command covers hearth, habitation, preservation and immutable
rules-122/123 continuations: 61 tests in five files passed, exit 0. The exact-full-
pack correction was then checked by all nine hearth tests (exit 0). Typecheck and
build each exit 2 solely on the two retained nullable review-test errors described
above. Logs: `survival_evidence/resume-20261104/hearth-*`. Rules 123's immutable
reference was captured before introducing any successor behaviour.

`scripts/browser/hearth_check.mjs` runs through the supported CUA tab API, with
six passing assertions in `survival_evidence/hearth-check2/rendered-report.json`.
It checks actual fuel work, occupancy, heat, exhaustion, conservation, pure UI
and exact saves. Success/failure screenshots were inspected. The first script
launch using direct CDP was blocked by automatic approval review; the supported
API replaced it. A first supported run found a collapsed inspector; its failed
report is retained, and the setup now explicitly opens the inspector.

Frozen `hearth-check1` retains the first candidate. `hearth-check2` adds correct
project completion, capacity-safe excess material handling, and observer-only
construction/hunting/exposure counters. Both 25-day Normal arrivals-on runs
completed at tick 60,000, exit 0, with conservation, exact unobserved twins,
save continuation and 500 pure-observer checks each:

| Observation | Forest | River |
|---|---:|---:|
| Hearths remaining | 7 | 6 |
| Fuel activities started / completed / interrupted | 42 / 33 / 9 | 64 / 47 / 17 |
| Fuel units consumed (wood/offcuts) | 59 | 87 |
| Fuel tending work / travel person-ticks | 1,429 / 1,538 | 2,135 / 2,770 |
| Hearth construction work person-ticks | 3,788 | 5,126 |
| Occupied ticks receiving heat | 48,228 | 87,594 |
| People alive at day 25 (descriptive) | 2 | 23 |

Failed layouts, missing building materials, changed ownership, interruptions and
unfinished projects remain in the reports. These runs establish paid construction,
renewed fuel supply and actual occupied heat, not reliable survival benefit.
Forest's five hunting pursuits produced three actual strikes, all failed; river
had no selected hunt. Sampled visible deer / eligible hunt offers were 146 / 38
and 59 / 8 respectively; samples are not unique opportunities. Child-exposure
episodes include travel outdoors and rests under lean-to cover. No transport
repair is inferred from a death label or added in this increment.

After freezing, save validation was strengthened so a missing fitting marker
cannot turn a cheap hearth site into a home rebuild; cost key ordering remains
valid. The ten hearth tests plus both predecessor references passed (12 total),
and construction/home replacement/save/township/hearth regression passed 51 tests.
All 269 checked runtime/config/observer files match frozen check2 except this
validation-only difference and the rules-version comment. Both final saves load
byte-exactly under the final validator and continue with conservation. Evidence:
`hearth-check2/source-comparison.json` and `current-validation.json`.

The broader check1 run exited 1: 416 files passed, 14 retained review files failed;
2,505 tests passed, 33 failed, three expected failures (513.66 seconds). The two
additional famine diagnostics lacked their historical input in the frozen tree.
Supplying the exact original fixture (matching SHA-256) made both pass in a focused
rerun; the other 31 are the previously reproduced review failures. No full-green
claim is made. Verdict: **TURN_INTEGRATION_VERIFIED** for the bounded hearth chain;
aggregate benefit and the remaining five families are unverified.

## 3. Fibre clothing — rules 124; ordinary use observed, later materials remain open

New capability: inhabitants make, carry, ready, dry and mend owned insulation;
carers can physically deliver a spare garment to a visible dependent. The same
chain gives timber yards, supply plans, personal stock knowledge, indoor heat
and existing delivery/estate handling useful additional work. Look stays cosmetic.

Parameters: one wood and 60 work yields three bast-fibre bundles at a timber
yard. A garment or blanket takes three fibre and 100 work; a bedroll takes four
fibre and 100 work. Readying takes 20 work. One readied garment gives at most
6 degrees; one blanket and one bedroll each add at most 4, only while their
holder actually sleeps. Bedrolls are personal carried bedding, not building
bonuses. Spares add no heat. Weights are 0.75 garment/blanket, 1 bedroll and
0.25 fibre. Condition scales protection linearly; fully wet gear loses 80%.
Exposed rain adds up to 0.0008 wetness/tick; shelter reduces wetting. Dry weather
removes 0.0002/tick, plus 0.00003 per actual indoor hearth degree. Active use
adds 0.002 wear/tick (50,000 continuous ticks without repair). One unreserved
fibre and 60 work repairs 35 wear, capped at new condition. Transfers clear the
readied slot; wear-out destroys and accounts for the actual item.

The exposure trace showed outdoor travel, lean-to cover and cold carers, not a
proven missing child-transport mechanism. Child delivery therefore uses existing
physical give/travel/capacity checks and bounded failed-delivery memory. Receipt
does not count as feeding. A visible dependent without a garment supplies demand
when already cold or when observed weather is below 12 degrees, matching the
adult preparation threshold. Children can ready, but cannot manufacture or mend.

Twenty-two focused tests cover offered paid production, two-batch bedroll inputs,
child preparation/delivery, sleep-only protection, slots, wetness, repair,
interruption, full packs, competitors, death/recovery, exact saves, strict state
validation and observer purity. Clothing/planning/legacy/predecessor checks
passed 45 tests in six files (6.39 s); the subsequent child-weather correction
passed 28 in four (6.92 s). Immutable 122/123 references remain unchanged.
Typecheck7 and build3 exit 2 only on the two retained nullable review-test errors.
Full check2 exited 1: 417 files/2,518 tests passed, 15 files/33 tests failed,
three expected failures, 802.32 s. Beyond the 31 baseline failures, it exposed
an old-protocol recipe-catalogue mismatch (fixed by rules filtering) and a
120-second tool-report timeout; both unchanged files then passed (three tests,
61.98 s). Check4's broader suite exited 1 after 424.09 s: 419 files/2,526 tests passed,
13 files/31 tests failed, three expected failures. All failing files are the
retained baseline review cases; no additional failure recurred. Logs are retained under
`survival_evidence/resume-20261104/clothing-*`.

Rendered `scripts/browser/clothing_check.mjs` passes seven assertions, including
paid production, actual dry/wet protection and a real no-fibre repair failure.
Inspected screenshots and results: `survival_evidence/clothing-rendered-access/`.
No aggregate survival benefit is established.

Successive frozen ordinary candidates remain under `survival_evidence/clothing-check*/`:

| Candidate | Forest, 25 days | River, 25 days | Scope |
| --- | --- | --- | --- |
| check1 | 3 garments; 50,808 adult protection ticks; 0 survivors | retained report | Before persistent batch-plan connection |
| check3 | 4 garments; 79,156 adult protection ticks; 2 survivors | 3 garments, 1 blanket; 502 blanket sleeping-use ticks; 27 survivors | Before usable-stock correction |
| check4 | 6 garments, 1 blanket; 125,591 adult and 36,210 elder garment ticks; 540 blanket ticks; 1 survivor | 4 garments, 1 blanket; 69,707 adult garment ticks; 2,284 blanket ticks | Dated personal stock; no bedroll or child use |
| check5 | 9 garments, 2 blankets; 16,831 child garment ticks; 13 survivors | 4 garments, 1 blanket; 69,707 adult garment and 2,284 blanket ticks; 27 survivors | Adds child preparation; before loaned-garment gift correction |
| check6 | 10 garments; 188,737 adult, 21,968 elder and 9,118 child protection ticks; one repair; 7 survivors | 4 garments, 1 blanket; 69,707 garment and 2,284 blanket ticks; 27 survivors | Owned, individually selected garment deliveries |

Completed check3/4 runs pass exact unobserved twins, save/120-tick continuation,
conservation and 500 pure-observer checks each. Check4's 146 forest bedroll work
offers establish opportunity, not completion. Check5 establishes ordinary child delivery and use. Bedroll use remains an
open acceptance issue; 50-day meadow/fern/aspen searches are running. A started
run is not completion evidence.

The check2 trace `fibre-failures.json` established repeated attempts to use three
fibre earmarked for somebody else: total stock was observed without its access
limit. Current rules store a dated, observer-specific usable count for the four
new textile goods alongside physical totals. Hearing another person's count
does not grant access; execution still checks actual ownership. This also lets a
maker prepare another fibre batch instead of treating reserved inputs as theirs.
Old material paths retain their semantics. The check5 delivery trace exactly
matches the forest final save and records nine attempts: one success, two
interruptions, six refusals. A second trace establishes that the refusal at
36040 was a loaned garment (#12309, due 38337), despite sufficient recipient
space. Check6 offers only owned, unloaned spares and binds the saved delivery to
that item. Losing it fails explicitly, without substituting worn or borrowed
gear. The existing transfer path now accepts an optional exact tool identity;
other callers retain their behavior. New red/green ownership tests and related
tool/estate/predecessor checks pass 35 tests in three collected files (6.16 s). Typecheck8
still has only the two baseline nullable errors. A final ownership audit also
covered direct lending, returns and rack checkout: textiles now retain capacity
limits and arrive unready. Those paths passed 39 tests in four actual files
(8.25 s), including `tool_transfer_records.test.ts`. The immutable rules-124
reference is captured and passes (1/1, 9.29 s); never regenerate it. Final
malformed-batch/fibre validation rejects missing paid inputs, shortened work
and invalid quantities. The resulting clothing/workshop/transfer/124-reference
suite passes 53 tests in four files (7.96 s); final 122/123 references also pass.
Typecheck10/build5 retain only the two existing nullable errors. Check6 broad
regression: 419 files/2,531 tests passed, 13 files/31 baseline tests failed,
three expected failures (472.04 s). Hide and possible wool routes
await streams 4 and 6.

Final source replay (`clothing-final-replay/audit.json`) matches both observed
check6 final saves byte for byte, initial hashes match, all source files match
the final tree, and exact load/continuation/conservation pass. The first replay
harness attempt failed creating its output directory after simulation; those
failed logs remain. The corrected harness creates a fresh directory first.
Check6 costs: forest 11 completed fibre batches from 11 wood, 10 completed
garments, 1,683 operation-work ticks and 1,736 operation-travel ticks; river five
fibre batches from five wood, five textiles, 831 operation-work ticks and 406
operation-travel ticks. Collection, gathering, giving and interrupted attempts
are separately retained in the reports; these are not total lifecycle costs.

Expanded check5 searches retained nulls: fern 50 days made 10 garments and one
blanket; aspen made 10 garments. Neither made bedding. Meadow made a bedroll
but it still waited at the yard at day 50. The later mixed-candidate meadow
continuation recorded 1,958 adult bedroll protection ticks (6,622.278
degree-ticks); the check6 fern 100-day light scan recorded 16,384 adult bedroll
ticks (53,152.198 degree-ticks), without the full observer's twin/purity sampling.

The fresh final-124-source meadow run now closes that provenance gap:
`clothing-check7/meadow-60d-fresh` ran from birth to tick 135,480 before its
1,200-second wall budget, and `meadow-60d-fresh-continuation` continued that
exact save to tick 144,000 on the same frozen source. Both pass exact twins,
save continuation, conservation and sampled purity. The two segments record
568 + 1,390 = 1,958 adult bedroll protection ticks and 6,622.278 degree-ticks.
This establishes ordinary sleeping use, not survival benefit. The obtainable
fibre routes now have observed garment, child-delivery, blanket and bedroll use;
ordinary hide/wool routes remain open below.

## 4. Carcass recovery — rules 125; core use observed, hide/fat uptake open

Hunting was traced before changes: rules-123 forest recorded five pursuits,
three failed strikes and two interruptions; river recorded no starts despite
59 visible-deer samples and eight eligible offers. Neither deer supply, hunt
utility nor strike probability changes. The prior instant reward (four meat
plus party additions) is replaced by exactly one physical body.

Agent-selected parameters: four meat, one hide and one fat per deer regardless
of party; 120 paid work per recovered unit; 4,800-tick decay deadline and
120-tick cleanup of empty remains. `carcass.ts` owns partial work and live
claims. `Pile` holds origin, access, remaining/recovered/lost parts; `economy`
counts them once. Dated observations expose remembered parts, never loose food
or remotely refreshed inventory. Actual recovery checks reach, household,
claim and capacity. Interrupted work remains paid; two workers cannot take the
same last unit. Ordinary deposits into bodies and loose withdrawal are refused.

Hide plus one fibre takes 160 work at a timber yard to make an owned garment
with saved hide provenance and the same bounded insulation. Raw fat is
inedible; one fat and one wood take 60 work plus 180 elapsed processing ticks
at a food rack to produce one rendered fat (24 hunger, weight 0.5, spoil
multiplier 0.25). Hide/fat spoil in packs and stores. Rendered fat enters the
existing food, sharing, granary, care, carrying and provision paths.

The actual offered-action tests cover hide recovery → delivery → sewing →
collection → wearing and fat recovery → delivery → rendering → collection →
eating, plus interruption, last-unit contention, capacity, ownership, expiry,
observer purity and malformed saves. Final focused carcass + immutable
122/123/124 checks pass 19/19; affected estate/leftover tests pass. The new
immutable 125 reference is captured before successor behaviour and passes.

Fresh review repaired four concrete gaps: heavy-work needs costs; remote
refresh on interrupted travel; unavailable new recipes contaminating older
rules' blocked options; generic deposits making mixed body/loose storage.
The deposit defect has retained red/green evidence. No historical reference
was regenerated. Stable broad check2: 421 files pass, 13 fail; 2,549 tests pass,
31 fail, three expected failures. All 31 failing test names match the prior
clothing run (`carcass-failure-comparison.json`). The broad run predates final
labels/deposit guards; focused checks cover those changes. Full typecheck and
build still fail only on the two existing untracked nullable review tests.

Staged rendered checks pass eight assertions; visually inspected
`carcass-rendered-check1/carcass-success-visible.png` and
`carcass-failure-visible.png` show paid recovery and real expired-body refusal.
Initial stale-painted captures and the stopped check1/mixed-source broad run
remain preserved, explicitly superseded rather than counted as acceptance.

Normal arrivals-on observed runs (`carcass-check3`): forest25 has three failed
strikes and no body; river25 has no hunt starts and no body. They finish with
seven and 27 alive respectively, descriptively. Final deposit-guard source in
check4 reproduces both final saves byte-for-byte (`replay-audit.json`). Fern60
records one body: Wilma recovers hide at 17,930, Juno recovers meat at 22,383
and eats it, Cass loses a live-claim race. Three meat and one fat decay; the
recovered hide also eventually spoils. Wilma had not discovered the existing
yard at day 10 and died of thirst at 28,589. Observer counts: three butchery
starts, two successes, one claim failure; 151 sampled travel and 238 sampled
work ticks. Boundary sampling is not an exact labour invoice. All three runs
pass twins, final +120 continuation, daily conservation and sampled purity.

The diagnostic `carcass-fern-first-body-trace` retains competing choices.
Current-source fern60 replay is byte-exact. Aspen100 records one further body
and one meat eaten, with other parts lost; meadow100 records no bodies. The scans check source stability, conservation and final
continuation but lack decision samples/every-tick twins. Ordinary hide garment,
rendered-fat and preserved-meat use remain explicit gaps, to revisit as the
following input routes develop. No survival improvement is claimed.

## 5. Traps and nets — rules 126 core; trap-site connection open

Rules126 adds made, carried, deployed and checked gear. Agent-selected costs:
net three fibre/two wood, deadfall trap three fibre/four wood, each180 work at
the timber yard. Placement80 work, wait600 ticks, check40, reset40. Each set
wears10 condition; deployed repair60 work/one fibre restores40. Existing carried
gear mending remains available through its paid equipment route. One deployment
per kind per household. Nets transfer up to two unreserved fish from the actual
source; traps attempt one actual nearby deer (range4, deterministic chance.55)
and use the single carcass path. No added deer or changed hunting utility.
Catches face existing ground spoilage and a1,200-tick expiry; gear abandoned
48,000 ticks is lost and ledgered. The inspector exposes ownership, condition,
waiting, catch, empty and broken state. Equipment/piles and existing activities,
recipes/production/facilities own the route; no parallel inventory or scheduler.

Fresh review repaired lost retrieval memory, household deployment limits,
setter-death dependence, premature saved attempts, and full-pack gear loan,
return and rack pickup. Initial ordinary runs showed made but unused gear:
forest2net/1trap, river1net, no placements. A foreign borrowed net in the forest
save exposed an ownership mismatch. Tests reproduced collection of a foreign
record ahead of one's own and counting unusable foreign shelf stock. Personally
observed `gearStock`, selecting the owned record on collection and retaining
ownership when storing gear repaired that path. Evidence remains in
`gear-check1/`, `gear-ownership-trace/` and the red/green logs.

Current ordinary Normal arrivals-on forest/river25 observations are in
`gear-check3/`; final source with the added loan capacity guard replays both
byte-exactly (`gear-check4/replay-audit.json`). Both observed runs have exact
unobserved twins, save+120 continuation, conservation and500 pure samples.
Forest made2nets/1trap and placed all3:2fish caught, none collected, no trap body.
River made3nets, placed2, caught8fish, collected2 and demonstrably ate both from
net-origin-only packs. No repair occurred in those windows. Gear activity
samples total forest3,239 travel/1,092 work, river3,056 travel/1,049 work ticks;
check completions12/11 and reset completions9/10. Interruptions and one river
check arriving during a newly reset window are retained. The sampled production
ticks describe activities labelled for gear; resumed other batches can differ,
so these are not an exact gear-manufacture invoice. Day25 populations3/25 are
descriptions, not survival benefit claims. A longer fern60 run remains active.

Focused current checks:20 gear contracts;46 passes in4files including clothing,
physical transfers and predecessor125. Six affected knowledge/transmission/save/
workshop/flood files pass60 tests. Frozen broad check2:423files/2,566tests pass,
13files/31tests fail and3expected failures,710.24s; every failure name matches
rules125 (`gear-failure-comparison.json`). Broad scope predates stock/loan fixes,
which have the later focused/affected coverage. Full typecheck8/build4 still fail
only the two preserved nullable review-test errors; standalone Vite bundle passes
(with its existing large-chunk warning). Browser check2 passes7 assertions and
its inspected broken-net image is `gear-rendered-check2/gear-failure-visible.png`.
Immutable126 is recorded and passes, source digest
`7387ea83e0806df4aea2bbfc5b7a72873ff9653747849aef5ec1c4879e366d34`.

Trap ordinary use remains open. A same-trajectory forest diagnostic starting
from the36k save found its next attempt at36,845 had all three deer19.6–27.6
tiles from the selected tree (`gear-trap-attempt-trace/`). Choosing any nearby
tree fails to connect placement to witnessed wildlife. Continue this family
with a bounded dated deer-sighting-to-trap-site link under the next rules version;
retain scarcity, catch chance and hunting behavior. Do not claim all seven
families complete. Deferred ordinary hide/fat/preserved-meat use remains open.

### Trap-site connection — rules127 candidate

The forest126 trace motivates a bounded memory link, not more deer or stronger
hunting. People retain up to four dated deer sightings through actual perception
and the existing belief system. Newest dates/IDs retain a deterministic bounded
set. A trap is commissioned and placed only when a known tree is within six
tiles of one of those sightings; newest sightings are tried first, then the
closest qualifying tree. Memories can be stale: choices do not inspect current
hidden animal locations. All126 work, catch chance, ownership and loss remain.
The goal names the dated sighting without asserting it was personally seen when
it could have been reported. Older rules preserve their original behavior.

Initial tests reproduced nearest-tree placement and unnecessary trap demand.
Current six contracts cover observed/unobserved animals, bounded memory, exact
saves/purity, old-rule refusal, actual offered placement through a caught body,
and demand eligibility. The126 reference caught an accidental saved-goal change;
it was corrected in source, never regenerated. Staged browser proof shows no
site before observation and one real deer becoming a finite body and one eaten
meat (`trap-ground-rendered-check1/`). These do not prove ordinary uptake.

Frozen trap-ground-check1 forest/river25 runs predate the final demand link and
neutral goal wording; preserve them as candidate evidence. Frozen check2 holds
current source for forest/river25 and the affected test run. The earlier main
`trap-ground-affected.log` is not accepted as stable-source evidence because
source changed while it could still be active; its scope note preserves that
limit. Typecheck1/build1 still show only the two existing review nullable errors.
The current127 affected run passed70tests/10files in64.45s. Typecheck2/build2
retain only the two unrelated nullable review errors. Reference127 was captured
before the successor fix (digest9100b98c82e47eed8221a9d2ba8c51070e297167d32d5fc855429ac466e8b39a);
its test and126 plus six feature contracts pass8tests/3files. Never regenerate it.
Rendered check2 passes6assertions; the settled screenshot is
`trap-ground-rendered-check2/trap-food-visible.png`.

Fresh review classified a RUNTIME_LOGIC_BUG: check1 forest's trap owner924 switched
grounds547->562->589->569 between39115and39319 without completing a placement.
`currentUtility` treats an omitted current option as zero. A moving deer replaced
the only offered ground, so the next review discarded the journey. A focused
regression reproduces the missing option. Rules128 now retains at most the one
already-selected, still-known tree beside the newest alternative, scored normally.
It grants no sticky commitment or utility increase: critical thirst still interrupts.
The saved activity already holds the selected place and original dated goal;
no new beneficial save defaults or remote animal reads are needed.

`trap-ground-kept-red.log` has the expected assertion failure. Final focused
`trap-ground-kept-path2.log` passes37tests/5files, including both immutable126/127
references, paid placement after the sighting moves, exact save and critical
thirst interruption. The intermediate path failure was a fixture missing the
ledger entry for an added tree; corrected without changing runtime or assertions.
Frozen check3 is current128 source for new forest/river25 runs. Check1/2 remain
127 evidence, not128 acceptance. Full128 command results, ordinary activation,
reference128 and commit were initially pending. The captured128 reference now
passes, including the retained journey after the deer moves; digest
f031d7d052d73eb535a7952b1ab08d780d1a0816b2ac9127d3c616918a30ddb2.
Final focused reference/gear set:30tests/5files,6.78s,exit0. Typecheck4/build4 each
exit2 on only the two existing nullable review files; standalone Vite bundle
passes. Rendered check4 has8passing assertions, and both settled success/failure
images were inspected. The trap inspector distinguishes a present body, a body
no longer here and no catch, and reads actual remaining decay time; it does not
label trap outcomes as fish.

The48,000-tick forest manufacturing diagnosis (`trap-ground-demand-trace/`) is
observer-only and has no every-tick twin/source-change guard. It records5,859
person samples,2,101 with prey and qualifying ground,1,539 with trap demand;
only one sample had an offered key matching trap manufacture/collection or gear
placement. The sample filter includes net placement, so this last count does
not establish a trap-manufacture offer. Most recorded top choices concern
immediate needs. This does not justify lowering costs or boosting utility.
Meadow and aspen60-day runs are underway in final-source frozen check4 to test
ordinary completion under different available work/supply histories.

127 final-candidate forest25 ends10alive, river25ends27alive; neither made a trap.
Forest made4nets,placed1,caught1fish,none collected; river made2nets,placed1,
caught6,collected1,no directly attributed meal. Both exact twins/save+120,
conservation and500pure samples pass.128forest25 likewise ends10alive; its
river25 is still running. These are bounded observations, not benefit claims.
The preceding126fern60 now completes28alive,72caught30collected22direct meals,
13successful repairs,7full-pack partials and2trapplacements/0trapped bodies.
Final126source replay is byte-identical (`gear-check4/fern-60d/replay-audit.json`).

The dated-ground/retained-journey mechanism is implemented and tested, while
ordinary trap-to-food completion is still open. Its frozen measurements can
continue while the next single behaviour stream is developed. No family-wide
completion or survival benefit is claimed.

## 6. Domestic animals — rules129 implemented; bounded ordinary wool use

Implementing-agent choice: sheep, in rules129. This is a routine implementation
choice, not a new owner decision. Two unowned adult founders are placed once in
new natural worlds on reachable ground near existing forage and finite water;
old saves and arrivals add none. They start with no stored food, water or wool.
Wild sheep seek nearby existing berries, fruit, grain and shore water,
retain one personally found water point, walk there and spend grazing/drinking time. Consumption uses the same source
and water accounts. No deer count or hunting rule changes.

Acquisition is120work,2wood,1fibre and1grain, at the animal's real position;
the grain feeds it and a physical tether contains it within2tiles. Feed/water
are30work per real carried unit. Food storage is44nutrition points (two grain
portions), water2units; upkeep22nutrition/day,33when below0C, and1water/day.
No food/water causes health loss, and a neglected tether wears out. One fibre
and60work repair40condition; no remote refill or automatic replacement.

Productive fed/watered time grows one wool per2days, capped at2unshorn wool;
Growth is ledgered on the animal;80work transfers one into available pack
space. Death loses any unshorn fleece once. Existing workshops turn wool into
owned garments, blankets and bedding with existing wear/wetness/use rules.
Breeding requires a physically nearby owned adult pair and100work, then4fed
days of gestation within an8day deadline. A newborn has zero food/water/wool,
requires8fed days to mature, and needs its own paid tether before keeping work. Four living
sheep/household and12/world bound breeding. Slaughter is160work and removes one
actual animal into the existing carcass path; immature animals yield only paid
growth fractions. Neglect produces finite lost remains. Human feed, water,
labour and forgone food are measured alongside output. Ordinary worn wool and
final acceptance remain pending.

Review findings so far: the first candidate stopped short of actual shore
contact and both founders died unwatered by4000ticks in forest and river.
Those frozen check1 runs are retained. A red ordinary forest test demonstrated
the defect; the corrected sheep reach legal water, consume it, graze and grow
fleece. The acquisition supply request also now includes its paid grain
portion beyond the two meals protected by the action, with a matching red/green
test. A newborn still receives supply demand for its paid tether at the four
animal limit. Neither finding justified raising animal-work utility.

Current focused coverage:51tests/2files pass in8.07s, including24sheep contracts
and the workshop suite. Three successive paid fleeces become a delivered,
woven, collected and worn garment without any initial wool. The workshop input
whitelist now recognises that tested origin. Browser check2 passes9assertions,
including actual wool delivery/weaving/dressing and neglect, conserved and
exact-save in both cases. Typecheck6/build2 retain the two unrelated nullable
review-test errors; standalone Vite bundle passed. Evidence:
`survival_evidence/resume-20261104/`, `sheep-rendered-check2/`.

The six-day source3 forest trace saw1,599/1,680 person-samples with sheep
knowledge,474 animal/supply offers and66 ranked first. It saw539 samples
with free wood and459 with grain, but none with fibre. Many grain/post trips
therefore preceded any possible binding. The next revision requests binding
fibre first, then acquisition posts/food; no utility increase. It also applies
existing ecological harvest pressure when sheep graze. The candidate1 leisure
regression now passes on this dependency order (frozen4 leisure5/5).

Current sheep contracts pass, including120ticks of mid-pregnancy exact
continuation, concurrent last-fleece collection, critical thirst interruption,
dated-location failure and refusal of fractional/unpaid newborn maturity.
Frozen4 affected93pass/1fail in78.40s: the one failure was the new test calling
an activity factory before its purity assertion; that factory intentionally
allocates an id. The assertion now brackets option generation alone, and the
24-test result includes the corrected case. This did not require a runtime fix.
Frozen1 broad regression finished:425files passed,16failed;2590tests passed,
35failed,3expected failures,1091.78s. Failures comprise31baseline,2missing
retained-famine-fixture cases, the repaired leisure case and the obsolete wool
input whitelist. Frozen5 includes the checksum-matched famine fixture and
latest runtime; its broad run remains pending. It predates the whitelist-only
test correction, which the focused51-test result verifies.

Source4 forest/river25 completed with8/28alive, exacttwins, final+120continuation,
conservation and500pure observer samples each. Forest:2captures,2shears,
1slaughter, another sheep lost to neglect;4bodies across sheep/deer supplied
8meat meals, all hides/fat lost. River:2captures,11shears,5feedings,4tether
repairs,1slaughter;11wool grown and3woven into a garment at tick51016. It
remained on the workshop rack at day25, owned by Basil's household; no worn
wool yet. The frozen5 river continuation reached day40 with17alive and2813
actual wool-blanket protection ticks (10935.594degree-ticks). It passes exact
twins, save+120continuation, conservation and300pure checks; six of eleven
grown wool were used in a garment and blanket. This closes the earlier
revision's basic ordinary wool-use route. Older source5 meadow60 completed23alive (1098.98s),1200pure checks, exacttwins/
save120/conservation. Four fleece collected but none used; this predates the
warm-interval connection.

A separate observed connection remains worth correcting: source3's keeper
had five wool, no garment, healthy needs and a known yard2.93tiles away at
tick36480, yet warm-weather demand omitted the prepared wool route. The latest
candidate retains the existing textile priority and permits enough unreserved
held/personally usable stored wool to motivate work during a warm interval.
Known unfinished wool work and usable finished yard textiles retain their
next step through weaving and collection. Wool stock observations use the
existing dated, observer-specific access record. No hidden stock lookup or
automatic material transfer is added. A full three-fleece warm-weather chain
and personal-stock refusal pass;74tests/5files and51tests/5files cover the
change and old124/125/128 continuations. Frozen6 forest/river25 and affected
regressions are underway; typecheck7/build3 retain only the two baseline errors.

Final source6 forest/river25 completed with11/27alive (378.79/521.51s).
Both pass500pure checks, exact observed/unobserved twins, exact save+120
continuation and conservation. Forest:2captures,2shears,1slaughter, one sheep
lost to neglect and no wool use;8meat portions eaten across sheep/deer bodies,
all4hides/4fat lost. River:2captures,10shears,6feedings,2tether repairs,
2slaughters. Six of10grown fleece became two worn wool garments, supplying
36375protection ticks/129921.644degree-ticks. Human care occupied1368travel and
1862work ticks. Sheep consumed44water through drinking,59grazed food portions,
and8keeper grain portions including capture;4wood/2fibre paid for tethers,
2more fibre for repairs. Three recovered meat portions eaten, five lost;
both hides/fat lost. These are bounded activation/cost descriptions, not
paired benefit. No ordinary breeding in this final25-day pair; paid breeding,
newborn upkeep and caps have contract tests, and earlier source3 recorded a birth.

Current affected regression:104tests/9files PASS66.78s. Immutable129 reference
recorded before successor behavior, passes1/1 (8.15s); source digest
`5973ba1ffc742f2f0b01083ff6d6c951fa366d70ab5b86355689fb36736b5f71`
matches all268current source files. Standalone Vite build passes; full
`npm run typecheck`/`npm run build` exit2 only for the two retained nullable
review-test errors. Rendered check3 passes9checks; both visible screenshots
inspected, including warm-period paid fleece-to-worn-garment and real neglect
loss. The complete source1 broad run and current affected-delta results are
retained above; source5's additional broad run completed:427files passed/14failed,2604tests
passed/32failed/3expected failures,1023.88s, exit1. Its32failures comprise the
31retained baseline failures and the pre-correction wool whitelist. The latter
passes in current focused tests. This run does not certify later code by itself.

Earlier candidate outcomes remain distinct: source1forest/river25=2/25alive,
both sheep lost without care; source2=10/22alive without capture; source3=5/24.
Source3river had2captures,9shears,2feedings,1mating/birth,1repair,2slaughters,
but its keeper died with all9wool unused. Its diagnostic saw feasible recipes
and78delivery rows across128samples,109with at least3wool. No missing recipe
connection or justification for higher utility was established. The trace's
`interpretation.json` excludes reference-held plans/yard objects from historical
claims; future samples deep-clone them. These are candidate descriptions, not
paired causal effects or evidence of accepted survival benefit.

### Deferred carcass-input connection — rules130

Frozen final129 forest trace (`survival_evidence/carcass-route129-forest`)
recorded928person samples with a remembered body and10butchery endings.
Only13samples held meat; none held hide/fat and none held two meat portions.
The run therefore supplies no evidence of spare carried meat for preservation.
The production compiler currently accepts gathered raw materials or stored
items, but not a body's separately accounted recoverable parts. A known owned
body plus binding and a usable yard cannot compile a hide garment; likewise
fat does not motivate its existing rendering route until already carried.
`carcass-supply-red.log` retains three failing contract cases for that gap.
Rules130 adds `carcass_supply.ts`: the existing supply step can offer paid
butchery of accessible parts personally seen within one day. The compiler's
existing supply node recognises those finite inputs; no new scheduler,
inventory, reservation or automatic transfer is introduced. Existing recipe
priorities determine the offered recovery, with ordinary travel costs. The
world rechecks ownership, capacity, decay and competition at the body.
Known recoverable fat can motivate the existing rendering recipe at a known
rack; known meat can motivate preservation, which still protects immediate
food at actual batch start. Sheep butchery now says body, not deer.

Checks:75tests/6files PASS (11new supply cases plus carcass, preservation,
compiler, batch and129continuation), then88tests/8affected files PASS.
The first negative new fixture wrongly ruled out the valid alternative fibre
recipe; it now tests absence of the inaccessible hide route. Old129 remains
byte-identical. Typecheck/build exit1 with only the two baseline nullable
review errors; standalone Vite build passes. Rendered8checks pass after the
harness scoped console errors to this run (the first attempt included an old
sheep-page error). Authoritative visually inspected screenshots are
`carcass-supply-rendered2/success-visible.png` and `failure-visible.png`;
automatic screenshots caught earlier paint frames and are not proof of the
final state. Ordinary forest/river25 runs use frozen
`living-world-carcass-supply-check1`; final source2 adds the correctly displayed
120tick butchery work cost and per-material protection counters. Final
source2 forest/river25 runs both finish at the declared horizon. Immutable130 is captured after
that correction and passes1/1; all nine immutable122–130continuations pass
(`carcass-supply-references.log`,9tests/9files,exit0). Source digest:
`1a87e46dd5571935f034373d7d8d16e8c4b9d37de8137839dc94f69b8cdecb7f`.
No ordinary hide/fat/meat preservation completion is claimed yet.

Final-source forest25 finishes with11alive,331.86seconds,500pure checks,
exact twins/save120 and conservation. Four bodies create16meat/4hide/4fat;
eight meat are eaten, eight lost, and all hide/fat lost. The matching
`carcass-route130-forest` trace retains928samples and10butchery endings. Eight
samples have changed ingredient offers; actual endings remain unchanged.
Examples: at37440 the hide offer loses to sleep/social needs; at38400 it
loses to hearth fuel work. No further missing connection is established by
that trace. A frozen fern60 extension tests the seed that previously had an
actual recovered hide; it is pending, not a claimed positive result.
Final river25 finishes with27alive,451.47seconds,500pure checks, exact
twins/save120 and conservation. Two bodies supply eight meat, three eaten
and five lost; both hides and both fat are lost. Neither final25run makes
preserved meat or rendered fat. Pre-cost-view source1 has the same aggregate
body outcomes (328.63/453.96seconds); its reports remain separately retained.

The separate frozen128 meadow60 trap trace found one real missed encounter:
trap43683 was armed at130197; at130198 deer1292 was inside radius4 and passed
its fixed cycle/deer hash, but only the final tick130797 was tested. This is
concrete support for checking encounters during the existing waiting window
without re-rolling or increasing wildlife. Repair follows rules130; not yet
implemented (`trap-encounter128-meadow/report.json`).

### Trap encounter window — rules131 in verification

The frozen128meadow trace above established a real missed eligible encounter.
Rules131 checks the same first nearby live deer during the existing600tick
armed window, retaining its fixed seed/gear/cycle/deer hash and55% threshold.
A failed deer/cycle outcome never rerolls. Empty resolution ends the window;
late arrival cannot catch until another paid reset. Success consumes one deer
into the existing owned carcass, resolves the trap immediately and records
its catch tick. A distant keeper learns nothing until ordinary observation.
The inspector shows that an early resolved trap is ready now.

No new saved field is added: the existing catchTick records trap resolution.
Validation retains the600tick scheduled deadline and checks actual linked
body ownership/species/time when the body remains. External body loss is
allowed; checking and resetting still cost40work each. The cycle bound uses
that paid reset duration for131traps because an early body may be lost before
the original deadline. Old rules retain final-instant catch and old bounds.

Eight new contracts cover early capture, exact save/continuation, one origin,
empty/late windows, unchanged130, fixed failed outcomes, malformed early
resolution, and paid reset after external loss. The initial expanded red run
had3fail/3pass. First green found validation incorrectly consulting byId
before reload rebuilt it; checking saved piles fixes that. Affected54tests/
7files then passed; final36/4 pass includes130continuation. Typecheck/build
exit1 only for the two baseline nullable review errors; standalone Vite passes.
Rendered8checks pass; `trap-window-rendered2/failure-visible.png` was visually
inspected and shows the retained body plus refused reset. The first page's
success capture is `trap-window-rendered1/success-visible.png`.
Immutable131 was captured from source
`6b2436581d2a683934222612cb6b88506245288bd3188c080fb4fbe1860e8b70`;
its standalone check passes (24.24s). Final Normal arrivals-on forest/river25
in frozen `living-world-trap-window-check1` finish with11/27alive, respectively
642.05/885.81s,500pure checks, exact unobserved twins, exact save plus120tick
continuation and conservation. Neither deploys a trap. Meadow60 remains in
check2 with identical runtime and an observer-only correction: trap catch ticks
no longer emit a spurious zero-fish net story.

Broad131:428files/2620tests pass,17files/37tests fail,2expected failures and
3skips,461.47s. The37 comprise31baseline failures and six timeout failures;
one additional retention suite hook timeout caused the three skips. Running
those four timeout-affected files with unchanged time limits and maxWorkers2
passes9tests plus1expected failure in55.45s. No failing assertion was weakened.
The retained logs are `resume-20261104/trap-window-full1.log` and
`trap-window-timeout-recheck.log`. The explicit128-to131 saved-encounter
upgrade catches one deer into body43684 at130198, but no food is recovered
in2400ticks; that diagnostic is not fresh ordinary-world activation.

The130fern60 extension now completes:28alive,1106.33s,1200pure checks,
exact twins/save120/conservation. Two bodies yield four meat meals and one
hide garment; that garment supplies50001protection ticks and98774.817degree
ticks. The other hide, both fats and four meat portions are lost. There are
11dried-fish and2smoked-fish meals, no preserved meat or rendered fat.
`carcass-supply-check2/fern-60d` closes the ordinary hide route, not reliability.
The predeclared131forest nudge2 at day4 additionally records one fat rendered
and its output consumed by day25 (`aggregate-pre-reserves131/forest-f4-n2`).
The75draw131cohort is still running; these are bounded activation findings.

## 7. Body reserves — rules132 implemented, ordinary/comparison checks running

Pre-implementation parameter choice (implementing agent, 4 November, recorded
before the following implementation): nourishment uses the existing food nutrition unit. Capacity is 24
for children, 36 for youths/adults and 30 for elders. All births, arrivals and
new worlds start at zero; a missing historical field supplies zero benefit.
A paid portion first allocates its nutrition once: below hunger 40, immediate
hunger has priority; otherwise 25% is offered to storage. Unused immediate
capacity also goes to storage. Storage converts at 80% efficiency, capped at
current life-stage capacity. Storage is offered only up to available capacity;
its unused allocation remains available to immediate hunger. Any nutrition left
after both capacities is lost, never duplicated. A portion begun below hunger
40 gives its whole allocation to immediate hunger first (overflow may store).
Hunger expenditure and decision pressure stay unchanged. Only expenditure
below hunger zero can draw reserve, one nutrition unit per unit of deficit;
starvation damage applies only to the uncovered fraction of that tick's
hunger deficit. With zero reserves, the existing starvation damage is unchanged. Thirst,
exposure, injury and exhaustion keep their existing consequences.

Reference bounds, Normal with hunger initially zero, no eating or healing,
comfortable temperature/water/energy: a full adult reserve covers 1200 quiet
awake ticks (0.5 day) or 2181.818 continuous-sleep ticks (0.9091 day). Children
cover 941.176 awake or 1711.230 sleeping ticks; elders 1000 awake or 1818.182
sleeping ticks. The last noninteger tick is only partly covered. Sleeping is
the existing minimum expenditure; work/running/Harsh shorten the bound. These
are added starvation-free nutrition intervals, not guarantees of survival.
Positive health recovery keeps its existing safe-needs conditions and rates,
but consumes one stored nutrition unit per health point actually restored,
never charging for health above 100. Existing rest/sleep increases the rate;
no new healing item or injury/illness redesign is introduced. Reserve capacity
changes never create nutrition. Test actual paid meal routes, initialisation,
different feeding histories, bounds, other harms and exact persistence. Rules
number132 was allocated after the predecessor connections were frozen.

Implementation: `nourishment.ts` owns the finite state, meal allocation,
capacity settlement and debits. The three existing paid eating boundaries
(pack/store, source eating, shared meals) call it only after consumption.
`needs.ts` retains hunger expenditure and gates only shortage damage and
positive recovery; `people.ts` initialises zero; save validation rejects
malformed/out-of-bounds state. World fingerprints include the stored number.
Personal observations and the inspector expose immediate food need separately
from stored nourishment. No new scheduler, inventory or action priority exists.

Verification so far:26focused nutrition contracts plus2access/interrupt
contracts pass. The ten immutable122–131 continuations pass unchanged
(36tests/11files including the26nutrition contracts,15.96s). Immutable132 is
captured from source
`bfb773f5e134dfcd4753d29628052626c3ee4e552a16ce0ad277157d74856f86`
and separately passes. New tests cover six reference age/sleep bounds, partial
last-deficit damage, paid recovery, all eating routes, actual birth/immigration,
full pack, last-portion competition, interruption, age transition, malformed
save, exact mid-meal continuation, pure views and observer balance including
death loss. Initial fixture failures are retained: eating resets sleep pose;
and a ten-tick store bite had already finished before the purported interruption.
The corrected interruption is inside the actual bite and uses a full pack to
leave the portion at its store. No runtime or valid expectation was weakened.

Eight rendered checks pass in `nourishment-rendered1/report.json`. One actual
berry raises immediate hunger by9 and stores2.4;60sleeping recovery ticks
restore1.8health and leave0.6. Continued food-free reference time exhausts
reserves and health falls to6.926. `success-visible2.png` and
`failure-visible.png` were visually inspected. These are labelled staged
reference scenes, not ordinary activation. Typecheck and `npm run build`
remain exit1 only at the two pre-existing nullable review errors; standalone
Vite build passes. Broader `npm test -- --maxWorkers 2` is running.

Fresh review found the old sleeping QA promised health recovery without paid
reserves. A read-only inspector correction now names the missing food or paid
recovery, and preserves old-rule wording. One added view contract and the
immutable132 continuation pass (2/2,17.79s); ten rendered checks pass in
`nourishment-rendered3`, with visually inspected fed/unfed sleep text retained
in `nourishment-rendered2`.
`nourishment-view-source-audit.json` records that `src/sim/inspect.ts` is the
only source difference from the frozen measurement build; all simulation,
decision, lifecycle and persistence source is identical. The original immutable
reference is retained, never rewritten. This brings new132contracts to29.

Frozen `living-world-nourishment-check1` runs the final132forest/river25
ordinary screens and the75draw matched cohort. The nutrition-flow observer
counts only actual paid meals and debits, separates conversion/capacity loss,
and reconciles stored/shortage/recovery/death/remaining nutrition. The forest screen is complete:18alive at day25,856.03s,500pure checks,
exact unobserved twin and120tick saved continuation, with conservation. Its
final save is byte-identical to the separately observed cohort control
(SHA256 0e54c80f2298339c52113831c9e52c57771a72c15777fdd0ac8a4de8aa2e5d5a).
From zero initial reserves,2433paid portions supplied42702nutrition:1607.53
was stored,521.14spent covering shortage and790.10spent on recovery;54.34was
lost at death and241.96remained. The balance error is1.64e-10. These are flow
measurements, not proof of aggregate survival benefit. River also completes:28alive,1011.37s,500pure checks, exact twins/save120
and conservation. Its2699portions supplied47306nutrition;2616.94stored,
310.04spent on shortages,1733.88on recovery,36lost at death and537.03left
(balance error -4.29e-10). It has one completed mating but no birth before
slaughter. The full matched cohort remains pending.
The completed ordinary forest control from the cohort is also loaded unchanged
in `survival_evidence/nourishment-ordinary-view/view.html`: Yusuf has immediate
food28.028, stored nourishment36/36 and health100 while gathering fruit.
The browser confirms exact saved state and conservation; the screenshot and
DOM record are retained there. This illustrates distinct state and continued
food-seeking, not attribution of his survival to reserves.

## Trap catch reporting repair — rules133

The ordinary132forest day2/nudge1 draw caught body17987 at50849 but had no
recovered trap meat or attributable trap meal by day25. Its later check at
58812 incorrectly claimed that a body needed butchering after that body was
lost. The exact observer replay in `trap-food132-replay` reproduces the original
final save and passes save120/conservation. This is a retained failed chain.

The dedicated repair was verified in `living-world-trap-truth-fix` while the
main132broad suite stayed on unchanged source. `carcass.ts` owns the pure
remaining-parts/expiry predicate; `passive_gear.ts` uses it for the paid check's
log under133, preserving132wording. The trap and carcass inspectors distinguish
empty remains. It adds no products, demand, utility, catches or knowledge.
Four regression contracts cover fresh, empty and vanished bodies, old-rule
wording and exact mid-check continuation. The latter changes only the expected
log text when compared with132.29tests in four files pass; the separately run
actual `passive_gear.test.ts` adds20passing tests (the prior command named a
nonexistent `gear.test.ts`, which Vitest did not collect). Six rendered checks
pass in `trap-catch-truth-rendered1`, with both screenshots visually inspected.
Isolated typecheck/build pass; that checkout excludes the unrelated untracked
review files responsible for main's two known type errors.

`trap-report133-replay` replays the same declared ordinary draw freshly under
133. The corrected58812check reports no recoverable catch. The final saved
world equals132after normalizing only the rules number and two specified
trap-report phrases; all other saved state is byte-equivalent. Save120 and
conservation pass. `report.settings` records the reference settings; `newRules`
and the saved world's settings record133. The autonomous simulation reads
person logs only for display (`events.ts` appends; `inspect.ts` reads), so this
reporting repair does not change the physical/numerical132cohort conclusions.
This equivalence does not claim unchanged responses from external controllers
that may read those logs.

Immutable133 is captured from source
`86210bc6355cf48e0d5b5400eaa7b7527d2d1757ec0a967e424f5ee0687301d7`:
ordinary forest3000+120 and a paid check saved halfway through after loss.
Final reference/rules/save/inspector checks pass32tests in four files (45.30s).
A subsequent direct empty-body wording correction is the only source change,
recorded in `resume-20261104/trap-catch-truth-view-source-audit.json`; the final
four contracts plus immutable133 pass5tests in17.08s. No reference was rewritten.

## Final measurement — pending

Compare completed streams 1–7 with the verified starting baseline and reserves
with their immediate predecessor using the
retained P0.1c forest design: 25 draws per condition, matched arrivals-on settings
and declared horizon. Verify retained baseline provenance/completion before use.
Use the documented cross-version comparison, never bypass `gates.ts` rules-version
validation. Include food loss, exposure, fuel/feed/labour and displaced care/work;
bounded activation, reliable uptake and measured benefit remain separate claims.

Declared comparison design (before final treatment results): Normal, arrivals on,
through day 25 (the second winter ends at day 24), 25 draws each in forest, river
and meadow. Per seed: one control; nudges 1–8 at day 4; nudges 1–4 at days 2, 3,
5 and 6. `scripts/survival_ensemble.ts` uses the existing lab nudge operation and
collects whole-horizon age-specific hunger/exposure, ledger, time budgets and
unfinished material/work. These draws share prefixes; do not describe them as
75 independent worlds. Compare within each seed and report the limits of three
terrain/seed contexts. The baseline is frozen at `61cb6e5` with only this observer
runner added. Its forest control reproduced retained P0.1c's hash `ae96c7d7` and
four survivors exactly, with conservation and exact save/continuation checks.
The `b5694c7..61cb6e5` difference is documentation only. All 75 baseline draws
completed and passed `survival_evidence/aggregate-baseline/final-audit.json`:
matching source manifests, within-seed initial hashes, final save hashes,
conservation and recorded exact continuation; all 25 forest hashes match P0.1c.
Day-25 survivor distributions (25 per seed): forest mean 5.56, median 5, range
0–15; river mean 20.72, median 20, range 11–32; meadow mean 29.8, median 30,
range 23–36. These are baseline descriptions, not programme benefit.

The original PowerShell launcher stopped after 61 starts on a locked status
file; its children completed. Most original process exit codes were unavailable,
so retained results were validated directly. The replacement launcher
(`ec9857a`, `scripts/survival_cohort.mjs`) validated those 61 results and completed
14 remaining draws with explicit exit 0 records, then exited 0. Its status-file
write is replaceable and nonfatal. No incomplete run was treated as a success.

The forest subset is complete (all25declared draws per condition). Mean/median/
range day25population: starting121=5.56/5/0-15; pre-reserve131=8.32/8/0-18;
reserves132=5.68/5/2-18. This is an adverse reserve comparison in this forest
sample, not a general benefit claim. Mean immediate-hunger-empty occupancy
is44108.88/33822.44/47334.40 ticks respectively; mean exposure occupancy is
50343.96/45233.44/46483.04. These raw occupancies have different alive-time
denominators, and hunger-empty ticks under132 need not cause damage when
reserves pay the deficit. Complete age-normalized/cost summaries await all
three seeds. No parameter retuning was made in response to these results.

Final-source131meadow60 (	rap-window-check2/meadow-60d) finishes23alive,
2109.52s,1200pure checks, exact twins/save120 and conservation. Two nets
produce27fish;10collected and7attributable direct meals, with2repairs and
15full-pack check endings. No trap is made or deployed. Two sheep are acquired,
5shearings and2feedings finish,1slaughter finishes, and there is no mating/birth.
All8body meat,2hide and2fat are lost; no preserved-meat or rendered-fat output.
This extension supplies no positive evidence for the remaining connections.

## Owner-requested stop and publication checkpoint — 4 November 2026

The owner requested stopping after the current section, committing and pushing
all current work, then merging to main. The current section is the rules133
trap-report repair, completed with four contracts,49affected tests across the
separate runs,32reference/rules/save/inspector tests, six rendered checks and an
exact ordinary replay modulo only the declared reporting/version differences.
A final direct empty-body inspector correction passes the four contracts plus
immutable133 (5tests,17.08s). Its only source difference from the captured
reference is inspect.ts, audited in
`resume-20261104/trap-catch-truth-view-source-audit.json`; original expectations
remain untouched. Isolated final typecheck passes. Main's unrelated review
files retain the previously recorded typecheck/build limitations.

The longer measurements were stopped at the owner's requested boundary.
`survival_evidence/owner-stop-20261104.json` validates all completed final-save
hashes, settings, conservation and continuation flags: baseline75/75,
pre-reserve13148/75, reserves13240/75. Partial draws remain clearly partial.
The132fern60 extension and meat-preservation trace also stopped before their
horizons. The first preservation trace was stopped because its observer kept
mutable references; the replacement copies snapshots and was later interrupted
by the owner stop. Neither partial trace establishes a new causal finding.
The132broad regression was interrupted without a final count; its failures,
timeouts and warning output are retained. It is not reported as passing.

The whole seven-family assignment is not complete: ordinary preserved-meat
meals, attributable trap-meat meals and final-source lamb birth remain open,
as do the complete cross-seed cohort comparisons. The completed25draw forest
subset has the adverse reserve result recorded above. Do not resume further
capability work without a new owner request.

The combined delivery checkout passes `npm run build` (TypeScript plus Vite);
log `resume-20261104/publication-build-isolated.log`. This tracked-checkout
verification excludes the unrelated untracked review files in main.

The pushed delivery branch was fast-forwarded into main. Final merged-main
focused verification passes5tests in2files (5.74s), including immutable133.
Main `npm run typecheck` exits2 with only the two existing nullable errors in
untracked `zz_review_f_plank_diversion.test.ts` and
`zz_review_main_mature_large.test.ts`. Logs are retained as
`publication-main-focused.log` and `publication-main-typecheck.log`.
