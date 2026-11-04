import {delBelief} from '../src/sim/knowledge';
import {reserveHeld} from '../src/sim/provision';
import {it,expect} from 'vitest';
import {stage,addPerson,building,site,done,learn} from './helpers/kit';
import {cellarAccepts,cellarAccess,cellarDemand} from '../src/sim/cellars';
import {spoilMultiplier,mayDeposit} from '../src/sim/facilities';
import {generateOptions} from '../src/sim/decision';
import {newActivity,startActivity,stepActivity} from '../src/sim/activities';
import {conservationReport,snapshotInitial} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
function fixture(){const s=stage('private-cellar');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:135};const p=addPerson(s,'Ada',40.5,24.5,{hunger:40,thirst:95,energy:95});const b=building(s,'cellar',40,23,p.hhId,{berries:6});done(s);return {s,w:s.w,p,b};}
function finish(w:ReturnType<typeof fixture>['w'],p:ReturnType<typeof fixture>['p']){for(let i=0;i<300&&p.activity;i++){w.tick++;stepActivity(w,p);}}
it('accepts food and flour, refuses building materials, and loses protection when ruined',()=>{const {w,b}=fixture();expect(cellarAccepts('berries')).toBe(true);expect(mayDeposit(b,'flour')).toBe(true);expect(mayDeposit(b,'stone')).toBe(false);expect(spoilMultiplier(w,b)).toBe(0.15);b.condition=0;expect(spoilMultiplier(w,b)).toBe(1);});
it('offers a remembered private meal and consumes real food at the door',()=>{const {w,p,b}=fixture();learn(w,p,b);const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat_store'&&o.targetId===b.id);expect(o).toBeTruthy();startActivity(w,p,o!.make!()!);finish(w,p);expect(p.needs.hunger).toBeGreaterThan(40);expect(b.store.items.berries??0).toBeLessThan(6);expect(conservationReport(w).ok).toBe(true);});
it('rechecks ownership and contact before a foreign meal can take anything',()=>{const {w,p,b}=fixture();b.hhId=999;expect(cellarAccess(w,p,b)).toBeTruthy();startActivity(w,p,newActivity(w,p,{kind:'eat_store',label:'staged intrusion',goal:'attempt access',targetId:b.id,targetType:'building',tx:41,ty:23.5,spotX:40.5,spotY:24.5}));finish(w,p);expect(b.store.items.berries).toBe(6);expect(p.needs.hunger).toBe(40);});
it('continues exactly after loading and rejects malformed cellar capacity',()=>{const {w,b}=fixture(),copy=deserializeWorld(serializeWorld(w));for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}expect(serializeWorld(w)).toBe(serializeWorld(copy));b.store.cap=1000;expect(()=>deserializeWorld(serializeWorld(w))).toThrow();});

it('lays out and constructs a private cellar with paid materials',()=>{
 const s=stage('cellar-building');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:135};const p=addPerson(s,'Builder',40.5,24.5,{hunger:95,thirst:95,energy:95});done(s);
 startActivity(s.w,p,newActivity(s.w,p,{kind:'plan_site',label:'Lay out cellar',goal:'cool food',tx:41,ty:23.5,spotX:40.5,spotY:24.5,data:{type:'cellar',sx:40,sy:23,hh:p.hhId}}));finish(s.w,p);
 const st=s.w.sites[0];expect(st?.type).toBe('cellar');expect(st.hhId).toBe(p.hhId);
 st.delivered={wood:6,stone:9};snapshotInitial(s.w);
 startActivity(s.w,p,newActivity(s.w,p,{kind:'build',label:'Build cellar',goal:'cool food',targetId:st.id,targetType:'site',tx:41,ty:23.5,spotX:40.5,spotY:24.5,maxTicks:1500}));
 for(let i=0;i<1500&&p.activity;i++){s.w.tick++;stepActivity(s.w,p);}
 expect(s.w.buildings.some(b=>b.type==='cellar'&&b.hhId===p.hhId)).toBe(true);expect(st.used).toEqual({wood:6,stone:9});expect(conservationReport(s.w).ok).toBe(true);
});
it('stores actual surplus, refuses stone, and then feeds the owner from that food',()=>{
 const {w,p,b}=fixture();b.store.items={};p.inv={berries:8,stone:2};p.needs.hunger=95;snapshotInitial(w);learn(w,p,b);
 const o=generateOptions(w,p,true,true).options.find(o=>o.kind==='deposit'&&o.targetId===b.id);expect(o).toBeTruthy();startActivity(w,p,o!.make!()!);finish(w,p);
 expect(b.store.items.berries).toBeGreaterThan(0);const stored=b.store.items.berries!;
 startActivity(w,p,newActivity(w,p,{kind:'deposit',label:'Try stone',goal:'test storage boundary',targetId:b.id,targetType:'building',tx:41,ty:23.5,spotX:40.5,spotY:24.5,data:{items:{stone:2}}}));finish(w,p);
 expect(b.store.items.stone??0).toBe(0);expect(p.inv.stone).toBe(2);p.needs.hunger=10;learn(w,p,b);
 const meal=generateOptions(w,p,true,true).options.find(o=>o.kind==='eat_store'&&o.targetId===b.id)!;startActivity(w,p,meal.make!()!);finish(w,p);
 expect(b.store.items.berries??0).toBeLessThan(stored);expect(p.needs.hunger).toBeGreaterThan(10);expect(conservationReport(w).ok).toBe(true);
});
it('reduces actual spoilage without stopping it or creating food',()=>{
 function stock(type:'cellar'|'storehouse'){const s=stage('cellar-spoil');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:135};const b=building(s,type,40,23,0,{berries:60});done(s);return {w:s.w,b};}
 const cool=stock('cellar'),open=stock('storehouse');
 for(let i=0;i<2400;i++){stepWorld(cool.w);stepWorld(open.w);}
 expect(cool.b.store.items.berries).toBeGreaterThan(open.b.store.items.berries??0);expect(cool.b.store.items.berries).toBeLessThan(60);
 expect(conservationReport(cool.w).ok).toBe(true);expect(conservationReport(open.w).ok).toBe(true);
});
it('does not propose a duplicate of a remembered private cellar',()=>{
 const {s,w,p,b}=fixture();p.inv={};b.store.items={};const home=building(s,'hut',45,23,p.hhId,{berries:10});learn(w,p,home);
 // This owner already has a known cellar, so duplicate construction is suppressed.
 expect(cellarDemand(generateOptions(w,p,true,true))).toBe(0);
});

it('does not infer a need from unknown food and counts known cellar food in household reserves',()=>{
 const {s,w,p,b}=fixture();const home=building(s,'hut',45,23,p.hhId);learn(w,p,home);p.inv={};delBelief(p,b.id);
 home.store.items.berries=10;expect(cellarDemand(generateOptions(w,p,true,true))).toBe(0);
 learn(w,p,home);expect(cellarDemand(generateOptions(w,p,true,true))).toBeGreaterThan(0);
 learn(w,p,b);expect(reserveHeld(w,p,p.beliefs[home.id])).toBe(16);
});
it('rechecks ownership during a pending deposit and preserves all carried goods',()=>{
 const {w,p,b}=fixture();p.inv={berries:5};snapshotInitial(w);
 startActivity(w,p,newActivity(w,p,{kind:'deposit',label:'Store food',goal:'private store',targetId:b.id,targetType:'building',tx:41,ty:23.5,spotX:40.5,spotY:24.5,data:{items:{berries:5}}}));
 for(let i=0;i<20&&p.activity?.phase!=='work';i++){w.tick++;stepActivity(w,p);}expect(p.activity?.phase).toBe('work');b.hhId=999;
 finish(w,p);expect(p.inv.berries).toBe(5);expect(b.store.items.berries).toBe(6);expect(conservationReport(w).ok).toBe(true);
});

it('rejects a cellar smuggled into predecessor rules and malformed paid work',()=>{
 const {w}=fixture();w.settings.rulesVersion=134;expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid cellar');
 const s=stage('bad-cellar-site');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:135};const p=addPerson(s,'Builder',40.5,24.5);const st=site(s,'cellar',40,23,p.hhId,p.id);done(s);st.workTotal=1;expect(()=>deserializeWorld(serializeWorld(s.w))).toThrow('Invalid cellar site');
});
it('refuses remote access and an owner with no household',()=>{
 const {w,p,b}=fixture();p.x+=10;expect(cellarAccess(w,p,b)).toBeTruthy();p.x-=10;p.hhId=0;b.hhId=0;expect(cellarAccess(w,p,b)).toBeTruthy();
});
