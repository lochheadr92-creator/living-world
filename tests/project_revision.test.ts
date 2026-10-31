import {expect,it} from 'vitest';
import {cartProjectScene} from './helpers/cart_project';
import {proposeProject} from '../src/sim/proposals';
import {reviseProject} from '../src/sim/project_revision';
import {generateOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {PROJECT_LIMITS,projectGraphError} from '../src/sim/project_graph';
import {observe,delBelief} from '../src/sim/knowledge';
import {conservationReport} from '../src/sim/economy';
import {stubModel} from '../src/agent/model';
import {runLive,runReplay} from '../src/agent/run';
import {hashWorld} from '../src/sim/world';
import {observationFromPrompt,parseProposal,buildPrompt,PROTOCOL_V31,PROTOCOL_V32,observationVersionFor} from '../src/agent/protocol';
import {observeInhabitant} from '../src/agent/observe';
import {rankOptions} from '../src/sim/decision';
import {ReplayDiverged} from '../src/agent/transcript';
import type {Transcript} from '../src/agent/transcript';
import {startActivity,suspendActivity} from '../src/sim/activities';
function scene(){const f=cartProjectScene(113);f.target.required.stone=6;observe(f.w,f.p,f.target);const r=proposeProject(generateOptions(f.w,f.p,true,true),{item:'planks',quantity:4,tier:0});if(!r.ok)throw new Error(r.reason);return {...f,plan:r.plan};}
it('revises the existing quantity with the same identity, deadline and paid work, without granting goods',()=>{
 const f=scene(),{w,p,plan}=f;plan.worked=1;plan.project!.history.push({tick:w.tick,node:plan.project!.root,reason:'earlier attempt retained'});
 const before={id:plan.id,since:plan.since,until:plan.until,worked:plan.worked,ledger:JSON.stringify(w.ledger),inventory:JSON.stringify(p.inv),nextId:w.nextId};
 const r=reviseProject(generateOptions(w,p,true,true),{planId:plan.id,quantity:2});expect(r.ok).toBe(true);expect(plan.reserve).toBe(2);expect(plan.project!.goal.quantity).toBe(2);expect(plan.project!.retries).toBe(1);
 expect(plan).toMatchObject({id:before.id,since:before.since,until:before.until,worked:before.worked});expect(w.nextId).toBe(before.nextId);expect(JSON.stringify(w.ledger)).toBe(before.ledger);expect(JSON.stringify(p.inv)).toBe(before.inventory);
 expect(plan.project!.history.some(h=>h.reason.includes('earlier attempt retained'))).toBe(true);expect(plan.project!.history.at(-1)?.reason).toContain('4 to 2');expect(projectGraphError(plan.project)).toBeNull();expect(conservationReport(w).ok).toBe(true);
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
it('refuses unchanged, malformed, missing, expired, failed, committed and unknown-feasibility revisions without mutation',()=>{
 for(const mode of ['same','null','missing','expired','failed','site','unknown','child','critical','fraction'] as const){
  const {w,p,plan,yard}=scene();let request:unknown={planId:plan.id,quantity:2};
  if(mode==='same')request={planId:plan.id,quantity:4};if(mode==='null')request=null;if(mode==='missing')request={planId:plan.id+100,quantity:2};if(mode==='expired')plan.until=w.tick-1;
  if(mode==='failed')plan.project!.failure='actual failed project';if(mode==='site')plan.forSite=999;if(mode==='unknown')delBelief(p,yard.id);if(mode==='critical')p.needs.thirst=0;if(mode==='fraction')request={planId:plan.id,quantity:1.5};
  const ctx=generateOptions(w,p,true,true);if(mode==='child')ctx.stage='child';const before=serializeWorld(w),r=reviseProject(ctx,request);expect(r.ok,mode).toBe(false);expect(serializeWorld(w),mode).toBe(before);
 }
});
it('shares the existing bounded reconsideration budget and cannot reset a pending retry',()=>{
 const {w,p,plan}=scene();plan.project!.retryAt=w.tick;let before=serializeWorld(w);expect(reviseProject(generateOptions(w,p,true,true),{planId:plan.id,quantity:2}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 w.tick+=240;plan.project!.retries=PROJECT_LIMITS.retries-1;expect(reviseProject(generateOptions(w,p,true,true),{planId:plan.id,quantity:2}).ok).toBe(true);
 before=serializeWorld(w);expect(reviseProject(generateOptions(w,p,true,true),{planId:plan.id,quantity:3}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});
it.each([false,true])('does not revise around paid/current physical work, suspended=%s',suspended=>{
 const {w,p,plan}=scene(),ctx=generateOptions(w,p,true,true),option=ctx.options.find(o=>o.kind==='operate'&&o.make);
 expect(option).toBeDefined();const a=option!.make!();expect(a).toBeTruthy();startActivity(w,p,a!);if(suspended)suspendActivity(w,p);
 const before=serializeWorld(w);expect(reviseProject(ctx,{planId:plan.id,quantity:2}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});
it('exposes only own saved plans, keeps old observation shapes, and rejects mixed or malformed answers',()=>{
 const {w,p,plan}=scene(),ctx=generateOptions(w,p,true,true),before=serializeWorld(w);
 const old=observeInhabitant(w,p,ctx,rankOptions(ctx),{version:17}),now=observeInhabitant(w,p,ctx,rankOptions(ctx));
 expect(old.canRevise).toBeUndefined();expect(now.canRevise).toEqual([{planId:plan.id,item:'planks',quantity:4,until:plan.until,reconsiderationsLeft:3}]);expect(serializeWorld(w)).toBe(before);
 expect(buildPrompt({observation:old}).user).not.toContain('"revise"');expect(buildPrompt({observation:now}).user).toContain('original deadline');expect(observationVersionFor(PROTOCOL_V31)).toBe(17);expect(observationVersionFor(PROTOCOL_V32)).toBe(17);
 expect(parseProposal(`{"revise":{"planId":${plan.id},"quantity":2},"why":"less is enough"}`).proposal?.revise).toEqual({planId:plan.id,quantity:2});
 for(const text of ['{"revise":null}','{"revise":{"planId":1,"quantity":1.5}}','{"revise":{"planId":1,"quantity":2,"item":"cart"}}','{"choose":"x","revise":{"planId":1,"quantity":2}}','{"propose":{"item":"cart"},"revise":{"planId":1,"quantity":2}}','{"revise":{"planId":1,"quantity":2},"limit":{"amount":1}}'])expect(parseProposal(text).problem,text).toBeTruthy();
});
it.each([false,true])('replays a revised plan through paid production, including memory=%s, and detects tampering',async memory=>{
 const f=scene();f.p.cooldowns.pause=0;f.p.nextThink=f.w.tick;const initial=serializeWorld(f.w);let revised=false;
 const model=stubModel('scripted-quantity-revision',req=>{const o=observationFromPrompt(req.user)!;
  if(!revised&&o.canRevise?.length){revised=true;return JSON.stringify({revise:{planId:o.canRevise[0].planId,quantity:2},why:'scripted: two planks are sufficient'});}
  const plan=o.plans?.find(p=>p.kind==='batch'&&p.status==='active'),step=plan&&o.options.find(x=>x.goal===`to ${plan.goal}`);return JSON.stringify({choose:step?.key??o.options[0]?.key??'wander',why:'scripted: follow legal plan step'});
 });
 let completed:{tick:number;reserve:number|undefined;until:number}|undefined;
 const r=await runLive(f.w,f.p.id,model,{until:f.plan.until,memory,onTick:w=>{const i=w.persons.find(p=>p.id===f.p.id)?.intentions.find(i=>i.id===f.plan.id);if(!completed&&i?.status==='done')completed={tick:w.tick,reserve:i.reserve,until:i.until};}}),t=r.transcript;
 expect(t.header.protocol).toBe(memory?'inhabitant/34':'inhabitant/33');expect(t.header.observationVersion).toBe(18);expect(t.end?.revised).toBe(1);expect(t.calls.filter(c=>c.result?.status==='revised')).toHaveLength(1);
 expect(completed).toMatchObject({reserve:2,until:f.plan.until});expect(completed!.tick).toBeLessThanOrEqual(f.plan.until);expect(r.world.ledger.consumed.wood).toBeGreaterThan(0);expect(conservationReport(r.world).ok).toBe(true);
 expect(hashWorld(runReplay(deserializeWorld(initial),t).world)).toBe(hashWorld(r.world));
 const bad=JSON.parse(JSON.stringify(t)) as Transcript;const choice=bad.calls.find(c=>c.choice.kind==='revise')!.choice;if(choice.kind==='revise')choice.revision.quantity=3;
 expect(()=>runReplay(deserializeWorld(initial),bad)).toThrow(ReplayDiverged);
});
