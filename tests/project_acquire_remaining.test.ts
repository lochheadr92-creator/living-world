import {setProjectAcquire} from '../src/sim/project_acquire';
afterEach(()=>setProjectAcquire(true));
import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,building,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {proposeProject} from '../src/sim/proposals';
import {generateOptions} from '../src/sim/decision';
import {nextProjectStep} from '../src/sim/project_step';
import {stepWorld} from '../src/sim/world';
import {deserializeWorld,serializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {conservationReport,invRoom} from '../src/sim/economy';

function scene(stone:number,pack:'ordinary'|'light'='ordinary',version=CURRENT_RULES_VERSION){
 const s=stage(`review-acquire-${stone}-${pack}`),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 // ordinary pack: bread 2 + water 2 + wood 1 = 7 of 12 weight, room for ONE stone (3); light pack: room for two
 const p=addPerson(s,'Lena',40,20,{age:35,inv:{wood:1,stone,...(pack==='ordinary'?{water:2,bread:2}:{water:1,bread:1})},hunger:100,thirst:100,energy:100,traits:{diligence:1}});p.needs.warmth=95;p.needs.safety=95;
 p.stats.gathered=-1e6; // no basket want during the window (options_work.ts wantedTool), so no sibling tool plan competes for wood
 const home=building(s,'hut',36,20,p.hhId,{grain:12});w.households.find(h=>h.id===p.hhId)!.homeId=home.id;
 const yard=building(s,'timber_yard',46,20,0,{planks:4,handles:2,wood:2});
 const rock=makeSource(w,'rock',43,26,10),tree=makeSource(w,'tree',38,26,10);
 // four known food sources, so that the staged person does not spend the day exploring for food (options_work.ts optExplore)
 const food=[makeSource(w,'berry_bush',34,24,6),makeSource(w,'berry_bush',35,25,6),makeSource(w,'berry_bush',48,25,6),makeSource(w,'berry_bush',49,24,6)];
 done(s);for(const e of [home,yard,rock,tree,...food])observe(w,p,e);perceive(w,p);
 const r=proposeProject(generateOptions(w,p,true,true),{item:'cart',quantity:1,tier:0});if(!r.ok)throw new Error(r.reason);
 return {w,p,plan:r.plan,rock,yard};
}
const projectGoal='to build a handcart at the timber yard';
function stoneOffers(stone:number){
 const {w,p,plan}=scene(stone,'light');
 const before=serializeWorld(w),ctx=generateOptions(w,p,true,true),step=nextProjectStep(ctx,plan.project!,plan);
 expect(serializeWorld(w)).toBe(before);
 const offers=ctx.options.filter(o=>o.yields==='stone').map(o=>({key:o.key,goal:o.goal,util:Math.round(o.util*10)/10}));
 return {step:`${step.phase}:${step.node.item}:${step.quantity}`,wants:plan.wants,room:invRoom(w,p,'stone'),offers,fromProject:offers.filter(o=>o.goal===projectGoal)};
}
type Trace={rockGathers:{tick:number;amount:number;outcome?:string;detail?:string;stoneAfter?:number}[]};
function run(stone:number,pack:'ordinary'|'light',ticks:number){
 const {w,p,plan,rock}=scene(stone,pack);const trace:Trace={rockGathers:[]};
 w.hooks={onActivityStart:(q,a)=>{if(q.id===p.id&&a.kind==='gather'&&a.targetId===rock.id)trace.rockGathers.push({tick:w.tick,amount:a.amount});},onActivityEnd:(q,a,o,d)=>{if(q.id===p.id&&a.kind==='gather'&&a.targetId===rock.id){const g=trace.rockGathers.at(-1);if(g){g.outcome=o;g.detail=d;g.stoneAfter=q.inv.stone??0;}}}};
 for(let n=0;n<ticks&&!(p.inv.hammer??0);n++)stepWorld(w);
 return {w,p,plan,trace};
}

it('F1: the project offers the remaining stone without subtracting carried inputs twice',()=>{
 const r=stoneOffers(1);expect(r.step).toBe('acquire:stone:1');expect(r.fromProject.length).toBeGreaterThan(0);
});
it('F1: ordinary staged decisions gather both stones and make the hammer',()=>{
 const {w,p,trace}=run(0,'light',3600);expect(p.inv.hammer).toBe(1);expect(trace.rockGathers.length).toBeGreaterThan(0);
 expect(conservationReport(w).ok).toBe(true);
 const twin=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(twin);}expect(serializeWorld(twin)).toBe(serializeWorld(w));
});

it('F1: rules 116 and the lab removal preserve the old missing offer',()=>{
 for(const legacy of [true,false]){setProjectAcquire(legacy);const {w,p}=scene(1,'light',legacy?116:117);expect(generateOptions(w,p,true,true).options.filter(o=>o.yields==='stone'&&o.goal===projectGoal)).toHaveLength(0);}
});
it('F1: the fix still refuses a second stone when the pack has no room',()=>{
 const {w,p}=scene(1,'ordinary');expect(invRoom(w,p,'stone')).toBe(0);
 expect(generateOptions(w,p,true,true).options.filter(o=>o.yields==='stone')).toHaveLength(0);
});
