import type {Activity,Items,ItemKind,Person,SeenEntity,Tool,ToolKind,World} from './types';
import {RECIPE_BY_ID} from './recipes';
import type {WorkResult} from './activities';
import {newActivity} from './activities';
import {runsRulesVersion} from './rulesversion';
import {toolsHeldBy,toolById} from './toolreg';
import {breakTool} from './tools';
import {consume} from './economy';
import {reservedFor} from './reserved_goods';
import {shelterAt} from './needs';
import {hearthWarmth} from './hearth';
import {addOption} from './optutil';
import {recentFailure} from './knowledge';
import type {Ctx} from './optutil';
import {TEXTILE_GOODS} from './textile_stock';

export const TEXTILES = ['garment','blanket','bedding'] as const;
export type TextileKind = typeof TEXTILES[number];
export const isTextile=(k:ToolKind):k is TextileKind=>(TEXTILES as readonly string[]).includes(k);
export const hasClothing=(w:World):boolean=>w.settings.dynamics==='rich'&&runsRulesVersion(w,124);
const insulation={garment:6,blanket:4,bedding:4};
export function visibleChildNeedsGarment(ctx:Ctx,seen:SeenEntity):boolean{
 return !!seen.child&&(seen.cold||ctx.world.weather.temp<12)&&!seen.carrying.includes('garment')&&ctx.dependents.some(d=>d.id===seen.id);
}
const giftable=(p:Person,t:Tool):boolean=>t.kind==='garment'&&t.holder===p.id&&t.ownerHh===p.hhId&&!t.loan&&!t.textile?.equipped;
export function textileGiftProblem(w:World,p:Person,a:Activity):string|undefined{
 if(!hasClothing(w)||!a.data.textileDelivery)return;
 const t=toolById(w,a.data.deliveryTool);
 if(!t||!giftable(p,t))return 'the chosen garment is no longer an owned spare';
}
export function textileProtection(p:Person,t:Tool):number{return t.textile&&isTextile(t.kind)&&inUse(p,t)?insulation[t.kind]*(1-t.wear/100)*(1-.8*t.textile.wet):0;}
/** A bedroll belongs to one sleeper. It is rolled for travel and spread beneath
 * its holder when sleeping; it never warms a second person or a whole home. */
function inUse(p:Person,t:Tool):boolean{return !!t.textile?.equipped&&(t.kind==='garment'||p.pose==='sleep');}
export function clothingWarmth(w:World,p:Person):number{
 if(!hasClothing(w))return 0;
 let heat=0;
 for(const kind of TEXTILES){const t=toolsHeldBy(w,p.id,kind).find(t=>inUse(p,t));if(t?.textile)heat+=insulation[kind]*(1-t.wear/100)*(1-.8*t.textile.wet);}
 return heat;
}
/** Physical condition continues to change wherever the equipment is kept. */
export function clothingTick(w:World):void{
 if(!hasClothing(w))return;
 for(const t of w.tools.slice()){
  if(!isTextile(t.kind)||!t.textile)continue;
  const holder=w.byId.get(t.holder);if(!holder)continue;
  const p=holder.ent==='person'?holder:null;
  const covered=holder.ent==='building'?Math.min(1,holder.condition/100):p?shelterAt(w,p.x,p.y,p).cover:0;
  const wetting=w.weather.rain*(1-covered)*.0008;
  const drying=wetting>0?0:.0002+(p?hearthWarmth(w,p)*.00003:0);
  t.textile.wet=Math.max(0,Math.min(1,t.textile.wet+wetting-drying));
  if(p&&inUse(p,t)){t.wear=Math.min(100,t.wear+.002);if(t.wear>=100)breakTool(w,t,'worn out through use');}
 }
}
function ownedTextile(w:World,p:Person,a:Activity):Tool|undefined{
 const t=toolById(w,Number(a.data.toolId));return t&&isTextile(t.kind)&&t.textile&&t.holder===p.id?t:undefined;
}
export function textileBegin(w:World,p:Person,a:Activity):string|undefined{
 if(!hasClothing(w))return 'textile use is unavailable';
 const t=ownedTextile(w,p,a);if(!t)return 'the textile is no longer in hand';
 if(a.data.textile!=='dress'&&a.data.textile!=='repair')return 'unknown textile work';
 if(a.data.textile==='repair'&&(p.inv.fibre??0)-reservedFor(w,p,'fibre')<1)return 'no spare fibre for mending';
 a.duration=a.data.textile==='dress'?20:60;
}
export function textileWork(w:World,p:Person,a:Activity):WorkResult{
 const t=ownedTextile(w,p,a);if(!t)return 'fail:the textile is no longer in hand';
 if(++a.progress<a.duration)return 'continue';
 if(a.data.textile==='repair'){
  if((p.inv.fibre??0)-reservedFor(w,p,'fibre')<1)return 'fail:no spare fibre for mending';
  consume(w,p.inv,'fibre',1,'mending textiles');t.wear=Math.max(0,t.wear-35);
 }else{
  for(const other of toolsHeldBy(w,p.id,t.kind))if(other.textile)other.textile.equipped=false;
  t.textile!.equipped=true;
 }
 return 'done';
}
export function clothingOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasClothing(w))return;
 for(const kind of TEXTILES){
  const held=toolsHeldBy(w,p.id,kind),worn=held.find(t=>t.textile?.equipped);
  const t=worn??held[0];if(!t)continue;
  const action=!worn?'dress':ctx.stage!=='child'&&t.wear>=45&&(p.inv.fibre??0)-reservedFor(w,p,'fibre')>=1?'repair':null;
  if(!action)continue;
  const util=action==='dress'?36+Math.max(0,55-p.needs.warmth)*.5:18+t.wear*.25;
  const label=action==='dress'?`Ready my ${kind}`:`Mend my ${kind}`;
  addOption(ctx,{kind:'tool_work',key:`${action}:${t.id}`,label,goal:action==='dress'?'use my insulation':'keep my insulation usable',need:'warmth',util,parts:[['usable insulation',util]],eta:action==='dress'?20:60,targetId:0,tag:'warmth',make:()=>newActivity(w,p,{kind:'tool_work',label,goal:'keep warm with owned insulation',need:'warmth',here:true,utility:util,minCommit:10,maxTicks:180,data:{textile:action,toolId:t.id}})});
 }
 // Only a visible child supplies the missing-item/cold evidence. Existing give
 // work owns travel, capacity, interruption and the actual transfer.
 if(ctx.stage!=='child')for(const seen of ctx.seenPersons){
  if(!visibleChildNeedsGarment(ctx,seen)||recentFailure(w,p,seen.id,240))continue;
  const spare=toolsHeldBy(w,p.id,'garment').find(t=>giftable(p,t));if(!spare)continue;
  addOption(ctx,{kind:'give',key:`clothe_child:${seen.id}`,label:'Bring a garment to the child',goal:'help the child keep warm',need:null,util:48,parts:[[seen.cold?'visible cold child without a garment':'visible child without a garment in cold weather',48]],eta:40,targetId:seen.id,tag:'help',make:()=>newActivity(w,p,{kind:'give',label:'Bringing a garment to the child',goal:'help the child keep warm',targetId:seen.id,targetType:'person',tx:seen.x,ty:seen.y,spotX:seen.x,spotY:seen.y,data:{items:{garment:1},textileDelivery:true,deliveryTool:spare.id},amount:1,utility:48,minCommit:20,maxTicks:500})});
 }
}
export function validateClothing(w:World):void{
 const slots=new Set<string>();
 const check=(items:Items|undefined)=>{for(const k of TEXTILE_GOODS)if(items?.[k]!==undefined&&(!hasClothing(w)||!Number.isSafeInteger(items[k])||items[k]!<0))throw Error('invalid textile goods');};
 for(const p of w.persons)for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.inputs);check(b.ops?.output);check(b.ops?.yields);}
 for(const s of w.sites){check(s.delivered);check(s.used);}for(const m of w.meals)check(m.table);
 check(w.ledger.initial);check(w.ledger.created);check(w.ledger.consumed);check(w.ledger.spoiled);
 for(const p of w.persons)for(const b of Object.values(p.beliefs))if(b.textileStock!==undefined){
  const s=b.textileStock;
  if(!hasClothing(w)||b.kind!=='building'||!s||!Number.isSafeInteger(s.observer)||s.observer<=0||!s.items||Object.entries(s.items).some(([k,n])=>!(TEXTILE_GOODS as readonly string[]).includes(k)||!Number.isSafeInteger(n)||n<0||n>(b.items?.[k as keyof typeof b.items]??0)))throw new Error('invalid textile stock observation');
 }
 for(const p of w.persons)for(const a of [p.activity,p.suspended]){
  if(!a)continue;
  if(a.data.textile!==undefined){
   if(!hasClothing(w)||a.kind!=='tool_work'||!['dress','repair'].includes(a.data.textile)||!Number.isSafeInteger(a.data.toolId)||a.data.toolId<=0)throw new Error('invalid textile activity');
   if(a.phase==='work'&&(a.duration!==(a.data.textile==='dress'?20:60)||!Number.isFinite(a.progress)||a.progress<0||a.progress>=a.duration))throw new Error('invalid textile work progress');
  }
  if(a.data.textileDelivery!==undefined&&(!hasClothing(w)||a.data.textileDelivery!==true||a.kind!=='give'||a.targetType!=='person'||!a.data.items||Object.keys(a.data.items).length!==1||a.data.items.garment!==1||!Number.isSafeInteger(a.data.deliveryTool)||a.data.deliveryTool<=0))throw new Error('invalid textile delivery');
 }
 for(const b of w.buildings){
  check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.wasted);check(b.ops?.job?.held);
  const j=b.ops?.job;if(!j||!/^(strip_fibre|weave_|sew_hide_)/.test(j.recipe))continue;
  const r=RECIPE_BY_ID[j.recipe];
  if(!hasClothing(w)||!r||b.type!==r.at||!j.held||!j.workers||Array.isArray(j.workers)||
   !Number.isSafeInteger(j.client)||j.client<0||!Number.isSafeInteger(j.destSite)||j.destSite<0||typeof j.purpose!=='string'||typeof j.blocked!=='string'||
   !Number.isSafeInteger(j.started)||j.started<0||j.started>w.tick||!Number.isSafeInteger(j.lastWork)||j.lastWork<j.started||j.lastWork>w.tick||
   !['work','ready'].includes(j.phase)||j.total!==r.work||j.burnLeft!==0||j.burnTotal!==0||!Number.isFinite(j.progress)||j.progress<0||
   (j.phase==='work'?j.progress>=j.total:j.progress<j.total)||
   Object.entries(r.inputs).some(([k,n])=>j.held[k as ItemKind]!==n)||Object.keys(j.held).some(k=>!(k in r.inputs))||
   Object.entries(j.workers).some(([id,n])=>!Number.isSafeInteger(Number(id))||Number(id)<=0||!Number.isSafeInteger(n)||n<0))throw Error('invalid textile batch');
 }
 const containers=[...w.persons.map(p=>({id:p.id,items:p.inv})),...w.buildings.map(b=>({id:b.id,items:b.store.items})),...w.piles.map(p=>({id:p.id,items:p.items})),...w.carts.map(c=>({id:c.id,items:c.load}))];
 for(const c of containers){
  check(c.items);
  if(!hasClothing(w)&&(['fibre',...TEXTILES] as const).some(k=>(c.items[k]??0)>0))throw new Error('textile goods under earlier rules');
  for(const kind of TEXTILES)if((c.items[kind]??0)!==w.tools.filter(t=>t.holder===c.id&&t.kind===kind).length)throw new Error('textile count without matching physical record');
 }
 for(const t of w.tools){
  if(!isTextile(t.kind)){if(t.textile)throw new Error('textile state on non-textile');continue;}
  const s=t.textile;
  if(s?.material!==undefined&&(s.material!=='hide'||!runsRulesVersion(w,125)||t.kind!=='garment'))throw Error('invalid textile material');
  if(!hasClothing(w)||!s||!Number.isFinite(s.wet)||s.wet<0||s.wet>1||typeof s.equipped!=='boolean'||!Number.isFinite(t.wear)||t.wear<0||t.wear>=100||t.tier!==0||!containers.some(c=>c.id===t.holder))throw new Error('invalid textile state');
  if(s.equipped){const key=`${t.holder}:${t.kind}`;if(!w.persons.some(p=>p.id===t.holder&&p.alive)||slots.has(key))throw new Error('invalid textile slot');slots.add(key);}
 }
}
