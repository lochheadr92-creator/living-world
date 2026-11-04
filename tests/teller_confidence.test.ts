// STAGED contract for rules 154 (P1.2): food hearsay is weighed by the listener's own checks of the teller.
import {it,expect,afterEach} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {putBelief} from '../src/sim/knowledge';
import {relOf} from '../src/sim/relations';
import {generateOptions} from '../src/sim/decision';
import {pickNews} from '../src/sim/news';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {parseIntervention} from '../scripts/lab/lab';
import {setTellerConfidence} from '../src/sim/teller_confidence';
afterEach(()=>setTellerConfidence(true));

const record=(checked:number,borneOut:number,id:number)=>({checked,borneOut,last:{tick:3000,id,kind:'berry_bush',described:6,expected:6,found:borneOut===checked?6:0,borneOut:borneOut===checked,toldAt:2000}});
function scene(rules:number){
 const s=stage('teller-confidence');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:rules};
 const ada=addPerson(s,'Ada',40.5,40.5,{hunger:45,thirst:95,energy:90}),kai=addPerson(s,'Kai',30.5,30.5),lin=addPerson(s,'Lin',31.5,30.5);
 // Two equal bushes at the same distance, both out of sight: one told by Kai, one by Lin, learned just now.
 const east=makeSource(s.w,'berry_bush',55,40,6),west=makeSource(s.w,'berry_bush',25,40,6);
 done(s);s.w.tick=4000;
 for(const [src,from] of [[east,kai.id],[west,lin.id]] as const)putBelief(ada,{id:src.id,kind:src.type,x:src.x+0.5,y:src.y+0.5,amount:6,max:src.max,seen:3990,src:'told',from,learned:3990,hops:1});
 return {w:s.w,ada,kai,lin,east,west};
}
const gathers=(f:ReturnType<typeof scene>)=>{const o=generateOptions(f.w,f.ada,true,true).options;return {east:o.find(x=>x.key===`gather:${f.east.id}`),west:o.find(x=>x.key===`gather:${f.west.id}`)};};

it('weighs a caught-out teller\'s place below an equal one, with the reason, as a pure read',()=>{
 const f=scene(154);relOf(f.ada,f.kai.id).accounts=record(3,1,f.east.id);
 const before=serializeWorld(f.w),{east,west}=gathers(f);expect(serializeWorld(f.w)).toBe(before);
 expect(east&&west).toBeTruthy();expect(east!.util).toBeLessThan(west!.util);
 expect(east!.parts.some(([why])=>/won't go on Kai's word alone \(1 of 3 accounts borne out\)/.test(why))).toBe(true);
 expect(west!.parts.some(([why])=>/word alone|old hearsay/.test(why))).toBe(false);
});

it('does not doubt a teller who was never caught out',()=>{
 const f=scene(154);relOf(f.ada,f.kai.id).accounts=record(2,2,f.east.id);
 const {east,west}=gathers(f);expect(east!.util).toBeCloseTo(west!.util,6);
});

it('weighs old hearsay a little as old, and passes on a caught-out teller\'s place less readily',()=>{
 const f=scene(154);f.ada.beliefs[f.west.id].seen=4000-2000;
 expect(gathers(f).west!.parts.some(([why])=>why==='old hearsay')).toBe(true);
 // With one slot to fill, the place from the teller Ada has caught out gives way; swapping who is doubted swaps it.
 const g=scene(154);relOf(g.ada,g.kai.id).accounts=record(1,0,g.east.id);expect(pickNews(g.w,g.ada,g.lin,1).map(b=>b.id)).toEqual([g.west.id]);
 const h=scene(154);relOf(h.ada,h.lin.id).accounts=record(1,0,h.west.id);expect(pickNews(h.w,h.ada,h.kai,1).map(b=>b.id)).toEqual([h.east.id]);
});

it('keeps rules 153 and the lab removal identical to no doubt, and continues exactly after saving',()=>{
 const old=scene(153);relOf(old.ada,old.kai.id).accounts=record(3,1,old.east.id);
 const a=gathers(old);expect(a.east!.util).toBeCloseTo(a.west!.util,6);
 const off=scene(154);relOf(off.ada,off.kai.id).accounts=record(3,1,off.east.id);
 const restore=parseIntervention('rich-no-confidence').install!();try{const b=gathers(off);expect(b.east!.util).toBeCloseTo(b.west!.util,6);}finally{restore();}
 const f=scene(154);relOf(f.ada,f.kai.id).accounts=record(3,1,f.east.id);const copy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<600;i++){stepWorld(f.w);stepWorld(copy);}expect(serializeWorld(f.w)).toBe(serializeWorld(copy));
});
