import { addItem, consume, ledgerCreate, weightOf } from './economy';
import { WEIGHT, isHomeType } from './constants';
import { reservedFor } from './reserved_goods';
import { carryCap } from './people';
import { mintTool } from './tools';
import { farmEnabled } from './farm_species';
import type { BuildingType, ItemKind, Items, Person, World } from './types';

type Recipe = {input:Items; output:ItemKind; work:number; station:'fire'|'home'; label:string};
export const FARM_RECIPES:Record<string, Recipe> = {
  cheese:{input:{milk:2},output:'cheese',work:160,station:'home',label:'Drain curds into cheese'},
  bacon:{input:{pork:1,wood:1},output:'bacon',work:180,station:'fire',label:'Smoke pork into bacon'},
  leather:{input:{hide:1,water:1},output:'leather',work:180,station:'home',label:'Work a hide into leather'},
  coat:{input:{leather:2},output:'garment',work:160,station:'home',label:'Sew a leather coat'},
  gloves:{input:{leather:1},output:'gloves',work:90,station:'home',label:'Sew leather gloves'},
  shoes:{input:{leather:2},output:'shoes',work:120,station:'home',label:'Make leather shoes'},
};
export function stationMatches(type:string|undefined, recipe:Recipe){
  if(recipe.station==='fire')return type==='fire';
  return type==='barn'||isHomeType(type as BuildingType);
}
export function canProcess(w:World,p:Person,r:Recipe) {
  if(!farmEnabled(w))return false;
  for(const [key,n] of Object.entries(r.input)){
    const k=key as ItemKind;
    if((p.inv[k]??0)-reservedFor(w,p,k)<n)return false;
  }
  return weightOf(p.inv)-weightOf(r.input)+WEIGHT[r.output]<=carryCap(w,p);
}
export function processProducts(w:World,p:Person,r:Recipe){
  if(!canProcess(w,p,r))return false;
  for(const [k,n] of Object.entries(r.input))consume(w,p.inv,k as ItemKind,n,r.label);
  if(r.output==='garment'||r.output==='gloves'||r.output==='shoes'){
    const tool=mintTool(w,r.output,0,p.hhId,p.id,p.inv,p.id,r.label);
    if(r.output==='garment')tool.textile!.material='hide';
  }else{
    addItem(p.inv,r.output,1);
    ledgerCreate(w,r.output,1,r.label);
  }
  return true;
}
