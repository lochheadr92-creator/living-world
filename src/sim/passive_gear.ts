import type {Activity,Person,Pile,Tool,World,GearState} from './types';
import type {WorkResult} from './activities';
import {newActivity,registerHandler} from './activities';
import {runsRulesVersion} from './rulesversion';
import {newId,registerGeneric,unregisterPile} from './registry';
import {addItem,consume,ledgerSpoil,roomFor,transfer} from './economy';
import {carryCap,stageOf} from './people';
import {toolById,toolsHeldBy} from './toolreg';
import {breakTool} from './tools';
import {observe,noteFailure,recentFailure,delBelief} from './knowledge';
import {addLog} from './events';
import {addOption,pen} from './optutil';
import type {Ctx} from './optutil';
import {hashString,hashUnit} from './rng';
import {makeCarcass} from './carcass';
import {reservedFor} from './reserved_goods';
import {harvestPressure} from './ecology';
export const GEAR_WAIT=600,GEAR_CATCH_LIFE=1200,GEAR_ABANDON=48000;
export const hasGear=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,126);
export const isGear=(t:Tool)=>t.kind==='net'||t.kind==='trap';
const durations:Record<string,number>={place:80,check:40,reset:40,repair:60,retrieve:40};
const body=(w:World,a:Activity)=>{const e=w.byId.get(a.targetId);return e?.ent==='pile'&&e.gear?e:undefined;};
function problem(w:World,p:Person,a:Activity):string|undefined{
 if(!hasGear(w)||stageOf(w,p)==='child')return 'gear work needs a grown worker';
 const op=String(a.data.op);if(!Object.hasOwn(durations,op))return 'unknown gear work';
 if(p.indoors)return 'must reach the gear outdoors';
 if(op==='place'){
  const t=toolById(w,a.data.toolId),s=w.byId.get(a.targetId);
  if(!t||!isGear(t)||t.holder!==p.id||t.ownerHh!==p.hhId||t.loan)return 'the owned gear is no longer in hand';
  if(t.wear>=100)return 'the gear needs repair';
  if(!s||s.ent!=='source'||s.type!==(t.kind==='net'?'fish_spot':'tree'))return 'the known setting place is gone';
  if(Math.hypot(p.x-s.x-.5,p.y-s.y-.5)>2)return 'must reach the setting place';
  if(w.piles.some(b=>b.gear?.hhId===p.hhId&&b.gear.kind===t.kind))return 'our household already has this kind of gear set';
  return;
 }
 const b=body(w,a),g=b?.gear;if(!b||!g)return 'the gear is gone';
 if(g.hhId!==p.hhId)return 'the gear belongs to another household';
 if(Math.hypot(p.x-b.x-.5,p.y-b.y-.5)>2)return 'must reach the gear';
 const t=toolById(w,g.toolId);if(!t||t.holder!==b.id)return 'the physical gear is gone';
 if(op==='check'&&g.state==='armed')return 'the catch window has not finished';
 if(op==='reset'&&(g.state==='armed'||!g.checked||(b.items.fish??0)>0))return 'check and empty the gear first';
 if(op==='reset'&&g.bodyId&&w.byId.has(g.bodyId))return 'recover the previous body first';
 if(op==='reset'&&t.wear>=100)return 'the gear is broken';
 if(op==='repair'&&(p.inv.fibre??0)-reservedFor(w,p,'fibre')<1)return 'no spare fibre for repair';
 if(op==='retrieve'&&((b.items.fish??0)>0||roomFor(p.inv,carryCap(w,p),g.kind)<1))return 'empty the catch and make pack room first';
}
function arm(w:World,g:GearState,t:Tool){g.cycle++;g.state='armed';g.setAt=w.tick;g.readyAt=w.tick+GEAR_WAIT;g.checked=false;g.catchTick=null;g.bodyId=null;g.lastTended=w.tick;t.wear=Math.min(100,t.wear+10);}
registerHandler('gear_work',{
 availability:.3,pose:()=> 'craft',
 begin(w,p,a){const why=problem(w,p,a);if(why)return why;a.duration=durations[a.data.op];},
 work(w,p,a):WorkResult{
  const why=problem(w,p,a);if(why)return `fail:${why}`;if(++a.progress<a.duration)return 'continue';
  const op=String(a.data.op);
  if(op==='place'){
   const t=toolById(w,a.data.toolId)!;const kind=t.kind as 'net'|'trap';
   const b:Pile={ent:'pile',id:newId(w),x:Math.floor(p.x),y:Math.floor(p.y),items:{},since:w.tick,note:'Owned deployed '+kind,gear:{kind,toolId:t.id,owner:p.id,hhId:p.hhId,sourceId:a.targetId,setAt:w.tick,readyAt:0,cycle:0,state:'ready',checked:true,catchTick:null,bodyId:null,lastTended:w.tick}};
   registerGeneric(w,b);transfer(w,p.inv,b.items,999,kind,1,'person:'+p.id,'pile:'+b.id,'set gear',t.id);arm(w,b.gear!,t);observe(w,p,b);return 'done';
  }
  const b=body(w,a)!,g=b.gear!,t=toolById(w,g.toolId)!;g.lastTended=w.tick;
  if(op==='check'){
   g.checked=true;const n=b.items.fish??0;
   if(n){const got=transfer(w,b.items,p.inv,carryCap(w,p),'fish',n,'pile:'+b.id,'person:'+p.id,'collect net catch');observe(w,p,b);if(got<n)return 'partial:pack is full';}
   addLog(w,p,'work',n?'Collected the net catch.':g.bodyId?'Checked the trap: a body needs butchering.':'Checked the '+g.kind+': empty.');
  }else if(op==='reset')arm(w,g,t);
  else if(op==='repair'){consume(w,p.inv,'fibre',1,'repairing deployed gear');t.wear=Math.max(0,t.wear-40);if(g.state==='broken')g.state='ready';}
  else if(op==='retrieve'){transfer(w,b.items,p.inv,carryCap(w,p),g.kind,1,'pile:'+b.id,'person:'+p.id,'retrieve gear',t.id);unregisterPile(w,b);delBelief(p,b.id);return 'done';}
  observe(w,p,b);return 'done';
 },
 onEnd(w,p,a,outcome,detail){const b=body(w,a);if(b&&!p.indoors&&Math.hypot(p.x-b.x-.5,p.y-b.y-.5)<=2)observe(w,p,b);if(outcome==='failed'){noteFailure(w,p,a.targetId,detail);if(!b&&a.data.op!=='place')delBelief(p,a.targetId);}},
});
export function gearTick(w:World):void{
 if(!hasGear(w))return;
 for(const b of w.piles.slice()){
  const g=b.gear;if(!g)continue;const t=toolById(w,g.toolId);if(!t){delete b.gear;if(!Object.keys(b.items).length)unregisterPile(w,b);continue;}
  if(w.tick-g.lastTended>=GEAR_ABANDON){const n=b.items.fish??0;if(n)ledgerSpoil(w,'fish',n,'abandoned gear catch');delete b.items.fish;breakTool(w,t,'abandoned gear lost');unregisterPile(w,b);continue;}
  if(g.kind==='net'&&g.catchTick!==null&&w.tick-g.catchTick>=GEAR_CATCH_LIFE){const n=b.items.fish??0;if(n)ledgerSpoil(w,'fish',n,'neglected gear catch');delete b.items.fish;g.catchTick=null;}
  const encounterWindow=g.kind==='trap'&&runsRulesVersion(w,131);
  if(g.state!=='armed'||!encounterWindow&&w.tick<g.readyAt)continue;
  if(!encounterWindow||w.tick>=g.readyAt)g.state=t.wear>=100?'broken':'ready';
  if(g.kind==='net'){
   const s=w.byId.get(g.sourceId);
   if(s?.ent==='source'&&s.type==='fish_spot'){const n=Math.max(0,Math.min(2,Math.floor(s.amount-s.reserved)));s.amount-=n;if(n){addItem(b.items,'fish',n);harvestPressure(w,s,n);g.catchTick=w.tick;}}
  }else if(!encounterWindow||w.tick<=g.readyAt){
   const deer=w.animals.find(a=>a.type==='deer'&&a.health>0&&Math.hypot(a.x-b.x-.5,a.y-b.y-.5)<=4);
   if(deer&&hashUnit(hashString(w.seed)^0x79ae,b.id+g.cycle,deer.id)<.55){const c=makeCarcass(w,deer,undefined,false,g.hhId);if(c){g.bodyId=c.id;if(encounterWindow){g.catchTick=w.tick;g.state=t.wear>=100?'broken':'ready';}}}
  }
 }
}
export function knowsSetGear(ctx:Ctx,kind:'net'|'trap'):boolean{return Object.values(ctx.p.beliefs).some(b=>b.gear?.kind===kind&&b.gear.hhId===ctx.p.hhId);}
/** Ground known from a bounded dated sighting, never the animal's current hidden position. */
export function knownTrapGround(ctx:Ctx){
 const {p}=ctx,trees=Object.values(p.beliefs).filter(b=>b.kind==='tree').sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y));
 const sightings=Object.values(p.beliefs).filter(b=>b.kind==='prey').sort((a,b)=>b.seen-a.seen||b.id-a.id);
 for(const sight of sightings){const ground=trees.filter(b=>Math.hypot(b.x-sight.x,b.y-sight.y)<=6).sort((a,b)=>Math.hypot(a.x-sight.x,a.y-sight.y)-Math.hypot(b.x-sight.x,b.y-sight.y))[0];if(ground)return {ground,sight};}
}
export function gearOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasGear(w)||ctx.stage==='child'||ctx.dangers.length)return;
 const offer=(op:string,id:number,x:number,y:number,base:number,toolId?:number,reason?:string)=>{
  if(recentFailure(w,p,id,240))return;const travel=Math.hypot(p.x-x,p.y-y)/Math.max(.03,ctx.speed),util=base-pen(travel)*.6;
  if(util<5)return;addOption(ctx,{kind:'gear_work',key:`gear:${op}:${op==='place'?toolId+':':''}${id}`,label:`${op==='place'?'Set':op==='check'?'Check':op==='reset'?'Reset':op==='repair'?'Repair':'Retrieve'} ${op==='place'?'my gear':'the gear'}`,goal:reason??'return later for food from finite local stocks',need:'hunger',util,parts:[['owned gear work',base],['walking',-pen(travel)*.6]],eta:travel+durations[op],targetId:id,tag:'food',make:()=>newActivity(w,p,{kind:'gear_work',label:op+' gear',goal:reason??'use owned gear for food',targetId:id,targetType:op==='place'?'source':'pile',tx:x,ty:y,spotX:x,spotY:y,utility:util,minCommit:10,maxTicks:900,data:{op,toolId}})});
 };
 for(const t of toolsHeldBy(w,p.id).filter(isGear)){
  if(t.loan||t.wear>=100||t.ownerHh!==p.hhId||knowsSetGear(ctx,t.kind as 'net'|'trap'))continue;
  const candidates=Object.values(p.beliefs).filter(b=>b.kind===(t.kind==='net'?'fish_spot':'tree')).sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y));
  if(t.kind==='trap'&&runsRulesVersion(w,127)){
   const target=knownTrapGround(ctx);if(target){const {ground,sight}=target;offer('place',ground.id,ground.x+1,ground.y,35,t.id,`set a trap near a deer sighting from ${w.tick-sight.seen} ticks ago`);}
   // Like keepCurrent, retain one already-selected journey in the candidate set.
   // A newer moving sighting does not erase the dated grounds for that journey.
   const a=p.activity,selected=a?.kind==='gear_work'&&a.data.op==='place'&&a.data.toolId===t.id?p.beliefs[a.targetId]:undefined;
   if(runsRulesVersion(w,128)&&selected?.kind==='tree'&&selected.id!==target?.ground.id)
    offer('place',selected.id,selected.x+1,selected.y,35,t.id,a!.goal);
  }else{const b=candidates[0];if(b)offer('place',b.id,b.x+(t.kind==='trap'?1:0),b.y,35,t.id);}
 }
 for(const b of Object.values(p.beliefs)){
  const g=b.gear;if(!g||g.hhId!==p.hhId)continue;
  if(g.state==='armed'){if(w.tick>=g.readyAt)offer('check',b.id,b.x,b.y,42);continue;}
  if(!g.checked||g.catch>0)offer('check',b.id,b.x,b.y,42);
  else if(g.wear>=60&&(p.inv.fibre??0)>0)offer('repair',b.id,b.x,b.y,35);
  else if(g.wear<100)offer('reset',b.id,b.x,b.y,28);
  if(g.state==='broken'&&(p.inv.fibre??0)<1)offer('retrieve',b.id,b.x,b.y,16);
 }
}

export function validateGear(w:World):void{
 const int=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 const containers=[...w.persons.map(p=>({id:p.id,items:p.inv})),...w.buildings.map(b=>({id:b.id,items:b.store.items})),...w.piles,...w.carts.map(c=>({id:c.id,items:c.load}))];
 const check=(items:import('./types').Items|undefined)=>{for(const k of ['net','trap'] as const)if(items?.[k]!==undefined&&(!hasGear(w)||!int(items[k])))throw Error('invalid gear goods');};
 for(const c of containers){check(c.items);for(const k of ['net','trap'] as const)if((c.items[k]??0)!==w.tools.filter(t=>t.holder===c.id&&t.kind===k).length)throw Error('gear count without physical record');}
 for(const l of [w.ledger.initial,w.ledger.created,w.ledger.consumed,w.ledger.spoiled])check(l);
 for(const t of w.tools)if(isGear(t)&&(!hasGear(w)||t.tier!==0||!Number.isFinite(t.wear)||t.wear<0||t.wear>100||!containers.some(c=>c.id===t.holder)))throw Error('invalid physical gear');
 for(const p of w.persons){const prey=Object.values(p.beliefs).filter(b=>b.kind==='prey');if(prey.length>4||prey.some(b=>!hasGear(w)||!runsRulesVersion(w,127)||!int(b.id)||b.id<=0||!Number.isFinite(b.x)||!Number.isFinite(b.y)||!int(b.seen)||b.seen>w.tick||b.amount!==1||b.max!==1))throw Error('invalid deer sighting');for(const b of Object.values(p.beliefs)){check(b.items);if(b.gearStock&&(!hasGear(w)||!['building','cart','pile'].includes(b.kind)||!int(b.gearStock.observer)||!b.gearStock.items||Object.entries(b.gearStock.items).some(([k,n])=>!['net','trap'].includes(k)||!int(n))))throw Error('invalid owned gear observation');if(b.gear&&(!hasGear(w)||b.kind!=='pile'||!['net','trap'].includes(b.gear.kind)||!int(b.gear.readyAt)||!int(b.gear.toolId)||!int(b.gear.hhId)||typeof b.gear.checked!=='boolean'||!['armed','ready','broken'].includes(b.gear.state)||!Number.isFinite(b.gear.wear)||b.gear.wear<0||b.gear.wear>100||!int(b.gear.catch)||b.gear.catch>2))throw Error('invalid gear observation');}
 for(const a of [p.activity,p.suspended])if(a?.kind==='gear_work'&&(!hasGear(w)||!Object.hasOwn(durations,a.data.op)||(a.phase==='work'&&(a.duration!==durations[a.data.op]||!int(a.progress)||a.progress>=a.duration))))throw Error('invalid gear work');}
 for(const b of w.buildings){const j=b.ops?.job;if(!j||!['make_net','make_trap'].includes(j.recipe))continue;
  const wood=j.recipe==='make_net'?2:4;
  if(!hasGear(w)||b.type!=='timber_yard'||j.total!==180||!['work','ready'].includes(j.phase)||!Number.isFinite(j.progress)||j.progress<0||(j.phase==='work'?j.progress>=180:j.progress<180)||j.burnLeft!==0||j.burnTotal!==0||!j.held||j.held.fibre!==3||j.held.wood!==wood||Object.keys(j.held).length!==2||!int(j.started)||j.started>w.tick||!int(j.lastWork)||j.lastWork<j.started||j.lastWork>w.tick)throw Error('invalid gear batch');
 }
 const deployed=new Set<number>();
 for(const b of w.piles){const g=b.gear;if(!g)continue;const t=toolById(w,g.toolId);const bad=()=>{throw Error('invalid deployed gear');};
 if(!hasGear(w)||b.carcass||b.estate||b.mealFood||!['net','trap'].includes(g.kind)||!t||t.kind!==g.kind||t.holder!==b.id||deployed.has(g.toolId)||t.ownerHh!==g.hhId)bad();deployed.add(g.toolId);
 const minimumCycle=g.kind==='trap'&&runsRulesVersion(w,131)?durations.reset:GEAR_WAIT;
 if([g.owner,g.hhId,g.sourceId,g.toolId,g.setAt,g.readyAt,g.cycle,g.lastTended].some(n=>!int(n))||g.owner<=0||g.sourceId<=0||g.cycle<1||g.lastTended>w.tick||g.setAt<b.since||g.setAt>g.lastTended||g.readyAt!==g.setAt+GEAR_WAIT||g.cycle>1+Math.floor((w.tick-b.since)/minimumCycle)||typeof g.checked!=='boolean'||!['armed','ready','broken'].includes(g.state))bad();
 const earlyTrap=g.kind==='trap'&&runsRulesVersion(w,131),caught=g.bodyId?w.piles.find(c=>c.id===g.bodyId):undefined;
 if(g.catchTick!==null&&(!int(g.catchTick)||g.catchTick>w.tick||g.catchTick<(earlyTrap?g.setAt:g.readyAt)||earlyTrap&&(g.catchTick>g.readyAt||g.bodyId===null)))bad();
 if(earlyTrap&&g.bodyId!==null&&g.catchTick===null)bad();
 if(earlyTrap&&caught&&(caught.ent!=='pile'||!caught.carcass||caught.carcass.species!=='deer'||caught.carcass.hhId!==g.hhId||caught.since!==g.catchTick))bad();
 if((b.items.fish??0)>0&&g.catchTick===null)bad();if(g.state!=='armed'&&g.readyAt>w.tick&&!(earlyTrap&&g.catchTick!==null&&g.bodyId!==null))bad();if(g.bodyId!==null&&(!int(g.bodyId)||g.bodyId<=0))bad();
 if(b.items[g.kind]!==1||Object.keys(b.items).some(k=>k!==g.kind&&k!=='fish')||!int(b.items.fish??0)||(b.items.fish??0)>2||(g.kind==='trap'&&(b.items.fish??0)>0)||(g.state==='armed'&&(g.checked||g.catchTick!==null||g.bodyId!==null||(b.items.fish??0)>0)))bad();
 }
}
