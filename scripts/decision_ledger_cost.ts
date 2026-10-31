// Cost of the rules-103 decision ledger: tick time and serialized size on the same river world at rules 102 and 103.
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
const [ticksArg='2400']=process.argv.slice(2).filter(a=>a!=='--'),ticks=Number(ticksArg);
const out:Record<string,unknown>={};
for(const version of [102,103]){
 const w=createWorld({...currentWorldSettings('normal','river',{immigration:false}),rulesVersion:version});
 const t0=performance.now();for(let n=0;n<ticks;n++)stepWorld(w);const ms=(performance.now()-t0)/ticks;
 const bytes=Buffer.byteLength(serializeWorld(w)),entries=w.persons.reduce((n,p)=>n+(p.decisions?.length??0),0),dropped=w.persons.reduce((n,p)=>n+(p.decisionsDropped??0),0);
 out[String(version)]={msPerTick:+ms.toFixed(4),serializedBytes:bytes,ledgerEntries:entries,dropped};
}
console.log(JSON.stringify({ticks,...out,note:'single run each on a shared container; timing is indicative only'}));
