// Declared skilled builder and bare site: real foundation work stops below the promised 40-tick share.
import {expect,it} from 'vitest';
import {stage,addPerson,site,done,pin} from './helpers/kit';
import {observe} from '../src/sim/knowledge';
import {perceive} from '../src/sim/perception';
import {relOf} from '../src/sim/relations';
import {generateOptions,rankOptions} from '../src/sim/decision';
import {newActivity,startActivity} from '../src/sim/activities';
import {stepWorld} from '../src/sim/world';
import {setExternalController} from '../src/sim/external';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
it('reports actual partial foundation work through a refused extension without inventing completion',()=>{
 const s=stage('partial-delay-foundation'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=85;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100}),helper=addPerson(s,'Ben',42,40,{age:34,inv:{fruit:4},hunger:100,thirst:100,energy:100,traits:{generosity:1,diligence:1}}),target=site(s,'lean_to',60,40,parent.hhId,parent.id);helper.skills.build=1.2;done(s);
 for(const p of [parent,helper]){observe(w,p,target);perceive(w,p);}relOf(parent,helper.id).affinity=70;relOf(helper,parent.id).affinity=70;pin(helper);
 const ask=generateOptions(w,parent,true,true).options.find(o=>o.tag==='recruit')!;expect(ask).toBeDefined();startActivity(w,parent,ask.make!()!);for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='help_build'&&r.status!=='pending')&&!parent.convId)break;}
 const request=w.requests.find(r=>r.kind==='help_build')!,c=helper.commitments.find(c=>c.requestId===request.id)!;expect(request.status).toBe('promised');pin(parent);helper.cooldowns.pause=0;
 const build=generateOptions(w,helper,true,true).options.find(o=>o.kind==='build'&&o.targetId===target.id)!;expect(build).toBeDefined();startActivity(w,helper,build.make!()!);const id=helper.activity!.id;
 const hold=()=>setExternalController({controls:(_w,p)=>[parent.id,helper.id].includes(p.id),choose:()=>({kind:'defer'})});let restore=hold();try{for(let n=0;n<700&&helper.activity?.id===id;n++)stepWorld(w);}finally{restore();}pin(helper);
 expect(c.status).toBe('active');expect(c.contrib).toBeGreaterThan(0);expect(c.contrib).toBeLessThan(40);expect(c.attempt?.phase).toBe('work');expect(target.work).toBeGreaterThan(0);
 const x=helper.x-4,y=helper.y;parent.cooldowns.pause=0;const walk=newActivity(w,parent,{kind:'wander',label:'Staged inspection and rendezvous',goal:'staged rendezvous after partial work',tx:x,ty:y,spotX:x,spotY:y,minCommit:700,maxTicks:1000,duration:1,data:{sticky:true}});startActivity(w,parent,walk);restore=hold();try{for(let n=0;n<900&&parent.activity?.id===walk.id;n++)stepWorld(w);}finally{restore();}pin(parent);for(const p of [parent,helper])perceive(w,p);
 helper.cooldowns.pause=0;const delay=rankOptions(generateOptions(w,helper,true,true)).find(o=>o.tag==='delay');expect(delay).toBeDefined();const actualWork=c.contrib;startActivity(w,helper,delay!.make!()!);restore=hold();try{for(let n=0;n<400&&!c.delay?.response;n++)stepWorld(w);}finally{restore();}
 const m=parent.socialMemory!.find(m=>m.requestId===request.id)!;expect(parent.relations[helper.id].trust).toBeLessThan(10);expect(c.delay?.response).toBe('refused');expect(c.delay?.responseReason).toBe('I am not confident enough to wait longer');expect(c.deadline).toBe(c.delay!.priorDeadline);expect(m.expectation!.delay?.contrib).toBe(actualWork);expect(m.expectation!.received).toBe(0);expect(m.task?.workReceipt).toBeUndefined();expect(m.completion).toBeUndefined();expect(c.status).toBe('active');expect(w.byId.get(target.id)?.ent).toBe('site');expect(conservationReport(w).ok).toBe(true);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
