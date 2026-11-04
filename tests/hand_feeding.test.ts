// STAGED contracts for rules 159: a hungry recipient whose pack has no room is fed by hand.
// Ordinary origin: Fenn (Large life-stages-6, rules 153) starved carrying two wood while his mother held food for him.
import {afterEach,expect,it} from 'vitest';
import {careCapacityScene} from './helpers/care_capacity';
import {indoorCareScene} from './helpers/indoor_care';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,produce,weightOf} from '../src/sim/economy';
import {carryCap} from '../src/sim/people';
import {CARE_PACK_FAILURE} from '../src/sim/care_capacity';
import {ALREADY_HAS_FOOD} from '../src/sim/handover_outcome';
import {planHandFeeding,setHandFeeding} from '../src/sim/hand_feeding';
import {parseIntervention} from '../scripts/lab/lab';
afterEach(()=>setHandFeeding(true));

/** The carer sets out to bring the hungry resident food; the resident's pack is full of wood and seeds (staged). */
function runGive(version:number,hunger:number){
 // chosen while they are hungry; `hunger` is what they are when the carer arrives (they may have eaten on the way)
 const f=careCapacityScene(version);f.elder.needs.hunger=20;
 const selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);f.elder.needs.hunger=hunger;
 const before={helperBread:f.helper.inv.bread??0,elder:{...f.elder.inv},hunger:f.elder.needs.hunger,weight:weightOf(f.elder.inv)};
 try{for(let n=0;n<200&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
 return {...f,before};
}

it('feeds a hungry person with a full pack by hand: the food is eaten, their pack is untouched, goods conserved',()=>{
 const f=runGive(159,20);
 expect(f.elder.needs.hunger).toBeGreaterThan(f.before.hunger);
 expect(f.helper.inv.bread??0).toBeLessThan(f.before.helperBread);
 expect(f.elder.inv).toEqual(f.before.elder);expect(weightOf(f.elder.inv)).toBe(f.before.weight);
 expect(f.helper.lastResult?.outcome).toBe('success');
 expect(f.helper.log.some(l=>l.text.includes('by hand'))).toBe(true);expect(f.elder.log.some(l=>l.text.includes('fed me')&&l.text.includes('by hand'))).toBe(true);
 expect(f.elder.lastAteTick).toBeGreaterThan(0);
 expect(f.helper.failures[f.elder.id]?.reason).not.toBe(CARE_PACK_FAILURE);
 expect(conservationReport(f.w).ok).toBe(true);
});

it('is bounded: at most three units, and a meal stops short of full',()=>{
 const f=careCapacityScene(159);f.elder.needs.hunger=2;
 produce(f.w,f.helper.inv,carryCap(f.w,f.helper),'berries',5,'staged carer food');
 const plan=planHandFeeding(f.w,f.helper,f.elder,{bread:3,berries:5});
 const units=Object.values(plan??{}).reduce((n,v)=>n+(v??0),0);
 expect(units).toBeGreaterThan(0);expect(units).toBeLessThanOrEqual(3);
 f.elder.needs.hunger=80;const small=planHandFeeding(f.w,f.helper,f.elder,{bread:3});
 expect(small).toBeNull();
});

it('leaves a person who is not hungry on the rules-63 full-pack fallback',()=>{
 const f=runGive(159,90);
 expect(f.helper.lastResult?.detail).toBe('they had no room to carry it');
 expect(f.helper.failures[f.elder.id]?.reason).toBe(CARE_PACK_FAILURE);
 expect(f.helper.inv.bread??0).toBe(f.before.helperBread);expect(f.elder.needs.hunger).toBeGreaterThan(f.before.hunger-2);
});

it('leaves rules 158 and the lab removal failing as before',()=>{
 const old=runGive(158,20);
 expect(old.helper.lastResult?.detail).toBe('they had no room to carry it');expect(old.helper.failures[old.elder.id]?.reason).toBe(CARE_PACK_FAILURE);
 const restore=parseIntervention('rich-no-hand-feeding').install!();
 try{const off=runGive(159,20);expect(off.helper.lastResult?.detail).toBe('they had no room to carry it');expect(off.helper.inv.bread??0).toBe(off.before.helperBread);}finally{restore();}
});

it('does not feed a recipient who already holds food (rules 157 owns that ending)',()=>{
 const f=indoorCareScene(159),cap=carryCap(f.w,f.elder);produce(f.w,f.elder.inv,cap,'berries',100,'staged: pack full of food');f.elder.needs.hunger=20;
 expect(planHandFeeding(f.w,f.helper,f.elder,{bread:2})).toBeNull();
 const selected=selectPrerequisite(f.w,f.helper,`give:${f.elder.id}`);
 try{for(let n=0;n<200&&f.helper.activity?.id===selected.act.id;n++)stepWorld(f.w);}finally{selected.restore();}
 expect(f.helper.lastResult?.detail).toBe(ALREADY_HAS_FOOD);
});

it('plans purely and continues exactly after saving',()=>{
 const f=careCapacityScene(159);f.elder.needs.hunger=15;const raw=serializeWorld(f.w);
 expect(planHandFeeding(f.w,f.helper,f.elder,{bread:2})).not.toBeNull();expect(serializeWorld(f.w)).toBe(raw);
 const copy=deserializeWorld(raw);for(let i=0;i<400;i++){stepWorld(f.w);stepWorld(copy);}
 expect(serializeWorld(f.w)).toBe(serializeWorld(copy));expect(conservationReport(f.w).ok).toBe(true);
});
