import { contestFixture, stop, civicTalk } from './helpers/contest';
import { afterEach, expect, it } from 'vitest';
import { civicFixture } from './helpers/civic';
import { testKit } from '../src/sim/scenes';
import { RNG } from '../src/sim/rng';
import { observe } from '../src/sim/knowledge';
import { relOf } from '../src/sim/relations';
import { initialiseCouncil, mandate, mayCoordinate, oppositionReason, setCivicChoice, recount, confidence } from '../src/sim/civic_decision';
import { mayWorkProject, reviewParticipation, finishProject } from '../src/sim/townships';
import { serializeWorld, deserializeWorld } from '../src/app/save';
import { describePerson } from '../src/sim/inspect';
import { killPerson } from '../src/sim/lifecycle';
import { generateOptions, rankOptions } from '../src/sim/decision';
import { conservationReport, snapshotInitial } from '../src/sim/economy';
import { abortActivity, newActivity, startActivity } from '../src/sim/activities';
import { setExternalController } from '../src/sim/external';
import { stepWorld } from '../src/sim/world';
import type { Person,World } from '../src/sim/types';
afterEach(()=>{setCivicChoice(true);setExternalController(null);});
it('one founder has no mandate; actual support unlocks physical work',()=>{
 const {w,a,b,site,q}=contestFixture();expect(mandate(w,q)).toBe(0);expect(mayWorkProject(w,a,site.id)).toBe(false);
 civicTalk(w,a,b,site.id);expect(q.participants.find(m=>m.personId===b.id)?.supports,JSON.stringify({req:w.requests,q})).toBe(a.id);
 expect(mandate(w,q)).toBe(a.id);expect(mayWorkProject(w,b,site.id)).toBe(true);
 expect(conservationReport(w).ok).toBe(true);
});
it('a locally known, distrusted organiser can be challenged in offered options and an actual conversation changes coordinator',()=>{
 const {w,a,b,c,site,q}=contestFixture();civicTalk(w,a,b,site.id);stop(w,a,b,c);
 civicTalk(w,a,c,site.id);stop(w,a,b,c);
 expect(q.participants.find(m=>m.personId===c.id)?.status).toBe('refused');
 expect(mayCoordinate(w,c,q)).toBe(true);
 expect(rankOptions(generateOptions(w,c,true,true)).some(o=>o.key.endsWith(':recruit'))).toBe(true);
 c.cooldowns['talk'+b.id]=0;b.cooldowns['talk'+c.id]=0;
 civicTalk(w,c,b,site.id);
 expect(q.council!.candidates.map(x=>x.personId),JSON.stringify({requests:w.requests,log:c.log})).toEqual([a.id,c.id]);expect(mandate(w,q)).toBe(c.id);
 expect(q.participants.find(m=>m.personId===b.id)?.supports).toBe(c.id);
 expect(b.commitments.some(cm=>cm.to===a.id&&cm.status==='interrupted')).toBe(true);
 expect(mayWorkProject(w,a,site.id)).toBe(false);expect(mayWorkProject(w,c,site.id)).toBe(true);
 expect(conservationReport(w).ok).toBe(true);
 const saved=serializeWorld(w);describePerson(w,b.id);expect(serializeWorld(w)).toBe(saved);
 expect(serializeWorld(deserializeWorld(saved))).toBe(saved);
});
it('a tie blocks both coalitions; urgent withdrawal and a coordinator death revoke authority',()=>{
 const {w,a,b,c,q,site}=contestFixture();q.council!.candidates.push({personId:c.id,tick:0,reason:'staged alternative'});
 q.participants.push({personId:b.id,requestId:0,since:0,status:'supporting',reason:'staged support',materials:{},work:0,supports:c.id});
 recount(w,q);expect(mandate(w,q)).toBe(0);expect(mayWorkProject(w,b,site.id)).toBe(false);
 q.participants[1].supports=a.id;recount(w,q);expect(mandate(w,q)).toBe(a.id);
 b.needs.hunger=5;reviewParticipation(w,b);expect(mandate(w,q)).toBe(0);
 b.needs.hunger=90;q.participants[1].status='supporting';recount(w,q);killPerson(w,a,'injuries');expect(mayWorkProject(w,b,site.id)).toBe(false);
});
it('opposition uses personal relationships and witnessed outcomes; an unknown project cannot nominate a candidate',()=>{
 const {w,a,b,c,q}=contestFixture();expect(mayCoordinate(w,c,q)).toBe(false);
 q.participants.push({personId:b.id,requestId:0,since:0,status:'supporting',reason:'fixture',materials:{},work:0,supports:a.id});
 relOf(b,c.id).affinity=25;relOf(b,c.id).trust=10;
 expect(oppositionReason(w,b,c,q)).toContain('prefers');
 const before=confidence(b,c.id);b.civicOutcomes=[{projectId:999,organiserId:c.id,success:true,tick:0},{projectId:1000,organiserId:c.id,success:true,tick:0}];
 expect(confidence(b,c.id)-before).toBeCloseTo(0.08);expect(oppositionReason(w,b,c,q)).toBe('');
});
it('previous rules and the ablation keep the original one-organiser project',()=>{
 const f=civicFixture();expect(mayWorkProject(f.w,f.a,f.site.id)).toBe(true);
 const c=contestFixture();setCivicChoice(false);expect(mayWorkProject(c.w,c.a,c.site.id)).toBe(true);
});

it('the current collective decision still permits conserved physical completion',()=>{
 const {w,a,b,site,q}=contestFixture();civicTalk(w,a,b,site.id);a.cooldowns.pause=0;b.cooldowns.pause=0;
 const restore=setExternalController({controls:(_w,p)=>p.id===a.id||p.id===b.id,choose:(_w,_p,_ctx,ranked)=>{
  const o=ranked.find(o=>o.targetId===site.id&&(o.kind==='haul'||o.kind==='build'));return o?{kind:'pick',key:o.key}:{kind:'fallback',reason:'no project step'};
 }});
 try{for(let i=0;i<5000&&q.status==='active';i++)stepWorld(w);}finally{restore();}
 expect(q.status,JSON.stringify(q)).toBe('completed');expect(q.council!.coordinatorId).toBe(a.id);
 expect(q.participants.reduce((n,m)=>n+(m.materials.wood??0),0)).toBe(10);
 expect(q.participants.reduce((n,m)=>n+(m.materials.stone??0),0)).toBe(4);
 expect(q.participants.reduce((n,m)=>n+m.work,0)).toBeCloseTo(640,5);
 expect(conservationReport(w).ok).toBe(true);
});

it('the lab ablation restores organiser outcome credit as well as work access',()=>{
 const {w,a,q,site}=contestFixture();setCivicChoice(false);
 finishProject(w,site,null,'staged cancellation');
 expect(a.civicOutcomes?.at(-1)).toMatchObject({organiserId:a.id,success:false});
});
