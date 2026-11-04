// ORDINARY diagnosis (read-only hooks): why useful work ends early, and how hungry gatherers move between food sources.
// Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {DAY} from '../../src/sim/constants';
const [seed='river',rules='160',days='25',out='interrupted.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const norm=(s:string)=>s.replace(/\d+(\.\d+)?/g,'#').slice(0,90);
type End={t:number;pid:number;stage:string;kind:string;need:string|null;outcome:string;detail:string;age:number;progress:number;cycle:number;item:string|null;target:string;hunger:number;next?:string};
const ends:End[]=[];const pend=new Map<number,End>();const meals:Record<number,number[]>={};
w.hooks={
 onActivityEnd:(p,a,outcome,detail)=>{const e:End={t:w.tick,pid:p.id,stage:stageOf(w,p),kind:a.kind,need:a.need,outcome,detail:norm(detail),age:w.tick-a.start,progress:Math.round(a.progress*100)/100,cycle:a.cycle,item:a.item,target:`${a.targetType}:${a.targetId}`,hunger:Math.round(p.needs.hunger)};ends.push(e);pend.set(p.id,e);},
 onNourishment:(p,event)=>{if(event.kind==='meal')(meals[p.id]??=[]).push(w.tick);}
};
while(w.tick<Number(days)*DAY){stepWorld(w);stepWorld(twin);
 if(pend.size)for(const [id,e] of pend){const q=w.persons.find(x=>x.id===id);if(q?.activity){e.next=`${q.activity.kind}${q.activity.need?':'+q.activity.need:''}`;pend.delete(id);}}}
delete w.hooks;
const census:Record<string,number>={};for(const e of ends)if(e.outcome!=='success'){const k=`${e.kind}${e.need?':'+e.need:''} | ${e.outcome} | ${e.detail}`;census[k]=(census[k]??0)+1;}
const topCensus=Object.entries(census).sort((a,b)=>b[1]-a[1]).slice(0,60);
// interruptions that cost real time: the activity had run at least 200 ticks, or had made progress
const longLost=ends.filter(e=>e.outcome==='interrupted'&&(e.age>=200||e.progress>0));
const lostBy:Record<string,{n:number;ticks:number;next:Record<string,number>}>={};
for(const e of longLost){const k=`${e.kind}${e.need?':'+e.need:''} | ${e.detail}`;const r=lostBy[k]??={n:0,ticks:0,next:{}};r.n++;r.ticks+=e.age;const nx=e.next??'none';r.next[nx]=(r.next[nx]??0)+1;}
const lostTop=Object.entries(lostBy).sort((a,b)=>b[1].ticks-a[1].ticks).slice(0,40).map(([k,v])=>({k,n:v.n,ticks:v.ticks,next:Object.fromEntries(Object.entries(v.next).sort((a,b)=>b[1]-a[1]).slice(0,5))}));
// hungry gather sequences: consecutive hunger-driven gathers by one person between two meals
const seqs:{pid:number;stage:string;start:number;gathers:number;sources:number;successes:number;failures:number;interrupted:number;hungerStart:number;hungerEnd:number;ticks:number;rows:string[]}[]=[];
const per=new Map<number,End[]>();for(const e of ends)if(e.kind==='gather'&&e.need==='hunger'){let l=per.get(e.pid);if(!l)per.set(e.pid,l=[]);l.push(e);}
for(const [pid,list] of per){const ms=meals[pid]??[];let cur:End[]=[];let curMeal=-1;
 const flush=()=>{if(cur.length>=2){const srcs=new Set(cur.map(e=>e.target));seqs.push({pid,stage:cur[0].stage,start:cur[0].t-cur[0].age,gathers:cur.length,sources:srcs.size,successes:cur.filter(e=>e.outcome==='success').length,failures:cur.filter(e=>e.outcome==='failed').length,interrupted:cur.filter(e=>e.outcome==='interrupted').length,hungerStart:cur[0].hunger,hungerEnd:cur[cur.length-1].hunger,ticks:cur[cur.length-1].t-(cur[0].t-cur[0].age),rows:cur.map(e=>`${e.t} ${e.target} ${e.outcome} (${e.age}t) ${e.detail} h${e.hunger}`)});}cur=[];};
 for(const e of list){const m=ms.filter(t=>t<=e.t).length;if(m!==curMeal){flush();curMeal=m;}cur.push(e);}flush();}
const gat=ends.filter(e=>e.kind==='gather'&&e.need==='hunger');
const gatOut:Record<string,number>={};for(const e of gat)gatOut[e.outcome]=(gatOut[e.outcome]??0)+1;
const stats={hungerGathers:gat.length,outcomes:gatOut,sequences2plus:seqs.length,seqsWith3plusSources:seqs.filter(s=>s.sources>=3).length,seqsStartingHungerBelow25:seqs.filter(s=>s.hungerStart<25).length,seqsEndingHungerBelow10:seqs.filter(s=>s.hungerEnd<10).length};
const res={seed,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,totalEnds:ends.length,notSuccess:ends.filter(e=>e.outcome!=='success').length,stats,topCensus,lostTop,longestSeqs:seqs.sort((a,b)=>b.gathers-a.gathers).slice(0,12)};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,rules:res.rules,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,totalEnds:res.totalEnds,notSuccess:res.notSuccess,stats}));
