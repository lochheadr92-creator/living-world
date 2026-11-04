// ORDINARY diagnosis: people critically hungry (hunger < 25) carrying edible food while doing something other than eating.
// Read-only sampling every 60 ticks; Normal, arrivals on, rules pinned. Usage: vite-node <this> <seed> <rules> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {conservationReport} from '../../src/sim/economy';
import {stageOf} from '../../src/sim/people';
import {isFood} from '../../src/sim/social';
import {DAY} from '../../src/sim/constants';
import type {ItemKind} from '../../src/sim/types';
const [seed='river',rules='157',days='10',out='hungry.json']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rules)});
const twin=deserializeWorld(serializeWorld(w));
const by:Record<string,number>={};const inc=(k:string)=>{by[k]=(by[k]??0)+1;};const rows:unknown[]=[];let critical=0;
while(w.tick<Number(days)*DAY){stepWorld(w);stepWorld(twin);if(w.tick%60)continue;
 for(const q of w.persons){if(!q.alive||q.needs.hunger>=25)continue;critical++;
  const food=(Object.keys(q.inv) as ItemKind[]).filter(k=>isFood(k)&&(q.inv[k]??0)>0);if(!food.length){inc('critical, no food in pack');continue;}
  const a=q.activity;const k=a?`${a.kind}${a.need?':'+a.need:''}`:'idle';inc(`critical, holds food | ${k}`);
  if(rows.length<40&&a?.kind!=='eat')rows.push({tick:w.tick,name:q.name,stage:stageOf(w,q),hunger:Math.round(q.needs.hunger),food:Object.fromEntries(food.map(f=>[f,q.inv[f]])),doing:a?.label??null,need:a?.need??null,committedUntil:a?.minCommit??null});}}
const res={seed,rules:Number(rules),days:Number(days),exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,criticalSamples:critical,by,rows};
writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify({seed,exactTwin:res.exactTwin,conserved:res.conserved,critical,by}));
