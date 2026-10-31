// Ripe personally known household grain can answer hunger; growing it remains discretionary work.
import {runsRulesVersion} from './rulesversion';
import {WORK} from './constants';
import {invRoom} from './economy';
import {recentFailure} from './knowledge';
import {newActivity} from './activities';
import {Scorer,addOption,addBlocked,beliefsByKind,eta,pen,spotNear,dangerAt} from './optutil';
import type {Ctx} from './optutil';
import type {World} from './types';
let enabled=true;
export const hungryHarvestOn=()=>enabled;
export function setHungryHarvest(on:boolean):void{enabled=on;}
export const hasHungryHarvest=(w:World)=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,114);
/** Pure offering. Physical ownership, ripeness, claims and capacity are checked by the unchanged harvest handler. */
export function hungryHarvestOptions(ctx:Ctx):void{
 const {world,p,hh}=ctx;
 if(!hasHungryHarvest(world)||!hh||ctx.stage==='child'||ctx.drives.hunger<=30)return;
 for(const b of beliefsByKind(p,['plot'])){
  if(b.hh!==hh.id||b.state!=='ripe'||b.amount<1)continue;
  const fail=recentFailure(world,p,b.id,220);
  if(fail){addBlocked(ctx,'harvest','Harvest food from the ripe crop',b.id,`tried recently: ${fail.reason}`,'food');continue;}
  if(invRoom(world,p,'grain')<1){addBlocked(ctx,'harvest','Harvest food from the ripe crop',b.id,'no room to carry a grain from the crop','food');continue;}
  const walk=eta(ctx,b.x,b.y),work=Math.round(WORK.harvest/p.skills.farm),sc=new Scorer().add('hungry',ctx.drives.hunger).add('known ripe household grain',4).add('walking',-pen(walk));
  const danger=dangerAt(ctx,b.x,b.y);if(danger>0)sc.add('known danger near the crop',-26*danger);
  addOption(ctx,{kind:'harvest',label:'Harvest food from the ripe crop',goal:'to harvest grain to ease hunger',need:'hunger',util:sc.total,parts:sc.parts,eta:walk+work+10,key:`harvest:${b.id}`,targetId:b.id,tag:'food',
   make:()=>{const spot=spotNear(world,p,b);if(!spot)return null;return newActivity(world,p,{kind:'harvest',label:'Harvesting grain to eat',goal:'to harvest grain to ease hunger',need:'hunger',targetId:b.id,targetType:'plot',tx:b.x,ty:b.y,spotX:spot.x,spotY:spot.y,utility:sc.total,minCommit:60,maxTicks:700});}});
 }
}
