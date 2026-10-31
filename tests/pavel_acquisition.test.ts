// Adapted from the retained F1 review fixture; positive contracts, ordinary decisions.
// REVIEW (agent F): the project path's acquire offer for a CARRIED (destination 0) hand-tool input.
//
// nextProjectStep already subtracts what is carried: step.quantity is the REMAINING quantity (project_step.ts). projectOptions
// (production.ts) then calls supply(scratch,item,step.quantity,...) with no haveOverride, and supply subtracts the carried amount
// AGAIN (`have = dest ? 0 : carried`) because a hand-tool input has no destination workshop. With a hammer wanting 2 stone and 1
// stone in the pack, remaining is 1, supply sees 1 - 1 = 0 and offers nothing: the plan's own step (base 28) is never on offer.
// Two consequences: (a) a person carrying one stone is never offered the second by the plan; (b) a two-stone gather in progress is
// interrupted after its first unit, because reviewActivity no longer finds the option that started it (currentUtility 0).
// The retained rules-113 forest trace shows state (a) in 104 of its 105 "acquire stone" samples
// (autonomy_evidence/first-cart113-forest-final/report.json: inv.stone 1, step.quantity 1, only a weak tool-want gather at 5.1).
//
// The scene is isolated on purpose: no site wants stone, no other tool is wanted (stats.gathered is kept far below the basket's
// threshold), so the project path is the only source of a stone acquisition. The yard already holds the cart's planks, handles and
// wood, so the hammer is the one prerequisite and a rock with 10 stone stands six tiles away.
import {expect,it} from 'vitest';
import {stage,addPerson,building,done} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {proposeProject} from '../src/sim/proposals';
import {generateOptions} from '../src/sim/decision';
import {nextProjectStep} from '../src/sim/project_step';
import {stepWorld} from '../src/sim/world';
import {serializeWorld} from '../src/app/save';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {conservationReport,invRoom} from '../src/sim/economy';

function scene(stone:number,pack:'ordinary'|'light'='ordinary'){
 const s=stage(`review-acquire-${stone}-${pack}`),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;
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
it('with physical room remaining, the project offers its remaining stone',()=>{
 const r=stoneOffers(1);
 expect(r.room).toBeGreaterThan(0);
 expect(r.fromProject.length,JSON.stringify(r)).toBeGreaterThan(0);
});
it('autonomous acquisition pays for and makes the prerequisite hammer within a day and a half',()=>{
 const {p}=run(0,'light',3600);
 expect(p.inv.hammer).toBe(1);
});
