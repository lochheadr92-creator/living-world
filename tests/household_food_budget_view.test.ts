import { expect,it } from 'vitest';
import { serializeWorld } from '../src/app/save';
import { stage,addPerson,building,done } from './helpers/kit';
import { householdFoodReserve,foodReserveLines } from '../src/sim/inspect_household_food';
import { addEarmark, opsOf } from '../src/sim/facilities';
import { DAY } from '../src/sim/constants';
import { hungerRate } from '../src/sim/metabolism';
import { stepWorld } from '../src/sim/world';
import { deserializeWorld } from '../src/app/save';

function scene() {
  const s=stage('reserve'), w=s.w;
  w.settings={...w.settings,rulesVersion:266,dynamics:'rich',harsh:false};
  const ada=addPerson(s,'Ada',30,30,{inv:{berries:2}});
  const child=addPerson(s,'Eli',30,30,{hh:ada.hhId,age:5,inv:{}});
  const other=addPerson(s,'Cal',34,34);
  return {s,w,ada,child,other,hh:w.households.find(h=>h.id===ada.hhId)!};
}

it('counts food once across packs, nearby shared stores and personal workshop orders',()=>{
  const {s,w,ada,child,other,hh}=scene();
  building(s,'storehouse',34,33,0,{berries:2});
  const bakery=building(s,'bakery',33,29,hh.id,{berries:5});
  for (const p of [ada,child,other]) addEarmark(w,bakery,{item:'berries',owner:p.id,kind:'out',n:1,reason:'ordered'});
  building(s,'hut',26,26,other.hhId,{berries:6});
  done(s);
  const r=householdFoodReserve(w,hh.id)!;
  expect(r.carried).toBe(24); expect(r.nearbyStores).toBe(72);
  expect(r.inaccessible).toBe(84);
  expect(r.dailyDemand).toBeCloseTo(hungerRate(w)*DAY*1.85);
  expect(r.foodDays).toBeCloseTo(96/r.dailyDemand);
  expect(r.oneDayShortfall).toBeCloseTo(r.dailyDemand-96);
});
it('shows distant food, a blocked cellar and promised pack food outside usable stock',()=>{
  const {s,w,ada,hh}=scene();
  const cellar=building(s,'cellar',32,30,hh.id,{grain:3});
  building(s,'hut',65,60,hh.id,{grain:2});
  ada.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:1,item:'berries',amount:1,
    siteId:0,made:0,deadline:999,status:'active'});
  done(s); w.solid[cellar.doorY*w.W+cellar.doorX]=1;
  const r=householdFoodReserve(w,hh.id)!;
  expect(r.blocked).toBe(66); expect(r.distant).toBe(44);
  expect(r.reserved).toBe(12); expect(r.usable).toBe(12);
});
it('counts a granary share once and excludes conditional emergency rations',()=>{
  const {s,w,ada,child,hh}=scene();
  const bins=building(s,'granary',32,31,0,{grain:15});
  opsOf(bins)!.shares[hh.id]={grain:3};
  ada.needs.hunger=5; child.needs.hunger=5;
  done(s);
  const r=householdFoodReserve(w,hh.id)!;
  expect(r.nearbyStores).toBe(66); expect(r.inaccessible).toBe(264);
  expect(r.usable).toBe(r.carried+66);
});
it('reports zero food and a full day of shortfall while missing demand stays unknown',()=>{
  const {s,w,ada,hh}=scene(); ada.inv={}; done(s);
  const r=householdFoodReserve(w,hh.id)!;
  expect(r.foodDays).toBe(0); expect(r.oneDayShortfall).toBe(r.dailyDemand);
  hh.members.push(123456);
  expect(householdFoodReserve(w,hh.id)?.foodDays).toBeNull();
  expect(householdFoodReserve(w,hh.id)?.missing).toBe(1);
  hh.members=[]; expect(householdFoodReserve(w,hh.id)?.oneDayShortfall).toBeNull();
  expect(householdFoodReserve(w,-1)).toBeNull();
});
it('inspection leaves the serialized state, RNG and subsequent replay identical',()=>{
  const {s,w,hh}=scene(); building(s,'hut',32,33,hh.id,{grain:2}); done(s);
  const before=serializeWorld(w),rng=JSON.stringify(w.rng),twin=deserializeWorld(before);
  expect(foodReserveLines(householdFoodReserve(w,hh.id)).join(' ')).toContain('food-days');
  expect(serializeWorld(w)).toBe(before); expect(JSON.stringify(w.rng)).toBe(rng);
  for(let i=0;i<60;i++){foodReserveLines(householdFoodReserve(w,hh.id));stepWorld(w);stepWorld(twin);}
  expect(serializeWorld(w)).toBe(serializeWorld(twin)); expect(w.rng).toEqual(twin.rng);
});
