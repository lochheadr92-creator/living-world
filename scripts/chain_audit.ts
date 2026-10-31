// Ordinary worlds, the production tree from want to use: which intermediate goods anyone wants, what blocks the step that
// would make them, what each workshop produced, what sat on shelves, what was consumed downstream, and what the ground still
// holds. Pure samples and the ledger; nobody is controlled.
// Usage: vite-node scripts/chain_audit.ts <out> <meadow|river|forest> [days] [arrivals|none] [rulesVersion|current] [arm]
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {DAY} from '../src/sim/constants';
import {generateOptions} from '../src/sim/decision';
import {demandsOf} from '../src/sim/production';
import {conservationReport} from '../src/sim/economy';
import {stageOf} from '../src/sim/people';
import {parseIntervention} from './lab/lab';
import type {ItemKind} from '../src/sim/types';
import {gitProvenance,sourceManifest} from './observers/provenance';
const [out,seed,daysArg,arrivalsArg,versionArg,armArg]=process.argv.slice(2),days=Number(daysArg??30),immigration=arrivalsArg==='arrivals',version=versionArg&&versionArg!=='current'?Number(versionArg):undefined,arm=armArg??'';
if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed)||!Number.isInteger(days)||days<1||days>90)throw new Error('Fresh output, registered seed and 1-90 days required');
if(arm)parseIntervention(arm).install!();
mkdirSync(out,{recursive:true});
const paths=readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p).concat(['scripts/chain_audit.ts']).sort();
const manifest=()=>sourceManifest(paths);const source=manifest();
const w=createWorld({...currentWorldSettings('normal',seed,{immigration}),...(version?{rulesVersion:version}:{})});
const initialGround:Record<string,number>={};for(const s of w.sources){initialGround[s.type]=(initialGround[s.type]??0)+s.amount;}
writeFileSync(`${out}/provenance.json`,JSON.stringify({arm:arm||'current',...gitProvenance(),source,settings:w.settings,days,budgetSeconds:300,observer:'pure 240-tick samples of demands and blocked reasons, facility records, ledger'},null,2));
const CHAIN_ITEMS:ItemKind[]=['planks','handles','bricks','jar','charcoal','iron','flour','bread','ore','clay','stone','wood','cart' as ItemKind];
const wants:Record<string,number>={},wantsPeople:Record<string,Set<number>>={},blocked:Record<string,number>={},blockedBy:Record<string,Record<string,number>>={},toolWanted:Record<string,number>={},techniqueWanted=0;let techWanted=0;
const samples:unknown[]=[];const firstBuilt:Record<string,number>={};const firstSite:Record<string,number>={};const began=Date.now();let stop='horizon';
const plans=new Map<number,{person:number;name:string;makes:string;forSite:number;status:string;reason:string;since:number;ended?:number}>();
const classify=(why:string)=>/does not know of a/.test(why)?'no workshop known':/busy with/.test(why)?'workshop busy':/needs a .* and has none/.test(why)?'tool missing':/technique|does not know how|never learned|nobody.*taught/i.test(why)?'technique':/worked out/.test(why)?'deposit worked out':/too run down/.test(why)?'run down':/tried recently/.test(why)?'recent failure':/no .* to be had|knows no|does not know where/.test(why)?'no source known':why.slice(0,40);
while(w.tick<days*DAY){stepWorld(w);
 for(const b of w.buildings)if(firstBuilt[b.type]===undefined)firstBuilt[b.type]=+(b.builtTick/DAY).toFixed(1);
 for(const p of w.persons)for(const i of p.intentions){if(i.kind!=='batch')continue;const rec=plans.get(i.id);if(!rec)plans.set(i.id,{person:p.id,name:p.name,makes:i.makes,forSite:i.forSite??0,status:i.status,reason:i.reason,since:i.since});else{rec.status=i.status;rec.reason=i.reason;if(i.status!=='active'&&!rec.ended)rec.ended=w.tick;}}
 for(const s of w.sites)if(firstSite[s.type]===undefined)firstSite[s.type]=+(w.tick/DAY).toFixed(1);
 if(w.tick%240===0){const before=serializeWorld(w);const sample:Record<string,number>={tick:w.tick};
  for(const p of w.persons.filter(p=>p.alive&&stageOf(w,p)!=='child')){const ctx=generateOptions(w,p,true,true);
   for(const d of demandsOf(ctx)){const k=String(d.item);wants[k]=(wants[k]??0)+1;(wantsPeople[k]??=new Set()).add(p.id);sample['want:'+k]=(sample['want:'+k]??0)+1;}
   for(const o of ctx.blocked){if(o.kind!=='operate'&&o.kind!=='gather'&&o.kind!=='withdraw')continue;const key=`${o.kind}:${o.label}`;blocked[key]=(blocked[key]??0)+1;const c=classify(o.blocked??'');(blockedBy[key]??={})[c]=(blockedBy[key][c]??0)+1;}
   if(ctx.toolWanted){const k=ctx.toolWanted.kind;toolWanted[k]=(toolWanted[k]??0)+1;}
   if(ctx.techniqueWanted)techWanted++;}
  samples.push(sample);if(serializeWorld(w)!==before){writeFileSync(`${out}/failure.json`,JSON.stringify({tick:w.tick,reason:'observer mutated state'}));throw new Error(`Observer mutated state at tick ${w.tick}`);}
  if(Date.now()-began>300000){stop='budget';break;}}
 if(w.tick%DAY===0&&!conservationReport(w).ok){stop='invariant';break;}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during run');
const ground:Record<string,number>={};for(const s of w.sources){ground[s.type]=(ground[s.type]??0)+s.amount;}
const facilities=w.buildings.filter(b=>b.ops).map(b=>({type:b.type,hh:b.hhId,built:+(b.builtTick/DAY).toFixed(1),cond:Math.round(b.condition),produced:b.ops!.produced,shelf:b.store.items,job:b.ops!.job,tended:b.ops!.tended}));
const sites=w.sites.map(s=>({type:s.type,hh:s.hhId,age:+((w.tick-s.createdTick)/DAY).toFixed(1),work:Math.round(100*s.work/s.workTotal),required:s.required,delivered:s.delivered,used:s.used}));
const tools:Record<string,number>={};for(const t of w.tools)tools[t.kind+(t.tier?'*':'')]=(tools[t.kind+(t.tier?'*':'')]??0)+1;
const L=w.ledger;const pick=(o:Record<string,number|undefined>)=>Object.fromEntries(CHAIN_ITEMS.map(k=>[k,o[k]??0]));
const report={seed,days,immigration,arm:arm||'current',rulesVersion:w.settings.rulesVersion,tick:w.tick,stop,seconds:(Date.now()-began)/1000,alive:w.persons.filter(p=>p.alive).length,deaths:w.deceased.length,
 firstSite,firstBuilt,wantsSampled:wants,wantsPeople:Object.fromEntries(Object.entries(wantsPeople).map(([k,v])=>[k,v.size])),toolWanted,techniqueWanted:techWanted,blockedTop:Object.entries(blocked).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,n])=>({step:k,samples:n,why:blockedBy[k]})),
 created:pick(L.created as Record<string,number>),consumed:pick(L.consumed as Record<string,number>),spoiled:pick(L.spoiled as Record<string,number>),reasons:Object.fromEntries(Object.entries(L.reasons).filter(([k])=>/plank|handle|brick|charcoal|iron|flour|bread|jar|cart|construction|smelt|forg|quarr|saw|hew|fire|slag/i.test(k))),
 batchPlans:{adopted:plans.size,byItem:[...plans.values()].reduce((m:Record<string,number>,q)=>{m[q.makes]=(m[q.makes]??0)+1;return m;},{}),done:[...plans.values()].filter(q=>q.status==='done').length,dropped:[...plans.values()].filter(q=>q.status==='dropped').length,active:[...plans.values()].filter(q=>q.status==='active').length,doneByItem:[...plans.values()].filter(q=>q.status==='done').reduce((m:Record<string,number>,q)=>{m[q.makes]=(m[q.makes]??0)+1;return m;},{}),dropReasons:[...plans.values()].filter(q=>q.status==='dropped').reduce((m:Record<string,number>,q)=>{const k=q.reason.replace(/\d+/g,'N').slice(0,70);m[k]=(m[k]??0)+1;return m;},{})},
 facilities,sites,tools,carts:w.carts.length,groundInitial:initialGround,groundNow:ground,charcoalHolders:w.persons.filter(p=>p.alive&&p.techniques?.charcoal).length,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,samples,plans:[...plans.values()]}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,facilities:report.facilities.map(f=>`${f.type}@${f.built}:${JSON.stringify(f.produced)}`),sites:report.sites.map(s=>`${s.type}:${s.work}%`),blockedTop:undefined}));if(stop!=='horizon')process.exitCode=1;
void techniqueWanted;
