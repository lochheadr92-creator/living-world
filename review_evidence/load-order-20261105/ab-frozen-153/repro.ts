import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setPriority,constants} from 'node:os';
import {createWorld} from './src/sim/factory';
import {currentWorldSettings,profileFacts} from './src/sim/profiles';
import {stepWorld} from './src/sim/world';
import {serializeWorld,deserializeWorld} from './src/app/save';
import {generateOptions,rankOptions} from './src/sim/decision';
import {observeInhabitant} from './src/agent/observe';
import {stageOf,ageYears,carryCap} from './src/sim/people';
import {conservationReport,weightOf} from './src/sim/economy';
import {dayNumber,clockText} from './src/sim/environment';
import {DAY} from './src/sim/constants';
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
const sha=(x:any)=>createHash('sha256').update(x).digest('hex');
const protocol=JSON.parse(readFileSync('protocol.json','utf8'));
const [profile,seed]=process.argv.slice(2) as any;
if(!protocol.profiles.includes(profile)||!protocol.seeds.includes(seed))throw Error('Unregistered world');
setPriority(0,constants.priority.PRIORITY_BELOW_NORMAL);
const out=`diagnostic/${profile}-${seed}`;
if(existsSync(out))throw Error('Do not overwrite prior run');
mkdirSync(out,{recursive:true});
const files=readdirSync('src',{recursive:true}).map(String).filter(s=>s.endsWith('.ts')).sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,sha(readFileSync('src/'+f))]));
const source=manifest();
const w=createWorld(currentWorldSettings(profile,seed));
if(w.settings.rulesVersion!==protocol.rules)throw Error('Rules mismatch');
const initial=serializeWorld(w), twin=deserializeWorld(initial), founders=[...w.persons];
const child=founders.find(p=>stageOf(w,p)==='child'&&ageYears(w,p)>=5)??founders.find(p=>stageOf(w,p)==='child');
// Parent fields are taken from the public local perspective, not assumed from name or household.
const childView=child?observeInhabitant(w,child,generateOptions(w,child,true,true),rankOptions(generateOptions(w,child,true,true))):null;
if(serializeWorld(w)!==initial)throw Error('Selection observer mutated world');
const parentNames=childView?.household?.parents??[];
const picked={child,youth:founders.find(p=>stageOf(w,p)==='youth'),adult:founders.find(p=>stageOf(w,p)==='adult'&&parentNames.includes(p.name))??founders.find(p=>stageOf(w,p)==='adult'),elder:founders.find(p=>stageOf(w,p)==='elder')};
const selected=new Set(Object.values(picked).filter(Boolean).map((p:any)=>p.id));
const inc=(obj:any,key:string,n=1)=>obj[key]=(obj[key]??0)+n;
const slim=(p:any)=>({id:p.id,name:p.name,sex:p.sex,age:ageYears(w,p),stage:stageOf(w,p),hhId:p.hhId,alive:p.alive,health:p.health,needs:clone(p.needs),inventory:clone(p.inv),load:weightOf(p.inv),capacity:carryCap(w,p),skills:clone(p.skills),stats:clone(p.stats)});
const data:any=Object.fromEntries(founders.map(p=>[p.id,{initial:slim(p),traits:clone(p.traits),selected:selected.has(p.id),aliveTicks:0,time:{},timeByStage:{},below:{food20:0,water20:0,warmth20:0,energy20:0,social20:0},min:{...p.needs,health:p.health},ends:{},failureDetails:{},lessons:0,play:0,family:0,meals:0,transferredIn:{},transferredOut:{},stageChanges:[],lastStage:stageOf(w,p),events:[],transfers:[],logs:[],daily:[]} ]));
const selection=Object.fromEntries(Object.entries(picked).map(([role,p]:any)=>[role,p?data[p.id].initial:null]));
writeFileSync(out+'/selection.json',JSON.stringify({profile,seed,map:profileFacts(profile),selection,founders:founders.map(p=>data[p.id].initial)},null,2));
writeFileSync(out+'/initial.json',initial);
const seen=new Set<string>(),worldDaily:any[]=[];let pureChecks=0,twinChecks=0;
function capture(p:any){if(!selected.has(p.id))return;for(const l of p.log){const k=p.id+':'+l.tick+':'+l.text;if(!seen.has(k)){seen.add(k);data[p.id].logs.push(clone(l));}}}
function snapshot(){
 const before=serializeWorld(w);
 for(const p of founders){const d=data[p.id];capture(p);if(!p.alive)continue;const row:any={tick:w.tick,...slim(p)};
  if(d.selected){const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),view=observeInhabitant(w,p,ctx,ranked);row.local={self:clone(view.self),household:clone(view.household),doing:clone(view.doing)};row.options=ranked.slice(0,5).map(o=>({label:o.label,goal:o.goal}));row.blocked=ctx.blocked.slice(0,12).map(o=>({label:o.label,reason:o.blocked}));}
  d.daily.push(row);
 }
 if(before!==serializeWorld(w))throw Error('Impure observation');pureChecks++;
 const c=conservationReport(w);if(!c.ok)throw Error('Conservation '+JSON.stringify(c));
 if(before!==serializeWorld(twin)){writeFileSync(out+'/observed-mismatch.json',before);writeFileSync(out+'/twin-mismatch.json',serializeWorld(twin));writeFileSync(out+'/partial-observations.json',JSON.stringify({selection,data,worldDaily}));throw Error('Twin mismatch captured at '+w.tick);}twinChecks++;if(w.tick===18*DAY)writeFileSync(out+'/equal-day18.json',before);
 const stages:any={},homes:any={};for(const p of w.persons)if(p.alive)inc(stages,stageOf(w,p));for(const b of w.buildings)inc(homes,b.kind??b.type??'unknown');
 worldDaily.push({tick:w.tick,elapsedDays:w.tick/DAY,calendarDay:dayNumber(w.tick),clock:clockText(w.tick),population:w.persons.filter(p=>p.alive).length,foundersAlive:founders.filter(p=>p.alive).length,deaths:w.deceased.length,stages,buildings:homes,weather:clone(w.weather)});
 writeFileSync(out+'/progress.json',JSON.stringify({tick:w.tick,days:w.tick/DAY,population:worldDaily.at(-1).population,pureChecks,twinChecks,seconds:(performance.now()-started)/1000}));
 console.log(JSON.stringify({profile,seed,day:w.tick/DAY,population:worldDaily.at(-1).population,seconds:Math.round((performance.now()-started)/1000)}));
}
w.hooks={
 onActivityStart:(p,a)=>{const d=data[p.id];if(d?.selected)d.events.push({tick:w.tick,kind:'start',activity:a.kind,label:a.label,goal:a.goal,target:a.targetId,why:a.data.why??null});},
 onActivityEnd:(p,a,result,detail)=>{const d=data[p.id];if(!d)return;inc(d.ends,a.kind+':'+result);if(result==='failed'||result==='partial')inc(d.failureDetails,detail);if(result==='success'){if(/Foraging practice completed/i.test(detail))d.lessons++;if(/game/i.test(a.label))d.play++;if(/family time/i.test(a.label))d.family++;}if(d.selected)d.events.push({tick:w.tick,kind:'end',activity:a.kind,label:a.label,goal:a.goal,result,detail});},
 onTransfer:info=>{for(const [direction,id] of [['In',info.to],['Out',info.from]] as const){if(!id.startsWith('person:'))continue;const d=data[Number(id.slice(7))];if(!d)continue;inc(d['transferred'+direction],info.reason+':'+info.item,info.n);if(d.selected)d.transfers.push({tick:w.tick,...info});}},
 onNourishment:(p,event)=>{const d=data[p.id];if(d&&event.kind==='meal')d.meals++;}
};
const started=performance.now();snapshot();
while(w.tick<19*DAY){
 for(const p of founders){const d=data[p.id];if(!p.alive)continue;d.aliveTicks++;const k=p.activity?.kind??'none',st=stageOf(w,p);inc(d.time,k);inc(d.timeByStage,st+':'+k);if(st!==d.lastStage){d.stageChanges.push({tick:w.tick,from:d.lastStage,to:st});d.lastStage=st;}
  for(const key of Object.keys(p.needs))d.min[key]=Math.min(d.min[key],(p.needs as any)[key]);d.min.health=Math.min(d.min.health,p.health);
  for(const [key,need] of [['food20','hunger'],['water20','thirst'],['warmth20','warmth'],['energy20','energy'],['social20','social']])if((p.needs as any)[need]<20)d.below[key]++;
 }
 stepWorld(w);stepWorld(twin);for(const p of Object.values(picked))if(p)capture(p);
 if(w.tick%DAY===0)snapshot();
}
delete w.hooks;const final=serializeWorld(w);writeFileSync(out+'/final.json',final);
const restored=deserializeWorld(final);for(let i=0;i<120;i++){stepWorld(restored);stepWorld(twin);}if(serializeWorld(restored)!==serializeWorld(twin))throw Error('Saved continuation mismatch');
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw Error('Frozen source changed');
for(const p of founders){const d=data[p.id],death=w.deceased.find(x=>x.id===p.id);d.final={...slim(p),death:death?clone(death):null};if(!p.alive&&death)d.final.age=death.age;delete d.lastStage;}
const report={protocol,profile,seed,settings:w.settings,map:profileFacts(profile),selection,source,initialHash:sha(initial),finalHash:sha(final),seconds:(performance.now()-started)/1000,pureChecks,twinChecks,continuation120Equal:true,conservation:conservationReport(w),worldDaily,deaths:w.deceased,people:data};
writeFileSync(out+'/report.json',JSON.stringify(report));
console.log(JSON.stringify({complete:true,profile,seed,seconds:report.seconds,finalPopulation:worldDaily.at(-1).population,foundersAlive:founders.filter(p=>p.alive).length}));
