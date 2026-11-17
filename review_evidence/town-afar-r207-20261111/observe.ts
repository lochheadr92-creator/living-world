import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings, type ProfileName} from '../../src/sim/profiles';
import {stepWorld,hashWorld} from '../../src/sim/world';
import {DAY,isSolidHome} from '../../src/sim/constants';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {earnedAccess} from '../../src/sim/facilities';
import {LifeTally} from '../../scripts/lab/lab';
import {labProvenance,assertLabSourceUnchanged} from '../../scripts/observers/provenance';

const profile=process.argv.find(x=>x==='town'||x==='normal') as ProfileName;
if(!profile)throw Error('Supply town or normal');
const out=new URL('./'+profile+'/',import.meta.url);mkdirSync(out,{recursive:true});
const provenance=labProvenance(),start=Date.now();
const w=createWorld(currentWorldSettings(profile,'meadow',{immigration:true}));
if(w.settings.rulesVersion!==207||w.W!==80||w.H!==80)throw Error('Expected rules207, 80x80');
const life=new LifeTally();
const completed:Record<string,number>={},endings:Record<string,number>={};
const convs=new Map<number,any>(),occasions=new Map<number,any>();
let lastEvent=0,pure=true;
w.hooks={onActivityEnd(p,a,result){
  life.end(w,p,a,result);
  const key=a.kind+' | '+result;endings[key]=(endings[key]??0)+1;
  if(result==='success')completed[a.label]=(completed[a.label]??0)+1;
  if(result==='success'&&a.kind==='operate'){
    const b=w.byId.get(a.targetId);
    appendFileSync(new URL('workplace.jsonl',out),JSON.stringify({tick:w.tick,person:p.id,name:p.name,hh:p.hhId,label:a.label,target:a.targetId,building:b?.ent==='building'?b.type:'gone',earned:b?.ent==='building'?earnedAccess(w,p,b):null})+'\n');
  }
}};
const metrics=()=>({tick:w.tick,day:w.tick/DAY,population:w.persons.filter(p=>p.alive).length,deaths:w.deceased.map(d=>({name:d.name,tick:d.tick,cause:d.cause})),births:w.birthCount??0,buildings:Object.fromEntries([...new Set(w.buildings.map(b=>b.type))].map(t=>[t,w.buildings.filter(b=>b.type===t).length])),solidHomes:w.buildings.filter(b=>isSolidHome(b.type)).length,openSites:w.sites.length,carts:w.carts.length,personDays:life.personTicks/DAY,chats:life.chats,familyTime:life.familyTime,childPlay:life.childPlay,foragingPractice:life.foragingPractice,coaching:life.coaching,tradeTalk:life.tradeTalk,markets:life.marketsCalled,mealsSat:life.mealsSat,visits:life.visits,spareTime:life.spareTime,workplaceJobs:life.workplaceJobs,guestJobs:life.guestJobs,approachesFailed:life.approachesFailed,approachFailShare:life.approachFailShare,hungryAwakeShare:life.hungryShare,fedWindowShare:life.fedWindowShare,lifeShareOfEndedActivityTime:life.lifeShare,survivalShareOfEndedActivityTime:life.survivalShare,workShareOfEndedActivityTime:life.workShare,sleepShareOfEndedActivityTime:life.sleepShare,completed:{...completed},endings:{...endings},occasions:[...occasions.values()],conversations:[...convs.values()],conservation:conservationReport(w)});
function checkpoint(day:number){
  const before=hashWorld(w),m=metrics();pure=pure&&before===hashWorld(w);
  writeFileSync(new URL('day-'+day+'.json',out),serializeWorld(w,5));
  writeFileSync(new URL('metrics-'+day+'.json',out),JSON.stringify(m,null,2));
  console.log(JSON.stringify({profile,day,population:m.population,deaths:m.deaths.length,solidHomes:m.solidHomes,chats:m.chats,childPlay:m.childPlay,coaching:m.coaching,workplaceJobs:m.workplaceJobs,guestJobs:m.guestJobs,carts:m.carts,elapsedSeconds:Math.round((Date.now()-start)/1000)}));
}
writeFileSync(new URL('provenance.json',out),JSON.stringify({provenance,settings:w.settings,map:[w.W,w.H],founders:w.persons.length,days:25,seed:'meadow',description:'Exploratory ordinary unmodified world; compare profiles cautiously, starting generation and supplies scale with population.'},null,2));
checkpoint(0);
while(w.tick<25*DAY){
  stepWorld(w);life.tick(w);
  for(const c of w.conversations)convs.set(c.id,{id:c.id,a:c.a,b:c.b,purpose:c.purpose,start:c.start,childhood:c.childhood?{...c.childhood}:undefined,skillLesson:c.skillLesson?{...c.skillLesson}:undefined,lesson:c.lesson?{...c.lesson}:undefined});
  for(const o of w.occasions??[])occasions.set(o.id,structuredClone(o));
  const events=w.events.filter(e=>e.id>lastEvent);if(events.length){appendFileSync(new URL('events.jsonl',out),events.map(e=>JSON.stringify(e)).join('\n')+'\n');lastEvent=events.at(-1)!.id;}
  if(w.tick%DAY===0){
    const m=metrics();writeFileSync(new URL('progress.json',out),JSON.stringify({profile,day:w.tick/DAY,population:m.population,deaths:m.deaths.length,solidHomes:m.solidHomes,workplaceJobs:m.workplaceJobs,elapsedSeconds:Math.round((Date.now()-start)/1000)}));
    if(w.tick%(5*DAY)===0)checkpoint(w.tick/DAY);
    else console.log(profile,'day',w.tick/DAY,'population',m.population,'deaths',m.deaths.length);
  }
}
const before=hashWorld(w),saved=serializeWorld(w,5),loaded=deserializeWorld(saved);
let exact=hashWorld(loaded)===before;w.hooks=undefined;
for(let i=0;i<120;i++){stepWorld(w);stepWorld(loaded);exact=exact&&hashWorld(w)===hashWorld(loaded);}
assertLabSourceUnchanged(provenance);
writeFileSync(new URL('done.json',out),JSON.stringify({profile,provenanceEnd:labProvenance(),sourceUnchanged:true,observerMetricsHashUnchanged:pure,format5Continuation120:exact,conservationAfterContinuation:conservationReport(w),elapsedSeconds:(Date.now()-start)/1000},null,2));
console.log('DONE',profile,'exact',exact,'seconds',(Date.now()-start)/1000);
