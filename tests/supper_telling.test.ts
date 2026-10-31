import {afterEach,expect,it} from 'vitest';
import {supperFixture} from './helpers/household_practices';
import {setExternalController} from '../src/sim/external';
import {setSupperTelling} from '../src/sim/household_practices';
import {relationshipHistory} from '../src/sim/history';
import {describePerson} from '../src/sim/inspect';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {DAY} from '../src/sim/constants';
import type {Intention} from '../src/sim/types';
import {stepWorld} from '../src/sim/world';
function mealWithPlan(f:ReturnType<typeof supperFixture>){const m=f.begin();const i=plan(f);f.a.intentions.push(i);for(let n=0;n<1500&&m.status!=='done'&&m.status!=='cancelled';n++)stepWorld(f.w);f.finish(f.a);f.finish(f.b);if(m.status!=='done')throw new Error('Meal '+m.end);return {m,i};}
afterEach(()=>{setExternalController(null);setSupperTelling(true);});
const plan=(f:ReturnType<typeof supperFixture>):Intention=>({id:f.w.nextId++,kind:'stock',goal:'put 12 units of food by for the household',since:f.w.tick,until:f.w.tick+DAY*3,status:'active',reason:'declared staged reserve plan',setAside:0,aboutId:f.pantry.id,wants:{},makes:'',sheltered:0,worked:3,ended:0,reserve:12,cue:'season',step:'',stepKind:'none',stepTarget:0,stepItem:null,stepKey:null,blocked:''});
it('a household supper tells what the host is working on once the guest has really sat with them, carrying the meal id',()=>{
 const f=supperFixture(104);const {m,i}=mealWithPlan(f);expect(m.supperContact?.guests[f.b.id].ticks).toBeGreaterThanOrEqual(20);
 const k=f.b.relations[f.a.id].workHeard![0];expect(k).toMatchObject({planId:i.id,kind:'stock',via:'meal',conversationId:m.id,worked:3});expect(f.a.relations[f.b.id].workTold![0]).toMatchObject({planId:i.id,conversationId:m.id});
 expect(f.b.log.some(l=>/Heard Ada's undertaking .* at our supper #/.test(l.text))).toBe(true);expect(relationshipHistory(f.w,f.b).some(r=>/at supper #\d+/.test(r))).toBe(true);
 const before=serializeWorld(f.w);describePerson(f.w,f.b.id);expect(serializeWorld(f.w)).toBe(before);expect(serializeWorld(deserializeWorld(before))).toBe(before);expect(conservationReport(f.w).ok).toBe(true);
 // the fixture's next supper is the next day: the same undertaking is told again, replacing the one record rather than adding to it
 const m2=f.meal();expect(m2.created-m.created).toBeGreaterThanOrEqual(DAY);expect(f.b.relations[f.a.id].workHeard!.filter(k=>k.planId===i.id)).toHaveLength(1);expect(f.b.relations[f.a.id].workHeard![0].conversationId).toBe(m2.id);
});
it.each(['legacy','ablation'])('nothing is told at the table under %s',mode=>{
 const f=supperFixture(mode==='legacy'?103:104);if(mode==='ablation')setSupperTelling(false);const {m}=mealWithPlan(f);expect(m.supperContact?.guests[f.b.id].ticks).toBeGreaterThanOrEqual(20);expect(f.b.relations[f.a.id].workHeard).toBeUndefined();
});
it('a supper record is refused by a build below rules 104',()=>{
 const f=supperFixture(104);mealWithPlan(f);const text=serializeWorld(f.w);
 const o=JSON.parse(text) as {world:{settings:Record<string,unknown>}};o.world.settings.rulesVersion=103;expect(()=>deserializeWorld(JSON.stringify(o))).toThrow(/heard undertaking/);
});
