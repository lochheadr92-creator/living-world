import {afterEach,expect,it} from 'vitest';
import {householdSupplyScene,tellReserve} from './helpers/household_supply';
import {continuityScene} from './helpers/continuity';
import {setHouseholdSupply} from '../src/sim/household_supply';
import {generateOptions} from '../src/sim/decision';
import {reviewIntentions} from '../src/sim/intent';
import {shelterWanted} from '../src/sim/shelter';
import {relationshipHistory} from '../src/sim/history';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {hashWorld,stepWorld} from '../src/sim/world';
import {killPerson} from '../src/sim/lifecycle';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {perceive} from '../src/sim/perception';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import type {Person,World} from '../src/sim/types';
afterEach(()=>setHouseholdSupply(true));
const review=(w:World,p:Person)=>reviewIntentions(generateOptions(w,p,true));
const heard=(f:{ben:Person;ada:Person})=>f.ben.relations[f.ada.id].workHeard![0];
const deferLog=(p:Person)=>p.log.filter(l=>/leave that reserve to them/.test(l.text));
it('a personally heard reserve undertaking leaves the season reserve to its teller, with a visible reason and no promise',()=>{
 const f=householdSupplyScene(),plan=tellReserve(f);expect(plan.cue).toBe('season');expect(heard(f)).toMatchObject({kind:'stock',aboutId:f.home.id});
 const before=serializeWorld(f.w);describePerson(f.w,f.ben.id);relationshipHistory(f.w,f.ben);generateOptions(f.w,f.ben,true,true);expect(serializeWorld(f.w)).toBe(before);
 const hashBefore=hashWorld(f.w),taken=review(f.w,f.ben);expect(taken?.kind).not.toBe('stock');expect(f.ben.intentions.some(i=>i.kind==='stock')).toBe(false);
 expect(heard(f).deferredAt).toBe(f.w.tick);expect(deferLog(f.ben)).toHaveLength(1);expect(f.ben.commitments).toHaveLength(0);expect(hashWorld(f.w)).not.toBe(hashBefore);
 review(f.w,f.ben);expect(deferLog(f.ben)).toHaveLength(1);
 expect(relationshipHistory(f.w,f.ben).some(r=>/Left that reserve to them since tick/.test(r))).toBe(true);
 expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it.each(['legacy','ablation'])('both members still take on the same reserve under %s',mode=>{
 if(mode==='ablation')setHouseholdSupply(false);const f=householdSupplyScene(mode==='legacy'?99:100);tellReserve(f);
 expect(review(f.w,f.ben)?.kind).toBe('stock');expect(heard(f).deferredAt).toBeUndefined();if(mode==='legacy')expect(heard(f).item).toBeUndefined();expect(deferLog(f.ben)).toHaveLength(0);
});
it('hardship the listener can see for themselves is never deferred',()=>{
 const f=householdSupplyScene(100,{});const plan=tellReserve(f);expect(plan.cue).toBe('hardship');
 const taken=review(f.w,f.ben);expect(taken?.kind).toBe('stock');expect(taken?.cue).toBe('hardship');expect(heard(f).deferredAt).toBeUndefined();
});
it('a stale account restores the reserve to the listener',()=>{
 const f=householdSupplyScene();tellReserve(f);expect(review(f.w,f.ben)?.kind).not.toBe('stock');
 f.w.tick+=DAY+1;expect(review(f.w,f.ben)?.kind).toBe('stock');
});
it('a witnessed death of the teller restores the reserve to the listener',()=>{
 const f=householdSupplyScene();tellReserve(f);expect(review(f.w,f.ben)?.kind).not.toBe('stock');
 f.ben.x=f.ada.x+1;f.ben.y=f.ada.y;killPerson(f.w,f.ada,'declared staged loss');expect(f.ben.relations[f.ada.id].deathKnown).toBeDefined();
 expect(review(f.w,f.ben)?.kind).toBe('stock');
});
it('a heard shelter undertaking makes the listener fetch the other missing material; the only missing one is still fetched',()=>{
 for(const version of [100,99]){
  const f=continuityScene(version,true);expect(f.st.required.stone).toBeGreaterThan(0);
  f.a.cooldowns.pause=0;f.b.cooldowns.pause=0;perceive(f.w,f.a);perceive(f.w,f.b);f.b.nextThink=f.w.tick+600;
  const offered=generateOptions(f.w,f.a,true,true).options.find(o=>o.key.includes('share_work'))!;startActivity(f.w,f.a,offered.make!()!);
  const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300&&!f.b.relations[f.a.id]?.workHeard?.length;n++)stepWorld(f.w);}finally{release();}
  const k=f.b.relations[f.a.id].workHeard![0];expect(k.kind).toBe('shelter');
  const want=shelterWanted(generateOptions(f.w,f.b,true,true))!;expect(want).not.toBeNull();
  if(version===100){expect(k.item).toBe('wood');expect(Object.keys(want.wants)).toEqual(['stone']);}else{expect(k.item).toBeUndefined();expect(Object.keys(want.wants)).toEqual(['wood']);}
  expect(conservationReport(f.w).ok).toBe(true);
 }
 const g=continuityScene(100,true);g.st.required.stone=0;g.st.delivered.stone=0;
 g.a.cooldowns.pause=0;g.b.cooldowns.pause=0;perceive(g.w,g.a);perceive(g.w,g.b);g.b.nextThink=g.w.tick+600;
 const offered=generateOptions(g.w,g.a,true,true).options.find(o=>o.key.includes('share_work'))!;startActivity(g.w,g.a,offered.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300&&!g.b.relations[g.a.id]?.workHeard?.length;n++)stepWorld(g.w);}finally{release();}
 for(const p of [g.a,g.b]){delete p.beliefs[g.st.id];}for(const p of [g.a,g.b]){perceive(g.w,p);}
 expect(Object.keys(shelterWanted(generateOptions(g.w,g.b,true,true))?.wants??{})).toEqual(['wood']);
});
it('a deferral saves, reloads and is refused by a build that does not run rules 100',()=>{
 const f=householdSupplyScene();tellReserve(f);review(f.w,f.ben);expect(heard(f).deferredAt).toBeDefined();
 const text=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const o=JSON.parse(text) as {world:{settings:Record<string,unknown>}};o.world.settings.rulesVersion=99;expect(()=>deserializeWorld(JSON.stringify(o))).toThrow(/heard undertaking/);
});
