// Preregistered ordinary occurrence; observer samples never choose or change actions.
import {existsSync,mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {DAY} from '../src/sim/constants';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {generateOptions} from '../src/sim/decision';
import {rememberedMaterialStores} from '../src/sim/material_stock';
import {parseIntervention} from './lab/lab';
import type {Request,ItemKind} from '../src/sim/types';

const [out,seed]=process.argv.slice(2);if(!out||existsSync(out)||!['meadow','river','forest'].includes(seed))throw new Error('Fresh output and registered seed required');
mkdirSync(out,{recursive:true});
const paths=[...readdirSync('src',{recursive:true}).map(String).filter(p=>p.endsWith('.ts')).map(p=>'src/'+p),'scripts/stored_materials_observe.ts','scripts/lab/lab.ts'].sort();
const manifest=()=>Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
const source=manifest();
writeFileSync(`${out}/provenance.json`,JSON.stringify({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,seed,profile:'normal',days:6,immigration:false,budgetSeconds:180,stop:'day 6, invariant failure, or budget; no tuning'},null,2));
const w=createWorld(currentWorldSettings('normal',seed,{immigration:false}));
const selections:any[]=[],transfers:any[]=[],requests=new Map<number,Request>(),daily:any[]=[],samples:any[]=[],consequences:any[]=[];
const finished=new Set<number>(),usedTools=new Set<number>(),knownRequestStatus=new Map<number,string>();
let samplePersons=0,stockKnowledgeSamples=0,eligibleOptionSamples=0;
w.hooks={onActivityStart(p,a){
  if(!a.data.materialStock)return;
  const before=serializeWorld(w),purpose=/promise/.test(a.goal)?'promises':'plans';
  const restore=parseIntervention(`rich-no-stored-material-${purpose}`).install!();
  let alt;
  // Compare the offered action itself, not the new yields/diagnostic marker:
  // an older production path might offer the same collection without that marker.
  try{alt=generateOptions(w,p,true,true).options.filter(o=>o.key===a.data.optKey&&o.kind===a.kind&&o.goal===a.goal);}finally{restore();}
  if(serializeWorld(w)!==before)throw new Error('Counterfactual observer mutated state');
  selections.push({tick:w.tick,person:p.id,name:p.name,activity:a.id,item:a.data.materialStock,store:a.targetId,rememberedStore:{...p.beliefs[a.targetId]},goal:a.goal,kind:purpose,planId:a.data.forPlan??null,offStillOffers:alt.length>0,
    commitments:p.commitments.filter(c=>c.status==='active').map(c=>({...c})),plans:p.intentions.filter(i=>i.status==='active').map(i=>({...i,wants:{...i.wants}}))});
},onTransfer(t){
  if(t.reason!=='withdraw'&&t.reason!=='given'&&t.reason!=='gift on request')return;
  const pid=t.to.startsWith('person:')?Number(t.to.slice(7)):0,p=w.persons.find(p=>p.id===pid);
  const aid=p?.activity?.data.materialStock?p.activity.id:null;
  if(aid||t.reason!=='withdraw')transfers.push({tick:w.tick,...t,collectionActivity:aid,commitmentId:t.from.startsWith('person:')?w.persons.find(p=>p.id===Number(t.from.slice(7)))?.activity?.data.commitmentId:null});
}};
const began=Date.now();let stop='day 6';
while(w.tick<6*DAY){
  stepWorld(w);
  for(const r of w.requests)if(r.planId||r.status==='promised'||requests.has(r.id))requests.set(r.id,{...r});
  const selectedPlans=new Set(selections.map(s=>s.planId).filter(Boolean));
  const selectedRequests=new Set(selections.flatMap(s=>s.commitments.map((c:any)=>c.requestId)));
  for(const r of w.requests)if(selectedRequests.has(r.id)&&knownRequestStatus.get(r.id)!==r.status){
    knownRequestStatus.set(r.id,r.status);const receiver=w.persons.find(p=>p.id===r.from);
    consequences.push({tick:w.tick,stage:'linked-request',request:{...r},receiverTrust:receiver?.relations[r.to]?.trust??null,memory:receiver?.socialMemory?.filter(m=>m.requestId===r.id)??[]});
  }
  for(const p of w.persons)for(const i of p.intentions)if(selectedPlans.has(i.id)&&i.status!=='active'&&!finished.has(i.id)){
    finished.add(i.id);consequences.push({tick:w.tick,stage:'linked-plan-ended',person:p.id,plan:{...i,wants:{...i.wants}}});
  }
  for(const t of w.tools)if(t.wear>0&&!usedTools.has(t.id)&&selections.some(s=>s.person===t.maker&&s.tick<=t.madeTick&&s.plans.some((i:any)=>i.makes===t.kind))){
    usedTools.add(t.id);consequences.push({tick:w.tick,stage:'later-tool-use',tool:{...t}});
  }
  if(w.tick%240===0){
    const before=serializeWorld(w);let known=0,offers=0;
    for(const p of w.persons){samplePersons++;if(!['wood','stone','clay','ore'].some(item=>rememberedMaterialStores(w,p,item as ItemKind).length))continue;
      known++;const opts=generateOptions(w,p,true,true).options.filter(o=>o.kind==='withdraw'&&o.yields&&['wood','stone','clay','ore'].includes(o.yields));offers+=opts.length;
    }
    stockKnowledgeSamples+=known;eligibleOptionSamples+=offers;samples.push({tick:w.tick,known,offers});
    if(serializeWorld(w)!==before)throw new Error('Sample observer mutated state');
    if(Date.now()-began>180000){stop='runtime budget';break;}
  }
  if(w.tick%DAY===0){const ledger=conservationReport(w);daily.push({day:w.tick/DAY,ledger});if(!ledger.ok){stop='invariant failure';break;}}
}
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw new Error('Source changed during occurrence run');
const completedPlans=w.persons.flatMap(p=>p.intentions.filter(i=>i.status==='done').map(i=>({person:p.id,...i})));
const relevantIds=new Set(selections.flatMap(s=>s.commitments.map((c:any)=>c.requestId)));
const report={seed,ticks:w.tick,stop,seconds:(Date.now()-began)/1000,samplePersons,stockKnowledgeSamples,eligibleOptionSamples,
  selected:selections.length,planCollections:selections.filter(s=>s.kind==='plans').length,promiseCollections:selections.filter(s=>s.kind==='promises').length,
  successfulCollections:new Set(transfers.filter(t=>t.collectionActivity).map(t=>t.collectionActivity)).size,
  stockUnitsWithdrawn:transfers.filter(t=>t.collectionActivity).reduce((n,t)=>n+t.n,0),
  linkedRequests:[...requests.values()].filter(r=>relevantIds.has(r.id)),
  projectRequests:[...requests.values()].filter(r=>r.planId),retainedCompletedPlans:completedPlans,
  linkedPlansCompleted:consequences.filter(c=>c.stage==='linked-plan-ended'&&c.plan.status==='done').length,
  laterToolsUsed:usedTools.size,hash:hashWorld(w),conservation:conservationReport(w)};
for(const [name,data]of Object.entries({report,selections,transfers,requests:[...requests.values()],daily,samples,consequences}))writeFileSync(`${out}/${name}.json`,JSON.stringify(data,null,2));
writeFileSync(`${out}/final.json`,serializeWorld(w));
console.log(JSON.stringify({...report,retainedCompletedPlans:completedPlans.length}));
if(stop!=='day 6')process.exitCode=1;
