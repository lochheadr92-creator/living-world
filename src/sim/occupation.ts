import { tradesOn } from './trade_switch';
import { DAY } from './constants';
import { stageOf } from './people';
import { runsRulesVersion } from './rulesversion';
import type { Activity, Belief, ItemKind, Items, Person, World } from './types';
import type { Option } from './optutil';

/** Outputs that can finish a worker's shift through one of the ordinary storage offers. */
export const OUTPUTS = {
  Gatherer: ['berries','fruit','grain','fibre'], Fisher: ['fish'], Hunter: ['meat','hide','fat'],
  Butcher: ['meat','pork','hide','fat'], Herder: ['milk','egg','wool','hay','stock_feed'],
  Farmer: ['grain','seeds'], Forester: ['wood','cutting','offcuts'], Miner: ['ore','stone','clay'],
  Builder: ['wood','stone','bricks','planks'], Carpenter: ['handles','planks','offcuts'],
  Potter: ['bricks','jar','charcoal'], Toolsmith: ['iron','axe','hoe','pick','hammer','saw','spear'],
  Weaver: ['garment','blanket','bedding','net'], Leatherworker: ['leather','gloves','shoes','garment'],
  Baker: ['bread'], GranaryKeeper: ['grain'], Cook: ['cheese','bacon','dried_fish','smoked_fish','dried_meat','smoked_meat','rendered_fat'],
  Miller: ['flour'], Brewer: ['beer'], Craftworker: ['basket','rod','trap','toy'],
  Hauler: [], WaterCarrier: ['water'], Caregiver: [], Teacher: [], Trader: [], Scout: [],
  Firekeeper: ['wood'], Guard: [], Repairer: [], Mediator: [], Organiser: [],
} satisfies Record<string, ItemKind[]>;
export type Occupation = keyof typeof OUTPUTS;
type Practice = { jobs: number; firstDay: number; lastDay: number };
export interface OccupationalPractice {
  title?: Occupation;
  practice: Partial<Record<Occupation, Practice>>;
}
export function occupationName(role: Occupation) {
  return role.replace(/[a-z][A-Z]/g, pair => pair[0]+' '+pair[1].toLowerCase());
}
export function hasOccupations(w: World) {
  return tradesOn() && w.settings.dynamics === 'rich' && runsRulesVersion(w,277);
}
const benches: Partial<Record<NonNullable<Belief['btype']>, Occupation>> = {
  timber_yard:'Carpenter', quarry:'Miner', mine:'Miner', kiln:'Potter', smithy:'Toolsmith',
  bakery:'Baker', granary:'GranaryKeeper', mill:'Miller', brewery:'Brewer', food_rack:'Cook',
};

type Work = Pick<Option,'kind'|'targetId'|'need'> & { key: string; cargo?: Items };
function workRole(p: Person, job: Work, activity?: Activity): Occupation | undefined {
  const { kind, key } = job;
  const b = p.beliefs[job.targetId];
  const origin = activity?.data.stype ?? b?.kind;
  if (key.startsWith('care_supply:') || key.startsWith('care_store:')) return 'Caregiver';
  switch (kind) {
    case 'gather':
      if (key.startsWith('sheep-grain:') || key.startsWith('hay:') || origin==='hay_meadow') return 'Herder';
      if (origin==='rock'||origin==='ore_vein'||origin==='outcrop'||origin==='clay_pit') return 'Miner';
      if (origin==='tree') return 'Forester';
      if (origin==='fish_spot') return 'Fisher';
      return 'Gatherer';
    case 'animal_work':
      if (key.startsWith('process_cheese:') || key.startsWith('process_bacon:')) return 'Cook';
      if (key.startsWith('process_')) return 'Leatherworker';
      if (key.startsWith('sheep:slaughter:')) return 'Butcher';
      return 'Herder';
    case 'gear_work': return origin==='fish_spot'||b?.gear?.kind==='net' ? 'Fisher' : 'Hunter';
    case 'hunt': return 'Hunter';
    case 'butcher': return 'Butcher';
    case 'hang_skin': return 'Leatherworker';
    case 'tree_work': return 'Forester';
    case 'till': case 'plant': case 'tend': case 'harvest': return 'Farmer';
    case 'operate': {
      const recipe = activity?.data.recipe ?? key.split(':')[2] ?? '';
      if (recipe.startsWith('mill_flour')) return 'Miller';
      if (recipe==='sew_hide_garment') return 'Leatherworker';
      if (/^(weave_|strip_fibre)/.test(recipe)) return 'Weaver';
      if (/^(make_net|make_trap)/.test(recipe)) return 'Craftworker';
      return b?.btype && benches[b.btype] || 'Craftworker';
    }
    case 'build': case 'plan_site': return 'Builder';
    case 'repair': return 'Repairer';
    case 'craft': return /axe|pick|hoe|hammer|saw|spear/.test(key) ? 'Toolsmith' : 'Craftworker';
    case 'tool_work': return key.startsWith('dress:') ? undefined : 'Repairer';
    case 'fetch_water': return job.need==='thirst' ? undefined : 'WaterCarrier';
    case 'deposit':
      if (key.startsWith('farm_store:')) return 'Herder';
      if (key.startsWith('seed_stash:')) return 'Farmer';
      if (key.startsWith('bring:') && b?.btype && benches[b.btype]) return benches[b.btype];
      return 'Hauler';
    case 'haul': case 'cart_haul': case 'withdraw': case 'return_tool': case 'fulfill': return 'Hauler';
    case 'care': return 'Caregiver';
    case 'give': return key.includes('promise')||key.includes('return:') ? 'Hauler' : 'Caregiver';
    case 'exchange_journey': return 'Trader';
    case 'socialize':
      if (key.split(':')[2]==='mediate') return 'Mediator';
      if (key.split(':')[2]==='recruit') return 'Organiser';
      if (/trade|exchange/.test(key)) return 'Trader';
      if (/teach|coach/.test(key)) return 'Teacher';
      return undefined;
    case 'host_meal': return 'Cook';
    case 'defend': return 'Guard';
    case 'explore': case 'search': return 'Scout';
    case 'fuel_fire': return 'Firekeeper';
    case 'converse': case 'argue': case 'alone': case 'wander': case 'visit': case 'attend':
    case 'attend_meal': case 'claim_home': case 'relocate': case 'pay_respects':
    case 'eat': case 'eat_store': case 'drink': case 'sleep': case 'rest': case 'warm': case 'flee':
      return undefined;
    default: { const missing: never = kind; return missing; }
  }
}

export function activityOccupation(p: Person, a: Activity) {
  return workRole(p,{kind:a.kind,key:a.data.optKey ?? '',targetId:a.targetId,need:a.need},a);
}
export function occupationalPreference(p: Person, o: Option): number {
  const title = p.occupation?.title;
  if (!title) return 0;
  if (o.kind==='deposit' && o.cargo && (OUTPUTS[title] as readonly ItemKind[]).some(k=>(o.cargo?.[k]??0)>0)) return 18;
  return workRole(p,o)===title ? 12 : 0;
}
export function practiseOccupation(w: World,p: Person,role: Occupation) {
  if (!hasOccupations(w) || stageOf(w,p)==='child') return;
  const day = Math.floor(w.tick/DAY);
  const state = p.occupation ??= {practice:{}};
  const record = state.practice[role] ??= {jobs:0,firstDay:day,lastDay:day};
  record.jobs=Math.min(12,record.jobs+1);
  record.lastDay=day;
  const current=state.title && state.practice[state.title];
  if (record.jobs>=3 && day>record.firstDay &&
      (!current || record.jobs>=current.jobs+3 || day-current.lastDay>=3)) state.title=role;
}
export function recordOccupationalWork(w: World,p: Person,a: Activity,outcome: string) {
  if (!hasOccupations(w) || outcome!=='success' && !(outcome==='partial' && a.cycle>0)) return;
  // Personal relief and ordinary trips to one's own stores do not train a profession.
  if (a.kind==='gather' && a.need==='hunger' || a.kind==='withdraw' && a.need ||
      a.kind==='socialize' || a.kind==='exchange_journey' || a.kind==='give' && a.data.mode==='toy') return;
  const role=activityOccupation(p,a);
  if (!role || a.kind==='deposit' && role==='Hauler' || a.kind==='withdraw' && !a.data.inputWorkshop && !a.data.materialStock) return;
  practiseOccupation(w,p,role);
}
export function validateOccupations(w: World) {
  const lastDay=Math.floor(w.tick/DAY);
  for (const p of w.persons) {
    const state=p.occupation;
    if (state===undefined) continue;
    if (w.settings.dynamics!=='rich' || !runsRulesVersion(w,277) || !state || !state.practice || typeof state.practice!=='object' || Array.isArray(state.practice)) throw Error('Invalid occupational practice');
    for (const [role,r] of Object.entries(state.practice)) {
      if (!Object.hasOwn(OUTPUTS,role) || !r || !Number.isInteger(r.jobs) || r.jobs<1 || r.jobs>12 ||
          !Number.isInteger(r.firstDay) || !Number.isInteger(r.lastDay) || r.firstDay<0 || r.firstDay>r.lastDay || r.lastDay>lastDay) throw Error('Invalid occupational record');
    }
    if (state.title!==undefined && (!Object.hasOwn(OUTPUTS,state.title) || !Object.hasOwn(state.practice,state.title) ||
        state.practice[state.title]!.jobs<3 || state.practice[state.title]!.firstDay===state.practice[state.title]!.lastDay)) throw Error('Invalid earned title');
  }
}

