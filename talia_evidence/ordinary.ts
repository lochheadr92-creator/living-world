import {writeFileSync} from 'node:fs';
import {createWorld} from '../src/sim/factory';
import {currentWorldSettings} from '../src/sim/profiles';
import {stepWorld,hashWorld} from '../src/sim/world';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {conservationReport} from '../src/sim/economy';
import {isChildTime} from '../src/sim/childhood';
const rows=[];
for(const seed of ['meadow','river','forest']){
 const w=createWorld(currentWorldSettings('normal',seed,{immigration:true}));
 const events:any[]=[];w.hooks={onActivityEnd(p,a,outcome,detail){if(a.data.childhoodResult)events.push({tick:w.tick,who:p.name,age:p.birthTick,outcome,detail});}};
 for(let n=0;n<12000;n++)stepWorld(w);
 const copy=deserializeWorld(serializeWorld(w));for(let n=0;n<120;n++){stepWorld(w);stepWorld(copy);}
 const talia=w.persons.find(p=>p.name==='Talia');
 rows.push({seed,tick:w.tick,hash:hashWorld(w),conservation:conservationReport(w),continuationEqual:serializeWorld(w)===serializeWorld(copy),events,talia:talia?{needs:talia.needs,health:talia.health,relations:talia.relations,skills:talia.skills}:null});
 console.log(seed,events.length,rows.at(-1)!.continuationEqual);
}
writeFileSync('talia_evidence/ordinary.json',JSON.stringify(rows,null,2));
