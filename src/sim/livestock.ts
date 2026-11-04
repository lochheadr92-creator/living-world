import {harvestPressure} from './ecology';
import type {Animal,Activity,Person,World} from './types';
import {DAY,NUTRITION} from './constants';
import {runsRulesVersion} from './rulesversion';
import {makeWolf,moveLocalAnimal} from './wildlife';
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
 origin:'founder'|'birth';parents:number[];born:number;sex:'f'|'m';hhId:number;
 food:number;water:number;growth:number;wool:number;woolWork:number;
 tether:null|{x:number;y:number;condition:number};
 pregnancy:null|{father:number;started:number;work:number};breedAfter:number;
 forageTarget:number;forageWork:number;waterMemory:null|{x:number;y:number};
}
export interface SheepMemory {hhId:number;sex:'f'|'m';adult:boolean;hungry:boolean;thirsty:boolean;wool:number;tether:number;pregnant:boolean;breedAfter:number;}
export const hasLivestock=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,129);
export const SHEEP_MATURE=8*DAY,SHEEP_GESTATION=4*DAY;
export function makeSheep(w:World,x:number,y:number,sex:'f'|'m',parents:number[]=[]):Animal{
 const a=makeWolf(w,x,y,'sheep');a.sheep={origin:parents.length?'birth':'founder',parents:[...parents],born:w.tick,sex,hhId:0,food:0,water:0,growth:parents.length?0:SHEEP_MATURE,wool:0,woolWork:0,tether:null,pregnancy:null,breedAfter:0,forageTarget:0,forageWork:0,waterMemory:null};return a;
}
/** One founding pair on reachable land near existing forage and water, never a replenishment. */
export function seedSheep(w:World,reach?:Uint8Array):void{
 if(!hasLivestock(w)||w.animals.some(a=>a.type==='sheep'))return;
 const hub=w.persons[0];if(!hub)return;
 const candidates=w.sources.filter(s=>['berries','fruit','grain'].includes(s.item)&&s.amount>=2).sort((a,b)=>Math.hypot(a.x-hub.x,a.y-hub.y)-Math.hypot(b.x-hub.x,b.y-hub.y));
 for(const food of candidates){for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
  const x=food.x+dx,y=food.y+dy;if(!isWalkable(w,x,y)||reach&&reach[y*w.W+x]!==1)continue;
  let water=false;for(let yy=-6;yy<=6&&!water;yy++)for(let xx=-6;xx<=6;xx++)if(isWaterAccess(w,x+xx,y+yy)&&shoreWater(w,x+xx+.5,y+yy+.5)?.body.amount!>=1){water=true;break;}
  if(!water)continue;makeSheep(w,x+.5,y+.5,'f');makeSheep(w,x+.5,y+.5,'m');return;
 }}
}
const duration:Record<string,number>={acquire:120,feed:30,water:30,shear:80,mate:100,repair:60,slaughter:160};
const adult=(a:Animal)=>!!a.sheep&&a.sheep.growth>=SHEEP_MATURE;
const ownedCount=(w:World,hh:number)=>w.animals.filter(a=>a.sheep?.hhId===hh).length;
const free=(w:World,p:Person,k:'grain'|'wood'|'fibre'|'water')=>(p.inv[k]??0)-reservedFor(w,p,k);
function issue(w:World,p:Person,a:Activity):string|undefined{
 if(!hasLivestock(w)||stageOf(w,p)==='child')return 'animal work needs a grown keeper';
 const op=String(a.data.op),animal=w.byId.get(a.targetId);if(!Object.hasOwn(duration,op))return 'unknown animal work';
 if(animal?.ent!=='animal'||animal.type!=='sheep'||!animal.sheep||animal.health<=0)return 'the sheep is gone';
 if(p.indoors||Math.hypot(p.x-animal.x,p.y-animal.y)>2)return 'must reach the sheep';
 const s=animal.sheep;
 if(op==='acquire'){
  if((s.hhId&&s.hhId!==p.hhId)||s.tether)return 'the sheep already has a keeper';if(ownedCount(w,p.hhId)>=(s.hhId===p.hhId?5:4))return 'our four sheep need care first';
  if(free(w,p,'wood')<2||free(w,p,'fibre')<1||free(w,p,'grain')<1)return 'needs two wood, one fibre and one grain';
 }else if(s.hhId!==p.hhId||!s.tether)return 'the sheep belongs to another household or is no longer contained';
 if(op==='feed'&&(free(w,p,'grain')<1||s.food>22))return 'needs spare grain and room for a portion';
 if(op==='water'&&(free(w,p,'water')<1||s.water>1))return 'needs carried water and room for a unit';
 if(op==='shear'&&(s.wool<1||roomFor(p.inv,carryCap(w,p),'wool')<1))return 'no grown fleece or no pack room';
 if(op==='repair'&&free(w,p,'fibre')<1)return 'no spare fibre for the tether';
 if(op==='mate'){
  const mate=w.byId.get(a.data.mateId);
  if(!adult(animal)||s.sex!=='f'||s.pregnancy||w.tick<s.breedAfter||s.food<11||s.water<.5)return 'the ewe is not ready to breed';
  if(mate?.ent!=='animal'||!mate.sheep||mate.sheep.sex!=='m'||mate.sheep.hhId!==p.hhId||!mate.sheep.tether||!adult(mate)||mate.sheep.food<11||mate.sheep.water<.5||Math.hypot(mate.x-animal.x,mate.y-animal.y)>4)return 'needs a nearby fed adult ram of our household';
  if(ownedCount(w,p.hhId)>=4||w.animals.filter(a=>a.type==='sheep').length>=12)return 'no room for another sheep';
 }
}
registerHandler('animal_work',{
 availability:.3,pose:()=> 'craft',
 begin(w,p,a){const why=issue(w,p,a);if(why)return why;a.duration=duration[a.data.op];},
 work(w,p,a){const why=issue(w,p,a);if(why)return `fail:${why}`;if(++a.progress<a.duration)return 'continue';
  const animal=w.byId.get(a.targetId) as Animal,s=animal.sheep!,op=a.data.op;
  if(op==='acquire'){consume(w,p.inv,'wood',2,'sheep tether');consume(w,p.inv,'fibre',1,'sheep tether');consume(w,p.inv,'grain',1,'feeding sheep');s.food=Math.min(44,s.food+22);s.hhId=p.hhId;s.tether={x:animal.x,y:animal.y,condition:100};addLog(w,p,'work','Tethered a sheep with wood and fibre, and fed it grain.');}
  if(op==='feed'){consume(w,p.inv,'grain',1,'feeding sheep');s.food+=22;}
  if(op==='water'){consume(w,p.inv,'water',1,'watering sheep');s.water+=1;}
  if(op==='shear'){s.wool--;transfer(w,{wool:1},p.inv,carryCap(w,p),'wool',1,'animal:'+animal.id,'person:'+p.id,'shearing a fed sheep');}
  if(op==='repair'){consume(w,p.inv,'fibre',1,'repairing sheep tether');s.tether!.condition=Math.min(100,s.tether!.condition+40);}
  if(op==='mate'){s.pregnancy={father:a.data.mateId,started:w.tick,work:0};s.breedAfter=w.tick+8*DAY;}
  if(op==='slaughter'){makeCarcass(w,animal,p);return 'done';}
  observe(w,p,animal);return 'done';
 },
 onEnd(w,p,a,outcome,detail){const animal=w.byId.get(a.targetId);if(animal?.ent==='animal'&&!p.indoors&&Math.hypot(p.x-animal.x,p.y-animal.y)<=2)observe(w,p,animal);if(outcome==='failed')noteFailure(w,p,a.targetId,detail);}
});
/** The animal's own nearby senses, not a keeper's remote knowledge. */
function forage(w:World,a:Animal):void{
 const s=a.sheep!,anchor=s.tether;const allowed=(x:number,y:number)=>!anchor||Math.hypot(x-anchor.x,y-anchor.y)<=2;
 let target:{id:number;x:number;y:number;kind:'food'|'water'}|undefined;
 if(s.water<1){let dist=Infinity;for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){
  const x=Math.floor(a.x)+dx+.5,y=Math.floor(a.y)+dy+.5,d=Math.hypot(x-a.x,y-a.y);if(d>8||d>=dist||!allowed(x,y)||!isWaterAccess(w,Math.floor(x),Math.floor(y)))continue;
  const at=shoreWater(w,x,y);if(!at||at.body.amount<1)continue;target={id:-1-Math.floor(y)*w.W-Math.floor(x),x,y,kind:'water'};dist=d;
 }
  if(target)s.waterMemory={x:target.x,y:target.y};
  else if(s.waterMemory&&allowed(s.waterMemory.x,s.waterMemory.y)){const m=s.waterMemory;
   if(Math.hypot(m.x-a.x,m.y-a.y)<=1.3&&(shoreWater(w,m.x,m.y)?.body.amount??0)<1)s.waterMemory=null;
   else target={id:-1-Math.floor(m.y)*w.W-Math.floor(m.x),x:m.x,y:m.y,kind:'water'};
  }
 }
 if(!target&&s.food<=22){const source=w.sources.filter(b=>['berries','fruit','grain'].includes(b.item)&&b.amount-b.reserved>=1&&Math.hypot(b.x+.5-a.x,b.y+.5-a.y)<=8&&allowed(b.x+.5,b.y+.5)).sort((b,c)=>Math.hypot(b.x+.5-a.x,b.y+.5-a.y)-Math.hypot(c.x+.5-a.x,c.y+.5-a.y))[0];if(source)target={id:source.id,x:source.x+.5,y:source.y+.5,kind:'food'};}
 if(!target){s.forageTarget=0;s.forageWork=0;return;}
 // A remembered shore point is not water contact: actually reach a legal shore tile.
 const waterContact=target.kind!=='water'||isWaterAccess(w,Math.floor(a.x),Math.floor(a.y))&&(shoreWater(w,a.x,a.y)?.body.amount??0)>=1;
 if(Math.hypot(target.x-a.x,target.y-a.y)>1.3||!waterContact){s.forageWork=0;const x=a.x,y=a.y;moveLocalAnimal(w,a,target.x,target.y,.04);if(!allowed(a.x,a.y)){a.x=x;a.y=y;a.path=[];}return;}
 if(s.forageTarget!==target.id){s.forageTarget=target.id;s.forageWork=0;}
 if(++s.forageWork<60)return;s.forageWork=0;
 if(target.kind==='water'){const at=shoreWater(w,a.x,a.y);if(at&&at.body.amount>=1){const n=drawWater(w,at.body,1);ledgerConsume(w,'water',n,'sheep drinking');s.water=Math.min(2,s.water+n);}}
 else{const src=w.byId.get(target.id);if(src?.ent==='source'&&src.amount-src.reserved>=1){src.amount--;harvestPressure(w,src,1);ledgerConsume(w,src.item,1,'sheep grazing');s.food=Math.min(44,s.food+NUTRITION[src.item as keyof typeof NUTRITION]);}}
}
export function updateSheep(w:World,a:Animal):void{
 const s=a.sheep;if(!hasLivestock(w)||a.type!=='sheep'||!s||w.byId.get(a.id)!==a)return;
 const fed=s.food>0&&s.water>0;
 s.food=Math.max(0,s.food-(w.weather.temp<0?33:22)/DAY);s.water=Math.max(0,s.water-1/DAY);
 if(fed){s.growth=Math.min(SHEEP_MATURE,s.growth+1);if(s.wool<2&&++s.woolWork>=2*DAY){s.wool++;s.woolWork=0;ledgerCreate(w,'wool',1,'wool grown by fed sheep');}}
 if(s.tether){s.tether.condition=Math.max(0,s.tether.condition-.005);if(s.tether.condition===0){s.tether=null;s.hhId=0;s.pregnancy=null;addEvent(w,'life','A neglected sheep tether broke.',[],a.x,a.y);}}
 if(!fed)a.health=Math.max(0,a.health-.025);
 if(a.health<=0){a.health=.001;const body=makeCarcass(w,a,undefined,false,s.hhId);if(body){const c=body.carcass!;for(const k of ['meat','hide','fat'] as const){ledgerSpoil(w,k,c.remaining[k],'sheep lost to neglect');c.lost[k]+=c.remaining[k];c.remaining[k]=0;}c.emptySince=w.tick;}return;}
 const pregnancy=s.pregnancy;if(pregnancy){if(fed)pregnancy.work++;if(w.tick-pregnancy.started>=8*DAY)s.pregnancy=null;
  else if(pregnancy.work>=SHEEP_GESTATION&&ownedCount(w,s.hhId)<4&&w.animals.filter(a=>a.type==='sheep').length<12){const lamb=makeSheep(w,a.x,a.y,w.nextId%2?'f':'m',[a.id,pregnancy.father]);lamb.sheep!.hhId=s.hhId;lamb.sheep!.tether=null;s.pregnancy=null;addEvent(w,'life','A lamb was born after sustained feeding.',[],a.x,a.y);}}
 forage(w,a);
}
export function livestockTick(w:World):void{if(hasLivestock(w))for(const a of w.animals.slice())if(a.type==='sheep')updateSheep(w,a);}
export function livestockOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasLivestock(w)||ctx.stage==='child'||ctx.dangers.length)return;
 const known=Object.values(p.beliefs).filter(b=>b.kind==='livestock'&&b.sheep),ours=known.filter(b=>b.sheep!.hhId===p.hhId);
 // Grain collection uses the existing source work and claim/capacity machinery.
 const supplies=livestockMaterials(ctx);
 if(supplies.grain&&(p.inv.grain??0)<supplies.grain&&roomFor(p.inv,carryCap(w,p),'grain')>0){
  const source=Object.values(p.beliefs).filter(b=>b.kind==='wild_grain'&&estimatedAmount(w,b)>=1&&!recentFailure(w,p,b.id,240)).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y))[0];
  if(source){const travel=Math.hypot(p.x-source.x,p.y-source.y)/Math.max(.03,ctx.speed),util=32-pen(travel)*.6;
   if(util>5)addOption(ctx,{kind:'gather',key:`sheep-grain:${source.id}`,label:'Gather grain for sheep',goal:'carry finite grain for known sheep care',need:null,util,parts:[['grain for known sheep',32],['walking',-pen(travel)*.6]],eta:travel+60,targetId:source.id,tag:'animals',make:()=>newActivity(w,p,{kind:'gather',label:'Gathering grain for sheep',goal:'carry finite grain for known sheep care',targetId:source.id,targetType:'source',tx:source.x,ty:source.y,spotX:source.x,spotY:source.y,item:'grain',amount:Math.max(1,Math.ceil(supplies.grain!-(p.inv.grain??0))),utility:util,minCommit:20,maxTicks:900,data:{stype:'wild_grain',purpose:'animal care'}})});
  }
 }
 const offer=(op:string,b:typeof known[number],base:number,mateId?:number)=>{if(recentFailure(w,p,b.id,240))return;const travel=Math.hypot(p.x-b.x,p.y-b.y)/Math.max(.03,ctx.speed),util=base-pen(travel)*.6;if(util<5)return;const goal=op==='slaughter'?'recover food from our sheep':op==='shear'?'collect wool grown through feeding':'keep a sheep fed, watered and contained';addOption(ctx,{kind:'animal_work',key:`sheep:${op}:${b.id}`,label:`${op} sheep`,goal,need:op==='slaughter'?'hunger':null,util,parts:[['known sheep care',base],['walking',-pen(travel)*.6]],eta:travel+duration[op],targetId:b.id,tag:'animals',make:()=>newActivity(w,p,{kind:'animal_work',label:`${op} sheep`,goal,need:op==='slaughter'?'hunger':null,targetId:b.id,targetType:'animal',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,utility:util,minCommit:20,maxTicks:900,data:{op,mateId}})});};
 for(const b of known){const s=b.sheep!;
  if(!s.hhId||s.hhId===p.hhId&&s.tether===0){if((s.hhId===p.hhId||ours.length<4)&&free(w,p,'wood')>=2&&free(w,p,'fibre')>=1&&free(w,p,'grain')>=1&&foodUnits(p.inv)>2)offer('acquire',b,34);continue;}
  if(s.hhId!==p.hhId)continue;
  if(s.hungry&&free(w,p,'grain')>=1&&foodUnits(p.inv)>1)offer('feed',b,43);
  if(s.thirsty&&free(w,p,'water')>=1)offer('water',b,43);
  if(s.wool>=1&&roomFor(p.inv,carryCap(w,p),'wool')>=1)offer('shear',b,38);
  if(s.tether<50&&free(w,p,'fibre')>=1)offer('repair',b,40);
  if(p.needs.hunger<45&&s.adult&&foodUnits(p.inv)<2){
   const alternative=runsRulesVersion(w,151)?earlierFoodRoute(ctx,Math.hypot(p.x-b.x,p.y-b.y)/Math.max(.03,ctx.speed),duration.slaughter):undefined;
   if(alternative)addBlocked(ctx,'animal_work','slaughter sheep',b.id,`known food is available sooner: ${alternative.label}`,'animals');
   else offer('slaughter',b,45+ctx.drives.hunger*.3);
  }
  if(s.adult&&s.sex==='f'&&!s.pregnant&&w.tick>=s.breedAfter&&!s.hungry&&!s.thirsty&&ours.length<4){const mate=ours.find(c=>c.sheep!.sex==='m'&&c.sheep!.adult&&c.sheep!.tether>0&&!c.sheep!.hungry&&!c.sheep!.thirsty&&Math.hypot(c.x-b.x,c.y-b.y)<=4);if(mate)offer('mate',b,26,mate.id);}
 }
}

/** Requested material quantities from dated personal sheep memories. */
export function livestockMaterials(ctx:Ctx):import('./types').Items{
 if(!hasLivestock(ctx.world)||ctx.stage==='child')return {};
 const known=Object.values(ctx.p.beliefs).filter(b=>b.sheep),ours=known.filter(b=>b.sheep!.hhId===ctx.p.hhId),out:import('./types').Items={};
 if(known.some(b=>!b.sheep!.hhId&&ours.length<4||b.sheep!.hhId===ctx.p.hhId&&b.sheep!.tether===0)){
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
 const sheep=w.animals.filter(a=>a.type==='sheep');if(sheep.length>12)throw Error('too many sheep');
 for(const a of w.animals){const s=a.sheep;if(a.type!=='sheep'){if(s)throw Error('sheep state on another animal');continue;}
  if(!hasLivestock(w)||!s||!['founder','birth'].includes(s.origin)||!['f','m'].includes(s.sex)||!int(s.born)||s.born>w.tick||!int(s.hhId)||!finite(s.food,44)||!finite(s.water,2)||!int(s.growth)||!finite(s.growth,SHEEP_MATURE)||(s.origin==='birth'&&s.growth>w.tick-s.born)||!int(s.wool)||s.wool>2||!int(s.woolWork)||s.woolWork>=2*DAY||!int(s.breedAfter)||!Number.isSafeInteger(s.forageTarget)||!int(s.forageWork)||s.forageWork>=60)throw Error('invalid sheep state');
  if(!Array.isArray(s.parents)||(s.origin==='founder'?s.parents.length!==0:s.parents.length!==2)||s.parents.some(id=>!int(id)||id<=0||id===a.id)||s.parents.length===2&&s.parents[0]===s.parents[1])throw Error('invalid sheep origin');
  if(s.hhId&&ownedCount(w,s.hhId)>4)throw Error('too many owned sheep');
  if(s.tether===undefined||s.pregnancy===undefined||s.waterMemory===undefined)throw Error('missing sheep state');
  if(s.waterMemory&&(!finite(s.waterMemory.x,w.W)||!finite(s.waterMemory.y,w.H)))throw Error('invalid sheep water memory');
  if(s.tether&&(!s.hhId||!finite(s.tether.condition,100)||s.tether.condition===0||!finite(s.tether.x,w.W)||!finite(s.tether.y,w.H)||Math.hypot(a.x-s.tether.x,a.y-s.tether.y)>2.0000001))throw Error('invalid sheep containment');
  if(s.pregnancy&&(!s.hhId||!s.tether||s.sex!=='f'||!adult(a)||!int(s.pregnancy.father)||s.pregnancy.father<=0||s.pregnancy.father===a.id||!int(s.pregnancy.started)||s.pregnancy.started>w.tick||!int(s.pregnancy.work)||s.pregnancy.work>w.tick-s.pregnancy.started||s.pregnancy.work>8*DAY))throw Error('invalid sheep pregnancy');
 }
 const check=(items:import('./types').Items|undefined)=>{if(items?.wool!==undefined&&(!hasLivestock(w)||!int(items.wool)))throw Error('invalid wool');};
 for(const p of w.persons){check(p.inv);const memories=Object.values(p.beliefs).filter(b=>b.kind==='livestock'||b.sheep);if(memories.length>12)throw Error('too many sheep memories');for(const b of memories){const s=b.sheep;if(!hasLivestock(w)||b.kind!=='livestock'||!s||!int(b.id)||b.id<=0||!int(b.seen)||b.seen>w.tick||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!int(s.hhId)||!['f','m'].includes(s.sex)||!int(s.wool)||s.wool>2||!finite(s.tether,100)||!int(s.breedAfter)||[s.adult,s.hungry,s.thirsty,s.pregnant].some(v=>typeof v!=='boolean'))throw Error('invalid sheep memory');}
  for(const a of [p.activity,p.suspended])if(a?.kind==='animal_work'&&(!hasLivestock(w)||!Object.hasOwn(duration,a.data.op)||(a.phase==='work'&&(a.duration!==duration[a.data.op]||!int(a.progress)||a.progress>=a.duration))))throw Error('invalid animal work');
 }
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.wasted);}for(const b of w.piles)check(b.items);for(const c of w.carts)check(c.load);for(const m of w.meals)check(m.table);for(const s of w.sites){check(s.delivered);check(s.used);}for(const l of [w.ledger.initial,w.ledger.created,w.ledger.consumed,w.ledger.spoiled])check(l);
}
