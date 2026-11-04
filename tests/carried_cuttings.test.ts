import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {newCart} from '../src/sim/carts';
import {stepWorld} from '../src/sim/world';
import {conservationReport,weightOf} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {serializeWorld,deserializeWorld} from '../src/app/save';
function fixture(version:number){const s=stage('carried-cuttings');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:version};const p=addPerson(s,'Ada',40,40,{inv:{cutting:20},hunger:100,thirst:100,energy:100});pin(p);const cart=newCart(s.w,42,40,p.hhId);cart.load.cutting=20;done(s);return {w:s.w,p,cart};}
it('living cuttings wither in packs and carts with accounted loss and exact continuation',()=>{const {w,p,cart}=fixture(146);expect(weightOf(p.inv)).toBeLessThanOrEqual(carryCap(w,p));for(let i=0;i<2400;i++)stepWorld(w);expect(p.alive).toBe(true);expect(p.inv.cutting??0).toBeLessThan(20);expect(cart.load.cutting??0).toBeLessThan(20);expect(w.ledger.spoiled.cutting).toBeGreaterThan(0);expect(conservationReport(w).ok).toBe(true);const twin=deserializeWorld(serializeWorld(w));for(let i=0;i<240;i++){stepWorld(w);stepWorld(twin);}expect(serializeWorld(w)).toBe(serializeWorld(twin));});

it('preserves the predecessor carried-cutting behavior',()=>{const {w,p,cart}=fixture(145);for(let i=0;i<2400;i++)stepWorld(w);expect(p.inv.cutting).toBe(20);expect(cart.load.cutting).toBe(20);expect(w.ledger.spoiled.cutting??0).toBe(0);expect(conservationReport(w).ok).toBe(true);});
