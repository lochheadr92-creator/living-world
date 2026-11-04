// ORDINARY rules-pinned bisection on unchanged current source: only settings.rulesVersion differs.
// Records the first timber-yard site and completion, and the building/site mix each day.
import {createWorld} from '../../src/sim/factory';
import {currentWorldSettings} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {DAY} from '../../src/sim/constants';
import {writeFileSync} from 'node:fs';
const [seed='forest',rulesArg='151',daysArg='15',out='survival_evidence/ordinary-acquisition-20261104/bisect']=process.argv.slice(2);
const rules=Number(rulesArg);
const w=createWorld({...currentWorldSettings('normal',seed),rulesVersion:rules});
let siteAt:number|null=null,builtAt:number|null=null;const days:unknown[]=[];
const tally=(xs:{type:string}[])=>xs.reduce((m:Record<string,number>,x)=>(m[x.type]=(m[x.type]??0)+1,m),{});
while(w.tick<Number(daysArg)*DAY){
 stepWorld(w);
 if(siteAt===null&&w.sites.some(s=>s.type==='timber_yard'))siteAt=w.tick;
 if(builtAt===null&&w.buildings.some(b=>b.type==='timber_yard'))builtAt=w.tick;
 if(w.tick%DAY===0)days.push({day:w.tick/DAY,alive:w.persons.filter(p=>p.alive).length,buildings:tally(w.buildings),sites:tally(w.sites)});
}
const r={seed,rules,settingsRules:w.settings.rulesVersion,siteAt,builtAt,days};
writeFileSync(`${out}/${seed}-r${rules}.json`,JSON.stringify(r,null,1));
console.log(JSON.stringify({seed,rules,siteAt,builtAt,last:days.at(-1)}));
