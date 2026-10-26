// Offline explanation of a captured refusal; never steps or changes the natural run.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { preservesAccess } from '../src/sim/construction_access';

const root=process.argv[2];
if(!root)throw new Error('Supply the recorded journey directory');
const bytes=readFileSync(`${root}/layout-failure.json.gz`);
const save=gunzipSync(bytes).toString('utf8');
const w=deserializeWorld(save);
const x=47,y=37,width=2,height=2; // Captured hut footprint in activities.json.gz.
const occupants=w.persons.filter(p=>p.alive&&!p.indoors&&Math.floor(p.x)>=x&&Math.floor(p.x)<x+width&&Math.floor(p.y)>=y&&Math.floor(p.y)<y+height);
const before=serializeWorld(w);
const actual=preservesAccess(w,x,y,width,height);
if(serializeWorld(w)!==before)throw new Error('Access diagnostic mutated the recorded world');
const counterfactual=deserializeWorld(save);
counterfactual.persons=counterfactual.persons.filter(p=>!occupants.some(q=>q.id===p.id));
const withoutOccupants=preservesAccess(counterfactual,x,y,width,height);
const result={snapshotSha256:createHash('sha256').update(bytes).digest('hex'),tick:w.tick,footprint:{x,y,width,height},
  occupants:occupants.map(p=>({id:p.id,name:p.name,x:p.x,y:p.y})),accessAccepted:actual,accessAcceptedWithoutFootprintOccupants:withoutOccupants,
  scope:'Offline function-level counterfactual only: exclude recorded footprint occupants from the check on a fresh deserialized copy, without advancing any ticks. No person was removed or commanded in the natural run. This isolates a refusal condition, not the benefit or correctness of relaxing it.'};
writeFileSync(`${root}/layout-diagnostic.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
