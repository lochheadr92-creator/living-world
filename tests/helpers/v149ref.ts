import {createHash} from 'node:crypto';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stepWorld} from '../../src/sim/world';
import {conservationReport,snapshotInitial} from '../../src/sim/economy';
import {preservationScene} from './preservation';
import {startJob,workJob,facilityTick} from '../../src/sim/facilities';
import {RECIPE_BY_ID} from '../../src/sim/recipes';
import {startActivity,newActivity,stepActivity} from '../../src/sim/activities';
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function v149Continuation(){
 const w=createWorld({...currentWorldSettings('normal','forest',{immigration:true}),rulesVersion:149});
 for(let i=0;i<6000;i++)stepWorld(w);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);
 for(let i=0;i<120;i++){stepWorld(w);stepWorld(copy);}
 if(serializeWorld(w)!==serializeWorld(copy)||!conservationReport(w).ok)throw Error('Rules149 ordinary continuation failed');
 const f=preservationScene();f.w.settings.rulesVersion=149;f.w.weather.rain=0;f.b.store.items={meat:4};snapshotInitial(f.w);
 if(startJob(f.w,f.b,f.p,RECIPE_BY_ID.dry_meat,f.p.id,'preserve surplus meat'))throw Error('Cannot start reference batch');
 while(f.b.ops!.job!.phase==='work'){f.w.tick++;workJob(f.w,f.b,f.p);}
 f.b.ops!.job!.burnLeft=40;
 startActivity(f.w,f.p,newActivity(f.w,f.p,{kind:'withdraw',label:'Collect dried meat',goal:'bring preserved meat for meals',targetId:f.b.id,here:true,maxTicks:500,data:{items:{dried_meat:2}}}));
 for(let i=0;i<15;i++){f.w.tick++;stepActivity(f.w,f.p);facilityTick(f.w,f.b);}
 if(f.p.activity?.data.preservationWait!==15)throw Error('No saved wait');
 const staged=serializeWorld(f.w),twin=deserializeWorld(staged),person=twin.persons.find(p=>p.id===f.p.id)!,rack=twin.buildings.find(b=>b.id===f.b.id)!;
 for(let i=0;i<100;i++){f.w.tick++;stepActivity(f.w,f.p);facilityTick(f.w,f.b);twin.tick++;stepActivity(twin,person);facilityTick(twin,rack);}
 if(f.p.inv.dried_meat!==2||serializeWorld(f.w)!==serializeWorld(twin)||!conservationReport(f.w).ok)throw Error('Rules149 saved collection failed');
 return {saved:digest(raw),continued:digest(serializeWorld(w)),staged:digest(staged),stagedContinued:digest(serializeWorld(f.w))};
}
