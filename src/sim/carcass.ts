import type {Activity,Animal,CarcassPart,Person,Pile,World} from './types';
import {newActivity,registerHandler} from './activities';
import {addItem,ledgerCreate,ledgerSpoil,weightOf} from './economy';
import {WEIGHT} from './constants';
import {carryCap,stageOf} from './people';
import {newId,registerGeneric,unregisterPile} from './registry';
import {removeAnimal} from './wildlife';
import {observe,recentFailure,noteFailure} from './knowledge';
import {runsRulesVersion} from './rulesversion';
import {addOption,pen} from './optutil';
import type {Ctx} from './optutil';

export const CARCASS_WORK=120;
export const CARCASS_LIFETIME=4800;
const PARTS:CarcassPart[]=['meat','hide','fat'];
const zero=()=>({meat:0,hide:0,fat:0});
export const hasCarcasses=(w:World):boolean=>w.settings.dynamics==='rich'&&runsRulesVersion(w,125);
export const hasCarcassBatches=(w:World):boolean=>hasCarcasses(w)&&runsRulesVersion(w,149);
/** Current recovery truth; retained origin records are not remaining products. */
export const hasRecoverableParts=(w:World,b:Pile):boolean=>!!b.carcass&&w.tick-b.since<CARCASS_LIFETIME&&PARTS.some(k=>b.carcass!.remaining[k]>0);

/** The one origin of recoverable parts. It consumes an actual live animal,
 * never a historical id or a second call on an already removed body. */
export function makeCarcass(w:World,animal:Animal,killer:Person|undefined,witness=true,ownerHh=killer?.hhId??0):Pile|null{
 if(!hasCarcasses(w)||!(animal.type==='deer'||animal.type==='sheep'&&runsRulesVersion(w,129)||animal.type==='wolf'&&runsRulesVersion(w,239))||animal.health<=0||w.byId.get(animal.id)!==animal||!w.animals.includes(animal))return null;
 const growth=animal.sheep?Math.min(1,animal.sheep.growth/19200):1;
 // rules 239 (wolf_fight.ts): a wolf killed with a spear leaves two meat and a hide
 const initial=animal.type==='wolf'?{meat:2,hide:1,fat:0}:{meat:Math.floor(4*growth),hide:growth>=1?1:0,fat:growth>=.5?1:0};
 const body:Pile={ent:'pile',id:newId(w),x:Math.floor(animal.x),y:Math.floor(animal.y),items:{},since:w.tick,note:'A '+animal.type+' body awaiting paid butchery',carcass:{animalId:animal.id,species:animal.type,hhId:ownerHh,initial:{...initial},remaining:{...initial},recovered:zero(),lost:zero(),work:zero(),claim:null,emptySince:Object.values(initial).some(n=>n>0)?null:w.tick}};
 if(animal.sheep?.wool)ledgerSpoil(w,'wool',animal.sheep.wool,'unshorn wool lost with sheep');
 removeAnimal(w,animal);registerGeneric(w,body);
 for(const part of PARTS)ledgerCreate(w,part,initial[part],'parts of a killed '+animal.type);
 if(witness&&killer)observe(w,killer,body);
 return body;
}
function bodyFor(w:World,a:Activity):Pile|undefined{const e=w.byId.get(a.targetId);return e?.ent==='pile'&&e.carcass?e:undefined;}
function problem(w:World,p:Person,a:Activity):string|undefined{
 const b=bodyFor(w,a),c=b?.carcass,part=a.data.part as CarcassPart;
 if(!hasCarcasses(w)||!b||!c)return 'the body is gone';
 if(stageOf(w,p)==='child')return 'butchery needs a grown worker';
 if(c.hhId!==0&&c.hhId!==p.hhId)return 'the body belongs to another household';
 if(!PARTS.includes(part))return 'unknown body part';
 if(w.tick-b.since>=CARCASS_LIFETIME||c.remaining[part]<=0)return 'that part is no longer recoverable';
 if(p.indoors||Math.hypot(p.x-(b.x+.5),p.y-(b.y+.5))>2)return 'must reach the body outdoors';
 if(c.claim&&c.claim.person!==p.id&&c.claim.until>w.tick)return 'another worker is cutting this body';
 if(weightOf(p.inv)+WEIGHT[part]>carryCap(w,p)+1e-9)return 'no room for the recovered part';
}
registerHandler('butcher',{
 availability:.25,pose:()=> 'craft',
 begin(w,p,a){const why=problem(w,p,a);if(why)return why;const c=bodyFor(w,a)!.carcass!;c.claim={person:p.id,until:w.tick+2};a.duration=CARCASS_WORK;a.progress=c.work[a.data.part as CarcassPart];},
 work(w,p,a){
  const why=problem(w,p,a);if(why)return `${hasCarcassBatches(w)&&a.cycle>0?'partial':'fail'}:${why}`;
  const b=bodyFor(w,a)!,c=b.carcass!,part=a.data.part as CarcassPart;
  c.claim={person:p.id,until:w.tick+2};c.work[part]++;a.progress=c.work[part];
  if(c.work[part]<CARCASS_WORK)return 'continue';
  c.work[part]=0;c.remaining[part]--;c.recovered[part]++;addItem(p.inv,part,1);
  if(PARTS.every(k=>c.remaining[k]===0))c.emptySince=w.tick;
  observe(w,p,b);
  if(hasCarcassBatches(w)){
   a.cycle++;
   if(a.cycle<Math.max(1,a.amount)){
    const blocked=problem(w,p,a);if(blocked)return `partial:${blocked}`;
    a.progress=0;a.label=`Recovering ${part} (${a.cycle}/${a.amount} recovered)`;return 'continue';
   }
  }
  return 'done';
 },
 onEnd(w,p,a,outcome,detail){
  const b=bodyFor(w,a);if(b?.carcass?.claim?.person===p.id)b.carcass.claim=null;
  if(b&&!p.indoors&&Math.hypot(p.x-b.x-.5,p.y-b.y-.5)<=2)observe(w,p,b);
  if(outcome==='failed')noteFailure(w,p,a.targetId,detail);
 },
});
export function carcassTick(w:World):void{
 if(!hasCarcasses(w))return;
 for(const b of w.piles.slice()){
  const c=b.carcass;if(!c)continue;
  if(c.claim&&c.claim.until<=w.tick)c.claim=null;
  if(w.tick-b.since>=CARCASS_LIFETIME&&c.emptySince===null){
   for(const part of PARTS){const n=c.remaining[part];if(n)ledgerSpoil(w,part,n,'unbutchered body decayed');c.lost[part]+=n;c.remaining[part]=0;c.work[part]=0;}
   c.emptySince=w.tick;c.claim=null;
  }
  if(c.emptySince!==null&&w.tick-c.emptySince>=120){unregisterPile(w,b);}
 }
}
export function carcassOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasCarcasses(w)||ctx.stage==='child'||ctx.dangers.length)return;
 for(const b of Object.values(p.beliefs)){
  if(b.kind!=='pile'||b.state!=='carcass'||!b.carcassParts||(b.hh!==0&&b.hh!==p.hhId)||recentFailure(w,p,b.id,240))continue;
  const distance=Math.hypot(b.x-p.x,b.y-p.y),travel=distance/Math.max(.03,ctx.speed);
  for(const part of PARTS){
   if((b.carcassParts[part]??0)<1||weightOf(p.inv)+WEIGHT[part]>carryCap(w,p))continue;
   const need=part==='meat'?Math.max(0,ctx.drives.hunger)*.5+(ctx.food<2?24:6):part==='hide'?(p.inv.garment?5:24):ctx.food<2?18:4;
   const util=need-pen(travel)*.6;if(util<5)continue;
   addOption(ctx,{kind:'butcher',key:`butcher:${b.id}:${part}`,label:`Recover ${part} from the ${runsRulesVersion(w,130)?'body':'deer'}`,goal:'use the finite body before it decays',need:part==='hide'?'warmth':'hunger',util,parts:[['known recoverable body part',need],['walking',-pen(travel)*.6]],eta:travel+CARCASS_WORK,targetId:b.id,tag:part==='hide'?'warmth':'food',yields:part,make:()=>newActivity(w,p,{kind:'butcher',label:`Recovering ${part}`,goal:'use the body before it decays',targetId:b.id,targetType:'pile',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,utility:util,minCommit:20,maxTicks:900,data:{part}})});
  }
 }
}
/** Refuse beneficial defaults: every persisted body must account for all parts,
 * its real origin, ownership, work and bounded expiry state. */
export function validateCarcasses(w:World):void{
 const origins=new Set<number>();const integer=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
 const check=(items:import('./types').Items|undefined)=>{for(const k of ['hide','fat','rendered_fat'] as const)if(items?.[k]!==undefined&&(!hasCarcasses(w)||!integer(items[k])))throw Error('invalid carcass goods');};
 for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.inputs);check(b.ops?.output);check(b.ops?.yields);if(b.carcassParts!==undefined&&(!hasCarcasses(w)||b.kind!=='pile'||b.state!=='carcass'||!b.carcassParts||Object.entries(b.carcassParts).some(([k,n])=>!PARTS.includes(k as CarcassPart)||!integer(n)||n>(k==='meat'?4:1))))throw Error('invalid carcass observation');}}
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.wasted);}
 for(const p of w.piles)check(p.items);for(const c of w.carts)check(c.load);for(const m of w.meals)check(m.table);for(const s of w.sites){check(s.delivered);check(s.used);}
 check(w.ledger.initial);check(w.ledger.created);check(w.ledger.consumed);check(w.ledger.spoiled);
 for(const b of w.piles){
  const c=b.carcass;if(!c)continue;
  const bad=()=>{throw Error('invalid carcass state');};
  if(!hasCarcasses(w)||!(c.species==='deer'||c.species==='sheep'&&runsRulesVersion(w,129)||c.species==='wolf'&&runsRulesVersion(w,239))||!integer(c.animalId)||c.animalId<=0||origins.has(c.animalId)||w.animals.some(a=>a.id===c.animalId)||!integer(c.hhId)||!integer(b.since)||b.since>w.tick||b.mealFood||b.estate||Object.keys(b.items).length)bad();
  origins.add(c.animalId);
  for(const field of [c.initial,c.remaining,c.recovered,c.lost,c.work])if(!field||Object.keys(field).length!==3||PARTS.some(k=>!integer(field[k])))bad();
  if(c.species==='deer'?(c.initial.meat!==4||c.initial.hide!==1||c.initial.fat!==1):c.species==='wolf'?(c.initial.meat!==2||c.initial.hide!==1||c.initial.fat!==0):(c.initial.meat>4||c.initial.hide>1||c.initial.fat>1))bad();
  for(const k of PARTS)if(c.initial[k]!==c.remaining[k]+c.recovered[k]+c.lost[k]||c.work[k]>=CARCASS_WORK||(!c.remaining[k]&&c.work[k]))bad();
  const empty=PARTS.every(k=>c.remaining[k]===0);
  if(empty?(c.emptySince===null||!integer(c.emptySince)||c.emptySince<b.since||c.emptySince>w.tick):c.emptySince!==null)bad();
  if(c.claim!==null&&(!c.claim||!integer(c.claim.person)||!w.persons.some(p=>p.id===c.claim!.person)||!integer(c.claim.until)||c.claim.until>w.tick+2))bad();
 }
 for(const p of w.persons)for(const a of [p.activity,p.suspended])if(a?.kind==='butcher'&&(!hasCarcasses(w)||a.targetType!=='pile'||!PARTS.includes(a.data.part)||(a.phase==='work'&&(a.duration!==CARCASS_WORK||!integer(a.progress)||a.progress>=CARCASS_WORK))||(hasCarcassBatches(w)&&(!integer(a.amount)||a.amount>4||!integer(a.cycle)||a.cycle>4))))throw Error('invalid carcass work');
}
