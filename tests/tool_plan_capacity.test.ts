import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,building,done,give} from './helpers/kit';
import {observe} from '../src/sim/knowledge';
import {makeSource} from '../src/sim/sources';
import {generateOptions} from '../src/sim/decision';
import {reviewIntentions,setToolPlanCapacity} from '../src/sim/intent';
import {carryCap} from '../src/sim/people';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {TOOL_RECIPE,WEIGHT} from '../src/sim/constants';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
afterEach(()=>setToolPlanCapacity(true));
function scene(version=CURRENT_RULES_VERSION,basket=false){
 const s=stage('tool-capacity'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40.5,40.5,{age:75,hunger:95,thirst:95,energy:95,inv:{bread:1,water:1}});
 const home=building(s,'hut',36,40,p.hhId,{bread:30,water:20});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const trees=[makeSource(w,'tree',44,40,10),makeSource(w,'tree',46,40,10),makeSource(w,'tree',48,40,10)];
 if(basket)give(w,p,'basket');done(s);
 // rules 184: the contents of a home are learned from inside or at the door, so she looks at her own home from its door and then comes back
 const at={x:p.x,y:p.y};p.x=home.x+home.w+1;p.y=home.y+home.h/2;observe(w,p,home);p.x=at.x;p.y=at.y;
 for(const e of trees)observe(w,p,e);p.stats.gathered=4;p.skills.wood=1.5;
 return {w,p};
}
it('M1: does not adopt a tool whose complete carried recipe exceeds capacity',()=>{
 // Pinned to rules 203: the scene stages an axe as the only tool she wants. From rules 204 (carry_more.ts) a grown person without a
 // basket wants one from the start, and a basket's three wood is within her capacity, so she would take that plan on instead.
 const {w,p}=scene(203);expect(carryCap(w,p)).toBe(6);
 const r=TOOL_RECIPE.axe;expect(r.wood*WEIGHT.wood+r.stone*WEIGHT.stone).toBeGreaterThan(carryCap(w,p));
 reviewIntentions(generateOptions(w,p,true,true));
 expect(p.intentions.filter(i=>i.kind==='tool'&&i.status==='active')).toEqual([]);
});
it.each(['old','removed'] as const)('M1: %s retains the infeasible tool adoption',mode=>{
 const {w,p}=scene(mode==='old'?117:118);if(mode==='removed')setToolPlanCapacity(false);
 reviewIntentions(generateOptions(w,p,true,true));expect(p.intentions.some(i=>i.kind==='tool'&&i.makes==='axe'&&i.status==='active')).toBe(true);
});
it('M1: an elder with enough basket-assisted capacity still adopts, saves and continues',()=>{
 const {w,p}=scene(undefined,true);
 expect(carryCap(w,p)).toBeGreaterThanOrEqual(7);reviewIntentions(generateOptions(w,p,true,true));
 expect(p.intentions.some(i=>i.kind==='tool'&&i.makes==='axe'&&i.status==='active')).toBe(true);
 const twin=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(twin);}
 expect(serializeWorld(w)).toBe(serializeWorld(twin));expect(conservationReport(w).ok).toBe(true);
});
