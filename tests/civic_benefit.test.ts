import { afterEach,expect,it } from 'vitest';
import { civicBenefitScene } from './helpers/civic_benefit';
import { setCivicBenefit,recordCivicBenefit,civicExperience } from '../src/sim/civic_benefit';
import { oppositionReason } from '../src/sim/civic_decision';
import { startActivity } from '../src/sim/activities';
import { stepWorld } from '../src/sim/world';
import { serializeWorld,deserializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { observeNow } from './helpers/inhabit';
import { describePerson } from '../src/sim/inspect';
import { parseIntervention } from '../scripts/lab/lab';
import { contestFixture } from './helpers/contest';
import { finishProject } from '../src/sim/townships';
import { createBuilding } from '../src/sim/buildings';
afterEach(()=>setCivicBenefit(true));
it('captures the building and accountable organiser only for an actual local completion witness',()=>{
 const {w,a,b,c,site,q}=contestFixture();w.settings.rulesVersion=42;
 q.council!.coordinatorId=a.id;
 q.participants.push({personId:b.id,requestId:0,since:0,status:'refused',reason:'fixture',materials:{},work:0});
 b.x=75;b.y=75;
 const built=createBuilding(w,'storehouse',site.x,site.y,0);finishProject(w,site,built,'finished');
 expect(a.civicOutcomes!.at(-1)).toMatchObject({buildingId:built.id,organiserId:a.id});
 expect(b.civicOutcomes).toBeUndefined();expect(c.civicOutcomes).toBeUndefined();
 q.council!.coordinatorId=c.id;recordCivicBenefit(w,a,built,'stone',1);
 expect(a.civicOutcomes!.at(-1)!.organiserId).toBe(a.id);
});
it('actual offered withdrawal changes a subsequent offered civic conversation, with only this link removed as control',()=>{
 for(const enabled of [false,true]){
  setCivicBenefit(enabled);const f=civicBenefitScene(),{w,a,b,q,store}=f;
  expect(oppositionReason(w,b,a,q)).toContain('prefers');expect(b.civicOutcomes![0].benefit).toBeUndefined();
  f.collect();expect(b.inv.stone).toBeGreaterThan(0);expect(store.store.items.stone).toBeLessThan(4);
  expect(!!b.civicOutcomes![0].benefit).toBe(enabled);
  expect(oppositionReason(w,b,a,q)==='').toBe(enabled);
  const o=f.recruit();expect(o?.make).toBeDefined();a.cooldowns.pause=0;b.cooldowns.pause=1e12;startActivity(w,a,o!.make!()!);
  for(let i=0;i<500;i++){stepWorld(w);if(w.requests.some(r=>r.from===a.id&&r.to===b.id&&r.status!=='pending')&&!a.convId)break;}
  expect(q.participants.find(m=>m.personId===b.id)!.supports).toBe(enabled?a.id:f.c.id);
  expect(conservationReport(w).ok).toBe(true);
 }
});
it('does not invent attribution or credit an empty or private withdrawal; repeated benefit is bounded',()=>{
 for(const kind of ['unknown','empty','private','known'] as const){
  const {w,b,a,store}=civicBenefitScene();
  if(kind==='unknown')delete b.civicOutcomes![0].buildingId;
  if(kind==='private')store.hhId=b.hhId;
  recordCivicBenefit(w,b,store,'stone',kind==='empty'?0:1);
  expect(!!b.civicOutcomes![0].benefit).toBe(kind==='known');
  const before=serializeWorld(w);recordCivicBenefit(w,b,store,'stone',kind==='empty'?0:1);expect(serializeWorld(w)).toBe(before);
  expect(civicExperience(b,a.id,w)).toBe(kind==='known'?0.08:0.04);
 }
});
it('preserves observer purity, full save continuation, legacy behavior and ablation restore',()=>{
 const f=civicBenefitScene();f.collect();const saved=serializeWorld(f.w);
 for(let i=0;i<4;i++){observeNow(f.w,f.b);describePerson(f.w,f.b.id);f.recruit();}
 expect(serializeWorld(f.w)).toBe(saved);
 const copy=deserializeWorld(saved);for(let i=0;i<150;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 const old=civicBenefitScene(41);old.collect();expect(old.b.civicOutcomes![0].benefit).toBeUndefined();
 const restore=parseIntervention('rich-no-civic-benefit').install!();expect(civicExperience(f.b,f.a.id,f.w)).toBe(.04);restore();expect(civicExperience(f.b,f.a.id,f.w)).toBe(.08);
});
