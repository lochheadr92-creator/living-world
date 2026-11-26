import { afterEach, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { generateOptions } from '../src/sim/decision';
import { addEarmark } from '../src/sim/facilities';
import { observe } from '../src/sim/knowledge';
import { hashWorld, stepWorld } from '../src/sim/world';
import { parseIntervention } from '../scripts/lab/lab';
import { setWorkshopErrand } from '../src/sim/workshop_errand';
import { addPerson, building, done, stage } from './helpers/kit';

afterEach(()=>setWorkshopErrand(true));
function crossBetweenBakeries(version=266) {
  const s=stage('input-workshop'), w=s.w;
  w.settings.dynamics='rich';
  w.settings.rulesVersion=version;
  w.tick=1000;
  const p=addPerson(s,'Hana',40.5,41.5,{age:32,hunger:100,thirst:100,energy:100,inv:{grain:4}});
  const oven=building(s,'bakery',40,40,0,{flour:4,wood:2});
  const source=building(s,'bakery',52,40,0,{water:4,wood:2});
  done(s);
  for (const b of [oven,source]) observe(w,p,b);
  const key='collect:'+source.id+':water';
  const offer=generateOptions(w,p,false,true).options.find(o=>o.key===key && o.goal.includes('baked bread'));
  expect(offer).toBeDefined();
  const walk=offer!.make!()!;
  walk.data.optKey=key;
  p.activity=walk;
  p.x=50.5;
  p.y=41.5;
  const stillOffered=()=>generateOptions(w,p,false,true).options.some(o=>o.key===key && o.goal===walk.goal);
  return {w,p,oven,source,key,walk,stillOffered};
}

it('keeps the original water errand after crossing toward the other oven, including after reload',()=>{
  const f=crossBetweenBakeries();
  expect(f.walk.data.inputWorkshop).toBe(f.oven.id);
  expect(f.stillOffered()).toBe(true);
  const loaded=deserializeWorld(serializeWorld(f.w)), person=loaded.persons.find(p=>p.id===f.p.id)!;
  expect(generateOptions(loaded,person,false,true).options.some(o=>o.key===f.key)).toBe(true);
  setWorkshopErrand(false);
  expect(f.stillOffered()).toBe(false);
});
it('reproduces the old missing key at rules 257',()=>{
  const f=crossBetweenBakeries(257);
  expect(f.walk.data.inputWorkshop).toBeUndefined();
  expect(f.stillOffered()).toBe(false);
});
it.each(['empty','earmarked','supplied','urgent'] as const)('rechecks the active errand when %s',cause=>{
  const f=crossBetweenBakeries();
  expect(f.stillOffered()).toBe(true);
  if(cause==='empty') f.source.store.items.water=0;
  if(cause==='earmarked') addEarmark(f.w,f.source,{kind:'out',item:'water',n:4,owner:f.p.id+100,reason:'other batch'});
  if(cause==='supplied') f.oven.store.items.water=4;
  if(cause==='urgent') f.p.needs.thirst=0;
  for(const b of [f.oven,f.source]) observe(f.w,f.p,b);
  expect(f.stillOffered()).toBe(false);
});

it('fingerprints the saved destination and resumes the same world',()=>{
  const f=crossBetweenBakeries(), saved=serializeWorld(f.w), before=hashWorld(f.w);
  f.walk.data.inputWorkshop=f.source.id;
  expect(hashWorld(f.w)).not.toBe(before);
  const first=deserializeWorld(saved);
  f.walk.data.inputWorkshop=f.oven.id;
  for(let tick=0;tick<120;tick++){ stepWorld(first); stepWorld(f.w); }
  expect(hashWorld(first)).toBe(hashWorld(f.w));
});
it('rejects an invalid recipe and accepts a saved errand with the lab switch off',()=>{
  const f=crossBetweenBakeries(), saved=serializeWorld(f.w);
  const restore=parseIntervention('rich-no-workshop-errand').install!();
  expect(()=>deserializeWorld(saved)).not.toThrow();
  restore();
  f.walk.data.inputRecipe='missing-recipe';
  expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow('Invalid workshop input errand');
});
