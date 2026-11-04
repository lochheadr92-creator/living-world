// Rules 136: the useful stockyard behaviour, using existing public storehouses.
import {newActivity} from './activities';
import {BUILD_DEF,DAY,WEIGHT} from './constants';
import {weightOf} from './economy';
import {recentFailure} from './knowledge';
import {materialNeeds,gatherMaterial,nightMult,weatherMult} from './options_work';
import {Scorer,addOption,beliefsByKind,eta,pen,spotNear} from './optutil';
import type {Ctx} from './optutil';
import {reservedFor} from './reserved_goods';
import {runsRulesVersion} from './rulesversion';
import type {Activity,ItemKind,Items,Person,World} from './types';
const TARGET={wood:12,stone:8};
const KEEP={wood:2,stone:1};
type Raw=keyof typeof TARGET;
export const hasCommunalStock=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,136);
export function communalSpare(w:World,p:Person,k:ItemKind):number{
 if(!(Object.hasOwn(TARGET,k))||p.errand?.item===k)return 0;
 return Math.max(0,Math.floor((p.inv[k]??0)-KEEP[k as Raw]-reservedFor(w,p,k)));
}
export function communalRoom(w:World,id:number,k:ItemKind):number{
 const b=w.byId.get(id);return Object.hasOwn(TARGET,k)&&b?.ent==='building'?Math.max(0,TARGET[k as Raw]-(b.store.items[k]??0)):0;
}
export function communalStockBlock(w:World,p:Person,a:Activity):string|null{
 if(!a.data.communalStock)return null;
 const b=w.byId.get(a.targetId);
 if(!hasCommunalStock(w)||b?.ent!=='building'||b.type!=='storehouse'||b.hhId!==0||b.condition<=0)return 'the communal store is no longer available';
 if(p.indoors||Math.hypot(p.x-b.doorX-.5,p.y-b.doorY-.5)>1.5)return 'reach the communal store doorway first';
 return null;
}
export function communalStockOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;
 if(!hasCommunalStock(w)||ctx.stage==='child'||ctx.night||ctx.drives.hunger>25||ctx.drives.thirst>25||ctx.drives.energy>40)return;
 const stores=beliefsByKind(p,['building']).filter(b=>b.btype==='storehouse'&&b.hh===0&&(b.cond??0)>0&&w.tick-b.seen<=DAY&&!recentFailure(w,p,b.id,320)).sort((a,b)=>eta(ctx,a.x,a.y)-eta(ctx,b.x,b.y)||a.id-b.id);
 const b=stores[0];if(!b)return;
 const needs=materialNeeds(ctx),items:Items={};let room=BUILD_DEF.storehouse.cap-weightOf(b.items??{}),total=0;
 for(const k of ['wood','stone'] as const){
  const needed=needs.filter(n=>n.item===k).reduce((s,n)=>s+n.n,0);
  const n=Math.max(0,Math.min(communalSpare(w,p,k)-needed,TARGET[k]-(b.items?.[k]??0),Math.floor(room/WEIGHT[k])));
  if(n>=1){items[k]=n;room-=n*WEIGHT[k];total+=n;}
 }
 if(total){
  const walk=eta(ctx,b.x,b.y),sc=new Scorer().add('spare materials for whoever works next',20+Math.min(total,8)+4*p.traits.generosity).add('walking',-pen(walk)),util=sc.total*nightMult(ctx)*weatherMult(ctx);
  addOption(ctx,{kind:'deposit',label:'Stack spare materials at the communal store',goal:'leave real building and repair supplies for others',need:null,util,parts:sc.parts,eta:walk+20,key:`communal_stock:${b.id}`,targetId:b.id,tag:'store',make:()=>{
   const spot=spotNear(w,p,b);if(!spot)return null;
   return newActivity(w,p,{kind:'deposit',label:'Stacking communal materials',goal:'supplies for the next builder',targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:spot.x,spotY:spot.y,utility:util,minCommit:30,maxTicks:600,data:{items,communalStock:true}});
  }});return;
 }
 // Personal undertakings get first use of gathering time. Never shuttle stock out of a store to refill it.
 if(needs.length||p.intentions.some(i=>i.status==='active')||p.commitments.some(c=>c.status==='active')||p.errand)return;
 const pick=(['wood','stone'] as const).filter(k=>(b.items?.[k]??0)<TARGET[k]/2&&room>=WEIGHT[k]*2&&communalSpare(w,p,k)<1).sort((a,c)=>(b.items?.[a]??0)/TARGET[a]-(b.items?.[c]??0)/TARGET[c])[0];
 if(!pick)return;
 const scratch:Ctx={...ctx,options:[],blocked:[]};
 gatherMaterial(scratch,pick,Math.min(4,TARGET[pick]-(b.items?.[pick]??0)),19+4*p.traits.diligence,`to restock the communal store with ${pick}`,'store');
 for(const o of scratch.options)if(o.kind==='gather'&&!ctx.options.some(x=>x.key===o.key)){
  const make=o.make;if(make)o.make=()=>{const a=make();if(a)a.data.restockFor=b.id;return a;};ctx.options.push(o);
 }
}
