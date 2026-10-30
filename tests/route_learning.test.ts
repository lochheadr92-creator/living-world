import {afterEach,expect,it} from 'vitest';
import {repeatedRouteScene,openStagedRoute,complementaryRouteScene} from './helpers/route_learning';
import {routeBlock,recordRouteFailure,setRouteLearning} from '../src/sim/route_learning';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {describePerson} from '../src/sim/inspect';
import {observeInhabitant} from '../src/agent/observe';
import {stepWorld} from '../src/sim/world';
import {conservationReport} from '../src/sim/economy';
afterEach(()=>setRouteLearning(true));
it('records two actual path failures and bounds reconsideration without learning unseen stock',()=>{
 const f=repeatedRouteScene(),r=f.p.failures[f.tree.id].route!;expect(r.streak).toBe(2);expect(r.events.map(e=>e.outcome)).toEqual(['failed','failed']);expect(r.retryAt-r.last).toBe(240);expect(f.p.beliefs[f.tree.id].amount).toBe(12);
 const raw=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.key===f.key)).toBe(false);expect(ctx.blocked.find(o=>o.key===f.key)?.blocked).toContain('2 times');describePerson(f.w,f.p.id);observeInhabitant(f.w,f.p,ctx,rankOptions(ctx));expect(serializeWorld(f.w)).toBe(raw);expect(conservationReport(f.w).ok).toBe(true);
 recordRouteFailure(f.w,f.p,f.second,'failed','no way to get there');expect(serializeWorld(f.w)).toBe(raw);
});
it('corrects a reopened route on actual arrival but preserves the missing-stone construction failure',()=>{
 const f=repeatedRouteScene(),r=f.p.failures[f.tree.id].route!;openStagedRoute(f);
 expect(routeBlock(f.w,f.p,{targetId:f.tree.id,kind:'gather'})).toContain('reconsider');const twin=deserializeWorld(serializeWorld(f.w));
 while(f.w.tick<6000){stepWorld(f.w);stepWorld(twin);}expect(r.corrected).toBeDefined();expect(r.streak).toBe(0);expect(f.target.delivered.wood).toBeGreaterThan(0);expect(f.target.used.wood??0).toBe(0);expect(f.target.delivered.stone??0).toBe(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('uses another reachable material while reconsidering and later turns recovered wood into real tools',()=>{
 const f=complementaryRouteScene(),r=f.p.failures[f.tree.id].route!,arrivals:number[]=[],crafted:string[]=[];
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.targetId===f.rock.id&&o.kind==='gather')).toBe(true);expect(ctx.blocked.some(o=>o.key===f.key)).toBe(true);
 f.w.hooks={onActivityEnd:(p,a,outcome)=>{if(p.id!==f.p.id)return;if(a.kind==='gather'&&a.targetId===f.tree.id&&a.cycle>0)arrivals.push(f.w.tick);if(a.kind==='craft'&&outcome==='success')crafted.push(a.data.tool);}};
 const twin=deserializeWorld(serializeWorld(f.w));while(f.w.tick<12000){stepWorld(f.w);stepWorld(twin);}delete f.w.hooks;
 expect(r.corrected).toBeDefined();expect(arrivals.length).toBeGreaterThan(0);expect(f.target.used.stone).toBeGreaterThan(0);expect(crafted).toContain('basket');expect(crafted).toContain('hammer');expect(f.w.ledger.reasons['-crafting: basket']).toBeGreaterThan(0);expect(f.w.ledger.reasons['-crafting: hammer']).toBeGreaterThan(0);expect(serializeWorld(f.w)).toBe(serializeWorld(twin));expect(conservationReport(f.w).ok).toBe(true);
});
it('ignores interruptions and work failures, bounds retained route evidence and permits a timed probe',()=>{
 const f=repeatedRouteScene(),r=f.p.failures[f.tree.id].route!,o={targetId:f.tree.id,kind:'gather' as const};const raw=serializeWorld(f.w);
 const a=structuredClone(f.second);a.id+=10000;recordRouteFailure(f.w,f.p,a,'interrupted','path blocked');a.phase='work';recordRouteFailure(f.w,f.p,a,'failed','nothing left');expect(serializeWorld(f.w)).toBe(raw);
 const other=structuredClone(f.p);other.failures={};expect(routeBlock(f.w,other,o)).toBeUndefined();
 f.p.cooldowns.pause=1e12;while(f.w.tick<r.retryAt)stepWorld(f.w);expect(routeBlock(f.w,f.p,o)).toBeUndefined();
 // Unit boundary for bounded metadata: these synthetic failures do not claim physical journeys.
 for(let n=0;n<12;n++){const e=structuredClone(f.second);e.id=10000+n;e.targetId=100+n;e.data.routeAttempt.target=e.targetId;recordRouteFailure(f.w,f.p,e,'failed','path blocked');}
 expect(Object.values(f.p.failures).filter(f=>f.route)).toHaveLength(8);
 const target=Object.entries(f.p.failures).find(([,f])=>f.route)![0];for(let n=0;n<8;n++){const e=structuredClone(f.second);e.id=11000+n;e.targetId=Number(target);e.data.routeAttempt.target=e.targetId;recordRouteFailure(f.w,f.p,e,'failed','path blocked');}
 expect(f.p.failures[Number(target)].route!.events).toHaveLength(4);expect(f.p.failures[Number(target)].route!.streak).toBe(3);expect(f.p.failures[Number(target)].route!.retryAt-f.w.tick).toBe(600);
});
it('scopes the expectation to the known destination, approach, action and cart mode',()=>{
 const f=repeatedRouteScene(),o={targetId:f.tree.id,kind:'gather' as const},x=f.p.x;expect(routeBlock(f.w,f.p,o)).toBeDefined();f.p.x+=9;expect(routeBlock(f.w,f.p,o)).toBeUndefined();f.p.x=x;f.p.cartId=999;expect(routeBlock(f.w,f.p,o)).toBeUndefined();f.p.cartId=0;expect(routeBlock(f.w,f.p,{...o,kind:'withdraw'})).toBeUndefined();f.p.beliefs[f.tree.id].x+=3;expect(routeBlock(f.w,f.p,o)).toBeUndefined();delete f.p.beliefs[f.tree.id];expect(routeBlock(f.w,f.p,o)).toBeUndefined();
 const other=structuredClone(f.p);other.failures={};expect(routeBlock(f.w,other,o)).toBeUndefined();
});
it('preserves rules 75 and the isolated removal',()=>{
 const old=repeatedRouteScene(75);expect(old.p.failures[old.tree.id].route).toBeUndefined();setRouteLearning(false);const off=repeatedRouteScene();expect(off.p.failures[off.tree.id].route).toBeUndefined();
});
it.each(['future event','duplicate event','old rules'] as const)('rejects malformed route evidence: %s',kind=>{
 const f=repeatedRouteScene(),r=f.p.failures[f.tree.id].route!;if(kind==='future event')r.events[0].tick=f.w.tick+1;if(kind==='duplicate event')r.events.push(r.events[0]);if(kind==='old rules')f.w.settings.rulesVersion=75;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow(/route/i);
});
