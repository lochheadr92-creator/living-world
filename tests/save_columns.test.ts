import {beforeAll,expect,it} from 'vitest';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {gzipSync} from 'node:zlib';
import type {World} from '../src/sim/types';
let world:World;
beforeAll(()=>{
 world=createWorld(currentWorldSettings('normal','ragged-save',{immigration:true}));
 for(let i=0;i<300;i++)stepWorld(world);
 world.persons[0].skillExperience=[];
 const odd=world.persons[1] as unknown as Record<string,unknown>,value=odd.stampX;
 delete odd.stampX;odd.stampX=value;
 (world.persons[2] as unknown as Record<string,unknown>).crowd=undefined;
});
it('format 5 packs heterogeneous people, preserving field order and absent/undefined/null semantics',()=>{
 const old=serializeWorld(world),text=serializeWorld(world,5),raw=JSON.parse(text);
 expect(raw.version).toBe(5);expect(raw.world.persons.__cols).toBeDefined();
 expect(raw.world.persons.orders.length).toBeGreaterThan(1);
 const oldCopy=deserializeWorld(old),copy=deserializeWorld(text);
 expect(serializeWorld(copy)).toBe(serializeWorld(oldCopy));
 expect(serializeWorld(copy,5)).toBe(text);
 for(let i=0;i<120;i++){stepWorld(copy);stepWorld(oldCopy);}
 expect(serializeWorld(copy)).toBe(serializeWorld(oldCopy));
});
it('retains the format-4 reference encoding by default and reduces real text and compressed save size',()=>{
 const old=serializeWorld(world),text=serializeWorld(world,5);
 expect(JSON.parse(old).version).toBe(4);expect(Array.isArray(JSON.parse(old).world.persons)).toBe(true);
 expect(text.length).toBeLessThan(old.length);expect(gzipSync(text).length).toBeLessThan(gzipSync(old).length);
});
it.each(['count','order count','shape index','duplicate field','column length','unsafe key'] as const)('rejects malformed format-5 %s before accepting a world',kind=>{
 const raw=JSON.parse(serializeWorld(world,5)),c=raw.world.persons;
 if(kind==='count')c.n=-1;
 if(kind==='order count')c.order.pop();
 if(kind==='shape index')c.order[0]=c.orders.length;
 if(kind==='duplicate field')c.orders[0].push(c.orders[0][0]);
 if(kind==='column length')c.d[c.__cols[0]].pop();
 if(kind==='unsafe key'){c.__cols.push('__proto__');c.orders[0].push(c.__cols.length-1);Object.defineProperty(c.d,'__proto__',{value:Array(c.n).fill(null),enumerable:true});}
 expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/columns/i);
});
