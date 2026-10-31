import {expect,it} from 'vitest';
import type {Game} from '../src/app/game';
import {leftoverScene} from './helpers/meal_leftovers';
import {cancelMeal} from '../src/sim/meals';
import {pickEntity} from '../src/render/picking';
import {worldToScreen} from '../src/render/camera';
import {project} from '../src/render/iso';
import {serializeWorld} from '../src/app/save';
it('selects the visible leftover basket in front of the hall where their bounding-box depths tie',()=>{
 const f=leftoverScene();cancelMeal(f.w,f.meal,'declared interrupted meal');const pile=f.w.piles[0];
 // The rendered checker separately exercises person priority; this boundary isolates the hall.
 for(const p of f.w.persons){p.x=p.px=60;p.y=p.py=60;}
 const pt=project(43,45),game={world:f.w,camera:{x:pt.sx+100,y:pt.sy,zoom:2},renderAlpha:1} as Game;
 const at=worldToScreen(game.camera,1440,1000,pile.x+.5,pile.y+.5),before=serializeWorld(f.w);
 expect(pickEntity(game,1440,1000,at.x-30,at.y-5)).toBe(pile.id);
 expect(serializeWorld(f.w)).toBe(before);
});
