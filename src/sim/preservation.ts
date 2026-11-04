// Preservation extends the existing facility Job. Its started/progress/burnLeft
// fields are authoritative: neither inspection nor loading advances the process.
import {DAY, PRESERVED_FOODS} from './constants';
import {foodUnits, ledgerSpoil, takeFrom, transfer} from './economy';
import {recipeAvailable,RECIPE_BY_ID} from './recipes';
import type {Recipe} from './recipes';
import {runsRulesVersion} from './rulesversion';
import type {Building, Items, ItemKind, Job, Person, World} from './types';
import type {Ctx, Option} from './optutil';

export const PRESERVATION_FROM_VERSION=122;
export const PRESERVATION_MAX_AGE=DAY*2;
let enabled=true;
export const preservationOn=()=>enabled;
export function setPreservation(on:boolean):void {enabled=on;}
export const runsPreservation=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,PRESERVATION_FROM_VERSION);
export const hasPreservation=(w:World)=>enabled&&runsPreservation(w);

/** Use the existing reserve plan; do not reserve food away from immediate meals. */
export function stockPreservationOption(ctx:Ctx):Option|undefined {
  if(!hasPreservation(ctx.world)||PRESERVED_FOODS.some(k=>(ctx.p.inv[k]??0)>0))return;
  return ctx.options.filter(o=>o.preservesFood&&!o.blocked&&o.util>0)
    .sort((a,b)=>b.util-a.util)[0];
}

/** Current labour, not the facility's recently-present cache or past contributors. */
export function preservationWorkers(w:World,b:Building):Person[]{
  if(b.type!=='food_rack'||b.ops?.job?.phase!=='work')return [];
  return w.persons.filter(p=>p.alive&&p.activity?.kind==='operate'&&p.activity.phase==='work'&&p.activity.targetId===b.id);
}

export function preservationStartBlocker(w:World,p:Person,r:Recipe,accessibleStoreFood:number):string {
  if(!r.preservation)return '';
  if(!hasPreservation(w))return 'preservation is not available under these rules';
  if(!recipeAvailable(w,r))return 'this preparation is unavailable under these rules';
  if(r.preservation==='render')return '';
  if(p.needs.hunger<45)return 'eat before preparing food for later';
  if(accessibleStoreFood+foodUnits(p.inv)<4)return 'leave at least two portions for immediate eating';
  return '';
}

/** Expired inputs are lost once. Unburned fuel waits in the same batch if the
 * store is full; returning it never overfills storage or recreates consumed fuel. */
export function preservationCanAdvance(w:World,b:Building):boolean {
  const job=b.ops?.job;
  if(!job)return false;
  const r=RECIPE_BY_ID[job.recipe];
  if(!r?.preservation)return true;
  const raw=r.inputs.fish?'fish':r.inputs.fat?'fat':'meat',quantity=r.inputs[raw]??0;
  if(w.tick-job.started>=PRESERVATION_MAX_AGE || (job.held[raw]??0)<quantity){
    const lost=takeFrom(job.held,raw,job.held[raw]??0);
    if(lost)ledgerSpoil(w,raw,lost,'unfinished preservation spoiled');
    for(const k of Object.keys(job.held) as ItemKind[]) transfer(w,job.held,b.store.items,b.store.cap,k,job.held[k]??0,`batch:${b.id}`,`building:${b.id}`,'recover fuel from spoiled batch');
    job.blocked='the unfinished food spoiled; unused fuel awaits storage room';
    b.ops!.lastBlocker=job.blocked;
    if(!Object.values(job.held).some(n=>n>0))b.ops!.job=null;
    return false;
  }
  if(b.condition<12){job.blocked='the rack needs repair';b.ops!.lastBlocker=job.blocked;return false;}
  if(r.preservation==='dry' && job.phase==='burn' && w.weather.rain>0.1){
    job.blocked='rain pauses drying'; b.ops!.lastBlocker=job.blocked;return false;
  }
  if(job.phase!=='ready'){job.blocked=''; b.ops!.lastBlocker='';} return true;
}

export function preservationReady(w:World,job:Job,r:Recipe):boolean {
  if(!r.preservation)return true;
  const raw=r.inputs.fish?'fish':r.inputs.fat?'fat':'meat',quantity=r.inputs[raw]??0;
  return runsPreservation(w)&&recipeAvailable(w,r)&&job.progress>=job.total&&job.phase!=='work'&&job.burnLeft<=0&&
    w.tick-job.started<PRESERVATION_MAX_AGE&&(job.held[raw]??0)===quantity;
}

/** A collapsed rack ruins its exposed unfinished food; intact fuel can scatter
 * through the existing building-loss path. Never turn an aged batch into fresh raw food. */
export function losePreservationRack(w:World,b:Building):void {
  const j=b.ops?.job,r=j&&RECIPE_BY_ID[j.recipe];
  if(!j||!r?.preservation)return;
  const raw=r.inputs.fish?'fish':r.inputs.fat?'fat':'meat',quantity=r.inputs[raw]??0;
  const lost=takeFrom(j.held,raw,j.held[raw]??0);
  if(lost)ledgerSpoil(w,raw,lost,'unfinished preservation destroyed with rack');
}

export function validatePreservation(w:World):void {
  const eligible=w.settings.dynamics==='rich'&&runsRulesVersion(w,PRESERVATION_FROM_VERSION);
  const check=(items:Items|undefined)=>{
    for(const k of PRESERVED_FOODS)if(items?.[k]!==undefined&&(!eligible||(k==='rendered_fat'&&!runsRulesVersion(w,125))||!Number.isSafeInteger(items[k])||items[k]!<0))throw new Error('Invalid preserved food inventory');
  };
  for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.inputs);check(b.ops?.output);check(b.ops?.yields);}}
  for(const b of w.buildings){
    check(b.store.items);check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.job?.held);
    if(b.type==='food_rack'&&(!eligible||!b.ops||!Object.hasOwn(b.ops,'job')||
      !Array.isArray(b.ops.earmarks)||!b.ops.shares||!b.ops.present||!b.ops.contributions||
      !b.ops.produced||!b.ops.consumed||!b.ops.builders||!b.ops.wasted))throw new Error('Invalid preservation rack');
    const j=b.ops?.job,r=j&&RECIPE_BY_ID[j.recipe];
    if(b.type==='food_rack'&&j&&!r?.preservation)throw new Error('Invalid preservation recipe');
    if(!r?.preservation)continue;
    if(!eligible||!recipeAvailable(w,r)||b.type!=='food_rack'||!j||!j.held||!j.workers||Array.isArray(j.workers)||
      !Number.isSafeInteger(j.client)||j.client<=0||!Number.isSafeInteger(j.destSite)||j.destSite<0||
      typeof j.purpose!=='string'||typeof j.blocked!=='string'||
      !['work','burn','ready'].includes(j.phase)||
      ![j.started,j.lastWork,j.progress,j.total,j.burnLeft,j.burnTotal].every(n=>Number.isFinite(n)&&n>=0)||
      !Number.isSafeInteger(j.started)||j.started>w.tick||!Number.isSafeInteger(j.lastWork)||j.lastWork<j.started||j.lastWork>w.tick||
      !Number.isInteger(j.burnLeft)||j.total!==r.work||j.burnTotal!==r.burn||j.burnLeft>r.burn||
      (j.phase==='work'&&j.burnLeft!==0)||(j.phase==='ready'&&j.burnLeft!==0)||
      (j.phase==='work'&&j.progress>=j.total)||
      (j.phase!=='work'&&j.progress<j.total))throw new Error('Invalid preservation batch state');
    for(const [id,n] of Object.entries(j.workers))if(!Number.isSafeInteger(Number(id))||Number(id)<=0||!Number.isSafeInteger(n)||n<0)throw new Error('Invalid preservation worker record');
    const raw=r.inputs.fish?'fish':r.inputs.fat?'fat':'meat',quantity=r.inputs[raw]??0;
    if(![0,quantity].includes(j.held[raw]??0)||((j.held[raw]??0)===0&&w.tick-j.started<PRESERVATION_MAX_AGE))throw new Error('Invalid preservation batch contents');
    for(const [k,n] of Object.entries(j.held))if(![raw,'wood'].includes(k)||!Number.isInteger(n)||n<0||n>(r.inputs[k as ItemKind]??r.fuel[k as ItemKind]??0))throw new Error('Invalid preservation batch contents');
    if(j.phase!=='work'&&(j.held.wood??0)>0)throw new Error('Invalid preservation fuel state');
    if(j.phase==='work'&&w.tick-j.started<PRESERVATION_MAX_AGE&&(j.held.wood??0)!==(r.fuel.wood??0))throw new Error('Invalid preservation fuel state');
  }
  for(const p of w.piles)check(p.items);for(const c of w.carts)check(c.load);
  for(const s of w.sites){check(s.delivered);check(s.used);if(s.type==='food_rack'&&!eligible)throw new Error('Invalid preservation site');}
  for(const m of w.meals)check(m.table);
  check(w.ledger.initial);check(w.ledger.created);check(w.ledger.consumed);check(w.ledger.spoiled);
}
