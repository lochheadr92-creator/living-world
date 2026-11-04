import {perceive} from '../src/sim/perception';
import {careSupplyScene} from './helpers/care_supply';
import {generateOptions} from '../src/sim/decision';
import {produce,consume} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {delBelief} from '../src/sim/knowledge';
import {describe,it,expect} from 'vitest';
import {stage,addPerson,building,site,done,learn} from './helpers/kit';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {updateWells,wellBody,wellOptions,wellFetchOptions,wellSource,wellSiteConflict,wellDemand} from '../src/sim/wells';
import {makeCtx} from '../src/sim/optutil';
import {newActivity,startActivity,stepActivity} from '../src/sim/activities';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';

function fixture(version=134){
 const s=stage('finite-well');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:version};
 const p=addPerson(s,'Ada',40.5,25.5,{thirst:50,hunger:95,energy:95});
 const b=building(s,'well',40,23,0);done(s);return {w:s.w,p,b};
}
describe('constructed wells share the finite water budget',()=>{
 it('transfers one real unit, caps storage, and cannot refill from a dry basin',()=>{
  const {w,b}=fixture(),body=wellBody(w,b.x+1,b.y+1)!;expect(body).toBeTruthy();
  const initial=body.amount;w.tick=29;updateWells(w);
  expect(b.store.items.water).toBe(1);expect(body.amount).toBe(initial-1);expect(conservationReport(w).ok).toBe(true);
  for(let i=1;i<20;i++){w.tick=29+i*50;updateWells(w);}expect(b.store.items.water).toBe(12);
  b.store.items={};body.amount=0;snapshotInitial(w);w.tick+=50;updateWells(w);
  expect(b.store.items.water??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
 });
 it('uses only remembered supply and consumes it after physical arrival and work',()=>{
  const {w,p,b}=fixture();b.store.items.water=2;snapshotInitial(w);delBelief(p,b.id);
  let ctx=makeCtx(w,p,true);wellOptions(ctx);expect(ctx.options).toHaveLength(0);
  learn(w,p,b);ctx=makeCtx(w,p,true);wellOptions(ctx);const option=ctx.options.find(o=>o.kind==='drink')!;
  const before=serializeWorld(w);wellOptions(makeCtx(w,p,true));expect(serializeWorld(w)).toBe(before);
  startActivity(w,p,option.make!()!);for(let i=0;i<100&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(p.needs.thirst).toBeGreaterThan(50);expect(b.store.items.water??0).toBeLessThan(2);expect(conservationReport(w).ok).toBe(true);
 });
 it('discovers stale empty supply without granting thirst relief',()=>{
  const {w,p,b}=fixture();b.store.items.water=1;learn(w,p,b);b.store.items={};snapshotInitial(w);
  const ctx=makeCtx(w,p,true);wellOptions(ctx);startActivity(w,p,ctx.options.find(o=>o.kind==='drink')!.make!()!);
  for(let i=0;i<100&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(p.needs.thirst).toBe(50);expect(p.beliefs[b.id].items?.water??0).toBe(0);
 });
 it('rejects pre-feature and malformed well saves, and continues current saves exactly',()=>{
  const {w,b}=fixture();const raw=serializeWorld(w),copy=deserializeWorld(raw);
  for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}expect(serializeWorld(w)).toBe(serializeWorld(copy));
  const old=JSON.parse(raw);old.world.settings.rulesVersion=133;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
  b.store.items.water=-1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow();
 });
});

function runAction(w:ReturnType<typeof fixture>['w'],p:ReturnType<typeof fixture>['p'],max=1000){
 for(let i=0;i<max&&p.activity;i++){w.tick++;stepActivity(w,p);}
}
it('requires real construction materials and paid work before a well can draw water',()=>{
 const s=stage('well-construction');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:134};
 const p=addPerson(s,'Builder',40.5,25.5,{thirst:95,hunger:95,energy:95});
 const st=site(s,'well',40,23,0,p.id,{wood:4,stone:8});done(s);
 expect(wellSiteConflict(s.w,41,24)).toContain('another well');
 expect(wellSiteConflict(s.w,60,60)).toContain('catchment');
 expect(s.w.buildings.filter(b=>b.type==='well')).toHaveLength(0);
 startActivity(s.w,p,newActivity(s.w,p,{kind:'build',label:'Build well',goal:'staged construction',targetId:st.id,targetType:'site',tx:41,ty:24,spotX:40.5,spotY:25.5,utility:50,maxTicks:1000}));
 runAction(s.w,p);
 const b=s.w.buildings.find(b=>b.type==='well');expect(b).toBeTruthy();expect(st.used).toEqual({wood:4,stone:8});
 expect(st.work).toBe(st.workTotal);expect(b!.store.items.water??0).toBe(0);expect(conservationReport(s.w).ok).toBe(true);
 s.w.tick+=((29-s.w.tick%50)+50)%50;updateWells(s.w);expect(b!.store.items.water).toBe(1);
 expect(conservationReport(s.w).ok).toBe(true);
});
it('cannot finish an unfunded well',()=>{
 const s=stage('well-unfunded');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:134};
 const p=addPerson(s,'Builder',40.5,25.5,{thirst:95,hunger:95,energy:95}),st=site(s,'well',40,23,0,p.id);done(s);
 startActivity(s.w,p,newActivity(s.w,p,{kind:'build',label:'Build well',goal:'staged construction',targetId:st.id,targetType:'site',tx:41,ty:24,spotX:40.5,spotY:25.5,utility:50,maxTicks:1000}));
 runAction(s.w,p);expect(s.w.buildings.some(b=>b.type==='well')).toBe(false);expect(st.used).toEqual({});expect(conservationReport(s.w).ok).toBe(true);
});
it('draws into the pack one paid unit at a time and preserves a care purpose',()=>{
 const {w,p,b}=fixture();b.store.items.water=3;snapshotInitial(w);learn(w,p,b);
 const ctx=makeCtx(w,p,true);wellFetchOptions(ctx,2,70,'water for a dependent','care',{to:999,seen:0});
 const a=ctx.options[0].make!()!;expect(a.data.careSupply).toEqual({to:999,seen:0});startActivity(w,p,a);
 runAction(w,p);expect(p.inv.water).toBe(2);expect(b.store.items.water).toBe(1);expect(a.data.careAcquired).toBe(2);expect(conservationReport(w).ok).toBe(true);
});
it.each(['foreign','remote','indoors','ruined'] as const)('rechecks %s access before paying a unit',why=>{
 const {w,p,b}=fixture();b.store.items.water=2;learn(w,p,b);const ctx=makeCtx(w,p,true);wellOptions(ctx);const a=ctx.options[0].make!()!;
 if(why==='foreign')b.hhId=999;if(why==='remote')p.x=5;if(why==='indoors')p.indoors=999;if(why==='ruined')b.condition=0;
 expect(wellSource(w,p,a)).toBeNull();expect(b.store.items.water).toBe(2);
});
it('stops an interrupted supply race without duplicate water and resumes mid-draw saves exactly',()=>{
 const {w,p,b}=fixture();b.store.items.water=2;snapshotInitial(w);learn(w,p,b);
 const ctx=makeCtx(w,p,true);wellFetchOptions(ctx,2,70,'carry water','water');startActivity(w,p,ctx.options[0].make!()!);
 for(let i=0;i<5;i++){w.tick++;stepActivity(w,p);}const copy=deserializeWorld(serializeWorld(w)),q=copy.persons.find(q=>q.id===p.id)!;
 for(let i=0;i<70;i++){w.tick++;copy.tick++;stepActivity(w,p);stepActivity(copy,q);}
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(p.inv.water).toBe(2);expect(conservationReport(w).ok).toBe(true);
});

it('does not draw into a full pack',()=>{
 const {w,p,b}=fixture();b.store.items.water=2;snapshotInitial(w);produce(w,p.inv,carryCap(w,p),'grain',100,'staged full pack');learn(w,p,b);
 const ctx=makeCtx(w,p,true);wellFetchOptions(ctx,2,70,'carry water','water');startActivity(w,p,ctx.options[0].make!()!);runAction(w,p);
 expect(p.inv.water??0).toBe(0);expect(b.store.items.water).toBe(2);expect(conservationReport(w).ok).toBe(true);
});
it('cannot pay from a well emptied by someone else during work',()=>{
 const {w,p,b}=fixture();b.store.items.water=1;snapshotInitial(w);learn(w,p,b);
 const ctx=makeCtx(w,p,true);wellFetchOptions(ctx,1,70,'carry water','water');startActivity(w,p,ctx.options[0].make!()!);
 for(let i=0;i<10&&p.activity?.phase!=='work';i++){w.tick++;stepActivity(w,p);}
 expect(p.activity?.phase).toBe('work');consume(w,b.store.items,'water',1,'staged competing drink');runAction(w,p);
 expect(p.inv.water??0).toBe(0);expect(p.beliefs[b.id].items?.water??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('connects observed household care to a known well and actual receipt',()=>{
 const f=careSupplyScene(134,true),b=building(f.s,'well',43,46,0);produce(f.w,b.store.items,b.store.cap,'water',4,'declared well water');learn(f.w,f.helper,b);
 const o=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`care_supply:${f.elder.id}:water:${b.id}`);
 expect(o).toBeTruthy();startActivity(f.w,f.helper,o!.make!()!);
 for(let i=0;i<400&&f.helper.careJourney?.phase!=='return';i++)stepWorld(f.w);
 expect(f.helper.careJourney?.phase).toBe('return');
 for(let i=0;i<400&&!['delivered','deposited'].includes(f.helper.careJourney?.phase??'');i++)stepWorld(f.w);
 expect(['delivered','deposited']).toContain(f.helper.careJourney?.phase);expect(f.helper.careJourney?.received).toBeGreaterThan(0);expect(conservationReport(f.w).ok).toBe(true);
});
it.each(['geometry','door','capacity','cost','work','flag'] as const)('rejects malformed new well %s state',kind=>{
 const {w,b,p}=fixture();
 if(kind==='geometry')b.x=-1;if(kind==='door')b.doorY+=2;if(kind==='capacity')b.store.cap=99;
 if(kind==='cost'||kind==='work'){const s={w,rng:undefined as never},st=site(s,'well',50,23,0,p.id);if(kind==='cost')st.required.wood=0;else st.workTotal=0;}
 if(kind==='flag')p.activity=newActivity(w,p,{kind:'drink',label:'Bad',goal:'malformed',here:true,data:{fromWell:'true'}});
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow();
});

it('values a known long water journey without requiring a food surplus or reading unknown sources',()=>{
 const {w,p,b}=fixture();delBelief(p,b.id);p.inv={};p.y=14.5;perceive(w,p);p.y=25.5;delBelief(p,b.id);const ctx=makeCtx(w,p,true);
 expect(wellDemand(ctx,41,25)).toBeGreaterThan(0);
 expect(wellDemand(ctx,41,16)).toBe(0);
 for(const id of [...p.bykind.water??[]])delBelief(p,id);
 expect(wellDemand(makeCtx(w,p,true),41,25)).toBe(0);
});

it('accepts the household member layout and allocates the finished site for public use',()=>{
 const s=stage('public-well-layout');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:134};
 const p=addPerson(s,'Planner',40.5,25.5,{hunger:95,thirst:95,energy:95});done(s);
 startActivity(s.w,p,newActivity(s.w,p,{kind:'plan_site',label:'Mark out well',goal:'shorter water journey',tx:41,ty:24,spotX:40.5,spotY:25.5,utility:30,data:{type:'well',sx:40,sy:23,hh:p.hhId}}));
 expect(p.activity?.kind).toBe('plan_site');runAction(s.w,p);
 expect(s.w.sites).toHaveLength(1);expect(s.w.sites[0].type).toBe('well');expect(s.w.sites[0].hhId).toBe(0);
 expect(s.w.sites[0].creatorId).toBe(p.id);expect(conservationReport(s.w).ok).toBe(true);
});
