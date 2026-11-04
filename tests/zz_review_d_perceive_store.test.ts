// REVIEW D (knowledge boundaries): perception.ts observes a building from outside with its full store contents (knowledge.ts
// snapshotEntity copies store.items), so walls hide people but not stores.
// STAGED: Ada stands 4 tiles from Ben's hut, outdoors. Only the hut's stock is declared.
import {expect,it} from 'vitest';
import {stage,addPerson,building,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';

it('perception.ts:137-142 / knowledge.ts:47 - a passer-by learns the exact contents of a neighbour household hut from outside',()=>{
 const s=stage('review-d-perceive'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:35,hunger:95,thirst:95,energy:95});
 const ben=addPerson(s,'Ben',80,70,{age:30,hunger:95,thirst:95,energy:95});
 const hut=building(s,'hut',44,40,ben.hhId,{grain:7,bread:2});
 done(s);for(const p of [ada,ben]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);
 expect(ada.indoors).toBeFalsy();
 perceive(w,ada);
 expect(ada.beliefs[hut.id]?.hh).toBe(ben.hhId);
 expect(ada.beliefs[hut.id]?.items).toEqual({grain:7,bread:2});
 // and a change inside while she stands outside is seen at the next look, with no door opened
 hut.store.items.grain=1;
 perceive(w,ada);
 expect(ada.beliefs[hut.id]?.items?.grain).toBe(1);
});
