// Read-only trace of the shared storehouse in ordinary aspen (Normal, rich, arrivals on, current rules): five proposals over 28 days, the last one finished.
// Steps the world once from tick 0 and copies out what the simulation itself stored, as it was stored, at the tick it was stored. Inspector and history
// functions are called on a save/load copy only, never on the stepped world. Run with the CLEAN pinned worktree as the working directory.
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <out.json> [days]
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [out='trace.json',days='45']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const {CURRENT_RULES_VERSION}=await from('src/sim/rulesversion.ts');
const {serializeWorld,deserializeWorld}=await from('src/app/save.ts');
const {describePerson,describeEntity}=await from('src/sim/inspect.ts');
const {projectHistory,civicHistory}=await from('src/sim/history.ts');
const w:any=createWorld(currentWorldSettings('normal','aspen',{immigration:true}));
const KEY=new Map<number,string>([[1125,'Dax'],[1116,'Petra'],[1095,'Wren'],[1084,'Mona'],[1114,'Isla']]);
for(const [id,n] of KEY){const p=w.byId.get(id);if(!p||p.name!==n)throw Error(`expected ${n} at #${id}, found ${p?.name}`);}
const TRACK=new Set(['storehouse','quarry','timber_yard']);
const J=(x:any)=>JSON.parse(JSON.stringify(x??null));
const r1=(n:number)=>Math.round(n*10)/10;
const res:any={seed:'aspen',rules:CURRENT_RULES_VERSION,days:Number(days),names:{},sites:{},siteChanges:[],projects:[],projectViews:[],requests:[],decisions:[],passedOver:[],dayKinds:{},logs:[],daily:[],joins:[],storeUse:[],buildings:[]};
const siteSeen=new Map<number,string>();const projSeen=new Map<number,string>();const reqSeen=new Map<number,string>();const lastDec=new Map<number,number>();const passCount=new Map<string,number>();
const sitesOfInterest=new Set<number>();const bldgOfInterest=new Map<number,string>();let lastStore='';
const structural=(q:any)=>JSON.stringify({s:q.status,o:q.outcome,c:q.council,p:q.participants.map((m:any)=>[m.personId,m.status,m.reason,m.supports,m.decisions,m.requestId])});
const needs=(p:any)=>[Math.round(p.needs.hunger),Math.round(p.needs.thirst),Math.round(p.needs.warmth),Math.round(p.needs.energy)];
const sum=(o:any)=>o?{kind:o.kind,label:o.label,utility:r1(o.utility),parts:(o.parts??[]).map(([k,v]:[string,number])=>[k,r1(v)]),...(o.blocked?{blocked:o.blocked}:{})}:null;
const view=(fn:(c:any)=>any)=>{try{return fn(deserializeWorld(serializeWorld(w)));}catch(e){return {error:String(e)};}};
while(w.tick<Number(days)*DAY){
 stepWorld(w);
 const T=w.tick-1;
 for(const p of w.persons)res.names[p.id]??=p.name;
 // sites: creation, deliveries, work
 for(const s of w.sites){
  if(!TRACK.has(s.type))continue;
  sitesOfInterest.add(s.id);
  if(!res.sites[s.id])res.sites[s.id]={id:s.id,type:s.type,x:s.x,y:s.y,creator:s.creatorId,created:s.createdTick,required:J(s.required),workTotal:s.workTotal,hhAtFirstSight:s.hhId,firstSeen:T};
  const k=JSON.stringify([s.delivered,s.used,Math.floor(s.work/40),s.contrib?Object.keys(s.contrib):0,s.hhId]);
  if(siteSeen.get(s.id)!==k){siteSeen.set(s.id,k);res.siteChanges.push({t:T,id:s.id,delivered:J(s.delivered),used:J(s.used),work:Math.round(s.work),contrib:J(s.contrib),hh:s.hhId,lastWork:s.lastWorkTick});}
 }
 for(const id of Object.keys(res.sites).map(Number)){const s=res.sites[id];if(!s.gone&&!w.byId.get(id)){s.gone=T;}}
 // buildings of the tracked kinds
 for(const b of w.buildings)if(TRACK.has(b.type)&&!bldgOfInterest.has(b.id)){bldgOfInterest.set(b.id,b.type);res.buildings.push({t:T,id:b.id,type:b.type,x:b.x,y:b.y,hh:b.hhId,built:b.built,builtBy:J(b.builtBy),ops:b.ops?{builders:J(b.ops.builders)}:null});}
 // civic projects: every structural change, and what the history shows when one ends
 for(const q of w.civicProjects??[]){
  const k=structural(q);
  if(projSeen.get(q.id)!==k){
   const before=projSeen.get(q.id);projSeen.set(q.id,k);res.projects.push({t:T,project:J(q)});
   for(const m of q.participants){const key=`${q.id}:${m.personId}`;if(!res.joins.some((j:any)=>j.key===key)){const p=w.byId.get(m.personId);res.joins.push({key,t:T,project:q.id,site:q.siteId,who:m.personId,status:m.status,reason:m.reason,belief:p?.beliefs?J(p.beliefs[q.siteId]):null,needs:p?.needs?needs(p):null});}}
   if(q.status!=='active'&&before&&!JSON.parse(before).s.startsWith?.(q.status))res.projectViews.push({t:T,project:q.id,lines:view(c=>projectHistory(c,c.civicProjects.find((x:any)=>x.id===q.id)))});
  }
 }
 // requests about the tracked sites
 for(const r of w.requests){
  if(!r.siteId||!sitesOfInterest.has(r.siteId))continue;
  const k=`${r.status}|${r.note}`;
  if(reqSeen.get(r.id)!==k){reqSeen.set(r.id,k);res.requests.push({t:T,id:r.id,kind:r.kind,from:r.from,to:r.to,site:r.siteId,item:r.item,amount:r.amount,status:r.status,note:r.note,purpose:r.purpose,created:r.created,expires:r.expires,resolved:r.resolved});}
 }
 // decisions and logs
 const day=Math.floor(T/DAY);
 for(const p of w.persons){
  if(!p.alive)continue;
  const d=p.lastDecision;
  if(d&&d.tick!==lastDec.get(p.id)&&d.chosen){
   lastDec.set(p.id,d.tick);
   const about=(o:any)=>/storehouse|quarry|timber yard/i.test(o?.label??'');
   const led=(p.decisions??[]).at(-1);
   const onSite=led&&led.tick===d.tick&&sitesOfInterest.has(led.targetId);
   if(about(d.chosen)||onSite)res.decisions.push({t:d.tick,who:p.id,trigger:d.trigger,chosen:sum(d.chosen),because:d.because,needs:needs(p),alternatives:d.alternatives.slice(0,3).map(sum),ledger:led&&led.tick===d.tick?{key:led.key,targetId:led.targetId,passedOver:led.passedOver,setAside:led.setAside}:null,considered:d.considered});
   if(KEY.has(p.id)&&T>=14*DAY){
    const dk=res.dayKinds[p.id]??={};const row=dk[day]??={n:0,kinds:{},hungerSum:0,warmthSum:0};row.n++;row.kinds[d.chosen.kind]=(row.kinds[d.chosen.kind]??0)+1;row.hungerSum+=p.needs.hunger;row.warmthSum+=p.needs.warmth;
    if(!about(d.chosen)){
     const alt=[...d.alternatives,...d.blocked].filter(about);
     const pk=`${p.id}:${day}`;
     if(alt.length&&(passCount.get(pk)??0)<3){passCount.set(pk,(passCount.get(pk)??0)+1);res.passedOver.push({t:d.tick,who:p.id,chosen:sum(d.chosen),because:d.because,needs:needs(p),storehouseOptions:alt.slice(0,4).map(sum)});}
    }
   }
  }
  for(let i=p.log.length-1;i>=0&&p.log[i].tick>=T;i--){
   const e=p.log[i];if(e.tick!==T)continue;
   if((KEY.has(p.id)&&T>=14*DAY)||/storehouse|quarry|timber yard/i.test(e.text)||(T>=33*DAY&&/stone/i.test(e.text)))res.logs.push({t:T,who:p.id,kind:e.kind,text:e.text});
  }
 }
 // the finished storehouse in use
 if(T%50===0)for(const [id,type] of bldgOfInterest){if(type!=='storehouse')continue;const b=w.byId.get(id);if(!b)continue;const k=JSON.stringify(b.store.items);if(k!==lastStore){lastStore=k;res.storeUse.push({t:T,items:J(b.store.items),near:w.persons.filter((p:any)=>p.alive&&p.activity&&p.activity.targetId===id).map((p:any)=>[p.id,p.activity.kind])});}}
 if(w.tick%DAY===0){const a=w.persons.filter((p:any)=>p.alive);res.daily.push({day:w.tick/DAY,alive:a.length,meanHunger:r1(a.reduce((s:number,p:any)=>s+p.needs.hunger,0)/a.length),meanWarmth:r1(a.reduce((s:number,p:any)=>s+p.needs.warmth,0)/a.length),starving:a.filter((p:any)=>p.needs.hunger<20).length,cold:a.filter((p:any)=>p.needs.warmth<35).length,weather:J(w.weather),huts:w.buildings.filter((b:any)=>b.type==='hut'||b.type==='house').length});}
}
// what is left at the end, and what a viewer is shown
const end:any={tick:w.tick,people:{},relations:{},civicOutcomes:{},chronicle:(w.chronicle??[]).filter((e:any)=>/storehouse|quarry|timber yard/i.test(e.text)),feed:(w.events??[]).filter((e:any)=>/storehouse|quarry|timber yard/i.test(e.text)),feedOldest:(w.events??[])[0]?.tick,chronicleSize:(w.chronicle??[]).length,projects:J(w.civicProjects),deceasedIds:(w.deceased??[]).map((d:any)=>[d.id,d.name,d.tick,d.cause])};
for(const [id,n] of KEY){
 const p=w.byId.get(id);if(!p||p.ent!=='person'){end.people[id]={name:n,gone:true};continue;}
 end.people[id]={name:n,alive:p.alive,hh:p.hhId,log:J(p.log),ledger:J(p.decisions),lastDecision:p.lastDecision?{t:p.lastDecision.tick,chosen:sum(p.lastDecision.chosen),because:p.lastDecision.because}:null};
 end.civicOutcomes[id]=J(p.civicOutcomes);
 end.relations[id]={};for(const [oid] of KEY){if(oid===id)continue;const r=p.relations?.[oid];if(r)end.relations[id][oid]={affinity:r1(r.affinity),trust:r1(r.trust),familiarity:r1(r.familiarity),debt:r.debt,grievance:J(r.grievance),history:J(r.history)};}
}
for(const p of w.persons)if(p.alive&&p.civicOutcomes?.length&&!KEY.has(p.id))end.civicOutcomes[p.id]=J(p.civicOutcomes);
end.views=view(c=>{const o:any={people:{},buildings:{}};for(const [id] of KEY){const v=describePerson(c,id);if(v)o.people[id]={civic:v.civic,keys:Object.keys(v)};}for(const [id] of bldgOfInterest)o.buildings[id]=describeEntity(c,id);const petra=c.byId.get(1116);if(petra)o.civicHistoryPetra=civicHistory(c,petra);return o;});
res.end=end;
writeFileSync(out,JSON.stringify(res));
console.log(`trace: rules ${res.rules} tick ${w.tick} sites ${Object.keys(res.sites).length} projects ${res.projects.length} requests ${res.requests.length} decisions ${res.decisions.length} passedOver ${res.passedOver.length} logs ${res.logs.length}`);
