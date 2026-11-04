import {expect,it} from 'vitest';
import {stage,addPerson,done,learn} from './helpers/kit';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {makeSource} from '../src/sim/sources';
import {makeWolf} from '../src/sim/wildlife';
import {mintTool} from '../src/sim/tools';
import {startActivity,stepActivity,newActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {gearTick} from '../src/sim/passive_gear';
import {hashString,hashUnit} from '../src/sim/rng';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,ledgerSpoil} from '../src/sim/economy';
import {describeEntity} from '../src/sim/inspect';
import {unregisterPile} from '../src/sim/registry';
function scene(){
 const s=stage('trap-window'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:CURRENT_RULES_VERSION};
 const p=addPerson(s,'Ada',40.5,40.5,{hunger:65,thirst:90,energy:90}),ground=makeSource(w,'tree',41,40,5),deer=makeWolf(w,42.5,41.5,'deer');
 const t=mintTool(w,'trap',0,p.hhId,p.id,p.inv,p.id,'staged initial gear',false);done(s);learn(w,p,ground,deer);
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`gear:place:${t.id}:${ground.id}`)!;expect(o).toBeDefined();startActivity(w,p,o.make!()!);
 for(let n=0;n<500&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.lastResult?.outcome).toBe('success');
 const pile=w.piles.find(b=>b.gear)!;return {w,p,deer,pile};
}
it('can catch a real deer encountered during the paid armed window, without waiting for one final instant',()=>{
 const {w,p,deer,pile}=scene();
 // Explicitly document which deterministic fixture outcome this contract exercises.
 expect(hashUnit(hashString(w.seed)^0x79ae,pile.id+pile.gear!.cycle,deer.id)).toBeLessThan(.55);
 w.tick++;gearTick(w);expect(w.animals).not.toContain(deer);expect(pile.gear!.bodyId).not.toBeNull();
 expect(p.beliefs[pile.id].gear!.state).toBe('armed');expect(p.beliefs[pile.gear!.bodyId!]).toBeUndefined();
 const saved=serializeWorld(w);expect(describeEntity(w,pile.id)!.rows).toContainEqual(['Ready to check','Now']);expect(serializeWorld(w)).toBe(saved);
});
it('keeps an early captured body and its single origin exact across save/load',()=>{
 const {w,pile}=scene();w.tick++;gearTick(w);expect(w.piles.filter(b=>b.carcass)).toHaveLength(1);
 const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);
 for(let n=0;n<700;n++){w.tick++;copy.tick++;gearTick(w);gearTick(copy);}
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(w.piles.filter(b=>b.carcass)).toHaveLength(1);expect(w.ledger.created.meat).toBe(4);expect(conservationReport(w).ok).toBe(true);
 expect(pile.gear!.state).toBe('ready');
});
it('keeps an empty resolution finite and cannot catch a deer arriving after it',()=>{
 const {w,pile,deer}=scene();deer.x=70;deer.y=70;w.tick=pile.gear!.readyAt;gearTick(w);expect(pile.gear!.state).toBe('ready');
 deer.x=pile.x+.5;deer.y=pile.y+.5;for(let n=0;n<100;n++){w.tick++;gearTick(w);}
 expect(w.animals).toContain(deer);expect(pile.gear!.bodyId).toBeNull();expect(conservationReport(w).ok).toBe(true);
});
it('preserves predecessor resolution at the final tick only',()=>{
 const {w,pile,deer}=scene();w.settings.rulesVersion=130;w.tick++;gearTick(w);expect(w.animals).toContain(deer);expect(pile.gear!.bodyId).toBeNull();
 w.tick=pile.gear!.readyAt;gearTick(w);expect(w.animals).not.toContain(deer);
});
it('does not reroll a failed deer/cycle outcome on later encounters or reload',()=>{
 const {w,pile,deer}=scene();deer.x=70;deer.y=70;
 let denied=makeWolf(w,70,70,'deer');
 for(let n=0;n<32&&hashUnit(hashString(w.seed)^0x79ae,pile.id+pile.gear!.cycle,denied.id)<.55;n++)denied=makeWolf(w,70,70,'deer');
 expect(hashUnit(hashString(w.seed)^0x79ae,pile.id+pile.gear!.cycle,denied.id)).toBeGreaterThanOrEqual(.55);
 denied.x=pile.x+.5;denied.y=pile.y+.5;
 for(let n=0;n<300;n++){w.tick++;gearTick(w);}
 const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(serializeWorld(copy)).toBe(saved);
 while(w.tick<pile.gear!.readyAt){w.tick++;copy.tick++;gearTick(w);gearTick(copy);}
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(pile.gear!.bodyId).toBeNull();expect(w.animals).toContain(denied);
 expect(pile.gear!.state).toBe('ready');expect(conservationReport(w).ok).toBe(true);
});
it('rejects premature resolution without the actual matching caught body',()=>{
 const {w,pile}=scene();w.tick++;gearTick(w);expect(pile.gear!.bodyId).not.toBeNull();
 const id=pile.gear!.bodyId!;pile.gear!.bodyId=null;expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear/);
 pile.gear!.bodyId=id;const body=w.piles.find(b=>b.id===id)!;body.carcass!.hhId++;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow(/gear/);
});
it('does not retroactively catch a deer when first processed beyond the window',()=>{
 const {w,pile,deer}=scene();w.tick=pile.gear!.readyAt+1;gearTick(w);
 expect(w.animals).toContain(deer);expect(pile.gear!.state).toBe('ready');expect(pile.gear!.bodyId).toBeNull();
});
it('can save after external body loss and a new paid check/reset before the original deadline',()=>{
 const {w,p,pile}=scene();w.tick++;gearTick(w);const body=w.piles.find(b=>b.carcass)!;
 for(const [part,n] of Object.entries(body.carcass!.remaining))ledgerSpoil(w,part as 'meat'|'hide'|'fat',n,'staged external loss of body');
 unregisterPile(w,body);expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
 const originalDeadline=pile.gear!.readyAt;
 for(const op of ['check','reset']){
  startActivity(w,p,newActivity(w,p,{kind:'gear_work',label:op,goal:'use paid gear',here:true,targetId:pile.id,targetType:'pile',data:{op}}));
  for(let n=0;n<100&&p.activity;n++){w.tick++;stepActivity(w,p);}expect(p.lastResult?.outcome).toBe('success');
 }
 expect(w.tick).toBeLessThan(originalDeadline);expect(pile.gear!.cycle).toBe(2);expect(pile.gear!.catchTick).toBeNull();
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));expect(conservationReport(w).ok).toBe(true);
});
