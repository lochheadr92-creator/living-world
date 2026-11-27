import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { observeFoodBudget } from './scripts/observers/food_budget';
import { nutritionOf } from './src/sim/bread_feeds';
import type { FoodKind } from './src/sim/types';
import { DAY } from './src/sim/constants';
import { conservationReport } from './src/sim/economy';
import { createWorld } from './src/sim/factory';
import { winterDepth } from './src/sim/hardship';
import { setGrainBoost } from './src/sim/plenty';
import { currentWorldSettings } from './src/sim/profiles';
import { hashWorld, stepWorld } from './src/sim/world';

const [seed, arm, output] = process.argv.slice(2);
assert(['aspen','river'].includes(seed) && ['control','moderate'].includes(arm));
globalThis.moderateWild = arm === 'moderate';
setGrainBoost(false);
const w = createWorld({...currentWorldSettings('normal',seed,{immigration:true}), rulesVersion:266});
const ref = JSON.parse(readFileSync(new URL('./' + seed + '-reference.json', import.meta.url),'utf8'));
const days = [];
const wildItems = ['berries','fruit','fish','grain'];
const sourceTypes = ['berry bush','fruit tree','fish spot','wild grain'];
for (let day = 1; day <= 36; day++) {
  const eaten: Record<string,number> = {}, atSource: Record<string,number> = {};
  const bump = (r:Record<string,number>, k:string, n:number) => {r[k]=(r[k]??0)+n;};
  globalThis.observeMeal = (k:string,n:number,reason:string) => {
    if(reason === 'eaten' || reason === 'eaten at the source' || reason === 'eaten at a shared meal') bump(eaten,k,n);
    if(reason === 'eaten at the source') bump(atSource,k,n);
  };
  const reasons = {...w.ledger.reasons};
  const finish = observeFoodBudget(w);
  let winter=0,lean=0,overlap=0;
  for(let tick=0;tick<DAY;tick++){
    const cold=winterDepth(w)>0, scarce=w.hardship?.kind==='lean';
    winter+=Number(cold); lean+=Number(scarce); overlap+=Number(cold&&scarce);
    stepWorld(w);
  }
  const budget=finish();
  assert(conservationReport(w).ok && budget.byFood.every(f=>f.balanceError===0));
  const hash=hashWorld(w);
  if(day<=12 && arm==='control') assert.equal(hash,ref.days[day-1].hash);
  const gather=budget.transfers['gather (source to person)']??{};
  const regrown=Object.fromEntries(sourceTypes.map((t,i)=>{
    const k='+regrowth: '+t;
    return [wildItems[i],(w.ledger.reasons[k]??0)-(reasons[k]??0)];
  }));
  const stages=Object.values(budget.stages);
  const paidNutrition=Object.entries(eaten).reduce((sum,[item,n])=>sum+n*nutritionOf(w,item as FoodKind),0);
  assert.equal(paidNutrition,stages.reduce((sum,row)=>sum+row.intake,0));
  days.push({day,hash,regrown,gather:Object.fromEntries(wildItems.map(k=>[k,gather[k]??0])),
    atSource,eaten,fieldGrain:budget.transfers['harvest (plot to person)']?.grain??0,
    winter,lean,overlap,intake:stages.reduce((s,r)=>s+r.intake,0),
    hungryAwakeTicks:stages.reduce((s,r)=>s+r.hungryAwakeTicks,0),awakeTicks:stages.reduce((s,r)=>s+r.awakeTicks,0),
    alive:w.persons.filter(p=>p.alive).length,dead:w.persons.filter(p=>!p.alive).length});
}
writeFileSync(output,JSON.stringify({seed,arm,source:'9b96ae61',rules:266,grainBoost:false,days},null,2)+'\n');
