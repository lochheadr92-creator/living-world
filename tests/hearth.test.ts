import {expect,it} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {createSite,completeSite,destroyBuilding} from '../src/sim/buildings';
import {doorPoint,enterHome} from '../src/sim/habitation';
import {describeEntity} from '../src/sim/inspect';
import {startActivity,stepActivity,newActivity,suspendActivity,resumeSuspended} from '../src/sim/activities';
import {stepWorld,hashWorld} from '../src/sim/world';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {hearthTick,HEARTH_WORK,HEARTH_COST,HEARTH_FUEL_MAX,hearthWarmth,hearthFuelBegin,hearthFuelWork} from '../src/sim/hearth';
import {weightOf} from '../src/sim/economy';
import {updateNeeds} from '../src/sim/needs';
import {observe} from '../src/sim/knowledge';

function fixture(){
  const s=stage('hearth-contract');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:123};
  const p=addPerson(s,'Ada',40.5,43.5,{hunger:90,thirst:90,energy:90});
  const b=building(s,'hut',40,40,p.hhId,{});p.inv={wood:2,stone:2};
  done(s);learn(s.w,p,b);s.w.weather.temp=-8;p.needs.warmth=35;
  return {...s,p,b};
}

it('constructs a paid fitting through the existing site and build activity without repairing the home for free',()=>{
  const {w,p,b}=fixture();b.condition=48;
  const o=generateOptions(w,p,true,true).options.find(o=>o.key===`hearth_layout:${b.id}`);
  expect(o).toBeDefined();startActivity(w,p,o!.make!()!);
  for(let n=0;n<300&&p.activity;n++){w.tick++;stepActivity(w,p);}
  const site=w.sites.find(s=>s.improvement==='hearth')!;
  expect(site).toBeDefined();expect(site.required).toEqual(HEARTH_COST);expect(site.workTotal).toBe(HEARTH_WORK);
  // Supply is a physical transfer in the construction tests; this fixture starts
  // at the separately-accounted paid build boundary.
  site.delivered={...HEARTH_COST};p.inv={wood:1};snapshotInitial(w);
  startActivity(w,p,newActivity(w,p,{kind:'build',label:'Build hearth',goal:'warm the home',targetId:site.id,tx:site.x,ty:site.y,spotX:p.x,spotY:p.y,here:true,utility:50,minCommit:1,maxTicks:600}));
  for(let n=0;n<600&&p.activity;n++){w.tick++;stepActivity(w,p);}
  expect(b.hearth).toEqual({fuel:0,heat:0});expect(b.condition).toBe(48);
  expect(w.sites).not.toContain(site);expect(w.ledger.consumed.wood).toBe(1);expect(w.ledger.consumed.stone).toBe(2);
  expect(conservationReport(w).ok).toBe(true);
});

it('takes fuel indoors with paid work, saves exact heat, and cools after the finite fuel ends',()=>{
  const {w,p,b}=fixture();b.hearth={fuel:0,heat:0};observe(w,p,b);
  const o=generateOptions(w,p,true,true).options.find(o=>o.key===`hearth_fuel:${b.id}`);
  expect(o).toBeDefined();startActivity(w,p,o!.make!()!);
  for(let n=0;n<300&&p.activity;n++){w.tick++;stepActivity(w,p);}
  expect(p.indoors).toBe(b.id);expect(b.hearth.fuel).toBeGreaterThan(0);expect(w.ledger.consumed.wood).toBeGreaterThan(0);
  for(let n=0;n<100;n++)hearthTick(w,b);
  const fuel=b.hearth.fuel,heat=b.hearth.heat;
  expect(heat).toBeGreaterThan(0);expect(hearthWarmth(w,p)).toBe(heat);
  const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);
  const cb=copy.buildings.find(x=>x.id===b.id)!;
  for(let n=0;n<2000;n++){hearthTick(w,b);hearthTick(copy,cb);}
  expect(b.hearth.fuel).toBe(0);expect(b.hearth.heat).toBeLessThan(heat);expect(fuel).toBeGreaterThan(0);
  expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
});

it('only warms actual occupants and a damaged home loses residual heat faster',()=>{
  const {w,p,b}=fixture();b.hearth={fuel:0,heat:15};Object.assign(p,doorPoint(b));expect(enterHome(w,p,b)).toBeNull();
  const copy=deserializeWorld(serializeWorld(w)),q=copy.persons.find(x=>x.id===p.id)!,cb=copy.buildings.find(x=>x.id===b.id)!;
  cb.hearth!.heat=0;updateNeeds(w,p);updateNeeds(copy,q);expect(p.needs.warmth).toBeGreaterThan(q.needs.warmth);
  delete p.indoors;expect(hearthWarmth(w,p)).toBe(0);
  cb.hearth!.heat=15;cb.condition=20;
  for(let n=0;n<100;n++){hearthTick(w,b);hearthTick(copy,cb);}
  expect(cb.hearth!.heat).toBeLessThan(b.hearth.heat);
});

it('old saves gain no hearth and malformed paid state is refused',()=>{
  const {w,b}=fixture();expect(deserializeWorld(serializeWorld(w)).buildings.find(x=>x.id===b.id)!.hearth).toBeUndefined();
  b.hearth={fuel:0,heat:0};
  for(const invalid of [{fuel:-1,heat:0},{fuel:0,heat:100},{fuel:0},{heat:0}]){
    b.hearth=invalid as typeof b.hearth;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/hearth/i);
  }
});

it('interrupted fuel work resumes after loading without consuming twice; observers are pure and heat is hashed',()=>{
  const {w,p,b}=fixture();b.hearth={fuel:0,heat:0};observe(w,p,b);
  startActivity(w,p,generateOptions(w,p,true,true).options.find(o=>o.key===`hearth_fuel:${b.id}`)!.make!()!);
  for(let n=0;n<300&&(!p.indoors||p.activity!.progress<5);n++){w.tick++;stepActivity(w,p);}
  expect(p.activity!.progress).toBeGreaterThanOrEqual(5);expect(w.ledger.consumed.wood??0).toBe(0);
  suspendActivity(w,p);const copy=deserializeWorld(serializeWorld(w)),q=copy.persons.find(x=>x.id===p.id)!;
  expect(resumeSuspended(w,p)).toBe(true);expect(resumeSuspended(copy,q)).toBe(true);
  for(let n=0;n<200;n++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
  const saved=serializeWorld(w),hash=hashWorld(w);describeEntity(w,b.id);generateOptions(w,p,true,true);
  expect(serializeWorld(w)).toBe(saved);b.hearth.heat+=0.01;expect(hashWorld(w)).not.toBe(hash);
});

it('cannot heat through walls, take fuel from another pack, or install after the home is lost',()=>{
  const s=fixture(),{w,p,b}=s;b.hearth={fuel:0,heat:0};observe(w,p,b);
  const o=generateOptions(w,p,true,true).options.find(o=>o.key===`hearth_fuel:${b.id}`)!;
  const q=addPerson(s,'Ben',35,35,{hh:p.hhId});q.inv={wood:1};p.inv={};snapshotInitial(w);
  startActivity(w,p,o.make!()!);for(let n=0;n<200&&p.activity;n++){w.tick++;stepActivity(w,p);}
  expect(q.inv.wood).toBe(1);expect(b.hearth.fuel).toBe(0);
  delete b.hearth;
  const site=createSite(w,b.type,b.x,b.y,p.hhId,p.id,{upgradeOf:b.id,improvement:'hearth'});
  destroyBuilding(w,b,'test loss');expect(w.byId.has(site.id)).toBe(false);expect(conservationReport(w).ok).toBe(true);
});

it('exterior sightings never refresh the remembered indoor fuel or heat',()=>{
  const {w,p,b}=fixture();b.hearth={fuel:300,heat:12};observe(w,p,b);
  expect(p.beliefs[b.id].hearth!.fuel).toBeNull();
  Object.assign(p,doorPoint(b));enterHome(w,p,b);observe(w,p,b);const old={...p.beliefs[b.id].hearth!};
  delete p.indoors;w.tick+=100;b.hearth.fuel=0;b.hearth.heat=3;observe(w,p,b);
  expect(p.beliefs[b.id].hearth).toEqual(old);
});

it('two tenders cannot fill the same last fuel slot, and full packs gain no items',()=>{
  const s=fixture(),{w,p,b}=s;
  const q=addPerson(s,'Ben',40.5,43.5,{hh:p.hhId,inv:{wood:1}});
  b.hearth={fuel:HEARTH_FUEL_MAX-380,heat:0};p.inv={wood:1,stone:3,grain:1};snapshotInitial(w);
  for(const actor of [p,q]){Object.assign(actor,doorPoint(b));expect(enterHome(w,actor,b)).toBeNull();}
  const action=(actor:typeof p)=>newActivity(w,actor,{kind:'fuel_fire',label:'Tending hearth',goal:'warm the home',targetId:b.id,here:true,data:{hearth:true},amount:1,utility:50,minCommit:1,maxTicks:100});
  const a=action(p),c=action(q);expect(hearthFuelBegin(w,p,a)).toBeUndefined();expect(hearthFuelBegin(w,q,c)).toBeUndefined();
  a.progress=c.progress=23;const before=weightOf(p.inv);expect(before).toBe(12);
  expect(hearthFuelWork(w,p,a)).toBe('done');expect(hearthFuelWork(w,q,c)).toBe('fail:someone already filled the hearth');
  expect(q.inv.wood).toBe(1);expect(weightOf(p.inv)).toBeLessThan(before);expect(b.hearth.fuel).toBe(HEARTH_FUEL_MAX);
  expect(w.ledger.consumed.wood).toBe(1);expect(conservationReport(w).ok).toBe(true);
});

it('finishing a fitting respects full home storage and preserves excess material on the ground',()=>{
  const {w,p,b}=fixture();b.store.items={stone:100};b.store.cap=weightOf(b.store.items);
  const site=createSite(w,b.type,b.x,b.y,p.hhId,p.id,{upgradeOf:b.id,improvement:'hearth'});
  site.delivered={wood:2};snapshotInitial(w);
  completeSite(w,site,p);
  expect(weightOf(b.store.items)).toBe(b.store.cap);expect(w.piles.reduce((n,x)=>n+(x.items.wood??0),0)).toBe(2);
  expect(conservationReport(w).ok).toBe(true);
});

it('a missing fitting discriminator cannot load as a discounted home rebuild; cost key order is immaterial',()=>{
  const {w,p,b}=fixture();
  const site=createSite(w,b.type,b.x,b.y,p.hhId,p.id,{upgradeOf:b.id,improvement:'hearth'});
  site.required={stone:2,wood:1};
  expect(()=>deserializeWorld(serializeWorld(w))).not.toThrow();
  delete site.improvement;
  expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/hearth or home upgrade/);
});
