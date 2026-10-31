import {expect,it} from 'vitest';
import {estateScene} from './helpers/estate';
import {killPerson} from '../src/sim/lifecycle';
import {pickEntity} from '../src/render/picking';
import {worldToScreen} from '../src/render/camera';
import {project} from '../src/render/iso';
import type {Game} from '../src/app/game';
it('keeps each separately owned estate parcel selectable beside the grave',()=>{
 const f=estateScene();killPerson(f.w,f.a,'declared staged loss');for(const p of f.w.persons){p.x=p.px=60;p.y=p.py=60;}
 const pt=project(40,40),game={world:f.w,camera:{x:pt.sx+100,y:pt.sy,zoom:2},renderAlpha:1} as Game;
 const parcels=f.w.piles.filter(p=>p.estate);expect(parcels).toHaveLength(3);
 for(const p of parcels){const at=worldToScreen(game.camera,1440,1000,p.x+.5,p.y+.5);const hits=[];
  for(let dx=-35;dx<=35;dx+=5)for(let dy=-20;dy<=15;dy+=5)hits.push(pickEntity(game,1440,1000,at.x+dx,at.y+dy));
  expect(hits,`parcel ${p.id}, owner ${p.estate!.hhId} must have a visible selectable point`).toContain(p.id);
 }
});
