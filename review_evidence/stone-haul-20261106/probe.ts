// ORDINARY diagnosis (read-only): how much of the stone problem is pack capacity? Normal or Large, arrivals on, rules pinned.
// Every tick: a person's stone gained (gathered, withdrawn) or lost (delivered to a site, stored) is read from the change in p.inv.stone
// and put against their carry cap; every site with a stone requirement is followed from layout to its last stone and to completion.
// Usage: vite-node <this> <seed> <rules> <days> <out> [profile]. Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf,carryCap} from '../../src/sim/people';
import {DAY,WEIGHT,CARRY_CAP} from '../../src/sim/constants';
import type {World} from '../../src/sim/types';
const [seed='river',rules='161',days='25',out='stone.json',profile='normal',arm='control']=process.argv.slice(2);
// EXPERIMENTAL ARMS (this process only; nothing ships from here): the constants are changed before the world exists, so an arm differs from
// control by exactly one number from tick 0. 'stone2' makes a stone weigh 2 (3 in the game); 'elder9' makes an elder's pack 9 (6 in the game).
if(arm==='stone2')(WEIGHT as Record<string,number>).stone=2;
if(arm==='elder9')(CARRY_CAP as {elder:number}).elder=12;
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const gained:Record<string,Hist>={};      // stage -> size of one stone increase in one tick-run (a gather spell, summed until the person stops gaining)
const delivered:Record<string,Hist>={};   // stage -> stone put into a site in one tick
const capByStage:Record<string,Hist>={};  // stage -> cap values seen at samples
const perTrip:Record<string,Hist>={};     // stage -> stones a person carried at the moment they delivered (the load of one trip)
const basketShare:Record<string,{n:number;basket:number}>={};
const prev=new Map<number,number>();
const dropping=new Set<number>();         // people whose stone fell on the previous tick (one delivery sequence is one trip)
const atCap:Record<string,{trips:number;full:number}>={}; // stones carried at delivery start equal what the pack can hold of stone alone
type SiteLog={woodDone:number|null;id:number;type:string;stoneNeed:number;woodNeed:number;createdTick:number;firstStone:number|null;stoneDone:number|null;doneTick:number|null;deliverers:Set<number>;stoneDeliveries:number;lastSeen:number;hhId:number};
const sites=new Map<number,SiteLog>();
const stageOfPerson=(w:World,id:number)=>{const p=w.persons.find(q=>q.id===id);return p?stageOf(w,p):'?';};
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 for(const p of w.persons){
  if(!p.alive)continue;
  const now=p.inv.stone??0,was=prev.get(p.id)??0,d=now-was;
  const st=stageOf(w,p);
  if(d>0)bump((gained[st]??={}),d);
  if(d<0){
   bump((delivered[st]??={}),-d);
   if(!dropping.has(p.id)){bump((perTrip[st]??={}),was);const a=(atCap[st]??={trips:0,full:0});a.trips++;if(was>=Math.floor(carryCap(w,p)/WEIGHT.stone))a.full++;}
   dropping.add(p.id);
  }else dropping.delete(p.id);
  prev.set(p.id,now);
 }
 for(const s of w.sites){
  const need=s.required.stone??0;if(need<=0)continue;
  let l=sites.get(s.id);
  if(!l){l={woodDone:null,id:s.id,type:s.type,stoneNeed:need,woodNeed:s.required.wood??0,createdTick:s.createdTick,firstStone:null,stoneDone:null,doneTick:null,deliverers:new Set(),stoneDeliveries:0,lastSeen:w.tick,hhId:s.hhId};sites.set(s.id,l);}
  l.lastSeen=w.tick;
  const have=(s.delivered.stone??0)+(s.used.stone??0);
  if(have>0&&l.firstStone===null)l.firstStone=w.tick;
  if(have>=need&&l.stoneDone===null)l.stoneDone=w.tick;
  const wn=s.required.wood??0,wh=(s.delivered.wood??0)+(s.used.wood??0);
  if(wh>=wn&&l.woodDone===null)l.woodDone=w.tick;
 }
 // a site gone from w.sites was completed (or abandoned); a building with the same footprint is its completion
 if(w.tick%120===0){
  for(const l of sites.values())if(l.doneTick===null&&!w.sites.some(s=>s.id===l.id))l.doneTick=w.tick;
  for(const p of w.persons){if(!p.alive)continue;const st=stageOf(w,p);bump((capByStage[st]??={}),carryCap(w,p));
   if(st!=='child'){const b=(basketShare[st]??={n:0,basket:0});b.n++;if((p.inv.basket??0)>0)b.basket++;}}
 }
}
// load at delivery cannot be read after the fact; the delivery size histogram stands for it
const siteRows=[...sites.values()].map(l=>({id:l.id,type:l.type,stoneNeed:l.stoneNeed,createdDay:+(l.createdTick/DAY).toFixed(2),firstStoneAfterH:l.firstStone===null?null:+((l.firstStone-l.createdTick)/100).toFixed(1),
 stoneCompleteAfterH:l.stoneDone===null?null:+((l.stoneDone-l.createdTick)/100).toFixed(1),woodCompleteAfterH:l.woodDone===null?null:+((l.woodDone-l.createdTick)/100).toFixed(1),stoneLastByH:l.stoneDone!==null&&l.woodDone!==null?+((l.stoneDone-l.woodDone)/100).toFixed(1):null,finished:l.doneTick!==null,stillOpenAtEnd:w.sites.some(s=>s.id===l.id),
 openDaysAtEnd:w.sites.some(s=>s.id===l.id)?+((w.tick-l.createdTick)/DAY).toFixed(2):null}));
const open=siteRows.filter(r=>r.stillOpenAtEnd);
const stage=['child','youth','adult','elder'];
const mean=(h:Hist)=>{let n=0,t=0;for(const k in h){n+=h[k];t+=Number(k)*h[k];}return n?+(t/n).toFixed(2):null;};
const res={arm,seed,profile,rules:Number(rules),days:Number(days),weights:{stone:WEIGHT.stone,wood:WEIGHT.wood},
 exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 capSeen:Object.fromEntries(stage.map(s=>[s,capByStage[s]??{}])),
 basketShareOfSamples:Object.fromEntries(Object.entries(basketShare).map(([k,v])=>[k,{samples:v.n,withBasket:v.basket,share:+(v.basket/Math.max(1,v.n)).toFixed(3)}])),
 stoneGainedPerTickWhenGained:Object.fromEntries(stage.map(s=>[s,{hist:gained[s]??{},mean:mean(gained[s]??{})}])),
 stoneCarriedAtStartOfADelivery:Object.fromEntries(stage.map(s=>[s,{trips:atCap[s]?.trips??0,shareAtPackLimit:atCap[s]?+(atCap[s].full/Math.max(1,atCap[s].trips)).toFixed(3):null,hist:perTrip[s]??{},mean:mean(perTrip[s]??{})}])),
 stoneSites:{total:siteRows.length,finished:siteRows.filter(r=>r.finished).length,openAtEnd:open.length,byType:siteRows.reduce((a:Record<string,number>,r)=>{a[r.type]=(a[r.type]??0)+1;return a;},{})},
 rows:siteRows};
writeFileSync(out,JSON.stringify(res,null,1));
const hutRows=siteRows.filter(r=>r.type==='hut');
console.log(JSON.stringify({seed,profile,rules:res.rules,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,sites:res.stoneSites,huts:hutRows.map(r=>({createdDay:r.createdDay,firstStoneH:r.firstStoneAfterH,stoneCompleteH:r.stoneCompleteAfterH,finished:r.finished,openDays:r.openDaysAtEnd})),
 tripLoad:Object.fromEntries(stage.map(s=>[s,{trips:res.stoneCarriedAtStartOfADelivery[s].trips,mean:res.stoneCarriedAtStartOfADelivery[s].mean,atLimit:res.stoneCarriedAtStartOfADelivery[s].shareAtPackLimit}])),basket:res.basketShareOfSamples}));
