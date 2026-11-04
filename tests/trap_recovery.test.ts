import {expect,it} from 'vitest';
import {trapRecoveryScene} from './helpers/trap_recovery';
import {generateOptions} from '../src/sim/decision';
import {startActivity,stepActivity,newActivity} from '../src/sim/activities';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport,consume,produce} from '../src/sim/economy';
import {delBelief} from '../src/sim/knowledge';
import {learn} from './helpers/kit';
function perform(s:ReturnType<typeof trapRecoveryScene>,key:string){
 const o=generateOptions(s.w,s.p,true,true).options.find(o=>o.key===key);expect(o,key).toBeDefined();startActivity(s.w,s.p,o!.make!()!);
 for(let i=0;i<1000&&s.p.activity;i++){s.w.tick++;stepActivity(s.w,s.p);}
 expect(s.p.lastResult?.outcome).toBe('success');
}
it('turns a checked known catch into recovery instead of an impossible reset',()=>{
 const s=trapRecoveryScene(150),before=serializeWorld(s.w),ctx=generateOptions(s.w,s.p,true,true);
 expect(ctx.options.some(o=>o.key===`gear:reset:${s.gear.id}`)).toBe(false);
 const recover=ctx.options.find(o=>o.key===`butcher:${s.body.id}:meat`)!;
 expect(recover.goal).toMatch(/trap/);expect(serializeWorld(s.w)).toBe(before);expect(recover.make!()!.amount).toBe(4);
});
it('recovers finite trap meat, eats a real portion, and resets only after recovering the body',()=>{
 const s=trapRecoveryScene(150);perform(s,`butcher:${s.body.id}:meat`);expect(s.p.inv.meat).toBe(4);
 consume(s.w,s.p.inv,'berries',3,'staged previous meals');s.p.needs.hunger=30;
 startActivity(s.w,s.p,newActivity(s.w,s.p,{kind:'eat',label:'Eat recovered catch',goal:'eat',here:true,data:{limit:{portions:1}}}));
 for(let i=0;i<80&&s.p.activity;i++){s.w.tick++;stepActivity(s.w,s.p);}
 expect(s.w.ledger.consumed.meat).toBe(1);
 perform(s,`butcher:${s.body.id}:hide`);perform(s,`butcher:${s.body.id}:fat`);learn(s.w,s.p,s.gear,s.body);
 perform(s,`gear:reset:${s.gear.id}`);expect(s.gear.gear!.cycle).toBe(2);expect(s.w.ledger.created.meat).toBe(4);
 expect(conservationReport(s.w).ok).toBe(true);expect(serializeWorld(deserializeWorld(serializeWorld(s.w)))).toBe(serializeWorld(s.w));
});
it('keeps rules 149 reset planning unchanged',()=>{
 const s=trapRecoveryScene(149);expect(generateOptions(s.w,s.p,true,true).options.some(o=>o.key===`gear:reset:${s.gear.id}`)).toBe(true);
});
it('does not invent knowledge of an unseen catch or changed distant ownership',()=>{
 const s=trapRecoveryScene(150);delBelief(s.p,s.body.id);
 expect(generateOptions(s.w,s.p,true,true).options.some(o=>o.kind==='butcher'&&o.goal.includes('trap'))).toBe(false);
 learn(s.w,s.p,s.body);s.body.carcass!.hhId+=999;
 const o=generateOptions(s.w,s.p,true,true).options.find(o=>o.kind==='butcher'&&o.goal.includes('trap'))!;
 expect(o).toBeDefined();startActivity(s.w,s.p,o.make!()!);
 for(let i=0;i<200&&s.p.activity;i++){s.w.tick++;stepActivity(s.w,s.p);}
 expect(s.p.lastResult?.outcome).toBe('failed');expect(s.p.inv.meat??0).toBe(0);expect(s.body.carcass!.remaining.meat).toBe(4);
});
it('does not promise recovery into a full pack or reset through the known body',()=>{
 const s=trapRecoveryScene(150);produce(s.w,s.p.inv,999,'stone',30,'staged full pack');
 const ctx=generateOptions(s.w,s.p,true,true);
 expect(ctx.options.some(o=>o.kind==='butcher'||o.key===`gear:reset:${s.gear.id}`)).toBe(false);
 expect(ctx.blocked.some(o=>o.blocked==='recover the known catch first')).toBe(true);
 expect(conservationReport(s.w).ok).toBe(true);
});
