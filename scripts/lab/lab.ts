import { PARENT_DECIDES_PARTS, parentDecidesPartOn, setParentDecides } from '../../src/sim/parent_decides';
import { FINISH_JOB_PARTS, finishJobPartOn, setFinishJob } from '../../src/sim/finish_job';
import { PLENTY_PARTS, plentyPartOn, setPlenty } from '../../src/sim/plenty';
import { GROWTH_ROOM_PARTS, growthRoomPartOn, setGrowthRoom } from '../../src/sim/growth_room';
import { leanSeasonsOn, leanYearsPartOn, setLeanSeasons, setLeanYears } from '../../src/sim/lean_years';
import { EVENING_PARTS, eveningPartOn, setEvening } from '../../src/sim/evening_fire';
import { TOY_PARTS, setToys, toyPartOn } from '../../src/sim/toys';
import { CHILD_FEEDING_PARTS, childFeedingPartOn, setChildFeeding } from '../../src/sim/child_feeding';
import {orderedProjectClaimsOn,setOrderedProjectClaims} from '../../src/sim/reserved_goods';
import {childhoodOn,setChildhood} from '../../src/sim/childhood_rules';
import {setLivedLife,livedLifeOn} from '../../src/sim/lived_life';
import {toolPlanCapacityOn,setToolPlanCapacity} from '../../src/sim/intent';
import {harvestCapacityOn,setHarvestCapacity} from '../../src/sim/hungry_harvest';
import {reachableTillingOn,setReachableTilling} from '../../src/sim/farming';
import {criticalSearchOn,setCriticalSearch} from '../../src/sim/water_search';
import {projectAcquireOn,setProjectAcquire} from '../../src/sim/project_acquire';
import {setSuspendedEndings,suspendedEndingsOn} from '../../src/sim/suspended_endings';
import {projectHandInputsOn,setProjectHandInputs} from '../../src/sim/project_hand_inputs';
import {hungryHarvestOn,setHungryHarvest} from '../../src/sim/hungry_harvest';
import {meetingKnowledgeOn,setMeetingKnowledge} from '../../src/sim/meeting_knowledge';
import {occasionParticipationOn,setOccasionParticipation} from '../../src/sim/occasion_participation';
import {occasionRecoveryOn,setOccasionRecovery} from '../../src/sim/occasion_recovery';
import {wildSeedInputOn,setWildSeedInput} from '../../src/sim/wild_seed';
import {continuityKnowledgeOn,setContinuityKnowledge} from '../../src/sim/continuity_knowledge';
import {estateCustodyOn,setEstateCustody} from '../../src/sim/estate';
import {workHandoverOn,setWorkHandover} from '../../src/sim/handover_state';
import {careSupplyOn,setCareSupply} from '../../src/sim/care_supply';
import {warmthDutyOn,setWarmthDuty} from '../../src/sim/warmth_duty';
import {careHandbackOn,setCareHandback} from '../../src/sim/care_handback';
import {repairDutyOn,setRepairDuty,singleRoofDutyOn,setSingleRoofDuty} from '../../src/sim/repair_duty';
import {readyStepOn,setReadyStep} from '../../src/sim/ready_step';
import {householdSupplyOn,setHouseholdSupply} from '../../src/sim/household_supply';
import {promisedSupplyOn,setPromisedSupply} from '../../src/sim/promised_supply';
import {decisionLedgerOn,setDecisionLedger} from '../../src/sim/decision_ledger';
import {supperTellingOn,setSupperTelling} from '../../src/sim/household_practices';
import {locationQuestionsOn,setLocationQuestions} from '../../src/sim/location_question';
import {rememberedNeedOn,setRememberedNeed} from '../../src/sim/remembered_need';
import {checkedAccountsOn,setCheckedAccounts} from '../../src/sim/checked_accounts';
import {tellerConfidenceOn,setTellerConfidence} from '../../src/sim/teller_confidence';
import {childTasksOn,setChildTasks} from '../../src/sim/child_tasks';
import {handoverTruthOn,setHandoverTruth} from '../../src/sim/handover_outcome';
import {eatInHandOn,setEatInHand} from '../../src/sim/eat_in_hand';
import {foundEmptyOn,setFoundEmpty} from '../../src/sim/found_empty';
import {sharedStonePartOn,setSharedStone} from '../../src/sim/shared_stone';
import type {SharedStonePart} from '../../src/sim/shared_stone';
import {handFeedingOn,setHandFeeding} from '../../src/sim/hand_feeding';
import {estateReleaseOn,setEstateRelease} from '../../src/sim/estate_release';
import {homeReplacementOn,setHomeReplacement} from '../../src/sim/home_replacement';
import {constructionFinishOn,setConstructionFinish} from '../../src/sim/construction_finish';
import {waterSearchOn,setWaterSearch} from '../../src/sim/water_search';
import {mealLeftoversOn,setMealLeftovers} from '../../src/sim/meal_leftovers';
import {floodAccessEnabled,setFloodAccess} from '../../src/sim/flood';
import {offcutsOn,setOffcuts} from '../../src/sim/offcuts';
import {preservationOn,setPreservation} from '../../src/sim/preservation';
import {hearthOn,setHearth} from '../../src/sim/hearth';
import { waterBudgetEnabled, setWaterBudget } from '../../src/sim/hydrology';
import { ecologyEnabled, setEcology } from '../../src/sim/ecology';
import {buildPromiseSettlementOn,setBuildPromiseSettlement} from '../../src/sim/promise_knowledge';
import {promiseDelaysOn,setPromiseDelays} from '../../src/sim/promise_delays';
import {requestCancellationOn,setRequestCancellation} from '../../src/sim/request_cancellation';
import {promiseTargetsOn,setPromiseTargets} from '../../src/sim/promise_targets';
import {promiseExpectationsOn,setPromiseExpectations} from '../../src/sim/promise_expectations';
import {promiseOutcomesOn,setPromiseOutcomes} from '../../src/sim/promise_outcomes';
import {careWaterOn,setCareWater} from '../../src/sim/care_capacity';
import {projectPlansOn,setProjectPlans} from '../../src/sim/project_step';
import {routinesOn,setRoutines} from '../../src/sim/daily_routines';
import {actionScopeOn,setActionScope} from '../../src/sim/action_scope';
import {journeysOn,setJourneys} from '../../src/sim/journey_supplies';
import {journeyRecoveryOn,setJourneyRecovery} from '../../src/sim/journey_recovery';
import {sourceLearningOn,setSourceLearning} from '../../src/sim/source_learning';
import {routeLearningOn,setRouteLearning} from '../../src/sim/route_learning';
import {helperLearningOn,setHelperLearning} from '../../src/sim/helper_learning';
import {watchLearningOn,setWatchLearning} from '../../src/sim/helper_learning';
import {promiseKnowledgeOn,setPromiseKnowledge} from '../../src/sim/promise_knowledge';
import {storedWaterOn,setStoredWater} from '../../src/sim/stored_water_access';
import { learnerInstructionOn, setLearnerInstruction } from '../../src/sim/techniques';
import { civicBenefitOn, setCivicBenefit, civicFoodBenefitOn, setCivicFoodBenefit } from '../../src/sim/civic_benefit';
import { localDemandOn, setLocalDemand } from '../../src/sim/local_demand';
import { foodFetchOn, setFoodFetch } from '../../src/sim/food_help';
import { seekCarerOn, setSeekCarer } from '../../src/sim/welfare';
import { winterReserveOn, setWinterReserve } from '../../src/sim/provision';
import { winterShelterOn, setWinterShelter } from '../../src/sim/winter_shelter';
import { deliveryPlaceOn, setDeliveryPlace } from '../../src/sim/delivery_place';
import { batchPlansOn, setBatchPlans, batchRecipeChoiceOn, setBatchRecipeChoice } from '../../src/sim/batch_plan';
import { requiredToolRecoveryOn, setRequiredToolRecovery } from '../../src/sim/facilities';
import { localGivingOn, setLocalGiving } from '../../src/sim/local_giving';
import { careCapacityOn, setCareCapacity } from '../../src/sim/care_capacity';
import { toolPrecedenceOn, setToolPrecedence } from '../../src/sim/production';
import { keptTargetOn, setKeptTarget } from '../../src/sim/kept_target';
import { residentCareOn, setResidentCare } from '../../src/sim/resident_contact';
import { customersOn, setCustomers } from '../../src/sim/customers';
import { successionOn, setSuccession } from '../../src/sim/succession';
import { winterPracticeOn, setWinterPractice } from '../../src/sim/winter_practice';
import { batchResumeOn, setBatchResume } from '../../src/sim/facilities';
import {backgroundsOn,setBackgrounds} from '../../src/sim/background';
import { achievementAftermathOn, setAchievementAftermath } from '../../src/sim/achievement';
import { projectHelperChoiceOn, setProjectHelperChoice } from '../../src/sim/options_social';
import { storedMaterialPlansOn, setStoredMaterialPlans, storedMaterialPromisesOn, setStoredMaterialPromises } from '../../src/sim/material_stock';
import { workTastesOn, setWorkTastes } from '../../src/sim/temperament';
import { leaveHeaviestOn, setLeaveHeaviest } from '../../src/sim/leave_heaviest';
import { nightWaitBoundaryOn, setNightWaitBoundary } from '../../src/sim/night_wait';
import { CIVILISATION_METRICS, civilisationOutcome } from './civilisation';
import { memoryRetentionOn, setMemoryRetention } from '../../src/sim/memory_retention';
import { householdPracticesOn, setHouseholdPractices } from '../../src/sim/household_practices';
import { politicalAlignmentOn, setPoliticalAlignment } from '../../src/sim/political_alignment';
import { exchangeJourneysOn, setExchangeJourneys } from '../../src/sim/exchange_journeys';
import { relocationExtensionsOn, relocationsOn, setRelocationExtensions, setRelocations } from '../../src/sim/relocation';
import { setTransport, transportOn } from '../../src/sim/transport';
import { practicalCareOn, setPracticalCare } from '../../src/sim/responsibilities';
import { workshopToolsOn, setWorkshopTools } from '../../src/sim/options_work';
import { seedStorageOn, setSeedStorage } from '../../src/sim/seed_storage';
import { craftCapacityOn, setCraftCapacity } from '../../src/sim/act_build';
import { setConstructionSafety, constructionSafetyOn } from '../../src/sim/construction_access';
import { setTechniques, techniquesOn, techniqueTreeOn, setTechniqueTree } from '../../src/sim/techniques';
import { setDevelopment, developmentOn } from '../../src/sim/development';
import { setLocalMarket, localMarketOn } from '../../src/sim/market_contact';
import { setCivicChoice, civicChoiceOn } from '../../src/sim/civic_decision';
import { setLocalDeath, localDeathOn } from '../../src/sim/death_knowledge';
import { setSingleCount, singleCountOn } from '../../src/sim/reputation';
import { setTownships, townshipsOn } from '../../src/sim/townships';
// The counterfactual lab: fork a saved world, change one thing, run it forward, and compare it with the untouched control.
//
// A world is deterministic and a save round trip is exact (tests/save.test.ts), so a fork is a true "same world, one difference" pair.
// But the world is also chaotic: any change, however small, moves every later random draw, so one pair proves nothing. Two things make
// the comparison usable:
//   * the NOISE FLOOR: a `nudge` branch changes nothing but one random draw. Whatever it does to the outcome is what chance alone does.
//   * the ENSEMBLE: the same pair is made for many seeds and compared as paired differences (scripts/lab/stats.ts).
// An effect is only worth reporting if it is systematic across seeds (its confidence interval excludes 0) and larger than the nudge's.
//
// Nothing here is read by the simulation: interventions act on a deserialised copy, or flip a switch that is off by default and is never
// saved or hashed (the option chooser, the wolf search memory).
import { deserializeWorld, serializeWorld } from '../../src/app/save';
import { CRITICAL, DAY, NEED_KEYS, isHomeType } from '../../src/sim/constants';
import { stageOf } from '../../src/sim/people';
import { metabolismOn, setLabRates, setMetabolism } from '../../src/sim/metabolism';
import { COMPANY_PARTS, companyPartOn, setCompany } from '../../src/sim/company';
import type { CompanyPart } from '../../src/sim/company';
import { setSharedYard, sharedYardOn } from '../../src/sim/shared_yard';
import { setStalledAsk, stalledAskOn } from '../../src/sim/stalled_ask';
import { homeFirstPartOn, setHomeFirst } from '../../src/sim/home_first';
import { CARRY_MORE_PARTS, carryMorePartOn, setCarryMore } from '../../src/sim/carry_more';
import { openWorkplacesOn, setOpenWorkplaces } from '../../src/sim/open_workplaces';
import { CANNOT_TEACH, SHOWN_PARTS, setShown, shownPartOn } from '../../src/sim/shown';
import { PLAY_PARTS, playPartOn, setPlay } from '../../src/sim/play';
import { childPacePartOn, setChildPace } from '../../src/sim/child_pace';
import { THREE_AGES_PARTS, bandOf, setThreeAges, threeAgesPartOn } from '../../src/sim/three_ages';
import type { ThreeAgesPart } from '../../src/sim/three_ages';
import { earnedAccess } from '../../src/sim/facilities';
import { LIGHT_PACK_PARTS, childrenExemptOn, fillingTripsOn, lightPackPartOn, rationTwoOn, setChildrenExempt, setFillingTrips, setLightPack, setRationTwo } from '../../src/sim/light_pack';
import { SWAP_FIRE_PARTS, setSwapAndFire, swapFirePartOn } from '../../src/sim/swap_and_fire';
import type { SwapFirePart } from '../../src/sim/swap_and_fire';
import { setOptionChooser } from '../../src/sim/decision';
import { setStakes } from '../../src/sim/hardship';
import { setNightPlans, setProjectAsks, reconsiderOn, setReconsider } from '../../src/sim/intent';
import { setLearning } from '../../src/sim/learning';
import { setFatalHold } from '../../src/sim/lifecycle';
import { setFoodPreparation } from '../../src/sim/provision';
import { setShelterPlans } from '../../src/sim/shelter';
import { leisureOnSwitch, setLeisure } from '../../src/sim/leisure';
import { setTableEating } from '../../src/sim/tableeating';
import { setHabitationAdmissions } from '../../src/sim/habitation';
import { defProbe, defReset, defSnapshot, setWolfDefence, spearOf } from '../../src/sim/defence';
import { setTrades } from '../../src/sim/trade';
import { SOURCE_SKILL } from '../../src/sim/constants';
import type { FoodKind } from '../../src/sim/types';

/** what counts as food when a store is weighed up; the same list provision.ts uses */
const FOOD_ITEMS: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat', 'dried_fish', 'smoked_fish', 'dried_meat', 'smoked_meat'];
import type { Activity, Person, Stage } from '../../src/sim/types';
import { cartFirstOn, setCartFirst } from '../../src/sim/cart_priority';
import { setMoodEffects } from '../../src/sim/mood';
import { unregisterSource } from '../../src/sim/registry';
import type { SourceType, World } from '../../src/sim/types';
import { setWolfSearchMemory } from '../../src/sim/wildlife';
import { hashWorld, stepWorld } from '../../src/sim/world';

/** What a branch is allowed to change. `apply` edits the forked copy; `install` flips a module-level switch and returns how to flip it back. */
export interface Intervention {
  spec: string;
  summary: string;
  apply?: (w: World) => string;
  install?: () => () => void;
}

const hubsOf = (w: World) => [w.camp, ...(w.extraSettlements ?? [])];
const nearHub = (w: World, x: number, y: number, r: number) => hubsOf(w).some((h) => Math.hypot(h.x - x, h.y - y) <= r);

function removeSources(w: World, types: SourceType[], r: number): number {
  let n = 0;
  for (const s of w.sources.slice()) {
    if (types.includes(s.type) && nearHub(w, s.x, s.y, r)) {
      unregisterSource(w, s);
      n++;
    }
  }
  return n;
}

const ALIASES: Record<string, string> = {
  // the switch removes every private plan, projects included, so the plainer name is the accurate one
  'rich-no-plans': 'rich-no-night',
  'no-wood': 'remove:tree:22',
  'no-food': 'remove:berry_bush+fruit_tree+wild_grain+fish_spot:35',
  'no-clay': 'remove:clay_pit+ore_vein:1000000000',
};

export const DEFAULT_BRANCHES = ['nudge:1', 'nudge:2', 'no-wolf-memory', 'random-choice', 'no-wood', 'no-food', 'no-clay'];

/**
 * Specs: `control`; `nudge:N` (draw N random numbers and change nothing else: the noise floor); `remove:<type+type>:<radius>` (delete
 * those sources within the radius of any settlement); `random-choice` (rank options by a hash, not by utility); `no-wolf-memory`
 * (switch off an optimisation that is meant to be exact: a branch that is not identical to the control would be a bug).
 * `rich-no-night` (alias `rich-no-plans`) is rich with private plans removed altogether - night preparation AND the projects
 * built on the same mechanism (making a tool, mending a roof) - to isolate what planning as such contributes. `rich-no-ask` keeps
 * every plan and removes only Stage D1's ask for a project's missing material, to isolate what the cooperation contributes on top
 * of planning. `rich-no-learning` keeps everything else about a rich world and removes only Stage 3's estimates of what pays, to
 * isolate what learning from one's own outcomes contributes. `rich-no-defence` keeps everything else about a
 * rules-version-4 world and removes only the defensive ACTION (defence.ts): spears are still wanted, made and carried,
 * and fire, shelter and fleeing are exactly what they were, so the arm isolates standing and facing a wolf from
 * everything that surrounds it. `rich-no-fatal-hold` keeps everything else about a rules-version-6 world and removes
 * only the rule that zero health is death before passive recovery; wolf damage, healing rates, defence, habitation
 * and preparation stay. Against a world older than version 6 it changes nothing, because such a world never held a
 * fatal injury. `rich-no-shelter` keeps everything else about a rules-version-7 world and removes only the private plan
 * to FETCH a household home site's missing material (shelter.ts): sites are still laid out exactly as before, building,
 * ownership and habitation are untouched, and material carried for any other reason still arrives, so the arm isolates
 * going and getting it on purpose from everything that surrounds it. Against a world older than version 7 it changes
 * nothing, because nobody in such a world ever made that plan. `rich-no-table-eating` keeps everything else about a
 * rules-version-9 world and removes only eating AT a store when the pack has no room (tableeating.ts): a full pack fails and
 * writes the store off, as it did before version 9. Against a world older than version 9 it changes nothing. `rich-no-stock` keeps everything else about a rules-version-2 world
 * and removes only household food preparation (provision.ts), so a run with it and a run without differ in that one behaviour and
 * nothing else; against a version-1 world it changes nothing, because such a world never had it. `rich-no-trades` keeps everything
 * else about a rich world and removes trades and their apprenticeship mechanism together (trade.ts, apprentice.ts); it does not
 * isolate trades alone. `rich-stakes-only` and `rich-mood-only` separate the original stakes/mood mechanisms, not all later systems. `rich` switches current dynamics on at the fork of a legacy run. `no-wood`, `no-food`, `no-clay` are aliases of `remove`.
 */
export function parseIntervention(specIn: string): Intervention {
  if(specIn==='rich-no-tool-plan-capacity')return {spec:specIn,summary:'restore tool adoption regardless of complete recipe carrying capacity',install(){const was=toolPlanCapacityOn();setToolPlanCapacity(false);return ()=>setToolPlanCapacity(was);}};
  if(specIn==='rich-no-harvest-capacity')return {spec:specIn,summary:'restore discretionary harvest offers with no carrying room',install(){const was=harvestCapacityOn();setHarvestCapacity(false);return ()=>setHarvestCapacity(was);}};
  if(specIn==='rich-no-reachable-tilling')return {spec:specIn,summary:'restore fixed south-side tilling and unrecorded tile failures',install(){const was=reachableTillingOn();setReachableTilling(false);return ()=>setReachableTilling(was);}};
  if(specIn==='rich-no-critical-search')return {spec:specIn,summary:'restore exploration cooldown for critical water searches',install(){const was=criticalSearchOn();setCriticalSearch(false);return ()=>setCriticalSearch(was);}};
  if(specIn==='rich-no-project-acquire')return {spec:specIn,summary:'restore double subtraction of carried project inputs',install(){const was=projectAcquireOn();setProjectAcquire(false);return ()=>setProjectAcquire(was);}};
  const spec = ALIASES[specIn] ?? specIn;
  const [kind, a, b] = spec.split(':');
  const label = specIn;
  if (kind === 'control') return { spec: label, summary: 'nothing changes' };
  if (kind === 'rates') {
    // rules 195 screening: the base hunger and thirst drains a rich world runs under for this branch (metabolism.ts); no effect below 195
    const hunger = Number(a), thirst = Number(b);
    if (!(hunger > 0 && thirst > 0)) throw new Error(`rates:<hunger>:<thirst> wants two positive numbers, not ${spec}`);
    return { spec: label, summary: `base hunger ${hunger} and thirst ${thirst} a tick instead of the rules-195 constants; no effect below rules 195`, install() { setLabRates({ hunger, thirst }); return () => setLabRates(null); } };
  }
  // rules 200 to 202 (the life stream): one removal arm per separately switched part, and one per version that removes all of its parts
  if (kind === 'rich-no-company') return { spec: label, summary: 'remove all five rules-200 parts: approach, learning gate, meal window, meal larder, market at the fire; no effect below rules 200', install() { const was = COMPANY_PARTS.map((part) => [part, companyPartOn(part)] as const); setCompany(false); return () => { for (const [part, v] of was) setCompany(v, part); }; } };
  for (const [name, part, what] of [
    ['rich-no-approach', 'approach', 'a childhood or learning ask adds nothing to the stop-and-talk roll and an approach is committed for 40 ticks, as before rules 200'],
    ['rich-no-learning-gate', 'learning', 'the coaching ask wants hunger, thirst and energy all above 65, as before rules 200'],
    ['rich-no-meal-window', 'meal', 'the invitation to a shared meal is made only from 0.50 of the day, as before rules 200'],
    ['rich-no-meal-larder', 'larder', 'the invitation counts only food in the pack and the host is not offered the walk home for the meal, as before rules 200'],
    ['rich-no-market-fire', 'market', 'the market is called only where a sound hall stands, as before rules 200'],
  ] as [string, CompanyPart, string][]) {
    if (kind === name) return { spec: label, summary: `${what} (rules 200 removal)`, install() { const was = companyPartOn(part); setCompany(false, part); return () => setCompany(was, part); } };
  }
  // rules 211 (play.ts): both parts removed (equal to rules 210), and each part alone
  if (kind === 'rich-no-play') return { spec: label, summary: 'one guessing game a day and no play alone, as before rules 211; no effect below rules 211', install() { const was = PLAY_PARTS.map((k) => playPartOn(k)); setPlay(false); return () => PLAY_PARTS.forEach((k, i) => setPlay(was[i], k)); } };
  if (kind === 'rich-no-play-games') return { spec: label, summary: 'the guessing game is the only game between two children, as before rules 211; no effect below rules 211', install() { const was = playPartOn('games'); setPlay(false, 'games'); return () => setPlay(was, 'games'); } };
  // rules 220 (lean_years.ts): the daily one-in-five roll back (equal to rules 216), and a diagnostic with no lean season at all
  if (kind === 'rich-no-lean-years') return { spec: label, summary: 'a lean season may begin on any day with one chance in five, as before rules 220; no effect below rules 220', install() { const was = leanYearsPartOn('rare'); setLeanYears(false, 'rare'); return () => setLeanYears(was, 'rare'); } };
  if (kind === 'rich-no-lean-seasons') return { spec: label, summary: 'no lean season ever begins; dry spells, winter, spoilage and wolves unchanged; a diagnostic, not an earlier rules version', install() { const was = leanSeasonsOn(); setLeanSeasons(false); return () => setLeanSeasons(was); } };
  // rules 225 (growth_room.ts): every part removed (equal to rules 224), and each part alone
  if (kind === 'rich-no-growth-room') return { spec: label, summary: 'the fixed limits on people, open sites, projects and workplaces back, as before rules 225; no effect below rules 225', install() { const was = GROWTH_ROOM_PARTS.map((k) => growthRoomPartOn(k)); setGrowthRoom(false); return () => GROWTH_ROOM_PARTS.forEach((k, i) => setGrowthRoom(was[i], k)); } };
  for (const part of GROWTH_ROOM_PARTS) if (kind === 'rich-no-growth-room-' + part) return { spec: label, summary: `the fixed limit on ${part} back, as before rules 225; no effect below rules 225`, install() { const was = growthRoomPartOn(part); setGrowthRoom(false, part); return () => setGrowthRoom(was, part); } };
  // rules 226 (plenty.ts): both parts removed (equal to rules 225), and each part alone
  if (kind === 'rich-no-plenty') return { spec: label, summary: 'wild food and crops at their old amounts, as before rules 226; no effect below rules 226', install() { const was = PLENTY_PARTS.map((k) => plentyPartOn(k)); setPlenty(false); return () => PLENTY_PARTS.forEach((k, i) => setPlenty(was[i], k)); } };
  for (const part of PLENTY_PARTS) if (kind === 'rich-no-plenty-' + part) return { spec: label, summary: `${part === 'wild' ? 'wild food comes back at its old pace' : 'a ripened plot carries its old grain'}, as before rules 226; no effect below rules 226`, install() { const was = plentyPartOn(part); setPlenty(false, part); return () => setPlenty(was, part); } };
  // rules 227 (finish_job.ts): both parts removed (equal to rules 226), and each part alone
  if (kind === 'rich-no-finish-job') return { spec: label, summary: 'a job under way is looked at again every 45 to 65 ticks and anyone may be approached at their work, as before rules 227; no effect below rules 227', install() { const was = FINISH_JOB_PARTS.map((k) => finishJobPartOn(k)); setFinishJob(false); return () => FINISH_JOB_PARTS.forEach((k, i) => setFinishJob(was[i], k)); } };
  for (const part of FINISH_JOB_PARTS) if (kind === 'rich-no-finish-job-' + part) return { spec: label, summary: `${part === 'hold' ? 'a job under way is looked at again every 45 to 65 ticks' : part === 'asleep' ? 'a sleeper is looked at again every 45 to 65 ticks' : 'anyone may be approached at their work for a chat, family time or a game'}, as before rules 227; no effect below rules 227`, install() { const was = finishJobPartOn(part); setFinishJob(false, part); return () => setFinishJob(was, part); } };
  // rules 228 (parent_decides.ts): both parts removed (equal to rules 227), and each part alone
  if (kind === 'rich-no-parent-decides') return { spec: label, summary: 'a child does not ask somebody at work for family time, and a grown person asked says yes whatever job is in hand, as before rules 228; no effect below rules 228', install() { const was = PARENT_DECIDES_PARTS.map((k) => parentDecidesPartOn(k)); setParentDecides(false); return () => PARENT_DECIDES_PARTS.forEach((k, i) => setParentDecides(was[i], k)); } };
  for (const part of PARENT_DECIDES_PARTS) if (kind === 'rich-no-parent-decides-' + part) return { spec: label, summary: `${part === 'ask' ? 'a child does not ask somebody at work for family time' : 'a grown person asked for family time says yes whatever job is in hand'}, as before rules 228; no effect below rules 228`, install() { const was = parentDecidesPartOn(part); setParentDecides(false, part); return () => setParentDecides(was, part); } };
  if (kind === 'rich-no-evening') return { spec: label, summary: 'nobody sits by the fire of an evening and no story is told there, as before rules 216; no effect below rules 216', install() { const was = EVENING_PARTS.map((k) => eveningPartOn(k)); setEvening(false); return () => EVENING_PARTS.forEach((k, i) => setEvening(was[i], k)); } };
  if (kind === 'rich-no-evening-fire') return { spec: label, summary: 'nobody sits by the fire of an evening (so no story either), as before rules 216; no effect below rules 216', install() { const was = eveningPartOn('fire'); setEvening(false, 'fire'); return () => setEvening(was, 'fire'); } };
  if (kind === 'rich-no-evening-story') return { spec: label, summary: 'people sit by the fire but no story is told, as before rules 216; no effect below rules 216', install() { const was = eveningPartOn('story'); setEvening(false, 'story'); return () => setEvening(was, 'story'); } };
  if (kind === 'rich-no-toys') return { spec: label, summary: 'nobody makes, gives or plays with a toy, as before rules 215; no effect below rules 215', install() { const was = TOY_PARTS.map((k) => toyPartOn(k)); setToys(false); return () => TOY_PARTS.forEach((k, i) => setToys(was[i], k)); } };
  if (kind === 'rich-no-toys-make') return { spec: label, summary: 'nobody carves a toy, as before rules 215; no effect below rules 215', install() { const was = toyPartOn('make'); setToys(false, 'make'); return () => setToys(was, 'make'); } };
  if (kind === 'rich-no-toys-give') return { spec: label, summary: 'a toy is not handed to a child, as before rules 215; no effect below rules 215', install() { const was = toyPartOn('give'); setToys(false, 'give'); return () => setToys(was, 'give'); } };
  if (kind === 'rich-no-toys-play') return { spec: label, summary: 'a child does not play with a toy, as before rules 215; no effect below rules 215', install() { const was = toyPartOn('play'); setToys(false, 'play'); return () => setToys(was, 'play'); } };
  if (kind === 'rich-no-child-feeding') return { spec: label, summary: 'carers act only on how a child looks and the provider pull is flat, as before rules 214; no effect below rules 214', install() { const was = CHILD_FEEDING_PARTS.map((k) => childFeedingPartOn(k)); setChildFeeding(false); return () => CHILD_FEEDING_PARTS.forEach((k, i) => setChildFeeding(was[i], k)); } };
  if (kind === 'rich-no-feeding-meals') return { spec: label, summary: 'carers act only on how a child looks, as before rules 214; no effect below rules 214', install() { const was = childFeedingPartOn('meals'); setChildFeeding(false, 'meals'); return () => setChildFeeding(was, 'meals'); } };
  if (kind === 'rich-no-feeding-provide') return { spec: label, summary: 'the provider pull is flat, as before rules 214; no effect below rules 214', install() { const was = childFeedingPartOn('provide'); setChildFeeding(false, 'provide'); return () => setChildFeeding(was, 'provide'); } };
  if (kind === 'rich-no-three-ages') return { spec: label, summary: 'every under-twelve gathers food as before rules 213; no effect below rules 213', install() { const was = THREE_AGES_PARTS.map((k) => threeAgesPartOn(k)); setThreeAges(false); return () => THREE_AGES_PARTS.forEach((k, i) => setThreeAges(was[i], k)); } };
  if (kind.startsWith('rich-no-ages-') && (THREE_AGES_PARTS as string[]).includes(kind.slice('rich-no-ages-'.length))) { const part = kind.slice('rich-no-ages-'.length) as ThreeAgesPart; return { spec: label, summary: `the three-ages part '${part}' removed, as before rules 213; no effect below rules 213`, install() { const was = threeAgesPartOn(part); setThreeAges(false, part); return () => setThreeAges(was, part); } }; }
  if (kind === 'rich-no-little-pace') return { spec: label, summary: 'a little one walks at the 0.88 pace of every under-twelve, as before rules 212; no effect below rules 212', install() { const was = childPacePartOn('little'); setChildPace(false, 'little'); return () => setChildPace(was, 'little'); } };
  if (kind === 'rich-no-play-solo') return { spec: label, summary: 'a child has nothing of their own to do alone, as before rules 211; no effect below rules 211', install() { const was = playPartOn('solo'); setPlay(false, 'solo'); return () => setPlay(was, 'solo'); } };
  // rules 210 (shown.ts): all three parts removed (equal to rules 208), and each part alone
  if (kind === 'rich-no-shown') return { spec: label, summary: 'practice is asked for and given as before rules 210; no effect below rules 210', install() { const was = SHOWN_PARTS.map((k) => shownPartOn(k)); setShown(false); return () => SHOWN_PARTS.forEach((k, i) => setShown(was[i], k)); } };
  if (kind === 'rich-no-shown-remember') return { spec: label, summary: 'a child does not remember who could not teach them, as before rules 210; no effect below rules 210', install() { const was = shownPartOn('remember'); setShown(false, 'remember'); return () => setShown(was, 'remember'); } };
  if (kind === 'rich-no-shown-older') return { spec: label, summary: 'only a grown person gives practice, as before rules 210; no effect below rules 210', install() { const was = shownPartOn('older'); setShown(false, 'older'); return () => setShown(was, 'older'); } };
  if (kind === 'rich-no-shown-more') return { spec: label, summary: 'practice is in foraging only, as before rules 210; no effect below rules 210', install() { const was = shownPartOn('more'); setShown(false, 'more'); return () => setShown(was, 'more'); } };
  // rules 208 (light_pack.ts): the ration applied to children again (equal to rules 207)
  if (kind === 'rich-children-ration') return { spec: label, summary: 'under-twelves are held to the ration as at rules 205 to 207; no effect below rules 208', install() { const was = childrenExemptOn(); setChildrenExempt(false); return () => setChildrenExempt(was); } };
  // rules 207 (open_workplaces.ts): a workplace admits only those the earlier rules admitted (equal to rules 206)
  if (kind === 'rich-no-open-workplaces') return { spec: label, summary: 'a workplace is used only by its household, its builders and their friends, as before rules 207; no effect below rules 207', install() { const was = openWorkplacesOn(); setOpenWorkplaces(false); return () => setOpenWorkplaces(was); } };
  // rules 206 (light_pack.ts): the ration back at one portion (equal to rules 205), and the lab-only experiment turned on
  if (kind === 'rich-ration-one') return { spec: label, summary: 'one portion of food is kept, as at rules 205; no effect below rules 206', install() { const was = rationTwoOn(); setRationTwo(false); return () => setRationTwo(was); } };
  if (kind === 'rich-filling-trips') return { spec: label, summary: 'an experiment that is off in every world: the trip home with food beyond the ration is made only from a filling pack (three spare portions or more, or three quarters full); no effect below rules 205', install() { const was = fillingTripsOn(); setFillingTrips(true); return () => setFillingTrips(was); } };
  // rules 205 (light_pack.ts): both parts removed (equal to rules 204), and each part alone
  if (kind === 'rich-no-light-pack') return { spec: label, summary: 'food and materials are carried and eaten as before rules 205; no effect below rules 205', install() { const was = LIGHT_PACK_PARTS.map((k) => lightPackPartOn(k)); setLightPack(false); return () => LIGHT_PACK_PARTS.forEach((k, i) => setLightPack(was[i], k)); } };
  if (kind === 'rich-no-ration') return { spec: label, summary: 'two or three portions are kept in the pack and eaten from it, as before rules 205; no effect below rules 205', install() { const was = lightPackPartOn('ration'); setLightPack(false, 'ration'); return () => setLightPack(was, 'ration'); } };
  if (kind === 'rich-no-pack-materials') return { spec: label, summary: 'a filling pack adds nothing to a site delivery and spare wood and stone is not taken home, as before rules 205; no effect below rules 205', install() { const was = lightPackPartOn('materials'); setLightPack(false, 'materials'); return () => setLightPack(was, 'materials'); } };
  // rules 204 (carry_more.ts): all three parts removed (equal to rules 203), and each part alone
  if (kind === 'rich-no-carry-more') return { spec: label, summary: 'a basket is wanted, fetched for and made as before rules 204; no effect below rules 204', install() { const was = CARRY_MORE_PARTS.map((k) => carryMorePartOn(k)); setCarryMore(false); return () => CARRY_MORE_PARTS.forEach((k, i) => setCarryMore(was[i], k)); } };
  if (kind === 'rich-no-basket-want') return { spec: label, summary: 'a basket is wanted only after gathering more than six units, as before rules 204; no effect below rules 204', install() { const was = carryMorePartOn('want'); setCarryMore(false, 'want'); return () => setCarryMore(was, 'want'); } };
  if (kind === 'rich-no-basket-room') return { spec: label, summary: 'bringing food home gains nothing from a basket whose wood will not fit in the pack, as before rules 204; no effect below rules 204', install() { const was = carryMorePartOn('room'); setCarryMore(false, 'room'); return () => setCarryMore(was, 'room'); } };
  if (kind === 'rich-no-basket-worth') return { spec: label, summary: 'the wood trip for a basket and its making score as for any other tool, as before rules 204; no effect below rules 204', install() { const was = carryMorePartOn('worth'); setCarryMore(false, 'worth'); return () => setCarryMore(was, 'worth'); } };
  // rules 203 (home_first.ts): the cap exemption removed, and the two retired parts kept on
  if (kind === 'rich-no-home-first') return { spec: label, summary: 'a household\'s first roof waits for the settlement\'s site cap again, as before rules 203; no effect below rules 203', install() { const was = homeFirstPartOn('cap'); setHomeFirst(false, 'cap'); return () => setHomeFirst(was, 'cap'); } };
  if (kind === 'rich-keep-yard-and-swap') return { spec: label, summary: 'the shared first timber yard (201) and the walk a food swap saves (202) still apply, as before rules 203 retired them; no effect below rules 203', install() { const was = homeFirstPartOn('retire'); setHomeFirst(false, 'retire'); return () => setHomeFirst(was, 'retire'); } };
  if (kind === 'rich-no-stalled-ask') return { spec: label, summary: 'the ask for a site\'s materials ignores how long the site has waited, as before rules 201; no effect below rules 201', install() { const was = stalledAskOn(); setStalledAsk(false); return () => setStalledAsk(was); } };
  if (kind === 'rich-no-shared-yard') return { spec: label, summary: 'every timber yard is laid out privately, as before rules 201; no effect below rules 201', install() { const was = sharedYardOn(); setSharedYard(false); return () => setSharedYard(was); } };
  if (kind === 'rich-no-swap-and-fire') return { spec: label, summary: 'remove both rules-202 parts: the walk a food swap saves, and the fire fed for a gathering; no effect below rules 202', install() { const was = SWAP_FIRE_PARTS.map((part) => [part, swapFirePartOn(part)] as const); setSwapAndFire(false); return () => { for (const [part, v] of was) setSwapAndFire(v, part); }; } };
  for (const [name, part, what] of [
    ['rich-no-swap-worth', 'swap', 'a swap for food is scored without the walk it saves, as before rules 202'],
    ['rich-no-gathering-fire', 'fire', 'a fire is fed in daylight only below 150 believed fuel whatever is called at it, as before rules 202'],
  ] as [string, SwapFirePart, string][]) {
    if (kind === name) return { spec: label, summary: `${what} (rules 202 removal)`, install() { const was = swapFirePartOn(part); setSwapAndFire(false, part); return () => setSwapAndFire(was, part); } };
  }
  if (kind === 'rich-no-metabolism') return { spec: label, summary: 'restore the base drains of 0.03 hunger and 0.04 thirst a tick (rules 194 and earlier) and nothing else; no effect below rules 195', install() { const was = metabolismOn(); setMetabolism(false); return () => setMetabolism(was); } };
  if (kind === 'nudge') {
    const n = Number(a ?? 1);
    return {
      spec: label,
      summary: `${n} extra random draw${n === 1 ? '' : 's'} at the fork and nothing else (the noise floor)`,
      apply: (w) => {
        for (let i = 0; i < n; i++) w.rng.next();
        return `${n} draws`;
      },
    };
  }
  if (kind === 'remove') {
    const types = (a ?? '').split('+') as SourceType[];
    const r = Number(b ?? 22);
    const where = r >= 1e6 ? 'anywhere' : `within ${r} tiles of a settlement`;
    return {
      spec: label,
      summary: `every ${types.join(', ')} ${where} is removed`,
      apply: (w) => `${removeSources(w, types, r)} sources removed`,
    };
  }
  if (kind === 'rich') {
    return {
      spec: label,
      summary: 'rich dynamics switched on at the fork: people have a mood that changes what they do, and lean seasons happen',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on';
      },
    };
  }
  if (kind === 'rich-no-night') {
    return {
      spec: label,
      summary: 'rich dynamics with private plans removed: nobody gets ready for the night, nobody takes on making a tool or mending a roof, and sheltering until light is not on offer',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, private plans off';
      },
      install: () => {
        setNightPlans(false);
        return () => setNightPlans(true);
      },
    };
  }
  if (kind === 'rich-no-ask') {
    return {
      spec: label,
      summary: 'rich dynamics with private plans kept and only the project ask removed: nobody asks a neighbour for material their own project lacks',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, project asks off';
      },
      install: () => {
        setProjectAsks(false);
        return () => setProjectAsks(true);
      },
    };
  }
  if (kind === 'rich-no-learning') {
    return {
      spec: label,
      summary: 'rich dynamics with the estimates of what pays removed: nobody learns from their own gathering what to do more of',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, learning off';
      },
      install: () => {
        setLearning(false);
        return () => setLearning(true);
      },
    };
  }
  if (kind === 'rich-no-stock') {
    return {
      spec: label,
      summary: 'current dynamics with household food preparation removed: nobody takes on putting a food reserve by, for the season or for a household that is short',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, food preparation off';
      },
      install: () => {
        setFoodPreparation(false);
        return () => setFoodPreparation(true);
      },
    };
  }
  if (kind === 'no-home-entry') {
    return {
      spec: label,
      summary: 'no new home admissions; existing occupants keep physical shelter until they leave; outdoor proximity protection is not restored',
      apply: () => 'new home entry disabled',
      install: () => { setHabitationAdmissions(false); return () => setHabitationAdmissions(true); },
    };
  }
  if (kind === 'rich-no-fatal-hold') {
    return {
      spec: label,
      summary: 'current dynamics with fatal injuries no longer held at zero: passive recovery can still run before death is processed. Wolf damage, healing rates and every other mechanic stay as they are. Below rules version 6 it changes nothing',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, fatal-injury hold off';
      },
      install: () => {
        setFatalHold(false);
        return () => setFatalHold(true);
      },
    };
  }
  if (kind === 'rich-no-shelter') {
    return {
      spec: label,
      summary: 'current dynamics with household shelter plans removed: nobody goes and fetches the material their own household home site is short of. Laying the site out, building it, owning it and living in it are unchanged, and material carried for any other reason still arrives. Below rules version 7 it changes nothing',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, household shelter plans off';
      },
      install: () => {
        setShelterPlans(false);
        return () => setShelterPlans(true);
      },
    };
  }
  if (kind === 'rich-unsafe-sites') return {spec:label,summary:'restore pre-19 siting (public storehouse safeguard remains)',apply:()=> 'general siting guard off',install(){const was=constructionSafetyOn();setConstructionSafety(false);return ()=>setConstructionSafety(was);}};
  if (kind === 'rich-no-night-wait-boundary') return {spec:label,summary:'restart night rest after conversation as before rules 27',apply:()=> 'night wait boundary disabled',install(){const was=nightWaitBoundaryOn();setNightWaitBoundary(false);return ()=>setNightWaitBoundary(was);}};
  if (kind === 'rich-no-memory-retention') return {spec:label,summary:'retain expired operational timers and duplicate stump marks',apply:()=> 'bounded retention disabled',install(){const was=memoryRetentionOn();setMemoryRetention(false);return ()=>setMemoryRetention(was);}};
  if (kind === 'rich-no-household-practices') return {spec:label,summary:'disable household practice learning and preference only',apply:()=> 'household practices disabled',install(){const was=householdPracticesOn();setHouseholdPractices(false);return ()=>setHouseholdPractices(was);}};
  if (kind === 'rich-no-political-alignment') return {spec:label,summary:'disable persistent political alignment only',apply:()=> 'political alignment disabled',install(){const was=politicalAlignmentOn();setPoliticalAlignment(false);return ()=>setPoliticalAlignment(was);}};
  if (kind === 'rich-no-exchange-journeys') return {spec:label,summary:'disable exchange journeys and leads only',apply:()=> 'exchange journeys disabled',install(){const was=exchangeJourneysOn();setExchangeJourneys(false);return ()=>setExchangeJourneys(was);}};
  if (kind === 'rich-no-relocation') return {spec:label,summary:'disable household relocation only',apply:()=> 'household relocation disabled',install(){const was=relocationsOn();setRelocations(false);return ()=>setRelocations(was);}};
  if (kind === 'rich-universal-techniques') return {spec:label,summary:'remove held-technique requirement and instruction',apply:()=> 'universal technique access restored',install(){const was=techniquesOn();setTechniques(false);return ()=>setTechniques(was);}};
  if (kind === 'rich-adult-newborn-skills') return {spec:label,summary:'restore adult-range skills for newly created children',apply:()=> 'historical skill initialisation restored for subsequent births/arrivals',install(){const was=developmentOn();setDevelopment(false);return ()=>setDevelopment(was);}};
  if (kind === 'rich-no-work-tastes') return {spec:label,summary:'remove personal work tastes only; changes nothing below version 31',apply:()=> 'work tastes off',install(){const was=workTastesOn();setWorkTastes(false);return ()=>setWorkTastes(was);}};
  if (kind === 'rich-no-leave-heaviest') return {spec:label,summary:'remove leaving a left-over to free the hands only; changes nothing below version 33',apply:()=> 'leave-heaviest off',install(){const was=leaveHeaviestOn();setLeaveHeaviest(false);return ()=>setLeaveHeaviest(was);}};
  if (kind === 'rich-no-stored-material-plans') return {spec:label,summary:'remove remembered raw storage from personal/building acquisition and plan viability; no effect below rules 40',install(){const was=storedMaterialPlansOn();setStoredMaterialPlans(false);return ()=>setStoredMaterialPlans(was);}};
  if (kind === 'rich-no-stored-material-promises') return {spec:label,summary:'remove remembered raw storage from promise feasibility and acquisition; no effect below rules 40',install(){const was=storedMaterialPromisesOn();setStoredMaterialPromises(false);return ()=>setStoredMaterialPromises(was);}};
  if (kind === 'rich-no-project-helper-choice') return {spec:label,summary:'use first feasible project-material helper instead of personal trust; no effect below rules 39',install(){const was=projectHelperChoiceOn();setProjectHelperChoice(false);return ()=>setProjectHelperChoice(was);}};
  if (kind === 'rich-no-learner-instruction') return {spec:label,summary:'remove learner-initiated instruction only; teacher offers unchanged; no effect below rules 41',install(){const was=learnerInstructionOn();setLearnerInstruction(false);return ()=>setLearnerInstruction(was);}};
  if (kind === 'rich-no-civic-benefit') return {spec:label,summary:'remove personal public-store benefit credit only; physical goods unchanged; no effect below rules 42',install(){const was=civicBenefitOn();setCivicBenefit(false);return ()=>setCivicBenefit(was);}};
  if (kind === 'rich-no-local-demand') return {spec:label,summary:'remove heard material demand from trade review only; requests and work unchanged; no effect below rules 43',install(){const was=localDemandOn();setLocalDemand(false);return ()=>setLocalDemand(was);}};
  if (kind === 'rich-no-food-fetch') return {spec:label,summary:'remove the empty-handed food fetch promise only; gifts, held-food promises and delivery unchanged; no effect below rules 45',install(){const was=foodFetchOn();setFoodFetch(false);return ()=>setFoodFetch(was);}};
  if (kind === 'rich-no-seek-carer') return {spec:label,summary:'remove the dependant going to find a household adult only; asks, care and food promises unchanged; no effect below rules 45',install(){const was=seekCarerOn();setSeekCarer(false);return ()=>setSeekCarer(was);}};
  if (kind === 'rich-no-winter-reserve') return {spec:label,summary:'season reserve target, window, durable preference and granary eating back to rules 45 together; hardship cue unchanged; no effect below rules 46',install(){const was=winterReserveOn();setWinterReserve(false);return ()=>setWinterReserve(was);}};
  if (kind === 'rich-no-winter-shelter') return {spec:label,summary:'no pre-winter cue on laying out, finishing or mending a home, and a home site is blocked by its own workshop site and the open-site cap and cancelled for idleness as before; no effect below rules 47',install(){const was=winterShelterOn();setWinterShelter(false);return ()=>setWinterShelter(was);}};
  if (kind === 'rich-no-delivery-place') return {spec:label,summary:'a promise to a person names no place to leave it and the food ask ignores trust; hand-over, credit and consequences unchanged; no effect below rules 48',install(){const was=deliveryPlaceOn();setDeliveryPlace(false);return ()=>setDeliveryPlace(was);}};
  if (kind === 'rich-no-civic-food-benefit') return {spec:label,summary:'remove the public-food meal receipt only; withdrawal receipts and physical food unchanged; no effect below rules 49',install(){const was=civicFoodBenefitOn();setCivicFoodBenefit(false);return ()=>setCivicFoodBenefit(was);}};
  if (kind === 'rich-no-batch-plans') return {spec:label,summary:'no batch plan is taken on; every workshop option stays as it was; no effect below rules 50',install(){const was=batchPlansOn();setBatchPlans(false);return ()=>setBatchPlans(was);}};
  if (kind === 'rich-no-transport') return {spec:label,summary:'nothing carried on foot is counted toward wanting a cart, no cart trip beyond a building site is offered and no loaded cart is recovered; site hauls and the cart itself unchanged; no effect below rules 55',install(){const was=transportOn();setTransport(false);return ()=>setTransport(was);}};
  if (kind === 'rich-no-practical-care') return {spec:label,summary:'remove rules-56 childcare location communication, local-contact and helper-reserve revalidation, and time-based request settlement; historical watch behaviour restored, no effect below 56',install(){const was=practicalCareOn();setPracticalCare(false);return ()=>setPracticalCare(was);}};
  if (kind === 'rich-no-workshop-tools') return {spec:label,summary:'remove only the connection from workshop-required tools to hand-tool plans, crafting and material options; borrowing remains; no effect below 57',install(){const was=workshopToolsOn();setWorkshopTools(false);return ()=>setWorkshopTools(was);}};
  if (kind === 'rich-no-seed-storage') return {spec:label,summary:'remove only seed storage trips offered to free capacity for a wanted raw material; existing farming withdrawal remains; no effect below 58',install(){const was=seedStorageOn();setSeedStorage(false);return ()=>setSeedStorage(was);}};
  if (kind === 'rich-no-cart-first') return {spec:label,summary:'the batch planner keeps the rules-58 order of wants, so a wanted cart yields to site materials; every other gate unchanged; no effect below 59',install(){const was=cartFirstOn();setCartFirst(false);return ()=>setCartFirst(was);}};
  if (kind === 'rich-no-batch-recipe-choice') return {spec:label,summary:'batch plans keep their pre-60 recipe ordering despite held/rack tool preference; supply offers unchanged',install(){const was=batchRecipeChoiceOn();setBatchRecipeChoice(false);return ()=>setBatchRecipeChoice(was);}};
  if (kind === 'rich-no-required-tool-recovery') return {spec:label,summary:'restore pre-61 work after required-tool loss and resume offers without replacement-tool demand',install(){const was=requiredToolRecoveryOn();setRequiredToolRecovery(false);return ()=>setRequiredToolRecovery(was);}};
  if (kind === 'rich-no-local-giving') return {spec:label,summary:'restore pre-62 forced exit for same-room gifts, start-only range checks and fed cooldown after zero receipt',install(){const was=localGivingOn();setLocalGiving(false);return ()=>setLocalGiving(was);}};
  if (kind === 'rich-no-care-capacity') return {spec:label,summary:'remove rules-63 full-pack food-care memory and home-store alternatives; ordinary giving and storage unchanged',install(){const was=careCapacityOn();setCareCapacity(false);return ()=>setCareCapacity(was);}};
  if (kind === 'rich-no-tool-precedence') return {spec:label,summary:'restore the first missing workshop tool instead of preferring a required tool to a convenience',install(){const was=toolPrecedenceOn();setToolPrecedence(false);return ()=>setToolPrecedence(was);}};
  if (kind === 'rich-no-kept-target') return {spec:label,summary:'allow the short candidate list to omit the running journey destination',install(){const was=keptTargetOn();setKeptTarget(false);return ()=>setKeptTarget(was);}};
  if(kind==='rich-no-water-care')return {spec:label,summary:'remove water hand-over capacity memory and household-store recovery offers',install(){const was=careWaterOn();setCareWater(false);return ()=>setCareWater(was);}};
  if(kind==='rich-no-project-plans')return {spec:label,summary:'remove bounded production prerequisite adoption and step offers; ordinary production remains',install(){const was=projectPlansOn();setProjectPlans(false);return ()=>setProjectPlans(was);}};
  if(kind==='rich-no-daily-routines')return {spec:label,summary:'remove learning and ranking of personal daily preferences; existing supper, winter and payoff learning remain',install(){const was=routinesOn();setRoutines(false);return ()=>setRoutines(was);}};
  if(kind==='rich-no-action-scope')return {spec:label,summary:'remove personally estimated trip/work amount and duration narrowing; ordinary demand and capacity checks remain',install(){const was=actionScopeOn();setActionScope(false);return ()=>setActionScope(was);}};
  if(kind==='rich-no-journeys')return {spec:label,summary:'remove personal trip provisioning, retained work purpose and carried provision estimates',install(){const was=journeysOn();setJourneys(false);return ()=>setJourneys(was);}};
  if(kind==='rich-no-journey-recovery')return {spec:label,summary:'remove personally failed trip source alternatives and their bounded abandonment',install(){const was=journeyRecoveryOn();setJourneyRecovery(false);return ()=>setJourneyRecovery(was);}};
  if(kind==='rich-no-source-learning')return {spec:label,summary:'remove source-specific gathering experience and firsthand correction; retain category payoff',install(){const was=sourceLearningOn();setSourceLearning(false);return ()=>setSourceLearning(was);}};
  if(kind==='rich-no-route-learning')return {spec:label,summary:'remove personal route experience and bounded reconsideration intervals; preserve ordinary failure handling',install(){const was=routeLearningOn();setRouteLearning(false);return ()=>setRouteLearning(was);}};
  if(kind==='rich-no-helper-learning')return {spec:label,summary:'remove task-specific direct-receipt learning; preserve ordinary relationship trust and voluntary replies',install(){const was=helperLearningOn();setHelperLearning(false);return ()=>setHelperLearning(was);}};
  if(kind==='rich-no-watch-learning')return {spec:label,summary:'remove witnessed watch-completion learning; preserve practical care and voluntary replies',install(){const was=watchLearningOn();setWatchLearning(false);return ()=>setWatchLearning(was);}};
  if(kind==='rich-no-build-promise-settlement')return {spec:label,summary:'retain prior deferred settlement after an actual 40-tick accepted building share',install(){const was=buildPromiseSettlementOn();setBuildPromiseSettlement(false);return ()=>setBuildPromiseSettlement(was);}};
  if(kind==='rich-no-flood-access')return {spec:label,summary:'remove durable flood footprints and personal access responses; retain historical onset damage',install(){const was=floodAccessEnabled();setFloodAccess(false);return ()=>setFloodAccess(was);}};
  if(kind==='rich-no-continuity-knowledge')return {spec:label,summary:'retain historical shared unfinished work knowledge without personal communication',install(){const was=continuityKnowledgeOn();setContinuityKnowledge(false);return ()=>setContinuityKnowledge(was);}};
  if(kind==='rich-no-estate-custody')return {spec:label,summary:'new deaths leave historical public heaps; existing physical ownership remains',install(){const was=estateCustodyOn();setEstateCustody(false);return ()=>setEstateCustody(was);}};
  if(kind==='rich-no-estate-release')return {spec:label,summary:'a dissolved household keeps its estate parcels stamped for it, as before rules 163; no effect below 163',install(){const was=estateReleaseOn();setEstateRelease(false);return ()=>setEstateRelease(was);}};
  if(kind==='rich-no-work-handover')return {spec:label,summary:'remove informed living-worker handover and handback conversations',install(){const was=workHandoverOn();setWorkHandover(false);return ()=>setWorkHandover(was);}};
  if(kind==='rich-no-care-supply')return {spec:label,summary:'remove acquisition motivated by personally observed resident care; retain existing handoff',install(){const was=careSupplyOn();setCareSupply(false);return ()=>setCareSupply(was);}};
  if(kind==='rich-no-warmth-duty')return {spec:label,summary:'remove informed fire-duty acquisition and fuel reserve checks',install(){const was=warmthDutyOn();setWarmthDuty(false);return ()=>setWarmthDuty(was);}};
  if(kind==='rich-no-care-handback')return {spec:label,summary:'remove explicit childcare recovery handback and retained watch progress',install(){const was=careHandbackOn();setCareHandback(false);return ()=>setCareHandback(was);}};
  if(kind==='rich-no-hand-feeding')return {spec:label,summary:'a hand-over to a hungry person with no pack room fails again instead of feeding them (rules 159 removal)',install(){const was=handFeedingOn();setHandFeeding(false);return ()=>setHandFeeding(was);}};
  if(kind==='rich-no-shared-stone')return {spec:label,summary:'remove all four rules-162 stone parts: first storehouse, quarry yard as a store, stone restock and the stored-stone cue',install(){const was=(['first','each','quarry','restock','cue'] as SharedStonePart[]).map(k=>sharedStonePartOn(k));setSharedStone(false);return ()=>(['first','each','quarry','restock','cue'] as SharedStonePart[]).forEach((k,i)=>setSharedStone(was[i],k));}};
  for(const [name,part,what] of [['rich-first-storehouse-once','each','only the first storehouse in the whole world is laid out without the food, temperament and open-site gates; other separate settlements keep the older gates'],['rich-no-first-storehouse','first','the first storehouse again waits for the food, temperament and open-site gates'],['rich-no-quarry-stone','quarry','a quarry yard is no longer a place to collect stone for sites, promises or tools'],['rich-no-stone-restock','restock','the public store no longer aims at 16 stone or restocks it from a quarry yard'],['rich-no-stored-stone-cue','cue','a store holding the stone a building costs no longer makes that building more attractive']] as const)
    if(kind===name)return {spec:label,summary:`${what} (rules 162 removal)`,install(){const was=sharedStonePartOn(part);setSharedStone(false,part);return ()=>setSharedStone(was,part);}};
  if(kind==='rich-no-found-empty')return {spec:label,summary:'name every gather left for an empty place "something better came up" again (rules 161 removal)',install(){const was=foundEmptyOn();setFoundEmpty(false);return ()=>setFoundEmpty(was);}};
  if(kind==='rich-no-eat-in-hand')return {spec:label,summary:'let hunger gathering outlast critical hunger with food in the pack again (rules 158 removal)',install(){const was=eatInHandOn();setEatInHand(false);return ()=>setEatInHand(was);}};
  if(kind==='rich-no-handover-truth')return {spec:label,summary:'report every empty hand-over as a full pack again (rules 157 removal)',install(){const was=handoverTruthOn();setHandoverTruth(false);return ()=>setHandoverTruth(was);}};
  if(kind==='rich-no-child-tasks')return {spec:label,summary:'let children gather wood and stone again (rules 156 removal); other child limits unchanged',install(){const was=childTasksOn();setChildTasks(false);return ()=>setChildTasks(was);}};
  if(kind==='rich-no-confidence')return {spec:label,summary:'remove weighing food hearsay and passing it on by what the listener found when checking that teller, and by its age; accounts, beliefs and asks unchanged',install(){const was=tellerConfidenceOn();setTellerConfidence(false);return ()=>setTellerConfidence(was);}};
  if(kind==='rich-no-checked-accounts')return {spec:label,summary:'remove holding a first-hand account of a place to its teller once checked; beliefs, hearsay replacement and other asks unchanged',install(){const was=checkedAccountsOn();setCheckedAccounts(false);return ()=>setCheckedAccounts(was);}};
  if(kind==='rich-no-home-replacement-knowledge')return {spec:label,summary:'remove personal housing knowledge for layout and matching duplicate-home allocation checks',install(){const was=homeReplacementOn();setHomeReplacement(false);return ()=>setHomeReplacement(was);}};
  if(kind==='rich-no-construction-finish')return {spec:label,summary:'restore the historical last-two-percent exclusion for fully supplied construction',install(){const was=constructionFinishOn();setConstructionFinish(false);return ()=>setConstructionFinish(was);}};
  if(kind==='rich-no-water-search')return {spec:label,summary:'restore home-anchored daytime-only exploration and its historical activity purpose',install(){const was=waterSearchOn();setWaterSearch(false);return ()=>setWaterSearch(was);}};
  if(kind==='rich-no-occasion-participation')return {spec:label,summary:'restore removal of the ongoing gathering after admission',install(){const was=occasionParticipationOn();setOccasionParticipation(false);return ()=>setOccasionParticipation(was);}};
  if(kind==='rich-no-occasion-recovery')return {spec:label,summary:'restore discarded occasion progress and entity-only resume validation',install(){const was=occasionRecoveryOn();setOccasionRecovery(false);return ()=>setOccasionRecovery(was);}};
  if(kind==='rich-no-childhood')return {spec:label,summary:'remove childhood time and small-pack household returns',install(){const was=childhoodOn();setChildhood(false);return ()=>setChildhood(was);}};
  if(kind==='rich-no-lived-life')return {spec:label,summary:'remove the Pavel lived-life increment',install(){const was=livedLifeOn();setLivedLife(false);return ()=>setLivedLife(was);}};
  if(kind==='rich-no-suspended-endings')return {spec:label,summary:'restore the silent discard of a paused ordinary activity that cannot resume',install(){const was=suspendedEndingsOn();setSuspendedEndings(false);return ()=>setSuspendedEndings(was);}};
  if(kind==='rich-no-project-allocation')return {spec:label,summary:'restore netting all project claims regardless of adoption order',install(){const was=orderedProjectClaimsOn();setOrderedProjectClaims(false);return ()=>setOrderedProjectClaims(was);}};
  if(kind==='rich-no-project-hand-inputs')return {spec:label,summary:'restore releasing immediate project hand-tool ingredients',install(){const was=projectHandInputsOn();setProjectHandInputs(false);return ()=>setProjectHandInputs(was);}};
  if(kind==='rich-no-hungry-harvest')return {spec:label,summary:'restore suppression of ripe household crop harvesting during hunger',install(){const was=hungryHarvestOn();setHungryHarvest(false);return ()=>setHungryHarvest(was);}};
  if(kind==='rich-no-wild-seed-input')return {spec:label,summary:'restore seed conversion even when no carried grain was consumed',install(){const was=wildSeedInputOn();setWildSeedInput(false);return ()=>setWildSeedInput(was);}};
  if(kind==='rich-no-remembered-need')return {spec:label,summary:'remove deciding care for an out-of-sight dependant from how they looked when last seen; the live figures are read as before 106',install(){const was=rememberedNeedOn();setRememberedNeed(false);return ()=>setRememberedNeed(was);}};
  if(kind==='rich-no-location-questions')return {spec:label,summary:'remove asking a present neighbour where a promised person is; other info questions remain',install(){const was=locationQuestionsOn();setLocationQuestions(false);return ()=>setLocationQuestions(was);}};
  if(kind==='rich-no-supper-telling')return {spec:label,summary:'remove the telling of household undertakings at a shared supper; conversations still tell',install(){const was=supperTellingOn();setSupperTelling(false);return ()=>setSupperTelling(was);}};
  if(kind==='rich-no-decision-ledger')return {spec:label,summary:'stop writing the personal decision ledger; no behaviour depends on it',install(){const was=decisionLedgerOn();setDecisionLedger(false);return ()=>setDecisionLedger(was);}};
  if(kind==='rich-no-single-roof-duty')return {spec:label,summary:'allow a second roof promise for a building already promised; rules 101 acceptance',install(){const was=singleRoofDutyOn();setSingleRoofDuty(false);return ()=>setSingleRoofDuty(was);}};
  if(kind==='rich-no-promised-supply')return {spec:label,summary:'remove promised-material coverage of own site fetching and home-site planning; expectations are still remembered',install(){const was=promisedSupplyOn();setPromisedSupply(false);return ()=>setPromisedSupply(was);}};
  if(kind==='rich-no-household-supply')return {spec:label,summary:'remove deferral of a heard household reserve and complementary site material choice; heard records are still kept',install(){const was=householdSupplyOn();setHouseholdSupply(false);return ()=>setHouseholdSupply(was);}};
  if(kind==='rich-no-ready-step')return {spec:label,summary:'remove the prepared-step preference and same-workshop stock rule; rules 98 project steps',install(){const was=readyStepOn();setReadyStep(false);return ()=>setReadyStep(was);}};
  if(kind==='rich-no-repair-duty')return {spec:label,summary:'remove heard roof destinations and reserved-supply fallback preparation',install(){const was=repairDutyOn();setRepairDuty(false);return ()=>setRepairDuty(was);}};
  if(kind==='rich-no-meeting-knowledge')return {spec:label,summary:'retain shared-status meal decisions; remove private heard appointments and replacement invitations',install(){const was=meetingKnowledgeOn();setMeetingKnowledge(false);return ()=>setMeetingKnowledge(was);}};
  if(kind==='rich-no-meal-leftovers')return {spec:label,summary:'retain historical automatic table return; remove owned leftover recovery',install(){const was=mealLeftoversOn();setMealLeftovers(false);return ()=>setMealLeftovers(was);}};
  if(kind==='rich-no-offcuts')return {spec:label,summary:'remove newly recoverable timber fuel and its use; retain the original waste sink',install(){const was=offcutsOn();setOffcuts(false);return ()=>setOffcuts(was);}};
  if(kind==='rich-no-preservation')return {spec:label,summary:'disable preservation decisions and new batches; keep food properties and existing paid contents',install(){const was=preservationOn();setPreservation(false);return ()=>setPreservation(was);}};
  if(kind==='rich-no-hearth')return {spec:label,summary:'disable new hearth decisions; keep installed heat and paid construction',install(){const was=hearthOn();setHearth(false);return ()=>setHearth(was);}};
  if(kind==='rich-no-water-budget')return {spec:label,summary:'remove finite natural supply, weather accounting and personal dry-water responses',install(){const was=waterBudgetEnabled();setWaterBudget(false);return ()=>setWaterBudget(was);}};
  if(kind==='rich-no-ecology')return {spec:label,summary:'remove persistent productive condition, observation and field rest',install(){const was=ecologyEnabled();setEcology(false);return ()=>setEcology(was);}};
  if(kind==='rich-no-promise-delays')return {spec:label,summary:'remove active-promise delay explanations and one bounded deadline negotiation',install(){const was=promiseDelaysOn();setPromiseDelays(false);return ()=>setPromiseDelays(was);}};
  if(kind==='rich-no-request-cancellation')return {spec:label,summary:'remove requester-initiated target cancellation and its communication',install(){const was=requestCancellationOn();setRequestCancellation(false);return ()=>setRequestCancellation(was);}};
  if(kind==='rich-no-promise-targets')return {spec:label,summary:'restore hidden target-loss cancellation and prior site-completion inference',install(){const was=promiseTargetsOn();setPromiseTargets(false);return ()=>setPromiseTargets(was);}};
  if(kind==='rich-no-promise-expectations')return {spec:label,summary:'remove heard-agreement expectations and restore prior shared request readers and death cancellation',install(){const was=promiseExpectationsOn();setPromiseExpectations(false);return ()=>setPromiseExpectations(was);}};
  if(kind==='rich-no-promise-outcomes')return {spec:label,summary:'remove personal failed-attempt evidence and outcome reporting; restore prior deadline attribution',install(){const was=promiseOutcomesOn();setPromiseOutcomes(false);return ()=>setPromiseOutcomes(was);}};
  if(kind==='rich-no-promise-knowledge')return {spec:label,summary:'remove local completion knowledge and reporting; restore prior promise attribution',install(){const was=promiseKnowledgeOn();setPromiseKnowledge(false);return ()=>setPromiseKnowledge(was);}};
  if(kind==='rich-no-stored-water')return {spec:label,summary:'remove household stored-water drinking offers',install(){const was=storedWaterOn();setStoredWater(false);return ()=>setStoredWater(was);}};
  if (kind === 'rich-no-resident-care') return {spec:label,summary:'remove remembered indoor contact and resident care-return offers',install(){const was=residentCareOn();setResidentCare(false);return ()=>setResidentCare(was);}};
  if (kind === 'rich-no-craft-capacity') return {spec:label,summary:'restore pre-consumption capacity checking when a hand tool finishes; no effect below 58',install(){const was=craftCapacityOn();setCraftCapacity(false);return ()=>setCraftCapacity(was);}};
  if (kind === 'rich-no-relocation-extensions') return {spec:label,summary:'relocation keeps the rules-20 whole-household form: no subgroup consent, succession, return or search; no effect below rules 54',install(){const was=relocationExtensionsOn();setRelocationExtensions(false);return ()=>setRelocationExtensions(was);}};
  if (kind === 'rich-no-succession') return {spec:label,summary:'nothing a dead member left unfinished is recorded or taken up; plans, sites, piles and promises at death unchanged; no effect below rules 53',install(){const was=successionOn();setSuccession(false);return ()=>setSuccession(was);}};
  if (kind === 'rich-no-winter-practice') return {spec:label,summary:'no winter meal is counted, nothing is learned at winter\'s end and no season cue opens earlier; the reserve itself unchanged; no effect below rules 53',install(){const was=winterPracticeOn();setWinterPractice(false);return ()=>setWinterPractice(was);}};
  if (kind === 'rich-no-technique-tree') return {spec:label,summary:'smelting and forging are read as known by everyone and nobody tries a procedure untaught; charcoal firing, lessons and backgrounds unchanged; no effect below rules 52',install(){const was=techniqueTreeOn();setTechniqueTree(false);return ()=>setTechniqueTree(was);}};
  if (kind === 'rich-no-customers') return {spec:label,summary:'no unmet ask is remembered as a customer, nothing is brought to one, and the trade review reads no returns; asks, barter, gifts and favours unchanged; no effect below rules 51',install(){const was=customersOn();setCustomers(false);return ()=>setCustomers(was);}};
  if (kind === 'rich-no-batch-resume') return {spec:label,summary:'a batch under way blocks every operate as before rules 50; the batch plan itself is unchanged; no effect below 50',install(){const was=batchResumeOn();setBatchResume(false);return ()=>setBatchResume(was);}};
  if (kind === 'rich-uniform-backgrounds') return {spec:label,summary:'retain previous starting skills and universal adult charcoal knowledge for future creation only; existing people unchanged',install(){const was=backgroundsOn();setBackgrounds(false);return ()=>setBackgrounds(was);}};
  if (kind === 'rich-no-achievement-aftermath') return {spec:label,summary:'remove construction satisfaction and later hopes only; no effect below rules 38',apply:()=> 'achievement aftermath off',install(){const was=achievementAftermathOn();setAchievementAftermath(false);return ()=>setAchievementAftermath(was);}};
  if (kind === 'rich-no-reconsider') return {spec:label,summary:'remove plan reconsideration only; changes nothing below version 34',apply:()=> 'plan reconsideration off',install(){const was=reconsiderOn();setReconsider(false);return ()=>setReconsider(was);}};
  if (kind === 'rich-no-leisure') return {spec:label,summary:'restore the single idle fallback (potter about near home) and nothing else; below version 28 it changes nothing',apply:(w)=>{w.settings.dynamics='rich';return 'rich dynamics on, varied spare time off';},install(){const was=leisureOnSwitch();setLeisure(false);return ()=>setLeisure(was);}};
  if (kind === 'rich-remote-markets') return {spec:label,summary:'restore legacy remote market exchanges',apply:()=> 'remote market behavior restored',install(){const was=localMarketOn();setLocalMarket(false);return ()=>setLocalMarket(was);}};
  if (kind === 'rich-no-civic-choice') return {spec:label,summary:'restore single-organiser project acceptance',apply:()=> 'collective coordinator choice off',install(){const was=civicChoiceOn();setCivicChoice(false);return ()=>setCivicChoice(was);}};
  if (kind === 'rich-global-death-news') return { spec: label, summary: 'restore global death notification', apply: () => 'global death notification restored', install() { const was = localDeathOn(); setLocalDeath(false); return () => setLocalDeath(was); } };
  if (kind === 'rich-no-reputation-dedup') return { spec: label, summary: 'restore the duplicate relationship and reputation effect of stories', apply: () => 'duplicate reputation restored', install() { const was = singleCountOn(); setSingleCount(false); return () => setSingleCount(was); } };
  if (kind === 'rich-no-townships') return { spec: label, summary: 'township organisation disabled; physical work and other rules unchanged', apply: () => 'townships off', install() { const was = townshipsOn(); setTownships(false); return () => setTownships(was); } };
  if (kind === 'rich-no-table-eating') {
    return {
      spec: label,
      summary: 'current dynamics with eating at a store removed: a person whose pack has no room for the food in a stocked store fails and writes the store off, as before version 9. A meal with room in the pack, and every other rule, are unchanged. Below rules version 9 it changes nothing',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, eating at a store off';
      },
      install: () => {
        setTableEating(false);
        return () => setTableEating(true);
      },
    };
  }
  if (kind === 'rich-no-defence') {
    return {
      spec: label,
      summary: 'current dynamics with the defensive action removed: spears are still made and carried, but nobody stands and faces a wolf with one',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, wolf defence off';
      },
      install: () => {
        setWolfDefence(false);
        return () => setWolfDefence(true);
      },
    };
  }
  if (kind === 'rich-no-trades') {
    return {
      spec: label,
      summary: 'current dynamics with trades and apprenticeship disabled: no trade preference or apprentice teaching',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'rich dynamics on, trades off';
      },
      install: () => {
        setTrades(false);
        return () => setTrades(true);
      },
    };
  }
  if (kind === 'rich-stakes-only') {
    return {
      spec: label,
      summary: 'rich dynamics with the stakes (lean seasons, winter, faster spoilage, bolder wolves) but moods change nothing',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'stakes on, mood effects off';
      },
      install: () => {
        setMoodEffects(false);
        return () => setMoodEffects(true);
      },
    };
  }
  if (kind === 'rich-mood-only') {
    return {
      spec: label,
      summary: 'rich dynamics with moods that change choices and quarrels but none of the stakes',
      apply: (w) => {
        w.settings.dynamics = 'rich';
        return 'mood effects on, stakes off';
      },
      install: () => {
        setStakes(false);
        return () => setStakes(true);
      },
    };
  }
  if (kind === 'random-choice') {
    return {
      spec: label,
      summary: 'people pick among the options they may take by a hash, not by utility',
      install: () => {
        setOptionChooser('random');
        return () => setOptionChooser('utility');
      },
    };
  }
  if (kind === 'no-wolf-memory') {
    return {
      spec: label,
      summary: 'wolves repeat searches that cannot give a new answer (an exact optimisation, so expected: identical to control)',
      install: () => {
        setWolfSearchMemory(false);
        return () => setWolfSearchMemory(true);
      },
    };
  }
  throw new Error(`unknown branch "${specIn}"`);
}

const WORKPLACES = ['storehouse', 'timber_yard', 'quarry', 'kiln', 'granary', 'hall', 'bakery', 'smithy'];
export const METRICS = [
  'workplaces',
  'solidHomes',
  'buildings',
  'plots',
  'people',
  'deaths',
  'homeless',
  'belowCritical',
  'meanHunger',
  'firstYardDay',
  'firstHallDay',
  'meanMood',
  'lowMood',
  // what projects are for: tools in people's hands and roofs that are sound. Not gated (scripts/gates.ts GATED), so an old
  // recorded baseline without them still works; they are here so the ensemble run can see whether planning changes either.
  'tools',
  'meanCondition',
  // what Stage D1 is for, counted over the whole branch rather than read off the end state (an ended plan and an answered request
  // are trimmed from the records in time): tool and repair plans taken on and finished, asks made for a project's material, and the
  // units that really arrived in answer to them. Not gated either.
  'projectsAdopted',
  'projectsDone',
  'projectAsks',
  'askUnitsDelivered',
  // what Stage 3 is for: do people come to differ in what they do? `specialisation` is the mean, over everyone who set off to gather
  // at least four times, of how concentrated their gathering was on one kind (a Herfindahl index over forage/fish/wood/stone/…: 1 =
  // always the same kind, 1/kinds = spread evenly); `topKindShare` is the share of all gathering in the village's single most-used
  // kind, to tell a village of specialists from a village that all does one thing. Not gated.
  'specialisation',
  'topKindShare',
  // What rules version 2's household food preparation is for, counted over the whole branch (a plan is trimmed from the record
  // once enough have ended) and, for the last three, at the end of it. Not gated, so an older recorded baseline still works.
  //   prepAdopted/Season/Hardship  preparations taken on, and by which of the two cues
  //   prepDone / prepDropped       reached the target by the person's own hands / ended any other way
  //   prepUnits                    units of food that really went into a home store for a preparation
  //   prepDays                     person-days spent on an activity chosen AS a step of a preparation: the time it diverts
  //   hungerExposure               share of all person-time spent below critical hunger: exposure, not an end-state snapshot
  //   homeFoodPerPerson            food in home stores at the end, per living person: what a household can actually reach
  //   storeFoodPerPerson           the same counting the shared storehouse too
  'prepAdopted',
  'prepSeason',
  'prepHardship',
  'prepDone',
  'prepDropped',
  'prepUnits',
  'prepDays',
  'hungerExposure',
  'homeFoodPerPerson',
  'storeFoodPerPerson',
  // What rules version 4's wolf defence is for, counted over the whole branch, with the stages kept apart because an
  // intention is not an outcome. Not gated, so an older recorded baseline still works.
  //   spears / armedAtEnd       registered spears at the end; people holding a usable one at the end
  //   defenceOffered            chances to stand: a defence on the table at a decision
  //   defenceSetOut             somebody actually walked at a wolf
  //   defenceTried              somebody within reach actually had a go; offers include re-evaluations
  //   defenceDroveOff / Failed  what those attempts came to
  //   defenceLeftOnItsOwn       the wolf broke off before the attempt: the OLD group-proximity rule, not this one
  //   wolvesWary                wolves keeping clear of somebody they were driven off by, at the end
  //   bitesTaken                people bitten over the branch, which is what defence is supposed to bear on
  'spears',
  'armedAtEnd',
  'defenceOffered',
  'defenceSetOut',
  'defenceTried',
  'defenceDroveOff',
  'defenceFailed',
  'defenceLeftOnItsOwn',
  'wolvesWary',
  'bitesTaken',
  // What ordinary life is for, counted over the whole branch (11 November 2026, the survival-pressure rebalance): the conversations
  // that happen (one count per conversation, by purpose; a conversation that never opened is not counted), the meals sat down to, the
  // visits paid, the spare-time outings, and where the ended-activity time went: survival (eating, drinking, fetching water, sleeping,
  // resting, warming, fleeing, defending, hunting, butchering, gathering food, fuelling a fire), work (every other job) and life
  // (company, childhood, learning, meals, visits, respects, spare time) and sleep (sleep and rest, its own bucket). Shares are of
  // ended-activity ticks, 0 to 1, over everyone and by stage at the end of the activity. Deaths by cause since the fork, and person-time
  // below critical thirst and warmth beside hunger.
  'chats', 'familyTime', 'childPlay', 'foragingPractice', 'coaching', 'otherTalk', 'mealsSat', 'visits', 'spareTime',
  'lifeShare', 'survivalShare', 'workShare', 'sleepShare', 'lifeShareChild', 'lifeShareAdult', 'lifeShareElder',
  'deathsHunger', 'deathsThirst', 'deathsExposure', 'thirstExposure', 'coldExposure',
  // the burden itself, as person-time: awake and hungry (hunger below the drive's start, 62), awake and thirsty (thirst below 66),
  // and the fed window (awake with hunger, thirst and energy all above 65, the level coaching and foraging practice ask for)
  'hungryShare', 'thirstyShare', 'fedWindowShare',
  // what the life stream (rules 200 to 202) is for, counted over the whole branch: approaches that ended before any talk (a socialize
  // activity that ends is always one: an answered approach becomes the conversation) and their share of all approaches; talk about a
  // swap; markets called; apprentices at the end; times the fire went out and times it was fed; jobs finished at a timber yard; and
  // timber yards, laid out or standing, that belong to nobody at the end.
  'approachesFailed', 'approachFailShare', 'tradeTalk', 'marketsCalled', 'apprenticesAtEnd', 'fireOuts', 'fireFeeds', 'yardJobs', 'sharedYardsAtEnd',
  // what rules 203 is for: households whose home is a lean-to or nothing at the end, home sites open at the end, and sites given up
  // for idleness over the branch (the cost a looser cap could bring)
  'householdsWithoutSolidHome', 'homeSitesOpen', 'sitesAbandoned',
  // what rules 204 is for: grown people (twelve and over) holding a basket at the end, their share of the grown, and trips home made
  // so that the basket's wood would fit
  'grownWithBasket', 'basketShare', 'basketRoomTrips',
  // what rules 205 is for: trips home with food beyond the ration, trips home with wood or stone nothing needed, meals eaten out of
  // the pack and from a store, and site deliveries completed
  'rationTrips', 'materialsHomeTrips', 'mealsFromPack', 'mealsFromStore', 'siteDeliveries',
  // what rules 207 is for: jobs finished at any workplace, those of them done by somebody with no earned access to it (a guest),
  // and handcarts standing at the end
  'workplaceJobs', 'guestJobs', 'cartsAtEnd',
  // what rules 210 is for: practices completed by what they were about, those given by a child, practices refused because the teacher
  // knew no more, and the mean skill of the under-twelves alive at the end
  'lessonsForage', 'lessonsFish', 'lessonsFarm', 'lessonsByChild', 'lessonRefusals', 'childForage', 'childFish', 'childFarm',
  // what rules 211 is for: games between two children finished, by which game; games refused because the child asked had had
  // theirs; and plays alone finished, by which
  'gamesGuess', 'gamesChase', 'gamesHide', 'gamesHouse', 'gameRefusals', 'soloStones', 'soloBugs', 'soloSticks',
  // what rules 213 is for: food gathering finished by a little one, by a child and by a grown person (12 and over), and the
  // ticks each spent at it; the under-twelves' share of food gathered; and hunger by age band (share of waking ticks hungry)
  'gathersLittle', 'gathersChild', 'gathersOlder', 'gatherHoursLittle', 'gatherHoursChild', 'gatherHoursOlder', 'childFoodShare',
  'hungryLittle', 'hungryChild', 'hungryOlder',
  // what rules 215 is for: toys carved, toys handed to a child, plays with a toy finished, toys in the world at the end and the
  // under-twelves holding one
  'toysMade', 'toysGiven', 'toyPlays', 'toysAtEnd', 'childrenWithToy',
  // what rules 216 is for: evenings by the fire finished, by everyone and by elders; stories told there, and those who heard one,
  // all and children
  'fireSits', 'fireSitsElder', 'storiesTold', 'storyHearers', 'storyHearersChild',
  // what rules 220 is for: days that ended with a lean season under way, and with a dry spell under way
  'leanDays', 'dryDays',
  ...CIVILISATION_METRICS,
] as const;
export type Metric = (typeof METRICS)[number];
export type Outcome = Record<Metric, number>;

/**
 * The projects of a branch, tallied tick by tick, because the end state does not keep them: an ended plan is trimmed from a person's
 * record once enough have ended, and an answered request from the world's once enough have been made. `tick` is called after every
 * step; a plan is counted once, when first seen, and again when first seen ended; a request that names a plan is counted once, and
 * its `delivered` re-read every tick so the sum holds what had arrived when it was last on the record. (A request trimmed on the
 * very tick its last unit arrived is counted at what was last seen: a bounded undercount, never an overcount.)
 */
export class ProjectTally {
  private plans = new Map<string, boolean>();
  private delivered = new Map<number, number>();
  adopted = 0;
  done = 0;
  asks = 0;
  tick(w: World): void {
    for (const p of w.persons) {
      if (!p.intentions.length) continue;
      for (const i of p.intentions) {
        // a food reserve is a plan, but it is not one of the PROJECTS this counts; it has its own tally, so that adding it did
        // not silently change what `projectsAdopted` has always meant
        if (i.kind === 'night' || i.kind === 'stock') continue;
        const k = p.id + ':' + i.id;
        const ended = this.plans.get(k);
        if (ended === undefined) {
          this.adopted++;
          this.plans.set(k, i.status !== 'active');
          if (i.status === 'done') this.done++;
        } else if (!ended && i.status !== 'active') {
          this.plans.set(k, true);
          if (i.status === 'done') this.done++;
        }
      }
    }
    for (const r of w.requests) {
      if (r.planId === undefined) continue;
      if (!this.delivered.has(r.id)) this.asks++;
      this.delivered.set(r.id, r.delivered ?? 0);
    }
  }
  get units(): number {
    let n = 0;
    for (const v of this.delivered.values()) n += v;
    return n;
  }
}

/**
 * Household food preparation over a branch (rules version 2). Tallied tick by tick for the same reason the projects are: an
 * ended plan is trimmed from a person's record. A plan is counted once when first seen and once when first seen ended; the
 * food it put by is re-read every tick and kept at its highest, so a plan trimmed on the tick its last unit landed is counted
 * at what was last seen - a bounded undercount, never an overcount.
 *
 * It also carries two things that are about the branch rather than about any one plan: how much person-time went into
 * preparing (an activity the decision marked as a step of a live preparation), and how much person-time was spent below
 * critical hunger, which is exposure over the window rather than a snapshot of who happens to be hungry at the end.
 */
export class PrepTally {
  private plans = new Map<string, { ended: boolean; worked: number }>();
  adopted = 0;
  season = 0;
  hardship = 0;
  done = 0;
  dropped = 0;
  workTicks = 0;
  hungryTicks = 0;
  personTicks = 0;
  tick(w: World): void {
    for (const p of w.persons) {
      if (!p.alive) continue;
      this.personTicks++;
      if (p.needs.hunger < CRITICAL.hunger) this.hungryTicks++;
      if (!p.intentions.length) continue;
      const a = p.activity;
      for (const i of p.intentions) {
        if (i.kind !== 'stock') continue;
        const k = p.id + ':' + i.id;
        const rec = this.plans.get(k);
        if (!rec) {
          this.adopted++;
          if (i.cue === 'season') this.season++;
          else this.hardship++;
          this.plans.set(k, { ended: i.status !== 'active', worked: i.worked });
          if (i.status === 'done') this.done++;
          else if (i.status === 'dropped') this.dropped++;
        } else {
          rec.worked = Math.max(rec.worked, i.worked);
          if (!rec.ended && i.status !== 'active') {
            rec.ended = true;
            if (i.status === 'done') this.done++;
            else this.dropped++;
          }
        }
        if (a && i.status === 'active' && a.data.forPlan === i.id) this.workTicks++;
      }
    }
  }
  get units(): number {
    let n = 0;
    for (const r of this.plans.values()) n += r.worked;
    return n;
  }
  /** share of all person-time spent below critical hunger over the branch */
  get exposure(): number {
    return this.personTicks ? Math.round((this.hungryTicks / this.personTicks) * 10000) / 10000 : 0;
  }
}

/**
 * Wolf defence over a branch (rules version 4). The stage counters come from the module's own observation hooks, which
 * are off by default and never part of the world; this turns them on for the branch and reads them at the end. Bites
 * are counted at the bite callback, including fatal bites and multiple bites in one tick. Health and cooldown
 * snapshots cannot recover that event count.
 */
export class DefenceTally {
  bites = 0;
  bitten(): void { this.bites++; }
}

/**
 * Who set off to gather what, counted from the activity-start hook: one count per person per kind of gathering (the skill the
 * source trains). Starts, not units: what a person chooses to do is the question, and a choice is made at the start.
 */
export class GatherTally {
  private byPerson = new Map<number, Map<string, number>>();
  start(p: Person, a: Activity): void {
    if (a.kind !== 'gather') return;
    const type = a.data.stype as SourceType | undefined;
    const k = type ? SOURCE_SKILL[type] : undefined;
    if (!k) return;
    let m = this.byPerson.get(p.id);
    if (!m) this.byPerson.set(p.id, (m = new Map()));
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  /** mean Herfindahl index over people with at least `atLeast` starts; 0 when nobody qualifies */
  specialisation(atLeast = 4): number {
    let sum = 0;
    let n = 0;
    for (const m of this.byPerson.values()) {
      let total = 0;
      for (const v of m.values()) total += v;
      if (total < atLeast) continue;
      let h = 0;
      for (const v of m.values()) h += (v / total) ** 2;
      sum += h;
      n++;
    }
    return n ? Math.round((sum / n) * 1000) / 1000 : 0;
  }
  /** the share of every start that went to the one kind the village used most */
  topKindShare(): number {
    const all = new Map<string, number>();
    let total = 0;
    for (const m of this.byPerson.values())
      for (const [k, v] of m) {
        all.set(k, (all.get(k) ?? 0) + v);
        total += v;
      }
    let top = 0;
    for (const v of all.values()) top = Math.max(top, v);
    return total ? Math.round((top / total) * 1000) / 1000 : 0;
  }
}

/**
 * Ordinary life over a branch, read from the activity-end hook and a tick scan of the conversations on the record. Observation
 * only: nothing here is read by the simulation. Conversations are counted once each by purpose when first seen on `w.conversations`
 * (the pair, not the two people). Ended-activity ticks are summed by category and by the person's stage when the activity ended;
 * an activity's time is `world.tick - a.start` at its end, whatever its outcome, because the time was spent either way.
 */
export class LifeTally {
  private convs = new Set<number>();
  chats = 0; familyTime = 0; childPlay = 0; foragingPractice = 0; coaching = 0; otherTalk = 0;
  mealsSat = 0; visits = 0; spareTime = 0;
  approachesFailed = 0; tradeTalk = 0; fireOuts = 0; fireFeeds = 0; yardJobs = 0; sitesAbandoned = 0; basketRoomTrips = 0;
  rationTrips = 0; materialsHomeTrips = 0; mealsFromPack = 0; mealsFromStore = 0; siteDeliveries = 0;
  workplaceJobs = 0; guestJobs = 0;
  /** rules 213: food gathering finished and its ticks, by age band; food units gathered by band; awake and hungry ticks by band */
  gathers = { little: 0, child: 0, older: 0 }; gatherTicks = { little: 0, child: 0, older: 0 }; gatheredUnits = { little: 0, child: 0, older: 0 };
  awakeBand = { little: 0, child: 0, older: 0 }; hungryBand = { little: 0, child: 0, older: 0 };
  /** every practice seen, by conversation id, as it last stood: how it ended, what it was about, whether a child gave it */
  private practices = new Map<number, { outcome: string; reason: string; skill: string; byChild: boolean }>();
  private practiceCount(pred: (x: { outcome: string; reason: string; skill: string; byChild: boolean }) => boolean): number { let n = 0; for (const x of this.practices.values()) if (pred(x)) n++; return n; }
  /** every game seen, by conversation id, as it last stood */
  private games = new Map<number, { outcome: string; reason: string; game: string }>();
  private gameCount(pred: (x: { outcome: string; reason: string; game: string }) => boolean): number { let n = 0; for (const x of this.games.values()) if (pred(x)) n++; return n; }
  gamesOf(g: string): number { return this.gameCount((x) => x.outcome === 'completed' && x.game === g); }
  get gameRefusals(): number { return this.gameCount((x) => x.outcome === 'declined' && x.reason.startsWith('I have already had that time today')); }
  solo: Record<string, number> = { stones: 0, bugs: 0, sticks: 0 };
  toysMade = 0; toysGiven = 0;
  fireSits = 0; fireSitsElder = 0; storiesTold = 0; storyHearers = 0; storyHearersChild = 0;
  leanDays = 0; dryDays = 0;
  get lessonsForage(): number { return this.practiceCount((x) => x.outcome === 'completed' && x.skill === 'forage'); }
  get lessonsFish(): number { return this.practiceCount((x) => x.outcome === 'completed' && x.skill === 'fish'); }
  get lessonsFarm(): number { return this.practiceCount((x) => x.outcome === 'completed' && x.skill === 'farm'); }
  get lessonsByChild(): number { return this.practiceCount((x) => x.outcome === 'completed' && x.byChild); }
  get lessonRefusals(): number { return this.practiceCount((x) => x.outcome === 'declined' && x.reason === CANNOT_TEACH); }
  private markets = new Set<number>();
  private lastEvent = 0;
  private time = { life: 0, survival: 0, work: 0, sleep: 0 };
  awakeTicks = 0; hungryTicks = 0; thirstyTicks = 0; fedTicks = 0;
  private byStage: Record<Stage, { life: number; all: number }> = { child: { life: 0, all: 0 }, youth: { life: 0, all: 0 }, adult: { life: 0, all: 0 }, elder: { life: 0, all: 0 } };
  personTicks = 0; parchedTicks = 0; coldTicks = 0;
  static readonly SURVIVAL = new Set<string>(['eat', 'eat_store', 'drink', 'fetch_water', 'warm', 'flee', 'defend', 'hunt', 'butcher', 'fuel_fire', 'search']);
  static readonly SLEEP = new Set<string>(['sleep', 'rest']);
  static readonly LIFE = new Set<string>(['socialize', 'converse', 'attend', 'attend_meal', 'host_meal', 'visit', 'pay_respects', 'wander', 'alone', 'argue']);
  static readonly FOOD_SOURCES = new Set<string>(['berry_bush', 'fruit_tree', 'wild_grain', 'fish_spot']);
  end(w: World, p: Person, a: Activity, outcome: 'success' | 'failed' | 'interrupted' | 'partial'): void {
    const ticks = Math.max(0, w.tick - a.start);
    const food = a.kind === 'gather' && LifeTally.FOOD_SOURCES.has(String(a.data.stype));
    if (food) { const b = bandOf(w, p) ?? 'older'; this.gatherTicks[b] += ticks; this.gatheredUnits[b] += a.cycle ?? 0; if (a.cycle > 0) this.gathers[b]++; }
    const cat = LifeTally.SURVIVAL.has(a.kind) || food ? 'survival' : LifeTally.SLEEP.has(a.kind) ? 'sleep' : LifeTally.LIFE.has(a.kind) ? 'life' : 'work';
    this.time[cat] += ticks;
    const st = this.byStage[stageOf(w, p)];
    st.all += ticks;
    if (cat === 'life') st.life += ticks;
    // an approach that is answered turns into the conversation (its kind becomes 'converse'), so a socialize activity that ENDS never was
    if (a.kind === 'socialize') this.approachesFailed++;
    if (outcome !== 'success') return;
    if (a.kind === 'deposit' && a.data.basketRoom) this.basketRoomTrips++;
    if (a.kind === 'deposit' && a.data.ration) this.rationTrips++;
    if (a.kind === 'deposit' && a.data.packMaterials) this.materialsHomeTrips++;
    if (a.kind === 'eat') this.mealsFromPack++;
    else if (a.kind === 'eat_store') this.mealsFromStore++;
    else if (a.kind === 'haul') this.siteDeliveries++;
    if (a.kind === 'craft' && a.data.tool === 'toy') this.toysMade++;
    if (a.kind === 'give' && a.data.mode === 'toy') this.toysGiven++;
    if (a.kind === 'fuel_fire') this.fireFeeds++;
    else if (a.kind === 'operate') {
      const at = w.byId.get(a.targetId);
      if (at && at.ent === 'building' && at.type === 'timber_yard') this.yardJobs++;
      if (at && at.ent === 'building') { this.workplaceJobs++; if (earnedAccess(w, p, at) === 'none') this.guestJobs++; }
    }
    if (a.kind === 'attend_meal' || a.kind === 'host_meal') this.mealsSat++;
    else if (a.kind === 'visit') this.visits++;
    else if (a.kind === 'wander' && typeof a.data.play === 'string') this.solo[a.data.play] = (this.solo[a.data.play] ?? 0) + 1;
    else if (a.kind === 'wander' && a.data.evening === 'fire') { this.fireSits++; if (stageOf(w, p) === 'elder') this.fireSitsElder++; }
    else if (a.kind === 'wander') this.spareTime++;
  }
  tick(w: World): void {
    if (w.tick % DAY === 0 && w.hardship) { if (w.hardship.kind === 'dry') this.dryDays++; else this.leanDays++; }
    for (const c of w.conversations) {
      if (c.purpose === 'play_together' && c.childhood) this.games.set(c.id, { outcome: c.childhood.outcome, reason: c.childhood.reason, game: c.childhood.game ?? 'guess' });
      if (c.purpose === 'learn_foraging' && c.childhood) {
        const teacher = w.byId.get(c.b);
        this.practices.set(c.id, { outcome: c.childhood.outcome, reason: c.childhood.reason, skill: c.childhood.skill ?? 'forage', byChild: !!teacher && teacher.ent === 'person' && stageOf(w, teacher) === 'child' });
      }
      if (this.convs.has(c.id)) continue;
      this.convs.add(c.id);
      switch (c.purpose) {
        case 'chat': this.chats++; break;
        case 'family_time': this.familyTime++; break;
        case 'play_together': this.childPlay++; break;
        case 'learn_foraging': this.foragingPractice++; break;
        case 'learn_skill': case 'teach_technique': case 'learn_technique': this.coaching++; break;
        default: this.otherTalk++;
      }
      if (c.purpose === 'trade') this.tradeTalk++; // beside otherTalk, which keeps counting it so that older rows stay comparable
    }
    for (const o of w.occasions ?? []) if (o.kind === 'market') this.markets.add(o.id);
    // events carry rising ids and the feed is trimmed from the front, so the new ones are at the end
    for (let i = w.events.length - 1; i >= 0 && w.events[i].id > this.lastEvent; i--) {
      if (w.events[i].text === 'The fire has gone out.') this.fireOuts++;
      if (w.events[i].text.includes(' told a story at the fire: ')) {
        this.storiesTold++;
        for (const id of w.events[i].ids.slice(1)) { this.storyHearers++; const q = w.byId.get(id); if (q && q.ent === 'person' && stageOf(w, q) === 'child') this.storyHearersChild++; }
      }
      else if (w.events[i].text.includes('site was abandoned')) this.sitesAbandoned++;
    }
    if (w.events.length) this.lastEvent = Math.max(this.lastEvent, w.events[w.events.length - 1].id);
    for (const p of w.persons) {
      if (!p.alive) continue;
      this.personTicks++;
      if (p.needs.thirst < CRITICAL.thirst) this.parchedTicks++;
      if (p.needs.warmth < CRITICAL.warmth) this.coldTicks++;
      if (p.pose === 'sleep') continue;
      this.awakeTicks++;
      if (p.needs.hunger < 62) this.hungryTicks++;
      { const b = bandOf(w, p) ?? 'older'; this.awakeBand[b]++; if (p.needs.hunger < 62) this.hungryBand[b]++; }
      if (p.needs.thirst < 66) this.thirstyTicks++;
      if (Math.min(p.needs.hunger, p.needs.thirst, p.needs.energy) > 65) this.fedTicks++;
    }
  }
  private share(n: number, d: number): number { return d ? Math.round((n / d) * 10000) / 10000 : 0; }
  private get all(): number { const t = this.time; return t.life + t.survival + t.work + t.sleep; }
  get lifeShare(): number { return this.share(this.time.life, this.all); }
  get survivalShare(): number { return this.share(this.time.survival, this.all); }
  get workShare(): number { return this.share(this.time.work, this.all); }
  get sleepShare(): number { return this.share(this.time.sleep, this.all); }
  get hungryShare(): number { return this.share(this.hungryTicks, this.awakeTicks); }
  get thirstyShare(): number { return this.share(this.thirstyTicks, this.awakeTicks); }
  get fedWindowShare(): number { return this.share(this.fedTicks, this.awakeTicks); }
  stageShare(s: Stage): number { return this.share(this.byStage[s].life, this.byStage[s].all); }
  get thirstExposure(): number { return this.share(this.parchedTicks, this.personTicks); }
  get marketsCalled(): number { return this.markets.size; }
  /** failed approaches over all approaches (failed ones plus the conversations that opened) */
  get approachFailShare(): number { return this.share(this.approachesFailed, this.approachesFailed + this.convs.size); }
  get coldExposure(): number { return this.share(this.coldTicks, this.personTicks); }
}

/** What a branch ends with. `from` is the tick of the fork: deaths are those since then, first-build days are counted from the fork's day 0. */
export function outcomeOf(
  w: World,
  from: number,
  endTick: number,
  projects = new ProjectTally(),
  gathers = new GatherTally(),
  prep = new PrepTally(),
  defence = new DefenceTally(),
  life = new LifeTally(),
): { outcome: Outcome; milestones: Record<string, number> } {
  const count = (types: string[]) => w.buildings.filter((b) => types.includes(b.type)).length;
  const alive = w.persons.filter((p) => p.alive);
  const homeIds = new Set(w.buildings.map((b) => b.id));
  const hh = new Map(w.households.map((h) => [h.id, h]));
  let homeless = 0;
  let hunger = 0;
  let crit = 0;
  let mood = 0;
  let low = 0;
  for (const p of alive) {
    mood += p.mood?.level ?? 0;
    if ((p.mood?.level ?? 0) < -25) low++;
    const h = hh.get(p.hhId);
    if (!h || !h.homeId || !homeIds.has(h.homeId)) homeless++;
    hunger += p.needs.hunger;
    if (NEED_KEYS.some((k) => p.needs[k] < CRITICAL[k] && CRITICAL[k] > 0)) crit++;
  }
  // tools held by the living (a tool in a hand, not one in a store) and how sound the standing buildings are
  let tools = 0;
  for (const t of w.tools) if (t.holder && (w.byId.get(t.holder) as { alive?: boolean } | undefined)?.alive) tools++;
  let cond = 0;
  for (const b of w.buildings) cond += b.condition;
  // food people can actually reach: what is in their own homes, and what is in the shared stores besides
  let homeFood = 0;
  let allStoreFood = 0;
  for (const b of w.buildings) {
    if (!b.store) continue;
    let n = 0;
    for (const k of FOOD_ITEMS) n += b.store.items[k] ?? 0;
    allStoreFood += n;
    if (isHomeType(b.type)) homeFood += n;
  }
  const heads = Math.max(1, alive.length);
  let spears = 0;
  for (const t of w.tools) if (t.kind === 'spear') spears++;
  let armedAtEnd = 0;
  for (const p of alive) if (spearOf(w, p)) armedAtEnd++;
  let wolvesWary = 0;
  for (const a of w.animals) if (a.wary !== undefined && a.wary > w.tick) wolvesWary++;
  const d = defSnapshot();
  const first: Record<string, number> = {};
  for (const b of w.buildings) first[b.type] = Math.min(first[b.type] ?? Infinity, b.builtTick);
  // days after the fork; 0 if the type already stood at the fork (then it says nothing about the branch); a type never built counts as
  // the end of the run (censored), so that it can be averaged
  const endDay = (endTick - from) / DAY;
  const day = (t: string) => (first[t] === undefined ? endDay : first[t] < from ? 0 : Math.round(((first[t] - from) / DAY) * 10) / 10);
  const milestones: Record<string, number> = {};
  for (const t of Object.keys(first)) if (first[t] >= from) milestones[t] = day(t);
  return {
    outcome: {
      ...civilisationOutcome(w,from),
      workplaces: count(WORKPLACES),
      solidHomes: count(['hut', 'house']),
      buildings: w.buildings.length,
      plots: w.plots.length,
      people: alive.length,
      deaths: w.deceased.filter((d) => d.tick >= from).length,
      homeless,
      belowCritical: crit,
      meanHunger: Math.round((hunger / Math.max(1, alive.length)) * 10) / 10,
      firstYardDay: day('timber_yard'),
      firstHallDay: day('hall'),
      meanMood: Math.round((mood / Math.max(1, alive.length)) * 10) / 10,
      lowMood: low,
      tools,
      meanCondition: Math.round((cond / Math.max(1, w.buildings.length)) * 10) / 10,
      projectsAdopted: projects.adopted,
      projectsDone: projects.done,
      projectAsks: projects.asks,
      askUnitsDelivered: projects.units,
      specialisation: gathers.specialisation(),
      topKindShare: gathers.topKindShare(),
      prepAdopted: prep.adopted,
      prepSeason: prep.season,
      prepHardship: prep.hardship,
      prepDone: prep.done,
      prepDropped: prep.dropped,
      prepUnits: prep.units,
      prepDays: Math.round((prep.workTicks / DAY) * 100) / 100,
      hungerExposure: prep.exposure,
      homeFoodPerPerson: Math.round((homeFood / heads) * 100) / 100,
      storeFoodPerPerson: Math.round((allStoreFood / heads) * 100) / 100,
      spears,
      armedAtEnd,
      defenceOffered: d.offered,
      defenceSetOut: d.setOut,
      defenceTried: d.attempts,
      defenceDroveOff: d.droveOff,
      defenceFailed: d.failed,
      defenceLeftOnItsOwn: d.leftOnItsOwn,
      wolvesWary,
      bitesTaken: defence.bites,
      chats: life.chats,
      familyTime: life.familyTime,
      childPlay: life.childPlay,
      foragingPractice: life.foragingPractice,
      coaching: life.coaching,
      otherTalk: life.otherTalk,
      mealsSat: life.mealsSat,
      visits: life.visits,
      spareTime: life.spareTime,
      lifeShare: life.lifeShare,
      survivalShare: life.survivalShare,
      workShare: life.workShare,
      sleepShare: life.sleepShare,
      lifeShareChild: life.stageShare('child'),
      lifeShareAdult: life.stageShare('adult'),
      lifeShareElder: life.stageShare('elder'),
      deathsHunger: w.deceased.filter((d) => d.tick >= from && d.cause === 'hunger').length,
      deathsThirst: w.deceased.filter((d) => d.tick >= from && d.cause === 'thirst').length,
      deathsExposure: w.deceased.filter((d) => d.tick >= from && d.cause === 'exposure').length,
      thirstExposure: life.thirstExposure,
      coldExposure: life.coldExposure,
      hungryShare: life.hungryShare,
      thirstyShare: life.thirstyShare,
      fedWindowShare: life.fedWindowShare,
      approachesFailed: life.approachesFailed,
      approachFailShare: life.approachFailShare,
      tradeTalk: life.tradeTalk,
      marketsCalled: life.marketsCalled,
      apprenticesAtEnd: alive.filter((p) => p.apprentice).length,
      fireOuts: life.fireOuts,
      fireFeeds: life.fireFeeds,
      yardJobs: life.yardJobs,
      sharedYardsAtEnd: w.sites.filter((s) => s.type === 'timber_yard' && s.hhId === 0).length + w.buildings.filter((b) => b.type === 'timber_yard' && b.hhId === 0).length,
      householdsWithoutSolidHome: w.households.filter((h) => h.members.length > 0 && !w.buildings.some((b) => b.id === h.homeId && (b.type === 'hut' || b.type === 'house'))).length,
      homeSitesOpen: w.sites.filter((s) => s.type === 'hut' || s.type === 'lean_to').length,
      sitesAbandoned: life.sitesAbandoned,
      grownWithBasket: alive.filter((p) => stageOf(w, p) !== 'child' && (p.inv.basket ?? 0) > 0).length,
      basketShare: ((g) => (g.length ? Math.round((g.filter((p) => (p.inv.basket ?? 0) > 0).length / g.length) * 1000) / 1000 : 0))(alive.filter((p) => stageOf(w, p) !== 'child')),
      basketRoomTrips: life.basketRoomTrips,
      rationTrips: life.rationTrips,
      materialsHomeTrips: life.materialsHomeTrips,
      mealsFromPack: life.mealsFromPack,
      mealsFromStore: life.mealsFromStore,
      siteDeliveries: life.siteDeliveries,
      workplaceJobs: life.workplaceJobs,
      guestJobs: life.guestJobs,
      cartsAtEnd: w.carts.length,
      gamesGuess: life.gamesOf('guess'),
      gamesChase: life.gamesOf('chase'),
      gamesHide: life.gamesOf('hide'),
      gamesHouse: life.gamesOf('house'),
      gameRefusals: life.gameRefusals,
      soloStones: life.solo.stones ?? 0,
      soloBugs: life.solo.bugs ?? 0,
      soloSticks: life.solo.sticks ?? 0,
      toysMade: life.toysMade,
      toysGiven: life.toysGiven,
      toyPlays: life.solo.toy ?? 0,
      toysAtEnd: w.tools.filter((t) => t.kind === 'toy').length,
      childrenWithToy: alive.filter((p) => stageOf(w, p) === 'child' && (p.inv.toy ?? 0) > 0).length,
      leanDays: life.leanDays,
      dryDays: life.dryDays,
      fireSits: life.fireSits,
      fireSitsElder: life.fireSitsElder,
      storiesTold: life.storiesTold,
      storyHearers: life.storyHearers,
      storyHearersChild: life.storyHearersChild,
      gathersLittle: life.gathers.little,
      gathersChild: life.gathers.child,
      gathersOlder: life.gathers.older,
      gatherHoursLittle: Math.round(life.gatherTicks.little / 10) / 10,
      gatherHoursChild: Math.round(life.gatherTicks.child / 10) / 10,
      gatherHoursOlder: Math.round(life.gatherTicks.older / 10) / 10,
      childFoodShare: ((u) => (u.little + u.child + u.older ? Math.round(((u.little + u.child) / (u.little + u.child + u.older)) * 1000) / 1000 : 0))(life.gatheredUnits),
      hungryLittle: life.awakeBand.little ? Math.round((life.hungryBand.little / life.awakeBand.little) * 1000) / 1000 : 0,
      hungryChild: life.awakeBand.child ? Math.round((life.hungryBand.child / life.awakeBand.child) * 1000) / 1000 : 0,
      hungryOlder: life.awakeBand.older ? Math.round((life.hungryBand.older / life.awakeBand.older) * 1000) / 1000 : 0,
      lessonsForage: life.lessonsForage,
      lessonsFish: life.lessonsFish,
      lessonsFarm: life.lessonsFarm,
      lessonsByChild: life.lessonsByChild,
      lessonRefusals: life.lessonRefusals,
      ...((kids) => ({ childForage: kids.length ? Math.round((kids.reduce((n, p) => n + p.skills.forage, 0) / kids.length) * 1000) / 1000 : 0, childFish: kids.length ? Math.round((kids.reduce((n, p) => n + p.skills.fish, 0) / kids.length) * 1000) / 1000 : 0, childFarm: kids.length ? Math.round((kids.reduce((n, p) => n + p.skills.farm, 0) / kids.length) * 1000) / 1000 : 0 }))(alive.filter((p) => stageOf(w, p) === 'child')),
    },
    milestones,
  };
}

export interface BranchResult {
  spec: string;
  summary: string;
  note: string;
  /** first sampled tick, counted from the fork, at which the world's hash differs from the control's; null if it never does */
  divergedAfterTicks: number | null;
  finalHash: string;
  outcome: Outcome;
  milestones: Record<string, number>;
  /** people alive by day after the fork, one per day (to tell a story of when branches part) */
  popByDay: number[];
  /** Candidate-only empty-food news counts. Not an outcome metric and not compared as a population effect. */
  emptyNews?: { directEmpty: number; accepted: number; rejected: number; relays: number; skippedStale: number; skippedHeld: number; skippedCooldown: number; receiptAge: number; receipts: number };
}

export interface ForkRun {
  saved: ReturnType<typeof serializeWorld>;
  fromTick: number;
}

/** Run one branch from a save. `controlHashes` (the sampled hashes of the control) lets later branches say when they first part from it. */
export function runBranch(
  saved: ReturnType<typeof serializeWorld>,
  iv: Intervention,
  days: number,
  sampleEvery: number,
  controlHashes?: string[],
): BranchResult & { hashes: string[] } {
  const previousDefenceProbe = { ...defProbe };
  const restore = iv.install?.();
  try {
    const w = deserializeWorld(saved);
    const from = w.tick;
    const note = iv.apply?.(w) ?? '';
    const hashes: string[] = [];
    const popByDay: number[] = [];
    let diverged: number | null = null;
    const end = from + days * DAY;
    const projects = new ProjectTally();
    const gathers = new GatherTally();
    const prep = new PrepTally();
    const defence = new DefenceTally();
    const life = new LifeTally();
    // the defence counters are the module's own, off by default; this branch owns them for its run
    defReset();
    defProbe.on = true;
    // a deserialized world has no hooks of its own; the tallies only read. emptyNews is not part of outcome.
    const emptyNews = { directEmpty: 0, accepted: 0, rejected: 0, relays: 0, skippedStale: 0, skippedHeld: 0, skippedCooldown: 0, receiptAge: 0, receipts: 0 };
    w.hooks = {
      onActivityStart: (p, a) => gathers.start(p, a),
      onActivityEnd: (p, a, outcome) => life.end(w, p, a, outcome),
      onWolfBite: () => defence.bitten(),
      onNews: (e) => {
        if (e.kind === 'direct-empty') emptyNews.directEmpty++;
        else if (e.kind === 'accepted') {
          emptyNews.accepted++;
          emptyNews.receipts++;
          emptyNews.receiptAge += e.age;
          if (e.hops >= 2) emptyNews.relays++;
        } else if (e.kind === 'rejected') emptyNews.rejected++;
        else if (e.reason === 'stale') emptyNews.skippedStale++;
        else if (e.reason === 'held') emptyNews.skippedHeld++;
        else emptyNews.skippedCooldown++;
      },
    };
    for (let i = 1; w.tick < end; i++) {
      stepWorld(w);
      projects.tick(w);
      prep.tick(w);
      life.tick(w);
      if (i % sampleEvery === 0) {
        const h = hashWorld(w);
        hashes.push(h);
        if (controlHashes && diverged === null && controlHashes[hashes.length - 1] !== h) diverged = w.tick - from;
      }
      if (i % DAY === 0) popByDay.push(w.persons.filter((p) => p.alive).length);
    }
    const { outcome, milestones } = outcomeOf(w, from, end, projects, gathers, prep, defence, life);
    return {
      spec: iv.spec,
      summary: iv.summary,
      note,
      divergedAfterTicks: diverged,
      finalHash: hashWorld(w),
      outcome,
      milestones,
      popByDay,
      hashes,
      emptyNews,
    };
  } finally {
    Object.assign(defProbe, previousDefenceProbe);
    restore?.();
  }
}

/** Run the world to `forkDay`, then the control and every branch from the same save. */
export function runLab(
  world: World,
  forkDay: number,
  days: number,
  branches: string[],
  sampleEvery = 120,
  each?: (r: BranchResult & { hashes: string[] }) => void,
): (BranchResult & { hashes: string[] })[] {
  while (world.tick < forkDay * DAY) stepWorld(world);
  const saved = serializeWorld(world);
  const control = runBranch(saved, parseIntervention('control'), days, sampleEvery);
  const out: (BranchResult & { hashes: string[] })[] = [control];
  each?.(control);
  for (const spec of branches) {
    const r = runBranch(saved, parseIntervention(spec), days, sampleEvery, control.hashes);
    out.push(r);
    each?.(r);
  }
  return out;
}
