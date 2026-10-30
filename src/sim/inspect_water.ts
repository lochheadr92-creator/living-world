import { hasWaterBudget, waterBodyAt, waterSign } from './hydrology';
import type { WaterBody } from './hydrology';
import type { EntityView } from './inspect';
import type { World } from './types';
import { DAY } from './constants';

// View-only identifiers: water bodies are not physical entities or inventory containers.
const BASE=2_000_000;
export const waterViewId=(b:WaterBody):number=>-BASE-b.id;
export function selectedWater(w:World,id:number):WaterBody|undefined {
  if(!hasWaterBudget(w)||!Number.isInteger(id)||id>-BASE)return;
  const tile=-id-BASE;
  if(tile<0||tile>=w.W*w.H)return;
  const b=waterBodyAt(w,tile%w.W,Math.floor(tile/w.W));return b?.id===tile?b:undefined;
}
export function describeWater(w:World,id:number):EntityView|null {
  const b=selectedWater(w,id);if(!b)return null;
  const tile=b.tiles[Math.floor(b.tiles.length/2)],sign=waterSign(b);
  return {kind:'water',id,title:sign==='dry'?'Dry water source':sign==='low'?'Low water source':'Natural water source',subtitle:'Current source condition',position:{x:tile%w.W+0.5,y:Math.floor(tile/w.W)+0.5},items:[],
    rows:[['Available',`${b.amount} water units`],['Capacity',`${b.capacity} water units`],['Actual draws',`${b.drawn} units`],['Rain captured',`${b.replenished} units`],['Evaporated',`${b.evaporated} units`],...(b.lastDraw===undefined?[]:[['Last draw',`${((w.tick-b.lastDraw)/DAY).toFixed(1)} days ago`] as [string,string]])],
    bars:[{label:'Available water',value:b.amount,max:b.capacity,tone:sign==='wet'?'ok':'warn'}],
    notes:['Drinking and carrying water draw from this stock. Rain can refill it; evaporation and use reduce it. Recovery has no guaranteed date.','The shore terrain remains in place when the source dries. People act on their own dated observations, not this current-world display.']};
}
