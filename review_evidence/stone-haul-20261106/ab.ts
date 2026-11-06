// ORDINARY A/B (read-only observer): the same founding world at two rules versions (or with a rules-162 part removed), stepped side by side with an
// unsampled twin. Records: when the first storehouse is laid out and finished, stone by place every 120 ticks, every change in a person's stone classified by
// what they were doing the tick before, sites started and buildings standing by type, tools held, survival. Normal, arrivals on.
// Usage: vite-node <this> -- <seed> <rules> <days> <out> [removalSpec ...]  (a removalSpec is a lab intervention name, e.g. rich-no-shared-stone)
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {parseIntervention} from '../../scripts/lab/lab';
import {DAY} from '../../src/sim/constants';
import type {Person,World} from '../../src/sim/types';
const [seed='river',rules='162',days='25',out='ab.json',...specs]=process.argv.slice(2);
const undo=specs.map(s=>parseIntervention(s).install());
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const target=(w2:World,p:Person):string=>{
 const a=p.activity;if(!a)return 'no activity';
 const e=w2.byId.get(a.targetId);
 const t=!e?'no target':e.ent==='building'?`building:${e.type}${e.hhId===0?'(public)':e.hhId===p.hhId?'(own hh)':'(other hh)'}`:e.ent==='source'?`source:${e.type}`:e.ent==='site'?`site:${e.type}`:e.ent==='person'?'person':e.ent;
 return `${a.kind} -> ${t}`;
};
const gain:Hist={},loss:Hist={};const before=new Map<number,string>(),prev=new Map<number,number>();
const sitesSeen=new Map<number,string>();
let firstSiteTick:number|null=null,builtTick:number|null=null;
const series:{tick:number;storehouseStone:number;quarryStone:number;packStone:number;stoneLackedBySites:number;storehouseWood:number}[]=[];
const census:Record<string,Hist>={};
while(w.tick<Number(days)*DAY){
 for(const p of w.persons)if(p.alive)before.set(p.id,target(w,p));
 stepWorld(w);stepWorld(twin);
 for(const p of w.persons){
  if(!p.alive){prev.delete(p.id);continue;}
  const now=p.inv.stone??0,was=prev.get(p.id);prev.set(p.id,now);
  if(was===undefined||now===was)continue;
  const d=now-was,k=before.get(p.id)??'unknown';
  bump(d>0?gain:loss,k,Math.abs(d));
 }
 for(const s of w.sites)if(!sitesSeen.has(s.id))sitesSeen.set(s.id,s.type);
 if(firstSiteTick===null&&w.sites.some(s=>s.type==='storehouse'))firstSiteTick=w.tick;
 if(builtTick===null&&w.buildings.some(b=>b.type==='storehouse'))builtTick=w.tick;
 if(w.tick%120===0){
  let ss=0,sw=0,qs=0,ps=0,lack=0;
  for(const b of w.buildings){if(b.type==='storehouse'){ss+=b.store.items.stone??0;sw+=b.store.items.wood??0;}if(b.type==='quarry')qs+=b.store.items.stone??0;}
  for(const p of w.persons)if(p.alive)ps+=p.inv.stone??0;
  for(const s of w.sites)lack+=Math.max(0,(s.required.stone??0)-(s.delivered.stone??0)-(s.used.stone??0));
  series.push({tick:w.tick,storehouseStone:ss,quarryStone:qs,packStone:ps,stoneLackedBySites:lack,storehouseWood:sw});
 }
 if([5,10,15,25].some(d=>w.tick===d*DAY)){const h:Hist={};for(const b of w.buildings)bump(h,b.type);census[`day${w.tick/DAY}`]=h;}
}
const startedByType:Hist={};for(const t of sitesSeen.values())bump(startedByType,t);
const toolsByKind:Hist={};for(const t of w.tools)bump(toolsByKind,t.kind);
const top=(h:Hist)=>Object.entries(h).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,n])=>({where:k,stone:n}));
const sum=(h:Hist)=>Object.values(h).reduce((a,b)=>a+b,0);
const mean=(xs:number[])=>xs.length?+(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1):0;
const res={seed,rules:Number(rules),days:Number(days),removed:specs,exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 storehouse:{firstSiteDay:firstSiteTick===null?null:+(firstSiteTick/DAY).toFixed(2),builtDay:builtTick===null?null:+(builtTick/DAY).toFixed(2),standing:w.buildings.filter(b=>b.type==='storehouse').length,openSites:w.sites.filter(s=>s.type==='storehouse').length},
 storehouseStoneMean:mean(series.map(r=>r.storehouseStone)),storehouseStoneMax:Math.max(0,...series.map(r=>r.storehouseStone)),quarryStoneMean:mean(series.map(r=>r.quarryStone)),packStoneMean:mean(series.map(r=>r.packStone)),stoneLackedMean:mean(series.map(r=>r.stoneLackedBySites)),
 stoneGained:sum(gain),stoneLeftPacks:sum(loss),gainedFrom:top(gain),leftTo:top(loss),
 sitesStartedByType:startedByType,standingAtEnd:(()=>{const h:Hist={};for(const b of w.buildings)bump(h,b.type);return h;})(),census,toolsByKind,series};
writeFileSync(out,JSON.stringify(res,null,1));
const {series:_s,census:_c,...short}=res;console.log(JSON.stringify(short));
undo.reverse().forEach(f=>f());
