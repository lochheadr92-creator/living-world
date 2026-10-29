import { afterEach, expect, it } from 'vitest';
import { stage, addPerson, building, done } from './helpers/kit';
import { relOf } from '../src/sim/relations';
import { killPerson, giveBirth } from '../src/sim/lifecycle';
import { shareRumour, noteDeed } from '../src/sim/reputation';
import { setLocalDeath, knowsDeath } from '../src/sim/death_knowledge';
import { observe } from '../src/sim/knowledge';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson, summarizeWorld } from '../src/sim/inspect';
import { relationshipHistory } from '../src/sim/history';
import { DAY } from '../src/sim/constants';
import { createWorld } from '../src/sim/factory';
import { currentWorldSettings } from '../src/sim/profiles';
import { generateOptions, rankOptions } from '../src/sim/decision';
afterEach(()=>setLocalDeath(true));
function setup(v=14){
 const s=stage('local-death','natural',{dynamics:'rich',rulesVersion:v});
 if(v>=14)s.w.birthCount=0;
 const a=addPerson(s,'Ada',40,40),b=addPerson(s,'Ben',42,40),c=addPerson(s,'Cora',75,40);
 for(const p of [b,c]){const r=relOf(p,a.id);r.kin=p===c?'partner':'sibling';r.affinity=90;}
 a.partnerId=c.id;c.partnerId=a.id;
 building(s,'fire',38,40);done(s);s.w.tick=100;
 return {s,w:s.w,a,b,c};
}
it('only an awake witness grieves; a distant partner learns in co-present talk once',()=>{
 const {w,a,b,c}=setup();const social=c.needs.social;killPerson(w,a,'injuries');
 expect(knowsDeath(b,a.id)).toBe(true);expect(b.partnerId).toBe(0);
 expect(knowsDeath(c,a.id)).toBe(false);expect(c.partnerId).toBe(a.id);expect(c.needs.social).toBe(social);expect(c.lifeEvent).toBeUndefined();
 expect(shareRumour(w,b,c)).toBe(false);
 const saved=serializeWorld(w),loaded=deserializeWorld(saved);
 for(const world of [w,loaded]){
  const B=world.persons.find(p=>p.id===b.id)!,C=world.persons.find(p=>p.id===c.id)!;
  C.x=B.x+1;C.y=B.y;expect(shareRumour(world,B,C)).toBe(true);
  expect(C.relations[a.id].deathKnown).toEqual({learned:100,source:'told',via:B.id});
  expect(B.speech?.text).toBe('Ada has died.');
  expect(C.partnerId).toBe(0);expect(C.lifeEvent?.kind).toBe('bereaved');
  const before=serializeWorld(world);expect(shareRumour(world,B,C)).toBe(false);describePerson(world,C.id);expect(serializeWorld(world)).toBe(before);
 }
 expect(serializeWorld(w)).toBe(serializeWorld(loaded));
});
it('walls and sleep block death witnesses and hearsay; a visible grave supplies identity later',()=>{
 const {w,a,b,c}=setup();a.indoors=123;b.pose='sleep';c.x=42;c.indoors=456;
 killPerson(w,a,'injuries');expect(knowsDeath(b,a.id)).toBe(false);expect(knowsDeath(c,a.id)).toBe(false);
 const grave=w.graves[0];expect(grave.death?.id).toBe(a.id);
 b.pose='stand';b.x=grave.x+1;b.y=grave.y;observe(w,b,grave);
 expect(b.relations[a.id].deathKnown?.source).toBe('grave');expect(shareRumour(w,b,c)).toBe(false);
 const count=b.heard!.length;w.tick+=DAY;observe(w,b,grave);expect(b.heard).toHaveLength(count);
 expect(relationshipHistory(w,b).join(' ')).toContain('grave');
});
it('historical v13 and ablation retain immediate distant grief',()=>{
 for(const v of [13,14]){
  const {w,a,c}=setup(v);if(v===14)setLocalDeath(false);killPerson(w,a,'injuries');
  expect(c.partnerId).toBe(0);expect(c.mood?.thoughts.some(t=>t.kind==='lost:'+a.id)).toBe(true);
 }
});
it('untyped prose does not fabricate a death and an unknown distant funeral is not an option',()=>{
 const {w,a,b,c}=setup();c.x=43;noteDeed(w,b,a,'news','Ada died in a story');shareRumour(w,b,c);
 expect(c.relations[a.id].deathKnown).toBeUndefined();expect(c.lifeEvent).toBeUndefined();
 c.x=75;killPerson(w,a,'injuries');for(const o of w.occasions??[]){o.status='gathering';o.at=w.tick;o.until=w.tick+500;}
 expect(rankOptions(generateOptions(w,c,true,true)).some(o=>o.key.startsWith('attend:'))).toBe(false);
});
it('birth accounting survives feed rollover, child death and save/load; legacy scope is explicit',()=>{
 const {w,a}=setup();a.sex='f';giveBirth(w,a);const baby=w.persons.find(p=>p.parents.includes(a.id))!;
 expect(w.birthCount).toBe(1);w.events=[];killPerson(w,baby,'injuries');
 const saved=serializeWorld(w),loaded=deserializeWorld(saved);
 expect(summarizeWorld(loaded)).toMatchObject({births:1,lifetimeBirths:true});
 expect(serializeWorld(w)).toBe(saved);
 const old=setup(13);expect(summarizeWorld(old.w).lifetimeBirths).toBe(false);
 const fresh=createWorld(currentWorldSettings('normal','birth-counter'));expect(fresh.birthCount).toBe(0);
});

it('same interior witnesses the death but a distant friend receives no bereavement concern',()=>{
 const {w,a,b,c}=setup();a.indoors=123;b.indoors=123;
 a.partnerId=b.id;b.partnerId=a.id;c.partnerId=0;relOf(b,a.id).kin='partner';relOf(c,a.id).kin='sibling';
 relOf(c,b.id).affinity=80;killPerson(w,a,'injuries');
 expect(knowsDeath(b,a.id)).toBe(true);expect(c.concerns.some(q=>q.kind==='bereaved')).toBe(false);
});

it('typed death news is not swallowed by another same-day news story',()=>{
 const {w,a,b,c}=setup();noteDeed(w,b,a,'news','Ada had a child');
 killPerson(w,a,'injuries');expect(b.heard?.some(r=>r.death?.id===a.id)).toBe(true);
 c.x=b.x+1;c.y=b.y;for(let i=0;i<3&&!knowsDeath(c,a.id);i++)shareRumour(w,b,c);
 expect(knowsDeath(c,a.id)).toBe(true);
});
