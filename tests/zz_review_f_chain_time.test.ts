// REVIEW PROBE (agent F): how long the whole cart prerequisite chain takes under ordinary decisions when no other person competes,
// against the batch plan's own 3-day patience. Staged flat world near its lake (an ordinary camp is 8-10 tiles from its shore), one
// adult, a known yard, two trees and a rock; the kit varies per case. Writes a JSON report to the review scratchpad.
import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {stage,addPerson,building,done,give} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {proposeProject} from '../src/sim/proposals';
import {generateOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {nextProjectStep} from '../src/sim/project_step';
import {BATCH_PATIENCE} from '../src/sim/batch_plan';
import {conservationReport} from '../src/sim/economy';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import type {ToolKind} from '../src/sim/types';

const OUT='C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_f';
type Kit={name:string;tools:ToolKind[];yard:Record<string,number>;inv?:Record<string,number>};
const KITS:Kit[]=[
 {name:'staged helper kit: hammer+saw, yard 8 wood 2 handles',tools:['hammer','saw'],yard:{wood:8,handles:2}},
 {name:'hammer+saw, empty yard',tools:['hammer','saw'],yard:{}},
 {name:'hammer+axe (hew path), empty yard',tools:['hammer','axe'],yard:{}},
 {name:'ordinary kit: axe only, empty yard, nothing carried',tools:['axe'],yard:{}},
 {name:'ordinary kit: axe only, empty yard, 2 stone carried (sidesteps the acquire double-count)',tools:['axe'],yard:{},inv:{stone:2}},
 {name:'ordinary kit: nothing at all, empty yard',tools:[],yard:{}},
];
function scene(kit:Kit){
 const s=stage('review-chain-'+kit.name),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
 const p=addPerson(s,'Hana',40,21,{age:35,inv:{bread:3,water:3,...(kit.inv??{})},hunger:100,thirst:100,energy:100,traits:{diligence:1}});
 p.needs.warmth=95;p.needs.safety=95;p.skills.build=1.1;p.skills.carpentry=1.4;
 const home=building(s,'hut',36,21,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',46,21,0,kit.yard);
 const trees=[makeSource(w,'tree',38,27,12),makeSource(w,'tree',40,28,12)],rock=makeSource(w,'rock',43,27,10);
 for(const t of kit.tools)give(w,p,t);
 done(s);for(const e of [home,yard,...trees,rock])observe(w,p,e);perceive(w,p);
 return {s,w,p,home,yard,trees,rock};
}
const results:unknown[]=[];
for(const kit of KITS)it(`chain time: ${kit.name}`,()=>{
 const {w,p,yard}=scene(kit);
 const r=proposeProject(generateOptions(w,p,true,true),{item:'cart',quantity:1,tier:0});
 if(!r.ok)throw new Error(r.reason);
 const plan=r.plan,events:{tick:number;ev:string}[]=[];let sleepTicks=0,eatDrinkTicks=0,travelTicks=0,workTicks=0,gatherTicks=0,idleTicks=0;
 w.hooks={onActivityStart:(q,a)=>{if(q.id===p.id)events.push({tick:w.tick,ev:`start ${a.kind}${a.data.recipe?' '+a.data.recipe:''}${a.data.tool?' '+a.data.tool:''}${a.kind==='gather'?' '+String(a.targetId):''} (${a.goal})`});},onActivityEnd:(q,a,o,d)=>{if(q.id===p.id)events.push({tick:w.tick,ev:`end ${a.kind}${a.data.recipe?' '+a.data.recipe:''}${a.data.tool?' '+a.data.tool:''} ${o} ${d}`});}};
 const steps:{tick:number;step:string}[]=[];let lastStep='';
 const horizon=BATCH_PATIENCE+600;
 for(let n=0;n<horizon&&!w.carts.length&&plan.status==='active';n++){
  stepWorld(w);
  const a=p.activity;
  if(!a)idleTicks++;else if(a.kind==='sleep')sleepTicks++;else if(a.kind==='eat'||a.kind==='drink'||a.kind==='eat_store')eatDrinkTicks++;else if(a.phase==='travel')travelTicks++;else if(a.kind==='gather')gatherTicks++;else workTicks++;
  if(w.tick%60===0){const st=plan.project?nextProjectStep(generateOptions(w,p,true,true),plan.project,plan):null;const s=st?`${st.phase}:${st.node.item}`:'none';if(s!==lastStep){steps.push({tick:w.tick,step:s});lastStep=s;}}
 }
 const job=yard.ops?.job;
 const kinds:Record<string,number>={};for(const e of events)if(e.ev.startsWith('start '))kinds[e.ev.split(' ')[1]]=(kinds[e.ev.split(' ')[1]]??0)+1;
 const out={kit:kit.name,cart:w.carts.length,ticksToCart:w.carts.length?w.tick:null,planStatus:plan.status,planReason:plan.reason,planStep:plan.step,deadline:plan.until,tickAtEnd:w.tick,alive:p.alive,budget:{sleepTicks,eatDrinkTicks,travelTicks,workTicks,gatherTicks,idleTicks},yardShelf:yard.store.items,yardJobAtEnd:job?{recipe:job.recipe,phase:job.phase,progress:Math.round(job.progress),total:job.total,held:job.held,lastWork:job.lastWork}:null,inv:p.inv,ledgerCreated:w.ledger.created,steps,startsByKind:kinds,events:events.length>160?events.slice(0,40).concat([{tick:-1,ev:`... ${events.length-80} omitted ...`}],events.slice(-40)):events,conservation:conservationReport(w).ok};
 results.push(out);
 mkdirSync(OUT,{recursive:true});writeFileSync(`${OUT}/chain_time_lakeside.json`,JSON.stringify(results,null,1));
 expect(conservationReport(w).ok).toBe(true);
},120_000);
