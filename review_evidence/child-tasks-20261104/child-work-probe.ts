// ORDINARY observation (hooks only): children's gathering by source kind, Normal meadow, arrivals on, rules pinned.
// Usage: vite-node <this> <seed> <rules> <days>
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {serializeWorld,deserializeWorld} from '../../src/app/save';
import {stageOf} from '../../src/sim/people';
import {conservationReport} from '../../src/sim/economy';
import {DAY} from '../../src/sim/constants';
const [seed='meadow',rulesArg='156',daysArg='5']=process.argv.slice(2);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:Number(rulesArg)});
const twin=deserializeWorld(serializeWorld(w));
const starts:Record<string,number>={},ends:Record<string,number>={},first:unknown[]=[];
w.hooks={
 onActivityStart(p,a){if(a.kind!=='gather'||stageOf(w,p)!=='child')return;const k=String(p.beliefs[a.targetId]?.kind??'?');starts[k]=(starts[k]??0)+1;if(first.length<5&&(k==='tree'||k==='rock'))first.push({tick:w.tick,person:p.id,name:p.name,kind:k});},
 onActivityEnd(p,a,outcome,detail){if(a.kind!=='gather'||stageOf(w,p)!=='child')return;const k=`${a.data.stype??'?'}:${outcome}:${detail}`;ends[k]=(ends[k]??0)+1;},
};
const end=Number(daysArg)*DAY;while(w.tick<end){stepWorld(w);stepWorld(twin);}
delete w.hooks;
const children=w.persons.filter(p=>p.alive&&stageOf(w,p)==='child').length;
console.log(JSON.stringify({seed,rules:w.settings.rulesVersion,days:Number(daysArg),children,exactTwin:serializeWorld(w)===serializeWorld(twin),conserved:conservationReport(w).ok,alive:w.persons.filter(p=>p.alive).length,childGatherStarts:starts,childGatherEnds:ends,firstHeavy:first}));
