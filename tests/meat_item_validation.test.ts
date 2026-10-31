import {expect,it} from 'vitest';
import {ALL_ITEMS,WEIGHT} from '../src/sim/constants';
import {helperLearningScene} from './helpers/helper_learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {foodHelpScene} from './helpers/food_help';
import {stepWorld} from '../src/sim/world';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';

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

it.each([78,107,CURRENT_RULES_VERSION])('an actual spoken food request and meat hand-over survives save and continuation at rules %i',version=>{
 // Staged starting stock/positions; the offered request, reply, physical transfer
 // and retained receipts all come from the engine, not assigned receipt fields.
 const f=foodHelpScene({version,source:null,benInv:{meat:6}});
 f.ask();
 const request=f.w.requests.find(r=>r.from===f.ada.id&&r.to===f.ben.id)!;
 expect(request.item).toBeNull();
 expect(request.delivered).toBeGreaterThan(0);
 expect(request.helperReceipt).toMatchObject({item:'meat',amount:request.delivered,eventKind:'conversation'});
 expect(f.ada.inv.meat).toBe(request.delivered);
 expect(f.ada.socialMemory?.find(m=>m.requestId===request.id)?.task?.receipt).toEqual(request.helperReceipt);
 const raw=serializeWorld(f.w),copy=deserializeWorld(raw);
 expect(serializeWorld(copy)).toBe(raw);
 for(let n=0;n<120;n++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
 expect(serializeWorld(deserializeWorld(serializeWorld(copy)))).toBe(serializeWorld(copy));
 expect(conservationReport(f.w).ok).toBe(true);
});
