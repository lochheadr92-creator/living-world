// Rules 160: a loaded world lists each static grid cell in ascending id order, as a live world does.
// Ordinary origin: the 30-day Large River twin (observed from the factory, twin from the deserialized initial state) differed in
// exact text on day 19 because one person's belief-kind index keys were created in a different order (review_evidence/load-order-20261105).
import {expect,it} from 'vitest';
import {stage,addPerson,building,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import type {World} from '../src/sim/types';

const cells=(w:World)=>w.grid.cells.map(c=>c.map(e=>e.id));
const sorted=(w:World)=>w.grid.cells.every(c=>c.every((e,i)=>i===0||c[i-1].id<e.id));

/** One cell holding a building registered BEFORE a source (so a lower id): live order is [building, source]. */
function scene(version:number){
 const s=stage('load-order');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:version};
 const p=addPerson(s,'Ada',40.5,40.5);const hut=building(s,'hut',44,40,p.hhId);const bush=makeSource(s.w,'berry_bush',45,41,6);
 done(s);return {w:s.w,hut,bush};
}

it('keeps a live cell in id order through a save and load at rules 160',()=>{
 const f=scene(160);expect(f.hut.id).toBeLessThan(f.bush.id);
 const live=cells(f.w);expect(live.some(c=>c.length>1)).toBe(true);expect(sorted(f.w)).toBe(true);
 const copy=deserializeWorld(serializeWorld(f.w));
 expect(cells(copy)).toEqual(live);
});

it('keeps the recorded old order below 160, so older saves behave as they were recorded',()=>{
 const f=scene(159);const live=cells(f.w),copy=deserializeWorld(serializeWorld(f.w));
 expect(cells(copy)).not.toEqual(live);
 expect(copy.grid.cells.flat().map(e=>e.id).sort()).toEqual(f.w.grid.cells.flat().map(e=>e.id).sort());
});

it('an ordinary generated world loads to the same cells it had live, and an exact twin stays exact for two days',()=>{
 const w=createWorld({...currentWorldSettings('normal','river'),rulesVersion:160});
 const twin=deserializeWorld(serializeWorld(w));expect(cells(twin)).toEqual(cells(w));
 for(let i=0;i<4800;i++){stepWorld(w);stepWorld(twin);}
 expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(sorted(w)).toBe(true);
},180000);
