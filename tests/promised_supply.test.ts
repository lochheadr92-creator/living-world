import {afterEach,expect,it} from 'vitest';
import {promisedSupplyScene,askWood} from './helpers/promised_supply';
import {continuityScene} from './helpers/continuity';
import {reviewIntentions} from '../src/sim/intent';
import {startActivity} from '../src/sim/activities';
import {setExternalController} from '../src/sim/external';
import {perceive} from '../src/sim/perception';
import {setPromisedSupply} from '../src/sim/promised_supply';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {shelterWanted} from '../src/sim/shelter';
import {observeInhabitant} from '../src/agent/observe';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {killPerson} from '../src/sim/lifecycle';
import {observe} from '../src/sim/knowledge';
import {conservationReport} from '../src/sim/economy';
import type {Ctx} from '../src/sim/optutil';
afterEach(()=>setPromisedSupply(true));
const woodFetch=(ctx:Ctx)=>ctx.options.some(o=>(o.kind==='gather'||o.kind==='withdraw')&&o.tag==='site'&&/wood/i.test(o.label));
const waiting=(ctx:Ctx)=>ctx.blocked.find(b=>/Ben promised 3 wood, expected by tick \d+/.test(b.blocked??''));
const expectation=(f:ReturnType<typeof promisedSupplyScene>)=>f.ada.socialMemory?.find(m=>m.expectation)?.expectation;
it('a personally heard promise covers the site: nothing is fetched for it meanwhile, the waiting is named, observation is pure',()=>{
 const f=promisedSupplyScene(),r=askWood(f);expect(r.status).toBe('promised');expect(expectation(f)).toMatchObject({item:'wood',amount:3,received:0});
 const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.ada,true,true);
 expect(woodFetch(ctx)).toBe(false);expect(waiting(ctx)).toBeDefined();expect(ctx.options.some(o=>o.kind==='gather'&&o.tag==='site'&&/stone/i.test(o.label))).toBe(true);
 const seen=observeInhabitant(f.w,f.ada,ctx,rankOptions(ctx));expect(JSON.stringify(seen.setAside)).toMatch(/Ben promised 3 wood/);describePerson(f.w,f.ada.id);
 expect(serializeWorld(f.w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);
});
it.each(['legacy','ablation'])('the same wood is fetched again while promised under %s',mode=>{
 if(mode==='ablation')setPromisedSupply(false);const f=promisedSupplyScene(mode==='legacy'?100:101);expect(askWood(f).status).toBe('promised');
 const ctx=generateOptions(f.w,f.ada,true,true);expect(woodFetch(ctx)).toBe(true);expect(waiting(ctx)).toBeUndefined();
});
it('the spoken hour passing, or a witnessed death of the helper, ends the coverage and the fetch is offered again',()=>{
 const f=promisedSupplyScene();askWood(f);const e=expectation(f)!;expect(e.deadline).toBeGreaterThan(f.w.tick);
 f.w.tick=e.deadline+1;const ctx=generateOptions(f.w,f.ada,true,true);expect(woodFetch(ctx)).toBe(true);expect(waiting(ctx)).toBeUndefined();
 const g=promisedSupplyScene();askWood(g);g.ben.x=g.ada.x+1;g.ben.y=g.ada.y;killPerson(g.w,g.ben,'declared staged loss');expect(g.ada.relations[g.ben.id].deathKnown).toBeDefined();
 const ctx2=generateOptions(g.w,g.ada,true,true);expect(woodFetch(ctx2)).toBe(true);expect(waiting(ctx2)).toBeUndefined();
});
it('the helper actually delivers while the asker does other work; nothing is fetched twice and the continuation is exact',()=>{
 const f=promisedSupplyScene();askWood(f);const woodTrips:number[]=[];f.w.hooks={onActivityStart:(p,a)=>{if(p.id===f.ada.id&&a.kind==='gather'&&a.item==='wood')woodTrips.push(f.w.tick);}};
 f.ada.cooldowns.pause=0;f.ben.cooldowns.pause=0;const twin=deserializeWorld(serializeWorld(f.w));
 for(let n=0;n<2500&&(f.st.delivered.wood??0)<3;n++){stepWorld(f.w);stepWorld(twin);}
 expect(f.st.delivered.wood).toBe(3);expect(woodTrips).toEqual([]);expect(f.w.requests.find(r=>r.from===f.ada.id&&r.item==='wood')?.status).toBe('fulfilled');
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
 observe(f.w,f.ada,f.st);expect(f.ada.beliefs[f.st.id]?.need?.wood??0).toBe(0);expect(woodFetch(generateOptions(f.w,f.ada,true,true))).toBe(false);
});
it('a plan to supply one’s own home site leaves the promised wood out and takes the other missing material',()=>{
 for(const version of [101,100]){const f=promisedSupplyScene(version);askWood(f);const want=shelterWanted(generateOptions(f.w,f.ada,true,true));expect(want,String(version)).not.toBeNull();expect(Object.keys(want!.wants)).toEqual([version===101?'stone':'wood']);}
 const g=promisedSupplyScene(101);g.st.required.stone=0;askWood(g);expect(shelterWanted(generateOptions(g.w,g.ada,true,true))).toBeNull();
});
it('the home-site step itself leaves promised wood out, names it, and honours a heard household material (rules 101 completes rules 100)',()=>{
 const f=promisedSupplyScene();askWood(f);f.ada.cooldowns.pause=0;const plan=reviewIntentions(generateOptions(f.w,f.ada,true));expect(plan?.kind).toBe('shelter');
 expect(plan!.step).toMatch(/get 4 stone for the hut/);expect(plan!.step).toMatch(/Ben promised 3 wood, expected by tick \d+/);expect(plan!.wants).toEqual({stone:4});
 // a plan already carried when the promise is heard re-aims to nothing and says what it is waiting on
 const g=promisedSupplyScene();g.st.required.stone=0;g.ada.cooldowns.pause=0;const only=reviewIntentions(generateOptions(g.w,g.ada,true));expect(only?.kind).toBe('shelter');expect(only!.wants).toEqual({wood:3});
 askWood(g);g.ada.cooldowns.pause=0;reviewIntentions(generateOptions(g.w,g.ada,true));expect(only!.status).toBe('active');expect(only!.step).toMatch(/waiting on Ben promised 3 wood/);expect(only!.wants).toEqual({});
 const h=continuityScene(101,true);h.a.cooldowns.pause=0;h.b.cooldowns.pause=0;perceive(h.w,h.a);perceive(h.w,h.b);h.b.nextThink=h.w.tick+600;
 const offered=generateOptions(h.w,h.a,true,true).options.find(o=>o.key.includes('share_work'))!;startActivity(h.w,h.a,offered.make!()!);
 const release=setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});try{for(let n=0;n<300&&!h.b.relations[h.a.id]?.workHeard?.length;n++)stepWorld(h.w);}finally{release();}
 const heard=reviewIntentions(generateOptions(h.w,h.b,true));expect(heard?.kind,JSON.stringify({plans:h.b.intentions,wanted:shelterWanted(generateOptions(h.w,h.b,true,true))})).toBe('shelter');expect(heard!.step).toMatch(/get \d+ stone/);expect(Object.keys(heard!.wants)).toEqual(['stone']);
});
