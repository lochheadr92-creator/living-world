import { argsOf, worldFromArgs } from './world_args';
import { householdFoodReserve } from '../src/sim/inspect_household_food';

const {opt} = argsOf(process.argv);
const {w} = worldFromArgs(opt);
const id = Number(opt('household',''));
const reserve = householdFoodReserve(w,id);
if (!reserve) throw Error('Choose an existing household with --household ID');
console.log(JSON.stringify({seed:w.seed,tick:w.tick,rules:w.settings.rulesVersion,
  unit:'nutrition points', demandBasis:'ordinary awake day', localWalkingSteps:12, ...reserve},null,2));
