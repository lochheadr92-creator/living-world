// A paid fitting belongs to its home. Fuel energy and residual heat are saved;
// neither observation nor reloading advances them.
import {BUILD_DEF,DAY,isSolidHome} from './constants';
import {runsRulesVersion} from './rulesversion';
import {indoorHome} from './habitation';
import {newActivity} from './activities';
import {addOption,beliefsByKind,eta,pen} from './optutil';
import type {Ctx} from './optutil';
import {fuelAvailable} from './warmth_duty';
import {hasOffcuts} from './offcuts';
import {fuelItem,fuelValue} from './offcuts';
import {consume} from './economy';
import {observe} from './knowledge';
import type {WorkResult} from './activities';
import type {Activity,Belief,Building,Items,Person,World} from './types';

export const HEARTH_COST:Items={wood:1,stone:2};
export const HEARTH_WORK=160;
export const HEARTH_FUEL_MAX=1520;
export const HEARTH_HEAT_MAX=18;
let enabled=true;
export const hearthOn=()=>enabled;
export function setHearth(on:boolean){enabled=on;}
export const runsHearth=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,123);
export const hasHearth=(w:World)=>enabled&&runsHearth(w);
export const isHearthAction=(w:World,a:Activity)=>runsHearth(w)&&a.kind==='fuel_fire'&&a.data.hearth===true;

export function hearthTick(w:World,b:Building):void{
  if(!runsHearth(w)||!b.hearth)return;
  const h=b.hearth,burn=Math.min(1,h.fuel);
  h.fuel-=burn;
  const loss=0.004+0.006*(1-Math.max(0,Math.min(100,b.condition))/100);
  h.heat=Math.min(HEARTH_HEAT_MAX,Math.max(0,h.heat*(1-loss)+burn*0.08));
  if(h.heat<0.001)h.heat=0;
}
export function hearthWarmth(w:World,p:Person):number{
  return runsHearth(w)?indoorHome(w,p)?.hearth?.heat??0:0;
}
export function hearthInstallBlock(w:World,p:Person,id:number):string|null{
  const b=w.byId.get(id);
  if(!runsHearth(w))return 'hearth construction is unavailable';
  if(!b||b.ent!=='building'||!isSolidHome(b.type)||b.condition<=0)return 'the home is gone';
  if(!p.hhId||b.hhId!==p.hhId)return 'not a home of this household';
  if(b.hearth)return 'this home already has a hearth';
  return null;
}
function hearthAccess(w:World,p:Person,a:Activity):Building|null{
  const b=indoorHome(w,p);
  return b&&b.id===a.targetId&&b.hhId===p.hhId&&b.hearth?b:null;
}
export function hearthFuelBegin(w:World,p:Person,a:Activity):string|undefined{
  const b=hearthAccess(w,p,a);
  if(!b)return 'must reach our installed hearth inside the home';
  if(a.data.fuelItem!==undefined&&(!hasOffcuts(w)||a.data.fuelItem!=='offcuts'))return 'invalid hearth fuel';
  const item=fuelItem(w,a);
  if(fuelAvailable(w,p,item)<1)return 'no unreserved fuel for the hearth';
  if(b.hearth!.fuel+fuelValue(item)>HEARTH_FUEL_MAX)return 'the hearth has no room for more fuel';
  a.duration=24;a.data.wasOut=b.hearth!.fuel===0;
  observe(w,p,b);
}
export function hearthFuelWork(w:World,p:Person,a:Activity):WorkResult{
  const b=hearthAccess(w,p,a);
  if(!b)return 'fail:the hearth is no longer accessible';
  if(++a.progress<a.duration)return 'continue';
  const item=fuelItem(w,a);
  if(b.hearth!.fuel+fuelValue(item)>HEARTH_FUEL_MAX)return a.cycle?'done':'fail:someone already filled the hearth';
  if(fuelAvailable(w,p,item)<1)return 'fail:no unreserved fuel for the hearth';
  if(consume(w,p.inv,item,1,'fuel for indoor hearth')!==1)return 'fail:the fuel is gone';
  b.hearth!.fuel+=fuelValue(item);a.cycle++;a.progress=0;observe(w,p,b);
  return a.cycle>=a.amount||fuelAvailable(w,p,item)<1?'done':'continue';
}
/** Planning reads only dated sightings and the inhabitant's own felt cold/weather. */
export function knownColdHearth(ctx:Ctx,b:Belief):boolean{
  return hasHearth(ctx.world)&&b.hh===ctx.p.hhId&&!!b.hearth&&
    ctx.world.tick-b.seen<=DAY&&(ctx.world.weather.temp<10||ctx.p.needs.warmth<55)&&
    (b.hearth.fuel??0)-Math.max(0,ctx.world.tick-b.hearth.seen)<380;
}
export function hearthOptions(ctx:Ctx):void{
  const {world:w,p}=ctx;
  if(!hasHearth(w)||ctx.stage==='child'||ctx.drives.hunger>30||ctx.drives.thirst>30||ctx.drives.energy>45)return;
  for(const b of beliefsByKind(p,['building'])){
    if(b.hh!==p.hhId||!isSolidHome(b.btype)||w.tick-b.seen>DAY)continue;
    const cold=w.weather.temp<10||p.needs.warmth<55;
    if(!cold)continue;
    const travel=eta(ctx,b.x,b.y),base=30+Math.max(0,ctx.drives.warmth)*0.45;
    if(!b.hearth){
      if(beliefsByKind(p,['site']).some(s=>s.hh===p.hhId))continue;
      addOption(ctx,{kind:'plan_site',label:'Fit a hearth in our home',goal:'warm our cold home',need:'warmth',util:base-pen(travel),parts:[['our home needs indoor heat',base],['walking',-pen(travel)]],eta:travel+26,key:`hearth_layout:${b.id}`,targetId:b.id,tag:'build',
        make:()=>{
          if(hearthInstallBlock(w,p,b.id))return null;
          const home=w.byId.get(b.id) as Building;
          return newActivity(w,p,{kind:'plan_site',label:'Laying out an indoor hearth',goal:'warm our cold home',tx:b.x,ty:b.y,spotX:home.doorX+0.5,spotY:home.doorY+0.5,utility:base,minCommit:26,maxTicks:700,data:{type:home.type,sx:home.x,sy:home.y,hh:p.hhId,upgradeOf:home.id,improvement:'hearth'}});
        }});
    }else if(knownColdHearth(ctx,b)){
      const item=hasOffcuts(w)&&fuelAvailable(w,p,'offcuts')>=1?'offcuts':'wood';
      if(fuelAvailable(w,p,item)<1)continue;
      addOption(ctx,{kind:'fuel_fire',label:`Feed our hearth with ${item}`,goal:'warm our cold home',need:'warmth',util:base-pen(travel),parts:[[b.hearth.fuel===null?'check and fuel the hearth in our cold home':`our hearth fuel was last checked at tick ${b.hearth.seen}`,base],['walking',-pen(travel)]],eta:travel+24,key:`hearth_fuel:${b.id}`,targetId:b.id,tag:'fire',
        make:()=>newActivity(w,p,{kind:'fuel_fire',label:'Tending the indoor hearth',goal:'warm our cold home',targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,amount:Math.min(2,fuelAvailable(w,p,item)),utility:base,minCommit:24,maxTicks:700,data:{hearth:true,...(item==='offcuts'?{fuelItem:item}:{})}})});
    }
  }
}

export function validateHearth(w:World):void{
  const sameCost=(a:Items,b:Items)=>!!a&&Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(k=>a[k as keyof Items]===b[k as keyof Items]);
  const state=(h:unknown)=>{
    if(!h||typeof h!=='object'||Array.isArray(h))throw Error('Invalid hearth state');
    const a=h as Building['hearth'];
    if(!runsHearth(w)||!Number.isFinite(a!.fuel)||a!.fuel<0||a!.fuel>HEARTH_FUEL_MAX||!Number.isFinite(a!.heat)||a!.heat<0||a!.heat>HEARTH_HEAT_MAX)throw Error('Invalid hearth state');
  };
  for(const b of w.buildings)if(b.hearth!==undefined){if(!isSolidHome(b.type))throw Error('Invalid hearth home');state(b.hearth);}
  for(const p of w.persons){
    for(const b of Object.values(p.beliefs))if(b.hearth!==undefined){
      const h=b.hearth;
      if(!runsHearth(w)||!h||!Number.isSafeInteger(h.seen)||h.seen<0||h.seen>w.tick||(h.fuel===null)!==(h.heat===null))throw Error('Invalid hearth memory');
      if(h.fuel!==null)state(h);
    }
    for(const a of [p.activity,p.suspended])if(a?.data.hearth!==undefined&&(!isHearthAction(w,a)||a.data.hearth!==true))throw Error('Invalid hearth activity');
  }
  for(const s of w.sites){
    if(s.improvement!==undefined){
      if(!runsHearth(w)||s.improvement!=='hearth'||!s.upgradeOf||!isSolidHome(s.type)||s.workTotal!==HEARTH_WORK||!sameCost(s.required,HEARTH_COST))throw Error('Invalid hearth construction');
    }else if(runsHearth(w)&&s.upgradeOf&&isSolidHome(s.type)){
      // A lost fitting discriminator must not turn its cheap paid site into a
      // full home rebuild. Ordinary upgrades retain their declared recipe.
      const d=BUILD_DEF[s.type];
      if(s.workTotal!==d.work||!sameCost(s.required,d.cost))throw Error('Invalid hearth or home upgrade construction');
    }
  }
}
