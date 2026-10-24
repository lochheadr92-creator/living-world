import {afterEach,expect,it} from 'vitest';
import {alignmentFixture} from './helpers/political_alignment';
import {civicTalk} from './helpers/contest';
import {alignment,alignmentWeight,factionHistory,rememberAlignment,setPoliticalAlignment} from '../src/sim/political_alignment';
import {mandate,oppositionReason} from '../src/sim/civic_decision';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describePerson} from '../src/sim/inspect';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {stepWorld} from '../src/sim/world';
import {relOf} from '../src/sim/relations';
import {killPerson} from '../src/sim/lifecycle';
afterEach(()=>setPoliticalAlignment(true));
it('actual repeated choices form a visible faction and one changed prior choice changes a later accepted decision',()=>{
 const f=alignmentFixture(),{w,a,b,c,q,site}=f;
 expect(alignment(w,b,q.townshipId,q.id)).toEqual({candidateId:a.id,choices:2});
 expect(factionHistory(w,q.townshipId).join(' ')).toContain('Ada, Ben');
 expect(oppositionReason(w,b,c,q)).toContain('repeatedly');
 const control=deserializeWorld(serializeWorld(w)),cb=control.persons.find(p=>p.id===b.id)!;
 // Hold every other state field, RNG and tick constant; one prior support decision differs.
 cb.civicAlignment![0].candidateId=c.id;
 expect(oppositionReason(control,cb,control.persons.find(p=>p.id===c.id)!,control.civicProjects!.at(-1)!)).toBe('');
 civicTalk(w,c,b,site.id);civicTalk(control,control.persons.find(p=>p.id===c.id)!,cb,site.id);
 expect(q.participants.find(m=>m.personId===b.id)?.supports).toBe(a.id);expect(control.civicProjects!.at(-1)!.participants.find(m=>m.personId===b.id)?.supports).toBe(c.id);
 expect(mandate(w,q)).toBe(a.id);expect(mandate(control,control.civicProjects!.at(-1)!)).toBe(c.id);
 expect(w.requests.at(-1)?.note).toContain('repeatedly');
});
it('current project support cannot count twice or bootstrap continuity; history is bounded',()=>{
 const {w,a,b,q}=alignmentFixture();b.civicAlignment=[];
 rememberAlignment(w,b,q.id,q.townshipId,a.id);rememberAlignment(w,b,q.id,q.townshipId,a.id);
 expect(b.civicAlignment).toHaveLength(1);expect(alignmentWeight(w,b,q.townshipId,q.id,a.id)).toBe(0);
 for(let i=0;i<30;i++)rememberAlignment(w,b,1000+i,q.townshipId,a.id);expect(b.civicAlignment).toHaveLength(24);
 const before=JSON.stringify(b.civicAlignment);const old=22;w.settings.rulesVersion=old;rememberAlignment(w,b,9999,q.townshipId,a.id);expect(JSON.stringify(b.civicAlignment)).toBe(before);expect(alignmentWeight(w,b,q.townshipId,q.id,a.id)).toBe(0);expect(()=>deserializeWorld(serializeWorld(w))).toThrow('political alignment');
});
it('stronger disagreement overrides continuity and neither death nor departure transfers a faction to a successor',()=>{
 const {w,a,b,c,q}=alignmentFixture();relOf(b,c.id).affinity=90;relOf(b,c.id).trust=90;expect(oppositionReason(w,b,c,q)).toBe('');
 killPerson(w,a,'injuries');expect(factionHistory(w,q.townshipId).join(' ')).not.toContain('supporting Ada');expect(alignment(w,b,q.townshipId,q.id)).toBeUndefined();expect(mandate(w,q)).toBe(0);
});
it('observers and option ranking preserve complete state, and save/load continuation is deterministic',()=>{
 const {w,b,q}=alignmentFixture(),saved=serializeWorld(w);describePerson(w,b.id);factionHistory(w,q.townshipId);rankOptions(generateOptions(w,b,true,true));expect(serializeWorld(w)).toBe(saved);
 const loaded=deserializeWorld(saved);for(let i=0;i<80;i++){stepWorld(w);stepWorld(loaded);}expect(serializeWorld(w)).toBe(serializeWorld(loaded));
 setPoliticalAlignment(false);expect(factionHistory(w,q.townshipId)).toEqual([]);expect(alignment(w,b,q.townshipId)).toBeUndefined();
});
it('a split recent history produces no allegiance bonus, and moving away dissolves the visible local group',()=>{
 const {w,a,b,c,q}=alignmentFixture();b.civicAlignment=[];
 for(let i=0;i<4;i++)rememberAlignment(w,b,2000+i,q.townshipId,i%2?a.id:c.id);
 expect(alignment(w,b,q.townshipId)).toBeUndefined();
 b.civicAlignment=a.civicAlignment!.map(r=>({...r}));expect(factionHistory(w,q.townshipId).join(' ')).toContain('supporting Ada');
 const second={id:w.nextId++,name:'Other settlement',x:70,y:60,founded:w.tick};w.townships!.push(second);w.households.find(h=>h.id===a.hhId)!.townshipId=second.id;
 expect(factionHistory(w,q.townshipId).join(' ')).not.toContain('supporting Ada');expect(mandate(w,q)).toBe(0);
});
