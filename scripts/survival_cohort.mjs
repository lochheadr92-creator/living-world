// Declared control/nudge cohort. Run outside the frozen source checkout.
// Existing completed draws are validated, never overwritten or silently rerun.
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,mkdirSync,createWriteStream,writeFileSync,renameSync} from 'node:fs';
import {resolve,join} from 'node:path';

const [sourceArg,outArg,rulesArg,workersArg='8']=process.argv.slice(2);
const source=resolve(sourceArg??''),out=resolve(outArg??''),rules=Number(rulesArg),workers=Number(workersArg);
if(!sourceArg||!outArg||!Number.isInteger(rules)||!Number.isInteger(workers)||workers<1||workers>12)throw Error('source output rules [workers 1..12] required');
mkdirSync(out,{recursive:true});
const draws=[];
for(const seed of ['forest','river','meadow'])for(const [fork,nudge] of [[4,0],...Array.from({length:8},(_,n)=>[4,n+1]),...[2,3,5,6].flatMap(f=>Array.from({length:4},(_,n)=>[f,n+1]))]){
 const legacy=seed==='forest'&&nudge===0&&existsSync(join(out,'forest-control'));
 draws.push({seed,fork,nudge,name:legacy?'forest-control':`${seed}-f${fork}-n${nudge}`});
}
const results=[],active=new Map();let next=0,statusFailures=0;
function validate(d){
 const dest=join(out,d.name),r=JSON.parse(readFileSync(join(dest,'report.json'),'utf8'));
 if(r.seed!==d.seed||r.fork!==d.fork||r.nudge!==d.nudge||r.tick!==60000||r.days!==25||r.settings.rulesVersion!==rules||r.settings.immigration!==true||r.settings.population!==28||r.settings.harsh!==false||r.settings.scene!=='natural'||r.settings.dynamics!=='rich'||!r.conservation.ok||r.exactSave!==true||r.continuationEqual!==true)throw Error(`Mismatched or incomplete report: ${d.name}`);
 if(createHash('sha256').update(readFileSync(join(dest,'final.json'))).digest('hex')!==r.finalSaveHash)throw Error(`Saved output hash mismatch: ${d.name}`);
 return r;
}
// Fail before launching if an earlier process still owns an incomplete directory.
for(const d of draws)if(existsSync(join(out,d.name))){validate(d);}
function status(){
 const path=join(out,'cohort-status.json'),temp=path+'.tmp';
 const state={source,rules,days:25,arrivals:true,draws,started:next,active:[...active.values()],results,statusFailures};
 // A status reader locking the old file must never terminate running simulations.
 try{writeFileSync(temp,JSON.stringify(state,null,2)+'\n');renameSync(temp,path);}catch(e){statusFailures++;console.error(`Status write deferred: ${e.message}`);}
}
async function run(d){
 const dest=join(out,d.name);
 if(existsSync(dest)){validate(d);results.push({...d,status:'retained validated',exitCode:null});status();return;}
 const stdout=createWriteStream(join(out,d.name+'.stdout.log'),{flags:'wx'}),stderr=createWriteStream(join(out,d.name+'.stderr.log'),{flags:'wx'});
 const child=spawn(process.execPath,['node_modules/vite-node/dist/cli.mjs','scripts/survival_ensemble.ts','--',d.seed,dest,String(d.fork),String(d.nudge),'25'],{cwd:source,windowsHide:true,stdio:['ignore','pipe','pipe']});
 active.set(d.name,{...d,pid:child.pid});status();child.stdout.pipe(stdout);child.stderr.pipe(stderr);
 const result=await new Promise(resolve=>{child.once('error',error=>resolve({exitCode:null,error:error.message}));child.once('close',(exitCode,signal)=>resolve({exitCode,signal}));});
 if(result.exitCode===0){try{validate(d);}catch(e){result.error=e.message;}}
 writeFileSync(join(out,d.name+'.exit.json'),JSON.stringify(result)+'\n');
 results.push({...d,status:result.exitCode===0&&!result.error?'completed':'failed',...result});active.delete(d.name);status();
}
async function worker(){while(next<draws.length){const d=draws[next++];await run(d);}}
await Promise.all(Array.from({length:workers},worker));status();
console.log(JSON.stringify({draws:results.length,failed:results.filter(r=>r.status==='failed'),statusFailures}));
if(results.some(r=>r.status==='failed'))process.exitCode=1;
