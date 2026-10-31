import {stage,addPerson,building,done,learn,pin} from './kit';
import {inviteAsk,inviteRespond} from '../../src/sim/meals';
import {transfer} from '../../src/sim/economy';
import {relOf} from '../../src/sim/relations';
/** Declared boundary fixture: real food transfer to an agreed table, no ordinary-occurrence claim. */
export function leftoverScene(version=90,laid=true){
 const s=stage('staged-meal-leftovers');s.w.settings.rulesVersion=version;s.w.settings.dynamics='rich';
 const host=addPerson(s,'Hosta',43.5,45.4,{inv:{bread:6},hunger:100,thirst:100,energy:100,traits:{sociability:1}});
 const guest=addPerson(s,'Gus',45,45,{hunger:60,thirst:100,energy:100,traits:{sociability:1}});
 const hall=building(s,'hall',42,42,0,{stone:3});
 s.w.tick=672;done(s);learn(s.w,host,hall);learn(s.w,guest,hall);
 relOf(guest,host.id).affinity=100;pin(host);pin(guest);
 const id=inviteAsk(s.w,host,guest,{mealPlan:{placeId:hall.id,placeName:'the communal hall',x:43.5,y:45.4}});
 inviteRespond(s.w,host,guest,id);const meal=s.w.meals.find(m=>m.id===id)!;
 if(laid){transfer(s.w,host.inv,meal.table,99,'bread',4,'person:'+host.id,'meal:'+meal.id,'declared staged table placement');meal.status='gathering';}
 s.w.sceneLabel='STAGED · Leftover food stays at the meal site';
 return {...s,host,guest,hall,meal};
}
