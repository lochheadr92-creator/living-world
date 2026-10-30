import {stage,addPerson,done,pin} from './kit';
import {relOf} from '../../src/sim/relations';
import {perceive} from '../../src/sim/perception';
import {generateOptions} from '../../src/sim/decision';
import {startActivity,newActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
/** STAGED injured parent, nearby resting child and two willing neighbours. The request/watch are real offered actions. */
export function watchLearningScene(version=79){
 const s=stage('witnessed-watch'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const parent=addPerson(s,'Ada',40,40,{age:34,hunger:100,thirst:100,energy:100});
 const child=addPerson(s,'Eli',40,42.5,{age:5,hh:parent.hhId,hunger:40,thirst:80,energy:80});
 const helper=addPerson(s,'Ben',42,40,{age:33,inv:{bread:8,water:3},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1,diligence:1}});
 const other=addPerson(s,'Cora',39.5,39.5,{age:32,inv:{bread:8,water:3},hunger:100,thirst:100,energy:100,traits:{generosity:1,sociability:1,diligence:1}});
 parent.injury={kind:'sprain',since:0,until:5000,how:'staged provider injury'};done(s);pin(helper);pin(other);
 for(const q of [helper,other]){relOf(parent,q.id).affinity=70;relOf(q,parent.id).affinity=70;relOf(parent,q.id).trust=70;relOf(q,parent.id).trust=70;}
 for(const p of [parent,child,helper,other])perceive(w,p);
 startActivity(w,child,newActivity(w,child,{kind:'rest',label:'Resting (staged)',goal:'staged: staying near the injured parent',here:true,minCommit:1600,maxTicks:1800,amount:1600,data:{sticky:true}}));
 const o=generateOptions(w,parent,true,true).options.find(o=>o.key===`socialize:${helper.id}:request:watch`),ask=o?.make?.();if(!ask)throw new Error('No offered watch request');startActivity(w,parent,ask);
 for(let n=0;n<600;n++){stepWorld(w);if(w.requests.some(r=>r.kind==='watch'&&r.status!=='pending')&&!parent.convId)break;}
 const request=w.requests.find(r=>r.kind==='watch')!;if(request?.status!=='promised')throw new Error('Watch was not voluntarily accepted');pin(parent);helper.cooldowns.pause=0;
 const watch=generateOptions(w,helper,true,true).options.find(o=>o.key===`watch:${child.id}`)?.make?.();if(!watch)throw new Error('No accepted watch offered');startActivity(w,helper,watch);
 w.sceneLabel='STAGED nearby childcare: actual accepted request and registered watch, with an awake parent nearby and a resting child. No completion or learned competence is assigned.';
 return {w,parent,child,helper,other,request,watch};
}
export function finishWitnessedWatch(version=79){const f=watchLearningScene(version);for(let n=0;n<1000&&f.request.status==='promised';n++)stepWorld(f.w);if(f.request.status!=='fulfilled')throw new Error('Watch did not complete');return f;}
/** Staged quiet interval: hold neighbours/child between trials; no needs, memories or cooldowns are reset. */
export function laterWatchScene(version=79){const f=finishWitnessedWatch(version);pin(f.helper);pin(f.child);while(f.w.tick<800)stepWorld(f.w);perceive(f.w,f.parent);return f;}
