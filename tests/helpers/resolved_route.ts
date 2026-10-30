import {stage,addPerson,site,done,give} from './kit';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {T} from '../../src/sim/types';

/** STAGED legal gathers, a physical barrier and its removal. No failure/correction is injected. */
export function correctedRouteScene(version=77){
 const s=stage('resolved-route'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Mara',20.5,30.5,{age:35,hunger:100,thirst:100,energy:100});
 const target=site(s,'hut',20,40,p.hhId,p.id),tree=makeSource(w,'tree',28,30,12);
 give(w,p,'axe');done(s);observe(w,p,tree);observe(w,p,target);const key=`gather:${tree.id}`;
 const start=()=>{const o=generateOptions(w,p,true,true).options.find(o=>o.key===key),a=o?.make?.();if(!a)throw new Error('Missing legal gather');a.data.optKey=key;startActivity(w,p,a);return a;};
 const first=start();for(let y=0;y<w.H;y++)w.terrain[y*w.W+24]=T.DEEP;
 for(let n=0;n<20&&p.activity?.id===first.id;n++)stepWorld(w);
 if(p.lastResult?.detail!=='no way to get there')throw new Error('Expected physical route failure');
 p.cooldowns.pause=1e12;while(w.tick<(p.cooldowns['opt:'+key]??0)+1)stepWorld(w);
 for(let y=0;y<w.H;y++)w.terrain[y*w.W+24]=y<12?T.DEEP:y<14?T.SHALLOW:y<16?T.SAND:T.GRASS;
 p.cooldowns.pause=0;const second=start();
 for(let n=0;n<500&&!p.failures[tree.id]?.resolved;n++)stepWorld(w);
 if(!p.failures[tree.id]?.resolved)throw new Error('No actual corrective arrival');
 w.sceneLabel='STAGED: two legally selected gathering trips, a real blocked path and a physically reopened route. Arrival corrects the earlier failure; remembered stock is still an estimate.';
 return {w,p,tree,target,first,second};
}
