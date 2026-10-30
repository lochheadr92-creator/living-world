import {afterEach,expect,it} from 'vitest';
import {journeyRecoveryScene,failJourneySource} from './helpers/journey_recovery';
import {payNudge,recordPay} from '../src/sim/learning';
import {setSourceLearning} from '../src/sim/source_learning';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,ledgerCreate} from '../src/sim/economy';
import {observe,putBelief} from '../src/sim/knowledge';
import {stepWorld} from '../src/sim/world';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import type {Activity} from '../src/sim/types';
afterEach(()=>setSourceLearning(true));
const failed=()=>{const f=journeyRecoveryScene(74);failJourneySource(f);return f;};
it('records a real empty-source visit without penalising every never-tried wood source, with exact continuation and useful work',()=>{
 const f=failed(),pay=f.p.payoff.wood!;expect(pay.n).toBe(0);expect(pay.sources).toHaveLength(1);expect(pay.sources![0].empty?.count).toBe(1);expect(payNudge(f.w,f.p,'tree',f.tree.id)?.value).toBe(-2);expect(payNudge(f.w,f.p,'tree',f.alt.id)).toBeNull();
 const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));describePerson(f.w,f.p.id);expect(serializeWorld(f.w)).toBe(raw);const twin=deserializeWorld(raw);
 while(f.w.tick<4800){stepWorld(f.w);stepWorld(twin);}expect(f.target.used.wood).toBeGreaterThan(0);expect(f.p.payoff.wood!.sources!.some(s=>s.target===f.alt.id&&s.n>0)).toBe(true);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('only firsthand positive stock corrects the warning, and later hearsay cannot revive it',()=>{
 const f=failed(),entry=f.p.payoff.wood!.sources![0],original={...f.p.beliefs[f.tree.id]};
 putBelief(f.p,{...original,amount:4,seen:f.w.tick,origin:999,hops:1});expect(payNudge(f.w,f.p,'tree',f.tree.id)?.value).toBe(-2);expect(entry.empty?.corrected).toBeUndefined();
 f.tree.amount=4;ledgerCreate(f.w,'wood',4,'staged real restock');observe(f.w,f.p,f.tree);expect(entry.empty?.corrected).toBe(f.w.tick);expect(payNudge(f.w,f.p,'tree',f.tree.id)).toBeNull();
 putBelief(f.p,{...original,amount:0,seen:f.w.tick,origin:999,hops:1});expect(payNudge(f.w,f.p,'tree',f.tree.id)).toBeNull();expect(conservationReport(f.w).ok).toBe(true);
});
it('cannot learn hidden restocking or lend one person experience to an uninformed person',()=>{
 const f=failed(),before=serializeWorld(f.w);const stranger=structuredClone(f.p);stranger.id=999;stranger.payoff={};expect(payNudge(f.w,stranger,'tree',f.tree.id)).toBeNull();expect(serializeWorld(f.w)).toBe(before);
 f.tree.amount=4;ledgerCreate(f.w,'wood',4,'staged hidden stock');expect(payNudge(f.w,f.p,'tree',f.tree.id)?.value).toBe(-2);expect(f.p.payoff.wood!.sources![0].empty?.corrected).toBeUndefined();
});
it('does not label interruptions or positive-stock obstructions as an empty place',()=>{
 const f=journeyRecoveryScene(74);f.w.tick=10;
 const act=(outcome:string)=>{const a={id:f.w.nextId++,kind:'gather',targetId:f.tree.id,start:0,amount:4,cycle:0,data:{stype:'tree',eta:100}} as unknown as Activity;recordPay(f.w,f.p,a,outcome);return a;};
 act('interrupted');act('failed');expect(f.p.payoff.wood!.sources).toBeUndefined();
});
it('deduplicates a real ending across repeated callbacks',()=>{
 const f=failed(),pay=f.p.payoff.wood!,e=pay.sources![0],last=e.events[0];const a={id:last.activity,kind:'gather',targetId:f.tree.id,start:f.w.tick-last.took,amount:5,cycle:0,data:{stype:'tree',eta:last.expected}} as unknown as Activity;
 const before=serializeWorld(f.w);recordPay(f.w,f.p,a,'failed');expect(serializeWorld(f.w)).toBe(before);expect(e.events).toHaveLength(1);
});
it('keeps at most eight sources and four concrete events per source and caps combined influence',()=>{
 const f=journeyRecoveryScene(74);f.w.tick=10;
 for(let t=0;t<16;t++){const a={id:f.w.nextId++,kind:'gather',targetId:100+t,start:0,amount:2,cycle:2,data:{stype:'tree',eta:100}} as unknown as Activity;recordPay(f.w,f.p,a,'success');}
 expect(f.p.payoff.wood!.sources).toHaveLength(8);
 for(let t=0;t<8;t++){const a={id:f.w.nextId++,kind:'gather',targetId:100,start:0,amount:2,cycle:2,data:{stype:'tree',eta:100}} as unknown as Activity;recordPay(f.w,f.p,a,'success');}
 const e=f.p.payoff.wood!.sources!.find(s=>s.target===100)!;expect(e.events).toHaveLength(4);putBelief(f.p,{...f.p.beliefs[f.tree.id],id:100});expect(Math.abs(payNudge(f.w,f.p,'tree',100)!.value)).toBeLessThanOrEqual(6);
});
it('preserves previous rules and the isolated removal',()=>{
 const old=journeyRecoveryScene(73);failJourneySource(old);expect(old.p.payoff.wood).toEqual({n:1,r:0.1});
 setSourceLearning(false);const off=failed();expect(off.p.payoff.wood).toEqual({n:1,r:0.1});
});
it.each(['excess places','duplicate event','future correction','old rules'] as const)('rejects malformed experience: %s',kind=>{
 const f=failed(),pay=f.p.payoff.wood!,e=pay.sources![0];
 if(kind==='excess places')pay.sources=Array.from({length:9},(_,n)=>({...e,target:100+n}));
 if(kind==='duplicate event')e.events.push(e.events[0]);if(kind==='future correction')e.empty!.corrected=f.w.tick+1;if(kind==='old rules')f.w.settings.rulesVersion=73;
 expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/source experience/);
});
