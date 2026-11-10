// Rules 162: stone has somewhere to be kept and a way to get there.
// Ordinary origin (review_evidence/stone-haul-20261106): in four 25-day Normal worlds (rules 161) none of 578 stone that left packs went
// into any store. Three of the four never laid out a storehouse (the offer reached 0.1-0.5% of decisions: the site cap and a household's
// own open site stop most people first, the food-shortage and temperament gates the rest), the rules-136 communal stock needs one, and
// the quarry yards that did hold 5-18 cut stone while sites lacked 5-13 were never offered as a place to collect from (the fetch path
// looked only at one's own home and storehouses). Four parts, each removable in the lab:
//   first    a settlement with a solid home and no storehouse lays out its first one: no food or temperament gate, a place of its own
//            among the open sites, and a stronger pull (options_work.ts optPlanBuild, act_build.ts siteConflict);
//   each     (a refinement of `first`) in a world of several separate settlements each one lays out its own first storehouse; without it
//            only the world's first is laid out this way and the other settlements keep the older gates (Large worlds: 1 vs 3-4 storehouses);
//   quarry   a quarry yard one may draw from (a public one, or one's own household's) is a place to collect stone for a site, a promise
//            or a tool (material_stock.ts);
//   restock  people with nothing of their own to do carry cut stone from such a yard to the public storehouse, which now aims at 16 stone
//            (communal_stock.ts);
//   cue      a storehouse known to hold the stone a stone-using building costs makes that building a little more attractive to plan
//            (production.ts facilityWants, options_work.ts optPlanBuild).
// Stored goods stay free for anyone to take; nothing is created, only moved.
import {DAY} from './constants';
import {rulesOf,within} from './rules';
import {runsRulesVersion} from './rulesversion';
import {beliefsByKind} from './optutil';
import type {Ctx} from './optutil';
import {isSolidHome} from './constants';
import type {Belief,World} from './types';

const on={first:true,each:true,quarry:true,restock:true,cue:true};
export type SharedStonePart=keyof typeof on;
export const sharedStonePartOn=(part:SharedStonePart):boolean=>on[part];
export function setSharedStone(enabled:boolean,part?:SharedStonePart):void{
 if(part)on[part]=enabled;else for(const k of Object.keys(on) as SharedStonePart[])on[k]=enabled;
}
const rich162=(w:World):boolean=>w.settings.dynamics==='rich'&&runsRulesVersion(w,162);
export const hasFirstStorehouse=(w:World):boolean=>on.first&&rich162(w);
export const hasQuarryStock=(w:World):boolean=>on.quarry&&rich162(w);
export const hasStoneRestock=(w:World):boolean=>on.restock&&rich162(w);
export const hasStoredStoneCue=(w:World):boolean=>on.cue&&rich162(w);

/** The stone a public storehouse aims to hold (rules 136 aimed at 8, which is two huts' worth and a kiln short). */
export const STONE_TARGET=16;
/** Signal added to a stone-using workshop want, and utility added to a stone-using home building, when a known store holds the stone. */
export const STORED_STONE_SIGNAL=0.15;
export const STORED_STONE_UTILITY=5;

/** No storehouse stands or is being built within the settlement radius of (x, y). Reads the world as the existing storehouse gate does. */
export function noStorehouseNear(w:World,x:number,y:number):boolean{
 const radius=rulesOf(w).facilityRadius;
 const near=(bx:number,by:number)=>radius===Infinity||within(radius,x,y,bx,by);
 return !w.buildings.some(b=>b.type==='storehouse'&&near(b.x+b.w/2,b.y+b.h/2))&&!w.sites.some(s=>s.type==='storehouse'&&near(s.x+s.w/2,s.y+s.h/2));
}

/**
 * The first storehouse's own test. With the `each` part, none stands or is being laid out within the settlement radius of (x, y), so every separate
 * settlement of a Large world gets one (the same as `noStorehouseNear`); without it, none stands or is being laid out anywhere in the world.
 * An ordinary Normal world has one settlement-wide radius, so the two agree there.
 */
export function noFirstStorehouse(w:World,x:number,y:number):boolean{
 return on.each?noStorehouseNear(w,x,y):!w.buildings.some(b=>b.type==='storehouse')&&!w.sites.some(s=>s.type==='storehouse');
}

/** Does a storehouse this person knows of, seen within a day, hold at least `stone`? A belief, never a look at the real store. */
export function knownStoreHoldsStone(ctx:Ctx,stone:number):boolean{
 if(stone<=0)return false;
 const {p,world}=ctx;
 for(const id of p.bykind.building??[]){
  const b=p.beliefs[id];
  if(b?.kind==='building'&&b.btype==='storehouse'&&b.hh===0&&(b.cond??0)>0&&world.tick-b.seen<=DAY&&(b.items?.stone??0)>=stone)return true;
 }
 return false;
}

/**
 * Rules 192 (gap G32, end-to-end trace links 2, 9, 18, 21 and 24): the first storehouse is wanted from what the person knows, not from the world.
 * `firstStorehouseWanted` read `world.buildings` for the solid home and `noFirstStorehouse` read the world's buildings and sites for the
 * store, so eight people in ordinary aspen chose "Lay out a storehouse" within a tenth of a day of a hut being finished whether or not they had
 * seen it, and the want reopened for everyone the moment a site was cancelled, whether or not they knew. At 192 the cue is a solid home the
 * person believes stands in the settlement and no storehouse, standing or laid out, that they believe in; a site they still believe in that
 * is in fact gone holds them back until they see the spot again (perception.ts refreshBeliefs), and a site they have not seen lets them try,
 * which the world refuses at the spot ("a storehouse is already being built", act_build.ts siteConflict). The reason names the home.
 * Rules 191 and earlier, authored worlds and `setKnownFirstStorehouse(false)` read the world as before.
 */
let knownFirst=true;
export const knownFirstStorehouseOn=():boolean=>knownFirst;
export function setKnownFirstStorehouse(on:boolean):void{knownFirst=on;}
export const hasKnownFirstStorehouse=(w:World):boolean=>knownFirst&&hasFirstStorehouse(w)&&runsRulesVersion(w,192);

/** A solid home the person believes stands within the settlement radius of (x, y), the nearest first; nothing is read from the world. */
export function knownSolidHomeNear(ctx:Ctx,x:number,y:number):Belief|undefined{
 const radius=rulesOf(ctx.world).facilityRadius;
 let best:Belief|undefined,bestD=Infinity;
 for(const b of beliefsByKind(ctx.p,['building'])){
  if(!isSolidHome(b.btype)||(b.cond??1)<=0)continue;
  if(radius!==Infinity&&!within(radius,x,y,b.x,b.y))continue;
  const d=(b.x-x)*(b.x-x)+(b.y-y)*(b.y-y);
  if(d<bestD){best=b;bestD=d;}
 }
 return best;
}

/** The person believes in no storehouse, standing or laid out, within the settlement radius of (x, y) (anywhere, without the `each` part). */
export function noKnownStorehouseNear(ctx:Ctx,x:number,y:number):boolean{
 const radius=rulesOf(ctx.world).facilityRadius;
 for(const b of beliefsByKind(ctx.p,['building','site'])){
  if(b.btype!=='storehouse'||(b.kind==='building'&&(b.cond??1)<=0))continue;
  if(on.each&&radius!==Infinity&&!within(radius,x,y,b.x,b.y))continue;
  return false;
 }
 return true;
}
