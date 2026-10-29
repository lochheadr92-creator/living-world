import { expect, it } from 'vitest';
import { feedRows } from '../src/ui/feed_rows';
import type { WorldEvent } from '../src/sim/types';
const ev=(id:number,text:string,kind:WorldEvent['kind']='work'):WorldEvent=>({id,text,kind,tick:id*10,ids:[id],x:id,y:3});
it('keeps exact people, amounts, places and times under grouped workshop output',()=>{
  const events=[ev(1,'Ada finished sawn planks at the timber yard.'),ev(2,'Ben finished sawn planks at the timber yard.'),ev(3,'A wolf attacked Ada.','danger')];
  const before=JSON.stringify(events);
  const rows=feedRows(events,'all',()=>true);
  expect(rows.map(r=>r.ev.id)).toEqual([3,2]);
  expect(rows[1].members).toEqual([events[1],events[0]]);
  expect(rows[1].count).toBe(2);
  expect(feedRows(events,'work',e=>e.kind==='work').map(r=>r.ev.id)).toEqual([2,1]);
  expect(JSON.stringify(events)).toBe(before);
});
it('never groups distinct urgent events or hides them behind repeated work',()=>{
  const events=[ev(1,'A warning','danger'),...Array.from({length:20},(_,i)=>ev(i+2,'Ada finished sawn planks at the timber yard.')),ev(22,'Another warning','danger')];
  const rows=feedRows(events,'all',()=>true,3);
  expect(rows.map(r=>r.ev.id)).toEqual([22,21,1]);
  expect(rows[1].members).toHaveLength(20);
});
