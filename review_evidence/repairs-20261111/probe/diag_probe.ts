// DIAGNOSTIC probe (not evidence of ordinary behaviour by itself): steps one ordinary product world (Normal, rich, arrivals on,
// current rules) and records invariant breaches, the state of each person just before death, stuck activities, persistent
// blocks and suspended work that never resumes. Run with the worktree as cwd:
//   node node_modules/vite-node/dist/cli.mjs <this file> -- <seed> <days> <out.json>
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const from=(p:string)=>import(pathToFileURL(join(process.cwd(),p)).href);
const [seed='aspen',days='45',out='diag.json']=process.argv.slice(2).filter(a=>a!=='--');
const {createWorld}=await from('src/sim/factory.ts');
const {currentWorldSettings}=await from('src/sim/profiles.ts');
const {stepWorld,hashWorld}=await from('src/sim/world.ts');
const {DAY}=await from('src/sim/constants.ts');
const {CURRENT_RULES_VERSION}=await from('src/sim/rulesversion.ts');
const {conservationReport,foodUnits}=await from('src/sim/economy.ts');
const {toolReport}=await from('src/sim/toolreg.ts');
const {homeCapacity,occupants}=await from('src/sim/habitation.ts');
const {stageOf}=await from('src/sim/people.ts');
const w:any=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
const problems:Record<string,{n:number;first:string;last:string}>={};
const flag=(kind:string,text:string)=>{const c=problems[kind]??{n:0,first:'t'+w.tick+' '+text,last:''};c.n++;c.last='t'+w.tick+' '+text;problems[kind]=c;};
const hyp=(a:number,b:number)=>Math.hypot(a,b);
function snapshot(p:any){
 const hh=w.households.find((h:any)=>h.id===p.hhId);
 const home=hh?.homeId?w.byId.get(hh.homeId):undefined;
 const shelters=[] as any[];
 for(const id of p.bykind?.building??[]){const b=p.beliefs[id];if(!b||b.kind!=='building')continue;const real=w.byId.get(id);
  if(!real||real.ent!=='building')continue;
  shelters.push({id,btype:b.btype,hh:b.hh,dist:+hyp(b.x-p.x,b.y-p.y).toFixed(1),seenAgo:w.tick-b.seen,realType:real.type,realHh:real.hhId,inside:real.inside.length,cap:homeCapacity(w,real),occ:occupants(w,real).length,cond:real.condition});}
 shelters.sort((a,b)=>a.dist-b.dist);
 const foodBeliefs=[] as any[];
 for(const k of ['berries','fruit','fish','grain']){for(const id of p.bykind?.[k]??[]){const b=p.beliefs[id];if(!b)continue;const real=w.byId.get(id);foodBeliefs.push({kind:k,believed:b.amount,real:real?.amount,dist:+hyp(b.x-p.x,b.y-p.y).toFixed(1),seenAgo:w.tick-b.seen,src:b.src});}}
 foodBeliefs.sort((a,b)=>a.dist-b.dist);
 const stores=[] as any[];
 for(const b of w.buildings){const f=foodUnits(b.store.items);if(f>0)stores.push({id:b.id,type:b.type,hh:b.hhId,food:f,dist:+hyp(b.x+b.w/2-p.x,b.y+b.h/2-p.y).toFixed(1),known:!!p.beliefs[b.id],believedFood:p.beliefs[b.id]?.items?foodUnits(p.beliefs[b.id].items):undefined});}
 stores.sort((a,b)=>a.dist-b.dist);
 return {tick:w.tick,day:+(w.tick/DAY).toFixed(2),name:p.name,id:p.id,age:Math.floor(p.age??0),stage:stageOf(w,p),hh:p.hhId,hhMembers:hh?.members?.length,
  homeType:home?.type,homeDist:home?+hyp(home.x+home.w/2-p.x,home.y+home.h/2-p.y).toFixed(1):undefined,homeInside:home?.inside?.length,homeCap:home?homeCapacity(w,home):undefined,homeFood:home?foodUnits(home.store.items):undefined,
  x:+p.x.toFixed(1),y:+p.y.toFixed(1),indoors:p.indoors,health:+p.health.toFixed(1),needs:{...p.needs},inv:{...p.inv},invFood:foodUnits(p.inv),
  weather:{kind:w.weather.kind,temp:w.weather.temp,rain:w.weather.rain},season:w.season,
  activity:p.activity?{kind:p.activity.kind,label:p.activity.label,phase:p.activity.phase,blocked:p.activity.blocked,target:p.activity.targetId,started:p.activity.started,goal:p.activity.goal}:null,
  suspended:p.suspended?{kind:p.suspended.kind,label:p.suspended.label}:null,
  because:p.lastDecision?.because,chosen:p.lastDecision?.chosen?.label,alts:(p.lastDecision?.alternatives??[]).slice(0,6).map((o:any)=>o.label+' '+(o.util?.toFixed?.(0)??o.util)),blockedOpts:(p.lastDecision?.blocked??[]).slice(0,8).map((o:any)=>o.label+': '+(o.reason??o.why??'')),
  shelters:shelters.slice(0,5),foodBeliefs:foodBeliefs.slice(0,6),storesWithFood:stores.slice(0,4),
  ill:p.illness?{...p.illness}:undefined,injury:p.injury,commitments:(p.commitments??[]).filter((c:any)=>c.status==='active').map((c:any)=>c.kind+' '+(c.item??'')+' to '+c.to),
  log:(p.log??[]).slice(-6).map((l:any)=>l.tick+': '+l.text)};
}
const atRisk=new Map<number,any>();
const deaths:any[]=[];
const actStart=new Map<number,{key:string;since:number;flagged:boolean}>();
const blockedSince=new Map<number,{text:string;since:number;flagged:boolean}>();
const suspendedSince=new Map<number,{label:string;since:number;flagged:boolean}>();
let deceasedN=0;
const hashes:Record<number,string>={};
function audit(){
 const led=conservationReport(w);if(!led.ok)flag('ledger',JSON.stringify(led.diffs).slice(0,300));
 const tr=toolReport(w);if(!tr.ok)flag('tools',tr.problems.slice(0,2).join('; '));
 const claimed=new Set<number>();
 for(const p of w.persons){for(const id of p.activity?.claims??[])claimed.add(id);for(const id of p.suspended?.claims??[])claimed.add(id);}
 for(const r of w.reservations.values()){const o=w.byId.get(r.owner);if(!o||o.ent!=='person'||!o.alive)flag('claim-of-the-gone',r.kind+' on '+r.target+' by '+r.owner);else if(!claimed.has(r.id))flag('claim-unused',r.kind+' on '+r.target+' by '+o.name+' doing '+(o.activity?.kind??'none'));}
 for(const c of w.carts){if(c.puller){const pl=w.byId.get(c.puller);if(!pl||pl.ent!=='person'||!pl.alive||pl.cartId!==c.id)flag('cart-puller','cart '+c.id+' puller '+c.puller);}}
 for(const p of w.persons){
  if(p.cartId){const c=w.byId.get(p.cartId);if(!c||c.ent!=='cart'||c.puller!==p.id)flag('puller-cart',p.name+' cart '+p.cartId);}
  const seen=new Set<string>();
  for(const c of p.commitments??[]){if(c.status!=='active')continue;if(!(c.deadline>0))flag('promise-no-deadline',p.name+' '+c.kind);if(c.deadline<w.tick-3000&&!c.grace)flag('promise-overdue-open',p.name+' '+c.kind+' '+c.item+' deadline '+c.deadline);const key=[c.kind,c.to,c.item,c.siteId,c.destId,c.toolId??''].join('|');if(seen.has(key))flag('promise-duplicate',p.name+' '+key);seen.add(key);const to=w.byId.get(c.to);if(!to||(to.ent==='person'&&!to.alive))flag('promise-to-gone',p.name+' -> '+c.to);}
  for(const k of Object.keys(p.needs))if(!Number.isFinite(p.needs[k]))flag('need-nan',p.name+' '+k);
  if(p.alive&&w.byId.get(p.id)!==p)flag('registry',p.name);
  for(const k of Object.keys(p.inv))if((p.inv[k]??0)<-1e-9)flag('negative-inv',p.name+' '+k+' '+p.inv[k]);
  if(p.indoors){const b=w.byId.get(p.indoors);if(!b||b.ent!=='building')flag('indoors-no-building',p.name+' in '+p.indoors);else if(!b.inside.includes(p.id))flag('indoors-not-listed',p.name+' in '+b.type+' '+b.id);}
 }
 for(const b of w.buildings){for(const id of b.inside){const q=w.byId.get(id);if(!q||q.ent!=='person'||!q.alive)flag('inside-gone',b.type+' '+b.id+' holds '+id);else if(q.indoors!==b.id)flag('inside-disagree',q.name+' listed in '+b.type+' '+b.id+' but indoors='+q.indoors);}
  for(const k of Object.keys(b.store.items))if((b.store.items[k]??0)<-1e-9)flag('negative-stock',b.type+' '+k);}
 for(const m of w.meals){const live=m.status==='inviting'||m.status==='gathering'||m.status==='eating';if(!live&&foodUnits(m.table)>0)flag('meal-table-left','meal '+m.id+' '+m.status);}
}
const total=Number(days)*DAY;
const restKinds=['sleep','rest','shelter','wait','stay','warm'];
while(w.tick<total){
 for(const p of w.persons){if(!p.alive)continue;const n=p.needs;if(n.hunger<12||n.thirst<12||n.warmth<14||p.health<12)atRisk.set(p.id,snapshot(p));}
 stepWorld(w);
 if(w.deceased.length>deceasedN){for(const d of w.deceased.slice(deceasedN)){const s=atRisk.get(d.id);deaths.push({name:d.name,cause:d.cause,tick:d.tick,day:+(d.tick/DAY).toFixed(2),age:d.age,before:s??null});}deceasedN=w.deceased.length;}
 if(w.tick%300===0)audit();
 if(w.tick%DAY===0)hashes[w.tick/DAY]=hashWorld(w);
 if(w.tick%100===0)for(const p of w.persons){
  const a=p.activity;const key=a?a.kind+'|'+a.targetId+'|'+a.label:'';
  const s=actStart.get(p.id);
  if(!s||s.key!==key)actStart.set(p.id,{key,since:w.tick,flagged:false});
  else if(a&&!s.flagged&&w.tick-s.since>DAY&&!restKinds.some(k=>a.kind.includes(k))){s.flagged=true;flag('activity-over-a-day',p.name+' '+key+' phase '+a.phase+' blocked='+(a.blocked??'')+' since '+s.since);}
  const bt=a?.blocked??'';const b=blockedSince.get(p.id);
  if(!b||b.text!==bt)blockedSince.set(p.id,{text:bt,since:w.tick,flagged:false});
  else if(bt&&!b.flagged&&w.tick-b.since>DAY/2){b.flagged=true;flag('blocked-over-half-day',p.name+' '+a.kind+' "'+bt+'" since '+b.since);}
  const sl=p.suspended?.label??'';const ss=suspendedSince.get(p.id);
  if(!ss||ss.label!==sl)suspendedSince.set(p.id,{label:sl,since:w.tick,flagged:false});
  else if(sl&&!ss.flagged&&w.tick-ss.since>2*DAY){ss.flagged=true;flag('suspended-over-two-days',p.name+' "'+sl+'" since '+ss.since+' now doing '+(a?.kind??'none'));}
 }
}
const res={seed,days:Number(days),rules:CURRENT_RULES_VERSION,alive:w.persons.filter((p:any)=>p.alive).length,deaths:deaths.length,conserved:conservationReport(w).ok,problems,hashes,deathList:deaths};
writeFileSync(out,JSON.stringify(res,null,1));
const causes:Record<string,number>={};for(const d of deaths)causes[d.cause]=(causes[d.cause]??0)+1;
console.log(seed+': alive '+res.alive+' deaths '+deaths.length+' '+JSON.stringify(causes)+' conserved '+res.conserved+' problems '+JSON.stringify(Object.fromEntries(Object.entries(problems).map(([k,v])=>[k,v.n]))));
