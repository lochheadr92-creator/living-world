import {afterEach,expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {depositRichness,setDepositGeology} from '../src/sim/geology';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
const minerals=['clay_pit','ore_vein','outcrop'];
afterEach(()=>setDepositGeology(true));
it('varies finite geology without moving deposits, changing food/water or drawing simulation RNG',()=>{
 const settings=currentWorldSettings('large','meadow',{immigration:false});setDepositGeology(false);const baseline=createWorld(settings);setDepositGeology(true);const varied=createWorld(settings);
 expect(varied.rng).toEqual(baseline.rng);expect(varied.sources.map(s=>[s.id,s.type,s.x,s.y])).toEqual(baseline.sources.map(s=>[s.id,s.type,s.x,s.y]));
 expect(varied.sources.filter(s=>!minerals.includes(s.type))).toEqual(baseline.sources.filter(s=>!minerals.includes(s.type)));
 const ds=varied.sources.filter(s=>minerals.includes(s.type));expect(ds.some(s=>s.amount!==baseline.sources.find(b=>b.id===s.id)!.amount)).toBe(true);
 for(const s of ds){const factor=depositRichness(varied,s.type,s.x,s.y);expect(factor).toBeGreaterThanOrEqual(.55);expect(factor).toBeLessThanOrEqual(1.65);expect(s.amount).toBeGreaterThan(0);expect(s.amount).toBeLessThanOrEqual(s.max);expect(s.regrowEvery).toBe(0);}
 expect(conservationReport(varied).ok).toBe(true);expect(serializeWorld(createWorld(settings))).toBe(serializeWorld(varied));
});
it('does not teach undiscovered deposits or impose occupations and survives save/load',()=>{
 const settings=currentWorldSettings('large','river',{immigration:false});setDepositGeology(false);const baseline=createWorld(settings);setDepositGeology(true);const w=createWorld(settings);
 // Compare the actual existing camp/first-look boundary, not an invented radius from each person.
 for(const p of w.persons){const prior=baseline.persons.find(q=>q.id===p.id)!;expect(Object.keys(p.beliefs)).toEqual(Object.keys(prior.beliefs));expect(p.traits).toEqual(prior.traits);expect(p.skills).toEqual(prior.skills);}
 const loaded=deserializeWorld(serializeWorld(w));for(let i=0;i<120;i++){stepWorld(w);stepWorld(loaded);}expect(serializeWorld(loaded)).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
it('keeps historical generation exactly equal with or without the generation-only ablation',()=>{
 const settings={...currentWorldSettings('large','fern',{immigration:false}),rulesVersion:25};
 setDepositGeology(false);const off=serializeWorld(createWorld(settings));setDepositGeology(true);expect(serializeWorld(createWorld(settings))).toBe(off);
});
