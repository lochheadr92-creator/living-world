import {writeFileSync} from 'node:fs';
import {techniqueFixture} from '../tests/helpers/technique';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
const rows=[];
for(const seed of ['technique-contract','technique-contact-2','technique-contact-3']){
 const f=techniqueFixture(seed);const c=f.reachLesson();if(c?.lesson?.outcome!=='learning')throw new Error(seed+': no accepted lesson');
 const saved=serializeWorld(f.w);
 for(const arm of ['control','nudge:1','nudge:2','isolation']){
  const w=deserializeWorld(saved),b=w.persons.find(p=>p.id===f.b.id)!;
  if(arm.startsWith('nudge'))for(let i=0;i<Number(arm.split(':')[1]);i++)w.rng.next();
  if(arm==='isolation')b.x=70;
  for(let i=0;i<240;i++)stepWorld(w);
  const ledger=conservationReport(w);if(!ledger.ok)throw new Error('unbalanced');
  rows.push({seed,arm,learned:!!b.techniques?.charcoal,provenance:b.techniques?.charcoal??null,lesson:b.lastInteraction,kilnSkill:b.skills.kiln,ledger});
 }
}
writeFileSync('civic_evidence/technique-contact.json',JSON.stringify({contract:'Accepted-lesson contact necessity; staged, not emergence',ticks:240,rows},null,2));
console.log(JSON.stringify(rows.map(r=>({seed:r.seed,arm:r.arm,learned:r.learned,outcome:r.lesson?.outcome}))));
