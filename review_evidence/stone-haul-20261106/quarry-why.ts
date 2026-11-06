// ORDINARY diagnosis (read-only): a quarry holds stone, a stone-short site exists, and a person who may draw that stone does not fetch it. Why?
// Every 120 ticks, for each (quarry holding >=3 stone, person aged 12+ with a household whose accessLevel is not 'none' and who has a site of
// theirs, or a public site they support, lacking stone) the chain is followed: do they know the quarry? what stock do they believe it holds?
// would the code's own filters admit it? did their last decision weigh any "Collect ... stone" option, and what did they choose instead?
// Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>. Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {accessLevel,usableUnits} from '../../src/sim/facilities';
import {mayWorkProject} from '../../src/sim/townships';
import {DAY} from '../../src/sim/constants';
const [seed='river',rules='161',days='25',out='quarry-why.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const chain:Hist={};const chosen:Hist={};const whatLabel:Hist={};const believedStock:Hist={};
let pairs=0;
const stoneSiteFor=(w2:typeof w,hh:number,pid:number)=>w2.sites.some(s=>(s.required.stone??0)>(s.delivered.stone??0)+(s.used.stone??0)&&(s.hhId===hh||(s.hhId===0&&mayWorkProject(w2,w2.persons.find(q=>q.id===pid)!,s.id))));
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 if(w.tick%120)continue;
 for(const b of w.buildings){
  if(b.type!=='quarry'||(b.store.items.stone??0)<3)continue;
  for(const p of w.persons){
   if(!p.alive||!p.hhId||stageOf(w,p)==='child'||stageOf(w,p)==='youth')continue;
   if(accessLevel(w,p,b)==='none'||usableUnits(w,b,p,'stone')<1)continue;
   if(!stoneSiteFor(w,p.hhId,p.id))continue;
   pairs++;
   const bel=p.beliefs[b.id];
   if(!bel){bump(chain,'1 does not know the quarry');continue;}
   const bs=bel.items?.stone??0;bump(believedStock,Math.min(6,bs));
   if(bs<1){bump(chain,'2 knows it but believes it holds no stone');continue;}
   if(w.tick-bel.seen>DAY*3){bump(chain,'3 knows it, believes stone, belief older than 3 days');}
   const d=p.lastDecision;if(!d){bump(chain,'4 no decision recorded');continue;}
   const all=[...(d.chosen?[d.chosen]:[]),...d.alternatives];
   const col=all.filter(o=>/Collect/i.test(o.label)&&/stone/i.test(o.label));
   if(!col.length){bump(chain,'5 believes stone is there; no stone-collect option was weighed');
    bump(chosen,d.chosen?d.chosen.kind:'(none)');bump(whatLabel,(d.chosen?.label??'(none)').replace(/\d+/g,'N').slice(0,60));continue;}
   const rank=all.indexOf(col[0]);
   bump(chain,rank===0?'7 stone-collect was chosen':'6 stone-collect was weighed but outranked');
   if(rank>0){bump(chosen,d.chosen?d.chosen.kind:'(none)');}
  }
 }
}
const res={seed,profile,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 pairs,chain,believedStockOfQuarry:believedStock,chosenInsteadKind:chosen,chosenInsteadLabel:Object.fromEntries(Object.entries(whatLabel).sort((a,b)=>b[1]-a[1]).slice(0,12))};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify(res));
