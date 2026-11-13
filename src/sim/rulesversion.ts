// Which generation of simulation BEHAVIOUR a world runs under.
//
// Three different version numbers live in this repository and they are not interchangeable:
//
//   * the SAVE FORMAT version (`src/app/save.ts`, currently 5) says how the bytes are written. It changes when the storage
//     changes and says nothing about how anybody behaves.
//   * `settings.dynamics` ('rich' | 'authored' | absent) is a compatibility and configuration distinction: which family of
//     rules a world belongs to. It is not a generation: every rich world since the first has carried the same label while the
//     behaviour underneath it changed many times. That is exactly the problem this module exists to fix.
//   * the RULES VERSION here is the generation of the behaviour itself. Version 1 is the integrated behaviour as it stood when
//     versioning was introduced. A later change to a decision rule or a tuned parameter that is meant to alter outcomes gets
//     version 2, and a world saved as version 1 keeps running version 1's rules.
//
// This module is the only owner of all of that: what the current version is, whether a value is valid, what version a given
// world actually runs, and whether a world is eligible for behaviour introduced at some later version. Nothing else should
// compare a version number to a literal.
import type { Settings, World } from './types';

/**
 * The generation of behaviour new worlds are created with.
 *
 * VERSION 1 is the integrated simulation as it stood on 2026-10-18: mood, hardship, private plans, learning, trades and
 * apprenticeship, the second rich pass (occasions, reputation, illness, theft and barter, the land, the settlement record,
 * temperament, life changes, stories and traditions, crews, mediation, shared responsibilities), the rich-only town
 * corrections, and the project ask as it was written then.
 *
 * VERSION 2 (2026-10-18) adds HOUSEHOLD FOOD PREPARATION and nothing else: an adult may take on a private plan to put a
 * modest food reserve into their own household's home store, set going either by what they can see of their own household's
 * food or by the approach of winter, and carried out with the gathering and depositing that already existed. The whole of it
 * is `src/sim/provision.ts` plus the `stock` plan kind in `src/sim/intent.ts`, and every part of it is gated on
 * `runsRulesVersion(world, 2)`. Nothing else was retuned: winter, lean seasons, hunger, yields, spoilage and starting
 * resources are exactly what version 1 had. A version-1 world continues as version 1, which
 * `tests/v1_continuation.test.ts` holds against a reference recorded before version 2 was written.
 *
 * Raising this number is how a behavioural change is declared. See docs/DEVELOPMENT_POLICY.md, "Rules versions".
 */
// Version 3: actual home occupancy. Version 4: spears and active wolf defence, respecting occupancy.
// Version 5 is not a generation of this build. The unintegrated wolf-habitation-integration candidate used it for a
// mood-ranking correction. Those saves stay with that revision; this build refuses them rather than running them as
// version 4 or as version 6.
// Version 6: a person already at zero health dies through the ordinary death path before passive recovery can undo it.
// Version 7: HOUSEHOLD SHELTER PLANS. An adult whose household they believe has no proper home, and which has already laid
// a site out for one, may take on an ordinary private plan to fetch that site's missing material and carry it there. The
// whole of it is `src/sim/shelter.ts` plus the `shelter` plan kind in `src/sim/intent.ts`, every part gated on
// `runsRulesVersion(world, 7)`. Laying out a site, building, ownership and habitation are unchanged; what changes is that
// the material is now fetched on purpose instead of arriving by chance. Nothing else was retuned.
// Version 8: THE ORE HUNT REACHES ORE. Worldgen places ore veins 24-46 tiles out under stony ground; exploration sampled
// radius 11 -> 24 + 10*curiosity for every reason, so a hunt bent on finding ore never reached the band and an ordinary
// world smelted no iron (measured: a 160-day run builds a kiln, a bakery and a yard but no smithy). In `src/sim/options_work.ts`
// an ore hunt (depositLead's lead) now samples the band itself (radius 24 -> 44 + 6*curiosity) and leans toward stony
// ground. Nothing else was retuned; idle wander, water hunts and timber hunts sample exactly where they always did.
// Version 9: WARMTH AND SHELTER. A household of one may lay out a hut, not just a household of two or more: the labour
// and the materials never needed a crew, only the rule did (src/sim/options_work.ts). And the cold presses less hard on
// everyone: the warmth drive starts at 46 instead of 52 (so a person working outside in a light cold lets themselves sit
// a little colder instead of interrupting the work to warm up), and a fire at close range warms like a hut wall (13
// degrees at the peak instead of 9, src/sim/needs.ts). Drives and the fire both take their version-9 readings only in a
// version-9 world; a version-8 world keeps the same pressure and the same fires.
// Version 10: THE SMITHY'S FUEL. A standing smithy is a standing want for charcoal. Before this, charcoal was only ever
// wanted as the transitive ingredient of a personal iron-tool plan - a worn tool in the hand, a hammer, a forge plan,
// then the fuelled batch - and in an ordinary world that personal chain never completed end to end (measured: a 160-day
// run builds a kiln and a smithy but never makes charcoal, iron_batch 0). In `demandsOf` (src/sim/production.ts),
// somebody who knows a standing smithy now wants charcoal kept stocked, so the kiln's idle time goes to firing it and
// smelting and forging are not blocked on the fuel. Nothing else was retuned, and the want is only in a version-10
// world: a version-9 world keeps the same demands as before.
// Version 28: SPARE TIME. A person with nothing pressing had one fallback, potter about near their own door at a fixed score, so
// free time was the same few steps from home every time. From version 28 it is several places they know (their door, the
// square, the water's edge, a stand of trees), tilted a little by a change of scene, a personal favourite spot, the evening
// gathering for the sociable, and the walk. Only the idle fallback changed (src/sim/leisure.ts); survival, work, plans,
// moods and every other option are exactly version 27's, and a version-27 world keeps its single fallback.
// Version 29: event participants are snapshots. Later crew membership changes no longer
// rewrite formation events or change historical story eligibility after save/load.
// Version 30: pending layout claims, one home layout per household, and bounded
// waiting for a temporary footprint occupant without relaxing access validation.
// Version 31: personal work tastes settle close work choices, integrated after layout coordination.
// Version 32: observer-facing truth. A stalled site's "waiting for materials" reason is derived from the
// ledger (required minus delivered minus used), and a person logs it when a source they believed held
// 2+ units is re-sighted bare or at most half full (src/sim/knowledge.ts).
// Version 33: leave the heaviest left-over. A person whose hands are too full of wood or stone for a gather they want to start
// may go and leave the heaviest such left-over (nothing of theirs asks for it) at a storehouse or shared workplace they know,
// through the ordinary deposit (src/sim/leave_heaviest.ts). No other option, score or threshold changes.
// Version 34: reconsider a private plan when it cannot be fed. A material-fetch plan whose material the person knows no source
// of, and no one has promised to bring, is relinquished with that reason instead of being retried forever (src/sim/intent.ts).
// Version 35: a member who left a crew over a grievance against one of its members is not readmitted while that grievance
// persists, so departure and re-entry no longer contradict each other in the same maintenance cycle (src/sim/crews.ts).
// Version 36: unfinished tool plans yield carried material to the known household home after a day.
// Version 37: a full pack can deliver a partial household shelter batch through ordinary hauling.
// Version 38: witnessed construction satisfaction and a new unfulfilled hope after three days of fulfilment.
// Version 39: personal trust selects among feasible helpers for a tool plan's material ask.
// Version 40: remembered own/shared raw-material stores support plans and delivery promises.
// Version 41: a wanted technique can prompt a learner to request timed instruction.
// Version 42: one personally received benefit per witnessed public storehouse project.
// Version 43: repeated personally heard material demand informs feasible trade choices.
// Version 44: varied starting skill backgrounds and non-universal adult technique knowledge.
// Version 45: an empty-handed food helper may promise the food kind they personally know a source of (src/sim/food_help.ts).
// Version 46: a winter reserve of two days' eating put by in what keeps, and the granary's bins feed the households that filled them (src/sim/provision.ts).
// Version 47: a pre-winter cue nudges laying out, finishing and mending the household's own home, and a home is not blocked by
// the household's workshop site, the open-site cap or the stale-site sweep while the window is open (src/sim/winter_shelter.ts).
// Version 48: a promise to a person names the asker's home as the agreed place to leave it, and a kept promise leans the next ask (src/sim/delivery_place.ts).
// Version 49: a meal from a witnessed public storehouse is a personal benefit received, counted once by what left the store (src/sim/civic_benefit.ts).
// Version 50: a private batch plan sees a wanted workshop product through from input to use (src/sim/batch_plan.ts).
// Version 51: an unmet ask for a material is remembered as a customer, supplied later as a swap or gift, and the return read by the trade review (src/sim/customers.ts).
// Version 52: smelting and forging are held procedures after charcoal, taught the same way, and worked out by costly trial when nobody is there to teach them (src/sim/techniques.ts).
// Version 53: a dead member's unfinished undertaking may be taken up by a survivor who knows of the death, and keeping winter stores is a practice learned through the winter's meals (src/sim/succession.ts, src/sim/winter_practice.ts).
// Version 54: relocation by the consenting part of a household (stayers keep the old home; the travellers found a new household), succession of a dead or departed organiser, a return when the destination fails, and a bounded search for a traveller out of contact (src/sim/relocation.ts).
// Version 55: what a person has carried to sites is the ground for wanting a cart, a cart serves the household's food reserve and batch plans beyond the building site, and a loaded cart left standing is recovered (src/sim/transport.ts).
// Version 56: childcare promises use communicated or personally known locations; watching keeps physical contact and revalidates the helper's food/water reserves (responsibilities.ts).
// Version 57: a required tool exposed by wanted workshop work connects to ordinary hand-tool materials, plans and crafting (options_work.ts).
// Version 58: spare seed can be physically stored at a remembered household home to free a blocked material trip (seed_storage.ts); hand-tool capacity counts consumed inputs (act_build.ts).
// Version 59: a wanted handcart its maker can build is the batch taken on before the site materials it is wanted to haul (src/sim/cart_priority.ts).
// Version 60: batch plans choose the same held/rack-tool recipe as their offered production steps, including precursors.
// Version 61: required workshop tools are revalidated every work tick; paused owned batches request replacement tools.
// Version 62: same-room gifts remain indoors, contact is revalidated during hand-over, and zero receipt grants no fed cooldown.
// Version 63: a personally failed full-pack food hand-over can use a known household store, preserving reserves and access.
// Version 64: a required workshop tool takes precedence over a missing convenience tool.
// Version 65: retain a still-eligible running source, stock or drinking destination beyond
// the short candidate list so ordinary activity review can score it honestly.
// Version 66: personally remembered indoor need can lead a resident back through their own entrance for care.
// Version 67: residents drink actual stored household water without loading their packs.
// Version 68: a failed water hand-over can lead to physical household-store provision.
// Version 69: bounded personally derived prerequisite projects span workshops.
// Version 70: personal daily preferences earned by repeated completed activities.
// Version 71: personally estimated work amounts and spells preserve return/duty margins.
// Version 72: bounded personal trip provisioning and retained work purpose across need breaks.
// Version 73: personally failed material trips can retain their purpose at bounded legal alternative sources.
// Version 74: bounded source-specific gathering experience and firsthand correction of empty-source expectations.
// Version 75: failed gathering travel cannot observe remote stock or blame a remote last taker.
// Version 76: bounded personally experienced route failures and successful-arrival correction.
// Version 77: corrected route history no longer blocks promises or adds water/depletion-news penalties.
// Version 78: direct material receipts retain task evidence and influence eligible later project-helper choices.
// Version 79: witnessed completion of an agreed watch informs eligible later childcare requests.
// Version 80: promise completion knowledge requires local observation or an acknowledged personal report.
// Version 81: failed promise attempts retain personal evidence; deadline outcomes require a real report.
// Version 82: heard agreements and personal outcomes govern expectations; remote death is not personal knowledge.
// Version 83: local target evidence ends impossible promises and is explained through actual contact.
// Version 84: requester-observed target changes support actual cancellation and acknowledgement.
// Version 85: settle supplied building shares promptly; explain remaining failed attempts and negotiate one bounded extension.
// Rules 86: persistent local productive condition, observed source choice and physical field rest/care.
// Rules 87: finite natural water, actual draws, weather recharge/loss and personal access memories.
// Rules 88: durable flood ground, dated local warnings and physical access recovery.
// Rules 89: newly paid timber offcuts become owned, collectable fire fuel.
// Rules 90: ended meals retain owned food at the site for actual, capacity-limited recovery.
// Rules 91: private heard meeting arrangements and actual update conversations.
// Rules 92: personally communicated work informs succession without remote state disclosure.
// Rules 93: physically held estates preserve household and registered tool custody.
// Rules 94: explicit living-worker handover, personal continuation and agreed handback.
// Rules 95: acquire real supplies for personally observed resident care.
// Rules 96: heard fire duties obtain uncommitted fuel through ordinary work.
// Rules 97: actual recovery handback and retained paid watch progress.
// Rules 98: heard repair destinations and lawful wood-fallback preparation.
// Rules 99: prepared project steps are finished; same-workshop output counts as stock.
// Rules 100: heard household supply leaves a reserve to its teller and picks complementary site materials.
// Rules 101: personally heard promises count against the asker's own fetching until the spoken time.
// Rules 102: a roof already promised is not promised again; one patch keeps one promise.
// Rules 103: a bounded personal ledger of recent decisions and what became of them, for the inspector.
// Rules 104: household undertakings are told at a real shared supper.
// Rules 105: a present neighbour can be asked where a promised person is.
// Rules 106: care for a dependant out of sight is decided from how they looked when last seen.
// Rules 107: a first-hand account of a place, checked in person, is grounds about its teller.
// Rules 108: home layout follows personal housing knowledge; physical allocation rejects duplicates.
// Rules 109: known fully supplied construction remains available through its final work.
// Rules 110: water searches retain their need, explore from the searcher's position and may answer critical thirst after dark.
// Rules 111: a physically admitted guest retains the option to finish the gathering already underway.
// Rules 112: an occasion resumes after conversation through its own validity checks, retaining participation progress.
// Rules 113: wild-grain seed conversion requires its actual carried grain input.
// Rules 114: personally known ripe household grain remains harvestable as a hunger response.
// Rules 115 retains immediate hand-tool prerequisite inputs through project preparation.
// Rules 116: a paused ordinary activity that cannot resume, or is cancelled while paused, reaches the common ending path.
// Rules 117: project acquisition does not subtract carried inputs from a remaining quantity twice.
// Rules 118: critical water-search cooldown, reachable tilling, harvest capacity and feasible tool adoption.
// Version 119: feasible personal intentions, truthful lived outcomes and continuing company (PAVEL_LIVED_LIFE.md; numbered 117 before integration).
// Version 120: childhood time, small-pack food returns and portable routine measurements (TALIA_LIVED_CHILDHOOD.md; numbered 119 before integration).
// Version 121: resumed gathering retains the outcome of already paid food acquisition (numbered 120 before integration).
// Version 122: bounded fish/meat drying and smoking through physical facility batches.
// Version 123: paid indoor hearth fittings, delivered fuel and finite heat for actual occupants.
// Version 124: paid fibre insulation, finite textile condition and personal sleeping gear.
// Version 125: finite physical carcasses and paid butchery.
// Version 126: paid deployed traps and nets draw from finite existing stocks.
// Version 127: bounded witnessed deer grounds guide physical trap placement.
// Version 128: retain the selected trap journey alongside newer sighting alternatives.
// Version 129: physically kept sheep with finite upkeep, wool and carcasses.
// Version 130: known finite body parts can supply existing recipe goals.
// Version 131: actual deer encounters resolve during the paid armed trap window.
// Version 132: paid finite bodily nourishment bridges deficits and pays for recovery.
// Version133: a paid trap check distinguishes a historical catch from recoverable remains.
// Version134: constructed shallow wells draw from the existing finite water budget.
// Version135: private cool cellars connect paid storage to actual meals.
// Version136: carry spare raw materials to communal stores and restock from known sources.
// Version137: living cuttings and deliberate tree planting.
// Version138: paid batch mines and separate hand-powered grain mills.
// Version139: paid brewing and physically shared adult meal drinks.
// Version140: owned fishing rods connect paid crafting to active fishing.
// Version141: experienced danger places and locally learned grave visits.
// Version142: paid skill coaching and learning through co-present work.
// Version143: voluntary shared workshop proposals use the existing local council.
// Version144: bounded observer final accounts and truthful shared-layout events.
// Version145: mood cannot lift idle time over an otherwise preferred survival action.
// Version146: living cuttings also wither in packs and carts.
// Version147: debris retains every tool identity, including rods and capture gear.
// Version148: projects honor adoption-order carried claims after outstanding promises.
// Version149: paid ingredient-sized butchery and bounded collection wait for one's preservation batch.
// Version150: recover a checked known trap catch before attempting to reset.
// Version151: compare known food routes with slaughter plus paid recovery before killing sheep.
// Version152: a household lays out its cool store only after it has a proper (solid) home.
// Version153: a remembered net catch waits for pack room; an empty-handed check fails instead of repeating.
// Version154: food trips and news weigh a told place by the listener's own checks of its teller (not by age alone).
// Version155: a paused care acquisition cancelled with its purpose ends through the common ending path.
// Version156: children do not chop wood or break stone; offered, chosen, started and resumed work alike.
// Version157: a hand-over that moved nothing says why (giver no longer had it / recipient already holds food / no room);
//   only a real full pack sends a carer to leave food at home (handover_outcome.ts).
// Version158: a hunger-serving gather or ask yields to eating food in the pack when that scores higher (eat_in_hand.ts).
// Version159: a hungry recipient whose pack has no room is fed by hand by the carer (hand_feeding.ts).
// Version160: a loaded world lists each static grid cell in ascending id order, as a live one does (save.ts); live behaviour unchanged.
// Version161: a gatherer who leaves a place because it now looks empty says so, not "something better came up" (found_empty.ts); reason text only.
// Version162: stone has somewhere to be kept and a way to get there (shared_stone.ts): a settlement with a solid home lays out its first storehouse without the food or temperament gate and outside the open-site cap, a quarry yard one may draw from is a place to collect stone, stone is carried from it to the public storehouse (aim 16), and a store holding the stone a building costs makes that building more attractive.
// Version163: a dissolved household's estate parcels pass to the household its last member joined, or become shared property when the last member died; the parcel's tools change owner with it (estate_release.ts).
// Version164: a proposal to share a life or a home is made from the proposer's own feelings and beliefs, not from the other person's private regard or the true state of their household's home (proposal_belief.ts).
// Version165: a fever that has reached severity 0.5 is a visible sign (SeenEntity.feverish), and the cautious keep their distance from what they saw, not from the other person's live illness record (fever_sign.ts).
// Version166: how hungry or thirsty a stranger is, for a spontaneous offer of food or water, is what the signs show (hungry and starving, thirsty and parched), not their exact figure (visible_need.ts).
// Version167: a carerless child is taken in only by an adult who has seen them or been told where they are; the distance is to that place, not the child's true coordinates (known_adoption.ts). An unknown child stays, and the household history says so.
// Version168: a laid-up adult asks a neighbour to watch a child only when that neighbour has seen the child or been told where they are (known_handover.ts). A stranger is not asked, and the inspector says so.
// Version169: a sight of a store, a cart or a pile remembers which kinds are there and whether it looked full, not the exact counts (seen_stock.ts). Textile kinds stay exact, because the clothing check compares them with the textile observation.
// Version170: a worry about someone who is gone from the register is kept until the worrier has learned the death or the worry is too old (known_worry.ts). The deceased list is not that news. The visit, if started, still finds them gone and does not teach the death.
// Version171: where someone would be looked for at home is a room the searcher was told, or the searcher's own household when the person is their child, partner or parent (known_home.ts). The target's live household id is not that knowledge.
// Version172: the recruit cap counts the asker's own help on that site plus distinct help they still remember as promised (heard_helpers.ts). It does not walk every living person's true commitment. The accept path still uses that true count.
// Version173: a dependant in sight is judged from the signs a bystander can see (starving, hungry, parched, thirsty, cold), not from their live hunger, thirst and warmth (seen_dependant.ts, knownNeeds). Out of sight stays rules 106. Those signs can read a starving child as merely past the visible threshold. No benefit is claimed.
// Version174: a strictly newer empty report of a berry bush, fruit tree, wild grain or fishing spot can correct a positive belief without the 200-tick gap (empty_news.ts). One tick is enough. An older or equal-time empty report leaves the existing belief. A received report stays hearsay. No benefit is claimed.
// Version175: an empty correction is recorded only when the listener's belief changes. A newer empty observation can be offered inside the cooldown of an earlier positive telling of that place (empty_news.ts, newsTold). The same rejected observation is not offered again until that cooldown passes (newsHeld). No benefit is claimed.
// Version176: a fresh empty sight of a food place, and a report of one, can be told without a personal failed gather (empty_news.ts). The sighting stays news for the same 1,100 ticks, counted from when it was seen, not from when it was repeated. No benefit is claimed.
// Version177: the granary's emergency ration for a hungry housemate is decided from what the person knows of that housemate (known_ration.ts, knownNeeds): a child by age, or one in sight and visibly hurt, seen starving. A remembered hungry note or an unseen child no longer qualifies. Their own hunger is unchanged. This can withhold the extra ration from a starving child out of sight. No benefit is claimed.
// Version178: the candidate's "enough hands already" refusal of a recruit counts the hands they know of (known_hands.ts): their own help on the site, help they remember being promised there, and people they see building or hauling within 4 tiles of it. Before 178 it counted every living person's commitment to the site. A candidate who knows of no one is no longer refused on the true count. No benefit is claimed.
// Version179: a worry about someone out of sight is kept or dropped on what the worrier knows (known_welfare.ts, welfare.ts): a child by age, or a worry whose kind is hurt, counts as unable to manage alone, instead of the subject's live health; a bereaved worry ends by age alone, not by the subject's live life event. This can drop an old worry about an adult who has since been hurt out of sight. No benefit is claimed.
// Version180: a laid-up person counts an able adult at home only if they can see one (known_able.ts, childrenNeedingWatch): an adult or elder housemate in sight whose sight shows neither hurt nor feverish. Before 180 it read every housemate's live injury, illness and health. A housemate out of sight no longer suppresses the list of children needing a watch. No benefit is claimed.
// Version181: a crowd is the people one knows of (known_crowd.ts, facilityWants): the person feels a crowd when they know of at least two dozen people, counting themselves and every person they hold a relation with whose death they have not learned, instead of the world's live count. A newcomer or anyone who has met few people no longer counts a crowd, so the hall want can come later. No benefit is claimed.
// Version182: a grievance remembers the event that caused it (causal_events.ts, first slice of gap G01): where a broken promise, a refusal that makes the feed, a contest lost on a feed day or an argument also records an event, that event's id is kept on the grievance and on the relation history notes written for it. Nothing reads the id yet, so no decision changes. A theft is not linked. No benefit is claimed.
// Version183: a witness has to be able to see (witness_sight.ts, gap G17): at a theft (misdeeds.ts), a gift, help or quarrel (social.ts witness) and a birth, death, partnership or taking-in (reputation.ts noteDeedNear) a person counts as a witness only if they are in the same space as the one who acted and within the smaller of the old radius and their own sense radius, which shrinks in the dark and in rain. Fewer witnesses at night and through walls, so fewer stories start. No benefit is claimed.
// Version184: the contents of a home are learned from inside or at the door (home_interior.ts, gap G19, the remainder of rules 169): when a person sees a hut or house from outside and is not within two tiles of it, their belief keeps what they already believed of its store, racked tools, textile stock and gear stock instead of copying the true contents. Existence, type, household and condition are still learned from outside; stores and workplaces are not touched. No benefit is claimed.
// Version185: a township keeps a record of how far its building has reached (township_extent.ts, first slice of gap G150): when a site is finished for a member household or for one of the township's shared projects, the township's extent grows to cover the footprint and counts the completion. Earlier buildings are not counted. Nothing reads it for a decision; it is not a border. No benefit is claimed.
// Version186: a shared building remembers everyone who built it (shared_builders.ts): a building finished as a township's shared project lists every participant who gave work or materials, then the finisher, where before it listed the finisher alone because builder shares are keyed by household. Written after the completion aftermath, so nobody's response changes. Other buildings still record the finisher, and the inspector now says "Finished by" for those. No benefit is claimed.
// Version187: an answer to a help-build ask keeps the term that decided it (answer_cause.ts): the request, the participation record and the council decision also hold `answerWhy`, the one term of the answer rule without which the answer would have gone the other way (kin, what they have seen of the organiser's shared work, fondness, their own needs, the draw), or that it was or was not in their nature. The answer is computed as before and nothing reads the text. No benefit is claimed.
// Version188: what was taken, from where, and where salvage for a shared building came from (taken_from.ts, first slice of gap G133): the taking log names the goods and the place instead of "1 item from storage", the person keeps their last taking, and goods of a kind taken from a pile within half a day and delivered to a township's shared project leave a line on the participation record, printed in the project history. Nothing reads it for a decision. No benefit is claimed.
// Version189: unused (claimed by the gap stream in docs/RULES_RANGES.md and not landed; a gap in the numbering is legal, as 5 is).
// Version190: a grave is never dug in a doorway (grave_site.ts, killPerson in lifecycle.ts): the grave marking a death goes on the nearest free tile that is not the door tile of a standing building or of a laid-out site, where before it could take the door and shut the people inside in for good ("home exit is blocked") and everyone else out. Nothing else about a death changes. No benefit is claimed.
// Version191: the feed line for a laid-out site says who it is for from the site that was made (layout_words.ts, plan_site in act_build.ts; end-to-end trace link 4): a site that belongs to no household (a storehouse made public by its township, a well) reads "for shared use", where before the line named the actor's household beside the same tick's "proposed a shared storehouse". Text only; nothing reads it. No benefit is claimed.
// Version192: the settlement's first storehouse is wanted from what the person knows (shared_stone.ts knownSolidHomeNear and noKnownStorehouseNear, firstStorehouseWanted in options_work.ts; gap G32, end-to-end trace links 2, 9, 18, 21, 24): the cue is a solid home the person believes stands in the settlement and no storehouse, standing or laid out, that they believe in, where before it read the world's buildings and sites; the reason names the home and says they know of no store. A site they still believe in that is gone holds them back until they see the spot; one they have not seen lets them try, and the world refuses at the spot. No benefit is claimed.
// Version193: a hut is not held back by the larder (hut_before_larder.ts, optPlanBuild in options_work.ts; owner's chat instruction of 11 November 2026, revising the food-first gate of rules 7): a household in a lean-to lays out a hut when it knows three trees and a rock, whatever the store holds, where before it wanted three food per member to hand. The person's own hunger and thirst gate, the hut's pull from a full larder and the private food and shelter plans are unchanged.
// Version194: an argument does not start with somebody already arguing (argue_once.ts, startArgument in social.ts): a second argument used to overwrite the held slot of suspendActivity, and the activity paused for the first argument vanished without an ending (found by tests/suspended_scan.test.ts at the 193 head, Alma's meal at river tick 7,262). At 194 startArgument returns before anything when either party's current activity is an argument.
// Version195: a manageable ordinary metabolism (metabolism.ts, read by needs.ts updateNeeds, action_scope.ts, optutil.ts and relief.ts): the base hunger and thirst drains of a rich world are 0.024 and 0.032 a tick instead of 0.03 and 0.04 (the moderate candidate the screening lab found sufficient) (the owner's survival-pressure rebalance brief of 11 November 2026, measured in the paired lab first: docs/ORDINARY_METABOLISM.md). Every multiplier, threshold, the critical-need filter, starvation, dehydration and exposure are unchanged.
// Version196: a shared project never takes a thirteenth participant (project_room.ts, recordProjectResponse in townships.ts): two asks in flight could both pass canInvite's cap of twelve and both land, and validateTownships then refused the save for good (found by tests/save_told.test.ts at the 195 head, told-beliefs-legacy tick 12,031). At 196 a late answer from somebody not on the record is not recorded when twelve already are.
// Version200: room for company, five separately switched parts (company.ts): a childhood or learning ask carries a request's urgency in the stop-and-talk roll and an approach is committed for its walk (social.ts acceptsTalk, options_social.ts mkSocial); the coaching ask is also open when no drive is pressing (options_social.ts); the invitation to a shared meal may be made from 0.35 of the day, and the food the host believes their home store holds counts toward it, with the walk home to take it before the table is laid (meals.ts); with no hall the market is called at the fire once four households live here and the day is the sixth or later (occasions.ts). 197 to 199 are unused.
// Version201: the first timber yard a person knows of is laid out as a shared project (shared_yard.ts, the workshop planner in production.ts), so that the township may use it; a later yard is private as before. And a household's site that has stood waiting provokes the ask for what it lacks (stalled_ask.ts, optRequest in options_social.ts): from half a day the ask gains weight, from a day it is made even beside a quick trip of the asker's own.
// Version202: a swap that feeds and a fire kept for the gathering, two separately switched parts (swap_and_fire.ts): a swap for food is scored by the walk it saves to known food (options_social.ts optTrade); a fire with an occasion or the person's own meal called at it is worth feeding from 400 believed fuel (options_work.ts), and a host with no wood may ask a neighbour to keep it (options_social.ts).
// Version203: a household's first roof does not wait for the settlement's site cap (home_first.ts; optPlanBuild in options_work.ts and siteConflict in act_build.ts): a hut for a household without a solid home and a lean-to for the homeless pass the four-open-sites cap, on the owner's instruction after an elder was refused a hut three times in two lived days; and the two life-stream parts the rules-202 attribution lab put on the wrong side are retired from 203 on: the shared first timber yard (201) and the walk a food swap saves (202).
// Version204: a basket is worth getting, three separately switched parts (carry_more.ts; wantedTool, the tool's material need, craftOption and optDepositFood in options_work.ts), on the owner's instruction that carrying more be attractive in itself and not gated on a count: every grown person without a basket wants one (before, only after gathering more than six units); the wood trip and the making score 8 more than for another tool; and when the basket's wood does not fit in the pack, bringing food home is worth 10 more and one spare portion is enough. Rules 203 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version205: a pack that is put down, two separately switched parts (light_pack.ts, pack_materials.ts; optDepositFood and the site haul in options_work.ts, optEat in options_survival.ts), on the owner's instruction: a person with a home store they know keeps one portion of food on them, takes the rest home (worth 8 more, and up to 10 more as the pack fills), and keeps that portion for the road while there is food known at home, home is within 240 ticks and hunger is above 30; a delivery to a site gains up to 10 as the pack fills, and wood and stone nothing of theirs needs is put down in the home store from a pack three quarters full. Water is not carried and has no rule. Rules 204 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version206: the ration is two portions (light_pack.ts rationPortions; optDepositFood in options_work.ts and the eat_store handler in act_resource.ts read it), on the owner's suggestion after the rules-205 lab showed the one-portion ration costing hunger time and child play: a person with a home store keeps two portions and takes home what is beyond them; the portion held for the road is still the last one; a meal at a store leaves up to two. Rules 205 keeps one. Rules 204 and earlier, authored worlds and the switch thrown keep the old behaviour.
// Version207: a workplace is open to everyone (open_workplaces.ts; accessLevel in facilities.ts, mayUseBelief in production.ts, knownGranary in provision.ts), on the owner's instruction: anyone may use any timber yard, quarry, kiln, smithy, bakery, granary, food rack, mine, mill, brewery or hall they know of, whoever built it; somebody with no earned access comes in as a guest, so what they bring and make is theirs and the workplace's own stock, and each household's share in a granary, stay as they were. Raising a workplace was already open to anyone. Rules 206 and earlier, authored worlds and the switch thrown keep the old behaviour.
// Version208: children are exempt from the ration (light_pack.ts rationApplies; optDepositFood in options_work.ts, optEat in options_survival.ts, the eat_store handler in act_resource.ts), on the owner's instruction after the child's-day probe showed under-twelves carrying food home more than twice as often under it: from 208 nobody under twelve is held to the ration; they keep, carry home and eat food as before rules 205. Rules 205 to 207 apply it to everyone. The switch thrown is rules 207.
// Version210 (209 unused, the last of the carrying stream's claim): being shown, phase 1 of the childhood plan, three separately switched parts (shown.ts; wantsChildTime, childTimeProblem, beginChildTime and finishChildTime in childhood.ts): a child told "I cannot teach you more about foraging yet" does not ask that person for practice again for three days; a child of seven or more, at least a year older than the asker, may be asked and may give practice on a grown person's terms; and a teacher who cannot teach more foraging shows fishing, then farming, where they know more, with the same paid time and gain. Rules 208 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version211: more ways to play, phase 2 of the childhood plan, two separately switched parts (play.ts; childhood.ts, the childhood ask in options_social.ts, the idle option in options_work.ts, the wander handler in act_misc.ts): chase, hide and seek and playing house join the guessing game between two children, each with its own once-a-day limit for each child, the asker proposing a game they have not played today and the one asked declining only if they have played that game; and a child with nothing pressing may skip stones at the water, watch bugs among the leaves or build with sticks near home, each once a day, with a small lift of mood and a small seed of fishing, foraging or building skill. Rules 210 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version212: a little one walks at a little one's pace (child_pace.ts, used by moveSpeed in activities.ts): under seven, 0.72 of a grown person's pace instead of the 0.88 every under-twelve had; a child of seven to eleven keeps 0.88. One switched part. Rules 211 and earlier, authored worlds and the switch thrown keep 0.88.
// Version213: the three ages of childhood, phase 3 of the childhood plan, four separately switched parts (three_ages.ts; the option filter in decision.ts, the gather handler in act_resource.ts, the practice in childhood.ts): a little one (under seven) gathers no food; a child of seven to eleven gathers only a kind of food somebody has shown them (`p.shown`, recorded from a completed practice) and rests from gathering six times as long as a stretch of it took; and what gathering teaches a child is scaled by age. A child whose hunger is critical is not held by any of these. Rules 212 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version214: feeding the children who no longer feed themselves (child_feeding.ts; the care option and the provider pull in options_work.ts, the hand-overs in social.ts and welfare.ts), two separately switched parts: a carer keeps a child under twelve on a meal rhythm from their own memory of when they last fed them (fedby:<id>), a meal due every 800 ticks counting as hunger 60 whether or not the child looks hungry; and the pull to put food by for the household grows by 4 for each under-twelve in it. Rules 213 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version215: toys (toys.ts; the craft step in act_build.ts, the hand-over in social.ts, the play in act_misc.ts and options_work.ts), a new kind of owned equipment 'toy' and three separately switched parts: a grown person with a piece of wood of their own carves a toy for an under-twelve of their household who has none (1 wood, 40 ticks of work, no more than one each two days); somebody holding a toy hands it to such a child they can see, and the child remembers who gave it; and a child holding a toy plays with it near home once a day. Rules 214 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version216: the evening fire and a story told (evening_fire.ts; offered in options_work.ts, the sitting in act_misc.ts), two separately switched parts: from the evening until their own bedtime, anyone fed, watered and not worn out may sit by a lit fire they know near home, once an evening, worth more the more people are sitting there, and when it is finished it is company (the want of company eases, more for each other person there, and they come to know each other a little); and halfway through a sitting an elder there, or failing one a grown person of thirty or more, tells a story the settlement remembers, chosen for the youngest listener, once a day for each teller, and the listeners are glad of it, a child most. Rules 215 and earlier, authored worlds and a switch thrown keep the old behaviour.
// Version220: lean years (lean_years.ts; the roll in hardship.ts updateHardship), the seasons stream; 217 to 219 were claimed by the childhood stream and are unused. A lean season no longer may begin on any day with one chance in five: a world has lean years, the first its second or third year and each one after two or three years later, fixed by the seed; in a lean year one lean season begins on a day before winter sets in and runs its three to six days as before, and no dry spell begins that year; in other years no lean season begins. Nothing new is saved. Rules 216 and earlier, authored worlds and the switch thrown keep the daily roll.
// Version225: no fixed ceiling on a settlement (growth_room.ts; read through rules.ts rulesOf), the growth stream; 221 to 224 stay with the seasons stream and are unused. Four separately switched parts: no number of living people stops a conception or an arrival (the food, roofs, partner and home conditions are unchanged); no count of open ordinary sites turns a new one away (a household still lays out one of its own at a time); improvement projects under way at once number one for every 14 living people, never fewer than before; and a settlement may hold one workplace of each kind for every 28 living people, never fewer than before. Nothing new is saved. Rules 224 and earlier, authored worlds and a switch thrown keep the limits of rules.ts as they were.
// Version226: more food from the same land (plenty.ts; read in sources.ts updateSources, farming.ts updatePlots and knowledge.ts estimatedAmount), the growth stream, two separately switched parts: wild food (berries, fruit, fish, wild grain) comes back twice as fast, a place holding no more than it did, and what a person expects of a place not seen for a while follows the same pace; and a ripened field plot carries twice the grain, with the same seed, time and work. Lean seasons, dry spells and winter cut the larger amount by the fractions they always did. Nothing new is saved. Rules 225 and earlier, authored worlds and a switch thrown keep the old amounts.
// Version227: a job begun is finished (finish_job.ts; read in decision.ts reviewActivity and options_social.ts), the growth stream, three separately switched parts: somebody who has arrived and is at the work of a job (gathering, building, mending, making, field work, work at a workplace, carrying in and out) takes no second look at what else they might do, until the work ends, a danger is in sight or remembered close by, a need is critical, the job is stuck or it has run 800 ticks since it was chosen; somebody asleep takes no second look either unless a need is critical or such a danger is known; and nobody walks up to a person they can see is at work to chat, to ask for family time or to ask for a game. Walking to a job is not held; asking, warning, offering and teaching are unchanged. Nothing new is saved. Rules 226 and earlier, authored worlds and a switch thrown keep the second look and the approach as they were.
// Version228: a child may ask, and the grown person decides (parent_decides.ts; read in options_social.ts and childhood.ts beginChildTime), the growth stream, two separately switched parts: a child may ask a grown relative seen at work for family time (the quiet part of rules 227 still keeps chats and games away); and a grown person asked for family time with a job in hand weighs the job, at the utility it was chosen with, against the child, at 20 plus up to 10 for a sociable and 6 for a generous person plus 4 for each day since the two last had family time to at most three, and says "not now" when the job counts for more. Nothing new is saved. Rules 227 and earlier, authored worlds and a switch thrown keep the approach and the answer as they were.
// Version229: what a waiting site lacks gets made (site_supply.ts; read in production.ts demandsOf, supply and productionOptions), the growth stream, three separately switched parts: a made material (planks, bricks) that a building site the person knows is waiting for counts for 18 more than the site's wood and stone, which brings the first step toward it to about the middle of ordinary work; somebody carrying a saw who knows a timber yard they may use with none on its rack is offered to leave it there, where it is the settlement's and whoever saws uses it; and the rule of rules 33 (leave the heaviest left-over of wood or stone to free the hands) also applies to the clay and wood a workshop needs for a site's planks and bricks. Nothing new is saved. Rules 228 and earlier, authored worlds and a switch thrown keep the weights, the saw in its maker's pack and the refusal as they were.
// Version230: the worth of a made material a site waits for is halved (site_supply.ts madeForSiteDose: 18 at rules 229, 9 from rules 230), the growth stream, on the owner's word after the rules-229 lab, which found the part bringing the first hall forward but costing upkeep (building condition 61.0 against 66.1 without it, larger than chance). Nothing else of rules 229 changes; nothing is saved. Rules 229 keeps 18.
// Version231: stone outcrops and ore veins hold ten times as much (deposit_plenty.ts; read in worldgen.ts placeDeposits), the growth stream, on the owner's instruction for much more stone and iron from the deposits without more of them on the map: the same deposits in the same places from the same draws, each laid down with ten times its former holding. Two separately switched parts (stone, ore), read only while a world is made. Loose rocks, clay and the work of a batch are unchanged. Rules 230 and earlier and authored worlds are laid down as they were.
// Version232: a builder who runs out goes for materials (builder_fetches.ts; read in act_build.ts and options_work.ts materialNeeds), the growth stream, two separately switched parts: a builder with nothing left to build with stands 10 ticks, not 80, before stopping, and takes a fresh look at the site as they go; and for 600 ticks afterwards what that site lacks counts for 10 more to them (one site remembered, in two cooldown numbers saved with the person). Measured before: 291 of 425 spells of building ended with the builder waiting for materials. Rules 231 and earlier, authored worlds and a switch thrown keep the 80 ticks and the weights.
// Version233: work is picked up where it was left (picked_up.ts; read in activities.ts suspendActivity and beginWork), the growth stream, two separately switched parts: work put on hold by somebody beginning to talk keeps how far the piece in hand had got, and when it is picked up again, after the walk and the handler's own beginning, the count is put back if the person stands where they stood and the piece is the length it was; for jobs that count one piece up to its length (gather, craft, till, plant, tend, harvest, repair, tree_work), and for rest and warming up. A small record in the held activity's data is saved with it. This also answers the adversarial review's AR-01 (a refused family ask no longer destroys the work it protected). Rules 232 and earlier, authored worlds and a switch thrown lose the count as before.
export const CURRENT_RULES_VERSION = 233;

/** Every version this build can actually run. A save naming anything else is refused rather than quietly reinterpreted. */
export const SUPPORTED_RULES_VERSIONS: readonly number[] = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 190, 191, 192, 193, 194, 195, 196, 200, 201, 202, 203, 204, 205, 206, 207, 208, 210, 211, 212, 213, 214, 215, 216, 220, 225, 226, 227, 228, 229, 230, 231, 232, 233];

/**
 * The rules-version number of the unintegrated experimental mood-ranking candidate. Not supported here.
 * Do not treat a save stamped with it as version 4 or as version 6.
 */
export const EXPERIMENTAL_MOOD_RULES_VERSION = 5;

/**
 * What a world made before versioning existed is. It is NOT version 0 and not "probably 1": several different implementations
 * were all labelled `dynamics: 'rich'`, and which one a given save was made by cannot be recovered from the file, from the
 * fields a person happens to have, or from a timestamp. Such a world stays explicitly unversioned, for ever, unless somebody
 * converts it deliberately (a separate job, not a load-time migration).
 */
export const UNVERSIONED = undefined;

export interface VersionVerdict {
  ok: boolean;
  /** the version to run under, or undefined for a legacy world */
  version: number | undefined;
  /** why a value was refused, in words a loader can show */
  reason?: string;
}

/** Is this a version this build knows how to run? (`undefined` is the legacy case and is handled separately.) */
export const isSupportedRulesVersion = (v: unknown): v is number => typeof v === 'number' && SUPPORTED_RULES_VERSIONS.includes(v);

/**
 * Check a `rulesVersion` as it came out of a save or a configuration, without changing it. An absent value is accepted as the
 * legacy case; anything else must be a version this build supports. A version from the future is refused by name, because
 * running it under today's rules would be a silent downgrade of somebody else's world.
 */
export function validateRulesVersion(v: unknown): VersionVerdict {
  if (v === undefined || v === null) return { ok: true, version: UNVERSIONED };
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
    return { ok: false, version: undefined, reason: `rulesVersion must be a positive whole number or absent, not ${JSON.stringify(v)}` };
  }
  if (isSupportedRulesVersion(v)) return { ok: true, version: v };
  if (v === EXPERIMENTAL_MOOD_RULES_VERSION) {
    return {
      ok: false,
      version: undefined,
      reason:
        `rules version ${v} is the unintegrated experimental mood-ranking generation. This build does not run it, and it is not loaded as version 4 or as version 6.`,
    };
  }
  const latest = Math.max(...SUPPORTED_RULES_VERSIONS);
  return {
    ok: false,
    version: undefined,
    reason:
      v > latest
        ? `this world was made by a newer build (rules version ${v}); this build runs ${SUPPORTED_RULES_VERSIONS.join(', ')}. It is not loaded, rather than being run under older rules.`
        : `rules version ${v} is no longer supported by this build (it runs ${SUPPORTED_RULES_VERSIONS.join(', ')}).`,
  };
}

/** The version a world is actually running: what its settings say, with no substitution of the current version. */
export const rulesVersionOf = (world: World): number | undefined => world.settings.rulesVersion;

/** The same question of a bare settings object (before a world exists). */
export const settingsRulesVersion = (s: Pick<Settings, 'rulesVersion'>): number | undefined => s.rulesVersion;

/**
 * Is this world eligible for behaviour introduced at version `from`? This is the one place future versioned rules should ask,
 * instead of comparing numbers at the call site:
 *
 *     if (runsRulesVersion(world, 2)) { ...the new rule... } else { ...what version 1 did... }
 *
 * A legacy (unversioned) world is never eligible: its original rules are unknown, so it keeps the behaviour it loads with and
 * no later gameplay addition is applied to it.
 */
export function runsRulesVersion(world: World, from: number): boolean {
  const v = rulesVersionOf(world);
  return v !== undefined && v >= from;
}

/** How to say it in a report, a menu or a save description. */
export function describeRulesVersion(v: number | undefined): string {
  if (v === undefined) return 'unversioned (made before rules versions; its original rules are unknown)';
  return `rules version ${v}${v === CURRENT_RULES_VERSION ? ' (current)' : ''}`;
}

// Save-envelope provenance: the numeric generations 8 and 9 collided on two branches.
export const RULES_LINEAGE = 'main-iron-warmth-smithy';
// Concurrent unmerged 007b9d5 used 27 for leisure, before rebasing that work as 28.
// Neither the shared lineage nor the absence of leisure state proves which 27 made a save.
export const RULES_27_GENERATION = 'main-night-wait-boundary-27';
// Unmerged e415b4b used 29 for work tastes without main's event snapshot fix.
export const RULES_29_GENERATION = 'main-event-participant-snapshots-29';
// Unmerged Pavel/Talia builds (c3f1310, 57ffc48) used 119 for childhood and 120 for resumed gathering credit; on main those
// behaviours are 120 and 121, and 119/120 are lived life and childhood. Unmarked 117 stays Stage 3's: marking it would change
// the recorded rules-117 save digests, and lived-life state in such a save is refused by its own validators below 119.
export const RULES_119_GENERATION = 'main-lived-life-after-stage3-119';
export const RULES_120_GENERATION = 'main-childhood-after-stage3-120';
const GENERATIONS: Readonly<Record<number, string>> = { 27: RULES_27_GENERATION, 29: RULES_29_GENERATION, 119: RULES_119_GENERATION, 120: RULES_120_GENERATION };
export function saveRulesGeneration(version: unknown): string | undefined {
 return typeof version === 'number' ? GENERATIONS[version] : undefined;
}
export function validateSaveLineage(version: unknown, lineage: unknown, generation?: unknown): void {
 if (lineage !== undefined && lineage !== RULES_LINEAGE) throw new Error('Unknown rules lineage; keep this save with its original build.');
 if ((version === 8 || version === 9) && lineage !== RULES_LINEAGE)
  throw new Error('Ambiguous rules version 8/9: two incompatible branches used this number. Original save preserved; open with its original build.');
 if (version === 27 && generation !== RULES_27_GENERATION)
  throw new Error('Ambiguous rules version 27: night-wait and unmerged leisure branches used this number. Original save preserved; open with its original build. No automatic migration is safe.');
 if (version === 29 && generation !== RULES_29_GENERATION)
  throw new Error('Ambiguous rules version 29: event snapshots and unmerged work tastes used this number. Original save preserved; open with its original build. No automatic migration is safe.');
 if ((version === 119 || version === 120) && generation !== saveRulesGeneration(version))
  throw new Error(`Ambiguous rules version ${version}: the unmerged Pavel/Talia builds used this number for different behaviour. Original save preserved; open with its original build. No automatic migration is safe.`);
}
