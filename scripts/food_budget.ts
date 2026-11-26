import {writeFileSync} from 'node:fs';
import {argsOf,worldFromArgs} from './world_args';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {stepWorld,hashWorld} from '../src/sim/world';
import {observeFoodBudget} from './observers/food_budget';

const {args,opt}=argsOf(process.argv);
const days=Number(opt('days','1'));
if(!Number.isSafeInteger(days)||days<1)throw Error('Expected positive whole days');
const {w,loaded}=worldFromArgs(opt);
const twin=args.includes('--verify-twin')?worldFromArgs(opt).w:undefined;
const intervals=[];
for(let i=0;i<days;i++){
  const finish=observeFoodBudget(w);
  for(let tick=0;tick<DAY;tick++)stepWorld(w);
  const row=finish();
  if(row.byFood.some(f=>Math.abs(f.balanceError)>1e-7)||!conservationReport(w).ok)throw Error('Stock balance failed at '+w.tick);
  if(twin){
    for(let tick=0;tick<DAY;tick++)stepWorld(twin);
    if(serializeWorld(twin)!==serializeWorld(w)||JSON.stringify(twin.rng)!==JSON.stringify(w.rng))throw Error('Twin mismatch at '+w.tick);
  }
  intervals.push(row);
}
const result=JSON.stringify({seed:w.seed,loaded,rules:w.settings.rulesVersion,arrivals:w.settings.immigration,
  endHash:hashWorld(w),twinVerified:!!twin,intervals},null,2);
const path=opt('out','');
if(path)writeFileSync(path,result+'\n'); else console.log(result);
