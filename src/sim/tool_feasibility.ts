import {TOOL_RECIPE,WEIGHT} from './constants';
import {carryCap} from './people';
import {hasLivedLife} from './lived_life';
import type {Person,ToolKind,World} from './types';
/** Hand crafting consumes all ingredients from the pack, even when acquired in stages.
 * Promised ingredients or a shelf cannot increase that capacity. A carried basket can. */
export function toolCapacityBlock(w:World,p:Person,kind:ToolKind):string|null{
 if(!hasLivedLife(w))return null;
 const r=TOOL_RECIPE[kind];if(!r)return null;
 const load=r.wood*WEIGHT.wood+r.stone*WEIGHT.stone+((p.inv.basket??0)>0?WEIGHT.basket:0);
 return load>carryCap(w,p)?`cannot carry the ${kind}'s ingredients together (${load} weight, capacity ${carryCap(w,p)}); need more carrying capacity before trying again`:null;
}
