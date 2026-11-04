// Diagnosis: does a loaded world's rebuilt static grid list co-located entities in the same order as the live world?
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import type {World} from '../../src/sim/types';
const [seed='river',profile='normal',ticks='0']=process.argv.slice(2);
const w=createWorld(currentWorldSettings(profile as never,seed));for(let i=0;i<Number(ticks);i++)stepWorld(w);
const copy=deserializeWorld(serializeWorld(w));
const cells=(x:World)=>x.grid.cells.map(c=>c.map(e=>`${e.id}`).join(','));
const a=cells(w),b=cells(copy);let diff=0,sameSet=0;const ex:unknown[]=[];
for(let i=0;i<a.length;i++)if(a[i]!==b[i]){diff++;if(a[i].split(',').sort().join()===b[i].split(',').sort().join())sameSet++;if(ex.length<3)ex.push({cell:i,live:w.grid.cells[i].map(e=>`${e.id}:${(e as {ent:string}).ent}:${(e as {type?:string}).type??''}`),loaded:copy.grid.cells[i].map(e=>`${e.id}:${(e as {ent:string}).ent}:${(e as {type?:string}).type??''}`)});}
console.log(JSON.stringify({seed,profile,ticks:Number(ticks),cells:a.length,differentOrder:diff,sameMembers:sameSet,examples:ex}));
