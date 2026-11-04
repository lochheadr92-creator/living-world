// REVIEW D (knowledge boundaries): optutil.ts makeCtx builds `ctx.dependents` from live household health (people.ts isDependent),
// so an adult member hurt out of sight becomes a dependant in every option that counts dependants.
// STAGED: Ada and Ben share a household; Ben is 20 tiles away, out of sight. Only Ben's health is declared.
import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {makeCtx} from '../src/sim/optutil';
import {generateOptions} from '../src/sim/decision';

function scene(){
 const s=stage('review-d-dependents'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:35,inv:{berries:2},hunger:50,thirst:95,energy:95});
 const ben=addPerson(s,'Ben',60,40,{age:30,hh:ada.hhId,hunger:95,thirst:95,energy:95});
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(false);
 expect(ada.whereabouts[ben.id]).toBeUndefined(); // she has never seen him at all in this scene
 return {w,ada,ben};
}

it('optutil.ts:156 — a household adult who is hurt out of sight becomes a dependant the carer was never able to see',()=>{
 const f=scene();
 expect(makeCtx(f.w,f.ada,true,true).dependents).toEqual([]);
 f.ben.health=30;
 expect(makeCtx(f.w,f.ada,true,true).dependents.map(d=>d.id)).toEqual([f.ben.id]);
});

it('options_survival.ts:269 — and the carer then keeps her own two berries for him instead of eating, on health she has not seen',()=>{
 const f=scene();
 const fed=generateOptions(f.w,f.ada,true,true);
 expect(fed.options.find(o=>o.kind==='eat')?.label).toBe('Eat what I am carrying');
 f.ben.health=30; // hurt 20 tiles away; nobody saw it, nobody told her
 const starving=generateOptions(f.w,f.ada,true,true);
 expect(starving.options.find(o=>o.kind==='eat')).toBeUndefined();
 expect(starving.blocked.find(b=>b.blocked==='saving the food for dependents')).toBeDefined();
});
