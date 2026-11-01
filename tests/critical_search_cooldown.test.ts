import {afterEach,expect,it} from 'vitest';
import {setCriticalSearch} from '../src/sim/water_search';
afterEach(()=>setCriticalSearch(true));
import {waterSearchScene} from './helpers/water_search';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it('E2: critical water search is offered during the ordinary exploration cooldown and starts without idle wandering',()=>{
 const {w,p}=waterSearchScene(true);p.lastExploreTick=w.tick-1;
 const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
 expect(ctx.criticals).toContain('thirst');expect(rankOptions(ctx)[0].need).toBe('thirst');
 expect(ctx.options.find(o=>o.kind==='explore')?.need).toBe('thirst');expect(serializeWorld(w)).toBe(before);
 const twin=deserializeWorld(before);stepWorld(w);stepWorld(twin);expect(p.activity?.kind).toBe('explore');
 expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(conservationReport(w).ok).toBe(true);
});
it.each(['old','removed','noncritical'] as const)('E2: %s keeps the normal cooldown',mode=>{
 const {w,p}=waterSearchScene(false,mode!=='noncritical',mode==='old'?117:118);p.lastExploreTick=w.tick-1;
 if(mode==='removed')setCriticalSearch(false);
 expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='explore')).toBe(false);
});
