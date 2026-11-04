// REVIEW PROBE (agent F): can the cart maker's own ordinary site demand (or another villager's) divert the planks the cart plan made
// at the yard? Staged: the rules-99 cart scene (hammer, saw or axe, yard with 8 wood and 2 handles) plus one known site that wants planks.
// Writes a JSON report to the review scratchpad; the assertions only check the probe ran and conserved items.
import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {cartProjectScene} from './helpers/cart_project';
import {site,addPerson,building,done} from './helpers/kit';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {BATCH_PATIENCE} from '../src/sim/batch_plan';
import type {Intention} from '../src/sim/types';

const OUT='C:/Users/RJLoc/AppData/Local/Temp/claude/C--dev-Claude-Experiment/3c06e039-d739-4179-9940-8bfc089f1edb/scratchpad/review/agent_f';
const results:unknown[]=[];
const VARIANTS=['no plank site (baseline)','communal granary site wants 8 planks','own-household granary site wants 8 planks','HEW PATH (no saw, yard 8 wood): no plank site','HEW PATH (no saw, yard 8 wood): communal granary site wants 8 planks','HEW PATH (no saw, yard 8 wood): another villager wants planks for the site'] as const;
for(const variant of VARIANTS)it(`plank diversion: ${variant}`,()=>{
 const hew=variant.startsWith('HEW');
 const f=cartProjectScene(99,!hew);const {w,p,yard}=f;
 const events:{tick:number;ev:string}[]=[];const goals:Record<string,number>={};
 let plankSite:ReturnType<typeof site>|null=null;
 if(!/no plank site/.test(variant)){plankSite=site(f.s,'granary',52,36,variant.startsWith('own')?p.hhId:0,variant.startsWith('own')?p.id:0);observe(w,p,plankSite);perceive(w,p);}
 let benId=0,ben:ReturnType<typeof addPerson>|null=null;
 if(variant.endsWith('another villager wants planks for the site')){
  ben=addPerson(f.s,'Ben',44,38,{age:30,inv:{bread:3,water:3},hunger:100,thirst:100,energy:100,traits:{diligence:1,generosity:0.8}});ben.needs.warmth=95;ben.needs.safety=95;benId=ben.id;
  const home2=building(f.s,'hut',44,33,ben.hhId,{grain:12});w.households.find(h=>h.id===ben.hhId)!.homeId=home2.id;
  done(f.s);
  for(const e of [home2,yard,plankSite!,f.tree,f.rock,f.stock])observe(w,ben,e);perceive(w,ben);
 }
 w.hooks={onActivityStart:(q,a)=>{if(q.id===p.id)goals[`${a.kind}:${a.goal}`]=(goals[`${a.kind}:${a.goal}`]??0)+1;if((q.id===p.id||q.id===benId)&&(a.kind==='withdraw'||a.kind==='haul'||a.kind==='operate'||a.kind==='deposit'))events.push({tick:w.tick,ev:`${q.name} start ${a.kind} ${a.data.recipe??''} ${JSON.stringify(a.data.items??{})} target ${a.targetId} (${a.goal})`});},onActivityEnd:(q,a,o,d)=>{if((q.id===p.id||q.id===benId)&&(a.kind==='withdraw'||a.kind==='haul'||a.kind==='operate'||a.kind==='deposit'))events.push({tick:w.tick,ev:`${q.name} end ${a.kind} ${a.data.running??a.data.recipe??''} ${o} ${d} moved ${JSON.stringify(a.data.moved??a.data.items??{})}`});}};
 let cartPlan:Intention|undefined;
 const plan=()=>cartPlan??(cartPlan=p.intentions.find(i=>i.kind==='batch'&&i.makes==='cart'));
 for(let n=0;n<BATCH_PATIENCE+600&&!w.carts.length&&(plan()?.status??'active')==='active';n++)stepWorld(w);
 const cp=plan();
 const out={variant,cart:w.carts.length,tick:w.tick,plan:cp?{status:cp.status,reason:cp.reason,step:cp.step,since:cp.since,until:cp.until,history:cp.project?.history}:null,laterPlans:p.intentions.filter(i=>i!==cp&&i.kind!=='night').map(i=>`${i.kind}:${i.makes} ${i.status} ${i.reason}`),yardShelf:yard.store.items,yardEarmarks:yard.ops?.earmarks,inv:p.inv,benInv:ben?.inv,siteDelivered:plankSite?.delivered,planksCreated:w.ledger.created.planks,planksConsumed:w.ledger.consumed.planks,plankEvents:events.filter(e=>/planks/.test(e.ev)),operates:events.filter(e=>/start operate/.test(e.ev)).map(e=>e.tick+' '+e.ev.replace(/\{.*\} target \d+/,'')),goals,conservation:conservationReport(w).ok};
 results.push(out);mkdirSync(OUT,{recursive:true});writeFileSync(`${OUT}/plank_diversion.json`,JSON.stringify(results,null,1));
 expect(conservationReport(w).ok).toBe(true);
},120_000);
