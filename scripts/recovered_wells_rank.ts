import {readFileSync} from 'node:fs';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
const w=deserializeWorld(readFileSync('review_evidence/retired-recovery-20261104/wells-meadow-final.json','utf8'));
let samples=0;
for(let i=0;i<3000&&samples<8;i++){
 stepWorld(w);if(i%20)continue;
 for(const p of w.persons){if(!p.alive)continue;const c=generateOptions(w,p,true,true),well=c.options.find(o=>o.key==='plan_site:well');if(!well)continue;
 const ranked=rankOptions(c);const scratch=deserializeWorld(serializeWorld(w)),sp=scratch.persons.find(q=>q.id===p.id)!;const so=generateOptions(scratch,sp,true,true).options.find(o=>o.key==='plan_site:well'),a=so?.make?.();console.log(JSON.stringify({planned:a?{data:a.data,phase:a.phase,spotX:a.spotX,spotY:a.spotY}:null,failed:Object.entries(sp.failures).filter(([k])=>Number(k)<0),tick:w.tick,name:p.name,current:p.activity?.label,well:well.util,rank:ranked.indexOf(well),top:ranked.slice(0,5).map(o=>({key:o.key,util:o.util,parts:o.parts})),blocked:c.blocked.filter(o=>o.key===well.key).map(o=>o.blocked)}));samples++;}
}
