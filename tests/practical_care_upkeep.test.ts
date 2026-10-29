// Labelled staged evidence of existing rules 54. This does not assert natural activation or aggregate benefit.
import {expect,it} from 'vitest';
import {addPerson,building,done,site,stage} from './helpers/kit';
import {generateOptions} from '../src/sim/decision';
import {newActivity,startActivity} from '../src/sim/activities';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {stepWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {startBlocker} from '../src/sim/facilities';
import {RECIPE_BY_ID} from '../src/sim/recipes';
import {watchTick} from '../src/sim/responsibilities';
import {surplusOf} from '../src/sim/social';
import type {BuildingType} from '../src/sim/types';

function fixture(name:string) {
  const s=stage(name);s.w.settings.dynamics='rich';s.w.settings.rulesVersion=54;
  return s;
}

it.each(['kiln','smithy','timber_yard','granary','storehouse','hall'] as BuildingType[])('a known damaged shared %s offers physical repair, consuming owned materials',type=>{
  const s=fixture('shared-repair-'+type),p=addPerson(s,'Ada',40,40,{inv:{wood:5},age:35,hunger:100,thirst:100,energy:100,traits:{generosity:1}});
  const b=building(s,type,43,40);b.condition=30;
  const w=done(s);observe(w,p,b);perceive(w,p);
  const before=serializeWorld(w),o=generateOptions(w,p,true,true).options.find(o=>o.kind==='repair'&&o.targetId===b.id);
  expect(serializeWorld(w)).toBe(before);expect(o).toBeDefined();
  startActivity(w,p,o!.make!()!);
  for(let i=0;i<900&&p.activity;i++)stepWorld(w);
  expect(b.condition).toBeGreaterThan(30);
  expect(w.ledger.reasons['-repairs']).toBeGreaterThan(0);
  expect(conservationReport(w).ok).toBe(true);
});

it('repair restores useful operation: an unusable kiln fires real bricks and the saved repair continues exactly',()=>{
  const s=fixture('repair-then-use'),p=addPerson(s,'Ada',40,40,{inv:{wood:10},age:35,hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}});
  const kiln=building(s,'kiln',43,40,0,{clay:4,wood:2});kiln.condition=8;
  const house=site(s,'house',36,36,p.hhId,p.id,{wood:6,planks:8});
  const w=done(s);observe(w,p,kiln);observe(w,p,house);perceive(w,p);
  expect(startBlocker(w,kiln,p,RECIPE_BY_ID.fire_bricks)).toBe('too run down to use');
  const repair=generateOptions(w,p,true,true).options.find(o=>o.kind==='repair'&&o.targetId===kiln.id)!;
  expect(repair).toBeDefined();startActivity(w,p,repair.make!()!);
  for(let i=0;i<300&&p.activity?.phase!=='work';i++)stepWorld(w);
  expect(p.activity?.phase).toBe('work');
  const restored=deserializeWorld(serializeWorld(w));
  for(let i=0;i<1000&&p.activity?.kind==='repair';i++){stepWorld(w);stepWorld(restored);}
  expect(serializeWorld(w)).toBe(serializeWorld(restored));
  expect(conservationReport(w).ok).toBe(true);
  expect(startBlocker(w,kiln,p,RECIPE_BY_ID.fire_bricks)).toBe('');
  observe(w,p,kiln);perceive(w,p);
  const operate=generateOptions(w,p,true,true).options.find(o=>o.kind==='operate'&&o.targetId===kiln.id&&o.label.toLowerCase().includes('brick'));
  expect(operate).toBeDefined();startActivity(w,p,operate!.make!()!);
  for(let i=0;i<1200&&!(kiln.ops!.produced.bricks);i++)stepWorld(w);
  expect(kiln.ops!.produced.bricks).toBe(3);
  expect(w.ledger.reasons['-repairs']).toBeGreaterThan(0);
  expect(conservationReport(w).ok).toBe(true);
});

it('a capable household member physically gives bread to an injured elder, who can eat it; intermediate continuation is exact',()=>{
  const s=fixture('care-elder'),helper=addPerson(s,'Ada',40,40,{age:35,inv:{bread:5,water:3},hunger:100,thirst:100,energy:100});
  const elder=addPerson(s,'Eli',46,40,{age:72,hh:helper.hhId,hunger:20,thirst:70,energy:70});elder.health=30;
  elder.injury={kind:'sprain',since:0,until:5000,how:'staged injury'};
  const w=done(s);
  // A real resting activity, not cooldown.pause (which correctly means somebody is already attending to them).
  startActivity(w,elder,newActivity(w,elder,{kind:'rest',label:'Resting with an injury',goal:'to recover',here:true,minCommit:500,maxTicks:1000}));
  perceive(w,helper);
  const before=serializeWorld(w),give=generateOptions(w,helper,true,true).options.find(o=>o.kind==='give'&&o.targetId===elder.id&&o.tag==='care');
  expect(serializeWorld(w)).toBe(before);expect(give).toBeDefined();startActivity(w,helper,give!.make!()!);
  stepWorld(w);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<400&&!(elder.inv.bread);i++){stepWorld(w);stepWorld(copy);}
  expect(serializeWorld(w)).toBe(serializeWorld(copy));
  expect(elder.inv.bread,JSON.stringify({helper:{x:helper.x,y:helper.y,inv:helper.inv,activity:helper.activity,log:helper.log.slice(-4)},elder:{x:elder.x,y:elder.y,alive:elder.alive,inv:elder.inv,log:elder.log.slice(-4)}})).toBeGreaterThan(0);
  const eat=generateOptions(w,elder,true,true).options.find(o=>o.kind==='eat');expect(eat).toBeDefined();
  const hunger=elder.needs.hunger;elder.cooldowns.pause=0;startActivity(w,elder,eat!.make!()!);
  for(let i=0;i<120&&elder.activity;i++)stepWorld(w);
  expect(elder.needs.hunger).toBeGreaterThan(hunger+5);
  expect(w.ledger.reasons['-eaten']).toBeGreaterThan(0);
  expect(conservationReport(w).ok).toBe(true);
});

it('records the rules-54 childcare location defect: an accepted watch without location knowledge uses the child’s live position',()=>{
  const s=fixture('watch-unknown'),helper=addPerson(s,'Ada',20,20,{age:35}),child=addPerson(s,'Eli',65,65,{age:5});
  const w=done(s);helper.seen=[];helper.whereabouts={};
  helper.commitments.push({id:w.nextId++,requestId:0,kind:'work',to:child.id,item:null,amount:1,siteId:0,made:w.tick,deadline:5000,status:'active',destKind:'person',destId:child.id,milestone:'watched'});
  const watch=generateOptions(w,helper,true,true).options.find(o=>o.key===`watch:${child.id}`);
  // Historical characterization, not the desired successor contract. No remote location was communicated.
  expect(watch).toBeDefined();const a=watch!.make!()!;expect([a.tx,a.ty]).toEqual([65,65]);
});

it('records the rules-54 watch reserve defect at the transfer boundary',()=>{
  const s=fixture('watch-reserve'),helper=addPerson(s,'Ada',40,40,{age:35,inv:{bread:1},hunger:30});
  addPerson(s,'Own child',40,41,{age:5,hh:helper.hhId,hunger:20});
  const guest=addPerson(s,'Guest child',41,40,{age:5,hunger:20});
  const w=done(s);expect(surplusOf(w,helper,'bread')).toBe(0);
  const a=newActivity(w,helper,{kind:'visit',label:'Staged accepted watch',goal:'look after the guest',targetId:guest.id,here:true,data:{watch:true}});
  a.progress=49;watchTick(w,helper,a,guest);
  // Historical characterization: a later rules boundary must preserve this old result and protect reserves in new worlds.
  expect(helper.inv.bread??0).toBe(0);expect(guest.inv.bread).toBe(1);expect(conservationReport(w).ok).toBe(true);
});
