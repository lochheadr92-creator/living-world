// STAGED: a promised food delivery whose recipient moved after asking, so the helper's own note is wrong and the hand-over
// fails; a third person who has seen the recipient since stands near the helper. The question, answer and delivery are
// the engine's own; only the recipient's move and the bystander are placed.
import {foodHelpScene} from './food_help';
import {addPerson,pin} from './kit';
import {perceive} from '../../src/sim/perception';
import {relOf} from '../../src/sim/relations';
import {endActivity,newActivity,startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
export function locationQuestionScene(version=105,caraKnows=true){
 // the fish spot is near, so the fetch and the return fall well inside the spoken promise; the recorded food-help scenes keep theirs
 const f=foodHelpScene({version,sourceAt:[50,40]});f.ask();
 // the recipient's hunger was the reason for the ask; it is declared eased so her staged wait is not broken by her own needs
 f.ada.needs.hunger=80;
 const r=f.w.requests.find(q=>q.from===f.ada.id&&q.to===f.ben.id)!;if(r.status!=='promised')throw new Error('No food promise: '+r.status);
 // Ada walks away to a declared spot out of Ben's sight and rests there
 f.ada.cooldowns.pause=0;if(f.ada.activity)endActivity(f.w,f.ada,'interrupted','staged');
 const walk=newActivity(f.w,f.ada,{kind:'wander',label:'Staged move after asking',goal:'staged recipient move',tx:30,ty:62,spotX:30,spotY:62,minCommit:600,maxTicks:900,duration:1,data:{sticky:true}});startActivity(f.w,f.ada,walk);
 for(let n=0;n<900&&f.ada.activity?.id===walk.id;n++)stepWorld(f.w);if(Math.hypot(f.ada.x-30,f.ada.y-62)>1.5)throw new Error('Ada did not move');
 // she rests there as the food-help fixture does (a paused person cannot be handed anything, by the give handler's own rule)
 startActivity(f.w,f.ada,newActivity(f.w,f.ada,{kind:'rest',label:'Resting (staged)',goal:'staged: waiting at the new spot',need:'warmth',targetId:0,here:true,amount:3000,utility:100,minCommit:3000,maxTicks:3200,data:{sticky:true}}));
 // Ben fetches the promised food and goes where he last saw her; the hand-over fails there on his own knowledge
 f.ben.cooldowns.pause=0;for(let n=0;n<4000&&!f.ben.log.some(l=>/not where I expected/.test(l.text));n++)stepWorld(f.w);
 if(!f.ben.log.some(l=>/not where I expected/.test(l.text)))throw new Error('Hand-over did not fail: '+JSON.stringify({log:f.ben.log.slice(-5),inv:f.ben.inv,commitments:f.ben.commitments}));
 pin(f.ben);if(f.ben.activity)endActivity(f.w,f.ben,'interrupted','staged pause');
 // the fetch and the night have cost him; his own needs are declared met so the remaining promise time is about his knowledge, not his sleep
 f.ben.needs.energy=100;f.ben.needs.hunger=100;f.ben.needs.thirst=100;
 // Cara, beside Ben; she has personally seen Ada at the new spot a moment ago (declared note), or knows nothing
 const cara=addPerson(f.s,'Cara',f.ben.x+1.5,f.ben.y,{age:31,hunger:100,thirst:100,energy:100,traits:{sociability:1}});
 relOf(f.ben,cara.id).affinity=40;relOf(cara,f.ben.id).affinity=40;pin(cara);cara.needs.warmth=100;cara.needs.safety=100;
 if(caraKnows)cara.whereabouts[f.ada.id]={x:f.ada.x,y:f.ada.y,tick:f.w.tick-20};
 stepWorld(f.w); // one tick so the newcomer is in the spatial index before anybody looks around
 perceive(f.w,f.ben);perceive(f.w,cara);
 f.w.sceneLabel='STAGED: a promised delivery whose recipient moved; a bystander who saw her stands by the helper';
 return {...f,cara,request:r};
}
