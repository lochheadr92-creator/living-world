import {stage,addPerson,done,pin} from './kit';
import {DAY} from '../../src/sim/constants';
import {relOf} from '../../src/sim/relations';
import {newActivity,startActivity,stepActivity} from '../../src/sim/activities';
import {updateConversations} from '../../src/sim/social';
export function coachingFixture(){const s=stage('skill-coaching'),w=s.w;w.settings={...w.settings,dynamics:'rich',rulesVersion:142};w.tick=DAY;const p=addPerson(s,'Ada',40,40,{traits:{sociability:1,curiosity:1}}),q=addPerson(s,'Ben',41.5,40,{traits:{sociability:1,generosity:1}});done(s);for(const x of [p,q]){x.needs={hunger:95,thirst:95,energy:95,warmth:95,safety:95,social:90};pin(x);}p.skills.wood=.7;q.skills.wood=1.5;for(const [a,b] of [[p,q],[q,p]])Object.assign(relOf(a,b.id),{affinity:90,trust:60,familiarity:5,kin:'sibling'});return {...s,p,q};}
export function coachingTick(f:ReturnType<typeof coachingFixture>){f.w.tick++;stepActivity(f.w,f.p);stepActivity(f.w,f.q);updateConversations(f.w);}
export function startCoaching(f:ReturnType<typeof coachingFixture>){startActivity(f.w,f.p,newActivity(f.w,f.p,{kind:'socialize',label:'Ask for wood coaching',goal:'practise woodcutting',targetId:f.q.id,targetType:'person',tx:f.q.x,ty:f.q.y,spotX:f.p.x,spotY:f.p.y,data:{purpose:'learn_skill',conv:{skill:'wood'}}}));for(let i=0;i<80&&!f.w.conversations[0]?.skillLesson;i++)coachingTick(f);return f.w.conversations[0];}
