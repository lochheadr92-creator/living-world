// Diagnosis: for each critically hungry person holding food while hunger-gathering (rules 158), why no eat override.
// Pure observer reads via generateOptions(..., observer=true); the run's own state is checked unchanged per sample.
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld} from '../../src/app/save';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {isFood} from '../../src/sim/social';
import {DAY} from '../../src/sim/constants';
import type {ItemKind} from '../../src/sim/types';
const [seed='forest',rules='158',days='10']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const by:Record<string,number>={};const inc=(k:string)=>{by[k]=(by[k]??0)+1;};const rows:unknown[]=[];let impure=0;
while(w.tick<Number(days)*DAY){stepWorld(w);if(w.tick%60)continue;
 for(const q of w.persons){const a=q.activity;if(!q.alive||q.needs.hunger>=25||a?.kind!=='gather'||a.need!=='hunger')continue;
  if(!(Object.keys(q.inv) as ItemKind[]).some(k=>isFood(k)&&(q.inv[k]??0)>0))continue;
  const before=rows.length<3?serializeWorld(w):'';
  const ctx=generateOptions(w,q,true,true),ranked=rankOptions(ctx);
  if(before&&before!==serializeWorld(w))impure++;
  const crit=ctx.criticals.includes('hunger'),eatOpt=ctx.options.find(o=>o.kind==='eat'),eatRanked=ranked.find(o=>o.kind==='eat');
  const k=`${crit?'critical':'not critical'} | eat ${eatOpt?'offered':'absent'}${eatOpt&&!eatRanked?', filtered':''} | deps ${ctx.dependents.length}`;inc(k);
  if(rows.length<15)rows.push({tick:w.tick,name:q.name,hunger:Math.round(q.needs.hunger),drive:Math.round(ctx.drives.hunger),criticals:ctx.criticals,deps:ctx.dependents.length,inv:{...q.inv},eat:eatOpt?.util,nextThink:q.nextThink-w.tick});}}
console.log(JSON.stringify({seed,rules,impure,by,rows},null,1));
