import {afterEach,expect,it} from 'vitest';
import {supperFixture} from './helpers/household_practices';
import {setExternalController} from '../src/sim/external';
import {setHouseholdPractices,supperWeight,supperHistory,finishSupperPractice} from '../src/sim/household_practices';
import {conservationReport} from '../src/sim/economy';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {stepWorld} from '../src/sim/world';
import {describePerson} from '../src/sim/inspect';
import {killPerson} from '../src/sim/lifecycle';
import {cancelMeal} from '../src/sim/meals';
afterEach(()=>{setExternalController(null);setHouseholdPractices(true);});
it('forms a practice from actual hosting, then transmits it through two parent-child meals with time and food costs',()=>{
 const f=supperFixture();const m1=f.meal();expect(m1.supperContact?.guests[f.b.id].ticks).toBeGreaterThanOrEqual(20);expect(f.a.sharedSupper?.learned).toBeUndefined();
 f.meal();expect(f.a.sharedSupper?.learned?.source).toBe('practice');expect(f.b.sharedSupper).toBeUndefined();
 f.meal();expect(f.b.sharedSupper?.learned).toBeUndefined();f.meal();
 expect(f.b.sharedSupper?.learned).toMatchObject({source:'family',teacher:f.a.id,root:f.a.id,generation:1});expect(f.w.ledger.reasons['-eaten at a shared meal']).toBe(8);expect(conservationReport(f.w).ok).toBe(true);
 const before=serializeWorld(f.w);describePerson(f.w,f.b.id);supperHistory(f.w,f.b);expect(serializeWorld(f.w)).toBe(before);
});
it('the acquired practice changes a later offered invitation score without bypassing food or timing',()=>{
 const f=supperFixture();for(let i=0;i<4;i++)f.meal();f.ready(f.b,f.a);
 const offered=()=>f.options(f.b).find(o=>o.key.endsWith(':invite'));
 const withPractice=offered();expect(withPractice?.parts).toContainEqual(['the learned practice of sharing supper',4]);
 setHouseholdPractices(false);const without=offered();expect(withPractice!.util-without!.util).toBeCloseTo(4);setHouseholdPractices(true);
 const next=f.meal(f.b,f.a);expect(next.host).toBe(f.b.id);expect(next.supperContact?.ate).toContain(f.a.id);
 expect(offered()).toBeUndefined(); // ordinary completed-meal cooldown remains effective
});
it('an invitation or cancelled meal cannot transmit a practice, and early interruption costs real learning opportunity',()=>{
 const f=supperFixture();f.meal();f.meal();const m=f.begin();cancelMeal(f.w,m,'staged danger before eating');finishSupperPractice(f.w,m);expect(f.b.sharedSupper).toBeUndefined();expect(m.supperContact?.ate??[]).toEqual([]);expect(conservationReport(f.w).ok).toBe(true);
});
it('preserves midway contact and full-state save continuation',()=>{
 const f=supperFixture();f.meal();f.meal();const m=f.begin();for(let i=0;i<900&&(m.supperContact?.guests[f.b.id]?.ticks??0)<5;i++)stepWorld(f.w);
 expect(m.supperContact?.guests[f.b.id].ticks).toBeGreaterThanOrEqual(5);const loaded=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<80;i++){stepWorld(f.w);stepWorld(loaded);}expect(serializeWorld(loaded)).toBe(serializeWorld(f.w));expect(f.b.sharedSupper?.experiences).toHaveLength(1);
});
it('does not create knowledge on historical rules or through the lab ablation',()=>{
 const f=supperFixture();f.w.settings.rulesVersion=23;f.meal();expect(f.a.sharedSupper).toBeUndefined();expect(f.w.meals[0].supperContact).toBeUndefined();
 f.w.settings.rulesVersion=24;setHouseholdPractices(false);f.meal();expect(f.a.sharedSupper).toBeUndefined();
});

it('keeps acquired provenance after the parent dies, without teaching an unfinished learner by inheritance',()=>{
 const f=supperFixture();for(let i=0;i<3;i++)f.meal();const incomplete=deserializeWorld(serializeWorld(f.w));
 const child=incomplete.persons.find(p=>p.id===f.b.id)!,parent=incomplete.persons.find(p=>p.id===f.a.id)!;
 killPerson(incomplete,parent,'staged contract death');expect(child.sharedSupper?.learned).toBeUndefined();expect(supperWeight(incomplete,child)).toBe(0);
 f.meal();const known=structuredClone(f.b.sharedSupper);killPerson(f.w,f.a,'staged contract death');expect(f.b.sharedSupper).toEqual(known);expect(supperWeight(f.w,f.b)).toBe(4);expect(supperHistory(f.w,f.b)[0]).toContain('parent Ada');
});
it('requires family contact and distinct completed meals, not friendship or repeated observer reads',()=>{
 const f=supperFixture();f.meal();const m=f.meal();finishSupperPractice(f.w,m);expect(f.a.sharedSupper?.experiences).toHaveLength(2);
 f.b.relations[f.a.id].kin='';f.meal();expect(f.b.sharedSupper).toBeUndefined();
});
it('rejects malformed practice records and practice state attached to older rules',()=>{
 const f=supperFixture();f.meal();f.meal();const s=serializeWorld(f.w);
 f.a.sharedSupper!.learned!.meals=[1,1];expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow('practice provenance');
 const old=deserializeWorld(s);old.settings.rulesVersion=23;expect(()=>deserializeWorld(serializeWorld(old))).toThrow('household practice');
});
