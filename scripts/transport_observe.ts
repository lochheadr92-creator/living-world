// Ordinary worlds and transport (rules 55): who carries materials to sites on foot and how much, who comes to want a cart and on
// which ground (known site deficits, or what they carried), what blocks the cart's making, carts that exist, cart trips started by
// destination (site, home store, workshop, recovery), and what the trips moved.
// Usage: vite-node scripts/transport_observe.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {conservationReport} from '../src/sim/economy';
import {stageOf} from '../src/sim/people';
import {generateOptions} from '../src/sim/decision';
import {demandsOf} from '../src/sim/production';
import {HAUL_WINDOW,cartExperience} from '../src/sim/transport';
import {parseIntervention} from './lab/lab';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>60)throw new Error('Fresh output, registered seed and 1-60 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/transport_observe.ts']).sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const provenance={arm:arm||'current',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,settings:w.settings,days,budgetSeconds:300,observer:'activity-start hook; 240-tick samples of adults (serialized before and after): hauling records, cart demands by ground, cart-making blockers'};
writeFileSync(`${out}/provenance.json`,JSON.stringify(provenance,null,2));
const starts:Record<string,number>={};const trips:{by:number;day:number;kind:string;to:number;items:unknown}[]=[];
w.hooks={onActivityStart(p,a){if(a.kind==='haul')starts.footHaul=(starts.footHaul??0)+1;if(a.kind==='cart_haul'){const kind=a.data.recover?'recover':a.data.transport?(w.byId.get(a.data.toId as number)?.ent==='building'&&w.households.some(h=>h.homeId===a.data.toId)?'home':'workshop'):'site';starts['cart:'+kind]=(starts['cart:'+kind]??0)+1;trips.push({by:p.id,day:Math.round(w.tick/DAY*10)/10,kind,to:a.data.toId as number,items:a.data.items});}}};
const samples={adults:0,withHauling:0,withExperience:0,wantCartDeficit:0,wantCartExperience:0,cartBlocked:0};const blockers:Record<string,number>={};const experienced=new Set<number>(),wanters=new Set<number>();
const daily:unknown[]=[];const began=Date.now();let stop='horizon';
while(w.tick<days*DAY){stepWorld(w);
 if(w.tick%240===0){const before=serializeWorld(w);
  for(const p of w.persons){if(!p.alive||stageOf(w,p)!=='adult')continue;samples.adults++;
   if(p.hauling&&w.tick-p.hauling.since<=HAUL_WINDOW)samples.withHauling++;
   const ctx=generateOptions(w,p,true,true);
   if(cartExperience(ctx)){samples.withExperience++;experienced.add(p.id);}
   for(const d of demandsOf(ctx))if(d.item==='cart'){wanters.add(p.id);if(/after carrying/.test(d.why))samples.wantCartExperience++;else samples.wantCartDeficit++;}
   for(const b of ctx.blocked)if(/handcart/i.test(b.label)){samples.cartBlocked++;const why=(b.blocked??'').replace(/\d+/g,'N');blockers[why]=(blockers[why]??0)+1;}}
  if(serializeWorld(w)!==before)throw new Error('Observer mutated state');}
 if(w.tick%DAY===0){if(!conservationReport(w).ok){stop='invariant';break;}
  daily.push({day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,carts:w.carts.length,loadedCarts:w.carts.filter(c=>Object.values(c.load).some(n=>(n??0)>0)).length,withHauling:w.persons.filter(p=>p.alive&&p.hauling).length});}
 if(w.tick%2400===0&&Date.now()-began>300000){stop='budget';break;}}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const count=(re:RegExp)=>w.persons.reduce((n,p)=>n+p.log.filter(l=>re.test(l.text)).length,0);
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,
 samples,blockers,peopleEverExperienced:experienced.size,peopleEverWantingCart:wanters.size,starts,trips,carts:w.carts.map(c=>({id:c.id,ownerHh:c.ownerHh,load:c.load,wear:c.wear})),
 haulLogs:count(/^Delivered .* to the building site\.$/),cartHaulLogs:count(/^Hauled a load by handcart\.$/),leftLoaded:count(/^Left the loaded cart/),
 hauling:w.persons.filter(p=>p.hauling).map(p=>({name:p.name,alive:p.alive,...p.hauling!,perTrip:Math.round(p.hauling!.weight/p.hauling!.trips*10)/10})),
 hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,daily}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify(report));if(stop!=='horizon')process.exitCode=1;
