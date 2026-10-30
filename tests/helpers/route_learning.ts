import {sourceContactScene} from './source_contact';
import {stepWorld} from '../../src/sim/world';
import {generateOptions,rankOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {T} from '../../src/sim/types';
import {makeSource} from '../../src/sim/sources';
import {ledgerCreate} from '../../src/sim/economy';
import {observe} from '../../src/sim/knowledge';
/** Two actual route failures from one place; second legal offered action is manually chosen after its normal cooldown. */
export function repeatedRouteScene(version=76){
 const f=sourceContactScene(version,true,false),{w,p}=f;p.cooldowns.pause=1e12;
 while(w.tick<((p.cooldowns['opt:'+f.key]??0)+1))stepWorld(w);
 p.cooldowns.pause=0;const o=rankOptions(generateOptions(w,p,true,true)).find(o=>o.key===f.key),a=o?.make?.();if(!a)throw new Error('No legal second route attempt');a.data.optKey=f.key;startActivity(w,p,a);
 for(let n=0;n<20&&p.activity?.id===a.id;n++)stepWorld(w);if(p.lastResult?.detail!=='no way to get there')throw new Error('Second route did not fail physically');
 w.sceneLabel='STAGED repeated route failure: legal preparation and two real blocked trips; second offered trip manually selected after its cooldown.';
 return {...f,second:a};
}
/** Restore the staged flat-world strip exactly, including the original northern shoreline. */
export function openStagedRoute(f:ReturnType<typeof repeatedRouteScene>):void{
 for(let y=0;y<f.w.H;y++)f.w.terrain[y*f.w.W+50]=y<12?T.DEEP:y<14?T.SHALLOW:y<16?T.SAND:T.GRASS;
}
/** A separate complete-material scene; no goods are placed in anyone's inventory or the site. */
export function complementaryRouteScene(){
 const f=repeatedRouteScene(),rock=makeSource(f.w,'rock',30,30,12);ledgerCreate(f.w,'stone',rock.amount,'staged known complementary source');observe(f.w,f.p,rock);openStagedRoute(f);
 f.w.sceneLabel='STAGED two blocked trips, a physically reopened route and known complementary stone; subsequent gathering, hauling and crafting are autonomous.';
 return {...f,rock};
}
