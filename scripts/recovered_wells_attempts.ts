import {readFileSync} from 'node:fs';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
const w=deserializeWorld(readFileSync('review_evidence/retired-recovery-20261104/wells-meadow-final.json','utf8'));
let attempts=0;
w.hooks={onActivityStart:(p,a)=>{if(a.data.type==='well')console.log(JSON.stringify({start:w.tick,person:p.name,data:a.data}));},onActivityEnd:(p,a,outcome,detail)=>{if(a.data.type==='well')console.log(JSON.stringify({end:w.tick,person:p.name,outcome,detail,data:a.data}));}};
for(let i=0;i<6000;i++)stepWorld(w);
console.log(JSON.stringify({sites:w.sites.filter(s=>s.type==='well'),buildings:w.buildings.filter(b=>b.type==='well'),failures:w.persons.map(p=>({name:p.name,failures:Object.entries(p.failures).filter(([k])=>Number(k)<0)})).filter(p=>p.failures.length)}));
