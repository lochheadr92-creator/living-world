import {expect,it} from 'vitest';
import {stage,addPerson,building,done,pin} from './helpers/kit';
import {DAY} from '../src/sim/constants';
import {CURRENT_RULES_VERSION} from '../src/sim/rulesversion';
import {newRelation} from '../src/sim/relations';
import {generateOptions} from '../src/sim/decision';
import {startActivity,newActivity,endActivity} from '../src/sim/activities';
import {stepWorld,hashWorld} from '../src/sim/world';
import {perceive} from '../src/sim/perception';
import {observe} from '../src/sim/knowledge';
import {lifeTickRich,describeGoal,goalProgress,goalNudge} from '../src/sim/life';
import {recordCompany,companyReason} from '../src/sim/companionship';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {setLivedLife} from '../src/sim/lived_life';
import {observeNow} from './helpers/inhabit';
import {conservationReport} from '../src/sim/economy';

function scene(){
 const s=stage('pavel-company'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=CURRENT_RULES_VERSION;w.tick=4*DAY;
 const p=addPerson(s,'Pavel',40,40,{age:71,inv:{wood:2},traits:{sociability:0.8,generosity:1}}),q=addPerson(s,'Kai',41,40,{age:30,traits:{curiosity:1,sociability:0.8,generosity:1}});
 done(s);for(const x of [p,q]){x.needs={hunger:95,thirst:95,energy:95,warmth:95,safety:95,social:90};x.partnerId=0;x.children=[];}
 p.relations[q.id]={...newRelation(),affinity:35,trust:35};q.relations[p.id]={...newRelation(),affinity:35,trust:35};
 p.goal={kind:'family',since:0,progress:0,done:0};pin(q);perceive(w,p);return {s,w,p,q};
}
it('offers ordinary company, records only completed contact, and later changes the elder hope with provenance',()=>{
 const {w,p,q}=scene();
 const before=serializeWorld(w),opts=generateOptions(w,p,true,true).options;
 expect(serializeWorld(w)).toBe(before);
 const chat=opts.find(o=>o.key===`socialize:${q.id}:chat`);expect(chat?.parts.some(x=>x[0]==='make time for continuing company')).toBe(true);
 startActivity(w,p,chat!.make!()!);
 for(let n=0;n<400&&!p.relations[q.id].company;n++)stepWorld(w);
 expect(p.relations[q.id].company?.days).toBe(1);
 expect(companyReason(w,p,q.id)).toBe(0);
 // A second day/contact is staged explicitly; it is not an ordinary-world activation claim.
 w.tick+=DAY;p.x=q.x-1;p.y=q.y;recordCompany(w,p,q,false);
 while((w.tick+p.id*53)%(DAY/2))w.tick++;
 lifeTickRich(w,p);expect(p.goal?.companyHope?.from).toBe(q.id);expect(describeGoal(w,p)).toContain('lasting company');expect(JSON.stringify(observeNow(w,p))).toContain('lasting company');
 expect(goalProgress(w,p,p.goal!)).toBeLessThan(1);
 const copy=deserializeWorld(serializeWorld(w));expect(hashWorld(copy)).toBe(hashWorld(w));expect(serializeWorld(copy)).toBe(serializeWorld(w));
});
it('offers a real held technique to a continuing friend, learns through contact, and credits useful time',()=>{
 const {s,w,p,q}=scene();const kiln=building(s,'kiln',43,40);observe(w,p,kiln);
 p.techniques={charcoal:{source:'initial',learned:0,teacher:0}};q.techniques={};
 recordCompany(w,p,q,false);recordCompany(w,q,p,false);perceive(w,p);
 const lesson=generateOptions(w,p,true,true).options.find(o=>o.key===`socialize:${q.id}:teach_technique`);expect(lesson).toBeTruthy();
 startActivity(w,p,lesson!.make!()!);
 for(let n=0;n<500&&!q.techniques.charcoal;n++)stepWorld(w);
 expect(q.techniques.charcoal?.source).toBe('taught');expect(q.techniques.charcoal?.teacher).toBe(p.id);
 for(let n=0;n<200&&p.convId;n++)stepWorld(w);
 expect(p.relations[q.id].company?.helped).toBe(1);expect(q.relations[p.id].company?.helped??0).toBe(0);expect(conservationReport(w).ok).toBe(true);
});
it('does not manufacture company from an interrupted offer, distant contact or predecessor rules',()=>{
 const {w,p,q}=scene();
 const o=generateOptions(w,p,true,true).options.find(o=>o.key===`socialize:${q.id}:chat`)!;
 startActivity(w,p,o.make!()!);endActivity(w,p,'interrupted','needed to leave');
 expect(p.relations[q.id].company).toBeUndefined();
 p.x=10;recordCompany(w,p,q,true);expect(p.relations[q.id].company).toBeUndefined();
 p.x=q.x-1;w.settings.rulesVersion=116;recordCompany(w,p,q,true);expect(p.relations[q.id].company).toBeUndefined();expect(companyReason(w,p,q.id)).toBe(0);
});
it('a real gift on the same day supplies the useful contribution without counting a second day',()=>{
 const {w,p,q}=scene();recordCompany(w,p,q,false);recordCompany(w,q,p,false);
 const a=newActivity(w,p,{kind:'socialize',label:'Offer wood',goal:'help',here:true,targetId:q.id,targetType:'person',data:{purpose:'offer',conv:{items:{wood:1}}}});startActivity(w,p,a);
 for(let n=0;n<400&&!p.lastInteraction;n++)stepWorld(w);
 expect(q.inv.wood).toBe(1);expect(p.relations[q.id].company).toMatchObject({days:1,helped:1});expect(conservationReport(w).ok).toBe(true);
});

it('keeps an achieved revised hope truthful and fingerprints its continuing evidence',()=>{
 const {w,p,q}=scene();recordCompany(w,p,q,true);
 p.goal!.companyHope={since:w.tick,from:q.id};p.goal!.done=w.tick;p.goal!.progress=1;
 const before=hashWorld(w);p.relations[q.id].company!.helped=2;expect(hashWorld(w)).not.toBe(before);
 w.tick+=4*DAY;while((w.tick+p.id*53)%(DAY/2))w.tick++;lifeTickRich(w,p);
 expect(describeGoal(w,p)).toContain('has what they hoped for, lasting company');expect(p.goal!.previous).toBeUndefined();
});
it('rejects future or predecessor company evidence in saves',()=>{
 const {w,p,q}=scene();recordCompany(w,p,q,false);p.relations[q.id].company!.last=w.tick+1;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid continuing-company');
 p.relations[q.id].company!.last=w.tick;w.settings.rulesVersion=116;
 expect(()=>deserializeWorld(serializeWorld(w))).toThrow('Invalid continuing-company');
});

it('the lab removal disables the revised hope contribution preference',()=>{
 const {s,w,p,q}=scene();const kiln=building(s,'kiln',43,40);observe(w,p,kiln);p.techniques={charcoal:{source:'initial',learned:0,teacher:0}};
 recordCompany(w,p,q,false);p.goal!.companyHope={since:w.tick,from:q.id};perceive(w,p);
 const option=generateOptions(w,p,true,true).options.find(o=>o.key===`socialize:${q.id}:teach_technique`)!;
 expect(goalNudge(w,p,option)).toBeGreaterThan(0);
 try{setLivedLife(false);expect(goalNudge(w,p,option)).toBe(0);}finally{setLivedLife(true);}
});
