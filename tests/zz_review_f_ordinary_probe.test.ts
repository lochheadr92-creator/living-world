// REVIEW PROBE (agent F): bounded ordinary Normal world at current rules, read-only observation of the cart chain's
// prerequisites. Writes a JSON report to the review scratchpad. Not a contract test; it never fails on world content.
import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {demandsOf,facilitiesOf} from '../src/sim/production';
import {batchWanted} from '../src/sim/batch_plan';
import {cartExperience,HAUL_EXPERIENCE,HAUL_TRIPS} from '../src/sim/transport';
import {stageOf} from '../src/sim/people';
import {serializeWorld} from '../src/app/save';
import {hasKnownResource} from '../src/sim/intent';
import {mayUse,accessLevel} from '../src/sim/facilities';
import type {Intention} from '../src/sim/types';
import { reviewOut } from './helpers/review_out';

const OUT=reviewOut('agent_f');
const seed=process.env.REVIEW_SEED??'forest';
const ticks=Number(process.env.REVIEW_TICKS??12000);
const sampleEvery=Number(process.env.REVIEW_SAMPLE??600);
const budgetMs=Number(process.env.REVIEW_BUDGET_MS??160000);

it(`ordinary ${seed} probe for ${ticks} ticks`,()=>{
 const began=performance.now();
 const w=createWorld({...currentWorldSettings('normal',seed as 'forest',{immigration:false})});
 const plans=new Map<number,{person:number;name:string;kind:string;makes:string;goal:string;since:number;until:number;status:string;reason:string;step:string;project:boolean;lastSeen:number}>();
 const counts:Record<string,number>={};const count=(k:string,n=1)=>{counts[k]=(counts[k]??0)+n;};
 const firstSeen:Record<string,number>={};
 const hauling:Record<number,{name:string;maxWeight:number;maxTrips:number;everEnough:number}>={};
 const cartDemandRows:unknown[]=[];
 const stepRows:unknown[]=[];
 let pureChecks=0,stop='horizon';
 w.hooks={
  onActivityStart:(p,a)=>{
   if(a.kind==='operate')count('operate start:'+String(a.data.recipe));
   if(a.kind==='craft')count('craft start:'+String(a.data.tool));
   if(a.kind==='cart_haul')count('cart_haul start');
   if(a.kind==='haul')count('haul start');
   if(a.kind==='plan_site')count('plan_site start:'+String(a.data.type));
  },
  onActivityEnd:(p,a,outcome,detail)=>{
   if(a.kind==='operate'){count(`operate end:${String(a.data.running??a.data.recipe)}:${outcome}${outcome==='failed'||outcome==='partial'?':'+String(detail).replace(/[0-9]+/g,'#'):''}`);
    if(outcome==='failed'){const b=w.byId.get(a.targetId);if(b&&b.ent==='building'){const shelf=b.store.items;count(`operate failed by access:${accessLevel(w,p,b)}:${String(detail).replace(/[0-9]+/g,'#')}:shelf wood ${shelf.wood??0}`);}}}
   if(a.kind==='craft')count(`craft end:${String(a.data.tool)}:${outcome}`);
   if(a.kind==='haul'&&outcome==='success')count('haul success');
   if(a.kind==='gather'&&String(a.data.stype)==='rock')count(`rock gather end:${outcome}:${detail}`);
  },
 };
 const notePlans=()=>{
  for(const p of w.persons)for(const i of p.intentions){
   const rec=plans.get(i.id);
   if(!rec)plans.set(i.id,{person:p.id,name:p.name,kind:i.kind,makes:i.makes,goal:i.goal,since:i.since,until:i.until,status:i.status,reason:i.reason,step:i.step,project:!!i.project,lastSeen:w.tick});
   else{rec.status=i.status;rec.reason=i.reason;rec.step=i.step;rec.lastSeen=w.tick;}
  }
 };
 while(w.tick<ticks){
  if(w.tick%120===0){
   notePlans();
   for(const p of w.persons){
    if(!p.alive)continue;
    const h=p.hauling;
    if(h){const r=hauling[p.id]??(hauling[p.id]={name:p.name,maxWeight:0,maxTrips:0,everEnough:0});r.maxWeight=Math.max(r.maxWeight,h.weight);r.maxTrips=Math.max(r.maxTrips,h.trips);if(h.weight>=HAUL_EXPERIENCE&&h.trips>=HAUL_TRIPS)r.everEnough++;}
   }
   for(const b of w.buildings)if(firstSeen['building:'+b.type]===undefined)firstSeen['building:'+b.type]=w.tick;
   for(const s of w.sites)if(firstSeen['site:'+s.type]===undefined)firstSeen['site:'+s.type]=w.tick;
  }
  if(w.tick%sampleEvery===0){
   const before=serializeWorld(w);
   for(const p of w.persons){
    if(!p.alive||stageOf(w,p)==='child')continue;
    count('adult samples');
    const ctx=generateOptions(w,p,true,true);
    const yard=facilitiesOf(ctx,'timber_yard').length>0;
    if(yard)count('adult samples knowing a usable yard');
    if(cartExperience(ctx))count('adult samples with hauling ground');
    const d=demandsOf(ctx);
    const cart=d.find(x=>x.item==='cart');
    if(cart){count('cart demand samples');const bw=batchWanted(ctx);cartDemandRows.push({tick:w.tick,person:p.id,name:p.name,why:cart.why,base:cart.base,hammer:(p.inv.hammer??0)>0,saw:(p.inv.saw??0)>0,live:p.intentions.filter(i=>i.status==='active').map(i=>i.kind+':'+i.makes),batchWanted:bw?{item:bw.item,recipe:bw.recipe,nodes:bw.project?.nodes.map(n=>`${n.item}x${n.quantity}:${n.method}`)}:null});}
    for(const i of p.intentions){
     if(i.status!=='active'||i.kind!=='batch')continue;
     count('active batch samples:'+i.makes);
     const ranked=rankOptions(ctx);
     const serving=ctx.options.find(o=>i.stepKey&&o.key===i.stepKey)??ctx.options.find(o=>i.stepKind==='get'&&o.yields===i.stepItem);
     stepRows.push({tick:w.tick,person:p.id,name:p.name,makes:i.makes,step:i.step,stepKey:i.stepKey,blocked:i.blocked,offered:!!serving,servingUtil:serving?.util,top:ranked.slice(0,3).map(o=>({key:o.key,util:Math.round(o.util*10)/10})),needs:{hunger:Math.round(p.needs.hunger),thirst:Math.round(p.needs.thirst),energy:Math.round(p.needs.energy),warmth:Math.round(p.needs.warmth)},knowsStone:hasKnownResource(w,p,'stone'),knowsWood:hasKnownResource(w,p,'wood')});
    }
   }
   if(serializeWorld(w)!==before)throw new Error('Impure observer');
   pureChecks++;
  }
  stepWorld(w);
  if(w.tick%240===0&&performance.now()-began>budgetMs){stop='budget';break;}
 }
 notePlans();
 const buildings:Record<string,number>={};for(const b of w.buildings)buildings[b.type]=(buildings[b.type]??0)+1;
 const sites:Record<string,{n:number;missing:string[]}>={};for(const s of w.sites){const r=sites[s.type]??(sites[s.type]={n:0,missing:[]});r.n++;r.missing.push(Object.entries(s.required).map(([k,n])=>`${k}:${(n??0)-(s.delivered[k as never]??0)-(s.used[k as never]??0)}`).join(','));}
 const tools:Record<string,number>={};for(const t of w.tools)tools[t.kind+(t.tier?'(iron)':'')]=(tools[t.kind+(t.tier?'(iron)':'')]??0)+1;
 const stores:Record<string,unknown>={};for(const b of w.buildings)if(b.type==='storehouse'||b.type==='timber_yard'||b.type==='kiln'||b.type==='granary')stores[`${b.type}#${b.id} hh${b.hhId}`]={items:b.store.items,racked:w.tools.filter(t=>t.holder===b.id).map(t=>t.kind),adultsMayUse:w.persons.filter(q=>q.alive&&stageOf(w,q)!=='child'&&mayUse(w,q,b)).length,adults:w.persons.filter(q=>q.alive&&stageOf(w,q)!=='child').length,accessLevels:w.persons.filter(q=>q.alive&&stageOf(w,q)!=='child').reduce((m,q)=>{const l=accessLevel(w,q,b);m[l]=(m[l]??0)+1;return m;},{} as Record<string,number>),builders:b.ops?.builders,job:b.ops?.job?{recipe:b.ops.job.recipe,phase:b.ops.job.phase,client:b.ops.job.client,lastWork:b.ops.job.lastWork}:null};
 const plansOut=[...plans.values()].filter(x=>x.kind!=='night');
 const report={seed,rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(performance.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,pureChecks,counts,firstSeen,buildings,sites,tools,stores,carts:w.carts.length,hauling:Object.values(hauling).sort((a,b)=>b.maxWeight-a.maxWeight).slice(0,12),haulThreshold:{HAUL_EXPERIENCE,HAUL_TRIPS},cartDemandRows,stepRows,plans:plansOut,planSummary:plansOut.reduce((m,x)=>{const k=`${x.kind}:${x.makes||'-'}:${x.status}`;m[k]=(m[k]??0)+1;return m;},{} as Record<string,number>),planReasons:plansOut.filter(x=>x.status!=='active').reduce((m,x)=>{const k=`${x.kind}:${x.makes||'-'} -> ${x.reason.replace(/[0-9]+/g,'#').slice(0,90)}`;m[k]=(m[k]??0)+1;return m;},{} as Record<string,number>)};
 mkdirSync(OUT,{recursive:true});
 writeFileSync(`${OUT}/ordinary_probe_${seed}_${ticks}.json`,JSON.stringify(report,null,1));
 console.log(JSON.stringify({seed,tick:w.tick,stop,seconds:report.seconds,alive:report.alive,deaths:report.deaths,buildings,sites:Object.fromEntries(Object.entries(sites).map(([k,v])=>[k,v.n])),tools,carts:w.carts.length,counts,planSummary:report.planSummary,topHauling:report.hauling.slice(0,3)}));
 expect(pureChecks).toBeGreaterThan(0);
},178_000);
