import {afterEach,expect,it} from 'vitest';
import {localDemandScene} from './helpers/local_demand';
import {setLocalDemand,hearDemand,repeatedDemand,pruneDemand,DEMAND_WINDOW,DEMAND_LIMIT} from '../src/sim/local_demand';
import {reviewTrade} from '../src/sim/trade';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld,hashWorld} from '../src/sim/world';
import {startActivity} from '../src/sim/activities';
import {conservationReport} from '../src/sim/economy';
import {observeNow} from './helpers/inhabit';
import {parseIntervention} from '../scripts/lab/lab';
afterEach(()=>setLocalDemand(true));
it('hears two actual offered requests, adopts feasible carpentry, and executes ordinary plank work',()=>{
 const f=localDemandScene(),{w,a,b,c,yard}=f;
 f.talk(a);expect(b.heardDemand).toHaveLength(1);expect(repeatedDemand(w,b).size).toBe(0);
 f.talk(c);expect(b.heardDemand).toHaveLength(2);expect(repeatedDemand(w,b).get('carpentry')?.people).toBe(2);
 f.release();reviewTrade(generateOptions(w,b,true));expect(b.trade?.key).toBe('carpentry');expect(b.trade?.why).toContain('2 people asked me for planks');
 const o=rankOptions(generateOptions(w,b,true,true)).find(o=>o.label==='Hewing planks');expect(o?.make).toBeDefined();startActivity(w,b,o!.make!()!);
 for(let i=0;i<1000&&(yard.ops?.produced.planks??0)<1;i++)stepWorld(w);
 expect(yard.ops!.produced.planks).toBeGreaterThan(0);expect(conservationReport(w).ok).toBe(true);
});
it('deduplicates a request, requires distinct people, ignores remote and ended requests, and expires bounded memory',()=>{
 const f=localDemandScene(),{w,a,b,c}=f;f.talk(a);const first=w.requests.find(r=>r.from===a.id)!;
 const pending={...first,status:'pending' as const,expires:w.tick+1000};
 const before=serializeWorld(w);hearDemand(w,b,a,pending);expect(serializeWorld(w)).toBe(before);
 hearDemand(w,b,a,{...pending,id:w.nextId++});expect(repeatedDemand(w,b).size).toBe(0);
 c.x=70;hearDemand(w,b,c,{...pending,id:w.nextId++,from:c.id});expect(repeatedDemand(w,b).size).toBe(0);
 const count=b.heardDemand!.length;hearDemand(w,b,a,{...pending,id:w.nextId++,status:'cancelled'});expect(b.heardDemand!.length).toBe(count);
 for(let i=0;i<20;i++)hearDemand(w,b,a,{...pending,id:w.nextId++});expect(b.heardDemand!.length).toBe(DEMAND_LIMIT);
 w.tick+=DEMAND_WINDOW;expect(repeatedDemand(w,b).size).toBe(0);pruneDemand(w,b);expect(b.heardDemand).toBeUndefined();
});
it('does not learn from world requests alone or select infeasible work, preserves needs and legacy rules',()=>{
 for(const enabled of [false,true]){setLocalDemand(enabled);const f=localDemandScene();f.talk(f.a);f.talk(f.c);f.release();const ctx=generateOptions(f.w,f.b,true);
  if(enabled)ctx.options=ctx.options.filter(o=>o.kind!=='operate');reviewTrade(ctx);expect(f.b.trade).toBeNull();}
 const old=localDemandScene(42);old.talk(old.a);old.talk(old.c);old.release();reviewTrade(generateOptions(old.w,old.b,true));expect(old.b.heardDemand).toBeUndefined();expect(old.b.trade).toBeNull();
});
it('saves and hashes personal demand, preserves observers and has an isolated reversible ablation',()=>{
 const f=localDemandScene();f.talk(f.a);f.talk(f.c);const saved=serializeWorld(f.w),hash=hashWorld(f.w);
 for(let i=0;i<4;i++){observeNow(f.w,f.b);repeatedDemand(f.w,f.b);}expect(serializeWorld(f.w)).toBe(saved);
 const copy=deserializeWorld(saved);for(let i=0;i<100;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 const restore=parseIntervention('rich-no-local-demand').install!();expect(repeatedDemand(f.w,f.b).size).toBe(0);restore();expect(repeatedDemand(f.w,f.b).size).toBe(1);
 const changed=deserializeWorld(saved);changed.persons.find(p=>p.id===f.b.id)!.heardDemand!.pop();expect(hashWorld(changed)).not.toBe(hash);
});
