// STAGED comparison: a remembered home collapses out of sight; no report is heard.
import {stage,addPerson,building,done} from '../tests/helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {destroyBuilding} from '../src/sim/buildings';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
const s=stage('unseen-home-collapse'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=107;
const p=addPerson(s,'Ada',30,30,{age:35,hunger:95,thirst:95,energy:95,inv:{bread:3,water:3}});
const home=building(s,'hut',70,65,p.hhId,{grain:8});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
const trees=[makeSource(w,'tree',26,30,20),makeSource(w,'tree',32,34,20),makeSource(w,'tree',34,29,20)];
done(s);observe(w,p,home);for(const t of trees)observe(w,p,t);
const read=()=>{const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);return {homeKnown:p.beliefs[home.id],homeActual:ctx.home?.id??null,housing:ctx.options.filter(o=>o.kind==='plan_site').map(o=>({key:o.key,goal:o.goal})),pure:before===serializeWorld(w)};};
const before=read();destroyBuilding(w,home,'collapsed outside Ada’s sight');const after=read();
console.log(JSON.stringify({staged:true,tick:w.tick,person:{x:p.x,y:p.y},before,after,conserved:conservationReport(w).ok},null,2));
