import {afterEach,expect,it} from 'vitest';
import {waterSearchScene as thirstyScene} from './helpers/water_search';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {perceive} from '../src/sim/perception';
import {setWaterSearch,waterSearchPurpose} from '../src/sim/water_search';
afterEach(()=>setWaterSearch(true));
it('a water-search choice retains its actual purpose and need when it becomes a journey',()=>{
 const f=thirstyScene(),raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true),o=ctx.options.find(o=>o.kind==='explore');
 expect(o?.goal).toBe('to find water');expect(serializeWorld(f.w)).toBe(raw);
 const a=o!.make!();expect(a?.goal).toBe('to find water');expect(a?.need).toBe('thirst');expect(a?.label).toBe('Searching for water');
 expect(conservationReport(f.w).ok).toBe(true);
});
it('critical thirst with no known drink permits searching after dark',()=>{
 const f=thirstyScene(true),ctx=generateOptions(f.w,f.p,true,true);expect(ctx.night).toBe(true);expect(ctx.criticals).toContain('thirst');
 expect(ctx.options.find(o=>o.kind==='explore')?.need).toBe('thirst');
 expect(ctx.options.find(o=>o.kind==='explore')?.parts.map(([reason])=>reason)).toContain('critical thirst after dark');
 expect(ctx.options.find(o=>o.kind==='explore')?.parts.map(([reason])=>reason)).not.toContain('daylight to spare');
});
it('noncritical thirst still keeps the ordinary night restriction',()=>{
 const f=thirstyScene(true,false),ctx=generateOptions(f.w,f.p,true,true);expect(ctx.night).toBe(true);expect(ctx.criticals).not.toContain('thirst');
 expect(ctx.options.some(o=>o.kind==='explore')).toBe(false);
});
it('old rules and isolated removal preserve the former night restriction',()=>{
 for(const old of [true,false]){setWaterSearch(old);const f=thirstyScene(true,true,old?109:110);expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.kind==='explore')).toBe(false);}
});
it('the search starts from the person’s own position without supplying a water location or changing knowledge',()=>{
 const f=thirstyScene(),ctx=generateOptions(f.w,f.p,true,true),raw=serializeWorld(f.w);
 expect(waterSearchPurpose(ctx,true)).toMatchObject({x:f.p.x,y:f.p.y,goal:'to find water'});
 expect(Object.values(f.p.beliefs).some(b=>b.kind==='water')).toBe(false);expect(serializeWorld(f.w)).toBe(raw);
});
it('personally observed water supplies a drinking choice and stops urgent water exploration',()=>{
 const f=thirstyScene(true);f.p.x=29.5;f.p.y=13.5;perceive(f.w,f.p);
 expect(Object.values(f.p.beliefs).some(b=>b.kind==='water')).toBe(true);
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.kind==='drink')).toBe(true);expect(ctx.options.some(o=>o.kind==='explore')).toBe(false);
});
it('autonomous search discovers real water and drinks across a saved journey',()=>{
 const f=thirstyScene(true);expect(Object.values(f.p.beliefs).some(b=>b.kind==='water')).toBe(false);
 stepWorld(f.w);expect(f.p.activity?.kind).toBe('explore');expect(f.p.activity?.need).toBe('thirst');
 const saved=serializeWorld(f.w),twin=deserializeWorld(saved);let drank=false;
 f.w.hooks={onActivityEnd:(p,a,result)=>{if(p.id===f.p.id&&a.kind==='drink'&&result==='success')drank=true;}};
 for(let n=0;n<600&&!drank;n++){stepWorld(f.w);stepWorld(twin);}delete f.w.hooks;
 expect(drank).toBe(true);expect(f.p.needs.thirst).toBeGreaterThan(60);expect(Object.values(f.p.beliefs).some(b=>b.kind==='water'&&b.seen>=1800)).toBe(true);
 expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
