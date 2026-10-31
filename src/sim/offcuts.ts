// Recoverable timber by-products, not structural wood or historical waste resurrection.
import {runsRulesVersion} from './rulesversion';
import {FIRE_FUEL_PER_WOOD} from './constants';
import type {Recipe} from './recipes';
import type {Activity,Items,World} from './types';
let enabled=true;
export const offcutsOn=()=>enabled;
export function setOffcuts(on:boolean):void{enabled=on;}
export const hasOffcuts=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,89);
/** One weight-unit bundle per wood-unit formerly discarded: half that wood remains a sink.
 * Thus hewing recovers two bundles, sawing one; no other recipe's waste is recoverable. */
export function recoveredOffcuts(w:World,r:Recipe):number{
 return hasOffcuts(w)?(r.offcuts??0):0;
}
export function fuelItem(w:World,a:Activity):'wood'|'offcuts'{
 return hasOffcuts(w)&&a.data.fuelItem==='offcuts'?'offcuts':'wood';
}
export const fuelValue=(item:'wood'|'offcuts')=>FIRE_FUEL_PER_WOOD*(item==='offcuts'?0.5:1);
/** New inventory values use existing holders, ledgers and serialization. Old saves cannot
 * be relabelled to carry this new material; no migration invents a source for it. */
export function validateOffcuts(w:World):void{
 const eligible=w.settings.dynamics==='rich'&&runsRulesVersion(w,89);
 const check=(items:Items|undefined)=>{if(items?.offcuts!==undefined&&(!eligible||!Number.isFinite(items.offcuts)||items.offcuts<0||!Number.isInteger(items.offcuts)))throw new Error('Invalid offcut inventory');};
 for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.yields);}
  for(const a of [p.activity,p.suspended])if(a){check(a.data.items);if(a.data.fuelItem!==undefined&&(!eligible||a.kind!=='fuel_fire'||a.data.fuelItem!=='offcuts'))throw new Error('Invalid offcut fuel action');}}
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);}
 for(const p of w.piles)check(p.items);for(const c of w.carts)check(c.load);
 for(const s of w.sites){check(s.delivered);check(s.used);}for(const m of w.meals)check(m.table);
 check(w.ledger.initial);check(w.ledger.created);check(w.ledger.consumed);check(w.ledger.spoiled);
}
