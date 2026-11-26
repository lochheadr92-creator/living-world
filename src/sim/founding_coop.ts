import {createBuilding} from './buildings';
import {preservesAccess} from './construction_access';
import {farmEnabled} from './farm_species';
import {isFreeLand,isWalkable} from './registry';
import type {World} from './types';

/** Founding stock, recorded by worldgen's initial ledger snapshot. Never called on load. */
export function foundChickenCoop(w:World,reach:Uint8Array){
  if(!farmEnabled(w))return;
  const keeper=w.persons.find(p=>p.alive&&p.hhId);
  const birds=w.animals.filter(a=>a.type==='chicken');
  if(!keeper||!birds.length)return;
  const hx=Math.floor(keeper.x),hy=Math.floor(keeper.y);
  for(let r=2;r<=9;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const x=hx+dx,y=hy+dy;
    if(!isFreeLand(w,x,y)||!isWalkable(w,x,y+1)||!reach[(y+1)*w.W+x]||!preservesAccess(w,x,y,1,1))continue;
    const coop=createBuilding(w,'chicken_cage',x,y,keeper.hhId);
    coop.store.items={grain:3,water:3};
    for(const a of birds){
      a.x=a.px=coop.doorX+.5;a.y=a.py=coop.doorY+.5;
      Object.assign(a.sheep!,{hhId:keeper.hhId,housing:coop.id,tether:{x:a.x,y:a.y,condition:100}});
    }
    return;
  }
}
