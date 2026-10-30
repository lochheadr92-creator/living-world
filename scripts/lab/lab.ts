import {careWaterOn,setCareWater} from '../../src/sim/care_capacity';
import {projectPlansOn,setProjectPlans} from '../../src/sim/project_step';
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
const FOOD_ITEMS: readonly FoodKind[] = ['berries', 'fruit', 'fish', 'grain', 'bread', 'meat'];
import type { Activity, Person } from '../../src/sim/types';
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
  const spec = ALIASES[specIn] ?? specIn;
  const [kind, a, b] = spec.split(':');
  const label = specIn;
  if (kind === 'control') return { spec: label, summary: 'nothing changes' };
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

/** What a branch ends with. `from` is the tick of the fork: deaths are those since then, first-build days are counted from the fork's day 0. */
export function outcomeOf(
  w: World,
  from: number,
  endTick: number,
  projects = new ProjectTally(),
  gathers = new GatherTally(),
  prep = new PrepTally(),
  defence = new DefenceTally(),
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
    // the defence counters are the module's own, off by default; this branch owns them for its run
    defReset();
    defProbe.on = true;
    // a deserialized world has no hooks of its own; the tally is the only listener, and it reads, never writes
    w.hooks = { onActivityStart: (p, a) => gathers.start(p, a), onWolfBite: () => defence.bitten() };
    for (let i = 1; w.tick < end; i++) {
      stepWorld(w);
      projects.tick(w);
      prep.tick(w);
      if (i % sampleEvery === 0) {
        const h = hashWorld(w);
        hashes.push(h);
        if (controlHashes && diverged === null && controlHashes[hashes.length - 1] !== h) diverged = w.tick - from;
      }
      if (i % DAY === 0) popByDay.push(w.persons.filter((p) => p.alive).length);
    }
    const { outcome, milestones } = outcomeOf(w, from, end, projects, gathers, prep, defence);
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
