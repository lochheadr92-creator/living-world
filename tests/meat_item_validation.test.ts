import {expect,it} from 'vitest';
import {ALL_ITEMS,WEIGHT} from '../src/sim/constants';
import {helperLearningScene} from './helpers/helper_learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';

it('the item validation and accounting vocabulary includes every weighted item exactly once',()=>{
 expect([...ALL_ITEMS].sort()).toEqual(Object.keys(WEIGHT).sort());
 expect(new Set(ALL_ITEMS).size).toBe(ALL_ITEMS.length);
});

it('a positive meat delivery receipt survives exact save/load while invalid items are still rejected',async()=>{
 // Isolated schema fixture: the ordinary forest receipt is retained separately as runtime evidence.
 const {w,receipt}=await helperLearningScene();
 const request=w.requests.find(r=>r.id===receipt.requestId)!;
 request.helperReceipt!.item='meat';
 for(const p of w.persons)for(const memory of p.socialMemory??[]){
  if(memory.requestId===request.id&&memory.task?.receipt)memory.task.receipt.item='meat';
 }
 const saved=serializeWorld(w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
 (request.helperReceipt as any).item='invented';
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/helper direct receipt/);
});

it('unaccounted meat is detected by conservation and accounted meat is balanced',async()=>{
 const {w,ada}=await helperLearningScene();expect(conservationReport(w).ok).toBe(true);
 ada.inv.meat=(ada.inv.meat??0)+1;
 expect(conservationReport(w).diffs).toContainEqual({item:'meat',expected:0,actual:1});
 w.ledger.created.meat=(w.ledger.created.meat??0)+1;
 expect(conservationReport(w).ok).toBe(true);
});
