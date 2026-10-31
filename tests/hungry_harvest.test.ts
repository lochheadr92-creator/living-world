import {afterEach,expect,it} from 'vitest';
import {hungryHarvestScene} from './helpers/hungry_harvest';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {setHungryHarvest} from '../src/sim/hungry_harvest';
import {observe,delBelief} from '../src/sim/knowledge';
import {startActivity,stepActivity} from '../src/sim/activities';
afterEach(()=>setHungryHarvest(true));
it('offers personally known ripe household grain as a physical hunger response',()=>{
 const {w,p,plot}=hungryHarvestScene(),before=serializeWorld(w),ctx=generateOptions(w,p,true,true),o=ctx.options.find(o=>o.kind==='harvest'&&o.targetId===plot.id);
 expect(o).toBeDefined();expect(o!.need).toBe('hunger');expect(rankOptions(ctx)[0].key).toBe(o!.key);expect(serializeWorld(w)).toBe(before);
});
it.each(['old','removed'] as const)('preserves the absent hungry harvest under %s rules',mode=>{
 const {w,p}=hungryHarvestScene(mode==='old'?113:undefined);if(mode==='removed')setHungryHarvest(false);
 expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='harvest')).toBe(false);
});
it.each(['unknown','other household','empty','growing','full pack','child'] as const)('does not invent accessible grain for %s',mode=>{
 const {w,p,plot}=hungryHarvestScene(undefined,mode==='full pack'?{wood:6}:undefined,mode==='child'?8:35);
 if(mode==='unknown')delBelief(p,plot.id);if(mode==='other household'){plot.hhId=p.hhId+100;observe(w,p,plot);}if(mode==='empty'){plot.stock=0;observe(w,p,plot);}if(mode==='growing'){plot.state='growing';observe(w,p,plot);}
 const before=serializeWorld(w);expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='harvest'&&o.need==='hunger')).toBe(false);expect(serializeWorld(w)).toBe(before);
});
it('retains drinking priority when thirst is the more urgent need',()=>{
 const {w,p}=hungryHarvestScene();p.needs.hunger=35;p.needs.thirst=0;
 const ranked=rankOptions(generateOptions(w,p,true,true));expect(ranked[0].need).toBe('thirst');
});
it('revalidates a changed crop during work and releases its real claim without minting food',()=>{
 const {w,p,plot}=hungryHarvestScene(),o=generateOptions(w,p,true,true).options.find(o=>o.kind==='harvest')!,a=o.make!()!;
 startActivity(w,p,a);for(let n=0;n<180&&!(a.phase==='work'&&a.progress>0);n++)stepWorld(w);
 expect(a.progress).toBeGreaterThan(0);expect([...w.reservations.values()].some(r=>r.owner===p.id&&r.target===plot.id)).toBe(true);
 const ledger=JSON.stringify(w.ledger),inv=JSON.stringify(p.inv);
 // Explicit staged state change after actual arrival and claim; no inventory or ledger is edited.
 plot.state='growing';
 for(let n=0;n<100&&p.activity?.id===a.id;n++){w.tick++;stepActivity(w,p);}
 expect(p.activity?.id).not.toBe(a.id);expect(p.lastResult?.detail??JSON.stringify(p.lastResult)).toMatch(/field changed/);
 expect([...w.reservations.values()].some(r=>r.owner===p.id&&r.target===plot.id)).toBe(false);expect(JSON.stringify(w.ledger)).toBe(ledger);expect(JSON.stringify(p.inv)).toBe(inv);
});
it('autonomously harvests, saves mid-work, then eats paid grain with exact continuation',()=>{
 const {w,p,plot}=hungryHarvestScene();for(let n=0;n<180&&!(p.activity?.kind==='harvest'&&p.activity.progress>0);n++)stepWorld(w);
 expect(p.activity?.kind).toBe('harvest');expect(p.activity!.progress).toBeGreaterThan(0);const copy=deserializeWorld(serializeWorld(w));
 for(let n=0;n<400;n++){stepWorld(w);stepWorld(copy);}expect(p.needs.hunger).toBeGreaterThan(10);expect(w.ledger.consumed.grain??0).toBeGreaterThan(0);expect(plot.stock).toBeLessThan(4);
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
