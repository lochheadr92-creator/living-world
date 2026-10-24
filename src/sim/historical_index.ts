// Derived index of the append-only death archive. No saved state or decision semantics.
import type {World} from './types';
type Death=World['deceased'][number];
interface Index {rows:World['deceased']; count:number; first?:Death; last?:Death; byId:Map<number,Death>}
const indexes=new WeakMap<World,Index>();
/** Death records are appended by lifecycle; loading/replacing a world rebuilds lazily.
 * The first matching ID wins, preserving Array.find even for malformed duplicate IDs.
 * Archive records are never removed by this index. */
export function deceasedById(w:World,id:number|undefined):Death|undefined{
 if(id===undefined)return undefined;
 let index=indexes.get(w);
 if(!index||index.rows!==w.deceased||index.count>w.deceased.length||index.first!==w.deceased[0]||(index.count>0&&index.last!==w.deceased[index.count-1])){
  index={rows:w.deceased,count:0,byId:new Map()};indexes.set(w,index);
 }
 while(index.count<w.deceased.length){const d=w.deceased[index.count++];if(!index.byId.has(d.id))index.byId.set(d.id,d);}
 index.first=w.deceased[0];index.last=w.deceased[index.count-1];
 return index.byId.get(id);
}
