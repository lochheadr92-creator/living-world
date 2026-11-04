// Rules 137: take a living cutting, carry it, plant it, then wait for ordinary tree growth.
import {faceToward,newActivity,registerHandler} from './activities';
import type {WorkResult} from './activities';
import {DAY,isHomeType} from './constants';
import {addItem,consume,invRoom,ledgerConsume,ledgerCreate} from './economy';
import {harvestPressure} from './ecology';
import {addLog} from './events';
import {observe,recentFailure,noteFailure} from './knowledge';
import {Scorer,addOption,beliefsByKind,eta,pen,spotNear} from './optutil';
import type {Ctx} from './optutil';
import {isFreeLand,isWalkable} from './registry';
import {reservedFor} from './reserved_goods';
import {runsRulesVersion} from './rulesversion';
import {makeSource} from './sources';
import {stageOf} from './people';
import type {Activity,Items,Person,World} from './types';
import {T} from './types';
export const hasForestry=(w:World)=>w.settings.dynamics==='rich'&&runsRulesVersion(w,137);
export const CUT_WORK=80,PLANT_TREE_WORK=150;
export const plantingFailure=(w:World,x:number,y:number)=>-300000-y*w.W-x;
/** Physical footprint check, used only at a currently visible candidate or during work. */
export function treeGround(w:World,x:number,y:number):boolean{
 if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||!isFreeLand(w,x,y))return false;
 const i=y*w.W+x;if(![T.GRASS,T.FOREST].includes(w.terrain[i] as 3|4)||w.waterDist[i]<2||w.roads?.[i]||w.wear[i]>.2)return false;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!isFreeLand(w,x+dx,y+dy))return false;
 if([...w.buildings,...w.sites].some(b=>x>=b.x-2&&x<=b.x+b.w+1&&y>=b.y-2&&y<=b.y+b.h+2))return false;
 if(w.plots.some(p=>Math.hypot(p.x-x,p.y-y)<3))return false;
 return !w.persons.some(p=>p.alive&&Math.floor(p.x)===x&&Math.floor(p.y)===y);
}
function treeProblem(w:World,p:Person,a:Activity):string|null{
 if(!hasForestry(w)||stageOf(w,p)==='child'||p.indoors)return 'tree work needs an adult outdoors';
 if(a.data.op==='cut'){
  const t=w.byId.get(a.targetId);
  if(t?.ent!=='source'||t.type!=='tree'||t.growth<.7||t.amount-t.reserved<2)return 'no unclaimed living branch on this tree';
  if(Math.hypot(p.x-t.x-.5,p.y-t.y-.5)>2)return 'reach the living tree first';
  if(invRoom(w,p,'cutting')<1)return 'no room for the cutting';
 }else if(a.data.op==='plant'){
  const h=w.byId.get(a.targetId),x=a.data.px,y=a.data.py;
  if(h?.ent!=='building'||!isHomeType(h.type)||h.hhId!==p.hhId||!p.hhId||h.condition<=0)return 'the home for this planting is no longer ours';
  if(Math.hypot(x-(h.x+h.w/2),y-(h.y+h.h/2))>12)return 'planting too far from our home';
  if(Math.hypot(p.x-x-.5,p.y-y-.5)>2)return 'reach the planting ground first';
  if(!treeGround(w,x,y))return 'planting ground is occupied or obstructs access';
  if((p.inv.cutting??0)-reservedFor(w,p,'cutting')<1)return 'no unpromised living cutting in hand';
  if(w.sources.filter(s=>s.type==='tree'&&s.growth<1&&Math.hypot(s.x-x,s.y-y)<10).length>=6)return 'enough young trees are growing nearby';
  if((w.stats.trees??0)>=(w.stats.treeCap??0)+24)return 'the landscape has enough trees for now';
 }else return 'unknown tree work';
 return null;
}
registerHandler('tree_work',{
 availability:.3,pose:a=>a.data.op==='cut'?'chop':'plant',
 begin(w,p,a){const why=treeProblem(w,p,a);if(why)return why;a.duration=a.data.op==='cut'?CUT_WORK:PLANT_TREE_WORK;},
 work(w,p,a):WorkResult{
  const why=treeProblem(w,p,a);if(why)return `fail:${why}`;
  faceToward(p,a.tx,a.ty);if(++a.progress<a.duration)return 'continue';
  if(a.data.op==='cut'){
   const t=w.byId.get(a.targetId)!;if(t.ent!=='source')return 'fail:tree gone';
   t.amount--;harvestPressure(w,t,1);ledgerConsume(w,'wood',1,'living branch selected for propagation');addItem(p.inv,'cutting',1);ledgerCreate(w,'cutting',1,'living branch from tree #'+t.id);t.lastTaker=p.id;t.lastTakeTick=w.tick;observe(w,p,t);addLog(w,p,'work','Took a living cutting from the tree to plant near home.');
  }else{
   consume(w,p.inv,'cutting',1,'planting a young tree');const t=makeSource(w,'tree',a.data.px,a.data.py,0,.02);t.planted={by:p.id,at:w.tick,home:a.targetId};observe(w,p,t);a.data.plantedId=t.id;addLog(w,p,'work','Planted a cutting; its wood must grow before it can be harvested.');
  }
  return 'done';
 },
 onEnd(w,p,a,result,detail){if(result==='failed')noteFailure(w,p,a.data.op==='plant'?plantingFailure(w,a.data.px,a.data.py):a.targetId,detail);},
});
export function forestryOptions(ctx:Ctx):void{
 const {world:w,p}=ctx;if(!hasForestry(w)||ctx.stage==='child'||ctx.night||ctx.drives.hunger>25||ctx.drives.thirst>25||ctx.drives.energy>35)return;
 const home=beliefsByKind(p,['building']).find(b=>b.hh===p.hhId&&isHomeType(b.btype)&&(b.cond??0)>0);if(!home)return;
 const trees=beliefsByKind(p,['tree']);if(trees.filter(b=>Math.hypot(b.x-home.x,b.y-home.y)<12).length>=8)return;
 if((p.inv.cutting??0)-reservedFor(w,p,'cutting')>=1){
  // Keep the paid trip's planting site as the worker approaches it; choosing a new
  // nearby tile at every review would repeatedly abandon the same cutting.
  const held=p.activity?.kind==='tree_work'?p.activity:p.suspended?.kind==='tree_work'?p.suspended:null;
  let spot:{x:number;y:number}|undefined=held?.data.op==='plant'&&held.targetId===home.id&&treeGround(w,held.data.px,held.data.py)?{x:held.data.px,y:held.data.py}:undefined;
  for(let r=3;r<=7&&!spot;r++)for(let dy=-r;dy<=r&&!spot;dy++)for(let dx=-r;dx<=r;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=Math.floor(p.x)+dx,y=Math.floor(p.y)+dy;
   // Only currently nearby open ground: no distant inventory or unseen land-use scan.
   if(Math.hypot(x-p.x,y-p.y)>8||Math.hypot(x-home.x,y-home.y)>12||!p.explored[y*w.W+x]||recentFailure(w,p,plantingFailure(w,x,y),DAY)||!treeGround(w,x,y)||!isWalkable(w,x,y+1))continue;
   spot={x,y};break;
  }
  if(!spot)return;const {x,y}=spot,walk=eta(ctx,x+.5,y+1.5),sc=new Scorer().add('plant the living cutting before it withers',31).add('walking',-pen(walk));
  addOption(ctx,{kind:'tree_work',label:'Plant a young tree near home',goal:'grow future wood close to home',need:null,util:sc.total,parts:sc.parts,eta:walk+PLANT_TREE_WORK,key:`plant_tree:${x}:${y}`,targetId:home.id,tag:'work',make:()=>newActivity(w,p,{kind:'tree_work',label:'Planting a young tree',goal:'grow future wood close to home',targetId:home.id,targetType:'building',tx:x+.5,ty:y+.5,spotX:x+.5,spotY:y+1.5,utility:sc.total,minCommit:40,maxTicks:800,data:{op:'plant',px:x,py:y}})});
 }else if((p.inv.cutting??0)===0){
  const b=trees.filter(b=>b.amount>=2&&w.tick-b.seen<=DAY&&!recentFailure(w,p,b.id,DAY)).sort((a,b)=>eta(ctx,a.x,a.y)-eta(ctx,b.x,b.y))[0];if(!b||invRoom(w,p,'cutting')<1)return;
  const walk=eta(ctx,b.x,b.y),sc=new Scorer().add('few remembered trees near home',22+5*p.traits.diligence).add('walking',-pen(walk));
  addOption(ctx,{kind:'tree_work',label:'Take a living tree cutting',goal:'replant trees near home',need:null,util:sc.total,parts:sc.parts,eta:walk+CUT_WORK,key:`tree_cutting:${b.id}`,targetId:b.id,tag:'work',make:()=>{const spot=spotNear(w,p,b);return spot?newActivity(w,p,{kind:'tree_work',label:'Taking a living tree cutting',goal:'replant trees near home',targetId:b.id,targetType:'source',tx:b.x,ty:b.y,spotX:spot.x,spotY:spot.y,utility:sc.total,minCommit:30,maxTicks:800,data:{op:'cut'}}):null;}});
 }
}
export function validateForestry(w:World):void{
 const check=(items:Items|undefined)=>{if(items?.cutting!==undefined&&(!hasForestry(w)||!Number.isSafeInteger(items.cutting)||items.cutting<0))throw Error('Invalid living cutting');};
 for(const p of w.persons){check(p.inv);for(const b of Object.values(p.beliefs)){check(b.items);check(b.ops?.inputs);check(b.ops?.output);check(b.ops?.yields);}for(const a of [p.activity,p.suspended])if(a){check(a.data.items);if(a.kind==='tree_work'){
  if(!hasForestry(w)||!['cut','plant'].includes(a.data.op)||!Number.isSafeInteger(a.targetId)||a.targetId<=0)throw Error('Invalid tree work');
  if(a.data.op==='plant'&&(!Number.isSafeInteger(a.data.px)||!Number.isSafeInteger(a.data.py)||a.data.px<0||a.data.py<0||a.data.px>=w.W||a.data.py>=w.H))throw Error('Invalid tree planting');
  if(a.phase==='work'&&(a.duration!==(a.data.op==='cut'?CUT_WORK:PLANT_TREE_WORK)||!Number.isFinite(a.progress)||a.progress<0||a.progress>=a.duration))throw Error('Invalid tree work progress');
 }}}
 for(const b of w.buildings){check(b.store.items);check(b.ops?.job?.held);check(b.ops?.produced);check(b.ops?.consumed);check(b.ops?.wasted);}for(const b of w.piles)check(b.items);for(const c of w.carts)check(c.load);for(const s of w.sites){check(s.delivered);check(s.used);}for(const m of w.meals)check(m.table);for(const k of ['initial','created','consumed','spoiled'] as const)check(w.ledger[k]);
 for(const t of w.sources)if(t.planted){const p=t.planted;if(!hasForestry(w)||t.type!=='tree'||!Number.isSafeInteger(p.by)||p.by<=0||!Number.isSafeInteger(p.home)||p.home<=0||!Number.isSafeInteger(p.at)||p.at<0||p.at>w.tick)throw Error('Invalid planted tree');}
}
