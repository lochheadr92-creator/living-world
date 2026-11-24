import { afterEach, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { startActivity, stepActivity } from '../src/sim/activities';
import { DAY } from '../src/sim/constants';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport } from '../src/sim/economy';
import { activityOccupation, OUTPUTS, practiseOccupation, recordOccupationalWork, validateOccupations, type Occupation } from '../src/sim/occupation';
import { describeTrade, setTrades, tradeNudge } from '../src/sim/trade';
import type { Activity, ActivityKind } from '../src/sim/types';
import { hashWorld, stepWorld } from '../src/sim/world';
import { stage, addPerson, building, done, learn } from './helpers/kit';

function setup(age=30) {
  const s = stage('earned-trades');
  s.w.settings = {...s.w.settings, dynamics:'rich', rulesVersion:270};
  const p = addPerson(s,'Ada',40.5,26.5,{age,hunger:95,thirst:95,energy:95,inv:{wool:5}});
  const b = building(s,'storehouse',40,24);
  const foreign = building(s,'storehouse',44,24,999);
  const w = done(s);
  learn(w,p,b,foreign);
  return {w,p,b,foreign};
}
function job(kind: ActivityKind,optKey='',stype?:string) {
  return {kind,targetId:0,data:{optKey,stype},cycle:0,need:null} as unknown as Activity;
}
function earn(f: ReturnType<typeof setup>,role: Occupation) {
  practiseOccupation(f.w,f.p,role);
  practiseOccupation(f.w,f.p,role);
  f.w.tick += DAY;
  practiseOccupation(f.w,f.p,role);
}
function stores(f: ReturnType<typeof setup>) {
  return generateOptions(f.w,f.p,true,true).options.filter(o=>o.key.startsWith('occupation_store:'));
}
function finish(f: ReturnType<typeof setup>) {
  for(let i=0;i<1000 && f.p.activity;i++) { f.w.tick++; stepActivity(f.w,f.p); }
  expect(f.p.activity).toBeNull();
}
afterEach(()=>setTrades(true));

it('classifies productive activities by the job, source, recipe or conversation purpose',()=>{
  const f=setup();
  const cases: [Activity,Occupation][] = [
    [job('gather','','berry_bush'),'Gatherer'],[job('gather','','fish_spot'),'Fisher'],
    [job('hunt'),'Hunter'],[job('butcher'),'Butcher'],[job('animal_work','mix_feed:5'),'Herder'],
    [job('till'),'Farmer'],[job('tree_work'),'Forester'],[job('gather','','ore_vein'),'Miner'],
    [job('build'),'Builder'],[job('craft','axe'),'Toolsmith'],[job('operate','operate:0:weave_wool_blanket'),'Weaver'],
    [job('hang_skin'),'Leatherworker'],[job('host_meal'),'Cook'],[job('operate','operate:0:mill_flour_x2'),'Miller'],
    [job('craft'),'Craftworker'],[job('cart_haul'),'Hauler'],[job('fetch_water'),'WaterCarrier'],
    [job('care'),'Caregiver'],[job('socialize','socialize:1:teach_technique'),'Teacher'],
    [job('exchange_journey'),'Trader'],[job('explore'),'Scout'],[job('fuel_fire'),'Firekeeper'],
    [job('defend'),'Guard'],[job('repair'),'Repairer'],[job('socialize','socialize:1:mediate'),'Mediator'],
    [job('socialize','socialize:1:recruit'),'Organiser'],
  ];
  const covered=new Set(cases.map(([,role])=>role));
  for(const [buildingType,role] of [['bakery','Baker'],['granary','GranaryKeeper'],['timber_yard','Carpenter'],['kiln','Potter'],['brewery','Brewer']] as const) {
    const a=job('operate'); a.targetId=f.b.id;
    f.p.beliefs[f.b.id].btype=buildingType;
    expect(activityOccupation(f.p,a)).toBe(role);
    covered.add(role);
  }
  for(const [a,role] of cases) expect(activityOccupation(f.p,a)).toBe(role);
  expect(covered).toEqual(new Set(Object.keys(OUTPUTS)));
  for(const k of ['drink','eat','flee','sleep','alone','visit'] as const) expect(activityOccupation(f.p,job(k))).toBeUndefined();
});

it('uses paid experience over two days, excludes failed and personal attempts and tolerates occasional other work',()=>{
  const f=setup(),a=job('butcher');
  for(const outcome of ['failed','interrupted','partial']) recordOccupationalWork(f.w,f.p,a,outcome);
  const meal=job('gather'); meal.need='hunger';
  recordOccupationalWork(f.w,f.p,meal,'success');
  expect(f.p.occupation).toBeUndefined();
  a.cycle=1;
  for(let i=0;i<3;i++) recordOccupationalWork(f.w,f.p,a,'partial');
  expect(f.p.occupation?.title).toBeUndefined();
  f.w.tick+=DAY;
  recordOccupationalWork(f.w,f.p,a,'success');
  expect(describeTrade(f.p)).toContain('Butcher');
  earn(f,'Herder');
  expect(f.p.occupation?.title).toBe('Butcher');
  f.w.tick+=3*DAY;
  practiseOccupation(f.w,f.p,'Herder');
  expect(f.p.occupation?.title).toBe('Herder');
});

it('respects predecessor rules, childhood and the lab switch',()=>{
  const f=setup();
  f.w.settings.rulesVersion=269; earn(f,'Herder');
  expect(f.p.occupation).toBeUndefined();
  f.w.settings.rulesVersion=270;setTrades(false);earn(f,'Herder');
  expect(f.p.occupation).toBeUndefined();
  setTrades(true);
  const child=setup(5); earn(child,'Herder');
  expect(child.p.occupation).toBeUndefined();
});

it('delivers real surplus to an accessible store and never credits a second job for putting away the output',()=>{
  const f=setup();earn(f,'Herder');
  const offers=stores(f);
  expect(offers.map(o=>o.targetId)).toEqual([f.b.id]);
  const offer=offers[0];
  expect(tradeNudge(f.w,f.p,offer)).toBe(18);
  const a=offer.make!()!;
  startActivity(f.w,f.p,a);finish(f);
  expect(f.b.store.items.wool).toBe(4);
  expect(f.p.inv.wool).toBe(1);
  expect(f.p.occupation?.practice.Hauler).toBeUndefined();
  expect(conservationReport(f.w).ok).toBe(true);
});

it('rechecks access and newly promised units on arrival',()=>{
  for(const privatized of [true,false]) {
    const f=setup();earn(f,'Herder');
    const a=stores(f)[0].make!()!;
    if(privatized) f.b.hhId=999;
    else f.p.commitments.push({id:f.w.nextId++,requestId:0,kind:'deliver',to:999,item:'wool',amount:3,siteId:0,made:f.w.tick,deadline:f.w.tick+DAY,status:'active'});
    startActivity(f.w,f.p,a);finish(f);
    expect(f.b.store.items.wool??0).toBe(privatized?0:1);
    expect(conservationReport(f.w).ok).toBe(true);
  }
});

it('keeps urgent relief ahead of specialist work',()=>{
  const f=setup();earn(f,'Herder');f.p.needs.thirst=5;
  expect(stores(f)).toHaveLength(0);
  const ranked=()=>rankOptions(generateOptions(f.w,f.p,true,true)).map(o=>o.key);
  const before=ranked();setTrades(false);expect(ranked()).toEqual(before);
});

it('preserves earned work and an in-flight delivery across save/load and rejects unsupported titles',()=>{
  const f=setup();earn(f,'Herder');startActivity(f.w,f.p,stores(f)[0].make!()!);
  const copy=deserializeWorld(serializeWorld(f.w));
  expect(copy.persons.find(p=>p.id===f.p.id)?.occupation).toEqual(f.p.occupation);
  for(let i=0;i<60;i++){stepWorld(copy);stepWorld(f.w);}
  expect(hashWorld(copy)).toEqual(hashWorld(f.w));
  f.p.occupation!.title='Butcher';
  expect(()=>validateOccupations(f.w)).toThrow('Invalid earned title');
});
