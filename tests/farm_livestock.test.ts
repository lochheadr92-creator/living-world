import {wildPlenty,setGrainBoost} from '../src/sim/plenty';
import {createPlot,updatePlots} from '../src/sim/farming';
import {setHerdValue} from '../src/sim/herd_value';
import {makeSource} from '../src/sim/sources';
import {expect,it} from 'vitest';
import {stage,addPerson,building,done,learn} from './helpers/kit';
import {makeFarmAnimal,updateSheep} from '../src/sim/livestock';
import {FARM_SPECIES} from '../src/sim/farm_species';
import {generateOptions} from '../src/sim/decision';
import {startActivity,stepActivity} from '../src/sim/activities';
import {hashWorld,stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,pickFood} from '../src/sim/economy';
import {currentWorldSettings} from '../src/sim/profiles';
import {createWorld} from '../src/sim/factory';
import {clothingWarmth} from '../src/sim/clothing';
import {makeCarcass} from '../src/sim/carcass';
import {DAY} from '../src/sim/constants';
import type {FarmSpecies,Person,World} from '../src/sim/types';

function job(w:World,p:Person,key:string){
  const opts=generateOptions(w,p,true,true).options;
  const o=opts.find(o=>o.key===key);
  expect(o,key).toBeDefined();
  const activity=o!.make!();
  expect(activity,key).toBeTruthy();
  startActivity(w,p,activity!);
  for(let i=0;i<1500&&p.activity;i++){w.tick++;stepActivity(w,p);}
  expect(p.activity).toBeNull();
}
function scene(){
  const s=stage('farm-contract');
  s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:260};
  return s;
}
it.each(Object.keys(FARM_SPECIES) as FarmSpecies[])('breeds housed %s through its own fed cycle and resumes from save',species=>{
  const s=scene(),w=s.w;
  w.tick=6*DAY;
  const p=addPerson(s,'Ada',40.5,40.5,{hunger:90,thirst:90,energy:90});
  const stable=building(s,species==='chicken'?'chicken_cage':'barn',40,38,p.hhId,{grain:20,hay:20,water:24});
  const mother=makeFarmAnimal(w,40.5,40.5,species,'f'),father=makeFarmAnimal(w,40.5,40.5,species,'m');
  for(const a of [mother,father])Object.assign(a.sheep!,{hhId:p.hhId,food:44,water:2,tether:{x:a.x,y:a.y,condition:100}});
  if(species==='chicken')mother.sheep!.produceWork=3*DAY;
  done(s);learn(w,p,stable,mother,father);
  job(w,p,'sheep:house:'+mother.id);job(w,p,'sheep:house:'+father.id);
  expect(mother.sheep!.housing).toBe(stable.id);
  learn(w,p,mother,father);job(w,p,'sheep:mate:'+mother.id);expect(mother.sheep!.pregnancy).toBeTruthy();
  const advance=(world:World,n:number)=>{
    const a=world.animals.find(a=>a.id===mother.id)!;
    for(let i=0;i<n;i++){world.tick++;updateSheep(world,a);}
  };
  advance(w,120);
  const restored=deserializeWorld(serializeWorld(w,5));
  const ticks=FARM_SPECIES[species].gestation-120;
  advance(w,ticks);advance(restored,ticks);
  expect(hashWorld(w)).toBe(hashWorld(restored));
  const young=w.animals.filter(a=>a.sheep?.parents.includes(mother.id));
  expect(young.length).toBe(FARM_SPECIES[species].litter);
  expect(young.every(a=>a.type===species&&a.sheep?.housing===stable.id)).toBe(true);
  if(species==='goat'||species==='cow'||species==='sheep'){
    advance(w,DAY);learn(w,p,mother);job(w,p,'sheep:milk:'+mother.id);
    expect(p.inv.milk).toBe(1);
    advance(w,DAY);learn(w,p,mother);job(w,p,'sheep:milk:'+mother.id);
    job(w,p,'process_cheese:'+stable.id);expect(p.inv.cheese).toBe(1);expect(p.inv.milk??0).toBe(0);
  }
  if(species==='chicken'){
    advance(w,DAY);learn(w,p,mother);job(w,p,'sheep:egg:'+mother.id);expect(p.inv.egg).toBe(1);
  }
  expect(conservationReport(w).ok).toBe(true);
});
it('makes usable leather clothing through paid station work',()=>{
  const s=scene(),w=s.w,p=addPerson(s,'Ada',40.5,40.5,{inv:{hide:5,water:5}});
  const barn=building(s,'barn',40,38,p.hhId);done(s);learn(w,p,barn);
  for(let i=0;i<5;i++)job(w,p,'process_leather:'+barn.id);
  for(const op of ['gloves','shoes','coat']){
    job(w,p,'process_'+op+':'+barn.id);
    const tool=w.tools.find(t=>t.kind===(op==='coat'?'garment':op))!;
    job(w,p,'dress:'+tool.id);
  }
  expect(clothingWarmth(w,p)).toBe(11);
  expect(conservationReport(w).ok).toBe(true);
  expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
it('makes one pig carcass, recovers pork and smokes bacon',()=>{
  const s=scene(),w=s.w,p=addPerson(s,'Ada',40.5,40.5,{hunger:30,inv:{wood:1}});
  const fire=building(s,'fire',40,39);fire.fuel=100;
  const pig=makeFarmAnimal(w,40.5,40.5,'pig','m');done(s);
  const body=makeCarcass(w,pig,p)!;expect(body.carcass!.initial.meat).toBe(7);expect(makeCarcass(w,pig,p)).toBeNull();
  learn(w,p,body,fire);
  const option=generateOptions(w,p,true,true).options.find(o=>o.kind==='butcher'&&o.make?.()?.data.part==='meat');
  expect(option).toBeDefined();job(w,p,option!.key);
  expect(p.inv.pork).toBeGreaterThan(0);job(w,p,'process_bacon:'+fire.id);
  expect(pickFood({bacon:p.inv.bacon!},40,w)).toBe('bacon');expect(conservationReport(w).ok).toBe(true);
});
it('starts all five species in an ordinary rich world and replays after reload',()=>{
  const w=createWorld({...currentWorldSettings('normal','aspen'),rulesVersion:260});
  for(const species of Object.keys(FARM_SPECIES))expect(w.animals.filter(a=>a.type===species)).toHaveLength(2);
  for(let i=0;i<240;i++)stepWorld(w);
  const twin=deserializeWorld(serializeWorld(w,5));
  for(let i=0;i<120;i++){stepWorld(w);stepWorld(twin);}
  expect(hashWorld(twin)).toBe(hashWorld(w));expect(conservationReport(w).ok).toBe(true);
},30000);

it('values a first laying hen and a missing mate when a keeper knows feed and water',()=>{
 const s=scene(),w=s.w,p=addPerson(s,'Ada',40.5,40.5,{inv:{grain:3,water:1,wood:2,fibre:1}});
 const pen=building(s,'chicken_cage',40,38,p.hhId,{water:2,grain:2});
 const hen=makeFarmAnimal(w,41,40,'chicken','f'),rooster=makeFarmAnimal(w,41,40,'chicken','m');
 done(s);learn(w,p,pen,hen,rooster);
 const option=(id:number)=>generateOptions(w,p,true,true).options.find(o=>o.key==='sheep:house:'+id);
 let off=0;
 try{setHerdValue(false);off=option(hen.id)!.util;}finally{setHerdValue(true);}
 expect(option(hen.id)!.util).toBeGreaterThan(off);
 expect(option(hen.id)!.util).toBeGreaterThan(option(rooster.id)!.util);
 job(w,p,'sheep:house:'+hen.id);
 hen.sheep!.food=30;hen.sheep!.water=2;learn(w,p,hen);
 expect(option(rooster.id)!.parts.some(part=>part[0]==='completes a breeding pair')).toBe(true);
 p.needs.thirst=0;
 expect(option(rooster.id)).toBeUndefined();
 p.needs.thirst=90;pen.store.items.water=0;learn(w,p,pen);
 expect(option(rooster.id)).toBeUndefined();
});
it('cuts finite meadow hay and feeds it to a hungry goat',()=>{
 const s=scene(),w=s.w,p=addPerson(s,'Ada',41,40,{inv:{water:1}});
 const goat=makeFarmAnimal(w,41,40,'goat','f');
 Object.assign(goat.sheep!,{hhId:p.hhId,tether:{x:41,y:40,condition:100}});
 const meadow=makeSource(w,'hay_meadow',41,40,4);
 done(s);learn(w,p,goat,meadow);
 job(w,p,'hay:'+meadow.id);
 expect(p.inv.hay).toBeGreaterThan(0);
 expect(meadow.amount+(p.inv.hay??0)).toBe(4);
 job(w,p,'sheep:hay_feed:'+goat.id);
 expect(goat.sheep!.food).toBe(22);expect(conservationReport(w).ok).toBe(true);
});

it('increases wild-grain regrowth and plot grain at the same care and ripeness',()=>{
  const sample=(boost:boolean)=>{
    setGrainBoost(boost);
    const s=scene(),w=s.w;w.settings.rulesVersion=261;
    const patch=makeSource(w,'wild_grain',42,40);
    const plot=createPlot(w,43,40,0);plot.state='growing';plot.progress=1;
    updatePlots(w);
    return {capacity:patch.max,rate:wildPlenty(w,'wild_grain'),berries:wildPlenty(w,'berry_bush'),stock:plot.stock,seeds:plot.seedStock};
  };
  try{
    const off=sample(false),on=sample(true);
    expect(on).toEqual({...off,capacity:8,rate:off.rate*1.5,stock:off.stock+Math.floor(off.stock/2)});
    expect(off.capacity).toBe(5);
  }finally{setGrainBoost(true);}
});

it('turns spare grain into feed at a known coop and accounts for what a hen eats',()=>{
  const s=scene(),w=s.w;w.settings.rulesVersion=261;
  const p=addPerson(s,'Ada',40.5,40.5,{inv:{grain:3}});
  const coop=building(s,'chicken_cage',40,38,p.hhId,{water:2});
  const hen=makeFarmAnimal(w,coop.doorX,coop.doorY,'chicken','f');
  Object.assign(hen.sheep!,{hhId:p.hhId,housing:coop.id,food:15,tether:{x:hen.x,y:hen.y,condition:100}});
  done(s);learn(w,p,coop,hen);
  job(w,p,'mix_feed:'+coop.id);
  expect(coop.store.items.stock_feed).toBe(2);expect(p.inv.grain).toBe(2);
  expect(generateOptions(w,p,true,true).options.some(o=>o.key==='mix_feed:'+coop.id)).toBe(false);
  updateSheep(w,hen);
  expect(coop.store.items.stock_feed).toBe(1);expect(hen.sheep!.food).toBeCloseTo(26,1);
  expect(conservationReport(w).ok).toBe(true);
  expect(hashWorld(deserializeWorld(serializeWorld(w,5)))).toBe(hashWorld(w));
});

it('keeps meat on a naturally dead cow until discovered and cut, with a valid save',()=>{
 const s=scene(),w=s.w;w.settings.rulesVersion=262;
 const p=addPerson(s,'Ada',40.5,40.5,{inv:{berries:3},hunger:90,thirst:90,energy:90});
 const cow=makeFarmAnimal(w,41,40,'cow','f');
 Object.assign(cow.sheep!,{hhId:p.hhId,food:0,water:0});
 cow.health=.01;
 done(s);updateSheep(w,cow);
 const body=w.piles.find(b=>b.carcass?.animalId===cow.id)!;
 expect(body.carcass!.remaining.meat).toBe(12);
 const key='butcher:'+body.id+':meat';
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===key)).toBe(false);
 learn(w,p,body);
 const option=generateOptions(w,p,true,true).options.find(o=>o.key===key)!;
 expect(option.parts.some(([reason])=>reason.includes('recover household livestock'))).toBe(true);
 expect(hashWorld(deserializeWorld(serializeWorld(w,5)))).toBe(hashWorld(w));
 job(w,p,key);
 expect(p.inv.meat).toBeGreaterThan(0);
 expect(body.carcass!.remaining.meat+p.inv.meat!).toBe(12);
 expect(conservationReport(w).ok).toBe(true);
});
