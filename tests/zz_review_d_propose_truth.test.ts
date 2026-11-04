// REVIEW D (knowledge boundaries): options_social.ts optPropose reads the other person's private affinity toward the proposer
// (`q.relations[p.id]`) before offering a proposal. STAGED: Ada and a neighbour in sight; only his private affinity is declared.
import {expect,it} from 'vitest';
import {stage,addPerson,done,pin} from './helpers/kit';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions} from '../src/sim/decision';
import {relOf,spark} from '../src/sim/relations';
import type {Person} from '../src/sim/types';

it('options_social.ts:577-580 - whether Ada proposes depends on what the other person privately feels about her',()=>{
 const s=stage('review-d-propose'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=115;
 const ada=addPerson(s,'Ada',40,40,{age:30,sex:'f',hunger:95,thirst:95,energy:95,traits:{sociability:0.8}});
 // the mutual spark is a seeded hash of the pair's ids: add candidates until one sparks, parking the rest far away
 let ben=addPerson(s,'Ben',45,40,{age:32,sex:'m',hunger:95,thirst:95,energy:95});
 const others:Person[]=[];
 for(let n=0;n<24&&!spark(ada,ben);n++){others.push(ben);ben=addPerson(s,'Cand'+n,45,40,{age:32,sex:'m',hunger:95,thirst:95,energy:95});}
 expect(spark(ada,ben)).toBe(true);
 for(const q of others){q.x=90;q.y=70;}
 done(s);for(const p of [ada,ben,...others]){pin(p);p.needs.warmth=100;p.needs.safety=100;}
 rebuildMobileGrid(w);perceive(w,ada);
 expect(ada.seen.some(x=>x.id===ben.id)).toBe(true);
 Object.assign(relOf(ada,ben.id),{affinity:40,trust:30,familiarity:20});
 const key=`socialize:${ben.id}:propose`;
 relOf(ben,ada.id).affinity=10; // he is lukewarm: nothing she can see
 expect(generateOptions(w,ada,true,true).options.find(o=>o.key===key)).toBeUndefined();
 relOf(ben,ada.id).affinity=30; // he warms to her, privately
 // LEAK: her option appears on his private figure; nothing about him in her sight or memory changed
 expect(generateOptions(w,ada,true,true).options.find(o=>o.key===key)?.label).toBe(`Ask ${ben.name} to move in together`);
});
