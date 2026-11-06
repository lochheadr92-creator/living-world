// ORDINARY diagnosis (read-only): where does stone physically sit while stone-short sites wait, and how long do people hold it?
// Normal, arrivals on, rules pinned. Every 120 ticks: stone in packs (with what the holder is doing and how long they have held any
// stone), in buildings by role, in ground piles, delivered to open sites, still in rock sources, and the stone open sites still lack.
// Usage: vite-node <this> <seed> <rules> <days> <out>. Nothing here writes to the world; an unsampled twin must match.
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {DAY,BUILD_DEF} from '../../src/sim/constants';
import {reservedFor} from '../../src/sim/reserved_goods';
const [seed='river',rules='161',days='25',out='where.json',profile='normal']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings(profile as 'normal'|'large',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const holdSince=new Map<number,number>();
type Hist=Record<string,number>;
const bump=(h:Hist,k:string|number,n=1)=>{h[String(k)]=(h[String(k)]??0)+n;};
let samples=0;
const lvl={pack:0,homeStore:0,sharedStore:0,otherStore:0,pile:0,siteDelivered:0,rockInGround:0,siteStillLacks:0};
const lvlWhenLacking={pack:0,homeStore:0,sharedStore:0,otherStore:0,pile:0,rockInGround:0,siteStillLacks:0,n:0};
const holders:{dwellH:Hist;doing:Hist;haveOpenSiteLackingStone:Hist;withBasket:Hist;stage:Hist;holdersTotal:number}={dwellH:{},doing:{},haveOpenSiteLackingStone:{},withBasket:{},stage:{},holdersTotal:0};
const why:{spareOfHeld:Hist;reservedOfHeld:Hist;activePlanKinds:Hist;hasActiveCommitment:Hist;errandForStone:Hist;heldBySpareAndPlan:Hist}={spareOfHeld:{},reservedOfHeld:{},activePlanKinds:{},hasActiveCommitment:{},errandForStone:{},heldBySpareAndPlan:{}};
const storeStone:Record<string,{max:number;sum:number;n:number}>={};
let maxSharedStoreStone=0;
while(w.tick<Number(days)*DAY){
 stepWorld(w);stepWorld(twin);
 for(const p of w.persons){if(!p.alive){holdSince.delete(p.id);continue;}
  if((p.inv.stone??0)>0){if(!holdSince.has(p.id))holdSince.set(p.id,w.tick);}else holdSince.delete(p.id);}
 if(w.tick%120)continue;
 samples++;
 let pack=0,homeStore=0,sharedStore=0,otherStore=0,pile=0,siteDelivered=0,rock=0,lacks=0;
 for(const p of w.persons)if(p.alive)pack+=p.inv.stone??0;
 for(const b of w.buildings){const n=b.store.items.stone??0;if(!n)continue;const role=BUILD_DEF[b.type]?.role;
  if(role==='home')homeStore+=n;else if(b.type==='storehouse')sharedStore+=n;else otherStore+=n;
  const s=(storeStone[b.type]??={max:0,sum:0,n:0});s.max=Math.max(s.max,n);s.sum+=n;s.n++;
  if(b.type==='storehouse')maxSharedStoreStone=Math.max(maxSharedStoreStone,n);}
 for(const q of w.piles)pile+=q.items.stone??0;
 for(const s of w.sites){const need=s.required.stone??0;if(!need)continue;const got=(s.delivered.stone??0)+(s.used.stone??0);siteDelivered+=Math.max(0,(s.delivered.stone??0));lacks+=Math.max(0,need-got);}
 for(const s of w.sources)if(s.item==='stone')rock+=s.amount;
 lvl.pack+=pack;lvl.homeStore+=homeStore;lvl.sharedStore+=sharedStore;lvl.otherStore+=otherStore;lvl.pile+=pile;lvl.siteDelivered+=siteDelivered;lvl.rockInGround+=rock;lvl.siteStillLacks+=lacks;
 if(lacks>0){lvlWhenLacking.n++;lvlWhenLacking.pack+=pack;lvlWhenLacking.homeStore+=homeStore;lvlWhenLacking.sharedStore+=sharedStore;lvlWhenLacking.otherStore+=otherStore;lvlWhenLacking.pile+=pile;lvlWhenLacking.rockInGround+=rock;lvlWhenLacking.siteStillLacks+=lacks;}
 for(const p of w.persons){if(!p.alive||!(p.inv.stone??0))continue;
  holders.holdersTotal++;
  bump(holders.dwellH,Math.min(48,Math.floor((w.tick-(holdSince.get(p.id)??w.tick))/100)));
  bump(holders.doing,p.activity?`${p.activity.kind}`:'idle');
  bump(holders.stage,stageOf(w,p));
  {const held=p.inv.stone??0,res=reservedFor(w,p,'stone'),spare=Math.max(0,held-res);
   bump(why.spareOfHeld,Math.min(4,spare));bump(why.reservedOfHeld,Math.min(4,res));
   const plans=p.intentions.filter(i=>i.status==='active').map(i=>i.kind);for(const k of new Set(plans))bump(why.activePlanKinds,k);
   if(!plans.length)bump(why.activePlanKinds,'(no active plan)');
   bump(why.hasActiveCommitment,p.commitments.some(c=>c.status==='active')?'yes':'no');
   bump(why.errandForStone,p.errand?.item==='stone'?'yes':'no');
   bump(why.heldBySpareAndPlan,(spare>0?'spare>0':'nothing spare')+' / '+(plans.length?'has active plan':'no active plan'));}
  bump(holders.withBasket,(p.inv.basket??0)>0?'basket':'no basket');
  const hh=w.sites.some(s=>s.hhId===p.hhId&&(s.required.stone??0)>((s.delivered.stone??0)+(s.used.stone??0)));
  bump(holders.haveOpenSiteLackingStone,hh?'own household site lacks stone':'no own-household site lacks stone');}
}
const per=(x:number)=>+(x/Math.max(1,samples)).toFixed(2);
const perL=(x:number)=>+(x/Math.max(1,lvlWhenLacking.n)).toFixed(2);
const res={seed,profile,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,
 samples,meanStoneAcrossAllSamples:{inPacks:per(lvl.pack),inHomeStores:per(lvl.homeStore),inStorehouses:per(lvl.sharedStore),inOtherStores:per(lvl.otherStore),inGroundPiles:per(lvl.pile),deliveredToOpenSites:per(lvl.siteDelivered),leftInRockSources:per(lvl.rockInGround),stillLackedByOpenSites:per(lvl.siteStillLacks)},
 samplesWithAStoneShortSite:lvlWhenLacking.n,meanStoneWhileASiteLacksStone:{inPacks:perL(lvlWhenLacking.pack),inHomeStores:perL(lvlWhenLacking.homeStore),inStorehouses:perL(lvlWhenLacking.sharedStore),inOtherStores:perL(lvlWhenLacking.otherStore),inGroundPiles:perL(lvlWhenLacking.pile),leftInRockSources:perL(lvlWhenLacking.rockInGround),lacked:perL(lvlWhenLacking.siteStillLacks)},
 storeStoneByBuildingType:Object.fromEntries(Object.entries(storeStone).map(([k,v])=>[k,{maxSeen:v.max,meanWhenHeld:+(v.sum/v.n).toFixed(2),samplesHeld:v.n}])),
 maxStoneEverInAStorehouse:maxSharedStoreStone,holders,why};
writeFileSync(out,JSON.stringify(res,null,1));
console.log(JSON.stringify({seed,exactTwin:res.exactTwin,conserved:res.conserved,alive:res.alive,samples,meanStoneAcrossAllSamples:res.meanStoneAcrossAllSamples,whileShort:res.meanStoneWhileASiteLacksStone,samplesWithAStoneShortSite:lvlWhenLacking.n,holderDoing:holders.doing,own:holders.haveOpenSiteLackingStone}));
