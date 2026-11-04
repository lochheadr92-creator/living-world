// REVIEW D (knowledge boundaries): options_work.ts optClaimHome checks the true owner of a remembered empty home before offering
// the move, despite its own comment "belief only; checked in reality on arrival".
// STAGED: Ada has no home and remembers an empty hut 12 tiles away (out of her sight radius of 9). Only the hut's owner is declared.
import {expect,it} from 'vitest';
import {stage,addPerson,building,done,pin,learn} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';

it('options_work.ts:1862 - the option to move into a remembered empty hut disappears when somebody else claims it out of sight',()=>{
 const s=stage('review-d-claim'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:35,hunger:95,thirst:95,energy:95});
 const cass=addPerson(s,'Cass',80,70,{age:40,hunger:95,thirst:95,energy:95}); // another household, far away
 const hut=building(s,'hut',52,40,0); // an empty hut that is nobody's
 done(s);for(const p of [ada,cass]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 learn(w,ada,hut); // she saw it empty
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.beliefs[hut.id]?.hh).toBe(0);
 expect(generateOptions(w,ada,true,true).options.find(o=>o.key===`claim_home:${hut.id}`)?.label).toBe('Move into the empty hut');
 // Cass's household takes the hut, 12 tiles from Ada: she does not see it and her belief still says it is nobody's
 hut.hhId=cass.hhId;
 expect(ada.beliefs[hut.id]?.hh).toBe(0);
 const ctx=generateOptions(w,ada,true,true);
 // LEAK: the option is gone on the true owner; by her own knowledge she should set out and find it taken on arrival
 expect(ctx.options.find(o=>o.key===`claim_home:${hut.id}`)).toBeUndefined();
 expect(ctx.blocked.find(b=>b.targetId===hut.id)).toBeUndefined();
});
