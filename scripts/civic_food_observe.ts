// Ordinary worlds, public food and civic memory: meals taken from public storehouses, who had witnessed the storehouse finished,
// and the receipts those meals earned (rules 49). Transfer hook, consumption hook by ledger delta, and the people's own records.
// Usage: vite-node scripts/civic_food_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {parseIntervention} from './lab/lab';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/civic_food_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
writeFileSync(`${out}/provenance.json`,JSON.stringify({arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:240,observer:'transfer and activity hooks, personal civic records'},null,2));
const meals:unknown[]=[];let publicMealStarts=0,publicWithdrawals=0;const unitsFromPublic:Record<string,number>={};
const isPublicStore=(id:number)=>{const b=w.byId.get(id);return !!b&&b.ent==='building'&&b.type==='storehouse'&&b.hhId===0;};
w.hooks={onActivityStart(p,a){if(a.kind==='eat_store'&&isPublicStore(a.targetId))publicMealStarts++;if(a.kind==='withdraw'&&isPublicStore(a.targetId))publicWithdrawals++;},
 onTransfer(t){if(t.reason!=='eat from store'||!t.from.startsWith('building:'))return;const id=Number(t.from.slice(9));if(!isPublicStore(id))return;unitsFromPublic[t.item]=(unitsFromPublic[t.item]??0)+t.n;const p=w.persons.find(q=>'person:'+q.id===t.to);
  meals.push({tick:w.tick,person:p?.id,name:p?.name,item:t.item,n:t.n,witnessed:!!p?.civicOutcomes?.some(m=>m.success&&m.buildingId===id)});}};
const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);if(w.tick%DAY===0&&!conservationReport(w).ok){stop='invariant';break;}if(w.tick%2400===0&&Date.now()-began>240000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const receipts=w.persons.flatMap(p=>(p.civicOutcomes??[]).filter(m=>m.benefit).map(m=>({person:p.id,name:p.name,projectId:m.projectId,organiserId:m.organiserId,item:m.benefit!.item,amount:m.benefit!.amount,tick:m.benefit!.tick,ate:p.log.some(l=>/helped me: I ate/.test(l.text)&&l.tick===m.benefit!.tick)})));
const witnesses=w.persons.filter(p=>(p.civicOutcomes??[]).some(m=>m.success&&m.buildingId)).length;
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,
 publicStorehouses:w.buildings.filter(b=>b.type==='storehouse'&&b.hhId===0).length,projects:(w.civicProjects??[]).map(q=>q.status),witnessesWithBuilding:witnesses,publicMealStarts,publicWithdrawals,unitsFromPublic,mealsByWitness:meals.filter((m:any)=>m.witnessed).length,mealsTotal:meals.length,
 receipts:receipts.length,receiptsByMeal:receipts.filter(r=>r.ate).length,receiptsByWithdrawal:receipts.filter(r=>!r.ate).length,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,meals,receipts}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
