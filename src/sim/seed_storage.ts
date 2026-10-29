// Rules 58: keep a harvest's spare seed in a remembered household home when it blocks
// a wanted raw-material trip. Retrieval remains the existing physical farming option.
import {newActivity} from './activities';
import {BUILD_DEF,WEIGHT,isHomeType} from './constants';
import {invRoom,weightOf} from './economy';
import {plannedFor} from './intent';
import {recentFailure} from './knowledge';
import {Scorer,addOption,beliefsByKind,dangerAt,eta,pen,spotNear,traitMods} from './optutil';
import type {Ctx} from './optutil';
import {carryCap} from './people';
import {runsRulesVersion} from './rulesversion';
import type {BuildingType,ItemKind,Person,World} from './types';

let enabled=true;
export const seedStorageOn=():boolean=>enabled;
export function setSeedStorage(on:boolean):void{enabled=on;}
export const hasSeedStorage=(w:World):boolean=>enabled&&w.settings.dynamics==='rich'&&runsRulesVersion(w,58);

/** Keep the existing three-seed withdrawal batch, or one per known household plot,
 * whichever is larger, plus separate promises/plans. No global plot inventory. */
export function spareSeed(p:Person):number{
 if(p.errand?.item==='seeds')return 0;
 const planting=Math.max(3,beliefsByKind(p,['plot']).filter(b=>b.hh===p.hhId).length);
 const promised=p.commitments.reduce((n,c)=>n+(c.status==='active'&&c.item==='seeds'?Math.max(0,c.amount-(c.delivered??0)):0),0);
 return Math.max(0,Math.floor((p.inv.seeds??0)-planting-promised-plannedFor(p,'seeds')));
}

/** Called only after a wanted raw trip has a personally usable source. Derivation is pure. */
export function seedStorageOption(ctx:Ctx,item:ItemKind,base:number,why:string,mult:number):void{
 const {world,p}=ctx;
 if(!hasSeedStorage(world)||!p.hhId||ctx.stage==='child'||invRoom(world,p,item)>=1)return;
 const spare=spareSeed(p);if(spare<1)return;
 const needed=WEIGHT[item]-(carryCap(world,p)-weightOf(p.inv));
 const homes=beliefsByKind(p,['building']).filter(b=>b.hh===p.hhId&&isHomeType(b.btype)&&!recentFailure(world,p,b.id,300))
  .map(b=>({b,n:Math.min(spare,Math.max(0,Math.floor((BUILD_DEF[b.btype as BuildingType].cap-weightOf(b.items??{}))/WEIGHT.seeds))),distance:eta(ctx,b.x,b.y)+40*dangerAt(ctx,b.x,b.y)}))
  .filter(x=>x.n*WEIGHT.seeds+1e-9>=needed).sort((a,b)=>a.distance-b.distance||a.b.id-b.b.id);
 const chosen=homes[0];if(!chosen)return;
 const {b,n}=chosen,key=`seed_stash:${b.id}`;if(ctx.options.some(o=>o.key===key))return;
 const walk=eta(ctx,b.x,b.y),sc=new Scorer().add('spare seed fills my pack',base*0.85).add('walking',-pen(walk));
 const danger=dangerAt(ctx,b.x,b.y);if(danger>0)sc.add('wolf nearby',-22*danger*traitMods(p).caution);
 if(sc.total<8)return;
 const util=sc.total*mult;
 addOption(ctx,{kind:'deposit',label:'Keep spare seed at home',goal:`to free my hands ${why}`,need:null,util,parts:sc.parts,eta:walk+20,key,targetId:b.id,tag:'store',
  make:()=>{const spot=spotNear(world,p,b);if(!spot)return null;
   return newActivity(world,p,{kind:'deposit',label:`Taking ${n} spare seeds home`,goal:`to free my hands ${why}`,targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:spot.x,spotY:spot.y,utility:util,minCommit:30,maxTicks:600,
    data:{items:{seeds:n},leftAt:'the home store',seedStash:true,seedOwner:p.hhId}});
  }});
}
