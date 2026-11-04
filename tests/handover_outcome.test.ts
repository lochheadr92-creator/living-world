// STAGED contracts for rules 157: an empty hand-over says why. Ordinary origin: carers arriving on a remembered need to find
// a dependant already carrying food (review_evidence/carry-recovery-20261105).
import {afterEach,expect,it} from 'vitest';
import {careCapacityScene} from './helpers/care_capacity';
import {indoorCareScene} from './helpers/indoor_care';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,consume,produce} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {CARE_PACK_FAILURE} from '../src/sim/care_capacity';
import {ALREADY_HAS_FOOD,GIVER_LACKS,HAD_FOOD_MEMORY,HAD_FOOD_REASON,emptyHandover,recentlyHadFood,setHandoverTruth} from '../src/sim/handover_outcome';
import {generateOptions} from '../src/sim/decision';
import {perceive} from '../src/sim/perception';
import {parseIntervention} from '../scripts/lab/lab';
import type {ItemKind} from '../src/sim/types';
afterEach(()=>setHandoverTruth(true));

/** The carer sets out to hand over food; while they walk, the recipient's pack fills with `fill`. */
function runCare(version:number,fill:ItemKind[]|'empty-giver'){
 const f=indoorCareScene(version),cap=carryCap(f.w,f.elder);
 const selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 if(fill==='empty-giver'){for(const k of Object.keys(selected.act.data.items??{}) as ItemKind[])consume(f.w,f.helper.inv,k,f.helper.inv[k]??0,'staged: eaten on the way');}
 else for(const k of fill)produce(f.w,f.elder.inv,cap,k,100,'staged: recipient filled their pack meanwhile');
 const before={helper:{...f.helper.inv},elder:{...f.elder.inv}};
 try{for(let n=0;n<200&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
 return {...f,before};
}

it('a carer who finds the dependant already holding food says so, moves nothing and is not sent to leave food at home',()=>{
 const f=runCare(157,['berries']);
 expect(f.helper.lastResult?.detail).toBe(ALREADY_HAS_FOOD);
 expect(f.helper.failures[f.elder.id]?.reason).toBe(ALREADY_HAS_FOOD);
 expect(f.elder.inv.berries).toBe(f.before.elder.berries);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('keeps the rules-63 full-pack memory and home fallback when the pack is full of other things',()=>{
 const f=careCapacityScene(157);f.failGift();
 expect(f.helper.lastResult?.detail).toBe('they had no room to carry it');
 expect(f.helper.failures[f.elder.id]?.reason).toBe(CARE_PACK_FAILURE);
});

it('says the giver no longer had the goods instead of blaming the recipient',()=>{
 const f=runCare(157,'empty-giver');
 expect(f.helper.lastResult?.detail).toBe(GIVER_LACKS);
 expect(f.helper.failures[f.elder.id]?.reason).not.toBe(CARE_PACK_FAILURE);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('leaves rules 156 and the lab removal reporting a full pack, as before',()=>{
 const old=runCare(156,['berries']);
 expect(old.helper.lastResult?.detail).toBe('they had no room to carry it');expect(old.helper.failures[old.elder.id]?.reason).toBe(CARE_PACK_FAILURE);
 const restore=parseIntervention('rich-no-handover-truth').install!();
 try{const off=runCare(157,['berries']);expect(off.helper.lastResult?.detail).toBe('they had no room to carry it');}finally{restore();}
});

it('classifies purely and continues exactly after saving',()=>{
 const f=indoorCareScene(157),cap=carryCap(f.w,f.elder);produce(f.w,f.elder.inv,cap,'berries',100,'staged full of food');
 const raw=serializeWorld(f.w);
 expect(emptyHandover(f.w,f.helper,f.elder,{berries:1})).toBe(f.helper.inv.berries?'already has food':'giver lacks');
 expect(emptyHandover(f.w,f.helper,f.elder,{axe:1} as never)).toBe('giver lacks');
 expect(serializeWorld(f.w)).toBe(raw);
 const copy=deserializeWorld(raw);for(let i=0;i<300;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
});

it('out of sight, does not set out again on food alone for a bounded while; sight or water decides afresh',()=>{
 const f=runCare(157,['berries']);
 const unseen=()=>{f.helper.seen=f.helper.seen.filter(s=>s.id!==f.elder.id);f.helper.whereabouts[f.elder.id]={x:f.elder.x,y:f.elder.y,tick:f.w.tick,seen:{hungry:true,thirsty:false,cold:false}} as never;f.elder.needs.hunger=30;f.elder.needs.thirst=90;};
 unseen();const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.helper,true,true);
 expect(serializeWorld(f.w)).toBe(raw);
 expect(recentlyHadFood(f.w,f.helper,f.elder.id)).toBe(true);
 expect(ctx.options.some(o=>o.key===`give:${f.elder.id}`)).toBe(false);
 expect(ctx.blocked.some(b=>b.targetId===f.elder.id&&b.blocked===HAD_FOOD_REASON)).toBe(true);
 f.w.tick+=HAD_FOOD_MEMORY;expect(recentlyHadFood(f.w,f.helper,f.elder.id)).toBe(false);
 const restore=parseIntervention('rich-no-handover-truth').install!();
 try{f.w.tick-=HAD_FOOD_MEMORY;expect(recentlyHadFood(f.w,f.helper,f.elder.id)).toBe(false);}finally{restore();}
});

it('in sight, brings a thirsty dependant holding food water only, never food on top of it',()=>{
 const f=indoorCareScene(157),cap=carryCap(f.w,f.elder);
 produce(f.w,f.elder.inv,cap,'berries',3,'staged: holding some food');f.elder.needs.hunger=30;f.elder.needs.thirst=35;
 produce(f.w,f.helper.inv,carryCap(f.w,f.helper),'berries',2,'staged carer food');
 perceive(f.w,f.helper);expect(f.helper.seen.find(s=>s.id===f.elder.id)?.carrying).toContain('berries');
 const offered=()=>{const ctx=generateOptions(f.w,f.helper,true,true);return {give:ctx.options.find(o=>o.key===`give:${f.elder.id}`),ctx};};
 consume(f.w,f.helper.inv,'water',f.helper.inv.water??0,'staged: no water');
 const dry=offered();expect(dry.give).toBeUndefined();expect(dry.ctx.blocked.some(b=>b.targetId===f.elder.id&&b.blocked==='is carrying food already')).toBe(true);
 produce(f.w,f.helper.inv,carryCap(f.w,f.helper),'water',1,'staged carer water');
 const wet=offered().give;expect(wet).toBeDefined();expect(Object.keys((wet!.make!()!.data.items??{}) as object)).toEqual(['water']);
 const old=indoorCareScene(156);produce(old.w,old.elder.inv,carryCap(old.w,old.elder),'berries',3,'staged');old.elder.needs.hunger=30;old.elder.needs.thirst=35;
 produce(old.w,old.helper.inv,carryCap(old.w,old.helper),'berries',2,'staged');consume(old.w,old.helper.inv,'water',old.helper.inv.water??0,'staged');perceive(old.w,old.helper);
 expect(generateOptions(old.w,old.helper,true,true).options.some(o=>o.key===`give:${old.elder.id}`)).toBe(true);
});
