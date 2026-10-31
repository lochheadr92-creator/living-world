import {afterEach,expect,it} from 'vitest';
import {setHarvestCapacity} from '../src/sim/hungry_harvest';
import {startActivity,stepActivity} from '../src/sim/activities';
import {serializeWorld} from '../src/app/save';
import {hungryHarvestScene} from './helpers/hungry_harvest';
import {generateOptions} from '../src/sim/decision';
import {conservationReport,invRoom} from '../src/sim/economy';
afterEach(()=>setHarvestCapacity(true));
it('E3: discretionary ripe harvest is not offered with a full pack',()=>{
 const {w,p}=hungryHarvestScene(undefined,{wood:6});p.needs.hunger=95;
 expect(invRoom(w,p,'grain')).toBe(0);
 expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='harvest')).toBe(false);
});
it.each(['old','removed'] as const)('E3: %s retains the full-pack offer',mode=>{
 const {w,p}=hungryHarvestScene(mode==='old'?117:118,{wood:6});p.needs.hunger=95;
 if(mode==='removed')setHarvestCapacity(false);
 expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='harvest')).toBe(true);
});
it('E3: seed-only carrying room still allows useful harvest and pure offering',()=>{
 const {w,p,plot}=hungryHarvestScene(undefined,{wood:5,water:1,seeds:1});p.needs.hunger=95;
 expect(invRoom(w,p,'grain')).toBe(0);expect(invRoom(w,p,'seeds')).toBe(1);
 const before=serializeWorld(w),o=generateOptions(w,p,true,true).options.find(o=>o.kind==='harvest');
 expect(o).toBeDefined();expect(serializeWorld(w)).toBe(before);
 const a=o!.make!()!;startActivity(w,p,a);for(let n=0;n<700&&p.activity;n++){w.tick++;stepActivity(w,p);}
 expect(p.lastResult?.outcome).toBe('success');expect(p.inv.seeds).toBe(2);expect(plot.stock).toBe(4);
 expect(conservationReport(w).ok).toBe(true);
});
