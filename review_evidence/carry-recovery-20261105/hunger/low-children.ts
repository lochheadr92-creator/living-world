// Diagnosis: what a child below hunger 25 holds and is doing (ordinary, rules pinned). Read-only sampling every 60 ticks.
import {createWorld} from '../../../src/sim/factory';
import {currentWorldSettings} from '../../../src/sim/profiles';
import {stepWorld} from '../../../src/sim/world';
import {stageOf} from '../../../src/sim/people';
import {isFood} from '../../../src/sim/social';
import {DAY} from '../../../src/sim/constants';
import type {ItemKind} from '../../../src/sim/types';
const [seed='river',rules='157',days='10']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const rows:unknown[]=[];const by:Record<string,number>={};
while(w.tick<Number(days)*DAY){stepWorld(w);if(w.tick%60)continue;
 for(const q of w.persons){if(!q.alive||stageOf(w,q)!=='child'||q.needs.hunger>=25)continue;
  const food=(Object.keys(q.inv) as ItemKind[]).filter(k=>isFood(k)&&(q.inv[k]??0)>0);
  const k=`${food.length?'holds food':'no food'} | ${q.activity?.kind??'idle'}`;by[k]=(by[k]??0)+1;
  if(food.length&&rows.length<25)rows.push({tick:w.tick,name:q.name,age:Math.floor(q.age),hunger:Math.round(q.needs.hunger),inv:{...q.inv},doing:q.activity?.label??null,last:q.lastDecision?.because??null});}}
console.log(JSON.stringify({seed,rules,by,rows},null,1));
