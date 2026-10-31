import {afterEach,expect,it} from 'vitest';
import {wildSeedScene,finishWildHarvest} from './helpers/wild_seed';
import {setWildSeedInput,saveSeedFromGrain} from '../src/sim/wild_seed';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
afterEach(()=>setWildSeedInput(true));
it('does not consume a partial grain when the conversion cannot pay its whole input',()=>{
 const {w,p}=wildSeedScene(undefined,{wood:5,grain:.5,seeds:4});const raw=serializeWorld(w);
 expect(saveSeedFromGrain(w,p)).toBe(0);expect(serializeWorld(w)).toBe(raw);
});
it('a grain eaten at the source cannot also make a seed without a carried grain input',()=>{
 const {w,p,source,a}=wildSeedScene();finishWildHarvest(w,p,a.id);
 expect(source.amount).toBe(1);expect(p.needs.hunger).toBe(32);expect(w.ledger.consumed.grain).toBe(1);
 expect(w.ledger.reasons['-saved as seed']??0).toBe(0);expect(w.ledger.created.seeds??0).toBe(0);expect(p.inv.seeds).toBe(6);
});
it('a harvested grain really retained in the pack still pays for its seed',()=>{
 const {w,p,source,a}=wildSeedScene(undefined,{wood:1});finishWildHarvest(w,p,a.id);
 expect(source.amount).toBe(1);expect(p.needs.hunger).toBe(10);expect(w.ledger.reasons['-saved as seed']).toBe(1);expect(w.ledger.created.seeds).toBe(1);expect(p.inv.grain??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('a separate carried grain can pay while a source grain is eaten',()=>{
 const {w,p,source,a}=wildSeedScene(undefined,{wood:5,grain:1,seeds:2});finishWildHarvest(w,p,a.id);
 expect(source.amount).toBe(1);expect(p.needs.hunger).toBe(32);expect(w.ledger.consumed.grain).toBe(2);expect(w.ledger.reasons['-saved as seed']).toBe(1);expect(w.ledger.created.seeds).toBe(1);expect(p.inv.seeds).toBe(3);expect(conservationReport(w).ok).toBe(true);
});
it.each(['old','removed'] as const)('preserves the prior unpaid seed under %s rules',mode=>{
 const {w,p,a}=wildSeedScene(mode==='old'?112:undefined);if(mode==='removed')setWildSeedInput(false);finishWildHarvest(w,p,a.id);
 expect(w.ledger.reasons['-saved as seed']??0).toBe(0);expect(w.ledger.created.seeds).toBe(1);expect(p.inv.seeds).toBe(7);
});
it('keeps the existing chance draw and counts only actual consumed conversion inputs across fixed seeds',()=>{
 let oldUnpaid=0;
 for(let seed=0;seed<20;seed++){
  const old=wildSeedScene(112,undefined,seed),now=wildSeedScene(undefined,undefined,seed);
  finishWildHarvest(old.w,old.p,old.a.id);finishWildHarvest(now.w,now.p,now.a.id);
  oldUnpaid+=old.w.ledger.created.seeds??0;
  expect(now.w.rng).toEqual(old.w.rng);expect(now.p.needs.hunger).toBe(old.p.needs.hunger);expect(now.source.amount).toBe(old.source.amount);
  expect(now.w.ledger.created.seeds??0).toBeLessThanOrEqual(now.w.ledger.reasons['-saved as seed']??0);expect(conservationReport(now.w).ok).toBe(true);
 }
 expect(oldUnpaid).toBe(6);
});
it('preserves a partly completed real harvest across save and pure inspection',()=>{
 const {w,p,a}=wildSeedScene();w.tick++;stepActivity(w,p);expect(a.progress).toBeGreaterThan(0);
 const raw=serializeWorld(w);generateOptions(w,p,true,true);expect(serializeWorld(w)).toBe(raw);const copy=deserializeWorld(raw),q=copy.persons.find(q=>q.id===p.id)!;
 finishWildHarvest(w,p,a.id);finishWildHarvest(copy,q,a.id);expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
