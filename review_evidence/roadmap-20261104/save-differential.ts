import {strict as assert} from 'node:assert';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import type {Person} from '../../src/sim/types';
const base=createWorld(currentWorldSettings('normal','columns-differential',{immigration:true}));
for(let i=0;i<300;i++)stepWorld(base);
const original=serializeWorld(base);
for(let n=0;n<24;n++){
 const w=deserializeWorld(original);
 w.persons=w.persons.map((p,j)=>{
  const entries=Object.entries(p),offset=(n*7+j*11)%entries.length;
  const q=Object.fromEntries([...entries.slice(offset),...entries.slice(0,offset)]) as unknown as Person;
  if((n+j)%3===0)q.skillExperience=[];
  if((n+j)%4===0)q.placeMemories=[];
  return q;
 });
 const before=serializeWorld(w),v5=serializeWorld(w,5);
 assert.equal(serializeWorld(w),before,'writer changed state');
 const a=deserializeWorld(before),b=deserializeWorld(v5);
 assert.equal(serializeWorld(a),serializeWorld(b),'format changed state/key order');
 assert.equal(serializeWorld(b,5),v5,'format 5 unstable');
 for(let i=0;i<120;i++){stepWorld(a);stepWorld(b);}
 assert.equal(serializeWorld(a),serializeWorld(b),'continuation changed');
}
console.log(JSON.stringify({cases:24,people:base.persons.length,permutedFieldOrder:true,optionalFieldShapes:true,continuationTicksPerCase:120,identical:true}));
