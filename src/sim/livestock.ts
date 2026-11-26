import { grainFeedEnabled } from './plenty';
import { herdReasons,stockedForAnother,valuesHerd } from './herd_value';
import { FARM_RECIPES, canProcess, processProducts, stationMatches } from './farm_products';
import {makeSource} from './sources';
import {isFreeLand} from './registry';
import { BUILD_DEF } from './constants';
import { addItem } from './economy';
import { FARM_SPECIES, farmEnabled, breedingSeason, speciesOf, maturity, homeForAnimal, houses, housingCapacity } from './farm_species';
import type { FarmSpecies } from './types';
import {harvestPressure} from './ecology';
import type {Animal,Activity,Person,World} from './types';
import {DAY,NUTRITION} from './constants';
import {runsRulesVersion} from './rulesversion';
import {makeWolf,moveLocalAnimal,localAnimalPath} from './wildlife';
import {isWalkable,isWaterAccess} from './registry';
import {shoreWater} from './water_access';
import {drawWater} from './hydrology';
import {consume,ledgerConsume,ledgerSpoil,ledgerCreate,transfer,roomFor,foodUnits} from './economy';
import {carryCap,stageOf} from './people';
import {newActivity,registerHandler} from './activities';
import {observe,noteFailure,recentFailure,estimatedAmount} from './knowledge';
import {reservedFor} from './reserved_goods';
import {makeCarcass} from './carcass';
import {addEvent,addLog} from './events';
import {addOption,addBlocked,pen} from './optutil';
import {earlierFoodRoute} from './livestock_food';
import type {Ctx} from './optutil';
export interface SheepState {
 housing?:number; lactatingUntil?:number; produceWork?:number;
 origin:'founder'|'birth';parents:number[];born:number;sex:'f'|'m';hhId:number;
 food:number;water:number;growth:number;wool:number;woolWork:number;
 tether:null|{x:number;y:number;condition:number};
 pregnancy:null|{father:number;started:number;work:number;clutch?:number};breedAfter:number;
 forageTarget:number;forageWork:number;waterMemory:null|{x:number;y:number};
}
export interface SheepMemory {species?:FarmSpecies; housing?:number; ready?:boolean;hhId:number;sex:'f'|'m';adult:boolean;hungry:boolean;thirsty:boolean;wool:number;tether:number;pregnant:boolean;breedAfter:number;}
export const hasLivestock=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,129);
export const SHEEP_MATURE=8*DAY,SHEEP_GESTATION=4*DAY;
export function makeSheep(w:World,x:number,y:number,sex:'f'|'m',parents:number[]=[]):Animal{
 return makeFarmAnimal(w,x,y,'sheep',sex,parents);
}
export function makeFarmAnimal(w:World,x:number,y:number,species:FarmSpecies,sex:'f'|'m',parents:number[]=[]):Animal{
 const a=makeWolf(w,x,y,species);a.sheep={origin:parents.length?'birth':'founder',parents:[...parents],born:w.tick,sex,hhId:0,food:0,water:0,growth:parents.length?0:maturity(w,a),wool:0,woolWork:0,tether:null,pregnancy:null,breedAfter:0,forageTarget:0,forageWork:0,waterMemory:null};return a;
}
/** Select the same drinkable bank at placement and when foraging, including scan-order ties. */
function nearestDrinkingBank(w:World, x:number, y:number, allowed?:(x:number,y:number)=>boolean) {
  const radius = 8;
  let nearest: {id:number; x:number; y:number; kind:'water'} | undefined;
  let best = Infinity;
  for (let dy=-radius; dy<=radius; dy++) for (let dx=-radius; dx<=radius; dx++) {
    const tx=Math.floor(x)+dx, ty=Math.floor(y)+dy;
    const bx=tx+.5, by=ty+.5, distance=Math.hypot(bx-x,by-y);
    if (distance>radius || distance>=best || (allowed && !allowed(bx,by)) || !isWaterAccess(w,tx,ty)) continue;
    if ((shoreWater(w,bx,by)?.body.amount ?? 0)<1) continue;
    nearest={id:-1-ty*w.W-tx, x:bx, y:by, kind:'water'};
    best=distance;
  }
  return nearest;
}

/** One founding pair on reachable land near existing forage and water, never a replenishment. */
export function seedSheep(w:World,reach?:Uint8Array):void{
 if(!hasLivestock(w)||w.animals.some(a=>a.type==='sheep'))return;
 const hub=w.persons[0];if(!hub)return;
 const candidates=w.sources.filter(s=>['berries','fruit','grain'].includes(s.item)&&s.amount>=2).sort((a,b)=>Math.hypot(a.x-hub.x,a.y-hub.y)-Math.hypot(b.x-hub.x,b.y-hub.y));
 const founders:FarmSpecies[]=farmEnabled(w)?['sheep','chicken','pig','goat','cow']:['sheep'];
 for(const food of candidates){for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const x=food.x+dx,y=food.y+dy;if(!isWalkable(w,x,y)||reach&&reach[y*w.W+x]!==1)continue;
  let water=false;for(let yy=-6;yy<=6&&!water;yy++)for(let xx=-6;xx<=6;xx++)if(isWaterAccess(w,x+xx,y+yy)&&shoreWater(w,x+xx+.5,y+yy+.5)?.body.amount!>=1){water=true;break;}
  if(!water)continue;
  if(runsRulesVersion(w,276)){
   const bank=nearestDrinkingBank(w,x+.5,y+.5);
   if(!bank || localAnimalPath(w,x+.5,y+.5,bank.x,bank.y)===null)continue;
  }
  const species=founders.shift()!;if(farmEnabled(w)&&isFreeLand(w,x,y))makeSource(w,'hay_meadow',x,y);makeFarmAnimal(w,x+.5,y+.5,species,'f');makeFarmAnimal(w,x+.5,y+.5,species,'m');if(!founders.length)return;
 }}
}
const duration:Record<string,number>={mix_feed:50,acquire:120,feed:30,water:30,shear:80,mate:100,repair:60,slaughter:160,house:100,milk:55,egg:30,hay_feed:30,...Object.fromEntries(Object.entries(FARM_RECIPES).map(([k,r])=>['process_'+k,r.work]))};
const adult=(w:World,a:Animal)=>!!a.sheep&&a.sheep.growth>=maturity(w,a);
const householdLimit=(w:World)=>farmEnabled(w)?32:4;
const worldLimit=(w:World)=>farmEnabled(w)?120:12;
const ownedCount=(w:World,hh:number)=>w.animals.filter(a=>a.sheep?.hhId===hh).length;
const free=(w:World,p:Person,k:'hay'|'grain'|'wood'|'fibre'|'water')=>(p.inv[k]??0)-reservedFor(w,p,k);
function issue(w:World,p:Person,a:Activity):string|undefined{
 if(!hasLivestock(w)||stageOf(w,p)==='child')return 'animal work needs a grown keeper';
 const op=String(a.data.op),animal=w.byId.get(a.targetId);if(!Object.hasOwn(duration,op))return 'unknown animal work';
 if(op==='mix_feed'){
  if(!grainFeedEnabled(w)||animal?.ent!=='building'||animal.hhId!==p.hhId||!housingCapacity(animal.type)||animal.condition<=0)return 'needs household livestock housing';
  if(Math.hypot(p.x-animal.doorX,p.y-animal.doorY)>2)return 'must reach the feed trough';
  if(free(w,p,'grain')<1||foodUnits(p.inv)<=2)return 'keep food for people';
  if((animal.store.items.stock_feed??0)>=6||roomFor(animal.store.items,animal.store.cap,'stock_feed')<2)return 'trough is stocked or full';
  return;
 }
 if(op.startsWith('process_')){
  const r=FARM_RECIPES[op.slice(8)];
  if(!r||!canProcess(w,p,r)||animal?.ent!=='building'||!stationMatches(animal.type,r)||animal.condition<=0||animal.hhId!==p.hhId&&animal.type!=='fire'||animal.type==='fire'&&animal.fuel<=0)return 'the station or ingredients are unavailable';
  if(Math.hypot(p.x-animal.doorX,p.y-animal.doorY)>2)return 'must reach the work station';
  return;
 }
 if(animal?.ent!=='animal'||!animal.sheep||animal.health<=0)return 'the sheep is gone';
 if(p.indoors||Math.hypot(p.x-animal.x,p.y-animal.y)>2)return 'must reach the sheep';
 const s=animal.sheep;
 if(op==='acquire'){
  if((s.hhId&&s.hhId!==p.hhId)||s.tether)return 'the animal already has a keeper';if(ownedCount(w,p.hhId)>=householdLimit(w)+(s.hhId===p.hhId?1:0))return 'the household herd is full';
  if(free(w,p,'wood')<2||free(w,p,'fibre')<1||free(w,p,'grain')<1)return 'needs two wood, one fibre and one grain';
 }else if(op==='house'&&!s.tether&&(!s.hhId||s.hhId===p.hhId)){
  if(free(w,p,'grain')<1||ownedCount(w,p.hhId)>=householdLimit(w))return 'need grain to lead the animal to its pen';
 }else if(s.hhId!==p.hhId||!s.tether)return 'the sheep belongs to another household or is no longer contained';
 if(['house','milk','egg','hay_feed'].includes(op)&&!farmEnabled(w))return 'livestock rule unavailable';
 if(op==='house'){
  const b=w.byId.get(a.data.homeId);
  if(b?.ent!=='building'||b.hhId!==p.hhId||b.condition<=0||!houses(b.type,speciesOf(animal))||s.housing||w.animals.filter(other=>other.sheep?.housing===b.id).length>=housingCapacity(b.type))return 'no suitable pen with room';
 }
 if(op==='milk'||op==='egg'){
  const item=op==='milk'?'milk':'egg';
  if(!adult(w,animal)||s.sex!=='f'||(s.produceWork??0)<DAY||roomFor(p.inv,carryCap(w,p),item)<1)return 'no portion ready or pack full';
  if(op==='milk'&&(!['cow','goat','sheep'].includes(animal.type)||(s.lactatingUntil??0)<=w.tick)||op==='egg'&&animal.type!=='chicken')return 'no produce available';
 }
 if(op==='hay_feed'&&(!['cow','goat','sheep'].includes(animal.type)||free(w,p,'hay')<1||s.food>22))return 'cannot feed hay';
 if(op==='feed'&&(free(w,p,'grain')<1||s.food>22))return 'needs spare grain and room for a portion';
 if(op==='water'&&(free(w,p,'water')<1||s.water>1))return 'needs carried water and room for a unit';
 if(op==='shear'&&(s.wool<1||roomFor(p.inv,carryCap(w,p),'wool')<1))return 'no grown fleece or no pack room';
 if(op==='repair'&&free(w,p,'fibre')<1)return 'no spare fibre for the tether';
 if(op==='mate'){
  if(farmEnabled(w)&&!breedingSeason(w,speciesOf(animal)))return 'outside the breeding season';
  if(farmEnabled(w)&&animal.type==='chicken'&&(s.produceWork??0)<DAY)return 'the hen has no eggs to brood';
  const mate=w.byId.get(a.data.mateId);
  if(!adult(w,animal)||s.sex!=='f'||s.pregnancy||w.tick<s.breedAfter||s.food<11||s.water<.5)return 'the ewe is not ready to breed';
  if(mate?.ent!=='animal'||mate.type!==animal.type||!mate.sheep||mate.sheep.sex!=='m'||mate.sheep.hhId!==p.hhId||!mate.sheep.tether||!adult(w,mate)||mate.sheep.food<11||mate.sheep.water<.5||Math.hypot(mate.x-animal.x,mate.y-animal.y)>4)return 'needs a nearby fed adult ram of our household';
  if(ownedCount(w,p.hhId)>=householdLimit(w)||w.animals.filter(a=>a.sheep).length>=worldLimit(w))return 'no room for another sheep';
 }
}
function beginBreeding(w:World,animal:Animal,father:number){
 const s=animal.sheep!;
 const clutch=animal.type==='chicken'?Math.floor((s.produceWork??0)/DAY):0;
 if(clutch)s.produceWork=0;
 s.pregnancy={father,started:w.tick,work:0,...(clutch?{clutch}:{})};
 const profile=FARM_SPECIES[speciesOf(animal)];
 s.breedAfter=w.tick+(farmEnabled(w)?profile.gestation+profile.recovery:8*DAY);
}
registerHandler('animal_work',{
 availability:.3,pose:()=> 'craft',
 begin(w,p,a){const why=issue(w,p,a);if(why)return why;a.duration=duration[a.data.op];},
 work(w,p,a){const why=issue(w,p,a);if(why)return `fail:${why}`;if(++a.progress<a.duration)return 'continue';
  if(a.data.op==='mix_feed'){
   const housing=w.byId.get(a.targetId);
   if(housing?.ent!=='building')return 'fail:housing unavailable';
   consume(w,p.inv,'grain',1,'mixing grain feed');
   addItem(housing.store.items,'stock_feed',2);
   ledgerCreate(w,'stock_feed',2,'mixing grain feed');
   return 'done';
  }
  if(String(a.data.op).startsWith('process_')){return processProducts(w,p,FARM_RECIPES[String(a.data.op).slice(8)])?'done':'fail:ingredients unavailable';}
  const animal=w.byId.get(a.targetId) as Animal,s=animal.sheep!,op=a.data.op;
  if(op==='acquire'){consume(w,p.inv,'wood',2,'sheep tether');consume(w,p.inv,'fibre',1,'sheep tether');consume(w,p.inv,'grain',1,'feeding sheep');s.food=Math.min(44,s.food+22);s.hhId=p.hhId;s.tether={x:animal.x,y:animal.y,condition:100};addLog(w,p,'work','Tethered a '+animal.type+' with wood and fibre, and fed it grain.');}
  if(op==='feed'){consume(w,p.inv,'grain',1,'feeding sheep');s.food+=22;}
  if(op==='house'){
   if(!s.tether){consume(w,p.inv,'grain',1,'leading livestock');s.food=Math.min(44,s.food+22);s.hhId=p.hhId;s.tether={x:animal.x,y:animal.y,condition:100};}
   s.housing=a.data.homeId;
  }
  if(op==='egg'||op==='milk'){const k=op==='egg'?'egg':'milk';s.produceWork=Math.max(0,(s.produceWork??0)-DAY);addItem(p.inv,k,1);ledgerCreate(w,k,1,'collecting '+k);}
  if(op==='hay_feed'){consume(w,p.inv,'hay',1,'feeding hay');s.food+=22;}
  if(op==='water'){consume(w,p.inv,'water',1,'watering sheep');s.water+=1;}
  if(op==='shear'){s.wool--;transfer(w,{wool:1},p.inv,carryCap(w,p),'wool',1,'animal:'+animal.id,'person:'+p.id,'shearing a fed sheep');}
  if(op==='repair'){consume(w,p.inv,'fibre',1,'repairing sheep tether');s.tether!.condition=Math.min(100,s.tether!.condition+40);}
  if(op==='mate')beginBreeding(w,animal,a.data.mateId);
  if(op==='slaughter'){makeCarcass(w,animal,p);return 'done';}
  observe(w,p,animal);return 'done';
 },
 onEnd(w,p,a,outcome,detail){const animal=w.byId.get(a.targetId);if(animal?.ent==='animal'&&!p.indoors&&Math.hypot(p.x-animal.x,p.y-animal.y)<=2)observe(w,p,animal);if(outcome==='failed')noteFailure(w,p,a.targetId,detail);}
});
/** The animal's own nearby senses, not a keeper's remote knowledge. */
function forage(w:World,a:Animal):void{
 const s=a.sheep!,anchor=s.tether;const allowed=(x:number,y:number)=>!anchor||Math.hypot(x-anchor.x,y-anchor.y)<=2;
 let target:{id:number;x:number;y:number;kind:'food'|'water'}|undefined;
 if(s.water<1){
  target=nearestDrinkingBank(w,a.x,a.y,allowed);
  if(target)s.waterMemory={x:target.x,y:target.y};
  else if(s.waterMemory&&allowed(s.waterMemory.x,s.waterMemory.y)){const m=s.waterMemory;
   if(Math.hypot(m.x-a.x,m.y-a.y)<=1.3&&(shoreWater(w,m.x,m.y)?.body.amount??0)<1)s.waterMemory=null;
   else target={id:-1-Math.floor(m.y)*w.W-Math.floor(m.x),x:m.x,y:m.y,kind:'water'};
  }
 }
 if(!target&&s.food<=22){const source=w.sources.filter(b=>(['berries','fruit','grain'].includes(b.item)||b.item==='hay'&&a.type!=='chicken'&&a.type!=='pig')&&b.amount-b.reserved>=1&&Math.hypot(b.x+.5-a.x,b.y+.5-a.y)<=8&&allowed(b.x+.5,b.y+.5)).sort((b,c)=>Math.hypot(b.x+.5-a.x,b.y+.5-a.y)-Math.hypot(c.x+.5-a.x,c.y+.5-a.y))[0];if(source)target={id:source.id,x:source.x+.5,y:source.y+.5,kind:'food'};}
 if(!target){s.forageTarget=0;s.forageWork=0;return;}
 // A remembered shore point is not water contact: actually reach a legal shore tile.
 const waterContact=target.kind!=='water'||isWaterAccess(w,Math.floor(a.x),Math.floor(a.y))&&(shoreWater(w,a.x,a.y)?.body.amount??0)>=1;
 if(Math.hypot(target.x-a.x,target.y-a.y)>1.3||!waterContact){s.forageWork=0;const x=a.x,y=a.y;moveLocalAnimal(w,a,target.x,target.y,.04);if(!allowed(a.x,a.y)){a.x=x;a.y=y;a.path=[];}return;}
 if(s.forageTarget!==target.id){s.forageTarget=target.id;s.forageWork=0;}
 if(++s.forageWork<60)return;s.forageWork=0;
 if(target.kind==='water'){const at=shoreWater(w,a.x,a.y);if(at&&at.body.amount>=1){const n=drawWater(w,at.body,1);ledgerConsume(w,'water',n,'sheep drinking');s.water=Math.min(2,s.water+n);}}
 else{const src=w.byId.get(target.id);if(src?.ent==='source'&&src.amount-src.reserved>=1){src.amount--;harvestPressure(w,src,1);ledgerConsume(w,src.item,1,'sheep grazing');s.food=Math.min(44,s.food+(src.item==='hay'?22:NUTRITION[src.item as keyof typeof NUTRITION]));}}
}
export function updateSheep(w:World,a:Animal):void{
 const s=a.sheep;if(!hasLivestock(w)||a.type!=='sheep'&&!farmEnabled(w)||!s||w.byId.get(a.id)!==a)return;
 const farm=farmEnabled(w), profile=FARM_SPECIES[speciesOf(a)];
 const home=farm && s.housing ? homeForAnimal(w,a) : undefined;
 if(s.housing && !home) delete s.housing;
 if(home && s.tether){
  const distance=Math.hypot(a.x-home.doorX,a.y-home.doorY);
  if(distance>1.5){moveLocalAnimal(w,a,home.doorX,home.doorY,.045);s.tether.x=a.x;s.tether.y=a.y;}
  else {
   s.tether.x=home.doorX;s.tether.y=home.doorY;
   const feed=a.type==='pig'||a.type==='chicken'?'grain':'hay';
   if(grainFeedEnabled(w)&&s.food<=33&&(home.store.items.stock_feed??0)>=1)s.food+=11*consume(w,home.store.items,'stock_feed',1,'livestock eating grain feed');
   else if(s.food<=22 && (home.store.items[feed]??0)>=1)s.food+=22*consume(w,home.store.items,feed,1,'livestock feed');
   if(s.water<=1 && (home.store.items.water??0)>=1)s.water+=consume(w,home.store.items,'water',1,'livestock drinking');
  }
 }
 const fed=s.food>0&&s.water>0;
 s.food=Math.max(0,s.food-(w.weather.temp<0&&!(home?.type==='barn'&&Math.hypot(a.x-home.doorX,a.y-home.doorY)<=1.5)?33:22)*(farm?profile.feed:1)/DAY);s.water=Math.max(0,s.water-(farm?profile.feed:1)/DAY);
 if(fed){s.growth=Math.min(maturity(w,a),s.growth+1);if(farm&&adult(w,a)&&s.sex==='f'&&(a.type==='chicken'&&!s.pregnancy||(s.lactatingUntil??0)>w.tick))s.produceWork=Math.min(a.type==='chicken'?profile.litter*DAY:DAY,(s.produceWork??0)+1);if(a.type==='sheep'&&s.wool<2&&++s.woolWork>=2*DAY){s.wool++;s.woolWork=0;ledgerCreate(w,'wool',1,'wool grown by fed sheep');}}
 if(s.tether&&!home){s.tether.condition=Math.max(0,s.tether.condition-.005);if(s.tether.condition===0){s.tether=null;s.hhId=0;s.pregnancy=null;addEvent(w,'life','A neglected sheep tether broke.',[],a.x,a.y);}}
 if(!fed)a.health=Math.max(0,a.health-.025);
 if(a.health<=0){a.health=.001;const body=makeCarcass(w,a,undefined,false,s.hhId);if(body&&!runsRulesVersion(w,269)){const c=body.carcass!;for(const k of ['meat','hide','fat'] as const){ledgerSpoil(w,k,c.remaining[k],'sheep lost to neglect');c.lost[k]+=c.remaining[k];c.remaining[k]=0;}c.emptySince=w.tick;}return;}
 // Kept adults sharing an enclosure can breed without waiting for a keeper's mating job.
 if(home && (w.tick+a.id)%120===0 && !s.pregnancy && s.sex==='f' && adult(w,a)
    && w.tick>=s.breedAfter && s.food>=11 && s.water>=.5 && breedingSeason(w,speciesOf(a))
    && (a.type!=='chicken'||(s.produceWork??0)>=DAY)
    && Math.hypot(a.x-home.doorX,a.y-home.doorY)<=1.5){
  const herd=w.animals.filter(b=>b.sheep?.housing===home.id);
  const mate=herd.find(b=>b.type===a.type&&b.sheep!.sex==='m'&&adult(w,b)&&b.sheep!.food>=11&&b.sheep!.water>=.5&&Math.hypot(b.x-a.x,b.y-a.y)<=2);
  if(mate&&herd.length<housingCapacity(home.type)&&ownedCount(w,s.hhId)<householdLimit(w)&&w.animals.filter(b=>b.sheep).length<worldLimit(w))beginBreeding(w,a,mate.id);
 }
 const pregnancy=s.pregnancy;
 if(pregnancy){
  const gestation=farm?profile.gestation:SHEEP_GESTATION;
  if(fed)pregnancy.work++;
  if(w.tick-pregnancy.started>=2*gestation)s.pregnancy=null;
  else if(pregnancy.work>=gestation){
   const beds=home?housingCapacity(home.type)-w.animals.filter(b=>b.sheep?.housing===home.id).length:4-ownedCount(w,s.hhId);
   const count=Math.min(pregnancy.clutch??(farm?profile.litter:1),beds,householdLimit(w)-ownedCount(w,s.hhId),worldLimit(w)-w.animals.filter(b=>b.sheep).length);
   if(count<1&&farm)s.pregnancy=null;
   if(count>0){
    for(let i=0;i<count;i++){
     const child=makeFarmAnimal(w,a.x,a.y,speciesOf(a),w.nextId%2?'f':'m',[a.id,pregnancy.father]);
     child.sheep!.hhId=s.hhId;
     if(home){child.sheep!.housing=home.id;child.sheep!.tether={...s.tether!};}
    }
    if(farm&&['cow','sheep','goat'].includes(a.type))s.lactatingUntil=w.tick+profile.gestation;
    s.pregnancy=null;
    addEvent(w,'life',farm?count+' '+a.type+' young born.':'A lamb was born after sustained feeding.',[],a.x,a.y);
   }
  }
 }
 if(!home||home.type==='paddock'&&Math.hypot(a.x-home.doorX,a.y-home.doorY)<=1.5)forage(w,a);
}
export function livestockTick(w:World):void{if(hasLivestock(w))for(const a of w.animals.slice())if(a.sheep)updateSheep(w,a);}
export function livestockOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasLivestock(w)||ctx.stage==='child'||ctx.dangers.length)return;
 const known=Object.values(p.beliefs).filter(b=>b.kind==='livestock'&&b.sheep),ours=known.filter(b=>b.sheep!.hhId===p.hhId);
 // Grain collection uses the existing source work and claim/capacity machinery.
 const supplies=livestockMaterials(ctx);
 const stations=farmEnabled(w)?Object.values(p.beliefs).filter(b=>b.kind==='building'&&(b.hh===p.hhId||b.btype==='fire')):[];
 const prospective=(station:typeof stations[number])=>valuesHerd(w)&&known.some(b=>!b.sheep!.hhId&&b.sheep!.species&&houses(station.btype as keyof typeof BUILD_DEF,b.sheep!.species));
 const wantsHay=stations.some(b=>prospective(b)&&b.btype!=='chicken_cage'&&(b.items?.hay??0)<4);

 if(farmEnabled(w)&&(wantsHay||ours.some(b=>b.sheep!.hungry&&['goat','cow','sheep'].includes(b.sheep!.species??'sheep')))&&!(p.inv.hay??0)){
  const meadow=Object.values(p.beliefs).filter(b=>b.kind==='hay_meadow'&&estimatedAmount(w,b)>=1&&!recentFailure(w,p,b.id,240)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  const n=Math.min(4,roomFor(p.inv,carryCap(w,p),'hay'));
  if(meadow&&n>0)addOption(ctx,{kind:'gather',key:'hay:'+meadow.id,label:'Cut meadow hay',goal:'put by feed for our livestock',need:null,util:39,parts:[['hungry livestock',39]],eta:100,targetId:meadow.id,tag:'animals',make:()=>newActivity(w,p,{kind:'gather',label:'Cutting hay',goal:'keep feed for livestock',targetId:meadow.id,targetType:'source',tx:meadow.x,ty:meadow.y,spotX:meadow.x,spotY:meadow.y,item:'hay',amount:n,utility:39,minCommit:20,maxTicks:900,data:{stype:'hay_meadow',purpose:'animal care'}})});
 }
 if(supplies.grain&&(p.inv.grain??0)<supplies.grain&&roomFor(p.inv,carryCap(w,p),'grain')>0){
  const source=Object.values(p.beliefs).filter(b=>b.kind==='wild_grain'&&estimatedAmount(w,b)>=1&&!recentFailure(w,p,b.id,240)).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  if(source){const travel=Math.hypot(p.x-source.x,p.y-source.y)/Math.max(.03,ctx.speed),util=32-pen(travel)*.6;
   if(util>5)addOption(ctx,{kind:'gather',key:`sheep-grain:${source.id}`,label:'Gather grain for sheep',goal:'carry finite grain for known sheep care',need:null,util,parts:[['grain for known sheep',32],['walking',-pen(travel)*.6]],eta:travel+60,targetId:source.id,tag:'animals',make:()=>newActivity(w,p,{kind:'gather',label:'Gathering grain for sheep',goal:'carry finite grain for known sheep care',targetId:source.id,targetType:'source',tx:source.x,ty:source.y,spotX:source.x,spotY:source.y,item:'grain',amount:Math.max(1,Math.ceil(supplies.grain!-(p.inv.grain??0))),utility:util,minCommit:20,maxTicks:900,data:{stype:'wild_grain',purpose:'animal care'}})});
  }
 }
 const offer=(op:string,b:typeof known[number],base:number,mateId?:number,homeId?:number)=>{
  if(recentFailure(w,p,b.id,240))return;
  const species=b.sheep?.species??'sheep';
  const wantsAnimal=(op==='acquire'||op==='house')&&!b.sheep?.hhId;
  if(wantsAnimal&&farmEnabled(w)&&ctx.critical)return;
  const travel=Math.hypot(p.x-b.x,p.y-b.y)/Math.max(.03,ctx.speed);
  const parts:[string,number][]=[['known '+species+' care',base],['walking',-pen(travel)*.6]];
  if(wantsAnimal)parts.push(...herdReasons(ctx,b));
  const util=parts.reduce((sum,part)=>sum+part[1],0);
  if(util<5)return;
  const goal=!farmEnabled(w)&&op!=='slaughter'&&op!=='shear'?'keep a sheep fed, watered and contained':op==='slaughter'?'recover food from our '+species:op==='shear'?'collect wool grown through feeding':'keep household livestock';
  const label=op+' '+species;
  addOption(ctx,{kind:'animal_work',key:`sheep:${op}:${b.id}`,label,goal,need:op==='slaughter'?'hunger':null,util,parts,eta:travel+duration[op],targetId:b.id,tag:'animals',
   make:()=>newActivity(w,p,{kind:'animal_work',label,goal,need:op==='slaughter'?'hunger':null,targetId:b.id,targetType:'animal',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,utility:util,minCommit:20,maxTicks:900,data:{op,mateId,...(homeId?{homeId}:{})}})});
 };
 if(farmEnabled(w))for(const station of stations){
  const residents=ours.filter(b=>b.sheep!.housing===station.id);
  const preparing=prospective(station);
  if(!residents.length&&!preparing)continue;
  const type=station.btype as keyof typeof BUILD_DEF;
  if(grainFeedEnabled(w)&&!ctx.critical&&free(w,p,'grain')>=1&&foodUnits(p.inv)>2&&(station.items?.stock_feed??0)<6){
   const x=station.x-BUILD_DEF[type].w/2+.5,y=station.y+BUILD_DEF[type].h/2+.5;
   const label='Prepare grain feed at the '+BUILD_DEF[type].label;
   addOption(ctx,{kind:'animal_work',key:'mix_feed:'+station.id,label,goal:'fill the livestock trough',need:null,util:47,parts:[['livestock need prepared feed',47]],eta:50,targetId:station.id,tag:'animals',make:()=>newActivity(w,p,{kind:'animal_work',label,goal:label,utility:47,targetId:station.id,targetType:'building',tx:x,ty:y,spotX:x,spotY:y,minCommit:20,maxTicks:900,data:{op:'mix_feed'}})});
  }
  for(const k of ['water','hay','grain'] as const){
   if(k!=='water'&&!(preparing&&(k==='hay'?station.btype!=='chicken_cage':station.btype==='chicken_cage'||known.some(b=>b.sheep!.species==='pig')))&&!residents.some(b=>k==='grain'?['pig','chicken'].includes(b.sheep!.species!):!['pig','chicken'].includes(b.sheep!.species!)))continue;
   const n=Math.min(3,free(w,p,k)-(k==='hay'?0:1),(residents.length+(preparing?2:0))*2-(station.items?.[k]??0));
   if(n<1)continue;
   const x=station.x-BUILD_DEF[type].w/2+.5,y=station.y+BUILD_DEF[type].h/2+.5;
   const label='Bring '+k+' to the '+BUILD_DEF[type].label;
   addOption(ctx,{kind:'deposit',cargo:{[k]:n},key:'farm_store:'+station.id+':'+k,label,goal:label,util:40,need:null,parts:[['feed and water for housed animals',40]],eta:60,targetId:station.id,tag:'animals',make:()=>newActivity(w,p,{kind:'deposit',label,goal:label,targetId:station.id,targetType:'building',tx:x,ty:y,spotX:x,spotY:y,utility:40,minCommit:20,maxTicks:900,data:{items:{[k]:n}}})});
  }
 }
 if(farmEnabled(w))for(const [key,r] of Object.entries(FARM_RECIPES)){
  if(!canProcess(w,p,r)||((r.output==='gloves'||r.output==='shoes'||r.output==='garment')&&(p.inv[r.output]??0)>0))continue;
  const station=stations.filter(b=>stationMatches(b.btype,r)&&(b.btype!=='fire'||(b.fuel??0)>0)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
  if(!station||recentFailure(w,p,station.id,240))continue;
  const def=BUILD_DEF[station.btype as keyof typeof BUILD_DEF];
  const x=station.x-def.w/2+.5,y=station.y+def.h/2+.5,op='process_'+key;
  addOption(ctx,{kind:'animal_work',key:op+':'+station.id,label:r.label,goal:r.label,util:36,need:null,parts:[['farm ingredients on hand',36]],eta:r.work,targetId:station.id,tag:'animals',make:()=>newActivity(w,p,{kind:'animal_work',label:r.label,goal:r.label,utility:36,targetId:station.id,targetType:'building',tx:x,ty:y,spotX:x,spotY:y,minCommit:20,maxTicks:1000,data:{op}})});
 }
 for(const b of known){const s=b.sheep!;
  if(!s.hhId||s.hhId===p.hhId&&s.tether===0){
   const pen=stations.find(h=>h.hh===p.hhId&&houses(h.btype as keyof typeof BUILD_DEF,s.species??'sheep')&&ours.filter(c=>c.sheep!.housing===h.id).length<housingCapacity(h.btype as keyof typeof BUILD_DEF));
   if(pen&&(!valuesHerd(w)||stockedForAnother(pen,s.species??'sheep',ours.filter(b=>b.sheep!.housing===pen.id).length))&&free(w,p,'grain')>=1&&foodUnits(p.inv)>1)offer('house',b,42,undefined,pen.id);
   if((s.hhId===p.hhId||ours.length<householdLimit(w))&&free(w,p,'wood')>=2&&free(w,p,'fibre')>=1&&free(w,p,'grain')>=1&&foodUnits(p.inv)>2)offer('acquire',b,34);continue;}
  if(s.hhId!==p.hhId)continue;
  if(farmEnabled(w)){
   if(!s.housing){const home=stations.find(h=>h.hh===p.hhId&&houses(h.btype as keyof typeof BUILD_DEF,s.species??'sheep')&&ours.filter(c=>c.sheep!.housing===h.id).length<housingCapacity(h.btype as keyof typeof BUILD_DEF));if(home&&(!valuesHerd(w)||stockedForAnother(home,s.species??'sheep',ours.filter(b=>b.sheep!.housing===home.id).length)))offer('house',b,42,undefined,home.id);}
   if(s.ready&&!s.pregnant)offer(s.species==='chicken'?'egg':'milk',b,44);
   if(s.hungry&&free(w,p,'hay')>=1&&['cow','goat','sheep'].includes(s.species??'sheep'))offer('hay_feed',b,46);
  }
  if(s.hungry&&free(w,p,'grain')>=1&&foodUnits(p.inv)>1)offer('feed',b,43);
  if(s.thirsty&&free(w,p,'water')>=1)offer('water',b,43);
  if(s.wool>=1&&roomFor(p.inv,carryCap(w,p),'wool')>=1)offer('shear',b,38);
  if(s.tether<50&&free(w,p,'fibre')>=1)offer('repair',b,40);
  if(p.needs.hunger<45&&s.adult&&foodUnits(p.inv)<2){
   const alternative=runsRulesVersion(w,151)?earlierFoodRoute(ctx,Math.hypot(p.x-b.x,p.y-b.y)/Math.max(.03,ctx.speed),duration.slaughter):undefined;
   if(alternative)addBlocked(ctx,'animal_work','slaughter sheep',b.id,`known food is available sooner: ${alternative.label}`,'animals');
   else offer('slaughter',b,45+ctx.drives.hunger*.3);
  }
  if((!s.species||breedingSeason(w,s.species))&&(s.species!=='chicken'||s.ready)&&s.adult&&s.sex==='f'&&!s.pregnant&&w.tick>=s.breedAfter&&!s.hungry&&!s.thirsty&&ours.length<householdLimit(w)){const mate=ours.find(c=>c.sheep!.species===s.species&&c.sheep!.sex==='m'&&c.sheep!.adult&&c.sheep!.tether>0&&!c.sheep!.hungry&&!c.sheep!.thirsty&&Math.hypot(c.x-b.x,c.y-b.y)<=4);if(mate)offer('mate',b,s.species==='chicken'&&s.housing?45:26,mate.id);}
 }
}

/** Requested material quantities from dated personal sheep memories. */
export function livestockMaterials(ctx:Ctx):import('./types').Items{
 if(!hasLivestock(ctx.world)||ctx.stage==='child')return {};
 const w=ctx.world;
 const known=Object.values(ctx.p.beliefs).filter(b=>b.sheep),ours=known.filter(b=>b.sheep!.hhId===ctx.p.hhId),out:import('./types').Items={};
 if(known.some(b=>!b.sheep!.hhId&&ours.length<householdLimit(w)||b.sheep!.hhId===ctx.p.hhId&&b.sheep!.tether===0)){
  if(farmEnabled(w)&&Object.values(ctx.p.beliefs).some(b=>b.kind==='building'&&b.hh===ctx.p.hhId&&housingCapacity(b.btype as keyof typeof BUILD_DEF))){out.grain=2;if(valuesHerd(w))out.water=3;}
  out.fibre=1;
  // Obtain the binding first: repeated food/post trips cannot acquire an animal without it.
  if(free(ctx.world,ctx.p,'fibre')>=1){out.wood=2;out.grain=Math.max(1,3-(foodUnits(ctx.p.inv)-(ctx.p.inv.grain??0)));}
 }
 if(ours.some(b=>b.sheep!.hungry))out.grain=Math.max(out.grain??0,2-(foodUnits(ctx.p.inv)-(ctx.p.inv.grain??0)),1);
 if(ours.some(b=>b.sheep!.thirsty))out.water=2;
 if(ours.some(b=>b.sheep!.tether<50))out.fibre=1;
 return out;
}
export function validateLivestock(w:World):void{
 const int=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0,finite=(n:unknown,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 const sheep=w.animals.filter(a=>a.sheep);if(sheep.length>worldLimit(w))throw Error('too many sheep');
 for(const a of w.animals){const s=a.sheep;if(a.type==='wolf'||a.type==='deer'){if(s)throw Error('sheep state on another animal');continue;}
  if(!hasLivestock(w)||a.type!=='sheep'&&!farmEnabled(w)||!s||!['founder','birth'].includes(s.origin)||!['f','m'].includes(s.sex)||!int(s.born)||s.born>w.tick||!int(s.hhId)||!finite(s.food,44)||!finite(s.water,2)||!int(s.growth)||!finite(s.growth,maturity(w,a))||(s.origin==='birth'&&s.growth>w.tick-s.born)||!int(s.wool)||s.wool>2||!int(s.woolWork)||s.woolWork>=2*DAY||!int(s.breedAfter)||!Number.isSafeInteger(s.forageTarget)||!int(s.forageWork)||s.forageWork>=60)throw Error('invalid sheep state');
  if(s.produceWork!==undefined&&(!farmEnabled(w)||!int(s.produceWork)||s.produceWork>(a.type==='chicken'?3*DAY:DAY))||s.housing!==undefined&&(!farmEnabled(w)||!int(s.housing)||!s.hhId||!s.tether)||s.lactatingUntil!==undefined&&(!farmEnabled(w)||!int(s.lactatingUntil)||s.sex!=='f'||!['cow','goat','sheep'].includes(a.type)))throw Error('invalid farm animal state');
  if(!Array.isArray(s.parents)||(s.origin==='founder'?s.parents.length!==0:s.parents.length!==2)||s.parents.some(id=>!int(id)||id<=0||id===a.id)||s.parents.length===2&&s.parents[0]===s.parents[1])throw Error('invalid sheep origin');
  if(s.hhId&&ownedCount(w,s.hhId)>householdLimit(w))throw Error('too many owned sheep');
  if(s.pregnancy?.clutch!==undefined&&(a.type!=='chicken'||!int(s.pregnancy.clutch)||s.pregnancy.clutch<1||s.pregnancy.clutch>3))throw Error('invalid clutch');
  if(s.housing){
   const pen=w.buildings.find(b=>b.id===s.housing);
   if(pen&&(!houses(pen.type,speciesOf(a))||pen.hhId!==s.hhId||w.animals.filter(other=>other.sheep?.housing===s.housing).length>housingCapacity(pen.type)))throw Error('invalid livestock housing');
  }
  if(s.tether===undefined||s.pregnancy===undefined||s.waterMemory===undefined)throw Error('missing sheep state');
  if(s.waterMemory&&(!finite(s.waterMemory.x,w.W)||!finite(s.waterMemory.y,w.H)))throw Error('invalid sheep water memory');
  if(s.tether&&(!s.hhId||!finite(s.tether.condition,100)||s.tether.condition===0||!finite(s.tether.x,w.W)||!finite(s.tether.y,w.H)||Math.hypot(a.x-s.tether.x,a.y-s.tether.y)>2.0000001))throw Error('invalid sheep containment');
  if(s.pregnancy&&(!s.hhId||!s.tether||s.sex!=='f'||!adult(w,a)||!int(s.pregnancy.father)||s.pregnancy.father<=0||s.pregnancy.father===a.id||!int(s.pregnancy.started)||s.pregnancy.started>w.tick||!int(s.pregnancy.work)||s.pregnancy.work>w.tick-s.pregnancy.started||s.pregnancy.work>(farmEnabled(w)?2*FARM_SPECIES[speciesOf(a)].gestation:8*DAY)))throw Error('invalid sheep pregnancy');
 }
 const check=(items:import('./types').Items|undefined)=>{if(items?.wool!==undefined&&(!hasLivestock(w)||!int(items.wool)))throw Error('invalid wool');};
 for(const p of w.persons){check(p.inv);const memories=Object.values(p.beliefs).filter(b=>b.kind==='livestock'||b.sheep);if(memories.length>12)throw Error('too many sheep memories');for(const b of memories){const s=b.sheep;if(!hasLivestock(w)||b.kind!=='livestock'||!s||!int(b.id)||b.id<=0||!int(b.seen)||b.seen>w.tick||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!int(s.hhId)||!['f','m'].includes(s.sex)||!int(s.wool)||s.wool>2||!finite(s.tether,100)||!int(s.breedAfter)||[s.adult,s.hungry,s.thirsty,s.pregnant].some(v=>typeof v!=='boolean'))throw Error('invalid sheep memory');}
  for(const a of [p.activity,p.suspended])if(a?.kind==='animal_work'&&(!hasLivestock(w)||!Object.hasOwn(duration,a.data.op)||(a.phase==='work'&&(a.duration!==duration[a.data.op]||!int(a.progress)||a.progress>=a.duration))))throw Error('invalid animal work');
 }
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.wasted);}for(const b of w.piles)check(b.items);for(const c of w.carts)check(c.load);for(const m of w.meals)check(m.table);for(const s of w.sites){check(s.delivered);check(s.used);}for(const l of [w.ledger.initial,w.ledger.created,w.ledger.consumed,w.ledger.spoiled])check(l);
}
