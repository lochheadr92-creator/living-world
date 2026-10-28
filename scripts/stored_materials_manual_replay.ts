// Verify evidence exported AFTER offered choices in the actual rendered manual panel.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { runReplay } from '../src/agent/run';
import { hashWorld } from '../src/sim/world';
import { conservationReport } from '../src/sim/economy';
import type { Transcript } from '../src/agent/transcript';
const [file,out]=process.argv.slice(2);
if(!file||!out||existsSync(out))throw new Error('Downloaded bundle and fresh output required');
const raw=readFileSync(file,'utf8');
const b=JSON.parse(raw) as {staged:boolean;actor:string;startPath:string;start:string;final:string;transcript:Transcript};
if(!b.staged||!b.transcript?.end)throw new Error('Stop the manual run before exporting its bundle');
mkdirSync(out,{recursive:true});
const r=runReplay(deserializeWorld(b.start),b.transcript),final=serializeWorld(r.world);
const p=r.world.persons.find(p=>p.id===b.transcript.header.personId)!;
const report={staged:true,externalModel:false,actor:b.actor,startPath:b.startPath,protocol:b.transcript.header.protocol,
  observationVersion:b.transcript.header.observationVersion,tick:r.world.tick,browserHash:b.transcript.end.hash,replayHash:hashWorld(r.world),
  fullSerializedEqual:final===b.final,applied:b.transcript.end.applied,rejected:b.transcript.end.rejected,
  outcomes:b.transcript.outcomes,requests:r.world.requests.filter(q=>q.from===p.id||q.to===p.id),
  inventory:p.inv,plans:p.intentions,commitments:p.commitments,relations:p.relations,socialMemory:p.socialMemory,
  tools:r.world.tools.filter(t=>t.holder===p.id),conservation:conservationReport(r.world)};
for(const [name,data]of Object.entries({bundle:raw,start:b.start,'browser-final':b.final,'replay-final':final,transcript:b.transcript,report}))
  writeFileSync(`${out}/${name}.json`,typeof data==='string'?data:JSON.stringify(data,null,2));
console.log(JSON.stringify(report));
if(!report.fullSerializedEqual||report.browserHash!==report.replayHash||!report.conservation.ok||report.rejected)process.exitCode=1;
