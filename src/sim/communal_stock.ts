// Rules 136: the useful stockyard behaviour, using existing public storehouses.
import {newActivity} from './activities';
import {BUILD_DEF,DAY,WEIGHT} from './constants';
import {weightOf} from './economy';
import {recentFailure} from './knowledge';
import {materialNeeds,gatherMaterial,nightMult,weatherMult} from './options_work';
import {collectMaterialStock} from './production';
import {rememberedMaterialStores} from './material_stock';
import {STONE_TARGET,hasStoneRestock} from './shared_stone';
import {Scorer,addOption,beliefsByKind,eta,pen,spotNear} from './optutil';
import type {Ctx} from './optutil';
import {reservedFor} from './reserved_goods';
import {runsRulesVersion} from './rulesversion';
import type {Activity,ItemKind,Items,Person,World} from './types';
const TARGET={wood:12,stone:8};
const KEEP={wood:2,stone:1};
type Raw=keyof typeof TARGET;
/** What a public store aims to hold of a raw material; from rules 162 the stone aim is 16 (hut, storehouse and kiln together are 20). */
const aim=(w:World,k:Raw):number=>k==='stone'&&hasStoneRestock(w)?STONE_TARGET:TARGET[k];
export const hasCommunalStock=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,136);
export function communalSpare(w:World,p:Person,k:ItemKind):number{
 if(!(Object.hasOwn(TARGET,k))||p.errand?.item===k)return 0;
 return Math.max(0,Math.floor((p.inv[k]??0)-KEEP[k as Raw]-reservedFor(w,p,k)));
}
export function communalRoom(w:World,id:number,k:ItemKind):number{
 const b=w.byId.get(id);return Object.hasOwn(TARGET,k)&&b?.ent==='building'?Math.max(0,aim(w,k as Raw)-(b.store.items[k]??0)):0;
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
  const n=Math.max(0,Math.min(communalSpare(w,p,k)-needed,aim(w,k)-(b.items?.[k]??0),Math.floor(room/WEIGHT[k])));
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
 // Rules 162: for stone only a need for stone itself (a site, a promise, a tool) holds a person back. Every awake, fed person has some small need for
 // wood (a fire, a roof patch, a handle), so the old any-need gate was never open (review_evidence/stone-haul-20261106, restock-gate); wood is unchanged.
 const stoneRestock=hasStoneRestock(w);
 if((!stoneRestock&&needs.length>0)||p.intentions.some(i=>i.status==='active')||p.commitments.some(c=>c.status==='active')||p.errand)return;
 const busy=(k:Raw):boolean=>stoneRestock&&k==='stone'?needs.some(n=>n.item==='stone'):needs.length>0;
 const lacking=(['wood','stone'] as const).filter(k=>!busy(k)&&(b.items?.[k]??0)<aim(w,k)/2&&room>=WEIGHT[k]*2&&communalSpare(w,p,k)<1);
 // rules 162: cut stone already stacked at a quarry yard one may draw from is carried over before rocks are broken for it
 const yards=hasStoneRestock(w)&&lacking.includes('stone')?rememberedMaterialStores(w,p,'stone').filter(y=>y.btype==='quarry').sort((a,c)=>eta(ctx,a.x,a.y)-eta(ctx,c.x,c.y)||a.id-c.id):[];
 const pick=yards.length?'stone':lacking.sort((a,c)=>(b.items?.[a]??0)/aim(w,a)-(b.items?.[c]??0)/aim(w,c))[0];
 if(!pick)return;
 const scratch:Ctx={...ctx,options:[],blocked:[]};
 const want=Math.min(4,aim(w,pick)-(b.items?.[pick]??0)),base=19+4*p.traits.diligence,why=`to restock the communal store with ${pick}`;
 const yardKeys=new Set<string>();
 if(yards.length){collectMaterialStock(scratch,yards[0],'stone',want,base,why,'store');for(const o of scratch.options)yardKeys.add(o.key);}
 gatherMaterial(scratch,pick,want,base,why,'store');
 for(const o of scratch.options)if((o.kind==='gather'||yardKeys.has(o.key))&&!ctx.options.some(x=>x.key===o.key)){
  const make=o.make;if(make)o.make=()=>{const a=make();if(a)a.data.restockFor=b.id;return a;};ctx.options.push(o);
 }
}
