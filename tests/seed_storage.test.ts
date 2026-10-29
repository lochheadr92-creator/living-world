import {afterEach,expect,it} from 'vitest';
import {seedStorageScene} from './helpers/seed_storage';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {finishPrerequisite,selectPrerequisite} from './helpers/tool_prerequisite';
import {addPerson,pin} from './helpers/kit';
import {conservationReport,ledgerCreate,weightOf,invRoom} from '../src/sim/economy';
import {setSeedStorage,spareSeed} from '../src/sim/seed_storage';
import {stepWorld} from '../src/sim/world';
import {abortActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {createPlot} from '../src/sim/farming';
import {observe,delBelief} from '../src/sim/knowledge';
import {craftedToolFits,setCraftCapacity} from '../src/sim/act_build';
import {killPerson} from '../src/sim/lifecycle';
import {parseIntervention} from '../scripts/lab/lab';
afterEach(()=>{setSeedStorage(true);setCraftCapacity(true);setExternalController(null);});
it('offers a physical home deposit for spare seed blocking a known material need, preserving rules 57',()=>{
 for(const version of [57,58]){
  const f=seedStorageScene(version),before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
  const o=ctx.options.find(o=>o.key===`seed_stash:${f.home.id}`);
  expect(Boolean(o)).toBe(version>=58);expect(serializeWorld(f.w)).toBe(before);
 }
});

it('physically stores spare seed, frees raw material acquisition and makes the required hammer; travelling save continuation is exact',()=>{
 const f=seedStorageScene(),before=f.p.inv.seeds!;
 const {act,restore}=selectPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
 for(let i=0;i<4;i++)stepWorld(f.w);
 const copy=deserializeWorld(serializeWorld(f.w));
 try{for(let i=0;i<1000&&f.p.activity?.id===act.id;i++){stepWorld(f.w);stepWorld(copy);}
  expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(f.p.inv.seeds).toBe(3);expect(f.home.store.items.seeds).toBe(before-3);
 }finally{restore();pin(f.p);}
 expect(invRoom(f.w,f.p,'stone')).toBeGreaterThanOrEqual(1);
 finishPrerequisite(f.w,f.p,`gather:${f.tree.id}`);finishPrerequisite(f.w,f.p,`haul:${f.target.id}`);finishPrerequisite(f.w,f.p,`gather:${f.rock.id}`);finishPrerequisite(f.w,f.p,'craft:hammer');
 expect(f.p.inv.hammer).toBe(1);expect(conservationReport(f.w).ok).toBe(true);
});

it('uses retained seed for actual planting and physically retrieves stored seed for further farming',()=>{
 const f=seedStorageScene();
 for(let i=0;i<5;i++)pin(addPerson(f.s,`Family ${i}`,42.5+i,40.5,{hh:f.p.hhId,age:30,hunger:100,thirst:100,energy:100}));
 const plots=[36,38,40].map(x=>{const pl=createPlot(f.w,x,43,f.p.hhId);pl.state='tilled';observe(f.w,f.p,pl);return pl;});pin(f.p);
 finishPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
 const stored=f.home.store.items.seeds!;
 for(const pl of plots)finishPrerequisite(f.w,f.p,`plant:${pl.id}`);
 expect(f.p.inv.seeds??0).toBe(0);expect(plots.every(pl=>pl.state==='growing')).toBe(true);
 finishPrerequisite(f.w,f.p,`withdraw:${f.home.id}:seeds`);
 expect(f.p.inv.seeds).toBe(3);expect(f.home.store.items.seeds).toBe(stored-3);
 finishPrerequisite(f.w,f.p,'till:new');const more=f.w.plots.find(pl=>!plots.includes(pl))!;
 finishPrerequisite(f.w,f.p,`plant:${more.id}`);expect(more.state).toBe('growing');expect(conservationReport(f.w).ok).toBe(true);
});

it('offers no seed trip without a legitimate home, a known usable source, sufficient surplus or an actual capacity block',()=>{
 const homeUnknown=seedStorageScene();delBelief(homeUnknown.p,homeUnknown.home.id);
 const noSource=seedStorageScene();for(const b of Object.values(noSource.p.beliefs))if(['tree','rock','outcrop','clay_pit','ore_vein'].includes(b.kind))delBelief(noSource.p,b.id);
 const reserved=seedStorageScene();reserved.p.errand={kind:'request',item:'seeds',amount:reserved.p.inv.seeds!,targetId:0,expires:reserved.w.tick+1000,note:'staged seed duty'};
 const room=seedStorageScene();room.p.inv.seeds=3;
 for(const f of [homeUnknown,noSource,reserved,room])expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key.startsWith('seed_stash:'))).toBe(false);
});

it('keeps planting and promise quantities separate and counts only personally remembered plots',()=>{
 const f=seedStorageScene(),all=f.p.inv.seeds!;for(let i=0;i<5;i++)createPlot(f.w,20+i*2,20,f.p.hhId);
 expect(spareSeed(f.p)).toBe(all-3);for(const pl of f.w.plots)observe(f.w,f.p,pl);expect(spareSeed(f.p)).toBe(all-5);
 f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:f.p.id,item:'seeds',amount:6,delivered:2,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active'});
 expect(spareSeed(f.p)).toBe(all-9);
});

it('revalidates seed promised during travel even if the lab disables new storage offers',()=>{
 const f=seedStorageScene(),other=addPerson(f.s,'Neighbour',44,40,{age:30});pin(other);
 const before=f.p.inv.seeds!,{act,restore}=selectPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
 f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:other.id,item:'seeds',amount:before,siteId:0,made:f.w.tick,deadline:f.w.tick+2000,status:'active',destKind:'person',destId:other.id});
 setSeedStorage(false);
 try{for(let i=0;i<1000&&f.p.activity?.id===act.id;i++)stepWorld(f.w);}finally{restore();}
 expect(f.p.inv.seeds).toBe(before);expect(f.home.store.items.seeds??0).toBe(0);expect(f.p.lastResult?.detail).toContain('needed for planting or promises');expect(conservationReport(f.w).ok).toBe(true);
});

it('counts consumed crafting inputs, preserves the old check, and still refuses a genuinely overweight result',()=>{
 const f=seedStorageScene();f.p.inv={wood:1,stone:2,seeds:16};
 expect(invRoom(f.w,f.p,'hammer')).toBe(0);expect(craftedToolFits(f.w,f.p,'hammer')).toBe(true);
 const undo=parseIntervention('rich-no-craft-capacity').install!();expect(craftedToolFits(f.w,f.p,'hammer')).toBe(false);undo();
 f.w.settings.rulesVersion=57;expect(craftedToolFits(f.w,f.p,'hammer')).toBe(false);f.w.settings.rulesVersion=58;
 f.p.inv.seeds=100;expect(craftedToolFits(f.w,f.p,'hammer')).toBe(false);
});

it('retains undeposited goods when actual home capacity changes or ownership changes on the way',()=>{
 for(const change of ['full','owner'] as const){
  const f=seedStorageScene(),before=f.p.inv.seeds!,{act,restore}=selectPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
  if(change==='full'){const n=Math.floor((f.home.store.cap-weightOf(f.home.store.items))/0.25);f.home.store.items.seeds=n;ledgerCreate(f.w,'seeds',n,'staged competing storage');}
  else f.home.hhId=99999;
  try{for(let i=0;i<1000&&f.p.activity?.id===act.id;i++)stepWorld(f.w);}finally{restore();}
  expect(f.p.inv.seeds).toBe(before);expect(f.p.lastResult?.outcome).toBe('failed');expect(conservationReport(f.w).ok).toBe(true);
 }
});

it('interruption or death during travel leaves goods at their actual location',()=>{
 for(const death of [false,true]){
  const f=seedStorageScene(),before=f.p.inv.seeds!,{restore}=selectPrerequisite(f.w,f.p,`seed_stash:${f.home.id}`);
  try{if(death)killPerson(f.w,f.p,'staged interruption');else abortActivity(f.w,f.p,'staged interruption');}finally{restore();}
  expect(f.home.store.items.seeds??0).toBe(0);
  if(death)expect(f.w.piles.reduce((n,p)=>n+(p.items.seeds??0),0)).toBe(before);else expect(f.p.inv.seeds).toBe(before);
  expect(conservationReport(f.w).ok).toBe(true);
 }
});

it('the isolated removal leaves original options and historical behavior intact, with one stable storage option',()=>{
 const f=seedStorageScene(),keys=generateOptions(f.w,f.p,true,true).options.map(o=>o.key);
 expect(keys.filter(k=>k.startsWith('seed_stash:'))).toHaveLength(1);
 const undo=parseIntervention('rich-no-seed-storage').install!();
 expect(generateOptions(f.w,f.p,true,true).options.map(o=>o.key)).toEqual(keys.filter(k=>!k.startsWith('seed_stash:')));undo();
});
