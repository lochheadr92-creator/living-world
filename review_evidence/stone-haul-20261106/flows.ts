// ORDINARY diagnosis (read-only): where does stone come from and where does it go? Every tick, a person's change in p.inv.stone is
// classified by what they are doing and what that activity targets (a source type, a building type, a site, a person).
// Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>. An unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {DAY} from '../../src/sim/constants';
import type {Person,World} from '../../src/sim/types';
const [seed='river',rules='161',days='25',out='flows.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const gain:Hist={},loss:Hist={},gainEvents:Hist={},lossEvents:Hist={};
const bump=(h:Hist,k:string,n:number)=>{h[k]=(h[k]??0)+n;};
const prev=new Map<number,number>();
const before=new Map<number,string>(); // what each person was doing at the end of the previous tick: an activity has usually ended by the tick its stone moves
const target=(w:World,p:Person):string=>{
 const a=p.activity;if(!a)return 'no activity';
 const e=w.byId.get(a.targetId);
 const t=!e?'no target':e.ent==='building'?`building:${e.type}${e.hhId===p.hhId?'(own hh)':e.hhId===0?'(public)':'(other hh)'}`:e.ent==='source'?`source:${e.type}`:e.ent==='site'?`site:${e.type}${e.hhId===p.hhId?'(own hh)':'(other hh)'}`:e.ent==='person'?'person':e.ent;
 return `${a.kind} -> ${t}`;
};
while(w.tick<Number(days)*DAY){
 for(const p of w.persons)if(p.alive)before.set(p.id,target(w,p));
 stepWorld(w);stepWorld(twin);
 for(const p of w.persons){
  if(!p.alive){prev.delete(p.id);continue;}
  const now=p.inv.stone??0,was=prev.get(p.id);prev.set(p.id,now);
  if(was===undefined||now===was)continue;
  const d=now-was,k=before.get(p.id)??'unknown';
  if(d>0){bump(gain,k,d);bump(gainEvents,k,1);}else{bump(loss,k,-d);bump(lossEvents,k,1);}
 }
}
const top=(h:Hist,e:Hist)=>Object.entries(h).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([k,n])=>({where:k,stone:n,events:e[k]}));
const res={seed,profile,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 totalGained:Object.values(gain).reduce((a,b)=>a+b,0),totalLost:Object.values(loss).reduce((a,b)=>a+b,0),gains:top(gain,gainEvents),losses:top(loss,lossEvents)};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,exactTwin:res.exactTwin,conserved:res.conserved,totalGained:res.totalGained,totalLost:res.totalLost}));
