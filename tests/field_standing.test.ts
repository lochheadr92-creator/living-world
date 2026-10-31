import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,building,done} from './helpers/kit';
import {findPlotSpot,plotFailureKey,setReachableTilling} from '../src/sim/farming';
import {generateOptions} from '../src/sim/decision';
import {endActivity,newActivity,startActivity,stepActivity} from '../src/sim/activities';
import {recentFailure} from '../src/sim/knowledge';
import {conservationReport} from '../src/sim/economy';
import {stepWorld} from '../src/sim/world';
import {isWalkable} from '../src/sim/registry';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {T} from '../src/sim/types';
import {serializeWorld,deserializeWorld} from '../src/app/save';
afterEach(()=>setReachableTilling(true));
function scene(version=CURRENT_RULES_VERSION){
 const s=stage('field-standing'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',41.5,39.5,{age:35,inv:{seeds:1},hunger:95,thirst:95,energy:95});
 const home=building(s,'hut',36,40,p.hhId);w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 building(s,'lean_to',44,41,0);done(s);p.explored.fill(0);p.explored[40*w.W+44]=1;
 return {w,p};
}
it('M3: a field beside a footprint uses a reachable standing tile without changing state',()=>{
 const {w,p}=scene(),before=serializeWorld(w),spot=findPlotSpot(w,p) as {x:number;y:number;spotX?:number;spotY?:number}|null;
 expect(spot).not.toBeNull();expect(isWalkable(w,Math.floor(spot!.spotX??spot!.x+0.5),Math.floor(spot!.spotY??spot!.y+1.5))).toBe(true);
 expect(serializeWorld(w)).toBe(before);
});
it('M3: the ordinary till offer reaches the field, saves during work and prepares it',()=>{
 const {w,p}=scene(),o=generateOptions(w,p,true,true).options.find(o=>o.key==='till:new');
 expect(o).toBeDefined();const a=o!.make!()!;expect(isWalkable(w,Math.floor(a.spotX),Math.floor(a.spotY))).toBe(true);
 startActivity(w,p,a);for(let n=0;n<500&&a.phase!=='work';n++){w.tick++;stepActivity(w,p);}
 expect(a.phase).toBe('work');const twin=deserializeWorld(serializeWorld(w));
 for(let n=0;n<200;n++){stepWorld(w);stepWorld(twin);}
 expect(w.plots.some(pl=>pl.x===44&&pl.y===40&&pl.state!=='tilling')).toBe(true);
 expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(conservationReport(w).ok).toBe(true);
});
it('M3: a failed new-field journey records the tile and defers retry across a save',()=>{
 const {w,p}=scene();const a=newActivity(w,p,{kind:'till',label:'Staged field trip',goal:'prepare field',tx:44.5,ty:40.5,spotX:45.5,spotY:40.5,data:{px:44,py:40,hh:p.hhId}});
 startActivity(w,p,a);endActivity(w,p,'failed','no way to get there');
 const key=plotFailureKey(w,44,40);expect(recentFailure(w,p,key,800)?.reason).toBe('no way to get there');expect(findPlotSpot(w,p)).toBeNull();
 const copy=deserializeWorld(serializeWorld(w));expect(findPlotSpot(copy,copy.persons.find(q=>q.id===p.id)!)).toBeNull();
 w.tick+=801;expect(findPlotSpot(w,p)).not.toBeNull();
});
it.each(['old','removed'] as const)('M3: %s retains the fixed standing tile',mode=>{
 const {w,p}=scene(mode==='old'?117:118);if(mode==='removed')setReachableTilling(false);
 expect(findPlotSpot(w,p)).toEqual({x:44,y:40});
});
it('M3: no field is selected when every adjacent standing tile is blocked',()=>{
 const {w,p}=scene();for(const [x,y] of [[44,41],[45,40],[44,39],[43,40]])w.terrain[y*w.W+x]=T.DEEP;
 expect(findPlotSpot(w,p)).toBeNull();
});
