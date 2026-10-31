// Proposed projects (docs/PROPOSED_PROJECTS.md): an outside controller may propose one bounded production goal; the engine validates
// it from the person's own knowledge with the planner it already has, adopts it as the ordinary batch plan or refuses it with a
// reason, chooses this moment's action itself, and from the next moment offers the plan's own steps. Nothing is made by proposing.
import {expect,it} from 'vitest';
import {cartProjectScene} from './helpers/cart_project';
import {proposeProject,proposableItems} from '../src/sim/proposals';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {setExternalController} from '../src/sim/external';
import type {ExternalNote} from '../src/sim/external';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {observe} from '../src/sim/knowledge';
import {stepWorld,hashWorld} from '../src/sim/world';
import {runLive,runReplay} from '../src/agent/run';
import {proposerModel,pickerModel} from '../src/agent/stubs';
import {buildPrompt,parseProposal,PROTOCOL_V31,PROTOCOL_V32,observationVersionFor} from '../src/agent/protocol';
import {observeInhabitant,OBSERVATION_VERSION} from '../src/agent/observe';
import {ReplayDiverged} from '../src/agent/transcript';
import type {Transcript} from '../src/agent/transcript';
const plan=(f:ReturnType<typeof cartProjectScene>)=>f.p.intentions.find(i=>i.kind==='batch'&&i.status==='active');
/** the scene with the heavy site demand declared small, so the planner has no cart want of its own and only a proposal can start one */
function fresh(version=99){const f=cartProjectScene(version);f.target.required.stone=6;observe(f.w,f.p,f.target);f.p.cooldowns.pause=1e12;return f;}
it('a valid proposal is adopted through the ordinary gates as the ordinary plan, and nothing is made or written by the proposal itself',()=>{
 const f=fresh();for(let n=0;n<100;n++)stepWorld(f.w);expect(plan(f)).toBeUndefined(); // the planner has no want of its own here
 const ctx=generateOptions(f.w,f.p,true,true);
 expect(proposableItems(ctx)).toEqual(expect.arrayContaining(['cart','planks','handles']));expect(proposableItems(ctx)).not.toContain('bricks');
 const before=serializeWorld(f.w);
 for(const [goal,reason] of [[{item:'unobtainium',quantity:1,tier:0},/unknown project item/],[{item:'cart',quantity:0,tier:0},/outside its bounded range/],[{item:'cart',quantity:25,tier:0},/outside its bounded range/],[{item:'planks',quantity:1,tier:1},/quality requires a tool/],[{item:'bricks',quantity:2,tier:0},/no personally known way|kiln/],[{item:'flour',quantity:2,tier:0},/no personally known way/],[{item:'wood',quantity:2,tier:0},/simply fetched/],[{item:'hammer',quantity:1,tier:0},/already has/]] as const){
  const r=proposeProject(ctx,goal);expect(r.ok,JSON.stringify(goal)).toBe(false);if(!r.ok)expect(r.reason).toMatch(reason);
 }
 expect(serializeWorld(f.w)).toBe(before);expect(plan(f)).toBeUndefined();
 const r=proposeProject(ctx,{item:'cart',quantity:1,tier:0});expect(r.ok).toBe(true);if(!r.ok)return;
 expect(r.plan).toMatchObject({kind:'batch',makes:'cart',reason:'proposed from outside',status:'active'});expect(r.plan.project?.goal).toEqual({item:'cart',quantity:1,tier:0});
 expect(f.w.carts).toHaveLength(0);expect(f.w.ledger.created.cart??0).toBe(0);
 // a second proposal: the same item is a repeat, another batch is refused by the one-batch rule
 expect(proposeProject(ctx,{item:'cart',quantity:1,tier:0})).toMatchObject({ok:false,reason:'already seeing cart through'});
 expect(proposeProject(ctx,{item:'planks',quantity:2,tier:0})).toMatchObject({ok:false,reason:'there is never more than one batch'});
 // below rules 69 nothing can be proposed
 const old=fresh(68);expect(proposeProject(generateOptions(old.w,old.p,true,true),{item:'cart',quantity:1,tier:0})).toMatchObject({ok:false,reason:'these rules do not run production projects'});
 expect(proposableItems(generateOptions(old.w,old.p,true,true))).toEqual([]);
});
it('through the controller seam: adoption is notified, this moment is the engine\'s own choice, the plan\'s steps are offered next, and a refusal counts as a retry',()=>{
 const f=fresh();const notes:ExternalNote[]=[];let asked=0;
 const release=setExternalController({controls:(_w,p)=>p.id===f.p.id,choose:()=>{asked++;return asked===1?{kind:'propose',goal:{item:'bricks',quantity:2,tier:0}}:asked===2?{kind:'propose',goal:{item:'cart',quantity:1,tier:0}}:{kind:'fallback',reason:'scripted'};},notify:(_w,_p,n)=>notes.push(n)});
 try{f.p.cooldowns.pause=0;f.p.nextThink=f.w.tick;stepWorld(f.w);}finally{release();}
 expect(notes[0]).toMatchObject({kind:'rejected',key:'propose:bricks'});expect(notes[1],JSON.stringify(notes)).toMatchObject({kind:'proposed',goal:{item:'cart',quantity:1,tier:0}});
 const n=notes[1] as Extract<ExternalNote,{kind:'proposed'}>;expect(n.planId).toBe(plan(f)!.id);expect(n.activity).toBe(f.p.activity);expect(String(f.p.activity?.data.why)).not.toMatch(/chosen from outside/); // the engine's own choice this moment, not one picked from outside
 // from the next decision the plan's own step is among the options, carrying the plan's goal
 const ctx=generateOptions(f.w,f.p,true,true);expect(ctx.options.some(o=>o.goal===`to ${plan(f)!.goal}`)).toBe(true);
 expect(conservationReport(f.w).ok).toBe(true);expect(serializeWorld(deserializeWorld(serializeWorld(f.w)))).toBe(serializeWorld(f.w));
});
it('the inhabitant protocol carries it: the scripted proposer records a replayable run in which the cart is built from the proposed plan',async()=>{
 const f=fresh();f.p.cooldowns.pause=0;const start=serializeWorld(f.w);
 const r=await runLive(f.w,f.p.id,proposerModel({item:'cart',quantity:1,tier:0}),{until:f.w.tick+3*2400});
 const t=r.transcript;expect(t.header.protocol).toBe(PROTOCOL_V31);expect(t.header.observationVersion).toBe(17);expect(observationVersionFor(PROTOCOL_V32)).toBe(17);expect(OBSERVATION_VERSION).toBe(17);
 const proposed=t.calls.filter(c=>c.result?.status==='proposed');expect(proposed).toHaveLength(1);expect(proposed[0].choice).toEqual({kind:'propose',goal:{item:'cart',quantity:1,tier:0}});
 expect(t.asks[proposed[0].ask].observation.canPropose?.items).toContain('cart');expect(t.end?.proposed).toBe(1);
 const steps=t.calls.filter(c=>c.result?.status==='applied'&&/scripted: a step of my plan/.test(t.asks[c.ask].proposal?.why??''));expect(steps.length).toBeGreaterThan(2);
 const repeats=t.calls.filter(c=>c.result?.status==='rejected'&&c.choice.kind==='propose');expect(repeats.length).toBeGreaterThan(3);const reasons=new Set(repeats.map(c=>c.result?.reason));expect(reasons.has('a batch plan ended less than a day ago')).toBe(true);for(const why of reasons)expect(why).toMatch(/^(a batch plan ended less than a day ago|already holding as many plans as one person keeps|one project at a time|not while something is actually wrong|no personally known way to obtain \w+|already seeing cart through)$/);
 expect(r.world.carts).toHaveLength(1);expect(r.world.carts[0].ownerHh).toBe(f.p.hhId);expect(r.world.ledger.consumed.planks).toBe(4);expect(conservationReport(r.world).ok).toBe(true);
 // exact replay from the transcript with no model; a tampered proposal is caught
 expect(hashWorld(runReplay(deserializeWorld(start),t).world)).toBe(hashWorld(r.world));
 const tampered=JSON.parse(JSON.stringify(t)) as Transcript;const c=tampered.calls.find(c=>c.result?.status==='proposed')!;(c.choice as {goal:{quantity:number}}).goal.quantity=2;
 expect(()=>runReplay(deserializeWorld(start),tampered)).toThrow(ReplayDiverged);
});
it('a proposal under an older protocol falls back; the answer shape is strict; the prompt names proposing only when the observation carries it',async()=>{
 const f=fresh();f.p.cooldowns.pause=0;
 // a recording that speaks inhabitant/29 is replayed by its own shape and the model answer "propose" is refused as a fallback there
 const r=await runLive(f.w,f.p.id,pickerModel('first'),{until:f.w.tick+60});
 const ctx=generateOptions(r.world,f.p,true,true),obs16=observeInhabitant(r.world,f.p,ctx,rankOptions(ctx),{version:16}),obs17=observeInhabitant(r.world,f.p,ctx,rankOptions(ctx));
 expect(obs16.canPropose).toBeUndefined();expect(obs17.canPropose?.quantity).toEqual({min:1,max:24});
 expect(buildPrompt({observation:obs16}).user).not.toMatch(/propose/);expect(buildPrompt({observation:obs17}).user).toMatch(/you may propose one project of your own/);
 expect(parseProposal('{"propose":{"item":"cart"},"why":"x"}').proposal).toEqual({choose:'propose:cart',propose:{item:'cart',quantity:1,tier:0},why:'x'});
 expect(parseProposal('{"propose":{"item":"cart","quantity":2.5}}').problem).toMatch(/whole number/);expect(parseProposal('{"propose":{"item":"cart","tier":2}}').problem).toMatch(/0 or 1/);
 expect(parseProposal('{"choose":"wander","propose":{"item":"cart"}}').problem).toMatch(/both chooses and proposes/);expect(parseProposal('{"propose":"cart"}').problem).toMatch(/not an object/);
 expect(parseProposal('{"propose":{"item":""}}').problem).toMatch(/propose.item/);
});
