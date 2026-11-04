import {demandsOf} from '../src/sim/production';
import {gearTick} from '../src/sim/passive_gear';
import {startActivity,stepActivity} from '../src/sim/activities';
import {conservationReport,produce,ledgerCreate} from '../src/sim/economy';
import {expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {makeSource} from '../src/sim/sources';
import {makeWolf} from '../src/sim/wildlife';
import {mintTool} from '../src/sim/tools';
import {perceive} from '../src/sim/perception';
import {rebuildMobileGrid} from '../src/sim/registry';
import {generateOptions,reviewActivity} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
function scene(){const s=stage('trap-ground');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:127};const p=addPerson(s,'Ada',40.5,40.5,{hunger:70,thirst:90,energy:90});const near=makeSource(s.w,'tree',41,40,5),ground=makeSource(s.w,'tree',46,40,5);const t=mintTool(s.w,'trap',0,p.hhId,p.id,p.inv,p.id,'fixture',false);done(s);learn(s.w,p,near,ground);return {...s,p,near,ground,t};}
it('uses a personally witnessed deer ground rather than the closest tree',()=>{
 const {w,p,near,ground,t}=scene(),deer=makeWolf(w,46.5,41.5,'deer');rebuildMobileGrid(w);perceive(w,p);
 const option=generateOptions(w,p,true,true).options.find(o=>o.kind==='gear_work'&&o.key.startsWith('gear:place'));
 expect(option?.targetId).toBe(ground.id);expect(option?.targetId).not.toBe(near.id);expect(option?.goal).toContain('deer');expect(p.beliefs[deer.id]?.kind).toBe('prey');
 deer.x=80;deer.y=70;rebuildMobileGrid(w);const saved=serializeWorld(w);generateOptions(w,p,true,true);describePerson(w,p.id);expect(serializeWorld(w)).toBe(saved);
 expect(generateOptions(w,p,true,true).options.some(o=>o.key===`gear:place:${t.id}:${ground.id}`)).toBe(true);
 expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
it('does not invent wildlife knowledge from an unobserved live deer',()=>{
 const {w,p}=scene();makeWolf(w,80,70,'deer');rebuildMobileGrid(w);perceive(w,p);
 expect(Object.values(p.beliefs).some(b=>b.kind==='prey')).toBe(false);expect(generateOptions(w,p,true,true).options.some(o=>o.kind==='gear_work'&&o.key.startsWith('gear:place'))).toBe(false);
});
it('keeps at most four dated deer sightings and does not grant this memory to old rules',()=>{
 const {w,p}=scene();for(let n=0;n<8;n++){w.tick++;makeWolf(w,44+n*.1,42,'deer');rebuildMobileGrid(w);perceive(w,p);}
 expect(Object.values(p.beliefs).filter(b=>b.kind==='prey')).toHaveLength(4);expect(p.bykind.prey).toHaveLength(4);
 const old=scene();old.w.settings.rulesVersion=126;const deer=makeWolf(old.w,44,42,'deer');rebuildMobileGrid(old.w);perceive(old.w,old.p);expect(old.p.beliefs[deer.id]).toBeUndefined();
});

it('walks to witnessed ground, places and checks the trap, and recovers a real body',()=>{
 const {w,p,ground}=scene(),deer=makeWolf(w,46.5,41.5,'deer');rebuildMobileGrid(w);perceive(w,p);
 const start=(key:string)=>{const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);expect(o,key).toBeDefined();startActivity(w,p,o!.make!()!);};
 const finish=()=>{for(let n=0;n<1000&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.activity).toBeNull();};
 const placement=generateOptions(w,p,true,true).options.find(o=>o.kind==='gear_work')!;startActivity(w,p,placement.make!()!);finish();const b=w.piles.find(b=>b.gear)!;expect(b.gear!.sourceId).toBe(ground.id);
 for(let n=0;n<10&&!w.piles.some(b=>b.carcass);n++){
  w.tick=b.gear!.readyAt;gearTick(w);learn(w,p,b);start(`gear:check:${b.id}`);finish();if(!w.piles.some(b=>b.carcass)){start(`gear:reset:${b.id}`);finish();}
 }
 const body=w.piles.find(b=>b.carcass)!;expect(body).toBeDefined();expect(body.carcass!.animalId).toBe(deer.id);rebuildMobileGrid(w);perceive(w,p);start(`butcher:${body.id}:meat`);finish();expect(p.inv.meat).toBe(1);expect(w.animals).not.toContain(deer);expect(conservationReport(w).ok).toBe(true);
});
it('refuses future or old-rules deer memories rather than granting knowledge on load',()=>{
 const {w,p}=scene(),deer=makeWolf(w,44,42,'deer');rebuildMobileGrid(w);perceive(w,p);const b=p.beliefs[deer.id];b.seen=w.tick+1;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/deer sighting/);b.seen=w.tick;w.settings.rulesVersion=126;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/deer sighting/);
});

it('does not commission another trap without any witnessed ground to use it',()=>{
 const {w,p,t}=scene();p.inv.trap=0;w.tools=w.tools.filter(x=>x!==t);
 expect(demandsOf(generateOptions(w,p,true,true)).some(d=>d.item==='trap')).toBe(false);
 const deer=makeWolf(w,46.5,41.5,'deer');rebuildMobileGrid(w);perceive(w,p);expect(p.beliefs[deer.id]).toBeDefined();
 expect(demandsOf(generateOptions(w,p,true,true)).some(d=>d.item==='trap')).toBe(true);
});

it('keeps the selected trap ground eligible while a newer sighting moves away',()=>{
 const {w,p,ground}=scene();w.settings.rulesVersion=128;
 const deer=makeWolf(w,46.5,41.5,'deer'),newGround=makeSource(w,'tree',40,46,5);ledgerCreate(w,'wood',5,'additional staged tree');learn(w,p,newGround);rebuildMobileGrid(w);perceive(w,p);
 const first=generateOptions(w,p,true,true).options.find(o=>o.key.startsWith('gear:place'))!;
 expect(first.targetId).toBe(ground.id);const a=first.make!()!;a.data.optKey=first.key;startActivity(w,p,a);
 deer.x=40.5;deer.y=46.5;w.tick++;rebuildMobileGrid(w);perceive(w,p);
 const before=serializeWorld(w),ctx=generateOptions(w,p,true,true);
 expect(ctx.options.some(o=>o.key===first.key)).toBe(true);
 expect(ctx.options.some(o=>o.targetId===newGround.id&&o.key.startsWith('gear:place'))).toBe(true);
 expect(serializeWorld(w)).toBe(before);
 expect(ctx.options.filter(o=>o.key.startsWith('gear:place'))).toHaveLength(2);
 w.tick+=30;reviewActivity(w,p);expect(p.activity?.id).toBe(a.id);
 const restored=deserializeWorld(serializeWorld(w));expect(serializeWorld(restored)).toBe(serializeWorld(w));
 const q=restored.persons.find(q=>q.id===p.id)!;q.needs.thirst=0;produce(restored,q.inv,999,'water',1,'staged emergency water');
 reviewActivity(restored,q);expect(q.activity?.id).not.toBe(a.id);expect(q.activity?.need).toBe('thirst');
 for(let n=0;n<500&&p.activity?.id===a.id;n++){w.tick++;stepActivity(w,p);}
 expect(w.piles.find(b=>b.gear)?.gear?.sourceId).toBe(ground.id);expect(conservationReport(w).ok).toBe(true);
});
