// Ordinary worlds and customers (rules 51): asks heard and turned down for want of spare goods, the leads that made, what was
// supplied (into hands, by swap, or hauled to the customer's site), what came back, repeat customers, and the trades that read it.
// Usage: vite-node scripts/customers_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
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
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/customers_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const provenance={arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:300,observer:'activity-start hook and the personal records and logs'};
writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
const starts={supplyOffer:0,supplySwap:0,supplyWalk:0,askMaterial:0,localSwap:0};
w.hooks={onActivityStart(_p,a){
 if(a.kind==='socialize'){const conv=(a.data.conv??{}) as {customer?:number;item?:string;purpose?:string};const purpose=(a.data.purpose as string)??'';
  if(conv.customer&&purpose==='offer')starts.supplyOffer++;else if(conv.customer&&purpose==='trade')starts.supplySwap++;else if(purpose==='trade')starts.localSwap++;
  else if(purpose==='request'&&['wood','stone','goods'].includes(String((a.data.conv as {reqKind?:string})?.reqKind)))starts.askMaterial++;}
 if(a.kind==='visit'&&/^to supply /.test(a.goal))starts.supplyWalk++;
}};
const began=Date.now();let stop='horizon';
const daily:unknown[]=[];
while(w.tick<days*DAY){stepWorld(w);
 if(w.tick%DAY===0){if(!conservationReport(w).ok){stop='invariant';break;}
  const before=serializeWorld(w);
  const ps=w.persons.filter(p=>p.alive);
  daily.push({day:w.tick/DAY,alive:ps.length,leadsLive:ps.reduce((n,p)=>n+(p.customers??[]).filter(c=>!c.supplied).length,0),supplied:ps.reduce((n,p)=>n+(p.customers??[]).filter(c=>c.supplied>0).length,0),tradesFromDemand:ps.filter(p=>p.trade&&/asked me|came back/.test(p.trade.why)).length});
  if(serializeWorld(w)!==before)throw new Error('Observer mutated state');}
 if(w.tick%2400===0&&Date.now()-began>300000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const everyone=w.persons;
const leads=everyone.flatMap(p=>(p.customers??[]).map(c=>({supplier:p.id,supplierName:p.name,...c})));
const count=(re:RegExp)=>everyone.reduce((n,p)=>n+p.log.filter(l=>re.test(l.text)).length,0);
const byItem=(rows:typeof leads)=>rows.reduce<Record<string,number>>((m,c)=>{m[c.item]=(m[c.item]??0)+1;return m;},{});
const supplied=leads.filter(c=>c.supplied>0);
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:everyone.filter(p=>p.alive).length,deaths:w.deceased.length,
 materialAsksStarted:starts.askMaterial,materialAsksMade:w.requests.filter(r=>['wood','stone','goods'].includes(r.kind)).length,materialAsksByStatus:w.requests.filter(r=>['wood','stone','goods'].includes(r.kind)).reduce<Record<string,number>>((m,r)=>{m[r.status]=(m[r.status]??0)+1;return m;},{}),
 demandHeard:count(/asked me for .*; I will remember this local demand/),leadsNotedInLogs:count(/is a customer for it/),leadsNow:leads.length,declinedMaterialAsksByNote:w.requests.filter(r=>['wood','stone','goods'].includes(r.kind)&&r.status==='declined').reduce<Record<string,number>>((m,r)=>{m[r.note]=(m[r.note]??0)+1;return m;},{}),leadsByItem:byItem(leads),
 supplyOffersStarted:starts.supplyOffer,supplySwapsStarted:starts.supplySwap,supplyWalksStarted:starts.supplyWalk,
 suppliedTotal:supplied.length,suppliedByHand:supplied.filter(c=>!c.siteId&&!c.back).length,suppliedBySwap:supplied.filter(c=>!!c.back).length,suppliedAtSite:supplied.filter(c=>!!c.siteId).length,suppliedByItem:byItem(supplied),unitsSupplied:supplied.reduce((n,c)=>n+c.units,0),
 returns:supplied.filter(c=>c.back).map(c=>`${c.backUnits} ${c.back} for ${c.units} ${c.item}`),repeatCustomers:leads.filter(c=>c.repeat).length,lapsed:leads.filter(c=>c.supplied<0).length+count(/is too old now; I never had any to spare/),
 localSwapsStarted:starts.localSwap,localSwapAsks:w.requests.filter(r=>r.kind==='trade').length,localSwapAsksByNote:w.requests.filter(r=>r.kind==='trade').reduce<Record<string,number>>((m,r)=>{m[r.status+' | '+r.note]=(m[r.status+' | '+r.note]??0)+1;return m;},{}),swapEvents:w.events.filter(e=>e.kind==='trade').length,exchangeJourneys:everyone.reduce((n,p)=>n+(p.exchangeJourneys?.length??0),0),townships:(w.townships??[]).length,
 tradesNow:everyone.filter(p=>p.alive&&p.trade).length,tradesFromDemand:everyone.filter(p=>p.alive&&p.trade&&/asked me/.test(p.trade.why)).length,tradesFromReturns:everyone.filter(p=>p.alive&&p.trade&&/came back/.test(p.trade.why)).length,
 hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,leads,daily}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
