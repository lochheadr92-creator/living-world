import { afterEach, expect, it } from 'vitest';
import { stage, addPerson, done } from './helpers/kit';
import { noteDeed, shareRumour, reputationOf, setSingleCount } from '../src/sim/reputation';
import { relOf } from '../src/sim/relations';
import { onGift, checkCommitments, createRequest, willingness } from '../src/sim/social';
import { rememberRequest } from '../src/sim/social_memory';
import { relationshipHistory } from '../src/sim/history';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson } from '../src/sim/inspect';
import { DAY } from '../src/sim/constants';
import { parseIntervention } from '../scripts/lab/lab';
afterEach(()=>setSingleCount(true));
function setup(version=13){
 const s=stage('social-memory');s.w.settings.dynamics='rich';s.w.settings.rulesVersion=version;
 const a=addPerson(s,'Ada',40,40),b=addPerson(s,'Ben',42,40),c=addPerson(s,'Cora',43,40);
 done(s);s.w.tick=100;return {w:s.w,a,b,c};
}
it('a direct gift affects the relationship once, while its retelling remains influential',()=>{
 const {w,a,b,c}=setup();onGift(w,a,b,{berries:1},'test physical gift already accounted');
 expect(b.relations[a.id].affinity).toBeGreaterThan(0);
 expect(b.heard?.find(r=>r.about===a.id)?.relationshipApplied).toBe(true);
 expect(reputationOf(w,b,a.id)).toBe(0);
 // No direct witnessing for this comparison: remove Cora's staged witness entry/relationship.
 c.heard=[];delete c.relations[a.id];
 expect(shareRumour(w,b,c)).toBe(true);
 expect(c.relations[a.id]).toBeUndefined();expect(reputationOf(w,c,a.id)).toBeGreaterThan(0);
 expect(shareRumour(w,b,c)).toBe(false);
 w.tick+=12*DAY;expect(reputationOf(w,c,a.id)).toBe(0);
});
it('legacy version 12 retains its double effect and the lab ablation restores it',()=>{
 const {w,a,b,c}=setup(12);noteDeed(w,a,b,'generous','Ben gave food');shareRumour(w,a,c);
 expect(c.relations[b.id].affinity).toBeGreaterThan(0);expect(reputationOf(w,c,b.id)).toBeGreaterThan(0);
 const current=setup();const restore=parseIntervention('rich-no-reputation-dedup').install!();
 noteDeed(current.w,current.a,current.b,'generous','Ben gave food');shareRumour(current.w,current.a,current.c);
 expect(current.c.relations[current.b.id].affinity).toBeGreaterThan(0);restore();
});
it('broken prior work lowers willingness with no second reputation penalty',()=>{
 const f=setup();relOf(f.b,f.a.id).affinity=40;relOf(f.b,f.a.id).trust=30;
 const before=willingness(f.w,f.b,f.a,0.3);
 const r=createRequest(f.w,f.b,f.a,{kind:'help_build'});r.status='promised';
 f.a.commitments.push({id:f.w.nextId++,requestId:r.id,kind:'help_build',to:f.b.id,item:null,amount:1,siteId:0,made:0,deadline:90,status:'active',delivered:0,grace:0});
 checkCommitments(f.w,f.a);
 expect(f.a.commitments[0].status).toBe('broken');expect(willingness(f.w,f.b,f.a,0.3)).toBeLessThan(before);
 expect(reputationOf(f.w,f.b,f.a.id)).toBe(0);
 expect(f.b.socialMemory).toEqual([expect.objectContaining({requestId:r.id,outcome:'broken',otherId:f.a.id})]);
 expect(relationshipHistory(f.w,f.b).join(' ')).toMatch(/Request #.*broken/);
});
it('receipts are bounded, not duplicated, and do not inform an absent asker',()=>{
 const {w,a,b}=setup();
 for(let i=0;i<40;i++){const r=createRequest(w,a,b,{kind:'wood'});r.status='declined';r.note='own needs';rememberRequest(w,r);rememberRequest(w,r);}
 expect(a.socialMemory).toHaveLength(32);expect(new Set(a.socialMemory!.map(m=>m.requestId)).size).toBe(32);
 a.x=70;const r=createRequest(w,a,b,{kind:'wood'});r.status='failed';r.note='no wood found';rememberRequest(w,r);
 expect(a.socialMemory!.some(m=>m.requestId===r.id)).toBe(false);
 expect(b.socialMemory!.some(m=>m.requestId===r.id)).toBe(true);
});
it('relationship history is pure, honest about missing causes, and survives a save',()=>{
 const {w,a,b}=setup();relOf(a,b.id);
 const text=relationshipHistory(w,a).join(' ');expect(text).toMatch(/Earlier cause not recorded/);
 const before=serializeWorld(w);describePerson(w,a.id);relationshipHistory(w,a);
 expect(serializeWorld(w)).toBe(before);
 const loaded=deserializeWorld(before),loadedA=loaded.persons.find(p=>p.id===a.id)!;
 expect(relationshipHistory(loaded,loadedA)).toEqual(relationshipHistory(w,a));
 const r=createRequest(w,a,b,{kind:'wood'});r.status='declined';r.note='own need';rememberRequest(w,r);
 const saved=serializeWorld(w),restored=deserializeWorld(saved);
 expect(serializeWorld(restored)).toBe(saved);
 expect(relationshipHistory(restored,restored.persons.find(p=>p.id===a.id)!)).toEqual(relationshipHistory(w,a));
});

it('a relationship consequence marks an already known same-kind story as counted',()=>{
 const {w,a,b}=setup();noteDeed(w,b,a,'generous','earlier observed gift');
 expect(reputationOf(w,b,a.id)).toBeGreaterThan(0);
 noteDeed(w,b,a,'generous','gift with direct relationship consequence',true);
 expect(reputationOf(w,b,a.id)).toBe(0);
});
