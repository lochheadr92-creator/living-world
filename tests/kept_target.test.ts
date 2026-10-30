// Rules 60 (kept_target.ts): the source, water spot or store a running activity is already about stays on the table past the
// generators' top-k cuts, so the ordinary review scores it honestly instead of as nothing. Staged: a person sent to a far tree
// while it is the only tree she knows; two nearer trees then come into her knowledge and push the far one past the top-two cut.
import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,site,done,pin} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {observe} from '../src/sim/knowledge';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {rankWaterSpots} from '../src/sim/optutil';
import {keepCurrent,setKeptTarget} from '../src/sim/kept_target';
import {serializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {parseIntervention} from '../scripts/lab/lab';
import type {Activity,Person,World} from '../src/sim/types';
afterEach(()=>{setKeptTarget(true);setExternalController(null);});

/** a woman wanting wood for her household's site, who knows one far tree and is walking to it when two nearer ones come into view */
function farTreeScene(version:number){
 const s=stage('kept-target'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;w.tick=1000;
 const p=addPerson(s,'Hana',40.5,40.5,{age:30,hunger:100,thirst:100,energy:100,traits:{diligence:0.9}});
 const target=site(s,'hut',44,34,p.hhId,p.id);target.required.wood=12;
 // the far tree is 18 tiles off; the two nearer ones (11 and 10 off) sit beyond her sensing radius, so she learns them only when told
 const far=makeSource(w,'tree',40,58,8),nearA=makeSource(w,'tree',30,45,8),nearB=makeSource(w,'tree',50,44,8);
 done(s);observe(w,p,target);observe(w,p,far);pin(p);p.cooldowns.trade=1e12;
 w.sceneLabel='TEST SCENE: a walk to a far tree, with nearer trees learned on the way (staged)';
 return {s,w,p,target,far,nearA,nearB};
}
function start(w:World,p:Person,key:string){
 const option=generateOptions(w,p,true,true).options.find(o=>o.key===key);
 if(!option)throw new Error(`Not offered: ${key}`);
 let picked=false;
 const restore=setExternalController({controls:(_w,q)=>q.id===p.id,choose:()=>{if(picked)return {kind:'defer'};picked=true;return {kind:'pick',key};}});
 try{p.cooldowns.pause=0;p.nextThink=w.tick;stepWorld(w);if(p.activity?.data.optKey!==key)throw new Error(`Not started: ${key}`);}finally{restore();}
 pin(p);
}

it('keeps the tree a running trip is about on the table at rules 60, and not below it',()=>{
 for(const version of [59,60]){
  const f=farTreeScene(version);start(f.w,f.p,`gather:${f.far.id}`);
  expect(f.p.activity?.kind).toBe('gather');expect(f.p.activity?.targetId).toBe(f.far.id);
  observe(f.w,f.p,f.nearA);observe(f.w,f.p,f.nearB);
  const before=serializeWorld(f.w),ctx=generateOptions(f.w,f.p,true,true);
  const keys=ctx.options.filter(o=>o.kind==='gather'&&o.yields==='wood').map(o=>o.key);
  expect(keys).toContain(`gather:${f.nearA.id}`);expect(keys).toContain(`gather:${f.nearB.id}`);
  expect(keys.includes(`gather:${f.far.id}`)).toBe(version===60);
  expect(serializeWorld(f.w)).toBe(before);
 }
});

it('a kept target is scored like any other and is dropped once its premise is gone',()=>{
 const f=farTreeScene(60);start(f.w,f.p,`gather:${f.far.id}`);observe(f.w,f.p,f.nearA);observe(f.w,f.p,f.nearB);
 const ctx=generateOptions(f.w,f.p,true,true),kept=ctx.options.find(o=>o.key===`gather:${f.far.id}`)!,near=ctx.options.find(o=>o.key===`gather:${f.nearA.id}`)!;
 expect(kept.util).toBeGreaterThan(0);expect(kept.parts.some(([name])=>name==='walking')).toBe(true);expect(kept.util).toBeLessThan(near.util); // the far tree is a longer walk, and says so
 f.p.beliefs[f.far.id].amount=0; // believed bare: no longer a candidate at all
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`gather:${f.far.id}`)).toBe(false);
});

it('the review holds the trip at rules 60 where rules 59 turned round for the nearer tree',()=>{
 const outcomes:Record<number,string>={};
 for(const version of [59,60]){
  const f=farTreeScene(version);start(f.w,f.p,`gather:${f.far.id}`);
  for(let i=0;i<85;i++)stepWorld(f.w); // past the 80-tick minimum commitment (options_work.ts), still walking: 14 tiles at 0.13 a tick
  observe(f.w,f.p,f.nearA);observe(f.w,f.p,f.nearB);
  const id=f.p.activity!.id;f.p.cooldowns.pause=0;reviewActivity(f.w,f.p);
  outcomes[version]=f.p.activity?.id===id?'held':`${f.p.lastResult?.outcome}: ${f.p.lastResult?.detail} -> ${f.p.activity?.data.optKey}`;
  expect(conservationReport(f.w).ok).toBe(true);
 }
 expect(outcomes[59].startsWith('interrupted: something better came up')).toBe(true);
 expect(outcomes[60]).toBe('held');
});

it('the lab switch restores the plain cut at rules 60 and changes nothing at 59; danger still interrupts',()=>{
 const restore=parseIntervention('rich-no-kept-target').install!();
 try{
  for(const version of [59,60]){
   const f=farTreeScene(version);start(f.w,f.p,`gather:${f.far.id}`);observe(f.w,f.p,f.nearA);observe(f.w,f.p,f.nearB);
   expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`gather:${f.far.id}`)).toBe(false);
  }
 }finally{restore();}
 const f=farTreeScene(60);start(f.w,f.p,`gather:${f.far.id}`);observe(f.w,f.p,f.nearA);observe(f.w,f.p,f.nearB);
 expect(generateOptions(f.w,f.p,true,true).options.some(o=>o.key===`gather:${f.far.id}`)).toBe(true);
});

it('a running drink trip keeps its spot past the water limit, by its own key only',()=>{
 const f=farTreeScene(60),{w,p}=f;
 const spots=rankWaterSpots(generateOptions(w,p,true,true),99);
 if(spots.length<3)return; // the flat test world must know at least three spots for the cut to bite; otherwise there is nothing to show
 const last=spots[spots.length-1];
 p.activity={id:w.nextId++,kind:'drink',label:'staged walk to the far water',goal:'',targetId:last.b.id,targetType:'spot',tx:last.b.x,ty:last.b.y,spotX:last.b.x,spotY:last.b.y,phase:'travel',started:w.tick,minCommit:0,maxTicks:500,utility:10,progress:0,duration:0,cycle:0,need:'thirst',blocked:'',data:{optKey:`drink:${last.b.id}`}} as never;
 expect(rankWaterSpots(generateOptions(w,p,true,true),2).some(c=>c.b.id===last.b.id)).toBe(true);
 (p.activity as Activity).data.optKey=`gather:${last.b.id}`;
 expect(rankWaterSpots(generateOptions(w,p,true,true),2).some(c=>c.b.id===last.b.id)).toBe(false);
 p.activity=null;
});

it('keepCurrent is a plain top-k without a running activity or below rules 60',()=>{
 const f=farTreeScene(60);const ctx=generateOptions(f.w,f.p,true,true);
 expect(keepCurrent(ctx,[1,2,3,4],2,(n)=>`x:${n}`)).toEqual([1,2]);
 f.p.activity={data:{optKey:'x:4'}} as never;
 expect(keepCurrent({...ctx,p:f.p},[1,2,3,4],2,(n)=>`x:${n}`)).toEqual([1,2,4]);
 f.w.settings.rulesVersion=59;
 expect(keepCurrent({...ctx,p:f.p},[1,2,3,4],2,(n)=>`x:${n}`)).toEqual([1,2]);
 f.p.activity=null;
});
