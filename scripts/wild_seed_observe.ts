// Ordinary harvest accounting: no supplied goods, decisions or knowledge.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
const [seed,out,versionArg='113',daysArg='5']=process.argv.slice(2).filter(x=>x!=='--'),version=Number(versionArg),days=Number(daysArg);
if(!seed||!out||existsSync(out)||![112,113].includes(version)||!Number.isInteger(days)||days<1||days>45)throw new Error('Seed, fresh output, rules 112/113 and 1..45 days required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),files=readdirSync('src',{recursive:true}).map(String).filter(f=>f.endsWith('.ts')).map(f=>'src/'+f).concat('scripts/wild_seed_observe.ts').sort(),manifest=()=>Object.fromEntries(files.map(f=>[f,hash(readFileSync(f,'utf8'))])),source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration:false}),rulesVersion:version}),initial=serializeWorld(w),twin=deserializeWorld(initial),began=performance.now();
const created=()=>w.ledger.reasons['+seed saved from wild grain']??0,paid=()=>w.ledger.reasons['-saved as seed']??0;
let pureChecks=0,samples=0,conversionTicks=0,unpaidConversionTicks=0,unpaidSeeds=0;const episodes:unknown[]=[];
while(w.tick<days*2400){
 if(w.tick%120===0){const before=serializeWorld(w);for(const p of w.persons)if(p.alive){generateOptions(w,p,true,true);samples++;}if(serializeWorld(w)!==before)throw new Error('Impure observer');pureChecks++;}
 const beforeCreated=created(),beforePaid=paid();stepWorld(w);stepWorld(twin);const made=created()-beforeCreated,used=paid()-beforePaid;
 if(made>0){conversionTicks++;if(made>used){unpaidConversionTicks++;unpaidSeeds+=made-used;}if(episodes.length<80)episodes.push({tick:w.tick,made,used});}
 if(w.tick%2400===0&&!conservationReport(w).ok)throw new Error('Conservation failed');
 if(w.tick%120===0&&performance.now()-began>900000)throw new Error('15-minute budget exceeded');
}
const final=serializeWorld(w);if(final!==serializeWorld(twin)||final!==serializeWorld(deserializeWorld(final)))throw new Error('Twin/reload mismatch');if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),seed,settings:w.settings,source,initialHash:hash(initial),tick:w.tick,seconds:(performance.now()-began)/1000,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased,samples,pureChecks,conversionTicks,unpaidConversionTicks,unpaidSeeds,seedProduced:created(),grainConsumedForSeed:paid(),episodes,continuationEqual:true,conservation:conservationReport(w),limits:'Fixed ordinary window. No inserted resources or decisions. Ledger reasons belong only to this grain-to-seed branch. Per-tick net excess is a lower bound if multiple people convert during the same tick; full totals are also retained. Divergent versions are not matched opportunities or an aggregate welfare comparison. General per-item conservation alone does not prove transformation inputs.'};
mkdirSync(out,{recursive:true});writeFileSync(out+'/report.json',JSON.stringify(report,null,2));writeFileSync(out+'/final.json',final);console.log(JSON.stringify({...report,source:undefined,episodes:undefined,conservation:report.conservation.ok}));
