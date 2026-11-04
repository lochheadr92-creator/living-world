import {expect,it} from 'vitest';
import {lambBirthScene} from './helpers/lamb_birth';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
it('autonomously acquires, tends and breeds finite sheep; continues exactly through pregnancy and birth',()=>{
 const {w,p,ewe,ram}=lambBirthScene(151);
 for(let i=0;i<6000;i++)stepWorld(w);
 expect(ewe.sheep!.pregnancy?.father).toBe(ram.id);
 expect(w.ledger.consumed.grain).toBeGreaterThan(2);
 const raw=serializeWorld(w),twin=deserializeWorld(raw);generateOptions(w,p,true,true);expect(serializeWorld(w)).toBe(raw);
 for(let i=0;i<4800;i++){stepWorld(w);stepWorld(twin);}
 expect(serializeWorld(w)).toBe(serializeWorld(twin));
 const lamb=w.animals.find(a=>a.sheep?.origin==='birth')!;
 expect(lamb).toBeDefined();expect(lamb.sheep!.parents).toEqual([ewe.id,ram.id]);expect(lamb.sheep!.hhId).toBe(p.hhId);
 expect(lamb.sheep!.tether).toBeNull();expect(lamb.sheep!.growth).toBeLessThan(500);
 const afterBirth=deserializeWorld(serializeWorld(w));
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(afterBirth);}
 expect(serializeWorld(w)).toBe(serializeWorld(afterBirth));expect(conservationReport(w).ok).toBe(true);
},120000);
it('retains the old staged pregnancy loss under rules150',()=>{
 const {w,ewe}=lambBirthScene(150);for(let i=0;i<6000;i++)stepWorld(w);
 expect(w.animals.some(a=>a.id===ewe.id)).toBe(false);expect(w.animals.some(a=>a.sheep?.origin==='birth')).toBe(false);
 expect(conservationReport(w).ok).toBe(true);
},120000);
