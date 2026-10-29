// Reconstruct a bounded portion of an already observed ordinary run. No controller,
// action selection, supplies, position, relationships or knowledge are changed.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {stepWorld,hashWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
const [file,out,idArg,endArg]=process.argv.slice(2),id=Number(idArg),end=Number(endArg);
if(!file||!out||existsSync(out))throw new Error('Recorded input and fresh output required');
const input=readFileSync(file,'utf8'),w=deserializeWorld(input),p=w.persons.find(p=>p.id===id);
if(!p||!Number.isInteger(end)||end<=w.tick||end-w.tick>3*DAY||w.sceneLabel.startsWith('STAGED'))throw new Error('Ordinary checkpoint, existing person and at most three days required');
mkdirSync(out,{recursive:true});
writeFileSync(`${out}/start.json`,input);
const actions:unknown[]=[],production:unknown[]=[];let savedLearned=false;
w.hooks={onActivityStart(who,a){if(who.id===id&&(a.kind==='operate'||a.data.purpose==='learn_technique'))actions.push({tick:w.tick,id:a.id,label:a.label,kind:a.kind,target:a.targetId,data:JSON.parse(JSON.stringify(a.data))});}};
const started=Date.now();
while(w.tick<end){
 const before=w.ledger.created.charcoal??0,executingTick=w.tick;
 stepWorld(w);
 if(!savedLearned&&p.techniques?.charcoal?.source==='taught'){
  writeFileSync(`${out}/learned.json`,serializeWorld(w));savedLearned=true;
 }
 const made=(w.ledger.created.charcoal??0)-before;
 if(made>0)production.push(JSON.parse(JSON.stringify({tick:executingTick,charcoal:made,events:w.events.filter(e=>e.tick===executingTick),kilns:w.buildings.filter(b=>b.type==='kiln').map(b=>({id:b.id,store:b.store,ops:b.ops}))})));
 if(Date.now()-started>180000)throw new Error('Trace budget reached');
}
const report={staged:false,controlled:false,input:file,inputSha256:createHash('sha256').update(input).digest('hex'),person:id,name:p.name,tick:w.tick,techniques:p.techniques,actions,production,conservation:conservationReport(w),hash:hashWorld(w)};
writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({name:p.name,tick:w.tick,techniques:p.techniques,actions,productionTicks:production.length,conservation:report.conservation,hash:report.hash}));
if(!report.conservation.ok)process.exitCode=1;
