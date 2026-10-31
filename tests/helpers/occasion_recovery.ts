// STAGED supplied guest and familiar neighbour. The chat must be offered, accepted and completed by real handlers.
import {occasionParticipationScene} from './occasion_participation';
import {addPerson} from './kit';
import {RNG,hashString} from '../../src/sim/rng';
import {adjustRel} from '../../src/sim/relations';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {CURRENT_RULES_VERSION} from '../../src/sim/rulesversion';
export function occasionConversationScene(version=CURRENT_RULES_VERSION){
 const f=occasionParticipationScene(version),{w,p}=f;
 const q=addPerson({w,rng:new RNG(hashString('occasion-neighbour'))},'Ben',p.x+0.8,p.y,{age:35,hh:p.hhId,hunger:95,thirst:95,energy:95,inv:{},traits:{sociability:1}});
 q.nextThink=1000;q.needs.warmth=95;q.needs.safety=95;q.needs.social=30;
 adjustRel(p,q.id,w.tick,{aff:80,fam:60});adjustRel(q,p.id,w.tick,{aff:80,fam:60});
 for(let n=0;n<30;n++)stepWorld(w);
 const offered=generateOptions(w,q,true,true).options.find(o=>o.kind==='socialize'&&o.targetId===p.id&&o.label.startsWith('Chat with'));
 if(!offered?.make)throw new Error('No ordinary chat offer');const chat=offered.make();if(!chat)throw new Error('No chat approach');startActivity(w,q,chat);
 for(let n=0;n<30&&!p.convId;n++)stepWorld(w);
 if(!p.convId||p.suspended?.id!==f.a.id)throw new Error('The offered chat did not pause participation');
 w.sceneLabel='STAGED familiar neighbour starts an offered, accepted chat at the feast. Participation pauses without gaining time; ordinary talk completion decides whether it resumes.';
 return {...f,q,paid:p.suspended.progress};
}
