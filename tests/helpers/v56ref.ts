// Captured from codex/viewer-programme after rules-56 practical childcare (4f68699), before rules 57.
import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {settingsForProfile} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {practicalCareScene} from './practical_care';
import {generateOptions} from '../../src/sim/decision';
import {startActivity} from '../../src/sim/activities';

export function v56Continuation(){
 const w=createWorld({...settingsForProfile('normal','river',{dynamics:'rich',immigration:false}),rulesVersion:56});
 const digest=(world:typeof w)=>createHash('sha256').update(serializeWorld(world)).digest('hex');
 while(w.tick<5680)stepWorld(w);
 const saved=digest(w),copy=deserializeWorld(serializeWorld(w));
 while(w.tick<9600){stepWorld(w);stepWorld(copy);}
 // Also pin the newly changed duty while travelling, beyond the ordinary reference's opportunities.
 const f=practicalCareScene(56);f.ask();f.helper.cooldowns.pause=0;
 const watch=generateOptions(f.w,f.helper,true,true).options.find(o=>o.key===`watch:${f.child.id}`)!;
 startActivity(f.w,f.helper,watch.make!()!);for(let i=0;i<15;i++)stepWorld(f.w);
 const watchSaved=digest(f.w),watchCopy=deserializeWorld(serializeWorld(f.w));
 for(let i=0;i<800;i++){stepWorld(f.w);stepWorld(watchCopy);}
 return {saved,uninterrupted:digest(w),continued:digest(copy),watchSaved,watchUninterrupted:digest(f.w),watchContinued:digest(watchCopy)};
}
