import {afterEach,expect,it} from 'vitest';
import {sourceJourney,storeJourney,waterJourney,walkFor} from './helpers/kept_target';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,ledgerConsume,produce,consume} from '../src/sim/economy';
import {observe,delBelief} from '../src/sim/knowledge';
import {makeWolf} from '../src/sim/wildlife';
import {perceive} from '../src/sim/perception';
import {setExternalController} from '../src/sim/external';
import {rebuildMobileGrid} from '../src/sim/registry';
import {keepCurrent,setKeptTarget} from '../src/sim/kept_target';
import {makeCtx,rankWaterSpots} from '../src/sim/optutil';
import {carryCap} from '../src/sim/people';
afterEach(()=>{setExternalController(null);setKeptTarget(true);});
it('retains and honestly scores the valid running source after real movement and discovery, preserving rules 64',()=>{
 for(const version of [64,65]){
  const f=sourceJourney(version),act=walkFor(f.w,f.p,f.key);
  expect(f.p.y).toBeGreaterThan(50);expect(f.near.every(s=>f.p.beliefs[s.id]?.seen>1000)).toBe(true);
  const ctx=generateOptions(f.w,f.p,true,true),kept=ctx.options.find(o=>o.key===f.key);
  expect(!!kept).toBe(version===65);
  if(kept){expect(kept.util).toBeGreaterThan(0);expect(kept.parts.some(([n])=>n==='walking')).toBe(true);}
  const before=serializeWorld(f.w);generateOptions(f.w,f.p,true,true);expect(serializeWorld(f.w)).toBe(before);
  reviewActivity(f.w,f.p);expect(f.p.activity?.id===act.id).toBe(version===65);
  expect(conservationReport(f.w).ok).toBe(true);
 }
});
it('reaches and gathers from the source across a save, then chooses a useful physical delivery',()=>{
 const f=sourceJourney(),act=walkFor(f.w,f.p,f.key);reviewActivity(f.w,f.p);expect(f.p.activity?.id).toBe(act.id);
 const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<2000&&f.p.activity?.id===act.id;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.p.activity?.id).not.toBe(act.id);expect(f.p.lastResult?.outcome).toBe('interrupted');
 expect(f.p.activity?.kind).toBe('haul');expect(f.p.activity?.targetId).toBe(f.target.id);
 expect(f.p.inv.wood).toBeGreaterThan(0);expect(f.far.amount).toBeLessThan(8);
 for(let n=0;n<1000&&!((f.target.delivered.wood??0)>0);n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.target.delivered.wood).toBeGreaterThan(0);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('does not retain a source after observed depletion, or prevent a visible wolf or critical thirst interrupting',()=>{
 for(const cause of ['empty','wolf','thirst']){
  const f=sourceJourney(),act=walkFor(f.w,f.p,f.key);
  if(cause==='empty'){ledgerConsume(f.w,f.far.item,f.far.amount,'staged source loss');f.far.amount=0;observe(f.w,f.p,f.far);expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===f.key)).toBe(false);}
  if(cause==='wolf'){const wolf=makeWolf(f.w,f.p.x+2,f.p.y);rebuildMobileGrid(f.w);perceive(f.w,f.p);expect(f.p.seen.some(s=>s.id===wolf.id)).toBe(true);}
  if(cause==='thirst')f.p.needs.thirst=8;
  reviewActivity(f.w,f.p);expect(f.p.activity?.id,cause+JSON.stringify({result:f.p.lastResult,danger:f.p.bykind.danger,seen:f.p.seen})).not.toBe(act.id);
  if(cause==='wolf')expect(f.p.lastResult?.detail).toBe('danger nearby');
  if(cause==='thirst')expect(f.p.lastResult?.detail).toContain('more urgent need');
  expect(conservationReport(f.w).ok).toBe(true);
 }
});
it('retains a real water destination after walking reveals a closer stretch of shore',()=>{
 for(const version of [64,65]){
  const f=waterJourney(version),act=walkFor(f.w,f.p,f.key,210);
  const ctx=generateOptions(f.w,f.p,true,true);
  expect(ctx.options.some(o=>o.key===f.key),JSON.stringify({version,position:[f.p.x,f.p.y],far:f.far,water:f.p.bykind.water,offers:ctx.options.filter(o=>o.kind==='drink').map(o=>o.key)})).toBe(version===65);
  expect(f.p.activity?.id).toBe(act.id);expect(conservationReport(f.w).ok).toBe(true);
  expect(rankWaterSpots(ctx,2).length).toBeLessThanOrEqual(3);
  reviewActivity(f.w,f.p);expect(f.p.activity?.id===act.id).toBe(version===65);
  if(version===65){
   const thirst=f.p.needs.thirst,twin=deserializeWorld(serializeWorld(f.w));
   for(let n=0;n<500&&f.p.activity?.id===act.id;n++){stepWorld(f.w);stepWorld(twin);}
   expect(f.p.needs.thirst).toBeGreaterThan(thirst);expect(f.p.needs.thirst,JSON.stringify(f.p.lastResult)).toBeGreaterThanOrEqual(86);
   expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
  }
 }
});
it('keeps the current food source past the three-source limit after real discovery',()=>{
 const f=sourceJourney(65,true);walkFor(f.w,f.p,f.key);
 expect(f.near.every(s=>f.p.beliefs[s.id])).toBe(true);
 const ctx=generateOptions(f.w,f.p,true,true),food=ctx.options.filter(o=>o.kind==='gather'&&o.tag==='food');
 expect(food.map(o=>o.key)).toContain(f.key);expect(food.length).toBeLessThanOrEqual(4);
});
it('keeps a real raw or processed stock journey past the two-store limit',()=>{
 for(const item of ['wood','planks'] as const){
  const f=storeJourney(65,item),act=walkFor(f.w,f.p,f.key);
  expect(f.near.every(s=>f.p.beliefs[s.id])).toBe(true);
  const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.key===f.key)).toBe(true);
  reviewActivity(f.w,f.p);expect(f.p.activity?.id).toBe(act.id);
  const twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<1000&&!(f.p.inv[item]??0);n++){stepWorld(f.w);stepWorld(twin);}
  expect(f.p.inv[item]).toBeGreaterThan(0);expect(f.far.store.items[item]??0).toBeLessThan(8);
  expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 }
});
it('adds at most the eligible current candidate and restores the old choice under ablation',()=>{
 const f=sourceJourney(),act=walkFor(f.w,f.p,f.key),ctx=makeCtx(f.w,f.p,true);
 const candidates=['a','b',f.key,'c','d'];
 expect(keepCurrent(ctx,candidates,2,c=>c)).toEqual(['a','b',f.key]);
 expect(keepCurrent(ctx,candidates,3,c=>c)).toEqual(['a','b',f.key]);
 expect(keepCurrent(ctx,['a','b','c'],2,c=>c)).toEqual(['a','b']);
 setKeptTarget(false);expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===f.key)).toBe(false);
 reviewActivity(f.w,f.p);expect(f.p.activity?.id).not.toBe(act.id);
});
it('does not restore unknown sources, empty stores, forbidden homes or full-pack withdrawals',()=>{
 const source=sourceJourney();walkFor(source.w,source.p,source.key);delBelief(source.p,source.far.id);
 expect(generateOptions(source.w,source.p,true,true).options.some(o=>o.key===source.key)).toBe(false);
 for(const item of ['wood','planks'] as const)for(const cause of ['empty','access','capacity']){
  const f=storeJourney(65,item);walkFor(f.w,f.p,f.key);
  if(cause==='empty')consume(f.w,f.far.store.items,item,8,'staged stock loss');
  if(cause==='access'){f.far.type='hut';f.far.hhId=987654;}
  if(cause==='capacity')produce(f.w,f.p.inv,carryCap(f.w,f.p),'grain',100,'staged full pack');
  observe(f.w,f.p,f.far);
  expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===f.key),item+cause).toBe(false);
  expect(conservationReport(f.w).ok).toBe(true);
 }
});
