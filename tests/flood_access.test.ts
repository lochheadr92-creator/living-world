import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {T} from '../src/sim/types';
import {beginFlood,floodAt,observeFlood,knownFloodCosts,updateFlood} from '../src/sim/flood';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import {floodScene,startFloodJourney} from './helpers/flood';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {createBuilding} from '../src/sim/buildings';
import {enterHome,leaveHome,doorPoint} from '../src/sim/habitation';
import {findPath} from '../src/sim/pathfinding';
import {newCart,hitch} from '../src/sim/carts';
import {snapshotInitial} from '../src/sim/economy';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {startActivity,newActivity} from '../src/sim/activities';
import {updateHardship} from '../src/sim/hardship';
import {makeHousePile} from '../src/sim/buildings';
import {describeEntity,describePerson} from '../src/sim/inspect';
import {floodViewAt} from '../src/sim/inspect_flood';
import {observeInhabitant} from '../src/agent/observe';
import {makeSource} from '../src/sim/sources';
import {waterScene,finishWaterOption} from './helpers/water';
const scene=floodScene;
it('retains a bounded physical footprint through flooded, recovering and clear phases',()=>{
 const {w}=scene();expect(beginFlood(w)).toBe(true);expect(floodAt(w,41,40)).toBe('flooded');
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);expect(conservationReport(w).ok).toBe(true);
 w.tick+=DAY/4;expect(floodAt(w,41,40)).toBe('recovering');w.tick+=DAY;updateFlood(w);expect(floodAt(w,41,40)).toBeUndefined();
});
it('does not give distant people current flood knowledge and corrects an old warning only by observation',()=>{
 const {w,p}=scene();p.x=10.5;beginFlood(w);expect(knownFloodCosts(w,p)).toBeUndefined();observeFlood(w,p);expect(p.bykind.flood??[]).toHaveLength(0);
 p.x=40.5;observeFlood(w,p);expect(knownFloodCosts(w,p)?.get(40*w.W+41)).toBe(0);
 w.tick+=DAY/4-1;observeFlood(w,p);w.tick=w.flood!.recoveryUntil;updateFlood(w);expect(knownFloodCosts(w,p)?.get(40*w.W+41)).toBe(0);observeFlood(w,p);expect(knownFloodCosts(w,p)?.has(40*w.W+41)??false).toBe(false);
});
it('discovers a flood after departure, takes a physical alternative and completes offered gathering',()=>{
 const f=scene();f.w.weather.storm=0;const a=startFloodJourney(f),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{
  for(let n=0;n<15;n++)stepWorld(f.w);expect(a.phase).toBe('travel');expect(a.path.length).toBeGreaterThan(0);
  f.w.weather.storm=1;expect(beginFlood(f.w)).toBe(true);const twin=deserializeWorld(serializeWorld(f.w));let detoured=false;
  for(let n=0;n<550&&f.p.activity?.id===a.id;n++){stepWorld(f.w);stepWorld(twin);if(Math.abs(f.p.y-40.5)>1){detoured=true;if(a.phase==='travel'&&a.data.floodObservedAt!==undefined){const qa=describePerson(f.w,f.p.id)!.qa;expect(qa.doing).toContain('revised route');expect(qa.stopping).not.toContain('Replanned');}}expect(floodAt(f.w,f.p.x,f.p.y)).not.toBe('flooded');}
  expect(detoured).toBe(true);expect(a.cycle).toBeGreaterThan(0);expect(f.p.inv.berries??0).toBeGreaterThan(0);expect(f.p.bykind.flood?.length).toBeGreaterThan(0);
  expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('keeps an indoor resident and their goods behind a newly flooded exit until physical recovery',()=>{
 const {w,p}=scene(),home=createBuilding(w,'hut',41,38,p.hhId),d=doorPoint(home);p.x=d.x;p.y=d.y;expect(enterHome(w,p,home)).toBeNull();
 beginFlood(w);expect(floodAt(w,d.x,d.y)).toBe('flooded');
 const before={...p.inv};expect(leaveHome(w,p)).toBe('home exit is flooded');expect(p.indoors).toBe(home.id);expect(p.inv).toEqual(before);
 w.tick=w.flood!.activeUntil;expect(leaveHome(w,p)).toBeNull();expect(p.indoors).toBeUndefined();expect(p.x).toBe(d.x);expect(p.y).toBe(d.y);
});
it('uses remembered warnings for routing while an uninformed route remains unchanged',()=>{
 const {w,p}=scene(),route=()=>findPath(w,p.x,p.y,48.5,40.5,{localCosts:knownFloodCosts(w,p)}),before=route();beginFlood(w);expect(route()).toEqual(before);
 p.x=40.5;observeFlood(w,p);p.x=36.5;expect(route()).not.toEqual(before);
});
it.each([false,true])('physically retreats from flood onset without losing a carried load (cart %s)',cart=>{
 const f=scene();f.p.x=40.5;f.p.inv.wood=1;const c=cart?newCart(f.w,f.p.x,f.p.y,f.p.hhId):undefined;if(c){c.load.stone=3;hitch(f.w,f.p,c);}snapshotInitial(f.w);
 beginFlood(f.w);expect(floodAt(f.w,f.p.x,f.p.y)).toBe('flooded');const a=startFloodJourney(f),release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 try{const start={x:f.p.x,y:f.p.y};for(let n=0;n<180;n++){const before={x:f.p.x,y:f.p.y};stepWorld(f.w);expect(Math.hypot(f.p.x-before.x,f.p.y-before.y)).toBeLessThan(0.2);}
  expect(Math.hypot(f.p.x-start.x,f.p.y-start.y)).toBeGreaterThan(1);expect(floodAt(f.w,f.p.x,f.p.y)).not.toBe('flooded');expect(f.p.inv.wood).toBe(1);if(c){expect(c.load.stone).toBe(3);expect(floodAt(f.w,c.x,c.y)).not.toBe('flooded');}expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('waits with a bound for a flooded destination, retains the saved activity and then releases it truthfully',()=>{
 const f=scene();beginFlood(f.w);f.p.x=39.5;observeFlood(f.w,f.p);f.p.cooldowns.pause=0;
 const a=newActivity(f.w,f.p,{kind:'wander',label:'Staged visit to shore',goal:'visit shore',tx:41.5,ty:40.5,spotX:41.5,spotY:40.5});startActivity(f.w,f.p,a);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  for(let n=0;n<30;n++)stepWorld(f.w);expect(a.data.floodWaitSince).toBeDefined();expect(f.p.pose).toBe('stand');const twin=deserializeWorld(serializeWorld(f.w));
  for(let n=0;n<190;n++){stepWorld(f.w);stepWorld(twin);}expect(f.p.activity).toBeNull();expect(a.blocked).toContain('after waiting');expect(serializeWorld(twin)).toBe(serializeWorld(f.w));expect(conservationReport(f.w).ok).toBe(true);
 }finally{release();}
});
it('takes onset goods only once and keeps inspection and personal AI observations pure',()=>{
 const {w,p}=scene(),pile=makeHousePile(w,41,40,{wood:3},'staged shore goods')!;snapshotInitial(w);updateHardship(w);
 expect(pile.items.wood??0).toBe(0);expect(w.ledger.spoiled.wood).toBe(3);updateHardship(w);expect(w.ledger.spoiled.wood).toBe(3);expect(conservationReport(w).ok).toBe(true);
 p.x=40.5;observeFlood(w,p);const raw=serializeWorld(w),ctx=generateOptions(w,p,true,true),view=describeEntity(w,floodViewAt(w,41,40));expect(view?.title).toBe('Flooded ground');
 const obs=observeInhabitant(w,p,ctx,rankOptions(ctx));expect(obs.remembered.floods?.some(b=>b.state==='flooded')).toBe(true);expect(JSON.stringify(obs.remembered.floods)).not.toContain('recoveryUntil');
 expect(observeInhabitant(w,p,ctx,rankOptions(ctx),{version:14}).remembered.floods).toBeUndefined();expect(serializeWorld(w)).toBe(raw);
});
it('interrupts actual shore work, releases the unfinished claim and retreats with completed goods',()=>{
 const {w,p}=scene();w.weather.storm=0;p.cooldowns.pause=0;const food=makeSource(w,'berry_bush',41,41,10);snapshotInitial(w);
 const a=newActivity(w,p,{kind:'gather',label:'Staged shore gathering',goal:'get food',targetId:food.id,targetType:'source',tx:41.5,ty:41.5,spotX:41.5,spotY:40.5,item:'berries',amount:3});startActivity(w,p,a);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{
  for(let n=0;n<500&&a.cycle<1;n++)stepWorld(w);expect(a.cycle).toBe(1);expect(p.inv.berries).toBe(1);expect(a.claims.length).toBeGreaterThan(0);
  w.weather.storm=1;expect(beginFlood(w)).toBe(true);stepWorld(w);expect(a.phase).toBe('travel');expect(a.claims).toHaveLength(0);expect(a.data.floodInterruptedWorkAt).toBeDefined();expect(p.inv.berries).toBe(1);
  for(let n=0;n<180;n++)stepWorld(w);expect(floodAt(w,p.x,p.y)).not.toBe('flooded');
  // The ordinary hunger reflex eats the retained berry after retreat; it was not lost by pausing.
  expect(p.inv.berries??0).toBe(0);expect(w.ledger.consumed.berries).toBe(1);expect(w.ledger.reasons['-eaten']).toBe(1);expect(conservationReport(w).ok).toBe(true);
 }finally{release();}
});
it('retains a real water location after a temporary flood wait fails',()=>{
 const {w,p,small}=waterScene(88);w.weather.storm=1;beginFlood(w);
 const b=Object.values(p.beliefs).filter(b=>b.kind==='water').sort((a,b)=>Math.hypot(a.x-42,a.y-40)-Math.hypot(b.x-42,b.y-40))[0];
 const a=finishWaterOption(w,p,'drink:'+b.id);expect(a.blocked).toContain('flood route');expect(a.cycle).toBe(0);expect(small.drawn).toBe(0);
 expect(p.beliefs[b.id]?.kind).toBe('water');expect(p.bykind.water).toContain(b.id);expect(conservationReport(w).ok).toBe(true);
});
it('rejects duplicate footprint tiles and does not flood an older world',()=>{
 const {w}=scene();beginFlood(w);w.flood!.tiles.push(w.flood!.tiles[0]);expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/flood/i);
 const older=scene().w;older.settings.rulesVersion=87;expect(beginFlood(older)).toBe(false);expect(older.flood).toBeUndefined();
});
