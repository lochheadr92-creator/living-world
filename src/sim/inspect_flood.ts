import { floodAt, floodPlaceId } from './flood';
import type { EntityView } from './inspect';
import type { World } from './types';
import { DAY } from './constants';
export function selectedFlood(w:World,id:number):{x:number;y:number;sign:'flooded'|'recovering'}|undefined {
 const tile=-id-3_000_000;if(!Number.isInteger(tile)||tile<0||tile>=w.W*w.H)return;
 const x=tile%w.W,y=Math.floor(tile/w.W),sign=floodAt(w,x,y);return sign?{x,y,sign}:undefined;
}
export function floodViewAt(w:World,x:number,y:number):number {
 return floodAt(w,x,y)?floodPlaceId(Math.floor(y)*w.W+Math.floor(x)):0;
}
export function describeFlood(w:World,id:number):EntityView|null {
 const at=selectedFlood(w,id),f=w.flood;if(!at||!f)return null;
 return {kind:'flood',id,title:at.sign==='flooded'?'Flooded ground':'Recovering shore',subtitle:'Current ground condition',position:{x:at.x+0.5,y:at.y+0.5},items:[],bars:[],
  rows:[['Cause','Storm over a supplied natural shore'],['Onset',`Tick ${f.since}`],['Affected ground',`${f.tiles.length} tiles`],['Access',at.sign==='flooded'?'Unsafe to enter; people can retreat':'Slow on foot; carts wait for firm ground'],['Natural recovery',`${Math.max(0,(f.recoveryUntil-w.tick)/DAY).toFixed(2)} days remaining in this model`]],
  notes:['Flooded ground persists after the storm. Waiting costs time; goods and people stay where they physically are.','This is current-world information. People use their own dated close observations, without knowing the recovery deadline. This footprint is not additional extractable water.']};
}
