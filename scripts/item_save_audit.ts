// Read-only audit of retained saves after a validation/accounting vocabulary correction.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {conservationReport,totalItems} from '../src/sim/economy';
import {stepWorld} from '../src/sim/world';
const [out,...paths]=process.argv.slice(2).filter(a=>a!=='--');
if(!out||!paths.length||existsSync(out))throw new Error('Provide fresh report path and saved world paths');
const reports=paths.map(path=>{
 const raw=readFileSync(path,'utf8'),w=deserializeWorld(raw),twin=deserializeWorld(raw),tick=w.tick;
 const exactLoad=serializeWorld(w)===raw,conservation=conservationReport(w),meat={initial:w.ledger.initial.meat??0,created:w.ledger.created.meat??0,consumed:w.ledger.consumed.meat??0,spoiled:w.ledger.spoiled.meat??0,actual:totalItems(w).meat??0};
 for(let n=0;n<1200;n++){stepWorld(w);stepWorld(twin);}
 const after=serializeWorld(w),exactContinuation=after===serializeWorld(twin),exactReload=serializeWorld(deserializeWorld(after))===after,continuedConservation=conservationReport(w);
 return {path,sha256:createHash('sha256').update(raw).digest('hex'),rules:w.settings.rulesVersion,tick,continuedTicks:1200,exactLoad,exactContinuation,exactReload,meat,conservation,continuedConservation};
});
writeFileSync(out,JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>!r.exactLoad||!r.exactContinuation||!r.exactReload||!r.conservation.ok||!r.continuedConservation.ok))process.exitCode=1;
