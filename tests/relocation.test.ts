import {setExternalController} from '../src/sim/external';
import {afterEach,expect,it} from 'vitest';
import {relocationFixture} from './helpers/relocation';
import {currentRelocation,relocationDestination,setRelocations,updateRelocationPressure} from '../src/sim/relocation';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {describePerson} from '../src/sim/inspect';
import {conservationReport} from '../src/sim/economy';
import {relOf} from '../src/sim/relations';
import {DAY} from '../src/sim/constants';
import {perceive} from '../src/sim/perception';
import {observe} from '../src/sim/knowledge';
afterEach(()=>{setRelocations(true);setExternalController(null);});
it('requires sustained personal hardship and a remembered destination; observer reads are pure',()=>{
 const {w,a}=relocationFixture();
 expect(relocationDestination(w,a)).toBeDefined();
 const before=serializeWorld(w);generateOptions(w,a,true,true);describePerson(w,a.id);expect(serializeWorld(w)).toBe(before);
 a.relocationHardship=w.tick;expect(generateOptions(w,a).options.some(o=>o.kind==='relocate')).toBe(false);
 a.relocationHardship=w.tick-DAY;a.needs.hunger=90;updateRelocationPressure(w,a);expect(a.relocationHardship).toBeUndefined();
 a.beliefs={};a.bykind={};expect(relocationDestination(w,a)).toBeUndefined();
});
it('real contact records refusal and prevents departure without moving goods or membership',()=>{
 const f=relocationFixture();const {w,a,b,hh,home}=f;const membership=hh.townshipId;
 f.run(a,':propose:');expect(currentRelocation(hh)?.phase).toBe('asking');
 relOf(b!,a.id).trust=-40;const before={...home.store.items};f.run(a,':ask:');
 expect(hh.relocations![0].phase).toBe('failed');expect(hh.relocations![0].members[1].reason).toContain('does not trust');
 expect(home.store.items).toEqual(before);expect(hh.townshipId).toBe(membership);expect(conservationReport(w).ok).toBe(true);
});
it('accepted household physically packs, travels, lays out, supplies and builds shelter before founding',()=>{
 const f=relocationFixture(false);const {w,a,hh,home}=f;const original=hh.townshipId;
 f.run(a,':propose:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');
 expect(home.store.items.wood).toBeLessThan(6);expect(conservationReport(w).ok).toBe(true);
 f.run(a,':depart:');expect(hh.townshipId).toBe(original);
 f.choose(a,':travel:');for(let i=0;i<70;i++)stepWorld(w);
 const saved=deserializeWorld(serializeWorld(w));
 for(let i=0;i<100;i++){stepWorld(w);stepWorld(saved);}expect(serializeWorld(saved)).toBe(serializeWorld(w));
 for(let i=0;i<1200&&a.activity?.kind==='relocate';i++)stepWorld(w);
 expect(a.y).toBeLessThan(18);perceive(w,a);
 f.run(a,':arrive:');expect(currentRelocation(hh)?.phase).toBe('building');expect(hh.townshipId).toBe(original);
 f.run(a,'relocate-shelter:');const site=w.sites.find(s=>s.hhId===hh.id)!;expect(site).toBeDefined();observe(w,a,site);
 f.run(a,`haul:${site.id}`);f.run(a,`gather:${f.tree.id}`);f.run(a,`gather:${f.tree.id}`);f.run(a,`haul:${site.id}`);f.run(a,`build:${site.id}`);
 f.run(a,':found:');expect(hh.relocations![0].phase).toBe('settled');expect(hh.townshipId).not.toBe(original);
 expect(w.extraSettlements).toHaveLength(1);expect(w.townships!.find(t=>t.id===hh.townshipId)?.origin).toEqual({householdId:hh.id,relocationId:hh.relocations![0].id,fromTownship:original,shelterId:hh.homeId,organiserId:a.id});expect(home.hhId).toBe(hh.id);expect(hh.homeId).not.toBe(home.id);expect(conservationReport(w).ok).toBe(true);
 const before=serializeWorld(w);expect(describePerson(w,a.id)?.householdHistory.join(' ')).toContain('settled');expect(serializeWorld(w)).toBe(before);
},30000);
it('older rules and the ablation do not offer relocation',()=>{
 const {w,a}=relocationFixture();w.settings.rulesVersion=19;expect(generateOptions(w,a).options.some(o=>o.kind==='relocate')).toBe(false);
 w.settings.rulesVersion=20;setRelocations(false);expect(generateOptions(w,a).options.some(o=>o.kind==='relocate')).toBe(false);
});
it('accepted adult hears the destination in person; a separated family cannot claim arrival',()=>{
 const f=relocationFixture();const {w,a,b,hh}=f;
 f.run(a,':propose:');f.run(a,':ask:');expect(hh.relocations![0].members[1].response).toBe('accepted');
 expect(b!.beliefs[1009999]).toMatchObject({src:'told',from:a.id});
 f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':rally:');f.run(a,':depart:');
 f.run(a,':travel:');expect(generateOptions(w,a).options.some(o=>o.key.includes(':arrive:'))).toBe(false);
 f.run(b!,':travel:');perceive(w,a);f.run(a,':arrive:');expect(currentRelocation(hh)?.phase).toBe('building');
 expect(conservationReport(w).ok).toBe(true);
});
it('acceptance is reconsidered at departure when a co-present adult becomes unfit',()=>{
 const f=relocationFixture();const {a,b,hh}=f;f.run(a,':propose:');f.run(a,':ask:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');
 f.run(a,':rally:');b!.health=30;f.run(a,':depart:');expect(hh.relocations![0].phase).toBe('failed');expect(hh.relocations![0].outcome).toContain('withdrew');
});
it('packing rechecks household ownership at the physical transfer, preserving the private store',()=>{
 const f=relocationFixture(false);const {w,a,home}=f;f.run(a,':propose:');f.run(a,':prepare:');
 f.choose(a,'relocate-pack:');home.hhId=999;const before={...home.store.items};
 for(let i=0;i<150&&a.activity;i++)stepWorld(w);
 expect(home.store.items).toEqual(before);expect(a.lastResult?.outcome).toBe('failed');expect(a.lastResult?.detail).toContain('household store');
});
it('load refuses invalid agreement phases; a legacy save never acquires relocation state',()=>{
 const f=relocationFixture(false);f.run(f.a,':propose:');
 const raw=serializeWorld(f.w);expect(()=>deserializeWorld(raw.replace('"phase":"asking"','"phase":"invented"'))).toThrow('Invalid relocation');
 const {w,a}=relocationFixture(false);w.settings.rulesVersion=19;delete a.relocationHardship;
 for(let i=0;i<120;i++)stepWorld(w);expect(a.relocationHardship).toBeUndefined();expect(w.households[0].relocations).toBeUndefined();
});
it('dependent children hear the route and adults wait instead of walking out of sight',()=>{
 const f=relocationFixture(false,true);const {w,a,c,hh}=f;f.run(a,':propose:');
 expect(generateOptions(w,c!).options.some(o=>o.kind==='relocate')).toBe(false);
 f.run(a,':ask:');expect(hh.relocations![0].members[1].response).toBe('dependent');expect(c!.beliefs[1009999].from).toBe(a.id);
 f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':rally:');f.run(a,':depart:');f.choose(a,':travel:');
 for(let i=0;i<180;i++)stepWorld(w);
 expect(Math.hypot(a.x-c!.x,a.y-c!.y)).toBeLessThan(6.2);expect(a.activity?.blocked).toContain('children');
 f.choose(c!,':travel:');setExternalController({controls:()=>true,choose:()=>({kind:'defer'})});
 for(let i=0;i<700&&(a.activity||c!.activity);i++)stepWorld(w);
 expect(a.y).toBeLessThan(18);expect(c!.y).toBeLessThan(18);expect(hh.townshipId).toBe(hh.relocations![0].fromTownship);
});
it('urgent hunger interrupts travel without transferring membership or inventing arrival',()=>{
 const f=relocationFixture(false);const {w,a,hh}=f;f.run(a,':propose:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':depart:');f.choose(a,':travel:');
 a.needs.hunger=1;stepWorld(w);expect(a.activity?.kind).not.toBe('relocate');expect(hh.relocations![0].phase).toBe('travelling');expect(hh.townshipId).toBe(hh.relocations![0].fromTownship);
});
it('unsuitable arrival fails locally and keeps the former property and civic membership',()=>{
 const f=relocationFixture(false);const {w,a,hh,home,bush}=f;f.run(a,':propose:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':depart:');f.run(a,':travel:');
 bush.amount=0;observe(w,a,bush);f.run(a,':arrive:');expect(hh.relocations![0].phase).toBe('failed');expect(hh.homeId).toBe(home.id);expect(hh.townshipId).toBe(hh.relocations![0].fromTownship);
});
it('an unreachable destination produces a real path failure and never founds a township',()=>{
 const f=relocationFixture(false);const {w,a,hh}=f;f.run(a,':propose:');f.run(a,':prepare:');f.run(a,'eat_store:');f.run(a,'relocate-pack:');f.run(a,':depart:');
 // Staged obstacle appeared after agreement, before path planning. No arrival or goods are injected.
 for(let x=0;x<w.W;x++)w.solid[30*w.W+x]=1;
 expect(()=>f.choose(a,':travel:')).toThrow('Selection did not start');
 expect(a.lastResult?.outcome).toBe('failed');expect(hh.relocations![0].phase).toBe('travelling');expect(w.townships).toHaveLength(1);
});
it('loss of organiser cannot appoint a successor; survivors can end the overdue agreement',async()=>{
 const f=relocationFixture();const {w,a,b,hh}=f;f.run(a,':propose:');f.run(a,':ask:');
 const {killPerson}=await import('../src/sim/lifecycle');killPerson(w,a,'injuries');expect(hh.relocations![0].organiserId).toBe(a.id);
 // Labelled deadline boundary probe, not an accelerated lifespan or an emergence run.
 w.tick=hh.relocations![0].deadline+1;f.run(b!,':stop:');expect(hh.relocations![0].phase).toBe('failed');expect(hh.relocations![0].outcome).toContain('time ran out');
});
it('simultaneous proposers cannot create two active household agreements',async()=>{
 const f=relocationFixture();const {w,a,b,hh,bush}=f;
 const {putBelief}=await import('../src/sim/knowledge');const {snapshotInitial}=await import('../src/sim/economy');
 // Staged prior hardship and shared destination knowledge, before either real action starts.
 b!.needs.hunger=40;b!.inv.berries=0;b!.relocationHardship=w.tick-DAY;observe(w,b!,bush);putBelief(b!,{...a.beliefs[1009999]});snapshotInitial(w);
 const picked=new Set<number>();setExternalController({controls:()=>true,choose:(_w,p,_ctx,ranked)=>{if(picked.has(p.id))return {kind:'defer'};const o=ranked.find(o=>o.key.includes(':propose:'));if(!o)return {kind:'defer'};picked.add(p.id);return {kind:'pick',key:o.key};}});
 for(const p of [a,b!]){p.cooldowns.pause=0;p.nextThink=w.tick;}
 for(let i=0;i<100;i++)stepWorld(w);
 expect(picked.size).toBe(2);expect(hh.relocations).toHaveLength(1);expect([a,b!].some(p=>p.lastResult?.detail==='another household proposal was agreed first')).toBe(true);
});
