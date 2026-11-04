// A body's parts are possible recipe inputs, not carried or stored inventory.
import type {CarcassPart,ItemKind,World} from './types';
import type {Ctx} from './optutil';
import {pen} from './optutil';
import {runsRulesVersion} from './rulesversion';
import {DAY,WEIGHT} from './constants';
import {recentFailure} from './knowledge';
import {weightOf} from './economy';
import {carryCap} from './people';
import {newActivity} from './activities';
import {CARCASS_WORK,hasCarcassBatches} from './carcass';
export const hasCarcassSupply=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,130);
export const isBodyPart=(k:ItemKind):k is CarcassPart=>k==='meat'||k==='hide'||k==='fat';
function sources(ctx:Ctx,part:CarcassPart){
 if(!hasCarcassSupply(ctx.world)||ctx.stage==='child')return [];
 return Object.values(ctx.p.beliefs).filter(b=>b.kind==='pile'&&b.state==='carcass'&&
  (b.hh===0||b.hh===ctx.p.hhId)&&ctx.world.tick-b.seen<=DAY&&(b.carcassParts?.[part]??0)>0&&
  !recentFailure(ctx.world,ctx.p,b.id,240)).sort((a,b)=>Math.hypot(a.x-ctx.p.x,a.y-ctx.p.y)-Math.hypot(b.x-ctx.p.x,b.y-ctx.p.y)||a.id-b.id);
}
export function knownCarcassUnits(ctx:Ctx,part:CarcassPart):number{return sources(ctx,part).reduce((n,b)=>n+(b.carcassParts?.[part]??0),0);}
/** Request only the recipe's missing units; every recovered portion still pays its own work. */
export function supplyFromCarcass(ctx:Ctx,part:CarcassPart,base:number,why:string,quantity=1,bodyId?:number):void{
 const {world:w,p}=ctx;if(ctx.dangers.length||weightOf(p.inv)+WEIGHT[part]>carryCap(w,p))return;
 for(const b of sources(ctx,part)){
  if(bodyId!==undefined&&b.id!==bodyId)continue;
  const amount=hasCarcassBatches(w)?Math.max(1,Math.min(4,Math.ceil(quantity),b.carcassParts?.[part]??0,Math.floor((carryCap(w,p)-weightOf(p.inv))/WEIGHT[part]))):1;
  const travel=Math.hypot(b.x-p.x,b.y-p.y)/Math.max(.03,ctx.speed),util=base-pen(travel)*.6;if(util<5)continue;
  const key=`butcher:${b.id}:${part}`,prior=ctx.options.find(o=>o.key===key);if(prior&&prior.util>=util)continue;
  const label=hasCarcassBatches(w)?`Recover ${amount} ${part} from the body`:`Recover ${part} from the body`;
  const option={kind:'butcher' as const,key,label,goal:why,need:part==='hide'?'warmth' as const:'hunger' as const,util,
   parts:[['needed for '+why,base],['walking',-pen(travel)*.6]] as [string,number][],eta:travel+CARCASS_WORK*amount,targetId:b.id,tag:part==='hide'?'warmth':'food',yields:part,
   make:()=>newActivity(w,p,{kind:'butcher',label:hasCarcassBatches(w)?`Recovering ${amount} ${part}`:`Recovering ${part}`,goal:why,targetId:b.id,targetType:'pile',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,utility:util,minCommit:20,maxTicks:900,...(hasCarcassBatches(w)?{amount}:{}),data:{part}})};
  if(prior)Object.assign(prior,option);else ctx.options.push(option);
 }
}
