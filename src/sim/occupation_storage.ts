import { newActivity } from './activities';
import { BUILD_DEF, isHomeType } from './constants';
import { roomFor } from './economy';
import { errandCarries } from './errand_load';
import { recentFailure } from './knowledge';
import { hasOccupations, OUTPUTS } from './occupation';
import { addOption, beliefsByKind, eta, pen, spotNear, type Ctx } from './optutil';
import { reservedFor } from './reserved_goods';
import type { BuildingType, ItemKind, Person, World } from './types';

// Food, seed, equipment and livestock supplies have dedicated destinations and transfer rules.
// These bulk workshop outputs otherwise lack a general way to clear the specialist's pack.
const bulk = new Set<ItemKind>(['wool','hide','fat','leather','fibre','ore','iron','bricks','charcoal','handles','planks','offcuts','clay']);
function usableStore(type: string | undefined, hh: number | undefined, p: Person) {
  return type==='storehouse' && (hh===0 || hh===p.hhId) || !!p.hhId && hh===p.hhId && isHomeType(type);
}
export function spareOutput(w: World,p: Person,k: ItemKind) {
  const title=p.occupation?.title;
  if (!hasOccupations(w) || !title || !bulk.has(k) || !(OUTPUTS[title] as readonly ItemKind[]).includes(k) || errandCarries(w,p,k)) return 0;
  return Math.max(0,(p.inv[k]??0)-reservedFor(w,p,k)-1);
}
export function depositableOutput(w: World,p: Person,id: number,k: ItemKind) {
  const dest=w.byId.get(id);
  if (dest?.ent!=='building' || dest.condition<=0 || !usableStore(dest.type,dest.hhId,p)) return 0;
  return Math.min(spareOutput(w,p,k),roomFor(dest.store.items,dest.store.cap,k));
}
export function occupationStoreOption(ctx: Ctx) {
  const {world:w,p}=ctx;
  if (!p.occupation?.title || !hasOccupations(w) || ctx.critical || ctx.dangers.length) return;
  const goods=(OUTPUTS[p.occupation.title] as readonly ItemKind[]).filter(k=>spareOutput(w,p,k)>0);
  if (!goods.length) return;
  for (const b of beliefsByKind(p,['building'])) {
    if (!b.btype || !usableStore(b.btype,b.hh,p) || (b.cond??0)<=0 || recentFailure(w,p,b.id,320)) continue;
    const def=BUILD_DEF[b.btype as BuildingType];
    const walk=eta(ctx,b.x,b.y);
    for (const k of goods) {
      const n=Math.min(spareOutput(w,p,k),roomFor(b.items??{},def.cap,k));
      if (n<1) continue;
      const cargo={[k]:n},label='Store spare '+k+' in the '+def.label;
      const util=36+Math.min(n,6)-pen(walk);
      addOption(ctx,{kind:'deposit',need:null,key:'occupation_store:'+b.id+':'+k,label,goal:label,tag:'store',targetId:b.id,
        util,eta:walk+20,parts:[['spare output',36+Math.min(n,6)],['walking',-pen(walk)]],cargo,
        make:()=>{
          const at=spotNear(w,p,b);
          return at ? newActivity(w,p,{kind:'deposit',label,goal:label,targetId:b.id,targetType:'building',tx:b.x,ty:b.y,spotX:at.x,spotY:at.y,utility:util,minCommit:30,maxTicks:900,data:{items:cargo,occupationStore:true}}) : null;
        }});
    }
  }
}

