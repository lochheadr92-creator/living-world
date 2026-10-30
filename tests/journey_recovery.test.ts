import {afterEach,expect,it} from 'vitest';
import {journeyRecoveryScene,failJourneySource} from './helpers/journey_recovery';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {recoveryOption,setJourneyRecovery} from '../src/sim/journey_recovery';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,ledgerConsume} from '../src/sim/economy';
import {observe} from '../src/sim/knowledge';
import {describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
afterEach(()=>setJourneyRecovery(true));
it('keeps prepared progress across a real drink and source failure, then uses a known same-purpose alternative for construction',()=>{
 const f=journeyRecoveryScene(),i=failJourneySource(f);expect(i.journey!.recovery!.failures).toHaveLength(1);expect(i.journey!.history.some(h=>h.kind==='drink')).toBe(true);expect(i.wants.water??0).toBe(0);expect(describePerson(f.w,f.p.id)!.plans.find(p=>p.id===i.id)?.missing).not.toContain('water');
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);expect(recoveryOption(ctx,i)?.targetId).toBe(f.alt.id);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));describePerson(f.w,f.p.id);expect(serializeWorld(f.w)).toBe(before);
 const twin=deserializeWorld(before);
 while(f.w.tick<4800){stepWorld(f.w);stepWorld(twin);}
 expect(i.journey!.recovery!.changes).toHaveLength(1);expect(i.journey!.target).toBe(f.alt.id);expect(i.status).toBe('done');expect(f.target.used.wood).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('does not substitute another material, purpose category or construction site',()=>{
 const f=journeyRecoveryScene(),i=failJourneySource(f),ctx=generateOptions(f.w,f.p,true,true),o=ctx.options.find(o=>o.targetId===f.alt.id&&o.kind==='gather')!;
 expect(o.purposeSite).toBe(f.target.id);
 for(const alter of ['material','tag','site']){const copy={...ctx,options:[{...o,scopeEstimate:{...o.scopeEstimate!}}]};if(alter==='material')copy.options[0].scopeEstimate.item='stone';if(alter==='tag')copy.options[0].tag='craft';if(alter==='site')copy.options[0].purposeSite=f.target.id+100;expect(recoveryOption(copy,i)).toBeUndefined();}
});
it('keeps a viable source without a personally experienced failure',()=>{
 const f=journeyRecoveryScene(),i=failJourneySource(f),ctx=generateOptions(f.w,f.p,true,true);i.journey!.recovery!.failures=[];expect(recoveryOption(ctx,i)).toBeUndefined();
});
it('preserves predecessor and lab-removed exact-source behavior',()=>{
 const old=journeyRecoveryScene(72),i=failJourneySource(old);expect(i.journey!.recovery).toBeUndefined();expect(recoveryOption(generateOptions(old.w,old.p,true,true),i)).toBeUndefined();
 const f=journeyRecoveryScene(),j=failJourneySource(f);setJourneyRecovery(false);expect(recoveryOption(generateOptions(f.w,f.p,true,true),j)).toBeUndefined();
});
it('abandons disproven sources and releases the private provisions while an unknown hidden source cannot rescue the plan',()=>{
 for(const hidden of [false,true]){
  const f=journeyRecoveryScene(73,!hidden);
  if(!hidden){ledgerConsume(f.w,'wood',f.alt.amount,'staged depleted alternative');f.alt.amount=0;observe(f.w,f.p,f.alt);}
  const i=failJourneySource(f);stepWorld(f.w);stepWorld(f.w);
  expect(i.status).toBe('dropped');expect(i.reason).toContain('no personally known source');expect(i.wants).toEqual({});expect(describePerson(f.w,f.p.id)!.plans.some(p=>p.detail.includes('no personally known source'))).toBe(true);if(hidden){expect(f.p.beliefs[f.alt.id]).toBeUndefined();expect(f.alt.amount).toBe(8);}expect(conservationReport(f.w).ok).toBe(true);
 }
});
it('bounds replacement count and prevents rapid replacement after a recent change',()=>{
 const f=journeyRecoveryScene(),i=failJourneySource(f),ctx=generateOptions(f.w,f.p,true,true),r=i.journey!.recovery!;
 r.changes=[{from:999,to:f.tree.id,tick:f.w.tick,reason:'staged preceding replacement'}];expect(recoveryOption(ctx,i)).toBeUndefined();r.changes[0].tick=f.w.tick-120;expect(recoveryOption(ctx,i)?.targetId).toBe(f.alt.id);
 r.changes.push({from:998,to:999,tick:f.w.tick-121,reason:'staged limit'});expect(recoveryOption(ctx,i)).toBeUndefined();
});
it.each(['too many replacements','future failure','predecessor metadata','same source'] as const)('rejects malformed recovery saves: %s',kind=>{
 const f=journeyRecoveryScene(),i=failJourneySource(f),r=i.journey!.recovery!;
 if(kind==='too many replacements')r.changes=Array.from({length:3},()=>({from:1,to:2,tick:0,reason:'staged'}));
 if(kind==='future failure')r.failures[0].tick=f.w.tick+1;
 if(kind==='predecessor metadata')f.w.settings.rulesVersion=72;
 if(kind==='same source')r.changes=[{from:1,to:1,tick:0,reason:'staged'}];
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/journey/);
});
