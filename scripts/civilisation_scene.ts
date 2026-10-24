// Labelled contract demonstration: lawful offered-option selection, not seeded emergence.
import { civicFixture, civicTalk } from '../tests/helpers/civic';
import { setExternalController } from '../src/sim/external';
import { stepWorld } from '../src/sim/world';
import { serializeWorld } from '../src/app/save';
import { conservationReport } from '../src/sim/economy';
import { writeFileSync, mkdirSync } from 'node:fs';
const {w,a,b,site}=civicFixture();w.sceneLabel='STAGED CONTRACT: voluntary township storehouse';
civicTalk(w,a,b,site.id);mkdirSync('civic_evidence',{recursive:true});
writeFileSync('civic_evidence/staged-active.json',serializeWorld(w));
const restore=setExternalController({controls:()=>true,choose:(_w,_p,_ctx,ranked)=>{
 const o=ranked.find(o=>o.targetId===site.id&&(o.kind==='haul'||o.kind==='build'));
 return o?{kind:'pick',key:o.key}:{kind:'fallback',reason:'no project step offered'};
}});
try {for(let i=0;i<5000&&w.civicProjects![0].status==='active';i++)stepWorld(w);}finally{restore();}
writeFileSync('civic_evidence/staged-completed.json',serializeWorld(w));
const result={label:w.sceneLabel,tick:w.tick,project:w.civicProjects![0],ledger:conservationReport(w)};
writeFileSync('civic_evidence/staged-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(result.project.status!=='completed'||!result.ledger.ok)process.exitCode=1;
