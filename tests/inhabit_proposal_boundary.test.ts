import {expect,it} from 'vitest';
import {cartProjectScene} from './helpers/cart_project';
import {setExternalController,type ExternalChoice,type ExternalNote} from '../src/sim/external';
import {observe} from '../src/sim/knowledge';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';

it.each([null,undefined])('a malformed proposal goal %s is refused at the external boundary without crashing the tick',goal=>{
 const f=cartProjectScene(107);f.target.required.stone=6;observe(f.w,f.p,f.target);
 const notes:ExternalNote[]=[];let calls=0;
 const release=setExternalController({controls:(_w,p)=>p.id===f.p.id,
  choose:()=>{calls++;return {kind:'propose',goal} as unknown as ExternalChoice;},
  notify:(_w,_p,n)=>notes.push(n)});
 try{expect(()=>stepWorld(f.w)).not.toThrow();}finally{release();}
 expect(calls).toBeGreaterThan(0);expect(calls).toBeLessThanOrEqual(4);
 expect(notes.filter(n=>n.kind==='rejected')).toHaveLength(calls);
 expect(notes.filter(n=>n.kind==='rejected').every(n=>n.reason==='a goal is required')).toBe(true);
 expect(notes.some(n=>n.kind==='fallback')).toBe(true);
 expect(f.p.intentions.some(i=>i.kind==='batch')).toBe(false);expect(f.w.carts).toHaveLength(0);
 expect(conservationReport(f.w).ok).toBe(true);
 const saved=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
