import {newActivity} from './activities';
import {isSolidHome} from './constants';
import {hasStoredWater} from './stored_water_access';
import {Scorer,addOption,beliefsByKind,eta,pen} from './optutil';
import type {Ctx} from './optutil';
export function storedWaterOptions(ctx:Ctx):void{
 const {world,p}=ctx;if(!hasStoredWater(world))return;
 for(const b of beliefsByKind(p,['building'])){
  if(!p.hhId||b.hh!==p.hhId||!isSolidHome(b.btype)||(b.cond??1)<=0||(b.items?.water??0)<1)continue;
  const walk=p.indoors===b.id?0:eta(ctx,b.x,b.y),sc=new Scorer().add('thirsty',ctx.drives.thirst*1.02).add('known water at home',3).add('walking',-pen(walk));
  addOption(ctx,{kind:'drink',label:'Drink water stored at home',goal:'to drink the water I remember in our home store',need:'thirst',util:sc.total,parts:sc.parts,eta:walk+8,key:`drink:store:${b.id}`,targetId:b.id,tag:'water',selectionReason:'personally known household water',
   make:()=>newActivity(world,p,{kind:'drink',label:'Drinking stored water',goal:'to quench thirst from our home store',need:'thirst',targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:b.x,spotY:b.y,utility:sc.total,minCommit:10,maxTicks:600,data:{fromStore:true}})});
 }
}
