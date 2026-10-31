import {stage,addPerson,done,pin} from './kit';
import {T} from '../../src/sim/types';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
/** STAGED small shore and offered food journey, not ordinary flood occurrence. */
export function floodScene(version=88){
 const s=stage('staged-flood-access'),w=s.w;w.settings.rulesVersion=version;w.settings.dynamics='rich';
 w.terrain[40*w.W+42]=T.SHALLOW;
 const p=addPerson(s,'Ada',36.5,40.5,{hunger:20,thirst:100,energy:100});
 const food=makeSource(w,'berry_bush',48,40,10);done(s);observe(w,p,food);pin(p);w.tick=7;w.weather.storm=1;
 w.sceneLabel='STAGED · A flood changes Ada’s food journey';return {...s,p,food};
}
export function startFloodJourney(f:ReturnType<typeof floodScene>){
 f.p.cooldowns.pause=0;
 const o=generateOptions(f.w,f.p,true,true).options.find(o=>o.kind==='gather'&&o.targetId===f.food.id);
 const a=o?.make?.();if(!a)throw new Error('Missing staged offered food journey');startActivity(f.w,f.p,a);return a;
}
