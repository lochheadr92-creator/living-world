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
import {generateOptions,rankOptions} from '../../src/sim/decision';
const [seed='river',rules='160',days='25',out='interrupted.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const norm=(s:string)=>s.replace(/\d+(\.\d+)?/g,'#').slice(0,90);
type End={t:number;pid:number;stage:string;kind:string;need:string|null;outcome:string;detail:string;age:number;progress:number;cycle:number;item:string|null;target:string;hunger:number;next?:string;rev?:Rev};
type Rev={curPresent:boolean;curRank:number;curUtil:number;curEff:number;bestKey:string;bestKind:string;bestNeed:string|null;bestUtil:number;nGather:number;phase:string;committed:boolean;beats:boolean;ageAtReview:number};
const snap=new Map<number,{t:number;actId:number;rev:Rev}>();let pre=-1;
const ends:End[]=[];const pend=new Map<number,End>();const meals:Record<number,number[]>={};
w.hooks={
 onActivityEnd:(p,a,outcome,detail)=>{const e:End={t:w.tick,pid:p.id,stage:stageOf(w,p),kind:a.kind,need:a.need,outcome,detail:norm(detail),age:w.tick-a.start,progress:Math.round(a.progress*100)/100,cycle:a.cycle,item:a.item,target:`${a.targetType}:${a.targetId}`,hunger:Math.round(p.needs.hunger)};const sn=snap.get(p.id);if(sn&&sn.t===pre&&sn.actId===a.id&&outcome==='interrupted'&&detail==='something better came up')e.rev=sn.rev;ends.push(e);pend.set(p.id,e);},
 onNourishment:(p,event)=>{if(event.kind==='meal')(meals[p.id]??=[]).push(w.tick);}
};
while(w.tick<Number(days)*DAY){
 for(const p of w.persons){const a=p.activity;if(!p.alive||!a||a.kind!=='gather'||a.need!=='hunger'||w.tick+1<p.nextThink)continue;
  const ctx=generateOptions(w,p,false),ranked=rankOptions(ctx),best=ranked[0],key=a.data.optKey as string|undefined,cur=key?ctx.options.find(o=>o.key===key):undefined;
  if(!best)continue;const frac=a.duration>0?Math.min(1,a.progress/a.duration):0,eff=cur?cur.util*(1.08+0.35*frac):0;
  snap.set(p.id,{t:w.tick,actId:a.id,rev:{curPresent:!!cur,curRank:key?ranked.findIndex(o=>o.key===key):-1,curUtil:cur?Math.round(cur.util*10)/10:0,curEff:Math.round(eff*10)/10,bestKey:best.key.replace(/\d+/g,'#'),bestKind:best.kind,bestNeed:best.need,bestUtil:Math.round(best.util*10)/10,nGather:ctx.options.filter(o=>o.kind==='gather').length,phase:a.phase,committed:w.tick+1<a.minCommit,beats:best.util>eff*1.3+3,ageAtReview:w.tick+1-a.start}});}
 pre=w.tick;stepWorld(w);stepWorld(twin);
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

const revs=ends.filter(e=>e.rev&&e.kind==='gather'&&e.need==='hunger');
const rv={unsnapped:ends.filter(e=>!e.rev&&e.kind==='gather'&&e.need==='hunger'&&e.outcome==='interrupted'&&e.detail==='something better came up').length,n:revs.length,beats:revs.filter(e=>e.rev!.beats).length,currentOptionGone:revs.filter(e=>!e.rev!.curPresent).length,currentPresent:revs.filter(e=>e.rev!.curPresent).length,bestIsGather:revs.filter(e=>e.rev!.bestKind==='gather').length,bestIsOtherHungerGather:revs.filter(e=>e.rev!.bestKind==='gather'&&e.rev!.bestNeed==='hunger').length,duringTravel:revs.filter(e=>e.rev!.phase==='travel').length,duringWork:revs.filter(e=>e.rev!.phase==='work').length,nGatherMedian:0,ageMedian:0,bestByKind:{} as Record<string,number>,curRankHist:{} as Record<string,number>};
const med=(xs:number[])=>xs.length?xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)]:0;
rv.nGatherMedian=med(revs.map(e=>e.rev!.nGather));rv.ageMedian=med(revs.map(e=>e.rev!.ageAtReview));
for(const e of revs){rv.bestByKind[e.rev!.bestKind]=(rv.bestByKind[e.rev!.bestKind]??0)+1;const r=e.rev!.curRank<0?'absent':e.rev!.curRank>=5?'5+':String(e.rev!.curRank);rv.curRankHist[r]=(rv.curRankHist[r]??0)+1;}
const revRows=revs.slice(0,40).map(e=>({t:e.t,pid:e.pid,hunger:e.hunger,age:e.age,target:e.target,rev:e.rev}));
const stats={hungerGathers:gat.length,outcomes:gatOut,sequences2plus:seqs.length,seqsWith3plusSources:seqs.filter(s=>s.sources>=3).length,seqsStartingHungerBelow25:seqs.filter(s=>s.hungerStart<25).length,seqsEndingHungerBelow10:seqs.filter(s=>s.hungerEnd<10).length};
const res={seed,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,totalEnds:ends.length,notSuccess:ends.filter(e=>e.outcome!=='success').length,stats,rv,revRows,topCensus,lostTop,longestSeqs:seqs.sort((a,b)=>b.gathers-a.gathers).slice(0,12)};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,rules:res.rules,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,totalEnds:res.totalEnds,notSuccess:res.notSuccess,stats}));
