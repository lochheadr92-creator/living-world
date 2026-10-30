import {afterEach,expect,it} from 'vitest';
import {residentCareScene} from './helpers/resident_care';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {observeInhabitant} from '../src/agent/observe';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport,produce,consume} from '../src/sim/economy';
import {setResidentCare,ROOM_CONTACT_MEMORY} from '../src/sim/resident_contact';
import {delBelief,observe} from '../src/sim/knowledge';
import {leaveHome,enterHome,doorPoint} from '../src/sim/habitation';
import {building} from './helpers/kit';
import {rebuildMobileGrid,solidChanged} from '../src/sim/registry';
import {selectPrerequisite} from './helpers/tool_prerequisite';
import {killPerson} from '../src/sim/lifecycle';
import {abortActivity} from '../src/sim/activities';
import {parseIntervention} from '../scripts/lab/lab';
import {indoorCareScene} from './helpers/indoor_care';
import {perceive} from '../src/sim/perception';
import {carryCap} from '../src/sim/people';
import {relOf} from '../src/sim/relations';
afterEach(()=>setResidentCare(true));
it('remembers personally seen indoor need, returns through the own-home entrance and physically gives food that is eaten',()=>{
 const f=residentCareScene(),{w,helper,elder,home}=f;
 expect(helper.whereabouts[elder.id]?.room?.homeId).toBe(home.id);
 expect(helper.seen.some(s=>s.id===elder.id)).toBe(false);
 const before=serializeWorld(w),ctx=generateOptions(w,helper,true,true);
 expect(ctx.options.some(o=>o.key===`give:${elder.id}:home`)).toBe(true);expect(serializeWorld(w)).toBe(before);
 const observation=observeInhabitant(w,helper,ctx,rankOptions(ctx));
 expect(observation.options.find(o=>o.key===`give:${elder.id}:home`)?.selectionReason).toBe('remembered contact inside our household home');
 expect(serializeWorld(w)).toBe(before);
 const transfers:{n:number;giverInside:number;receiverInside:number}[]=[];
 w.hooks={onTransfer:t=>{if(t.reason==='given')transfers.push({n:t.n,giverInside:helper.indoors??0,receiverInside:elder.indoors??0});}};
 const twin=deserializeWorld(before),hunger=elder.needs.hunger;
 for(let n=0;n<800&&elder.needs.hunger<hunger+5;n++){stepWorld(w);stepWorld(twin);}
 expect(transfers.length).toBeGreaterThan(0);expect(transfers.every(t=>t.giverInside===home.id&&t.receiverInside===home.id)).toBe(true);
 expect(elder.needs.hunger).toBeGreaterThan(hunger+5);expect(w.ledger.reasons['-eaten']).toBeGreaterThan(0);
 expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(conservationReport(w).ok).toBe(true);
});
it.each(['old','ablation','unseen','unknown home','expired','promised','own needs'] as const)('offers no new room visit for %s',reason=>{
 const undo=reason==='ablation'?parseIntervention('rich-no-resident-care').install!():()=>{};
 try{
  const f=residentCareScene(reason==='old'?65:66),{w,helper,elder,home}=f;
  if(reason==='old'||reason==='ablation')expect(helper.whereabouts[elder.id]?.room).toBeUndefined();
  if(reason==='unseen')delete helper.whereabouts[elder.id];
  if(reason==='unknown home')delBelief(helper,home.id);
  if(reason==='expired')helper.whereabouts[elder.id].tick=w.tick-ROOM_CONTACT_MEMORY-1;
  if(reason==='promised')helper.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:elder.id,item:'bread',amount:3,siteId:0,made:w.tick,deadline:w.tick+2000,status:'active'});
  if(reason==='own needs')helper.needs.hunger=30;
  const saved=serializeWorld(w);expect(generateOptions(w,helper,true,true).options.some(o=>o.key===`give:${elder.id}:home`)).toBe(false);
  expect(serializeWorld(w)).toBe(saved);
 }finally{undo();}
});
it.each(['blocked entrance','ownership','recipient gone','moved rooms','food lost','new promise','recovered','interrupt'] as const)('revalidates %s during the actual return without moving food through walls',change=>{
 const f=residentCareScene(),{w,helper,elder,home}=f,selected=selectPrerequisite(w,helper,`give:${elder.id}:home`),start={x:helper.x,y:helper.y};
 try{
  if(change==='blocked entrance'){w.solid[home.doorY*w.W+home.doorX]=1;solidChanged(w);}
  if(change==='ownership')home.hhId=987654;
  if(change==='recipient gone')killPerson(w,elder,'staged absence');
  if(change==='moved rooms'){
   // Imposed relocation, not evidence that the elder made this journey autonomously.
   const other=building(f.s,'hut',60,60,helper.hhId),door=doorPoint(other);expect(leaveHome(w,elder)).toBeNull();elder.x=door.x;elder.y=door.y;expect(enterHome(w,elder,other)).toBeNull();
  }
  if(change==='food lost')consume(w,helper.inv,'bread',3,'staged loss');
  if(change==='new promise')helper.commitments.push({id:w.nextId++,requestId:0,kind:'deliver',to:elder.id,item:'bread',amount:3,siteId:0,made:w.tick,deadline:w.tick+2000,status:'active'});
  if(change==='recovered')elder.needs.hunger=100;
  if(change==='interrupt')abortActivity(w,helper,'staged interruption');
  // Disabling fresh offers must not disable an in-flight action's physical checks.
  setResidentCare(false);
  const copy=deserializeWorld(serializeWorld(w));
  for(let n=0;n<800&&helper.activity?.id===selected.act.id;n++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(w)).toBe(serializeWorld(copy));
  expect(helper.lastResult?.outcome).toBe(change==='interrupt'?'interrupted':'failed');
  expect(elder.inv.bread??0).toBe(0);expect(helper.inv.bread??0).toBe(change==='food lost'?0:3);
  if(change==='moved rooms'){expect(helper.lastResult?.detail).toBe('they are not in the room I remembered');expect(helper.whereabouts[elder.id]).toBeUndefined();expect(Math.hypot(helper.x-start.x,helper.y-start.y)).toBeGreaterThan(2);}
  if(change==='recipient gone')expect(helper.lastResult?.detail).toBe('home entrance is blocked'); // the real death path puts a grave at the entrance
  if(change==='recovered')expect(helper.lastResult?.detail).toBe('they no longer need the supplies I brought');
  expect(conservationReport(w).ok).toBe(true);
 }finally{selected.restore();}
});
it('can meet a recipient seen outside after departure, using normal outdoor contact instead of following the old room',()=>{
 const f=residentCareScene(),{w,helper,elder}=f,selected=selectPrerequisite(w,helper,`give:${elder.id}:home`);
 try{
  expect(leaveHome(w,elder)).toBeNull();rebuildMobileGrid(w);perceive(w,helper);
  expect(helper.seen.some(s=>s.id===elder.id)).toBe(true);
  for(let n=0;n<400&&helper.activity?.id===selected.act.id;n++)stepWorld(w);
  expect(selected.act.data.careHome).toBeUndefined();expect(helper.indoors??0).toBe(0);
  expect(elder.inv.bread).toBeGreaterThan(0);expect(conservationReport(w).ok).toBe(true);
 }finally{selected.restore();}
});
it('remembers visible thirst, carries spare real water back and the elder drinks it',()=>{
 const f=indoorCareScene(66),{w,helper,elder,home}=f;
 elder.needs.hunger=90;elder.needs.thirst=20;produce(w,helper.inv,99,'water',2,'staged extra water');
 perceive(w,helper);expect(leaveHome(w,helper)).toBeNull();perceive(w,helper);helper.cooldowns.pause=0;helper.nextThink=w.tick;
 const waterBefore=helper.inv.water!,thirst=elder.needs.thirst,transfers:number[]=[];
 w.hooks={onTransfer:t=>{if(t.item==='water'&&t.reason==='given'){expect(helper.indoors).toBe(home.id);expect(elder.indoors).toBe(home.id);transfers.push(t.n);}}};
 for(let n=0;n<500&&elder.needs.thirst<thirst+5;n++)stepWorld(w);
 expect(transfers.reduce((a,b)=>a+b,0)).toBe(1);expect(helper.inv.water).toBe(waterBefore-1);
 expect(elder.needs.thirst).toBeGreaterThan(thirst+5);expect(conservationReport(w).ok).toBe(true);
});
it('does not invent water capacity or a fed receipt when a remembered recipient has a full pack',()=>{
 const f=indoorCareScene(66),{w,helper,elder}=f;elder.needs.hunger=90;elder.needs.thirst=20;
 produce(w,helper.inv,carryCap(w,helper),'water',2,'staged spare water');
 produce(w,elder.inv,carryCap(w,elder),'grain',100,'staged full recipient pack');
 perceive(w,helper);expect(leaveHome(w,helper)).toBeNull();perceive(w,helper);
 const selected=selectPrerequisite(w,helper,`give:${elder.id}:home`),before=helper.inv.water;
 try{for(let n=0;n<100&&helper.activity?.id===selected.act.id;n++)stepWorld(w);}finally{selected.restore();}
 expect(helper.lastResult?.detail).toBe('they had no room to carry it');expect(helper.inv.water).toBe(before);
 expect(elder.inv.water??0).toBe(0);expect(elder.cooldowns.fedUntil??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('does not use an unseen remote recovery or room change to rewrite remembered need and destination',()=>{
 const f=residentCareScene(),{w,helper,elder}=f,key=`give:${elder.id}:home`;
 const before=generateOptions(w,helper,true,true).options.find(o=>o.key===key);expect(before).toBeDefined();
 elder.needs.hunger=100;elder.health=100;elder.cooldowns.fedUntil=w.tick+500;delete elder.indoors;
 const saved=serializeWorld(w),after=generateOptions(w,helper,true,true).options.find(o=>o.key===key);
 expect(after?.util).toBe(before?.util);expect(after?.goal).toBe(before?.goal);expect(serializeWorld(w)).toBe(saved);
});
it('uses learned death news rather than removal from the live registry when deciding whether to return',()=>{
 const {w,helper,elder}=residentCareScene(),key=`give:${elder.id}:home`;
 killPerson(w,elder,'staged unseen death');
 expect(w.byId.has(elder.id)).toBe(false);expect(helper.relations[elder.id]?.deathKnown).toBeUndefined();
 expect(generateOptions(w,helper,true,true).options.some(o=>o.key===key)).toBe(true);
 relOf(helper,elder.id).deathKnown={learned:w.tick,source:'told',via:0};
 expect(generateOptions(w,helper,true,true).options.some(o=>o.key===key)).toBe(false);
});
it('revises remembered care eligibility after actually observing recovery in the room',()=>{
 const {w,helper,elder}=indoorCareScene(66);
 expect(helper.whereabouts[elder.id].room?.needsCare).toBe(true);
 elder.health=100;perceive(w,helper);
 expect(helper.whereabouts[elder.id].room?.needsCare).toBe(false);
 expect(leaveHome(w,helper)).toBeNull();perceive(w,helper);
 expect(generateOptions(w,helper,true,true).options.some(o=>o.key===`give:${elder.id}:home`)).toBe(false);
});
it('preserves the existing food-store recovery after an actual full-pack failure and departure',()=>{
 const {w,helper,elder,home}=residentCareScene();
 produce(w,elder.inv,carryCap(w,elder),'wood',100,'staged full recipient pack');
 const chosen=selectPrerequisite(w,helper,`give:${elder.id}:home`);
 try{for(let n=0;n<800&&helper.activity?.id===chosen.act.id;n++)stepWorld(w);}finally{chosen.restore();}
 expect(helper.lastResult?.detail).toBe('they had no room to carry it');expect(helper.indoors).toBe(home.id);
 perceive(w,helper);expect(leaveHome(w,helper)).toBeNull();perceive(w,helper);
 const saved=serializeWorld(w),ctx=generateOptions(w,helper,true,true);
 expect(ctx.options.some(o=>o.key===`care_store:${home.id}:${elder.id}`)).toBe(true);
 expect(ctx.options.some(o=>o.key===`give:${elder.id}:home`)).toBe(false);expect(serializeWorld(w)).toBe(saved);
 expect(conservationReport(w).ok).toBe(true);
});
