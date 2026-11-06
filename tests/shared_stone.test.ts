// Rules 162: stone has somewhere to be kept and a way to get there (src/sim/shared_stone.ts). Every situation here is STAGED: it checks a rule,
// it is not an example of spontaneous behaviour; the ordinary-world evidence is review_evidence/stone-haul-20261106. Each check has the rules-161
// contrast so the older behaviour is shown to be kept.
import {afterEach,describe,expect,it} from 'vitest';
import {stage,addPerson,building,site,done,learn} from './helpers/kit';
import {natural,run} from './helpers/util';
import {generateOptions} from '../src/sim/decision';
import {startActivity,stepActivity} from '../src/sim/activities';
import {makeSource} from '../src/sim/sources';
import {siteConflict} from '../src/sim/act_build';
import {communalRoom} from '../src/sim/communal_stock';
import {rememberedMaterialStores} from '../src/sim/material_stock';
import {knownStoreHoldsStone,noStorehouseNear,setSharedStone} from '../src/sim/shared_stone';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {parseIntervention} from '../scripts/lab/lab';
import {CURRENT_RULES_VERSION,SUPPORTED_RULES_VERSIONS} from '../src/sim/rulesversion';
import type {Person,World} from '../src/sim/types';

afterEach(()=>setSharedStone(true));
const rules=(w:World,v:number)=>{w.settings={...w.settings,dynamics:'rich',rulesVersion:v};};
function finish(w:World,p:Person){for(let i=0;i<2400&&p.activity;i++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();}

// A stone-short household site, a public quarry yard holding cut stone, nothing else.
function yardScene(v:number,quarryHh=0){
 const s=stage('shared-stone-yard');rules(s.w,v);
 const ada=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});
 const yard=building(s,'quarry',44,24,quarryHh,{stone:6});
 const st=site(s,'hut',36,24,ada.hhId,ada.id,{wood:8});
 done(s);learn(s.w,ada,yard,st);
 return {s,w:s.w,ada,yard,st};
}
const collect=(w:World,p:Person,id:number)=>generateOptions(w,p,true,true).options.find(o=>o.kind==='withdraw'&&o.targetId===id&&o.yields==='stone');

describe('rules 162 is registered',()=>{
 it('is the current version and a supported one',()=>{expect(CURRENT_RULES_VERSION).toBe(162);expect(SUPPORTED_RULES_VERSIONS).toContain(162);});
});

describe('a quarry yard is a place to collect stone',()=>{
 it('offers a public yard to a person whose site lacks stone, and not at rules 161',()=>{
  const f=yardScene(162);const o=collect(f.w,f.ada,f.yard.id);expect(o).toBeTruthy();
  const old=yardScene(161);expect(collect(old.w,old.ada,old.yard.id)).toBeUndefined();
 });
 it('moves the stone physically, conserves goods and shortens the site\'s lack',()=>{
  const f=yardScene(162);snapshotInitial(f.w);const before=serializeWorld(f.w);
  const o=collect(f.w,f.ada,f.yard.id)!;expect(serializeWorld(f.w)).toBe(before);
  startActivity(f.w,f.ada,o.make!()!);finish(f.w,f.ada);
  expect(f.ada.inv.stone??0).toBeGreaterThan(0);expect(f.yard.store.items.stone).toBe(6-(f.ada.inv.stone??0));
  expect(conservationReport(f.w).ok).toBe(true);
 });
 it('opens a household\'s own yard to that household only',()=>{
  const own=yardScene(162);own.yard.hhId=own.ada.hhId;learn(own.w,own.ada,own.yard);expect(collect(own.w,own.ada,own.yard.id)).toBeTruthy();
  const other=yardScene(162,987);expect(collect(other.w,other.ada,other.yard.id)).toBeUndefined();
 });
 it('lists only a yard\'s stone, never other goods, and still checks the real yard at the door',()=>{
  const f=yardScene(162);expect(rememberedMaterialStores(f.w,f.ada,'stone').map(b=>b.id)).toEqual([f.yard.id]);
  expect(rememberedMaterialStores(f.w,f.ada,'wood')).toEqual([]);
  const a=collect(f.w,f.ada,f.yard.id)!.make!()!;f.yard.hhId=987;startActivity(f.w,f.ada,a);finish(f.w,f.ada);
  expect(f.ada.inv.stone??0).toBe(0);expect(f.yard.store.items.stone).toBe(6);
 });
});

// A hut stands, one household has a site open already, four sites are open, nobody is rich in food.
function townScene(v:number,withStore=false){
 const s=stage('shared-stone-town');rules(s.w,v);
 const ada=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});
 const ben=addPerson(s,'Ben',44.5,26.5,{hunger:95,thirst:95,energy:95});
 building(s,'hut',36,24,ada.hhId);
 for(const x of [26,29,32])site(s,'lean_to',x,40,ben.hhId,ben.id);
 site(s,'fire',46,40,ada.hhId,ada.id);
 const trees=[0,1,2].map(i=>makeSource(s.w,'tree',48+i,30,8)),rock=makeSource(s.w,'rock',50,33,6);
 const store=withStore?building(s,'storehouse',33,30,0):null;
 done(s);learn(s.w,ada,...trees,rock);
 return {s,w:s.w,ada,ben,store};
}
const offersStorehouse=(w:World,p:Person)=>generateOptions(w,p,true,true).options.some(o=>o.key==='plan_site:storehouse');

describe('the first storehouse',()=>{
 it('is offered despite a household site, the open-site cap and an empty larder, and not at rules 161',()=>{
  const f=townScene(162);expect(f.w.sites.length).toBeGreaterThanOrEqual(4);expect(offersStorehouse(f.w,f.ada)).toBe(true);
  const old=townScene(161);expect(offersStorehouse(old.w,old.ada)).toBe(false);
 });
 it('is not turned away by the basic-site cap when marked out, while a second one still is',()=>{
  const f=townScene(162);const at={x:33,y:30};
  expect(siteConflict(f.w,'storehouse',f.ada.hhId,0,0,at)).toBeNull();
  expect(siteConflict(townScene(161).w,'storehouse',1,0,0,at)).toMatch(/too many projects/);
  site(f.s,'storehouse',33,30,0,f.ada.id);expect(noStorehouseNear(f.w,33,30)).toBe(false);
  expect(siteConflict(f.w,'storehouse',f.ada.hhId,0,0,at)).toMatch(/already being built|too many/);
 });
 it('is not offered once any storehouse stands or is being built, or before any solid home',()=>{
  const f=townScene(162,true);expect(offersStorehouse(f.w,f.ada)).toBe(false);
  const bare=stage('shared-stone-bare');rules(bare.w,162);const p=addPerson(bare,'Cy',40.5,26.5,{hunger:95,thirst:95,energy:95});
  const trees=[0,1,2].map(i=>makeSource(bare.w,'tree',48+i,30,8)),rock=makeSource(bare.w,'rock',50,33,6);done(bare);learn(bare.w,p,...trees,rock);
  expect(offersStorehouse(bare.w,p)).toBe(false);
 });
 it('keeps personal hunger as a reason to wait, and other buildings behind the cap',()=>{
  const f=townScene(162);f.ada.needs.hunger=10;expect(offersStorehouse(f.w,f.ada)).toBe(false);
  f.ada.needs.hunger=95;const kinds=generateOptions(f.w,f.ada,true,true).options.filter(o=>o.kind==='plan_site').map(o=>o.key);
  expect(kinds.every(k=>k==='plan_site:storehouse')).toBe(true);
 });
});

describe('stone goes from the yard to the storehouse',()=>{
 function haulScene(v:number){
  const s=stage('shared-stone-haul');rules(s.w,v);
  const ada=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});
  const yard=building(s,'quarry',44,24,0,{stone:6});const store=building(s,'storehouse',36,24,0);
  done(s);learn(s.w,ada,yard,store);return {s,w:s.w,ada,yard,store};
 }
 it('offers the yard as the way to restock the store, and the store aims at 16',()=>{
  const f=haulScene(162);const o=collect(f.w,f.ada,f.yard.id);expect(o).toBeTruthy();expect(o!.tag).toBe('store');
  expect(communalRoom(f.w,f.store.id,'stone')).toBe(16);
  const old=haulScene(161);expect(collect(old.w,old.ada,old.yard.id)).toBeUndefined();expect(communalRoom(old.w,old.store.id,'stone')).toBe(8);
 });
 it('carries the stone over and stacks it, free for anyone to take afterwards',()=>{
  const f=haulScene(162);snapshotInitial(f.w);
  startActivity(f.w,f.ada,collect(f.w,f.ada,f.yard.id)!.make!()!);finish(f.w,f.ada);
  const held=f.ada.inv.stone??0;expect(held).toBeGreaterThan(1);
  const dep=generateOptions(f.w,f.ada,true,true).options.find(o=>o.key===`communal_stock:${f.store.id}`);expect(dep).toBeTruthy();
  startActivity(f.w,f.ada,dep!.make!()!);finish(f.w,f.ada);
  expect(f.store.store.items.stone).toBe(held-1);expect(f.ada.inv.stone).toBe(1);
  // a stranger's household can take it for nothing through the ordinary material path
  const cy=addPerson(f.s,'Cy',41.5,26.5,{hunger:95,thirst:95,energy:95});const st=site(f.s,'hut',30,36,cy.hhId,cy.id,{wood:8});learn(f.w,cy,f.store,st);snapshotInitial(f.w);
  const take=generateOptions(f.w,cy,true,true).options.find(o=>o.kind==='withdraw'&&o.targetId===f.store.id&&o.yields==='stone');expect(take).toBeTruthy();
  startActivity(f.w,cy,take!.make!()!);finish(f.w,cy);expect(cy.inv.stone??0).toBe(held-1);
  expect(conservationReport(f.w).ok).toBe(true);
 });
 it('does not shuttle stone out of the store it is restocking',()=>{
  const f=haulScene(162);f.yard.store.items={};f.store.store.items.stone=2;learn(f.w,f.ada,f.store,f.yard);
  const opts=generateOptions(f.w,f.ada,true,true).options;
  expect(opts.some(o=>o.kind==='withdraw'&&o.targetId===f.store.id&&o.tag==='store')).toBe(false);
 });
});

describe('a store that holds the stone makes stone buildings more attractive',()=>{
 // a household in a lean-to with trees and a rock to hand: the situation in which a hut is considered
 function hutUtil(v:number,seeStore:boolean){
  const s=stage('shared-stone-hut');rules(s.w,v);
  const ada=addPerson(s,'Ada',40.5,26.5,{hunger:95,thirst:95,energy:95});
  building(s,'lean_to',36,24,ada.hhId);
  const trees=[0,1,2].map(i=>makeSource(s.w,'tree',48+i,30,8)),rock=makeSource(s.w,'rock',50,33,6);
  done(s);learn(s.w,ada,...trees,rock);s.w.tick=2000;ada.inv.grain=12;
  const store=building(s,'storehouse',33,30,0,{stone:8}); // built after everyone learned the land, so only the person who is shown it knows it
  snapshotInitial(s.w);
  if(seeStore)learn(s.w,ada,store);
  return generateOptions(s.w,ada,true,true).options.find(o=>o.key==='plan_site:hut')?.util;
 }
 it('raises the hut\'s pull only when the store is known to hold the stone, and only from rules 162',()=>{
  const with162=hutUtil(162,true),without162=hutUtil(162,false);
  expect(with162).toBeDefined();expect(without162).toBeDefined();expect(with162!).toBeGreaterThan(without162!);
  const a=hutUtil(161,true),b=hutUtil(161,false);expect(a).toBe(b);
 });
 it('reads only a belief, a fresh one, of a public store',()=>{
  const f=townScene(162,true);f.store!.store.items.stone=9;const ctx=generateOptions(f.w,f.ada,true,true);
  expect(knownStoreHoldsStone(ctx,4)).toBe(false);
  learn(f.w,f.ada,f.store!);expect(knownStoreHoldsStone(generateOptions(f.w,f.ada,true,true),4)).toBe(true);
  expect(knownStoreHoldsStone(generateOptions(f.w,f.ada,true,true),10)).toBe(false);
  f.store!.hhId=999;learn(f.w,f.ada,f.store!);expect(knownStoreHoldsStone(generateOptions(f.w,f.ada,true,true),4)).toBe(false);
 });
});

describe('lab removal switches',()=>{
 it('each part can be removed alone and the whole together, and is restored',()=>{
  const f=yardScene(162);expect(collect(f.w,f.ada,f.yard.id)).toBeTruthy();
  const off=parseIntervention('rich-no-quarry-stone').install!();expect(collect(f.w,f.ada,f.yard.id)).toBeUndefined();off?.();expect(collect(f.w,f.ada,f.yard.id)).toBeTruthy();
  const t=townScene(162);expect(offersStorehouse(t.w,t.ada)).toBe(true);
  const off2=parseIntervention('rich-no-first-storehouse').install!();expect(offersStorehouse(t.w,t.ada)).toBe(false);off2?.();expect(offersStorehouse(t.w,t.ada)).toBe(true);
  const h=yardScene(162),t2=townScene(162);const off3=parseIntervention('rich-no-shared-stone').install!();
  expect(collect(h.w,h.ada,h.yard.id)).toBeUndefined();expect(offersStorehouse(t2.w,t2.ada)).toBe(false);off3?.();
  expect(collect(h.w,h.ada,h.yard.id)).toBeTruthy();expect(offersStorehouse(t2.w,t2.ada)).toBe(true);
 });
});

describe('an ordinary world',()=>{
 it('continues exactly through save and load, and conserves goods',()=>{
  const w=natural('meadow');run(w,1500);const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300;i++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
 },300_000);
});
