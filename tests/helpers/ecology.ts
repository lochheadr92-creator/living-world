import {stage,addPerson,done,pin} from './kit';
import {createPlot} from '../../src/sim/farming';
import {makeSource} from '../../src/sim/sources';
import {observe} from '../../src/sim/knowledge';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
import {stepWorld} from '../../src/sim/world';
import {setExternalController} from '../../src/sim/external';
import type {Person,World} from '../../src/sim/types';

/** Declared healthy farmer, two prepared plots and two comparable berry patches.
 * Initial tilling is staged; sowing, harvesting and later field care use real offered activities. */
export function ecologyScene(version=86){
 const s=stage('ecology-comparable-places'),w=s.w;w.settings.dynamics='rich';w.settings.rulesVersion=version;
 const p=addPerson(s,'Ada',40.5,40.5,{age:34,inv:{seeds:6,fruit:4,water:4},hunger:100,thirst:100,energy:100});
 const a=createPlot(w,43,40,p.hhId),b=createPlot(w,46,40,p.hhId);a.state=b.state='tilled';
 const bush=makeSource(w,'berry_bush',40,44),other=makeSource(w,'berry_bush',44,44);done(s);
 for(const e of [a,b,bush,other])observe(w,p,e);pin(p);w.sceneLabel='STAGED · Persistent productive condition and physical field rest';
 return {w,p,a,b,bush,other};
}
/** Manually choose one currently offered action. Other choices are held, not physical execution. */
export function doEcologyOption(w:World,p:Person,key:string,afterStart?:()=>void){
 p.cooldowns.pause=0;const o=generateOptions(w,p,true,true).options.find(o=>o.key===key);
 if(!o?.make)throw new Error('Missing offered ecology action '+key);
 const a=o.make();if(!a)throw new Error('Unreachable offered ecology action '+key);startActivity(w,p,a);afterStart?.();
 const restore=setExternalController({controls:(_w,q)=>q.id===p.id,choose:()=>({kind:'defer'})});
 try{for(let n=0;n<900&&p.activity?.id===a.id;n++)stepWorld(w);}finally{restore();}
 pin(p);return a;
}
