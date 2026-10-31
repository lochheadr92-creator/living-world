import {stage,building,site,addPerson,done,learn,pin} from './kit';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';
/** STAGED paid timber work and nearby cold fire. No ordinary occurrence claim. */
export function offcutScene(version=89){
 const s=stage('staged-offcut-fuel');s.w.settings.rulesVersion=version;s.w.settings.dynamics='rich';
 const p=addPerson(s,'Ada',39.5,42.5,{hunger:100,thirst:100,energy:100});
 const yard=building(s,'timber_yard',40,40,p.hhId,{wood:3});
 const fire=building(s,'fire',36,42);fire.fuel=0;
 const home=site(s,'house',44,44,p.hhId,p.id);
 done(s);learn(s.w,p,yard,fire,home);pin(p);s.w.sceneLabel='STAGED · Paid timber work leaves reusable fuel';
 return {...s,p,yard,fire,home};
}
export function selectOffcutOption(f:ReturnType<typeof offcutScene>,key:string){
 f.p.cooldowns.pause=0;const offer=generateOptions(f.w,f.p,true,true).options.find(o=>o.key===key);
 const a=offer?.make?.();if(!a)throw new Error('Missing offered action '+key);startActivity(f.w,f.p,a);return a;
}
