import {waterScene,finishWaterOption,startWaterOption} from './helpers/water';
import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {T} from '../src/sim/types';
import {initializeWater,waterBodyAt,drawWater,waterSign,updateWater,validateWater} from '../src/sim/hydrology';
import {addItem,conservationReport,consume,ledgerConsume,snapshotInitial,totalItems} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {rememberedDry,waterSupplyNear,observeShore} from '../src/sim/water_access';
import {abortActivity,handlerOf} from '../src/sim/activities';
import type {Person} from '../src/sim/types';
import {createPlot} from '../src/sim/farming';
import {observe,delBelief} from '../src/sim/knowledge';
import {createBuilding} from '../src/sim/buildings';
import {ledgerCreate} from '../src/sim/economy';
import {makeSource,updateSources} from '../src/sim/sources';
import {describeEntity} from '../src/sim/inspect';
import {waterViewId} from '../src/sim/inspect_water';

const beliefNear=(p:Person,x:number,y:number)=>Object.values(p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];

const scene=waterScene;
it('gives different-sized water components bounded stocks without drawing randomness',()=>{
  const {w,small,large}=scene();expect(small.capacity).toBe(2);expect(large.capacity).toBe(10);
  expect(w.waterBodies!.length).toBe(3);expect(waterSign(small)).toBe('wet');
  const before=serializeWorld(w);initializeWater(w);waterBodyAt(w,42,40);expect(serializeWorld(w)).toBe(before);
});
it('accounts extraction as transfer and useful drinking as consumption, not creation',()=>{
  const {w,p,small}=scene(),created={...w.ledger.created};
  const got=drawWater(w,small,2);addItem(p.inv,'water',got);expect(got).toBe(2);expect(waterSign(small)).toBe('dry');
  expect(drawWater(w,small,1)).toBe(0);expect(w.ledger.created).toEqual(created);expect(conservationReport(w).ok).toBe(true);
  expect(consume(w,p.inv,'water',2,'test drinking')).toBe(2);expect(conservationReport(w).ok).toBe(true);
});
it('saves the exact bounded source state and validates it on restoration',()=>{
  const {w,small}=scene();const n=drawWater(w,small,1);ledgerConsume(w,'water',n,'staged prior drinking');
  const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(conservationReport(w).ok).toBe(true);
});
it('physically drinks the small source dry through an offered action and updates only local memories',()=>{
  const {w,p,small,large}=scene(),b=beliefNear(p,42,40),remote=structuredClone(beliefNear(p,55,40));
  const a=finishWaterOption(w,p,`drink:${b.id}`);
  expect(a.cycle).toBe(2);expect(small.amount).toBe(0);expect(small.drawn).toBe(2);expect(p.needs.thirst).toBeGreaterThan(95);
  expect(p.inv.water??0).toBe(0);expect(p.beliefs[b.id].waterSupply).toBe('dry');expect(p.beliefs[remote.id]).toEqual(remote);expect(large.drawn).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('continues exactly from the first actual sip before the second',()=>{
  const {w,p,small}=scene(),b=beliefNear(p,42,40),a=startWaterOption(w,p,`drink:${b.id}`);
  const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
  try{
    for(let n=0;n<800&&a.cycle<1;n++)stepWorld(w);
    expect(a.cycle).toBe(1);expect(small.amount).toBe(1);expect(p.activity?.id).toBe(a.id);
    const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
    expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(small.amount).toBe(0);expect(conservationReport(w).ok).toBe(true);
  }finally{release();}
});
it('discovers depletion after departure and physically drinks at a personally remembered alternative',()=>{
  const {w,p,small,large}=scene(),b=beliefNear(p,42,40),old={...p.beliefs[b.id]},a=startWaterOption(w,p,`drink:${b.id}`);
  // Explicit staged competitor draw while Ada is travelling; it changes stock, not her knowledge.
  const n=drawWater(w,small,2);ledgerConsume(w,'water',n,'staged competing drink');expect(p.beliefs[b.id]).toEqual(old);
  const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
  try{for(let t=0;t<800&&p.activity?.id===a.id;t++)stepWorld(w);}finally{release();}
  expect(p.beliefs[b.id].waterSupply).toBe('dry');expect(p.needs.thirst).toBeLessThan(36);
  expect(generateOptions(w,p,true,true).options.some(o=>o.key===`drink:${b.id}`)).toBe(false);
  const next=rankOptions(generateOptions(w,p,true,true)).find(o=>o.kind==='drink'&&o.targetId!==b.id);expect(next).toBeTruthy();
  finishWaterOption(w,p,next!.key);expect(large.drawn).toBeGreaterThan(0);expect(p.needs.thirst).toBeGreaterThan(88);expect(conservationReport(w).ok).toBe(true);
});
it('keeps an interrupted sip from consuming water and releases its action',()=>{
  const {w,p,small}=scene(),b=beliefNear(p,42,40),a=startWaterOption(w,p,`drink:${b.id}`),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
  try{for(let t=0;t<800&&!(a.phase==='work'&&a.progress>=3);t++)stepWorld(w);expect(a.phase).toBe('work');expect(a.progress).toBeLessThan(8);abortActivity(w,p,'staged interruption');}finally{release();}
  expect(small.drawn).toBe(0);expect(small.amount).toBe(2);expect(p.activity).toBeNull();expect(conservationReport(w).ok).toBe(true);
});
it('balances captured rain and actual evaporation, capped by capacity and zero',()=>{
  const {w,small}=scene();ledgerConsume(w,'water',drawWater(w,small,2),'staged previous drink');
  w.weather.rain=1;w.weather.temp=10;
  for(let n=1;n<=40;n++){w.tick=n*60;updateWater(w);}expect(small.amount).toBe(2);expect(small.replenished).toBe(2);expect(conservationReport(w).ok).toBe(true);
  w.weather.rain=0;w.weather.temp=40;
  for(let n=41;n<=1040;n++){w.tick=n*60;updateWater(w);}
  expect(small.amount).toBe(0);expect(small.evaporated).toBe(2);expect(conservationReport(w).ok).toBe(true);expect(()=>validateWater(w)).not.toThrow();
});
it('does not reveal an unseen dry source through choice, and retains stale uncertainty',()=>{
  const {w,p,large}=scene(),b=beliefNear(p,55,40);const before=JSON.stringify(rankOptions(generateOptions(w,p,true,true)));
  ledgerConsume(w,'water',drawWater(w,large,large.amount),'staged remote draw');const after=JSON.stringify(rankOptions(generateOptions(w,p,true,true)));expect(after).toBe(before);
  expect(b.waterSupply).toBeUndefined();b.waterSupply='dry';b.seen=w.tick;expect(rememberedDry(w,b)).toBe(true);w.tick+=1200;expect(rememberedDry(w,b)).toBe(false);
  const raw=serializeWorld(w);waterSupplyNear(w,b.x,b.y);generateOptions(w,p,true,true);expect(serializeWorld(w)).toBe(raw);
});
it('physically fetches for a growing household field, saves carried water and then drinks it',()=>{
  const {w,p,small}=scene();p.needs.thirst=100;const pl=createPlot(w,44,44,p.hhId);pl.state='growing';observe(w,p,pl);
  const before=w.ledger.created.water??0,a=finishWaterOption(w,p,'fetch_water');
  expect(a.cycle).toBe(2);expect(p.inv.water).toBe(2);expect(small.drawn).toBe(2);expect(w.ledger.created.water??0).toBe(before);expect(conservationReport(w).ok).toBe(true);
  const saved=deserializeWorld(serializeWorld(w));expect(saved.persons.find(q=>q.id===p.id)?.inv.water).toBe(2);
  p.needs.thirst=35;const drink=generateOptions(w,p,true,true).options.find(o=>o.label==='Drink from my waterskin');expect(drink).toBeTruthy();
  finishWaterOption(w,p,drink!.key);expect(p.inv.water??0).toBe(0);expect(p.needs.thirst).toBeGreaterThan(95);expect(conservationReport(w).ok).toBe(true);
});
it('does not extract a unit when the pack fills during the journey',()=>{
  const {w,p,small}=scene();p.needs.thirst=100;const pl=createPlot(w,44,44,p.hhId);pl.state='growing';observe(w,p,pl);
  const a=startWaterOption(w,p,'fetch_water');addItem(p.inv,'wood',6);ledgerCreate(w,'wood',6,'staged load received after departure');
  const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
  try{for(let t=0;t<800&&p.activity?.id===a.id;t++)stepWorld(w);}finally{release();}
  expect(small.drawn).toBe(0);expect(p.inv.water??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('accounts fish loss at an actually dry associated source and retains pure current-world inspection',()=>{
  const {w,p,small}=scene(),fish=makeSource(w,'fish_spot',42,40,3);snapshotInitial(w);
  ledgerConsume(w,'water',drawWater(w,small,2),'staged prior draw');updateSources(w);
  expect(fish.amount).toBe(0);expect(w.ledger.spoiled.fish).toBe(3);expect(conservationReport(w).ok).toBe(true);
  const raw=serializeWorld(w),view=describeEntity(w,waterViewId(small));expect(view?.title).toBe('Dry water source');expect(view?.rows).toContainEqual(['Actual draws','2 units']);expect(serializeWorld(w)).toBe(raw);
});
it('rejects malformed, invented or inconsistent water histories and invalid draw quantities',()=>{
  const {w,small}=scene();for(const n of [NaN,Infinity,-1])expect(drawWater(w,small,n)).toBe(0);
  const raw=serializeWorld(w);small.amount=small.capacity+1;expect(()=>validateWater(w)).toThrow();
  const copy=deserializeWorld(raw);copy.waterBodies![0].drawn=5;expect(()=>validateWater(copy)).toThrow();
  const older=waterScene(86).w;expect(older.waterBodies).toBeUndefined();expect(()=>validateWater(older)).not.toThrow();
  const relabelled=deserializeWorld(raw);relabelled.settings.rulesVersion=86;
  expect(()=>deserializeWorld(serializeWorld(relabelled))).toThrow('invalid saved natural water budget');
});
it('uses actually fetched water in later physical crop care and saves the result',()=>{
  const {w,p,small}=scene();p.needs.thirst=100;const pl=createPlot(w,44,44,p.hhId);pl.state='growing';pl.care=0.2;observe(w,p,pl);
  finishWaterOption(w,p,'fetch_water');expect(p.inv.water).toBe(2);expect(small.drawn).toBe(2);
  finishWaterOption(w,p,'tend:'+pl.id);expect(p.inv.water).toBe(1);expect(pl.care).toBeGreaterThan(0.99);expect(pl.lastTended).toBeGreaterThan(0);
  expect(conservationReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
it('offers a bounded search when the only personally known water is freshly dry',()=>{
  const {w,p,small}=scene(),b=beliefNear(p,42,40);
  for(const known of Object.values(p.beliefs))if(known.kind==='water'&&known.id!==b.id)delBelief(p,known.id);
  ledgerConsume(w,'water',drawWater(w,small,2),'staged prior local draw');observeShore(w,p);
  expect(p.beliefs[b.id].waterSupply).toBe('dry');const ctx=generateOptions(w,p,true,true);
  expect(ctx.options.some(o=>o.key===`drink:${b.id}`)).toBe(false);expect(ctx.blocked.some(o=>o.blocked?.includes('dry shore'))).toBe(true);
  expect(ctx.options.some(o=>o.label==='Search for water')).toBe(true);
});
it('rejects an indoor shore sip at the execution boundary',()=>{
  const {w,p,small}=scene(),b=beliefNear(p,42,40),a=startWaterOption(w,p,`drink:${b.id}`),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
  try{for(let t=0;t<800&&!(a.phase==='work'&&a.progress>=3);t++)stepWorld(w);expect(a.phase).toBe('work');
    // Direct boundary mutation is a declared adversarial fixture; no teleport delivery is accepted.
    const home=createBuilding(w,'hut',36,44,p.hhId);p.indoors=home.id;
    const result=handlerOf('drink')!.work!(w,p,a);expect(result).toBe('fail:cannot reach that shore now');
  }finally{release();}
  expect(small.drawn).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
