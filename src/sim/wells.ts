// Adapted from the retired expansion's finite well store. Refill now TRANSFERS
// from existing hydrology; it does not create the old unlimited groundwater.
import {DAY,WORK} from './constants';
import {GROUND_CAP,WELL_BY_HOMES,WELL_DRAWN_DRY,WELL_NEAR,WELL_SPACING,groundAt,hasGroundwater,wantsMoreWells,wellsAnywhere} from './groundwater';
import {newActivity} from './activities';
import {addItem,roomFor} from './economy';
import {drawWater,waterBodyAt} from './hydrology';
import type {WaterBody} from './hydrology';
import {Scorer,addOption,beliefsByKind,eta,pen} from './optutil';
import type {Ctx} from './optutil';
import {runsRulesVersion} from './rulesversion';
import type {Activity,Belief,Building,Person,World} from './types';

export const WELL_CAP=12, WELL_REFILL=50, WELL_REACH=14;
export const hasWells=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,134);
const cache=new WeakMap<World,{bodies:World['waterBodies'];spots:Map<string,WaterBody|undefined>}>();

/** Physical catchment connection, derived from fixed terrain; never used to rank a person's options. */
export function wellBody(w:World,x:number,y:number):WaterBody|undefined{
 let c=cache.get(w);if(!c||c.bodies!==w.waterBodies){c={bodies:w.waterBodies,spots:new Map()};cache.set(w,c);}
 const key=x+','+y;if(c.spots.has(key))return c.spots.get(key);
 let best:WaterBody|undefined,distance=Infinity;
 for(let yy=Math.floor(y-WELL_REACH);yy<=Math.ceil(y+WELL_REACH);yy++)for(let xx=Math.floor(x-WELL_REACH);xx<=Math.ceil(x+WELL_REACH);xx++){
  const d=Math.hypot(xx+.5-x,yy+.5-y);if(d>WELL_REACH||d>=distance)continue;
  const body=waterBodyAt(w,xx,yy);if(body){best=body;distance=d;}
 }
 c.spots.set(key,best);return best;
}
export function updateWells(w:World):void{
 if(!hasWells(w)||w.tick%WELL_REFILL!==29)return;
 for(const b of w.buildings){
  if(b.type!=='well'||b.condition<10||(b.store.items.water??0)>=WELL_CAP||roomFor(b.store.items,b.store.cap,'water')<1)continue;
  // rules 236 (groundwater.ts): a well draws from the ground beneath it, not from the lake
  const ground=groundAt(w,b);
  if(ground){if(ground.amount>=1){ground.amount-=1;addItem(b.store.items,'water',1);w.hooks?.onTransfer?.({from:'ground:'+b.id,to:'building:'+b.id,item:'water',n:1,reason:'water rises in the well'});}continue;}
  const body=wellBody(w,b.x+b.w/2,b.y+b.h/2);if(!body)continue;
  const n=drawWater(w,body,1);if(n){addItem(b.store.items,'water',n);w.hooks?.onTransfer?.({from:'water:'+body.id,to:'building:'+b.id,item:'water',n,reason:'water enters shallow well'});}
 }
}
export const isWellAction=(a:Activity)=>a.data.fromWell===true;
/** Ownership and contact checked again for every paid unit, never remotely consumed. */
export function wellSource(w:World,p:Person,a:Activity):Building|null{
 if(!hasWells(w)||!isWellAction(a)||p.indoors)return null;
 const b=w.byId.get(a.targetId);
 return b?.ent==='building'&&b.type==='well'&&b.condition>0&&(b.hhId===0||b.hhId===p.hhId)&&Math.hypot(p.x-(b.doorX+.5),p.y-(b.doorY+.5))<=1.5?b:null;
}
function knownWells(ctx:Ctx):Belief[]{
 return hasWells(ctx.world)?beliefsByKind(ctx.p,['building']).filter(b=>b.btype==='well'&&(b.hh===0||b.hh===ctx.p.hhId)&&(b.cond??0)>0&&(b.items?.water??0)>=1):[];
}
function action(ctx:Ctx,b:Belief,kind:'drink'|'fetch_water',amount:number,utility:number,why:string):Activity{
 return newActivity(ctx.world,ctx.p,{kind,label:kind==='drink'?'Drinking at the well':'Drawing well water',goal:why,need:kind==='drink'?'thirst':undefined,
  targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:b.x-.5,spotY:b.y+1.5,amount,utility,minCommit:20,maxTicks:800,data:{fromWell:true}});
}
export function wellOptions(ctx:Ctx):void{
 for(const b of knownWells(ctx)){
  const walk=eta(ctx,b.x-.5,b.y+1.5),sc=new Scorer().add('thirsty',ctx.drives.thirst*1.02).add('remembered water in well',3).add('walking',-pen(walk));
  addOption(ctx,{kind:'drink',label:'Drink at the well',goal:'drink the water I remember in that well',need:'thirst',util:sc.total,parts:sc.parts,eta:walk+8,key:'drink:well:'+b.id,targetId:b.id,tag:'water',make:()=>action(ctx,b,'drink',1,sc.total,'quench thirst at the well')});
 }
}
/** Existing production/care callers retain their reason and quantity; a well is another known source. */
export function wellFetchOptions(ctx:Ctx,n:number,base:number,why:string,tag:string,care?:{to:number;seen:number}):void{
 for(const b of knownWells(ctx)){
  const amount=Math.min(Math.ceil(n-(ctx.p.inv.water??0)),b.items?.water??0,care?12:4);if(amount<=0)continue;
  const walk=eta(ctx,b.x-.5,b.y+1.5),sc=new Scorer().add(why,base).add('walking',-pen(walk));
  addOption(ctx,{kind:'fetch_water',label:'Draw water from the well',goal:why,need:null,util:sc.total,parts:sc.parts,eta:walk+WORK.water*amount,key:care?`care_supply:${care.to}:water:${b.id}`:'fetch_water:well:'+b.id,targetId:b.id,tag,make:()=>{const a=action(ctx,b,'fetch_water',amount,sc.total,why);if(care)a.data.careSupply={...care};return a;}});
 }
}
export function knownWellSite(p:Person,x:number,y:number):boolean{
 return beliefsByKind(p,['water']).some(b=>Math.hypot(x-b.x,y-b.y)<=WELL_REACH);
}
/** Whether this person may lay a well out here: beside water they know of, or from rules 236 (groundwater.ts) anywhere. */
export function wellSpotKnown(w:World,p:Person,x:number,y:number):boolean{
 return wellsAnywhere(w)||knownWellSite(p,x,y);
}
/** Repeated water travel is the benefit. Food stock is not a prerequisite for a water-access project. */
export function wellDemand(ctx:Ctx,x:number,y:number):number{
 if(!hasWells(ctx.world))return 0;
 if(wantsMoreWells(ctx.world)){
  // rules 236 (groundwater.ts): wells are wanted as the homes spread, and another where those near home were found empty
  const near=beliefsByKind(ctx.p,['building','site']).filter(b=>b.btype==='well'&&Math.hypot(x-b.x,y-b.y)<=WELL_NEAR);
  if(near.length){
   if(near.some(b=>b.kind==='site'))return 0;
   const dry=near.every(b=>(b.items?.water??0)<1&&ctx.world.tick-b.seen<=DAY);
   return dry?WELL_DRAWN_DRY:0;
  }
  const water=beliefsByKind(ctx.p,['water']);
  const far=water.length?Math.min(...water.map(b=>Math.hypot(x-b.x,y-b.y))):Infinity;
  return far>=8&&far<Infinity?24+Math.min(20,far-8):WELL_BY_HOMES;
 }
 const known=beliefsByKind(ctx.p,['water']);if(!known.length)return 0;
 const distance=Math.min(...known.map(b=>Math.hypot(x-b.x,y-b.y)));
 if(distance<8||beliefsByKind(ctx.p,['building','site']).some(b=>b.btype==='well'&&Math.hypot(x-b.x,y-b.y)<WELL_REACH))return 0;
 return 24+Math.min(20,distance-8);
}
export function wellSiteConflict(w:World,x:number,y:number):string|null{
 if(!hasWells(w))return 'shallow wells are unavailable in these rules';
 if(!wellsAnywhere(w)&&!wellBody(w,x,y))return 'no nearby shallow water catchment';
 const apart=wellsAnywhere(w)?WELL_SPACING:WELL_REACH; // rules 236 (groundwater.ts)
 if([...w.buildings,...w.sites].some(b=>b.type==='well'&&Math.hypot(x-(b.x+b.w/2),y-(b.y+b.h/2))<apart))return 'another well already serves this place';
 return null;
}
export function validateWells(w:World):void{
 if(w.groundwater!==undefined){
  if(!hasGroundwater(w)&&!(w.settings.dynamics==='rich'&&runsRulesVersion(w,236)))throw Error('Invalid groundwater');
  for(const [k,g] of Object.entries(w.groundwater)){
   const b=w.byId?.get(Number(k));
   if(!g||!Number.isSafeInteger(g.amount)||g.amount<0||g.amount>GROUND_CAP||!Number.isFinite(g.acc)||g.acc<0||g.acc>=1||(b&&(b.ent!=='building'||b.type!=='well')))throw Error('Invalid groundwater');
  }
 }
 const geometry=(b:Building|World['sites'][number])=>Number.isSafeInteger(b.x)&&Number.isSafeInteger(b.y)&&b.x>=0&&b.y>=0&&b.x+2<=w.W&&b.y+2<w.H&&b.w===2&&b.h===2&&Number.isSafeInteger(b.hhId)&&b.hhId>=0;
 for(const b of w.buildings??[])if(b.type==='well'){
  const n=b.store?.items?.water??0;
  if(!hasWells(w)||!Number.isSafeInteger(n)||n<0||n>WELL_CAP||!geometry(b)||b.doorX!==b.x||b.doorY!==b.y+2||!Number.isFinite(b.condition)||b.condition<0||b.condition>100||b.store?.cap!==18)throw Error('Invalid shallow well');
 }
 for(const s of w.sites??[])if(s.type==='well'&&(!hasWells(w)||!geometry(s)||s.workTotal!==260||!Number.isFinite(s.work)||s.work<0||s.work>260||s.required?.wood!==4||s.required?.stone!==8||Object.keys(s.required).some(k=>!['wood','stone'].includes(k))))throw Error('Invalid shallow well site');
 for(const p of w.persons??[])for(const a of [p.activity,p.suspended]){
  if(a?.kind==='plan_site'&&a.data?.type==='well'&&!hasWells(w))throw Error('Invalid well plan');
  if(a?.data?.fromWell!==undefined&&(a.data.fromWell!==true||!hasWells(w)||!['drink','fetch_water'].includes(a.kind)||a.targetType!=='building'||!Number.isSafeInteger(a.targetId)||a.targetId<=0))throw Error('Invalid well activity');
 }
}
