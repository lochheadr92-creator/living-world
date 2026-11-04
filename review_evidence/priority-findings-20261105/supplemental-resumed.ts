import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
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
const out=`supplemental-resumed/${profile}-${seed}`;
if(existsSync(out))throw Error('Do not overwrite prior run');
mkdirSync(out,{recursive:true});
const files=readdirSync('src',{recursive:true}).map(String).filter(s=>s.endsWith('.ts')).sort();
const manifest=()=>Object.fromEntries(files.map(f=>[f,sha(readFileSync('src/'+f))]));
const source=manifest();
const prior=JSON.parse(readFileSync('diagnostic/large-river/partial-observations.json','utf8'));
const initial=readFileSync('results/large-river/initial.json','utf8');
const w=deserializeWorld(readFileSync('diagnostic/large-river/observed-mismatch.json','utf8'));
const twin=deserializeWorld(readFileSync('diagnostic/large-river/twin-mismatch.json','utf8'));
if(w.tick!==45600 || profile!=='large' || seed!=='river')throw Error('Wrong continuation');
const data:any=prior.data,selection=prior.selection;
const founders=Object.keys(data).map(id=>w.persons.find(p=>p.id===Number(id))).filter(Boolean) as any[];
for(const [id,d] of Object.entries(data) as any){if(!founders.some(p=>p.id===Number(id))){const death=w.deceased.find(x=>x.id===Number(id));if(!death)throw Error('Unaccounted founder');d.final={...d.daily.at(-1),alive:false,health:0,age:death.age,death:clone(death),lastSampleBeforeDeath:true};}}
const picked=Object.fromEntries(Object.entries(selection).map(([role,p]:any)=>[role,p?w.persons.find(x=>x.id===p.id):undefined]));
const selected=new Set(Object.values(picked).filter(Boolean).map((p:any)=>p.id));
const inc=(obj:any,key:string,n=1)=>obj[key]=(obj[key]??0)+n;
const slim=(p:any)=>({id:p.id,name:p.name,sex:p.sex,age:ageYears(w,p),stage:stageOf(w,p),hhId:p.hhId,alive:p.alive,health:p.health,needs:clone(p.needs),inventory:clone(p.inv),load:weightOf(p.inv),capacity:carryCap(w,p),skills:clone(p.skills),stats:clone(p.stats)});
for(const d of Object.values(data) as any[])d.daily=d.daily.filter((x:any)=>x.tick<45600);
const exactMismatchTicks:number[]=[];
writeFileSync(out+'/selection.json',JSON.stringify({profile,seed,map:profileFacts(profile),selection,founders:founders.map(p=>data[p.id].initial)},null,2));
writeFileSync(out+'/initial.json',initial);
const seen=new Set<string>(Object.entries(data).flatMap(([id,d]:any)=>d.logs.map((l:any)=>id+':'+l.tick+':'+l.text))),worldDaily:any[]=prior.worldDaily;let pureChecks=19,twinChecks=19;
function capture(p:any){if(!selected.has(p.id))return;for(const l of p.log){const k=p.id+':'+l.tick+':'+l.text;if(!seen.has(k)){seen.add(k);data[p.id].logs.push(clone(l));}}}
function snapshot(){
 const before=serializeWorld(w);
 for(const p of founders){const d=data[p.id];capture(p);if(!p.alive)continue;const row:any={tick:w.tick,...slim(p)};
  if(d.selected){const ctx=generateOptions(w,p,true,true),ranked=rankOptions(ctx),view=observeInhabitant(w,p,ctx,ranked);row.local={self:clone(view.self),household:clone(view.household),doing:clone(view.doing)};row.options=ranked.slice(0,5).map(o=>({label:o.label,goal:o.goal}));row.blocked=ctx.blocked.slice(0,12).map(o=>({label:o.label,reason:o.blocked}));}
  d.daily.push(row);
 }
 if(before!==serializeWorld(w))throw Error('Impure observation');pureChecks++;
 const c=conservationReport(w);if(!c.ok)throw Error('Conservation '+JSON.stringify(c));
 const twinText=serializeWorld(twin);if(before!==twinText)exactMismatchTicks.push(w.tick);if(!isDeepStrictEqual(JSON.parse(before),JSON.parse(twinText)))throw Error('SEMANTIC twin mismatch at '+w.tick);twinChecks++;
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
while(w.tick<protocol.days*DAY){
 for(const p of founders){const d=data[p.id];if(!p.alive)continue;d.aliveTicks++;const k=p.activity?.kind??'none',st=stageOf(w,p);inc(d.time,k);inc(d.timeByStage,st+':'+k);if(st!==d.lastStage){d.stageChanges.push({tick:w.tick,from:d.lastStage,to:st});d.lastStage=st;}
  for(const key of Object.keys(p.needs))d.min[key]=Math.min(d.min[key],(p.needs as any)[key]);d.min.health=Math.min(d.min.health,p.health);
  for(const [key,need] of [['food20','hunger'],['water20','thirst'],['warmth20','warmth'],['energy20','energy'],['social20','social']])if((p.needs as any)[need]<20)d.below[key]++;
 }
 stepWorld(w);stepWorld(twin);for(const p of Object.values(picked))if(p)capture(p);
 if(w.tick%DAY===0)snapshot();
}
delete w.hooks;const final=serializeWorld(w);writeFileSync(out+'/final.json',final);
const restored=deserializeWorld(final);for(let i=0;i<120;i++){stepWorld(restored);stepWorld(twin);}const continuation120ExactEqual=serializeWorld(restored)===serializeWorld(twin);const continuation120SemanticEqual=isDeepStrictEqual(JSON.parse(serializeWorld(restored)),JSON.parse(serializeWorld(twin)));if(!continuation120SemanticEqual)throw Error('Semantic saved continuation mismatch');
if(JSON.stringify(source)!==JSON.stringify(manifest()))throw Error('Frozen source changed');
for(const p of founders){const d=data[p.id],death=w.deceased.find(x=>x.id===p.id);d.final={...slim(p),death:death?clone(death):null};if(!p.alive&&death)d.final.age=death.age;delete d.lastStage;}
const report={supplemental:true,provenance:'Resumed both captured day-19 states after original exact comparison failure; daily semantic comparisons retain array order, exact mismatches recorded separately; inherited 19 checkpoints day0-18 from reproduction',exactMismatchTicks,continuation120ExactEqual,continuation120SemanticEqual,protocol,profile,seed,settings:w.settings,map:profileFacts(profile),selection,source,initialHash:sha(initial),finalHash:sha(final),seconds:(performance.now()-started)/1000,pureChecks,twinChecks,continuation120Equal:continuation120ExactEqual,conservation:conservationReport(w),worldDaily,deaths:w.deceased,people:data};
writeFileSync(out+'/report.json',JSON.stringify(report));
console.log(JSON.stringify({complete:true,profile,seed,seconds:report.seconds,finalPopulation:worldDaily.at(-1).population,foundersAlive:founders.filter(p=>p.alive).length}));
