import {afterEach,expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {practicalCareScene} from './helpers/practical_care';
import {communicateWatchLocation,setPracticalCare,watchTick} from '../src/sim/responsibilities';
import {newActivity,startActivity} from '../src/sim/activities';
import {generateOptions} from '../src/sim/decision';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {parseIntervention} from '../scripts/lab/lab';
import {fulfillCommitment} from '../src/sim/social';
import {carryCap} from '../src/sim/people';
import {ledgerCreate} from '../src/sim/economy';
afterEach(()=>setPracticalCare(true));

function reserveScene(version:number,bread=1){
 const s=stage('watch-reserve');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const helper=addPerson(s,'Ada',40,40,{age:35,inv:{bread},hunger:30});
 addPerson(s,'Own child',40,41,{age:5,hh:helper.hhId,hunger:20});
 const child=addPerson(s,'Guest child',41,40,{age:5,hunger:20});const w=done(s);
 const a=newActivity(w,helper,{kind:'visit',label:'Accepted watch',goal:'watch the guest',targetId:child.id,here:true,data:{watch:true}});a.progress=49;
 return {w,helper,child,a};
}
it('rechecks food reserved for the helper and their own dependant at the actual watch transfer; rules 55 stays historical',()=>{
 const old=reserveScene(55),current=reserveScene(56);
 watchTick(old.w,old.helper,old.a,old.child);watchTick(current.w,current.helper,current.a,current.child);
 expect(old.child.inv.bread).toBe(1);expect(current.child.inv.bread??0).toBe(0);expect(current.helper.inv.bread).toBe(1);
 expect(conservationReport(current.w).ok).toBe(true);
 const enough=reserveScene(56,6);watchTick(enough.w,enough.helper,enough.a,enough.child);
 expect(enough.child.inv.bread).toBe(1);expect(enough.helper.inv.bread).toBe(5);
});
it('does not follow live remote coordinates or transfer across interiors; a visible nearby child can be approached',()=>{
 const f=reserveScene(56,6);f.child.x=70;const before={tx:f.a.tx,ty:f.a.ty};
 expect(watchTick(f.w,f.helper,f.a,f.child)).toMatch(/^fail:lost sight/);expect({tx:f.a.tx,ty:f.a.ty}).toEqual(before);expect(f.helper.inv.bread).toBe(6);
 f.child.x=41;f.child.indoors=123;expect(watchTick(f.w,f.helper,f.a,f.child)).toMatch(/^fail:/);expect(f.helper.inv.bread).toBe(6);
 delete f.child.indoors;f.child.x=45;expect(watchTick(f.w,f.helper,f.a,f.child)).toBe('continue');expect(f.a.phase).toBe('travel');expect(f.helper.inv.bread).toBe(6);
});
it('no location knowledge means a blocked watch; observer queries do not annotate the promise',()=>{
 const f=practicalCareScene();const {w,helper,child,parent}=f;
 helper.seen=[];helper.whereabouts={};helper.commitments.push({id:w.nextId++,requestId:0,kind:'work',to:parent.id,item:null,amount:1,siteId:0,made:0,deadline:5000,status:'active',destKind:'person',destId:child.id,milestone:'watched'});
 const before=serializeWorld(w),ctx=generateOptions(w,helper,true,true);
 expect(ctx.options.some(o=>o.key===`watch:${child.id}`)).toBe(false);expect(ctx.blocked.some(o=>o.blocked==='does not know where the child is')).toBe(true);expect(serializeWorld(w)).toBe(before);
 generateOptions(w,helper,true);expect(helper.commitments[0].blocked).toBe('does not know where the child is');
});
it("communicates only the asker's snapshot, preserves age and newer knowledge, and cannot invent a location",()=>{
 const f=practicalCareScene();const {w,parent,helper,child}=f;w.tick=200;
 parent.whereabouts[child.id]={x:60,y:39,tick:80};child.x=70;
 communicateWatchLocation(w,parent,helper,child.id);expect(helper.whereabouts[child.id]).toEqual({x:60,y:39,tick:80});
 helper.whereabouts[child.id]={x:61,y:40,tick:150};communicateWatchLocation(w,parent,helper,child.id);expect(helper.whereabouts[child.id].tick).toBe(150);
 delete parent.whereabouts[child.id];delete helper.whereabouts[child.id];communicateWatchLocation(w,parent,helper,child.id);expect(helper.whereabouts[child.id]).toBeUndefined();
 parent.whereabouts[child.id]={x:60,y:39,tick:-3000};communicateWatchLocation(w,parent,helper,child.id);expect(helper.whereabouts[child.id]).toBeUndefined();
});
it('actual contact accepts the watch, communicates the remembered place, travels and supplies food; intermediate save continuation is exact',()=>{
 const f=practicalCareScene();const {w,helper,child}=f;expect(helper.whereabouts[child.id]).toBeUndefined();
 const req=f.ask();expect(req?.status).toBe('promised');expect(helper.whereabouts[child.id]).toEqual({x:64,y:40,tick:0});
 expect(helper.log.some(l=>l.text.includes('told me where they last saw'))).toBe(true);
 helper.cooldowns.pause=0;
 const o=generateOptions(w,helper,true,true).options.find(o=>o.key===`watch:${child.id}`);expect(o).toBeDefined();startActivity(w,helper,o!.make!()!);
 for(let i=0;i<15;i++)stepWorld(w);const copy=deserializeWorld(serializeWorld(w));
 const c=helper.commitments.find(c=>c.milestone==='watched')!;
 let delivered=0;w.hooks={onTransfer:i=>{if(i.reason==='watched over'&&i.item==='bread')delivered+=i.n;}};
 for(let i=0;i<1400&&c.status==='active';i++){stepWorld(w);stepWorld(copy);}
 expect(c.status).toBe('done');expect(req?.status).toBe('fulfilled');expect(delivered).toBeGreaterThan(0);expect(c.contrib).toBe(40);
 expect(serializeWorld(w)).toBe(serializeWorld(copy));expect(conservationReport(w).ok).toBe(true);
 const beforeRepeat=serializeWorld(w);fulfillCommitment(w,helper,c.id);expect(serializeWorld(w)).toBe(beforeRepeat);
 const eat=generateOptions(w,child,true,true).options.find(o=>o.kind==='eat');expect(eat).toBeDefined();
 const hunger=child.needs.hunger;startActivity(w,child,eat!.make!()!);
 for(let i=0;i<120&&child.activity?.kind==='eat';i++)stepWorld(w);
 expect(child.needs.hunger).toBeGreaterThan(hunger+5);expect(conservationReport(w).ok).toBe(true);
});
it('the isolated lab removal restores the previous watch boundary without changing rules 55',()=>{
 const undo=parseIntervention('rich-no-practical-care').install!();const f=reserveScene(56);watchTick(f.w,f.helper,f.a,f.child);expect(f.child.inv.bread).toBe(1);undo();
 const old=reserveScene(55);watchTick(old.w,old.helper,old.a,old.child);expect(old.child.inv.bread).toBe(1);
});

it('a lost child leaves the promise unfulfilled and remembers the contact failure for later decisions',()=>{
 const f=practicalCareScene(),req=f.ask();const {w,helper,child}=f;
 helper.cooldowns.pause=0;
 const o=generateOptions(w,helper,true,true).options.find(o=>o.key===`watch:${child.id}`)!;
 const a=o.make!()!;startActivity(w,helper,a);
 child.x=90;child.y=90;const pack={...helper.inv};
 expect(watchTick(w,helper,a,child)).toBe('fail:lost sight of the child');
 const c=helper.commitments.find(c=>c.milestone==='watched')!;
 expect(c.status).toBe('active');expect(c.contrib??0).toBe(0);expect(req?.status).toBe('promised');expect(helper.inv).toEqual(pack);
 expect(c.blocked).toBe('lost sight of the child');
 const before=serializeWorld(w);expect(generateOptions(w,helper,true,true).options.some(o=>o.key===`watch:${child.id}`)).toBe(false);expect(serializeWorld(w)).toBe(before);
});

it('a full recipient keeps every item with the helper and earns no gift credit',()=>{
 const f=reserveScene(56,6);f.child.inv.wood=carryCap(f.w,f.child);ledgerCreate(f.w,'wood',f.child.inv.wood,'staged full pack');
 const rel=JSON.stringify(f.helper.relations),events=f.w.events.length;
 watchTick(f.w,f.helper,f.a,f.child);
 expect(f.helper.inv.bread).toBe(6);expect(f.child.inv.bread??0).toBe(0);expect(JSON.stringify(f.helper.relations)).toBe(rel);expect(f.w.events.length).toBe(events);
 expect(conservationReport(f.w).ok).toBe(true);
});
