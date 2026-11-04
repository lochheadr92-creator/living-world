// Rules 161 changes only a reason string. Run the same ordinary world at 160 and at 161 side by side and compare a
// behaviour digest (positions, needs, packs, activity kind/target/phase) every 60 ticks; count the endings that now say
// the place looked empty. Usage: vite-node <this> <seed> <days> <out>
import {writeFileSync} from 'node:fs';
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {conservationReport} from '../../src/sim/economy';
import {DAY} from '../../src/sim/constants';
import {FOUND_EMPTY_REASON} from '../../src/sim/found_empty';
import type {World} from '../../src/sim/types';
const [seed='river',days='25',out='same.json']=process.argv.slice(2);
const make=(rules:number)=>createWorld({...currentWorldSettings('normal',seed),rulesVersion:rules});
const a=make(160),b=make(161);
const digest=(w:World)=>JSON.stringify(w.persons.map(p=>[p.id,p.alive,Math.round(p.x*100),Math.round(p.y*100),Object.values(p.needs).map(v=>Math.round((v as number)*1000)),p.inv,p.activity?.kind??null,p.activity?.targetId??null,p.activity?.phase??null]));
const reasons:Record<string,number>={};const empties:Record<string,number>={};let firstDiff:number|null=null,samples=0;
b.hooks={onActivityEnd:(p,act,outcome,detail)=>{if(outcome!=='interrupted')return;if(detail===FOUND_EMPTY_REASON){empties[`${act.kind}${act.need?':'+act.need:''}`]=(empties[`${act.kind}${act.need?':'+act.need:''}`]??0)+1;}
 if(detail==='something better came up'&&act.kind==='gather')reasons.gatherStillBetter=(reasons.gatherStillBetter??0)+1;}};
while(a.tick<Number(days)*DAY){stepWorld(a);stepWorld(b);
 if(a.tick%60===0){samples++;if(firstDiff===null&&digest(a)!==digest(b))firstDiff=a.tick;}}
delete b.hooks;
const res={seed,days:Number(days),samples,firstBehaviourDiffTick:firstDiff,identicalBehaviour:firstDiff===null,conserved160:conservationReport(a).ok,conserved161:conservationReport(b).ok,alive160:a.persons.filter(p=>p.alive).length,alive161:b.persons.filter(p=>p.alive).length,foundEmptyEndings:empties,foundEmptyTotal:Object.values(empties).reduce((n,v)=>n+v,0),gatherStillSomethingBetter:reasons.gatherStillBetter??0};
writeFileSync(out,JSON.stringify(res,null,1));console.log(JSON.stringify(res));
