// ORDINARY diagnosis (read-only): once a public storehouse stands (rules 162), why is nobody restocking it with stone? Every 120 ticks, for each person aged 12+,
// the gates of communal_stock.ts communalStockOptions are re-evaluated in their own order from the options context the person really had; the first that stops
// them is counted. Rules 162, Normal, arrivals on. Usage: vite-node <this> -- <seed> <rules> <days> <out>. Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {generateOptions} from '../../src/sim/decision';
import {materialNeeds} from '../../src/sim/options_work';
import {beliefsByKind} from '../../src/sim/optutil';
import {recentFailure} from '../../src/sim/knowledge';
import {DAY} from '../../src/sim/constants';
const [seed='river',rules='162',days='14',out='restock-gate.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
const gate:Hist={},needKinds:Hist={},offered:Hist={};let samples=0;
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 if(w.tick%120||!w.buildings.some(b=>b.type==='storehouse'&&b.hhId===0))continue;
 for(const p of w.persons){
  if(!p.alive||!p.hhId||stageOf(w,p)==='child')continue;
  samples++;
  const ctx=generateOptions(w,p,true,true);
  const stores=beliefsByKind(p,['building']).filter(b=>b.btype==='storehouse'&&b.hh===0&&(b.cond??0)>0&&w.tick-b.seen<=DAY&&!recentFailure(w,p,b.id,320));
  const needs=materialNeeds(ctx);
  const why=
   ctx.night?'1 night':
   ctx.drives.hunger>25||ctx.drives.thirst>25||ctx.drives.energy>40?'2 hungry, thirsty or tired':
   !stores.length?'3 does not know a public store seen within a day':
   needs.some(n=>n.item==='stone')?'4 has a need for stone of their own':
   p.intentions.some(i=>i.status==='active')?'5 has an active plan':
   p.commitments.some(c=>c.status==='active')?'6 has an active promise':
   p.errand?'7 is on an errand':
   '8 passes every gate';
  bump(gate,why);
  if(why.startsWith('4'))for(const k of new Set(needs.map(n=>`${n.tag}:${n.item}`)))bump(needKinds,k);
  if(why.startsWith('5'))for(const i of p.intentions.filter(i=>i.status==='active'))bump(needKinds,'plan:'+i.kind);
  if(why.startsWith('8')){
   const store=ctx.options.filter(o=>o.tag==='store'&&(o.kind==='withdraw'||o.kind==='gather'));
   const top=Math.max(...ctx.options.map(o=>o.util),0);
   bump(offered,store.length?'a store-restock option was offered':'none offered although every gate passed');
   if(store.length){const best=Math.max(...store.map(o=>o.util));bump(offered,best>=top-0.001?'  and it was the top option':'  but it ranked below the top by '+(Math.round((top-best)/5)*5)+'+');bump(offered,'  kinds: '+[...new Set(store.map(o=>o.kind+':'+(o.yields??'')))].join('+'));}
  }
 }
}
const res={seed,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,samples,firstGateStopping:gate,materialNeedsOfThoseStoppedThere:needKinds,whenAllPassed:offered};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify(res));
