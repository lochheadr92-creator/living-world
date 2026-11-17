// who could be lived: the living people at the start day of a fresh run, with stage, household and what they hold
import {createWorld} from '../../src/sim/factory';
import {freshRunSettings,parseRunRules} from '../../src/sim/profiles';
import {stepWorld} from '../../src/sim/world';
import {stageOf,ageYears} from '../../src/sim/people';
import {DAY} from '../../src/sim/constants';
const [seed='meadow',profile='normal',day='1']=process.argv.slice(2).filter(a=>a!=='--');
const w=createWorld(freshRunSettings(parseRunRules('rich'),profile as 'normal',seed,{harsh:false,immigration:true}));
while(w.tick<Number(day)*DAY)stepWorld(w);
for(const p of w.persons){if(!p.alive)continue;const hh=w.households.find(h=>h.id===p.hhId);
 const mates=hh?hh.members.filter(m=>m!==p.id).map(m=>(w.byId.get(m) as any)?.name).join('+'):'';
 console.log(`${p.name.padEnd(8)} #${p.id} ${stageOf(w,p).padEnd(6)} age ${ageYears(w,p).toFixed(0)} hh[${mates||'alone'}] health ${Math.round(p.health)} inv ${Object.entries(p.inv).filter(([,n])=>(n??0)>0).map(([k,n])=>n+k).join(',')||'-'}`);}
console.log('tick',w.tick,'people',w.persons.filter(p=>p.alive).length);
